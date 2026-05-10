# ⚙️ PENGATURAN APLIKASI & PROFIL USER - DOKUMENTASI

Dukumentasi ini mencakup fitur baru yang ditambahkan pada **10 Mei 2026**: Fitur Pengaturan Aplikasi (Branding) dan Profil User (Avatar & No. Telp).

---

## 1. Pengaturan Aplikasi (Settings)
Fitur ini memungkinkan Super Admin (`admin_bgn`) untuk mengubah identitas aplikasi tanpa menyentuh kode program.

### Konfigurasi yang Tersedia:
- **Nama Aplikasi**: Judul yang muncul di sidebar dan tab browser.
- **Nama Instansi**: Nama organisasi penanggung jawab (muncul di footer sidebar).
- **URL Logo Aplikasi**: Link gambar untuk logo di sidebar (disarankan direct link atau hosting eksternal).
- **Teks Hak Cipta**: Teks copyright di bagian bawah aplikasi.
- **Konfigurasi Peta**: Titik pusat (Latitude/Longitude) dan Zoom Level default untuk seluruh peta di aplikasi.

### Arsitektur:
- **Backend**: Tabel `settings` (Key-Value pair) di Postgres/SQLite.
- **Frontend**: `SettingsContext` menyediakan data pengaturan secara global ke seluruh komponen.
- **API**: 
  - `GET /api/settings` (Public)
  - `PUT /api/settings` (Admin Only)

---

## 2. Profil User & Avatar
Peningkatan sistem identitas user untuk mendukung komunikasi dan visualisasi yang lebih baik.

### Fitur Baru:
- **Avatar/Foto Profil**: Mendukung URL foto profil yang ditampilkan di tabel user dan sidebar.
- **Nomor Telepon**: Penyimpanan nomor WhatsApp/Telp untuk memudahkan koordinasi dengan Kurir dan Supplier.
- **Self-Update**: Semua role user kini dapat mengupdate profil mereka sendiri (Nama, Email, No. Telp, Avatar) melalui API.

---

## 🛠️ INSTRUKSI DATABASE (UPDATE MEI 2026)

Jika Anda melakukan deployment baru atau database dalam keadaan kosong, jalankan perintah berikut di Vercel Postgres Console (Mode Read-Only: **OFF**):

### Langkah 1: Buat Tabel Settings
```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Langkah 2: Migrasi Tabel Users
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS no_telp TEXT;
```

### Langkah 3: Data Default Settings
```sql
INSERT INTO settings (key, value) VALUES 
('app_name', 'MBG Admin'),
('org_name', 'Pemerintah Kabupaten Banjarnegara'),
('app_copyright', '© 2024 MBG Banjarnegara'),
('map_center_lat', '-7.3995'),
('map_center_lng', '109.6926'),
('map_zoom', '11')
ON CONFLICT (key) DO NOTHING;
```

---

## 📂 FILE TERKAIT (NEW)

- `backend/migration-settings.js`: Script migrasi tabel pengaturan.
- `backend/migration-users-profile.js`: Script migrasi kolom avatar/telp.
- `backend/routes/settings.js`: API endpoint pengaturan.
- `frontend/context/SettingsContext.tsx`: State management global untuk pengaturan.
- `frontend/app/dashboard/settings/page.tsx`: UI Halaman Pengaturan.

---
*Dibuat pada: 10 Mei 2026*
