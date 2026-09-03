import { useState } from 'react';
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
  Inbox,
  X
} from 'lucide-react';
import GoogleLogin from '../components/GoogleLogin';
import { supabase } from '../supabaseClient';
import api from '../services/api';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const navigate = useNavigate();

  // Submit Registration Form with Supabase Verification Link
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
      const verificationRedirectUrl = `${window.location.origin}/account-verified`;

      // 1. Register with Supabase Auth (Dispatches verification email with redirect to /account-verified)
      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: password,
        options: {
          data: {
            name: trimmedName,
          },
          emailRedirectTo: verificationRedirectUrl
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      // 2. Pre-create/sync account with PostgreSQL Backend
      try {
        await api.post('/api/auth/register', {
          name: trimmedName,
          email: trimmedEmail,
          password: password
        });
      } catch (backendErr) {
        console.warn('[Register] Backend pre-sync notice:', backendErr);
      }

      // 3. Show Verification Email Sent screen
      setEmailSent(true);
    } catch (err) {
      console.error('Registration Error:', err);
      setError(err.message || 'An unexpected error occurred during signup.');
    } finally {
      setLoading(false);
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
        {emailSent ? (
          /* Email Verification Sent Screen */
          <div className="animate-fade-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              color: '#34D399',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)'
            }}>
              <Inbox size={30} />
            </div>

            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
              Verification Email Sent!
            </h2>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.75rem' }}>
              We have sent a confirmation email to <strong style={{ color: '#10B981' }}>{email}</strong>.
              <br /><br />
              Please open your inbox and click the <strong>"Verify Your Account"</strong> link. It will take you straight to your activated account page.
            </p>

            <Link
              to="/login"
              state={{ email }}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                borderRadius: '0.75rem'
              }}
            >
              <span>Click to Login</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          /* Registration Form */
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

            {/* PRIMARY SUPABASE GOOGLE SIGN-UP (DIRECT LOG IN / NO OTP) */}
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
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError('');
                    }}
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
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
                {loading ? 'Sending Verification Link...' : 'Create Account'}
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
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  lineHeight: 1.4
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError('')}
                    title="Clear error"
                    aria-label="Dismiss error"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#FB7185',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 0.8
                    }}
                  >
                    <X size={15} />
                  </button>
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
        )}
      </div>
    </div>
  );
};

export default Register;
