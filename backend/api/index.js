const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

dotenv.config();
const app = express();

// Middleware CORS - Jaminan akses dari domain Theta
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['https://aplikasi-mbg-theta.vercel.app', 'http://localhost:3000'];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesuaikan path import karena sekarang file ada di dalam folder /api
const databasePath = path.join(__dirname, '../database');
let db_methods = {};
try {
  db_methods = require(databasePath);
} catch (e) {
  console.error("Database connection error:", e.message);
}

const { get } = db_methods;

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', info: 'Running as Vercel Function' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!get) return res.status(500).json({ error: 'Database error' });

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, nama: user.nama },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, nama: user.nama, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
