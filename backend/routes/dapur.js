const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, permissions } = require('../middleware/rbac');
const { dapurSchema, validate } = require('../validation/schemas');

// Get all dapur supplier
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { kecamatan, kabupaten, status, search } = req.query;
    
    let query = db('dapur_supplier').whereNull('deleted_at');

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
        return res.json([]);
      }

      query = query.whereIn('id', accessibleDapurIds);
    }

    if (kecamatan) query = query.where({ kecamatan });
    if (kabupaten) query = query.where({ kabupaten });
    if (status) query = query.where({ status });
    if (search) {
      query = query.where(function() {
        this.where('nama', 'LIKE', `%${search}%`)
          .orWhere('alamat', 'LIKE', `%${search}%`);
      });
    }

    const dapur = await query.orderBy('nama', 'asc');
    res.json(dapur);
  } catch (error) {
    console.error('Get dapur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get dapur by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const dapur = await db('dapur_supplier')
      .where({ id: req.params.id })
      .whereNull('deleted_at')
      .first();
    
    if (!dapur) {
      return res.status(404).json({ error: 'Dapur tidak ditemukan' });
    }

    res.json(dapur);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get sekolah binaan untuk dapur tertentu
router.get('/:id/sekolah', authenticateToken, async (req, res) => {
  try {
    const dapurId = req.params.id;

    // Ensure dapur exists and not deleted
    const dapur = await db('dapur_supplier')
      .where({ id: dapurId })
      .whereNull('deleted_at')
      .first();
      
    if (!dapur) return res.status(404).json({ error: 'Dapur tidak ditemukan' });

    const rows = await db('dapur_sekolah')
      .join('sekolah', 'dapur_sekolah.sekolah_id', 'sekolah.id')
      .select('sekolah.*', 'dapur_sekolah.hari_kirim', 'dapur_sekolah.jumlah_porsi', 'dapur_sekolah.status as rel_status')
      .where({ 
        'dapur_sekolah.dapur_id': dapurId,
        'dapur_sekolah.status': 'aktif' 
      })
      .whereNull('sekolah.deleted_at')
      .orderBy('sekolah.nama', 'asc');

    res.json(rows);
  } catch (error) {
    console.error('Get dapur sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create dapur
router.post('/', authenticateToken, requireRole(permissions.dapur.create), validate(dapurSchema), async (req, res) => {
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, kapasitas_harian, kontak, penanggung_jawab } = req.body;

    const [id] = await db('dapur_supplier').insert({
      nama,
      alamat,
      latitude,
      longitude,
      kecamatan,
      kabupaten: kabupaten || '',
      provinsi: provinsi || '',
      kapasitas_harian: kapasitas_harian || 0,
      kontak: kontak || null,
      penanggung_jawab: penanggung_jawab || null,
    }).returning('id');

    res.status(201).json({
      message: 'Dapur supplier berhasil ditambahkan',
      id: typeof id === 'object' ? id.id : id,
    });
  } catch (error) {
    console.error('Create dapur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update dapur
router.put('/:id', authenticateToken, requireRole([...permissions.dapur.update, ...permissions.dapur.updateOwn]), validate(dapurSchema), async (req, res) => {
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, kapasitas_harian, kontak, penanggung_jawab, status } = req.body;

    const existing = await db('dapur_supplier')
      .where({ id: req.params.id })
      .whereNull('deleted_at')
      .first();
    
    if (!existing) {
      return res.status(404).json({ error: 'Dapur tidak ditemukan' });
    }

    // Ownership check for supplier
    if (req.user.role === 'supplier' && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Anda hanya bisa mengubah dapur milik Anda sendiri' });
    }

    await db('dapur_supplier')
      .where({ id: req.params.id })
      .update({
        nama,
        alamat,
        latitude,
        longitude,
        kecamatan,
        kabupaten,
        provinsi,
        kapasitas_harian,
        kontak,
        penanggung_jawab,
        status,
        updated_at: db.fn.now()
      });

    res.json({ message: 'Dapur supplier berhasil diupdate' });
  } catch (error) {
    console.error('Update dapur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete dapur (Soft Delete)
router.delete('/:id', authenticateToken, requireRole(permissions.dapur.delete), async (req, res) => {
  try {
    const existing = await db('dapur_supplier')
      .where({ id: req.params.id })
      .whereNull('deleted_at')
      .first();
    
    if (!existing) {
      return res.status(404).json({ error: 'Dapur tidak ditemukan' });
    }

    await db('dapur_supplier')
      .where({ id: req.params.id })
      .update({ deleted_at: db.fn.now() });

    res.json({ message: 'Dapur supplier berhasil dihapus' });
  } catch (error) {
    console.error('Delete dapur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
