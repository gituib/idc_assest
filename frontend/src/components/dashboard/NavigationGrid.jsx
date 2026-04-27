import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CloudServerOutlined,
  DatabaseOutlined,
  WarningOutlined,
  AppstoreOutlined,
  SettingOutlined,
  ApartmentOutlined,
  LinkOutlined,
  ArrowRightOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { designTokens } from '../../config/theme';

const NAV_BUTTONS_DATA = [
  {
    key: 'devices',
    icon: CloudServerOutlined,
    text: '设备管理',
    path: '/devices',
    color: designTokens.colors.primary.main,
    description: '设备全生命周期管理',
  },
  {
    key: 'racks',
    icon: DatabaseOutlined,
    text: '资源规划',
    path: '/racks',
    color: '#722ed1',
    description: '机柜和机房管理',
  },
  {
    key: 'tickets',
    icon: WarningOutlined,
    text: '故障监控',
    path: '/tickets',
    color: designTokens.colors.warning.main,
    description: '工单和故障处理',
  },
  {
    key: 'inventory',
    icon: AuditOutlined,
    text: '资产盘点',
    path: '/inventory',
    color: '#13c2c2',
    description: '资产库存和盘点管理',
  },
  {
    key: 'consumables',
    icon: AppstoreOutlined,
    text: '耗材管理',
    path: '/consumables',
    color: '#fa8c16',
    description: '耗材库存和领用',
  },
  {
    key: 'visualization',
    icon: ApartmentOutlined,
    text: '3D可视化',
    path: '/visualization-3d',
    color: designTokens.colors.success.main,
    description: '3D机房可视化',
  },
  {
    key: 'cables',
    icon: LinkOutlined,
    text: '线缆管理',
    path: '/cables',
    color: '#eb2f96',
    description: '线缆连接管理',
  },
  {
    key: 'settings',
    icon: SettingOutlined,
    text: '系统配置',
    path: '/settings',
    color: '#8c8c8c',
    description: '系统设置和管理',
  },
];

const NavigationGrid = ({ hoveredCard, onHover }) => {
  const navigate = useNavigate();
  const firstRow = NAV_BUTTONS_DATA.slice(0, 4);
  const secondRow = NAV_BUTTONS_DATA.slice(4, 8);

  const renderRow = (items) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '10px',
      marginBottom: '10px',
    }}>
      {items.map(({ key, icon: Icon, text, color, description, path }) => {
        const isHovered = hoveredCard === `nav-${key}`;
        return (
          <div
            key={key}
            className="nav-button"
            style={{
              padding: '14px 12px',
              borderRadius: '12px',
              background: '#fff',
              border: `1.5px solid ${isHovered ? color : '#f0f0f0'}`,
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isHovered 
                ? `0 12px 28px ${color}12, 0 4px 12px ${color}06` 
                : designTokens.shadows.small,
              transform: isHovered ? 'translateY(-3px)' : 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={() => onHover(`nav-${key}`)}
            onMouseLeave={() => onHover(null)}
            onClick={() => navigate(path)}
          >
            {/* 装饰性背景元素 */}
            <div style={{
              position: 'absolute',
              right: '-15px',
              top: '-15px',
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${color}08 0%, ${color}03 100%)`,
              opacity: isHovered ? 1 : 0.6,
              transition: 'all 0.3s ease',
            }} />
            
            {/* 次要装饰元素 */}
            <div style={{
              position: 'absolute',
              right: '15px',
              bottom: '-20px',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${color}05 0%, transparent 100%)`,
              opacity: isHovered ? 0.8 : 0.4,
              transition: 'all 0.3s ease',
            }} />
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              position: 'relative',
              zIndex: 1,
              height: '100%',
            }}>
              {/* 顶部区域：图标和箭头 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}>
                {/* 图标容器 */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isHovered 
                    ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` 
                    : `linear-gradient(135deg, ${color}12 0%, ${color}06 100%)`,
                  color: isHovered ? '#fff' : color,
                  fontSize: '18px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isHovered 
                    ? `0 6px 16px ${color}30` 
                    : 'none',
                  flexShrink: 0,
                }}>
                  <Icon style={{ fontSize: '20px', transition: 'transform 0.3s ease', transform: isHovered ? 'scale(1.1)' : 'scale(1)' }} />
                </div>
                
                {/* 箭头指示器 */}
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '8px',
                  background: isHovered 
                    ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` 
                    : '#f5f7fa',
                  color: isHovered ? '#fff' : color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  transition: 'all 0.3s ease',
                  opacity: isHovered ? 1 : 0.5,
                  transform: isHovered ? 'translateX(3px)' : 'translateX(0)',
                }}>
                  <ArrowRightOutlined />
                </div>
              </div>
              
              {/* 文本内容区域 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}>
                {/* 标题 */}
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: designTokens.colors.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  letterSpacing: '-0.01em',
                }}>
                  {text}
                </div>
                
                {/* 描述文本 */}
                <div style={{
                  fontSize: '0.78rem',
                  color: designTokens.colors.text.secondary,
                  lineHeight: '1.4',
                  fontWeight: '400',
                }}>
                  {description}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      {/* 区域标题 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '18px',
            boxShadow: '0 3px 10px rgba(102, 126, 234, 0.3)',
          }}>
            <AppstoreOutlined />
          </div>
          <div>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              color: designTokens.colors.text.primary,
              margin: '0',
              letterSpacing: '-0.01em',
            }}>
              功能导航
            </h3>
            <p style={{
              fontSize: '0.82rem',
              color: designTokens.colors.text.secondary,
              margin: '5px 0 0 0',
            }}>
              快速访问系统核心功能模块
            </p>
          </div>
        </div>
      </div>

      {/* 导航网格 - 第一排 */}
      {renderRow(firstRow)}
      
      {/* 导航网格 - 第二排 */}
      {renderRow(secondRow)}
      
      {/* 响应式样式 */}
      <style>{`
        @media (max-width: 1400px) {
          .nav-button {
            padding: 12px 10px !important;
          }
        }
        
        @media (max-width: 1200px) {
          .nav-button {
            padding: 12px 10px !important;
          }
        }
        
        @media (max-width: 992px) {
          .nav-button {
            padding: 12px 10px !important;
          }
        }
        
        @media (max-width: 768px) {
          .nav-button {
            padding: 12px 10px !important;
          }
          .nav-grid > div > div {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
        }
        
        @media (max-width: 576px) {
          .nav-grid > div > div {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
        }
        
        @media (max-width: 400px) {
          .nav-grid > div > div {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default React.memo(NavigationGrid);
