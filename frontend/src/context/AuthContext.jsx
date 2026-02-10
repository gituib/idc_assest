import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

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

  const savedToken = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');

  console.log('[AuthContext] Saved token:', savedToken ? 'exists' : 'null');
  console.log('[AuthContext] Saved user:', savedUser ? 'exists' : 'null');

  const [user, setUser] = useState(() => {
    try {
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.error('[AuthContext] Parse user error:', e);
    }
    return null;
  });

  const [token, setToken] = useState(() => savedToken);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    const currentUser = localStorage.getItem('user');

    if (currentToken && currentToken === token) {
      if (currentUser) {
        try {
          const parsedUser = JSON.parse(currentUser);
          if (JSON.stringify(parsedUser) !== JSON.stringify(user)) {
            setUser(parsedUser);
          }
        } catch (e) {
          console.error('[AuthContext] Parse user error:', e);
        }
      }
      setInitialized(true);
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
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.getProfile();
      if (response.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authAPI.login({ username, password });
      if (response.success) {
        const { token: newToken, user: userData } = response.data;
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
        return { success: true };
      }
      return { success: false, message: response.message, code: response.code };
    } catch (error) {
      return { success: false, message: error };
    }
  };

  const register = async userData => {
    try {
      const response = await authAPI.register(userData);
      if (response.success) {
        const { token: newToken, user: newUser, isFirstUser, pendingApproval } = response.data;
        if (newToken) {
          localStorage.setItem('token', newToken);
          localStorage.setItem('user', JSON.stringify(newUser));
          setToken(newToken);
          setUser(newUser);
        }
        return { success: true, isFirstUser, pendingApproval };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = newUserData => {
    const updatedUser = { ...user, ...newUserData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const hasPermission = permission => {
    if (!user) return false;
    return true;
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
