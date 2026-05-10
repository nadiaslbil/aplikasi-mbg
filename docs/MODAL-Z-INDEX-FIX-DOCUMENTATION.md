# 🔧 FIX: Modal Tertutup Map & Navbar (Z-Index Conflict)

> **Tanggal:** 14 April 2026  
> **Status:** ✅ Fixed  
> **Masalah:** Modal tidak tampil di atas map dan navbar setelah fix z-index sebelumnya  

---

## 🐛 Masalah yang Ditemukan

Setelah memperbaiki z-index navbar (`z-[1000]`) dan Leaflet (`z-800`), muncul masalah baru:

**Modal tidak tampil di atas semua elemen** - modal terlihat tertimpa oleh map atau navbar.

### Penyebab Utama:

1. **Modal menggunakan `z-50`** (z-index: 50) - **JAUH di bawah navbar!**
2. **Navbar sudah di `z-[1000]`** - 20x lebih tinggi dari modal
3. **Leaflet controls di `z-800`** - 16x lebih tinggi dari modal

### Ilustrasi Masalah:

```
Hierarki z-index SEBELUM FIX (SALAH):

┌─────────────────────────────────────┐
│ Navbar           z-[1000]  ← ATAS  │
├─────────────────────────────────────┤
│ Leaflet Controls z-800              │
├─────────────────────────────────────┤
│ Leaflet Map      z-400-700          │
├─────────────────────────────────────┤
│ MODAL            z-50     ← BAWAH! │ ❌
└─────────────────────────────────────┘

Hasil: Modal TERTIMP oleh navbar & map!
```

---

## ✅ Solusi yang Diterapkan

### **Prinsip: Z-Index Hierarchy Scale**

Membuat standar z-index scale yang konsisten untuk semua elemen:

```
┌─────────────────────────────────────┐
│ Loading Spinner    z-9999  ← TOP   │
├─────────────────────────────────────┤
│ Toast/Notification z-3000           │
├─────────────────────────────────────┤
│ Modal Content      z-2100           │
├─────────────────────────────────────┤
│ Modal Overlay      z-2000           │
├─────────────────────────────────────┤
│ Reserved           z-1100-1900      │
├─────────────────────────────────────┤
│ Navbar/Sticky      z-1000           │
├─────────────────────────────────────┤
│ Leaflet Controls   z-800            │
├─────────────────────────────────────┤
│ Leaflet Popup      z-700            │
├─────────────────────────────────────┤
│ Leaflet Tooltip    z-650            │
├─────────────────────────────────────┤
│ Leaflet Marker     z-600            │
├─────────────────────────────────────┤
│ Leaflet Shadow     z-500            │
├─────────────────────────────────────┤
│ Leaflet Overlay    z-400            │
├─────────────────────────────────────┤
│ Leaflet Tile/Pane  z-200            │
├─────────────────────────────────────┤
│ Leaflet Container  z-1              │
└─────────────────────────────────────┘
```

### **Perubahan yang Dilakukan:**

#### **1. Tambah Global CSS Rules**

**File:** `frontend/app/globals.css`

Menambahkan section baru:

```css
/* ============================================
   Z-INDEX HIERARCHY (Global Standard)
   ============================================ */

/*
  Z-Index Scale:
  - 1000: Navbar/Sticky Header
  - 1100-1900: Reserved for future use
  - 2000: Modal Overlay & Full-screen overlays
  - 2100: Modal Content (inside overlay)
  - 3000: Toast/Notification
  - 9999: Loading Spinner (highest priority)
  
  IMPORTANT: 
  - Modal overlay MUST be above navbar (1000) and Leaflet (800)
  - Use z-[2000] for all modal overlays
  - Use z-[2100] for modal content if needed
*/

/* Modal Overlay - Always on top */
.modal-overlay {
  z-index: 2000 !important;
}

/* Modal Content */
.modal-content {
  z-index: 2100 !important;
}
```

---

#### **2. Update Semua Modal**

**6 File Modal Diupdate:**

| File | Modal Type | Perubahan |
|------|-----------|-----------|
| `pengiriman/page.tsx` | Update Modal | `z-50` → `z-[2000]` |
| `pengiriman/page.tsx` | View Foto Modal | `z-50` → `z-[2000]` |
| `kurir/page.tsx` | Update Modal | `z-50` → `z-[2000]` |
| `kurir/page.tsx` | View Foto Modal | `z-50` → `z-[2000]` |
| `jadwal/page.tsx` | Generate Modal | `z-50` → `z-[2000]` |
| `insiden/page.tsx` | Update Status Modal | `z-50` → `z-[2000]` |
| `assign-kurir/page.tsx` | Assign Modal | `z-50` → `z-[2000]` |
| `assign-sekolah/page.tsx` | Assign Modal | `z-50` → `z-[2000]` |

**Pattern Perubahan:**

**Sebelum:**
```tsx
{/* Modal Overlay */}
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 ...">
  {/* Modal Content */}
  <div className="bg-white rounded-xl shadow-2xl ...">
```

**Sesudah:**
```tsx
{/* Modal Overlay */}
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] ...">
  {/* Modal Content */}
  <div className="bg-white rounded-xl shadow-2xl ... relative z-[2100]">
```

**Penjelasan:**
- **Overlay:** `z-[2000]` → di atas navbar (1000) dan Leaflet (800)
- **Content:** `relative z-[2100]` → di atas overlay untuk stacking context yang benar

---

## 📐 Detail Implementasi Per File

### **1. Pengiriman Page**

**File:** `frontend/app/dashboard/pengiriman/page.tsx`

#### Update Modal:
```tsx
// Line 223-224
{showUpdateModal && selectedPengiriman && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fadeIn">
    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative z-[2100]">
```

#### View Foto Modal:
```tsx
// Line 306-307
{viewFoto && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewFoto(null)}>
    <div className="relative max-w-4xl w-full z-[2100]">
```

---

### **2. Kurir Page**

**File:** `frontend/app/dashboard/kurir/page.tsx`

#### Update Modal:
```tsx
// Line 514-515
{showModal && selectedTugas && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fadeIn">
    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-[2100]">
```

#### View Foto Modal:
```tsx
// Line 601-602
{viewFoto && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewFoto(null)}>
    <div className="relative max-w-4xl w-full z-[2100]">
```

---

### **3. Jadwal Page**

**File:** `frontend/app/dashboard/jadwal/page.tsx`

```tsx
// Line 370-371
{showGenerateModal && generateResult && (
  <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 overflow-y-auto">
    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8 relative z-[2100]">
```

---

### **4. Insiden Page**

**File:** `frontend/app/dashboard/insiden/page.tsx`

```tsx
// Line 243-244
{showUpdateModal && selectedInsiden && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fadeIn">
    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full relative z-[2100]">
```

---

### **5. Assign Kurir Page**

**File:** `frontend/app/dashboard/assign-kurir/page.tsx`

```tsx
// Line 336-337
{showModal && (
  <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full relative z-[2100]">
```

---

### **6. Assign Sekolah Page**

**File:** `frontend/app/dashboard/assign-sekolah/page.tsx`

```tsx
// Line 383-384
{showModal && (
  <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 overflow-y-auto">
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full relative z-[2100]">
```

---

## 🧪 Cara Test

### **1. Jalankan aplikasi:**
```bash
cd frontend
npm run dev
```

### **2. Test Modal di Halaman Pengiriman:**
- Login: `admin@mbg.go.id` / `admin123`
- Buka `/dashboard/pengiriman`
- Klik tombol **Edit** (icon pencil) pada salah satu baris
- ✅ **Modal harus tampil di atas semua elemen**
- ✅ **Tidak tertutup navbar atau map**
- ✅ **Backdrop gelap menutupi seluruh layar**

### **3. Test Modal di Halaman Kurir:**
- Login: `kurir.dapurmbg@mbg.go.id` / `kurir123`
- Buka `/dashboard/kurir`
- Klik tombol **Update** pada tugas
- ✅ Modal tampil penuh dengan form update
- Klik **Lihat Foto** (jika ada)
- ✅ Foto tampil fullscreen

### **4. Test Modal di Halaman Jadwal:**
- Login: `admin@mbg.go.id` / `admin123`
- Buka `/dashboard/jadwal`
- Klik tombol **⚡ Generate**
- ✅ Modal preview hasil generate tampil di atas

### **5. Test Modal di Halaman Insiden:**
- Buka `/dashboard/insiden`
- Klik tombol **Update Status** pada insiden
- ✅ Modal form update tampil penuh

### **6. Test dengan DevTools:**
1. Buka Chrome DevTools (F12)
2. Inspect modal overlay → z-index harus **2000**
3. Inspect modal content → z-index harus **2100**
4. Inspect navbar → z-index **1000** (di bawah modal)
5. Inspect Leaflet → z-index max **800** (di bawah modal)

---

## 📋 Checklist Verifikasi

- ✅ Modal overlay z-index 2000 (di atas navbar 1000)
- ✅ Modal content z-index 2100 (di atas overlay)
- ✅ Modal tampil penuh dengan backdrop gelap
- ✅ Modal tidak tertutup navbar
- ✅ Modal tidak tertutup map Leaflet
- ✅ Modal tidak tertutup sidebar
- ✅ Form di dalam modal bisa diinteraksi
- ✅ Dropdown/select di dalam modal berfungsi
- ✅ Modal scrollable jika konten panjang
- ✅ Close button berfungsi
- ✅ Semua 8 modal di 6 halaman sudah diupdate

---

## 🎯 Prinsip yang Diterapkan

### **1. Z-Index Scale yang Konsisten**

```
Base Scale (kelipatan 100):
- 1000: Navbar
- 2000: Modal Overlay
- 3000: Toast/Notification
- 9999: Loading Spinner

Fine Scale (dalam modal):
- 2000: Overlay background
- 2100: Content container
- 2200: Sticky header dalam modal (jika perlu)
- 2300: Dropdown dalam modal (jika perlu)
```

### **2. Stacking Context yang Benar**

```tsx
{/* Layer 1: Overlay (z-2000) */}
<div className="fixed inset-0 z-[2000]">
  
  {/* Layer 2: Content (z-2100) */}
  <div className="... relative z-[2100]">
    
    {/* Layer 3: Children (auto, di atas parent) */}
    <div className="sticky top-0 ..."> {/* Header modal */}
    
  </div>
</div>
```

### **3. Position Fixed + Full Coverage**

```tsx
// Overlay HARUS fixed inset-0
<div className="fixed inset-0 z-[2000]">
// fixed: Position relatif terhadap viewport
// inset-0: top:0, right:0, bottom:0, left:0 (full screen)
```

---

## 🔮 Best Practices untuk Masa Depan

### **Jika menambah modal baru:**

```tsx
{/* Template Modal dengan Z-Index Benar */}
{showModal && (
  // Overlay: z-[2000]
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
    
    {/* Content: relative z-[2100] */}
    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full relative z-[2100]">
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200">
        <h2 className="text-xl font-semibold">Modal Title</h2>
      </div>
      
      {/* Body */}
      <div className="p-6">
        {/* Content */}
      </div>
      
      {/* Footer */}
      <div className="px-6 py-4 border-t border-zinc-200">
        <button onClick={() => setShowModal(false)}>Close</button>
      </div>
      
    </div>
  </div>
)}
```

### **Jika ada nested modal (modal dalam modal):**

```tsx
// Modal 1: z-[2000] + z-[2100]
// Modal 2 (nested): z-[2200] + z-[2300]
// Selalu +200 dari modal sebelumnya
```

### **Jika ada dropdown dalam modal:**

```tsx
{/* Dropdown dalam modal */}
<select className="relative z-[2200]">
  // Harus di atas modal content (2100)
</select>
```

### **Jika ada toast notification:**

```tsx
// Toast: z-[3000] (di atas semua modal)
<div className="fixed top-4 right-4 z-[3000]">
  <Toast message="Success!" />
</div>
```

---

## 📊 Perbandingan Sebelum & Sesudah

### **Sebelum:**
| Elemen | z-index | Status |
|--------|---------|--------|
| Navbar | 1000 | ✅ OK |
| Leaflet Controls | 800 | ✅ OK |
| **Modal Overlay** | **50** | ❌ TERTIMP! |
| Modal Content | auto | ❌ Tidak terlihat |

**Hasil:** Modal tidak tampil, tertutup navbar & map

### **Sesudah:**
| Elemen | z-index | Status |
|--------|---------|--------|
| **Modal Content** | **2100** | ✅ PALING ATAS |
| **Modal Overlay** | **2000** | ✅ Di atas navbar |
| Navbar | 1000 | ✅ Di bawah modal |
| Leaflet Controls | 800 | ✅ Di bawah navbar |

**Hasil:** Modal tampil sempurna di atas semua elemen!

---

## 💡 Tips Debug Z-Index Issues

### **1. Visualisasi Z-Index dengan DevTools:**

```
DevTools → Elements → Computed → Cari "z-index"

Atau tambahkan outline temporary:
```

```tsx
// Debug modal
<div className="fixed inset-0 z-[2000] outline outline-4 outline-red-500">
  // Harus cover seluruh layar dengan border merah
</div>
```

### **2. Cek Stacking Context:**

```
Elemen dengan z-index harus memiliki position:
- fixed ✅ (modal overlay)
- relative ✅ (modal content)
- absolute ✅ (nested elements)
- static ❌ (z-index TIDAK berfungsi!)
```

### **3. Common Pitfalls:**

❌ **SALAH:**
```tsx
// z-index tidak berfungsi tanpa position
<div className="z-[2000]"> {/* ❌ Tidak ada position! */}
```

✅ **BENAR:**
```tsx
<div className="fixed inset-0 z-[2000]"> {/* ✅ Ada position: fixed */}
```

### **4. Urutan DOM Tidak Penting:**

```tsx
// Walaupun modal di akhir DOM, z-index yang atur layering
<main>...</main>
<navbar>...</navbar>
<modal>...</modal> {/* z-[2000] → tetap di atas */}
```

---

## 📝 File yang Diubah

| File | Perubahan |
|------|-----------|
| `frontend/app/globals.css` | Tambah Z-INDEX HIERARCHY section + CSS classes |
| `frontend/app/dashboard/pengiriman/page.tsx` | Update 2 modal z-index |
| `frontend/app/dashboard/kurir/page.tsx` | Update 2 modal z-index |
| `frontend/app/dashboard/jadwal/page.tsx` | Update 1 modal z-index |
| `frontend/app/dashboard/insiden/page.tsx` | Update 1 modal z-index |
| `frontend/app/dashboard/assign-kurir/page.tsx` | Update 1 modal z-index |
| `frontend/app/dashboard/assign-sekolah/page.tsx` | Update 1 modal z-index |

**Total:** 7 file, 8 modal diupdate

---

## 🎓 Referensi Z-Index

### **MDN Web Docs:**
- [z-index](https://developer.mozilla.org/en-US/docs/Web/CSS/z-index)
- [Stacking Context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Positioning/Understanding_z_index/The_stacking_context)

### **TailwindCSS:**
- [z-index utilities](https://tailwindcss.com/docs/z-index)

### **Best Practices:**
- Gunakan scale kelipatan 100 untuk kemudahan
- Hindari `z-[9999]` kecuali benar-benar perlu
- Selalu sertakan position (fixed/relative/absolute)
- Dokumentasikan z-index hierarchy di project

---

**© 2026 - MBG Distribution System - Modal Z-Index Fix Documentation**
