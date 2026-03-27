import React from 'react';
import { Card, Typography } from 'antd';
import { LineChartOutlined, SafetyOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { designTokens } from '../../config/theme';

const { Text } = Typography;

const quickStatItemStyle = {
  background: 'linear-gradient(135deg, #fff 0%, #fafafa 100%)',
  borderRadius: designTokens.borderRadius.medium,
  padding: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  border: '1px solid #f0f0f0',
  boxShadow: designTokens.shadows.small,
};

const QuickStats = ({ onlineRate, powerUsage, totalMaxPower }) => {
  const powerUsagePercent =
    totalMaxPower > 0 ? ((powerUsage / totalMaxPower) * 100).toFixed(1) : '0.0';

  const quickStats = [
    {
      icon: LineChartOutlined,
      label: '在线率',
      value: `${onlineRate}%`,
      color: designTokens.colors.success.main,
    },
    {
      icon: SafetyOutlined,
      label: '安全等级',
      value: 'A级',
      color: designTokens.colors.primary.main,
    },
    {
      icon: ThunderboltOutlined,
      label: '功率使用',
      value: `${powerUsagePercent}%`,
      color: designTokens.colors.warning.main,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '0',
        animation: 'fadeInUp 0.6s ease-out 0.5s backwards',
      }}
    >
      {quickStats.map((stat, index) => (
        <div key={index} style={quickStatItemStyle}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: designTokens.borderRadius.medium,
              background: `linear-gradient(135deg, ${stat.color}20 0%, ${stat.color}10 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: stat.color,
              boxShadow: `0 4px 12px ${stat.color}20`,
            }}
          >
            <stat.icon />
          </div>
          <div>
            <Text style={{ color: designTokens.colors.text.secondary, fontSize: '0.85rem' }}>
              {stat.label}
            </Text>
            <div
              style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                color: designTokens.colors.text.primary,
              }}
            >
              {stat.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(QuickStats);
