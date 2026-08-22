import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Sparkles, Lock, Key, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const res = await resetPassword(token, newPassword);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } else {
      setError(res.error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #131B2A 0%, #0B0F17 100%)',
      padding: '1.5rem'
    }}>
      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '2.5rem',
        borderRadius: '1.25rem',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
            <Lock size={28} color="#FFFFFF" />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Set New Password
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Enter your reset token and choose a strong new password
          </p>
        </div>

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
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '1rem',
            padding: '1.75rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem',
              color: '#34D399'
            }}>
              <CheckCircle2 size={28} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#34D399', marginBottom: '0.5rem' }}>
              Password Changed!
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Your password has been successfully updated. Redirecting to login in a moment...
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem' }}
            >
              <span>Go to Sign In Now</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Security Reset Token</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="Paste reset token here"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  style={{ paddingLeft: '2.5rem', fontFamily: 'monospace', fontSize: '0.825rem' }}
                />
                <Key size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-control"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-control"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem' }}
            >
              {loading ? 'Updating Password...' : 'Save New Password'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        )}

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

export default ResetPassword;
