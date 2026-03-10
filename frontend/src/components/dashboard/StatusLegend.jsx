import React from 'react';
import { Typography } from 'antd';
import { designTokens } from '../../config/theme';

const { Text } = Typography;

const StatusLegend = () => {
  const legends = [
    { color: designTokens.colors.success.main, label: '运行中', percent: 60 },
    { color: designTokens.colors.warning.main, label: '维护中', percent: 20 },
    { color: designTokens.colors.error.main, label: '故障', percent: 10 },
    { color: designTokens.colors.primary.main, label: '离线', percent: 10 },
  ];

  return (
    <div style={{ marginTop: '16px' }}>
      {legends.map((item, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: index < legends.length - 1 ? '1px solid #f5f5f5' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                background: item.color,
                boxShadow: `0 0 6px ${item.color}40`,
              }}
            />
            <Text style={{ fontSize: '0.85rem', color: designTokens.colors.text.secondary }}>
              {item.label}
            </Text>
          </div>
          <Text
            style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: designTokens.colors.text.primary,
            }}
          >
            {item.percent}%
          </Text>
        </div>
      ))}
    </div>
  );
};

export default React.memo(StatusLegend);
