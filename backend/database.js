const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

// Ambil URL dan bersihkan dari spasi atau tanda petik yang mungkin terbawa
let rawUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (rawUrl) {
    rawUrl = rawUrl.replace(/^["']|["']$/g, '').trim();
}

const isPostgres = !!rawUrl;
let db;
let pool;

// SELALU buka koneksi SQLite agar bisa dibaca kapanpun (terutama saat migrasi)
const DB_PATH = path.join(__dirname, 'mbg_distribution.db');
db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
  } else {
    if (!isPostgres) console.log('✅ Connected to SQLite database');
  }
});

if (isPostgres) {
  try {
    pool = new Pool({
      connectionString: rawUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('✅ Connected to Vercel Postgres (Ready)');
  } catch (err) {
    console.error('❌ Failed to initialize Postgres Pool:', err.message);
  }
}

// Unified methods for both SQLite and Postgres
async function run(sql, params = []) {
  if (isPostgres) {
    let pgSql = sql;
    let count = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${count++}`);
    }
    
    pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    pgSql = pgSql.replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    pgSql = pgSql.replace(/REAL/gi, 'DOUBLE PRECISION');
    
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
       pgSql += ' RETURNING id';
    }

    const result = await pool.query(pgSql, params);
    return { 
      lastID: result.rows[0]?.id || null, 
      changes: result.rowCount 
    };
  } else {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
}

async function get(sql, params = []) {
  if (isPostgres) {
    let pgSql = sql;
    let count = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${count++}`);
    }
    const result = await pool.query(pgSql, params);
    return result.rows[0] || null;
  } else {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

async function all(sql, params = []) {
  if (isPostgres) {
    let pgSql = sql;
    let count = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${count++}`);
    }
    const result = await pool.query(pgSql, params);
    return result.rows;
  } else {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

const initTables = async () => {
  try {
    if (!isPostgres) {
      await run('PRAGMA foreign_keys = ON');
    }

    const createTableQueries = [
      `CREATE TABLE IF NOT EXISTS users (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        nama TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin_daerah',
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS sekolah (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        nama TEXT NOT NULL,
        alamat TEXT NOT NULL,
        latitude ${isPostgres ? 'DOUBLE PRECISION' : 'REAL'} NOT NULL,
        longitude ${isPostgres ? 'DOUBLE PRECISION' : 'REAL'} NOT NULL,
        kecamatan TEXT NOT NULL,
        kabupaten TEXT NOT NULL,
        provinsi TEXT NOT NULL,
        jumlah_siswa INTEGER NOT NULL DEFAULT 0,
        kontak TEXT,
        status TEXT NOT NULL DEFAULT 'aktif',
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS dapur_supplier (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        user_id INTEGER,
        nama TEXT NOT NULL,
        alamat TEXT NOT NULL,
        latitude ${isPostgres ? 'DOUBLE PRECISION' : 'REAL'} NOT NULL,
        longitude ${isPostgres ? 'DOUBLE PRECISION' : 'REAL'} NOT NULL,
        kecamatan TEXT NOT NULL,
        kabupaten TEXT NOT NULL,
        provinsi TEXT NOT NULL,
        kapasitas_harian INTEGER NOT NULL DEFAULT 0,
        kontak TEXT,
        penanggung_jawab TEXT,
        status TEXT NOT NULL DEFAULT 'aktif',
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS jadwal_distribusi (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        dapur_id INTEGER NOT NULL,
        sekolah_id INTEGER NOT NULL,
        tanggal DATE NOT NULL,
        waktu_kirim TIME,
        waktu_terima TIME,
        jumlah_porsi INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'terjadwal',
        catatan TEXT,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dapur_id) REFERENCES dapur_supplier(id) ON DELETE CASCADE,
        FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS pengiriman (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        jadwal_id INTEGER NOT NULL,
        kurir_id INTEGER NOT NULL,
        latitude ${isPostgres ? 'DOUBLE PRECISION' : 'REAL'},
        longitude ${isPostgres ? 'DOUBLE PRECISION' : 'REAL'},
        status TEXT NOT NULL DEFAULT 'dalam_perjalanan',
        bukti_foto TEXT,
        catatan TEXT,
        waktu_berangkat TIME,
        waktu_tiba TIME,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (jadwal_id) REFERENCES jadwal_distribusi(id) ON DELETE CASCADE,
        FOREIGN KEY (kurir_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS stok_bahan (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        dapur_id INTEGER NOT NULL,
        nama_bahan TEXT NOT NULL,
        jumlah ${isPostgres ? 'DOUBLE PRECISION' : 'REAL'} NOT NULL,
        satuan TEXT NOT NULL,
        expired_date DATE NOT NULL,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dapur_id) REFERENCES dapur_supplier(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS insiden (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        sekolah_id INTEGER,
        dapur_id INTEGER,
        tipe TEXT NOT NULL,
        deskripsi TEXT NOT NULL,
        latitude ${isPostgres ? 'DOUBLE PRECISION' : 'REAL'},
        longitude ${isPostgres ? 'DOUBLE PRECISION' : 'REAL'},
        tanggal DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'laporan_masuk',
        ditangani_oleh INTEGER,
        tindak_lanjut TEXT,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE SET NULL,
        FOREIGN KEY (dapur_id) REFERENCES dapur_supplier(id) ON DELETE SET NULL,
        FOREIGN KEY (ditangani_oleh) REFERENCES users(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS dapur_kurir (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        dapur_id INTEGER NOT NULL,
        kurir_id INTEGER NOT NULL,
        tanggal_mulai DATE NOT NULL DEFAULT ${isPostgres ? 'CURRENT_DATE' : "(date('now'))"},
        tanggal_selesai DATE,
        status TEXT NOT NULL DEFAULT 'aktif',
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dapur_id) REFERENCES dapur_supplier(id) ON DELETE CASCADE,
        FOREIGN KEY (kurir_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(dapur_id, kurir_id)
      )`,
      `CREATE TABLE IF NOT EXISTS dapur_sekolah (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        dapur_id INTEGER NOT NULL,
        sekolah_id INTEGER NOT NULL,
        hari_kirim TEXT,
        jumlah_porsi INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'aktif',
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dapur_id) REFERENCES dapur_supplier(id) ON DELETE CASCADE,
        FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE,
        UNIQUE(dapur_id, sekolah_id)
      )`
    ];

    for (const query of createTableQueries) {
      await run(query);
    }

    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_sekolah_kecamatan ON sekolah(kecamatan)',
      'CREATE INDEX IF NOT EXISTS idx_sekolah_status ON sekolah(status)',
      'CREATE INDEX IF NOT EXISTS idx_dapur_status ON dapur_supplier(status)',
      'CREATE INDEX IF NOT EXISTS idx_jadwal_tanggal ON jadwal_distribusi(tanggal)',
      'CREATE INDEX IF NOT EXISTS idx_jadwal_status ON jadwal_distribusi(status)',
      'CREATE INDEX IF NOT EXISTS idx_pengiriman_jadwal ON pengiriman(jadwal_id)',
      'CREATE INDEX IF NOT EXISTS idx_pengiriman_status ON pengiriman(status)',
      'CREATE INDEX IF NOT EXISTS idx_stok_expired ON stok_bahan(expired_date)',
      'CREATE INDEX IF NOT EXISTS idx_insiden_tanggal ON insiden(tanggal)',
      'CREATE INDEX IF NOT EXISTS idx_insiden_status ON insiden(status)',
      'CREATE INDEX IF NOT EXISTS idx_dapur_user ON dapur_supplier(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_dapur_kurir_dapur ON dapur_kurir(dapur_id)',
      'CREATE INDEX IF NOT EXISTS idx_dapur_kurir_kurir ON dapur_kurir(kurir_id)',
      'CREATE INDEX IF NOT EXISTS idx_dapur_kurir_status ON dapur_kurir(status)',
      'CREATE INDEX IF NOT EXISTS idx_dapur_sekolah_dapur ON dapur_sekolah(dapur_id)',
      'CREATE INDEX IF NOT EXISTS idx_dapur_sekolah_sekolah ON dapur_sekolah(sekolah_id)',
      'CREATE INDEX IF NOT EXISTS idx_dapur_sekolah_status ON dapur_sekolah(status)'
    ];

    for (const query of indexQueries) {
      try {
        await run(query);
      } catch (err) {
        if (!err.message.includes('already exists')) throw err;
      }
    }

    const adminExists = await get('SELECT id FROM users WHERE email = ?', ['admin@mbg.go.id']);
    
    if (!adminExists) {
      const hashPassword = bcrypt.hashSync('admin123', 10);
      await run(
        'INSERT INTO users (nama, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Administrator MBG', 'admin@mbg.go.id', hashPassword, 'admin_bgn']
      );
    }
  } catch (error) {
    if (!error.message.includes('Invalid URL')) {
        console.error('Error during initTables:', error.message);
    }
  }
};

// Ekspor pool agar bisa digunakan di skrip lain
module.exports = { pool, db, run, get, all, isPostgres, initTables };
