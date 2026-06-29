import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken } from '../services/api';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  hospitalId: string | null;
  permissions: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  registerHospital: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Attempt silent refresh to restore session on boot
  useEffect(() => {
    async function restoreSession() {
      try {
        const response = await api.post('/auth/refresh', {}, { skipAuth: true });
        const { accessToken, user: profile } = response.data;
        setToken(accessToken);
        setUser(profile);
      } catch (err) {
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();

    // Listen to session expired events from API client
    const handleAuthExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password }, { skipAuth: true });
    const { accessToken, user: profile } = res.data;
    setToken(accessToken);
    setUser(profile);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (err) {
      // Ignore failures
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const registerHospital = async (data: any) => {
    await api.post('/auth/register', data, { skipAuth: true });
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    registerHospital,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;
