import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import { ReloadOutlined, FullscreenOutlined, FullscreenExitOutlined, DownloadOutlined } from '@ant-design/icons';
import RoomSelector from './RoomSelector';
import ZoomControls from './ZoomControls';
import { ToolbarWrapper, ToolbarDivider } from '../styles';

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
  onExport,
}) => {
  return (
    <ToolbarWrapper>
      <Space size={14} align="center">
        <RoomSelector
          selectedRoomId={selectedRoomId}
          onRoomChange={onRoomChange}
        />
        <ToolbarDivider />
        <ZoomControls
          zoom={zoom}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onZoomReset={onZoomReset}
        />
      </Space>

      <Space size={10} align="center">
        {onExport && (
          <Tooltip title="导出图片" placement="bottom">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={onExport}
              style={{ fontSize: 16 }}
            />
          </Tooltip>
        )}

        <Tooltip title={isFullscreen ? '退出全屏' : '全屏查看'} placement="bottom">
          <Button
            type="text"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={onToggleFullscreen}
            style={{ fontSize: 16 }}
          />
        </Tooltip>

        {onRefresh && (
          <Tooltip title="刷新数据" placement="bottom">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              style={{ fontSize: 16 }}
            />
          </Tooltip>
        )}
      </Space>
    </ToolbarWrapper>
  );
};

export default FloorPlanToolbar;
