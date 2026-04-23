const { db, all, isPostgres, pool, initTables } = require('./database');

async function migrate() {
  if (!isPostgres) {
    console.error('❌ POSTGRES_URL or DATABASE_URL not found in environment variables.');
    process.exit(1);
  }

  console.log('🚀 Starting migration from SQLite to Postgres...');

  try {
    // LANGKAH PENTING: Pastikan tabel dibuat dulu di Postgres
    console.log('🛠️ Ensuring tables exist in Postgres...');
    await initTables(); 
    console.log('✅ Tables are ready.');

    const tables = [
      'users',
      'sekolah',
      'dapur_supplier',
      'jadwal_distribusi',
      'pengiriman',
      'stok_bahan',
      'insiden',
      'dapur_kurir',
      'dapur_sekolah'
    ];

    for (const table of tables) {
      console.log(`📦 Migrating table: ${table}...`);
      
      // Ambil data dari SQLite
      const rows = await new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      if (rows.length === 0) {
        console.log(`ℹ️ Table ${table} is empty, skipping.`);
        continue;
      }

      // Siapkan query insert Postgres
      const columns = Object.keys(rows[0]);
      const colNames = columns.join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      // Gunakan ON CONFLICT agar tidak error jika dijalankan ulang
      const insertQuery = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;

      for (const row of rows) {
        const values = columns.map(col => row[col]);
        await pool.query(insertQuery, values);
      }

      // Reset sequence SERIAL di Postgres agar ID berikutnya benar
      try {
        await pool.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) FROM ${table}`);
      } catch (e) {
        // Abaikan jika tabel tidak punya sequence (id bukan serial)
      }
      
      console.log(`✅ Migrated ${rows.length} rows to ${table}.`);
    }

    console.log('✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
