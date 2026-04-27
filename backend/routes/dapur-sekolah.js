const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all dapur-sekolah relations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rows = await all(`
      SELECT
        dsk.*,
        ds.nama as dapur_nama,
        s.nama as sekolah_nama,
        s.alamat as sekolah_alamat,
        s.kecamatan as sekolah_kecamatan
      FROM dapur_sekolah dsk
      JOIN dapur_supplier ds ON dsk.dapur_id = ds.id
      JOIN sekolah s ON dsk.sekolah_id = s.id
      ORDER BY dsk.id DESC
    `);

    res.json(rows);
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
      return res.status(400).json({ error: 'dapur_id dan sekolah_id wajib diisi' });
    }

    const existing = await get(
      'SELECT id FROM dapur_sekolah WHERE dapur_id = ? AND sekolah_id = ?',
      [dapur_id, sekolah_id]
    );
    if (existing) return res.status(409).json({ error: 'Relasi dapur-sekolah sudah ada' });

    const result = await run(
      `
        INSERT INTO dapur_sekolah (dapur_id, sekolah_id, hari_kirim, jumlah_porsi, status)
        VALUES (?, ?, ?, ?, 'aktif')
      `,
      [dapur_id, sekolah_id, hari_kirim || JSON.stringify([]), jumlah_porsi || 0]
    );

    res.status(201).json({ message: 'Relasi berhasil ditambahkan', id: result.lastID });
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

    const existing = await get('SELECT id FROM dapur_sekolah WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Relasi tidak ditemukan' });

    await run(
      `
        UPDATE dapur_sekolah
        SET hari_kirim = ?, jumlah_porsi = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [hari_kirim || JSON.stringify([]), jumlah_porsi || 0, status || 'aktif', id]
    );

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
    const existing = await get('SELECT id FROM dapur_sekolah WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Relasi tidak ditemukan' });

    await run('DELETE FROM dapur_sekolah WHERE id = ?', [id]);
    res.json({ message: 'Relasi berhasil dihapus' });
  } catch (error) {
    console.error('Delete dapur-sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;

