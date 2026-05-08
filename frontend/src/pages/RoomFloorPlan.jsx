import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Spin, Empty, message } from 'antd';
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

  const { layoutData, loading, error, refetch } = useFloorPlanData(selectedRoomId);
  const canvasRef = useRef(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [hoveredDevice, setHoveredDevice] = useState(null);
  const [hoveredDeviceRack, setHoveredDeviceRack] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleViewChange = useCallback(({ zoom }) => {
    setCurrentZoom(zoom);
  }, []);

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
    if (rack) {
      showDetail(rack);
    }
  }, [showDetail]);

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
