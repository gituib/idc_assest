import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Card,
  Space,
  Popconfirm,
  Tag,
  Tooltip,
  InputNumber,
  Collapse,
  Empty,
  Spin,
  Upload,
  Progress,
  Checkbox,
  Badge,
  Row,
  Col,
  Skeleton,
  Alert,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
  DownloadOutlined,
  UploadOutlined as UploadIcon,
  AppstoreOutlined,
  UnorderedListOutlined,
  FilterOutlined,
  ClearOutlined,
  CloudServerOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import VirtualDeviceList from '../components/VirtualDeviceList';
import NetworkCardPanel from '../components/NetworkCardPanel';
import NetworkCardCreateModal from '../components/NetworkCardCreateModal';

const { Option } = Select;
const { Panel } = Collapse;
const { Text, Title } = Typography;
const { TextArea } = Input;

// 设计令牌 - 与接线管理页面保持一致
const designTokens = {
  colors: {
    primary: {
      main: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      light: '#818cf8',
      dark: '#4f46e5',
      bg: '#eef2ff',
    },
    success: {
      main: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      light: '#34d399',
      dark: '#047857',
      bg: '#ecfdf5',
    },
    warning: {
      main: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      light: '#fbbf24',
      dark: '#b45309',
      bg: '#fffbeb',
    },
    error: {
      main: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      light: '#f87171',
      dark: '#b91c1c',
      bg: '#fef2f2',
    },
    info: {
      main: '#3b82f6',
      bg: '#eff6ff',
    },
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },
  borderRadius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    xl: '20px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },
};

// 动画配置
const animations = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  },
};

function PortManagement() {
  const [ports, setPorts] = useState([]);
  const [devices, setDevices] = useState([]);
  const [cables, setCables] = useState([]);
  const [groupedPorts, setGroupedPorts] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    deviceId: '',
    status: 'all',
    portType: 'all',
    portSpeed: 'all',
    searchText: '',
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPort, setEditingPort] = useState(null);
  const [form] = Form.useForm();

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importing, setImporting] = useState(false);
  const [skipExisting, setSkipExisting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);

  // 视图模式：list 或 panel
  const [viewMode, setViewMode] = useState('list');

  // 网卡管理相关状态
  const [networkCardModalVisible, setNetworkCardModalVisible] = useState(false);
  const [portCreateModalVisible, setPortCreateModalVisible] = useState(false);
  const [selectedDeviceForNic, setSelectedDeviceForNic] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 展开的设备
  const [expandedKeys, setExpandedKeys] = useState([]);

  const fetchPorts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        pageSize: 1000,
      };

      if (filters.deviceId) params.deviceId = filters.deviceId;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.portType !== 'all') params.portType = filters.portType;
      if (filters.portSpeed !== 'all') params.portSpeed = filters.portSpeed;

      const response = await axios.get('/api/device-ports', { params });
      const portsData = response.data.ports || response.data || [];
      
      // 搜索过滤
      let filteredPorts = portsData;
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        filteredPorts = portsData.filter(port => 
          port.portName?.toLowerCase().includes(searchLower) ||
          port.portType?.toLowerCase().includes(searchLower) ||
          port.description?.toLowerCase().includes(searchLower)
        );
      }
      
      setPorts(filteredPorts);
    } catch (error) {
      message.error('获取端口列表失败');
      console.error('获取端口列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await axios.get('/api/devices', { params: { pageSize: 100 } });
      setDevices(response.data.devices || response.data || []);
    } catch (error) {
      message.error('获取设备列表失败');
      console.error('获取设备列表失败:', error);
    }
  }, []);

  const fetchCables = useCallback(async () => {
    try {
      const response = await axios.get('/api/cables');
      setCables(response.data.cables || response.data || []);
    } catch (error) {
      console.error('获取接线列表失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchPorts();
    fetchDevices();
    fetchCables();
  }, [fetchPorts, fetchDevices, fetchCables]);

  useEffect(() => {
    const grouped = {};
    ports.forEach(port => {
      const deviceId = port.deviceId;
      if (!grouped[deviceId]) {
        grouped[deviceId] = {
          device: devices.find(d => d.deviceId === deviceId),
          ports: [],
        };
      }
      grouped[deviceId].ports.push(port);
    });

    // 对每个设备的端口按名称升序排序
    Object.keys(grouped).forEach(deviceId => {
      grouped[deviceId].ports.sort((a, b) => {
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
    });

    setGroupedPorts(grouped);
    
    // 自动展开前5个
    const deviceIds = Object.keys(grouped);
    setExpandedKeys(deviceIds.slice(0, 5));
  }, [ports, devices]);

  const handleSearch = () => {
    fetchPorts();
  };

  const handleReset = () => {
    setFilters({
      deviceId: '',
      status: 'all',
      portType: 'all',
      portSpeed: 'all',
      searchText: '',
    });
  };

  const handleAdd = () => {
    setEditingPort(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleAddPortForDevice = device => {
    setEditingPort(null);
    form.resetFields();
    form.setFieldsValue({
      deviceId: device.deviceId,
    });
    setModalVisible(true);
  };

  const handleManageNetworkCards = device => {
    setSelectedDeviceForNic(device);
    setNetworkCardModalVisible(true);
  };

  const handleNicSuccess = () => {
    message.success({
      content: '操作成功',
      icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
    });
    setRefreshTrigger(prev => prev + 1);
    fetchPorts();
  };

  const handleEdit = port => {
    setEditingPort(port);
    form.setFieldsValue({
      portId: port.portId,
      deviceId: port.deviceId,
      portName: port.portName,
      portType: port.portType,
      portSpeed: port.portSpeed,
      status: port.status,
      vlanId: port.vlanId,
      description: port.description,
    });
    setModalVisible(true);
  };

  const handleDelete = async portId => {
    try {
      await axios.delete(`/api/device-ports/${portId}`);
      message.success({
        content: '删除成功',
        icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
      });
      fetchPorts();
    } catch (error) {
      message.error('删除失败');
      console.error('删除失败:', error);
    }
  };

  const parsePortRange = portName => {
    const rangeMatch = portName.match(/^(.*?)\/(\d+)-\1\/(\d+)$/);
    if (rangeMatch) {
      const prefix = rangeMatch[1];
      const start = parseInt(rangeMatch[2]);
      const end = parseInt(rangeMatch[3]);

      if (start <= end && end - start < 100) {
        return Array.from({ length: end - start + 1 }, (_, i) => `${prefix}/${start + i}`);
      }
    }
    return [portName];
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingPort) {
        await axios.put(`/api/device-ports/${editingPort.portId}`, values);
        message.success({
          content: '更新成功',
          icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
        });
      } else {
        const portNames = parsePortRange(values.portName);

        if (portNames.length > 1) {
          const portsData = portNames.map((name, index) => ({
            portId: `PORT-${Date.now()}-${index}`,
            deviceId: values.deviceId,
            portName: name,
            portType: values.portType,
            portSpeed: values.portSpeed,
            status: values.status,
            vlanId: values.vlanId,
            description: values.description,
          }));

          const response = await axios.post('/api/device-ports/batch', { ports: portsData });
          const { success, failed } = response.data;

          if (failed > 0) {
            message.warning(`批量创建完成！成功 ${success} 个，失败 ${failed} 个`);
          } else {
            message.success({
              content: `成功创建 ${success} 个端口`,
              icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
            });
          }
        } else {
          await axios.post('/api/device-ports', values);
          message.success({
            content: '创建成功',
            icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
          });
        }
      }

      setModalVisible(false);
      form.resetFields();
      fetchPorts();
    } catch (error) {
      message.error(editingPort ? '更新失败' : '创建失败');
      console.error('提交失败:', error);
    }
  };

  const handleImport = () => {
    setImportModalVisible(true);
    setImportPreview([]);
    setImportProgress({ current: 0, total: 0 });
  };

  const handleFileUpload = info => {
    const { file } = info;

    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const data = e.target.result;
        let parsedData = [];

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet);
        } else if (file.name.endsWith('.csv')) {
          Papa.parse(data, {
            header: true,
            skipEmptyLines: true,
            complete: results => {
              parsedData = results.data;
            },
          });
        } else {
          message.error('不支持的文件格式，请上传 .xlsx 或 .csv 文件');
          return;
        }

        const validatedData = await validateImportData(parsedData);
        setImportPreview(validatedData);
        setImportProgress({ current: 0, total: validatedData.length });
      } catch (error) {
        message.error('文件解析失败');
        console.error('文件解析失败:', error);
      }
    };

    reader.readAsBinaryString(file);
  };

  const validateImportData = async data => {
    const validatedData = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const error = await validatePortRow(row, i);

      if (error) {
        errors.push(error);
      } else {
        validatedData.push(row);
      }
    }

    if (errors.length > 0) {
      message.warning(`发现 ${errors.length} 条数据错误，已跳过`);
      console.log('导入错误:', errors);
    }

    return validatedData;
  };

  const validatePortRow = async (row, index) => {
    if (!row['设备ID'] || !row['端口名称']) {
      return { valid: false, error: `第 ${index + 1} 行：缺少必填字段（设备ID或端口名称）` };
    }

    const device = devices.find(d => d.deviceId === row['设备ID']);
    if (!device) {
      return { valid: false, error: `第 ${index + 1} 行：设备不存在` };
    }

    const validPortTypes = ['RJ45', 'SFP', 'SFP+', 'SFP28', 'QSFP', 'QSFP28'];
    if (!validPortTypes.includes(row['端口类型'])) {
      return { valid: false, error: `第 ${index + 1} 行：无效的端口类型` };
    }

    const validPortSpeeds = ['100M', '1G', '10G', '25G', '40G', '100G'];
    if (!validPortSpeeds.includes(row['端口速率'])) {
      return { valid: false, error: `第 ${index + 1} 行：无效的端口速率` };
    }

    const validStatuses = ['空闲', '占用', '故障'];
    if (!validStatuses.includes(row['状态'])) {
      return { valid: false, error: `第 ${index + 1} 行：无效的状态` };
    }

    return { valid: true };
  };

  const handleBatchImport = async () => {
    if (importPreview.length === 0) {
      message.warning('请先选择要导入的数据');
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: importPreview.length });

    try {
      const statusMap = {
        空闲: 'free',
        占用: 'occupied',
        故障: 'fault',
      };

      const portsData = importPreview.map((row, index) => ({
        portId: `PORT-${Date.now()}-${index}`,
        deviceId: row['设备ID'],
        portName: row['端口名称'],
        portType: row['端口类型'],
        portSpeed: row['端口速率'],
        status: statusMap[row['状态']] || 'free',
        vlanId: row['VLAN ID'],
        description: row['描述'],
      }));

      const response = await axios.post('/api/device-ports/batch', { ports: portsData });
      const { total, success, failed, errors } = response.data;

      setImportProgress({ current: total, total: total });

      if (failed > 0) {
        console.error('导入错误:', errors);
        message.warning(`导入完成！成功 ${success} 条，失败 ${failed} 条`);
      } else {
        message.success({
          content: `导入完成！成功 ${success} 条`,
          icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
        });
      }

      fetchPorts();
      setImportModalVisible(false);
      setImportPreview([]);
    } catch (error) {
      console.error('批量导入失败:', error);
      message.error('批量导入失败，请检查数据格式');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        设备ID: 'DEV001',
        端口名称: 'eth0/1',
        端口类型: 'RJ45',
        端口速率: '1G',
        状态: '空闲',
        'VLAN ID': '100',
        描述: '示例端口',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '端口数据');
    XLSX.writeFile(workbook, '端口导入模板.xlsx');
  };

  const getStatusTag = status => {
    const statusMap = {
      free: { color: 'success', text: '空闲', icon: <CheckCircleOutlined /> },
      occupied: { color: 'processing', text: '占用', icon: <AppstoreOutlined /> },
      fault: { color: 'error', text: '故障', icon: <ExclamationCircleOutlined /> },
      空闲: { color: 'success', text: '空闲', icon: <CheckCircleOutlined /> },
      占用: { color: 'processing', text: '占用', icon: <AppstoreOutlined /> },
      故障: { color: 'error', text: '故障', icon: <ExclamationCircleOutlined /> },
    };
    const config = statusMap[status] || { color: 'default', text: status, icon: null };
    return (
      <Tag 
        color={config.color}
        icon={config.icon}
        style={{ borderRadius: '4px', padding: '2px 8px', fontSize: '12px' }}
      >
        {config.text}
      </Tag>
    );
  };

  const getPortTypeTag = type => {
    const typeMap = {
      RJ45: { color: 'blue', text: 'RJ45' },
      SFP: { color: 'green', text: 'SFP' },
      'SFP+': { color: 'cyan', text: 'SFP+' },
      SFP28: { color: 'purple', text: 'SFP28' },
      QSFP: { color: 'orange', text: 'QSFP' },
      QSFP28: { color: 'red', text: 'QSFP28' },
    };
    const config = typeMap[type] || { color: 'default', text: type };
    return (
      <Tag color={config.color} style={{ borderRadius: '4px', padding: '2px 8px', fontSize: '12px' }}>
        {config.text}
      </Tag>
    );
  };

  const portColumns = useMemo(() => [
    {
      title: '端口名称',
      dataIndex: 'portName',
      key: 'portName',
      width: 120,
      render: text => <span style={{ fontWeight: 500, color: designTokens.colors.neutral[800] }}>{text}</span>,
    },
    {
      title: '端口类型',
      dataIndex: 'portType',
      key: 'portType',
      width: 100,
      render: type => getPortTypeTag(type),
    },
    {
      title: '端口速率',
      dataIndex: 'portSpeed',
      key: 'portSpeed',
      width: 100,
      render: text => <Text type="secondary">{text}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: status => getStatusTag(status),
    },
    {
      title: 'VLAN ID',
      dataIndex: 'vlanId',
      key: 'vlanId',
      width: 100,
      render: vlanId => vlanId || <Text type="secondary">-</Text>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: text => text || <Text type="secondary">-</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ color: designTokens.colors.primary.main }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定要删除这个端口吗？"
              onConfirm={() => handleDelete(record.portId)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ], []);

  // 获取设备图标
  const getDeviceIcon = device => {
    if (!device?.type) return <AppstoreOutlined />;
    const type = device.type.toLowerCase();
    if (type.includes('server')) return <CloudServerOutlined />;
    if (type.includes('switch')) return <AppstoreOutlined />;
    if (type.includes('router')) return <ApiOutlined />;
    return <AppstoreOutlined />;
  };

  return (
    <motion.div
      variants={animations.container}
      initial="hidden"
      animate="visible"
      style={{ 
        padding: '24px', 
        background: designTokens.colors.neutral[50], 
        minHeight: '100vh',
      }}
    >
      {/* 页面标题 */}
      <motion.div variants={animations.item} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: designTokens.borderRadius.md,
              background: designTokens.colors.primary.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '20px',
            }}
          >
            <ApiOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: designTokens.colors.neutral[800] }}>端口管理</Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>管理设备的网络端口信息</Text>
          </div>
        </div>
      </motion.div>

      {/* 主内容区 */}
      <motion.div variants={animations.item}>
        <Card
          style={{
            borderRadius: designTokens.borderRadius.lg,
            boxShadow: designTokens.shadows.md,
            border: 'none',
          }}
          bodyStyle={{ padding: '24px' }}
        >
          {/* 过滤器区域 */}
          <div style={{ marginBottom: '24px' }}>
            <Card
              style={{
                background: designTokens.colors.neutral[50],
                borderRadius: designTokens.borderRadius.md,
                border: `1px solid ${designTokens.colors.neutral[200]}`,
              }}
              bodyStyle={{ padding: '16px' }}
            >
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={12} md={6} lg={5}>
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: designTokens.colors.neutral[600], fontWeight: 500 }}>
                    设备
                  </div>
                  <Select
                    placeholder="选择设备"
                    style={{ width: '100%' }}
                    value={filters.deviceId || undefined}
                    onChange={value => setFilters(prev => ({ ...prev, deviceId: value }))}
                    allowClear
                    showSearch
                    filterOption={(input, option) => {
                      const device = devices.find(d => d.deviceId === option.value);
                      if (!device) return false;
                      const searchText = `${device.name} ${device.deviceId}`.toLowerCase();
                      return searchText.indexOf(input.toLowerCase()) >= 0;
                    }}
                  >
                    {devices.map(device => (
                      <Option key={device.deviceId} value={device.deviceId}>
                        {device.name} ({device.deviceId})
                      </Option>
                    ))}
                  </Select>
                </Col>

                <Col xs={24} sm={12} md={5} lg={4}>
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: designTokens.colors.neutral[600], fontWeight: 500 }}>
                    端口类型
                  </div>
                  <Select
                    placeholder="端口类型"
                    style={{ width: '100%' }}
                    value={filters.portType}
                    onChange={value => setFilters(prev => ({ ...prev, portType: value }))}
                  >
                    <Option value="all">全部类型</Option>
                    <Option value="RJ45">RJ45</Option>
                    <Option value="SFP">SFP</Option>
                    <Option value="SFP+">SFP+</Option>
                    <Option value="SFP28">SFP28</Option>
                    <Option value="QSFP">QSFP</Option>
                    <Option value="QSFP28">QSFP28</Option>
                  </Select>
                </Col>

                <Col xs={24} sm={12} md={5} lg={4}>
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: designTokens.colors.neutral[600], fontWeight: 500 }}>
                    端口速率
                  </div>
                  <Select
                    placeholder="端口速率"
                    style={{ width: '100%' }}
                    value={filters.portSpeed}
                    onChange={value => setFilters(prev => ({ ...prev, portSpeed: value }))}
                  >
                    <Option value="all">全部速率</Option>
                    <Option value="100M">100M</Option>
                    <Option value="1G">1G</Option>
                    <Option value="10G">10G</Option>
                    <Option value="25G">25G</Option>
                    <Option value="40G">40G</Option>
                    <Option value="100G">100G</Option>
                  </Select>
                </Col>

                <Col xs={24} sm={12} md={5} lg={4}>
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: designTokens.colors.neutral[600], fontWeight: 500 }}>
                    状态
                  </div>
                  <Select
                    placeholder="状态"
                    style={{ width: '100%' }}
                    value={filters.status}
                    onChange={value => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <Option value="all">全部状态</Option>
                    <Option value="free">空闲</Option>
                    <Option value="occupied">占用</Option>
                    <Option value="fault">故障</Option>
                  </Select>
                </Col>

                <Col xs={24} sm={12} md={8} lg={4}>
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: designTokens.colors.neutral[600], fontWeight: 500 }}>
                    搜索
                  </div>
                  <Input
                    placeholder="搜索端口名称..."
                    value={filters.searchText}
                    onChange={e => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                    onPressEnter={handleSearch}
                    prefix={<SearchOutlined style={{ color: designTokens.colors.neutral[400] }} />}
                    allowClear
                  />
                </Col>

                <Col xs={24} sm={12} md={4} lg={3}>
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: 'transparent' }}>操作</div>
                  <Space>
                    <Button
                      type="primary"
                      icon={<FilterOutlined />}
                      onClick={handleSearch}
                      style={{ 
                        background: designTokens.colors.primary.gradient, 
                        border: 'none',
                        borderRadius: designTokens.borderRadius.sm,
                      }}
                    >
                      筛选
                    </Button>
                    <Tooltip title="重置筛选条件">
                      <Button 
                        icon={<ClearOutlined />} 
                        onClick={handleReset}
                        style={{ borderRadius: designTokens.borderRadius.sm }}
                      />
                    </Tooltip>
                  </Space>
                </Col>
              </Row>
            </Card>
          </div>

          {/* 操作按钮区域 */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size="middle">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
                size="large"
                style={{ 
                  background: designTokens.colors.primary.gradient, 
                  border: 'none',
                  borderRadius: designTokens.borderRadius.sm,
                  boxShadow: designTokens.shadows.md,
                }}
              >
                新增端口
              </Button>
              <Button
                icon={<ImportOutlined />}
                onClick={handleImport}
                size="large"
                style={{ borderRadius: designTokens.borderRadius.sm }}
              >
                批量导入
              </Button>
              <Button 
                icon={<ExportOutlined />}
                size="large"
                style={{ borderRadius: designTokens.borderRadius.sm }}
              >
                导出
              </Button>
            </Space>

            <Space>
              <Button.Group>
                <Button
                  type={viewMode === 'list' ? 'primary' : 'default'}
                  icon={<UnorderedListOutlined />}
                  onClick={() => setViewMode('list')}
                  style={viewMode === 'list' ? {
                    background: designTokens.colors.primary.gradient,
                    border: 'none',
                  } : {}}
                >
                  列表
                </Button>
                <Button
                  type={viewMode === 'panel' ? 'primary' : 'default'}
                  icon={<AppstoreOutlined />}
                  onClick={() => setViewMode('panel')}
                  style={viewMode === 'panel' ? {
                    background: designTokens.colors.primary.gradient,
                    border: 'none',
                  } : {}}
                >
                  面板
                </Button>
              </Button.Group>
              <Tooltip title="刷新数据">
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={fetchPorts}
                  loading={loading}
                  style={{ borderRadius: designTokens.borderRadius.sm }}
                />
              </Tooltip>
            </Space>
          </div>

          {/* 数据展示区域 */}
          {loading ? (
            <div style={{ padding: '40px' }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          ) : Object.keys(groupedPorts).length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', color: designTokens.colors.neutral[600], marginBottom: '8px' }}>
                      暂无端口数据
                    </div>
                    <div style={{ fontSize: '13px', color: designTokens.colors.neutral[400] }}>
                      点击"新增端口"按钮创建第一个端口
                    </div>
                  </div>
                }
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                  style={{ 
                    background: designTokens.colors.primary.gradient, 
                    border: 'none',
                    borderRadius: designTokens.borderRadius.sm,
                  }}
                >
                  新增端口
                </Button>
              </Empty>
            </motion.div>
          ) : viewMode === 'panel' ? (
            <VirtualDeviceList
              devices={Object.values(groupedPorts)
                .map(g => g.device)
                .filter(Boolean)}
              groupedPorts={groupedPorts}
              cables={cables}
              allDevices={devices}
              onPortClick={port => handleEdit(port)}
              onAddPort={device => handleAddPortForDevice(device)}
              onManageNetworkCards={device => handleManageNetworkCards(device)}
              initialVisibleCount={5}
              loadMoreCount={5}
            />
          ) : (
            <Collapse
              activeKey={expandedKeys}
              onChange={setExpandedKeys}
              style={{ background: 'transparent', border: 'none' }}
              expandIconPosition="end"
            >
              <AnimatePresence>
                {Object.entries(groupedPorts).map(([deviceId, data], index) => {
                  const device = data.device;
                  const devicePorts = data.ports || [];
                  const freeCount = devicePorts.filter(p => p.status === 'free').length;
                  const occupiedCount = devicePorts.filter(p => p.status === 'occupied').length;
                  const faultCount = devicePorts.filter(p => p.status === 'fault').length;

                  return (
                    <motion.div
                      key={deviceId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Panel
                        header={
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              paddingRight: '16px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: designTokens.borderRadius.md,
                                  background: designTokens.colors.primary.gradient,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#fff',
                                  fontSize: '24px',
                                  boxShadow: designTokens.shadows.md,
                                }}
                              >
                                {getDeviceIcon(device)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '16px', color: designTokens.colors.neutral[800] }}>
                                  {device?.name || '未知设备'}
                                </div>
                                <div style={{ fontSize: '13px', color: designTokens.colors.neutral[500], marginTop: '2px' }}>
                                  {device?.deviceId || '-'} · {device?.model || device?.type || '设备'}
                                </div>
                              </div>
                            </div>
                            <Space size="middle">
                              <Tooltip title="空闲">
                                <Tag 
                                  color="success" 
                                  style={{ borderRadius: '4px', padding: '4px 12px' }}
                                  icon={<CheckCircleOutlined />}
                                >
                                  {freeCount}
                                </Tag>
                              </Tooltip>
                              <Tooltip title="占用">
                                <Tag 
                                  color="processing" 
                                  style={{ borderRadius: '4px', padding: '4px 12px' }}
                                  icon={<AppstoreOutlined />}
                                >
                                  {occupiedCount}
                                </Tag>
                              </Tooltip>
                              {faultCount > 0 && (
                                <Tooltip title="故障">
                                  <Tag 
                                    color="error" 
                                    style={{ borderRadius: '4px', padding: '4px 12px' }}
                                    icon={<ExclamationCircleOutlined />}
                                  >
                                    {faultCount}
                                  </Tag>
                                </Tooltip>
                              )}
                              <Tag 
                                color="blue" 
                                style={{ borderRadius: '4px', padding: '4px 12px', fontWeight: 500 }}
                              >
                                总计: {devicePorts.length}
                              </Tag>
                            </Space>
                          </div>
                        }
                        extra={
                          <Space size="small" onClick={e => e.stopPropagation()}>
                            <Tooltip title="添加端口">
                              <Button
                                type="text"
                                icon={<PlusOutlined />}
                                onClick={() => handleAddPortForDevice(device)}
                                style={{ color: designTokens.colors.primary.main }}
                              />
                            </Tooltip>
                            {device?.type?.toLowerCase()?.includes('server') && (
                              <Tooltip title="网卡管理">
                                <Button
                                  type="text"
                                  icon={<CloudServerOutlined />}
                                  onClick={() => handleManageNetworkCards(device)}
                                  style={{ color: designTokens.colors.primary.main }}
                                />
                              </Tooltip>
                            )}
                          </Space>
                        }
                        style={{
                          background: '#fff',
                          borderRadius: designTokens.borderRadius.lg,
                          marginBottom: '12px',
                          border: `1px solid ${designTokens.colors.neutral[200]}`,
                          overflow: 'hidden',
                        }}
                      >
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Table
                            columns={portColumns}
                            dataSource={devicePorts}
                            rowKey="portId"
                            pagination={{
                              pageSize: 10,
                              showSizeChanger: true,
                              showTotal: total => `共 ${total} 个端口`,
                              pageSizeOptions: ['10', '20', '50', '100'],
                            }}
                            size="middle"
                            scroll={{ x: 1000 }}
                            style={{ 
                              borderRadius: designTokens.borderRadius.md,
                              overflow: 'hidden',
                            }}
                          />
                        </motion.div>
                      </Panel>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </Collapse>
          )}
        </Card>
      </motion.div>

      {/* 新增/编辑端口弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: designTokens.borderRadius.md,
                background: designTokens.colors.primary.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <ApiOutlined />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 600 }}>
              {editingPort ? '编辑端口' : '新增端口'}
            </span>
          </div>
        }
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText="确定"
        cancelText="取消"
        okButtonProps={{
          style: {
            background: designTokens.colors.primary.gradient,
            border: 'none',
            borderRadius: designTokens.borderRadius.sm,
          },
        }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '16px' }}>
          <Form.Item
            name="deviceId"
            label="设备"
            rules={[{ required: true, message: '请选择设备' }]}
          >
            <Select
              placeholder="请选择设备"
              showSearch
              filterOption={(input, option) => {
                const device = devices.find(d => d.deviceId === option.value);
                if (!device) return false;
                const searchText = `${device.name} ${device.deviceId}`.toLowerCase();
                return searchText.indexOf(input.toLowerCase()) >= 0;
              }}
            >
              {devices.map(device => (
                <Option key={device.deviceId} value={device.deviceId}>
                  {device.name} ({device.deviceId})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="portName"
            label="端口名称"
            rules={[{ required: true, message: '请输入端口名称' }]}
            extra={!editingPort && '支持批量添加，例如: 1/0/1-1/0/48 将创建 48 个端口'}
          >
            <Input placeholder="例如: eth0/1 或 1/0/1-1/0/48" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="portType"
                label="端口类型"
                rules={[{ required: true, message: '请选择端口类型' }]}
                initialValue="RJ45"
              >
                <Select placeholder="请选择端口类型">
                  <Option value="RJ45">RJ45</Option>
                  <Option value="SFP">SFP</Option>
                  <Option value="SFP+">SFP+</Option>
                  <Option value="SFP28">SFP28</Option>
                  <Option value="QSFP">QSFP</Option>
                  <Option value="QSFP28">QSFP28</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="portSpeed"
                label="端口速率"
                rules={[{ required: true, message: '请选择端口速率' }]}
                initialValue="1G"
              >
                <Select placeholder="请选择端口速率">
                  <Option value="100M">100M</Option>
                  <Option value="1G">1G</Option>
                  <Option value="10G">10G</Option>
                  <Option value="25G">25G</Option>
                  <Option value="40G">40G</Option>
                  <Option value="100G">100G</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
                initialValue="free"
              >
                <Select placeholder="请选择状态">
                  <Option value="free">空闲</Option>
                  <Option value="occupied">占用</Option>
                  <Option value="fault">故障</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="vlanId" label="VLAN ID">
                <InputNumber placeholder="请输入VLAN ID" min={1} max={4094} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入描述信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量导入弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: designTokens.borderRadius.md,
                background: designTokens.colors.info.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <ImportOutlined />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 600 }}>批量导入端口</span>
          </div>
        }
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportPreview([]);
          setImportProgress({ current: 0, total: 0 });
        }}
        width={900}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setImportModalVisible(false)}
            style={{ borderRadius: designTokens.borderRadius.sm }}
          >
            取消
          </Button>,
          <Button 
            key="download" 
            icon={<DownloadOutlined />} 
            onClick={handleDownloadTemplate}
            style={{ borderRadius: designTokens.borderRadius.sm }}
          >
            下载模板
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<ImportOutlined />}
            onClick={handleBatchImport}
            loading={importing}
            disabled={importPreview.length === 0}
            style={{ 
              background: designTokens.colors.primary.gradient, 
              border: 'none',
              borderRadius: designTokens.borderRadius.sm,
            }}
          >
            开始导入
          </Button>,
        ]}
      >
        <div style={{ padding: '16px 0' }}>
          <Upload.Dragger
            name="file"
            accept=".xlsx,.xls,.csv"
            beforeUpload={() => false}
            customRequest={({ file, onSuccess }) => {
              handleFileUpload({ file, onSuccess });
            }}
            style={{
              borderRadius: designTokens.borderRadius.lg,
              border: `2px dashed ${designTokens.colors.primary.light}`,
              background: designTokens.colors.primary.bg,
            }}
          >
            <p className="ant-upload-drag-icon">
              <UploadIcon style={{ fontSize: '48px', color: designTokens.colors.primary.main }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: '16px', color: designTokens.colors.neutral[700] }}>
              点击或拖拽文件到此处上传
            </p>
            <p className="ant-upload-hint" style={{ color: designTokens.colors.neutral[500] }}>
              支持 .xlsx, .xls, .csv 格式文件
            </p>
          </Upload.Dragger>

          <div style={{ display: 'flex', gap: '24px', marginTop: '16px', padding: '16px', background: designTokens.colors.neutral[50], borderRadius: designTokens.borderRadius.md }}>
            <Checkbox checked={skipExisting} onChange={e => setSkipExisting(e.target.checked)}>
              跳过已存在的端口
            </Checkbox>
            <Checkbox checked={updateExisting} onChange={e => setUpdateExisting(e.target.checked)}>
              更新已存在的端口
            </Checkbox>
          </div>

          {importPreview.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ marginTop: '24px' }}
            >
              <Alert
                message={`成功解析 ${importPreview.length} 条数据`}
                type="success"
                showIcon
                style={{ marginBottom: '16px', borderRadius: designTokens.borderRadius.md }}
              />
              <div style={{ marginBottom: '8px', fontWeight: 500, color: designTokens.colors.neutral[700] }}>
                数据预览（前10条）
              </div>
              <Table
                columns={[
                  { title: '设备ID', dataIndex: '设备ID', key: 'deviceId', width: 120 },
                  { title: '端口名称', dataIndex: '端口名称', key: 'portName', width: 120 },
                  { title: '端口类型', dataIndex: '端口类型', key: 'portType', width: 100, render: type => getPortTypeTag(type) },
                  { title: '端口速率', dataIndex: '端口速率', key: 'portSpeed', width: 100 },
                  { title: '状态', dataIndex: '状态', key: 'status', width: 100, render: status => getStatusTag(status) },
                  { title: 'VLAN ID', dataIndex: 'VLAN ID', key: 'vlanId', width: 100, render: vlanId => vlanId || '-' },
                  { title: '描述', dataIndex: '描述', key: 'description', ellipsis: true },
                ]}
                dataSource={importPreview.slice(0, 10)}
                rowKey={(record, index) => index}
                pagination={false}
                size="small"
                scroll={{ x: 800 }}
                style={{ borderRadius: designTokens.borderRadius.md }}
              />
              {importPreview.length > 10 && (
                <div style={{ textAlign: 'center', marginTop: '12px', color: designTokens.colors.neutral[500] }}>
                  仅显示前10条数据，共 {importPreview.length} 条
                </div>
              )}
            </motion.div>
          )}

          {importing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '40px 24px' }}
            >
              <Spin size="large" tip="导入中..." />
              <div style={{ marginTop: '24px' }}>
                <Progress
                  percent={Math.round((importProgress.current / importProgress.total) * 100)}
                  status="active"
                  strokeColor={{
                    '0%': designTokens.colors.primary.main,
                    '100%': designTokens.colors.success.main,
                  }}
                  style={{ borderRadius: designTokens.borderRadius.sm }}
                />
                <div style={{ marginTop: '16px', color: designTokens.colors.neutral[600] }}>
                  正在导入 {importProgress.current} / {importProgress.total} 条数据...
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </Modal>

      {/* 网卡管理模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: designTokens.borderRadius.md,
                background: designTokens.colors.primary.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <CloudServerOutlined />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 600 }}>
              网卡管理 - {selectedDeviceForNic?.name}
            </span>
          </div>
        }
        open={networkCardModalVisible}
        onCancel={() => {
          setNetworkCardModalVisible(false);
          setSelectedDeviceForNic(null);
        }}
        footer={null}
        width={800}
        destroyOnClose
      >
        {selectedDeviceForNic && (
          <NetworkCardPanel
            deviceId={selectedDeviceForNic.deviceId}
            deviceName={selectedDeviceForNic.name}
            onRefresh={fetchPorts}
            refreshTrigger={refreshTrigger}
          />
        )}
      </Modal>

      {/* 创建网卡模态框 */}
      <NetworkCardCreateModal
        device={selectedDeviceForNic}
        visible={portCreateModalVisible}
        onClose={() => {
          setPortCreateModalVisible(false);
          setSelectedDeviceForNic(null);
        }}
        onSuccess={handleNicSuccess}
      />
    </motion.div>
  );
}

export default PortManagement;
