import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Monitor Firebase Auth state change across page reloads
  useEffect(() => {
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

    // 2. Firebase onAuthStateChanged listener
    const unsubscribe = onAuthStateChanged(auth, async (currentFirebaseUser) => {
      if (currentFirebaseUser) {
        setFirebaseUser(currentFirebaseUser);
        try {
          // Obtain valid Firebase ID Token
          const idToken = await currentFirebaseUser.getIdToken();
          
          // Verify with Backend and sync SQL User database
          const response = await api.post('/api/auth/login', { token: idToken });
          const { access_token, user: userData } = response.data;

          const authToken = access_token || idToken;
          localStorage.setItem('predictiq_token', authToken);
          localStorage.setItem('predictiq_user', JSON.stringify(userData));

          setToken(authToken);
          setUser(userData);
        } catch (error) {
          console.warn('Backend sync onAuthStateChanged notice:', error);
          // If offline/cached, keep current saved user if available
          if (!savedUser && currentFirebaseUser) {
            const fallbackUser = {
              name: currentFirebaseUser.displayName || 'Google User',
              email: currentFirebaseUser.email,
              avatar_url: currentFirebaseUser.photoURL,
              firebase_uid: currentFirebaseUser.uid,
              role: 'Admin'
            };
            setUser(fallbackUser);
            setToken('firebase_session');
          }
        }
      } else {
        // Logged out from Firebase
        setFirebaseUser(null);
        if (!localStorage.getItem('predictiq_token')) {
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Google Sign-In with Firebase ID Token
  const loginWithGoogle = async (idToken, currentFirebaseUser) => {
    try {
      const response = await api.post('/api/auth/login', { token: idToken });
      const { access_token, user: userData } = response.data;

      const authToken = access_token || idToken;
      localStorage.setItem('predictiq_token', authToken);
      localStorage.setItem('predictiq_user', JSON.stringify(userData));

      setToken(authToken);
      setUser(userData);
      if (currentFirebaseUser) setFirebaseUser(currentFirebaseUser);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.detail || (error.code === 'ERR_NETWORK' ? 'Cannot connect to backend server. Please ensure backend is running.' : 'Google authentication failed.');
      return { success: false, error: message };
    }
  };

  // Traditional Email login fallback
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
      const message = error.response?.data?.detail || 'Invalid email or password';
      return { success: false, error: message };
    }
  };

  const register = async (name, email, password, role = 'Staff') => {
    try {
      const response = await api.post('/api/auth/register', { name, email, password, role });
      const { access_token, user: userData } = response.data;

      localStorage.setItem('predictiq_token', access_token);
      localStorage.setItem('predictiq_user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to send verification code. Please check your email.';
      return { success: false, error: message };
    }
  };

  const verifyResetCode = async (email, code) => {
    try {
      const response = await api.post('/api/auth/verify-code', { email, code });
      return { success: true, message: response.data.message };
    } catch (error) {
      const message = error.response?.data?.detail || 'Invalid or expired verification code.';
      return { success: false, error: message };
    }
  };

  const resetPassword = async (emailOrToken, codeOrNewPassword, newPasswordOptional) => {
    try {
      let payload = {};
      if (newPasswordOptional !== undefined) {
        // Called as resetPassword(email, code, newPassword)
        payload = {
          email: emailOrToken,
          code: codeOrNewPassword,
          new_password: newPasswordOptional
        };
      } else {
        // Called as resetPassword(token, newPassword)
        payload = {
          token: emailOrToken,
          code: emailOrToken,
          new_password: codeOrNewPassword
        };
      }

      const response = await api.post('/api/auth/reset-password', payload);
      return { success: true, message: response.data.message };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to reset password. Please check your verification code.';
      return { success: false, error: message };
    }
  };


  // Secure SignOut from Firebase & clear local state
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut notice:', err);
    }
    localStorage.removeItem('predictiq_token');
    localStorage.removeItem('predictiq_user');
    setToken(null);
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        firebaseUser,
        loading,
        loginWithGoogle,
        login,
        googleLogin: loginWithGoogle,
        forgotPassword,
        verifyResetCode,
        resetPassword,

        register,
        logout,
        isAuthenticated: !!token || !!user,
        isAdmin: user?.role === 'Admin',
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
