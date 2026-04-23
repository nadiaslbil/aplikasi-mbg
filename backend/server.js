const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const server = http.createServer(app);

// 1. CORS HARUS PALING ATAS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

// 2. Middleware Dasar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Baru Import Database & Lainnya
const { db, run, get, all, isPostgres } = require('./database');
const { upload, handleMulterError } = require('./middleware/upload');
const { requireRole } = require('./middleware/rbac');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token tidak tersedia' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Token tidak valid' });
    req.user = user;
    next();
  });
};

// ... (Sisanya tetap sama, namun pastikan query SQL sudah menggunakan helper database.js)
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: isPostgres ? 'postgres' : 'sqlite' });
});

// Login route (Contoh perbaikan)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, nama: user.nama },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ message: 'Login berhasil', token, user: { id: user.id, nama: user.nama, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Salin rute-rute lainnya di sini...

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
