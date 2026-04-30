import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Spin, Empty, message, Tag, Divider, List } from 'antd';
import { SwapOutlined, WarningOutlined } from '@ant-design/icons';
import { FloorPlanProvider } from '../context/FloorPlanContext';
import useFloorPlanContext from '../hooks/floorplan/useFloorPlanContext';
import useFloorPlanData from '../hooks/floorplan/useFloorPlanData';
import { FloorPlanCanvas, FloorPlanToolbar, RackDetailPanel, FloorPlanStats } from '../components/floorplan';

const DEVICE_TYPE_NAMES = {
  server: '服务器',
  switch: '交换机',
  router: '路由器',
  firewall: '防火墙',
  storage: '存储设备',
  other: '其他',
};

const DEVICE_STATUS_NAMES = {
  running: '运行中',
  maintenance: '维护中',
  offline: '离线',
  fault: '故障',
  idle: '空闲',
};

const DeviceTooltip = ({ device, rack, x, y }) => {
  if (!device) return null;
  
  const typeColor = {
    server: '#1677ff',
    switch: '#52c41a',
    router: '#faad14',
    firewall: '#ff4d4f',
    storage: '#722ed1',
    other: '#8c8c8c',
  }[device.type] || '#8c8c8c';
  
  const statusColor = {
    running: '#52c41a',
    maintenance: '#faad14',
    offline: '#8c8c8c',
    fault: '#ff4d4f',
    idle: '#d9d9d9',
  }[device.status] || '#8c8c8c';

  return (
    <div style={{
      position: 'fixed',
      left: x + 18,
      top: y + 18,
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      padding: '14px 18px',
      zIndex: 1000,
      minWidth: 220,
      pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 5, height: 20, background: typeColor, borderRadius: 3 }} />
        <strong style={{ fontSize: 15, color: '#111827' }}>{device.name}</strong>
      </div>
      <div style={{ fontSize: 13, color: '#4b5563', lineHeight: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#6b7280' }}>类型：</span>
          <span style={{ fontWeight: 500 }}>{DEVICE_TYPE_NAMES[device.type] || device.type}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#6b7280' }}>状态：</span>
          <span style={{ color: statusColor, fontWeight: 500 }}>
            {DEVICE_STATUS_NAMES[device.status] || device.status}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#6b7280' }}>位置：</span>
          <span style={{ fontWeight: 500 }}>{rack?.name} - {device.position}U</span>
        </div>
        {device.ipAddress && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#6b7280' }}>IP：</span>
            <span style={{ fontFamily: 'SFMono-Regular,Monaco,Consolas', fontWeight: 500 }}>
              {device.ipAddress}
            </span>
          </div>
        )}
        {device.model && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#6b7280' }}>型号：</span>
            <span style={{ fontWeight: 500 }}>{device.model}</span>
          </div>
        )}
        {device.height > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>高度：</span>
            <span style={{ fontWeight: 500 }}>{device.height}U</span>
          </div>
        )}
      </div>
    </div>
  );
};

const UnassignedRacksPanel = ({ racks, onAutoAssign }) => {
  const unassigned = (racks || []).filter(r => r.rowPos == null || r.colPos == null);

  if (unassigned.length === 0) return null;

  return (
    <div style={{
      padding: 12,
      border: '1px solid #ffe58f',
      borderRadius: 8,
      background: '#fffbe6',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <WarningOutlined style={{ color: '#faad14', fontSize: 14 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#ad6800' }}>
            未分配
          </span>
          <span style={{
            fontSize: 10,
            background: '#ffd666',
            color: '#874d00',
            padding: '2px 6px',
            borderRadius: 10,
            fontWeight: 600,
          }}>
            {unassigned.length}台
          </span>
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10,
      }}>
        {unassigned.slice(0, 6).map((r, i) => (
          <span
            key={r.rackId || i}
            style={{
              fontSize: 10,
              background: '#fff',
              padding: '3px 8px',
              borderRadius: 4,
              border: '1px solid #ffe58f',
              color: 'rgba(0,0,0,0.65)',
            }}
          >
            {r.name}
          </span>
        ))}
        {unassigned.length > 6 && (
          <span style={{
            fontSize: 10,
            color: 'rgba(0,0,0,0.45)',
            padding: '3px 4px',
          }}>
            +{unassigned.length - 6}
          </span>
        )}
      </div>

      <button
        onClick={onAutoAssign}
        style={{
          width: '100%',
          fontSize: 12,
          padding: '6px 0',
          background: '#faad14',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          fontWeight: 500,
        }}
        onMouseEnter={(e) => e.target.style.background = '#d48806'}
        onMouseLeave={(e) => e.target.style.background = '#faad14'}
      >
        <SwapOutlined />
        一键分配
      </button>
    </div>
  );
};

const FloorPlanContent = () => {
  const {
    selectedRoomId,
    setSelectedRoom,
    zoom,
    editMode,
    detailRack,
    detailVisible,
    showDetail,
    hideDetail,
  } = useFloorPlanContext();

  const { layoutData, loading, error, refetch, updateRackPosition, batchUpdatePositions, initLayout } = useFloorPlanData(selectedRoomId);
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

  // 全屏变化监听
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

  const handleRackHover = useCallback(() => {}, []);

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

  const handleLocateRack = useCallback((rack) => {
    if (canvasRef.current) {
      canvasRef.current.animateToRack(rack);
    }
  }, []);

  const handleAutoAssign = useCallback(async () => {
    if (!layoutData) return;
    const racks = layoutData.racks || [];
    const unassigned = racks.filter(r => r.rowPos == null || r.colPos == null);
    if (unassigned.length === 0) {
      message.info('没有需要分配的机柜');
      return;
    }

    const gridCols = layoutData.room?.gridCols || 10;
    const gridRows = layoutData.room?.gridRows || 10;
    const occupied = new Set();

    racks.forEach(r => {
      if (r.rowPos != null && r.colPos != null) {
        occupied.add(`${r.rowPos}-${r.colPos}`);
      }
    });

    const positions = [];
    let unassignedIndex = 0;
    for (let col = 0; col < gridCols && unassignedIndex < unassigned.length; col++) {
      for (let row = 0; row < gridRows && unassignedIndex < unassigned.length; row++) {
        if (!occupied.has(`${row}-${col}`)) {
          positions.push({
            rackId: unassigned[unassignedIndex].rackId,
            rowPos: row,
            colPos: col,
            facing: 'front'
          });
          unassignedIndex++;
        }
      }
    }

    if (positions.length === 0) {
      message.warning('没有足够的空位');
      return;
    }

    const success = await batchUpdatePositions(positions);
    if (success) {
      message.success(`已分配 ${positions.length} 台机柜`);
    }
  }, [layoutData, batchUpdatePositions]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
      />

      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.7)',
            zIndex: 5,
          }}>
            <Spin tip="加载中..." />
          </div>
        )}

        {!selectedRoomId && (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Empty description="请选择一个机房查看平面图" />
          </div>
        )}

        {selectedRoomId && layoutData && (
          <FloorPlanCanvas
            ref={canvasRef}
            room={layoutData.room}
            racks={layoutData.racks}
            viewMode="standard"
            heatMapDimension="utilization"
            editMode={false}
            onRackClick={handleRackClick}
            onRackDoubleClick={handleRackDoubleClick}
            onRackHover={handleRackHover}
            onDeviceHover={handleDeviceHover}
            onRackDragEnd={() => {}}
            onViewChange={handleViewChange}
          />
        )}
        
        <DeviceTooltip
          device={hoveredDevice}
          rack={hoveredDeviceRack}
          x={tooltipPosition.x}
          y={tooltipPosition.y}
        />


      </div>

      <RackDetailPanel
        rack={detailRack}
        visible={detailVisible}
        onClose={hideDetail}
      />
    </div>
  );
};

const RoomFloorPlan = () => {
  return (
    <FloorPlanProvider>
      <div style={{ height: 'calc(100vh - 64px)' }}>
        <FloorPlanContent />
      </div>
    </FloorPlanProvider>
  );
};

export default RoomFloorPlan;
