const { all, run } = require('./database');

async function seedDapurKurir() {
  console.log('🌱 Seeding dapur_kurir relations...');
  
  // Get first kitchen
  const dapur = await all('SELECT id FROM dapur_supplier WHERE id = 1');
  console.log('📦 Dapur found:', dapur);
  
  // Get all kurir users
  const kurirs = await all("SELECT id, nama FROM users WHERE role = 'kurir'");
  console.log('🚚 Kurir found:', kurirs);
  
  if (dapur.length > 0 && kurirs.length > 0) {
    for (const kurir of kurirs) {
      const existing = await all(
        'SELECT id FROM dapur_kurir WHERE dapur_id = ? AND kurir_id = ?',
        [dapur[0].id, kurir.id]
      );
      
      if (existing.length === 0) {
        await run(
          'INSERT INTO dapur_kurir (dapur_id, kurir_id, tanggal_mulai, status) VALUES (?, ?, date("now"), "aktif")',
          [dapur[0].id, kurir.id]
        );
        console.log(`✅ Assigned Kurir "${kurir.nama}" to Dapur ID ${dapur[0].id}`);
      } else {
        console.log(`⏭️  Kurir "${kurir.nama}" already assigned to Dapur ID ${dapur[0].id}`);
      }
    }
    console.log('\n✅ Seeding completed!');
  } else {
    console.log('❌ No dapur or kurir found. Run seed.js first.');
  }
  
  process.exit(0);
}

seedDapurKurir();
