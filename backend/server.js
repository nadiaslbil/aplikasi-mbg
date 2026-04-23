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

// 1. CORS CONFIGURATION (MUST BE AT THE TOP)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. IMPORT DATABASE & MIDDLEWARE
const { pool, db, run, get, all, isPostgres } = require('./database');
const { upload, handleMulterError } = require('./middleware/upload');
const { requireRole } = require('./middleware/rbac');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST'],
  },
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token tidak tersedia' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Token tidak valid atau sudah expired' });
    }
    req.user = user;
    next();
  });
};

// ============ AUTH ROUTES ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: isPostgres ? 'postgres' : 'sqlite' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Email atau password salah' });

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Email atau password salah' });

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
    res.status(500).json({ error: 'Terjadi kesalahan server: ' + error.message });
  }
});

// ============ SEKOLAH ROUTES ============
app.get('/api/sekolah', authenticateToken, async (req, res) => {
  try {
    const { kecamatan, kabupaten, status, search } = req.query;
    let query = `SELECT * FROM sekolah WHERE 1=1`;
    const params = [];

    if (req.user.role === 'kurir') {
      query += ' AND id IN (SELECT sekolah_id FROM dapur_sekolah WHERE dapur_id IN (SELECT dapur_id FROM dapur_kurir WHERE kurir_id = ?))';
      params.push(req.user.id);
    }

    if (kecamatan) { query += ' AND kecamatan = ?'; params.push(kecamatan); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (search) { query += ' AND (nama LIKE ? OR alamat LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY nama ASC';

    const sekolah = await all(query, params);
    res.json(sekolah);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DAPUR ROUTES ============
app.get('/api/dapur', authenticateToken, async (req, res) => {
  try {
    const results = await all('SELECT * FROM dapur_supplier ORDER BY nama ASC');
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ JADWAL ROUTES ============
app.get('/api/jadwal', authenticateToken, async (req, res) => {
  try {
    const { tanggal, status } = req.query;
    let query = `SELECT jd.*, ds.nama as dapur_nama, s.nama as sekolah_nama 
                 FROM jadwal_distribusi jd 
                 JOIN dapur_supplier ds ON jd.dapur_id = ds.id 
                 JOIN sekolah s ON jd.sekolah_id = s.id 
                 WHERE 1=1`;
    const params = [];
    if (tanggal) { query += ' AND jd.tanggal = ?'; params.push(tanggal); }
    if (status) { query += ' AND jd.status = ?'; params.push(status); }
    query += ' ORDER BY jd.tanggal ASC';
    const results = await all(query, params);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DASHBOARD STATS ============
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const totalSekolah = await get('SELECT COUNT(*) as count FROM sekolah WHERE status = ?', ['aktif']);
    const totalDapur = await get('SELECT COUNT(*) as count FROM dapur_supplier WHERE status = ?', ['aktif']);
    
    // SQLite: strftime, Postgres: TO_CHAR (handled by our database.js transformQuery)
    const pengirimanBulanIni = await get(`SELECT COUNT(*) as count FROM jadwal_distribusi WHERE strftime('%Y-%m', tanggal) = strftime('%Y-%m', 'now')`);

    res.json({
      today,
      sekolah: { total_aktif: totalSekolah?.count || 0 },
      dapur: { total_aktif: totalDapur?.count || 0 },
      pengiriman_bulan_ini: pengirimanBulanIni?.count || 0,
      jadwal_hari_ini: { total: 0, terjadwal: 0, dalam_pengiriman: 0, diterima: 0, gagal: 0 },
      insiden_bulan_ini: 0,
      stok_expired_soon: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
  socket.on('courier-location', (data) => {
    io.emit('courier-update', { ...data, timestamp: new Date().toISOString() });
  });
});

app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
