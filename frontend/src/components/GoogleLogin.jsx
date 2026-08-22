import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, RotateCw, X } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../context/AuthContext';

const GoogleLogin = ({ onError, onSuccess, buttonText = 'Continue with Google' }) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Verification Modal State for First-Time Google Users
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyName, setVerifyName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccessMsg, setVerifySuccessMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const { loginWithGoogle, verifyGoogleOtp, resendGoogleOtp } = useAuth();
  const navigate = useNavigate();

  // Resend Countdown Timer
  useEffect(() => {
    let timer = null;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  // Process Mobile Google Sign-In Redirect Results on page load
  useEffect(() => {
    let isMounted = true;

    const processRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user && isMounted) {
          setLoading(true);
          setStatusMessage('Connecting with PredictIQ Cloud...');
          if (onError) onError('');

          const firebaseUser = result.user;
          const idToken = await firebaseUser.getIdToken();
          const backendResult = await loginWithGoogle(idToken, firebaseUser);

          if (!isMounted) return;

          if (backendResult.requiresVerification) {
            setVerifyEmail(backendResult.email || firebaseUser.email);
            setVerifyName(backendResult.name || firebaseUser.displayName || 'Google User');
            setVerifySuccessMsg(backendResult.message || `A 6-digit verification code has been sent to ${backendResult.email}`);
            setResendTimer(60);
            setShowVerifyModal(true);
            return;
          }

          if (backendResult.success) {
            if (onSuccess) onSuccess(backendResult.user);
            navigate('/dashboard');
          } else {
            const err = backendResult.error || 'Backend verification failed. Please try again.';
            if (onError) onError(err);
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

    processRedirect();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setStatusMessage('Opening Google Sign-In...');
    if (onError) onError('');

    try {
      // 1. Attempt Popup Sign-In first (Desktop & Mobile browsers supporting popups)
      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupErr) {
        // Fall back to Redirect on popup blockers or mobile webviews
        if (
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/cancelled-popup-request' ||
          popupErr.code === 'auth/popup-closed-by-user'
        ) {
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

      // 3. Send token to Render backend to sync SQL database
      const backendResult = await loginWithGoogle(idToken, firebaseUser);

      // 4. Check if first-time user requires 6-digit OTP verification
      if (backendResult.requiresVerification) {
        setVerifyEmail(backendResult.email || firebaseUser.email);
        setVerifyName(backendResult.name || firebaseUser.displayName || 'Google User');
        setVerifySuccessMsg(backendResult.message || `A 6-digit verification code has been sent to ${backendResult.email}`);
        setResendTimer(60);
        setShowVerifyModal(true);
        return;
      }

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
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'domain';
        errorMsg = `The domain "${currentHost}" is not authorized in Firebase Console. Please add "${currentHost}" in Firebase Console -> Authentication -> Settings -> Authorized Domains.`;
      } else if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
        errorMsg = 'Google Sign-In is not enabled in Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method -> Click "Google" -> Toggle "Enable" -> Select project support email -> Click Save.';
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

  // Submit 6-digit OTP verification code
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setVerifyError('Please enter the full 6-digit verification code.');
      return;
    }

    setVerifyError('');
    setVerifyLoading(true);

    const result = await verifyGoogleOtp(verifyEmail, otpCode.trim());
    setVerifyLoading(false);

    if (result.success) {
      setShowVerifyModal(false);
      if (onSuccess) onSuccess(result.user);
      navigate('/dashboard');
    } else {
      setVerifyError(result.error);
    }
  };

  // Resend 6-digit OTP code to Gmail
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setVerifyError('');
    setVerifySuccessMsg('');
    setVerifyLoading(true);

    const result = await resendGoogleOtp(verifyEmail);
    setVerifyLoading(false);

    if (result.success) {
      setResendTimer(60);
      setVerifySuccessMsg(`A fresh verification code has been dispatched to ${verifyEmail}`);
    } else {
      setVerifyError(result.error);
    }
  };

  return (
    <>
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

      {/* GOOGLE EMAIL OTP VERIFICATION MODAL */}
      {showVerifyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.25rem'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '450px',
            padding: '2.25rem',
            borderRadius: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.75)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowVerifyModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)',
                marginBottom: '0.85rem'
              }}>
                <Mail size={26} color="#FFFFFF" />
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Verify Your Google Account
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                We've sent a 6-digit verification code to:
              </p>
              <div style={{
                display: 'inline-block',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.35rem 0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#34D399',
                marginTop: '0.4rem'
              }}>
                {verifyEmail}
              </div>
            </div>

            {/* Error message */}
            {verifyError && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '0.75rem',
                color: '#FB7185',
                fontSize: '0.825rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Success info */}
            {verifySuccessMsg && !verifyError && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '0.75rem',
                color: '#34D399',
                fontSize: '0.825rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{verifySuccessMsg}</span>
              </div>
            )}

            {/* Verification Form */}
            <form onSubmit={handleVerifyOtp}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ textAlign: 'center', display: 'block', marginBottom: '0.5rem' }}>
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  placeholder="••••••"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="form-control"
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    textAlign: 'center',
                    letterSpacing: '0.35em',
                    fontFamily: 'monospace',
                    padding: '0.75rem'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.775rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Code valid for 15 mins</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || verifyLoading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: resendTimer > 0 ? 'var(--text-muted)' : 'var(--accent-primary)',
                      cursor: resendTimer > 0 ? 'default' : 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: 0
                    }}
                  >
                    <RotateCw size={13} className={verifyLoading ? 'animate-spin' : ''} />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={verifyLoading || otpCode.length !== 6}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontWeight: 700 }}
              >
                {verifyLoading ? 'Verifying...' : 'Verify & Complete Signup'}
                {!verifyLoading && <ArrowRight size={16} />}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GoogleLogin;
