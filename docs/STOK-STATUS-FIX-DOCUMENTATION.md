# 🔧 FIX: Status Stok Tidak Berubah Saat Jumlah 0

> **Tanggal:** 14 April 2026  
> **Status:** ✅ Fixed  
> **Masalah:** Stok dengan jumlah 0 masih menampilkan status "Aman"  

---

## 🐛 Masalah yang Ditemukan

Saat stok bahan mencapai jumlah **0**, status masih tetap **"Aman"** (badge hijau), padahal seharusnya menunjukkan bahwa stok sudah habis.

### Ilustrasi Masalah:

```
┌──────────────┬────────┬──────────────┬─────────────┐
│ Nama Bahan   │ Jumlah │ Kadaluarsa   │ Status      │
├──────────────┼────────┼──────────────┼─────────────┤
│ Beras        │ 0 kg   │ 01 Mei 2026  │ ✅ Aman     │ ← SALAH!
│ Ayam         │ 50 kg  │ 15 Apr 2026  │ ✅ Aman     │
└──────────────┴────────┴──────────────┴─────────────┘

Stok sudah habis tapi status masih "Aman"! ❌
```

---

## ✅ Solusi yang Diterapkan

### **1. Tambah Helper Function `getStokStatus()`**

**File:** `frontend/app/dashboard/stok/page.tsx` (line ~125)

```typescript
// Helper untuk menentukan status stok
const getStokStatus = (stok: Stok) => {
  const expired = isExpired(stok.expired_date);
  const expiringSoon = isExpiringSoon(stok.expired_date);
  const habis = stok.jumlah === 0;

  if (expired || habis) {
    if (expired && habis) return { badge: 'badge-red', label: 'Expired & Habis' };
    if (expired) return { badge: 'badge-red', label: 'Expired' };
    return { badge: 'badge-red', label: 'Habis' };
  }
  if (expiringSoon) return { badge: 'badge-yellow', label: 'Hampir Expired' };
  return { badge: 'badge-green', label: 'Aman' };
};
```

**Logic Status:**

| Kondisi | Badge | Label | Warna |
|---------|-------|-------|-------|
| `jumlah === 0` | `badge-red` | **Habis** | 🔴 Merah |
| `expired && jumlah === 0` | `badge-red` | **Expired & Habis** | 🔴 Merah |
| `expired` | `badge-red` | **Expired** | 🔴 Merah |
| `expiringSoon` (≤ 3 hari) | `badge-yellow` | **Hampir Expired** | 🟡 Kuning |
| Normal | `badge-green` | **Aman** | 🟢 Hijau |

---

### **2. Update Badge Rendering di Table**

**Sebelum:**
```tsx
<td>
  {expired ? (
    <span className="badge badge-red">Expired</span>
  ) : expiringSoon ? (
    <span className="badge badge-yellow">Hampir Expired</span>
  ) : (
    <span className="badge badge-green">Aman</span>
  )}
</td>
```

**Sesudah:**
```tsx
<td>
  {(() => {
    const status = getStokStatus(stok);
    return <span className={`badge ${status.badge}`}>{status.label}</span>;
  })()}
</td>
```

---

### **3. Update Alert Counter**

**Sebelum:**
```typescript
const expiredCount = stokList.filter(s => isExpiringSoon(s.expired_date) || isExpired(s.expired_date)).length;
```

**Sesudah:**
```typescript
const expiredCount = stokList.filter(s => 
  isExpiringSoon(s.expired_date) || 
  isExpired(s.expired_date) || 
  s.jumlah === 0  // ✅ NEW: Include stok habis
).length;
```

---

### **4. Update Alert Message**

**Sebelum:**
```tsx
<p>{expiredCount} bahan hampir expired atau sudah expired</p>
<p>Segera cek dan ganti bahan yang mendekati tanggal kadaluarsa</p>
```

**Sesudah:**
```tsx
<p>{expiredCount} bahan hampir expired, sudah expired, atau stok habis</p>
<p>Segera cek dan ganti bahan yang mendekati tanggal kadaluarsa atau stok yang sudah habis</p>
```

---

### **5. Update Button Filter**

**Sebelum:**
```tsx
<button>
  <AlertTriangle size={14} /> Hampir Expired ({expiredCount})
</button>
```

**Sesudah:**
```tsx
<button>
  <AlertTriangle size={14} /> Perlu Perhatian ({expiredCount})
</button>
```

---

## 📊 Ilustrasi Setelah Fix

```
┌──────────────┬────────┬──────────────┬──────────────────┐
│ Nama Bahan   │ Jumlah │ Kadaluarsa   │ Status           │
├──────────────┼────────┼──────────────┼──────────────────┤
│ Beras        │ 0 kg   │ 01 Mei 2026  │ 🔴 Habis         │ ✅
│ Gula         │ 0 kg   │ 10 Apr 2026  │ 🔴 Expired & Habis│ ✅
│ Ayam         │ 50 kg  │ 15 Apr 2026  │ ✅ Aman           │
│ Telur        │ 20 kg  │ 16 Apr 2026  │ 🟡 Hampir Expired│
└──────────────┴────────┴──────────────┴──────────────────┘

Status sekarang benar! ✅
```

---

## 🎨 Visual Status Badge

### **Semua Kondisi:**

| Status | Badge | Warna | Kapan Muncul |
|--------|-------|-------|--------------|
| **Habis** | `badge-red` | 🔴 Merah | `jumlah === 0` |
| **Expired & Habis** | `badge-red` | 🔴 Merah | `expired && jumlah === 0` |
| **Expired** | `badge-red` | 🔴 Merah | `expired_date < hari ini` |
| **Hampir Expired** | `badge-yellow` | 🟡 Kuning | `expired_date ≤ 3 hari lagi` |
| **Aman** | `badge-green` | 🟢 Hijau | Normal (tidak ada masalah) |

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

### **2. Test Stok Habis:**

1. Login: `admin@mbg.go.id` / `admin123`
2. Buka `/dashboard/stok`
3. Edit salah satu stok, ubah jumlah menjadi **0**
4. Klik **"Update"**
5. ✅ **Status berubah jadi "Habis"** (badge merah)
6. ✅ **Alert counter bertambah** (include stok habis)

### **3. Test Stok Expired & Habis:**

1. Edit stok dengan jumlah **0** DAN expired_date **sudah lewat**
2. ✅ **Status: "Expired & Habis"** (badge merah)

### **4. Test Alert Message:**

1. Pastikan ada stok dengan jumlah 0
2. ✅ **Alert muncul**: "X bahan hampir expired, sudah expired, atau stok habis"
3. ✅ **Counter bertambah** (include stok habis)

### **5. Test Filter "Perlu Perhatian":**

1. Klik button **"Perlu Perhatian (X)"**
2. ✅ **Filter menampilkan:**
   - Stok hampir expired (≤ 3 hari)
   - Stok sudah expired
   - Stok habis (jumlah 0)

---

## 📋 Checklist Verifikasi

- ✅ Stok jumlah 0 → status "Habis" (badge merah)
- ✅ Stok expired & habis → status "Expired & Habis" (badge merah)
- ✅ Stok hampir expired → status "Hampir Expired" (badge kuning)
- ✅ Stok normal → status "Aman" (badge hijau)
- ✅ Alert counter include stok habis
- ✅ Alert message updated (include "stok habis")
- ✅ Button filter text updated ("Perlu Perhatian")
- ✅ Filter "Perlu Perhatian" include stok habis
- ✅ Empty state message appropriate

---

## 📝 File yang Diubah

| File | Perubahan |
|------|-----------|
| `frontend/app/dashboard/stok/page.tsx` | Tambah `getStokStatus()` helper |
| `frontend/app/dashboard/stok/page.tsx` | Update badge rendering |
| `frontend/app/dashboard/stok/page.tsx` | Update `expiredCount` logic |
| `frontend/app/dashboard/stok/page.tsx` | Update alert message |
| `frontend/app/dashboard/stok/page.tsx` | Update button filter text |

**Total:** 1 file (frontend)

---

## 🎓 Logic Flowchart

```
getStokStatus(stok):
  ├─ expired = isExpired(stok.expired_date)
  ├─ expiringSoon = isExpiringSoon(stok.expired_date)
  └─ habis = (stok.jumlah === 0)
  
  ├─ IF expired OR habis:
  │   ├─ IF expired AND habis → "Expired & Habis" 🔴
  │   ├─ IF expired only → "Expired" 🔴
  │   └─ IF habis only → "Habis" 🔴
  │
  ├─ ELSE IF expiringSoon → "Hampir Expired" 🟡
  │
  └─ ELSE → "Aman" 🟢
```

---

## 💡 Best Practices untuk Masa Depan

### **1. Tambah Threshold untuk "Stok Menipis":**

```typescript
const getStokStatus = (stok: Stok) => {
  // ... logic existing
  
  const menipis = stok.jumlah > 0 && stok.jumlah < 10; // Threshold 10
  
  if (menipis) return { badge: 'badge-orange', label: 'Menipis' };
  // ... rest of logic
};
```

### **2. Tambah Alert untuk Stok Menipis:**

```tsx
const lowStockCount = stokList.filter(s => s.jumlah > 0 && s.jumlah < 10).length;

{lowStockCount > 0 && (
  <div className="bg-orange-50 border border-orange-200 ...">
    <p>{lowStockCount} stok menipis (kurang dari 10 {satuan})</p>
  </div>
)}
```

### **3. Tambah Filter "Stok Habis":**

```tsx
const [filterStatus, setFilterStatus] = useState('');

const filteredStok = stokList.filter(s => {
  if (filterStatus === 'habis') return s.jumlah === 0;
  if (filterStatus === 'menipis') return s.jumlah > 0 && s.jumlah < 10;
  // ... other filters
});
```

---

## 🎯 Perbandingan Sebelum & Sesudah

### **Sebelum:**

```
┌──────────────┬────────┬─────────────┐
│ Nama Bahan   │ Jumlah │ Status      │
├──────────────┼────────┼─────────────┤
│ Beras        │ 0 kg   │ ✅ Aman     │ ← SALAH!
│ Gula         │ 50 kg  │ ✅ Aman     │
└──────────────┴────────┴─────────────┘

Stok 0 tapi status "Aman" ❌
```

### **Sesudah:**

```
┌──────────────┬────────┬─────────────┐
│ Nama Bahan   │ Jumlah │ Status      │
├──────────────┼────────┼─────────────┤
│ Beras        │ 0 kg   │ 🔴 Habis    │ ✅ BENAR!
│ Gula         │ 50 kg  │ ✅ Aman     │
└──────────────┴────────┴─────────────┘

Stok 0 → status "Habis" ✅
```

---

**© 2026 - MBG Distribution System - Stok Status Fix Documentation**
