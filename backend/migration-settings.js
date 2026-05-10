const { run, get, all, isPostgres } = require('./database');

async function migrateSettings() {
  console.log('🚀 Starting settings table migration...');

  try {
    // Create settings table if not exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await run(createTableQuery);
    console.log('✅ Settings table ensures/created.');

    // Seed default settings
    const defaultSettings = [
      { key: 'app_name', value: 'MBG Admin' },
      { key: 'app_logo', value: '' },
      { key: 'org_name', value: 'Pemerintah Kabupaten Banjarnegara' },
      { key: 'app_copyright', value: '© 2024 MBG Banjarnegara' },
      { key: 'map_center_lat', value: '-7.3995' },
      { key: 'map_center_lng', value: '109.6926' },
      { key: 'map_zoom', value: '11' }
    ];

    for (const setting of defaultSettings) {
      const existing = await get('SELECT key FROM settings WHERE key = ?', [setting.key]);
      if (!existing) {
        await run('INSERT INTO settings (key, value) VALUES (?, ?)', [setting.key, setting.value]);
        console.log(`✅ Default setting added: ${setting.key}`);
      }
    }

    console.log('✨ Settings migration completed successfully!');
    if (!process.env.POSTGRES_URL) {
        process.exit(0);
    }
  } catch (error) {
    console.error('❌ Settings migration failed:', error.message);
    process.exit(1);
  }
}

migrateSettings();
