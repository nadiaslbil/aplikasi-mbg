const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Get all dapur-sekolah relations with pagination and search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { dapur_id, sekolah_id, search, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = db('dapur_sekolah as dsk')
      .join('dapur_supplier as ds', 'dsk.dapur_id', 'ds.id')
      .join('sekolah as s', 'dsk.sekolah_id', 's.id')
      .select(
        'dsk.*',
        'ds.nama as dapur_nama',
        's.nama as sekolah_nama',
        's.alamat as sekolah_alamat',
        's.kecamatan as sekolah_kecamatan'
      );

    if (dapur_id) {
      query = query.where('dsk.dapur_id', dapur_id);
    }

    if (sekolah_id) {
      query = query.where('dsk.sekolah_id', sekolah_id);
    }

    if (status) {
      query = query.where('dsk.status', status);
    }

    if (search) {
      query = query.where(function() {
        this.where('ds.nama', 'LIKE', `%${search}%`)
          .orWhere('s.nama', 'LIKE', `%${search}%`)
          .orWhere('s.kecamatan', 'LIKE', `%${search}%`);
      });
    }

    // Get total count
    const totalCount = await query.clone().count('* as total').first();
    const total = parseInt(totalCount?.total || 0);

    const rows = await query
      .orderBy('dsk.status', 'asc')
      .orderBy('dsk.id', 'desc')
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
    console.error('Get dapur-sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create relation
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { dapur_id, sekolah_id, hari_kirim, jumlah_porsi } = req.body;
    if (!dapur_id || !sekolah_id) {
      return res.status(400).json({ error: 'Dapur dan Sekolah wajib dipilih' });
    }

    const existing = await db('dapur_sekolah')
      .where({ dapur_id, sekolah_id, status: 'aktif' })
      .first();

    if (existing) {
      return res.status(409).json({ error: 'Relasi dapur-sekolah sudah ada dan aktif' });
    }

    const [id] = await db('dapur_sekolah').insert({
      dapur_id,
      sekolah_id,
      hari_kirim: typeof hari_kirim === 'string' ? hari_kirim : JSON.stringify(hari_kirim || []),
      jumlah_porsi: jumlah_porsi || 0,
      status: 'aktif'
    }).returning('id');

    const newId = typeof id === 'object' ? id.id : id;

    await logAudit({
      action: 'CREATE',
      table_name: 'dapur_sekolah',
      record_id: newId,
      new_values: req.body,
      req
    });

    res.status(201).json({ message: 'Relasi berhasil ditambahkan', id: newId });
  } catch (error) {
    console.error('Create dapur-sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update relation
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { hari_kirim, jumlah_porsi, status } = req.body;

    const existing = await db('dapur_sekolah').where({ id }).first();
    if (!existing) return res.status(404).json({ error: 'Relasi tidak ditemukan' });

    const updateData = {
      hari_kirim: hari_kirim !== undefined ? (typeof hari_kirim === 'string' ? hari_kirim : JSON.stringify(hari_kirim)) : existing.hari_kirim,
      jumlah_porsi: jumlah_porsi !== undefined ? jumlah_porsi : existing.jumlah_porsi,
      status: status !== undefined ? status : existing.status,
      updated_at: db.fn.now()
    };

    await db('dapur_sekolah').where({ id }).update(updateData);

    await logAudit({
      action: 'UPDATE',
      table_name: 'dapur_sekolah',
      record_id: id,
      old_values: existing,
      new_values: updateData,
      req
    });

    res.json({ message: 'Relasi berhasil diupdate' });
  } catch (error) {
    console.error('Update dapur-sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete relation
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db('dapur_sekolah').where({ id }).first();
    if (!existing) return res.status(404).json({ error: 'Relasi tidak ditemukan' });

    await db('dapur_sekolah').where({ id }).delete();

    await logAudit({
      action: 'DELETE',
      table_name: 'dapur_sekolah',
      record_id: id,
      old_values: existing,
      req
    });

    res.json({ message: 'Relasi berhasil dihapus' });
  } catch (error) {
    console.error('Delete dapur-sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
