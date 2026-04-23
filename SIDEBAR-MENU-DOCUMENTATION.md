# 🔐 Sidebar Menu & Permission Matrix (Updated)

## ✅ Status: SELESAI & BERFUNGSI

Tanggal: 13 April 2026

---

## 📋 **Perubahan**

Sidebar menu sekarang sudah **diperbaiki** dengan:
- ✅ **Section grouping** untuk navigasi yang lebih jelas
- ✅ **Role-based visibility** yang lebih ketat
- ✅ **Menu order** yang logis sesuai alur kerja
- ✅ **Icon yang sesuai** untuk setiap menu

---

## 🗂️ **Struktur Menu per Role**

### **1️⃣ ADMIN BGN (Super Admin)**
**Total Menu: 11 item**

| Section | Menu | Icon | Akses |
|---------|------|------|-------|
| **Dashboard** | Dashboard | 📊 BarChart3 | ✅ Full Access |
| **Dashboard** | Dashboard Kurir | 🚚 Truck | ❌ (Khusus Kurir) |
| **Master Data** | Data Sekolah | 🏫 School | ✅ CRUD |
| **Master Data** | Data Dapur | 🍳 Store | ✅ CRUD + Assign Supplier |
| **Master Data** | Assign Kurir | 👤 UserCheck | ✅ CRUD |
| **Master Data** | Assign Sekolah | 📋 ClipboardList | ✅ CRUD |
| **Operasional** | Jadwal Distribusi | 📅 Calendar | ✅ CRUD + Auto-create |
| **Operasional** | Pengiriman | 🚚 Truck | ✅ Full Access |
| **Operasional** | Stok Bahan | 📦 Layers | ✅ CRUD |
| **Tracking** | Peta Distribusi | 📍 MapPin | ✅ Full Access + Live Tracking |
| **Laporan** | Laporan Insiden | ⚠️ AlertTriangle | ✅ Full Access |
| **Pengaturan** | Manajemen User | 👥 Users | ✅ CRUD + Delete |

**Alur Kerja Admin BGN:**
```
1. Setup: Assign Kurir + Assign Sekolah
2. Planning: Jadwal Distribusi
3. Execution: Pengiriman (monitoring)
4. Reports: Insiden + Export
```

---

### **2️⃣ ADMIN DAERAH (Regional Admin)**
**Total Menu: 11 item (Sama dengan Admin BGN)**

| Section | Menu | Icon | Akses |
|---------|------|------|-------|
| **Dashboard** | Dashboard | 📊 BarChart3 | ✅ Full Access |
| **Dashboard** | Dashboard Kurir | 🚚 Truck | ❌ (Khusus Kurir) |
| **Master Data** | Data Sekolah | 🏫 School | ✅ CRUD |
| **Master Data** | Data Dapur | 🍳 Store | ✅ CRUD + Assign Supplier |
| **Master Data** | Assign Kurir | 👤 UserCheck | ✅ CRUD |
| **Master Data** | Assign Sekolah | 📋 ClipboardList | ✅ CRUD |
| **Operasional** | Jadwal Distribusi | 📅 Calendar | ✅ CRUD + Auto-create |
| **Operasional** | Pengiriman | 🚚 Truck | ✅ Full Access |
| **Operasional** | Stok Bahan | 📦 Layers | ✅ CRUD |
| **Tracking** | Peta Distribusi | 📍 MapPin | ✅ Full Access + Live Tracking |
| **Laporan** | Laporan Insiden | ⚠️ AlertTriangle | ✅ Full Access |
| **Pengaturan** | Manajemen User | 👥 Users | ✅ Create/Update (❌ Delete) |

**Perbedaan dengan Admin BGN:**
- ❌ **Tidak bisa hapus user** (hanya Admin BGN)
- ✅ Sisanya sama

---

### **3️⃣ KURIR (Delivery Person)**
**Total Menu: 6 item**

| Section | Menu | Icon | Akses |
|---------|------|------|-------|
| **Dashboard** | Dashboard | 📊 BarChart3 | ✅ Read Only |
| **Dashboard** | Dashboard Kurir | 🚚 Truck | ✅ **FULL** (Halaman Khusus) |
| **Master Data** | Data Sekolah | 🏫 School | 👁️ Read Only |
| **Master Data** | Data Dapur | 🍳 Store | 👁️ Read Only |
| **Master Data** | Assign Kurir | 👤 UserCheck | ❌ |
| **Master Data** | Assign Sekolah | 📋 ClipboardList | ❌ |
| **Operasional** | Jadwal Distribusi | 📅 Calendar | 👁️ Read Only |
| **Operasional** | Pengiriman | 🚚 Truck | ✅ **Upload + Update Status** |
| **Operasional** | Stok Bahan | 📦 Layers | ❌ |
| **Tracking** | Peta Distribusi | 📍 MapPin | ❌ |
| **Laporan** | Laporan Insiden | ⚠️ AlertTriangle | ✅ Report Only |
| **Pengaturan** | Manajemen User | 👥 Users | 👁️ Own Profile Only |

**Alur Kerja Kurir:**
```
1. Login → Dashboard Kurir
2. Lihat tugas pengiriman hari ini
3. Mulai GPS Tracking
4. Update status: Dalam Perjalanan → Diterima/Gagal
5. Upload foto bukti pengiriman
6. Laporan insiden jika ada masalah
```

**Fitur Utama Kurir:**
- ✅ **Dashboard Kurir** - Halaman khusus dengan daftar tugas
- ✅ **GPS Control** - Mulai/Stop tracking
- ✅ **Quick Actions** - Diterima/Gagal (1 klik)
- ✅ **Upload Foto** - Bukti pengiriman
- ✅ **Live Tracking** - Auto-update lokasi setiap 15 detik

---

### **4️⃣ SUPPLIER (Dapur/Catering)**
**Total Menu: 7 item**

| Section | Menu | Icon | Akses |
|---------|------|------|-------|
| **Dashboard** | Dashboard | 📊 BarChart3 | ✅ Read Only |
| **Dashboard** | Dashboard Kurir | 🚚 Truck | ❌ |
| **Master Data** | Data Sekolah | 🏫 School | 👁️ Read Only |
| **Master Data** | Data Dapur | 🍳 Store | ✅ **Own Dapur Only** |
| **Master Data** | Assign Kurir | 👤 UserCheck | ❌ |
| **Master Data** | Assign Sekolah | 📋 ClipboardList | ❌ |
| **Operasional** | Jadwal Distribusi | 📅 Calendar | 👁️ Read Only |
| **Operasional** | Pengiriman | 🚚 Truck | 👁️ Read Only |
| **Operasional** | Stok Bahan | 📦 Layers | ✅ **Own Dapur Only** |
| **Tracking** | Peta Distribusi | 📍 MapPin | ❌ |
| **Laporan** | Laporan Insiden | ⚠️ AlertTriangle | ✅ Report Only |
| **Pengaturan** | Manajemen User | 👥 Users | 👁️ Own Profile Only |

**Alur Kerja Supplier:**
```
1. Login → Dashboard
2. Cek dapur yang jadi tanggung jawab
3. Kelola stok bahan dapur
4. Update kapasitas/kontak dapur
5. Lihat jadwal distribusi
6. Laporan insiden jika ada masalah
```

**Fitur Utama Supplier:**
- ✅ **Data Dapur** - Hanya bisa lihat/edit dapur sendiri (user_id match)
- ✅ **Stok Bahan** - Hanya bisa kelola stok dapur sendiri
- ✅ **Laporan Insiden** - Bisa lapor masalah
- ❌ **Tidak bisa** assign kurir/sekolah
- ❌ **Tidak bisa** akses peta distribusi

---

## 📊 **Permission Matrix Lengkap**

### **MASTER DATA**

| Fitur | Admin BGN | Admin Daerah | Kurir | Supplier |
|-------|-----------|--------------|-------|----------|
| **Data Sekolah** | ✅ CRUD | ✅ CRUD | 👁️ Read | 👁️ Read |
| **Data Dapur** | ✅ CRUD + Assign | ✅ CRUD + Assign | 👁️ Read | ✅ Own Only |
| **Assign Kurir** | ✅ CRUD | ✅ CRUD | ❌ | ❌ |
| **Assign Sekolah** | ✅ CRUD | ✅ CRUD | ❌ | ❌ |

### **OPERASIONAL**

| Fitur | Admin BGN | Admin Daerah | Kurir | Supplier |
|-------|-----------|--------------|-------|----------|
| **Jadwal Distribusi** | ✅ CRUD | ✅ CRUD | 👁️ Read | 👁️ Read |
| **Pengiriman** | ✅ Full | ✅ Full | ✅ Upload + Status | 👁️ Read |
| **Stok Bahan** | ✅ CRUD | ✅ CRUD | ❌ | ✅ Own Only |

### **TRACKING & LAPORAN**

| Fitur | Admin BGN | Admin Daerah | Kurir | Supplier |
|-------|-----------|--------------|-------|----------|
| **Peta Distribusi** | ✅ Full | ✅ Full | ❌ | ❌ |
| **Laporan Insiden** | ✅ Full | ✅ Full | ✅ Report | ✅ Report |

### **PENGATURAN**

| Fitur | Admin BGN | Admin Daerah | Kurir | Supplier |
|-------|-----------|--------------|-------|----------|
| **Manajemen User** | ✅ CRUD | ✅ Create/Update | 👁️ Own | 👁️ Own |
| **Delete User** | ✅ Only | ❌ | ❌ | ❌ |

---

## 🎨 **Visual Sidebar per Role**

### **Admin BGN / Admin Daerah**
```
┌─────────────────────────────────┐
│  📦 MBG Admin                   │
├─────────────────────────────────┤
│  DASHBOARD                      │
│  📊 Dashboard                   │
│                                 │
│  MASTER DATA                    │
│  🏫 Data Sekolah                │
│  🍳 Data Dapur                  │
│  👤 Assign Kurir                │
│  📋 Assign Sekolah              │
│                                 │
│  OPERASIONAL                    │
│  📅 Jadwal Distribusi           │
│  🚚 Pengiriman                  │
│  📦 Stok Bahan                  │
│                                 │
│  TRACKING                       │
│  📍 Peta Distribusi             │
│                                 │
│  LAPORAN                        │
│  ⚠️ Laporan Insiden            │
│                                 │
│  PENGATURAN                     │
│  👥 Manajemen User              │
├─────────────────────────────────┤
│  👤 [Nama User]                 │
│  🚪 Logout                      │
└─────────────────────────────────┘
```

### **Kurir**
```
┌─────────────────────────────────┐
│  📦 MBG Admin                   │
├─────────────────────────────────┤
│  DASHBOARD                      │
│  📊 Dashboard                   │
│  🚚 Dashboard Kurir ⭐          │
│                                 │
│  MASTER DATA                    │
│  🏫 Data Sekolah                │
│  🍳 Data Dapur                  │
│                                 │
│  OPERASIONAL                    │
│  📅 Jadwal Distribusi           │
│  🚚 Pengiriman                  │
│                                 │
│  LAPORAN                        │
│  ⚠️ Laporan Insiden            │
├─────────────────────────────────┤
│  👤 [Nama Kurir]                │
│  🚪 Logout                      │
└─────────────────────────────────┘
```

### **Supplier**
```
┌─────────────────────────────────┐
│  📦 MBG Admin                   │
├─────────────────────────────────┤
│  DASHBOARD                      │
│  📊 Dashboard                   │
│                                 │
│  MASTER DATA                    │
│  🏫 Data Sekolah                │
│  🍳 Data Dapur ⭐               │
│                                 │
│  OPERASIONAL                    │
│  📅 Jadwal Distribusi           │
│  🚚 Pengiriman                  │
│  📦 Stok Bahan ⭐               │
│                                 │
│  LAPORAN                        │
│  ⚠️ Laporan Insiden            │
├─────────────────────────────────┤
│  👤 [Nama Supplier]             │
│  🚪 Logout                      │
└─────────────────────────────────┘
```

---

## 🔑 **Penjelasan Section**

### **1. Dashboard**
- **Fungsi:** Overview & statistik
- **Menu:**
  - Dashboard utama (semua role)
  - Dashboard Kurir (khusus kurir)

### **2. Master Data**
- **Fungsi:** Data statis yang jadi dasar operasional
- **Menu:**
  - Data Sekolah - Semua sekolah penerima MBG
  - Data Dapur - Semua dapur/supplier
  - Assign Kurir - Penugasan kurir ke dapur (Admin only)
  - Assign Sekolah - Penugasan sekolah ke dapur (Admin only)

### **3. Operasional**
- **Fungsi:** Kegiatan operasional harian
- **Menu:**
  - Jadwal Distribusi - Planning pengiriman per hari
  - Pengiriman - Eksekusi & tracking real-time
  - Stok Bahan - Inventori dapur

### **4. Tracking**
- **Fungsi:** Monitoring via peta interaktif
- **Menu:**
  - Peta Distribusi - Live tracking kurir di peta (Admin only)

### **5. Laporan**
- **Fungsi:** Pelaporan & insiden
- **Menu:**
  - Laporan Insiden - Masalah yang terjadi saat distribusi

### **6. Pengaturan**
- **Fungsi:** Konfigurasi sistem
- **Menu:**
  - Manajemen User - Kelola user & role

---

## ✅ **Checklist Implementasi**

- [x] Section grouping untuk navigasi yang jelas
- [x] Role-based visibility untuk setiap menu
- [x] Icon yang sesuai untuk setiap menu
- [x] Menu order logis sesuai alur kerja
- [x] Dashboard Kurir khusus untuk role kurir
- [x] Assign Kurir & Sekolah hanya untuk Admin
- [x] Peta Distribusi hanya untuk Admin
- [x] Stok Bahan: Supplier hanya bisa dapur sendiri
- [x] Data Dapur: Supplier hanya bisa dapur sendiri
- [x] Manajemen User: Delete hanya Admin BGN
- [x] Scrollable sidebar untuk menu banyak
- [x] Section headers dengan styling konsisten

---

## 🎯 **Benefit Setelah Update**

| Sebelum | Sesudah |
|---------|---------|
| ❌ Menu tanpa grouping | ✅ Section jelas (Master, Operasional, dll) |
| ❌ Kurir bisa lihat semua menu | ✅ Kurir hanya 6 menu yang relevan |
| ❌ Supplier bisa lihat menu admin | ✅ Supplier hanya 7 menu yang diperlukan |
| ❌ Navigasi membingungkan | ✅ Urutan logis: Setup → Planning → Execution |
| ❌ Icon tidak konsisten | ✅ Icon sesuai fungsi |

---

## 📝 **Catatan Penting**

1. **Dashboard Kurir** - Hanya muncul untuk role `kurir`
2. **Assign Kurir & Sekolah** - Hanya untuk `admin_bgn` dan `admin_daerah`
3. **Peta Distribusi** - Hanya untuk admin (monitoring)
4. **Delete User** - Hanya `admin_bgn` (security)
5. **Stok Bahan** - Supplier hanya bisa akses dapur sendiri
6. **Data Dapur** - Supplier hanya bisa edit dapur sendiri

---

**© 2026 - Sidebar Menu & Permission Matrix Updated ✅**
