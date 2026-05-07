const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, permissions } = require('../middleware/rbac');

// Get all jadwal distribusi
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { tanggal, status, dapur_id, sekolah_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    let baseQuery = `
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
        return res.json({
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        });
      }

      const placeholders = accessibleDapurIds.map(() => '?').join(', ');
      baseQuery += ` AND jd.dapur_id IN (${placeholders})`;
      params.push(...accessibleDapurIds);
    }

    if (tanggal) {
      baseQuery += ' AND jd.tanggal = ?';
      params.push(tanggal);
    }

    if (status) {
      baseQuery += ' AND jd.status = ?';
      params.push(status);
    }

    if (dapur_id) {
      baseQuery += ' AND jd.dapur_id = ?';
      params.push(dapur_id);
    }

    if (sekolah_id) {
      baseQuery += ' AND jd.sekolah_id = ?';
      params.push(sekolah_id);
    }

    // Get total count
    const countResult = await get(`SELECT COUNT(*) as total ${baseQuery}`, params);
    const total = countResult.total;

    let query = `
      SELECT jd.*, ds.nama as dapur_nama, s.nama as sekolah_nama, s.alamat as sekolah_alamat,
             s.latitude as sekolah_latitude, s.longitude as sekolah_longitude,
             COALESCE(pu.nama, du.nama) as kurir_nama
      ${baseQuery}
      ORDER BY jd.tanggal DESC, jd.waktu_kirim ASC
      LIMIT ? OFFSET ?
    `;

    const jadwal = await all(query, [...params, limit, offset]);
    res.json({
      data: jadwal,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
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
router.post('/', authenticateToken, requireRole(permissions.jadwal.create), async (req, res) => {
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
router.put('/:id', authenticateToken, requireRole(permissions.jadwal.update), async (req, res) => {
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
router.delete('/:id', authenticateToken, requireRole(permissions.jadwal.delete), async (req, res) => {
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
