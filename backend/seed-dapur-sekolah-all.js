const { all, run, get } = require('./database');

async function seedDapurSekolah() {
  console.log('🌱 Seeding dapur_sekolah relations (all 5 dapurs)...');
  
  // Get all dapurs
  const dapurs = await all('SELECT id, nama FROM dapur_supplier ORDER BY id');
  console.log(`📦 Found ${dapurs.length} dapurs`);
  
  // Get all schools
  const schools = await all('SELECT id, nama, kecamatan FROM sekolah ORDER BY id');
  console.log(`🏫 Found ${schools.length} schools`);
  
  if (dapurs.length === 0 || schools.length === 0) {
    console.log('❌ Need data first. Run seed.js');
    process.exit(1);
  }
  
  // Clear old relations
  await run('DELETE FROM dapur_sekolah');
  console.log('🗑️  Cleared old relations');
  
  let createdCount = 0;
  const hariKirim = JSON.stringify(['senin', 'selasa', 'rabu', 'kamis', 'jumat']);
  
  // Distribute schools evenly across all 5 dapurs (4 schools each)
  console.log('\n📋 Assignment Plan:');
  
  for (let i = 0; i < schools.length; i++) {
    const school = schools[i];
    // Round-robin: dapur index = i % jumlah_dapur
    const dapurIndex = i % dapurs.length;
    const dapur = dapurs[dapurIndex];
    
    await run(
      'INSERT INTO dapur_sekolah (dapur_id, sekolah_id, hari_kirim, jumlah_porsi, status) VALUES (?, ?, ?, ?, "aktif")',
      [dapur.id, school.id, hariKirim, 200]
    );
    createdCount++;
    console.log(`✅ ${dapur.nama} → ${school.nama} (${school.kecamatan})`);
  }
  
  console.log(`\n✅ Seeding completed!`);
  console.log(`   ✅ Created: ${createdCount} relations`);
  console.log(`   📊 Each dapur now has ${schools.length / dapurs.length} schools`);
  
  // Verify per dapur
  const summary = await all(`
    SELECT ds.nama as dapur, COUNT(dsk.sekolah_id) as sekolah_count
    FROM dapur_supplier ds
    LEFT JOIN dapur_sekolah dsk ON ds.id = dsk.dapur_id
    GROUP BY ds.id
    ORDER BY ds.nama
  `);
  
  console.log('\n📋 Summary per Dapur:');
  summary.forEach((s, idx) => {
    console.log(`   ${idx + 1}. ${s.dapur}: ${s.sekolah_count} sekolah`);
  });
  
  process.exit(0);
}

seedDapurSekolah();
