import React from 'react';
import { Tooltip } from 'antd';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;

const STATUS_COLORS = {
  online: '#52c41a',
  offline: '#d9d9d9',
  fault: '#ff4d4f',
  warning: '#faad14'
};

function RouterNode({ data }) {
  if (!data) {
    return (
      <div style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: '#f0f0f0',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        无数据
      </div>
    );
  }

  const nodeColor = '#722ed1';
  const statusColor = STATUS_COLORS[data.status] || STATUS_COLORS.offline;
  const isCenter = data.isCenter;
  const isSelected = data.selected;

  return (
    <div
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: '#fff',
        borderRadius: 8,
        border: isSelected
          ? `2px solid ${nodeColor}`
          : isCenter
            ? `2px solid ${nodeColor}`
            : `1px solid #d9d9d9`,
        boxShadow: isCenter
          ? `0 4px 16px ${nodeColor}40`
          : isSelected
            ? `0 4px 12px ${nodeColor}30`
            : '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
        <img
          src="/png/路由器.png"
          alt="路由器"
          style={{ width: 'auto', height: '60px', objectFit: 'contain' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>

      <div style={{
        height: 32,
        background: '#f9f0ff',
        padding: '4px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Tooltip title={data.name || '路由器'} placement="bottomLeft">
          <div style={{
            fontSize: 11,
            fontWeight: 'bold',
            color: '#262626',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            cursor: 'pointer'
          }}>
            {data.name?.substring(0, 14) || '路由器'}
          </div>
        </Tooltip>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColor,
            display: 'inline-block'
          }} />
          {isCenter && (
            <span style={{
              fontSize: 9,
              color: '#faad14',
              fontWeight: 'bold'
            }}>
              ★
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default RouterNode;
