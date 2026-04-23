const { all, run, get } = require('./database');
const bcrypt = require('bcrypt');

async function seedKurirsForDapurs() {
  console.log('🌱 Creating 5 kurirs (1 per dapur)...');
  
  // Get all dapurs
  const dapurs = await all('SELECT id, nama FROM dapur_supplier ORDER BY id');
  console.log(`📦 Found ${dapurs.length} dapurs`);
  
  // Kurir data template
  const kurirTemplate = [
    { nama: 'Kurir Dapur MBG', email: 'kurir.dapurmbg@mbg.go.id' },
    { nama: 'Kurir Catering Berkah', email: 'kurir.berkah@mbg.go.id' },
    { nama: 'Kurir Dapur Sehat', email: 'kurir.sehat@mbg.go.id' },
    { nama: 'Kurir Kitchen Bawang', email: 'kurir.bawang@mbg.go.id' },
    { nama: 'Kurir Catering Purwanegara', email: 'kurir.purwanegara@mbg.go.id' },
  ];
  
  let createdCount = 0;
  let skippedCount = 0;
  const kurirIds = [];
  
  // Create/update kurirs
  for (let i = 0; i < dapurs.length && i < kurirTemplate.length; i++) {
    const dapur = dapurs[i];
    const template = kurirTemplate[i];
    
    // Check if kurir already exists
    let existingUser = await get('SELECT id FROM users WHERE email = ?', [template.email]);
    
    if (existingUser) {
      // Update existing user to role kurir
      await run('UPDATE users SET role = ? WHERE id = ?', ['kurir', existingUser.id]);
      kurirIds.push(existingUser.id);
      skippedCount++;
      console.log(`⏭️  ${template.email} already exists (ID: ${existingUser.id})`);
    } else {
      // Create new kurir
      const password = 'kurir123';
      const hashPassword = bcrypt.hashSync(password, 10);
      const result = await run(
        'INSERT INTO users (nama, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [template.nama, template.email, hashPassword, 'kurir']
      );
      kurirIds.push(result.lastID);
      createdCount++;
      console.log(`✅ Created: ${template.nama} (${template.email}) - Password: ${password}`);
    }
  }
  
  console.log(`\n✅ Kurir creation completed!`);
  console.log(`   ✅ Created: ${createdCount} new kurirs`);
  console.log(`   ⏭️  Skipped: ${skippedCount} (already exist)`);
  
  // Now assign each kurir to their dedicated dapur (1:1)
  console.log('\n🔗 Assigning kurirs to dapurs (1:1)...');
  
  // Clear old relations
  await run('DELETE FROM dapur_kurir');
  console.log('🗑️  Cleared old relations');
  
  let assignCount = 0;
  for (let i = 0; i < dapurs.length && i < kurirIds.length; i++) {
    const dapur = dapurs[i];
    const kurirId = kurirIds[i];
    
    // Get kurir name
    const kurir = await get('SELECT nama FROM users WHERE id = ?', [kurirId]);
    
    await run(
      'INSERT INTO dapur_kurir (dapur_id, kurir_id, tanggal_mulai, status) VALUES (?, ?, date("now"), "aktif")',
      [dapur.id, kurirId]
    );
    assignCount++;
    console.log(`✅ ${dapur.nama} → ${kurir.nama}`);
  }
  
  console.log(`\n✅ Assignment completed!`);
  console.log(`   ✅ Assigned: ${assignCount} relations`);
  
  // Final summary
  const summary = await all(`
    SELECT ds.nama as dapur, u.nama as kurir, u.email as kurir_email
    FROM dapur_supplier ds
    LEFT JOIN dapur_kurir dk ON ds.id = dk.dapur_id
    LEFT JOIN users u ON dk.kurir_id = u.id
    ORDER BY ds.nama
  `);
  
  console.log('\n📋 Final Summary:');
  summary.forEach((s, idx) => {
    console.log(`   ${idx + 1}. ${s.dapur}`);
    console.log(`      🚚 Kurir: ${s.kurir} (${s.kurir_email})`);
    console.log(`      🔑 Password: kurir123`);
  });
  
  // Count total kurirs
  const totalKurirs = await all("SELECT id, nama, email FROM users WHERE role = 'kurir' ORDER BY id");
  console.log(`\n🚚 Total Kurirs in System: ${totalKurirs.length}`);
  totalKurirs.forEach(k => {
    console.log(`   ${k.id}. ${k.nama} (${k.email})`);
  });
  
  process.exit(0);
}

seedKurirsForDapurs();
