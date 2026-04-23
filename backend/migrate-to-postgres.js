const { db, all, isPostgres, pool } = require('./database');

async function migrate() {
  if (!isPostgres) {
    console.error('❌ POSTGRES_URL or DATABASE_URL not found in environment variables.');
    console.log('Please set up your Vercel Postgres environment variables first.');
    process.exit(1);
  }

  console.log('🚀 Starting migration from SQLite to Postgres...');

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

  try {
    for (const table of tables) {
      console.log(`📦 Migrating table: ${table}...`);
      
      // Get data from SQLite
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

      // Prepare Postgres insert
      const columns = Object.keys(rows[0]);
      const colNames = columns.join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      const insertQuery = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;

      for (const row of rows) {
        const values = columns.map(col => row[col]);
        await pool.query(insertQuery, values);
      }

      // Reset sequence for SERIAL columns in Postgres
      await pool.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) FROM ${table}`);
      
      console.log(`✅ Migrated ${rows.length} rows to ${table}.`);
    }

    console.log('✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
