const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, permissions } = require('../middleware/rbac');
const { insidenSchema, validate } = require('../validation/schemas');
const { logAudit } = require('../middleware/audit');

// Get all insiden
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { tipe, status, sekolah_id, dapur_id, tanggal } = req.query;
    
    let query = db('insiden as i')
      .select('i.*', 's.nama as sekolah_nama', 'ds.nama as dapur_nama', 'u.nama as ditangani_nama')
      .leftJoin('sekolah as s', 'i.sekolah_id', 's.id')
      .leftJoin('dapur_supplier as ds', 'i.dapur_id', 'ds.id')
      .leftJoin('users as u', 'i.ditangani_oleh', 'u.id')
      .whereNull('i.deleted_at');

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

      query = query.where(function() {
        this.whereIn('i.dapur_id', accessibleDapurIds)
          .orWhere(function() {
            this.whereNull('i.dapur_id')
              .whereExists(function() {
                this.select(1)
                  .from('dapur_sekolah as dsk')
                  .whereRaw('dsk.sekolah_id = i.sekolah_id')
                  .where({ 'dsk.status': 'aktif' })
                  .whereIn('dsk.dapur_id', accessibleDapurIds);
              });
          });
      });
    }

    if (tipe) query = query.where({ 'i.tipe': tipe });
    if (status) query = query.where({ 'i.status': status });
    if (sekolah_id) query = query.where({ 'i.sekolah_id': sekolah_id });
    if (dapur_id) query = query.where({ 'i.dapur_id': dapur_id });
    if (tanggal) query = query.where({ 'i.tanggal': tanggal });

    const insiden = await query.orderBy('i.tanggal', 'desc').orderBy('i.created_at', 'desc');
    res.json(insiden);
  } catch (error) {
    console.error('Get insiden error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create insiden
router.post('/', authenticateToken, validate(insidenSchema), async (req, res) => {
  try {
    const { sekolah_id, dapur_id, tipe, deskripsi, latitude, longitude, tanggal } = req.body;

    const [id] = await db('insiden').insert({
      sekolah_id: sekolah_id || null,
      dapur_id: dapur_id || null,
      tipe,
      deskripsi,
      latitude: latitude || null,
      longitude: longitude || null,
      tanggal,
    }).returning('id');

    const newId = typeof id === 'object' ? id.id : id;

    // Log audit
    await logAudit({
      action: 'CREATE',
      table_name: 'insiden',
      record_id: newId,
      new_values: req.body,
      req
    });

    res.status(201).json({
      message: 'Insiden berhasil dilaporkan',
      id: newId,
    });
  } catch (error) {
    console.error('Create insiden error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update insiden (tindak lanjut)
router.put('/:id', authenticateToken, requireRole(permissions.insiden.update), validate(insidenSchema.partial()), async (req, res) => {
  try {
    const { status, ditangani_oleh, tindak_lanjut } = req.body;

    const existing = await db('insiden').where({ id: req.params.id }).whereNull('deleted_at').first();
    
    if (!existing) {
      return res.status(404).json({ error: 'Insiden tidak ditemukan' });
    }

    const updatePayload = { 
      status, 
      ditangani_oleh: ditangani_oleh || null, 
      tindak_lanjut: tindak_lanjut || null,
      updated_at: db.fn.now()
    };

    await db('insiden')
      .where({ id: req.params.id })
      .update(updatePayload);

    // Log audit
    await logAudit({
      action: 'UPDATE',
      table_name: 'insiden',
      record_id: req.params.id,
      old_values: existing,
      new_values: updatePayload,
      req
    });

    res.json({ message: 'Insiden berhasil diupdate' });
  } catch (error) {
    console.error('Update insiden error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete insiden (Soft Delete)
router.delete('/:id', authenticateToken, requireRole(permissions.insiden.delete), async (req, res) => {
  try {
    const existing = await db('insiden').where({ id: req.params.id }).whereNull('deleted_at').first();
    
    if (!existing) {
      return res.status(404).json({ error: 'Insiden tidak ditemukan' });
    }

    await db('insiden').where({ id: req.params.id }).update({ deleted_at: db.fn.now() });

    // Log audit
    await logAudit({
      action: 'DELETE',
      table_name: 'insiden',
      record_id: req.params.id,
      old_values: existing,
      req
    });

    res.json({ message: 'Insiden berhasil dihapus' });
  } catch (error) {
    console.error('Delete insiden error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
