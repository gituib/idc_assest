import React from 'react';
import { designTokens } from '../../config/theme';

const DeviceTrendChart = ({ data }) => {
  const maxValue = Math.max(...data.map((d) => d.value));
  const chartHeight = 120;

  return (
    <div style={{ marginTop: '16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height: chartHeight,
          gap: '8px',
          padding: '0 8px',
        }}
      >
        {data.map((item, index) => (
          <div
            key={index}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '40px',
                height: `${(item.value / maxValue) * chartHeight}px`,
                borderRadius: '4px 4px 0 0',
                background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}80 100%)`,
                transition: `height ${designTokens.transitions.slow}`,
                boxShadow: `0 -2px 8px ${item.color}30`,
              }}
            />
            <span
              style={{
                fontSize: '0.7rem',
                color: designTokens.colors.text.tertiary,
                marginTop: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(DeviceTrendChart);
