'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const initAuth = useCallback(async () => {
    try {
      const token = api.getToken();

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      // Validate token by fetching user profile
      const userData = await api.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth initialization failed:', error);
      api.clearToken();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const logout = useCallback(() => {
    api.clearToken();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return {
    isLoading,
    isAuthenticated,
    user,
    logout,
    reinitialize: initAuth,
  };
}
