// Firebase Client Configuration for PredictIQ
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCzKKdfJCP-wlIEwvRVKJ3q0W_v2IjXTHE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "predictiq-77.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "predictiq-77",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "predictiq-77.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "324447986736",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:324447986736:web:e5b74167cac5bb0f2239f5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-MHY2C4W388"
};

// Initialize Firebase once
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication with Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Request profile and email
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
