import axios from 'axios';
import { API_URL } from './config';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Let browser/axios set multipart boundary automatically for FormData.
  // Keeping default application/json here makes backend receive no file.
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only logout on 401 (Unauthorized) - token invalid/expired
    // Don't logout on 403 (Forbidden) - user just doesn't have permission
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    // For 403, just reject the promise without logout
    return Promise.reject(error);
  }
);

export default api;
