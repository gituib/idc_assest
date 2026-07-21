/**
 * 认证状态管理 Store
 * 支持精准订阅、持久化、权限缓存
 */

import { create } from 'zustand';
import { authAPI, setAuthInitialized } from '../api';
import secureStorage, { TOKEN_KEY, USER_KEY } from '../utils/secureStorage';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      const storedToken = await secureStorage.loadFromStorage(TOKEN_KEY);
      const storedUser = await secureStorage.loadFromStorage(USER_KEY);

      if (!storedToken) {
        set({ token: null, user: null, loading: false, initialized: true });
        setAuthInitialized(true);
        return;
      }

      set({ token: storedToken, user: storedUser });

      try {
        const response = await authAPI.getProfile();
        if (response.success) {
          // 将 roles 合并进 user 对象，便于前端组件通过 user.roles 判断权限
          const mergedUser = { ...response.data.user, roles: response.data.roles || [] };
          set({ user: mergedUser });
          await secureStorage.set(USER_KEY, mergedUser);
        }
      } catch (error) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          secureStorage.remove(TOKEN_KEY);
          secureStorage.remove(USER_KEY);
          set({ token: null, user: null });
        }
      }
    } catch {
      set({ token: null, user: null });
    } finally {
      set({ loading: false, initialized: true });
      setAuthInitialized(true);
    }
  },

  login: async (username, password) => {
    try {
      const response = await authAPI.login({ username, password });
      if (response.success) {
        const { token: newToken, user: userData } = response.data;
        await secureStorage.set(TOKEN_KEY, newToken);
        await secureStorage.set(USER_KEY, userData);
        set({ token: newToken, user: userData });
        return { success: true };
      }
      return { success: false, message: response.message, code: response.code };
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || '登录失败，请稍后重试';
      return { success: false, message };
    }
  },

  register: async (userData) => {
    try {
      const response = await authAPI.register(userData);
      if (response.success) {
        const { token: newToken, user: newUser, isFirstUser, pendingApproval } = response.data;
        if (newToken) {
          await secureStorage.set(TOKEN_KEY, newToken);
          await secureStorage.set(USER_KEY, newUser);
          set({ token: newToken, user: newUser });
        }
        return { success: true, isFirstUser, pendingApproval };
      }
      return { success: false, message: response.message };
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || '注册失败，请稍后重试';
      return { success: false, message };
    }
  },

  logout: () => {
    secureStorage.remove(TOKEN_KEY);
    secureStorage.remove(USER_KEY);
    set({ token: null, user: null });
  },

  updateUser: (newUserData) => {
    set((state) => {
      const updated = { ...state.user, ...newUserData };
      secureStorage.set(USER_KEY, updated).catch(() => {});
      return { user: updated };
    });
  },

  hasPermission: (permission) => {
    const { user } = get();
    if (!user) return false;
    const roles = user.roles || [];
    if (roles.some((r) => r.roleCode === 'admin')) return true;
    if (permission === 'admin') return roles.some((r) => r.roleCode === 'admin');
    return roles.some((r) => r.roleCode === permission);
  },

  checkAdmin: () => authAPI.checkAdmin(),
}));

export const useUser = () => useAuthStore((state) => state.user);
export const useToken = () => useAuthStore((state) => state.token);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthInitialized = () => useAuthStore((state) => state.initialized);
