const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, 'mbg_distribution.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('✅ Connected to SQLite database');
    initTables();
  }
});

// Promisify database methods
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

const initTables = async () => {
  try {
    await run('PRAGMA foreign_keys = ON');

    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin_daerah',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS sekolah (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT NOT NULL,
        alamat TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        kecamatan TEXT NOT NULL,
        kabupaten TEXT NOT NULL,
        provinsi TEXT NOT NULL,
        jumlah_siswa INTEGER NOT NULL DEFAULT 0,
        kontak TEXT,
        status TEXT NOT NULL DEFAULT 'aktif',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS dapur_supplier (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        nama TEXT NOT NULL,
        alamat TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        kecamatan TEXT NOT NULL,
        kabupaten TEXT NOT NULL,
        provinsi TEXT NOT NULL,
        kapasitas_harian INTEGER NOT NULL DEFAULT 0,
        kontak TEXT,
        penanggung_jawab TEXT,
        status TEXT NOT NULL DEFAULT 'aktif',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS jadwal_distribusi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dapur_id INTEGER NOT NULL,
        sekolah_id INTEGER NOT NULL,
        tanggal DATE NOT NULL,
        waktu_kirim TIME,
        waktu_terima TIME,
        jumlah_porsi INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'terjadwal',
        catatan TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dapur_id) REFERENCES dapur_supplier(id) ON DELETE CASCADE,
        FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS pengiriman (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jadwal_id INTEGER NOT NULL,
        kurir_id INTEGER NOT NULL,
        latitude REAL,
        longitude REAL,
        status TEXT NOT NULL DEFAULT 'dalam_perjalanan',
        bukti_foto TEXT,
        catatan TEXT,
        waktu_berangkat TIME,
        waktu_tiba TIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (jadwal_id) REFERENCES jadwal_distribusi(id) ON DELETE CASCADE,
        FOREIGN KEY (kurir_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS stok_bahan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dapur_id INTEGER NOT NULL,
        nama_bahan TEXT NOT NULL,
        jumlah REAL NOT NULL,
        satuan TEXT NOT NULL,
        expired_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dapur_id) REFERENCES dapur_supplier(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS insiden (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sekolah_id INTEGER,
        dapur_id INTEGER,
        tipe TEXT NOT NULL,
        deskripsi TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        tanggal DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'laporan_masuk',
        ditangani_oleh INTEGER,
        tindak_lanjut TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE SET NULL,
        FOREIGN KEY (dapur_id) REFERENCES dapur_supplier(id) ON DELETE SET NULL,
        FOREIGN KEY (ditangani_oleh) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS dapur_kurir (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dapur_id INTEGER NOT NULL,
        kurir_id INTEGER NOT NULL,
        tanggal_mulai DATE NOT NULL DEFAULT (date('now')),
        tanggal_selesai DATE,
        status TEXT NOT NULL DEFAULT 'aktif',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dapur_id) REFERENCES dapur_supplier(id) ON DELETE CASCADE,
        FOREIGN KEY (kurir_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(dapur_id, kurir_id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS dapur_sekolah (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dapur_id INTEGER NOT NULL,
        sekolah_id INTEGER NOT NULL,
        hari_kirim TEXT,
        jumlah_porsi INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'aktif',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dapur_id) REFERENCES dapur_supplier(id) ON DELETE CASCADE,
        FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE,
        UNIQUE(dapur_id, sekolah_id)
      )
    `);

    // Create indexes
    await run('CREATE INDEX IF NOT EXISTS idx_sekolah_kecamatan ON sekolah(kecamatan)');
    await run('CREATE INDEX IF NOT EXISTS idx_sekolah_status ON sekolah(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_status ON dapur_supplier(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_jadwal_tanggal ON jadwal_distribusi(tanggal)');
    await run('CREATE INDEX IF NOT EXISTS idx_jadwal_status ON jadwal_distribusi(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_pengiriman_jadwal ON pengiriman(jadwal_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_pengiriman_status ON pengiriman(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_stok_expired ON stok_bahan(expired_date)');
    await run('CREATE INDEX IF NOT EXISTS idx_insiden_tanggal ON insiden(tanggal)');
    await run('CREATE INDEX IF NOT EXISTS idx_insiden_status ON insiden(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_user ON dapur_supplier(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_kurir_dapur ON dapur_kurir(dapur_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_kurir_kurir ON dapur_kurir(kurir_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_kurir_status ON dapur_kurir(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_sekolah_dapur ON dapur_sekolah(dapur_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_sekolah_sekolah ON dapur_sekolah(sekolah_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_sekolah_status ON dapur_sekolah(status)');

    // Create default admin
    const adminExists = await get('SELECT id FROM users WHERE email = ?', ['admin@mbg.go.id']);
    
    if (!adminExists) {
      const hashPassword = bcrypt.hashSync('admin123', 10);
      await run(
        'INSERT INTO users (nama, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Administrator MBG', 'admin@mbg.go.id', hashPassword, 'admin_bgn']
      );
      console.log('✅ Default admin created: admin@mbg.go.id / admin123');
    }

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = { db, run, get, all };
