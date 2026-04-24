// Gunakan path relatif '/api' agar memanggil domain yang sama (Theta)
// Ini akan menghilangkan masalah CORS selamanya
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? '/api' 
    : 'http://localhost:5000/api');
