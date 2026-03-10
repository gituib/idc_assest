import React from 'react';
import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { designTokens } from '../../config/theme';

const systemInfoStyle = {
  background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f7ff 100%)',
  borderRadius: designTokens.borderRadius.medium,
  padding: '20px',
  border: '1px solid #91d5ff',
};

const SystemInfo = ({ onRefresh, isRefreshing }) => {
  return (
    <div style={{ animation: 'fadeInUp 0.6s ease-out 0.5s backwards' }}>
      <div style={systemInfoStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <p
              style={{
                margin: '0',
                fontSize: '0.9rem',
                color: designTokens.colors.text.primary,
                fontWeight: '600',
              }}
            >
              <strong>系统版本：</strong> v1.0.0
            </p>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '0.85rem',
                color: designTokens.colors.text.secondary,
              }}
            >
              <strong>最后更新：</strong>
              {new Date().toLocaleDateString()}
            </p>
          </div>
          <Button
            type="primary"
            icon={<ReloadOutlined spin={isRefreshing} />}
            size="small"
            onClick={onRefresh}
            loading={isRefreshing}
            style={{
              background: designTokens.colors.primary.gradient,
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
            }}
          >
            刷新数据
          </Button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SystemInfo);
