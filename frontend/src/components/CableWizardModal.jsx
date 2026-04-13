import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Steps,
  Button,
  Space,
  Spin,
  Card,
  Tag,
  Tooltip,
  message,
  Typography,
  Divider,
  Badge,
  Empty,
  Input,
} from 'antd';
import {
  SwapOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  SearchOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import CloseButton from './CloseButton';
import PortPanel from './PortPanel';
import FilterableDeviceSelect from './FilterableDeviceSelect';
import { designTokens } from '../config/theme';

const { Title, Text } = Typography;

const CABLE_TYPES = [
  { value: 'ethernet', label: '以太网线', desc: 'Cat6 1G/10G', color: '#52c41a', icon: '🌐' },
  { value: 'fiber', label: '光纤', desc: 'SMF/MMF 长距离', color: '#1890ff', icon: '🔦' },
  { value: 'copper', label: '铜缆', desc: '电源/特殊连接', color: '#faad14', icon: '🔌' },
];

const CABLE_LENGTHS = [1, 2, 3, 5, 7, 10, 15, 20, 30, 50];

const getStatusTag = (status) => {
  const config = {
    running: { color: 'success', text: '运行中' },
    normal: { color: 'success', text: '正常' },
    warning: { color: 'warning', text: '警告' },
    error: { color: 'error', text: '故障' },
    fault: { color: 'error', text: '故障' },
    offline: { color: 'default', text: '离线' },
    maintenance: { color: 'processing', text: '维护中' },
  };
  const { color, text } = config[status] || { color: 'default', text: status };
  return <Tag color={color} size="small">{text}</Tag>;
};

const CableWizardModal = ({ visible, onClose, onSuccess, initialSourceDevice, editingCable }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [sourceDevice, setSourceDevice] = useState(null);
  const [targetDevice, setTargetDevice] = useState(null);
  const [sourcePort, setSourcePort] = useState(null);
  const [targetPort, setTargetPort] = useState(null);
  const [selectedCableType, setSelectedCableType] = useState('ethernet');
  const [selectedCableLength, setSelectedCableLength] = useState(3);
  const [cableLabel, setCableLabel] = useState('');
  const [cableDescription, setCableDescription] = useState('');
  const [fetchingDevices, setFetchingDevices] = useState(false);
  const [sourcePorts, setSourcePorts] = useState([]);
  const [targetPorts, setTargetPorts] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [cablesData, setCablesData] = useState([]);
  const [compatibilityWarning, setCompatibilityWarning] = useState(null);

  // 初始化编辑模式的数据
  useEffect(() => {
    if (editingCable && visible) {
      setSourceDevice({ deviceId: editingCable.sourceDeviceId, name: editingCable.sourceDeviceId });
      setTargetDevice({ deviceId: editingCable.targetDeviceId, name: editingCable.targetDeviceId });
      setSourcePort({ portName: editingCable.sourcePort });
      setTargetPort({ portName: editingCable.targetPort });
      setSelectedCableType(editingCable.cableType || 'ethernet');
      setSelectedCableLength(editingCable.cableLength || 3);
      setCableLabel(editingCable.cableLabel || '');
      setCableDescription(editingCable.description || '');
      setCurrentStep(3); // 直接跳转到预览步骤
    }
  }, [editingCable, visible]);

  const fetchDevices = useCallback(async (keyword = '', type = '') => {
    try {
      setFetchingDevices(true);
      const params = { pageSize: 100 };
      if (keyword && keyword.trim()) {
        params.keyword = keyword.trim();
      }
      if (type && type.trim()) {
        params.type = type.trim();
      }
      const response = await axios.get('/api/devices', { params });
      const deviceList = response.data.devices || [];
      setDevices(deviceList);
      return deviceList;
    } catch (error) {
      console.error('获取设备列表失败:', error);
      message.error('获取设备列表失败');
      return [];
    } finally {
      setFetchingDevices(false);
    }
  }, []);

  const fetchDevicePorts = useCallback(async (deviceId, type) => {
    console.log('fetchDevicePorts called for:', deviceId, type);
    if (!deviceId) return;

    try {
      const response = await axios.get(`/api/device-ports/device/${deviceId}`);
      const ports = response.data || [];
      console.log('Fetched ports:', ports);
      if (type === 'source') {
        setSourcePorts(ports);
      } else {
        setTargetPorts(ports);
      }
    } catch (error) {
      console.error(`获取端口列表失败: ${deviceId}`, error);
      message.error('获取端口列表失败');
    }
  }, []);

  const fetchCables = useCallback(async () => {
    try {
      const response = await axios.get('/api/cables');
      setCablesData(response.data.cables || []);
    } catch (error) {
      console.error('获取接线数据失败:', error);
    }
  }, []);

  const checkPortConflict = useCallback(async (deviceId, portName, excludeCableId = null) => {
    try {
      const response = await axios.post('/api/cables/check-conflict', {
        sourceDeviceId: deviceId,
        sourcePort: portName,
        excludeCableId,
      });
      return response.data;
    } catch (error) {
      console.error('检查端口冲突失败:', error);
      return { hasConflict: false, conflicts: [] };
    }
  }, []);

  const checkPortCompatibility = useCallback(async (srcDeviceId, srcPort, tgtDeviceId, tgtPort) => {
    try {
      const response = await axios.post('/api/cables/check-compatibility', {
        sourceDeviceId: srcDeviceId,
        sourcePort: srcPort,
        targetDeviceId: tgtDeviceId,
        targetPort: tgtPort,
      });
      return response.data;
    } catch (error) {
      console.error('检查端口兼容性失败:', error);
      return { compatible: false, reasons: [] };
    }
  }, []);

  const debounce = (fn, delay) => {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  const handleDeviceSearch = useCallback(
    debounce((value, type = '') => {
      fetchDevices(value, type);
    }, 300),
    [fetchDevices]
  );

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setTargetDevice(null);
      setSourcePort(null);
      setTargetPort(null);
      setSelectedCableType('ethernet');
      setSelectedCableLength(3);
      setCableLabel('');
      setCableDescription('');
      setTargetPorts([]);
      setConflicts([]);
      setCompatibilityWarning(null);
      setCablesData([]);

      if (initialSourceDevice?.deviceId) {
        const deviceWithId = {
          deviceId: initialSourceDevice.deviceId,
          name: initialSourceDevice.name || initialSourceDevice.deviceId,
          type: initialSourceDevice.type || 'switch',
          model: initialSourceDevice.model,
          status: initialSourceDevice.status,
          Rack: initialSourceDevice.Rack,
          ipAddress: initialSourceDevice.ipAddress,
          position: initialSourceDevice.position,
        };
        setSourceDevice(deviceWithId);
        fetchDevicePorts(deviceWithId.deviceId, 'source');
        fetchDevices('', 'switch');
      } else {
        setSourceDevice(null);
        setSourcePorts([]);
        fetchDevices('', 'switch');
      }
      fetchCables();
    }
  }, [visible, initialSourceDevice, fetchDevices, fetchDevicePorts, fetchCables]);

  const handleSourceDeviceSelect = useCallback(async device => {
    setSourceDevice(device);
    setSourcePort(null);
    await fetchDevicePorts(device.deviceId, 'source');
  }, [fetchDevicePorts]);

  const handleTargetDeviceSelect = useCallback(async device => {
    setTargetDevice(device);
    setTargetPort(null);
    setConflicts([]);
    await fetchDevicePorts(device.deviceId, 'target');
  }, [fetchDevicePorts]);

  const handleSourcePortSelect = useCallback(async port => {
    console.log('handleSourcePortSelect called with port:', port);

    const isAlreadySelected =
      sourcePort?.portId === port.portId || sourcePort?.portName === port.portName;

    if (isAlreadySelected) {
      console.log('Deselecting source port:', port);
      setSourcePort(null);
      setConflicts([]);
      setCompatibilityWarning(null);
    } else {
      if (sourceDevice?.deviceId === targetDevice?.deviceId) {
        message.warning('源设备和目标设备不能相同');
        return;
      }

      const conflictResult = await checkPortConflict(sourceDevice.deviceId, port.portName);
      if (conflictResult.hasConflict) {
        const conflict = conflictResult.conflicts[0];
        message.error(`源端口 ${port.portName} 已被占用，无法选择`);
        return;
      }

      setSourcePort(port);
      console.log('Source port set to:', port);

      if (targetDevice) {
        await checkPortConflict(targetDevice.deviceId, port.portName);
      }
    }
  }, [sourceDevice, targetDevice, sourcePort, checkPortConflict]);

  const handleTargetPortSelect = useCallback(async port => {
    console.log('handleTargetPortSelect called with port:', port);

    const isAlreadySelected =
      targetPort?.portId === port.portId || targetPort?.portName === port.portName;

    if (isAlreadySelected) {
      console.log('Deselecting target port:', port);
      setTargetPort(null);
      setConflicts([]);
      setCompatibilityWarning(null);
    } else {
      if (sourceDevice?.deviceId === targetDevice?.deviceId) {
        message.warning('源设备和目标设备不能相同');
        return;
      }

      const conflictResult = await checkPortConflict(sourceDevice.deviceId, port.portName);
      if (conflictResult.hasConflict) {
        const conflict = conflictResult.conflicts[0];
        message.error(`目标端口 ${port.portName} 已被占用，无法选择`);
        return;
      }

      setTargetPort(port);
      console.log('Target port set to:', port);

      if (sourcePort) {
        const compatResult = await checkPortCompatibility(
          sourceDevice.deviceId,
          sourcePort.portName,
          targetDevice.deviceId,
          port.portName
        );
        if (!compatResult.compatible) {
          const errorReasons = compatResult.reasons.filter(r => r.severity === 'error');
          if (errorReasons.length > 0) {
            setCompatibilityWarning({
              type: 'error',
              message: errorReasons[0].message,
              details: compatResult.reasons,
            });
          }
        } else {
          const warningReasons = compatResult.reasons.filter(r => r.severity === 'warning');
          if (warningReasons.length > 0) {
            setCompatibilityWarning({
              type: 'warning',
              message: warningReasons[0].message,
              details: compatResult.reasons,
            });
          } else {
            setCompatibilityWarning(null);
          }
        }
      }
    }
  }, [sourceDevice, targetDevice, targetPort, sourcePort, checkPortConflict, checkPortCompatibility]);

  const handleNextStep = useCallback(async () => {
    if (currentStep === 0) {
      if (!sourceDevice) {
        message.warning('请先选择源设备');
        return;
      }
      if (!sourcePort) {
        message.warning('请先选择源设备端口');
        return;
      }
      if (sourcePorts.length === 0) {
        message.warning('源设备没有可用端口');
        return;
      }
    } else if (currentStep === 1) {
      if (!targetDevice) {
        message.warning('请先选择目标设备');
        return;
      }
      if (!targetPort) {
        message.warning('请先选择目标设备端口');
        return;
      }
      if (targetPorts.length === 0) {
        message.warning('目标设备没有可用端口');
        return;
      }
      if (compatibilityWarning?.type === 'error') {
        message.error('端口类型不兼容，无法创建接线');
        return;
      }
    } else if (currentStep === 2) {
      if (!sourcePort || !targetPort) {
        message.warning('请先选择源端口和目标端口');
        return;
      }
      if (sourcePort.portName === targetPort.portName && sourceDevice?.deviceId === targetDevice?.deviceId) {
        message.warning('源端口和目标端口不能相同');
        return;
      }
      if (compatibilityWarning?.type === 'error') {
        message.error('端口类型不兼容，无法创建接线');
        return;
      }
    }

    setCurrentStep(prev => prev + 1);
  }, [currentStep, sourceDevice, targetDevice, sourcePort, targetPort, sourcePorts, targetPorts, compatibilityWarning]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);

      const payload = {
        cableId: cableLabel || `CABLE-${Date.now()}`,
        sourceDeviceId: sourceDevice.deviceId,
        sourcePort: sourcePort.portName,
        targetDeviceId: targetDevice.deviceId,
        targetPort: targetPort.portName,
        cableType: selectedCableType,
        cableLength: selectedCableLength,
        description: cableDescription,
      };

      // 如果是编辑模式，使用 PUT 请求
      if (editingCable) {
        await axios.put(`/api/cables/${editingCable.cableId}`, payload);
        message.success('接线更新成功');
      } else {
        await axios.post('/api/cables', payload);
        message.success('接线创建成功');
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('操作接线失败:', error);
      if (error.response?.data?.conflict) {
        message.error('端口已被占用，请选择其他端口');
      } else {
        message.error(editingCable ? '接线更新失败' : '接线创建失败');
      }
    } finally {
      setLoading(false);
    }
  }, [
    sourceDevice,
    sourcePort,
    targetDevice,
    targetPort,
    selectedCableType,
    selectedCableLength,
    cableLabel,
    cableDescription,
    editingCable,
    onSuccess,
    onClose,
  ]);

  const getAvailablePorts = useCallback(
    (ports, type) => {
      return ports.filter(port => {
        if (port.status !== 'free') return false;

        if (type === 'source') {
          return !conflicts.some(c => c.type === 'target' && c.port === port.portName);
        } else {
          return !conflicts.some(c => c.type === 'source' && c.port === port.portName);
        }
      });
    },
    [conflicts]
  );

  const getRecommendedPorts = useCallback(
    (availablePorts, type) => {
      if (availablePorts.length === 0) return [];

      const sortedPorts = [...availablePorts].sort((a, b) => {
        const extractNumbers = str => {
          const matches = str.match(/\d+/g);
          return matches ? matches.map(Number) : [];
        };

        const numsA = extractNumbers(a.portName);
        const numsB = extractNumbers(b.portName);

        for (let i = 0; i < Math.min(numsA.length, numsB.length); i++) {
          if (numsA[i] !== numsB[i]) {
            return numsA[i] - numsB[i];
          }
        }

        return a.portName.localeCompare(b.portName);
      });

      return sortedPorts.slice(0, 5);
    },
    []
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Step1SourceDevice
            devices={devices}
            fetchingDevices={fetchingDevices}
            onDeviceSearch={handleDeviceSearch}
            onDeviceSelect={handleSourceDeviceSelect}
            sourceDevice={sourceDevice}
            sourcePorts={sourcePorts}
            sourcePort={sourcePort}
            onPortSelect={handleSourcePortSelect}
            onDevicesChange={setDevices}
          />
        );

      case 1:
        return (
          <Step2TargetDevice
            devices={devices}
            fetchingDevices={fetchingDevices}
            onDeviceSearch={handleDeviceSearch}
            onDeviceSelect={handleTargetDeviceSelect}
            targetDevice={targetDevice}
            targetPorts={targetPorts}
            targetPort={targetPort}
            onPortSelect={handleTargetPortSelect}
            conflicts={conflicts}
            compatibilityWarning={compatibilityWarning}
            onDevicesChange={setDevices}
          />
        );

      case 2:
        return (
          <Step3CableConfig
            sourceDevice={sourceDevice}
            sourcePort={sourcePort}
            targetDevice={targetDevice}
            targetPort={targetPort}
            cableTypes={CABLE_TYPES}
            cableLengths={CABLE_LENGTHS}
            selectedCableType={selectedCableType}
            selectedCableLength={selectedCableLength}
            onCableTypeChange={setSelectedCableType}
            onCableLengthChange={setSelectedCableLength}
            cableLabel={cableLabel}
            cableDescription={cableDescription}
            setCableLabel={setCableLabel}
            setCableDescription={setCableDescription}
          />
        );

      case 3:
        return (
          <Step4Preview
            sourceDevice={sourceDevice}
            sourcePort={sourcePort}
            targetDevice={targetDevice}
            targetPort={targetPort}
            cableType={CABLE_TYPES.find(c => c.value === selectedCableType)}
            cableLength={selectedCableLength}
            cableLabel={cableLabel}
            cableDescription={cableDescription}
            compatibilityWarning={compatibilityWarning}
          />
        );

      default:
        return null;
    }
  };

  const steps = [
    {
      title: '源设备',
      icon: <CloudServerOutlined />,
      description: '选择连接起点',
    },
    {
      title: '目标设备',
      icon: <DatabaseOutlined />,
      description: '选择连接终点',
    },
    {
      title: '线缆配置',
      icon: <SettingOutlined />,
      description: '设置线缆参数',
    },
    {
      title: '预览确认',
      icon: <CheckCircleOutlined />,
      description: '确认创建接线',
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined style={{ color: '#1890ff', fontSize: '24px' }} />
          <div>
            <Title level={3} style={{ margin: 0, lineHeight: 1.2 }}>
              新增接线
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              向导式创建流程
            </Text>
          </div>
        </Space>
      }
      open={visible}
      closeIcon={<CloseButton />}
      onCancel={onClose}
      width={1000}
      maskClosable={false}
      footer={null}
    >
      <div style={{ padding: '20px 0' }}>
        <Steps
          current={currentStep}
          items={steps}
          size="small"
          responsive
          onChange={setCurrentStep}
        />
      </div>

      <div style={{ minHeight: 400 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: `1px solid ${designTokens.colors.border}`,
        }}
      >
        <Button
          onClick={onClose}
          disabled={currentStep === 0}
          style={{ width: 100 }}
        >
          取消
        </Button>

        <Space>
          {currentStep > 0 && (
            <Button onClick={handlePrevStep} style={{ width: 100 }}>
              上一步
            </Button>
          )}

          {currentStep < steps.length - 1 ? (
            <Button
              type="primary"
              onClick={handleNextStep}
              style={{
                width: 100,
                background: designTokens.colors.primary.gradient,
                border: 'none',
              }}
            >
              下一步
            </Button>
          ) : (
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={loading}
              style={{
                width: 120,
                background: designTokens.colors.primary.gradient,
                border: 'none',
              }}
            >
              创建接线
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  );
};

const Step1SourceDevice = ({
  devices,
  fetchingDevices,
  onDeviceSearch,
  onDeviceSelect,
  sourceDevice,
  sourcePorts,
  sourcePort,
  onPortSelect,
  onDevicesChange,
}) => {
  const isSourcePreSelected = !!sourceDevice;

  return (
    <div style={{ padding: '20px 0' }}>
      <Card
        title={
          <Space>
            <CloudServerOutlined style={{ color: '#1890ff' }} />
            <span>步骤 1: 选择源设备端口</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: '20px' }}
      >
        {!isSourcePreSelected && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
                选择接线的起点设备
              </Typography.Text>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <FilterableDeviceSelect
                filterType="switch"
                onDeviceListChange={onDevicesChange}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '12px',
                maxHeight: 300,
                overflowY: 'auto',
                padding: '8px',
                background: designTokens.colors.background,
                borderRadius: '8px',
              }}
            >
              {fetchingDevices ? (
                <div style={{ textAlign: 'center', padding: '40px', gridColumn: '1 / -1' }}>
                  <Spin size="large" />
                </div>
              ) : (
                devices.map(device => (
                  <motion.div
                    key={device.deviceId}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      onClick={() => onDeviceSelect(device)}
                      hoverable
                      style={{
                        border: sourceDevice?.deviceId === device.deviceId
                          ? `2px solid ${designTokens.colors.primary}`
                          : '1px solid #d9d9d9',
                        background: sourceDevice?.deviceId === device.deviceId
                          ? 'rgba(24,144,255,0.08)'
                          : '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            flexShrink: 0,
                          }}
                        >
                          {device.type === 'server' ? '🖥️' : device.type === 'switch' ? '📡' : device.type === 'router' ? '🔀' : device.type === 'storage' ? '💾' : '📦'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <div style={{ fontWeight: 600, color: '#262626', fontSize: '15px' }}>
                              {device.name || device.deviceId}
                            </div>
                            {device.status && getStatusTag(device.status)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '4px' }}>
                            <span style={{ marginRight: '12px' }}>
                              <span style={{ color: '#bfbfbf', marginRight: '4px' }}>ID:</span>
                              {device.deviceId}
                            </span>
                            <span>
                              <span style={{ color: '#bfbfbf', marginRight: '4px' }}>类型:</span>
                              {device.type === 'server' ? '服务器' : device.type === 'switch' ? '交换机' : device.type === 'router' ? '路由器' : device.type === 'storage' ? '存储设备' : device.type}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#8c8c8c', lineHeight: '1.5' }}>
                            {device.Rack?.Room?.name && (
                              <span style={{ marginRight: '12px' }}>
                                <span style={{ color: '#bfbfbf', marginRight: '4px' }}>机房:</span>
                                {device.Rack.Room.name}
                              </span>
                            )}
                            {device.Rack?.name && (
                              <span style={{ marginRight: '12px' }}>
                                <span style={{ color: '#bfbfbf', marginRight: '4px' }}>机柜:</span>
                                {device.Rack.name}
                              </span>
                            )}
                            {device.position && (
                              <span style={{ marginRight: '12px' }}>
                                <span style={{ color: '#bfbfbf', marginRight: '4px' }}>U位:</span>
                                U{device.position}
                              </span>
                            )}
                            {device.ipAddress && (
                              <span>
                                <span style={{ color: '#bfbfbf', marginRight: '4px' }}>IP:</span>
                                {device.ipAddress}
                              </span>
                            )}
                          </div>
                          {device.model && (
                            <div style={{ fontSize: '11px', color: '#bfbfbf', marginTop: '4px' }}>
                              <span style={{ color: '#8c8c8c', marginRight: '4px' }}>型号:</span>
                              {device.model}
                            </div>
                          )}
                        </div>
                        {sourceDevice?.deviceId === device.deviceId && (
                          <CheckCircleOutlined style={{ color: designTokens.colors.primary, fontSize: '22px', flexShrink: 0 }} />
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}

        {sourceDevice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ marginTop: isSourcePreSelected ? 0 : '20px' }}
          >
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DatabaseOutlined style={{ color: '#1890ff' }} />
              <Typography.Text style={{ fontWeight: 600, color: '#262626' }}>
                源设备: {sourceDevice.name}
              </Typography.Text>
              {isSourcePreSelected && (
                <Tag color="blue" style={{ marginLeft: '8px' }}>已选择</Tag>
              )}
              <Tag color="blue" style={{ marginLeft: 'auto' }}>
                {sourcePorts.filter(p => p.status === 'free').length} 个空闲端口
              </Tag>
            </div>

            <div
              style={{
                background: '#f5f5f5',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #d9d9d9',
              }}
            >
              {sourcePorts.length === 0 ? (
                <Empty description="该设备暂无端口数据" />
              ) : (
                <>
                  <div style={{ marginBottom: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                    端口总数: {sourcePorts.length} | 空闲端口: {sourcePorts.filter(p => p.status === 'free').length}
                  </div>
                  {sourcePort && (
                    <div
                      style={{
                        marginBottom: '16px',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                        borderRadius: '12px',
                        border: '2px solid #1890ff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 4px 12px rgba(24,144,255,0.15)',
                      }}
                    >
                      <CheckCircleOutlined
                        style={{
                          color: '#1890ff',
                          fontSize: '24px',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#096dd9', marginBottom: '4px' }}>
                          ✓ 已选择端口: {sourcePort.portName}
                        </div>
                        {sourcePort.portType && (
                          <div style={{ fontSize: '12px', color: '#1890ff', fontWeight: 500 }}>
                            端口类型: {sourcePort.portType}
                          </div>
                        )}
                        {sourcePort.portSpeed && (
                          <div style={{ fontSize: '11px', color: '#40a9ff', marginTop: '2px' }}>
                            端口速率: {sourcePort.portSpeed}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <PortPanel
                    ports={sourcePorts}
                    deviceName={sourceDevice.name}
                    deviceId={sourceDevice.deviceId}
                    onPortClick={onPortSelect}
                    selectedPort={sourcePort}
                    compact
                  />
                </>
              )}
            </div>
          </motion.div>
        )}
      </Card>
    </div>
  );
};

const Step2TargetDevice = ({
  devices,
  fetchingDevices,
  onDeviceSearch,
  onDeviceSelect,
  targetDevice,
  targetPorts,
  targetPort,
  onPortSelect,
  conflicts,
  compatibilityWarning,
  onDevicesChange,
}) => {
  return (
    <div style={{ padding: '20px 0' }}>
      <Card
        title={
          <Space>
            <DatabaseOutlined style={{ color: '#1890ff' }} />
            <span>步骤 2: 选择目标设备</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: '20px' }}
      >
        <div style={{ marginBottom: '16px' }}>
          <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
            选择接线的终点设备
          </Typography.Text>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <FilterableDeviceSelect
            filterType=""
            onDeviceListChange={onDevicesChange}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
            maxHeight: 300,
            overflowY: 'auto',
            padding: '8px',
            background: designTokens.colors.background,
            borderRadius: '8px',
          }}
        >
          {fetchingDevices ? (
            <div style={{ textAlign: 'center', padding: '40px', gridColumn: '1 / -1' }}>
              <Spin size="large" />
            </div>
          ) : (
            devices.map(device => (
              <motion.div
                key={device.deviceId}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  onClick={() => onDeviceSelect(device)}
                  hoverable
                  style={{
                    border: targetDevice?.deviceId === device.deviceId
                      ? `2px solid ${designTokens.colors.primary}`
                      : '1px solid #d9d9d9',
                    background: targetDevice?.deviceId === device.deviceId
                      ? 'rgba(24,144,255,0.08)'
                      : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        flexShrink: 0,
                      }}
                    >
                      {device.type === 'server' ? '🖥️' : device.type === 'switch' ? '📡' : device.type === 'router' ? '🔀' : device.type === 'storage' ? '💾' : '📦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div style={{ fontWeight: 600, color: '#262626', fontSize: '15px' }}>
                          {device.name || device.deviceId}
                        </div>
                        {device.status && getStatusTag(device.status)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '4px' }}>
                        <span style={{ marginRight: '12px' }}>
                          <span style={{ color: '#bfbfbf', marginRight: '4px' }}>ID:</span>
                          {device.deviceId}
                        </span>
                        <span>
                          <span style={{ color: '#bfbfbf', marginRight: '4px' }}>类型:</span>
                          {device.type === 'server' ? '服务器' : device.type === 'switch' ? '交换机' : device.type === 'router' ? '路由器' : device.type === 'storage' ? '存储设备' : device.type}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#8c8c8c', lineHeight: '1.5' }}>
                        {device.Rack?.Room?.name && (
                          <span style={{ marginRight: '12px' }}>
                            <span style={{ color: '#bfbfbf', marginRight: '4px' }}>机房:</span>
                            {device.Rack.Room.name}
                          </span>
                        )}
                        {device.Rack?.name && (
                          <span style={{ marginRight: '12px' }}>
                            <span style={{ color: '#bfbfbf', marginRight: '4px' }}>机柜:</span>
                            {device.Rack.name}
                          </span>
                        )}
                        {device.position && (
                          <span style={{ marginRight: '12px' }}>
                            <span style={{ color: '#bfbfbf', marginRight: '4px' }}>U位:</span>
                            U{device.position}
                          </span>
                        )}
                        {device.ipAddress && (
                          <span>
                            <span style={{ color: '#bfbfbf', marginRight: '4px' }}>IP:</span>
                            {device.ipAddress}
                          </span>
                        )}
                      </div>
                      {device.model && (
                        <div style={{ fontSize: '11px', color: '#bfbfbf', marginTop: '4px' }}>
                          <span style={{ color: '#8c8c8c', marginRight: '4px' }}>型号:</span>
                          {device.model}
                        </div>
                      )}
                    </div>
                    {targetDevice?.deviceId === device.deviceId && (
                      <CheckCircleOutlined style={{ color: designTokens.colors.primary, fontSize: '22px', flexShrink: 0 }} />
                    )}
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {targetDevice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ marginTop: '20px' }}
          >
            <div style={{ marginBottom: '12px' }}>
              <Typography.Text style={{ fontWeight: 600, color: '#262626' }}>
                目标设备已选择: {targetDevice.name}
              </Typography.Text>
            </div>

            <div
              style={{
                background: '#f5f5f5',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #d9d9d9',
              }}
            >
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DatabaseOutlined style={{ color: '#1890ff' }} />
                <Typography.Text style={{ fontWeight: 600 }}>端口选择</Typography.Text>
                <Tag color="blue" style={{ marginLeft: 'auto' }}>
                  {targetPorts.filter(p => p.status === 'free').length} 个空闲端口
                </Tag>
              </div>

              {targetPorts.length === 0 ? (
                <Empty description="该设备暂无端口数据" />
              ) : (
                <>
                  <div style={{ marginBottom: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                    端口总数: {targetPorts.length} | 空闲端口: {targetPorts.filter(p => p.status === 'free').length}
                  </div>
                  <div style={{ marginBottom: '8px', fontSize: '11px', color: '#bfbfbf' }}>
                    端口状态分布: {targetPorts.map(p => p.status).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                  </div>
                  {targetPort && (
                    <div
                      style={{
                        marginBottom: '16px',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                        borderRadius: '12px',
                        border: '2px solid #1890ff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 4px 12px rgba(24,144,255,0.15)',
                      }}
                    >
                      <CheckCircleOutlined
                        style={{
                          color: '#1890ff',
                          fontSize: '24px',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#096dd9', marginBottom: '4px' }}>
                          ✓ 已选择端口: {targetPort.portName}
                        </div>
                        {targetPort.portType && (
                          <div style={{ fontSize: '12px', color: '#1890ff', fontWeight: 500 }}>
                            端口类型: {targetPort.portType}
                          </div>
                        )}
                        {targetPort.portSpeed && (
                          <div style={{ fontSize: '11px', color: '#40a9ff', marginTop: '2px' }}>
                            端口速率: {targetPort.portSpeed}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <PortPanel
                    ports={targetPorts}
                    deviceName={targetDevice.name}
                    deviceId={targetDevice.deviceId}
                    onPortClick={onPortSelect}
                    selectedPort={targetPort}
                    compact
                  />
                </>
              )}

              {conflicts.length > 0 && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'rgba(239,68,68,0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(239,68,68,0.3)',
                  }}
                >
                  <Typography.Text type="danger" style={{ fontWeight: 600 }}>
                    ⚠️ 端口冲突检测
                  </Typography.Text>
                  <div style={{ marginTop: '8px', fontSize: '12px' }}>
                    {conflicts.map((conflict, index) => (
                      <div key={index} style={{ marginBottom: '4px' }}>
                        <Tag color="error" style={{ marginRight: '8px' }}>
                          {conflict.type === 'source' ? '源端口' : '目标端口'}
                        </Tag>
                        <Text code>{conflict.port}</Text>
                        <Text type="secondary" style={{ marginLeft: '8px' }}>
                          已被 {conflict.existingCable?.sourceDevice?.name} →{' '}
                          {conflict.existingCable?.targetDevice?.name} 占用
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {compatibilityWarning && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: compatibilityWarning.type === 'error'
                      ? 'rgba(239,68,68,0.1)'
                      : 'rgba(250,173,20,0.1)',
                    borderRadius: '8px',
                    border: `1px solid ${compatibilityWarning.type === 'error'
                      ? 'rgba(239,68,68,0.3)'
                      : 'rgba(250,173,20,0.3)'}`,
                  }}
                >
                  <Typography.Text
                    type={compatibilityWarning.type === 'error' ? 'danger' : 'warning'}
                    style={{ fontWeight: 600 }}
                  >
                    {compatibilityWarning.type === 'error' ? '❌ 端口类型不兼容' : '⚠️ 端口速率不匹配'}
                  </Typography.Text>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#595959' }}>
                    {compatibilityWarning.message}
                  </div>
                  {compatibilityWarning.type === 'error' && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px',
                        background: 'rgba(0,0,0,0.05)',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                    >
                      请选择相同类型的端口（如 RJ45 电口只能连接 RJ45 电口）
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </Card>
    </div>
  );
};

const Step3CableConfig = ({
  sourceDevice,
  sourcePort,
  targetDevice,
  targetPort,
  cableTypes,
  cableLengths,
  selectedCableType,
  selectedCableLength,
  onCableTypeChange,
  onCableLengthChange,
  cableLabel,
  cableDescription,
  setCableLabel,
  setCableDescription,
}) => {
  const estimatedLength = useMemo(() => {
    if (!sourceDevice?.rackId || !targetDevice?.rackId) return 3;

    const distance = Math.abs(sourceDevice.rackId - targetDevice.rackId) * 0.5;
    return Math.max(3, Math.min(50, Math.round(distance + 3)));
  }, [sourceDevice, targetDevice]);

  return (
    <div style={{ padding: '20px 0' }}>
      <Card
        title={
          <Space>
            <SettingOutlined style={{ color: '#1890ff' }} />
            <span>步骤 3: 线缆配置</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: '20px' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '16px',
          }}
        >
          <div
            style={{
              gridColumn: 'span 12',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                padding: '16px',
                color: '#fff',
              }}
            >
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
                源设备
              </div>
              <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
                {sourceDevice?.name}
              </div>
              <Tag
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                }}
              >
                {sourcePort?.portName}
              </Tag>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(24,144,255,0.3)',
                }}
              >
                <ArrowRightOutlined style={{ color: '#fff', fontSize: '18px' }} />
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#8c8c8c',
                  textAlign: 'center',
                }}
              >
                建议长度: <Text strong style={{ color: '#1890ff' }}>{estimatedLength}m</Text>
              </div>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                borderRadius: '12px',
                padding: '16px',
                color: '#fff',
              }}
            >
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
                目标设备
              </div>
              <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
                {targetDevice?.name}
              </div>
              <Tag
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                }}
              >
                {targetPort?.portName}
              </Tag>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '16px',
            marginTop: '16px',
          }}
        >
          <div style={{ gridColumn: 'span 5' }}>
            <Typography.Text style={{ fontWeight: 600, marginBottom: '12px', display: 'block' }}>
              线缆类型
            </Typography.Text>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              {cableTypes.map(type => (
                <div
                  key={type.value}
                  onClick={() => onCableTypeChange(type.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: `2px solid ${selectedCableType === type.value ? type.color : '#e8e8e8'}`,
                    background: selectedCableType === type.value
                      ? `${type.color}10`
                      : '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{type.icon}</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '13px' }}>{type.label}</div>
                    <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{type.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ gridColumn: 'span 7' }}>
            <Typography.Text style={{ fontWeight: 600, marginBottom: '12px', display: 'block' }}>
              线缆长度
            </Typography.Text>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              {cableLengths.map(length => (
                <div
                  key={length}
                  onClick={() => onCableLengthChange(length)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '20px',
                    border: `2px solid ${selectedCableLength === length ? '#1890ff' : '#e8e8e8'}`,
                    background: selectedCableLength === length
                      ? '#e6f7ff'
                      : '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontWeight: selectedCableLength === length ? 600 : 400,
                    color: selectedCableLength === length ? '#1890ff' : '#595959',
                  }}
                >
                  {length}m
                </div>
              ))}
            </div>

            <Typography.Text style={{ fontWeight: 600, marginBottom: '12px', display: 'block' }}>
              线缆属性
            </Typography.Text>
            <div
              style={{
                background: '#fafafa',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #e8e8e8',
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <Typography.Text style={{ fontSize: '12px', color: '#8c8c8c', display: 'block', marginBottom: '6px' }}>
                  线缆标签
                </Typography.Text>
                <Input
                  placeholder="自动生成或手动输入标签"
                  value={cableLabel}
                  onChange={e => setCableLabel(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <Typography.Text style={{ fontSize: '12px', color: '#8c8c8c', display: 'block', marginBottom: '6px' }}>
                  备注说明
                </Typography.Text>
                <Input.TextArea
                  placeholder="添加接线说明..."
                  value={cableDescription}
                  onChange={e => setCableDescription(e.target.value)}
                  rows={3}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: '16px',
            padding: '14px 16px',
            background: '#f0f5ff',
            borderRadius: '10px',
            border: '1px solid #adc6ff',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <InfoCircleOutlined style={{ color: '#1890ff', fontSize: '16px', marginTop: '2px' }} />
          <div>
            <Typography.Text style={{ fontWeight: 600, color: '#1890ff', fontSize: '13px' }}>
              选择建议
            </Typography.Text>
            <div style={{ fontSize: '12px', marginTop: '4px', lineHeight: '1.6', color: '#595959' }}>
              以太网线适用于1G/10G短距离连接 · 光纤适用于长距离或高带宽需求 · 铜缆适用于电源或特殊设备
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const Step4Preview = ({
  sourceDevice,
  sourcePort,
  targetDevice,
  targetPort,
  cableType,
  cableLength,
  cableLabel,
  cableDescription,
  compatibilityWarning,
}) => {
  return (
    <div style={{ padding: '20px 0' }}>
      <Card
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>步骤 4: 预览确认</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: '20px' }}
      >
        <div
          style={{
            background: '#f5f5f5',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #d9d9d9',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                }}
              >
                {sourceDevice?.type === 'server' ? '🖥️' : sourceDevice?.type === 'switch' ? '📡' : '💾'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: cableType?.color + '30',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                  }}
                >
                  {cableType?.icon}
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    {cableType?.label} {cableLength}m
                  </div>
                  <div style={{ fontSize: '11px', color: '#bfbfbf' }}>
                    {cableLabel || '自动生成'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                }}
              >
                {targetDevice?.type === 'server' ? '🖥️' : targetDevice?.type === 'switch' ? '📡' : '💾'}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>源端口</div>
                <div style={{ fontWeight: 600, color: '#52c41a' }}>{sourcePort?.portName}</div>
                <div style={{ fontSize: '11px', color: '#bfbfbf' }}>
                  {sourceDevice?.name}
                </div>
              </div>

              <ArrowRightOutlined style={{ color: '#1890ff' }} />

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>目标端口</div>
                <div style={{ fontWeight: 600, color: '#1890ff' }}>{targetPort?.portName}</div>
                <div style={{ fontSize: '11px', color: '#bfbfbf' }}>
                  {targetDevice?.name}
                </div>
              </div>
            </div>
          </div>

          {cableDescription && (
            <div
              style={{
                padding: '16px',
                background: '#fff',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #d9d9d9',
              }}
            >
              <Typography.Text style={{ fontSize: '13px', display: 'block', marginBottom: '8px', color: '#262626' }}>
                备注说明
              </Typography.Text>
              <div style={{ fontSize: '14px', color: '#595959' }}>
                {cableDescription}
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              background: compatibilityWarning?.type === 'error'
                ? 'rgba(239,68,68,0.1)'
                : compatibilityWarning?.type === 'warning'
                  ? 'rgba(250,173,20,0.1)'
                  : 'rgba(82,196,26,0.1)',
              borderRadius: '8px',
              border: `1px solid ${compatibilityWarning?.type === 'error'
                ? 'rgba(239,68,68,0.3)'
                : compatibilityWarning?.type === 'warning'
                  ? 'rgba(250,173,20,0.3)'
                  : 'rgba(82,196,26,0.3)'}`,
            }}
          >
            {compatibilityWarning?.type === 'error' ? (
              <>
                <CheckCircleOutlined style={{ color: '#ff4d4f' }} />
                <Typography.Text style={{ fontWeight: 600, color: '#ff4d4f' }}>
                  ❌ 端口类型不兼容，无法创建接线
                </Typography.Text>
              </>
            ) : compatibilityWarning?.type === 'warning' ? (
              <>
                <CheckCircleOutlined style={{ color: '#faad14' }} />
                <Typography.Text style={{ fontWeight: 600, color: '#faad14' }}>
                  ⚠️ {compatibilityWarning.message}
                </Typography.Text>
              </>
            ) : (
              <>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Typography.Text style={{ fontWeight: 600, color: '#52c41a' }}>
                  ✅ 所有信息已确认，可以创建接线
                </Typography.Text>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CableWizardModal;
