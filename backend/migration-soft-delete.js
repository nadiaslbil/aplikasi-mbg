const { db, isPostgres } = require('./database');

async function up() {
  console.log('🚀 Starting Soft Delete Migration...');
  
  const tables = ['users', 'sekolah', 'dapur_supplier', 'insiden', 'stok_bahan', 'jadwal_distribusi', 'pengiriman'];
  
  for (const table of tables) {
    try {
      const hasColumn = await db.schema.hasColumn(table, 'deleted_at');
      if (!hasColumn) {
        await db.schema.table(table, (t) => {
          t.timestamp('deleted_at').nullable();
        });
        console.log(`✅ Added deleted_at column to ${table}`);
      } else {
        console.log(`ℹ️ Column deleted_at already exists in ${table}`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${table}:`, error.message);
    }
  }
  
  console.log('🏁 Migration completed.');
  process.exit(0);
}

up();
