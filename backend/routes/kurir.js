const express = require('express');
const router = express.Router();
const { all } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// List kurir users
router.get('/', authenticateToken, async (req, res) => {
  try {
    const kurirs = await all(
      "SELECT id, nama, email, role, created_at FROM users WHERE role = 'kurir' ORDER BY nama ASC"
    );
    res.json(kurirs);
  } catch (error) {
    console.error('Get kurir error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;

