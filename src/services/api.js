import axios from 'axios';
import { auth } from '../firebase';

// Ensure baseURL handles VITE_API_URL correctly in production
const rawApiUrl = import.meta.env.VITE_API_URL || '';
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach fresh Firebase ID Token or standard JWT
api.interceptors.request.use(
  async (config) => {
    try {
      if (auth && auth.currentUser) {
        // Obtain current Firebase user ID token dynamically without storing it in localStorage
        const fbToken = await auth.currentUser.getIdToken();
        if (fbToken) {
          config.headers.Authorization = `Bearer ${fbToken}`;
          return config;
        }
      }
    } catch (tokenErr) {
      console.warn('[API Auth] Failed to retrieve dynamic Firebase ID token:', tokenErr);
    }

    // Fallback to local session token if available
    const localToken = localStorage.getItem('predictiq_token');
    if (localToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${localToken}`;
    }

    return config;
  },
  (error) => {
    console.error('[API Request Setup Error]:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Token Refresh Retry & Structured Error Logging
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Error Diagnosis & Logging
    if (error.response) {
      const { status, data } = error.response;
      console.warn(`[API ${status} Error] [${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}]:`, data?.detail || data?.message || data);

      // Handle 401 Unauthorized with automatic token refresh and single retry
      if (status === 401 && !originalRequest._retry && auth?.currentUser) {
        originalRequest._retry = true;
        try {
          console.info('[API Auth] 401 received. Refreshing Firebase ID token with getIdToken(true)...');
          const refreshedToken = await auth.currentUser.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          console.error('[API Auth] Token refresh failed:', refreshErr);
        }
      }
    } else if (error.request) {
      // Network Error / CORS Error / Server Down
      console.error(`[API Network/CORS Error] Cannot reach backend API at "${API_BASE_URL}". Please verify VITE_API_URL and backend CORS configuration.`, error);
    } else {
      console.error('[API Setup Error]:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
