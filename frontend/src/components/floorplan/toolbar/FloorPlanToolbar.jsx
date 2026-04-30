import React from 'react';
import { Space, Tooltip } from 'antd';
import { ReloadOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import RoomSelector from './RoomSelector';
import ZoomControls from './ZoomControls';

const FloorPlanToolbar = ({
  selectedRoomId,
  onRoomChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        background: '#ffffff',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <Space size={14} align="center">
        <RoomSelector
          selectedRoomId={selectedRoomId}
          onRoomChange={onRoomChange}
        />
        <div style={{
          width: 1,
          height: 28,
          background: '#e8e8e8',
        }} />
        <ZoomControls
          zoom={zoom}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onZoomReset={onZoomReset}
        />
      </Space>

      <Space size={10} align="center">
        <Tooltip title={isFullscreen ? '退出全屏' : '全屏查看'} placement="bottom">
          <button
            onClick={onToggleFullscreen}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              border: '1px solid #e8e8e8',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#595959',
              transition: 'all 0.2s',
              fontSize: 16,
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f8f9fa';
              e.target.style.borderColor = '#d9d9d9';
              e.target.style.color = '#262626';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#fff';
              e.target.style.borderColor = '#e8e8e8';
              e.target.style.color = '#595959';
            }}
          >
            {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          </button>
        </Tooltip>

        {onRefresh && (
          <Tooltip title="刷新数据" placement="bottom">
            <button
              onClick={onRefresh}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff',
                border: '1px solid #e8e8e8',
                borderRadius: 8,
                cursor: 'pointer',
                color: '#595959',
                transition: 'all 0.2s',
                fontSize: 16,
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f8f9fa';
                e.target.style.borderColor = '#d9d9d9';
                e.target.style.color = '#262626';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#fff';
                e.target.style.borderColor = '#e8e8e8';
                e.target.style.color = '#595959';
              }}
            >
              <ReloadOutlined />
            </button>
          </Tooltip>
        )}
      </Space>
    </div>
  );
};

export default FloorPlanToolbar;
