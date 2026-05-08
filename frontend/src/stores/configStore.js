/**
 * 系统配置状态管理 Store
 * 支持精准订阅配置项，避免无关重渲染
 */

import { create } from 'zustand';
import axios from 'axios';

const defaultConfig = {
  site_name: '机柜管理系统',
  primary_color: '#667eea',
  secondary_color: '#764ba2',
  sidebar_collapsed: false,
  compact_mode: false,
  animation_enabled: true,
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  date_format: 'YYYY-MM-DD',
  session_timeout: 30,
  max_login_attempts: 5,
  maintenance_mode: false,
};

const applyThemeColors = (primaryColor, secondaryColor) => {
  const root = document.documentElement;
  if (primaryColor) {
    root.style.setProperty('--primary-color', primaryColor);
    root.style.setProperty('--primary-light', `${primaryColor}20`);
    root.style.setProperty(
      '--primary-gradient',
      `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor || '#764ba2'} 100%)`
    );
  }
  if (secondaryColor) {
    root.style.setProperty('--secondary-color', secondaryColor);
    root.style.setProperty('--secondary-light', `${secondaryColor}20`);
  }
};

export const useConfigStore = create((set, get) => ({
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

      if (configValues.primary_color || configValues.secondary_color) {
        applyThemeColors(configValues.primary_color, configValues.secondary_color);
      }
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

    if (newConfig.primary_color || newConfig.secondary_color) {
      const { config } = get();
      applyThemeColors(config.primary_color, config.secondary_color);
    }
  },

  reloadConfig: async () => {
    await get().loadConfig();
  },
}));

export const useConfig = () => useConfigStore((state) => state.config);
export const useConfigLoading = () => useConfigStore((state) => state.loading);
export const useSiteName = () => useConfigStore((state) => state.config.site_name);
export const usePrimaryColor = () => useConfigStore((state) => state.config.primary_color);
export const useSecondaryColor = () => useConfigStore((state) => state.config.secondary_color);
