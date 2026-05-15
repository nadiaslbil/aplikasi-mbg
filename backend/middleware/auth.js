const jwt = require('jsonwebtoken');
const { db } = require('../database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token tidak tersedia' });
  }

  try {
    // Check if token is blacklisted
    const isBlacklisted = await db('token_blacklist').where({ token }).first();
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Sesi sudah berakhir. Silakan login kembali.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(401).json({ error: 'Token tidak valid atau sudah expired' });
      }

      req.user = user;
      // Store token in request for logout use
      req.token = token;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada sistem autentikasi' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak. Role tidak diizinkan.' });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
