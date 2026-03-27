import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const ConfigContext = createContext();

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

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
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
  });
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    try {
      const response = await axios.get('/api/system-settings');
      const settings = response.data;
      const configValues = {};

      Object.entries(settings).forEach(([key, value]) => {
        configValues[key] = value.value;
      });

      setConfig(prev => ({
        ...prev,
        ...configValues,
      }));

      if (configValues.primary_color || configValues.secondary_color) {
        applyThemeColors(configValues.primary_color, configValues.secondary_color);
      }
    } catch (error) {
      console.error('加载系统配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config.primary_color || config.secondary_color) {
      applyThemeColors(config.primary_color, config.secondary_color);
    }
  }, [config.primary_color, config.secondary_color]);

  const updateConfig = newConfig => {
    setConfig(prev => ({
      ...prev,
      ...newConfig,
    }));
  };

  const reloadConfig = async () => {
    await loadConfig();
  };

  return (
    <ConfigContext.Provider value={{ config, loading, updateConfig, reloadConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
