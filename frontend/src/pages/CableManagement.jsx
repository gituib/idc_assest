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
  Collapse,
  Empty,
  Spin,
  Upload,
  Progress,
  Checkbox,
  Statistic,
  Row,
  Col,
  Badge,
  Divider,
  Typography,
  Alert,
  Skeleton,
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
  SwapOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DisconnectOutlined,
  LinkOutlined,
  FilterOutlined,
  ClearOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '../config/theme';
import { debounce } from '../utils/common';
import CloseButton from '../components/CloseButton';

const { Option } = Select;
const { Panel } = Collapse;
const { Text, Title } = Typography;
const { TextArea } = Input;

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
  card: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
    hover: {
      scale: 1.01,
      boxShadow: designTokens.shadows.lg,
      transition: { duration: 0.2 },
    },
  },
  table: {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25 },
    },
  },
};

function CableManagement() {
  const [cables, setCables] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceSearching, setDeviceSearching] = useState(false);
  const [switchDevices, setSwitchDevices] = useState([]);
  const [groupedCables, setGroupedCables] = useState({});
  const [devicePorts, setDevicePorts] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    switchDeviceId: '',
    status: 'all',
    cableType: 'all',
    searchText: '',
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCable, setEditingCable] = useState(null);
  const [form] = Form.useForm();

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFileList, setImportFileList] = useState([]);
  const [importPreview, setImportPreview] = useState([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importing, setImporting] = useState(false);
  const [skipExisting, setSkipExisting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);

  const [conflictModalVisible, setConflictModalVisible] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [pendingSubmitValues, setPendingSubmitValues] = useState(null);

  const [expandedKeys, setExpandedKeys] = useState([]);

  const fetchCables = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (filters.switchDeviceId) params.sourceDeviceId = filters.switchDeviceId;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.cableType !== 'all') params.cableType = filters.cableType;

      const response = await axios.get('/api/cables', { params });
      const cablesData = response.data.cables || [];

      // 搜索过滤
      let filteredCables = cablesData;
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        filteredCables = cablesData.filter(
          cable =>
            cable.sourceDevice?.name?.toLowerCase().includes(searchLower) ||
            cable.targetDevice?.name?.toLowerCase().includes(searchLower) ||
            cable.sourcePort?.toLowerCase().includes(searchLower) ||
            cable.targetPort?.toLowerCase().includes(searchLower) ||
            cable.cableId?.toLowerCase().includes(searchLower)
        );
      }

      setCables(filteredCables);

      const grouped = {};
      filteredCables.forEach(cable => {
        const switchId = cable.sourceDeviceId;
        if (!grouped[switchId]) {
          grouped[switchId] = {
            switch: cable.sourceDevice,
            cables: [],
          };
        }
        grouped[switchId].cables.push(cable);
      });
      setGroupedCables(grouped);

      // 自动展开前5个
      const switchIds = Object.keys(grouped);
      setExpandedKeys(switchIds.slice(0, 5));

      // 自动为每个交换机加载端口数据
      for (const switchId of switchIds) {
        if (!devicePorts[switchId]) {
          try {
            const portsResponse = await axios.get(`/api/device-ports/device/${switchId}`);
            setDevicePorts(prev => ({ ...prev, [switchId]: portsResponse.data || [] }));
          } catch (error) {
            console.error(`获取交换机 ${switchId} 端口失败:`, error);
          }
        }
      }
    } catch (error) {
      message.error('获取接线列表失败');
      console.error('获取接线列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, devicePorts]);

  const fetchDevices = useCallback(async (keyword = '') => {
    try {
      setDeviceSearching(true);

      // 并行获取所有设备和交换机设备
      const params = { pageSize: 1000 };
      if (keyword && keyword.trim()) {
        params.keyword = keyword.trim();
      }

      const [allResponse, switchResponse] = await Promise.all([
        axios.get('/api/devices', { params }),
        axios.get('/api/devices', { params: { ...params, type: 'switch' } }),
      ]);

      const allDevices = allResponse.data.devices || [];
      const switchDevices = switchResponse.data.devices || [];

      // 统计各类型设备数量
      const typeCount = {};
      allDevices.forEach(d => {
        const t = d.type || 'undefined';
        typeCount[t] = (typeCount[t] || 0) + 1;
      });
      console.log('[CableManagement] 设备类型统计:', typeCount);
      console.log('[CableManagement] All devices:', allDevices.length);
      console.log('[CableManagement] Switch devices (from API):', switchDevices.length);

      setDevices(allDevices);
      setSwitchDevices(switchDevices);
    } catch (error) {
      message.error('获取设备列表失败');
      console.error('[CableManagement] 获取设备列表失败:', error);
    } finally {
      setDeviceSearching(false);
    }
  }, []);

  const handleDeviceSearch = useCallback(
    debounce(value => {
      fetchDevices(value);
    }, 300),
    [fetchDevices]
  );

  const fetchDevicePorts = useCallback(async deviceId => {
    if (!deviceId) {
      setDevicePorts(prev => ({ ...prev, [deviceId]: [] }));
      return;
    }

    try {
      const response = await axios.get(`/api/device-ports/device/${deviceId}`);
      setDevicePorts(prev => ({ ...prev, [deviceId]: response.data || [] }));
    } catch (error) {
      console.error('获取设备端口失败:', error);
      setDevicePorts(prev => ({ ...prev, [deviceId]: [] }));
    }
  }, []);

  useEffect(() => {
    fetchCables();
    fetchDevices();
  }, [fetchCables, fetchDevices]);

  const handleSearch = () => {
    fetchCables();
  };

  const handleReset = () => {
    setFilters({
      switchDeviceId: '',
      status: 'all',
      cableType: 'all',
      searchText: '',
    });
  };

  const handleAdd = () => {
    setEditingCable(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = cable => {
    setEditingCable(cable);
    form.setFieldsValue({
      sourceDeviceId: cable.sourceDeviceId,
      sourcePort: cable.sourcePort,
      targetDeviceId: cable.targetDeviceId,
      targetPort: cable.targetPort,
      cableType: cable.cableType,
      cableLength: cable.cableLength,
      status: cable.status,
      description: cable.description,
    });
    setModalVisible(true);
  };

  const handleDelete = async cableId => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条接线吗？此操作不可恢复！',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`/api/cables/${cableId}`);
          message.success({
            content: '删除成功',
            icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
          });
          fetchCables();
        } catch (error) {
          message.error('删除失败');
          console.error('删除失败:', error);
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 如果是编辑模式，直接提交
      if (editingCable) {
        await axios.put(`/api/cables/${editingCable.cableId}`, values);
        message.success({
          content: '更新成功',
          icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
        });
        setModalVisible(false);
        form.resetFields();
        fetchCables();
        return;
      }

      // 创建模式：先检查冲突
      try {
        const checkResponse = await axios.post('/api/cables/check-conflict', {
          sourceDeviceId: values.sourceDeviceId,
          sourcePort: values.sourcePort,
          targetDeviceId: values.targetDeviceId,
          targetPort: values.targetPort,
        });

        if (checkResponse.data.hasConflict) {
          setConflictInfo(checkResponse.data.conflicts);
          setPendingSubmitValues(values);
          setConflictModalVisible(true);
          return;
        }

        // 无冲突，直接创建
        await axios.post('/api/cables', values);
        message.success({
          content: '创建成功',
          icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
        });
        setModalVisible(false);
        form.resetFields();
        fetchCables();
      } catch (error) {
        if (error.response?.status === 409) {
          // 冲突错误
          setConflictInfo([
            {
              type: 'unknown',
              existingCable: error.response.data.existingCable,
            },
          ]);
          setPendingSubmitValues(values);
          setConflictModalVisible(true);
        } else {
          throw error;
        }
      }
    } catch (error) {
      message.error(editingCable ? '更新失败' : '创建失败');
      console.error('提交失败:', error);
    }
  };

  const handleForceSubmit = async () => {
    try {
      if (!pendingSubmitValues) return;

      await axios.post('/api/cables', {
        ...pendingSubmitValues,
        force: true,
      });

      message.success({
        content: '接线已强制接管并创建成功',
        icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
      });
      setConflictModalVisible(false);
      setModalVisible(false);
      form.resetFields();
      setPendingSubmitValues(null);
      setConflictInfo(null);
      fetchCables();
    } catch (error) {
      message.error('强制接管失败');
      console.error('强制接管失败:', error);
    }
  };

  const handleImport = () => {
    setImportModalVisible(true);
    setImportPreview([]);
    setImportProgress({ current: 0, total: 0 });
  };

  const handleFileUpload = info => {
    const { file } = info;
    setImportFileList([file]);

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
      const error = await validateCableRow(row, i);

      if (error) {
        errors.push(error);
      } else {
        validatedData.push(row);
      }
    }

    if (errors.length > 0) {
      message.warning(`发现 ${errors.length} 条数据错误，已跳过`);
    }

    return validatedData;
  };

  const validateCableRow = async (row, index) => {
    const errors = [];

    if (!row['源设备ID'] || !row['源设备端口']) {
      return { valid: false, error: `第 ${index + 1} 行：缺少必填字段（源设备ID或源设备端口）` };
    }

    const sourceDevice = devices.find(d => d.deviceId === row['源设备ID']);
    if (!sourceDevice) {
      return { valid: false, error: `第 ${index + 1} 行：源设备不存在` };
    }

    const targetDevice = devices.find(d => d.deviceId === row['目标设备ID']);
    if (!targetDevice) {
      return { valid: false, error: `第 ${index + 1} 行：目标设备不存在` };
    }

    const validCableTypes = ['网线', '光纤', '铜缆'];
    if (!validCableTypes.includes(row['线缆类型'])) {
      return { valid: false, error: `第 ${index + 1} 行：无效的线缆类型` };
    }

    const validStatuses = ['正常', '故障', '未连接'];
    if (!validStatuses.includes(row['状态'])) {
      return { valid: false, error: `第 ${index + 1} 行：无效的状态` };
    }

    if (errors.length > 0) {
      return { valid: false, error: errors.join('; ') };
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
      const cableTypeMap = {
        网线: 'ethernet',
        光纤: 'fiber',
        铜缆: 'copper',
      };

      const statusMap = {
        正常: 'normal',
        故障: 'fault',
        未连接: 'disconnected',
      };

      const cablesData = importPreview.map((row, index) => ({
        cableId: `CABLE-${Date.now()}-${index}`,
        sourceDeviceId: row['源设备ID'],
        sourcePort: row['源设备端口'],
        targetDeviceId: row['目标设备ID'],
        targetPort: row['目标设备端口'],
        cableType: cableTypeMap[row['线缆类型']] || 'ethernet',
        cableLength: row['线缆长度(米)'],
        status: statusMap[row['状态']] || 'normal',
        description: row['描述'],
      }));

      const response = await axios.post('/api/cables/batch', { cables: cablesData });

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

      fetchCables();
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
        源设备ID: 'DEV001',
        源设备端口: 'eth0/1',
        目标设备ID: 'DEV002',
        目标设备端口: 'eth0',
        线缆类型: '网线',
        '线缆长度(米)': '5',
        状态: '正常',
        描述: '示例接线',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '接线数据');
    XLSX.writeFile(workbook, '接线导入模板.xlsx');
  };

  const getStatusTag = status => {
    const statusMap = {
      normal: {
        color: 'success',
        text: '正常',
        icon: <CheckCircleOutlined />,
        bg: designTokens.colors.success.bg,
      },
      fault: {
        color: 'error',
        text: '故障',
        icon: <ExclamationCircleOutlined />,
        bg: designTokens.colors.error.bg,
      },
      disconnected: {
        color: 'default',
        text: '未连接',
        icon: <DisconnectOutlined />,
        bg: designTokens.colors.neutral[100],
      },
    };
    const config = statusMap[status] || {
      color: 'default',
      text: status,
      icon: null,
      bg: designTokens.colors.neutral[100],
    };
    return (
      <Tag
        color={config.color}
        icon={config.icon}
        style={{
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '12px',
        }}
      >
        {config.text}
      </Tag>
    );
  };

  const getCableTypeTag = type => {
    const typeMap = {
      ethernet: { color: 'blue', text: '网线', icon: '🔌' },
      fiber: { color: 'cyan', text: '光纤', icon: '🔷' },
      copper: { color: 'orange', text: '铜缆', icon: '⚡' },
    };
    const config = typeMap[type] || { color: 'default', text: type, icon: '' };
    return (
      <Tag
        color={config.color}
        style={{
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '12px',
        }}
      >
        {config.text}
      </Tag>
    );
  };

  const getPortConnectionStatus = (portName, switchData) => {
    const cable = switchData.cables.find(c => {
      if (c.sourcePort === portName) return true;
      if (c.sourcePort?.toLowerCase() === portName?.toLowerCase()) return true;
      return false;
    });
    if (!cable) {
      return { status: 'disconnected', text: '未连接', color: 'default' };
    }
    return {
      status: cable.status,
      text: cable.status === 'normal' ? '已连接' : cable.status === 'fault' ? '故障' : '未连接',
      color: cable.status === 'normal' ? 'success' : cable.status === 'fault' ? 'error' : 'default',
    };
  };

  const portColumns = useMemo(
    () => [
      {
        title: '端口名称',
        dataIndex: 'portName',
        key: 'portName',
        width: 120,
        render: text => (
          <span style={{ fontWeight: 500, color: designTokens.colors.neutral[800] }}>{text}</span>
        ),
      },
      {
        title: '端口类型',
        dataIndex: 'portType',
        key: 'portType',
        width: 100,
        render: type => {
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
            <Tag color={config.color} style={{ borderRadius: '4px' }}>
              {config.text}
            </Tag>
          );
        },
      },
      {
        title: '端口速率',
        dataIndex: 'portSpeed',
        key: 'portSpeed',
        width: 100,
        render: text => <Text type="secondary">{text}</Text>,
      },
      {
        title: '连接状态',
        dataIndex: 'connectionStatus',
        key: 'connectionStatus',
        width: 100,
        render: (_, record) => {
          const status = getPortConnectionStatus(record.portName, record.switchData);
          return (
            <Badge
              status={
                status.color === 'success'
                  ? 'success'
                  : status.color === 'error'
                    ? 'error'
                    : 'default'
              }
              text={status.text}
            />
          );
        },
      },
      {
        title: '目标设备',
        dataIndex: 'targetDevice',
        key: 'targetDevice',
        width: 200,
        render: (_, record) => {
          const cable = record.switchData.cables.find(c => {
            if (c.sourcePort === record.portName) return true;
            if (c.sourcePort?.toLowerCase() === record.portName?.toLowerCase()) return true;
            return false;
          });
          if (!cable) return <Text type="secondary">-</Text>;
          return (
            <div>
              <div style={{ fontWeight: 500, color: designTokens.colors.neutral[800] }}>
                {cable.targetDevice?.name || '-'}
              </div>
              <div style={{ fontSize: 12, color: designTokens.colors.neutral[500] }}>
                {cable.targetPort}
              </div>
            </div>
          );
        },
      },
      {
        title: '线缆类型',
        dataIndex: 'cableType',
        key: 'cableType',
        width: 100,
        render: (_, record) => {
          const cable = record.switchData.cables.find(c => {
            if (c.sourcePort === record.portName) return true;
            if (c.sourcePort?.toLowerCase() === record.portName?.toLowerCase()) return true;
            return false;
          });
          if (!cable) return <Text type="secondary">-</Text>;
          return getCableTypeTag(cable.cableType);
        },
      },
      {
        title: '长度',
        dataIndex: 'cableLength',
        key: 'cableLength',
        width: 80,
        render: (_, record) => {
          const cable = record.switchData.cables.find(c => {
            if (c.sourcePort === record.portName) return true;
            if (c.sourcePort?.toLowerCase() === record.portName?.toLowerCase()) return true;
            return false;
          });
          if (!cable) return <Text type="secondary">-</Text>;
          return cable.cableLength ? (
            <Tag color="orange" style={{ borderRadius: '4px' }}>
              {cable.cableLength}m
            </Tag>
          ) : (
            <Text type="secondary">-</Text>
          );
        },
      },
      {
        title: '操作',
        key: 'action',
        width: 160,
        render: (_, record) => {
          const cable = record.switchData.cables.find(c => {
            if (c.sourcePort === record.portName) return true;
            if (c.sourcePort?.toLowerCase() === record.portName?.toLowerCase()) return true;
            return false;
          });
          if (!cable) {
            return <Text type="secondary">-</Text>;
          }
          return (
            <Space size="small">
              <Tooltip title="编辑">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(cable)}
                  style={{ color: designTokens.colors.primary.main }}
                />
              </Tooltip>
              <Tooltip title="删除">
                <Popconfirm
                  title="确定要删除这条接线吗？"
                  onConfirm={() => handleDelete(cable.cableId)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Tooltip>
            </Space>
          );
        },
      },
    ],
    []
  );

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
            <SwapOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: designTokens.colors.neutral[800] }}>
              接线管理
            </Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              管理设备间的网络连接关系
            </Text>
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
                  <div
                    style={{
                      marginBottom: '6px',
                      fontSize: '13px',
                      color: designTokens.colors.neutral[600],
                      fontWeight: 500,
                    }}
                  >
                    交换机
                  </div>
                  <Select
                    placeholder="输入关键词搜索交换机"
                    style={{ width: '100%' }}
                    value={filters.switchDeviceId || undefined}
                    onChange={value => setFilters(prev => ({ ...prev, switchDeviceId: value }))}
                    allowClear
                    showSearch
                    loading={deviceSearching}
                    filterOption={false}
                    onSearch={handleDeviceSearch}
                    onDropdownVisibleChange={open => {
                      if (open && switchDevices.length === 0) {
                        fetchDevices();
                      }
                    }}
                    suffixIcon={<AppstoreOutlined />}
                  >
                    {switchDevices.map(device => (
                      <Option key={device.deviceId} value={device.deviceId}>
                        {device.name} ({device.deviceId})
                      </Option>
                    ))}
                  </Select>
                </Col>

                <Col xs={24} sm={12} md={5} lg={4}>
                  <div
                    style={{
                      marginBottom: '6px',
                      fontSize: '13px',
                      color: designTokens.colors.neutral[600],
                      fontWeight: 500,
                    }}
                  >
                    线缆类型
                  </div>
                  <Select
                    placeholder="线缆类型"
                    style={{ width: '100%' }}
                    value={filters.cableType}
                    onChange={value => setFilters(prev => ({ ...prev, cableType: value }))}
                  >
                    <Option value="all">全部类型</Option>
                    <Option value="ethernet">网线</Option>
                    <Option value="fiber">光纤</Option>
                    <Option value="copper">铜缆</Option>
                  </Select>
                </Col>

                <Col xs={24} sm={12} md={5} lg={4}>
                  <div
                    style={{
                      marginBottom: '6px',
                      fontSize: '13px',
                      color: designTokens.colors.neutral[600],
                      fontWeight: 500,
                    }}
                  >
                    连接状态
                  </div>
                  <Select
                    placeholder="连接状态"
                    style={{ width: '100%' }}
                    value={filters.status}
                    onChange={value => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <Option value="all">全部状态</Option>
                    <Option value="normal">已连接</Option>
                    <Option value="fault">故障</Option>
                    <Option value="disconnected">未连接</Option>
                  </Select>
                </Col>

                <Col xs={24} sm={12} md={8} lg={7}>
                  <div
                    style={{
                      marginBottom: '6px',
                      fontSize: '13px',
                      color: designTokens.colors.neutral[600],
                      fontWeight: 500,
                    }}
                  >
                    搜索
                  </div>
                  <Input
                    placeholder="搜索设备名称、端口..."
                    value={filters.searchText}
                    onChange={e => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                    onPressEnter={handleSearch}
                    prefix={<SearchOutlined style={{ color: designTokens.colors.neutral[400] }} />}
                    allowClear
                  />
                </Col>

                <Col xs={24} sm={12} md={4} lg={4}>
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: 'transparent' }}>
                    操作
                  </div>
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
          <div
            style={{
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
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
                新增接线
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
              <Tooltip title="刷新数据">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchCables}
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
          ) : Object.keys(groupedCables).length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: '16px',
                        color: designTokens.colors.neutral[600],
                        marginBottom: '8px',
                      }}
                    >
                      暂无接线数据
                    </div>
                    <div style={{ fontSize: '13px', color: designTokens.colors.neutral[400] }}>
                      点击"新增接线"按钮创建第一条接线记录
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
                  新增接线
                </Button>
              </Empty>
            </motion.div>
          ) : (
            <Collapse
              activeKey={expandedKeys}
              onChange={setExpandedKeys}
              style={{ background: 'transparent', border: 'none' }}
            >
              {Object.entries(groupedCables).map(([switchId, switchData], index) => {
                const switchDevice = switchData.switch;
                const switchPorts = devicePorts[switchId] || [];
                const connectedCount = switchData.cables.filter(c => c.status === 'normal').length;
                const disconnectedCount = switchData.cables.filter(
                  c => c.status === 'disconnected'
                ).length;
                const faultCount = switchData.cables.filter(c => c.status === 'fault').length;

                return (
                  <Panel
                    key={switchId}
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
                            <AppstoreOutlined />
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: '16px',
                                color: designTokens.colors.neutral[800],
                              }}
                            >
                              {switchDevice?.name || '未知设备'}
                            </div>
                            <div
                              style={{
                                fontSize: '13px',
                                color: designTokens.colors.neutral[500],
                                marginTop: '2px',
                              }}
                            >
                              {switchDevice?.deviceId || '-'} · {switchDevice?.model || '交换机'}
                            </div>
                          </div>
                        </div>
                        <Space size="middle">
                          <Tooltip title="正常连接">
                            <Tag
                              color="success"
                              style={{ borderRadius: '4px', padding: '4px 12px' }}
                              icon={<CheckCircleOutlined />}
                            >
                              {connectedCount}
                            </Tag>
                          </Tooltip>
                          <Tooltip title="未连接">
                            <Tag
                              style={{ borderRadius: '4px', padding: '4px 12px' }}
                              icon={<DisconnectOutlined />}
                            >
                              {disconnectedCount}
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
                            总计: {switchData.cables.length}
                          </Tag>
                        </Space>
                      </div>
                    }
                    extra={
                      <Space size="small" onClick={e => e.stopPropagation()}>
                        <Tooltip title="添加接线">
                          <Button
                            type="text"
                            icon={<PlusOutlined />}
                            onClick={() => {
                              setEditingCable(null);
                              form.setFieldsValue({ sourceDeviceId: switchId });
                              setModalVisible(true);
                            }}
                            style={{ color: designTokens.colors.primary.main }}
                          />
                        </Tooltip>
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
                    <Table
                      columns={portColumns}
                      dataSource={switchPorts.map(port => ({
                        ...port,
                        switchData: switchData,
                      }))}
                      rowKey="portId"
                      pagination={false}
                      size="middle"
                      style={{
                        borderRadius: designTokens.borderRadius.md,
                        overflow: 'hidden',
                      }}
                    />
                  </Panel>
                );
              })}
            </Collapse>
          )}
        </Card>
      </motion.div>

      {/* 新增/编辑接线弹窗 */}
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
              <SwapOutlined />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 600 }}>
              {editingCable ? '编辑接线' : '新增接线'}
            </span>
          </div>
        }
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={700}
        okText="确定"
        cancelText="取消"
        closeIcon={<CloseButton />}
        styles={{
          content: { padding: '24px' },
          header: { marginBottom: 16 },
        }}
        okButtonProps={{
          style: {
            background: designTokens.colors.primary.gradient,
            border: 'none',
            borderRadius: designTokens.borderRadius.sm,
          },
        }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '16px' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Card
                title={<span style={{ fontSize: '14px', fontWeight: 500 }}>源设备 (起点)</span>}
                size="small"
                style={{
                  background: designTokens.colors.primary.bg,
                  border: `1px solid ${designTokens.colors.primary.light}30`,
                  borderRadius: designTokens.borderRadius.md,
                }}
                headStyle={{ background: 'transparent', borderBottom: 'none' }}
              >
                <Form.Item
                  name="sourceDeviceId"
                  label="设备"
                  rules={[{ required: true, message: '请选择源设备' }]}
                >
                  <Select
                    placeholder="输入关键词搜索交换机"
                    showSearch
                    loading={deviceSearching}
                    filterOption={false}
                    onSearch={handleDeviceSearch}
                    onDropdownVisibleChange={open => {
                      if (open && switchDevices.length === 0) {
                        fetchDevices();
                      }
                    }}
                    onChange={value => {
                      fetchDevicePorts(value);
                      form.setFieldsValue({ sourcePort: undefined });
                    }}
                  >
                    {switchDevices.map(device => (
                      <Option key={device.deviceId} value={device.deviceId}>
                        {device.name} ({device.deviceId})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="sourcePort"
                  label="端口"
                  rules={[{ required: true, message: '请选择源设备端口' }]}
                >
                  <Select
                    placeholder="请先选择源设备"
                    showSearch
                    filterOption={(input, option) => {
                      const ports = devicePorts[form.getFieldValue('sourceDeviceId')] || [];
                      const port = ports.find(p => p.portName === option.value);
                      if (!port) return false;
                      const searchText =
                        `${port.portName} ${port.portType} ${port.portSpeed}`.toLowerCase();
                      return searchText.indexOf(input.toLowerCase()) >= 0;
                    }}
                    disabled={!form.getFieldValue('sourceDeviceId')}
                  >
                    {(devicePorts[form.getFieldValue('sourceDeviceId')] || []).map(port => (
                      <Option key={port.portId} value={port.portName}>
                        {port.portName} ({port.portType} - {port.portSpeed})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Card>
            </Col>

            <Col span={12}>
              <Card
                title={<span style={{ fontSize: '14px', fontWeight: 500 }}>目标设备 (终点)</span>}
                size="small"
                style={{
                  background: designTokens.colors.success.bg,
                  border: `1px solid ${designTokens.colors.success.light}30`,
                  borderRadius: designTokens.borderRadius.md,
                }}
                headStyle={{ background: 'transparent', borderBottom: 'none' }}
              >
                <Form.Item
                  name="targetDeviceId"
                  label="设备"
                  rules={[{ required: true, message: '请选择目标设备' }]}
                >
                  <Select
                    placeholder="输入关键词搜索目标设备"
                    showSearch
                    loading={deviceSearching}
                    filterOption={false}
                    onSearch={handleDeviceSearch}
                    onDropdownVisibleChange={open => {
                      if (open && devices.length === 0) {
                        fetchDevices();
                      }
                    }}
                    onChange={value => {
                      fetchDevicePorts(value);
                      form.setFieldsValue({ targetPort: undefined });
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
                  name="targetPort"
                  label="端口"
                  rules={[{ required: true, message: '请选择目标设备端口' }]}
                >
                  <Select
                    placeholder="请先选择目标设备"
                    showSearch
                    filterOption={(input, option) => {
                      const ports = devicePorts[form.getFieldValue('targetDeviceId')] || [];
                      const port = ports.find(p => p.portName === option.value);
                      if (!port) return false;
                      const searchText =
                        `${port.portName} ${port.portType} ${port.portSpeed}`.toLowerCase();
                      return searchText.indexOf(input.toLowerCase()) >= 0;
                    }}
                    disabled={!form.getFieldValue('targetDeviceId')}
                  >
                    {(devicePorts[form.getFieldValue('targetDeviceId')] || []).map(port => (
                      <Option key={port.portId} value={port.portName}>
                        {port.portName} ({port.portType} - {port.portSpeed})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: '16px' }}>
            <Col span={8}>
              <Form.Item
                name="cableType"
                label="线缆类型"
                rules={[{ required: true, message: '请选择线缆类型' }]}
                initialValue="ethernet"
              >
                <Select placeholder="请选择线缆类型">
                  <Option value="ethernet">网线</Option>
                  <Option value="fiber">光纤</Option>
                  <Option value="copper">铜缆</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="cableLength" label="线缆长度(米)">
                <Input type="number" placeholder="请输入线缆长度" suffix="m" />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
                initialValue="normal"
              >
                <Select placeholder="请选择状态">
                  <Option value="normal">正常</Option>
                  <Option value="fault">故障</Option>
                  <Option value="disconnected">未连接</Option>
                </Select>
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
            <span style={{ fontSize: '18px', fontWeight: 600 }}>批量导入接线</span>
          </div>
        }
        open={importModalVisible}
        closeIcon={<CloseButton />}
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
            <p
              className="ant-upload-text"
              style={{ fontSize: '16px', color: designTokens.colors.neutral[700] }}
            >
              点击或拖拽文件到此处上传
            </p>
            <p className="ant-upload-hint" style={{ color: designTokens.colors.neutral[500] }}>
              支持 .xlsx, .xls, .csv 格式文件
            </p>
          </Upload.Dragger>

          <div
            style={{
              display: 'flex',
              gap: '24px',
              marginTop: '16px',
              padding: '16px',
              background: designTokens.colors.neutral[50],
              borderRadius: designTokens.borderRadius.md,
            }}
          >
            <Checkbox checked={skipExisting} onChange={e => setSkipExisting(e.target.checked)}>
              跳过已存在的接线
            </Checkbox>
            <Checkbox checked={updateExisting} onChange={e => setUpdateExisting(e.target.checked)}>
              更新已存在的接线
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
              <div
                style={{
                  marginBottom: '8px',
                  fontWeight: 500,
                  color: designTokens.colors.neutral[700],
                }}
              >
                数据预览（前10条）
              </div>
              <Table
                columns={[
                  { title: '源设备ID', dataIndex: '源设备ID', key: 'sourceDeviceId', width: 120 },
                  { title: '源设备端口', dataIndex: '源设备端口', key: 'sourcePort', width: 100 },
                  {
                    title: '目标设备ID',
                    dataIndex: '目标设备ID',
                    key: 'targetDeviceId',
                    width: 120,
                  },
                  {
                    title: '目标设备端口',
                    dataIndex: '目标设备端口',
                    key: 'targetPort',
                    width: 100,
                  },
                  {
                    title: '线缆类型',
                    dataIndex: '线缆类型',
                    key: 'cableType',
                    width: 90,
                    render: type => getCableTypeTag(type),
                  },
                  {
                    title: '状态',
                    dataIndex: '状态',
                    key: 'status',
                    width: 90,
                    render: status => getStatusTag(status),
                  },
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
                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '12px',
                    color: designTokens.colors.neutral[500],
                  }}
                >
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

      {/* 冲突提示弹窗 */}
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: designTokens.colors.error.main,
            }}
          >
            <ExclamationCircleOutlined style={{ fontSize: '24px' }} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>端口冲突警告</span>
          </div>
        }
        open={conflictModalVisible}
        closeIcon={<CloseButton />}
        onCancel={() => {
          setConflictModalVisible(false);
          setConflictInfo(null);
          setPendingSubmitValues(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setConflictModalVisible(false);
              setConflictInfo(null);
              setPendingSubmitValues(null);
            }}
            style={{ borderRadius: designTokens.borderRadius.sm }}
          >
            取消
          </Button>,
          <Button
            key="force"
            type="primary"
            danger
            onClick={handleForceSubmit}
            style={{ borderRadius: designTokens.borderRadius.sm }}
          >
            强制接管
          </Button>,
        ]}
        width={600}
      >
        {conflictInfo && (
          <div style={{ padding: '8px 0' }}>
            <Alert
              message="检测到端口冲突，以下端口已被占用"
              type="error"
              showIcon
              style={{ marginBottom: '16px', borderRadius: designTokens.borderRadius.md }}
            />
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {conflictInfo.map((conflict, index) => (
                <Card
                  key={index}
                  size="small"
                  style={{
                    marginBottom: '12px',
                    background: designTokens.colors.error.bg,
                    border: `1px solid ${designTokens.colors.error.light}50`,
                    borderRadius: designTokens.borderRadius.md,
                  }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <Tag color="error" style={{ borderRadius: '4px' }}>
                      {conflict.type === 'source'
                        ? '源端口'
                        : conflict.type === 'target'
                          ? '目标端口'
                          : '端口'}
                    </Tag>
                    <span
                      style={{
                        fontWeight: 600,
                        marginLeft: '8px',
                        color: designTokens.colors.neutral[800],
                      }}
                    >
                      {conflict.port}
                    </span>
                  </div>
                  {conflict.existingCable && (
                    <div
                      style={{
                        fontSize: '13px',
                        color: designTokens.colors.neutral[600],
                        paddingLeft: '8px',
                      }}
                    >
                      <div style={{ marginBottom: '4px' }}>当前连接：</div>
                      <div
                        style={{
                          paddingLeft: '12px',
                          borderLeft: `2px solid ${designTokens.colors.neutral[300]}`,
                        }}
                      >
                        <div>
                          <Text type="secondary">源设备：</Text>
                          <Text strong>
                            {conflict.existingCable.sourceDevice?.name ||
                              conflict.existingCable.sourceDeviceId}
                          </Text>
                          <Tag size="small" style={{ marginLeft: '8px' }}>
                            {conflict.existingCable.sourcePort}
                          </Tag>
                        </div>
                        <div style={{ marginTop: '4px' }}>
                          <Text type="secondary">目标设备：</Text>
                          <Text strong>
                            {conflict.existingCable.targetDevice?.name ||
                              conflict.existingCable.targetDeviceId}
                          </Text>
                          <Tag size="small" style={{ marginLeft: '8px' }}>
                            {conflict.existingCable.targetPort}
                          </Tag>
                        </div>
                        <div style={{ marginTop: '4px' }}>
                          <Text type="secondary">线缆类型：</Text>
                          {getCableTypeTag(conflict.existingCable.cableType)}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
            <Alert
              message='点击"强制接管"将断开原有连接并创建新接线。此操作不可恢复！'
              type="warning"
              showIcon
              style={{ marginTop: '16px', borderRadius: designTokens.borderRadius.md }}
            />
          </div>
        )}
      </Modal>
    </motion.div>
  );
}

export default CableManagement;
