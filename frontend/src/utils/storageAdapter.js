/**
 * SecureStorage 适配器
 * 将异步的 secureStorage 接口适配为 Zustand persist 所需的同步 Storage 接口
 */

import { secureStorage } from '../utils/secureStorage';

const SecureStorageAdapter = {
  getItem: async (name) => {
    try {
      const value = await secureStorage.loadFromStorage(name);
      return value !== null ? JSON.stringify(value) : null;
    } catch {
      return null;
    }
  },

  setItem: async (name, value) => {
    try {
      await secureStorage.set(name, JSON.parse(value));
    } catch {
      // 存储失败静默处理
    }
  },

  removeItem: async (name) => {
    try {
      await secureStorage.remove(name);
    } catch {
      // 移除失败静默处理
    }
  },
};

export default SecureStorageAdapter;
