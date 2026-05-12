const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, permissions } = require('../middleware/rbac');
const { jadwalSchema, validate } = require('../validation/schemas');

// Get all jadwal distribusi
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { tanggal, status, dapur_id, sekolah_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    let query = db('jadwal_distribusi as jd')
      .join('dapur_supplier as ds', 'jd.dapur_id', 'ds.id')
      .join('sekolah as s', 'jd.sekolah_id', 's.id')
      .leftJoin('pengiriman as p', 'p.jadwal_id', 'jd.id')
      .leftJoin('users as pu', 'p.kurir_id', 'pu.id')
      .leftJoin(
        db('dapur_kurir')
          .select('dapur_id', db.raw('MIN(kurir_id) as kurir_id'))
          .groupBy('dapur_id')
          .as('dkm'),
        'dkm.dapur_id', 'jd.dapur_id'
      )
      .leftJoin('users as du', 'dkm.kurir_id', 'du.id')
      .whereNull('jd.deleted_at')
      .whereNull('ds.deleted_at')
      .whereNull('s.deleted_at');

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
    }

    if (tanggal) query = query.where({ 'jd.tanggal': tanggal });
    if (status) query = query.where({ 'jd.status': status });
    if (dapur_id) query = query.where({ 'jd.dapur_id': dapur_id });
    if (sekolah_id) query = query.where({ 'jd.sekolah_id': sekolah_id });

    // Get total count
    const totalCount = await query.clone().count('* as total').first();
    const total = totalCount.total;

    const jadwal = await query
      .select(
        'jd.*', 
        'ds.nama as dapur_nama', 
        's.nama as sekolah_nama', 
        's.alamat as sekolah_alamat',
        's.latitude as sekolah_latitude', 
        's.longitude as sekolah_longitude',
        db.raw('COALESCE(pu.nama, du.nama) as kurir_nama')
      )
      .orderBy('jd.tanggal', 'desc')
      .orderBy('jd.waktu_kirim', 'asc')
      .limit(limit)
      .offset(offset);

    res.json({
      data: jadwal,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get jadwal by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const jadwal = await db('jadwal_distribusi as jd')
      .join('dapur_supplier as ds', 'jd.dapur_id', 'ds.id')
      .join('sekolah as s', 'jd.sekolah_id', 's.id')
      .leftJoin('pengiriman as p', 'p.jadwal_id', 'jd.id')
      .leftJoin('users as pu', 'p.kurir_id', pu.id)
      .leftJoin(
        db('dapur_kurir')
          .select('dapur_id', db.raw('MIN(kurir_id) as kurir_id'))
          .groupBy('dapur_id')
          .as('dkm'),
        'dkm.dapur_id', 'jd.dapur_id'
      )
      .leftJoin('users as du', 'dkm.kurir_id', 'du.id')
      .select(
        'jd.*', 
        'ds.nama as dapur_nama', 
        's.nama as sekolah_nama', 
        's.alamat as sekolah_alamat',
        's.latitude as sekolah_latitude', 
        's.longitude as sekolah_longitude',
        's.kontak as sekolah_kontak',
        db.raw('COALESCE(pu.nama, du.nama) as kurir_nama')
      )
      .where({ 'jd.id': req.params.id })
      .whereNull('jd.deleted_at')
      .first();
    
    if (!jadwal) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    res.json(jadwal);
  } catch (error) {
    console.error('Get single jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create jadwal
router.post('/', authenticateToken, requireRole(permissions.jadwal.create), validate(jadwalSchema), async (req, res) => {
  try {
    const { dapur_id, sekolah_id, tanggal, waktu_kirim, jumlah_porsi, catatan, kurir_id } = req.body;

    const sekolahRelation = await db('dapur_sekolah')
      .where({ dapur_id, sekolah_id, status: 'aktif' })
      .first();
      
    if (!sekolahRelation) {
      return res.status(400).json({ error: 'Sekolah tidak terdaftar sebagai binaan dapur ini' });
    }

    if (kurir_id) {
      const kurirRelation = await db('dapur_kurir')
        .where({ dapur_id, kurir_id })
        .first();
      if (!kurirRelation) {
        return res.status(400).json({ error: 'Kurir tidak terdaftar pada dapur ini' });
      }
    }

    const [id] = await db('jadwal_distribusi').insert({
      dapur_id, 
      sekolah_id, 
      tanggal, 
      waktu_kirim: waktu_kirim || null, 
      jumlah_porsi, 
      catatan: catatan || null
    }).returning('id');

    res.status(201).json({
      message: 'Jadwal distribusi berhasil ditambahkan',
      id: typeof id === 'object' ? id.id : id,
    });
  } catch (error) {
    console.error('Create jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update jadwal
router.put('/:id', authenticateToken, requireRole(permissions.jadwal.update), validate(jadwalSchema.partial()), async (req, res) => {
  try {
    const { dapur_id, sekolah_id, tanggal, waktu_kirim, waktu_terima, jumlah_porsi, status, catatan, kurir_id } = req.body;

    const existing = await db('jadwal_distribusi').where({ id: req.params.id }).whereNull('deleted_at').first();
    
    if (!existing) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    // Maintain validation logic for dapur-sekolah link if IDs are being updated
    const finalDapurId = dapur_id || existing.dapur_id;
    const finalSekolahId = sekolah_id || existing.sekolah_id;

    if (dapur_id || sekolah_id) {
      const sekolahRelation = await db('dapur_sekolah')
        .where({ dapur_id: finalDapurId, sekolah_id: finalSekolahId, status: 'aktif' })
        .first();
      if (!sekolahRelation) {
        return res.status(400).json({ error: 'Sekolah tidak terdaftar sebagai binaan dapur ini' });
      }
    }

    if (kurir_id) {
      const kurirRelation = await db('dapur_kurir')
        .where({ dapur_id: finalDapurId, kurir_id })
        .first();
      if (!kurirRelation) {
        return res.status(400).json({ error: 'Kurir tidak terdaftar pada dapur ini' });
      }
    }

    await db('jadwal_distribusi')
      .where({ id: req.params.id })
      .update({
        dapur_id: finalDapurId,
        sekolah_id: finalSekolahId,
        tanggal: tanggal || existing.tanggal,
        waktu_kirim: waktu_kirim !== undefined ? waktu_kirim : existing.waktu_kirim,
        waktu_terima: waktu_terima !== undefined ? waktu_terima : existing.waktu_terima,
        jumlah_porsi: jumlah_porsi || existing.jumlah_porsi,
        status: status || existing.status,
        catatan: catatan !== undefined ? catatan : existing.catatan,
        updated_at: db.fn.now()
      });

    res.json({ message: 'Jadwal distribusi berhasil diupdate' });
  } catch (error) {
    console.error('Update jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete jadwal (Soft Delete)
router.delete('/:id', authenticateToken, requireRole(permissions.jadwal.delete), async (req, res) => {
  try {
    const existing = await db('jadwal_distribusi').where({ id: req.params.id }).whereNull('deleted_at').first();
    
    if (!existing) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    await db('jadwal_distribusi').where({ id: req.params.id }).update({ deleted_at: db.fn.now() });

    // Log audit
    await logAudit({
      action: 'DELETE',
      table_name: 'jadwal_distribusi',
      record_id: req.params.id,
      old_values: existing,
      req
    });

    res.json({ message: 'Jadwal distribusi berhasil dihapus' });
  } catch (error) {
    console.error('Delete jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
salahan server' });
  }
});

module.exports = router;
