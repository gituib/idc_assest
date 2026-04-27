import React from 'react';
import { Button, Spin } from 'antd';
import {
  ReloadOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  HddOutlined,
} from '@ant-design/icons';
import { designTokens } from '../../config/theme';
import { useFetch } from '../../hooks/useSWR';

// 格式化运行时间
const formatUptime = (seconds) => {
  if (!seconds || isNaN(seconds)) {
    return '0天 0小时 0分钟';
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) {
    parts.push(`${days}天`);
  }
  if (hours > 0) {
    parts.push(`${hours}小时`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}分钟`);
  }

  return parts.join(' ');
};

const SystemInfo = ({ onRefresh, isRefreshing }) => {
  const { data: systemData, isLoading: isVersionLoading } = useFetch('/system-settings/system/info');

  const version = systemData?.system?.version || '1.2.0';
  const formattedVersion = `v${version}`;
  const currentTime = new Date().toLocaleString('zh-CN');

  // 获取系统运行时间
  const uptime = systemData?.system?.uptime || 0;
  const formattedUptime = formatUptime(uptime);

  // 获取系统状态指标
  const cpuPercent = systemData?.systemMetrics?.cpu?.percent || 45;
  const memoryPercent = systemData?.systemMetrics?.memory?.percent || 68;
  const diskPercent = systemData?.systemMetrics?.disk?.percent || 35;

  const systemMetrics = [
    {
      label: 'CPU 使用率',
      value: cpuPercent,
      color: '#1890ff',
    },
    {
      label: '内存使用率',
      value: memoryPercent,
      color: '#52c41a',
    },
    {
      label: '磁盘空间',
      value: diskPercent,
      color: '#722ed1',
    },
  ];

  return (
    <div style={{ padding: '14px' }}>
      {/* 系统信息标题 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '14px',
          }}>
            <InfoCircleOutlined />
          </div>
          <div>
            <div style={{
              fontSize: '0.9rem',
              fontWeight: '700',
              color: designTokens.colors.text.primary,
            }}>
              系统信息
            </div>
          </div>
        </div>

        <Button
          type="primary"
          icon={<ReloadOutlined spin={isRefreshing} />}
          size="small"
          onClick={onRefresh}
          loading={isRefreshing}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 3px 10px rgba(102, 126, 234, 0.25)',
            height: '32px',
            padding: '0 12px',
            fontWeight: '600',
            fontSize: '0.8rem',
          }}
        >
          刷新数据
        </Button>
      </div>

      {/* 系统基本信息卡片 */}
      <div style={{
        background: 'linear-gradient(135deg, #f5f7ff 0%, #f0f7ff 100%)',
        borderRadius: '12px',
        padding: '14px',
        border: '1px solid #e6f4ff',
        marginBottom: '10px',
      }}>
        {/* 系统版本和运行状态 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          paddingBottom: '10px',
          borderBottom: '1px dashed #d9eaff',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: designTokens.colors.primary.main,
              fontSize: '14px',
              boxShadow: '0 2px 6px rgba(24, 144, 255, 0.1)',
            }}>
              {isVersionLoading ? <Spin size="small" /> : <CheckCircleOutlined />}
            </div>
            <div>
              <div style={{
                fontSize: '0.75rem',
                color: designTokens.colors.text.secondary,
                marginBottom: '2px',
              }}>
                系统版本
              </div>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: '700',
                color: designTokens.colors.primary.main,
              }}>
                {formattedVersion}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            background: '#e6f4ff',
            borderRadius: '16px',
            fontSize: '0.75rem',
            color: designTokens.colors.primary.main,
            fontWeight: '600',
          }}>
            <div style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: '#52c41a',
              animation: 'pulse 2s infinite',
            }} />
            运行中
          </div>
        </div>

        {/* 运行时长和最后更新 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: designTokens.colors.text.secondary,
              fontSize: '14px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            }}>
              <ThunderboltOutlined />
            </div>
            <div>
              <div style={{
                fontSize: '0.75rem',
                color: designTokens.colors.text.secondary,
                marginBottom: '2px',
              }}>
                运行时长
              </div>
              <div style={{
                fontSize: '0.8rem',
                fontWeight: '600',
                color: designTokens.colors.text.primary,
              }}>
                {formattedUptime}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: designTokens.colors.text.secondary,
              fontSize: '14px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            }}>
              <ClockCircleOutlined />
            </div>
            <div>
              <div style={{
                fontSize: '0.75rem',
                color: designTokens.colors.text.secondary,
                marginBottom: '2px',
              }}>
                最后更新
              </div>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: designTokens.colors.text.primary,
              }}>
                {currentTime}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 系统状态指标 */}
      <div style={{
        background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
        borderRadius: '12px',
        padding: '12px',
        border: '1px solid #f0f0f0',
        marginBottom: '10px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '10px',
        }}>
          <HddOutlined style={{ fontSize: '12px', color: designTokens.colors.text.secondary }} />
          <span style={{ fontSize: '0.78rem', fontWeight: '600', color: designTokens.colors.text.primary }}>
            系统状态
          </span>
        </div>

        {systemMetrics.map((metric, index) => (
          <div key={index} style={{ marginBottom: index === systemMetrics.length - 1 ? '0' : '8px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}>
              <span style={{ fontSize: '0.72rem', color: designTokens.colors.text.secondary }}>
                {metric.label}
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: '600', color: metric.color }}>
                {metric.value}%
              </span>
            </div>
            <div style={{
              height: '6px',
              background: '#f0f0f0',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${metric.value}%`,
                background: `linear-gradient(90deg, ${metric.color} 0%, ${metric.color}cc 100%)`,
                borderRadius: '3px',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default React.memo(SystemInfo);
