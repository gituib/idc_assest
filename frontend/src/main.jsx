import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthInitializer from './components/AuthInitializer';
import ErrorBoundary from './components/ErrorBoundary';
import { initGlobalHandlers } from './utils/frontendLogger';
import './index.css';

// 初始化全局错误捕获（window.onerror / unhandledrejection 上报），须在 App 渲染前就位
initGlobalHandlers();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary fullPage>
      <AuthInitializer>
        <App />
      </AuthInitializer>
    </ErrorBoundary>
  </React.StrictMode>
);