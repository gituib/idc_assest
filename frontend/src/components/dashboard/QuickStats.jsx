import React from 'react';
import { Typography } from 'antd';
import { LineChartOutlined, SafetyOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { designTokens } from '../../config/theme';

const { Text } = Typography;

const QuickStats = ({ onlineRate, powerUsage, totalMaxPower }) => {
  const powerUsagePercent =
    totalMaxPower > 0 ? ((powerUsage / totalMaxPower) * 100).toFixed(1) : '0.0';

  const quickStats = [
    {
      icon: LineChartOutlined,
      label: '在线率',
      value: `${onlineRate}%`,
      color: designTokens.colors.success.main,
      trend: '稳定',
      gradient: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
    },
    {
      icon: SafetyOutlined,
      label: '安全等级',
      value: 'A级',
      color: designTokens.colors.primary.main,
      trend: '优秀',
      gradient: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
    },
    {
      icon: ThunderboltOutlined,
      label: '功率使用',
      value: `${powerUsagePercent}%`,
      color: designTokens.colors.warning.main,
      trend: '正常',
      gradient: 'linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)',
    },
  ];

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '16px',
      }}>
        <div style={{
          width: '6px',
          height: '20px',
          background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '3px',
        }} />
        <span style={{
          fontSize: '0.95rem',
          fontWeight: '700',
          color: designTokens.colors.text.primary,
        }}>
          系统状态
        </span>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
      }}>
        {quickStats.map((stat, index) => (
          <div 
            key={index} 
            style={{
              background: '#fafafa',
              borderRadius: designTokens.borderRadius.large,
              padding: '20px',
              border: '1px solid #f0f0f0',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
              },
            }}
          >
            {/* 装饰性背景 */}
            <div style={{
              position: 'absolute',
              right: '-30px',
              top: '-30px',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: `${stat.color}08`,
            }} />
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: stat.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: '#fff',
                boxShadow: `0 8px 20px ${stat.color}30`,
                flexShrink: 0,
              }}>
                <stat.icon style={{ fontSize: '24px' }} />
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ 
                  color: designTokens.colors.text.secondary, 
                  fontSize: '0.85rem',
                  display: 'block',
                  marginBottom: '4px',
                }}>
                  {stat.label}
                </Text>
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  color: designTokens.colors.text.primary,
                  lineHeight: 1.2,
                  marginBottom: '6px',
                }}>
                  {stat.value}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: stat.color,
                  }} />
                  <span style={{
                    fontSize: '0.75rem',
                    color: stat.color,
                    fontWeight: '600',
                  }}>
                    {stat.trend}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(QuickStats);
