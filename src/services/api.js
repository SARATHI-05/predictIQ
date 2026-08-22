import axios from 'axios';
import { auth } from '../firebase';

// Dynamic API Base URL resolution
export const getApiBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // 1. Mobile / LAN Wi-Fi testing (e.g. 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isPrivateLan =
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

    if (isPrivateLan) {
      // If VITE_API_URL is local (localhost / 127.0.0.1 or empty), use the current LAN host IP
      if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return `http://${hostname}:8000`;
      }
      return envUrl;
    }

    // 2. Local PC testing
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return envUrl || 'http://127.0.0.1:8000';
    }

    // 3. Deployed production environments (Vercel, Render, etc.)
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }
  }

  return envUrl;
};

const API_BASE_URL = getApiBaseUrl();

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
  (response) => {
    // Check if a static SPA index.html was returned instead of JSON (common when backend is not deployed on CDN/Vercel)
    if (
      typeof response.data === 'string' &&
      (response.data.trim().startsWith('<!doctype') || response.data.trim().startsWith('<html'))
    ) {
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
      const detailMsg = isVercel
        ? 'Backend API not connected: The API request was redirected to the Vercel static frontend. Set VITE_API_URL in your Vercel Environment Variables to your live backend service.'
        : 'Backend API returned HTML instead of JSON. Please ensure the FastAPI backend is running.';
      
      const customErr = new Error(detailMsg);
      customErr.response = {
        status: 503,
        data: { detail: detailMsg }
      };
      return Promise.reject(customErr);
    }
    return response;
  },
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
