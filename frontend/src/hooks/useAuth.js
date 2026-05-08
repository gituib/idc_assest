/**
 * 认证状态 Hook
 * 直接使用 Zustand Store 管理认证状态
 */

import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const loading = useAuthStore((s) => s.loading);
  const initialized = useAuthStore((s) => s.initialized);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const updateUser = useAuthStore((s) => s.updateUser);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const checkAdmin = useAuthStore((s) => s.checkAdmin);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  return {
    user,
    token,
    loading,
    initialized,
    login,
    register,
    logout,
    updateUser,
    hasPermission,
    checkAdmin,
  };
};

export default useAuth;