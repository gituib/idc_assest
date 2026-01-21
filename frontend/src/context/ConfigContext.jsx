import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    // 默认配置
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
    maintenance_mode: false
  });
  const [loading, setLoading] = useState(true);

  // 加载系统配置
  const loadConfig = async () => {
    try {
      const response = await axios.get('/api/system-settings');
      const settings = response.data;
      const configValues = {};
      
      // 将配置转换为扁平结构
      Object.entries(settings).forEach(([key, value]) => {
        configValues[key] = value.value;
      });
      
      setConfig(prev => ({
        ...prev,
        ...configValues
      }));
    } catch (error) {
      console.error('加载系统配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  // 更新配置
  const updateConfig = (newConfig) => {
    setConfig(prev => ({
      ...prev,
      ...newConfig
    }));
  };

  // 重新加载配置
  const reloadConfig = async () => {
    await loadConfig();
  };

  return (
    <ConfigContext.Provider value={{ config, loading, updateConfig, reloadConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

// 自定义钩子，方便组件使用配置
export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
