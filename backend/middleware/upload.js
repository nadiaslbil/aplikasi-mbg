const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use writable directory on each environment.
// Vercel allows writes only under /tmp.
const uploadsDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.warn('Warning: Could not create uploads directory:', err.message);
  }
}

// Always use disk storage so uploaded files can be served by static route.
const storage = multer.diskStorage({
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
