import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import api from '../services/api';

const AccountVerified = () => {
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    let isMounted = true;

    const completeVerification = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user && isMounted) {
          const email = session.user.email || '';
          setUserEmail(email);

          // Sync verified user with PostgreSQL backend
          try {
            await api.post('/api/auth/login', { token: session.access_token });
          } catch (syncErr) {
            console.warn('[AccountVerified] Backend sync notice:', syncErr);
          }
        }
      } catch (err) {
        console.warn('[AccountVerified] Verification session notice:', err);
      }
    };

    completeVerification();

    return () => {
      isMounted = false;
    };
  }, []);

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
        maxWidth: '480px',
        padding: '2.5rem',
        borderRadius: '1.25rem',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
        textAlign: 'center'
      }}>
        {/* Success Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '2px solid rgba(16, 185, 129, 0.4)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
          color: '#34D399',
          boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)'
        }}>
          <CheckCircle2 size={36} />
        </div>

        {/* Title & Badge */}
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Your Account Was Added!
        </h1>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.75rem' }}>
          {userEmail ? (
            <span>Email <strong style={{ color: '#10B981' }}>{userEmail}</strong> has been successfully verified.</span>
          ) : (
            'Your PredictIQ account has been successfully created and verified.'
          )}
          <br />
          You are all set to access AI food forecasting, waste tracking, and kitchen resource analytics.
        </p>

        {/* Feature Highlights */}
        <div style={{
          background: 'rgba(11, 15, 23, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '0.85rem',
          padding: '1rem 1.25rem',
          marginBottom: '1.75rem',
          textAlign: 'left',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            <Sparkles size={14} color="#10B981" />
            <span>What's ready for you:</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.6' }}>
            <li>Real-time Meal Demand Forecasting</li>
            <li>Raw Inventory & Ingredient Calculator</li>
            <li>Automated Wastage Reduction Analytics</li>
          </ul>
        </div>

        {/* Click to Login Button */}
        <Link
          to="/login"
          state={{ email: userEmail }}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '0.9rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)'
          }}
        >
          <span>Click to Login</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
};

export default AccountVerified;
