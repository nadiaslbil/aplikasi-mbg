const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, permissions } = require('../middleware/rbac');
const { dapurSchema, validate } = require('../validation/schemas');

// Get all dapur supplier
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { kecamatan, kabupaten, status, search } = req.query;
    
    let query = 'SELECT * FROM dapur_supplier WHERE 1=1';
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
      query += ` AND id IN (${placeholders})`;
      params.push(...accessibleDapurIds);
    }

    if (kecamatan) {
      query += ' AND kecamatan = ?';
      params.push(kecamatan);
    }

    if (kabupaten) {
      query += ' AND kabupaten = ?';
      params.push(kabupaten);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (nama LIKE ? OR alamat LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY nama ASC';

    const dapur = await all(query, params);
    res.json(dapur);
  } catch (error) {
    console.error('Get dapur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get dapur by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const dapur = await get('SELECT * FROM dapur_supplier WHERE id = ?', [req.params.id]);
    
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

    // Ensure dapur exists
    const dapur = await get('SELECT id, nama FROM dapur_supplier WHERE id = ?', [dapurId]);
    if (!dapur) return res.status(404).json({ error: 'Dapur tidak ditemukan' });

    const rows = await all(
      `
        SELECT s.*, dsk.hari_kirim, dsk.jumlah_porsi, dsk.status as rel_status
        FROM dapur_sekolah dsk
        JOIN sekolah s ON dsk.sekolah_id = s.id
        WHERE dsk.dapur_id = ?
          AND dsk.status = 'aktif'
        ORDER BY s.nama ASC
      `,
      [dapurId]
    );

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

    const result = await run(
      `
        INSERT INTO dapur_supplier (nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, kapasitas_harian, kontak, penanggung_jawab)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nama,
        alamat,
        latitude,
        longitude,
        kecamatan,
        kabupaten || '',
        provinsi || '',
        kapasitas_harian || 0,
        kontak || null,
        penanggung_jawab || null,
      ]
    );

    res.status(201).json({
      message: 'Dapur supplier berhasil ditambahkan',
      id: result.lastID,
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

    const existing = await get('SELECT * FROM dapur_supplier WHERE id = ?', [req.params.id]);
    
    if (!existing) {
      return res.status(404).json({ error: 'Dapur tidak ditemukan' });
    }

    // Ownership check for supplier
    if (req.user.role === 'supplier' && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Anda hanya bisa mengubah dapur milik Anda sendiri' });
    }

    await run(
      `
        UPDATE dapur_supplier 
        SET nama = ?, alamat = ?, latitude = ?, longitude = ?, 
            kecamatan = ?, kabupaten = ?, provinsi = ?, 
            kapasitas_harian = ?, kontak = ?, penanggung_jawab = ?, status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
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
        req.params.id,
      ]
    );

    res.json({ message: 'Dapur supplier berhasil diupdate' });
  } catch (error) {
    console.error('Update dapur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete dapur
router.delete('/:id', authenticateToken, requireRole(permissions.dapur.delete), async (req, res) => {
  try {
    const existing = await get('SELECT id FROM dapur_supplier WHERE id = ?', [req.params.id]);
    
    if (!existing) {
      return res.status(404).json({ error: 'Dapur tidak ditemukan' });
    }

    await run('DELETE FROM dapur_supplier WHERE id = ?', [req.params.id]);
    res.json({ message: 'Dapur supplier berhasil dihapus' });
  } catch (error) {
    console.error('Delete dapur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
