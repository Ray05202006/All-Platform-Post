'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  const initAuth = useCallback(async () => {
    try {
      const token = api.getToken();

      if (!token) {
        // 开发环境：自动获取 dev token
        const { token: devToken, user: devUser } = await api.getDevToken();
        api.setToken(devToken);
        setUser(devUser);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      api.clearToken();
      setIsAuthenticated(false);
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
