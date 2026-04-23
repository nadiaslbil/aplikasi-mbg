# 🍱 MBG Distribution System

Sistem Informasi Distribusi Makanan Bergizi Gratis (MBG) dengan Peta Interaktif dan Real-time Tracking.

## 🚀 Fitur Utama

### ✅ **Dashboard Monitoring**
- Statistik real-time distribusi MBG
- Monitoring sekolah, dapur, dan pengiriman
- Alert untuk insiden dan stok yang hampir expired

### ✅ **Peta Interaktif (Leaflet.js)**
- Visualisasi lokasi sekolah penerima MBG
- Visualisasi lokasi dapur/supplier
- Real-time tracking posisi kurir
- Peta insiden dan laporan
- Filter berdasarkan kategori
- **Batas administratif kecamatan Banjarnegara** (20 kecamatan)
- GeoJSON integration untuk wilayah spesifik

### ✅ **Manajemen Data Master**
- CRUD Data Sekolah (nama, alamat, koordinat GPS, jumlah siswa)
- CRUD Data Dapur/Supplier (kapasitas produksi, kontak)
- CRUD Jadwal Distribusi
- CRUD Pengiriman dan Tracking
- Manajemen Stok Bahan Makanan
- Insiden dan Laporan

### ✅ **Autentikasi & Otorisasi**
- JWT-based authentication
- Role-based access control (Admin BGN, Admin Daerah, Kurir, Supplier)

### ✅ **Real-time Communication**
- Socket.io untuk live tracking kurir
- Update posisi otomatis di peta

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React, TypeScript, TailwindCSS |
| **Maps/GIS** | Leaflet.js + React-Leaflet + OpenStreetMap |
| **Backend** | Node.js + Express.js |
| **Database** | SQLite (sqlite3) |
| **Real-time** | Socket.io |
| **Charts** | Lucide React Icons |
| **Forms** | React Hook Form |

## 📦 Instalasi & Setup

### Prerequisites
- Node.js >= 18
- npm atau yarn

### 1. Clone Repository
```bash
git clone <repository-url>
cd aplikasimbg
```

### 2. Setup Backend
```bash
cd backend
npm install

# Seed data dummy
npm run seed

# Start backend server
npm run dev
```

Backend akan berjalan di: `http://localhost:5000`

### 3. Setup Frontend
```bash
cd ../frontend
npm install

# Start frontend development server
npm run dev
```

Frontend akan berjalan di: `http://localhost:3000`

## 👤 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin BGN | admin@mbg.go.id | admin123 |
| Admin Daerah | daerah1@mbg.go.id | daerah123 |
| Kurir | kurir1@mbg.go.id | kurir123 |
| Supplier | dapur1@mbg.go.id | dapur123 |

## 📁 Struktur Project

```
aplikasimbg/
├── backend/                # Express.js API Server
│   ├── database.js         # SQLite database setup
│   ├── server.js           # Main server file (all routes)
│   ├── seed.js             # Dummy data seeder
│   ├── middleware/
│   │   └── auth.js         # JWT authentication middleware
│   ├── routes/             # API routes (legacy, not used)
│   └── package.json
│
├── frontend/               # Next.js Application
│   ├── app/                # App router pages
│   │   ├── layout.tsx      # Root layout with AuthProvider
│   │   ├── page.tsx        # Home/redirect page
│   │   ├── globals.css     # Global styles
│   │   ├── login/
│   │   │   └── page.tsx    # Login page
│   │   └── dashboard/
│   │       ├── page.tsx    # Main dashboard with stats & map
│   │       ├── peta/
│   │       │   └── page.tsx    # Interactive map page
│   │       ├── sekolah/
│   │       │   └── page.tsx    # School management CRUD
│   │       ├── dapur/      # Kitchen management (TODO)
│   │       ├── jadwal/     # Distribution schedule (TODO)
│   │       ├── pengiriman/ # Delivery tracking (TODO)
│   │       └── insiden/    # Incident reports (TODO)
│   ├── components/
│   │   └── DistributionMap.tsx  # Leaflet map component
│   ├── context/
│   │   └── AuthContext.tsx      # Authentication context
│   ├── lib/
│   │   ├── api.ts               # Axios API client
│   │   └── config.ts            # Configuration
│   └── package.json
└── README.md
```

## 🗺️ API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (requires auth)
- `GET /api/auth/me` - Get current user

### Sekolah (Schools)
- `GET /api/sekolah` - Get all schools
- `GET /api/sekolah/:id` - Get school by ID
- `POST /api/sekolah` - Create school
- `PUT /api/sekolah/:id` - Update school
- `DELETE /api/sekolah/:id` - Delete school

### Dapur Supplier (Kitchens)
- `GET /api/dapur` - Get all kitchens
- `POST /api/dapur` - Create kitchen
- `PUT /api/dapur/:id` - Update kitchen
- `DELETE /api/dapur/:id` - Delete kitchen

### Jadwal Distribusi (Distribution Schedule)
- `GET /api/jadwal` - Get all schedules
- `POST /api/jadwal` - Create schedule
- `PUT /api/jadwal/:id` - Update schedule
- `DELETE /api/jadwal/:id` - Delete schedule

### Pengiriman (Deliveries)
- `GET /api/pengiriman` - Get all deliveries
- `POST /api/pengiriman` - Create delivery
- `PUT /api/pengiriman/:id` - Update delivery (includes location tracking)
- `GET /api/pengiriman/tracking/active` - Get active courier locations

### Stok (Inventory)
- `GET /api/stok` - Get all stock items
- `POST /api/stok` - Create stock item

### Insiden (Incidents)
- `GET /api/insiden` - Get all incidents
- `POST /api/insiden` - Report incident

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/map-data` - Get all map data (schools, kitchens, couriers, incidents)

## 🎨 Screenshots

### Login Page
Halaman login dengan desain modern dan demo account info.

### Dashboard
- Statistik cards (sekolah aktif, dapur aktif, jadwal hari ini, insiden)
- Peta interaktif dengan filter
- Quick stats dan informasi sistem

### Peta Distribusi
- Marker sekolah (🏫), dapur (🍳), kurir (🚚), insiden (⚠️)
- Popup informasi detail untuk setiap marker
- Filter buttons untuk menampilkan/menyembunyikan kategori
- Legend/keterangan

### Manajemen Sekolah
- Tabel data sekolah dengan search
- Form tambah/edit sekolah
- Koordinat GPS untuk pemetaan
- Status aktif/nonaktif

## 🔐 Security Features

- JWT token authentication
- Password hashing dengan bcrypt
- Protected API routes
- Role-based access control
- CORS enabled for frontend

## 🚧 Development Roadmap

- [x] Setup project structure
- [x] Database schema & SQLite integration
- [x] Backend API endpoints
- [x] Frontend dashboard with statistics
- [x] Interactive map with Leaflet
- [x] School management CRUD
- [ ] Dapur supplier management page
- [ ] Distribution scheduling page
- [ ] Delivery tracking with real-time updates
- [ ] Incident reporting system
- [ ] Stock management
- [ ] User management
- [ ] Export reports (PDF, Excel)
- [ ] Mobile app for couriers

## 📝 Database Schema

### Tables
- **users** - User accounts (admin, kurir, supplier)
- **sekolah** - Schools receiving MBG
- **dapur_supplier** - Kitchens/suppliers
- **jadwal_distribusi** - Distribution schedules
- **pengiriman** - Delivery tracking with GPS coordinates
- **stok_bahan** - Kitchen inventory
- **insiden** - Incident reports

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License

## 👨‍💻 Developer

Dikembangkan untuk sistem distribusi Makanan Bergizi Gratis (MBG) Indonesia.

---

**© 2026 MBG Distribution System. All rights reserved.**
