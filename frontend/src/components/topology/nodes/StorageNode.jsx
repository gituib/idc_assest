import React from 'react';
import { Tooltip } from 'antd';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 110;

const STATUS_COLORS = {
  online: '#52c41a',
  offline: '#d9d9d9',
  fault: '#ff4d4f',
  warning: '#faad14'
};

function StorageNode({ data }) {
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

  const nodeColor = '#fa8c16';
  const statusColor = STATUS_COLORS[data.status] || STATUS_COLORS.offline;
  const isCenter = data.isCenter;
  const isSelected = data.selected;

  const diskCount = 8;
  const activeDisks = Math.floor((data.portCount?.used || 12) / 4);

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
          fill="#fff7e6"
          stroke={nodeColor}
          strokeWidth="1"
        />

        <rect
          x="15"
          y="15"
          width={NODE_WIDTH - 30}
          height="55"
          rx="3"
          fill="#fff"
          stroke={nodeColor}
          strokeWidth="1"
        />

        <rect
          x="20"
          y="20"
          width="35"
          height="45"
          rx="2"
          fill="#262626"
        />
        <rect x="23" y="23" width="29" height="4" rx="1" fill="#52c41a" />
        {[...Array(6)].map((_, i) => (
          <rect
            key={i}
            x="23"
            y={29 + i * 6}
            width="29"
            height="4"
            rx="1"
            fill={i < activeDisks ? nodeColor : '#595959'}
          />
        ))}

        <rect
          x="60"
          y="20"
          width="35"
          height="45"
          rx="2"
          fill="#262626"
        />
        <rect x="63" y="23" width="29" height="4" rx="1" fill="#52c41a" />
        {[...Array(6)].map((_, i) => (
          <rect
            key={i}
            x="63"
            y={29 + i * 6}
            width="29"
            height="4"
            rx="1"
            fill={i < activeDisks - 2 ? nodeColor : '#595959'}
          />
        ))}

        <rect
          x="100"
          y="20"
          width="35"
          height="45"
          rx="2"
          fill="#262626"
        />
        <rect x="103" y="23" width="29" height="4" rx="1" fill="#52c41a" />
        {[...Array(6)].map((_, i) => (
          <rect
            key={i}
            x="103"
            y={29 + i * 6}
            width="29"
            height="4"
            rx="1"
            fill={i < activeDisks - 4 ? nodeColor : '#595959'}
          />
        ))}

        <rect
          x="140"
          y="20"
          width="35"
          height="45"
          rx="2"
          fill="#262626"
        />
        <rect x="143" y="23" width="29" height="4" rx="1" fill="#52c41a" />
        {[...Array(6)].map((_, i) => (
          <rect
            key={i}
            x="143"
            y={29 + i * 6}
            width="29"
            height="4"
            rx="1"
            fill={i < activeDisks - 6 ? nodeColor : '#595959'}
          />
        ))}

        <line x1="15" y1="75" x2={NODE_WIDTH - 15} y2="75" stroke="#d9d9d9" strokeWidth="1" />

        <rect x="15" y="80" width="80" height="5" rx="1" fill="#262626" />
        <rect x="100" y="80" width="40" height="5" rx="1" fill="#52c41a" />

        <text
          x="15"
          y="98"
          fill="#262626"
          fontSize="10"
          fontWeight="bold"
        >
          <title>{data.name || '存储设备'}</title>
          {data.name?.substring(0, 14) || '存储设备'}
        </text>

        <text
          x={NODE_WIDTH - 15}
          y="98"
          fill="#8c8c8c"
          fontSize="9"
          textAnchor="end"
        >
          {data.model || 'Storage'}
        </text>

        {isCenter && (
          <>
            <circle cx={NODE_WIDTH - 20} cy="12" r="8" fill={nodeColor} />
            <text
              x={NODE_WIDTH - 20}
              y="16"
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
          cy={NODE_HEIGHT - 12}
          r="4"
          fill={statusColor}
        />
      </svg>
    </div>
  );
}

export default StorageNode;
