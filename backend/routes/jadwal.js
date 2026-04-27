const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all jadwal distribusi
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { tanggal, status, dapur_id, sekolah_id } = req.query;
    
    let query = `
      SELECT jd.*, ds.nama as dapur_nama, s.nama as sekolah_nama, s.alamat as sekolah_alamat,
             s.latitude as sekolah_latitude, s.longitude as sekolah_longitude,
             COALESCE(pu.nama, du.nama) as kurir_nama
      FROM jadwal_distribusi jd
      JOIN dapur_supplier ds ON jd.dapur_id = ds.id
      JOIN sekolah s ON jd.sekolah_id = s.id
      LEFT JOIN pengiriman p ON p.jadwal_id = jd.id
      LEFT JOIN users pu ON p.kurir_id = pu.id
      LEFT JOIN (
        SELECT dapur_id, MIN(kurir_id) as kurir_id
        FROM dapur_kurir
        GROUP BY dapur_id
      ) dkm ON dkm.dapur_id = jd.dapur_id
      LEFT JOIN users du ON dkm.kurir_id = du.id
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

    const jadwal = await all(query, params);
    res.json(jadwal);
  } catch (error) {
    console.error('Get jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get jadwal by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT jd.*, ds.nama as dapur_nama, s.nama as sekolah_nama, s.alamat as sekolah_alamat,
             s.latitude as sekolah_latitude, s.longitude as sekolah_longitude,
             s.kontak as sekolah_kontak,
             COALESCE(pu.nama, du.nama) as kurir_nama
      FROM jadwal_distribusi jd
      JOIN dapur_supplier ds ON jd.dapur_id = ds.id
      JOIN sekolah s ON jd.sekolah_id = s.id
      LEFT JOIN pengiriman p ON p.jadwal_id = jd.id
      LEFT JOIN users pu ON p.kurir_id = pu.id
      LEFT JOIN (
        SELECT dapur_id, MIN(kurir_id) as kurir_id
        FROM dapur_kurir
        GROUP BY dapur_id
      ) dkm ON dkm.dapur_id = jd.dapur_id
      LEFT JOIN users du ON dkm.kurir_id = du.id
      WHERE jd.id = ?
    `;
    
    const jadwal = await get(query, [req.params.id]);
    
    if (!jadwal) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    res.json(jadwal);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create jadwal
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { dapur_id, sekolah_id, tanggal, waktu_kirim, jumlah_porsi, catatan, kurir_id } = req.body;

    if (!dapur_id || !sekolah_id || !tanggal || !jumlah_porsi) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const sekolahRelation = await get(
      `
        SELECT id
        FROM dapur_sekolah
        WHERE dapur_id = ?
          AND sekolah_id = ?
          AND status = 'aktif'
      `,
      [dapur_id, sekolah_id]
    );
    if (!sekolahRelation) {
      return res.status(400).json({ error: 'Sekolah tidak terdaftar sebagai binaan dapur ini' });
    }

    if (kurir_id) {
      const kurirRelation = await get(
        'SELECT id FROM dapur_kurir WHERE dapur_id = ? AND kurir_id = ?',
        [dapur_id, kurir_id]
      );
      if (!kurirRelation) {
        return res.status(400).json({ error: 'Kurir tidak terdaftar pada dapur ini' });
      }
    }

    const result = await run(
      `
        INSERT INTO jadwal_distribusi (dapur_id, sekolah_id, tanggal, waktu_kirim, jumlah_porsi, catatan)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [dapur_id, sekolah_id, tanggal, waktu_kirim || null, jumlah_porsi, catatan || null]
    );

    res.status(201).json({
      message: 'Jadwal distribusi berhasil ditambahkan',
      id: result.lastID,
    });
  } catch (error) {
    console.error('Create jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update jadwal
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { dapur_id, sekolah_id, tanggal, waktu_kirim, waktu_terima, jumlah_porsi, status, catatan, kurir_id } = req.body;

    const existing = await get('SELECT id FROM jadwal_distribusi WHERE id = ?', [req.params.id]);
    
    if (!existing) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    const sekolahRelation = await get(
      `
        SELECT id
        FROM dapur_sekolah
        WHERE dapur_id = ?
          AND sekolah_id = ?
          AND status = 'aktif'
      `,
      [dapur_id, sekolah_id]
    );
    if (!sekolahRelation) {
      return res.status(400).json({ error: 'Sekolah tidak terdaftar sebagai binaan dapur ini' });
    }

    if (kurir_id) {
      const kurirRelation = await get(
        'SELECT id FROM dapur_kurir WHERE dapur_id = ? AND kurir_id = ?',
        [dapur_id, kurir_id]
      );
      if (!kurirRelation) {
        return res.status(400).json({ error: 'Kurir tidak terdaftar pada dapur ini' });
      }
    }

    await run(
      `
        UPDATE jadwal_distribusi 
        SET dapur_id = ?, sekolah_id = ?, tanggal = ?, waktu_kirim = ?, 
            waktu_terima = ?, jumlah_porsi = ?, status = ?, catatan = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        dapur_id,
        sekolah_id,
        tanggal,
        waktu_kirim,
        waktu_terima,
        jumlah_porsi,
        status,
        catatan,
        req.params.id,
      ]
    );

    res.json({ message: 'Jadwal distribusi berhasil diupdate' });
  } catch (error) {
    console.error('Update jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete jadwal
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await get('SELECT id FROM jadwal_distribusi WHERE id = ?', [req.params.id]);
    
    if (!existing) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    await run('DELETE FROM jadwal_distribusi WHERE id = ?', [req.params.id]);
    res.json({ message: 'Jadwal distribusi berhasil dihapus' });
  } catch (error) {
    console.error('Delete jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
