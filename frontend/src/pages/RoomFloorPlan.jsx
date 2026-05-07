import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Spin, Empty, message, Button } from 'antd';
import { HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import { FloorPlanProvider } from '../context/FloorPlanContext';
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
  EmptyStateTitle,
  EmptyStateSubtitle,
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
          <DeviceInfoValue $color={statusColor}>{DEVICE_STATUS_NAMES[device.status] || device.status}</DeviceInfoValue>
        </DeviceInfoRow>
        <DeviceInfoRow>
          <DeviceInfoLabel>位置：</DeviceInfoLabel>
          <DeviceInfoValue>{rack?.name} - {device.position}U</DeviceInfoValue>
        </DeviceInfoRow>
        {device.ipAddress && (
          <DeviceInfoRow>
            <DeviceInfoLabel>IP：</DeviceInfoLabel>
            <DeviceInfoValue $mono>{device.ipAddress}</DeviceInfoValue>
          </DeviceInfoRow>
        )}
        {device.model && (
          <DeviceInfoRow>
            <DeviceInfoLabel>型号：</DeviceInfoLabel>
            <DeviceInfoValue>{device.model}</DeviceInfoValue>
          </DeviceInfoRow>
        )}
        {device.height > 1 && (
          <DeviceInfoRow>
            <DeviceInfoLabel>高度：</DeviceInfoLabel>
            <DeviceInfoValue>{device.height}U</DeviceInfoValue>
          </DeviceInfoRow>
        )}
      </DeviceInfoContent>
    </DeviceTooltipContainer>
  );
};

const EmptyState = ({ onRefresh }) => (
  <EmptyStateContainer>
    <Empty
      image={<HomeOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
      description={
        <>
          <EmptyStateTitle>暂无机房数据</EmptyStateTitle>
          <EmptyStateSubtitle>请先在机房管理中创建机房，或检查网络连接</EmptyStateSubtitle>
          {onRefresh && (
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              刷新
            </Button>
          )}
        </>
      }
    />
  </EmptyStateContainer>
);

const FloorPlanContent = () => {
  const {
    selectedRoomId,
    setSelectedRoom,
    detailRack,
    detailVisible,
    showDetail,
    hideDetail,
  } = useFloorPlanContext();

  const { layoutData, loading, error, refetch } = useFloorPlanData(selectedRoomId);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [hoveredDevice, setHoveredDevice] = useState(null);
  const [hoveredDeviceRack, setHoveredDeviceRack] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

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
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      const elem = containerRef.current;
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

  const handleRackClick = useCallback((rack) => {
    if (rack) {
      showDetail(rack);
    }
  }, [showDetail]);

  const handleRackDoubleClick = useCallback((rack) => {
    if (rack) {
      showDetail(rack);
    }
  }, [showDetail]);

  const handleDeviceHover = useCallback((device, rack, x, y) => {
    if (device) {
      setHoveredDevice(device);
      setHoveredDeviceRack(rack);
      setTooltipPosition({ x, y });
    } else {
      setHoveredDevice(null);
      setHoveredDeviceRack(null);
    }
  }, []);

  const handleViewChange = useCallback((viewState) => {
    setCurrentZoom(viewState.zoom);
  }, []);

  const handleExport = useCallback(() => {
    if (!canvasRef.current || !layoutData?.room) {
      message.warning('请先选择机房');
      return;
    }

    const dataUrl = canvasRef.current.exportImage(layoutData.room.name);
    if (!dataUrl) {
      message.error('导出失败，请稍后重试');
      return;
    }

    const link = document.createElement('a');
    link.download = `${layoutData.room.name || '机房平面图'}_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataUrl;
    link.click();
    message.success('导出成功');
  }, [layoutData]);

  return (
    <ContentWrapper>
      <FloorPlanToolbar
        selectedRoomId={selectedRoomId}
        onRoomChange={setSelectedRoom}
        zoom={currentZoom}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onZoomReset={() => canvasRef.current?.zoomReset()}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onRefresh={refetch}
        onExport={handleExport}
      />

      <CanvasContainer ref={containerRef}>
        {loading && (
          <LoadingOverlay>
            <Spin tip="加载中..." />
          </LoadingOverlay>
        )}

        {!selectedRoomId && <EmptyState onRefresh={refetch} />}

        {selectedRoomId && layoutData && (
          <FloorPlanCanvas
            ref={canvasRef}
            room={layoutData.room}
            racks={layoutData.racks}
            onRackClick={handleRackClick}
            onRackDoubleClick={handleRackDoubleClick}
            onDeviceHover={handleDeviceHover}
            onViewChange={handleViewChange}
          />
        )}
        
        <DeviceTooltip
          device={hoveredDevice}
          rack={hoveredDeviceRack}
          x={tooltipPosition.x}
          y={tooltipPosition.y}
        />
      </CanvasContainer>

      <RackDetailPanel
        rack={detailRack}
        visible={detailVisible}
        onClose={hideDetail}
      />
    </ContentWrapper>
  );
};

const RoomFloorPlan = () => {
  return (
    <FloorPlanProvider>
      <PageContainer>
        <FloorPlanContent />
      </PageContainer>
    </FloorPlanProvider>
  );
};

export default RoomFloorPlan;
