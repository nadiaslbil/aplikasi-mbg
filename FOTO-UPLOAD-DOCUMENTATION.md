# 📸 Fitur Photo Upload - Dokumentasi

## ✅ Status: SELESAI & BERFUNGSI

Tanggal: 8 April 2026

---

## 📋 Yang Sudah Dibangun

### **Backend**

#### 1. **Multer Middleware** (`backend/middleware/upload.js`)
- ✅ File upload handler dengan multer
- ✅ Validasi file type (JPG, PNG, GIF, WebP)
- ✅ Validasi file size (max 5MB)
- ✅ Auto-create `uploads/` folder
- ✅ Unique filename generation
- ✅ Error handling untuk upload errors

#### 2. **Upload Endpoint** (`POST /api/upload`)
- ✅ Endpoint standalone untuk upload file
- ✅ Return file info & URL
- ✅ Protected dengan JWT authentication

#### 3. **Update Pengiriman dengan Upload** (`PUT /api/pengiriman/:id/upload`)
- ✅ Endpoint khusus untuk update pengiriman + upload foto
- ✅ Support multipart/form-data
- ✅ Auto-update status jadwal jika status = 'diterima'
- ✅ Socket.io emission untuk real-time update

#### 4. **Update Pengiriman Biasa** (`PUT /api/pengiriman/:id`)
- ✅ Updated untuk support bukti_foto field
- ✅ Socket.io integration

### **Frontend**

#### 1. **Komponen UploadFoto** (`frontend/components/UploadFoto.tsx`)
- ✅ Drag & drop upload
- ✅ Click to upload
- ✅ Image preview
- ✅ Upload progress indicator
- ✅ Error handling & validation
- ✅ Remove/reset foto
- ✅ Show current foto (edit mode)
- ✅ File type & size validation

#### 2. **Halaman Pengiriman** (`frontend/app/dashboard/pengiriman/page.tsx`)
- ✅ Updated dengan kolom "Bukti Foto"
- ✅ Button "Lihat Foto" untuk preview
- ✅ Modal update dengan upload form
- ✅ Modal view foto fullscreen
- ✅ Integration dengan UploadFoto component

---

## 🚀 Cara Menggunakan

### **1. Start Backend**
```bash
cd backend
npm run dev
```

Backend berjalan di: `http://localhost:5000`

### **2. Start Frontend**
```bash
cd frontend
npm run dev
```

Frontend berjalan di: `http://localhost:3000`

### **3. Test Upload**

1. **Login** dengan akun admin: `admin@mbg.go.id` / `admin123`
2. **Buka halaman** Pengiriman: `http://localhost:3000/dashboard/pengiriman`
3. **Klik tombol Edit** (icon pensil) di baris pengiriman
4. **Modal Update** akan muncul dengan form:
   - Status pengiriman (dropdown)
   - Upload foto bukti (drag/drop atau klik)
   - Catatan pengiriman
5. **Upload foto**:
   - Drag & drop file ke area upload, ATAU
   - Klik area upload untuk browse file
6. **Preview** foto akan langsung muncul
7. **Klik Simpan** untuk menyimpan perubahan
8. **Klik "Lihat Foto"** di tabel untuk melihat foto fullscreen

---

## 📁 File Structure

```
backend/
├── middleware/
│   └── upload.js              # Multer configuration
├── uploads/                   # Folder untuk uploaded files (auto-created)
│   └── bukti-<timestamp>-<random>.jpg
└── server.js                  # Updated dengan upload endpoints

frontend/
├── components/
│   └── UploadFoto.tsx         # Reusable upload component
└── app/
    └── dashboard/
        └── pengiriman/
            └── page.tsx       # Updated dengan upload integration
```

---

## 🔌 API Endpoints

### **1. Upload File (Standalone)**
```
POST /api/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- file: <image file>

Response:
{
  "message": "File berhasil diupload",
  "filename": "bukti-1234567890-123456789-filename.jpg",
  "originalName": "foto.jpg",
  "size": 123456,
  "mimetype": "image/jpeg",
  "url": "/uploads/bukti-1234567890-123456789-filename.jpg",
  "path": "bukti-1234567890-123456789-filename.jpg"
}
```

### **2. Update Pengiriman dengan Upload**
```
PUT /api/pengiriman/:id/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- bukti_foto: <image file>
- status: "diterima"
- catatan: "Paket sudah diterima"

Response:
{
  "message": "Pengiriman berhasil diupdate dengan foto",
  "bukti_foto": "bukti-1234567890-123456789-filename.jpg"
}
```

### **3. Update Pengiriman (JSON)**
```
PUT /api/pengiriman/:id
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "status": "diterima",
  "catatan": "Paket sudah diterima",
  "bukti_foto": "bukti-1234567890-123456789-filename.jpg"
}

Response:
{
  "message": "Pengiriman berhasil diupdate",
  "bukti_foto": "bukti-1234567890-123456789-filename.jpg"
}
```

---

## 🎨 Fitur UI

### **Upload Component**
- **Drag & Drop Zone**: Area untuk drag file
- **Click to Upload**: Klik untuk browse file
- **Preview**: Langsung tampilkan foto setelah upload
- **Progress Indicator**: Loading spinner saat upload
- **Error Display**: Pesan error yang jelas
- **Remove Button**: Hapus foto yang sudah diupload
- **Current Photo Display**: Tampilkan foto existing saat edit

### **Pengiriman Page**
- **Foto Column**: Kolom "Bukti Foto" di tabel
- **Lihat Foto Button**: Button untuk preview foto
- **Update Modal**: Modal dengan form lengkap + upload
- **View Foto Modal**: Fullscreen photo viewer

---

## 🔒 Security

- ✅ JWT authentication required
- ✅ File type validation (images only)
- ✅ File size limit (5MB max)
- ✅ Unique filename generation (prevent overwrite)
- ✅ Server-side validation (double check)

---

## 📊 Database

Tabel `pengiriman` sudah memiliki kolom:
```sql
bukti_foto TEXT  -- Menyimpan filename foto
```

Tidak perlu migration karena kolom sudah ada!

---

## ✨ Socket.io Events

### **Emit dari Backend:**

**Event: `pengiriman:update`**
```javascript
{
  pengirimanId: "123",
  status: "diterima",
  bukti_foto: "bukti-xxx.jpg",
  timestamp: "2026-04-08T10:30:00.000Z"
}
```

**Event: `pengiriman:location`**
```javascript
{
  pengirimanId: "123",
  latitude: -7.3511,
  longitude: 109.5875,
  status: "dalam_perjalanan",
  timestamp: "2026-04-08T10:30:00.000Z"
}
```

---

## 🧪 Testing Checklist

- [x] Backend endpoint menerima upload
- [x] File tersimpan di folder `uploads/`
- [x] File URL accessible dari frontend
- [x] Preview foto berfungsi
- [x] Drag & drop berfungsi
- [x] Error handling untuk invalid file type
- [x] Error handling untuk file too large
- [x] Update status + upload foto bersamaan
- [x] View foto fullscreen modal
- [x] Remove foto sebelum submit
- [x] Socket.io emit triggered

---

## 🎯 Next Steps (Optional)

Fitur photo upload sudah **SELESAI 100%**. Jika ingin dikembangkan lagi:

1. **Multiple Photo Upload** - Upload lebih dari 1 foto
2. **Photo Compression** - Compress foto sebelum upload
3. **Photo Gallery** - Gallery semua foto pengiriman
4. **Download Photo** - Download foto bukti
5. **Print Receipt** - Print bukti pengiriman dengan foto

---

## 📝 Catatan Penting

- File disimpan di `backend/uploads/` folder
- Folder auto-created saat server first start
- Filename format: `bukti-<timestamp>-<random>-<originalname>.ext`
- Max file size: 5MB
- Supported formats: JPG, PNG, GIF, WebP
- Foto bisa dilihat via: `http://localhost:5000/uploads/<filename>`

---

**© 2026 - Photo Upload Feature Complete ✅**
