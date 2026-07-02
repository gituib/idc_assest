import React, { useEffect } from 'react';
import { Button, Space, Tooltip, Tag, InputNumber } from 'antd';
import {
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  DownloadOutlined,
  EditOutlined,
  SaveOutlined,
  UndoOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import RoomSelector from './RoomSelector';
import ZoomControls from './ZoomControls';
import { ToolbarWrapper, ToolbarDivider } from '../styles';

const gridInputStyle = {
  width: 50,
  fontSize: 12,
};
const gridInputNumberStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 12,
  color: '#595959',
};
const gridLabelStyle = {
  color: '#1d39c4',
  fontWeight: 500,
  fontSize: 11,
  whiteSpace: 'nowrap',
  lineHeight: '28px',
};

/**
 * 平面图工具栏
 * @param {object} props - 组件属性
 * @param {string} props.roomId - 当前选中的机房ID
 * @param {Function} props.onRoomChange - 机房切换回调
 * @param {number} props.zoom - 当前缩放比例
 * @param {Function} props.onZoomIn - 放大回调
 * @param {Function} props.onZoomOut - 缩小回调
 * @param {Function} props.onZoomReset - 重置缩放回调
 * @param {Function} props.onRefresh - 刷新回调
 * @param {boolean} props.isFullscreen - 是否全屏
 * @param {Function} props.onToggleFullscreen - 切换全屏回调
 * @param {Function} props.onExport - 导出图片回调
 * @param {boolean} props.editMode - 是否处于编辑模式
 * @param {Function} props.onToggleEditMode - 切换编辑模式回调
 * @param {Function} props.onSaveLayout - 保存布局回调
 * @param {Function} props.onResetLayout - 重置布局回调
 * @param {boolean} props.saving - 是否正在保存
 * @param {boolean} props.hasPendingChanges - 是否有未保存的改动
 * @param {number} props.editGridRows - 编辑网格行数
 * @param {number} props.editGridCols - 编辑网格列数
 * @param {Function} props.onEditGridRowsChange - 编辑网格行数变化回调
 * @param {Function} props.onEditGridColsChange - 编辑网格列数变化回调
 */
const FloorPlanToolbar = ({
  roomId,
  onRoomChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
  onExport,
  editMode,
  onToggleEditMode,
  onSaveLayout,
  onResetLayout,
  saving,
  hasPendingChanges,
  editGridRows,
  editGridCols,
  onEditGridRowsChange,
  onEditGridColsChange,
}) => {
    // 行列输入框的本地待应用值（输入即改界面数值，点击「应用」才真正提交）
    const [localRows, setLocalRows] = React.useState(editGridRows);
    const [localCols, setLocalCols] = React.useState(editGridCols);
    // 当父组件 editGridRows/editGridCols 变化时同步到本地值
    React.useEffect(() => {
      setLocalRows(editGridRows);
      setLocalCols(editGridCols);
    }, [editGridRows, editGridCols]);

    const handleApplyGridSize = () => {
      const rows = Math.max(3, Math.min(50, localRows));
      const cols = Math.max(3, Math.min(50, localCols));
      setLocalRows(rows);
      setLocalCols(cols);
      onEditGridRowsChange?.(rows);
      onEditGridColsChange?.(cols);
    };

    useEffect(() => {
    // 注入样式到 document head，确保工具栏相关样式全局生效
    const styleId = 'floorplan-toolbar-injected-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .floorplan-toolbar-input-number .ant-input-number-input {
          height: 22px !important;
          line-height: 22px !important;
        }
        .floorplan-toolbar-grid-group {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #f0f5ff;
          border: 1px solid #d6e4ff;
          border-radius: 6px;
          padding: 0 8px;
          height: 28px;
        }
      `;
      document.head.appendChild(style);
    }
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
  return (
    <ToolbarWrapper>
      <Space size={14} align="center">
        <RoomSelector
          selectedRoomId={roomId}
          onRoomChange={onRoomChange}
        />
        <ToolbarDivider />
        <ZoomControls
          zoom={zoom}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onZoomReset={onZoomReset}
        />
        {editMode && (
          <>
            <ToolbarDivider />
            <Tag color="blue" style={{ margin: 0, padding: '2px 8px' }}>
              编辑模式
            </Tag>
            <ToolbarDivider />
            <div style={gridInputNumberStyle}>
              <div className="floorplan-toolbar-grid-group">
                <span style={gridLabelStyle}>行</span>
                <InputNumber
                  size="small"
                  className="floorplan-toolbar-input-number"
                  min={3}
                  max={50}
                  value={localRows}
                  onChange={(val) => setLocalRows(val ?? 3)}
                  style={gridInputStyle}
                />
              </div>
              <span style={{ color: '#d6e4ff', fontSize: 16 }}>×</span>
              <div className="floorplan-toolbar-grid-group">
                <span style={gridLabelStyle}>列</span>
                <InputNumber
                  size="small"
                  className="floorplan-toolbar-input-number"
                  min={3}
                  max={50}
                  value={localCols}
                  onChange={(val) => setLocalCols(val ?? 3)}
                  style={gridInputStyle}
                />
              </div>
            </div>
            <Tooltip title="应用网格设置" placement="bottom">
              <Button
                size="small"
                type="primary"
                ghost
                onClick={handleApplyGridSize}
                disabled={localRows === editGridRows && localCols === editGridCols}
              >
                应用
              </Button>
            </Tooltip>
          </>
        )}
      </Space>

      <Space size={10} align="center">
        {editMode ? (
          <>
            <Tooltip title="按名称顺序自动重新排列所有机柜" placement="bottom">
              <Button
                icon={<UndoOutlined />}
                onClick={onResetLayout}
                disabled={saving}
              >
                重置布局
              </Button>
            </Tooltip>
            <Tooltip title={hasPendingChanges ? '保存当前布局到服务器' : '没有未保存的改动'} placement="bottom">
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={onSaveLayout}
                loading={saving}
                disabled={!hasPendingChanges}
              >
                保存布局
              </Button>
            </Tooltip>
            <Tooltip title="放弃改动并退出编辑" placement="bottom">
              <Button
                icon={<CloseOutlined />}
                onClick={onToggleEditMode}
                disabled={saving}
              >
                退出编辑
              </Button>
            </Tooltip>
          </>
        ) : (
          <>
            {onToggleEditMode && (
              <Tooltip title="进入编辑模式，可拖拽机柜调整位置" placement="bottom">
                <Button
                  type="primary"
                  ghost
                  icon={<EditOutlined />}
                  onClick={onToggleEditMode}
                  disabled={!roomId}
                >
                  编辑布局
                </Button>
              </Tooltip>
            )}

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
          </>
        )}
      </Space>
    </ToolbarWrapper>
  );
};

export default FloorPlanToolbar;
