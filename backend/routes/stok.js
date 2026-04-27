const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, permissions } = require('../middleware/rbac');

// Get all stok bahan
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { dapur_id, expired_soon } = req.query;
    
    let query = `
      SELECT sb.*, ds.nama as dapur_nama
      FROM stok_bahan sb
      JOIN dapur_supplier ds ON sb.dapur_id = ds.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user?.role === 'supplier' || req.user?.role === 'kurir') {
      let accessibleDapurIds = [];
      if (req.user.role === 'supplier') {
        const rows = await all('SELECT id FROM dapur_supplier WHERE user_id = ?', [req.user.id]);
        accessibleDapurIds = rows.map((r) => r.id);
      } else {
        const rows = await all(
          "SELECT dapur_id FROM dapur_kurir WHERE kurir_id = ? AND status = 'aktif'",
          [req.user.id]
        );
        accessibleDapurIds = rows.map((r) => r.dapur_id);
      }

      if (accessibleDapurIds.length === 0) {
        return res.json([]);
      }

      const placeholders = accessibleDapurIds.map(() => '?').join(', ');
      query += ` AND sb.dapur_id IN (${placeholders})`;
      params.push(...accessibleDapurIds);
    }

    if (dapur_id) {
      query += ' AND sb.dapur_id = ?';
      params.push(dapur_id);
    }

    // Get items expiring within 3 days
    if (expired_soon === 'true') {
      query += " AND sb.expired_date <= date('now', '+3 days')";
    }

    query += ' ORDER BY sb.expired_date ASC';

    const stok = await all(query, params);
    res.json(stok);
  } catch (error) {
    console.error('Get stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create stok
router.post('/', authenticateToken, requireRole(permissions.stok.create), async (req, res) => {
  try {
    const { dapur_id, nama_bahan, jumlah, satuan, expired_date } = req.body;

    if (!dapur_id || !nama_bahan || jumlah === undefined || !satuan || !expired_date) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const result = await run(
      `
        INSERT INTO stok_bahan (dapur_id, nama_bahan, jumlah, satuan, expired_date)
        VALUES (?, ?, ?, ?, ?)
      `,
      [dapur_id, nama_bahan, jumlah, satuan, expired_date]
    );

    res.status(201).json({
      message: 'Stok bahan berhasil ditambahkan',
      id: result.lastID,
    });
  } catch (error) {
    console.error('Create stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update stok
router.put('/:id', authenticateToken, requireRole(permissions.stok.update), async (req, res) => {
  try {
    const { nama_bahan, jumlah, satuan, expired_date } = req.body;

    const existing = await get(`
      SELECT sb.*, ds.user_id 
      FROM stok_bahan sb
      JOIN dapur_supplier ds ON sb.dapur_id = ds.id
      WHERE sb.id = ?
    `, [req.params.id]);
    
    if (!existing) {
      return res.status(404).json({ error: 'Stok tidak ditemukan' });
    }

    // Ownership check for supplier
    if (req.user.role === 'supplier' && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Anda hanya bisa mengubah stok dapur Anda sendiri' });
    }

    await run(
      `
        UPDATE stok_bahan 
        SET nama_bahan = ?, jumlah = ?, satuan = ?, expired_date = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [nama_bahan, jumlah, satuan, expired_date, req.params.id]
    );

    res.json({ message: 'Stok bahan berhasil diupdate' });
  } catch (error) {
    console.error('Update stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete stok
router.delete('/:id', authenticateToken, requireRole(permissions.stok.delete), async (req, res) => {
  try {
    const existing = await get('SELECT id FROM stok_bahan WHERE id = ?', [req.params.id]);
    
    if (!existing) {
      return res.status(404).json({ error: 'Stok tidak ditemukan' });
    }

    await run('DELETE FROM stok_bahan WHERE id = ?', [req.params.id]);
    res.json({ message: 'Stok bahan berhasil dihapus' });
  } catch (error) {
    console.error('Delete stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
