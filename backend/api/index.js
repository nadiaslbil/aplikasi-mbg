const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

dotenv.config();
const app = express();

// Jamin CORS dari Theta
app.use(cors({
  origin: 'https://aplikasi-mbg-theta.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
}));

app.use(express.json());

// Import database secara langsung
const { get, run, all, isPostgres } = require('../database');

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    database: isPostgres ? 'postgres' : 'sqlite',
    env: process.env.NODE_ENV 
  });
});

// ENDPOINT DARURAT: Jalankan ini sekali untuk buat tabel & user admin
app.get('/api/seed', async (req, res) => {
  try {
    // Buat tabel users jika belum ada
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nama TEXT,
        email TEXT UNIQUE,
        password_hash TEXT,
        role TEXT
      )
    `);

    // Cek apakah admin sudah ada
    const admin = await get('SELECT * FROM users WHERE email = ?', ['admin@mbg.go.id']);
    if (!admin) {
      const hash = bcrypt.hashSync('admin123', 10);
      await run('INSERT INTO users (nama, email, password_hash, role) VALUES (?, ?, ?, ?)', 
        ['Admin BGN', 'admin@mbg.go.id', hash, 'admin_bgn']);
      return res.json({ message: 'Database seeded successfully. Admin created.' });
    }
    
    res.json({ message: 'Database already has data.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Pastikan database siap
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) {
      return res.status(401).json({ error: 'User tidak ditemukan' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Password salah' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, nama: user.nama },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, nama: user.nama, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Database Error: ' + error.message });
  }
});

module.exports = app;
