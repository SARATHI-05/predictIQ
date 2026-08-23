import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, 
  User, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff,
  CheckCircle2,
  KeyRound,
  RotateCw,
  ArrowLeft
} from 'lucide-react';
import GoogleLogin from '../components/GoogleLogin';
import { supabase } from '../supabaseClient';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [step, setStep] = useState(1); // 1: Signup Form, 2: OTP Verification
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Verification States
  const [otpCode, setOtpCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  const navigate = useNavigate();
  const { setToken, setUser } = useAuth();

  // Resend Countdown Timer
  useEffect(() => {
    let timer = null;
    if (step === 2 && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  // Step 1: Submit Registration Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();

      // 1. Register with Supabase Auth
      try {
        await supabase.auth.signUp({
          email: trimmedEmail,
          password: password,
          options: {
            data: {
              name: trimmedName,
            }
          }
        });
      } catch (sbErr) {
        console.warn('[Register] Supabase signup notice:', sbErr);
      }

      // 2. Trigger Backend Registration & 6-Digit OTP Generation
      const response = await api.post('/api/auth/register', {
        name: trimmedName,
        email: trimmedEmail,
        password: password
      });

      // Move to Step 2: 6-Digit OTP Verification Screen
      setStep(2);
      setResendTimer(60);
      setResendSuccess(`A 6-digit verification code has been dispatched to ${trimmedEmail}`);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'An unexpected error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-Digit Signup OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setVerifyError('');

    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      setVerifyError('Please enter a valid 6-digit numeric verification code.');
      return;
    }

    setVerifyLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();

      // 1. Try Supabase OTP verification if applicable
      try {
        await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: cleanCode,
          type: 'signup'
        });
      } catch (sbErr) {
        console.warn('[Register] Supabase verify notice:', sbErr);
      }

      // 2. Verify with Backend OTP service & activate account
      const response = await api.post('/api/auth/register/verify', {
        email: trimmedEmail,
        code: cleanCode
      });

      const { access_token, user: userData } = response.data;
      if (access_token && userData) {
        localStorage.setItem('predictiq_token', access_token);
        localStorage.setItem('predictiq_user', JSON.stringify(userData));
        if (setToken) setToken(access_token);
        if (setUser) setUser(userData);
      }

      navigate('/dashboard');
    } catch (err) {
      setVerifyError(err.response?.data?.detail || 'Invalid or expired verification code. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Resend 6-Digit OTP Code
  const handleResendOtp = async () => {
    if (resendTimer > 0 || resendLoading) return;
    setResendLoading(true);
    setVerifyError('');
    setResendSuccess('');

    try {
      const trimmedEmail = email.trim().toLowerCase();
      await api.post('/api/auth/register/resend-code', { email: trimmedEmail });
      setResendTimer(60);
      setResendSuccess(`A fresh 6-digit verification code has been dispatched to ${trimmedEmail}`);
    } catch (err) {
      setVerifyError(err.response?.data?.detail || 'Failed to resend verification code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #131B2A 0%, #0B0F17 100%)',
      padding: '1.5rem',
      position: 'relative'
    }}>
      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '2.5rem',
        borderRadius: '1.25rem',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)'
      }}>
        {step === 1 ? (
          <>
            {/* Logo Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)',
                marginBottom: '0.85rem'
              }}>
                <Sparkles size={30} color="#FFFFFF" />
              </div>

              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Create Account
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                Join PredictIQ AI Food Resource Management
              </p>
            </div>

            {/* PRIMARY SUPABASE GOOGLE SIGN-UP */}
            <div style={{ marginBottom: '1.25rem' }}>
              <GoogleLogin
                buttonText="Sign up with Google"
                onError={(err) => setError(err)}
                onSuccess={() => navigate('/dashboard')}
              />
            </div>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              margin: '1.25rem 0',
              color: 'var(--text-muted)',
              fontSize: '0.725rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
              <span>Or register with email</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            </div>

            {/* Standard Email Registration Form */}
            <form onSubmit={handleSubmit} autoComplete="on">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    className="form-control"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    className="form-control"
                    placeholder="name@organization.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    className="form-control"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  />
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.9rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
              >
                {loading ? 'Sending Verification Code...' : 'Create Account'}
                {!loading && <ArrowRight size={16} />}
              </button>

              {/* Error Alert */}
              {error && (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  borderRadius: '0.75rem',
                  color: '#FB7185',
                  fontSize: '0.825rem',
                  marginTop: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  lineHeight: 1.4
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{error}</span>
                </div>
              )}
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
                Sign In
              </Link>
            </div>
          </>
        ) : (
          /* STEP 2: 6-DIGIT OTP VERIFICATION SCREEN */
          <div className="animate-fade-in">
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)',
                marginBottom: '0.85rem'
              }}>
                <KeyRound size={28} color="#FFFFFF" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Verify Your Email
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: '1.4' }}>
                We sent a 6-digit verification code to <br />
                <strong style={{ color: '#10B981' }}>{email}</strong>
              </p>
            </div>

            {resendSuccess && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '0.75rem',
                color: '#34D399',
                fontSize: '0.825rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={16} />
                <span>{resendSuccess}</span>
              </div>
            )}

            {verifyError && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '0.75rem',
                color: '#FB7185',
                fontSize: '0.825rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                <span>{verifyError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  className="form-control"
                  placeholder="• • • • • •"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    textAlign: 'center',
                    fontSize: '1.75rem',
                    letterSpacing: '0.5rem',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    padding: '0.75rem 0.5rem',
                    color: '#34D399'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={verifyLoading || otpCode.length !== 6}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem' }}
              >
                {verifyLoading ? 'Verifying Account...' : 'Verify & Complete Signup'}
                {!verifyLoading && <ArrowRight size={16} />}
              </button>
            </form>

            {/* Resend Code Section */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <ArrowLeft size={14} />
                <span>Change Email</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || resendLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendTimer > 0 ? 'var(--text-muted)' : '#10B981',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <RotateCw size={14} className={resendLoading ? 'animate-spin' : ''} />
                <span>{resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
