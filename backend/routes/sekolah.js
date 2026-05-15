const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, permissions } = require('../middleware/rbac');
const { sekolahSchema, validate } = require('../validation/schemas');
const { logAudit } = require('../middleware/audit');

// Get all sekolah
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { kecamatan, kabupaten, status, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = db('sekolah').whereNull('deleted_at');

    if (req.user?.role === 'supplier' || req.user?.role === 'kurir') {
      let accessibleDapurIds = [];
      if (req.user.role === 'supplier') {
        const rows = await db('dapur_supplier').select('id').where({ user_id: req.user.id }).whereNull('deleted_at');        
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

      query = query.whereExists(function() {
        this.select(1)
          .from('dapur_sekolah')
          .whereRaw('dapur_sekolah.sekolah_id = sekolah.id')
          .where({ status: 'aktif' })
          .whereIn('dapur_id', accessibleDapurIds);
      });
    }

    if (kecamatan) query = query.where({ kecamatan });
    if (kabupaten) query = query.where({ kabupaten });
    if (status) query = query.where({ status });
    if (search) {
      query = query.where(function() {
        this.where('nama', 'LIKE', `%${search}%`)
          .orWhere('alamat', 'LIKE', `%${search}%`)
          .orWhere('kecamatan', 'LIKE', `%${search}%`);
      });
    }

    // Get total count
    const totalCount = await query.clone().count('* as total').first();
    const total = totalCount.total;

    // Get paginated data
    const sekolah = await query
      .select('*')
      .orderBy('nama', 'asc')
      .limit(limit)
      .offset(offset);

    if (!sekolah.length) {
      return res.json({
        data: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    }

    const sekolahIds = sekolah.map((s) => s.id);
    const dapurRows = await db('dapur_sekolah')
      .join('dapur_supplier', 'dapur_sekolah.dapur_id', 'dapur_supplier.id')
      .select('dapur_sekolah.sekolah_id', 'dapur_supplier.nama as dapur_nama')
      .where({ 'dapur_sekolah.status': 'aktif' })
      .whereIn('dapur_sekolah.sekolah_id', sekolahIds)
      .whereNull('dapur_supplier.deleted_at')
      .orderBy('dapur_supplier.nama', 'asc');

    const dapurBySekolah = new Map();
    for (const row of dapurRows) {
      const existing = dapurBySekolah.get(row.sekolah_id) || [];
      existing.push(row.dapur_nama);
      dapurBySekolah.set(row.sekolah_id, existing);
    }

    const sekolahWithDapur = sekolah.map((row) => ({
      ...row,
      dapur_pembina: (dapurBySekolah.get(row.id) || []).join(', ') || null,
    }));

    res.json({
      data: sekolahWithDapur,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get sekolah by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const sekolah = await db('sekolah')
      .where({ id: req.params.id })
      .whereNull('deleted_at')
      .first();

    if (!sekolah) {
      return res.status(404).json({ error: 'Sekolah tidak ditemukan' });
    }

    const dapurRows = await db('dapur_sekolah')
      .join('dapur_supplier', 'dapur_sekolah.dapur_id', 'dapur_supplier.id')
      .select('dapur_supplier.nama as dapur_nama')
      .where({
        'dapur_sekolah.sekolah_id': req.params.id,
        'dapur_sekolah.status': 'aktif'
      })
      .whereNull('dapur_supplier.deleted_at')
      .orderBy('dapur_supplier.nama', 'asc');

    res.json({
      ...sekolah,
      dapur_pembina: dapurRows.map((d) => d.dapur_nama).join(', ') || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create sekolah
router.post('/', authenticateToken, requireRole(permissions.sekolah.create), validate(sekolahSchema), async (req, res) => {  
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa, kontak } = req.body;

    const [id] = await db('sekolah').insert({
      nama,
      alamat,
      latitude,
      longitude,
      kecamatan,
      kabupaten,
      provinsi,
      jumlah_siswa: jumlah_siswa || 0,
      kontak: kontak || null
    }).returning('id');

    const newId = typeof id === 'object' ? id.id : id;

    // Log audit
    await logAudit({
      action: 'CREATE',
      table_name: 'sekolah',
      record_id: newId,
      new_values: req.body,
      req
    });

    res.status(201).json({
      message: 'Sekolah berhasil ditambahkan',
      id: newId,
    });
  } catch (error) {
    console.error('Create sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update sekolah
router.put('/:id', authenticateToken, requireRole(permissions.sekolah.update), validate(sekolahSchema), async (req, res) => {
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa, kontak, status } = req.body;    

    const existing = await db('sekolah').where({ id: req.params.id }).whereNull('deleted_at').first();

    if (!existing) {
      return res.status(404).json({ error: 'Sekolah tidak ditemukan' });
    }

    const updatePayload = {
      nama,
      alamat,
      latitude,
      longitude,
      kecamatan,
      kabupaten,
      provinsi,
      jumlah_siswa,
      kontak,
      status,
      updated_at: db.fn.now()
    };

    await db('sekolah')
      .where({ id: req.params.id })
      .update(updatePayload);

    // Log audit
    await logAudit({
      action: 'UPDATE',
      table_name: 'sekolah',
      record_id: req.params.id,
      old_values: existing,
      new_values: updatePayload,
      req
    });

    res.json({ message: 'Sekolah berhasil diupdate' });
  } catch (error) {
    console.error('Update sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete sekolah (Soft Delete)
router.delete('/:id', authenticateToken, requireRole(permissions.sekolah.delete), async (req, res) => {
  try {
    const existing = await db('sekolah').where({ id: req.params.id }).whereNull('deleted_at').first();

    if (!existing) {
      return res.status(404).json({ error: 'Sekolah tidak ditemukan' });
    }

    await db('sekolah')
      .where({ id: req.params.id })
      .update({ deleted_at: db.fn.now() });

    // Log audit
    await logAudit({
      action: 'DELETE',
      table_name: 'sekolah',
      record_id: req.params.id,
      old_values: existing,
      req
    });

    res.json({ message: 'Sekolah berhasil dihapus' });
  } catch (error) {
    console.error('Delete sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;