const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all sekolah
router.get('/', authenticateToken, (req, res) => {
  try {
    const { kecamatan, kabupaten, status, search } = req.query;
    
    let query = 'SELECT * FROM sekolah WHERE 1=1';
    const params = [];

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

    const sekolah = db.prepare(query).all(...params);
    res.json(sekolah);
  } catch (error) {
    console.error('Get sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get sekolah by id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const sekolah = db.prepare('SELECT * FROM sekolah WHERE id = ?').get(req.params.id);
    
    if (!sekolah) {
      return res.status(404).json({ error: 'Sekolah tidak ditemukan' });
    }

    res.json(sekolah);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create sekolah
router.post('/', authenticateToken, (req, res) => {
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa, kontak } = req.body;

    if (!nama || !alamat || latitude === undefined || longitude === undefined || !kecamatan || !kabupaten || !provinsi) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const result = db.prepare(`
      INSERT INTO sekolah (nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa, kontak)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa || 0, kontak || null);

    res.status(201).json({
      message: 'Sekolah berhasil ditambahkan',
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('Create sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update sekolah
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa, kontak, status } = req.body;

    const existing = db.prepare('SELECT id FROM sekolah WHERE id = ?').get(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Sekolah tidak ditemukan' });
    }

    db.prepare(`
      UPDATE sekolah 
      SET nama = ?, alamat = ?, latitude = ?, longitude = ?, 
          kecamatan = ?, kabupaten = ?, provinsi = ?, 
          jumlah_siswa = ?, kontak = ?, status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi,
      jumlah_siswa, kontak, status, req.params.id
    );

    res.json({ message: 'Sekolah berhasil diupdate' });
  } catch (error) {
    console.error('Update sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete sekolah
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM sekolah WHERE id = ?').get(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Sekolah tidak ditemukan' });
    }

    db.prepare('DELETE FROM sekolah WHERE id = ?').run(req.params.id);
    res.json({ message: 'Sekolah berhasil dihapus' });
  } catch (error) {
    console.error('Delete sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
