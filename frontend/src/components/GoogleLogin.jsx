import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../context/AuthContext';

const GoogleLogin = ({ onError, onSuccess, buttonText = 'Continue with Google' }) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setStatusMessage('Opening Google Sign-In...');
    if (onError) onError('');

    try {
      // 1. Trigger Firebase Google Popup
      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupErr) {
        // Fallback for mobile Safari / Chrome popup blocking
        if (popupErr.code === 'auth/popup-blocked') {
          setStatusMessage('Redirecting to Google Sign-In...');
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw popupErr;
      }

      const firebaseUser = result.user;
      setStatusMessage('Authenticating with PredictIQ Cloud...');

      // 2. Obtain secure Firebase ID token
      const idToken = await firebaseUser.getIdToken();

      // 3. Send token to backend to sync SQL database
      const backendResult = await loginWithGoogle(idToken, firebaseUser);

      if (backendResult.success) {
        if (onSuccess) onSuccess(backendResult.user);
        navigate('/dashboard');
      } else {
        const err = backendResult.error || 'Backend verification failed. Please try again.';
        if (onError) onError(err);
      }
    } catch (error) {
      console.error('Firebase Google Sign-In Error:', error);
      let errorMsg = 'Google authentication failed. Please try again.';

      if (error.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Sign-in cancelled. The popup was closed before completing.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMsg = 'Only one popup request is allowed at a time.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMsg = 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
      } else if (error.code === 'auth/unauthorized-domain') {
        const currentHost = window.location.hostname;
        errorMsg = `The domain "${currentHost}" is not authorized in Firebase Console. Please add it to Firebase Console -> Authentication -> Settings -> Authorized Domains.`;
      } else if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
        errorMsg = 'Google Sign-In is not enabled in Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method -> Click "Google" -> Toggle "Enable" -> Select your support email -> Click Save.';
      } else if (error.code === 'auth/invalid-api-key' || error.code === 'auth/configuration-not-found') {
        errorMsg = 'Firebase configuration is incomplete. Please check your Firebase environment variables.';
      } else if (error.message) {
        errorMsg = error.message;
      }

      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="btn"
      style={{
        width: '100%',
        padding: '0.85rem 1.25rem',
        background: '#FFFFFF',
        color: '#1F2937',
        border: 'none',
        borderRadius: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.85rem',
        fontSize: '0.925rem',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)',
        transition: 'all 0.2s ease',
        opacity: loading ? 0.85 : 1
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 255, 255, 0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.25)';
        }
      }}
    >
      {/* Official Google Multicolor Icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
      </svg>
      <span>{statusMessage || buttonText}</span>
    </button>
  );
};

export default GoogleLogin;
