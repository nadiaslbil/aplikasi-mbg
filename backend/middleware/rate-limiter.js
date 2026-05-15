const rateLimit = require('express-rate-limit');

/**
 * Rate limiter untuk endpoint login
 * Membatasi maksimal 5 percobaan login gagal dalam 15 menit
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // Batas maksimal 10 request per IP (termasuk sukses/gagal)
  message: {
    error: 'Terlalu banyak percobaan login. Silakan coba lagi setelah 15 menit.'
  },
  standardHeaders: true, // Kembalikan info rate limit di header `RateLimit-*`
  legacyHeaders: false, // Nonaktifkan header `X-RateLimit-*`
});

/**
 * Rate limiter umum untuk API
 * Mencegah spam secara umum
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 100, // Batas 100 request per IP per menit
  message: {
    error: 'Terlalu banyak permintaan ke server. Silakan tunggu sebentar.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  apiLimiter
};
