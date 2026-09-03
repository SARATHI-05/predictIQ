import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const GoogleLogin = ({ onError, onSuccess, buttonText = 'Continue with Google' }) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Process Supabase OAuth session on redirect arrival
  useEffect(() => {
    let isMounted = true;

    const checkRedirectSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && session.user && isMounted) {
          const hasOAuthParams = window.location.hash.includes('access_token') || window.location.search.includes('code');
          if (hasOAuthParams) {
            setLoading(true);
            setStatusMessage('Connecting with PredictIQ Cloud...');
            if (onError) onError('');

            const backendResult = await loginWithGoogle(session.access_token, session.user);
            if (!isMounted) return;

            if (backendResult.success) {
              window.history.replaceState({}, document.title, window.location.pathname);
              if (onSuccess) onSuccess(backendResult.user);
              navigate('/dashboard');
            } else {
              const err = backendResult.error || 'Authentication failed. Please try again.';
              if (onError) onError(err);
            }
          }
        }
      } catch (redirectErr) {
        console.error('Google Sign-In Redirect error:', redirectErr);
        if (isMounted && onError) {
          onError(redirectErr.message || 'Google authentication failed after redirect.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setStatusMessage('');
        }
      }
    };

    checkRedirectSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Google OAuth Login Trigger via Supabase
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setStatusMessage('Redirecting to Google Sign-In...');
    if (onError) onError('');

    try {
      const redirectUrl = window.location.origin;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Supabase Google Sign-In Error:', error);
      let errorMsg = 'Google authentication failed. Please try again.';
      if (error.message) {
        errorMsg = error.message;
      }
      if (onError) onError(errorMsg);
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="btn-google-custom"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1rem',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '0.75rem',
          color: 'var(--text-primary)',
          fontSize: '0.925rem',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          opacity: loading ? 0.7 : 1
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        <span>{loading ? (statusMessage || 'Signing in...') : buttonText}</span>
      </button>
    </div>
  );
};

export default GoogleLogin;
