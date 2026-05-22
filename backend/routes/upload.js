const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/', authenticateToken, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload gagal' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File tidak ditemukan. Field harus bernama "file".' });
    }

    try {
      // Upload ke Cloudinary menggunakan stream
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'mbg_distribution/bukti_pengiriman',
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            return res.status(500).json({ error: 'Gagal mengupload ke Cloudinary' });
          }
          
          // Kembalikan URL lengkap dari Cloudinary
          return res.status(200).json({
            message: 'Upload berhasil',
            filename: result.secure_url,
          });
        }
      );

      uploadStream.end(req.file.buffer);
    } catch (error) {
      console.error('Upload route error:', error);
      res.status(500).json({ error: 'Terjadi kesalahan server saat upload' });
    }
  });
});

module.exports = router;
