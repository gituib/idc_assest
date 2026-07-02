import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Spin, Empty, message, Modal } from 'antd';
import useFloorPlanContext from '../hooks/floorplan/useFloorPlanContext';
import useFloorPlanData from '../hooks/floorplan/useFloorPlanData';
import { FloorPlanCanvas, FloorPlanToolbar, RackDetailPanel } from '../components/floorplan';
import {
  DEVICE_TYPE_COLORS,
  DEVICE_TYPE_NAMES,
  DEVICE_STATUS_COLORS,
  DEVICE_STATUS_NAMES,
} from '../components/floorplan/canvas/CanvasConstants';
import {
  PageContainer,
  ContentWrapper,
  CanvasContainer,
  LoadingOverlay,
  EmptyStateContainer,
  DeviceTooltipContainer,
  DeviceTooltipHeader,
  DeviceTypeIndicator,
  DeviceName,
  DeviceInfoContent,
  DeviceInfoRow,
  DeviceInfoLabel,
  DeviceInfoValue,
} from '../components/floorplan/styles';

const DeviceTooltip = ({ device, rack, x, y }) => {
  if (!device) return null;
  
  const typeColor = DEVICE_TYPE_COLORS[device.type] || '#8c8c8c';
  const statusColor = DEVICE_STATUS_COLORS[device.status] || '#8c8c8c';

  return (
    <DeviceTooltipContainer $x={x} $y={y}>
      <DeviceTooltipHeader>
        <DeviceTypeIndicator $color={typeColor} />
        <DeviceName>{device.name}</DeviceName>
      </DeviceTooltipHeader>
      <DeviceInfoContent>
        <DeviceInfoRow>
          <DeviceInfoLabel>类型：</DeviceInfoLabel>
          <DeviceInfoValue>{DEVICE_TYPE_NAMES[device.type] || device.type}</DeviceInfoValue>
        </DeviceInfoRow>
        <DeviceInfoRow>
          <DeviceInfoLabel>状态：</DeviceInfoLabel>
          <DeviceInfoValue style={{ color: statusColor }}>
            {DEVICE_STATUS_NAMES[device.status] || device.status}
          </DeviceInfoValue>
        </DeviceInfoRow>
        {device.ipAddress && (
          <DeviceInfoRow>
            <DeviceInfoLabel>IP：</DeviceInfoLabel>
            <DeviceInfoValue>{device.ipAddress}</DeviceInfoValue>
          </DeviceInfoRow>
        )}
        {rack && (
          <DeviceInfoRow>
            <DeviceInfoLabel>位置：</DeviceInfoLabel>
            <DeviceInfoValue>{rack.name} U{device.position}</DeviceInfoValue>
          </DeviceInfoRow>
        )}
      </DeviceInfoContent>
    </DeviceTooltipContainer>
  );
};

const RoomFloorPlanContent = () => {
  const {
    selectedRoomId,
    setSelectedRoom,
    detailRack,
    detailVisible,
    showDetail,
    hideDetail,
  } = useFloorPlanContext();

  const {
    layoutData,
    loading,
    saving,
    error,
    refetch,
    savePositions,
    initLayout,
  } = useFloorPlanData(selectedRoomId);
  const canvasRef = useRef(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [hoveredDevice, setHoveredDevice] = useState(null);
  const [hoveredDeviceRack, setHoveredDeviceRack] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 编辑模式相关状态
  const [editMode, setEditMode] = useState(false);
  // 编辑模式下用户自定义网格行列数
  const [editGridRows, setEditGridRows] = useState(10);
  const [editGridCols, setEditGridCols] = useState(10);
  // 编辑过程中未保存的位置覆盖 Map<rackId, {rowPos, colPos, facing}>
  const [positionOverrides, setPositionOverrides] = useState(() => new Map());
  const hasPendingChanges = positionOverrides.size > 0;

  const handleViewChange = useCallback(({ zoom }) => {
    setCurrentZoom(zoom);
  }, []);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  // 切换机房时退出编辑模式并清空未保存改动
  useEffect(() => {
    setEditMode(false);
    setPositionOverrides(new Map());
  }, [selectedRoomId]);

  // 机房数据加载后，同步 gridRows/gridCols 到编辑状态
  useEffect(() => {
    if (layoutData?.room) {
      setEditGridRows(layoutData.room.gridRows || 10);
      setEditGridCols(layoutData.room.gridCols || 10);
    }
  }, [layoutData?.room]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const elem = document.querySelector('[data-floorplan-container]');
    if (!elem) return;

    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }, []);

  const handleDeviceHover = useCallback((device, rack, canvasX, canvasY) => {
    if (device) {
      setTooltipPosition({
        x: (canvasX || 0) + 15,
        y: (canvasY || 0) + 15,
      });
      setHoveredDevice(device);
      setHoveredDeviceRack(rack);
    } else {
      setHoveredDevice(null);
      setHoveredDeviceRack(null);
    }
  }, []);

  const handleRackClick = useCallback((rack) => {
    // 编辑模式下不打开详情面板，避免干扰拖拽
    if (editMode) return;
    if (rack) {
      showDetail(rack);
    }
  }, [showDetail, editMode]);

  /**
   * 切换编辑模式（退出时若有未保存改动需二次确认）
   */
  const handleToggleEditMode = useCallback(() => {
    if (editMode && hasPendingChanges) {
      Modal.confirm({
        title: '退出编辑',
        content: '当前有未保存的布局改动，确定要放弃并退出吗？',
        okText: '放弃改动',
        cancelText: '继续编辑',
        okButtonProps: { danger: true },
        onOk: () => {
          setPositionOverrides(new Map());
          setEditMode(false);
        },
      });
      return;
    }
    setPositionOverrides(new Map());
    setEditMode((prev) => !prev);
    // 进入编辑模式时，将当前机房 gridRows/gridCols 写入编辑网格状态
    if (!editMode && layoutData?.room) {
      setEditGridRows(layoutData.room.gridRows || 10);
      setEditGridCols(layoutData.room.gridCols || 10);
    }
  }, [editMode, hasPendingChanges, layoutData?.room]);

  /**
   * 机柜拖拽结束回调，将新位置写入本地覆盖表（不立即保存）
   * @param {object} rack - 被拖拽的机柜
   * @param {number} rowPos - 新行号
   * @param {number} colPos - 新列号
   */
  const handleRackDragEnd = useCallback((rack, rowPos, colPos) => {
    setPositionOverrides((prev) => {
      const next = new Map(prev);
      next.set(rack.rackId, {
        rowPos,
        colPos,
        facing: rack.facing || 'front',
      });
      return next;
    });
  }, []);

  /**
   * 保存当前编辑的布局到后端
   */
  const handleSaveLayout = useCallback(async () => {
    if (!hasPendingChanges) return;
    const positions = Array.from(positionOverrides.entries()).map(([rackId, pos]) => ({
      rackId,
      rowPos: pos.rowPos,
      colPos: pos.colPos,
      facing: pos.facing,
    }));
    const ok = await savePositions(positions);
    if (ok) {
      message.success('布局保存成功');
      setPositionOverrides(new Map());
      setEditMode(false);
    } else {
      message.error('布局保存失败，请重试');
    }
  }, [hasPendingChanges, positionOverrides, savePositions]);

  /**
   * 重置布局（让后端按名称顺序自动重新排列）
   */
  const handleResetLayout = useCallback(async () => {
    const ok = await initLayout();
    if (ok) {
      message.success('布局已重置为自动排列');
      setPositionOverrides(new Map());
      setEditMode(false);
    } else {
      message.error('布局重置失败，请重试');
    }
  }, [initLayout]);

  const roomName = layoutData?.room?.name || '';

  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomOut();
  }, []);

  const handleZoomReset = useCallback(() => {
    canvasRef.current?.zoomReset();
  }, []);

  const handleExport = useCallback(() => {
    const dataUrl = canvasRef.current?.exportImage(roomName);
    if (!dataUrl) {
      message.warning('暂无数据可导出');
      return;
    }
    const link = document.createElement('a');
    link.download = `${roomName || '机房'}_平面图.png`;
    link.href = dataUrl;
    link.click();
  }, [roomName]);

  return (
    <PageContainer>
      <FloorPlanToolbar
        roomName={roomName}
        roomId={selectedRoomId}
        onRoomChange={setSelectedRoom}
        zoom={currentZoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
        onRefresh={refetch}
        onExport={handleExport}
        editMode={editMode}
        onToggleEditMode={handleToggleEditMode}
        onSaveLayout={handleSaveLayout}
        onResetLayout={handleResetLayout}
        saving={saving}
        hasPendingChanges={hasPendingChanges}
        editGridRows={editGridRows}
        editGridCols={editGridCols}
        onEditGridRowsChange={setEditGridRows}
        onEditGridColsChange={setEditGridCols}
      />

      {loading ? (
        <ContentWrapper>
          <LoadingOverlay>
            <Spin size="large" />
            <span>加载中...</span>
          </LoadingOverlay>
        </ContentWrapper>
      ) : !layoutData || layoutData.racks.length === 0 ? (
        <ContentWrapper>
          <EmptyStateContainer>
            <Empty
              description={selectedRoomId ? '该机房暂无机柜数据' : '请先选择机房'}
            />
          </EmptyStateContainer>
        </ContentWrapper>
      ) : (
        <ContentWrapper data-floorplan-container>
          <CanvasContainer>
            <FloorPlanCanvas
              ref={canvasRef}
              room={layoutData.room}
              racks={layoutData.racks}
              onRackClick={handleRackClick}
              onDeviceHover={handleDeviceHover}
              onViewChange={handleViewChange}
              editMode={editMode}
              editGridRows={editGridRows}
              editGridCols={editGridCols}
              positionOverrides={positionOverrides}
              onRackDragEnd={handleRackDragEnd}
            />

            {hoveredDevice && (
              <DeviceTooltip
                device={hoveredDevice}
                rack={hoveredDeviceRack}
                x={tooltipPosition.x}
                y={tooltipPosition.y}
              />
            )}
          </CanvasContainer>
        </ContentWrapper>
      )}

      {detailVisible && detailRack && (
        <RackDetailPanel
          rack={detailRack}
          onClose={hideDetail}
        />
      )}
    </PageContainer>
  );
};

const RoomFloorPlan = () => {
  return <RoomFloorPlanContent />;
};

export default RoomFloorPlan;
