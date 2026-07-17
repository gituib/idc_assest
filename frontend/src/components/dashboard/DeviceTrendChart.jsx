import React from 'react';
import { designTokens } from '../../config/theme';

/**
 * 设备趋势柱状图组件
 * @param {Object} props - 组件属性
 * @param {Array<{label: string, value: number, color: string}>} props.data - 趋势数据
 * @returns {React.ReactElement} 渲染的柱状图
 */
const DeviceTrendChart = ({ data }) => {
  const chartHeight = 120;

  // 空数组时 Math.max(...[]) 返回 -Infinity 会引发异常，需显式处理
  const safeData = Array.isArray(data) ? data : [];
  const maxValue = safeData.length > 0 ? Math.max(...safeData.map(d => d.value)) : 0;

  // 数据为空时显示占位提示，避免渲染异常柱子
  if (safeData.length === 0) {
    return (
      <div style={{
        height: chartHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: designTokens.colors.text.tertiary,
        fontSize: '0.8rem',
      }}>
        暂无趋势数据
      </div>
    );
  }

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
        {safeData.map((item, index) => {
          // maxValue 为 0 时避免除零，柱子高度降级为 0
          const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
          return (
            <div
              key={`${item.label}-${index}`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '40px',
                  height: `${barHeight}px`,
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
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(DeviceTrendChart);
