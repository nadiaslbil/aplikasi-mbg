const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists - Only in local development
const uploadsDir = path.join(process.cwd(), 'uploads');

// Only try to create the directory if we are not on Vercel
if (!process.env.VERCEL) {
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (err) {
      console.warn('Warning: Could not create uploads directory:', err.message);
    }
  }
}

// Storage configuration - Use memory storage for Vercel, disk for local
// Note: Vercel serverless functions have a read-only filesystem except for /tmp
const storage = process.env.VERCEL 
  ? multer.memoryStorage() 
  : multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, uploadsDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `bukti-${uniqueSuffix}${ext}`);
      }
    });

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Hanya gambar (JPG, PNG, GIF, WebP, HEIC/HEIF) yang diperbolehkan.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

const handleMulterError = (err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message });
  next();
};

module.exports = { upload, handleMulterError, uploadsDir };
