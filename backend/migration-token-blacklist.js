const { db, isPostgres } = require('./database');

async function up() {
  console.log('🚀 Starting Token Blacklist Migration...');
  
  try {
    const hasTable = await db.schema.hasTable('token_blacklist');
    if (!hasTable) {
      await db.schema.createTable('token_blacklist', (t) => {
        t.increments('id').primary();
        t.text('token').notNullable().index();
        t.timestamp('expires_at').notNullable();
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('✅ Created token_blacklist table');
    } else {
      console.log('ℹ️ Table token_blacklist already exists');
    }
  } catch (error) {
    console.error('❌ Error creating token_blacklist table:', error.message);
  }
  
  console.log('🏁 Migration completed.');
  process.exit(0);
}

up();
