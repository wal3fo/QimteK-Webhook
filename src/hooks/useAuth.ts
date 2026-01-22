import { useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at?: string;
}

const API_URL = import.meta.env.VITE_API_URL || '/api';
const STORAGE_KEY = 'auth_token';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_KEY);
    if (savedToken) {
      setToken(savedToken);
      // Verify token by fetching user info
      fetchUser(savedToken).catch(() => {
        // Token invalid, clear it
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch current user info
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
          setLoading(false);
          return;
        }
      }
      
      // If fetch fails, token is invalid
      throw new Error('Invalid token');
    } catch (error) {
      setUser(null);
      setToken(null);
      localStorage.removeItem(STORAGE_KEY);
      setLoading(false);
      throw error;
    }
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
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
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  // Register
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

  // Logout
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'admin',
  };
}
