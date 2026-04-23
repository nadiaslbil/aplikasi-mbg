const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();

// 1. CORS - Harus paling atas agar rute error pun tetap punya header CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Database & Middleware
const { pool, db, run, get, all, isPostgres } = require('./database');
const { upload, handleMulterError } = require('./middleware/upload');
const { requireRole } = require('./middleware/rbac');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============ ROUTES ============

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: isPostgres ? 'postgres' : 'sqlite',
    env: process.env.VERCEL ? 'production/vercel' : 'development'
  });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, nama: user.nama },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login berhasil',
      token,
      user: { id: user.id, nama: user.nama, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Route dummy untuk memastikan rute lain juga terdaftar
app.get('/api/sekolah', authenticateToken, async (req, res) => {
  try {
    const results = await all('SELECT * FROM sekolah LIMIT 10');
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token tidak tersedia' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Token tidak valid' });
    req.user = user;
    next();
  });
}

// 3. EXPORT UNTUK VERCEL (PENTING!)
if (process.env.VERCEL) {
  module.exports = app;
} else {
  const server = http.createServer(app);
  const { Server } = require('socket.io');
  const io = new Server(server, { cors: { origin: "*" } });
  
  io.on('connection', (socket) => {
    socket.on('courier-location', (data) => io.emit('courier-update', data));
  });

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Local Server running on port ${PORT}`);
  });
}
