const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, permissions } = require('../middleware/rbac');
const { stokSchema, validate } = require('../validation/schemas');

// Get all stok bahan
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { dapur_id, expired_soon } = req.query;
    
    let query = db('stok_bahan as sb')
      .select('sb.*', 'ds.nama as dapur_nama')
      .join('dapur_supplier as ds', 'sb.dapur_id', 'ds.id')
      .whereNull('sb.deleted_at');

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

      query = query.whereIn('sb.dapur_id', accessibleDapurIds);
    }

    if (dapur_id) {
      query = query.where({ 'sb.dapur_id': dapur_id });
    }

    // Get items expiring within 3 days
    if (expired_soon === 'true') {
      const { isPostgres } = require('../database');
      if (isPostgres) {
        query = query.whereRaw("sb.expired_date <= (CURRENT_DATE + INTERVAL '3 days')");
      } else {
        query = query.whereRaw("sb.expired_date <= date('now', '+3 days')");
      }
    }

    const stok = await query.orderBy('sb.expired_date', 'asc');
    res.json(stok);
  } catch (error) {
    console.error('Get stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create stok
router.post('/', authenticateToken, requireRole(permissions.stok.create), validate(stokSchema), async (req, res) => {
  try {
    const { dapur_id, nama_bahan, jumlah, satuan, expired_date } = req.body;

    const [id] = await db('stok_bahan').insert({
      dapur_id, 
      nama_bahan, 
      jumlah, 
      satuan, 
      expired_date
    }).returning('id');

    res.status(201).json({
      message: 'Stok bahan berhasil ditambahkan',
      id: typeof id === 'object' ? id.id : id,
    });
  } catch (error) {
    console.error('Create stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update stok
router.put('/:id', authenticateToken, requireRole(permissions.stok.update), validate(stokSchema.partial()), async (req, res) => {
  try {
    const { nama_bahan, jumlah, satuan, expired_date } = req.body;

    const existing = await db('stok_bahan as sb')
      .join('dapur_supplier as ds', 'sb.dapur_id', 'ds.id')
      .select('sb.*', 'ds.user_id')
      .where({ 'sb.id': req.params.id })
      .whereNull('sb.deleted_at')
      .first();
    
    if (!existing) {
      return res.status(404).json({ error: 'Stok tidak ditemukan' });
    }

    // Ownership check for supplier
    if (req.user.role === 'supplier' && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Anda hanya bisa mengubah stok dapur Anda sendiri' });
    }

    await db('stok_bahan')
      .where({ id: req.params.id })
      .update({
        nama_bahan: nama_bahan || existing.nama_bahan,
        jumlah: jumlah !== undefined ? jumlah : existing.jumlah,
        satuan: satuan || existing.satuan,
        expired_date: expired_date || existing.expired_date,
        updated_at: db.fn.now()
      });

    res.json({ message: 'Stok bahan berhasil diupdate' });
  } catch (error) {
    console.error('Update stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete stok (Soft Delete)
router.delete('/:id', authenticateToken, requireRole(permissions.stok.delete), async (req, res) => {
  try {
    const existing = await db('stok_bahan').where({ id: req.params.id }).whereNull('deleted_at').first();
    
    if (!existing) {
      return res.status(404).json({ error: 'Stok tidak ditemukan' });
    }

    await db('stok_bahan').where({ id: req.params.id }).update({ deleted_at: db.fn.now() });
    res.json({ message: 'Stok bahan berhasil dihapus' });
  } catch (error) {
    console.error('Delete stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
