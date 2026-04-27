const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.post('/', authenticateToken, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload gagal' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File tidak ditemukan. Field harus bernama "file".' });
    }

    const filename = req.file.filename || req.file.originalname;
    return res.status(200).json({
      message: 'Upload berhasil',
      filename,
    });
  });
});

module.exports = router;
