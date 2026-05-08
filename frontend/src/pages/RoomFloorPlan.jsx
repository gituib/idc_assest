import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Spin, Empty, message, Button } from 'antd';
import { HomeOutlined, ReloadOutlined } from '@ant-design/icons';
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

  const handleDeviceHover = useCallback((device, rack, event) => {
    if (device) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPosition({
          x: event.clientX - rect.left + 15,
          y: event.clientY - rect.top + 15,
        });
      }
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

  if (loading) {
    return (
      <PageContainer>
        <LoadingOverlay>
          <Spin size="large" />
          <span>加载中...</span>
        </LoadingOverlay>
      </PageContainer>
    );
  }

  if (!layoutData || layoutData.racks.length === 0) {
    return (
      <PageContainer>
        <EmptyStateContainer>
          <Empty
            description={selectedRoomId ? '该机房暂无机柜数据' : '请先选择机房'}
          />
        </EmptyStateContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <FloorPlanToolbar
        roomName={layoutData.roomName}
        roomId={selectedRoomId}
        onRoomChange={setSelectedRoom}
        zoom={currentZoom}
        onZoomChange={setCurrentZoom}
        onFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
        onRefresh={refetch}
      />
      
      <ContentWrapper ref={containerRef}>
        <CanvasContainer>
          <FloorPlanCanvas
            racks={layoutData.racks}
            rooms={layoutData.rooms}
            selectedRoomId={selectedRoomId}
            zoom={currentZoom}
            onRackClick={handleRackClick}
            onDeviceHover={handleDeviceHover}
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
