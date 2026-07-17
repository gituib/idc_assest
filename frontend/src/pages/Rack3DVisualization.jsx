import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Spin,
  message,
  Typography,
  Empty,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Checkbox,
  Tooltip,
  Badge,
  Select,
  Space,
  Button,
} from 'antd';
import {
  CloudServerOutlined,
  DownOutlined,
  UpOutlined,
  InfoCircleOutlined,
  EditOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  DesktopOutlined,
  ColumnHeightOutlined,
  ScanOutlined,
  ZoomInOutlined,
  SelectOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import Scene from '../components/3d/Scene';
import NetworkCardCreateModal from '../components/NetworkCardCreateModal';
import PortCreateModal from '../components/PortCreateModal';
import CableCreateModal from '../components/CableCreateModal';
import DeviceDetailDrawer from '../components/DeviceDetailDrawer';
import CloseButton from '../components/CloseButton';
import RackSelectorHeader from '../components/3d/RackSelectorHeader';
import { Layout } from 'antd';
import { useScene3D } from '../hooks/useScene3D';
import { useSortedRacks } from '../hooks/useSortedRacks';

const { Content } = Layout;

const Rack3DVisualization = () => {
  const navigate = useNavigate();

  // Scene 组件的 ref，用于调用重置视角方法
  const sceneRef = useRef(null);

  // 使用 Zustand Store 管理3D场景状态
  const {
    devices,
    setDevices,
    selectedDevice,
    setSelectedDevice,
    hoveredDevice,
    setHoveredDevice,
    deviceSlideEnabled,
    setDeviceSlideEnabled,
    selectedRack,
    setSelectedRack,
    racks,
    setRacks,
    deviceCables,
    setDeviceCables,
    loadingDevices,
    setLoadingDevices,
  } = useScene3D();

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRackInfoCollapsed, setIsRackInfoCollapsed] = useState(false);

  // Edit Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [form] = Form.useForm();

  // Field configuration state
  const [tooltipFields, setTooltipFields] = useState({});
  const [showTooltipConfig, setShowTooltipConfig] = useState(false);
  const [loadingTooltipFields, setLoadingTooltipFields] = useState(false);
  const [savingTooltipConfig, setSavingTooltipConfig] = useState(false);

  // Add Port/NIC/Cable Modal State
  const [nicModalVisible, setNicModalVisible] = useState(false);
  const [portModalVisible, setPortModalVisible] = useState(false);
  const [cableModalVisible, setCableModalVisible] = useState(false);
  const [operatingDevice, setOperatingDevice] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 使用 ref 存储模态框状态，避免 handleDeviceHover 频繁重新创建
  const modalsOpenRef = useRef(false);

  // 同步 ref 与 state
  useEffect(() => {
    modalsOpenRef.current =
      modalVisible || nicModalVisible || portModalVisible || cableModalVisible;
  }, [modalVisible, nicModalVisible, portModalVisible, cableModalVisible]);

  const fetchDeviceCables = useCallback(async deviceId => {
    if (!deviceId) return;
    try {
      const response = await axios.get(`/api/cables/device/${deviceId}`);
      setDeviceCables(response.data || []);
    } catch (error) {
      console.error('Failed to fetch device cables:', error);
      setDeviceCables([]);
    }
  }, []);

  const handleAddNic = device => {
    setOperatingDevice(device);
    setNicModalVisible(true);
  };

  const handleAddPort = device => {
    setOperatingDevice(device);
    setPortModalVisible(true);
  };

  const handleAddCable = device => {
    setOperatingDevice(device);
    setCableModalVisible(true);
  };

  // Handle Edit Device Click
  const handleEditDevice = device => {
    setEditingDevice(device);
    setModalVisible(true);
  };

  // 当 Modal 打开时，初始化表单数据
  useEffect(() => {
    if (modalVisible && editingDevice) {
      // Prepare form data (similar to DeviceManagement)
      const deviceData = { ...editingDevice };
      if (deviceData.purchaseDate) deviceData.purchaseDate = dayjs(deviceData.purchaseDate);
      if (deviceData.warrantyExpiry) deviceData.warrantyExpiry = dayjs(deviceData.warrantyExpiry);

      // Fixed fields
      const fixedFields = [
        'deviceId',
        'name',
        'type',
        'model',
        'serialNumber',
        'rackId',
        'position',
        'height',
        'powerConsumption',
        'status',
        'purchaseDate',
        'warrantyExpiry',
        'ipAddress',
        'description',
      ];

      const cleanDeviceData = {};
      fixedFields.forEach(field => {
        if (deviceData[field] !== undefined) {
          cleanDeviceData[field] = deviceData[field];
        }
      });

      // Custom fields if any (simplified for 3D view context)
      if (deviceData.customFields && typeof deviceData.customFields === 'object') {
        Object.entries(deviceData.customFields).forEach(([key, value]) => {
          cleanDeviceData[key] = value;
        });
      }

      form.setFieldsValue(cleanDeviceData);
    }
  }, [modalVisible, editingDevice, form]);

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingDevice(null);
    form.resetFields();
  };

  const handleModalSubmit = async values => {
    try {
      const deviceData = {
        ...values,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null,
        warrantyExpiry: values.warrantyExpiry ? values.warrantyExpiry.format('YYYY-MM-DD') : null,
      };

      if (editingDevice) {
        await axios.put(`/api/devices/${editingDevice.deviceId || editingDevice.id}`, deviceData);
        message.success('设备更新成功');

        // Refresh devices
        if (selectedRack) {
          fetchDevices(selectedRack.rackId);
        }
        setModalVisible(false);
        setEditingDevice(null);
      }
    } catch (error) {
      message.error('设备更新失败');
      console.error(error);
    }
  };

  // Fetch Racks
  const fetchRacks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/racks', { params: { pageSize: 1000 } });
      const racksArray = response.data.racks || [];
      // Filter valid racks
      const validRacks = racksArray.filter(r => r && r.rackId && typeof r.height === 'number');
      setRacks(validRacks);

      if (validRacks.length > 0) {
        // Default select first rack
        const firstRack = validRacks[0];
        setSelectedRack(firstRack);
        if (firstRack?.Room) {
          const roomKey = firstRack.Room.roomId || firstRack.Room.id || firstRack.Room.name;
          setSelectedRoom(roomKey);
        }
      }
    } catch (error) {
      console.error('Failed to fetch racks:', error);
      message.error('获取机柜列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Devices for Rack
  const fetchDevices = useCallback(async rackId => {
    if (!rackId) return;
    try {
      setLoadingDevices(true);
      const response = await axios.get(`/api/devices?rackId=${rackId}&pageSize=100`);

      let devicesData = [];
      if (Array.isArray(response.data)) {
        devicesData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        devicesData = response.data.data;
      } else if (response.data && Array.isArray(response.data.devices)) {
        devicesData = response.data.devices;
      }

      // Process devices (ensure position/height are numbers)
      const validDevices = devicesData.filter(d => {
        if (!d.deviceId && !d.id) return false;

        // Normalize deviceId
        if (!d.deviceId && d.id) d.deviceId = d.id;

        let pos = d.position || d.u_position;
        let h = d.height || d.u_height || 1;
        if (typeof pos === 'string') pos = parseInt(pos, 10);
        if (typeof h === 'string') h = parseInt(h, 10);

        // Mutate for consistency
        d.position = pos;
        d.height = h;

        return typeof pos === 'number' && !isNaN(pos);
      });

      setDevices(validDevices);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      message.error('获取设备列表失败');
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  // Fetch Tooltip Fields from API
  const fetchTooltipDeviceFields = useCallback(async () => {
    try {
      setLoadingTooltipFields(true);
      const response = await axios.get('/api/deviceFields');
      const fields = response.data;

      const newTooltipFields = {};
      if (fields && fields.length > 0) {
        fields.forEach(field => {
          newTooltipFields[field.fieldName] = {
            label: field.displayName,
            enabled: field.visible,
            field: field.fieldName,
            fieldType: field.fieldType || 'text',
          };
        });
      }
      setTooltipFields(newTooltipFields);
    } catch (error) {
      console.error('Failed to fetch device fields:', error);
      message.error('获取字段配置失败');
    } finally {
      setLoadingTooltipFields(false);
    }
  }, []);

  const saveTooltipConfig = async () => {
    try {
      setSavingTooltipConfig(true);

      // Transform object to array for backend API
      const fieldConfigs = Object.values(tooltipFields).map(field => ({
        fieldName: field.field,
        visible: field.enabled,
        displayName: field.label,
        fieldType: field.fieldType,
      }));

      await axios.post('/api/deviceFields/config', fieldConfigs);
      message.success('字段配置保存成功');
      setShowTooltipConfig(false);

      // Refresh fields to sync with DB
      fetchTooltipDeviceFields();
    } catch (error) {
      console.error('Failed to save tooltip config:', error);
      message.error('保存失败');
    } finally {
      setSavingTooltipConfig(false);
    }
  };

  useEffect(() => {
    fetchRacks();
    fetchTooltipDeviceFields();
  }, [fetchRacks, fetchTooltipDeviceFields]);

  useEffect(() => {
    if (selectedRack?.rackId) {
      fetchDevices(selectedRack.rackId);
      setSelectedDevice(null);
    }
  }, [selectedRack, fetchDevices]);

  // 使用排序 Hook
  const sortedRooms = useSortedRacks(racks);

  // Group racks by room (保留用于导航)
  const rooms = useMemo(() => {
    const roomMap = new Map();
    racks.forEach(rack => {
      if (rack?.Room) {
        const roomKey = rack.Room.roomId || rack.Room.id || rack.Room.name;
        if (!roomMap.has(roomKey)) {
          roomMap.set(roomKey, { ...rack.Room, key: roomKey });
        }
      }
    });
    return Array.from(roomMap.values());
  }, [racks]);

  // 计算机柜统计数据的 useMemo
  const rackStats = useMemo(() => {
    if (!selectedRack || !devices.length) {
      return {
        usedU: 0,
        usagePercent: 0,
        totalPower: 0,
        availableU: selectedRack?.height || 0,
      };
    }

    // 计算已用U位（考虑设备高度）
    const usedU = devices.reduce((sum, device) => sum + (device.height || 1), 0);

    // 计算总功率
    const totalPower = devices.reduce((sum, device) => {
      const power = parseFloat(device.powerConsumption) || 0;
      return sum + power;
    }, 0);

    // 机柜总高度
    const totalHeight = selectedRack.height || 45;

    // 可用U位
    const availableU = totalHeight - usedU;

    return {
      usedU,
      usagePercent: totalHeight > 0 ? Math.round((usedU / totalHeight) * 100) : 0,
      totalPower,
      availableU,
    };
  }, [selectedRack, devices]);

  const racksInSelectedRoom = useMemo(() => {
    if (!selectedRoom) return [];
    return racks.filter(r => {
      const rKey = r.Room?.roomId || r.Room?.id || r.Room?.name;
      return rKey === selectedRoom;
    });
  }, [selectedRoom, racks]);

  // 使用 useCallback 稳定回调函数引用，避免 DeviceModel 不必要的重渲染
  const handleDeviceClick = useCallback(
    device => {
      setSelectedDevice(device);
      if (device) {
        fetchDeviceCables(device.deviceId || device.id);
      }
    },
    [fetchDeviceCables]
  );

  const handleDeviceLeave = device => {
    // 移除鼠标离开事件，避免抽屉意外关闭
    // setSelectedDevice((current) => {
    //     const deviceId = device.deviceId || device.id;
    //     const currentId = current?.deviceId || current?.id;
    //     return currentId === deviceId ? null : current;
    // });
  };

  // 优化 handleDeviceHover - 使用 ref 获取最新状态，减少依赖项
  const handleDeviceHover = useCallback(device => {
    // 使用 ref 检查模态框状态，避免频繁重新创建回调
    if (modalsOpenRef.current) return;
    setHoveredDevice(device);
  }, []); // 空依赖项，回调引用永远稳定

  const handleClosePortModal = useCallback(() => {
    setPortModalVisible(false);
    setOperatingDevice(null);
  }, []);

  const handlePortSuccess = useCallback(() => {
    message.success('端口添加成功');
  }, []);

  const handleCloseNicModal = useCallback(() => {
    setNicModalVisible(false);
    setOperatingDevice(null);
  }, []);

  const handleNicSuccess = useCallback(() => {
    message.success('网卡添加成功');
  }, []);

  const handleCloseCableModal = useCallback(() => {
    setCableModalVisible(false);
    setOperatingDevice(null);
  }, []);

  const handleCableSuccess = useCallback(() => {
    message.success('接线添加成功');
    setRefreshTrigger(prev => prev + 1);
    if (selectedDevice) {
      fetchDeviceCables(selectedDevice.deviceId || selectedDevice.id);
    }
  }, [selectedDevice, fetchDeviceCables]);

  const handleDeleteCable = useCallback(
    async cableId => {
      try {
        await axios.delete(`/api/cables/${cableId}`);
        message.success('接线删除成功');
        setRefreshTrigger(prev => prev + 1);
        if (selectedDevice) {
          fetchDeviceCables(selectedDevice.deviceId || selectedDevice.id);
        }
      } catch (error) {
        console.error('删除接线失败:', error);
        message.error('删除接线失败');
      }
    },
    [selectedDevice, fetchDeviceCables]
  );

  const handlePrevRack = () => {
    if (racksInSelectedRoom.length <= 1) return;
    const currentIndex = racksInSelectedRoom.findIndex(r => r.rackId === selectedRack?.rackId);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : racksInSelectedRoom.length - 1;
    setSelectedRack(racksInSelectedRoom[prevIndex]);
  };

  const handleNextRack = () => {
    if (racksInSelectedRoom.length <= 1) return;
    const currentIndex = racksInSelectedRoom.findIndex(r => r.rackId === selectedRack?.rackId);
    const nextIndex = currentIndex < racksInSelectedRoom.length - 1 ? currentIndex + 1 : 0;
    setSelectedRack(racksInSelectedRoom[nextIndex]);
  };

  const handleRackSelect = useCallback((rack, room) => {
    setSelectedRack(rack);
    if (room) {
      const roomKey = room.key || room.roomId || room.id || room.name;
      setSelectedRoom(roomKey);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchRacks();
    if (selectedRack) fetchDevices(selectedRack.rackId);
  }, [fetchRacks, selectedRack, fetchDevices]);

  const handleResetView = useCallback(() => {
    if (sceneRef.current) sceneRef.current.resetView();
  }, []);

  const handleOpenConfig = useCallback(() => {
    setShowTooltipConfig(true);
  }, []);

  const handleBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px - 48px)',
        minHeight: 400,
        overflow: 'hidden',
      }}
    >
      <RackSelectorHeader
        rooms={sortedRooms}
        selectedRoomKey={selectedRoom}
        selectedRack={selectedRack}
        onRackSelect={handleRackSelect}
        onPrevRack={handlePrevRack}
        onNextRack={handleNextRack}
        racksInSelectedRoom={racksInSelectedRoom}
        deviceSlideEnabled={deviceSlideEnabled}
        onDeviceSlideToggle={setDeviceSlideEnabled}
        onRefresh={handleRefresh}
        onResetView={handleResetView}
        onOpenConfig={handleOpenConfig}
        onBack={handleBack}
      />

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Content
          style={{
            position: 'absolute',
            inset: 0,
            background: '#F8FAFC',
            userSelect: 'none',
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <Spin size="large" />
              <div style={{ marginTop: 16, color: '#1E40AF' }}>加载资源中...</div>
            </div>
          ) : selectedRack ? (
            <>
              <Scene
                ref={sceneRef}
                rack={selectedRack}
                devices={devices}
                selectedDeviceId={selectedDevice?.deviceId || selectedDevice?.id}
                onDeviceClick={handleDeviceClick}
                onDeviceLeave={handleDeviceLeave}
                onDeviceHover={handleDeviceHover}
                tooltipFields={tooltipFields}
                deviceSlideEnabled={deviceSlideEnabled}
                modalsOpen={modalVisible || nicModalVisible || portModalVisible || cableModalVisible}
              />

              {/* Rack Info Overlay - 浅色玻璃态右侧面板 */}
              {selectedRack && (
                <div
                  style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(20px)',
                    padding: isRackInfoCollapsed ? '12px 16px' : '18px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 24px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(30, 58, 138, 0.06)',
                    width: isRackInfoCollapsed ? 'auto' : '280px',
                    maxHeight: 'calc(100% - 120px)',
                    overflowY: 'auto',
                    zIndex: 20,
                    border: '1px solid rgba(59, 130, 246, 0.1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: isRackInfoCollapsed ? 'pointer' : 'default',
                  }}
                  onClick={() => isRackInfoCollapsed && setIsRackInfoCollapsed(false)}
                >
                  {/* 头部 - 机柜名称 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: isRackInfoCollapsed ? 0 : 16,
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                          boxShadow: '0 4px 12px rgba(30, 64, 175, 0.25)',
                          flexShrink: 0,
                        }}
                      >
                        <CloudServerOutlined style={{ color: 'white', fontSize: 20 }} />
                      </div>
                      <div
                        style={{
                          opacity: isRackInfoCollapsed ? 0 : 1,
                          width: isRackInfoCollapsed ? 0 : 'auto',
                          transition: 'opacity 0.3s',
                          overflow: 'hidden',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#1E3A8A',
                            lineHeight: 1.2,
                            letterSpacing: '0.2px',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                          }}
                        >
                          {selectedRack.name}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748B',
                            marginTop: 3,
                            fontFamily: 'monospace',
                            letterSpacing: '0.3px',
                          }}
                        >
                          #{selectedRack.rackId}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="text"
                      size="small"
                      icon={isRackInfoCollapsed ? <DownOutlined /> : <UpOutlined />}
                      onClick={e => {
                        e.stopPropagation();
                        setIsRackInfoCollapsed(!isRackInfoCollapsed);
                      }}
                      style={{
                        color: '#64748B',
                        marginLeft: isRackInfoCollapsed ? 0 : 4,
                        width: isRackInfoCollapsed ? 40 : 28,
                        height: isRackInfoCollapsed ? 40 : 28,
                        borderRadius: isRackInfoCollapsed ? 10 : 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s',
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  {/* 内容区 - 可折叠 */}
                  <div
                    style={{
                      maxHeight: isRackInfoCollapsed ? 0 : '600px',
                      opacity: isRackInfoCollapsed ? 0 : 1,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* 统计网格 - 3列KPI */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 8,
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(30, 64, 175, 0.04) 100%)',
                          border: '1px solid rgba(59, 130, 246, 0.15)',
                          padding: '10px 8px',
                          borderRadius: '10px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E40AF', lineHeight: 1 }}>
                          {selectedRack.height}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748B', marginTop: 3, fontWeight: 500 }}>
                          总U位
                        </div>
                      </div>
                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)',
                          border: '1px solid rgba(16, 185, 129, 0.15)',
                          padding: '10px 8px',
                          borderRadius: '10px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669', lineHeight: 1 }}>
                          {devices.length}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748B', marginTop: 3, fontWeight: 500 }}>
                          设备数
                        </div>
                      </div>
                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.04) 100%)',
                          border: '1px solid rgba(245, 158, 11, 0.15)',
                          padding: '10px 8px',
                          borderRadius: '10px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#D97706', lineHeight: 1 }}>
                          {Math.round((devices.length / selectedRack.height) * 100)}%
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748B', marginTop: 3, fontWeight: 500 }}>
                          负载率
                        </div>
                      </div>
                    </div>

                    {/* 资源监控 - 使用SVG图标替代emoji */}
                    <div
                      style={{
                        background: 'rgba(241, 245, 249, 0.6)',
                        border: '1px solid rgba(30, 58, 138, 0.06)',
                        borderRadius: '10px',
                        padding: '12px',
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#64748B',
                          marginBottom: 10,
                          fontWeight: 600,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                        }}
                      >
                        资源监控
                      </div>
                      {[
                        {
                          label: 'U位使用',
                          value: `${rackStats.usedU}U / ${selectedRack.height}U`,
                          status: rackStats.usagePercent > 80 ? 'warning' : 'normal',
                          icon: <ColumnHeightOutlined style={{ fontSize: 14, color: '#1E40AF' }} />,
                          subValue: `剩余 ${rackStats.availableU}U`,
                        },
                        {
                          label: '总功率',
                          value: `${rackStats.totalPower.toFixed(1)}kW`,
                          status: 'normal',
                          icon: <ThunderboltOutlined style={{ fontSize: 14, color: '#D97706' }} />,
                          subValue: '当前负载',
                        },
                        {
                          label: '设备数',
                          value: `${devices.length} 台`,
                          status: 'normal',
                          icon: <DesktopOutlined style={{ fontSize: 14, color: '#059669' }} />,
                          subValue: `负载率 ${rackStats.usagePercent}%`,
                        },
                      ].map((item, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: i < 2 ? 10 : 0,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {item.icon}
                            <div>
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: '#1E3A8A',
                                  fontWeight: 500,
                                }}
                              >
                                {item.label}
                              </div>
                              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: 2 }}>
                                {item.subValue}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E3A8A' }}>
                              {item.value}
                            </span>
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: item.status === 'normal' ? '#10B981' : '#F59E0B',
                                boxShadow: `0 0 6px ${item.status === 'normal' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)'}`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 操作指南 - 使用SVG图标替代emoji */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.04) 0%, rgba(30, 64, 175, 0.02) 100%)',
                        border: '1px solid rgba(59, 130, 246, 0.1)',
                        borderRadius: '10px',
                        padding: '12px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#64748B',
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'center',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                        }}
                      >
                        <InfoCircleOutlined style={{ marginRight: 6, fontSize: 11 }} /> 操作指南
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[
                          { icon: <ScanOutlined style={{ fontSize: 13, color: '#1E40AF' }} />, text: '左键旋转视图', color: '#1E40AF' },
                          { icon: <ZoomInOutlined style={{ fontSize: 13, color: '#7C3AED' }} />, text: '滚轮缩放视图', color: '#7C3AED' },
                          { icon: <SelectOutlined style={{ fontSize: 13, color: '#059669' }} />, text: '点击设备查看详情', color: '#059669' },
                        ].map((item, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: '11px',
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '6px 8px',
                              background: 'rgba(255, 255, 255, 0.6)',
                              borderRadius: '6px',
                              transition: 'all 0.2s',
                            }}
                          >
                            {item.icon}
                            <span style={{ flex: 1 }}>{item.text}</span>
                            <div
                              style={{
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                background: item.color,
                                opacity: 0.6,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hovered Device 浮层 - 移至左侧避免与Rack Info面板冲突 */}
              {hoveredDevice && !selectedDevice && (
                <div
                  style={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    background: 'rgba(255, 255, 255, 0.92)',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    color: '#1E3A8A',
                    pointerEvents: 'none',
                    maxWidth: '240px',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(59, 130, 246, 0.15)',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
                    zIndex: 30,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 6, color: '#1E40AF', fontSize: 13 }}>
                    {hoveredDevice.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.6 }}>
                    <div>位置: U{hoveredDevice.position}</div>
                    <div>高度: {hoveredDevice.height}U</div>
                    <div>状态: {hoveredDevice.status}</div>
                  </div>
                </div>
              )}

              {/* 底部KPI快捷栏 - 横向统计指标，提升空间利用率 */}
              {selectedRack && !isRackInfoCollapsed && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(30, 58, 138, 0.08)',
                    borderRadius: '14px',
                    padding: '10px 8px',
                    boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    maxWidth: 'calc(100% - 340px)',
                    pointerEvents: 'none',
                  }}
                >
                  {[
                    {
                      icon: <ColumnHeightOutlined style={{ fontSize: 14, color: '#1E40AF' }} />,
                      label: '总高度',
                      value: `${selectedRack.height}U`,
                      color: '#1E40AF',
                    },
                    {
                      icon: <DesktopOutlined style={{ fontSize: 14, color: '#059669' }} />,
                      label: '设备数',
                      value: `${devices.length}`,
                      color: '#059669',
                    },
                    {
                      icon: <ColumnHeightOutlined style={{ fontSize: 14, color: '#D97706' }} />,
                      label: '已用',
                      value: `${rackStats.usedU}U`,
                      color: '#D97706',
                    },
                    {
                      icon: <ColumnHeightOutlined style={{ fontSize: 14, color: '#10B981' }} />,
                      label: '可用',
                      value: `${rackStats.availableU}U`,
                      color: '#10B981',
                    },
                    {
                      icon: <ThunderboltOutlined style={{ fontSize: 14, color: '#7C3AED' }} />,
                      label: '功率',
                      value: `${rackStats.totalPower.toFixed(1)}kW`,
                      color: '#7C3AED',
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 14px',
                        borderRight: i < 4 ? '1px solid rgba(30, 58, 138, 0.08)' : 'none',
                      }}
                    >
                      {item.icon}
                      <div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500, lineHeight: 1 }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '13px', color: item.color, fontWeight: 700, marginTop: 2, lineHeight: 1 }}>
                          {item.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Device Detail Floating Popup - Removed, now handled in DeviceModel */}
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <Empty
                description={
                  <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>请选择一个机柜以查看 3D 视图</span>
                }
              />
            </div>
          )}

          <Modal
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <EditOutlined style={{ color: '#667eea' }} />
                <span>编辑设备信息</span>
              </div>
            }
            open={modalVisible}
            onCancel={handleModalCancel}
            closeIcon={<CloseButton />}
            footer={null}
            width={700}
          >
            <Form form={form} layout="vertical" onFinish={handleModalSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="name" label="设备名称" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="type" label="设备类型" rules={[{ required: true }]}>
                  <Select>
                    <Option value="server">服务器</Option>
                    <Option value="switch">交换机</Option>
                    <Option value="router">路由器</Option>
                    <Option value="storage">存储设备</Option>
                    <Option value="firewall">防火墙</Option>
                    <Option value="other">其他设备</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="model" label="型号" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="serialNumber" label="序列号" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="position" label="位置(U)" rules={[{ required: true }]}>
                  <InputNumber min={1} max={selectedRack?.height || 45} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="height" label="高度(U)" rules={[{ required: true }]}>
                  <InputNumber min={1} max={10} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                  <Select>
                    <Option value="running">运行中</Option>
                    <Option value="maintenance">维护中</Option>
                    <Option value="offline">离线</Option>
                    <Option value="fault">故障</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="powerConsumption" label="功率(W)" rules={[{ required: true }]}>
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="ipAddress" label="IP地址">
                  <Input />
                </Form.Item>
                <Form.Item name="purchaseDate" label="购买日期">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="warrantyExpiry" label="保修到期">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <Form.Item name="description" label="描述">
                <Input.TextArea rows={3} />
              </Form.Item>

              <div style={{ textAlign: 'right', marginTop: 16 }}>
                <Space>
                  <Button onClick={handleModalCancel}>取消</Button>
                  <Button type="primary" htmlType="submit">
                    保存
                  </Button>
                </Space>
              </div>
            </Form>
          </Modal>

          {/* Field Configuration Modal */}
          <Modal
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SettingOutlined style={{ color: '#1890ff' }} />
                <span>设备详情字段配置</span>
              </div>
            }
            open={showTooltipConfig}
            onCancel={() => setShowTooltipConfig(false)}
            closeIcon={<CloseButton />}
            footer={null}
            width={520}
            styles={{
              content: { padding: '24px' },
              header: { marginBottom: 16 },
            }}
          >
            {loadingTooltipFields ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin />
                <div style={{ marginTop: 8 }}>加载配置中...</div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 16, color: '#666' }}>
                  选择要在设备详情卡片中显示的字段：
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  {Object.entries(tooltipFields).map(([key, field]) => (
                    <div
                      key={key}
                      style={{
                        padding: '8px 12px',
                        border: field.enabled ? '1px solid #1890ff' : '1px solid #d9d9d9',
                        background: field.enabled ? '#e6f7ff' : '#fff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.3s',
                      }}
                      onClick={() => {
                        setTooltipFields(prev => ({
                          ...prev,
                          [key]: { ...prev[key], enabled: !prev[key].enabled },
                        }));
                      }}
                    >
                      <Checkbox checked={field.enabled} style={{ marginRight: 8 }} />
                      <span>{field.label}</span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 24,
                    textAlign: 'right',
                    borderTop: '1px solid #f0f0f0',
                    paddingTop: 16,
                  }}
                >
                  <Space>
                    <Button onClick={() => setShowTooltipConfig(false)}>取消</Button>
                    <Button
                      type="primary"
                      onClick={saveTooltipConfig}
                      loading={savingTooltipConfig}
                    >
                      保存配置
                    </Button>
                  </Space>
                </div>
              </div>
            )}
          </Modal>

          <NetworkCardCreateModal
            device={operatingDevice}
            visible={nicModalVisible}
            onClose={handleCloseNicModal}
            onSuccess={handleNicSuccess}
          />

          <PortCreateModal
            device={operatingDevice}
            visible={portModalVisible}
            onClose={handleClosePortModal}
            onSuccess={handlePortSuccess}
          />

          <CableCreateModal
            visible={cableModalVisible}
            onClose={handleCloseCableModal}
            onSuccess={handleCableSuccess}
            sourceDevice={operatingDevice}
          />

          <DeviceDetailDrawer
            visible={!!selectedDevice}
            device={selectedDevice}
            onClose={() => setSelectedDevice(null)}
            onEdit={handleEditDevice}
            tooltipFields={tooltipFields}
            cables={deviceCables}
            refreshTrigger={refreshTrigger}
          />
        </Content>
      </div>
    </div>
  );
};

export default Rack3DVisualization;
