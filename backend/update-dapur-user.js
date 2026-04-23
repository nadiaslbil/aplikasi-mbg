const { run, get, all } = require('./database');

async function updateDapurWithUserId() {
  console.log('🔄 Linking supplier user to dapur...');

  try {
    // Get supplier user
    const supplierUser = await get('SELECT id FROM users WHERE email = ?', ['dapur1@mbg.go.id']);
    
    if (!supplierUser) {
      console.log('❌ Supplier user not found. Run seed.js first.');
      process.exit(1);
    }

    console.log(`✅ Found supplier user ID: ${supplierUser.id}`);

    // Update first dapur to link with this user
    const dapur = await get('SELECT id, user_id FROM dapur_supplier WHERE nama = ?', ['Dapur MBG Banjarnegara']);
    
    if (dapur) {
      if (dapur.user_id) {
        console.log('✅ Dapur already linked to user');
      } else {
        await run('UPDATE dapur_supplier SET user_id = ? WHERE id = ?', [supplierUser.id, dapur.id]);
        console.log('✅ Linked Dapur MBG Banjarnegara to supplier user');
      }
    } else {
      console.log('❌ Dapur not found');
    }

    console.log('\n✅ Update completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

updateDapurWithUserId();
