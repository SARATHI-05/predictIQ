import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  KeyRound, 
  Mail, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  Inbox,
  X
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const navigate = useNavigate();

  // Request Password Reset Link via Supabase Auth & Backend SMTP
  const handleSendResetLink = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const resetRedirectUrl = `${window.location.origin}/reset-password`;

      // 1. Dispatch password reset link via Supabase Auth
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: resetRedirectUrl,
      });

      if (resetErr) {
        throw resetErr;
      }

      // 2. Also trigger backend notification if available
      try {
        await api.post('/api/auth/forgot-password', { email: cleanEmail });
      } catch (backendErr) {
        console.warn('[ForgotPassword] Backend notification notice:', backendErr);
      }

      setSent(true);
    } catch (err) {
      console.error('Password reset request error:', err);
      setError(err.message || 'Failed to send password reset email. Please try again.');
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
        {/* Header Icon & Title */}
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
            marginBottom: '1rem'
          }}>
            <KeyRound size={28} color="#FFFFFF" />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Reset Your Password
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: '1.4' }}>
            Enter your account email to receive a secure password reset link
          </p>
        </div>

        {/* Error Alert */}
        {error && (
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
            justifyContent: 'space-between',
            gap: '0.5rem'
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

        {/* Success State */}
        {sent ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '1rem',
            padding: '1.75rem',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              color: '#34D399'
            }}>
              <Inbox size={26} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#34D399', marginBottom: '0.5rem' }}>
              Reset Link Dispatched!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.25rem' }}>
              We've sent a password reset email to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Please check your inbox and click the <strong>"Reset password"</strong> link to choose your new password.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem' }}
            >
              <span>Return to Sign In</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendResetLink}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  className="form-control"
                  placeholder="Enter your registered email"
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

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem' }}
            >
              {loading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div style={{ textAlign: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <Link
            to="/login"
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.825rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
