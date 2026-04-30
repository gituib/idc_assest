import React from 'react';
import { HEAT_MAP } from '../canvas/CanvasConstants';

const HeatMapLegend = ({ dimension }) => {
  const labels = {
    utilization: 'U位使用率',
    power: '功率负载',
    density: '设备密度',
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        background: 'rgba(255,255,255,0.92)',
        borderRadius: 6,
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: 12,
      }}
    >
      <div style={{ marginBottom: 4, fontWeight: 500, color: 'rgba(0,0,0,0.65)' }}>
        {labels[dimension] || '热力图'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: 'rgba(0,0,0,0.45)' }}>低</span>
        <div
          style={{
            width: 120,
            height: 12,
            borderRadius: 2,
            background: `linear-gradient(to right, ${HEAT_MAP.LOW}, ${HEAT_MAP.MEDIUM}, ${HEAT_MAP.HIGH})`,
          }}
        />
        <span style={{ color: 'rgba(0,0,0,0.45)' }}>高</span>
      </div>
    </div>
  );
};

export default HeatMapLegend;
