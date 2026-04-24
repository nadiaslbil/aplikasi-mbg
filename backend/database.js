const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

let rawUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (rawUrl) {
    rawUrl = rawUrl.replace(/^["']|["']$/g, '').trim();
}

const isPostgres = !!rawUrl;
let db;
let pool;

if (isPostgres) {
  pool = new Pool({
    connectionString: rawUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  // Tes koneksi untuk memastikan tidak ada error saat startup
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Gagal koneksi ke Postgres:', err.stack);
    } else {
      console.log('✅ Berhasil koneksi ke Vercel Postgres');
      release();
    }
  });
} else {
  // Only load sqlite3 in local dev to avoid Vercel build issues
  try {
    const sqlite3 = require('sqlite3').verbose();
    const DB_PATH = path.join(__dirname, 'mbg_distribution.db');
    db = new sqlite3.Database(DB_PATH);
    console.log('✅ Connected to SQLite database');
  } catch (err) {
    console.warn('SQLite not available, but that is okay if you are on Vercel with Postgres.');
  }
}

// Helper to convert SQLite syntax to Postgres
function transformQuery(sql) {
  if (!isPostgres) return sql;
  
  let pgSql = sql.replace(/\?/g, (_, i) => `$${i + 1}`);
  
  // Basic type and function replacements
  pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
               .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
               .replace(/REAL/gi, 'DOUBLE PRECISION')
               .replace(/strftime\('%Y-%m', tanggal\)/gi, "TO_CHAR(tanggal, 'YYYY-MM')")
               .replace(/strftime\('%Y-%m', 'now'\)/gi, "TO_CHAR(CURRENT_DATE, 'YYYY-MM')")
               .replace(/date\('now', '\+3 days'\)/gi, "(CURRENT_DATE + INTERVAL '3 days')")
               .replace(/date\('now', '-30 days'\)/gi, "(CURRENT_DATE - INTERVAL '30 days')");
               
  return pgSql;
}

async function run(sql, params = []) {
  if (isPostgres) {
    let pgSql = transformQuery(sql);
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
       pgSql += ' RETURNING id';
    }
    const result = await pool.query(pgSql, params);
    return { lastID: result.rows[0]?.id || null, changes: result.rowCount };
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
    const result = await pool.query(transformQuery(sql), params);
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
    const result = await pool.query(transformQuery(sql), params);
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
  // Logic remains for creating tables if needed
};

module.exports = { pool, db, run, get, all, isPostgres, initTables };
