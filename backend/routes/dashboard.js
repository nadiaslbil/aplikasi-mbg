const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Dashboard statistics
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Total sekolah aktif
    const totalSekolah = db.prepare('SELECT COUNT(*) as count FROM sekolah WHERE status = ?').get('aktif');

    // Total dapur aktif
    const totalDapur = db.prepare('SELECT COUNT(*) as count FROM dapur_supplier WHERE status = ?').get('aktif');

    // Total jadwal hari ini
    const jadwalHariIni = db.prepare('SELECT COUNT(*) as count FROM jadwal_distribusi WHERE tanggal = ?').get(today);

    // Total jadwal status
    const jadwalStatus = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'terjadwal' THEN 1 ELSE 0 END) as terjadwal,
        SUM(CASE WHEN status = 'dalam_pengiriman' THEN 1 ELSE 0 END) as dalam_pengiriman,
        SUM(CASE WHEN status = 'diterima' THEN 1 ELSE 0 END) as diterima,
        SUM(CASE WHEN status = 'gagal' THEN 1 ELSE 0 END) as gagal
      FROM jadwal_distribusi
      WHERE tanggal = ?
    `).get(today);

    // Total pengiriman bulan ini
    const pengirimanBulanIni = db.prepare(`
      SELECT COUNT(*) as count FROM jadwal_distribusi 
      WHERE strftime('%Y-%m', tanggal) = strftime('%Y-%m', 'now')
    `).get(new Date());

    // Insiden bulan ini
    const insidenBulanIni = db.prepare(`
      SELECT COUNT(*) as count FROM insiden 
      WHERE strftime('%Y-%m', tanggal) = strftime('%Y-%m', 'now')
    `).get(new Date());

    // Stok hampir expired
    const stokExpiredSoon = db.prepare(`
      SELECT COUNT(*) as count FROM stok_bahan 
      WHERE expired_date <= date('now', '+3 days')
    `).get();

    res.json({
      today,
      sekolah: {
        total_aktif: totalSekolah.count,
      },
      dapur: {
        total_aktif: totalDapur.count,
      },
      jadwal_hari_ini: {
        total: jadwalHariIni.count,
        terjadwal: jadwalStatus.terjadwal || 0,
        dalam_pengiriman: jadwalStatus.dalam_pengiriman || 0,
        diterima: jadwalStatus.diterima || 0,
        gagal: jadwalStatus.gagal || 0,
      },
      pengiriman_bulan_ini: pengirimanBulanIni.count,
      insiden_bulan_ini: insidenBulanIni.count,
      stok_expired_soon: stokExpiredSoon.count,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get data for map (all locations)
router.get('/map-data', authenticateToken, (req, res) => {
  try {
    // Sekolah locations
    const sekolah = db.prepare(`
      SELECT id, nama, alamat, latitude, longitude, kecamatan, jumlah_siswa, status
      FROM sekolah
      WHERE status = 'aktif'
    `).all();

    // Dapur locations
    const dapur = db.prepare(`
      SELECT id, nama, alamat, latitude, longitude, kecamatan, kapasitas_harian, status
      FROM dapur_supplier
      WHERE status = 'aktif'
    `).all();

    // Active courier locations
    const couriers = db.prepare(`
      SELECT p.id, p.latitude, p.longitude, p.status,
             u.nama as kurir_nama,
             s.nama as sekolah_nama
      FROM pengiriman p
      JOIN users u ON p.kurir_id = u.id
      JOIN jadwal_distribusi jd ON p.jadwal_id = jd.id
      JOIN sekolah s ON jd.sekolah_id = s.id
      WHERE p.status = 'dalam_perjalanan'
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
    `).all();

    // Insiden locations (last 30 days)
    const insiden = db.prepare(`
      SELECT id, sekolah_id, tipe, deskripsi, latitude, longitude, tanggal, status
      FROM insiden
      WHERE latitude IS NOT NULL 
      AND longitude IS NOT NULL
      AND tanggal >= date('now', '-30 days')
      ORDER BY tanggal DESC
    `).all();

    res.json({
      sekolah,
      dapur,
      couriers,
      insiden,
    });
  } catch (error) {
    console.error('Get map data error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Recent activities
router.get('/recent-activities', authenticateToken, (req, res) => {
  try {
    const activities = db.prepare(`
      SELECT 'pengiriman' as type, p.id, p.status, u.nama as kurir, s.nama as sekolah, p.updated_at
      FROM pengiriman p
      JOIN users u ON p.kurir_id = u.id
      JOIN jadwal_distribusi jd ON p.jadwal_id = jd.id
      JOIN sekolah s ON jd.sekolah_id = s.id
      UNION ALL
      SELECT 'insiden' as type, i.id, i.status, '' as kurir, COALESCE(s.nama, d.nama) as sekolah, i.updated_at
      FROM insiden i
      LEFT JOIN sekolah s ON i.sekolah_id = s.id
      LEFT JOIN dapur_supplier d ON i.dapur_id = d.id
      ORDER BY updated_at DESC
      LIMIT 20
    `).all();

    res.json(activities);
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Distribution by kecamatan
router.get('/by-kecamatan', authenticateToken, (req, res) => {
  try {
    const data = db.prepare(`
      SELECT s.kecamatan, 
             COUNT(DISTINCT s.id) as total_sekolah,
             SUM(s.jumlah_siswa) as total_siswa,
             COUNT(DISTINCT jd.id) as total_pengiriman
      FROM sekolah s
      LEFT JOIN jadwal_distribusi jd ON s.id = jd.sekolah_id
      WHERE s.status = 'aktif'
      GROUP BY s.kecamatan
      ORDER BY s.kecamatan
    `).all();

    res.json(data);
  } catch (error) {
    console.error('Get by kecamatan error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
