# 📋 Analisis Kelemahan Aplikasi MBG Distribution System

> **Tanggal Analisis:** 14 April 2026  
> **Total Item:** 15  
> **Fixed:** 3/15 (20%)  
> **Pending:** 12/15 (80%)  

---

## 📊 Ringkasan Status

| Kategori | Fixed | Pending | Completion |
|----------|-------|---------|------------|
| **KRITIS** (High) | 1/4 | 3 | 25% |
| **PENTING** (Medium) | 1/5 | 4 | 20% |
| **REKOMENDASI** (Low) | 1/6 | 5 | 17% |
| **TOTAL** | **3/15** | **12** | **20%** |

---

## ✅ SUDAH DIPERBAIKI (3/15)

### 1. ✅ Relasi User Supplier ↔ Data Dapur
- **Status:** FIXED
- **Bukti:** `dapur_supplier` memiliki kolom `user_id` dengan foreign key ke `users(id)`
- **Implementasi:**
  - Index `idx_dapur_user` sudah ada
  - Backend filtering: `WHERE ds.user_id = ?`
  - Ownership validation di UPDATE endpoint
  - Role-based access control untuk supplier

### 2. ✅ Environment Variables Terkonfigurasi
- **Status:** FIXED
- **Bukti:**
  - `backend/.env` → PORT, JWT_SECRET, NODE_ENV
  - `frontend/.env.local` → NEXT_PUBLIC_API_URL
- **Catatan:** JWT_SECRET masih lemah untuk production

### 3. ✅ Pencarian di Backend
- **Status:** FIXED
- **Bukti:** Server-side search dengan parameterized LIKE query
- **Endpoint yang sudah ada search:**
  - `/api/sekolah` → `nama LIKE ? OR alamat LIKE ?`
  - `/api/dapur` → `nama LIKE ? OR alamat LIKE ?`
  - `/api/users` → `nama LIKE ? OR email LIKE ?`

---

## ❌ BELUM DIPERBAIKI (12/15)

### 🔴 KRITIS (High Priority)

#### 2. ❌ Tidak Ada Endpoint Delete Insiden
- **Status:** PENDING
- **Masalah:**
  - Hanya ada GET, POST, PUT untuk insiden
  - Tidak ada `DELETE /api/insiden/:id`
  - Insiden yang sudah selesai tidak bisa diarsipkan/dihapus
- **File Terkait:** `backend/server.js`, `backend/routes/insiden.js`
- **Estimasi:** 30 menit
- **Solusi:**
  ```javascript
  // Tambah endpoint
  app.delete('/api/insiden/:id',
    authenticateToken,
    requireRole(['admin_bgn', 'admin_daerah']),
    async (req, res) => {
      // Cek exists
      // Delete
      // Response
    }
  );
  ```

#### 3. ❌ Tidak Ada Validasi Data di Backend
- **Status:** PENDING
- **Masalah:**
  - Hanya cek `if (!field)` — validasi minimal
  - Tidak ada schema validation (Joi/Zod/express-validator)
  - Tidak ada type validation, length validation, format validation
  - Hanya mengandalkan parameterized query untuk SQL injection
- **File Terkait:** Semua route di `backend/server.js`
- **Estimasi:** 4-6 jam
- **Solusi:**
  - Install `express-validator` atau `zod`
  - Buat validation middleware untuk setiap endpoint
  - Contoh:
    ```javascript
    const { body, validationResult } = require('express-validator');

    app.post('/api/sekolah',
      [
        body('nama').notEmpty().trim().isLength({ min: 3, max: 100 }),
        body('alamat').notEmpty().trim(),
        body('latitude').isFloat({ min: -90, max: 90 }),
        body('longitude').isFloat({ min: -180, max: 180 }),
      ],
      async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        // ...
      }
    );
    ```

#### 4. ❌ Password Policy Lemah
- **Status:** PENDING
- **Masalah:**
  - Tidak ada minimum length check
  - Tidak ada complexity requirements (huruf besar, angka, special char)
  - Default password sederhana (`admin123`, `kurir123`, dll)
  - Registration endpoint hanya cek `if (!password)`
- **File Terkait:** `backend/server.js` (line ~123-142)
- **Estimasi:** 1 jam
- **Solusi:**
  ```javascript
  const validatePassword = (password) => {
    if (password.length < 8) return 'Password minimal 8 karakter';
    if (!/[A-Z]/.test(password)) return 'Password harus mengandung huruf besar';
    if (!/[0-9]/.test(password)) return 'Password harus mengandung angka';
    if (!/[!@#$%^&*]/.test(password)) return 'Password harus mengandung karakter khusus';
    return null;
  };

  // Di register endpoint
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }
  ```

---

### 🟡 PENTING (Medium Priority)

#### 5. ❌ Tidak Ada Pagination
- **Status:** PENDING
- **Masalah:**
  - Semua data di-load sekaligus (`SELECT * FROM sekolah`)
  - Tidak ada LIMIT/OFFSET
  - Tidak ada query parameter `page`, `limit`, `perPage`
  - Jika data ribuan, aplikasi akan lambat/crash
- **File Terkait:** Semua GET endpoint di `backend/server.js`
- **Estimasi:** 6-8 jam
- **Solusi:**
  ```javascript
  // Backend
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const query = `SELECT * FROM sekolah LIMIT ? OFFSET ?`;
  const data = await all(query, [limit, offset]);

  const total = await get('SELECT COUNT(*) as count FROM sekolah');
  res.json({
    data,
    pagination: {
      page,
      limit,
      total: total.count,
      totalPages: Math.ceil(total.count / limit),
    }
  });

  // Frontend: Tambah pagination component
  ```

#### 6. ❌ Tidak Ada Soft Delete
- **Status:** PENDING
- **Masalah:**
  - Data yang dihapus hilang permanen
  - Tidak ada audit trail
  - Tidak bisa restore data yang terhapus salah
  - Semua DELETE adalah hard delete (`DELETE FROM table WHERE id = ?`)
- **File Terkait:** Semua DELETE endpoint, `backend/database.js`
- **Estimasi:** 4-6 jam
- **Solusi:**
  ```sql
  -- Migration
  ALTER TABLE sekolah ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
  ALTER TABLE dapur_supplier ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
  -- ... untuk semua tabel utama

  -- Ubah semua DELETE jadi UPDATE
  UPDATE sekolah SET is_deleted = TRUE WHERE id = ?;

  -- Ubah semua SELECT
  SELECT * FROM sekolah WHERE is_deleted = FALSE;
  ```

#### 7. ❌ Tidak Ada Logging/Audit Trail
- **Status:** PENDING
- **Masalah:**
  - Tidak ada `audit_log` table
  - Tidak ada user action tracking
  - Sulit troubleshoot masalah
  - Tidak tahu siapa ngapain kapan
- **File Terkait:** `backend/database.js`, semua route
- **Estimasi:** 6-8 jam
- **Solusi:**
  ```sql
  CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,         -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
    entity TEXT,         -- 'sekolah', 'dapur', 'insiden', 'user'
    entity_id INTEGER,
    details TEXT,        -- JSON detail perubahan
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_audit_user ON audit_log(user_id);
  CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);
  CREATE INDEX idx_audit_date ON audit_log(created_at);
  ```

  ```javascript
  // Middleware audit
  const auditLog = async (req, action, entity, entityId, details) => {
    await run(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user?.id, action, entity, entityId, JSON.stringify(details), req.ip]
    );
  };

  // Usage di setiap route
  await auditLog(req, 'CREATE', 'sekolah', result.lastID, { nama: 'SDN 1' });
  ```

#### 8. ✅ Environment Variables (FIXED — Lihat di atas)

#### 9. ❌ Tidak Ada Error Boundary di Frontend
- **Status:** PENDING
- **Masalah:**
  - Tidak ada React Error Boundary component
  - Error React tidak di-handle dengan baik
  - User dapat layar putih tanpa penjelasan
  - Tidak ada fallback UI saat crash
- **File Terkait:** `frontend/` root
- **Estimasi:** 2-3 jam
- **Solusi:**
  ```tsx
  // frontend/components/ErrorBoundary.tsx
  class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    render() {
      if (this.state.hasError) {
        return (
          <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-red-600">Terjadi Kesalahan</h2>
            <p className="text-zinc-600 mt-2">{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()} className="btn-primary mt-4">
              Refresh Halaman
            </button>
          </div>
        );
      }
      return this.props.children;
    }
  }

  // Wrap di app/layout.tsx
  <ErrorBoundary>
    <AuthProvider>
      {children}
    </AuthProvider>
  </ErrorBoundary>
  ```

---

### 🟢 REKOMENDASI (Low Priority)

#### 10. ❌ Duplicate Code di Setiap Halaman
- **Status:** PENDING
- **Masalah:**
  - Setiap halaman punya pattern auth check yang sama
  - Duplicate `useState`, `useEffect`, `fetchData` pattern
  - Tidak ada reusable hook untuk auth check
  - Boilerplate code berlebihan
- **File Terkait:** Semua halaman di `frontend/app/dashboard/`
- **Estimasi:** 4-6 jam
- **Solusi:**
  ```tsx
  // frontend/hooks/useAuthCheck.ts
  export function useAuthCheck(allowedRoles?: string[]) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (isLoading) return;
      if (!user) { router.push('/login'); return; }
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.push('/dashboard');
      }
    }, [user, isLoading, allowedRoles]);

    return { user, isLoading, isAuthenticated: !!user };
  }

  // Usage
  export default function SekolahPage() {
    const { user, isLoading } = useAuthCheck(['admin_bgn', 'admin_daerah']);
    // ...
  }
  ```

#### 11. ❌ Tidak Ada Loading State untuk Navigasi
- **Status:** PENDING
- **Masalah:**
  - Klik menu → tidak ada feedback
  - User klik berkali-kali karena tidak ada indikator loading
  - Bisa double-submit form
  - Tidak ada `loading.tsx` di Next.js app directory
- **File Terkait:** `frontend/app/`, `frontend/components/`
- **Estimasi:** 3-4 jam
- **Solusi:**
  ```tsx
  // frontend/app/loading.tsx (Next.js 13+ feature)
  export default function Loading() {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-zinc-500">Memuat halaman...</p>
        </div>
      </div>
    );
  }

  // Disable buttons saat loading
  <button disabled={loading} className="btn-primary">
    {loading ? 'Memproses...' : 'Simpan'}
  </button>
  ```

#### 12. ❌ Tidak Ada Toast/Notifikasi User-Friendly
- **Status:** PENDING
- **Masalah:**
  - Menggunakan `alert()` native browser
  - Tidak menarik UX-nya
  - Tidak ada success/error notification yang elegan
  - User harus klik OK untuk lanjut
- **File Terkait:** Semua halaman (puluhan `alert()` calls)
- **Estimasi:** 4-6 jam
- **Solusi:**
  ```bash
  npm install react-hot-toast
  ```

  ```tsx
  // frontend/components/ToastProvider.tsx
  import { Toaster } from 'react-hot-toast';

  export default function ToastProvider({ children }) {
    return (
      <>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            success: { duration: 3000, icon: '✅' },
            error: { duration: 5000, icon: '❌' },
          }}
        />
      </>
    );
  }

  // Usage (ganti semua alert())
  import toast from 'react-hot-toast';

  toast.success('Data berhasil disimpan');
  toast.error('Gagal menyimpan data');
  ```

#### 13. ❌ Tidak Ada Export Data
- **Status:** PENDING
- **Masalah:**
  - Tidak bisa export laporan ke PDF/Excel
  - Data harus dicopy manual
  - Tidak ada tombol export di halaman manapun
- **File Terkait:** Semua halaman tabel
- **Estimasi:** 8-12 jam
- **Solusi:**
  ```bash
  npm install exceljs
  npm install jspdf jspdf-autotable
  ```

  ```javascript
  // Backend: Export Excel
  app.get('/api/export/sekolah', async (req, res) => {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sekolah');

    worksheet.columns = [
      { header: 'Nama', key: 'nama' },
      { header: 'Alamat', key: 'alamat' },
      // ...
    ];

    const sekolah = await all('SELECT * FROM sekolah');
    sekolah.forEach(s => worksheet.addRow(s));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sekolah.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  });
  ```

#### 14. ❌ Tidak Ada Chart/Visualisasi Data
- **Status:** PENDING
- **Masalah:**
  - Dashboard hanya angka mentah
  - Tidak ada grafik tren, pie chart, bar chart
  - Tidak ada visualisasi data yang informatif
  - Icon `BarChart3` hanya untuk menu, bukan chart sungguhan
- **File Terkait:** `frontend/app/dashboard/page.tsx`
- **Estimasi:** 6-8 jam
- **Solusi:**
  ```bash
  npm install recharts
  ```

  ```tsx
  // frontend/components/DashboardCharts.tsx
  import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  export default function DashboardCharts({ stats }) {
    const pieData = [
      { name: 'Diterima', value: stats.diterima },
      { name: 'Dalam Pengiriman', value: stats.dalam_pengiriman },
      { name: 'Gagal', value: stats.gagal },
    ];

    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-4">Status Pengiriman</h3>
          <PieChart width={300} height={300}>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
              {pieData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
          </PieChart>
        </div>
      </div>
    );
  }
  ```

#### 15. ✅ Pencarian Backend (FIXED — Lihat di atas)

---

## 🎯 Rekomendasi Prioritas Perbaikan

### **Segera (High Impact, Low Effort)**
1. ✅ **Delete Insiden** — 30 menit, 1 endpoint baru
2. ✅ **Password Policy** — 1 jam, tambah validasi sederhana
3. ✅ **Toast Notifikasi** — 4 jam, ganti semua `alert()`

### **Menengah (Good UX & Security)**
4. ✅ **Backend Validation** — 6 jam, pakai express-validator
5. ✅ **Loading State** — 3 jam, global loading indicator
6. ✅ **Error Boundary** — 2 jam, React Error Boundary

### **Nanti (Nice to Have, High Effort)**
7. ✅ **Pagination** — 8 jam, perlu update semua endpoint
8. ✅ **Soft Delete** — 6 jam, migration + update semua query
9. ✅ **Audit Trail** — 8 jam, table + middleware + logging
10. ✅ **Export Data** — 12 jam, exceljs + jspdf
11. ✅ **Chart/Visualisasi** — 8 jam, recharts + design
12. ✅ **Duplicate Code** — 6 jam, refactor hooks

---

## 📈 Target Completion

| Milestone | Items | Target |
|-----------|-------|--------|
| **Quick Wins** | 1, 2, 3 | 1-2 hari |
| **Security & UX** | 4, 5, 6 | 3-5 hari |
| **Data Management** | 7, 8, 9 | 1-2 minggu |
| **Advanced Features** | 10, 11, 12 | 2-3 minggu |

**Estimasi Total:** 50-70 jam development

---

**© 2026 - MBG Distribution System - Weakness Analysis & Progress Tracking**
