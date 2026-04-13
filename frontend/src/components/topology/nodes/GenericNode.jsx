import React from 'react';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

const STATUS_COLORS = {
  online: '#52c41a',
  offline: '#d9d9d9',
  fault: '#ff4d4f',
  warning: '#faad14'
};

const TYPE_COLORS = {
  switch: '#1890ff',
  router: '#722ed1',
  server: '#52c41a',
  storage: '#fa8c16',
  default: '#8c8c8c'
};

function GenericNode({ data }) {
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

  const nodeColor = TYPE_COLORS[data.type] || TYPE_COLORS.default;
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
        cursor: 'pointer'
      }}
    >
      <svg
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        viewBox={`0 0 ${NODE_WIDTH} ${NODE_HEIGHT}`}
        style={{ display: 'block' }}
      >
        <rect
          x="10"
          y="10"
          width={NODE_WIDTH - 20}
          height={NODE_HEIGHT - 20}
          rx="4"
          fill="#fafafa"
          stroke={nodeColor}
          strokeWidth="1"
        />

        <rect
          x="20"
          y="20"
          width="50"
          height={NODE_HEIGHT - 40}
          rx="4"
          fill={nodeColor}
          opacity="0.2"
        />

        <rect
          x="25"
          y="25"
          width="40"
          height="30"
          rx="2"
          fill={nodeColor}
        />

        <circle cx="35" cy="35" r="6" fill="#fff" />
        <circle cx="35" cy="35" r="3" fill="#fff" opacity="0.5" />

        <line x1="75" y1="20" x2="75" y2={NODE_HEIGHT - 20} stroke="#d9d9d9" strokeWidth="1" />

        <text
          x="85"
          y="35"
          fill="#262626"
          fontSize="12"
          fontWeight="bold"
        >
          <title>{data.name || '设备'}</title>
          {data.name?.substring(0, 10) || '设备'}
        </text>
        <text
          x="85"
          y="50"
          fill="#8c8c8c"
          fontSize="10"
        >
          {data.type === 'switch' ? '交换机' :
           data.type === 'router' ? '路由器' :
           data.type === 'server' ? '服务器' :
           data.type === 'storage' ? '存储' : '设备'}
        </text>

        {isCenter && (
          <>
            <circle cx={NODE_WIDTH - 20} cy="15" r="8" fill={nodeColor} />
            <text
              x={NODE_WIDTH - 20}
              y="19"
              fill="#fff"
              fontSize="8"
              fontWeight="bold"
              textAnchor="middle"
            >
              ★
            </text>
          </>
        )}

        <circle
          cx={NODE_WIDTH - 15}
          cy={NODE_HEIGHT - 15}
          r="4"
          fill={statusColor}
        />
      </svg>
    </div>
  );
}

export default GenericNode;
