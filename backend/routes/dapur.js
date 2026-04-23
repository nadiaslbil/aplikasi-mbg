const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all dapur supplier
router.get('/', authenticateToken, (req, res) => {
  try {
    const { kecamatan, kabupaten, status, search } = req.query;
    
    let query = 'SELECT * FROM dapur_supplier WHERE 1=1';
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

    const dapur = db.prepare(query).all(...params);
    res.json(dapur);
  } catch (error) {
    console.error('Get dapur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get dapur by id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const dapur = db.prepare('SELECT * FROM dapur_supplier WHERE id = ?').get(req.params.id);
    
    if (!dapur) {
      return res.status(404).json({ error: 'Dapur tidak ditemukan' });
    }

    res.json(dapur);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create dapur
router.post('/', authenticateToken, (req, res) => {
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, kapasitas_harian, kontak, penanggung_jawab } = req.body;

    if (!nama || !alamat || latitude === undefined || longitude === undefined || !kecamatan) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const result = db.prepare(`
      INSERT INTO dapur_supplier (nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, kapasitas_harian, kontak, penanggung_jawab)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(nama, alamat, latitude, longitude, kecamatan, kabupaten || '', provinsi || '', kapasitas_harian || 0, kontak || null, penanggung_jawab || null);

    res.status(201).json({
      message: 'Dapur supplier berhasil ditambahkan',
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('Create dapur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update dapur
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, kapasitas_harian, kontak, penanggung_jawab, status } = req.body;

    const existing = db.prepare('SELECT id FROM dapur_supplier WHERE id = ?').get(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Dapur tidak ditemukan' });
    }

    db.prepare(`
      UPDATE dapur_supplier 
      SET nama = ?, alamat = ?, latitude = ?, longitude = ?, 
          kecamatan = ?, kabupaten = ?, provinsi = ?, 
          kapasitas_harian = ?, kontak = ?, penanggung_jawab = ?, status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi,
      kapasitas_harian, kontak, penanggung_jawab, status, req.params.id
    );

    res.json({ message: 'Dapur supplier berhasil diupdate' });
  } catch (error) {
    console.error('Update dapur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete dapur
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM dapur_supplier WHERE id = ?').get(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Dapur tidak ditemukan' });
    }

    db.prepare('DELETE FROM dapur_supplier WHERE id = ?').run(req.params.id);
    res.json({ message: 'Dapur supplier berhasil dihapus' });
  } catch (error) {
    console.error('Delete dapur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
