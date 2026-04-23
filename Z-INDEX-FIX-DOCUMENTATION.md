# 🔧 FIX: Z-Index Navbar vs Leaflet Map

> **Tanggal:** 14 April 2026  
> **Status:** ✅ Fixed  
> **Masalah:** Peta Leaflet menutupi navbar saat scroll  

---

## 🐛 Masalah yang Ditemukan

Saat halaman di-scroll ke atas, **elemen peta Leaflet menutupi navbar** yang seharusnya selalu berada di paling atas (sticky).

### Penyebab Utama:

1. **Navbar menggunakan `z-30`** (z-index: 30) di `AdminLayout.tsx`
2. **Leaflet secara default memiliki z-index sangat tinggi**:
   - `.leaflet-container` → z-index: auto
   - `.leaflet-tile-pane` → z-index: 400+
   - `.leaflet-marker-pane` → z-index: 600+
   - `.leaflet-popup-pane` → z-index: 700+

3. **Konflik:** Saat scroll, elemen Leaflet dengan z-index 400-700 akan menutupi navbar dengan z-index 30

---

## ✅ Solusi yang Diterapkan

### **1. Naikkan z-index Navbar**

**File:** `frontend/components/AdminLayout.tsx`

**Sebelum:**
```tsx
<header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-zinc-200/80">
```

**Sesudah:**
```tsx
<header className="sticky top-0 z-[1000] bg-white/80 backdrop-blur-lg border-b border-zinc-200/80">
```

**Perubahan:**
- `z-30` → `z-[1000]` (custom value)
- Navbar sekarang memiliki z-index **1000**, jauh lebih tinggi dari semua elemen Leaflet

---

### **2. Override z-index Leaflet**

**File:** `frontend/app/globals.css`

Menambahkan CSS untuk membatasi z-index semua elemen Leaflet:

```css
/* Fix z-index Leaflet agar tidak menutupi navbar */
.leaflet-container {
  z-index: 1 !important;
}

.leaflet-pane {
  z-index: 200 !important;
}

.leaflet-tile-pane {
  z-index: 200 !important;
}

.leaflet-overlay-pane {
  z-index: 400 !important;
}

.leaflet-shadow-pane {
  z-index: 500 !important;
}

.leaflet-marker-pane {
  z-index: 600 !important;
}

.leaflet-popup-pane {
  z-index: 700 !important;
}

.leaflet-tooltip-pane {
  z-index: 650 !important;
}

/* Control zoom - pastikan di bawah navbar */
.leaflet-control-zoom {
  z-index: 800 !important;
}

.leaflet-control-container {
  z-index: 800 !important;
}
```

**Hierarki z-index yang Benar (UPDATED):**

| Elemen | z-index | Keterangan |
|--------|---------|------------|
| **Modal Content** | **2100** | ✅ Paling atas (dalam modal) |
| **Modal Overlay** | **2000** | ✅ Full screen overlay |
| **Navbar** | **1000** | ✅ Sticky header |
| Leaflet Controls (zoom) | 800 | Di bawah navbar |
| Leaflet Popup | 700 | Di bawah controls |
| Leaflet Tooltip | 650 | Di bawah popup |
| Leaflet Marker | 600 | Di bawah tooltip |
| Leaflet Shadow | 500 | Di bawah marker |
| Leaflet Overlay | 400 | Di bawah shadow |
| Leaflet Tile | 200 | Paling bawah |
| Leaflet Container | 1 | Base layer |

---

## 🧪 Cara Test

1. **Jalankan aplikasi:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Buka halaman dashboard:**
   - Login: `admin@mbg.go.id` / `admin123`
   - Navigasi ke: `/dashboard`

3. **Test scroll:**
   - Scroll halaman ke bawah
   - Scroll kembali ke atas
   - **Navbar harus tetap di atas** dan tidak tertutup peta

4. **Test interaksi peta:**
   - Zoom in/out masih berfungsi
   - Klik marker masih berfungsi
   - Popup masih muncul dengan benar
   - Kontrol zoom tetap terlihat

---

## 📋 Checklist Verifikasi

- ✅ Navbar selalu di paling atas saat scroll
- ✅ Peta tidak menutupi navbar
- ✅ Zoom controls berfungsi normal
- ✅ Marker dan popup berfungsi normal
- ✅ Sidebar tetap di atas peta (z-50)
- ✅ Mobile responsive tetap berfungsi
- ✅ Semua halaman dengan peta ter-fix

---

## 🎯 Prinsip yang Diterapkan

### **1. Layering Hierarchy**
```
Navbar (1000) > Controls (800) > Popup (700) > Marker (600) > Tile (200)
```

### **2. Sticky Positioning**
- Navbar: `sticky top-0` dengan `z-[1000]`
- Sidebar: `fixed` dengan `z-50`

### **3. CSS Specificity**
- Menggunakan `!important` untuk override Leaflet default
- Memastikan tidak ada konflik dengan Tailwind utilities

---

## 🔮 Best Practices untuk Masa Depan

### **Jika menambah elemen baru:**

1. **Cek z-index hierarchy:**
   - Navbar: 1000 (jangan diubah)
   - Modal: 1100+
   - Toast/Notification: 1200+
   - Leaflet: max 800

2. **Jangan gunakan z-index terlalu tinggi tanpa alasan**
   - Hindari `z-[9999]` kecuali benar-benar perlu
   - Gunakan nilai yang masuk akal dan terdokumentasi

3. **Jika menambah Leaflet custom layer:**
   ```css
   .leaflet-custom-layer {
     z-index: 300 !important; /* Di bawah navbar */
   }
   ```

4. **Jika ada modal yang menutupi navbar:**
   ```tsx
   <div className="fixed inset-0 z-[1100]"> {/* Modal */}
   ```

---

## 📚 Referensi

- [TailwindCSS z-index](https://tailwindcss.com/docs/z-index)
- [Leaflet z-index documentation](https://leafletjs.com/reference.html#map-pane)
- [MDN: z-index](https://developer.mozilla.org/en-US/docs/Web/CSS/z-index)

---

## 📝 File yang Diubah

| File | Perubahan |
|------|-----------|
| `frontend/components/AdminLayout.tsx` | Navbar z-30 → z-[1000] |
| `frontend/app/globals.css` | Tambah 10 rules z-index Leaflet |

---

**© 2026 - MBG Distribution System - Z-Index Fix Documentation**
