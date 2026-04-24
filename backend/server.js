const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();

// JANGAN gunakan package 'cors', gunakan middleware manual ini agar kita punya kontrol penuh
app.use((req, res, next) => {
  const allowedOrigins = ['https://aplikasi-mbg-theta.vercel.app', 'http://localhost:3000'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback untuk development atau jika origin tidak terdeteksi (tapi tetap kirim origin pertama)
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // KHUSUS UNTUK PREFLIGHT (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import database dengan sangat hati-hati
let db_methods = {};
try {
  const db = require('./database');
  db_methods = db;
} catch (e) {
  console.error("Gagal load database:", e.message);
}

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { get } = db_methods;

    if (!get) return res.status(500).json({ error: 'Database tidak terkoneksi' });

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, nama: user.nama },
      process.env.JWT_SECRET || 'secret_mbg_123',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, nama: user.nama, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

module.exports = app;

// Jalankan server jika lokal
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}
