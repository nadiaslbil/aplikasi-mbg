const { run, all } = require('./database');

async function deleteAllJadwal() {
  console.log('🗑️  Deleting all jadwal distribusi data...\n');
  
  // Count existing jadwal
  const countResult = await all('SELECT COUNT(*) as count FROM jadwal_distribusi');
  console.log(`📋 Found ${countResult[0].count} jadwal records`);
  
  // Count pengiriman records (will be auto-deleted by CASCADE)
  const pengirimanCount = await all('SELECT COUNT(*) as count FROM pengiriman');
  console.log(`🚚 Found ${pengirimanCount[0].count} pengiriman records (will be auto-deleted)`);
  
  // Confirm delete
  console.log('\n⚠️  This will DELETE:');
  console.log('   - All jadwal_distribusi records');
  console.log('   - All pengiriman records (CASCADE)');
  console.log('\n✅ Press Ctrl+C within 3 seconds to cancel...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Delete pengiriman first (to be safe, though CASCADE should handle it)
    const pengirimanResult = await run('DELETE FROM pengiriman');
    console.log(`✅ Deleted ${pengirimanResult.changes} pengiriman records`);
    
    // Delete all jadwal
    const jadwalResult = await run('DELETE FROM jadwal_distribusi');
    console.log(`✅ Deleted ${jadwalResult.changes} jadwal records`);
    
    console.log('\n✅ All jadwal distribusi data deleted successfully!');
    console.log('   Database is now clean for fresh schedule generation.');
    
  } catch (error) {
    console.error('\n❌ Error deleting data:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

deleteAllJadwal();
