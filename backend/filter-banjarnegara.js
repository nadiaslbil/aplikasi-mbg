const fs = require('fs');
const path = require('path');

// Read the full GeoJSON file
const geojsonPath = path.join(__dirname, 'geojson-kabupaten.json');
const rawData = fs.readFileSync(geojsonPath, 'utf-8');
const geojson = JSON.parse(rawData);

console.log(`Total features in file: ${geojson.features.length}`);

// Filter for Banjarnegara (WADMKK = "Banjarnegara")
const banjarnegaraFeatures = geojson.features.filter(feature => {
  const props = feature.properties;
  return (
    (props.WADMKK && props.WADMKK.toLowerCase().includes('banjarnegara')) ||
    (props.KDPKAB && props.KDPKAB === '33.04') ||
    (props.KDPKAB && props.KDPKAB === '3304')
  );
});

console.log(`Banjarnegara features found: ${banjarnegaraFeatures.length}`);

if (banjarnegaraFeatures.length > 0) {
  // Create new GeoJSON for Banjarnegara only
  const banjarnegaraGeoJSON = {
    type: 'FeatureCollection',
    features: banjarnegaraFeatures,
  };

  // Save to file
  const outputPath = path.join(__dirname, 'banjarnegara-geojson.json');
  fs.writeFileSync(outputPath, JSON.stringify(banjarnegaraGeoJSON, null, 2));
  console.log(`✅ Saved to: ${outputPath}`);
  console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
} else {
  // Show sample of available properties to debug
  console.log('\nSample feature properties:');
  if (geojson.features.length > 0) {
    console.log(JSON.stringify(geojson.features[0].properties, null, 2));
  }
  
  // List all unique codes/names
  const codes = new Set();
  const names = new Set();
  geojson.features.forEach(f => {
    if (f.properties.kode) codes.add(f.properties.kode);
    if (f.properties.nama) names.add(f.properties.nama);
    if (f.properties.NAME_1) names.add(f.properties.NAME_1);
  });
  
  console.log('\nSample codes:', Array.from(codes).slice(0, 20));
  console.log('\nSample names:', Array.from(names).slice(0, 20));
}
