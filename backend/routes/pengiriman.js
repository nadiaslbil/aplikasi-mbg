const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all pengiriman
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, jadwal_id } = req.query;
    
    let query = `
      SELECT p.*, jd.tanggal, jd.waktu_kirim,
             ds.nama as dapur_nama, s.nama as sekolah_nama
      FROM pengiriman p
      JOIN jadwal_distribusi jd ON p.jadwal_id = jd.id
      JOIN dapur_supplier ds ON jd.dapur_id = ds.id
      JOIN sekolah s ON jd.sekolah_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (jadwal_id) {
      query += ' AND p.jadwal_id = ?';
      params.push(jadwal_id);
    }

    query += ' ORDER BY p.created_at DESC';

    const pengiriman = await all(query, params);
    res.json(pengiriman);
  } catch (error) {
    console.error('Get pengiriman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get pengiriman by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT p.*, jd.tanggal, jd.waktu_kirim,
             ds.nama as dapur_nama, ds.latitude as dapur_latitude, ds.longitude as dapur_longitude,
             s.nama as sekolah_nama, s.latitude as sekolah_latitude, s.longitude as sekolah_longitude,
             u.nama as kurir_nama
      FROM pengiriman p
      JOIN jadwal_distribusi jd ON p.jadwal_id = jd.id
      JOIN dapur_supplier ds ON jd.dapur_id = ds.id
      JOIN sekolah s ON jd.sekolah_id = s.id
      JOIN users u ON p.kurir_id = u.id
      WHERE p.id = ?
    `;
    
    const pengiriman = await get(query, [req.params.id]);
    
    if (!pengiriman) {
      return res.status(404).json({ error: 'Pengiriman tidak ditemukan' });
    }

    res.json(pengiriman);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create pengiriman
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { jadwal_id, kurir_id } = req.body;

    if (!jadwal_id || !kurir_id) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const result = await run(
      `
        INSERT INTO pengiriman (jadwal_id, kurir_id, status)
        VALUES (?, ?, 'dalam_perjalanan')
      `,
      [jadwal_id, kurir_id]
    );

    // Update jadwal status
    await run('UPDATE jadwal_distribusi SET status = ? WHERE id = ?', ['dalam_pengiriman', jadwal_id]);

    res.status(201).json({
      message: 'Pengiriman berhasil dibuat',
      id: result.lastID,
    });
  } catch (error) {
    console.error('Create pengiriman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update pengiriman (termasuk location tracking)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, status, bukti_foto, catatan, waktu_berangkat, waktu_tiba } = req.body;

    const existing = await get('SELECT id FROM pengiriman WHERE id = ?', [req.params.id]);
    
    if (!existing) {
      return res.status(404).json({ error: 'Pengiriman tidak ditemukan' });
    }

    await run(
      `
        UPDATE pengiriman 
        SET latitude = ?, longitude = ?, status = ?, bukti_foto = ?, 
            catatan = ?, waktu_berangkat = ?, waktu_tiba = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        latitude || null,
        longitude || null,
        status,
        bukti_foto || null,
        catatan || null,
        waktu_berangkat || null,
        waktu_tiba || null,
        req.params.id,
      ]
    );

    // If status is 'diterima', update jadwal
    if (status === 'diterima') {
      const pengiriman = await get('SELECT jadwal_id FROM pengiriman WHERE id = ?', [req.params.id]);
      if (pengiriman?.jadwal_id) {
        await run(
          `
            UPDATE jadwal_distribusi 
            SET status = 'diterima', waktu_terima = CURRENT_TIMESTAMP 
            WHERE id = ?
          `,
          [pengiriman.jadwal_id]
        );
      }
    }

    res.json({ message: 'Pengiriman berhasil diupdate' });
  } catch (error) {
    console.error('Update pengiriman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update lokasi kurir (compat endpoint for frontend live tracking)
router.put('/:id/location', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, status, catatan } = req.body;
    const existing = await get('SELECT id FROM pengiriman WHERE id = ?', [req.params.id]);

    if (!existing) {
      return res.status(404).json({ error: 'Pengiriman tidak ditemukan' });
    }

    await run(
      `
        UPDATE pengiriman
        SET latitude = ?, longitude = ?, status = ?, catatan = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [latitude || null, longitude || null, status || 'dalam_perjalanan', catatan || null, req.params.id]
    );

    // Keep jadwal status in sync when delivery completed via location endpoint
    if (status === 'diterima') {
      const pengiriman = await get('SELECT jadwal_id FROM pengiriman WHERE id = ?', [req.params.id]);
      if (pengiriman?.jadwal_id) {
        await run(
          `
            UPDATE jadwal_distribusi
            SET status = 'diterima', waktu_terima = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [pengiriman.jadwal_id]
        );
      }
    }

    res.json({ message: 'Lokasi berhasil diupdate' });
  } catch (error) {
    console.error('Update lokasi pengiriman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get kurir locations for real-time tracking
router.get('/tracking/active', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.latitude, p.longitude, p.status, p.kurir_id, p.catatan, p.updated_at,
             u.nama as kurir_nama, jd.tanggal,
             s.nama as sekolah_nama, s.latitude as sekolah_lat, s.longitude as sekolah_lng
      FROM pengiriman p
      JOIN users u ON p.kurir_id = u.id
      JOIN jadwal_distribusi jd ON p.jadwal_id = jd.id
      JOIN sekolah s ON jd.sekolah_id = s.id
      WHERE p.status = 'dalam_perjalanan'
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
      ORDER BY p.updated_at DESC
    `;
    
    const couriers = await all(query);
    res.json(couriers);
  } catch (error) {
    console.error('Get tracking error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
