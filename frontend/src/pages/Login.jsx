import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Sparkles, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, X } from 'lucide-react';
import GoogleLogin from '../components/GoogleLogin';
import { supabase } from '../supabaseClient';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(
    location.state?.signupSuccess
      ? location.state.message || 'Your account has been created. Please check your email and verify your address before logging in.'
      : ''
  );
  const [loading, setLoading] = useState(false);

  const [prevKey, setPrevKey] = useState(location.key);
  if (location.key !== prevKey) {
    setPrevKey(location.key);
    if (location.state?.email) {
      setEmail(location.state.email);
    }
    if (location.state?.signupSuccess) {
      setSuccessMsg(
        location.state.message || 'Your account has been created. Please check your email and verify your address before logging in.'
      );
    }
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        setError(authError.message);
      } else if (data?.session) {
        // Only redirect when a real session exists
        navigate('/');
      } else {
        setError('Login failed. Please verify your account before logging in.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
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
        maxWidth: '440px',
        padding: '2.5rem',
        borderRadius: '1.25rem',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
            marginBottom: '0.85rem'
          }}>
            <Sparkles size={32} color="#FFFFFF" />
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Predict<span style={{ color: 'var(--accent-primary)' }}>IQ</span>
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            AI-Based Food Demand & Resource Planning
          </p>
        </div>

        {/* Success Alert Above Form (When coming from successful signup) */}
        {successMsg && (
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
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* PRIMARY SUPABASE GOOGLE SIGN-IN */}
        <div style={{ marginBottom: '1.25rem' }}>
          <GoogleLogin
            buttonText="Continue with Google"
            onError={(err) => setError(err)}
            onSuccess={() => navigate('/')}
          />
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          margin: '1.25rem 0',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          <span>Or sign in with email</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>

        {/* Email & Password Authentication Form */}
        <form onSubmit={handleEmailSubmit} autoComplete="on">
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--accent-primary)',
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                Forgot password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="form-control"
                placeholder="••••••••"
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
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ArrowRight size={16} />}
          </button>

          {/* Simple Error Display Under Form */}
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

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
