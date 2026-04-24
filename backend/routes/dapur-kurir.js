const express = require('express');
const router = express.Router();
const { all } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get dapur-kurir relations (optionally filter by kurir_id)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { kurir_id } = req.query;
    let query = `
      SELECT dk.*, ds.nama as dapur_nama, u.nama as kurir_nama
      FROM dapur_kurir dk
      JOIN dapur_supplier ds ON dk.dapur_id = ds.id
      JOIN users u ON dk.kurir_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (kurir_id) {
      query += ' AND dk.kurir_id = ?';
      params.push(kurir_id);
    }

    query += ' ORDER BY dk.created_at DESC';

    const rows = await all(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get dapur-kurir error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;

