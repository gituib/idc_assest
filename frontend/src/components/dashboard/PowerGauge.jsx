import React from 'react';
import { Typography } from 'antd';
import { designTokens } from '../../config/theme';

const { Text } = Typography;

const PowerGauge = ({ value, maxValue }) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const getColor = () => {
    if (percentage >= 80) return designTokens.colors.error.main;
    if (percentage >= 60) return designTokens.colors.warning.main;
    return designTokens.colors.success.main;
  };

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <Text style={{ fontSize: '0.85rem', color: designTokens.colors.text.secondary }}>
          功率使用率
        </Text>
        <Text style={{ fontSize: '0.85rem', fontWeight: '600', color: getColor() }}>
          {percentage.toFixed(1)}%
        </Text>
      </div>
      <div
        style={{
          height: '8px',
          borderRadius: '4px',
          background: '#f0f0f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: '4px',
            background: `linear-gradient(90deg, ${getColor()}, ${getColor()}80)`,
            width: `${percentage}%`,
            transition: 'width 0.8s ease-out',
            boxShadow: `0 0 8px ${getColor()}40`,
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '0.75rem',
          color: designTokens.colors.text.tertiary,
        }}
      >
        <span>{value}W</span>
        <span>{maxValue}W</span>
      </div>
    </div>
  );
};

export default React.memo(PowerGauge);
