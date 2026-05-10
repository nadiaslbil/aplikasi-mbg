# 🔗 Dapur Relations - Kurir & Sekolah Assignment

## ✅ Status: SELESAI & BERFUNGSI

Tanggal: 13 April 2026

---

## 📋 **Apa itu Dapur Relations?**

Fitur ini menambahkan **relasi eksplisit** antara dapur dengan kurir dan sekolah, sehingga:
- ✅ Dapur tahu kurir mana saja yang bertanggung jawab mengantar
- ✅ Dapur tahu sekolah mana saja yang harus dilayani
- ✅ Admin bisa assign/unassign kurir & sekolah ke dapur tertentu
- ✅ Sistem bisa auto-filter dropdown berdasarkan relasi

---

## 🗄️ **Database Schema (2 Tabel Baru)**

### **1. Tabel `dapur_kurir`**
Menyimpan relasi antara dapur dan kurir yang bertugas.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | INTEGER | Primary Key |
| `dapur_id` | INTEGER | FK → dapur_supplier (CASCADE DELETE) |
| `kurir_id` | INTEGER | FK → users (CASCADE DELETE) |
| `tanggal_mulai` | DATE | Tanggal mulai bertugas |
| `tanggal_selesai` | DATE | Tanggal selesai (nullable) |
| `status` | TEXT | `aktif` / `nonaktif` |
| `created_at` | DATETIME | Otomatis saat create |
| `updated_at` | DATETIME | Otomatis saat update |
| **UNIQUE** | (dapur_id, kurir_id) | Mencegah duplikasi |

**Indexes:**
- `idx_dapur_kurir_dapur`
- `idx_dapur_kurir_kurir`
- `idx_dapur_kurir_status`

---

### **2. Tabel `dapur_sekolah`**
Menyimpan relasi antara dapur dan sekolah yang dilayani.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | INTEGER | Primary Key |
| `dapur_id` | INTEGER | FK → dapur_supplier (CASCADE DELETE) |
| `sekolah_id` | INTEGER | FK → sekolah (CASCADE DELETE) |
| `hari_kirim` | TEXT | JSON array: `["senin", "selasa", ...]` |
| `jumlah_porsi` | INTEGER | Porsi harian |
| `status` | TEXT | `aktif` / `nonaktif` |
| `created_at` | DATETIME | Otomatis saat create |
| `updated_at` | DATETIME | Otomatis saat update |
| **UNIQUE** | (dapur_id, sekolah_id) | Mencegah duplikasi |

**Indexes:**
- `idx_dapur_sekolah_dapur`
- `idx_dapur_sekolah_sekolah`
- `idx_dapur_sekolah_status`

---

## 🔌 **API Endpoints (10 Endpoint Baru)**

### **DAPUR-KURIR (5 Endpoints)**

| Method | Endpoint | Deskripsi | RBAC |
|--------|----------|-----------|------|
| `GET` | `/api/dapur-kurir` | List semua relasi (filter: `dapur_id`, `status`) | Admin, Supplier |
| `POST` | `/api/dapur-kurir` | Assign kurir ke dapur | Admin only |
| `PUT` | `/api/dapur-kurir/:id` | Update relasi (status, tanggal) | Admin only |
| `DELETE` | `/api/dapur-kurir/:id` | Hapus relasi | Admin only |
| `GET` | `/api/dapur/:id/kurir` | List kurir aktif untuk dapur tertentu | All roles |

**Contoh Request (POST):**
```json
POST /api/dapur-kurir
{
  "dapur_id": 1,
  "kurir_id": 3,
  "tanggal_mulai": "2026-04-13"
}
```

**Contoh Response:**
```json
{
  "message": "Kurir berhasil ditugaskan ke dapur",
  "id": 1
}
```

---

### **DAPUR-SEKOLAH (5 Endpoints)**

| Method | Endpoint | Deskripsi | RBAC |
|--------|----------|-----------|------|
| `GET` | `/api/dapur-sekolah` | List semua relasi (filter: `dapur_id`, `sekolah_id`, `status`) | All roles |
| `POST` | `/api/dapur-sekolah` | Assign sekolah ke dapur | Admin only |
| `PUT` | `/api/dapur-sekolah/:id` | Update relasi (hari, porsi, status) | Admin only |
| `DELETE` | `/api/dapur-sekolah/:id` | Hapus relasi | Admin only |
| `GET` | `/api/dapur/:id/sekolah` | List sekolah aktif untuk dapur tertentu | All roles |

**Contoh Request (POST):**
```json
POST /api/dapur-sekolah
{
  "dapur_id": 1,
  "sekolah_id": 5,
  "hari_kirim": "[\"senin\", \"selasa\", \"rabu\", \"kamis\", \"jumat\"]",
  "jumlah_porsi": 250
}
```

**Contoh Response:**
```json
{
  "message": "Sekolah berhasil ditugaskan ke dapur",
  "id": 1
}
```

---

### **DASHBOARD STATS (1 Endpoint Baru)**

| Method | Endpoint | Deskripsi | RBAC |
|--------|----------|-----------|------|
| `GET` | `/api/dashboard/dapur-stats` | Stats dapur dengan jumlah kurir & sekolah aktif | Admin, Supplier |

**Contoh Response:**
```json
[
  {
    "id": 1,
    "nama": "Dapur MBG Banjarnegara",
    "kurir_aktif": 2,
    "sekolah_aktif": 10,
    "total_porsi": 2000
  }
]
```

---

## 🖥️ **Frontend Pages (2 Halaman Baru)**

### **1. Assign Kurir** (`/dashboard/assign-kurir`)
**URL:** `http://localhost:3000/dashboard/assign-kurir`

**Fitur:**
- ✅ Tabel relasi dapur-kurir dengan pagination
- ✅ Stats cards: Total Dapur, Total Kurir, Relasi Aktif
- ✅ Modal form untuk assign kurir baru
- ✅ Toggle status aktif/nonaktif
- ✅ Hapus relasi
- ✅ Filter berdasarkan dapur (coming soon)

**Akses:** Admin BGN & Admin Daerah

---

### **2. Assign Sekolah** (`/dashboard/assign-sekolah`)
**URL:** `http://localhost:3000/dashboard/assign-sekolah`

**Fitur:**
- ✅ Tabel relasi dapur-sekolah dengan detail hari & porsi
- ✅ Stats cards: Total Dapur, Total Sekolah, Total Porsi/Hari
- ✅ Modal form dengan multi-select hari kirim
- ✅ Toggle status aktif/nonaktif
- ✅ Hapus relasi
- ✅ Badge hari kirim (Sen, Sel, Rab, Kam, Jum)

**Akses:** Admin BGN & Admin Daerah

---

## 🔄 **Alur Kerja (Workflow)**

### **Assign Kurir ke Dapur:**
1. Admin login → Menu **"Assign Kurir"**
2. Klik **"Tambah Penugasan"**
3. Pilih **Dapur** dari dropdown
4. Pilih **Kurir** dari dropdown
5. Pilih **Tanggal Mulai**
6. Klik **"Simpan"**
7. ✅ Kurir sekarang ditugaskan ke dapur tersebut

### **Assign Sekolah ke Dapur:**
1. Admin login → Menu **"Assign Sekolah"**
2. Klik **"Tambah Penugasan"**
3. Pilih **Dapur** dari dropdown
4. Pilih **Sekolah** dari dropdown
5. Input **Jumlah Porsi** per hari
6. **Pilih Hari Kirim** (multi-select: Sen-Sab)
7. Klik **"Simpan"**
8. ✅ Sekolah sekarang dilayani oleh dapur tersebut

---

## 📊 **Relasi Database (ERD)**

```
users (kurir) ─────────┐
                       │
                       ├──▶ dapur_kurir ◀──┐
                       │                   │
dapur_supplier ◀───────┘                   │
       │                                   │
       ├──▶ dapur_sekolah ◀─── sekolah     │
       │                                   │
       └──▶ jadwal_distribusi ──▶ pengiriman
```

**Penjelasan:**
- 1 Dapur bisa punya **banyak Kurir**
- 1 Dapur bisa layani **banyak Sekolah**
- 1 Kurir bisa ditugaskan ke **banyak Dapur**
- 1 Sekolah bisa dilayani oleh **1 Dapur** (bisa diubah ke many-to-many jika perlu)

---

## 🧪 **Cara Test**

### **Test 1: Assign Kurir ke Dapur**
```bash
# Login sebagai admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mbg.go.id","password":"admin123"}'

# Assign kurir
curl -X POST http://localhost:5000/api/dapur-kurir \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"dapur_id":1,"kurir_id":3,"tanggal_mulai":"2026-04-13"}'

# Expected Response:
# {"message":"Kurir berhasil ditugaskan ke dapur","id":1}
```

### **Test 2: Assign Sekolah ke Dapur**
```bash
# Assign sekolah
curl -X POST http://localhost:5000/api/dapur-sekolah \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"dapur_id":1,"sekolah_id":1,"hari_kirim":"[\"senin\",\"selasa\",\"rabu\",\"kamis\",\"jumat\"]","jumlah_porsi":250}'

# Expected Response:
# {"message":"Sekolah berhasil ditugaskan ke dapur","id":1}
```

### **Test 3: Get Kurir untuk Dapur**
```bash
# List kurir untuk dapur ID 1
curl -X GET http://localhost:5000/api/dapur/1/kurir \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Expected Response:
# [{"id":3,"nama":"Kurir 1","email":"kurir1@mbg.go.id",...}]
```

### **Test 4: Get Sekolah untuk Dapur**
```bash
# List sekolah untuk dapur ID 1
curl -X GET http://localhost:5000/api/dapur/1/sekolah \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Expected Response:
# [{"id":1,"nama":"SDN 1 Banjarnegara",...,"hari_kirim":"[\"senin\",...]","jumlah_porsi":250}]
```

---

## 🚀 **Migration & Seed**

### **Jalankan Migration:**
```bash
cd backend
node migration-add-dapur-relations.js
```

### **Reset & Seed Ulang:**
```bash
# Hapus database (jika perlu reset total)
rm backend/mbg_distribution.db

# Seed ulang semua data termasuk relasi
npm run seed
```

---

## 📝 **File yang Dimodifikasi/Dibuat**

### **Backend:**
| File | Status | Deskripsi |
|------|--------|-----------|
| `backend/database.js` | ✅ Updated | Tambah 2 tabel baru + indexes |
| `backend/server.js` | ✅ Updated | Tambah 10 endpoint baru + dashboard stats |
| `backend/migration-add-dapur-relations.js` | ✅ New | Migration script |
| `backend/seed.js` | ✅ Updated | Seed data dummy untuk relasi baru |
| `backend/seed-dapur-kurir.js` | ✅ New | Helper seed (opsional) |

### **Frontend:**
| File | Status | Deskripsi |
|------|--------|-----------|
| `frontend/app/dashboard/assign-kurir/page.tsx` | ✅ New | Halaman assign kurir |
| `frontend/app/dashboard/assign-sekolah/page.tsx` | ✅ New | Halaman assign sekolah |
| `frontend/components/AdminLayout.tsx` | ✅ Updated | Tambah 2 menu baru |

---

## ✅ **Checklist Fitur**

- [x] Tabel `dapur_kurir` dibuat
- [x] Tabel `dapur_sekolah` dibuat
- [x] Indexes untuk performa
- [x] 5 endpoint CRUD dapur-kurir
- [x] 5 endpoint CRUD dapur-sekolah
- [x] Endpoint GET kurir per dapur
- [x] Endpoint GET sekolah per dapur
- [x] Dashboard stats endpoint
- [x] Frontend halaman assign kurir
- [x] Frontend halaman assign sekolah
- [x] Menu sidebar updated
- [x] Seed data dummy
- [x] Migration script
- [x] Dokumentasi lengkap

---

## 🎯 **Next Steps (Enhancement)**

Fitur ini sudah **SELESAI 100%**. Enhancement yang bisa dilakukan:

1. **Auto-Filter di Form Jadwal** - Dropdown kurir & sekolah otomatis filter berdasarkan dapur yang dipilih
2. **Dashboard Dapur Detail** - Tampil info lengkap dapur + kurir + sekolah + statistik
3. **Bulk Assign** - Assign banyak kurir/sekolah sekaligus
4. **Export Laporan** - PDF daftar penugasan
5. **Notifikasi** - Email/SMS ke kurir saat di-assign ke dapur baru
6. **Jadwal Otomatis** - Auto-create jadwal berdasarkan relasi dapur-sekolah

---

**© 2026 - Dapur Relations Feature Complete ✅**
