# 📅 Fitur Filter & Sorting Status "Terjadwal"

> **Tanggal:** 14 April 2026  
> **Status:** ✅ Implemented  
> **Fitur:** Filter status "terjadwal" + sorting tanggal otomatis  

---

## 🎯 Kebutuhan yang Diimplementasikan

### **1. Filter Status "Terjadwal"**
- ✅ Tambah tombol filter "Terjadwal" di halaman Pengiriman
- ✅ Saat dipilih, hanya tampilkan data dengan status `terjadwal`
- ✅ Data diurutkan berdasarkan **tanggal paling dekat** (ascending)

### **2. Sorting Default (Tanpa Filter)**
- ✅ Status "terjadwal" tampil **paling atas**
- ✅ Di dalam "terjadwal", urutkan dari **tanggal terdekat** ke yang lebih jauh
- ✅ Status lain (dalam_perjalanan, diterima, gagal) di bawah "terjadwal"

### **3. Sorting untuk Status Lain**
- ✅ Filter "dalam_perjalanan", "diterima", "gagal" → urutkan tanggal terbaru (DESC)
- ✅ Konsisten di semua halaman (Pengiriman + Jadwal)

---

## 🔧 Implementasi

### **1. Backend - API Sorting Logic**

#### **A. Endpoint `/api/pengiriman`**

**File:** `backend/server.js` (line ~659)

**Logic Sorting:**

```javascript
// SORTING CERDAS:
// - Default (tanpa filter status): "terjadwal" paling atas, lalu urut tanggal
// - Filter "terjadwal": urutkan tanggal terdekat (ASC)
// - Filter lain: urutkan tanggal terbaru (DESC)
if (status === 'terjadwal') {
  // Filter terjadwal: urutkan dari tanggal terdekat ke hari ini (ASC)
  query += ' ORDER BY jd.tanggal ASC, jd.waktu_kirim ASC';
} else if (!status) {
  // Default: "terjadwal" di atas (berdasarkan status order), lalu tanggal ASC
  query += ' ORDER BY CASE p.status WHEN \'terjadwal\' THEN 0 WHEN \'dalam_perjalanan\' THEN 1 WHEN \'diterima\' THEN 2 WHEN \'gagal\' THEN 3 ELSE 4 END, jd.tanggal ASC, jd.waktu_kirim ASC';
} else {
  // Filter status lain: urutkan tanggal terbaru
  query += ' ORDER BY jd.tanggal DESC, jd.waktu_kirim DESC';
}
```

**Penjelasan:**

| Kondisi | Sorting | Hasil |
|---------|---------|-------|
| **Filter "terjadwal"** | `ORDER BY jd.tanggal ASC` | Tanggal terdekat dulu |
| **Default (tanpa filter)** | `CASE status → 0,1,2,3` + `tanggal ASC` | Terjadwal paling atas, urut tanggal |
| **Filter status lain** | `ORDER BY jd.tanggal DESC` | Tanggal terbaru dulu |

---

#### **B. Endpoint `/api/jadwal`**

**File:** `backend/server.js` (line ~349)

**Logic Sorting:** (sama seperti pengiriman)

```javascript
if (status === 'terjadwal') {
  query += ' ORDER BY jd.tanggal ASC, jd.waktu_kirim ASC';
} else if (!status) {
  query += ' ORDER BY CASE jd.status WHEN \'terjadwal\' THEN 0 WHEN \'dalam_pengiriman\' THEN 1 WHEN \'diterima\' THEN 2 WHEN \'gagal\' THEN 3 ELSE 4 END, jd.tanggal ASC, jd.waktu_kirim ASC';
} else {
  query += ' ORDER BY jd.tanggal DESC, jd.waktu_kirim DESC';
}
```

**Konsistensi:** Kedua endpoint (jadwal & pengiriman) menggunakan logic yang sama.

---

### **2. Frontend - Tambah Filter "Terjadwal"**

#### **A. Halaman Pengiriman**

**File:** `frontend/app/dashboard/pengiriman/page.tsx`

**Perubahan:**

**1. Import Icon Calendar:**
```typescript
import {
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  Filter,
  Edit,
  X,
  Eye,
  Camera,
  Navigation,
  Calendar,  // ✅ NEW
} from 'lucide-react';
```

**2. Tambah Config untuk Status "terjadwal":**
```typescript
const statusConfig: Record<string, { badge: string; icon: typeof Truck }> = {
  terjadwal: { badge: 'badge-blue', icon: Calendar },  // ✅ NEW
  dalam_perjalanan: { badge: 'badge-orange', icon: Truck },
  diterima: { badge: 'badge-green', icon: CheckCircle },
  gagal: { badge: 'badge-red', icon: AlertCircle },
};
```

**3. Tambah Opsi Filter "Terjadwal":**
```typescript
const filterOptions = [
  { value: '', label: 'Semua', icon: Filter },
  { value: 'terjadwal', label: 'Terjadwal', icon: Calendar },  // ✅ NEW
  { value: 'dalam_perjalanan', label: 'Dalam Perjalanan', icon: Truck },
  { value: 'diterima', label: 'Diterima', icon: CheckCircle },
  { value: 'gagal', label: 'Gagal', icon: AlertCircle },
];
```

**4. Update Select Options di Modal:**
```tsx
<select value={updateForm.status} onChange={...} className="select">
  <option value="terjadwal">Terjadwal</option>  {/* ✅ NEW */}
  <option value="dalam_perjalanan">Dalam Perjalanan</option>
  <option value="diterima">Diterima</option>
  <option value="gagal">Gagal</option>
</select>
```

---

## 📊 Flow Sorting

### **Scenario 1: Default (Tanpa Filter)**

```
Data dari Database:
┌─────────────────────────────────────┐
│ status: dalam_perjalanan            │
│ tanggal: 2026-04-15                 │
├─────────────────────────────────────┤
│ status: terjadwal          ← URUTAN │
│ tanggal: 2026-04-14       ← 1      │
├─────────────────────────────────────┤
│ status: terjadwal                    │
│ tanggal: 2026-04-16                 │
├─────────────────────────────────────┤
│ status: diterima                    │
│ tanggal: 2026-04-13                 │
└─────────────────────────────────────┘

Query SQL:
ORDER BY 
  CASE status 
    WHEN 'terjadwal' THEN 0      ← PALING ATAS
    WHEN 'dalam_perjalanan' THEN 1
    WHEN 'diterima' THEN 2
    WHEN 'gagal' THEN 3
  END,
  tanggal ASC                     ← TANGGAL TERDEKAT DULU

Hasil di UI:
┌─────────────────────────────────────┐
│ 🔵 Terjadwal │ 14 Apr 2026  ← #1   │
├─────────────────────────────────────┤
│ 🔵 Terjadwal │ 16 Apr 2026  ← #2   │
├─────────────────────────────────────┤
│ 🟠 Dalam Perjalanan │ 15 Apr  ← #3 │
├─────────────────────────────────────┤
│ 🟢 Diterima │ 13 Apr 2026   ← #4   │
└─────────────────────────────────────┘
```

---

### **Scenario 2: Filter "Terjadwal" Dipilih**

```
Query SQL:
WHERE status = 'terjadwal'
ORDER BY tanggal ASC              ← TANGGAL TERDEKAT DULU

Hasil di UI:
┌─────────────────────────────────────┐
│ 🔵 Terjadwal │ 14 Apr 2026  ← #1   │
├─────────────────────────────────────┤
│ 🔵 Terjadwal │ 15 Apr 2026  ← #2   │
├─────────────────────────────────────┤
│ 🔵 Terjadwal │ 16 Apr 2026  ← #3   │
├─────────────────────────────────────┤
│ 🔵 Terjadwal │ 20 Apr 2026  ← #4   │
└─────────────────────────────────────┘

✅ Hanya status "terjadwal"
✅ Urut dari tanggal terdekat ke terjauh
```

---

### **Scenario 3: Filter "Dalam Perjalanan" Dipilih**

```
Query SQL:
WHERE status = 'dalam_perjalanan'
ORDER BY tanggal DESC             ← TANGGAL TERBARU DULU

Hasil di UI:
┌─────────────────────────────────────┐
│ 🟠 Dalam Perjalanan │ 15 Apr  ← #1 │
├─────────────────────────────────────┤
│ 🟠 Dalam Perjalanan │ 14 Apr  ← #2 │
├─────────────────────────────────────┤
│ 🟠 Dalam Perjalanan │ 10 Apr  ← #3 │
└─────────────────────────────────────┘

✅ Hanya status "dalam_perjalanan"
✅ Urut dari tanggal terbaru (kegiatan terakhir)
```

---

## 🎨 Badge & Icon Configuration

### **Status Badge Colors:**

| Status | Badge Color | Icon |
|--------|-------------|------|
| **terjadwal** | `badge-blue` (biru) | 📅 Calendar |
| **dalam_perjalanan** | `badge-orange` (orange) | 🚚 Truck |
| **diterima** | `badge-green` (hijau) | ✅ CheckCircle |
| **gagal** | `badge-red` (merah) | ❌ AlertCircle |

### **Visual di UI:**

```
┌─────────────────────────────────────────────────────────┐
│ Tanggal    │ Dapur      │ Status              │ Aksi   │
├─────────────────────────────────────────────────────────┤
│ 14 Apr 2026│ Dapur MBG  │ 📅 Terjadwal        │ ✏️     │
│ 15 Apr 2026│ Berkah     │ 🚚 Dalam Perjalanan │ ✏️     │
│ 13 Apr 2026| Dapur Sehat│ ✅ Diterima         │ 👁️     │
│ 10 Apr 2026| Kitchen    │ ❌ Gagal            │ 👁️     │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Cara Test

### **1. Jalankan Aplikasi:**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### **2. Test Filter "Terjadwal" di Pengiriman:**

1. Login: `admin@mbg.go.id` / `admin123`
2. Buka `/dashboard/pengiriman`
3. Klik tombol filter **"Terjadwal"** (icon calendar, warna biru)
4. ✅ **Hanya tampil data dengan status "terjadwal"**
5. ✅ **Data urut dari tanggal terdekat** (14 Apr, 15 Apr, 16 Apr, ...)

### **3. Test Default Sorting (Tanpa Filter):**

1. Klik tombol filter **"Semua"**
2. ✅ **Data "terjadwal" tampil paling atas**
3. ✅ **Di dalam "terjadwal", urut dari tanggal terdekat**
4. ✅ **Status lain (dalam_perjalanan, diterima, gagal) di bawah**

### **4. Test Filter Lain:**

1. Klik filter **"Dalam Perjalanan"**
2. ✅ Hanya tampil data "dalam_perjalanan"
3. ✅ Urut dari tanggal **terbaru** (DESC)

### **5. Test di Halaman Jadwal:**

1. Buka `/dashboard/jadwal`
2. Klik filter **"Terjadwal"**
3. ✅ Sorting sama seperti di Pengiriman

### **6. Test dengan DevTools:**

```
Network Tab → Check API Request:

1. Tanpa filter:
   GET /api/pengiriman
   → Response: terjadwal di atas, urut tanggal ASC

2. Filter terjadwal:
   GET /api/pengiriman?status=terjadwal
   → Response: hanya terjadwal, urut tanggal ASC

3. Filter lain:
   GET /api/pengiriman?status=dalam_perjalanan
   → Response: hanya dalam_perjalanan, urut tanggal DESC
```

---

## 📋 Checklist Verifikasi

- ✅ Filter "Terjadwal" muncul di bar filter (icon calendar)
- ✅ Filter "Terjadwal" menampilkan hanya data terjadwal
- ✅ Data terjadwal diurutkan tanggal terdekat (ASC)
- ✅ Default: "terjadwal" di paling atas
- ✅ Default: dalam "terjadwal", urut tanggal ASC
- ✅ Default: status lain di bawah "terjadwal"
- ✅ Filter lain: urut tanggal terbaru (DESC)
- ✅ Badge "terjadwal" berwarna biru dengan icon calendar
- ✅ Select options di modal include "terjadwal"
- ✅ Konsisten di halaman Pengiriman & Jadwal
- ✅ Backend sorting SQL benar (CASE + ORDER BY)

---

## 💡 Logic Sorting Explained

### **SQL CASE Statement:**

```sql
ORDER BY 
  CASE status 
    WHEN 'terjadwal' THEN 0      -- Priority 1 (paling atas)
    WHEN 'dalam_pengiriman' THEN 1  -- Priority 2
    WHEN 'diterima' THEN 2       -- Priority 3
    WHEN 'gagal' THEN 3          -- Priority 4
    ELSE 4                       -- Priority 5 (lainnya)
  END,
  tanggal ASC                    -- Within same status, sort by date
```

**Cara Kerja:**

1. **CASE** memberi angka prioritas ke setiap status
2. **ORDER BY CASE** mengurutkan berdasarkan angka prioritas (0,1,2,3)
3. **tanggal ASC** mengurutkan data dengan status sama berdasarkan tanggal terdekat

**Contoh:**

```
Data Asli:
- dalam_perjalanan (2026-04-15)
- terjadwal (2026-04-14)
- diterima (2026-04-13)
- terjadwal (2026-04-16)

Setelah CASE:
- terjadwal (2026-04-14) → priority 0, date ASC → #1
- terjadwal (2026-04-16) → priority 0, date ASC → #2
- dalam_perjalanan (...) → priority 1 → #3
- diterima (...) → priority 2 → #4
```

---

## 🔮 Best Practices untuk Masa Depan

### **Jika Tambah Status Baru:**

**1. Update backend CASE:**
```javascript
query += ' ORDER BY CASE p.status WHEN \'terjadwal\' THEN 0 WHEN \'dalam_perjalanan\' THEN 1 WHEN \'diterima\' THEN 2 WHEN \'gagal\' THEN 3 WHEN \'STATUS_BARU\' THEN 4 ELSE 5 END, jd.tanggal ASC';
```

**2. Update frontend config:**
```typescript
const statusConfig = {
  terjadwal: { badge: 'badge-blue', icon: Calendar },
  // ... status lain
  status_baru: { badge: 'badge-purple', icon: Star },  // ✅ NEW
};
```

**3. Update filter options:**
```typescript
const filterOptions = [
  // ... filter lain
  { value: 'status_baru', label: 'Status Baru', icon: Star },  // ✅ NEW
];
```

### **Jika Ubah Urutan Priority:**

```javascript
// Ubah angka di CASE
CASE status 
  WHEN 'terjadwal' THEN 1      // Turunkan priority
  WHEN 'dalam_pengiriman' THEN 0  // Naikkan priority
  // ...
END
```

---

## 📝 File yang Diubah

| File | Perubahan |
|------|-----------|
| `backend/server.js` | Sorting logic `/api/pengiriman` (CASE + ORDER BY) |
| `backend/server.js` | Sorting logic `/api/jadwal` (CASE + ORDER BY) |
| `frontend/app/dashboard/pengiriman/page.tsx` | Tambah filter "terjadwal" + config |
| `frontend/app/dashboard/pengiriman/page.tsx` | Update select options di modal |

**Total:** 3 file (2 backend, 1 frontend)

---

## 🎓 Referensi SQL Sorting

### **SQLite CASE Expression:**
```sql
-- Simple CASE
CASE column
  WHEN value1 THEN result1
  WHEN value2 THEN result2
  ELSE default_result
END

-- Searched CASE
CASE
  WHEN condition1 THEN result1
  WHEN condition2 THEN result2
  ELSE default_result
END
```

### **ORDER BY Multiple Columns:**
```sql
ORDER BY 
  priority_column ASC,    -- Sort by priority first
  date_column ASC,        -- Then sort by date within same priority
  time_column ASC         -- Then sort by time within same date
```

---

**© 2026 - MBG Distribution System - Filter & Sorting "Terjadwal" Documentation**
