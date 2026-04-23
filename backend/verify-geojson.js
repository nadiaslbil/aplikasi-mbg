const fs = require('fs');
const data = JSON.parse(fs.readFileSync('banjarnegara-big-kecamatan.geojson'));

console.log('Total features:', data.features.length);
console.log('\nDaftar Kecamatan:');
data.features.forEach((f, i) => {
  const nama = f.properties.WADMKC || f.properties.NAMOBJ || 'Unknown';
  const desa = f.properties.JMLH_DESA || f.properties.JUMLAH_DESA || '-';
  const luas = f.properties.LUASWH || f.properties.LUAS || '-';
  console.log(`${i + 1}. ${nama}`);
  console.log(`   - Desa: ${desa}`);
  console.log(`   - Luas: ${luas}`);
});

console.log('\nSample properties keys:', Object.keys(data.features[0].properties));
