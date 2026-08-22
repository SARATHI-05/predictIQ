import axios from 'axios';
import { auth } from '../firebase';

// Official Production Backend URL
export const PRODUCTION_BACKEND_URL = 'https://predictiq-backend-wln6.onrender.com';

// Dynamic API Base URL resolution
export const getApiBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // 1. Local PC development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return envUrl || 'http://127.0.0.1:8000';
    }

    // 2. Mobile / LAN Wi-Fi testing (e.g. 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isPrivateLan =
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

    if (isPrivateLan) {
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl;
      }
      return `http://${hostname}:8000`;
    }

    // 3. Deployed production environments (Vercel, custom domain, etc.)
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }

    // Fallback for all public/production deployments
    return PRODUCTION_BACKEND_URL;
  }

  return envUrl || PRODUCTION_BACKEND_URL;
};

export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s timeout to accommodate Render cold boot
});

// Request Interceptor: Attach fresh Firebase ID Token or standard JWT
api.interceptors.request.use(
  async (config) => {
    try {
      if (auth && auth.currentUser) {
        const fbToken = await auth.currentUser.getIdToken();
        if (fbToken) {
          config.headers.Authorization = `Bearer ${fbToken}`;
          return config;
        }
      }
    } catch (tokenErr) {
      console.warn('[API Auth] Dynamic Firebase token retrieval notice:', tokenErr);
    }

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

// Response Interceptor: Structured Error Logging, Cold-Start Retry & HTML Detection
api.interceptors.response.use(
  (response) => {
    // Check if a static SPA index.html was returned instead of JSON (misrouted request)
    if (
      typeof response.data === 'string' &&
      (response.data.trim().startsWith('<!doctype') || response.data.trim().startsWith('<html'))
    ) {
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
      const detailMsg = isVercel
        ? 'Backend API misrouted to static frontend. Ensure VITE_API_URL points to https://predictiq-backend-wln6.onrender.com.'
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

    // Automatic single retry on Render cold-start / network blip (502/503/504 or network timeout)
    const isColdStartOrNetwork =
      !error.response ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      [502, 503, 504].includes(error.response?.status);

    if (isColdStartOrNetwork && originalRequest && !originalRequest._isRetry) {
      originalRequest._isRetry = true;
      console.warn('[API Network Retry] Server may be waking up (Render cold start). Retrying request in 2s...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return api(originalRequest);
    }

    // Handle 401 Unauthorized with token refresh if using Firebase
    if (error.response?.status === 401 && originalRequest && !originalRequest._tokenRetry && auth?.currentUser) {
      originalRequest._tokenRetry = true;
      try {
        const refreshedToken = await auth.currentUser.getIdToken(true);
        originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        console.error('[API Auth] Token refresh failed:', refreshErr);
      }
    }

    // Error Diagnosis & Logging
    if (error.response) {
      const { status, data } = error.response;
      console.warn(`[API ${status} Error] [${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}]:`, data?.detail || data?.message || data);
    } else if (error.request) {
      console.error(`[API Network/CORS Error] Cannot reach backend API at "${API_BASE_URL}". Please verify backend status and CORS configuration.`, error);
    } else {
      console.error('[API Setup Error]:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
