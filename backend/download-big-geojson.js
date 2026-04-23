const https = require('https');
const fs = require('fs');
const path = require('path');

// BIG REST API endpoint untuk batas kecamatan
const BIG_API_URL = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_Kecamatan_10K/MapServer/0/query';

// Build query URL
const params = new URLSearchParams({
  where: "WADMKK = 'Banjarnegara'",
  outFields: '*',
  outSR: '4326',
  f: 'geojson'
});

const url = `${BIG_API_URL}?${params.toString()}`;

console.log('📥 Downloading GeoJSON from BIG...');
console.log(`URL: ${url}`);

// Fetch data
https.get(url, (response) => {
  let data = '';

  response.on('data', (chunk) => {
    data += chunk;
  });

  response.on('end', () => {
    try {
      const geojson = JSON.parse(data);
      
      // Check if we got data
      if (geojson.features && geojson.features.length > 0) {
        console.log(`✅ Success! Found ${geojson.features.length} features`);
        
        // Save to file
        const outputPath = path.join(__dirname, 'banjarnegara-big-kecamatan.geojson');
        fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
        
        const stats = fs.statSync(outputPath);
        console.log(`💾 Saved to: ${outputPath}`);
        console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`\n📋 Sample features:`);
        
        // Show sample
        geojson.features.slice(0, 3).forEach((f, i) => {
          console.log(`  ${i + 1}. ${f.properties.WADMKC || f.properties.NAMOBJ || 'Unknown'}`);
        });
        
      } else {
        console.log('❌ No features found for Banjarnegara');
        console.log('Response:', data.substring(0, 500));
        
        // Try alternative query
        console.log('\n💡 Trying alternative query...');
        tryAlternativeQuery();
      }
    } catch (error) {
      console.error('❌ Error parsing GeoJSON:', error.message);
      console.log('Raw response (first 500 chars):', data.substring(0, 500));
    }
  });
}).on('error', (error) => {
  console.error('❌ Error fetching data:', error.message);
  console.log('\n💡 Trying alternative method...');
  tryAlternativeQuery();
});

// Alternative query using JSON format
function tryAlternativeQuery() {
  const altUrl = `${BIG_API_URL}?where=1%3D1&outFields=*&outSR=4326&f=json&resultRecordCount=1000`;
  
  console.log(`\n📡 Trying: ${altUrl}`);
  
  https.get(altUrl, (response) => {
    let data = '';
    
    response.on('data', (chunk) => data += chunk);
    response.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log(`Response keys: ${Object.keys(jsonData).join(', ')}`);
        
        if (jsonData.features) {
          // Filter for Banjarnegara manually
          const banjarnegara = jsonData.features.filter(f => 
            f.attributes && (
              (f.attributes.WADMKK && f.attributes.WADMKK.includes('Banjarnegara')) ||
              (f.attributes.KDPKAB && f.attributes.KDPKAB.includes('33.04'))
            )
          );
          
          console.log(`Found ${banjarnegara.length} features for Banjarnegara`);
          
          if (banjarnegara.length > 0) {
            // Convert to GeoJSON
            const geojson = {
              type: 'FeatureCollection',
              features: banjarnegara.map(f => ({
                type: 'Feature',
                properties: f.attributes,
                geometry: f.geometry
              }))
            };
            
            const outputPath = path.join(__dirname, 'banjarnegara-big-alt.geojson');
            fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
            console.log(`✅ Saved alternative file to: ${outputPath}`);
          }
        }
      } catch (error) {
        console.error('Alternative query also failed:', error.message);
      }
    });
  }).on('error', (err) => {
    console.error('Alternative query failed:', err.message);
  });
}
