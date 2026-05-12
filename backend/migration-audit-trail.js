const { db, isPostgres } = require('./database');

async function up() {
  console.log('🚀 Starting Audit Trail Migration...');
  
  try {
    const hasTable = await db.schema.hasTable('audit_logs');
    if (!hasTable) {
      await db.schema.createTable('audit_logs', (table) => {
        table.increments('id').primary();
        table.integer('user_id').nullable(); // ID User yang melakukan aksi
        table.string('action').notNullable(); // CREATE, UPDATE, DELETE, LOGIN, LOGOUT
        table.string('table_name').nullable(); // Nama tabel yang dimodifikasi
        table.string('record_id').nullable(); // ID dari record yang dimodifikasi (string for compatibility)
        
        if (isPostgres) {
          table.jsonb('old_values').nullable(); // Data lama
          table.jsonb('new_values').nullable(); // Data baru
        } else {
          table.text('old_values').nullable(); // SQLite uses text for JSON
          table.text('new_values').nullable(); // SQLite uses text for JSON
        }
        
        table.string('ip_address').nullable();
        table.text('user_agent').nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('✅ Created audit_logs table');
    } else {
      console.log('ℹ️ Table audit_logs already exists');
    }
  } catch (error) {
    console.error('❌ Error creating audit_logs table:', error.message);
  }
  
  console.log('🏁 Migration completed.');
  process.exit(0);
}

up();
