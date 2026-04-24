const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all insiden
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { tipe, status, sekolah_id, dapur_id, tanggal } = req.query;
    
    let query = `
      SELECT i.*, s.nama as sekolah_nama, ds.nama as dapur_nama, u.nama as ditangani_nama
      FROM insiden i
      LEFT JOIN sekolah s ON i.sekolah_id = s.id
      LEFT JOIN dapur_supplier ds ON i.dapur_id = ds.id
      LEFT JOIN users u ON i.ditangani_oleh = u.id
      WHERE 1=1
    `;
    const params = [];

    if (tipe) {
      query += ' AND i.tipe = ?';
      params.push(tipe);
    }

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (sekolah_id) {
      query += ' AND i.sekolah_id = ?';
      params.push(sekolah_id);
    }

    if (dapur_id) {
      query += ' AND i.dapur_id = ?';
      params.push(dapur_id);
    }

    if (tanggal) {
      query += ' AND i.tanggal = ?';
      params.push(tanggal);
    }

    query += ' ORDER BY i.tanggal DESC, i.created_at DESC';

    const insiden = await all(query, params);
    res.json(insiden);
  } catch (error) {
    console.error('Get insiden error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create insiden
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { sekolah_id, dapur_id, tipe, deskripsi, latitude, longitude, tanggal } = req.body;

    if (!tipe || !deskripsi || !tanggal) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const result = await run(
      `
        INSERT INTO insiden (sekolah_id, dapur_id, tipe, deskripsi, latitude, longitude, tanggal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        sekolah_id || null,
        dapur_id || null,
        tipe,
        deskripsi,
        latitude || null,
        longitude || null,
        tanggal,
      ]
    );

    res.status(201).json({
      message: 'Insiden berhasil dilaporkan',
      id: result.lastID,
    });
  } catch (error) {
    console.error('Create insiden error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update insiden (tindak lanjut)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, ditangani_oleh, tindak_lanjut } = req.body;

    const existing = await get('SELECT id FROM insiden WHERE id = ?', [req.params.id]);
    
    if (!existing) {
      return res.status(404).json({ error: 'Insiden tidak ditemukan' });
    }

    await run(
      `
        UPDATE insiden 
        SET status = ?, ditangani_oleh = ?, tindak_lanjut = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [status, ditangani_oleh || null, tindak_lanjut || null, req.params.id]
    );

    res.json({ message: 'Insiden berhasil diupdate' });
  } catch (error) {
    console.error('Update insiden error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
