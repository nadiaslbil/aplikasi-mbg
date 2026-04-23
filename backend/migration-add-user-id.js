const { run, get, all } = require('./database');

async function migrate() {
  console.log('🔄 Running migration: Add user_id to dapur_supplier...');

  try {
    // Check if column already exists
    const tableInfo = await all('PRAGMA table_info(dapur_supplier)');
    const hasUserIdColumn = tableInfo.some(col => col.name === 'user_id');

    if (hasUserIdColumn) {
      console.log('✅ Column user_id already exists');
    } else {
      // Add column
      await run('ALTER TABLE dapur_supplier ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL');
      console.log('✅ Added user_id column to dapur_supplier');
    }

    // Create index
    try {
      await run('CREATE INDEX IF NOT EXISTS idx_dapur_user ON dapur_supplier(user_id)');
      console.log('✅ Created index idx_dapur_user');
    } catch (err) {
      console.log('⚠️ Index already exists or error:', err.message);
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
