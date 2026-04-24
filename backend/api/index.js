const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

dotenv.config();
const app = express();

// Gunakan CORS standar dengan konfigurasi yang sama
app.use(cors({
  origin: 'https://aplikasi-mbg-theta.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const databasePath = path.join(__dirname, '../database');
let db_methods = {};
try {
  db_methods = require(databasePath);
} catch (e) {
  console.error("Database initialization failed:", e.message);
}

const { get } = db_methods;

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', source: 'vercel-function' });
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
