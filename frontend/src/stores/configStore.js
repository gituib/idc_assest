/**
 * 系统配置状态管理 Store
 * 支持精准订阅配置项，避免无关重渲染
 */

import { create } from 'zustand';
import axios from 'axios';

// 主题色固定为默认紫蓝渐变（外观设置已移除，不再支持自定义）
const defaultConfig = {
  site_name: '机柜管理系统',
  site_logo: '',
  primary_color: '#667eea',
  secondary_color: '#764ba2',
  idle_timeout: 30,
  max_login_attempts: 5,
  maintenance_mode: false,
};

export const useConfigStore = create((set) => ({
  config: defaultConfig,
  loading: true,

  loadConfig: async () => {
    try {
      const response = await axios.get('/api/system-settings');
      const settings = response.data;
      const configValues = {};

      Object.entries(settings).forEach(([key, value]) => {
        configValues[key] = value.value;
      });

      set((state) => ({
        config: { ...state.config, ...configValues },
      }));
    } catch {
      // 加载失败使用默认配置
    } finally {
      set({ loading: false });
    }
  },

  updateConfig: (newConfig) => {
    set((state) => ({
      config: { ...state.config, ...newConfig },
    }));
  },

  reloadConfig: async () => {
    await useConfigStore.getState().loadConfig();
  },
}));

export const useConfig = () => useConfigStore((state) => state.config);
export const useConfigLoading = () => useConfigStore((state) => state.loading);
export const useSiteName = () => useConfigStore((state) => state.config.site_name);
export const useSiteLogo = () => useConfigStore((state) => state.config.site_logo);
export const usePrimaryColor = () => useConfigStore((state) => state.config.primary_color);
export const useSecondaryColor = () => useConfigStore((state) => state.config.secondary_color);
