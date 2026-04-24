# 📋 Cloud Deployment Handover: MBG Distribution System

Dokumen ini merangkum transisi infrastruktur dari sistem lokal (SQLite) ke infrastruktur Cloud-Native (Vercel Postgres & Serverless).

---

## 1. Perubahan Arsitektur Utama (April 2026)

### A. Migrasi Database
- **Lama:** SQLite (`backend/mbg_distribution.db`).
- **Baru:** Vercel Postgres (Serverless PostgreSQL).
- **Inovasi:** File `backend/database.js` sekarang menggunakan **Unified Driver**. Ia secara otomatis mendeteksi lingkungan (Lokal vs Vercel) dan melakukan transpilasi query SQL dari dialek SQLite ke Postgres secara *real-time*.

### B. Deployment Serverless
- **Frontend:** Next.js di-deploy ke Vercel dengan **Root Directory** `frontend`.
- **Backend:** Express API di-deploy ke Vercel dengan **Root Directory** `backend`.
- **Optimasi:** `backend/server.js` sekarang mengekspor `app` (Express instance) agar kompatibel dengan Vercel Serverless Functions.

---

## 2. Fitur Baru & Perbaikan Cloud-Native

### ✅ Unified Database Driver
Driver `backend/database.js` telah dilengkapi fitur:
- Deteksi otomatis `DATABASE_URL` atau `POSTGRES_URL`.
- Pembersihan URL otomatis dari karakter tak terduga (spasi/tanda petik).
- Transpiler SQL: Mengubah `INTEGER PRIMARY KEY AUTOINCREMENT` -> `SERIAL PRIMARY KEY`, `strftime` -> `TO_CHAR`, dan menangani perbedaan fungsi tanggal (`date('now')` vs `CURRENT_DATE`).

### ✅ Skrip Migrasi Data (`migrate-to-postgres.js`)
Tersedia skrip mandiri untuk memindahkan data dari file `.db` lokal ke cloud:
```bash
cd backend
node migrate-to-postgres.js
```
Skrip ini menangani pembuatan tabel, penyalinan data, dan sinkronisasi *sequence ID* di Postgres.

### ✅ Perbaikan CORS & Preflight
Middleware CORS telah dipindahkan ke urutan paling atas di `server.js` untuk memastikan rute error sekalipun tetap memberikan header izin kepada browser. Menangani rute `OPTIONS` secara global.

### ✅ Kompatibilitas Sistem File
Middleware `upload.js` sekarang menggunakan `memoryStorage` saat berjalan di Vercel untuk menghindari crash pada sistem file *read-only* Vercel.

---

## 3. Konfigurasi Produksi (Vercel)

### A. Project Frontend (`aplikasi-mbg-theta`)
- **Root Directory:** `frontend`
- **Framework Preset:** Next.js
- **Environment Variables:**
  - `NEXT_PUBLIC_API_URL`: URL Backend Vercel Anda (berakhir dengan `/api`).

### B. Project Backend (`aplikasi-mbg-backend`)
- **Root Directory:** `backend`
- **Framework Preset:** Other
- **Environment Variables:**
  - `DATABASE_URL`: Connection string dari Vercel Postgres.
  - `JWT_SECRET`: Kunci enkripsi token.
  - `FRONTEND_URL`: URL Frontend Vercel (untuk validasi CORS).

---

## 4. Limitasi Lingkungan Serverless (Vercel)

1. **WebSocket (Socket.io):** Vercel tidak mendukung koneksi WebSocket yang persisten. Fitur *live tracking* saat ini dinonaktifkan di produksi. Untuk mengaktifkannya kembali di cloud, disarankan bermigrasi ke **Pusher** atau **Supabase Realtime**.
2. **Ephemeral Storage:** File yang di-upload ke folder `/uploads` akan hilang saat serverless function melakukan *cold start*. Untuk produksi permanen, disarankan menggunakan **Vercel Blob** atau **AWS S3**.
3. **Database Initialization:** Database akan otomatis terinisialisasi saat pertama kali dijalankan, namun migrasi data manual tetap diperlukan menggunakan `migrate-to-postgres.js`.

---

## 5. Kontak Operasional
Project ini telah dikonfigurasi oleh **Gemini CLI Interactive Agent**. Semua perubahan telah diverifikasi melalui proses build dan linting yang sukses (Zero Vulnerabilities).

**Handover Status:** ✅ Success Deployed to Vercel Postgres.
