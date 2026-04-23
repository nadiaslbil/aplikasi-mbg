const { all } = require('./database');

async function checkKurirs() {
  console.log('🔍 Checking kurirs...\n');
  
  // Get all kurirs
  const kurirs = await all("SELECT id, nama, email, role FROM users WHERE role = 'kurir'");
  console.log(`📋 Found ${kurirs.length} kurirs:`);
  kurirs.forEach(k => {
    console.log(`   ${k.id}. ${k.nama} (${k.email})`);
  });
  
  // Get dapur_kurir relations
  const relations = await all(`
    SELECT ds.nama as dapur, u.nama as kurir, dk.status
    FROM dapur_kurir dk
    JOIN dapur_supplier ds ON dk.dapur_id = ds.id
    JOIN users u ON dk.kurir_id = u.id
    ORDER BY ds.nama, u.nama
  `);
  
  console.log(`\n🔗 Dapur-Kurir Relations (${relations.length} total):`);
  relations.forEach(r => {
    console.log(`   ${r.dapur} → ${r.kurir} (${r.status})`);
  });
  
  process.exit(0);
}

checkKurirs();
