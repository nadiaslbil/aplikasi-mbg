const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all stok bahan
router.get('/', authenticateToken, (req, res) => {
  try {
    const { dapur_id, expired_soon } = req.query;
    
    let query = `
      SELECT sb.*, ds.nama as dapur_nama
      FROM stok_bahan sb
      JOIN dapur_supplier ds ON sb.dapur_id = ds.id
      WHERE 1=1
    `;
    const params = [];

    if (dapur_id) {
      query += ' AND sb.dapur_id = ?';
      params.push(dapur_id);
    }

    // Get items expiring within 3 days
    if (expired_soon === 'true') {
      query += " AND sb.expired_date <= date('now', '+3 days')";
    }

    query += ' ORDER BY sb.expired_date ASC';

    const stok = db.prepare(query).all(...params);
    res.json(stok);
  } catch (error) {
    console.error('Get stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create stok
router.post('/', authenticateToken, (req, res) => {
  try {
    const { dapur_id, nama_bahan, jumlah, satuan, expired_date } = req.body;

    if (!dapur_id || !nama_bahan || jumlah === undefined || !satuan || !expired_date) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const result = db.prepare(`
      INSERT INTO stok_bahan (dapur_id, nama_bahan, jumlah, satuan, expired_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(dapur_id, nama_bahan, jumlah, satuan, expired_date);

    res.status(201).json({
      message: 'Stok bahan berhasil ditambahkan',
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('Create stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update stok
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { nama_bahan, jumlah, satuan, expired_date } = req.body;

    const existing = db.prepare('SELECT id FROM stok_bahan WHERE id = ?').get(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Stok tidak ditemukan' });
    }

    db.prepare(`
      UPDATE stok_bahan 
      SET nama_bahan = ?, jumlah = ?, satuan = ?, expired_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nama_bahan, jumlah, satuan, expired_date, req.params.id);

    res.json({ message: 'Stok bahan berhasil diupdate' });
  } catch (error) {
    console.error('Update stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete stok
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM stok_bahan WHERE id = ?').get(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Stok tidak ditemukan' });
    }

    db.prepare('DELETE FROM stok_bahan WHERE id = ?').run(req.params.id);
    res.json({ message: 'Stok bahan berhasil dihapus' });
  } catch (error) {
    console.error('Delete stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
