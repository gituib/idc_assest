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
    const handleClickOutside = (event) => {
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

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        setSelectorVisible(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSelectorVisible((prev) => !prev);
      }
    },
    []
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const selectedRoom = rooms.find((r) => r.key === selectedRoomKey);
  const displayText = selectedRack
    ? `${selectedRoom?.name || ''} / ${selectedRack.name}`
    : '选择机房 / 机柜';

  const canNavigatePrev =
    racksInSelectedRoom && racksInSelectedRoom.length > 1 && selectedRack;
  const canNavigateNext =
    racksInSelectedRoom && racksInSelectedRoom.length > 1 && selectedRack;

  const getCurrentRackIndex = () => {
    if (!selectedRack || !racksInSelectedRoom) return -1;
    return racksInSelectedRoom.findIndex((r) => r.rackId === selectedRack.rackId);
  };

  const dropdownMenuItems = ACTION_BUTTONS_CONFIG.map((btn) => ({
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
        icon={<ArrowLeftOutlined style={{ color: 'rgba(255,255,255,0.8)' }} />}
        onClick={onBack}
        className="header-icon-btn"
        style={{ marginRight: 8 }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.05)',
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <CloudServerOutlined style={{ fontSize: 18, color: '#3b82f6', marginRight: 10 }} />
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#f8fafc',
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
          onClick={() => setSelectorVisible((prev) => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: selectorVisible
              ? 'rgba(59, 130, 246, 0.15)'
              : 'rgba(255, 255, 255, 0.08)',
            border: selectorVisible
              ? '1px solid rgba(59, 130, 246, 0.5)'
              : '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 10,
            padding: '8px 14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minHeight: 40,
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
                color: selectorVisible ? '#60a5fa' : 'rgba(255,255,255,0.5)',
                marginRight: 10,
                fontSize: 14,
                transition: 'color 0.2s',
              }}
            />
            <span
              style={{
                color: selectedRack ? '#f8fafc' : 'rgba(255,255,255,0.5)',
                fontSize: 13,
                fontWeight: selectedRack ? 500 : 400,
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
                onClick={(e) => {
                  e.stopPropagation();
                  onPrevRack();
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                }}
              >
                ←
              </div>
            )}
            {canNavigateNext && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onNextRack();
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                }}
              >
                →
              </div>
            )}
            <span
              style={{
                color: 'rgba(255,255,255,0.5)',
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

  const renderActionButton = (btn, index) => {
    if (isMobile && btn.key === 'config') {
      return null;
    }

    return (
      <Tooltip key={btn.key} title={btn.tooltip} placement="bottom">
        <Button
          type="primary"
          ghost
          icon={btn.icon}
          onClick={btn.onClick}
          className="header-action-btn"
          style={{
            borderRadius: 8,
            borderColor: 'rgba(255,255,255,0.25)',
            color: 'rgba(255,255,255,0.85)',
            height: 36,
            padding: '0 12px',
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
          background: 'rgba(255,255,255,0.05)',
          padding: '4px 10px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.05)',
          gap: 6,
          height: 36,
        }}
      >
        <FullscreenOutlined
          style={{
            color: deviceSlideEnabled ? '#22c55e' : 'rgba(255,255,255,0.4)',
            fontSize: 14,
          }}
        />
        {!isMobile && (
          <span
            style={{
              fontSize: 12,
              color: deviceSlideEnabled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
              whiteSpace: 'nowrap',
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
            background: deviceSlideEnabled ? '#22c55e' : 'rgba(255,255,255,0.2)',
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
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
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
          <Dropdown
            menu={{ items: dropdownMenuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={<MenuOutlined style={{ color: 'rgba(255,255,255,0.8)' }} />}
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
        padding: '0 20px 0 12px',
        marginLeft: -24,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 100,
      }}
    >
      <style>{`
        .header-icon-btn:hover {
          color: white !important;
          background: rgba(255,255,255,0.1) !important;
        }
        .header-action-btn:hover {
          color: white !important;
          border-color: rgba(255,255,255,0.5) !important;
          background: rgba(255,255,255,0.1) !important;
        }
      `}</style>

      {renderLeftSection()}
      {renderSelector()}
      {renderRightSection()}
    </div>
  );
};

export default RackSelectorHeader;