import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';
import secureStorage, { TOKEN_KEY, USER_KEY } from '../utils/secureStorage';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  console.log('[AuthContext] Initializing...');

  const savedToken = secureStorage.get(TOKEN_KEY);
  const savedUser = secureStorage.get(USER_KEY);

  console.log('[AuthContext] Saved token:', savedToken ? 'exists' : 'null');
  console.log('[AuthContext] Saved user:', savedUser ? 'exists' : 'null');

  const [user, setUser] = useState(() => savedUser || null);
  const [token, setToken] = useState(() => savedToken);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const currentToken = secureStorage.get(TOKEN_KEY);
    const currentUser = secureStorage.get(USER_KEY);

    if (currentToken && currentToken === token) {
      if (currentUser && JSON.stringify(currentUser) !== JSON.stringify(user)) {
        setUser(currentUser);
      }
      // 有 token 时调用 fetchProfile 验证有效性并刷新用户信息
      fetchProfile();
    } else if (!currentToken) {
      setToken(null);
      setUser(null);
      setInitialized(true);
    } else {
      setToken(currentToken);
      setInitialized(true);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    const currentToken = secureStorage.get(TOKEN_KEY);
    if (!currentToken) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      const response = await authAPI.getProfile();
      if (response.success) {
        setUser(response.data.user);
        secureStorage.set(USER_KEY, response.data.user);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // Token 无效，清除登录状态
      secureStorage.remove(TOKEN_KEY);
      secureStorage.remove(USER_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  const login = async (username, password) => {
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
  };

  const register = async userData => {
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
  };

  const logout = useCallback(() => {
    secureStorage.remove(TOKEN_KEY);
    secureStorage.remove(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = newUserData => {
    const updatedUser = { ...user, ...newUserData };
    setUser(updatedUser);
    secureStorage.set(USER_KEY, updatedUser);
  };

  const hasPermission = permission => {
    if (!user) return false;
    const roles = user.roles || [];
    // 管理员拥有所有权限
    if (roles.some(r => r.roleCode === 'admin')) return true;
    // 检查具体权限
    if (permission === 'admin') return roles.some(r => r.roleCode === 'admin');
    // roleCode 格式的权限直接匹配
    return roles.some(r => r.roleCode === permission);
  };

  const value = {
    user,
    token,
    loading,
    initialized,
    login,
    register,
    logout,
    updateUser,
    hasPermission,
    checkAdmin: () => authAPI.checkAdmin(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
