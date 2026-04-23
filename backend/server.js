const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');

dotenv.config();

// Import database
const { db, run, get, all } = require('./database');

// Import upload middleware
const { upload, handleMulterError, uploadsDir } = require('./middleware/upload');

// Import RBAC middleware
const { requireRole, permissions } = require('./middleware/rbac');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// ============ UPLOAD ROUTES ============
app.post('/api/upload', 
  authenticateToken, 
  requireRole(['admin_bgn', 'admin_daerah', 'kurir']),
  upload.single('file'), 
  handleMulterError, 
  async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    // Return file info and URL
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: `/uploads/${req.file.filename}`,
      path: req.file.filename
    };

    res.status(201).json({
      message: 'File berhasil diupload',
      ...fileInfo
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat upload' });
  }
});

// ============ AUTH ROUTES ============
app.post('/api/auth/login', async (req, res) => {
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
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.post('/api/auth/register', authenticateToken, async (req, res) => {
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

    res.status(201).json({ message: 'User berhasil didaftarkan', userId: result.lastID });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await get('SELECT id, nama, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ============ SEKOLAH ROUTES ============
app.get('/api/sekolah',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    const { kecamatan, kabupaten, status, search } = req.query;
    let query = `SELECT s.*, 
      (SELECT GROUP_CONCAT(ds.nama) FROM dapur_sekolah dsk JOIN dapur_supplier ds ON dsk.dapur_id = ds.id WHERE dsk.sekolah_id = s.id AND dsk.status = 'aktif') as dapur_pembina
      FROM sekolah s WHERE 1=1`;
    const params = [];

    // FILTER OTOMATIS UNTUK KURIR - hanya lihat sekolah dari dapur mereka
    if (req.user.role === 'kurir') {
      // Cari dapur_id yang dikaitkan dengan kurir ini
      query += ' AND s.id IN (SELECT dsk.sekolah_id FROM dapur_sekolah dsk JOIN dapur_kurir dk ON dsk.dapur_id = dk.dapur_id WHERE dk.kurir_id = ? AND dsk.status = \'aktif\' AND dk.status = \'aktif\')';
      params.push(req.user.id);
    }

    // FILTER OTOMATIS UNTUK SUPPLIER - hanya lihat sekolah dari dapur mereka
    if (req.user.role === 'supplier') {
      query += ' AND s.id IN (SELECT dsk.sekolah_id FROM dapur_sekolah dsk JOIN dapur_supplier ds ON dsk.dapur_id = ds.id WHERE ds.user_id = ? AND dsk.status = \'aktif\')';
      params.push(req.user.id);
    }

    if (kecamatan) { query += ' AND s.kecamatan = ?'; params.push(kecamatan); }
    if (kabupaten) { query += ' AND s.kabupaten = ?'; params.push(kabupaten); }
    if (status) { query += ' AND s.status = ?'; params.push(status); }
    if (search) { query += ' AND (s.nama LIKE ? OR s.alamat LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY s.nama ASC';

    const sekolah = await all(query, params);
    res.json(sekolah);
  } catch (error) {
    console.error('Get sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.get('/api/sekolah/:id', 
  authenticateToken, 
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    const sekolah = await get('SELECT * FROM sekolah WHERE id = ?', [req.params.id]);
    if (!sekolah) return res.status(404).json({ error: 'Sekolah tidak ditemukan' });
    res.json(sekolah);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.post('/api/sekolah', 
  authenticateToken, 
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa, kontak } = req.body;
    if (!nama || !alamat || latitude === undefined || longitude === undefined || !kecamatan) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const result = await run(
      `INSERT INTO sekolah (nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa, kontak)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nama, alamat, latitude, longitude, kecamatan, kabupaten || '', provinsi || '', jumlah_siswa || 0, kontak || null]
    );
    res.status(201).json({ message: 'Sekolah berhasil ditambahkan', id: result.lastID });
  } catch (error) {
    console.error('Create sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.put('/api/sekolah/:id', 
  authenticateToken, 
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa, kontak, status } = req.body;
    const existing = await get('SELECT id FROM sekolah WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Sekolah tidak ditemukan' });

    await run(
      `UPDATE sekolah SET nama = ?, alamat = ?, latitude = ?, longitude = ?, kecamatan = ?, kabupaten = ?, provinsi = ?, jumlah_siswa = ?, kontak = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, jumlah_siswa, kontak, status, req.params.id]
    );
    res.json({ message: 'Sekolah berhasil diupdate' });
  } catch (error) {
    console.error('Update sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.delete('/api/sekolah/:id', 
  authenticateToken, 
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const existing = await get('SELECT id FROM sekolah WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Sekolah tidak ditemukan' });
    await run('DELETE FROM sekolah WHERE id = ?', [req.params.id]);
    res.json({ message: 'Sekolah berhasil dihapus' });
  } catch (error) {
    console.error('Delete sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ============ DAPUR ROUTES ============
app.get('/api/dapur',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    const { kecamatan, status, search } = req.query;
    let query = 'SELECT * FROM dapur_supplier WHERE 1=1';
    const params = [];

    // Filter untuk supplier: hanya tampilkan dapur yang mereka pegang
    if (req.user.role === 'supplier') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }

    if (kecamatan) { query += ' AND kecamatan = ?'; params.push(kecamatan); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (search) { query += ' AND (nama LIKE ? OR alamat LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY nama ASC';

    const dapur = await all(query, params);
    res.json(dapur);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.post('/api/dapur',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, kapasitas_harian, kontak, penanggung_jawab, user_id } = req.body;
    if (!nama || !alamat || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const result = await run(
      `INSERT INTO dapur_supplier (user_id, nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, kapasitas_harian, kontak, penanggung_jawab) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id || null, nama, alamat, latitude, longitude, kecamatan, kabupaten || '', provinsi || '', kapasitas_harian || 0, kontak || null, penanggung_jawab || null]
    );
    res.status(201).json({ message: 'Dapur supplier berhasil ditambahkan', id: result.lastID });
  } catch (error) {
    console.error('Create dapur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.put('/api/dapur/:id',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'supplier']),
  async (req, res) => {
  try {
    const { nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, kapasitas_harian, kontak, penanggung_jawab, status, user_id } = req.body;

    const existing = await get('SELECT * FROM dapur_supplier WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Dapur tidak ditemukan' });

    // Validasi ownership untuk supplier
    if (req.user.role === 'supplier') {
      if (!existing.user_id || existing.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Anda tidak memiliki akses untuk mengedit dapur ini' });
      }
    }

    // Hanya admin yang bisa mengubah user_id (reassign supplier)
    const finalUserId = req.user.role === 'admin_bgn' || req.user.role === 'admin_daerah'
      ? (user_id !== undefined ? user_id : existing.user_id)
      : existing.user_id;

    await run(
      `UPDATE dapur_supplier SET user_id = ?, nama = ?, alamat = ?, latitude = ?, longitude = ?, kecamatan = ?, kabupaten = ?, provinsi = ?, kapasitas_harian = ?, kontak = ?, penanggung_jawab = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [finalUserId, nama, alamat, latitude, longitude, kecamatan, kabupaten, provinsi, kapasitas_harian, kontak, penanggung_jawab, status, req.params.id]
    );
    res.json({ message: 'Dapur supplier berhasil diupdate' });
  } catch (error) {
    console.error('Update dapur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.delete('/api/dapur/:id', 
  authenticateToken, 
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const existing = await get('SELECT id FROM dapur_supplier WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Dapur tidak ditemukan' });
    await run('DELETE FROM dapur_supplier WHERE id = ?', [req.params.id]);
    res.json({ message: 'Dapur supplier berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ============ JADWAL ROUTES ============
app.get('/api/jadwal',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    const { tanggal, status, dapur_id, sekolah_id } = req.query;
    let query = `SELECT jd.*, ds.nama as dapur_nama, s.nama as sekolah_nama, u.nama as kurir_nama, p.id as pengiriman_id, p.kurir_id as pengiriman_kurir_id, s.alamat as sekolah_alamat, s.latitude as sekolah_latitude, s.longitude as sekolah_longitude FROM jadwal_distribusi jd JOIN dapur_supplier ds ON jd.dapur_id = ds.id JOIN sekolah s ON jd.sekolah_id = s.id LEFT JOIN pengiriman p ON jd.id = p.jadwal_id LEFT JOIN users u ON p.kurir_id = u.id WHERE 1=1`;
    const params = [];

    // FILTER OTOMATIS UNTUK KURIR - hanya lihat jadwal dari dapur mereka
    if (req.user.role === 'kurir') {
      // Cari dapur_id yang dikaitkan dengan kurir ini
      query += ' AND jd.dapur_id IN (SELECT dapur_id FROM dapur_kurir WHERE kurir_id = ?)';
      params.push(req.user.id);
    }

    // FILTER OTOMATIS UNTUK SUPPLIER - hanya lihat jadwal dari dapur mereka
    if (req.user.role === 'supplier') {
      query += ' AND jd.dapur_id IN (SELECT id FROM dapur_supplier WHERE user_id = ?)';
      params.push(req.user.id);
    }

    if (tanggal) { query += ' AND jd.tanggal = ?'; params.push(tanggal); }
    if (status) { query += ' AND jd.status = ?'; params.push(status); }
    if (dapur_id) { query += ' AND jd.dapur_id = ?'; params.push(dapur_id); }
    if (sekolah_id) { query += ' AND jd.sekolah_id = ?'; params.push(sekolah_id); }
    
    // SORTING CERDAS (sama seperti pengiriman):
    // - Default: "dalam_pengiriman" paling atas, lalu "terjadwal", kemudian status lain
    // - Filter "dalam_pengiriman" atau "terjadwal": urutkan tanggal terdekat (ASC)
    // - Filter lain: urutkan tanggal terbaru (DESC)
    if (status === 'terjadwal' || status === 'dalam_pengiriman') {
      // Filter terjadwal/dalam_pengiriman: urutkan dari tanggal terdekat (ASC)
      query += ' ORDER BY jd.tanggal ASC, jd.waktu_kirim ASC';
    } else if (!status) {
      // Default: "dalam_pengiriman" di atas, lalu "terjadwal", kemudian status lain
      query += ' ORDER BY CASE jd.status WHEN \'dalam_pengiriman\' THEN 0 WHEN \'terjadwal\' THEN 1 WHEN \'diterima\' THEN 2 WHEN \'gagal\' THEN 3 ELSE 4 END, jd.tanggal ASC, jd.waktu_kirim ASC';
    } else {
      // Filter status lain: urutkan tanggal terbaru
      query += ' ORDER BY jd.tanggal DESC, jd.waktu_kirim DESC';
    }

    const jadwal = await all(query, params);
    res.json(jadwal);
  } catch (error) {
    console.error('Get jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.post('/api/jadwal',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const { dapur_id, sekolah_id, tanggal, waktu_kirim, jumlah_porsi, catatan, kurir_id } = req.body;
    if (!dapur_id || !sekolah_id || !tanggal || !jumlah_porsi) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const result = await run(
      `INSERT INTO jadwal_distribusi (dapur_id, sekolah_id, tanggal, waktu_kirim, jumlah_porsi, catatan) VALUES (?, ?, ?, ?, ?, ?)`,
      [dapur_id, sekolah_id, tanggal, waktu_kirim || null, jumlah_porsi, catatan || null]
    );

    const jadwalId = result.lastID;

    // Auto-create pengiriman record if kurir_id is provided
    if (kurir_id) {
      await run(
        `INSERT INTO pengiriman (jadwal_id, kurir_id, status) VALUES (?, ?, 'dalam_perjalanan')`,
        [jadwalId, kurir_id]
      );
      await run(
        `UPDATE jadwal_distribusi SET status = 'dalam_pengiriman' WHERE id = ?`,
        [jadwalId]
      );
    } else {
      // If no kurir assigned, keep status as terjadwal
      await run(
        `UPDATE jadwal_distribusi SET status = 'terjadwal' WHERE id = ?`,
        [jadwalId]
      );
    }

    res.status(201).json({
      message: kurir_id
        ? 'Jadwal dan pengiriman berhasil ditambahkan'
        : 'Jadwal berhasil ditambahkan (menunggu penugasan kurir)',
      id: jadwalId
    });
  } catch (error) {
    console.error('Create jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.put('/api/jadwal/:id',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const { dapur_id, sekolah_id, tanggal, waktu_kirim, waktu_terima, jumlah_porsi, status, catatan } = req.body;
    const existing = await get('SELECT id FROM jadwal_distribusi WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Jadwal tidak ditemukan' });

    // Get existing values for fields not provided in the update
    const current = await get('SELECT * FROM jadwal_distribusi WHERE id = ?', [req.params.id]);

    await run(
      `UPDATE jadwal_distribusi SET dapur_id = ?, sekolah_id = ?, tanggal = ?, waktu_kirim = ?, waktu_terima = ?, jumlah_porsi = ?, status = ?, catatan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [
        dapur_id !== undefined ? dapur_id : current.dapur_id,
        sekolah_id !== undefined ? sekolah_id : current.sekolah_id,
        tanggal !== undefined ? tanggal : current.tanggal,
        waktu_kirim !== undefined ? waktu_kirim : current.waktu_kirim,
        waktu_terima !== undefined ? waktu_terima : current.waktu_terima,
        jumlah_porsi !== undefined ? jumlah_porsi : current.jumlah_porsi,
        status !== undefined ? status : current.status,
        catatan !== undefined ? catatan : current.catatan,
        req.params.id
      ]
    );
    res.json({ message: 'Jadwal distribusi berhasil diupdate' });
  } catch (error) {
    console.error('Update jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.delete('/api/jadwal/:id',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const existing = await get('SELECT id FROM jadwal_distribusi WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    await run('DELETE FROM jadwal_distribusi WHERE id = ?', [req.params.id]);
    res.json({ message: 'Jadwal distribusi berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ============ AUTO-GENERATE JADWAL MINGGUAN ============
app.post('/api/jadwal/generate-weekly',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const { start_date, auto_assign_kurir } = req.body;
    
    // Default: Senin minggu depan
    let startDate = start_date ? new Date(start_date) : new Date();
    // Jika hari ini bukan Senin, cari Senin berikutnya
    const dayOfWeek = startDate.getDay();
    const daysUntilMonday = (8 - dayOfWeek) % 7 || 7;
    startDate.setDate(startDate.getDate() + (start_date ? 0 : daysUntilMonday));
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // Sampai Minggu
    
    // Format dates
    const formatDate = (date) => date.toISOString().split('T')[0];
    const getDayName = (date) => {
      const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
      return days[date.getDay()];
    };
    
    console.log(`📅 Generate jadwal: ${formatDate(startDate)} sampai ${formatDate(endDate)}`);
    
    // Ambil semua relasi dapur_sekolah aktif
    const relations = await all(`
      SELECT ds.*, 
        s.nama as sekolah_nama, s.alamat as sekolah_alamat, 
        d.nama as dapur_nama, d.kecamatan as dapur_kecamatan
      FROM dapur_sekolah ds
      JOIN sekolah s ON ds.sekolah_id = s.id
      JOIN dapur_supplier d ON ds.dapur_id = d.id
      WHERE ds.status = 'aktif'
    `);
    
    if (relations.length === 0) {
      return res.status(400).json({ 
        error: 'Tidak ada relasi dapur-sekolah. Assign sekolah ke dapur terlebih dahulu.' 
      });
    }
    
    // Ambil semua kurir per dapur
    const kurirPerDapur = await all(`
      SELECT dk.*, u.nama as kurir_nama
      FROM dapur_kurir dk
      JOIN users u ON dk.kurir_id = u.id
      WHERE dk.status = 'aktif'
    `);
    
    // Group kurir by dapur_id
    const kurirMap = {};
    kurirPerDapur.forEach(k => {
      if (!kurirMap[k.dapur_id]) kurirMap[k.dapur_id] = [];
      kurirMap[k.dapur_id].push(k);
    });
    
    // Track kurir assignment untuk round-robin
    const kurirIndex = {};
    
    let createdCount = 0;
    let skippedCount = 0;
    const jadwalList = [];
    
    // Loop 7 hari (Senin-Minggu)
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);
      const dateStr = formatDate(currentDate);
      const dayName = getDayName(currentDate);
      
      console.log(`📅 Processing ${dateStr} (${dayName})`);
      
      // Filter relasi yang jadwalnya match dengan hari ini
      const todayRelations = relations.filter(r => {
        try {
          const hariKirim = JSON.parse(r.hari_kirim || '[]');
          return hariKirim.includes(dayName);
        } catch (e) {
          return false;
        }
      });
      
      // Buat jadwal untuk setiap relasi
      for (const rel of todayRelations) {
        // Check if jadwal sudah ada (prevent duplicate)
        const existing = await get(
          'SELECT id FROM jadwal_distribusi WHERE dapur_id = ? AND sekolah_id = ? AND tanggal = ?',
          [rel.dapur_id, rel.sekolah_id, dateStr]
        );
        
        if (existing) {
          skippedCount++;
          continue;
        }
        
        // Pilih kurir (round-robin)
        let kurirId = null;
        if (auto_assign_kurir !== false && kurirMap[rel.dapur_id]) {
          const kurirs = kurirMap[rel.dapur_id];
          if (!kurirIndex[rel.dapur_id]) kurirIndex[rel.dapur_id] = 0;
          
          const kurir = kurirs[kurirIndex[rel.dapur_id] % kurirs.length];
          kurirId = kurir.kurir_id;
          kurirIndex[rel.dapur_id]++;
        }
        
        // Default waktu kirim berdasarkan urutan
        const jamKirim = 7 + Math.floor((createdCount % 10) / 2);
        const menitKirim = (createdCount % 2) * 30;
        const waktuKirim = `${jamKirim.toString().padStart(2, '0')}:${menitKirim.toString().padStart(2, '0')}:00`;
        
        // Create jadwal
        const result = await run(
          `INSERT INTO jadwal_distribusi (dapur_id, sekolah_id, tanggal, waktu_kirim, jumlah_porsi, status, catatan) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            rel.dapur_id,
            rel.sekolah_id,
            dateStr,
            waktuKirim,
            rel.jumlah_porsi,
            'terjadwal',
            `Auto-generated untuk ${dayName}`
          ]
        );
        
        const jadwalId = result.lastID;
        
        // Buat pengiriman dengan status 'terjadwal' (bukan 'dalam_perjalanan')
        // Kurir mulai delivery nanti saat hari-H
        if (kurirId) {
          await run(
            `INSERT INTO pengiriman (jadwal_id, kurir_id, status) VALUES (?, ?, 'terjadwal')`,
            [jadwalId, kurirId]
          );
          // Status jadwal tetap 'terjadwal' bukan 'dalam_pengiriman'
        }
        
        createdCount++;
        jadwalList.push({
          id: jadwalId,
          dapur: rel.dapur_nama,
          sekolah: rel.sekolah_nama,
          tanggal: dateStr,
          hari: dayName,
          waktu: waktuKirim,
          porsi: rel.jumlah_porsi,
          kurir: kurirId ? (kurirPerDapur.find(k => k.kurir_id === kurirId)?.kurir_nama || 'Belum ada') : 'Belum ada',
          status: 'terjadwal'  // Status yang benar
        });
      }
    }
    
    // Summary by day
    const summaryByDay = {};
    jadwalList.forEach(j => {
      if (!summaryByDay[j.hari]) summaryByDay[j.hari] = [];
      summaryByDay[j.hari].push(j);
    });
    
    res.status(201).json({
      message: `Berhasil generate ${createdCount} jadwal untuk seminggu`,
      created: createdCount,
      skipped: skippedCount,
      date_range: `${formatDate(startDate)} sampai ${formatDate(endDate)}`,
      summary: summaryByDay,
      jadwal: jadwalList
    });
    
  } catch (error) {
    console.error('Generate jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat generate jadwal' });
  }
});

// ============ PENGIRIMAN ROUTES ============
app.get('/api/pengiriman',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    const { status, jadwal_id } = req.query;
    let query = `SELECT p.*, jd.tanggal, jd.waktu_kirim, ds.nama as dapur_nama, s.nama as sekolah_nama, s.alamat as sekolah_alamat, s.latitude as sekolah_latitude, s.longitude as sekolah_longitude, u.nama as kurir_nama FROM pengiriman p JOIN jadwal_distribusi jd ON p.jadwal_id = jd.id JOIN dapur_supplier ds ON jd.dapur_id = ds.id JOIN sekolah s ON jd.sekolah_id = s.id LEFT JOIN users u ON p.kurir_id = u.id WHERE 1=1`;
    const params = [];

    // FILTER OTOMATIS UNTUK KURIR - hanya lihat pengiriman mereka sendiri
    if (req.user.role === 'kurir') {
      query += ' AND p.kurir_id = ?';
      params.push(req.user.id);
    }

    if (status) { query += ' AND p.status = ?'; params.push(status); }
    if (jadwal_id) { query += ' AND p.jadwal_id = ?'; params.push(jadwal_id); }
    
    // SORTING CERDAS:
    // - Default (tanpa filter status): "dalam_pengiriman" paling atas, lalu "terjadwal", kemudian status lain
    // - Filter "terjadwal" atau "dalam_pengiriman": urutkan tanggal terdekat (ASC)
    // - Filter lain: urutkan tanggal terbaru (DESC)
    if (status === 'terjadwal' || status === 'dalam_pengiriman') {
      // Filter terjadwal/dalam_pengiriman: urutkan dari tanggal terdekat ke hari ini (ASC)
      query += ' ORDER BY jd.tanggal ASC, jd.waktu_kirim ASC';
    } else if (!status) {
      // Default: "dalam_pengiriman" di atas (priority 0), lalu "terjadwal" (priority 1), status lain
      query += ' ORDER BY CASE p.status WHEN \'dalam_pengiriman\' THEN 0 WHEN \'terjadwal\' THEN 1 WHEN \'diterima\' THEN 2 WHEN \'gagal\' THEN 3 ELSE 4 END, jd.tanggal ASC, jd.waktu_kirim ASC';
    } else {
      // Filter status lain: urutkan tanggal terbaru
      query += ' ORDER BY jd.tanggal DESC, jd.waktu_kirim DESC';
    }

    const pengiriman = await all(query, params);
    res.json(pengiriman);
  } catch (error) {
    console.error('Get pengiriman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.post('/api/pengiriman',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir']),
  async (req, res) => {
  try {
    const { jadwal_id, kurir_id } = req.body;
    
    // Kurir hanya bisa mulai pengiriman untuk diri mereka sendiri
    const finalKurirId = req.user.role === 'kurir' ? req.user.id : (kurir_id || req.user.id);
    
    if (!jadwal_id) {
      return res.status(400).json({ error: 'Jadwal ID wajib diisi' });
    }

    // Check if pengiriman already exists for this jadwal
    const existing = await get('SELECT id FROM pengiriman WHERE jadwal_id = ?', [jadwal_id]);
    if (existing) {
      return res.status(409).json({ error: 'Pengiriman sudah ada untuk jadwal ini' });
    }

    const result = await run(
      `INSERT INTO pengiriman (jadwal_id, kurir_id, status) VALUES (?, ?, 'terjadwal')`,
      [jadwal_id, finalKurirId]
    );
    await run(
      'UPDATE jadwal_distribusi SET status = ? WHERE id = ?',
      ['dalam_pengiriman', jadwal_id]
    );
    res.status(201).json({ message: 'Pengiriman berhasil dimulai', id: result.lastID });
  } catch (error) {
    console.error('Create pengiriman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ============ KURIR LIST ENDPOINT ============
app.get('/api/kurir',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const kurir = await all(
      'SELECT id, nama, email FROM users WHERE role = ?',
      ['kurir']
    );
    res.json(kurir);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.put('/api/pengiriman/:id', 
  authenticateToken, 
  requireRole(['admin_bgn', 'admin_daerah', 'kurir']),
  async (req, res) => {
  try {
    const { latitude, longitude, status, catatan, waktu_berangkat, waktu_tiba } = req.body;
    const existing = await get('SELECT id FROM pengiriman WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Pengiriman tidak ditemukan' });

    // Check if there's an uploaded file
    let bukti_foto = req.body.bukti_foto || null;
    if (req.file) {
      bukti_foto = req.file.filename;
    }

    await run(
      `UPDATE pengiriman SET latitude = ?, longitude = ?, status = ?, bukti_foto = ?, catatan = ?, waktu_berangkat = ?, waktu_tiba = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [latitude || null, longitude || null, status, bukti_foto, catatan || null, waktu_berangkat || null, waktu_tiba || null, req.params.id]
    );

    if (status === 'diterima') {
      const pengiriman = await get('SELECT jadwal_id FROM pengiriman WHERE id = ?', [req.params.id]);
      await run(`UPDATE jadwal_distribusi SET status = 'diterima', waktu_terima = CURRENT_TIMESTAMP WHERE id = ?`, [pengiriman.jadwal_id]);
      
      // Emit socket event for real-time update
      io.emit('pengiriman:update', {
        pengirimanId: req.params.id,
        status: 'diterima',
        bukti_foto,
        timestamp: new Date().toISOString()
      });
    } else {
      // Emit socket event for location/status update
      io.emit('pengiriman:location', {
        pengirimanId: req.params.id,
        latitude,
        longitude,
        status,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ message: 'Pengiriman berhasil diupdate', bukti_foto });
  } catch (error) {
    console.error('Update pengiriman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update pengiriman with file upload
app.put('/api/pengiriman/:id/upload', 
  authenticateToken, 
  requireRole(['admin_bgn', 'admin_daerah', 'kurir']),
  upload.single('bukti_foto'), 
  handleMulterError, 
  async (req, res) => {
  try {
    const existing = await get('SELECT id, jadwal_id FROM pengiriman WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Pengiriman tidak ditemukan' });

    const { status, catatan, waktu_berangkat, waktu_tiba, latitude, longitude } = req.body;
    let bukti_foto = null;

    if (req.file) {
      bukti_foto = req.file.filename;
    }

    await run(
      `UPDATE pengiriman SET latitude = ?, longitude = ?, status = ?, bukti_foto = ?, catatan = ?, waktu_berangkat = ?, waktu_tiba = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [latitude || null, longitude || null, status || 'dalam_perjalanan', bukti_foto, catatan || null, waktu_berangkat || null, waktu_tiba || null, req.params.id]
    );

    if (status === 'diterima') {
      await run(`UPDATE jadwal_distribusi SET status = 'diterima', waktu_terima = CURRENT_TIMESTAMP WHERE id = ?`, [existing.jadwal_id]);
    }

    // Emit socket event
    io.emit('pengiriman:update', {
      pengirimanId: req.params.id,
      status: status || 'dalam_perjalanan',
      bukti_foto,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      message: 'Pengiriman berhasil diupdate dengan foto', 
      bukti_foto 
    });
  } catch (error) {
    console.error('Upload pengiriman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.get('/api/pengiriman/tracking/active',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    let query = `SELECT p.id, p.latitude, p.longitude, p.status, p.kurir_id, u.nama as kurir_nama, jd.tanggal, s.nama as sekolah_nama, s.latitude as sekolah_lat, s.longitude as sekolah_lng FROM pengiriman p JOIN users u ON p.kurir_id = u.id JOIN jadwal_distribusi jd ON p.jadwal_id = jd.id JOIN sekolah s ON jd.sekolah_id = s.id WHERE p.status = 'dalam_perjalanan' AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL`;
    const params = [];

    // FILTER OTOMATIS UNTUK KURIR - hanya lihat tracking mereka sendiri
    if (req.user.role === 'kurir') {
      query += ' AND p.kurir_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY p.updated_at DESC';

    const couriers = await all(query, params);
    res.json(couriers);
  } catch (error) {
    console.error('Get tracking active error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ============ STOK ROUTES ============
app.get('/api/stok', 
  authenticateToken, 
  requireRole(['admin_bgn', 'admin_daerah', 'supplier']),
  async (req, res) => {
  try {
    const { dapur_id, expired_soon } = req.query;
    let query = `SELECT sb.*, ds.nama as dapur_nama FROM stok_bahan sb JOIN dapur_supplier ds ON sb.dapur_id = ds.id WHERE 1=1`;
    const params = [];

    if (dapur_id) { query += ' AND sb.dapur_id = ?'; params.push(dapur_id); }
    if (expired_soon === 'true') { query += " AND sb.expired_date <= date('now', '+3 days')"; }
    query += ' ORDER BY sb.expired_date ASC';

    const stok = await all(query, params);
    res.json(stok);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.post('/api/stok',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'supplier']),
  async (req, res) => {
  try {
    const { dapur_id, nama_bahan, jumlah, satuan, expired_date } = req.body;
    if (!dapur_id || !nama_bahan || jumlah === undefined || !satuan || !expired_date) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    // Validasi ownership: supplier hanya bisa tambah stok untuk dapur mereka sendiri
    if (req.user.role === 'supplier') {
      const dapur = await get('SELECT user_id FROM dapur_supplier WHERE id = ?', [dapur_id]);
      if (!dapur || !dapur.user_id || dapur.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Anda tidak memiliki akses ke dapur ini' });
      }
    }

    const result = await run(`INSERT INTO stok_bahan (dapur_id, nama_bahan, jumlah, satuan, expired_date) VALUES (?, ?, ?, ?, ?)`, [dapur_id, nama_bahan, jumlah, satuan, expired_date]);
    res.status(201).json({ message: 'Stok bahan berhasil ditambahkan', id: result.lastID });
  } catch (error) {
    console.error('Create stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update stok
app.put('/api/stok/:id',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'supplier']),
  async (req, res) => {
  try {
    const { nama_bahan, jumlah, satuan, expired_date } = req.body;

    // Cek stok exists
    const existing = await get('SELECT id, dapur_id FROM stok_bahan WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Stok tidak ditemukan' });
    }

    // Validasi ownership: supplier hanya bisa update stok untuk dapur mereka sendiri
    if (req.user.role === 'supplier') {
      const dapur = await get('SELECT user_id FROM dapur_supplier WHERE id = ?', [existing.dapur_id]);
      if (!dapur || !dapur.user_id || dapur.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Anda tidak memiliki akses untuk update stok ini' });
      }
    }

    await run(`UPDATE stok_bahan SET nama_bahan = ?, jumlah = ?, satuan = ?, expired_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [nama_bahan, jumlah, satuan, expired_date, req.params.id]);
    res.json({ message: 'Stok bahan berhasil diupdate' });
  } catch (error) {
    console.error('Update stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete stok
app.delete('/api/stok/:id',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'supplier']),
  async (req, res) => {
  try {
    // Cek stok exists
    const existing = await get('SELECT id, dapur_id FROM stok_bahan WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Stok tidak ditemukan' });
    }

    // Validasi ownership: supplier hanya bisa hapus stok untuk dapur mereka sendiri
    if (req.user.role === 'supplier') {
      const dapur = await get('SELECT user_id FROM dapur_supplier WHERE id = ?', [existing.dapur_id]);
      if (!dapur || !dapur.user_id || dapur.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Anda tidak memiliki akses untuk hapus stok ini' });
      }
    }

    await run('DELETE FROM stok_bahan WHERE id = ?', [req.params.id]);
    res.json({ message: 'Stok bahan berhasil dihapus' });
  } catch (error) {
    console.error('Delete stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ============ INSIDEN ROUTES ============
app.get('/api/insiden',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    const { tipe, status, sekolah_id } = req.query;
    let query = `SELECT i.*, s.nama as sekolah_nama, ds.nama as dapur_nama FROM insiden i LEFT JOIN sekolah s ON i.sekolah_id = s.id LEFT JOIN dapur_supplier ds ON i.dapur_id = ds.id WHERE 1=1`;
    const params = [];

    // FILTER OTOMATIS UNTUK KURIR - hanya lihat insiden dari dapur mereka
    if (req.user.role === 'kurir') {
      query += ' AND i.dapur_id IN (SELECT dk.dapur_id FROM dapur_kurir dk WHERE dk.kurir_id = ? AND dk.status = \'aktif\')';
      params.push(req.user.id);
    }

    // FILTER OTOMATIS UNTUK SUPPLIER - hanya lihat insiden dari dapur mereka
    if (req.user.role === 'supplier') {
      query += ' AND i.dapur_id IN (SELECT ds2.id FROM dapur_supplier ds2 WHERE ds2.user_id = ?)';
      params.push(req.user.id);
    }

    if (tipe) { query += ' AND i.tipe = ?'; params.push(tipe); }
    if (status) { query += ' AND i.status = ?'; params.push(status); }
    if (sekolah_id) { query += ' AND i.sekolah_id = ?'; params.push(sekolah_id); }
    query += ' ORDER BY i.tanggal DESC';

    const insiden = await all(query, params);
    res.json(insiden);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.post('/api/insiden',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    let { sekolah_id, dapur_id, tipe, deskripsi, latitude, longitude, tanggal } = req.body;
    if (!tipe || !deskripsi || !tanggal) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    // Auto-set dapur_id untuk kurir & supplier
    if (req.user.role === 'kurir') {
      const dapurKurir = await get('SELECT dapur_id FROM dapur_kurir WHERE kurir_id = ? AND status = \'aktif\'', [req.user.id]);
      if (!dapurKurir) {
        return res.status(400).json({ error: 'Kurir belum di-assign ke dapur. Hubungi admin.' });
      }
      dapur_id = dapurKurir.dapur_id;
    }

    if (req.user.role === 'supplier') {
      const dapurSupplier = await get('SELECT id FROM dapur_supplier WHERE user_id = ?', [req.user.id]);
      if (!dapurSupplier) {
        return res.status(400).json({ error: 'Supplier belum memiliki dapur. Hubungi admin.' });
      }
      dapur_id = dapurSupplier.id;
    }

    const result = await run(`INSERT INTO insiden (sekolah_id, dapur_id, tipe, deskripsi, latitude, longitude, tanggal) VALUES (?, ?, ?, ?, ?, ?, ?)`, [sekolah_id || null, dapur_id || null, tipe, deskripsi, latitude || null, longitude || null, tanggal]);
    res.status(201).json({ message: 'Insiden berhasil dilaporkan', id: result.lastID });
  } catch (error) {
    console.error('Create insiden error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.put('/api/insiden/:id',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const { status, deskripsi } = req.body;
    const validStatuses = ['laporan_masuk', 'ditindaklanjuti', 'selesai'];
    
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid. Gunakan: laporan_masuk, ditindaklanjuti, atau selesai' });
    }

    const insiden = await get('SELECT id FROM insiden WHERE id = ?', [req.params.id]);
    if (!insiden) {
      return res.status(404).json({ error: 'Insiden tidak ditemukan' });
    }

    let query = 'UPDATE insiden SET ';
    const params = [];

    if (status) {
      query += 'status = ?';
      params.push(status);
    }

    if (deskripsi !== undefined) {
      query += status ? ', deskripsi = ?' : 'deskripsi = ?';
      params.push(deskripsi);
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    await run(query, params);
    res.json({ message: 'Status insiden berhasil diupdate' });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ============ USER MANAGEMENT ROUTES ============
app.get('/api/users', 
  authenticateToken, 
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const { role, search } = req.query;
    let query = 'SELECT id, nama, email, role, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) { query += ' AND role = ?'; params.push(role); }
    if (search) { query += ' AND (nama LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY created_at DESC';

    const users = await all(query, params);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.post('/api/users', 
  authenticateToken, 
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;
    if (!nama || !email || !password) {
      return res.status(400).json({ error: 'Nama, email, dan password wajib diisi' });
    }

    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email sudah terdaftar' });

    const hashPassword = bcrypt.hashSync(password, 10);
    const result = await run('INSERT INTO users (nama, email, password_hash, role) VALUES (?, ?, ?, ?)', [nama, email, hashPassword, role || 'admin_daerah']);
    res.status(201).json({ message: 'User berhasil didaftarkan', id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.put('/api/users/:id', 
  authenticateToken, 
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    const { nama, email, role, password } = req.body;
    const existing = await get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Check if user is updating their own profile
    const isOwnProfile = parseInt(req.params.id) === req.user.id;
    
    // Only admin_bgn can update other users' roles
    if (!isOwnProfile && req.user.role !== 'admin_bgn') {
      return res.status(403).json({ error: 'Hanya Admin BGN yang bisa mengupdate user lain' });
    }

    if (password) {
      const hashPassword = bcrypt.hashSync(password, 10);
      await run('UPDATE users SET nama = ?, email = ?, role = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [nama, email, role, hashPassword, req.params.id]);
    } else {
      await run('UPDATE users SET nama = ?, email = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [nama, email, role, req.params.id]);
    }
    res.json({ message: 'User berhasil diupdate' });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.delete('/api/users/:id', 
  authenticateToken, 
  requireRole(['admin_bgn']),
  async (req, res) => {
  try {
    if (parseInt(req.params.id) === 1) return res.status(400).json({ error: 'Tidak dapat menghapus user utama' });
    const existing = await get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User tidak ditemukan' });
    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ============ DASHBOARD ROUTES ============
app.get('/api/dashboard/stats', 
  authenticateToken, 
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const totalSekolah = await get('SELECT COUNT(*) as count FROM sekolah WHERE status = ?', ['aktif']);
    const totalDapur = await get('SELECT COUNT(*) as count FROM dapur_supplier WHERE status = ?', ['aktif']);
    const jadwalHariIni = await get('SELECT COUNT(*) as count FROM jadwal_distribusi WHERE tanggal = ?', [today]);
    const jadwalStatus = await get(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'terjadwal' THEN 1 ELSE 0 END) as terjadwal, SUM(CASE WHEN status = 'dalam_pengiriman' THEN 1 ELSE 0 END) as dalam_pengiriman, SUM(CASE WHEN status = 'diterima' THEN 1 ELSE 0 END) as diterima, SUM(CASE WHEN status = 'gagal' THEN 1 ELSE 0 END) as gagal FROM jadwal_distribusi WHERE tanggal = ?`, [today]);
    const pengirimanBulanIni = await get(`SELECT COUNT(*) as count FROM jadwal_distribusi WHERE strftime('%Y-%m', tanggal) = strftime('%Y-%m', 'now')`);
    const insidenBulanIni = await get(`SELECT COUNT(*) as count FROM insiden WHERE strftime('%Y-%m', tanggal) = strftime('%Y-%m', 'now')`);
    const stokExpiredSoon = await get(`SELECT COUNT(*) as count FROM stok_bahan WHERE expired_date <= date('now', '+3 days')`);

    res.json({
      today,
      sekolah: { total_aktif: totalSekolah.count },
      dapur: { total_aktif: totalDapur.count },
      jadwal_hari_ini: {
        total: jadwalHariIni.count,
        terjadwal: jadwalStatus.terjadwal || 0,
        dalam_pengiriman: jadwalStatus.dalam_pengiriman || 0,
        diterima: jadwalStatus.diterima || 0,
        gagal: jadwalStatus.gagal || 0,
      },
      pengiriman_bulan_ini: pengirimanBulanIni.count,
      insiden_bulan_ini: insidenBulanIni.count,
      stok_expired_soon: stokExpiredSoon.count,
    });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.get('/api/dashboard/map-data',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    const sekolah = await all(`SELECT id, nama, alamat, latitude, longitude, kecamatan, jumlah_siswa, status FROM sekolah WHERE status = 'aktif'`);
    const dapur = await all(`SELECT id, nama, alamat, latitude, longitude, kecamatan, kapasitas_harian, status FROM dapur_supplier WHERE status = 'aktif'`);
    const couriers = await all(`SELECT p.id, p.latitude, p.longitude, p.status, p.kurir_id, u.nama as kurir_nama, s.nama as sekolah_nama FROM pengiriman p JOIN users u ON p.kurir_id = u.id JOIN jadwal_distribusi jd ON p.jadwal_id = jd.id JOIN sekolah s ON jd.sekolah_id = s.id WHERE p.status = 'dalam_perjalanan' AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL`);
    const insiden = await all(`SELECT id, sekolah_id, tipe, deskripsi, latitude, longitude, tanggal, status FROM insiden WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND tanggal >= date('now', '-30 days') ORDER BY tanggal DESC`);

    res.json({ sekolah, dapur, couriers, insiden });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ============ SUPPLIER DASHBOARD ROUTES ============
app.get('/api/dashboard/supplier-stats',
  authenticateToken,
  requireRole(['supplier']),
  async (req, res) => {
  try {
    // Get supplier's dapur
    const dapur = await get('SELECT id, nama, kapasitas_harian FROM dapur_supplier WHERE user_id = ?', [req.user.id]);
    if (!dapur) {
      return res.status(404).json({ error: 'Dapur tidak ditemukan' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Jadwal hari ini untuk dapur ini
    const jadwalHariIni = await get(
      'SELECT COUNT(*) as count FROM jadwal_distribusi WHERE tanggal = ? AND dapur_id = ?',
      [today, dapur.id]
    );

    // Jadwal status hari ini
    const jadwalStatus = await get(
      `SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'terjadwal' THEN 1 ELSE 0 END) as terjadwal,
        SUM(CASE WHEN status = 'dalam_pengiriman' THEN 1 ELSE 0 END) as dalam_pengiriman,
        SUM(CASE WHEN status = 'diterima' THEN 1 ELSE 0 END) as diterima,
        SUM(CASE WHEN status = 'gagal' THEN 1 ELSE 0 END) as gagal
       FROM jadwal_distribusi WHERE tanggal = ? AND dapur_id = ?`,
      [today, dapur.id]
    );

    // Pengiriman bulan ini
    const pengirimanBulanIni = await get(
      `SELECT COUNT(*) as count FROM jadwal_distribusi WHERE strftime('%Y-%m', tanggal) = strftime('%Y-%m', 'now') AND dapur_id = ?`,
      [dapur.id]
    );

    // Insiden bulan ini untuk dapur ini
    const insidenBulanIni = await get(
      `SELECT COUNT(*) as count FROM insiden WHERE strftime('%Y-%m', tanggal) = strftime('%Y-%m', 'now') AND dapur_id = ?`,
      [dapur.id]
    );

    // Stok hampir expired
    const stokHampirExpired = await get(
      `SELECT COUNT(*) as count FROM stok_bahan WHERE expired_date <= date('now', '+3 days') AND dapur_id = ?`,
      [dapur.id]
    );

    // Sekolah binaan
    const sekolahBinaan = await get(
      `SELECT COUNT(*) as count FROM dapur_sekolah WHERE dapur_id = ? AND status = 'aktif'`,
      [dapur.id]
    );

    res.json({
      dapur: { id: dapur.id, nama: dapur.nama, kapasitas_harian: dapur.kapasitas_harian },
      jadwal_hari_ini: {
        total: jadwalHariIni.count,
        terjadwal: jadwalStatus.terjadwal || 0,
        dalam_pengiriman: jadwalStatus.dalam_pengiriman || 0,
        diterima: jadwalStatus.diterima || 0,
        gagal: jadwalStatus.gagal || 0,
      },
      pengiriman_bulan_ini: pengirimanBulanIni.count,
      insiden_bulan_ini: insidenBulanIni.count,
      stok_hampir_expired: stokHampirExpired.count,
      sekolah_binaan: sekolahBinaan.count,
    });
  } catch (error) {
    console.error('Supplier dashboard stats error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ============ DAPUR-KURIR ROUTES ============
// Get all kurir assigned to a dapur
app.get('/api/dapur-kurir',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    const { dapur_id, status } = req.query;
    let query = `SELECT dk.*, u.nama as kurir_nama, u.email as kurir_email, ds.nama as dapur_nama FROM dapur_kurir dk JOIN users u ON dk.kurir_id = u.id JOIN dapur_supplier ds ON dk.dapur_id = ds.id WHERE 1=1`;
    const params = [];

    if (dapur_id) { query += ' AND dk.dapur_id = ?'; params.push(dapur_id); }
    if (status) { query += ' AND dk.status = ?'; params.push(status); }
    query += ' ORDER BY dk.tanggal_mulai DESC';

    const relations = await all(query, params);
    res.json(relations);
  } catch (error) {
    console.error('Get dapur-kurir error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Assign kurir to dapur
app.post('/api/dapur-kurir',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const { dapur_id, kurir_id, tanggal_mulai } = req.body;
    if (!dapur_id || !kurir_id) {
      return res.status(400).json({ error: 'Dapur ID dan Kurir ID wajib diisi' });
    }

    // Check if relation already exists
    const existing = await get('SELECT id FROM dapur_kurir WHERE dapur_id = ? AND kurir_id = ?', [dapur_id, kurir_id]);
    if (existing) {
      return res.status(409).json({ error: 'Kurir sudah ditugaskan ke dapur ini' });
    }

    const result = await run(
      'INSERT INTO dapur_kurir (dapur_id, kurir_id, tanggal_mulai, status) VALUES (?, ?, ?, "aktif")',
      [dapur_id, kurir_id, tanggal_mulai || new Date().toISOString().split('T')[0]]
    );
    res.status(201).json({ message: 'Kurir berhasil ditugaskan ke dapur', id: result.lastID });
  } catch (error) {
    console.error('Create dapur-kurir error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update dapur-kurir relation
app.put('/api/dapur-kurir/:id',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const { tanggal_mulai, tanggal_selesai, status } = req.body;
    const existing = await get('SELECT id FROM dapur_kurir WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Relasi tidak ditemukan' });

    await run(
      'UPDATE dapur_kurir SET tanggal_mulai = ?, tanggal_selesai = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [tanggal_mulai, tanggal_selesai, status, req.params.id]
    );
    res.json({ message: 'Relasi berhasil diupdate' });
  } catch (error) {
    console.error('Update dapur-kurir error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete dapur-kurir relation
app.delete('/api/dapur-kurir/:id',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const existing = await get('SELECT id FROM dapur_kurir WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Relasi tidak ditemukan' });
    await run('DELETE FROM dapur_kurir WHERE id = ?', [req.params.id]);
    res.json({ message: 'Penugasan kurir berhasil dihapus' });
  } catch (error) {
    console.error('Delete dapur-kurir error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ============ DAPUR-SEKOLAH ROUTES ============
// Get all sekolah assigned to a dapur
app.get('/api/dapur-sekolah',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    const { dapur_id, sekolah_id, status } = req.query;
    let query = `SELECT ds.*, s.nama as sekolah_nama, s.alamat as sekolah_alamat, s.kecamatan as sekolah_kecamatan, dsr.nama as dapur_nama FROM dapur_sekolah ds JOIN sekolah s ON ds.sekolah_id = s.id JOIN dapur_supplier dsr ON ds.dapur_id = dsr.id WHERE 1=1`;
    const params = [];

    if (dapur_id) { query += ' AND ds.dapur_id = ?'; params.push(dapur_id); }
    if (sekolah_id) { query += ' AND ds.sekolah_id = ?'; params.push(sekolah_id); }
    if (status) { query += ' AND ds.status = ?'; params.push(status); }
    query += ' ORDER BY s.nama ASC';

    const relations = await all(query, params);
    res.json(relations);
  } catch (error) {
    console.error('Get dapur-sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Assign sekolah to dapur
app.post('/api/dapur-sekolah',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const { dapur_id, sekolah_id, hari_kirim, jumlah_porsi } = req.body;
    if (!dapur_id || !sekolah_id) {
      return res.status(400).json({ error: 'Dapur ID dan Sekolah ID wajib diisi' });
    }

    // Check if relation already exists
    const existing = await get('SELECT id FROM dapur_sekolah WHERE dapur_id = ? AND sekolah_id = ?', [dapur_id, sekolah_id]);
    if (existing) {
      return res.status(409).json({ error: 'Sekolah sudah ditugaskan ke dapur ini' });
    }

    const result = await run(
      'INSERT INTO dapur_sekolah (dapur_id, sekolah_id, hari_kirim, jumlah_porsi, status) VALUES (?, ?, ?, ?, "aktif")',
      [dapur_id, sekolah_id, hari_kirim || JSON.stringify(['senin', 'selasa', 'rabu', 'kamis', 'jumat']), jumlah_porsi || 200]
    );
    res.status(201).json({ message: 'Sekolah berhasil ditugaskan ke dapur', id: result.lastID });
  } catch (error) {
    console.error('Create dapur-sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update dapur-sekolah relation
app.put('/api/dapur-sekolah/:id',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const { hari_kirim, jumlah_porsi, status } = req.body;
    const existing = await get('SELECT id FROM dapur_sekolah WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Relasi tidak ditemukan' });

    await run(
      'UPDATE dapur_sekolah SET hari_kirim = ?, jumlah_porsi = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hari_kirim, jumlah_porsi, status, req.params.id]
    );
    res.json({ message: 'Relasi berhasil diupdate' });
  } catch (error) {
    console.error('Update dapur-sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete dapur-sekolah relation
app.delete('/api/dapur-sekolah/:id',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah']),
  async (req, res) => {
  try {
    const existing = await get('SELECT id FROM dapur_sekolah WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Relasi tidak ditemukan' });
    await run('DELETE FROM dapur_sekolah WHERE id = ?', [req.params.id]);
    res.json({ message: 'Penugasan sekolah berhasil dihapus' });
  } catch (error) {
    console.error('Delete dapur-sekolah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get kurir available for a specific dapur
app.get('/api/dapur/:id/kurir',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    const kurirs = await all(`
      SELECT u.id, u.nama, u.email, dk.tanggal_mulai, dk.status
      FROM dapur_kurir dk
      JOIN users u ON dk.kurir_id = u.id
      WHERE dk.dapur_id = ? AND dk.status = 'aktif'
      ORDER BY u.nama ASC
    `, [req.params.id]);
    res.json(kurirs);
  } catch (error) {
    console.error('Get dapur kurirs error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get sekolah served by a specific dapur
app.get('/api/dapur/:id/sekolah',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']),
  async (req, res) => {
  try {
    const schools = await all(`
      SELECT s.id, s.nama, s.alamat, s.kecamatan, s.jumlah_siswa, ds.hari_kirim, ds.jumlah_porsi, ds.status
      FROM dapur_sekolah ds
      JOIN sekolah s ON ds.sekolah_id = s.id
      WHERE ds.dapur_id = ? AND ds.status = 'aktif'
      ORDER BY s.nama ASC
    `, [req.params.id]);
    res.json(schools);
  } catch (error) {
    console.error('Get dapur schools error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ============ DASHBOARD ROUTES (UPDATED WITH RELATIONS) ============
app.get('/api/dashboard/dapur-stats',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'supplier']),
  async (req, res) => {
  try {
    const dapurs = await all(`
      SELECT ds.*, 
        (SELECT COUNT(*) FROM dapur_kurir dk WHERE dk.dapur_id = ds.id AND dk.status = 'aktif') as kurir_aktif,
        (SELECT COUNT(*) FROM dapur_sekolah dsk WHERE dsk.dapur_id = ds.id AND dsk.status = 'aktif') as sekolah_aktif,
        (SELECT SUM(dsk.jumlah_porsi) FROM dapur_sekolah dsk WHERE dsk.dapur_id = ds.id AND dsk.status = 'aktif') as total_porsi
      FROM dapur_supplier ds
      WHERE 1=1
    `);
    res.json(dapurs);
  } catch (error) {
    console.error('Dashboard dapur stats error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MBG Distribution API is running' });
});

// Socket.io for real-time tracking
io.on('connection', (socket) => {
  console.log('📡 Client connected:', socket.id);

  // Courier sends location updates
  socket.on('courier-location', (data) => {
    // data: { pengirimanId, kurirId, latitude, longitude, status, sekolahNama }
    io.emit('courier-update', { ...data, timestamp: new Date().toISOString() });
  });

  // Courier status change (e.g., delivered)
  socket.on('courier-status', (data) => {
    // data: { pengirimanId, status, catatan, timestamp }
    io.emit('courier-status-update', { ...data, timestamp: new Date().toISOString() });
  });

  // Join courier to tracking room
  socket.on('join-tracking', () => {
    socket.join('tracking-room');
    console.log(`Client ${socket.id} joined tracking-room`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// ============ LIVE TRACKING ENDPOINT ============
app.put('/api/pengiriman/:id/location',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'kurir']),
  async (req, res) => {
  try {
    const { latitude, longitude, status, catatan } = req.body;
    const existing = await get('SELECT jadwal_id FROM pengiriman WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Pengiriman tidak ditemukan' });

    await run(
      `UPDATE pengiriman SET latitude = ?, longitude = ?, status = ?, catatan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [latitude, longitude, status || 'dalam_perjalanan', catatan || null, req.params.id]
    );

    // Get delivery details for socket broadcast
    const pengiriman = await get(`
      SELECT p.id, p.latitude, p.longitude, p.status, p.kurir_id, p.catatan,
             u.nama as kurir_nama, s.nama as sekolah_nama, s.latitude as sekolah_lat, s.longitude as sekolah_lng
      FROM pengiriman p
      JOIN users u ON p.kurir_id = u.id
      JOIN jadwal_distribusi jd ON p.jadwal_id = jd.id
      JOIN sekolah s ON jd.sekolah_id = s.id
      WHERE p.id = ?
    `, [req.params.id]);

    // Emit real-time location update
    io.emit('courier-update', {
      pengirimanId: req.params.id,
      kurirId: pengiriman.kurir_id,
      kurirNama: pengiriman.kurir_nama,
      sekolahNama: pengiriman.sekolah_nama,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      status: status || 'dalam_perjalanan',
      catatan: catatan || null,
      sekolahLat: pengiriman.sekolah_lat,
      schoolLng: pengiriman.sekolah_lng,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Lokasi kurir berhasil diupdate' });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for real-time tracking`);
});
