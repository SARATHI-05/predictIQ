// Firebase Client Configuration for PredictIQ
// To enable Google Sign-In:
// 1. Go to Firebase Console (https://console.firebase.google.com/)
// 2. Create a project and enable Authentication -> Sign-in method -> Google (Enabled).
// 3. Register a Web App and copy your config values to your .env file.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForPredictIQDemo2026",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "predictiq-auth.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "predictiq-auth",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "predictiq-auth.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1029384756",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1029384756:web:abcdef123456"
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
