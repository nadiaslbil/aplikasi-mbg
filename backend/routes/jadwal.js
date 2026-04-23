const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all jadwal distribusi
router.get('/', authenticateToken, (req, res) => {
  try {
    const { tanggal, status, dapur_id, sekolah_id } = req.query;
    
    let query = `
      SELECT jd.*, ds.nama as dapur_nama, s.nama as sekolah_nama, s.alamat as sekolah_alamat,
             s.latitude as sekolah_latitude, s.longitude as sekolah_longitude
      FROM jadwal_distribusi jd
      JOIN dapur_supplier ds ON jd.dapur_id = ds.id
      JOIN sekolah s ON jd.sekolah_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (tanggal) {
      query += ' AND jd.tanggal = ?';
      params.push(tanggal);
    }

    if (status) {
      query += ' AND jd.status = ?';
      params.push(status);
    }

    if (dapur_id) {
      query += ' AND jd.dapur_id = ?';
      params.push(dapur_id);
    }

    if (sekolah_id) {
      query += ' AND jd.sekolah_id = ?';
      params.push(sekolah_id);
    }

    query += ' ORDER BY jd.tanggal DESC, jd.waktu_kirim ASC';

    const jadwal = db.prepare(query).all(...params);
    res.json(jadwal);
  } catch (error) {
    console.error('Get jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get jadwal by id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const query = `
      SELECT jd.*, ds.nama as dapur_nama, s.nama as sekolah_nama, s.alamat as sekolah_alamat,
             s.latitude as sekolah_latitude, s.longitude as sekolah_longitude,
             s.kontak as sekolah_kontak
      FROM jadwal_distribusi jd
      JOIN dapur_supplier ds ON jd.dapur_id = ds.id
      JOIN sekolah s ON jd.sekolah_id = s.id
      WHERE jd.id = ?
    `;
    
    const jadwal = db.prepare(query).get(req.params.id);
    
    if (!jadwal) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    res.json(jadwal);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create jadwal
router.post('/', authenticateToken, (req, res) => {
  try {
    const { dapur_id, sekolah_id, tanggal, waktu_kirim, jumlah_porsi, catatan } = req.body;

    if (!dapur_id || !sekolah_id || !tanggal || !jumlah_porsi) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const result = db.prepare(`
      INSERT INTO jadwal_distribusi (dapur_id, sekolah_id, tanggal, waktu_kirim, jumlah_porsi, catatan)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(dapur_id, sekolah_id, tanggal, waktu_kirim || null, jumlah_porsi, catatan || null);

    res.status(201).json({
      message: 'Jadwal distribusi berhasil ditambahkan',
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('Create jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update jadwal
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { dapur_id, sekolah_id, tanggal, waktu_kirim, waktu_terima, jumlah_porsi, status, catatan } = req.body;

    const existing = db.prepare('SELECT id FROM jadwal_distribusi WHERE id = ?').get(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    db.prepare(`
      UPDATE jadwal_distribusi 
      SET dapur_id = ?, sekolah_id = ?, tanggal = ?, waktu_kirim = ?, 
          waktu_terima = ?, jumlah_porsi = ?, status = ?, catatan = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      dapur_id, sekolah_id, tanggal, waktu_kirim, waktu_terima, jumlah_porsi, status, catatan, req.params.id
    );

    res.json({ message: 'Jadwal distribusi berhasil diupdate' });
  } catch (error) {
    console.error('Update jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete jadwal
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM jadwal_distribusi WHERE id = ?').get(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    db.prepare('DELETE FROM jadwal_distribusi WHERE id = ?').run(req.params.id);
    res.json({ message: 'Jadwal distribusi berhasil dihapus' });
  } catch (error) {
    console.error('Delete jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
