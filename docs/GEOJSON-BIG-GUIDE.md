# 📍 Panduan Mendapatkan GeoJSON Banjarnegara dari BIG

## ✅ SUDAH BERHASIL DIDOWNLOAD!

File GeoJSON asli dari BIG sudah berhasil didownload dan terintegrasi ke aplikasi:
- **File:** `backend/banjarnegara-big-kecamatan.geojson`
- **Ukuran:** 2.9 MB (2911 KB)
- **Jumlah Fitur:** 20 Kecamatan
- **Sumber:** BIG (Badan Informasi Geospasial)
- **Endpoint:** `https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_Kecamatan_10K/MapServer/0/query`

---

## 🗂️ DATA YANG DIDAPATKAN

### 20 Kecamatan di Banjarnegara:

| No | Kecamatan (WADMKC) |
|----|---------------------|
| 1 | Susukan |
| 2 | Purworeja Klampok |
| 3 | Mandiraja |
| 4 | Purwanegara |
| 5 | Bawang |
| 6 | Banjarnegara |
| 7 | Sigaluh |
| 8 | Madukara |
| 9 | Banjarmangu |
| 10 | Wanadadi |
| 11 | Rakit |
| 12 | Punggelan |
| 13 | Karangkobar |
| 14 | Pagentan |
| 15 | Pejawaran |
| 16 | Batur |
| 17 | Wanayasa |
| 18 | Kalibening |
| 19 | Pandanarum |
| 20 | Pagedongan |

---

## 🔧 CARA MENDAPATKAN (3 METODE)

### **Metode 1: Script Otomatis (SUDAH DIBUAT)** ⭐ TERMUDAH

Script sudah tersedia dan **SUKSES** digunakan!

```bash
cd backend
node download-big-geojson.js
```

**Script akan:**
1. Query REST API BIG
2. Filter data untuk Banjarnegara
3. Download GeoJSON
4. Save ke file `banjarnegara-big-kecamatan.geojson`

**Keuntungan:**
✅ Otomatis, tidak perlu login
✅ Langsung dapat GeoJSON
✅ Bisa diulang kapan saja untuk update data

---

### **Metode 2: Query Langsung dari Browser** 🌐

**URL Query:**
```
https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_Kecamatan_10K/MapServer/0/query?where=WADMKK%20%3D%20%27Banjarnegara%27&outFields=*&outSR=4326&f=geojson
```

**Cara Pakai:**
1. Copy URL di atas
2. Paste ke browser (Chrome/Firefox/Edge)
3. File GeoJSON akan otomatis ter-download

**Penjelasan Parameter:**
```
where=WADMKK = 'Banjarnegara'   → Filter kabupaten
outFields=*                     → Ambil semua field
outSR=4326                      → Koordinat WGS84 (lat/long)
f=geojson                       → Format output GeoJSON
```

---

### **Metode 3: cURL (Command Line)** 💻

**Untuk Windows (Command Prompt):**
```cmd
curl -X GET "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_Kecamatan_10K/MapServer/0/query?where=WADMKK%3D%27Banjarnegara%27^&outFields=*^&outSR=4326^&f=geojson" -o banjarnegara-kecamatan.geojson
```

**Untuk Windows (PowerShell):**
```powershell
curl.exe -X GET "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_Kecamatan_10K/MapServer/0/query?where=WADMKK%3D%27Banjarnegara%27&outFields=*&outSR=4326&f=geojson" -o banjarnegara-kecamatan.geojson
```

**Untuk Linux/Mac:**
```bash
curl -X GET "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_Kecamatan_10K/MapServer/0/query?where=WADMKK%3D%27Banjarnegara%27&outFields=*&outSR=4326&f=geojson" -o banjarnegara-kecamatan.geojson
```

---

### **Metode 4: Portal BIG (Perlu Login)** 🏛️

**Langkah-langkah:**

1. **Buka Portal**
   - URL: https://tanahair.indonesia.go.id/portal-web/
   - Atau: https://geoservices.big.go.id/portal

2. **Daftar Akun** (Gratis)
   - Klik "Register" atau "Daftar"
   - Isi: nama, email, password
   - Verifikasi email
   - Login

3. **Cari Data**
   - Menu "Data" → "Batas Administrasi"
   - Atau langsung ke:
     - Batas Kecamatan: https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_Kecamatan_10K/MapServer
     - Batas Desa: https://geoservices.big.go.id/portal/home/item.html?id=cb58db080712468cb4bfd408dbde3d70

4. **Filter**
   - Provinsi: `JAWA TENGAH`
   - Kabupaten: `BANJARNEGARA`
   - Atau query: `WADMKK = 'Banjarnegara'`

5. **Download**
   - Klik tombol "Download" atau "Export"
   - Pilih format: GeoJSON, Shapefile, atau KML

6. **Konversi (jika perlu)**
   - Jika dapat Shapefile, konversi dengan QGIS:
     1. Buka QGIS → Add Layer → Add Vector Layer
     2. Load file `.shp`
     3. Right-click layer → Export → Save Features As
     4. Format: GeoJSON
     5. Save

---

## 🌐 ENDPOINT API LENGKAP

### **Batas Kecamatan:**
```
https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_Kecamatan_10K/MapServer/0/query
```

### **Batas Desa/Kelurahan:**
```
https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_Kecamatan_10K/MapServer/1/query
```

### **Query Contoh:**

**Ambil semua kecamatan:**
```
?where=1=1&outFields=*&f=geojson
```

**Filter kabupaten:**
```
?where=WADMKK='Banjarnegara'&outFields=*&f=geojson
```

**Filter kecamatan tertentu:**
```
?where=WADMKC='Banjarnegara'&outFields=*&f=geojson
```

**Batasi jumlah record:**
```
?where=1=1&outFields=*&resultRecordCount=100&f=geojson
```

---

## 📊 STRUKTUR DATA GEOJSON

Setiap feature memiliki properties:

```json
{
  "type": "Feature",
  "properties": {
    "OBJECTID": 123,
    "NAMOBJ": "Banjarnegara",
    "FCODE": "BA03070040",
    "WADMKC": "Banjarnegara",     // Nama Kecamatan
    "WADMKD": "...",               // Nama Desa
    "WADMKK": "Banjarnegara",      // Nama Kabupaten
    "WADMPR": "Jawa Tengah",       // Nama Provinsi
    "KDPKAB": "33.04",             // Kode Kabupaten
    "LUAS": 1234567.89,            // Luas (meter persegi)
    "LUASWH": 1234567.89,          // Luas Wilayah
    "SHAPE.AREA": 1234567.89,      // Area geometry
    "SHAPE.LEN": 12345.67          // Perimeter
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [...]
  }
}
```

---

## 🔄 CARA UPDATE DATA

Jika ingin update data ke versi terbaru:

```bash
cd backend
node download-big-geojson.js
```

Kemudian copy ke frontend:

```bash
cp backend/banjarnegara-big-kecamatan.geojson frontend/public/banjarnegara-kecamatan-geojson.json
```

Refresh browser untuk melihat perubahan.

---

## 📝 CATATAN PENTING

1. **API BIG Tidak Perlu Autentikasi** ✅
   - Query bisa langsung dilakukan tanpa login
   - Data bersifat publik dan open data

2. **Limit Record** ⚠️
   - Default max 1000 records per query
   - Untuk Banjarnegara hanya 20 kecamatan, jadi aman
   - Jika ingin ambil semua kecamatan Indonesia, gunakan: `resultRecordCount=10000`

3. **Koordinat** 📍
   - SR: 4326 (WGS84 - Latitude/Longitude)
   - Cocok untuk Leaflet/Google Maps

4. **Update Data** 🔄
   - Data BIG di-update berkala
   - Script bisa dijalankan ulang untuk dapatkan versi terbaru

5. **CORS** 🌐
   - API BIG mengizinkan query langsung dari browser
   - Tidak perlu proxy atau backend

---

## 🎯 REKOMENDASI

**Untuk penggunaan sehari-hari:**
✅ Gunakan **script** `download-big-geojson.js` (sudah tersedia)

**Untuk sekali download:**
✅ Gunakan **URL langsung** di browser

**Untuk automatisasi/CI-CD:**
✅ Gunakan **cURL** dalam script

**Untuk data yang lebih detail (desa/kelurahan):**
✅ Gunakan **Portal BIG** dengan login

---

## 📞 KONTAK BIG

Jika ada pertanyaan tentang data:

- **Website:** https://big.go.id
- **Geoportal:** https://tanahair.indonesia.go.id
- **GeoServices:** https://geoservices.big.go.id
- **Email:** info@big.go.id

---

## ✨ HASIL INTEGRASI

Data GeoJSON dari BIG sudah terintegrasi sempurna:

✅ **20 Kecamatan** dengan boundary akurat
✅ **Popup interaktif** dengan info detail
✅ **Highlight on hover** untuk setiap kecamatan
✅ **Daftar kecamatan** di bawah peta
✅ **Layer toggle** untuk show/hide boundaries
✅ **Sumber data** dicantumkan (BIG)

**Akses:** http://localhost:3000/dashboard/banjarnegara

---

**© 2026 - Data dari BIG (Badan Informasi Geospasial)**
