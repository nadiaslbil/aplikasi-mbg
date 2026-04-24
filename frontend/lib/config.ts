// Jika di production, gunakan /api (relative path) agar tidak kena CORS
// Jika di local, gunakan localhost:5000
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? '/api' 
    : 'http://localhost:5000/api');
