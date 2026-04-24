// Gunakan path relatif '/api' agar memanggil domain yang sama (Theta)
// Ini akan menghilangkan masalah CORS selamanya
function normalizeApiUrl(raw?: string) {
  if (!raw) return raw;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_URL =
  normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL) ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '/api'
    : 'http://localhost:5000/api');
