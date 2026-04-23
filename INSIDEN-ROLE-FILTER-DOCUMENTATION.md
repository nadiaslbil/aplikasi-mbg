# 🔧 Role-Based Filtering untuk Insiden + Auto-Select Dapur

> **Tanggal:** 14 April 2026  
> **Status:** ✅ Implemented  
> **Fitur:** Filter insiden berdasarkan role + auto-select dapur untuk kurir/supplier  

---

## 🎯 Kebutuhan yang Diimplementasikan

### **1. Admin (admin_bgn, admin_daerah)**
- ✅ Bisa melihat **SEMUA insiden** (semua dapur)
- ✅ Bisa memilih dapur manual saat melapor

### **2. Kurir**
- ✅ Hanya melihat **insiden dari dapur mereka**
- ✅ Dapur **otomatis terpilih** saat melapor (tidak bisa diubah)
- ✅ Banner info: "Mode Tampilan: Insiden Dapur Anda"

### **3. Supplier**
- ✅ Hanya melihat **insiden dari dapur mereka**
- ✅ Dapur **otomatis terpilih** saat melapor (tidak bisa diubah)
- ✅ Banner info: "Mode Tampilan: Insiden Dapur Anda"

---

## 🔧 Implementasi Backend

### **1. API GET `/api/insiden` - Filter by Role**

**File:** `backend/server.js` (line ~1003)

```javascript
// FILTER OTOMATIS UNTUK KURIR - hanya lihat insiden dari dapur mereka
if (req.user.role === 'kurir') {
  query += ' AND i.dapur_id IN (SELECT dk.dapur_id FROM dapur_kurir dk WHERE dk.kurir_id = ? AND dk.status = \'aktif\')';
  params.push(req.user.id);
}

// FILTER OTOMATIS UNTUK SUPPLIER - hanya lihat insiden dari dapur mereka
if (req.user.role === 'supplier') {
  query += ' AND i.dapur_id IN (SELECT ds2.id FROM dapur_supplier ds2 WHERE ds2.user_id = ?)';
  params.push(req.user.id);
}
```

**Flow:**
```
Kurir login → Filter insiden by dapur_kurir → Hanya lihat insiden dapur mereka
Supplier login → Filter insiden by dapur_supplier → Hanya lihat insiden dapur mereka
Admin login → Tidak ada filter → Lihat SEMUA insiden
```

---

### **2. API POST `/api/insiden` - Auto-Assign Dapur**

**File:** `backend/server.js` (line ~1037)

```javascript
// Auto-set dapur_id untuk kurir & supplier
if (req.user.role === 'kurir') {
  const dapurKurir = await get('SELECT dapur_id FROM dapur_kurir WHERE kurir_id = ? AND status = \'aktif\'', [req.user.id]);
  if (!dapurKurir) {
    return res.status(400).json({ error: 'Kurir belum di-assign ke dapur. Hubungi admin.' });
  }
  dapur_id = dapurKurir.dapur_id;  // ✅ Auto-assign
}

if (req.user.role === 'supplier') {
  const dapurSupplier = await get('SELECT id FROM dapur_supplier WHERE user_id = ?', [req.user.id]);
  if (!dapurSupplier) {
    return res.status(400).json({ error: 'Supplier belum memiliki dapur. Hubungi admin.' });
  }
  dapur_id = dapurSupplier.id;  // ✅ Auto-assign
}
```

**Flow:**
```
Kurir lapor insiden → Backend cari dapur dari dapur_kurir → Auto-assign dapur_id
Supplier lapor insiden → Backend cari dapur dari dapur_supplier → Auto-assign dapur_id
Admin lapor insiden → Pakai dapur_id dari form (manual)
```

---

## 🎨 Implementasi Frontend

### **1. Banner Info untuk Non-Admin**

**File:** `frontend/app/dashboard/insiden/page.tsx`

```tsx
{(isKurir || isSupplier) && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-3">
    <Store size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
    <div>
      <h3 className="font-semibold text-blue-800">Mode Tampilan: Insiden Dapur Anda</h3>
      <p className="text-sm text-blue-700 mt-1">
        Anda hanya melihat insiden dari dapur Anda. Dapur sudah otomatis dipilih saat melapor.
      </p>
    </div>
  </div>
)}
```

---

### **2. Auto-Select Dapur di Form**

```tsx
{isKurir || isSupplier ? (
  <>
    <input type="hidden" {...register('dapur_id', { valueAsNumber: true })} />
    <div className="input bg-zinc-50 text-zinc-600 cursor-not-allowed">
      {dapurList.find(d => d.id === userDapurId)?.nama || 'Otomatis dari dapur Anda'}
    </div>
    <p className="text-xs text-zinc-500 mt-1">Dapur sudah otomatis dipilih</p>
  </>
) : (
  <select {...register('dapur_id', { valueAsNumber: true })} className="select">
    <option value={0}>-- Pilih Dapur --</option>
    {dapurList.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
  </select>
)}
```

**Untuk Kurir:**
- Input hidden dengan dapur_id otomatis
- Tampil nama dapur (disabled look)
- Tidak bisa mengubah dapur

**Untuk Supplier:**
- Input hidden dengan dapur_id otomatis
- Tampil nama dapur mereka
- Tidak bisa mengubah dapur

**Untuk Admin:**
- Dropdown biasa
- Bisa pilih dapur manual

---

## 📊 Ilustrasi Data

### **Scenario 1: Admin Login**

```
User: admin@mbg.go.id (role: admin_bgn)

Query: SELECT * FROM insiden (TANPA FILTER)

Hasil: SEMUA INSIDEN (dari semua dapur)
┌────┬──────────────┬──────────────┬─────────────────┐
│ ID │ Tipe         │ Dapur        │ Sekolah         │
├────┼──────────────┼──────────────┼─────────────────┤
│ 1  │ Keterlambatan│ Dapur MBG    │ SDN 1           │
│ 2  │ Kualitas     │ Berkah       │ SDN 2           │
│ 3  │ Jumlah Kurang│ Dapur Sehat  │ SDN 3           │
└────┴──────────────┴──────────────┴─────────────────┘

UI:
- Tampil SEMUA insiden
- Dapur dropdown saat melapor
- Tidak ada banner info
```

---

### **Scenario 2: Kurir Dapur MBG Login**

```
User: kurir.dapurmbg@mbg.go.id (role: kurir)
Dapur: Dapur MBG Banjarnegara (ID: 1)

Query: SELECT * FROM insiden WHERE dapur_id IN (1)

Hasil: Hanya INSIDEN dari Dapur MBG
┌────┬──────────────┬──────────────┬─────────────────┐
│ ID │ Tipe         │ Dapur        │ Sekolah         │
├────┼──────────────┼──────────────┼─────────────────┤
│ 1  │ Keterlambatan│ Dapur MBG    │ SDN 1           │
│ 4  │ Kerusakan    │ Dapur MBG    │ SDN 6           │
└────┴──────────────┴──────────────┴─────────────────┘

UI:
- Tampil HANYA insiden Dapur MBG
- Banner info muncul
- Dapur otomatis terpilih (tidak bisa diubah)
```

---

### **Scenario 3: Kurir Lapor Insiden**

```
1. Kurir klik "Lapor Insiden"
2. Form muncul dengan:
   - Sekolah: Dropdown (bisa pilih)
   - Dapur: "Dapur MBG Banjarnegara" (disabled, otomatis)
   - Tipe: "Keterlambatan" (default)
   - Deskripsi: Textarea (bisa isi)
   - Tanggal: Today (default)

3. Submit → Backend auto-assign dapur_id dari dapur_kurir
4. ✅ Insiden tersimpan dengan dapur_id = 1 (Dapur MBG)
```

---

## 🧪 Cara Test

### **1. Jalankan Aplikasi:**

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

### **2. Test sebagai Admin:**

1. Login: `admin@mbg.go.id` / `admin123`
2. Buka `/dashboard/insiden`
3. ✅ **Tampil SEMUA insiden** (semua dapur)
4. ✅ **Tidak ada banner info**
5. ✅ **Dapur dropdown** saat melapor

### **3. Test sebagai Kurir Dapur MBG:**

1. Login: `kurir.dapurmbg@mbg.go.id` / `kurir123`
2. Buka `/dashboard/insiden`
3. ✅ **Hanya tampil insiden dari Dapur MBG**
4. ✅ **Banner info muncul**: "Mode Tampilan: Insiden Dapur Anda"
5. ✅ **Klik "Lapor Insiden"**:
   - Dapur otomatis: "Dapur MBG Banjarnegara"
   - Tidak bisa diubah (disabled)
   - Info: "Dapur sudah otomatis dipilih"
6. ✅ **Submit insiden** → Berhasil!

### **4. Test sebagai Supplier:**

1. Login: `dapur1@mbg.go.id` / `dapur123`
2. Buka `/dashboard/insiden`
3. ✅ **Hanya tampil insiden dari dapur supplier**
4. ✅ **Banner info muncul**
5. ✅ **Dapur otomatis terpilih** saat melapor

---

## 📋 Checklist Verifikasi

- ✅ Admin bisa lihat semua insiden
- ✅ Admin bisa pilih dapur manual
- ✅ Kurir hanya lihat insiden dapur mereka
- ✅ Supplier hanya lihat insiden dapur mereka
- ✅ Kurir tidak bisa ubah dapur saat melapor
- ✅ Supplier tidak bisa ubah dapur saat melapor
- ✅ Dapur otomatis terpilih untuk kurir
- ✅ Dapur otomatis terpilih untuk supplier
- ✅ Banner info muncul untuk non-admin
- ✅ Backend validation mencegah akses dapur lain
- ✅ Error message jika kurir belum punya dapur
- ✅ Error message jika supplier belum punya dapur

---

## 📝 File yang Diubah

| File | Perubahan |
|------|-----------|
| `backend/server.js` | Filter role di GET `/api/insiden` |
| `backend/server.js` | Auto-assign dapur di POST `/api/insiden` |
| `frontend/app/dashboard/insiden/page.tsx` | Banner info + auto-select dapur |

**Total:** 2 file (1 backend, 1 frontend)

---

**© 2026 - MBG Distribution System - Role-Based Insiden Filtering Documentation**
