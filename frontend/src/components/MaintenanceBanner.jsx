import React, { useState, useEffect } from 'react';
import { Alert, Space, Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { setMaintenanceCallback } from '../api';

const MAINTENANCE_STORAGE_KEY = 'maintenance_hidden_until';

/**
 * 维护模式提示横幅组件
 * 当系统处于维护模式时，在页面顶部显示提示信息
 */
function MaintenanceBanner() {
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState('系统维护中');
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    setMaintenanceCallback(handleMaintenance);
  }, []);

  const handleMaintenance = maintenanceData => {
    const hiddenUntil = localStorage.getItem(MAINTENANCE_STORAGE_KEY);
    if (hiddenUntil && Date.now() < parseInt(hiddenUntil, 10)) {
      return;
    }

    setReason(maintenanceData.reason || '系统维护中');
    setStartTime(maintenanceData.startTime);
    setVisible(true);
  };

  const handleClose = () => {
    const hideDuration = 5 * 60 * 1000;
    localStorage.setItem(MAINTENANCE_STORAGE_KEY, String(Date.now() + hideDuration));
    setVisible(false);
  };

  if (!visible) return null;

  const formattedTime = startTime ? new Date(startTime).toLocaleString('zh-CN') : null;

  return (
    <Alert
      message='系统维护中'
      description={
        <Space direction='vertical' size={4} style={{ width: '100%' }}>
          <div>{reason}</div>
          {formattedTime && <div style={{ fontSize: 12, color: '#888' }}>开始时间：{formattedTime}</div>}
        </Space>
      }
      type='warning'
      showIcon
      closable
      closeIcon={<CloseOutlined />}
      onClose={handleClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        borderRadius: 0,
        borderBottom: '1px solid #faad14',
      }}
    />
  );
}

export default MaintenanceBanner;
