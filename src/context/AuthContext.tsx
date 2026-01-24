import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  role: 'Administrator' | 'Professional' | 'user';
  created_at?: string;
  mfa_enabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, mfa_token?: string) => Promise<{ success: boolean; error?: string; mfa_required?: boolean }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { API_URL } from '@/config/api';

const STORAGE_KEY = 'auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          return true;
        }
      }
      throw new Error('Invalid token');
    } catch (error) {
      // Don't clear state here immediately to avoid flickering if it's just a network error
      // But if it's a 401/403, we should probably clear. 
      // For now, we rely on the caller to handle clearing if needed, or we clear if we are sure.
      // Actually, if checkSession fails, we usually want to logout.
      return false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem(STORAGE_KEY);
      if (savedToken) {
        const isValid = await fetchUser(savedToken);
        if (!isValid) {
          logout();
        } else {
          setToken(savedToken);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [fetchUser]);

  // Periodic session check (every 60 seconds)
  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(async () => {
      const isValid = await fetchUser(token);
      if (!isValid) {
        logout();
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [token, fetchUser]);

  // Listen for storage changes (multi-tab logout)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        if (!event.newValue) {
          // Token removed in another tab
          setUser(null);
          setToken(null);
        } else if (event.newValue !== token) {
          // Token changed (login in another tab)
          setToken(event.newValue);
          fetchUser(event.newValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [token, fetchUser]);

  const login = useCallback(async (email: string, password: string, mfa_token?: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, mfa_token }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem(STORAGE_KEY, data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed', mfa_required: data.mfa_required };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem(STORAGE_KEY, data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    // Optional: Redirect is usually handled by the ProtectedRoute component detecting !isAuthenticated
  }, []);

  const checkSession = useCallback(async () => {
    if (token) {
      const isValid = await fetchUser(token);
      if (!isValid) {
        logout();
      }
    }
  }, [token, fetchUser, logout]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'Administrator',
    login,
    register,
    logout,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
