import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Monitor Supabase Auth state change across page reloads & OAuth redirect callbacks
  useEffect(() => {
    let isMounted = true;

    // 1. Initial local storage check for instant render
    const savedToken = localStorage.getItem('predictiq_token');
    const savedUser = localStorage.getItem('predictiq_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('predictiq_token');
        localStorage.removeItem('predictiq_user');
      }
    }

    // 2. Initialize Supabase Session check
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && session.user && isMounted) {
          setSupabaseUser(session.user);
          const accessToken = session.access_token;
          
          const metaName = session.user.user_metadata?.full_name || 
                           session.user.user_metadata?.name || 
                           (session.user.email ? session.user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '');
          
          if (metaName && (!user || !user.name || user.name === 'PredictIQ User')) {
            const tempUser = {
              id: session.user.id,
              name: metaName,
              email: session.user.email,
              role: (session.user.email?.includes('admin') ? 'Admin' : 'Staff'),
              avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
            };
            setUser(tempUser);
          }

          // Sync with Backend SQL database
          try {
            const response = await api.post('/api/auth/login', { token: accessToken });
            if (response.data?.requires_verification) {
              console.log('[Auth] Google signup pending 6-digit OTP verification for:', response.data.email);
              if (isMounted) setLoading(false);
              return;
            }

            const { access_token, user: userData } = response.data;
            if (access_token && userData && isMounted) {
              const authToken = access_token || accessToken;
              localStorage.setItem('predictiq_token', authToken);
              localStorage.setItem('predictiq_user', JSON.stringify(userData));
              setToken(authToken);
              setUser(userData);
            }
          } catch (syncErr) {
            console.warn('Backend sync on getSession notice:', syncErr);
          }
        }
      } catch (err) {
        console.warn('Supabase getSession notice:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initSession();

    // 3. Supabase onAuthStateChange listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setSupabaseUser(session.user);
          const accessToken = session.access_token;
          try {
            const response = await api.post('/api/auth/login', { token: accessToken });
            if (response.data?.requires_verification) {
              setLoading(false);
              return;
            }

            const { access_token, user: userData } = response.data;
            if (access_token && userData) {
              const authToken = access_token || accessToken;
              localStorage.setItem('predictiq_token', authToken);
              localStorage.setItem('predictiq_user', JSON.stringify(userData));
              setToken(authToken);
              setUser(userData);
            }
          } catch (err) {
            console.warn('Supabase auth state sync error:', err);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setSupabaseUser(null);
        if (!localStorage.getItem('predictiq_token')) {
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // Helper to extract clean error message from API responses
  const extractErrorMessage = (error, defaultMsg = 'Authentication failed.') => {
    if (error.response?.data?.detail) {
      return typeof error.response.data.detail === 'string'
        ? error.response.data.detail
        : JSON.stringify(error.response.data.detail);
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Connection timed out. The backend server on Render may be waking up from sleep. Please try again in a moment.';
    }
    if (error.code === 'ERR_NETWORK' || !error.response) {
      return 'Cannot connect to backend server. Please verify backend is running on Render.';
    }
    return error.message || defaultMsg;
  };

  // Google Sign-In with Supabase Access Token
  const loginWithGoogle = async (accessToken, currentSupabaseUser) => {
    try {
      const response = await api.post('/api/auth/login', { token: accessToken });
      
      // Check if this is a first-time Google signup requiring 6-digit OTP verification
      if (response.data?.requires_verification) {
        if (currentSupabaseUser) setSupabaseUser(currentSupabaseUser);
        return {
          success: true,
          requiresVerification: true,
          email: response.data.email,
          name: response.data.name,
          message: response.data.message
        };
      }

      const { access_token, user: userData } = response.data;
      const authToken = access_token || accessToken;
      localStorage.setItem('predictiq_token', authToken);
      localStorage.setItem('predictiq_user', JSON.stringify(userData));

      setToken(authToken);
      setUser(userData);
      if (currentSupabaseUser) setSupabaseUser(currentSupabaseUser);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Google login error:', error);
      const message = extractErrorMessage(error, 'Google authentication failed.');
      return { success: false, error: message };
    }
  };

  // Verify 6-digit Google Signup OTP Code
  const verifyGoogleOtp = async (email, code) => {
    try {
      const response = await api.post('/api/auth/google/verify', { email, code });
      const { access_token, user: userData } = response.data;

      localStorage.setItem('predictiq_token', access_token);
      localStorage.setItem('predictiq_user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const message = extractErrorMessage(error, 'Invalid or expired verification code');
      return { success: false, error: message };
    }
  };

  // Resend 6-digit Google Signup OTP Code
  const resendGoogleOtp = async (email) => {
    try {
      const response = await api.post('/api/auth/google/resend-code', { email });
      return { success: true, data: response.data };
    } catch (error) {
      const message = extractErrorMessage(error, 'Failed to resend verification code');
      return { success: false, error: message };
    }
  };

  // Standard Email / Password Login
  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { access_token, user: userData } = response.data;

      localStorage.setItem('predictiq_token', access_token);
      localStorage.setItem('predictiq_user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const message = extractErrorMessage(error, 'Invalid email or password');
      return { success: false, error: message };
    }
  };

  // Register New User (Initiates Signup & OTP Dispatch)
  const register = async (name, email, password, role = 'Staff') => {
    try {
      const response = await api.post('/api/auth/register', { name, email, password, role });
      
      // If verification is required (standard behavior)
      if (response.data?.requires_verification) {
        return {
          success: true,
          requiresVerification: true,
          email: response.data.email || email,
          name: response.data.name || name,
          message: response.data.message
        };
      }

      const { access_token, user: userData } = response.data;
      if (access_token && userData) {
        localStorage.setItem('predictiq_token', access_token);
        localStorage.setItem('predictiq_user', JSON.stringify(userData));
        setToken(access_token);
        setUser(userData);
        return { success: true, requiresVerification: false, user: userData };
      }

      return { success: true, requiresVerification: true, email };
    } catch (error) {
      const message = extractErrorMessage(error, 'Registration failed. Please try again.');
      return { success: false, error: message };
    }
  };

  // Verify 6-digit Signup OTP Code
  const verifySignupOtp = async (email, code) => {
    try {
      const response = await api.post('/api/auth/register/verify', { email, code });
      const { access_token, user: userData } = response.data;

      localStorage.setItem('predictiq_token', access_token);
      localStorage.setItem('predictiq_user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const message = extractErrorMessage(error, 'Invalid or expired verification code');
      return { success: false, error: message };
    }
  };

  // Resend 6-digit Signup OTP Code
  const resendSignupOtp = async (email) => {
    try {
      const response = await api.post('/api/auth/register/resend-code', { email });
      return { success: true, data: response.data };
    } catch (error) {
      const message = extractErrorMessage(error, 'Failed to resend verification code');
      return { success: false, error: message };
    }
  };

  // Forgot Password Request
  const forgotPassword = async (email) => {
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to send verification code. Please check your email.';
      return { success: false, error: message };
    }
  };

  // Verify 6-digit OTP Code
  const verifyResetCode = async (email, code) => {
    try {
      const response = await api.post('/api/auth/verify-code', { email, code });
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Invalid or expired verification code';
      return { success: false, error: message };
    }
  };

  // Reset Password with Verified OTP Code
  const resetPassword = async (email, code, newPassword) => {
    try {
      const response = await api.post('/api/auth/reset-password', {
        email,
        code,
        new_password: newPassword,
        confirm_password: newPassword
      });
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Password reset failed';
      return { success: false, error: message };
    }
  };

  // Update Profile Information
  const updateProfile = async (updatedData) => {
    try {
      const response = await api.put('/api/users/profile', updatedData);
      const updatedUser = response.data;
      setUser(updatedUser);
      localStorage.setItem('predictiq_user', JSON.stringify(updatedUser));
      return { success: true, user: updatedUser };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update profile';
      return { success: false, error: message };
    }
  };

  // Secure Sign Out
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut notice:', err);
    }
    localStorage.removeItem('predictiq_token');
    localStorage.removeItem('predictiq_user');
    setSupabaseUser(null);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        supabaseUser,
        loading,
        loginWithGoogle,
        verifyGoogleOtp,
        resendGoogleOtp,
        login,
        register,
        verifySignupOtp,
        resendSignupOtp,
        logout,
        forgotPassword,
        verifyResetCode,
        resetPassword,
        updateProfile,
        isAuthenticated: !!token && !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
