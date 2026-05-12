const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Get dapur-kurir relations with pagination and search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { kurir_id, dapur_id, search, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = db('dapur_kurir as dk')
      .join('dapur_supplier as ds', 'dk.dapur_id', 'ds.id')
      .join('users as u', 'dk.kurir_id', 'u.id');

    if (dapur_id) {
      query = query.where('dk.dapur_id', dapur_id);
    }

    if (kurir_id) {
      query = query.where('dk.kurir_id', kurir_id);
    }

    if (status) {
      query = query.where('dk.status', status);
    }

    if (search) {
      query = query.where(function() {
        this.where('ds.nama', 'LIKE', `%${search}%`)
          .orWhere('u.nama', 'LIKE', `%${search}%`)
          .orWhere('u.email', 'LIKE', `%${search}%`);
      });
    }

    // Get total count for pagination
    const totalCount = await query.clone().count('* as total').first();
    const total = parseInt(totalCount?.total || 0);

    const rows = await query
      .select(
        'dk.*', 
        'ds.nama as dapur_nama', 
        'u.nama as kurir_nama', 
        'u.email as kurir_email'
      )
      .orderBy('dk.status', 'asc') // 'aktif' usually comes before 'nonaktif' alphabetically, but let's be safe
      .orderBy('dk.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get dapur-kurir error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create new relation
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { dapur_id, kurir_id, tanggal_mulai } = req.body;

    if (!dapur_id || !kurir_id) {
      return res.status(400).json({ error: 'Dapur dan Kurir wajib dipilih' });
    }

    // Check if already exists and is active
    const existing = await db('dapur_kurir')
      .where({ dapur_id, kurir_id, status: 'aktif' })
      .first();

    if (existing) {
      return res.status(400).json({ error: 'Kurir sudah terdaftar aktif di dapur ini' });
    }

    const [id] = await db('dapur_kurir').insert({
      dapur_id,
      kurir_id,
      tanggal_mulai: tanggal_mulai || db.fn.now(),
      status: 'aktif'
    }).returning('id');

    const newId = typeof id === 'object' ? id.id : id;

    await logAudit({
      action: 'CREATE',
      table_name: 'dapur_kurir',
      record_id: newId,
      new_values: req.body,
      req
    });

    res.status(201).json({ message: 'Penugasan berhasil ditambahkan', id: newId });
  } catch (error) {
    console.error('Create dapur-kurir error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update relation (status, dates)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, tanggal_mulai, tanggal_selesai } = req.body;
    const existing = await db('dapur_kurir').where({ id: req.params.id }).first();

    if (!existing) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }

    const updateData = {
      status: status !== undefined ? status : existing.status,
      tanggal_mulai: tanggal_mulai !== undefined ? tanggal_mulai : existing.tanggal_mulai,
      tanggal_selesai: tanggal_selesai !== undefined ? tanggal_selesai : existing.tanggal_selesai,
      updated_at: db.fn.now()
    };

    await db('dapur_kurir').where({ id: req.params.id }).update(updateData);

    await logAudit({
      action: 'UPDATE',
      table_name: 'dapur_kurir',
      record_id: req.params.id,
      old_values: existing,
      new_values: updateData,
      req
    });

    res.json({ message: 'Penugasan berhasil diupdate' });
  } catch (error) {
    console.error('Update dapur-kurir error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete relation
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await db('dapur_kurir').where({ id: req.params.id }).first();

    if (!existing) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }

    await db('dapur_kurir').where({ id: req.params.id }).delete();

    await logAudit({
      action: 'DELETE',
      table_name: 'dapur_kurir',
      record_id: req.params.id,
      old_values: existing,
      req
    });

    res.json({ message: 'Penugasan berhasil dihapus' });
  } catch (error) {
    console.error('Delete dapur-kurir error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
