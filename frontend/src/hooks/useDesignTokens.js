import { useMemo } from 'react';
import { useConfig } from '../context/ConfigContext';

/**
 * 使用设计令牌 Hook
 * 集中管理主题配置，避免在多个组件中重复定义
 * @returns {Object} 设计令牌对象
 */
export const useDesignTokens = () => {
  const { config } = useConfig();

  const designTokens = useMemo(() => {
    const primaryColor = config?.primary_color || '#667eea';
    const secondaryColor = config?.secondary_color || '#764ba2';

    return {
      colors: {
        primary: {
          main: primaryColor,
          gradient: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          light: '#8b9ff0',
        },
        success: { main: '#10b981' },
        warning: { main: '#f59e0b' },
        error: { main: '#ef4444' },
        text: {
          primary: '#1e293b',
          secondary: '#64748b',
          inverse: '#ffffff',
        },
        background: {
          primary: '#ffffff',
          secondary: '#f8fafc',
          dark: '#1e293b',
        },
        border: {
          light: '#e2e8f0',
        },
        sidebar: {
          bg: '#ffffff',
          bgHover: `rgba(${hexToRgb(primaryColor)}, 0.08)`,
          bgActive: `rgba(${hexToRgb(primaryColor)}, 0.15)`,
          text: '#475569',
          textHover: primaryColor,
          textActive: primaryColor,
          border: '#e2e8f0',
        },
      },
      shadows: {
        small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        large: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        small: '6px',
        medium: '10px',
      },
      spacing: {
        sm: '8px',
        md: '16px',
        lg: '24px',
      },
    };
  }, [config?.primary_color, config?.secondary_color]);

  return designTokens;
};

/**
 * 将十六进制颜色转换为RGB字符串
 * @param {string} hex - 十六进制颜色值
 * @returns {string} RGB字符串 (如: "102, 126, 234")
 */
function hexToRgb(hex) {
  // 移除 # 号
  const cleanHex = hex.replace('#', '');

  // 处理简写格式 (如: #fff)
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map(c => c + c)
          .join('')
      : cleanHex;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}

export default useDesignTokens;
