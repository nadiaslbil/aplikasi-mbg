# 📊 Role-Based Dashboard Implementation

> **Tanggal:** 14 April 2026  
> **Status:** ✅ Implemented  
> **Fitur:** Dashboard terpisah per role (Admin, Kurir, Supplier)  

---

## 🎯 Struktur Dashboard per Role

| Role | Dashboard URL | Deskripsi | Status |
|------|---------------|-----------|--------|
| **Admin** | `/dashboard` | Monitoring & management keseluruhan | ✅ Dedicated (admin only) |
| **Kurir** | `/dashboard/kurir` | Tugas pengiriman & GPS tracking | ✅ Sudah ada |
| **Supplier** | `/dashboard/supplier` | Aktivitas dapur & stok | ✅ BARU! |

---

## 🔧 Implementasi

### **1. Admin Dashboard (`/dashboard`)**

**File:** `frontend/app/dashboard/page.tsx`

**Access:** Hanya `admin_bgn` dan `admin_daerah`

**Redirect Logic:**
```typescript
useEffect(() => {
  if (user.role === 'kurir') {
    router.replace('/dashboard/kurir');
    return;
  }
  if (user.role === 'supplier') {
    router.replace('/dashboard/supplier');
    return;
  }
  // Only admin_bgn and admin_daerah stay here
}, [user, isLoading]);
```

**Content:**
- 📊 Statistik keseluruhan (sekolah, dapur, jadwal, insiden)
- 🗺️ Peta distribusi MBG
- 🚚 Live tracking panel
- 📈 Statistik pengiriman

---

### **2. Kurir Dashboard (`/dashboard/kurir`)**

**File:** `frontend/app/dashboard/kurir/page.tsx`

**Access:** Hanya role `kurir`

**Content:**
- 📋 Daftar tugas pengiriman
- 🧭 GPS control (start/stop tracking)
- 🏫 Sekolah binaan card
- ⚡ Quick actions (update status, upload foto)

---

### **3. Supplier Dashboard (`/dashboard/supplier`)**

**File:** `frontend/app/dashboard/supplier/page.tsx` (BARU!)

**Access:** Hanya role `supplier`

**Content:**
- 📊 Statistik dapur (jadwal hari ini, pengiriman bulan ini)
- 📅 Jadwal pengiriman hari ini
- 📦 Stok perlu perhatian (hampir expired/habis)
- 🏫 Info dapur & sekolah binaan

**Backend API:**
```javascript
// GET /api/dashboard/supplier-stats
// Filtered by supplier's dapur
{
  dapur: { id, nama, kapasitas_harian },
  jadwal_hari_ini: { total, terjadwal, dalam_pengiriman, diterima, gagal },
  pengiriman_bulan_ini: number,
  insiden_bulan_ini: number,
  stok_hampir_expired: number,
  sekolah_binaan: number,
}
```

---

## 📋 Sidebar Menu per Role

| Menu Item | Admin | Kurir | Supplier |
|-----------|-------|-------|----------|
| Dashboard | ✅ | ❌ | ❌ |
| Dashboard Dapur | ❌ | ❌ | ✅ |
| Dashboard Kurir | ❌ | ✅ | ❌ |
| Peta Banjarnegara | ✅ | ❌ | ❌ |
| Data Sekolah | ✅ | ✅ | ✅ |
| Data Dapur | ✅ | ❌ | ✅ |
| Assign Kurir | ✅ | ❌ | ❌ |
| Assign Sekolah | ✅ | ❌ | ❌ |
| Jadwal Distribusi | ✅ | ✅ | ✅ |
| Pengiriman | ✅ | ✅ | ✅ |
| Stok Bahan | ✅ | ❌ | ✅ |
| Insiden | ✅ | ✅ | ✅ |
| Manajemen User | ✅ | ❌ | ❌ |

---

## 🧪 Cara Test

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

### **Test Admin:**
1. Login: `admin@mbg.go.id` / `admin123`
2. ✅ Dashboard menampilkan statistik keseluruhan
3. ✅ Sidebar menu "Dashboard" tampil
4. ✅ Sidebar menu "Dashboard Dapur" TIDAK tampil
5. ✅ Sidebar menu "Dashboard Kurir" TIDAK tampil

### **Test Kurir:**
1. Login: `kurir.dapurmbg@mbg.go.id` / `kurir123`
2. ✅ Redirect otomatis ke `/dashboard/kurir`
3. ✅ Sidebar menu "Dashboard Kurir" tampil
4. ✅ Sidebar menu "Dashboard" TIDAK tampil
5. ✅ Sidebar menu "Dashboard Dapur" TIDAK tampil

### **Test Supplier:**
1. Login: `dapur1@mbg.go.id` / `dapur123`
2. ✅ Redirect otomatis ke `/dashboard/supplier`
3. ✅ Dashboard menampilkan:
   - Jadwal pengiriman hari ini
   - Stok perlu perhatian
   - Info dapur & sekolah binaan
4. ✅ Sidebar menu "Dashboard Dapur" tampil
5. ✅ Sidebar menu "Dashboard" TIDAK tampil
6. ✅ Sidebar menu "Dashboard Kurir" TIDAK tampil

---

## 📝 File yang Diubah

| File | Perubahan |
|------|-----------|
| `frontend/app/dashboard/page.tsx` | Redirect logic untuk non-admin |
| `frontend/app/dashboard/supplier/page.tsx` | **BARU!** Dashboard supplier |
| `backend/server.js` | API `/api/dashboard/supplier-stats` |
| `frontend/components/AdminLayout.tsx` | Menu "Dashboard Dapur" untuk supplier |

**Total:** 4 file (1 backend, 3 frontend)

---

**© 2026 - MBG Distribution System - Role-Based Dashboard Documentation**
