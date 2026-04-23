const { get, all } = require('./database');

async function checkDapurLinks() {
  console.log('🔍 Checking supplier-dapur links...\n');

  try {
    // Get all users
    const users = await all('SELECT id, nama, email, role FROM users WHERE role = ?', ['supplier']);
    console.log('📋 Supplier users:');
    users.forEach(u => console.log(`  ID: ${u.id}, Nama: ${u.nama}, Email: ${u.email}`));

    console.log('');

    // Get all dapur with user info
    const dapurs = await all(`
      SELECT d.id, d.nama, d.user_id, u.nama as user_nama, u.email as user_email
      FROM dapur_supplier d
      LEFT JOIN users u ON d.user_id = u.id
      ORDER BY d.id
    `);
    
    console.log('🍳 Dapur data:');
    dapurs.forEach(d => {
      const linkInfo = d.user_id 
        ? `→ Linked to: ${d.user_nama} (${d.user_email})`
        : '→ ⚠️  NOT LINKED to any user';
      console.log(`  ID: ${d.id}, Nama: ${d.nama} ${linkInfo}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkDapurLinks();
