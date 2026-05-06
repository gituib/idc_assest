import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI } from '../api';
import secureStorage, { TOKEN_KEY, USER_KEY } from '../utils/secureStorage';

const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  initialized: false,
  login: async () => ({ success: false, message: '认证未初始化' }),
  register: async () => ({ success: false, message: '认证未初始化' }),
  logout: () => {},
  updateUser: () => {},
  hasPermission: () => false,
  checkAdmin: () => Promise.resolve({ success: true, data: { hasAdmin: false, userCount: 0 } }),
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await secureStorage.loadFromStorage(TOKEN_KEY);
        const storedUser = await secureStorage.loadFromStorage(USER_KEY);

        if (!storedToken) {
          setToken(null);
          setUser(null);
          setLoading(false);
          setInitialized(true);
          return;
        }

        setToken(storedToken);
        setUser(storedUser);

        try {
          const response = await authAPI.getProfile();
          if (response.success) {
            setUser(response.data.user);
            secureStorage.set(USER_KEY, response.data.user);
          }
        } catch {
          secureStorage.remove(TOKEN_KEY);
          secureStorage.remove(USER_KEY);
          setToken(null);
          setUser(null);
        }
      } catch {
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const response = await authAPI.login({ username, password });
      if (response.success) {
        const { token: newToken, user: userData } = response.data;
        secureStorage.set(TOKEN_KEY, newToken);
        secureStorage.set(USER_KEY, userData);
        setToken(newToken);
        setUser(userData);
        return { success: true };
      }
      return { success: false, message: response.message, code: response.code };
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || '登录失败，请稍后重试';
      return { success: false, message };
    }
  }, []);

  const register = useCallback(async userData => {
    try {
      const response = await authAPI.register(userData);
      if (response.success) {
        const { token: newToken, user: newUser, isFirstUser, pendingApproval } = response.data;
        if (newToken) {
          secureStorage.set(TOKEN_KEY, newToken);
          secureStorage.set(USER_KEY, newUser);
          setToken(newToken);
          setUser(newUser);
        }
        return { success: true, isFirstUser, pendingApproval };
      }
      return { success: false, message: response.message };
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || '注册失败，请稍后重试';
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(() => {
    secureStorage.remove(TOKEN_KEY);
    secureStorage.remove(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(newUserData => {
    setUser(prev => {
      const updated = { ...prev, ...newUserData };
      secureStorage.set(USER_KEY, updated);
      return updated;
    });
  }, []);

  const hasPermission = useCallback(permission => {
    if (!user) return false;
    const roles = user.roles || [];
    if (roles.some(r => r.roleCode === 'admin')) return true;
    if (permission === 'admin') return roles.some(r => r.roleCode === 'admin');
    return roles.some(r => r.roleCode === permission);
  }, [user]);

  const checkAdmin = useCallback(() => authAPI.checkAdmin(), []);

  const value = useMemo(() => ({
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
  }), [user, token, loading, initialized, login, register, logout, updateUser, hasPermission, checkAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;