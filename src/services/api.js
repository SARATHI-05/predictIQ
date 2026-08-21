import axios from 'axios';

const getApiBaseUrl = () => {
  // 1. Explicit environment variable set in Vercel / Render / .env
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const hostname = window.location.hostname;

  // 2. Production Vercel / Netlify CDN deployments
  if (hostname.includes('vercel.app') || hostname.includes('netlify.app') || hostname.includes('render.com')) {
    return 'https://predictiq-backend.onrender.com';
  }

  // 3. Local Wi-Fi network testing from mobile phone (e.g. 192.168.x.x)
  if (
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  ) {
    return `http://${hostname}:8000`;
  }

  // 4. Default local development fallback
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
