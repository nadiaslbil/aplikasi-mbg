const { run, get } = require('./database');
const bcrypt = require('bcrypt');

async function seed() {
  console.log('🌱 Seeding data dummy...');

  // Create additional users
  const users = [
    { nama: 'Admin Daerah 1', email: 'daerah1@mbg.go.id', password: 'daerah123', role: 'admin_daerah' },
    { nama: 'Kurir 1', email: 'kurir1@mbg.go.id', password: 'kurir123', role: 'kurir' },
    { nama: 'Dapur Sehat 1', email: 'dapur1@mbg.go.id', password: 'dapur123', role: 'supplier' },
  ];

  const userIds = {};
  for (const user of users) {
    const existing = await get('SELECT id FROM users WHERE email = ?', [user.email]);
    if (!existing) {
      const hashPassword = bcrypt.hashSync(user.password, 10);
      const result = await run('INSERT INTO users (nama, email, password_hash, role) VALUES (?, ?, ?, ?)', [user.nama, user.email, hashPassword, user.role]);
      console.log(`✅ User created: ${user.email}`);
      userIds[user.email] = result.lastID;
    } else {
      userIds[user.email] = existing.id;
    }
  }

  // Create dummy schools in Banjarnegara
  const schools = [
    { nama: 'SDN 1 Banjarnegara', alamat: 'Jl. Raya Banjarnegara No. 10', latitude: -7.3590, longitude: 109.6010, kecamatan: 'Banjarnegara', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 245, kontak: '0286-591001' },
    { nama: 'SDN 2 Sigaluh', alamat: 'Jl. Sigaluh Raya No. 5', latitude: -7.3750, longitude: 109.6350, kecamatan: 'Sigaluh', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 180, kontak: '0286-591002' },
    { nama: 'SMPN 1 Madukara', alamat: 'Jl. Madukara No. 12', latitude: -7.3820, longitude: 109.5950, kecamatan: 'Madukara', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 320, kontak: '0286-591003' },
    { nama: 'SMAN 1 Mandiraja', alamat: 'Jl. Mandiraja No. 8', latitude: -7.4150, longitude: 109.5750, kecamatan: 'Mandiraja', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 380, kontak: '0286-591004' },
    { nama: 'SDN 1 Purwanegara', alamat: 'Jl. Purwanegara No. 3', latitude: -7.3750, longitude: 109.7450, kecamatan: 'Purwanegara', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 210, kontak: '0286-591005' },
    { nama: 'SMPN 2 Bawang', alamat: 'Jl. Bawang Raya No. 15', latitude: -7.3750, longitude: 109.6650, kecamatan: 'Bawang', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 275, kontak: '0286-591006' },
    { nama: 'SDN 3 Wanadadi', alamat: 'Jl. Wanadadi No. 7', latitude: -7.3550, longitude: 109.6350, kecamatan: 'Wanadadi', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 195, kontak: '0286-591007' },
    { nama: 'SMAN 1 Rakit', alamat: 'Jl. Rakit No. 20', latitude: -7.3650, longitude: 109.5450, kecamatan: 'Rakit', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 340, kontak: '0286-591008' },
    { nama: 'SDN 1 Punggelan', alamat: 'Jl. Punggelan No. 2', latitude: -7.3250, longitude: 109.5050, kecamatan: 'Punggelan', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 165, kontak: '0286-591009' },
    { nama: 'SMPN 1 Karangkobar', alamat: 'Jl. Karangkobar No. 9', latitude: -7.2750, longitude: 109.5450, kecamatan: 'Karangkobar', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 290, kontak: '0286-591010' },
    { nama: 'SDN 2 Banjarmangu', alamat: 'Jl. Banjarmangu No. 11', latitude: -7.3450, longitude: 109.6950, kecamatan: 'Banjarmangu', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 225, kontak: '0286-591011' },
    { nama: 'SMPN 3 Susukan', alamat: 'Jl. Susukan No. 6', latitude: -7.2750, longitude: 109.7250, kecamatan: 'Susukan', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 260, kontak: '0286-591012' },
    { nama: 'SDN 1 Batur', alamat: 'Jl. Batur No. 14', latitude: -7.2450, longitude: 109.6350, kecamatan: 'Batur', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 185, kontak: '0286-591013' },
    { nama: 'SMAN 2 Wanayasa', alamat: 'Jl. Wanayasa No. 4', latitude: -7.3150, longitude: 109.7350, kecamatan: 'Wanayasa', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 310, kontak: '0286-591014' },
    { nama: 'SDN 1 Kalibening', alamat: 'Jl. Kalibening No. 8', latitude: -7.3450, longitude: 109.7650, kecamatan: 'Kalibening', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 200, kontak: '0286-591015' },
    { nama: 'SMPN 1 Pejawaran', alamat: 'Jl. Pejawaran No. 13', latitude: -7.2750, longitude: 109.6650, kecamatan: 'Pejawaran', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 270, kontak: '0286-591016' },
    { nama: 'SDN 2 Pagentan', alamat: 'Jl. Pagentan No. 1', latitude: -7.2350, longitude: 109.5850, kecamatan: 'Pagentan', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 155, kontak: '0286-591017' },
    { nama: 'SMPN 1 Pagedongan', alamat: 'Jl. Pagedongan No. 10', latitude: -7.3150, longitude: 109.6750, kecamatan: 'Pagedongan', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 245, kontak: '0286-591018' },
    { nama: 'SDN 1 Purworejo Klampok', alamat: 'Jl. Purworejo Klampok No. 5', latitude: -7.3950, longitude: 109.5650, kecamatan: 'Purworejo Klampok', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 190, kontak: '0286-591019' },
    { nama: 'SMAN 1 Pandanarum', alamat: 'Jl. Pandanarum No. 7', latitude: -7.3850, longitude: 109.6150, kecamatan: 'Pandanarum', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', jumlah_siswa: 325, kontak: '0286-591020' },
  ];

  for (const school of schools) {
    const existing = await get('SELECT id FROM sekolah WHERE nama = ?', [school.nama]);
    if (!existing) {
      await run(`INSERT INTO sekolah (nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa, kontak, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif')`, [school.nama, school.alamat, school.latitude, school.longitude, school.kecamatan, school.kabupaten, school.provinsi, school.jumlah_siswa, school.kontak]);
      console.log(`✅ Sekolah created: ${school.nama}`);
    }
  }

  // Create dummy dapur suppliers in Banjarnegara
  // Link first 2 dapurs to supplier user, rest without user (admin managed)
  const supplierUserId = userIds['dapur1@mbg.go.id'];
  
  const dapurs = [
    { nama: 'Dapur MBG Banjarnegara', user_id: supplierUserId, alamat: 'Jl. Raya Banjarnegara No. 45', latitude: -7.3611, longitude: 109.5875, kecamatan: 'Banjarnegara', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', kapasitas_harian: 2000, kontak: '081234567890', penanggung_jawab: 'Hj. Siti Ma\'rufah' },
    { nama: 'Catering Berkah Banjarnegara', user_id: null, alamat: 'Jl. A. Yani No. 88', latitude: -7.3550, longitude: 109.6050, kecamatan: 'Banjarnegara', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', kapasitas_harian: 1500, kontak: '082345678901', penanggung_jawab: 'Budi Hartono' },
    { nama: 'Dapur Sehat Mandiraja', user_id: null, alamat: 'Jl. Mandiraja-Sigaluh Km 2', latitude: -7.4050, longitude: 109.5850, kecamatan: 'Mandiraja', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', kapasitas_harian: 1200, kontak: '083456789012', penanggung_jawab: 'Dwi Rahayu' },
    { nama: 'Kitchen Bawang', user_id: null, alamat: 'Jl. Bawang Raya No. 30', latitude: -7.3700, longitude: 109.6700, kecamatan: 'Bawang', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', kapasitas_harian: 1000, kontak: '084567890123', penanggung_jawab: 'Ahmad Fauzi' },
    { nama: 'Catering Purwanegara', user_id: null, alamat: 'Jl. Purwanegara No. 22', latitude: -7.3800, longitude: 109.7400, kecamatan: 'Purwanegara', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', kapasitas_harian: 800, kontak: '085678901234', penanggung_jawab: 'Sri Wahyuni' },
  ];

  for (const dapur of dapurs) {
    const existing = await get('SELECT id FROM dapur_supplier WHERE nama = ?', [dapur.nama]);
    if (!existing) {
      await run(`INSERT INTO dapur_supplier (nama, user_id, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, kapasitas_harian, kontak, penanggung_jawab, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif')`, [dapur.nama, dapur.user_id, dapur.alamat, dapur.latitude, dapur.longitude, dapur.kecamatan, dapur.kabupaten, dapur.provinsi, dapur.kapasitas_harian, dapur.kontak, dapur.penanggung_jawab]);
      console.log(`✅ Dapur created: ${dapur.nama}${dapur.user_id ? ' (linked to supplier user)' : ''}`);
    }
  }

  // Create dummy dapur_kurir relations
  // Assign first 2 kitchens to kurir1
  const kurir1Id = userIds['kurir1@mbg.go.id'];
  const dapursForKurir = await all('SELECT id FROM dapur_supplier LIMIT 2');
  
  for (const dapur of dapursForKurir) {
    const existing = await get('SELECT id FROM dapur_kurir WHERE dapur_id = ? AND kurir_id = ?', [dapur.id, kurir1Id]);
    if (!existing) {
      await run('INSERT INTO dapur_kurir (dapur_id, kurir_id, tanggal_mulai, status) VALUES (?, ?, date("now"), "aktif")', [dapur.id, kurir1Id]);
      console.log(`✅ Kurir 1 assigned to Dapur ID ${dapur.id}`);
    }
  }

  // Create dummy dapur_sekolah relations
  // Assign first 10 schools to dapur 1, rest to dapur 2
  const allSchools = await all('SELECT id FROM sekolah ORDER BY id');
  const allDapurs = await all('SELECT id FROM dapur_supplier ORDER BY id LIMIT 2');
  
  if (allDapurs.length >= 2 && allSchools.length > 0) {
    const halfPoint = Math.ceil(allSchools.length / 2);
    const hariKirim = JSON.stringify(['senin', 'selasa', 'rabu', 'kamis', 'jumat']);
    
    for (let i = 0; i < allSchools.length; i++) {
      const dapurIdx = i < halfPoint ? 0 : 1;
      const existing = await get('SELECT id FROM dapur_sekolah WHERE dapur_id = ? AND sekolah_id = ?', [allDapurs[dapurIdx].id, allSchools[i].id]);
      
      if (!existing) {
        await run(
          'INSERT INTO dapur_sekolah (dapur_id, sekolah_id, hari_kirim, jumlah_porsi, status) VALUES (?, ?, ?, ?, "aktif")',
          [allDapurs[dapurIdx].id, allSchools[i].id, hariKirim, 200]
        );
      }
    }
    console.log(`✅ Seeded ${allSchools.length} dapur_sekolah relations`);
  }

  console.log('\n✅ Seeding completed successfully!');
  console.log('\n📝 Demo Accounts:');
  console.log('  Admin BGN: admin@mbg.go.id / admin123');
  console.log('  Admin Daerah: daerah1@mbg.go.id / daerah123');
  console.log('  Kurir: kurir1@mbg.go.id / kurir123');
  console.log('  Supplier: dapur1@mbg.go.id / dapur123');
  console.log('\n🔗 New Relations:');
  console.log('  - dapur_kurir: Kurir assigned to kitchens');
  console.log('  - dapur_sekolah: Schools assigned to kitchens');

  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
