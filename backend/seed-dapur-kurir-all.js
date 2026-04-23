const { all, run, get } = require('./database');

async function seedDapurKurir() {
  console.log('🌱 Seeding dapur_kurir relations (1 kurir per dapur)...');
  
  // Get all dapurs
  const dapurs = await all('SELECT id, nama FROM dapur_supplier ORDER BY id');
  console.log(`📦 Found ${dapurs.length} dapurs`);
  
  // Get all kurirs
  const kurirs = await all("SELECT id, nama FROM users WHERE role = 'kurir' ORDER BY id");
  console.log(`🚚 Found ${kurirs.length} kurirs`);
  
  if (dapurs.length === 0) {
    console.log('❌ No dapur found. Run seed.js first.');
    process.exit(1);
  }
  
  if (kurirs.length === 0) {
    console.log('❌ No kurir found. Run seed.js first.');
    process.exit(1);
  }
  
  let createdCount = 0;
  let skippedCount = 0;
  
  // Hapus semua relasi lama dulu (reset)
  await run('DELETE FROM dapur_kurir');
  console.log('🗑️  Cleared all old relations');
  
  // Assign kurir ke dapur dengan pattern round-robin (1 kurir = 1 dapur)
  // Jika kurir lebih sedikit dari dapur, maka kurir akan di-repeat
  console.log('\n📋 Assignment Plan:');
  
  for (let i = 0; i < dapurs.length; i++) {
    const dapur = dapurs[i];
    // Round-robin: kurir index = i % jumlah_kurir
    const kurirIndex = i % kurirs.length;
    const kurir = kurirs[kurirIndex];
    
    const existing = await get(
      'SELECT id FROM dapur_kurir WHERE dapur_id = ? AND kurir_id = ?',
      [dapur.id, kurir.id]
    );
    
    if (existing) {
      skippedCount++;
      console.log(`⏭️  ${dapur.nama} → ${kurir.nama} (already exists)`);
    } else {
      await run(
        'INSERT INTO dapur_kurir (dapur_id, kurir_id, tanggal_mulai, status) VALUES (?, ?, date("now"), "aktif")',
        [dapur.id, kurir.id]
      );
      createdCount++;
      console.log(`✅ ${dapur.nama} → ${kurir.nama}`);
    }
  }
  
  console.log(`\n✅ Seeding completed!`);
  console.log(`   ✅ Created: ${createdCount} relations`);
  console.log(`   ⏭️  Skipped: ${skippedCount} (already exists)`);
  console.log(`\n📊 Each dapur now has 1 dedicated kurir`);
  
  // Verify
  const verify = await all(`
    SELECT ds.nama as dapur, u.nama as kurir, dk.status
    FROM dapur_supplier ds
    LEFT JOIN dapur_kurir dk ON ds.id = dk.dapur_id
    LEFT JOIN users u ON dk.kurir_id = u.id
    WHERE dk.status = 'aktif'
    ORDER BY ds.nama
  `);
  
  console.log('\n📋 Final Assignment:');
  verify.forEach((v, idx) => {
    console.log(`   ${idx + 1}. ${v.dapur} → ${v.kurir || '(no kurir)'} (${v.status})`);
  });
  
  process.exit(0);
}

seedDapurKurir();
