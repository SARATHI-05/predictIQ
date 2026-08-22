import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, User, Lock, Mail, Shield, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle, Clock, RotateCcw } from 'lucide-react';
import GoogleLogin from '../components/GoogleLogin';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Register = () => {
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('Staff');

  // Multi-step state: 'form' -> 'verify' -> 'complete'
  const [step, setStep] = useState('form');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const codeInputRefs = useRef([]);

  // UI state
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-focus first code input when entering verification step
  useEffect(() => {
    if (step === 'verify' && codeInputRefs.current[0]) {
      setTimeout(() => codeInputRefs.current[0]?.focus(), 150);
    }
  }, [step]);

  // --- Step 1: Send verification code ---
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auth/send-signup-code', { email: email.trim().toLowerCase() });
      if (response.data?.success) {
        setStep('verify');
        setSuccessMessage(`Verification code sent to ${email.trim().toLowerCase()}`);
        setResendCooldown(60);
      }
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to send verification code. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // --- Resend verification code ---
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/send-signup-code', { email: email.trim().toLowerCase() });
      if (response.data?.success) {
        setSuccessMessage(`Verification code sent to ${email.trim().toLowerCase()}`);
        setResendCooldown(60);
        setVerificationCode(['', '', '', '', '', '']);
        codeInputRefs.current[0]?.focus();
      }
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to resend verification code.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // --- Code input handlers ---
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1); // single digit
    setVerificationCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newCode = [...verificationCode];
      for (let i = 0; i < 6; i++) {
        newCode[i] = pasted[i] || '';
      }
      setVerificationCode(newCode);
      const focusIdx = Math.min(pasted.length, 5);
      codeInputRefs.current[focusIdx]?.focus();
    }
  };

  // --- Step 2: Verify code & complete registration ---
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      // Register with the verified code
      const result = await register(name.trim(), email.trim().toLowerCase(), password, role, code);

      if (result.success) {
        setStep('complete');
        setSuccessMessage(`Account created successfully! Welcome email sent to ${email.trim().toLowerCase()}`);
        // Navigate to dashboard after a brief delay to show success
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Go back to form ---
  const handleBackToForm = () => {
    setStep('form');
    setError('');
    setSuccessMessage('');
    setVerificationCode(['', '', '', '', '', '']);
  };

  // Shared styles
  const codeInputStyle = {
    width: '48px',
    height: '56px',
    textAlign: 'center',
    fontSize: '1.5rem',
    fontWeight: 700,
    fontFamily: "'Courier New', Courier, monospace",
    background: 'rgba(255, 255, 255, 0.05)',
    border: '2px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    color: '#34D399',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    caretColor: '#10B981',
    letterSpacing: '0'
  };

  const codeInputFocusStyle = {
    ...codeInputStyle,
    borderColor: '#10B981',
    boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)'
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
            {step === 'form' && 'Create Account'}
            {step === 'verify' && 'Verify Your Email'}
            {step === 'complete' && 'Welcome to PredictIQ!'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
            {step === 'form' && 'Join PredictIQ AI Food Resource Management'}
            {step === 'verify' && (
              <>Enter the 6-digit code sent to <strong style={{ color: '#34D399' }}>{email.trim().toLowerCase()}</strong></>
            )}
            {step === 'complete' && 'Your account is ready'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '0.85rem 1rem',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '0.75rem',
            color: '#FB7185',
            fontSize: '0.825rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            lineHeight: 1.4
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div style={{
            padding: '0.85rem 1rem',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '0.75rem',
            color: '#34D399',
            fontSize: '0.825rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            lineHeight: 1.4
          }}>
            <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========== STEP 1: Registration Form ========== */}
        {step === 'form' && (
          <>
            {/* PRIMARY FIREBASE GOOGLE SIGN-UP */}
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
            <form onSubmit={handleSendCode} autoComplete="on">
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

              <div className="form-group">
                <label className="form-label">Role Designation</label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="form-control"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  >
                    <option value="Staff">Kitchen Staff (Food Records, Predictions, Reports)</option>
                    <option value="Admin">System Administrator (Full Management & ML)</option>
                  </select>
                  <Shield size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
              >
                {loading ? 'Sending Verification Code...' : 'Send Verification Code'}
                {!loading && <Mail size={16} style={{ marginLeft: '0.5rem' }} />}
              </button>
            </form>
          </>
        )}

        {/* ========== STEP 2: Email Verification ========== */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyAndRegister}>
            {/* 6-digit code inputs */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.5rem',
              margin: '1.5rem 0'
            }}>
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (codeInputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  onPaste={index === 0 ? handleCodePaste : undefined}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10B981';
                    e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.target.style.boxShadow = 'none';
                  }}
                  style={codeInputStyle}
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            {/* Expiry notice */}
            <div style={{
              textAlign: 'center',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem'
            }}>
              <Clock size={13} />
              <span>Code expires in 10 minutes</span>
            </div>

            {/* Verify & Create Account button */}
            <button
              type="submit"
              disabled={loading || verificationCode.join('').length !== 6}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', marginBottom: '0.75rem' }}
            >
              {loading ? 'Verifying & Creating Account...' : 'Verify & Create Account'}
              {!loading && <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />}
            </button>

            {/* Resend code */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              marginTop: '0.75rem'
            }}>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? 'var(--text-muted)' : '#10B981',
                  fontSize: '0.825rem',
                  cursor: resendCooldown > 0 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600,
                  padding: 0
                }}
              >
                <RotateCcw size={14} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>

            {/* Back to form */}
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={handleBackToForm}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                ← Change email or details
              </button>
            </div>
          </form>
        )}

        {/* ========== STEP 3: Success ========== */}
        {step === 'complete' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <CheckCircle size={32} color="#34D399" />
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Redirecting to dashboard...
            </p>
          </div>
        )}

        {/* Sign In link */}
        {step !== 'complete' && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
