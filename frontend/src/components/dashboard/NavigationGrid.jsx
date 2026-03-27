import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CloudServerOutlined,
  DatabaseOutlined,
  WarningOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { designTokens } from '../../config/theme';

const NAV_BUTTONS_DATA = [
  {
    key: 'devices',
    icon: CloudServerOutlined,
    text: '设备管理',
    path: '/devices',
    color: designTokens.colors.primary.main,
  },
  {
    key: 'racks',
    icon: DatabaseOutlined,
    text: '资源规划',
    path: '/racks',
    color: '#722ed1',
  },
  {
    key: 'faults',
    icon: WarningOutlined,
    text: '故障监控',
    path: '/faults',
    color: designTokens.colors.warning.main,
  },
  {
    key: 'tickets',
    icon: BarChartOutlined,
    text: '工单管理',
    path: '/tickets',
    color: '#13c2c2',
  },
  {
    key: 'consumables',
    icon: AppstoreOutlined,
    text: '耗材管理',
    path: '/consumables',
    color: '#fa8c16',
  },
  {
    key: 'settings',
    icon: SettingOutlined,
    text: '系统配置',
    path: '/settings',
    color: designTokens.colors.success.main,
  },
];

const createNavButtonStyle = (color, isHovered) => ({
  height: 'auto',
  padding: 'clamp(16px, 4vw, 24px) clamp(12px, 3vw, 20px)',
  borderRadius: designTokens.borderRadius.medium,
  border: `2px solid ${isHovered ? color : '#f0f0f0'}`,
  background: '#fff',
  transition: `all ${designTokens.transitions.normal}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'clamp(8px, 2vw, 12px)',
  cursor: 'pointer',
  boxShadow: isHovered ? designTokens.shadows.large : designTokens.shadows.small,
  transform: isHovered ? 'translateY(-4px)' : 'none',
  minWidth: 0,
});

const createNavIconContainer = color => ({
  width: 'clamp(44px, 10vw, 60px)',
  height: 'clamp(44px, 10vw, 60px)',
  borderRadius: designTokens.borderRadius.medium,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
  fontSize: 'clamp(20px, 5vw, 28px)',
  transition: `all ${designTokens.transitions.normal}`,
  flexShrink: 0,
});

const navTextStyle = {
  fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
  fontWeight: '600',
  color: designTokens.colors.text.primary,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
};

const NavigationGrid = ({ hoveredCard, onHover }) => {
  const navigate = useNavigate();

  return (
    <div
      className="nav-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: 'clamp(8px, 2vw, 16px)',
        marginBottom: '24px',
      }}
    >
      {NAV_BUTTONS_DATA.map(({ key, icon: Icon, text, color }) => {
        const isHovered = hoveredCard === `nav-${key}`;
        return (
          <div
            key={key}
            className="nav-button"
            style={{
              ...createNavButtonStyle(color, isHovered),
              animationDelay: `${NAV_BUTTONS_DATA.findIndex(b => b.key === key) * 0.1}s`,
            }}
            onMouseEnter={() => onHover(`nav-${key}`)}
            onMouseLeave={() => onHover(null)}
            onClick={() => navigate(`/${key}`)}
          >
            <div className="nav-icon" style={createNavIconContainer(color)}>
              <Icon style={{ color, fontSize: 'clamp(20px, 5vw, 28px)' }} />
            </div>
            <span className="nav-text" style={navTextStyle}>
              {text}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(NavigationGrid);
