# 🏫 Role-Based Filtering untuk Data Sekolah

> **Tanggal:** 14 April 2026  
> **Status:** ✅ Implemented  
> **Fitur:** Filter otomatis sekolah berdasarkan role kurir/supplier  

---

## 🎯 Kebutuhan yang Diimplementasikan

### **1. Admin (admin_bgn, admin_daerah)**
- ✅ Bisa melihat **SEMUA sekolah**
- ✅ Bisa menambah, edit, hapus sekolah
- ✅ Lihat kolom "Dapur Pembina" untuk info dapur mana yang membina

### **2. Kurir**
- ✅ Hanya melihat **sekolah yang dibina oleh dapur mereka**
- ✅ Tidak bisa menambah/edit/hapus (read-only)
- ✅ Banner info: "Mode Tampilan: Sekolah Binaan"

### **3. Supplier**
- ✅ Hanya melihat **sekolah yang dibina oleh dapur mereka**
- ✅ Tidak bisa menambah/hapus (read-only)
- ✅ Banner info: "Mode Tampilan: Sekolah Binaan"

---

## 🔧 Implementasi Backend

### **API `/api/sekolah`**

**File:** `backend/server.js` (line ~158)

#### **Sebelum:**
```javascript
let query = 'SELECT * FROM sekolah WHERE 1=1';

// Tidak ada filter berdasarkan role
// Semua user lihat semua sekolah
```

#### **Sesudah:**
```javascript
let query = `SELECT s.*, 
  (SELECT GROUP_CONCAT(ds.nama) FROM dapur_sekolah dsk JOIN dapur_supplier ds ON dsk.dapur_id = ds.id WHERE dsk.sekolah_id = s.id AND dsk.status = 'aktif') as dapur_pembina
  FROM sekolah s WHERE 1=1`;

// FILTER OTOMATIS UNTUK KURIR - hanya lihat sekolah dari dapur mereka
if (req.user.role === 'kurir') {
  query += ' AND s.id IN (SELECT dsk.sekolah_id FROM dapur_sekolah dsk JOIN dapur_kurir dk ON dsk.dapur_id = dk.dapur_id WHERE dk.kurir_id = ? AND dsk.status = \'aktif\' AND dk.status = \'aktif\')';
  params.push(req.user.id);
}

// FILTER OTOMATIS UNTUK SUPPLIER - hanya lihat sekolah dari dapur mereka
if (req.user.role === 'supplier') {
  query += ' AND s.id IN (SELECT dsk.sekolah_id FROM dapur_sekolah dsk JOIN dapur_supplier ds ON dsk.dapur_id = ds.id WHERE ds.user_id = ? AND dsk.status = \'aktif\')';
  params.push(req.user.id);
}
```

---

## 📊 SQL Query Explained

### **1. Subquery `dapur_pembina`:**

```sql
SELECT s.*, 
  (SELECT GROUP_CONCAT(ds.nama) 
   FROM dapur_sekolah dsk 
   JOIN dapur_supplier ds ON dsk.dapur_id = ds.id 
   WHERE dsk.sekolah_id = s.id AND dsk.status = 'aktif') as dapur_pembina
FROM sekolah s
```

**Hasil:**
| id | nama | alamat | ... | dapur_pembina |
|----|------|--------|-----|---------------|
| 1 | SDN 1 | Jl. A | ... | Dapur MBG Banjarnegara |
| 2 | SDN 2 | Jl. B | ... | Catering Berkah,Dapur Sehat |
| 3 | SDN 3 | Jl. C | ... | NULL |

**Penjelasan:**
- `GROUP_CONCAT` menggabungkan semua nama dapur yang membina sekolah
- Jika sekolah dibina multiple dapur, dipisahkan koma
- Jika tidak ada, NULL

---

### **2. Filter untuk Kurir:**

```sql
-- Kurir hanya lihat sekolah dari dapur mereka
WHERE s.id IN (
  SELECT dsk.sekolah_id 
  FROM dapur_sekolah dsk 
  JOIN dapur_kurir dk ON dsk.dapur_id = dk.dapur_id 
  WHERE dk.kurir_id = ?              -- ID kurir yang login
    AND dsk.status = 'aktif' 
    AND dk.status = 'aktif'
)
```

**Flow:**
1. Ambil `dapur_id` dari `dapur_kurir` berdasarkan `kurir_id`
2. Cari `sekolah_id` dari `dapur_sekolah` berdasarkan `dapur_id`
3. Filter sekolah yang ID-nya ada di list tersebut

**Contoh:**
```
Kurir: kurir.dapurmbg@mbg.go.id (ID: 3)
  ↓
dapur_kurir: kurir_id=3 → dapur_id=1 (Dapur MBG Banjarnegara)
  ↓
dapur_sekolah: dapur_id=1 → sekolah_id=1,2,3,4,5
  ↓
Hasil: Hanya sekolah ID 1,2,3,4,5 yang ditampilkan
```

---

### **3. Filter untuk Supplier:**

```sql
-- Supplier hanya lihat sekolah dari dapur mereka
WHERE s.id IN (
  SELECT dsk.sekolah_id 
  FROM dapur_sekolah dsk 
  JOIN dapur_supplier ds ON dsk.dapur_id = ds.id 
  WHERE ds.user_id = ?                -- ID user supplier yang login
    AND dsk.status = 'aktif'
)
```

**Flow:**
1. Ambil `dapur_id` dari `dapur_supplier` berdasarkan `user_id`
2. Cari `sekolah_id` dari `dapur_sekolah` berdasarkan `dapur_id`
3. Filter sekolah yang ID-nya ada di list tersebut

---

## 🎨 Implementasi Frontend

### **File:** `frontend/app/dashboard/sekolah/page.tsx`

#### **1. Tambah Interface Field:**

```typescript
interface Sekolah {
  id: number;
  nama: string;
  // ... field lain
  dapur_pembina: string | null; // NEW: Nama dapur yang membina
}
```

#### **2. Check User Role:**

```typescript
const isKurir = user?.role === 'kurir';
const isSupplier = user?.role === 'supplier';
const isAdmin = user?.role === 'admin_bgn' || user?.role === 'admin_daerah';
```

#### **3. Dynamic Description & Banner:**

```tsx
<AdminLayout
  title="Data Sekolah"
  description={isKurir || isSupplier 
    ? `Sekolah binaan dari dapur Anda (${user?.role === 'kurir' ? 'Kurir' : 'Supplier'})` 
    : "Kelola data sekolah penerima MBG di Banjarnegara"
  }
>
  {/* Info Banner for Non-Admin */}
  {(isKurir || isSupplier) && (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-3">
      <Store size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-semibold text-blue-800">Mode Tampilan: Sekolah Binaan</h3>
        <p className="text-sm text-blue-700 mt-1">
          Anda hanya melihat sekolah yang dibina oleh dapur Anda. Hubungi admin untuk melihat semua sekolah.
        </p>
      </div>
    </div>
  )}
```

#### **4. Kolom "Dapur Pembina" di Table:**

```tsx
<thead>
  <tr>
    <th>Nama Sekolah</th>
    <th>Kecamatan</th>
    <th className="hidden md:table-cell">Alamat</th>
    <th className="hidden lg:table-cell">Dapur Pembina</th>  {/* NEW */}
    <th className="text-right">Siswa</th>
    <th className="hidden lg:table-cell">Kontak</th>
    <th>Status</th>
    <th className="text-right">Aksi</th>
  </tr>
</thead>
```

#### **5. Render Dapur Pembina Badge:**

```tsx
<td className="hidden lg:table-cell">
  {sekolah.dapur_pembina ? (
    <div className="flex flex-wrap gap-1">
      {sekolah.dapur_pembina.split(',').map((dapur, idx) => (
        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">
          <Store size={10} />
          {dapur.trim()}
        </span>
      ))}
    </div>
  ) : (
    <span className="text-zinc-400 text-xs italic">Belum ada</span>
  )}
</td>
```

---

## 📊 Ilustrasi Data

### **Scenario 1: Admin Login**

```
User: admin@mbg.go.id (role: admin_bgn)

Query: SELECT * FROM sekolah (TANPA FILTER)

Hasil: SEMUA SEKOLAH (20 sekolah)
┌────┬─────────────────┬───────────────┬──────────────────────────┐
│ ID │ Nama Sekolah    │ Kecamatan     │ Dapur Pembina            │
├────┼─────────────────┼───────────────┼──────────────────────────┤
│ 1  │ SDN 1           │ Banjarnegara  │ Dapur MBG Banjarnegara   │
│ 2  │ SDN 2           │ Purwokerto    │ Catering Berkah          │
│ 3  │ SDN 3           │ Mandiraja     │ Dapur Sehat Mandiraja    │
│ 4  │ SDN 4           │ Banjarmangu   │ Kitchen Bawang           │
│ 5  │ SDN 5           │ Purwanegara   │ Catering Purwanegara     │
│ .. │ ...             │ ...           │ ...                      │
└────┴─────────────────┴───────────────┴──────────────────────────┘

UI:
- Tampil SEMUA sekolah
- Bisa Tambah, Edit, Hapus
- Banner info TIDAK muncul
```

---

### **Scenario 2: Kurir Dapur MBG Login**

```
User: kurir.dapurmbg@mbg.go.id (role: kurir)
Dapur: Dapur MBG Banjarnegara (ID: 1)

Query: SELECT * FROM sekolah WHERE id IN (1,2,3,4,5)
  (hanya sekolah yang dibina oleh Dapur MBG)

Hasil: 4 SEKOLAH (yang dibina oleh Dapur MBG)
┌────┬─────────────────┬───────────────┬──────────────────────────┐
│ ID │ Nama Sekolah    │ Kecamatan     │ Dapur Pembina            │
├────┼─────────────────┼───────────────┼──────────────────────────┤
│ 1  │ SDN 1           │ Banjarnegara  │ Dapur MBG Banjarnegara   │
│ 2  │ SDN 6           │ Banjarnegara  │ Dapur MBG Banjarnegara   │
│ 3  │ SDN 11          │ Banjarnegara  │ Dapur MBG Banjarnegara   │
│ 4  │ SDN 16          │ Banjarnegara  │ Dapur MBG Banjarnegara   │
└────┴─────────────────┴───────────────┴──────────────────────────┘

UI:
- Tampil HANYA sekolah binaan Dapur MBG
- Tidak bisa Tambah, Edit, Hapus (read-only)
- Banner info muncul: "Mode Tampilan: Sekolah Binaan"
- Description berubah: "Sekolah binaan dari dapur Anda (Kurir)"
```

---

### **Scenario 3: Kurir Catering Berkah Login**

```
User: kurir.berkah@mbg.go.id (role: kurir)
Dapur: Catering Berkah (ID: 2)

Query: SELECT * FROM sekolah WHERE id IN (6,7,8,9)
  (hanya sekolah yang dibina oleh Catering Berkah)

Hasil: 4 SEKOLAH (yang dibina oleh Catering Berkah)
┌────┬─────────────────┬───────────────┬──────────────────────────┐
│ ID │ Nama Sekolah    │ Kecamatan     │ Dapur Pembina            │
├────┼─────────────────┼───────────────┼──────────────────────────┤
│ 5  │ SDN 2           │ Purwokerto    │ Catering Berkah          │
│ 6  │ SDN 7           │ Purwokerto    │ Catering Berkah          │
│ 7  │ SDN 12          │ Purwokerto    │ Catering Berkah          │
│ 8  │ SDN 17          │ Purwokerto    │ Catering Berkah          │
└────┴─────────────────┴───────────────┴──────────────────────────┘

UI:
- Tampil HANYA sekolah binaan Catering Berkah
- Tidak bisa Tambah, Edit, Hapus (read-only)
- Banner info muncul
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

### **2. Test sebagai Admin:**

1. Login: `admin@mbg.go.id` / `admin123`
2. Buka `/dashboard/sekolah`
3. ✅ **Tampil SEMUA sekolah** (20 sekolah)
4. ✅ **Kolom "Dapur Pembina" tampil** dengan badge hijau
5. ✅ **Bisa Tambah, Edit, Hapus** sekolah
6. ✅ **Tidak ada banner info**

### **3. Test sebagai Kurir Dapur MBG:**

1. Login: `kurir.dapurmbg@mbg.go.id` / `kurir123`
2. Buka `/dashboard/sekolah`
3. ✅ **Hanya tampil 4 sekolah** (yang dibina Dapur MBG)
4. ✅ **Banner info muncul**: "Mode Tampilan: Sekolah Binaan"
5. ✅ **Tidak ada tombol "Tambah Sekolah"**
6. ✅ **Tidak ada tombol Edit/Hapus**
7. ✅ **Description berubah**: "Sekolah binaan dari dapur Anda (Kurir)"

### **4. Test sebagai Kurir Catering Berkah:**

1. Login: `kurir.berkah@mbg.go.id` / `kurir123`
2. Buka `/dashboard/sekolah`
3. ✅ **Hanya tampil 4 sekolah** (yang dibina Catering Berkah)
4. ✅ **Sekolah berbeda** dari Dapur MBG
5. ✅ **Banner info muncul**

### **5. Test sebagai Supplier:**

1. Login: `dapur1@mbg.go.id` / `dapur123`
2. Buka `/dashboard/sekolah`
3. ✅ **Hanya tampil sekolah dari dapur supplier ini**
4. ✅ **Banner info muncul**: "Mode Tampilan: Sekolah Binaan"
5. ✅ **Description berubah**: "Sekolah binaan dari dapur Anda (Supplier)"

### **6. Test Search:**

```
Sebagai Kurir:
- Search "SDN 1" → ✅ Muncul (karena termasuk sekolah binaan)
- Search "SDN 2" → ❌ Tidak muncul (karena bukan sekolah binaan)

Search hanya bekerja pada data yang sudah difilter oleh backend
```

---

## 📋 Checklist Verifikasi

- ✅ Admin bisa lihat semua sekolah
- ✅ Admin bisa tambah/edit/hapus sekolah
- ✅ Kurir hanya lihat sekolah binaan dapur mereka
- ✅ Supplier hanya lihat sekolah binaan dapur mereka
- ✅ Kurir tidak bisa tambah/edit/hapus (read-only)
- ✅ Supplier tidak bisa tambah/hapus (read-only)
- ✅ Banner info muncul untuk non-admin
- ✅ Description berubah sesuai role
- ✅ Kolom "Dapur Pembina" tampil untuk admin
- ✅ Badge dapur pembina berwarna hijau dengan icon Store
- ✅ Search bekerja pada data yang sudah difilter
- ✅ Empty state message berbeda untuk non-admin

---

## 📝 File yang Diubah

| File | Perubahan |
|------|-----------|
| `backend/server.js` | Filter role kurir/supplier di `/api/sekolah` |
| `backend/server.js` | Subquery `dapur_pembina` |
| `frontend/app/dashboard/sekolah/page.tsx` | Interface `dapur_pembina` |
| `frontend/app/dashboard/sekolah/page.tsx` | Role check & banner info |
| `frontend/app/dashboard/sekolah/page.tsx` | Kolom "Dapur Pembina" di table |
| `frontend/app/dashboard/sekolah/page.tsx` | Dynamic description |
| `frontend/app/dashboard/sekolah/page.tsx` | Empty state message |

**Total:** 2 file (1 backend, 1 frontend)

---

## 🔮 Best Practices untuk Masa Depan

### **Jika Tambah Role Baru:**

```javascript
// Contoh: Role "kepala_sekolah"
if (req.user.role === 'kepala_sekolah') {
  // Hanya lihat sekolah mereka sendiri
  query += ' AND s.id = ?';
  params.push(req.user.sekolah_id);
}
```

### **Jika Tambah Filter Lain:**

```javascript
// Filter berdasarkan kecamatan
if (kecamatan) { 
  query += ' AND s.kecamatan = ?'; 
  params.push(kecamatan); 
}

// Filter tetap berlaku setelah role filter
// Role filter = mandatory, other filters = optional
```

---

## 🎓 Security Notes

### **Mengapa Filter di Backend?**

1. **Cannot be bypassed via client-side** - User tidak bisa manipulasi di browser
2. **Consistent across all clients** - Semua frontend dapat data yang sama
3. **Single source of truth** - Logic filter hanya di satu tempat
4. **Prevent data leakage** - User tidak bisa akses data yang bukan hak mereka

### **Contoh Serangan yang Dicegah:**

```javascript
// ❌ SALAH: Filter di frontend saja
const allSekolah = await api.get('/sekolah'); // Return SEMUA data
const filtered = allSekolah.filter(s => s.dapur_id === user.dapur_id);
// User bisa buka DevTools dan akses allSekolah!

// ✅ BENAR: Filter di backend
const filteredSekolah = await api.get('/sekolah'); // Sudah difilter oleh backend
// User TIDAK bisa akses data lain, meskipun via DevTools
```

---

**© 2026 - MBG Distribution System - Role-Based Filtering for Sekolah Documentation**
