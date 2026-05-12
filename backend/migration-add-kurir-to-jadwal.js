const { db, isPostgres } = require('./database');

async function migrate() {
  console.log('🚀 Starting migration: Add kurir_id to jadwal_distribusi...');
  
  try {
    const tableInfo = isPostgres 
      ? await db.raw("SELECT column_name FROM information_schema.columns WHERE table_name = 'jadwal_distribusi' AND column_name = 'kurir_id'")
      : await db.raw("PRAGMA table_info(jadwal_distribusi)");
    
    const columns = isPostgres ? tableInfo.rows : tableInfo;
    const hasKurirId = columns.some(c => (isPostgres ? c.column_name : c.name) === 'kurir_id');

    if (!hasKurirId) {
      console.log('Adding kurir_id column...');
      if (isPostgres) {
        await db.raw('ALTER TABLE jadwal_distribusi ADD COLUMN kurir_id INTEGER REFERENCES users(id)');
      } else {
        await db.raw('ALTER TABLE jadwal_distribusi ADD COLUMN kurir_id INTEGER REFERENCES users(id)');
      }
      console.log('✅ Column added successfully.');
    } else {
      console.log('ℹ️ Column kurir_id already exists.');
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
