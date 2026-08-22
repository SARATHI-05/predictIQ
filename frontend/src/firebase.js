// Firebase Client Configuration for PredictIQ
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAS0-sCBMzjci-BsJ9tpoK0OpCItA66zOk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "predictiq-b5039.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "predictiq-b5039",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "predictiq-b5039.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "355947199257",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:355947199257:web:1331d0cdb93469aa0be388"
};

// Initialize Firebase once
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication with Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Request basic profile and email
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
