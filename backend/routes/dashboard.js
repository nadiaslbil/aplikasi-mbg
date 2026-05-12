const express = require('express');
const router = express.Router();
const { db, isPostgres } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Supplier dashboard stats (scoped to supplier's dapur)
router.get('/supplier-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'supplier') {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const nextMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0];
    const expiredSoonDate = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

    const dapurRows = await db('dapur_supplier')
      .select('id', 'nama', 'kapasitas_harian')
      .where({ user_id: req.user.id })
      .whereNull('deleted_at')
      .orderBy('id', 'asc');

    if (!dapurRows.length) {
      return res.json({
        dapur: null,
        jadwal_hari_ini: { total: 0, terjadwal: 0, dalam_pengiriman: 0, diterima: 0, gagal: 0 },
        pengiriman_bulan_ini: 0,
        insiden_bulan_ini: 0,
        stok_hampir_expired: 0,
        sekolah_binaan: 0,
      });
    }

    const dapurIds = dapurRows.map((d) => d.id);

    const jadwalStatus = await db('jadwal_distribusi')
      .count('* as total')
      .select(
        db.raw("SUM(CASE WHEN status = 'terjadwal' THEN 1 ELSE 0 END) as terjadwal"),
        db.raw("SUM(CASE WHEN status = 'dalam_pengiriman' THEN 1 ELSE 0 END) as dalam_pengiriman"),
        db.raw("SUM(CASE WHEN status = 'diterima' THEN 1 ELSE 0 END) as diterima"),
        db.raw("SUM(CASE WHEN status = 'gagal' THEN 1 ELSE 0 END) as gagal")
      )
      .where({ tanggal: today })
      .whereIn('dapur_id', dapurIds)
      .whereNull('deleted_at')
      .first();

    const pengirimanBulanIni = await db('pengiriman as p')
      .join('jadwal_distribusi as jd', 'p.jadwal_id', 'jd.id')
      .where('jd.tanggal', '>=', monthStart)
      .where('jd.tanggal', '<', nextMonthStart)
      .whereIn('jd.dapur_id', dapurIds)
      .whereNull('p.deleted_at')
      .whereNull('jd.deleted_at')
      .count('* as count')
      .first();

    const insidenBulanIni = await db('insiden as i')
      .where('i.tanggal', '>=', monthStart)
      .where('i.tanggal', '<', nextMonthStart)
      .whereNull('i.deleted_at')
      .where(function() {
        this.whereIn('i.dapur_id', dapurIds)
          .orWhere(function() {
            this.whereNull('i.dapur_id')
              .whereExists(function() {
                this.select(1)
                  .from('dapur_sekolah as dsk')
                  .whereRaw('dsk.sekolah_id = i.sekolah_id')
                  .where({ 'dsk.status': 'aktif' })
                  .whereIn('dsk.dapur_id', dapurIds);
              });
          });
      })
      .count('* as count')
      .first();

    const stokExpiredSoon = await db('stok_bahan')
      .where('expired_date', '<=', expiredSoonDate)
      .whereIn('dapur_id', dapurIds)
      .whereNull('deleted_at')
      .count('* as count')
      .first();

    const sekolahBinaan = await db('dapur_sekolah')
      .where({ status: 'aktif' })
      .whereIn('dapur_id', dapurIds)
      .countDistinct('sekolah_id as count')
      .first();

    res.json({
      dapur: {
        id: dapurRows[0].id,
        nama: dapurRows[0].nama,
        kapasitas_harian: dapurRows[0].kapasitas_harian || 0,
      },
      jadwal_hari_ini: {
        total: parseInt(jadwalStatus?.total) || 0,
        terjadwal: parseInt(jadwalStatus?.terjadwal) || 0,
        dalam_pengiriman: parseInt(jadwalStatus?.dalam_pengiriman) || 0,
        diterima: parseInt(jadwalStatus?.diterima) || 0,
        gagal: parseInt(jadwalStatus?.gagal) || 0,
      },
      pengiriman_bulan_ini: parseInt(pengirimanBulanIni?.count) || 0,
      insiden_bulan_ini: parseInt(insidenBulanIni?.count) || 0,
      stok_hampir_expired: parseInt(stokExpiredSoon?.count) || 0,
      sekolah_binaan: parseInt(sekolahBinaan?.count) || 0,
    });
  } catch (error) {
    console.error('Get supplier stats error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const totalSekolah = await db('sekolah').where({ status: 'aktif' }).whereNull('deleted_at').count('* as count').first();
    const totalDapur = await db('dapur_supplier').where({ status: 'aktif' }).whereNull('deleted_at').count('* as count').first();
    
    const jadwalStatus = await db('jadwal_distribusi')
      .count('* as total')
      .select(
        db.raw("SUM(CASE WHEN status = 'terjadwal' THEN 1 ELSE 0 END) as terjadwal"),
        db.raw("SUM(CASE WHEN status = 'dalam_pengiriman' THEN 1 ELSE 0 END) as dalam_pengiriman"),
        db.raw("SUM(CASE WHEN status = 'diterima' THEN 1 ELSE 0 END) as diterima"),
        db.raw("SUM(CASE WHEN status = 'gagal' THEN 1 ELSE 0 END) as gagal")
      )
      .where({ tanggal: today })
      .whereNull('deleted_at')
      .first();

    const pengirimanBulanIni = await db('jadwal_distribusi')
      .whereNull('deleted_at')
      .where(function() {
        if (isPostgres) {
          this.whereRaw("TO_CHAR(tanggal::date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')");
        } else {
          this.whereRaw("strftime('%Y-%m', tanggal) = strftime('%Y-%m', 'now')");
        }
      })
      .count('* as count')
      .first();

    const insidenBulanIni = await db('insiden')
      .whereNull('deleted_at')
      .where(function() {
        if (isPostgres) {
          this.whereRaw("TO_CHAR(tanggal::date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')");
        } else {
          this.whereRaw("strftime('%Y-%m', tanggal) = strftime('%Y-%m', 'now')");
        }
      })
      .count('* as count')
      .first();

    const stokExpiredSoon = await db('stok_bahan')
      .whereNull('deleted_at')
      .where(function() {
        if (isPostgres) {
          this.whereRaw("expired_date <= (CURRENT_DATE + INTERVAL '3 days')");
        } else {
          this.whereRaw("expired_date <= date('now', '+3 days')");
        }
      })
      .count('* as count')
      .first();

    res.json({
      today,
      sekolah: { total_aktif: parseInt(totalSekolah?.count) || 0 },
      dapur: { total_aktif: parseInt(totalDapur?.count) || 0 },
      jadwal_hari_ini: {
        total: parseInt(jadwalStatus?.total) || 0,
        terjadwal: parseInt(jadwalStatus?.terjadwal) || 0,
        dalam_pengiriman: parseInt(jadwalStatus?.dalam_pengiriman) || 0,
        diterima: parseInt(jadwalStatus?.diterima) || 0,
        gagal: parseInt(jadwalStatus?.gagal) || 0,
      },
      pengiriman_bulan_ini: parseInt(pengirimanBulanIni?.count) || 0,
      insiden_bulan_ini: parseInt(insidenBulanIni?.count) || 0,
      stok_expired_soon: parseInt(stokExpiredSoon?.count) || 0,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get data for map (all locations)
router.get('/map-data', authenticateToken, async (req, res) => {
  try {
    const sekolah = await db('sekolah')
      .select('id', 'nama', 'alamat', 'latitude', 'longitude', 'kecamatan', 'jumlah_siswa', 'status')
      .where({ status: 'aktif' })
      .whereNull('deleted_at');

    const dapur = await db('dapur_supplier')
      .select('id', 'nama', 'alamat', 'latitude', 'longitude', 'kecamatan', 'kapasitas_harian', 'status')
      .where({ status: 'aktif' })
      .whereNull('deleted_at');

    const couriers = await db('pengiriman as p')
      .join('users as u', 'p.kurir_id', 'u.id')
      .join('jadwal_distribusi as jd', 'p.jadwal_id', 'jd.id')
      .join('sekolah as s', 'jd.sekolah_id', 's.id')
      .select(
        'p.id', 'p.latitude', 'p.longitude', 'p.status', 'p.catatan', 'p.updated_at',
        'u.nama as kurir_nama',
        's.nama as sekolah_nama', 's.latitude as sekolah_lat', 's.longitude as sekolah_lng'
      )
      .where({ 'p.status': 'dalam_perjalanan' })
      .whereNotNull('p.latitude')
      .whereNotNull('p.longitude')
      .whereNull('p.deleted_at');

    const insiden = await db('insiden')
      .whereNotNull('latitude')
      .whereNotNull('longitude')
      .whereNull('deleted_at')
      .where(function() {
        if (isPostgres) {
          this.whereRaw("tanggal >= (CURRENT_DATE - INTERVAL '30 days')");
        } else {
          this.whereRaw("tanggal >= date('now', '-30 days')");
        }
      })
      .orderBy('tanggal', 'desc');

    res.json({ sekolah, dapur, couriers, insiden });
  } catch (error) {
    console.error('Get map data error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Recent activities
router.get('/recent-activities', authenticateToken, async (req, res) => {
  try {
    const activities = await db.union([
      db('pengiriman as p')
        .join('users as u', 'p.kurir_id', 'u.id')
        .join('jadwal_distribusi as jd', 'p.jadwal_id', 'jd.id')
        .join('sekolah as s', 'jd.sekolah_id', 's.id')
        .select(db.raw("'pengiriman' as type"), 'p.id', 'p.status', 'u.nama as kurir', 's.nama as sekolah', 'p.updated_at')
        .whereNull('p.deleted_at'),
      db('insiden as i')
        .leftJoin('sekolah as s', 'i.sekolah_id', 's.id')
        .leftJoin('dapur_supplier as d', 'i.dapur_id', 'd.id')
        .select(db.raw("'insiden' as type"), 'i.id', 'i.status', db.raw("'' as kurir"), db.raw("COALESCE(s.nama, d.nama) as sekolah"), 'i.updated_at')
        .whereNull('i.deleted_at')
    ]).orderBy('updated_at', 'desc').limit(20);

    res.json(activities);
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Distribution by kecamatan
router.get('/by-kecamatan', authenticateToken, async (req, res) => {
  try {
    const data = await db('sekolah as s')
      .leftJoin('jadwal_distribusi as jd', 's.id', 'jd.sekolah_id')
      .select(
        's.kecamatan',
        db.raw('COUNT(DISTINCT s.id) as total_sekolah'),
        db.raw('SUM(s.jumlah_siswa) as total_siswa'),
        db.raw('COUNT(DISTINCT jd.id) as total_pengiriman')
      )
      .where({ 's.status': 'aktif' })
      .whereNull('s.deleted_at')
      .groupBy('s.kecamatan')
      .orderBy('s.kecamatan');

    res.json(data);
  } catch (error) {
    console.error('Get by kecamatan error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
