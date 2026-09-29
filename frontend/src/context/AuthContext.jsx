import { createContext, useContext, useEffect, useState } from 'react';
import { getMe, loginUser, registerUser } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('smartprice_token'));
  const [loading, setLoading] = useState(true);

  // Initialize session on load
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      const storedToken = localStorage.getItem('smartprice_token');
      if (!storedToken) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const profile = await getMe();
        if (mounted) {
          setUser(profile);
          setToken(storedToken);
        }
      } catch (err) {
        // Token invalid or expired
        localStorage.removeItem('smartprice_token');
        if (mounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const data = await loginUser({ email, password });
    if (data?.access_token) {
      localStorage.setItem('smartprice_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    }
    return data;
  };

  const register = async (email, password, name) => {
    const data = await registerUser({ email, password, name });
    if (data?.access_token) {
      localStorage.setItem('smartprice_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('smartprice_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const profile = await getMe();
      setUser(profile);
      return profile;
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
