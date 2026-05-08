/**
 * 系统配置 Hook
 * 直接使用 Zustand Store 管理系统配置
 */

import { useEffect } from 'react';
import { useConfigStore } from '../stores/configStore';

export const useConfig = () => {
  const config = useConfigStore((s) => s.config);
  const loading = useConfigStore((s) => s.loading);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const reloadConfig = useConfigStore((s) => s.reloadConfig);
  const loadConfig = useConfigStore((s) => s.loadConfig);

  useEffect(() => {
    if (loading) {
      loadConfig();
    }
  }, [loading, loadConfig]);

  return { config, loading, updateConfig, reloadConfig };
};

export default useConfig;