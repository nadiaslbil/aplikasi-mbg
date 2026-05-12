const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, permissions } = require('../middleware/rbac');
const { insidenSchema, validate } = require('../validation/schemas');

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
      query += `
        AND (
          i.dapur_id IN (${placeholders})
          OR (
            i.dapur_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM dapur_sekolah dsk
              WHERE dsk.sekolah_id = i.sekolah_id
                AND dsk.status = 'aktif'
                AND dsk.dapur_id IN (${placeholders})
            )
          )
        )
      `;
      params.push(...accessibleDapurIds, ...accessibleDapurIds);
    }

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
router.post('/', authenticateToken, validate(insidenSchema), async (req, res) => {
  try {
    const { sekolah_id, dapur_id, tipe, deskripsi, latitude, longitude, tanggal } = req.body;

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
router.put('/:id', authenticateToken, requireRole(permissions.insiden.update), validate(insidenSchema.partial()), async (req, res) => {
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

// Delete insiden
router.delete('/:id', authenticateToken, requireRole(permissions.insiden.delete), async (req, res) => {
  try {
    const existing = await get('SELECT id FROM insiden WHERE id = ?', [req.params.id]);
    
    if (!existing) {
      return res.status(404).json({ error: 'Insiden tidak ditemukan' });
    }

    await run('DELETE FROM insiden WHERE id = ?', [req.params.id]);
    res.json({ message: 'Insiden berhasil dihapus' });
  } catch (error) {
    console.error('Delete insiden error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
