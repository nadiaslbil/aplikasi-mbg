# 🔧 FIX: Error Update Stok Bahan (Missing PUT & DELETE Routes)

> **Tanggal:** 14 April 2026  
> **Status:** ✅ Fixed  
> **Masalah:** Tidak bisa update/delete data stok bahan  

---

## 🐛 Masalah yang Ditemukan

Saat mencoba mengupdate data stok bahan, muncul **error "Terjadi kesalahan"** atau **404/405 Method Not Allowed**.

### Penyebab Utama:

1. **Route PUT `/api/stok/:id` tidak ada** di `server.js`
2. **Route DELETE `/api/stok/:id` tidak ada** di `server.js`
3. Hanya ada route **GET** dan **POST** untuk stok
4. File `routes/stok.js` sudah punya route PUT & DELETE, tapi **tidak di-mount** ke `server.js`

### Ilustrasi Masalah:

```
API Endpoints yang ADA:
✅ GET    /api/stok       - Get all stok
✅ POST   /api/stok       - Create stok
❌ PUT    /api/stok/:id   - TIDAK ADA! ← PENYEBAB ERROR
❌ DELETE /api/stok/:id   - TIDAK ADA!

Frontend mencoba:
await api.put(`/stok/${editingId}`, data);  // ❌ 404/405 Error
await api.delete(`/stok/${id}`);             // ❌ 404/405 Error
```

---

## ✅ Solusi yang Diterapkan

### **1. Tambah Route PUT untuk Update Stok**

**File:** `backend/server.js` (line ~943)

```javascript
// Update stok
app.put('/api/stok/:id',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'supplier']),
  async (req, res) => {
  try {
    const { nama_bahan, jumlah, satuan, expired_date } = req.body;

    // Cek stok exists
    const existing = await get('SELECT id, dapur_id FROM stok_bahan WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Stok tidak ditemukan' });
    }

    // Validasi ownership: supplier hanya bisa update stok untuk dapur mereka sendiri
    if (req.user.role === 'supplier') {
      const dapur = await get('SELECT user_id FROM dapur_supplier WHERE id = ?', [existing.dapur_id]);
      if (!dapur || !dapur.user_id || dapur.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Anda tidak memiliki akses untuk update stok ini' });
      }
    }

    await run(`UPDATE stok_bahan SET nama_bahan = ?, jumlah = ?, satuan = ?, expired_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [nama_bahan, jumlah, satuan, expired_date, req.params.id]);
    res.json({ message: 'Stok bahan berhasil diupdate' });
  } catch (error) {
    console.error('Update stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});
```

**Fitur:**
- ✅ Cek stok exists sebelum update
- ✅ Validasi ownership untuk supplier
- ✅ Update semua field (nama_bahan, jumlah, satuan, expired_date)
- ✅ Update `updated_at` timestamp otomatis
- ✅ RBAC: admin_bgn, admin_daerah, supplier

---

### **2. Tambah Route DELETE untuk Hapus Stok**

**File:** `backend/server.js` (line ~978)

```javascript
// Delete stok
app.delete('/api/stok/:id',
  authenticateToken,
  requireRole(['admin_bgn', 'admin_daerah', 'supplier']),
  async (req, res) => {
  try {
    // Cek stok exists
    const existing = await get('SELECT id, dapur_id FROM stok_bahan WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Stok tidak ditemukan' });
    }

    // Validasi ownership: supplier hanya bisa hapus stok untuk dapur mereka sendiri
    if (req.user.role === 'supplier') {
      const dapur = await get('SELECT user_id FROM dapur_supplier WHERE id = ?', [existing.dapur_id]);
      if (!dapur || !dapur.user_id || dapur.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Anda tidak memiliki akses untuk hapus stok ini' });
      }
    }

    await run('DELETE FROM stok_bahan WHERE id = ?', [req.params.id]);
    res.json({ message: 'Stok bahan berhasil dihapus' });
  } catch (error) {
    console.error('Delete stok error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});
```

**Fitur:**
- ✅ Cek stok exists sebelum delete
- ✅ Validasi ownership untuk supplier
- ✅ RBAC: admin_bgn, admin_daerah, supplier

---

## 🔐 Security: Ownership Validation

### **Kenapa Validasi Ownership Penting?**

Supplier hanya bisa **update/delete stok dari dapur mereka sendiri**, bukan dapur lain.

### **Flow Validasi:**

```javascript
// 1. Cek stok yang mau diupdate/delete
const existing = await get('SELECT id, dapur_id FROM stok_bahan WHERE id = ?', [id]);

// 2. Cek dapur pemilik stok
const dapur = await get('SELECT user_id FROM dapur_supplier WHERE id = ?', [existing.dapur_id]);

// 3. Bandingkan user_id dapur dengan user yang login
if (dapur.user_id !== req.user.id) {
  return res.status(403).json({ error: 'Anda tidak memiliki akses' });
}
```

### **Contoh Scenario:**

```
Supplier A (user_id: 10) punya Dapur X (id: 1)
Supplier B (user_id: 11) punya Dapur Y (id: 2)

Stok ID 5 → dapur_id: 1 (Dapur X)
Stok ID 6 → dapur_id: 2 (Dapur Y)

Scenario 1: Supplier A update Stok ID 5
✅ BERHASIL - Dapur X milik Supplier A

Scenario 2: Supplier A update Stok ID 6
❌ GAGAL (403 Forbidden) - Dapur Y BUKAN milik Supplier A

Scenario 3: Admin update Stok ID 5 atau 6
✅ BERHASIL - Admin bisa update semua stok
```

---

## 📊 API Endpoints Lengkap (Setelah Fix)

| Method | Endpoint | Deskripsi | RBAC |
|--------|----------|-----------|------|
| GET | `/api/stok` | List semua stok | Admin, Supplier |
| GET | `/api/stok?expired_soon=true` | Stok hampir expired | Admin, Supplier |
| POST | `/api/stok` | Tambah stok baru | Admin, Supplier |
| **PUT** | **`/api/stok/:id`** | **Update stok** | **Admin, Supplier** |
| **DELETE** | **`/api/stok/:id`** | **Hapus stok** | **Admin, Supplier** |

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

### **2. Test Update Stok (Admin):**

1. Login: `admin@mbg.go.id` / `admin123`
2. Buka `/dashboard/stok`
3. Klik tombol **Edit** (icon pencil) pada salah satu stok
4. Ubah data (misal: jumlah atau expired_date)
5. Klik **"Update"**
6. ✅ **Berhasil!** Pesan: "Stok bahan berhasil diupdate"
7. ✅ **Data ter-refresh** dengan nilai baru

### **3. Test Update Stok (Supplier):**

1. Login: `dapur1@mbg.go.id` / `dapur123`
2. Buka `/dashboard/stok`
3. Klik tombol **Edit** pada stok dari dapur mereka
4. Ubah data
5. Klik **"Update"**
6. ✅ **Berhasil!** (karena stok dari dapur mereka sendiri)

### **4. Test Delete Stok:**

1. Klik tombol **Delete** (icon trash) pada stok
2. Konfirmasi: "Yakin ingin menghapus stok ini?"
3. Klik **OK**
4. ✅ **Berhasil!** Stok hilang dari tabel

### **5. Test Ownership Validation (Supplier):**

```
Scenario: Supplier A mencoba update stok dari Supplier B

1. Login sebagai Supplier A
2. Coba akses API langsung via Postman/cURL:
   PUT /api/stok/6  (stok dari Supplier B)
   
3. ❌ GAGAL! Response 403:
   {
     "error": "Anda tidak memiliki akses untuk update stok ini"
   }

✅ Security bekerja! Supplier tidak bisa akses stok dapur lain.
```

### **6. Test dengan DevTools:**

```
Network Tab → Check API Request:

1. Saat klik Update:
   PUT /api/stok/5
   Payload: { nama_bahan: "Beras", jumlah: 150, satuan: "kg", expired_date: "2026-05-01" }
   
2. Response sukses:
   Status: 200 OK
   {
     "message": "Stok bahan berhasil diupdate"
   }

3. Response error (404):
   {
     "error": "Stok tidak ditemukan"
   }

4. Response error (403 - ownership):
   {
     "error": "Anda tidak memiliki akses untuk update stok ini"
   }
```

---

## 📋 Checklist Verifikasi

- ✅ Route PUT `/api/stok/:id` ada dan berfungsi
- ✅ Route DELETE `/api/stok/:id` ada dan berfungsi
- ✅ Update stok berhasil untuk admin
- ✅ Update stok berhasil untuk supplier (dapur sendiri)
- ✅ Delete stok berhasil untuk admin
- ✅ Delete stok berhasil untuk supplier (dapur sendiri)
- ✅ Ownership validation bekerja (403 jika akses dapur lain)
- ✅ Stok not found returns 404
- ✅ RBAC: Hanya admin & supplier yang bisa akses
- ✅ `updated_at` timestamp ter-update otomatis
- ✅ Error message jelas dan informatif

---

## 📝 File yang Diubah

| File | Perubahan |
|------|-----------|
| `backend/server.js` | Tambah route PUT `/api/stok/:id` |
| `backend/server.js` | Tambah route DELETE `/api/stok/:id` |
| `backend/server.js` | Ownership validation untuk supplier |

**Total:** 1 file (backend), 2 route baru

---

## 🎓 Perbandingan Sebelum & Sesudah

### **Sebelum:**

```
API Endpoints:
✅ GET    /api/stok
✅ POST   /api/stok
❌ PUT    /api/stok/:id     ← TIDAK ADA
❌ DELETE /api/stok/:id     ← TIDAK ADA

Frontend:
await api.put(`/stok/${id}`, data);  // ❌ 404/405 Error
await api.delete(`/stok/${id}`);     // ❌ 404/405 Error

User Experience:
- Klik "Update" → Error ❌
- Klik "Delete" → Error ❌
```

### **Sesudah:**

```
API Endpoints:
✅ GET    /api/stok
✅ POST   /api/stok
✅ PUT    /api/stok/:id     ← ADA & BERFUNGSI
✅ DELETE /api/stok/:id     ← ADA & BERFUNGSI

Frontend:
await api.put(`/stok/${id}`, data);  // ✅ 200 OK
await api.delete(`/stok/${id}`);     // ✅ 200 OK

User Experience:
- Klik "Update" → Berhasil! ✅
- Klik "Delete" → Berhasil! ✅
```

---

## 💡 Best Practices untuk Masa Depan

### **1. Selalu Lengkapi CRUD Routes:**

```javascript
// Template lengkap untuk setiap resource
app.get('/api/resource', ...);          // List
app.get('/api/resource/:id', ...);      // Detail
app.post('/api/resource', ...);         // Create
app.put('/api/resource/:id', ...);      // Update
app.delete('/api/resource/:id', ...);   // Delete
```

### **2. Validasi Ownership:**

```javascript
// Untuk multi-tenant atau ownership-based access
const existing = await get('SELECT id, owner_id FROM resource WHERE id = ?', [id]);
if (existing.owner_id !== req.user.id && req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Unauthorized' });
}
```

### **3. Check Resource Exists:**

```javascript
// Sebelum update/delete, cek resource exists
const existing = await get('SELECT id FROM resource WHERE id = ?', [id]);
if (!existing) {
  return res.status(404).json({ error: 'Resource not found' });
}
```

### **4. Update Timestamp:**

```javascript
// Selalu update `updated_at` saat modify data
await run(`UPDATE resource SET ..., updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...]);
```

---

## 🔍 Debugging Tips untuk Error Serupa

### **Jika ada error "Terjadi kesalahan" atau 404/405:**

**1. Check Route Exists:**
```bash
# Di server.js, search endpoint
grep -n "app.put.*\/stok" server.js
grep -n "app.delete.*\/stok" server.js
```

**2. Check HTTP Method:**
```
DevTools → Network → Click request → Headers tab
- Request Method: PUT ✅
- Status Code: 404 ❌ → Route tidak ada!
```

**3. Check Backend Logs:**
```
Terminal backend → Check error message
- "Update stok error: ..." → Lihat detail error
```

**4. Test Manual via cURL:**
```bash
# Test PUT route
curl -X PUT http://localhost:5000/api/stok/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nama_bahan":"Beras","jumlah":100,"satuan":"kg","expired_date":"2026-05-01"}'

# Test DELETE route
curl -X DELETE http://localhost:5000/api/stok/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**© 2026 - MBG Distribution System - Stok Update/Delete Fix Documentation**
