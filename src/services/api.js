import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Dynamic host fallback for mobile / local network testing
  const hostname = window.location.hostname;
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:8000`;
  }
  return 'http://127.0.0.1:8000';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('predictiq_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if unauthorized on protected endpoints
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('predictiq_token');
        localStorage.removeItem('predictiq_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
