const { run, all, isPostgres } = require('./database');

async function migrateUsers() {
  console.log('🔄 Running migration: Add avatar and phone to users...');

  try {
    if (isPostgres) {
        // Postgres migration
        console.log('🐘 Migrating on Postgres...');
        await run('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT');
        await run('ALTER TABLE users ADD COLUMN IF NOT EXISTS no_telp TEXT');
    } else {
        // SQLite migration
        console.log('💾 Migrating on SQLite...');
        
        const tableInfo = await all('PRAGMA table_info(users)');
        const hasAvatar = tableInfo.some(col => col.name === 'avatar');
        const hasPhone = tableInfo.some(col => col.name === 'no_telp');

        if (!hasAvatar) {
            await run('ALTER TABLE users ADD COLUMN avatar TEXT');
            console.log('✅ Added avatar column');
        } else {
            console.log('ℹ️ Avatar column already exists');
        }

        if (!hasPhone) {
            await run('ALTER TABLE users ADD COLUMN no_telp TEXT');
            console.log('✅ Added no_telp column');
        } else {
            console.log('ℹ️ no_telp column already exists');
        }
    }

    console.log('\n✅ Migration completed successfully!');
    if (!process.env.POSTGRES_URL) {
        process.exit(0);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers();
