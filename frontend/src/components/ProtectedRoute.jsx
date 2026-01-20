import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, token, loading, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: '16px'
      }}>
        <Spin size="large" />
        <span style={{ color: '#8c8c8c', fontSize: '14px' }}>加载中...</span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
