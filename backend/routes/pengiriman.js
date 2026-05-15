const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, permissions } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

// Get all pengiriman
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, jadwal_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    let query = db('pengiriman as p')
      .join('jadwal_distribusi as jd', 'p.jadwal_id', 'jd.id')
      .join('dapur_supplier as ds', 'jd.dapur_id', 'ds.id')
      .join('sekolah as s', 'jd.sekolah_id', 's.id')
      .whereNull('p.deleted_at');

    if (status) query = query.where({ 'p.status': status });
    if (jadwal_id) query = query.where({ 'p.jadwal_id': jadwal_id });

    if (req.user?.role === 'supplier' || req.user?.role === 'kurir') {
      let accessibleDapurIds = [];
      if (req.user.role === 'supplier') {
        const rows = await db('dapur_supplier')
          .select('id')
          .where({ user_id: req.user.id })
          .whereNull('deleted_at');
        accessibleDapurIds = rows.map((r) => r.id);
      } else {
        const rows = await db('dapur_kurir')
          .select('dapur_id')
          .where({ kurir_id: req.user.id, status: 'aktif' });
        accessibleDapurIds = rows.map((r) => r.dapur_id);
      }

      if (accessibleDapurIds.length === 0) {
        return res.json({
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        });
      }

      query = query.whereIn('jd.dapur_id', accessibleDapurIds);

      if (req.user.role === 'kurir') {
        query = query.where({ 'p.kurir_id': req.user.id });
      }
    }

    // Get total count
    const totalCount = await query.clone().count('* as total').first();
    const total = totalCount.total;

    const pengiriman = await query
      .select('p.*', 'jd.tanggal', 'jd.waktu_kirim', 'ds.nama as dapur_nama', 's.nama as sekolah_nama')
      .orderBy('p.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      data: pengiriman,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get pengiriman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get pengiriman by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pengiriman = await db('pengiriman as p')
      .join('jadwal_distribusi as jd', 'p.jadwal_id', 'jd.id')
      .join('dapur_supplier as ds', 'jd.dapur_id', 'ds.id')
      .join('sekolah as s', 'jd.sekolah_id', 's.id')
      .join('users as u', 'p.kurir_id', u.id)
      .select(
        'p.*', 'jd.tanggal', 'jd.waktu_kirim',
        'ds.nama as dapur_nama', 'ds.latitude as dapur_latitude', 'ds.longitude as dapur_longitude',
        's.nama as sekolah_nama', 's.latitude as sekolah_latitude', 's.longitude as sekolah_longitude',
        'u.nama as kurir_nama'
      )
      .where({ 'p.id': req.params.id })
      .whereNull('p.deleted_at')
      .first();
    
    if (!pengiriman) {
      return res.status(404).json({ error: 'Pengiriman tidak ditemukan' });
    }

    res.json(pengiriman);
  } catch (error) {
    console.error('Get single pengiriman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create pengiriman
router.post('/', authenticateToken, requireRole(permissions.pengiriman.create), async (req, res) => {
  try {
    const { jadwal_id, kurir_id } = req.body;

    const [id] = await db('pengiriman').insert({
      jadwal_id,
      kurir_id,
      status: 'dalam_perjalanan'
    }).returning('id');

    const newId = typeof id === 'object' ? id.id : id;

    // Log audit
    await logAudit({
      action: 'CREATE',
      table_name: 'pengiriman',
      record_id: newId,
      new_values: { jadwal_id, kurir_id, status: 'dalam_perjalanan' },
      req
    });

    // Update jadwal status
    await db('jadwal_distribusi').where({ id: jadwal_id }).update({ status: 'dalam_pengiriman' });

    res.status(201).json({
      message: 'Pengiriman berhasil dibuat',
      id: newId,
    });
  } catch (error) {
    console.error('Create pengiriman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update pengiriman (termasuk status & data lainnya)
router.put('/:id', authenticateToken, requireRole(permissions.pengiriman.updateStatus), async (req, res) => {
  try {
    const { latitude, longitude, status, bukti_foto, catatan, waktu_berangkat, waktu_tiba } = req.body;

    const existing = await db('pengiriman').where({ id: req.params.id }).whereNull('deleted_at').first();
    
    if (!existing) {
      return res.status(404).json({ error: 'Pengiriman tidak ditemukan' });
    }

    if (req.user.role === 'kurir' && existing.kurir_id !== req.user.id) {
      return res.status(403).json({ error: 'Anda hanya bisa mengupdate pengiriman Anda sendiri' });
    }

    const updatePayload = {
      latitude: latitude !== undefined ? latitude : existing.latitude,
      longitude: longitude !== undefined ? longitude : existing.longitude,
      status: status || existing.status,
      bukti_foto: bukti_foto || existing.bukti_foto,
      catatan: catatan !== undefined ? catatan : existing.catatan,
      waktu_berangkat: waktu_berangkat || existing.waktu_berangkat,
      waktu_tiba: waktu_tiba || existing.waktu_tiba,
      updated_at: db.fn.now()
    };

    await db('pengiriman')
      .where({ id: req.params.id })
      .update(updatePayload);

    // Log audit
    await logAudit({
      action: 'UPDATE',
      table_name: 'pengiriman',
      record_id: req.params.id,
      old_values: existing,
      new_values: updatePayload,
      req
    });

    if (status === 'diterima') {
      await db('jadwal_distribusi')
        .where({ id: existing.jadwal_id })
        .update({ status: 'diterima', waktu_terima: db.fn.now() });
    }

    res.json({ message: 'Pengiriman berhasil diupdate' });
  } catch (error) {
    console.error('Update pengiriman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update lokasi kurir (Khusus endpoint tracking GPS)
router.put('/:id/location', authenticateToken, requireRole(permissions.pengiriman.updateStatus), async (req, res) => {       
  try {
    const { latitude, longitude, status, catatan } = req.body;
    const existing = await db('pengiriman').where({ id: req.params.id }).whereNull('deleted_at').first();

    if (!existing) {
      return res.status(404).json({ error: 'Pengiriman tidak ditemukan' });
    }

    if (req.user.role === 'kurir' && existing.kurir_id !== req.user.id) {
      return res.status(403).json({ error: 'Anda hanya bisa mengupdate lokasi pengiriman Anda sendiri' });
    }

    const updatePayload = {
      latitude: latitude !== undefined ? latitude : existing.latitude,
      longitude: longitude !== undefined ? longitude : existing.longitude,
      status: status || existing.status,
      catatan: catatan !== undefined ? catatan : existing.catatan,
      updated_at: db.fn.now()
    };

    await db('pengiriman')
      .where({ id: req.params.id })
      .update(updatePayload);

    // Log audit (tracking location)
    await logAudit({
      action: 'UPDATE_LOCATION',
      table_name: 'pengiriman',
      record_id: req.params.id,
      old_values: { latitude: existing.latitude, longitude: existing.longitude, status: existing.status },
      new_values: updatePayload,
      req
    });

    if (status === 'diterima') {
      await db('jadwal_distribusi')
        .where({ id: existing.jadwal_id })
        .update({ status: 'diterima', waktu_terima: db.fn.now() });
    }

    res.json({ message: 'Lokasi berhasil diupdate' });
  } catch (error) {
    console.error('Update lokasi error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get active courier locations
router.get('/tracking/active', authenticateToken, async (req, res) => {
  try {
    const couriers = await db('pengiriman as p')
      .join('users as u', 'p.kurir_id', 'u.id')
      .join('jadwal_distribusi as jd', 'p.jadwal_id', 'jd.id')
      .join('sekolah as s', 'jd.sekolah_id', 's.id')
      .select(
        'p.id', 'p.latitude', 'p.longitude', 'p.status', 'p.kurir_id', 'p.catatan', 'p.updated_at',
        'u.nama as kurir_nama', 'jd.tanggal',
        's.nama as sekolah_nama', 's.latitude as sekolah_lat', 's.longitude as sekolah_lng'
      )
      .where({ 'p.status': 'dalam_perjalanan' })
      .whereNotNull('p.latitude')
      .whereNotNull('p.longitude')
      .whereNull('p.deleted_at')
      .orderBy('p.updated_at', 'desc');

    res.json(couriers);
  } catch (error) {
    console.error('Get tracking active error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;