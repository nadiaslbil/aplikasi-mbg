const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        nama: user.nama,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Register
router.post('/register', authenticateToken, requireRole(['admin_bgn']), async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;

    if (!nama || !email || !password) {
      return res.status(400).json({ error: 'Nama, email, dan password wajib diisi' });
    }

    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);

    if (existingUser) {
      return res.status(409).json({ error: 'Email sudah terdaftar' });
    }

    const hashPassword = bcrypt.hashSync(password, 10);

    const result = await run(
      'INSERT INTO users (nama, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [nama, email, hashPassword, role || 'admin_daerah']
    );

    res.status(201).json({
      message: 'User berhasil didaftarkan',
      userId: result.lastID,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get current user
router.get('/me', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const user = await get('SELECT id, nama, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
