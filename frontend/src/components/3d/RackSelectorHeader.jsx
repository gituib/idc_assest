import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Tooltip, Dropdown } from 'antd';
import {
  ArrowLeftOutlined,
  CloudServerOutlined,
  ReloadOutlined,
  EyeOutlined,
  SettingOutlined,
  FullscreenOutlined,
  MenuOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import CascadingRackPanel from './CascadingRackPanel';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

const ACTION_BUTTONS_CONFIG = [
  {
    key: 'refresh',
    icon: <ReloadOutlined />,
    label: '刷新',
    tooltip: '刷新数据',
  },
  {
    key: 'resetView',
    icon: <EyeOutlined />,
    label: '重置视角',
    tooltip: '重置3D视图',
  },
  {
    key: 'config',
    icon: <SettingOutlined />,
    label: '显示配置',
    tooltip: '配置显示字段',
  },
];

const RackSelectorHeader = ({
  rooms,
  selectedRoomKey,
  selectedRack,
  onRackSelect,
  onPrevRack,
  onNextRack,
  racksInSelectedRoom,
  deviceSlideEnabled,
  onDeviceSlideToggle,
  onRefresh,
  onResetView,
  onOpenConfig,
  onBack,
}) => {
  const [selectorVisible, setSelectorVisible] = useState(false);
  const selectorRef = useRef(null);
  const { screenSize, config, isMobile } = useResponsiveLayout();

  useEffect(() => {
    const handleClickOutside = event => {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        setSelectorVisible(false);
      }
    };

    if (selectorVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectorVisible]);

  const handleRackSelect = useCallback(
    (rack, room) => {
      onRackSelect(rack, room);
      setSelectorVisible(false);
    },
    [onRackSelect]
  );

  const handleKeyDown = useCallback(e => {
    if (e.key === 'Escape') {
      setSelectorVisible(false);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setSelectorVisible(prev => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const selectedRoom = rooms.find(r => r.key === selectedRoomKey);
  const displayText = selectedRack
    ? `${selectedRoom?.name || ''} / ${selectedRack.name}`
    : '选择机房 / 机柜';

  const canNavigatePrev = racksInSelectedRoom && racksInSelectedRoom.length > 1 && selectedRack;
  const canNavigateNext = racksInSelectedRoom && racksInSelectedRoom.length > 1 && selectedRack;

  const getCurrentRackIndex = () => {
    if (!selectedRack || !racksInSelectedRoom) return -1;
    return racksInSelectedRoom.findIndex(r => r.rackId === selectedRack.rackId);
  };

  const dropdownMenuItems = ACTION_BUTTONS_CONFIG.map(btn => ({
    key: btn.key,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {btn.icon}
        {btn.label}
      </span>
    ),
    onClick: () => {
      switch (btn.key) {
        case 'refresh':
          onRefresh();
          break;
        case 'resetView':
          onResetView();
          break;
        case 'config':
          onOpenConfig();
          break;
        default:
          break;
      }
    },
  }));

  const renderLeftSection = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <Button
        type="text"
        icon={<ArrowLeftOutlined style={{ color: '#1E3A8A' }} />}
        onClick={onBack}
        className="header-icon-btn"
        style={{ marginRight: 10, width: 36, height: 36, borderRadius: 8, flexShrink: 0 }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(30, 64, 175, 0.06) 100%)',
          padding: '6px 14px',
          borderRadius: 10,
          border: '1px solid rgba(59, 130, 246, 0.15)',
        }}
      >
        <CloudServerOutlined style={{ fontSize: 18, color: '#1E40AF', marginRight: 10 }} />
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#1E3A8A',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
          }}
        >
          3D 机柜可视化
        </span>
      </div>
    </div>
  );

  const renderSelector = () => {
    const panelWidth = isMobile ? '100%' : 520;

    return (
      <div
        ref={selectorRef}
        style={{
          position: 'relative',
          flex: config.panelFullWidth ? 1 : '0 1 auto',
          maxWidth: config.panelFullWidth ? 'none' : 560,
          margin: '0 16px',
        }}
      >
        <div
          onClick={() => setSelectorVisible(prev => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: selectorVisible ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.7)',
            border: selectorVisible
              ? '1px solid rgba(59, 130, 246, 0.4)'
              : '1px solid rgba(30, 58, 138, 0.12)',
            borderRadius: 10,
            padding: '8px 14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minHeight: 40,
            boxShadow: selectorVisible
              ? '0 2px 8px rgba(30, 64, 175, 0.08)'
              : '0 1px 2px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              minWidth: 0,
            }}
          >
            <SwapOutlined
              style={{
                color: selectorVisible ? '#1E40AF' : '#64748B',
                marginRight: 10,
                fontSize: 14,
                transition: 'color 0.2s',
              }}
            />
            <span
              style={{
                color: selectedRack ? '#1E3A8A' : '#94A3B8',
                fontSize: 13,
                fontWeight: selectedRack ? 600 : 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayText}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginLeft: 12,
              flexShrink: 0,
            }}
          >
            {canNavigatePrev && (
              <div
                onClick={e => {
                  e.stopPropagation();
                  onPrevRack();
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(30, 58, 138, 0.06)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#1E40AF',
                  fontSize: 12,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(30, 58, 138, 0.06)';
                }}
              >
                ←
              </div>
            )}
            {canNavigateNext && (
              <div
                onClick={e => {
                  e.stopPropagation();
                  onNextRack();
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(30, 58, 138, 0.06)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#1E40AF',
                  fontSize: 12,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(30, 58, 138, 0.06)';
                }}
              >
                →
              </div>
            )}
            <span
              style={{
                color: '#64748B',
                fontSize: 10,
                transition: 'transform 0.2s',
                transform: selectorVisible ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▼
            </span>
          </div>
        </div>

        <CascadingRackPanel
          rooms={rooms}
          selectedRoomKey={selectedRoomKey}
          selectedRackId={selectedRack?.rackId}
          onSelect={handleRackSelect}
          visible={selectorVisible}
          onClose={() => setSelectorVisible(false)}
          triggerRef={selectorRef}
        />
      </div>
    );
  };

  // 根据 key 调用对应的回调函数
  const handleActionClick = key => {
    switch (key) {
      case 'refresh':
        onRefresh();
        break;
      case 'resetView':
        onResetView();
        break;
      case 'config':
        onOpenConfig();
        break;
      default:
        break;
    }
  };

  const renderActionButton = (btn, index) => {
    if (isMobile && btn.key === 'config') {
      return null;
    }

    return (
      <Tooltip key={btn.key} title={btn.tooltip} placement="bottom">
        <Button
          type="default"
          icon={btn.icon}
          onClick={() => handleActionClick(btn.key)}
          className="header-action-btn"
          style={{
            borderRadius: 8,
            borderColor: 'rgba(30, 58, 138, 0.15)',
            color: '#1E3A8A',
            background: 'rgba(255, 255, 255, 0.7)',
            height: 36,
            padding: '0 12px',
            fontWeight: 500,
          }}
        >
          {!isMobile && !config.buttonIconOnly && btn.label}
        </Button>
      </Tooltip>
    );
  };

  const renderDeviceSlideToggle = () => {
    if (!config.showDeviceSlide) return null;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.7)',
          padding: '4px 10px',
          borderRadius: 8,
          border: '1px solid rgba(30, 58, 138, 0.12)',
          gap: 6,
          height: 36,
        }}
      >
        <FullscreenOutlined
          style={{
            color: deviceSlideEnabled ? '#1E40AF' : '#94A3B8',
            fontSize: 14,
          }}
        />
        {!isMobile && (
          <span
            style={{
              fontSize: 12,
              color: deviceSlideEnabled ? '#1E3A8A' : '#94A3B8',
              whiteSpace: 'nowrap',
              fontWeight: 500,
            }}
          >
            设备弹出
          </span>
        )}
        <div
          onClick={() => onDeviceSlideToggle(!deviceSlideEnabled)}
          style={{
            width: 32,
            height: 18,
            borderRadius: 9,
            background: deviceSlideEnabled ? '#1E40AF' : 'rgba(148, 163, 184, 0.3)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: 2,
              left: deviceSlideEnabled ? 16 : 2,
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          />
        </div>
      </div>
    );
  };

  const renderRightSection = () => {
    if (config.collapseActions) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {renderDeviceSlideToggle()}
          <Dropdown menu={{ items: dropdownMenuItems }} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              icon={<MenuOutlined style={{ color: '#1E3A8A' }} />}
              className="header-icon-btn"
              style={{ borderRadius: 8 }}
            />
          </Dropdown>
        </div>
      );
    }

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        {renderDeviceSlideToggle()}
        {ACTION_BUTTONS_CONFIG.map(renderActionButton)}
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        padding: '0 24px 0 20px',
        marginLeft: -24,
        marginRight: -24,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(30, 58, 138, 0.08)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
      }}
    >
      <style>{`
        .header-icon-btn:hover {
          color: #1E40AF !important;
          background: rgba(59, 130, 246, 0.1) !important;
        }
        .header-action-btn:hover {
          color: #1E40AF !important;
          border-color: rgba(59, 130, 246, 0.4) !important;
          background: rgba(59, 130, 246, 0.06) !important;
        }
      `}</style>

      {renderLeftSection()}
      {renderSelector()}
      {renderRightSection()}
    </div>
  );
};

export default RackSelectorHeader;
