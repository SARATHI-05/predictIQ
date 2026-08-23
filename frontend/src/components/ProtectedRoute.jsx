import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false, requiredRole = null }) => {
  const [sessionState, setSessionState] = useState({
    checking: true,
    hasSession: false,
  });

  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (isMounted) {
          if (session && !error) {
            setSessionState({ checking: false, hasSession: true });
          } else {
            // Check localStorage fallback token if any
            const localToken = localStorage.getItem('predictiq_token');
            setSessionState({ checking: false, hasSession: !!localToken });
          }
        }
      } catch (err) {
        if (isMounted) {
          const localToken = localStorage.getItem('predictiq_token');
          setSessionState({ checking: false, hasSession: !!localToken });
        }
      }
    };

    verifySession();

    // Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setSessionState({ checking: false, hasSession: !!session });
      }
    });

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  if (sessionState.checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
        <div style={{ color: 'var(--accent-primary)', fontSize: '1.25rem', fontWeight: 600 }}>
          Loading PredictIQ...
        </div>
      </div>
    );
  }

  if (!sessionState.hasSession) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const needsAdmin = requireAdmin || requiredRole === 'Admin';
  if (needsAdmin && user?.role && user.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
