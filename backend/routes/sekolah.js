const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, permissions } = require('../middleware/rbac');
const { sekolahSchema, validate } = require('../validation/schemas');

// Get all sekolah
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { kecamatan, kabupaten, status, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    let baseQuery = 'FROM sekolah WHERE 1=1';
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
      baseQuery += `
        AND EXISTS (
          SELECT 1
          FROM dapur_sekolah dsk
          WHERE dsk.sekolah_id = sekolah.id
            AND dsk.status = 'aktif'
            AND dsk.dapur_id IN (${placeholders})
        )
      `;
      params.push(...accessibleDapurIds);
    }

    if (kecamatan) {
      baseQuery += ' AND kecamatan = ?';
      params.push(kecamatan);
    }

    if (kabupaten) {
      baseQuery += ' AND kabupaten = ?';
      params.push(kabupaten);
    }

    if (status) {
      baseQuery += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      baseQuery += ' AND (nama LIKE ? OR alamat LIKE ? OR kecamatan LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Get total count for pagination
    const countResult = await get(`SELECT COUNT(*) as total ${baseQuery}`, params);
    const total = countResult.total;

    // Get paginated data
    let query = `SELECT * ${baseQuery} ORDER BY nama ASC LIMIT ? OFFSET ?`;
    const sekolah = await all(query, [...params, limit, offset]);

    if (!sekolah.length) {
      return res.json({
        data: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    }

    const sekolahIds = sekolah.map((s) => s.id);
    const placeholders = sekolahIds.map(() => '?').join(', ');
    const dapurRows = await all(
      `
        SELECT dsk.sekolah_id, ds.nama as dapur_nama
        FROM dapur_sekolah dsk
        JOIN dapur_supplier ds ON dsk.dapur_id = ds.id
        WHERE dsk.status = 'aktif'
          AND dsk.sekolah_id IN (${placeholders})
        ORDER BY ds.nama ASC
      `,
      sekolahIds
    );

    const dapurBySekolah = new Map();
    for (const row of dapurRows) {
      const existing = dapurBySekolah.get(row.sekolah_id) || [];
      existing.push(row.dapur_nama);
      dapurBySekolah.set(row.sekolah_id, existing);
    }

    const sekolahWithDapur = sekolah.map((row) => ({
      ...row,
      dapur_pembina: (dapurBySekolah.get(row.id) || []).join(', ') || null,
    }));

    res.json({
      data: sekolahWithDapur,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get sekolah by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const sekolah = await get('SELECT * FROM sekolah WHERE id = ?', [req.params.id]);
    
    if (!sekolah) {
      return res.status(404).json({ error: 'Sekolah tidak ditemukan' });
    }

    const dapurRows = await all(
      `
        SELECT ds.nama as dapur_nama
        FROM dapur_sekolah dsk
        JOIN dapur_supplier ds ON dsk.dapur_id = ds.id
        WHERE dsk.status = 'aktif'
          AND dsk.sekolah_id = ?
        ORDER BY ds.nama ASC
      `,
      [req.params.id]
    );

    res.json({
      ...sekolah,
      dapur_pembina: dapurRows.map((d) => d.dapur_nama).join(', ') || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create sekolah
router.post('/', authenticateToken, requireRole(permissions.sekolah.create), validate(sekolahSchema), async (req, res) => {
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa, kontak } = req.body;

    const result = await run(
      `
        INSERT INTO sekolah (nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa, kontak)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa || 0, kontak || null]
    );

    res.status(201).json({
      message: 'Sekolah berhasil ditambahkan',
      id: result.lastID,
    });
  } catch (error) {
    console.error('Create sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update sekolah
router.put('/:id', authenticateToken, requireRole(permissions.sekolah.update), validate(sekolahSchema), async (req, res) => {
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa, kontak, status } = req.body;

    const existing = await get('SELECT id FROM sekolah WHERE id = ?', [req.params.id]);
    
    if (!existing) {
      return res.status(404).json({ error: 'Sekolah tidak ditemukan' });
    }

    await run(
      `
        UPDATE sekolah 
        SET nama = ?, alamat = ?, latitude = ?, longitude = ?, 
            kecamatan = ?, kabupaten = ?, provinsi = ?, 
            jumlah_siswa = ?, kontak = ?, status = ?,
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
        jumlah_siswa,
        kontak,
        status,
        req.params.id,
      ]
    );

    res.json({ message: 'Sekolah berhasil diupdate' });
  } catch (error) {
    console.error('Update sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete sekolah
router.delete('/:id', authenticateToken, requireRole(permissions.sekolah.delete), async (req, res) => {
  try {
    const existing = await get('SELECT id FROM sekolah WHERE id = ?', [req.params.id]);
    
    if (!existing) {
      return res.status(404).json({ error: 'Sekolah tidak ditemukan' });
    }

    await run('DELETE FROM sekolah WHERE id = ?', [req.params.id]);
    res.json({ message: 'Sekolah berhasil dihapus' });
  } catch (error) {
    console.error('Delete sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
