# 📦 HANDOVER DOKUMENTASI - MBG Distribution System

> **Tanggal:** 24 April 2026 (UPDATED)
> **Status:** Production Ready (Cloud-Native + CORS Fixed + Postgres Optimized)
> **Fokus:** Kabupaten Banjarnegara, Jawa Tengah
> **Latest Update:** ✅ Vercel Serverless Architecture + ✅ CORS Gold Standard + ✅ Bcryptjs Migration + ✅ Postgres Type Casting Fix + ✅ Self-Healing Seed

---

## 📋 RINGKASAN SINGKAT (UPDATE 24 APRIL 2026)

Aplikasi ini telah sepenuhnya dimigrasi ke arsitektur **Cloud-Native** di Vercel. Masalah kritis terkait **CORS**, **Crash Native Binary (bcrypt)**, dan **Inkonsistensi Tipe Data Postgres** telah diselesaikan secara permanen. Sistem sekarang berjalan stabil di `https://aplikasi-mbg-theta.vercel.app` (Frontend) dan `https://aplikasi-mbg-api.vercel.app` (Backend).

---

## 🆕 PERBAIKAN KRITIS TERBARU (Update 24 April 2026)

### ✅ **Vercel Serverless Architecture (`api/index.js`)**
- Struktur backend diubah dari server monolitik (`server.js`) menjadi **Serverless Functions** (`api/index.js`).
- Menjamin skalabilitas otomatis dan kompatibilitas penuh dengan sistem routing Vercel.

### ✅ **CORS Gold Standard (Dua Lapis)**
- **Lapis 1 (Infrastruktur):** Dikonfigurasi di `vercel.json` untuk menangani request `OPTIONS` (preflight) sebelum menyentuh kode aplikasi.
- **Lapis 2 (Aplikasi):** Menggunakan middleware `cors` yang ketat untuk mengizinkan domain `https://aplikasi-mbg-theta.vercel.app` dengan `credentials: true`.
- **Hasil:** Masalah "Blocked by CORS" yang terjadi selama berhari-hari telah teratasi secara permanen.

### ✅ **Bcryptjs Migration (Fix Binary Crash)**
- Mengganti `bcrypt` (native) dengan `bcryptjs` (pure JavaScript).
- **Solusi:** Menghilangkan error `invalid ELF header` yang terjadi karena perbedaan sistem operasi antara Windows (dev) dan Linux (Vercel).

### ✅ **Postgres Type Casting Fix (Error 42P18)**
- Memperbarui `database.js` untuk secara otomatis menambahkan casting `::text` pada parameterized queries.
- **Solusi:** Memperbaiki error `could not determine data type of parameter $1` yang sering muncul pada Vercel Postgres.

### ✅ **Self-Healing Database (`/api/seed`)**
- Menambahkan endpoint darurat `GET /api/seed`.
- **Fungsi:** Secara otomatis membuat tabel `users` dan akun admin pertama jika database Postgres dalam keadaan kosong.

---

## 🆕 FITUR BARU SEBELUMNYA (14 April 2026)

### ✅ **Role-Based Dashboards (3 Dashboard Terpisah)**
- **Admin Dashboard** (`/dashboard`) → Monitoring keseluruhan & live tracking.
- **Kurir Dashboard** (`/dashboard/kurir`) → Tugas pengiriman & GPS control.
- **Supplier Dashboard** (`/dashboard/supplier`) → Jadwal hari ini & stok alert.

### ✅ **Smart Sorting & Filter**
- Prioritas status `dalam_pengiriman` di urutan paling atas.
- Sorting cerdas berdasarkan tanggal terdekat untuk status terjadwal.

### ✅ **Emoji → Icon Replacement**
- Migrasi total dari emoji teks ke **Lucide React Icons** untuk tampilan profesional.

---

## 🏗️ STRUKTUR PROJECT (UPDATED)

```
aplikasimbg/
├── backend/                          # Backend Serverless Function
│   ├── api/
│   │   └── index.js                  # ✅ New Entry Point (Serverless)
│   ├── vercel.json                   # ✅ Infrastructure & CORS Config
│   ├── database.js                   # ✅ Unified Driver v2 (Postgres Fix)
│   ├── package.json                  # ✅ Using bcryptjs
│   ├── uploads/                      # Local uploads (Dev Only)
│   └── ...
│
├── frontend/                         # Next.js 16 (Theta)
│   ├── lib/
│   │   ├── config.ts                 # ✅ Dynamic API URL detection
│   │   └── api.ts                    # ✅ Axios Interceptors
│   ├── app/
│   │   └── login/page.tsx            # Role-based redirect
│   └── ...
```

---

## 🛠️ TECH STACK

| Layer | Teknologi | Status |
|-------|-----------|--------|
| **Frontend** | Next.js 16 + Tailwind v4 | ✅ Production |
| **Backend** | Node.js Express (Serverless) | ✅ Production |
| **Database** | Vercel Postgres (Production) | ✅ Production |
| **Database** | SQLite (Local Dev) | ✅ Ready |
| **Auth** | JWT + bcryptjs | ✅ Fixed |
| **Real-time** | Socket.io (Disabled in Prod) | ⚠️ Cloud Limit |

---

## 🚀 CARA DEPLOY ULANG (CLOUD)

### **1. Backend (Project: aplikasi-mbg-api)**
1. Root Directory: `backend`
2. Environment Variables:
   - `POSTGRES_URL`: URL dari Vercel Storage.
   - `JWT_SECRET`: Kunci rahasia JWT.
   - `NODE_ENV`: `production`

### **2. Frontend (Project: aplikasi-mbg-theta)**
1. Root Directory: `frontend`
2. Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://aplikasi-mbg-api.vercel.app/api`

---

## 🔑 DEFAULT ACCOUNTS

| Role | Email | Password |
|------|-------|----------|
| Admin BGN | admin@mbg.go.id | admin123 |
| Kurir | kurir.dapurmbg@mbg.go.id | kurir123 |
| Supplier | dapur1@mbg.go.id | dapur123 |

*(Jalankan `https://aplikasi-mbg-api.vercel.app/api/seed` jika database kosong)*

---

## 🐛 TROUBLESHOOTING (NEW)

| Masalah | Solusi |
|---------|--------|
| **Blocked by CORS** | Pastikan domain frontend ada di `vercel.json` backend & redeploy |
| **Invalid ELF Header** | Gunakan `bcryptjs`, jangan pakai `bcrypt` |
| **500 Internal Error (Login)** | Jalankan `/api/seed` untuk inisialisasi tabel |
| **Data type error (Postgres)** | Tambahkan casting `::text` pada query SQL |
| **Login Redirect Gagal** | Cek `NEXT_PUBLIC_API_URL` di Dashboard Vercel (harus berakhiran `/api`) |

---

## 🎯 PROGRESS OVERALL

**Overall Progress: ~98% Complete** 🚀

*(Hanya menyisa fitur minor seperti Export PDF/Excel dan Dashboard Charts)*

---

**© 2026 - MBG Distribution System - Last Updated: 24 April 2026 (Final Fixes Applied)**
