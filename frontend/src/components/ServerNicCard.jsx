import React from 'react';
import { Card, Tag, Badge, Tooltip } from 'antd';
import {
  CloudServerOutlined,
  GatewayOutlined,
  DatabaseOutlined,
  AudioOutlined,
  QuestionOutlined,
} from '@ant-design/icons';
import { designTokens } from '../config/theme';

const DEVICE_TYPE_CONFIG = {
  server: {
    icon: <CloudServerOutlined />,
    color: designTokens.colors.device.server,
    label: '服务器',
  },
  switch: {
    icon: <GatewayOutlined />,
    color: designTokens.colors.device.switch,
    label: '交换机',
  },
  router: {
    icon: <GatewayOutlined />,
    color: designTokens.colors.device.router,
    label: '路由器',
  },
  storage: {
    icon: <DatabaseOutlined />,
    color: designTokens.colors.device.storage,
    label: '存储设备',
  },
  other: {
    icon: <QuestionOutlined />,
    color: designTokens.colors.device.other,
    label: '其他设备',
  },
};

const STATUS_CONFIG = {
  running: { color: '#10b981', text: '运行中', bg: '#ecfdf5' },
  maintenance: { color: '#3b82f6', text: '维护中', bg: '#eff6ff' },
  offline: { color: '#6b7280', text: '离线', bg: '#f3f4f6' },
  fault: { color: '#ef4444', text: '故障', bg: '#fef2f2' },
  idle: { color: '#36cfc9', text: '空闲', bg: '#e6fffb' },
};

function ServerNicCard({ server, onManage }) {
  const typeConfig = DEVICE_TYPE_CONFIG[server.type] || DEVICE_TYPE_CONFIG.other;
  const statusConfig = STATUS_CONFIG[server.status] || STATUS_CONFIG.offline;

  const nicCount = server.nicCount || server.nics?.length || 0;
  const totalPortCount = server.nics?.reduce((sum, nic) => sum + (nic.portCount || 0), 0) || 0;

  return (
    <Card
      hoverable
      onClick={onManage}
      style={{
        borderRadius: designTokens.borderRadius.md,
        border: `1px solid ${designTokens.colors.border.light}`,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
      styles={{
        body: { padding: '16px' },
      }}
      className="server-nic-card"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          height: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${typeConfig.color} 0%, ${typeConfig.color}cc 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '20px',
              flexShrink: 0,
              boxShadow: `0 4px 12px ${typeConfig.color}40`,
            }}
          >
            {typeConfig.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Tooltip title={server.name}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: designTokens.colors.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '4px',
                }}
              >
                {server.name}
              </div>
            </Tooltip>
            <Tooltip title={server.deviceId}>
              <div
                style={{
                  fontSize: '12px',
                  color: designTokens.colors.text.tertiary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                ID: {server.deviceId}
              </div>
            </Tooltip>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Tag
            style={{
              background: `${typeConfig.color}15`,
              color: typeConfig.color,
              border: `1px solid ${typeConfig.color}30`,
              borderRadius: '6px',
              fontSize: '11px',
              padding: '2px 8px',
            }}
          >
            {typeConfig.icon} {typeConfig.label}
          </Tag>
          <Tag
            style={{
              background: statusConfig.bg,
              color: statusConfig.color,
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              padding: '2px 8px',
            }}
          >
            {statusConfig.text}
          </Tag>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            padding: '12px',
            background: designTokens.colors.background.secondary,
            borderRadius: '8px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{ fontSize: '18px', fontWeight: 700, color: designTokens.colors.primary.main }}
            >
              {nicCount}
            </div>
            <div style={{ fontSize: '11px', color: designTokens.colors.text.secondary }}>网卡</div>
          </div>
          <div
            style={{
              textAlign: 'center',
              borderLeft: `1px solid ${designTokens.colors.border.light}`,
              borderRight: `1px solid ${designTokens.colors.border.light}`,
            }}
          >
            <div
              style={{ fontSize: '18px', fontWeight: 700, color: designTokens.colors.info.main }}
            >
              {totalPortCount}
            </div>
            <div style={{ fontSize: '11px', color: designTokens.colors.text.secondary }}>端口</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Badge
              status={server.nicCount > 0 ? 'success' : 'default'}
              text={
                <span style={{ fontSize: '12px', color: designTokens.colors.text.secondary }}>
                  {server.nicCount > 0 ? '已配置' : '未配置'}
                </span>
              }
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: designTokens.colors.primary.main,
              cursor: 'pointer',
            }}
            onClick={e => {
              e.stopPropagation();
              onManage();
            }}
          >
            管理 →
          </div>
        </div>
      </div>

      <style>{`
        .server-nic-card:hover {
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15) !important;
          border-color: ${designTokens.colors.primary.light} !important;
          transform: translateY(-2px);
        }
      `}</style>
    </Card>
  );
}

export default React.memo(ServerNicCard);
