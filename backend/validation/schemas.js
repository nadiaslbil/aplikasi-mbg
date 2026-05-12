const { z } = require('zod');

// Authentication Schemas
const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const registerSchema = z.object({
  nama: z.string().min(3, 'Nama minimal 3 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']).optional(),
});

// Sekolah Schemas
const sekolahSchema = z.object({
  nama: z.string().min(3, 'Nama sekolah minimal 3 karakter'),
  alamat: z.string().min(5, 'Alamat minimal 5 karakter'),
  latitude: z.number().or(z.string().transform(v => parseFloat(v))),
  longitude: z.number().or(z.string().transform(v => parseFloat(v))),
  kecamatan: z.string().min(2, 'Kecamatan wajib diisi'),
  kabupaten: z.string().min(2, 'Kabupaten wajib diisi'),
  provinsi: z.string().min(2, 'Provinsi wajib diisi'),
  jumlah_siswa: z.number().int().nonnegative().optional().default(0),
  kontak: z.string().nullable().optional(),
  status: z.enum(['aktif', 'nonaktif']).optional().default('aktif'),
});

// Dapur Schemas
const dapurSchema = z.object({
  nama: z.string().min(3, 'Nama dapur minimal 3 karakter'),
  alamat: z.string().min(5, 'Alamat minimal 5 karakter'),
  latitude: z.number().or(z.string().transform(v => parseFloat(v))),
  longitude: z.number().or(z.string().transform(v => parseFloat(v))),
  kecamatan: z.string().min(2, 'Kecamatan wajib diisi'),
  kapasitas_harian: z.number().int().nonnegative().optional().default(0),
  kontak: z.string().nullable().optional(),
  status: z.enum(['aktif', 'nonaktif']).optional().default('aktif'),
  user_id: z.number().int().optional().nullable(),
});

// Settings Schema
const settingsSchema = z.record(z.string(), z.any());

// User Schema
const userUpdateSchema = z.object({
  nama: z.string().min(3, 'Nama minimal 3 karakter').optional(),
  email: z.string().email('Format email tidak valid').optional(),
  no_telp: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  role: z.enum(['admin_bgn', 'admin_daerah', 'kurir', 'supplier']).optional(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Password lama wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
});

// Incident Schema
const insidenSchema = z.object({
  sekolah_id: z.number().int().optional().nullable(),
  dapur_id: z.number().int().optional().nullable(),
  tipe: z.string().min(2, 'Tipe insiden wajib diisi'),
  deskripsi: z.string().min(5, 'Deskripsi minimal 5 karakter'),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  tanggal: z.string().optional().default(() => new Date().toISOString().split('T')[0]),
  status: z.enum(['pending', 'proses', 'selesai']).optional().default('pending'),
});

// Stok Schema
const stokSchema = z.object({
  dapur_id: z.number().int(),
  nama_bahan: z.string().min(2, 'Nama bahan wajib diisi'),
  jumlah: z.number().nonnegative(),
  satuan: z.string().min(1, 'Satuan wajib diisi'),
  expired_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
});

// Helper for validating and sending error response
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.errors[0].message,
        details: error.errors 
      });
    }
    next(error);
  }
};

// Jadwal Schema
const jadwalSchema = z.object({
  dapur_id: z.number().int(),
  sekolah_id: z.number().int(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  waktu_kirim: z.string().nullable().optional(),
  waktu_terima: z.string().nullable().optional(),
  jumlah_porsi: z.number().int().positive('Jumlah porsi harus lebih dari 0'),
  status: z.enum(['terjadwal', 'dalam_pengiriman', 'diterima', 'gagal']).optional().default('terjadwal'),
  catatan: z.string().nullable().optional(),
  kurir_id: z.number().int().optional().nullable(),
});

module.exports = {
  loginSchema,
  registerSchema,
  sekolahSchema,
  dapurSchema,
  settingsSchema,
  userUpdateSchema,
  changePasswordSchema,
  insidenSchema,
  stokSchema,
  jadwalSchema,
  validate
};
