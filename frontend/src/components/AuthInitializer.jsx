/**
 * Zustand Store 初始化组件
 * 确保所有必要的 Store 在应用渲染前完成初始化
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useConfigStore } from '../stores/configStore';
import Spin from 'antd/es/spin';

const AuthInitializer = ({ children }) => {
  const [allInitialized, setAllInitialized] = useState(false);
  
  const { initialize: initializeAuth, initialized: authInitialized } = useAuthStore();
  const { loadConfig, loading: configLoading } = useConfigStore();

  useEffect(() => {
    const initStores = async () => {
      await initializeAuth();
      await loadConfig();
    };
    
    initStores().then(() => {
      setAllInitialized(true);
    });
  }, [initializeAuth, loadConfig]);

  if (!allInitialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return children;
};

export default AuthInitializer;
