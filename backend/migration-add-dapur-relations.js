const { run, get, all } = require('./database');

async function migrate() {
  console.log('🚀 Starting migration: Add Dapur Relations...');

  try {
    // Enable foreign keys
    await run('PRAGMA foreign_keys = ON');

    // 1. Create table: dapur_kurir
    await run(`
      CREATE TABLE IF NOT EXISTS dapur_kurir (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dapur_id INTEGER NOT NULL,
        kurir_id INTEGER NOT NULL,
        tanggal_mulai DATE NOT NULL DEFAULT (date('now')),
        tanggal_selesai DATE,
        status TEXT NOT NULL DEFAULT 'aktif',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dapur_id) REFERENCES dapur_supplier(id) ON DELETE CASCADE,
        FOREIGN KEY (kurir_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(dapur_id, kurir_id)
      )
    `);
    console.log('✅ Table dapur_kurir created');

    // 2. Create table: dapur_sekolah
    await run(`
      CREATE TABLE IF NOT EXISTS dapur_sekolah (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dapur_id INTEGER NOT NULL,
        sekolah_id INTEGER NOT NULL,
        hari_kirim TEXT,
        jumlah_porsi INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'aktif',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dapur_id) REFERENCES dapur_supplier(id) ON DELETE CASCADE,
        FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE,
        UNIQUE(dapur_id, sekolah_id)
      )
    `);
    console.log('✅ Table dapur_sekolah created');

    // 3. Create indexes for performance
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_kurir_dapur ON dapur_kurir(dapur_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_kurir_kurir ON dapur_kurir(kurir_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_kurir_status ON dapur_kurir(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_sekolah_dapur ON dapur_sekolah(dapur_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_sekolah_sekolah ON dapur_sekolah(sekolah_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_dapur_sekolah_status ON dapur_sekolah(status)');
    console.log('✅ Indexes created');

    // 4. Seed dummy data for dapur_kurir
    const existingDapurKurir = await all('SELECT COUNT(*) as count FROM dapur_kurir');
    if (existingDapurKurir[0].count === 0) {
      // Get first kitchen (id=1)
      const dapur1 = await get('SELECT id FROM dapur_supplier WHERE id = 1');
      // Get kurir users
      const kurirs = await all("SELECT id FROM users WHERE role = 'kurir'");
      
      if (dapur1 && kurirs.length > 0) {
        for (const kurir of kurirs) {
          await run(
            'INSERT INTO dapur_kurir (dapur_id, kurir_id, tanggal_mulai, status) VALUES (?, ?, date("now"), "aktif")',
            [dapur1.id, kurir.id]
          );
        }
        console.log(`✅ Seeded ${kurirs.length} dapur_kurir relations`);
      }
    } else {
      console.log('⏭️  dapur_kurir already has data, skipping seed');
    }

    // 5. Seed dummy data for dapur_sekolah
    const existingDapurSekolah = await all('SELECT COUNT(*) as count FROM dapur_sekolah');
    if (existingDapurSekolah[0].count === 0) {
      // Get first 2 kitchens
      const dapurs = await all('SELECT id FROM dapur_supplier LIMIT 2');
      // Get all schools
      const schools = await all('SELECT id FROM sekolah');
      
      if (dapurs.length > 0 && schools.length > 0) {
        let count = 0;
        // Assign first 10 schools to dapur 1
        // Assign remaining schools to dapur 2
        const halfPoint = Math.ceil(schools.length / 2);
        
        for (let i = 0; i < schools.length; i++) {
          const dapurIdx = i < halfPoint ? 0 : 1;
          if (dapurIdx < dapurs.length) {
            const hariKirim = JSON.stringify(['senin', 'selasa', 'rabu', 'kamis', 'jumat']);
            await run(
              'INSERT INTO dapur_sekolah (dapur_id, sekolah_id, hari_kirim, jumlah_porsi, status) VALUES (?, ?, ?, ?, "aktif")',
              [dapurs[dapurIdx].id, schools[i].id, hariKirim, 200]
            );
            count++;
          }
        }
        console.log(`✅ Seeded ${count} dapur_sekolah relations`);
      }
    } else {
      console.log('⏭️  dapur_sekolah already has data, skipping seed');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 New Tables Created:');
    console.log('  - dapur_kurir: Assign kurir to dapur');
    console.log('  - dapur_sekolah: Assign sekolah to dapur');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
