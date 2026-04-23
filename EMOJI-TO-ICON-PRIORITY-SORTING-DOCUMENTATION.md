# 🔄 Emoji to Icon Replacement & Priority Sorting Update

> **Tanggal:** 14 April 2026  
> **Status:** ✅ Complete  
> **Fitur:** Replace semua emoji dengan icon Lucide + "dalam_pengiriman" prioritas tertinggi  

---

## 🎯 Perubahan yang Dilakukan

### **1. Replace Semua Emoji dengan Icon Lucide**
- ✅ Semua emoji (📅🚚✅❌) diganti dengan icon Lucide yang sesuai
- ✅ Konsisten di semua halaman (Jadwal, Pengiriman, Kurir)
- ✅ Badge status menggunakan icon + text, bukan emoji

### **2. Ubah Priority Sorting**
- ✅ **"dalam_pengiriman"** sekarang jadi **priority #1** (paling atas)
- ✅ **"terjadwal"** jadi **priority #2**
- ✅ Status lain (diterima, gagal) di bawah

---

## 📋 Emoji yang Diganti

### **Halaman Jadwal (`jadwal/page.tsx`):**

| Lokasi | Sebelum | Sesudah | Icon Lucide |
|--------|---------|---------|-------------|
| Filter select | `📅 Terjadwal` | `Terjadwal` | `Calendar` |
| Filter select | `🚚 Dalam Pengiriman` | `Dalam Pengiriman` | `Truck` |
| Filter select | `✅ Diterima` | `Diterima` | `CheckCircle2` |
| Filter select | `❌ Gagal` | `Gagal` | `AlertTriangle` |
| Badge status | `🚚 Sedang Jalan` | `Sedang Jalan` | `Truck` (size 12) |
| Badge status | `✅ Selesai` | `Selesai` | `CheckCircle2` (size 12) |
| Modal generate | `🚚 {kurir}` | `{kurir}` + icon | `Truck` (size 14) |
| Modal generate | `📅 Terjadwal` | `Terjadwal` + icon | `Calendar` (size 12) |

### **Halaman Pengiriman (`pengiriman/page.tsx`):**

| Lokasi | Sebelum | Sesudah | Icon Lucide |
|--------|---------|---------|-------------|
| Config | Emoji di badge | Icon component | `Truck`, `Calendar`, dll |
| Filter button | Emoji di label | Icon component | Sesuai status |

### **Halaman Kurir (`kurir/page.tsx`):**

| Lokasi | Perubahan |
|--------|-----------|
| Import icons | `CheckCircle` → `CheckCircle2`, `AlertCircle` → `AlertTriangle` |

---

## 🔄 Priority Sorting yang Baru

### **Sebelum:**
```
Priority 0: terjadwal      ← PALING ATAS
Priority 1: dalam_pengiriman
Priority 2: diterima
Priority 3: gagal
```

### **Sesudah:**
```
Priority 0: dalam_pengiriman  ← PALING ATAS (ACTIVE DELIVERIES)
Priority 1: terjadwal
Priority 2: diterima
Priority 3: gagal
```

**Alasan:** Pengiriman yang sedang aktif (dalam_pengiriman) lebih penting untuk dipantau daripada yang belum mulai (terjadwal).

---

## 🔧 Implementasi Backend

### **1. API `/api/jadwal`**

**File:** `backend/server.js` (line ~373)

```javascript
// SORTING CERDAS:
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
```

### **2. API `/api/pengiriman`**

**File:** `backend/server.js` (line ~687)

```javascript
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
```

---

## 🎨 Implementasi Frontend

### **1. Halaman Jadwal**

**File:** `frontend/app/dashboard/jadwal/page.tsx`

#### **A. Icon Imports:**
```typescript
import { 
  Plus, Edit, Trash2, X as CloseIcon, Search, Calendar, Clock, 
  Truck, Zap, AlertCircle, PlayCircle, Filter, CheckCircle2, AlertTriangle 
} from 'lucide-react';
```

#### **B. Status Config:**
```typescript
const statusBadge: Record<string, string> = {
  dalam_pengiriman: 'badge-orange',
  terjadwal: 'badge-blue',
  diterima: 'badge-green',
  gagal: 'badge-red',
};

const statusLabel: Record<string, string> = {
  dalam_pengiriman: 'Dalam Pengiriman',
  terjadwal: 'Terjadwal',
  diterima: 'Diterima',
  gagal: 'Gagal',
};

const statusIcon: Record<string, typeof Truck> = {
  dalam_pengiriman: Truck,
  terjadwal: Calendar,
  diterima: CheckCircle2,
  gagal: AlertTriangle,
};
```

#### **C. Badge Rendering di Table:**
```tsx
<td>
  <span className={`badge ${statusBadge[jadwal.status] || 'badge-gray'}`}>
    {(() => {
      const IconComponent = statusIcon[jadwal.status] || Calendar;
      return <IconComponent size={12} />;
    })()}
    {statusLabel[jadwal.status] || jadwal.status}
  </span>
</td>
```

#### **D. Status Badges dengan Icon:**
```tsx
{/* Dalam pengiriman badge */}
{jadwal.status === 'dalam_pengiriman' && (
  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium flex items-center gap-1">
    <Truck size={12} />
    Sedang Jalan
  </span>
)}

{/* Diterima badge */}
{jadwal.status === 'diterima' && (
  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
    <CheckCircle2 size={12} />
    Selesai
  </span>
)}
```

#### **E. Modal Generate - Icon Replacement:**
```tsx
{/* Kurir info */}
<span className="text-blue-600 flex items-center gap-1">
  <Truck size={14} />
  {s.kurir}
</span>

{/* Status badge */}
<span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
  {s.status === 'terjadwal' ? (
    <>
      <Calendar size={12} />
      Terjadwal
    </>
  ) : (
    s.status
  )}
</span>
```

#### **F. Filter Select (No Emoji):**
```tsx
<select value={filterStatus} onChange={...} className="input text-sm">
  <option value="">Semua Status</option>
  <option value="dalam_pengiriman">Dalam Pengiriman</option>
  <option value="terjadwal">Terjadwal</option>
  <option value="diterima">Diterima</option>
  <option value="gagal">Gagal</option>
</select>
```

---

### **2. Halaman Pengiriman**

**File:** `frontend/app/dashboard/pengiriman/page.tsx`

#### **Icon Imports:**
```typescript
import {
  Truck, CheckCircle, AlertCircle, Clock, Filter, Edit, X, Eye, Camera, Navigation,
  Calendar, CheckCircle2, AlertTriangle,
} from 'lucide-react';
```

#### **Status Config:**
```typescript
const statusConfig: Record<string, { badge: string; icon: typeof Truck }> = {
  dalam_pengiriman: { badge: 'badge-orange', icon: Truck },
  terjadwal: { badge: 'badge-blue', icon: Calendar },
  diterima: { badge: 'badge-green', icon: CheckCircle2 },
  gagal: { badge: 'badge-red', icon: AlertTriangle },
};

const filterOptions = [
  { value: '', label: 'Semua', icon: Filter },
  { value: 'dalam_pengiriman', label: 'Dalam Perjalanan', icon: Truck },
  { value: 'terjadwal', label: 'Terjadwal', icon: Calendar },
  { value: 'diterima', label: 'Diterima', icon: CheckCircle2 },
  { value: 'gagal', label: 'Gagal', icon: AlertTriangle },
];
```

---

### **3. Halaman Kurir**

**File:** `frontend/app/dashboard/kurir/page.tsx`

#### **Icon Imports Update:**
```typescript
import {
  Truck, CheckCircle2, AlertTriangle, Clock, MapPin, Navigation, Send, Camera, X,
  Package, School, Store, StopCircle, Calendar,
} from 'lucide-react';
```

---

## 📊 Ilustrasi Sorting Baru

### **Default (Tanpa Filter):**

```
┌──────────────────────────────────────────┐
│ 🚚 Dalam Pengiriman │ 14 Apr 2026  ← #1 │ ← ACTIVE DELIVERIES (TOP)
├──────────────────────────────────────────┤
│ 🚚 Dalam Pengiriman │ 15 Apr 2026  ← #2 │
├──────────────────────────────────────────┤
│ 📅 Terjadwal │ 16 Apr 2026         ← #3 │
├──────────────────────────────────────────┤
│ 📅 Terjadwal │ 17 Apr 2026         ← #4 │
├──────────────────────────────────────────┤
│ ✅ Diterima │ 13 Apr 2026          ← #5 │
├──────────────────────────────────────────┤
│ ❌ Gagal │ 10 Apr 2026             ← #6 │
└──────────────────────────────────────────┘

Priority:
0: dalam_pengiriman  ← ACTIVE (PALING PENTING)
1: terjadwal
2: diterima
3: gagal
```

### **Filter "Dalam Pengiriman":**

```
┌──────────────────────────────────────────┐
│ 🚚 Dalam Pengiriman │ 14 Apr 2026  ← #1 │
├──────────────────────────────────────────┤
│ 🚚 Dalam Pengiriman │ 15 Apr 2026  ← #2 │
├──────────────────────────────────────────┤
│ 🚚 Dalam Pengiriman │ 16 Apr 2026  ← #3 │
└──────────────────────────────────────────┘

✅ Urut tanggal terdekat (ASC)
```

### **Filter "Terjadwal":**

```
┌──────────────────────────────────────────┐
│ 📅 Terjadwal │ 14 Apr 2026         ← #1 │
├──────────────────────────────────────────┤
│ 📅 Terjadwal │ 15 Apr 2026         ← #2 │
├──────────────────────────────────────────┤
│ 📅 Terjadwal │ 16 Apr 2026         ← #3 │
└──────────────────────────────────────────┘

✅ Urut tanggal terdekat (ASC)
```

---

## 🎨 Badge & Icon Configuration

### **Status Badge Colors & Icons:**

| Status | Badge Color | Icon | Size |
|--------|-------------|------|------|
| **dalam_pengiriman** | `badge-orange` (orange) | `Truck` 🚚 | 12px |
| **terjadwal** | `badge-blue` (biru) | `Calendar` 📅 | 12px |
| **diterima** | `badge-green` (hijau) | `CheckCircle2` ✅ | 12px |
| **gagal** | `badge-red` (merah) | `AlertTriangle` ❌ | 12px |

### **Visual di Table:**

```
┌──────────────────────────────────────────────────────────────┐
│ Tanggal    │ Status                          │ Aksi          │
├──────────────────────────────────────────────────────────────┤
│ 14 Apr 2026│ [🚚 Dalam Pengiriman] (orange)  │ ▶ Mulai       │
├──────────────────────────────────────────────────────────────┤
│ 15 Apr 2026│ [📅 Terjadwal] (biru)           │ ▶ Mulai       │
├──────────────────────────────────────────────────────────────┤
│ 13 Apr 2026│ [✅ Diterima] (hijau)           │ 👁️ View       │
└──────────────────────────────────────────────────────────────┘
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

### **2. Test Icon Replacement:**

#### **Halaman Jadwal:**
1. Login: `admin@mbg.go.id` / `admin123`
2. Buka `/dashboard/jadwal`
3. ✅ **Tidak ada emoji** di filter dropdown
4. ✅ **Badge status pakai icon** (bukan emoji)
5. ✅ **Modal generate** pakai icon Truck & Calendar

#### **Halaman Pengiriman:**
1. Buka `/dashboard/pengiriman`
2. ✅ **Filter buttons pakai icon** Lucide
3. ✅ **Badge status di table** pakai icon

#### **Halaman Kurir:**
1. Login: `kurir.dapurmbg@mbg.go.id` / `kurir123`
2. Buka `/dashboard/kurir`
3. ✅ **Icons konsisten** (CheckCircle2, AlertTriangle, dll)

### **3. Test Priority Sorting:**

#### **Default Sorting (Tanpa Filter):**
1. Buka `/dashboard/jadwal` atau `/dashboard/pengiriman`
2. **Pastikan ada data dengan status berbeda**
3. ✅ **"Dalam Pengiriman" paling atas** (priority 0)
4. ✅ **"Terjadwal" di bawahnya** (priority 1)
5. ✅ **"Diterima" dan "Gagal" di bawah** (priority 2-3)

#### **Filter "Dalam Pengiriman":**
1. Klik filter **"Dalam Perjalanan"**
2. ✅ Hanya tampil data "dalam_pengiriman"
3. ✅ Urut dari **tanggal terdekat** (ASC)

#### **Filter "Terjadwal":**
1. Klik filter **"Terjadwal"**
2. ✅ Hanya tampil data "terjadwal"
3. ✅ Urut dari **tanggal terdekat** (ASC)

### **4. Test dengan DevTools:**

```
Network Tab → Check API Response:

1. Tanpa filter:
   GET /api/jadwal
   → Response: dalam_pengiriman di atas (priority 0)

2. Filter dalam_pengiriman:
   GET /api/jadwal?status=dalam_pengiriman
   → Response: hanya dalam_pengiriman, urut tanggal ASC

3. Filter terjadwal:
   GET /api/jadwal?status=terjadwal
   → Response: hanya terjadwal, urut tanggal ASC
```

---

## 📋 Checklist Verifikasi

- ✅ Tidak ada emoji di halaman Jadwal
- ✅ Tidak ada emoji di halaman Pengiriman
- ✅ Tidak ada emoji di halaman Kurir
- ✅ Semua badge status pakai icon Lucide
- ✅ Filter dropdown tanpa emoji
- ✅ Modal generate tanpa emoji
- ✅ "dalam_pengiriman" priority #1 (paling atas)
- ✅ "terjadwal" priority #2
- ✅ Sorting konsisten di backend & frontend
- ✅ Filter "dalam_pengiriman" urut tanggal ASC
- ✅ Filter "terjadwal" urut tanggal ASC
- ✅ Icon size konsisten (12px di badge, 14px di info)

---

## 📝 File yang Diubah

| File | Perubahan |
|------|-----------|
| `backend/server.js` | Sorting logic `/api/jadwal` (priority baru) |
| `backend/server.js` | Sorting logic `/api/pengiriman` (priority baru) |
| `frontend/app/dashboard/jadwal/page.tsx` | Replace emoji + icon config + badge rendering |
| `frontend/app/dashboard/pengiriman/page.tsx` | Replace emoji + icon config |
| `frontend/app/dashboard/kurir/page.tsx` | Update icon imports |

**Total:** 5 file (2 backend, 3 frontend)

---

## 🎓 Icon Mapping Reference

### **Lucide Icons Used:**

| Icon | Import Name | Use Case |
|------|-------------|----------|
| 🚚 Truck | `Truck` | dalam_pengiriman status |
| 📅 Calendar | `Calendar` | terjadwal status |
| ✅ CheckCircle2 | `CheckCircle2` | diterima status |
| ❌ AlertTriangle | `AlertTriangle` | gagal status |
| 🔍 Filter | `Filter` | Filter button |
| ➕ Plus | `Plus` | Add button |
| ✏️ Edit | `Edit` | Edit button |
| 🗑️ Trash2 | `Trash2` | Delete button |
| ▶️ PlayCircle | `PlayCircle` | Start delivery |
| ⚡ Zap | `Zap` | Generate button |
| ⏰ Clock | `Clock` | Time display |

---

## 💡 Best Practices untuk Masa Depan

### **Jika Tambah Status Baru:**

**1. Pilih icon Lucide yang sesuai:**
```typescript
import { Star } from 'lucide-react';  // Contoh icon baru
```

**2. Update status config:**
```typescript
const statusBadge = {
  // ... status existing
  status_baru: 'badge-purple',
};

const statusIcon = {
  // ... icon existing
  status_baru: Star,
};
```

**3. Update backend CASE statement:**
```javascript
query += ' ORDER BY CASE jd.status WHEN \'dalam_pengiriman\' THEN 0 WHEN \'terjadwal\' THEN 1 WHEN \'status_baru\' THEN 2 ...';
```

### **Jika Ubah Priority:**

```javascript
// Ubah angka di CASE statement
CASE jd.status 
  WHEN 'dalam_pengiriman' THEN 0  // Priority tertinggi
  WHEN 'terjadwal' THEN 1
  WHEN 'status_baru' THEN 2       // Tambah priority baru
  // ...
END
```

---

## 🎨 Design Rationale

### **Kenapa "dalam_pengiriman" Priority #1?**

1. **Operational Importance:** Pengiriman aktif lebih penting untuk dipantau
2. **Real-time Tracking:** Kurir yang sedang jalan butuh perhatian segera
3. **Action Required:** Mungkin ada masalah yang perlu ditangani cepat
4. **Visibility:** Admin perlu lihat pengiriman aktif dulu

### **Kenapa Icon bukan Emoji?**

1. **Consistency:** Icon Lucide konsisten dengan seluruh UI
2. **Scalability:** Icon bisa di-resize tanpa loss quality
3. **Theme Support:** Icon bisa di-styling (color, size)
4. **Accessibility:** Icon lebih mudah di-custom untuk screen readers
5. **Professional Look:** Icon terlihat lebih profesional dari emoji

---

**© 2026 - MBG Distribution System - Emoji to Icon & Priority Sorting Update**
