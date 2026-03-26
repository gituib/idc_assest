import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Divider,
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
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons';
import api from '../api';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import VirtualDeviceList from '../components/VirtualDeviceList';
import NetworkCardPanel from '../components/NetworkCardPanel';
import NetworkCardCreateModal from '../components/NetworkCardCreateModal';
import { designTokens } from '../config/theme';
import CloseButton from '../components/CloseButton';
import { debounce } from '../utils/common';

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
};

function PortManagement() {
  const [ports, setPorts] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceSearching, setDeviceSearching] = useState(false);
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
  const [selectDeviceModalVisible, setSelectDeviceModalVisible] = useState(false);
  const [selectedDeviceForPort, setSelectedDeviceForPort] = useState(null);
  const [nicList, setNicList] = useState([]);

  // 批量选择相关状态
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // 设备选择弹窗 Tab 状态
  const [deviceFilterType, setDeviceFilterType] = useState('all');
  const [devicePage, setDevicePage] = useState(1);
  const loadMoreRef = useRef(null);
  const hasMoreRef = useRef(true);
  const isLoadingRef = useRef(false);

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

      const response = await api.get('/device-ports', { params });
      const portsData = response.ports || response || [];
      
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

  const fetchDevices = useCallback(async (keyword = '') => {
    try {
      setDeviceSearching(true);
      if (keyword && keyword.trim()) {
        const params = { keyword: keyword.trim() };
        const response = await api.get('/devices/all', { params });
        setDevices(response.devices || response || []);
      } else {
        const response = await api.get('/devices/all');
        setDevices(response.devices || response || []);
      }
    } catch (error) {
      message.error('获取设备列表失败');
      console.error('获取设备列表失败:', error);
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

  const fetchCables = useCallback(async () => {
    try {
      const response = await api.get('/cables');
      setCables(response.cables || response || []);
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
          device: port.device || devices.find(d => d.deviceId === deviceId),
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
    fetchDevices();
    setSelectDeviceModalVisible(true);
  };

  const handleSelectDeviceForPort = device => {
    setSelectDeviceModalVisible(false);
    if (!device) return;

    const deviceType = getDeviceType(device);

    if (deviceType === 'server') {
      api.get(`/network-cards/device/${device.deviceId}`)
        .then(nicList => {
          const validNicList = Array.isArray(nicList) ? nicList : (nicList.data || []);
          if (validNicList.length === 0) {
            message.warning({
              content: '该服务器尚未添加网卡，请先在网卡管理中添加网卡',
              icon: <ExclamationCircleOutlined style={{ color: designTokens.colors.warning.main }} />,
              duration: 3,
            });
            handleManageNetworkCards(device);
          } else {
            setNicList(validNicList);
            setSelectedDeviceForPort(device);
            form.resetFields();
            form.setFieldsValue({ deviceId: device.deviceId });
            setModalVisible(true);
          }
        })
        .catch(() => {
          message.warning({
            content: '该服务器尚未添加网卡，请先在网卡管理中添加网卡',
            icon: <ExclamationCircleOutlined style={{ color: designTokens.colors.warning.main }} />,
            duration: 3,
          });
          handleManageNetworkCards(device);
        });
    } else {
      setSelectedDeviceForPort(device);
      form.resetFields();
      form.setFieldsValue({ deviceId: device.deviceId });
      setModalVisible(true);
    }
  };

  const handleAddPortForDevice = device => {
    const deviceType = getDeviceType(device);

    if (deviceType === 'server') {
      api.get(`/network-cards/device/${device.deviceId}`)
        .then(response => {
          const nicList = response.data || [];
          if (nicList.length === 0) {
            message.warning({
              content: '该服务器尚未添加网卡，请先在网卡管理中添加网卡',
              icon: <ExclamationCircleOutlined style={{ color: designTokens.colors.warning.main }} />,
              duration: 3,
            });
            handleManageNetworkCards(device);
          } else {
            setNicList(nicList);
            setSelectedDeviceForPort(device);
            form.resetFields();
            form.setFieldsValue({ deviceId: device.deviceId });
            setModalVisible(true);
          }
        })
        .catch(() => {
          message.warning({
            content: '该服务器尚未添加网卡，请先在网卡管理中添加网卡',
            icon: <ExclamationCircleOutlined style={{ color: designTokens.colors.warning.main }} />,
            duration: 3,
          });
          handleManageNetworkCards(device);
        });
    } else {
      setSelectedDeviceForPort(device);
      form.resetFields();
      form.setFieldsValue({ deviceId: device.deviceId });
      setModalVisible(true);
    }
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
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个端口吗？此操作不可恢复！',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/device-ports/${portId}`);
          message.success({
            content: '删除成功',
            icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
          });
          fetchPorts();
        } catch (error) {
          const errorMsg = error.response?.data?.error || '';
          if (errorMsg.includes('关联的接线记录')) {
            message.error('该端口存在关联的接线记录，请先删除关联的接线');
          } else {
            message.error('删除失败');
          }
          console.error('删除失败:', error);
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的端口');
      return;
    }

    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个端口吗？此操作不可恢复！`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await api.post('/device-ports/batch-delete', {
            portIds: selectedRowKeys,
          });
          message.success({
            content: `成功删除 ${selectedRowKeys.length} 个端口`,
            icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
          });
          setSelectedRowKeys([]);
          fetchPorts();
        } catch (error) {
          const errorMsg = error.response?.data?.error || '';
          if (errorMsg.includes('关联的接线记录')) {
            message.error('部分端口存在关联的接线记录，请先删除关联的接线');
          } else {
            message.error('批量删除失败');
          }
          console.error('批量删除失败:', error);
        }
      },
    });
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

  const generateUniquePortId = () => {
    return `PORT-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingPort) {
        await api.put(`/device-ports/${editingPort.portId}`, values);
        message.success({
          content: '更新成功',
          icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
        });
      } else {
        const portNames = parsePortRange(values.portName);
        const targetDeviceId = selectedDeviceForPort ? selectedDeviceForPort.deviceId : values.deviceId;

        if (portNames.length > 1) {
          const portsData = portNames.map((name, index) => ({
            portId: generateUniquePortId(),
            deviceId: targetDeviceId,
            portName: name,
            portType: values.portType,
            portSpeed: values.portSpeed,
            status: values.status,
            vlanId: values.vlanId,
            description: values.description,
            nicId: values.nicId || null,
          }));

          const result = await api.post('/device-ports/batch', { ports: portsData });
          const success = result.success ?? 0;
          const failed = result.failed ?? 0;

          if (failed > 0) {
            message.warning(`批量创建完成！成功 ${success} 个，失败 ${failed} 个`);
          } else {
            message.success({
              content: `成功创建 ${success} 个端口`,
              icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
            });
          }
        } else {
          const result = await api.post('/device-ports', {
            deviceId: targetDeviceId,
            portName: portNames[0],
            portType: values.portType,
            portSpeed: values.portSpeed,
            status: values.status,
            vlanId: values.vlanId,
            description: values.description,
            nicId: values.nicId || null,
          });
          message.success({
            content: '创建成功',
            icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
          });
        }
      }

      setModalVisible(false);
      form.resetFields();
      setSelectedDeviceForPort(null);
      fetchPorts();
    } catch (error) {
      message.error(error.response?.data?.error || editingPort ? '更新失败' : '创建失败');
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

    let nicId = null;
    if (row['网卡名称']) {
      try {
        const nicResponse = await api.get('/network-cards/find', {
          params: { deviceId: row['设备ID'], name: row['网卡名称'] }
        });
        nicId = nicResponse.nicId || null;
      } catch (error) {
        nicId = null;
      }
    }

    row._nicId = nicId;
    return { valid: true };
  };

  const handleBatchImport = async () => {
    if (importPreview.length === 0) {
      message.warning('请先选择要导入的数据');
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: importPreview.length });

    let progressInterval;
    let currentProgress = 0;

    try {
      const statusMap = {
        空闲: 'free',
        占用: 'occupied',
        故障: 'fault',
      };

      const portsData = importPreview.map((row, index) => ({
        portId: generateUniquePortId(),
        deviceId: row['设备ID'],
        nicId: row._nicId || null,
        portName: row['端口名称'],
        portType: row['端口类型'],
        portSpeed: row['端口速率'],
        status: statusMap[row['状态']] || 'free',
        vlanId: row['VLAN ID'],
        description: row['描述'],
      }));

      progressInterval = setInterval(() => {
        currentProgress = Math.min(currentProgress + Math.random() * 15, 85);
        setImportProgress(prev => ({
          ...prev,
          current: Math.floor((currentProgress / 100) * importPreview.length)
        }));
      }, 200);

      const response = await api.post('/device-ports/batch', {
        ports: portsData,
        skipExisting,
        updateExisting
      });
      const { total, success, failed, skipped = 0, updated = 0, errors } = response;

      clearInterval(progressInterval);
      setImportProgress({ current: importPreview.length, total: importPreview.length });

      let msgContent = '';
      if (updated > 0) {
        msgContent += `更新 ${updated} 个，`;
      }
      if (skipped > 0) {
        msgContent += `跳过 ${skipped} 个，`;
      }
      if (success > 0) {
        msgContent += `新增 ${success - updated} 个，`;
      }
      if (failed > 0) {
        msgContent += `失败 ${failed} 个`;
        console.error('导入错误:', errors);
      }

      if (failed > 0 && success === 0 && skipped === 0 && updated === 0) {
        message.error(`导入失败！${msgContent}`);
      } else {
        message.success({
          content: `导入完成！${msgContent}`,
          icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
        });
      }

      fetchPorts();
      setImportModalVisible(false);
      setImportPreview([]);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('批量导入失败:', error);
      message.error('批量导入失败，请检查数据格式');
    } finally {
      clearInterval(progressInterval);
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        设备ID: 'DEV001',
        端口名称: 'eth0/1',
        网卡名称: '',
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

  const handleExport = () => {
    if (ports.length === 0) {
      message.warning('没有可导出的端口数据');
      return;
    }

    const statusMap = {
      free: '空闲',
      occupied: '占用',
      fault: '故障',
    };

    const exportData = ports.map(port => {
      const device = devices.find(d => d.deviceId === port.deviceId);
      return {
        '设备ID': port.deviceId,
        '设备名称': device?.name || '-',
        '端口名称': port.portName,
        '端口类型': port.portType,
        '端口速率': port.portSpeed,
        '状态': statusMap[port.status] || port.status,
        'VLAN ID': port.vlanId || '-',
        '描述': port.description || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '端口数据');

    const colWidths = [
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 8 },
      { wch: 10 },
      { wch: 25 },
    ];
    worksheet['!cols'] = colWidths;

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(workbook, `端口导出_${timestamp}.xlsx`);

    message.success({
      content: `成功导出 ${ports.length} 个端口`,
      icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
    });
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
      title: '所属网卡',
      dataIndex: 'networkCard',
      key: 'networkCard',
      width: 120,
      render: (nic, record) => {
        const isServer = record.device?.type?.toLowerCase()?.includes('server');
        if (!isServer) return <Text type="secondary">-</Text>;
        if (!nic) return <Text type="secondary" style={{ color: '#ff4d4f' }}>未关联</Text>;
        return <Text style={{ color: '#667eea' }}>{nic.name}</Text>;
      },
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

  const getDeviceType = device => {
    if (!device?.type) return 'unknown';
    const type = device.type.toLowerCase();
    if (type.includes('switch')) return 'switch';
    if (type.includes('server')) return 'server';
    return 'other';
  };

  const isSwitchDevice = device => getDeviceType(device) === 'switch';
  const isServerDevice = device => getDeviceType(device) === 'server';

  // 过滤后的设备列表（带分页）
  const paginatedDevices = useMemo(() => {
    const filtered = devices.filter(d => {
      const type = getDeviceType(d);
      if (type !== 'switch' && type !== 'server') return false;
      if (deviceFilterType !== 'all' && type !== deviceFilterType) return false;
      return true;
    });
    const pageSize = 100;
    const end = devicePage * pageSize;
    const hasMore = end < filtered.length;
    hasMoreRef.current = hasMore;
    return {
      list: filtered.slice(0, end),
      total: filtered.length,
      hasMore
    };
  }, [devices, deviceFilterType, devicePage]);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isLoadingRef.current) {
          isLoadingRef.current = true;
          setDevicePage(p => p + 1);
          setTimeout(() => { isLoadingRef.current = false; }, 200);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, []);

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
                    placeholder="输入关键词搜索设备"
                    style={{ width: '100%' }}
                    value={filters.deviceId || undefined}
                    onChange={value => setFilters(prev => ({ ...prev, deviceId: value }))}
                    allowClear
                    showSearch
                    loading={deviceSearching}
                    filterOption={false}
                    onSearch={handleDeviceSearch}
                    onDropdownVisibleChange={open => {
                      if (open && devices.length === 0) {
                        fetchDevices();
                      }
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
                onClick={handleExport}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(groupedPorts).map(([deviceId, data], index) => {
                const device = data.device;
                const devicePorts = data.ports || [];
                const freeCount = devicePorts.filter(p => p.status === 'free').length;
                const occupiedCount = devicePorts.filter(p => p.status === 'occupied').length;
                const faultCount = devicePorts.filter(p => p.status === 'fault').length;
                const isExpanded = expandedKeys.includes(deviceId);

                return (
                  <Card
                    key={deviceId}
                    style={{
                      borderRadius: designTokens.borderRadius.lg,
                      border: `1px solid ${designTokens.colors.neutral[200]}`,
                      overflow: 'hidden',
                    }}
                    bodyStyle={{ padding: 0 }}
                  >
                    {/* 设备头部 */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        background: isExpanded ? designTokens.colors.primary.light : '#fff',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedKeys(prev => prev.filter(key => key !== deviceId));
                        } else {
                          setExpandedKeys(prev => [...prev, deviceId]);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: designTokens.borderRadius.md,
                            background: isServerDevice(device)
                              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              : isSwitchDevice(device)
                              ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                              : designTokens.colors.primary.gradient,
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '16px', color: designTokens.colors.neutral[800] }}>
                              {device?.name || '未知设备'}
                            </span>
                            <Tag color={isServerDevice(device) ? 'blue' : isSwitchDevice(device) ? 'green' : 'default'} style={{ marginLeft: '4px' }}>
                              {isServerDevice(device) ? '服务器' : isSwitchDevice(device) ? '交换机' : '设备'}
                            </Tag>
                          </div>
                          <div style={{ fontSize: '13px', color: designTokens.colors.neutral[500], marginTop: '2px' }}>
                            {device?.deviceId || '-'} · {device?.model || device?.type || '设备'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Space size="small">
                          <Tooltip title="空闲">
                            <Tag color="success" style={{ borderRadius: '4px', padding: '4px 12px' }} icon={<CheckCircleOutlined />}>
                              {freeCount}
                            </Tag>
                          </Tooltip>
                          <Tooltip title="占用">
                            <Tag color="processing" style={{ borderRadius: '4px', padding: '4px 12px' }} icon={<AppstoreOutlined />}>
                              {occupiedCount}
                            </Tag>
                          </Tooltip>
                          {faultCount > 0 && (
                            <Tooltip title="故障">
                              <Tag color="error" style={{ borderRadius: '4px', padding: '4px 12px' }} icon={<ExclamationCircleOutlined />}>
                                {faultCount}
                              </Tag>
                            </Tooltip>
                          )}
                          <Tag color="blue" style={{ borderRadius: '4px', padding: '4px 12px', fontWeight: 500 }}>
                            总计: {devicePorts.length}
                          </Tag>
                        </Space>
                        <Divider type="vertical" style={{ height: '24px', margin: '0 8px' }} />
                        <Space size="small">
                          <Tooltip title={isServerDevice(device) ? '添加端口' : '添加端口（交换机端口无需关联网卡）'}>
                            <Button
                              type="text"
                              icon={<PlusOutlined />}
                              onClick={e => {
                                e.stopPropagation();
                                handleAddPortForDevice(device);
                              }}
                              style={{ color: designTokens.colors.primary.main }}
                            />
                          </Tooltip>
                          {isServerDevice(device) && (
                            <Tooltip title="网卡管理">
                              <Button
                                type="text"
                                icon={<CloudServerOutlined />}
                                onClick={e => {
                                  e.stopPropagation();
                                  handleManageNetworkCards(device);
                                }}
                                style={{ color: designTokens.colors.primary.main }}
                              />
                            </Tooltip>
                          )}
                          <Button
                            type="text"
                            size="small"
                            icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                            style={{ color: designTokens.colors.neutral[600], minWidth: '70px' }}
                          >
                            {isExpanded ? '收起' : '展开'}
                          </Button>
                        </Space>
                      </div>
                    </div>

                    {/* 端口列表 */}
                    {isExpanded && (
                      <div style={{ padding: '16px 20px', borderTop: `1px solid ${designTokens.colors.neutral[200]}` }}>
                        {devicePorts.length > 0 ? (
                          <div>
                            {selectedRowKeys.length > 0 && (
                              <div style={{ marginBottom: '12px', padding: '8px 12px', background: designTokens.colors.error.bg, borderRadius: designTokens.borderRadius.sm, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text type="secondary">已选择 {selectedRowKeys.length} 个端口</Text>
                                <Button danger size="small" icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                                  批量删除
                                </Button>
                              </div>
                            )}
                            <Table
                              columns={portColumns}
                              dataSource={devicePorts}
                              rowKey="portId"
                              rowSelection={{
                                selectedRowKeys,
                                onChange: setSelectedRowKeys,
                              }}
                              pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showTotal: total => `共 ${total} 个端口`,
                                pageSizeOptions: ['10', '20', '50', '100'],
                              }}
                              size="middle"
                              scroll={{ x: 1000 }}
                            />
                          </div>
                        ) : (
                          <Empty description="暂无端口数据" style={{ padding: '24px 0' }} />
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
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
        closeIcon={<CloseButton />}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedDeviceForPort(null);
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
          {selectedDeviceForPort ? (
            <>
              <Form.Item label="设备">
                <Input
                  value={selectedDeviceForPort.name}
                  disabled
                  addonAfter={
                    <span style={{ color: isServerDevice(selectedDeviceForPort) ? designTokens.colors.warning.main : designTokens.colors.success.main }}>
                      {isServerDevice(selectedDeviceForPort) ? '服务器' : isSwitchDevice(selectedDeviceForPort) ? '交换机' : '设备'}
                    </span>
                  }
                />
              </Form.Item>
              {isServerDevice(selectedDeviceForPort) && (
                <Form.Item
                  name="nicId"
                  label="所属网卡"
                  rules={[{ required: true, message: '请选择网卡' }]}
                >
                  <Select placeholder="请选择要关联网卡的端口">
                    {nicList.map(nic => (
                      <Option key={nic.nicId} value={nic.nicId}>
                        {nic.name} {nic.speed ? `(${nic.speed})` : ''}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </>
          ) : (
            <Form.Item
              name="deviceId"
              label="设备"
              rules={[{ required: true, message: '请选择设备' }]}
            >
              <Select
                placeholder="输入关键词搜索设备"
                showSearch
                loading={deviceSearching}
                filterOption={false}
                onSearch={handleDeviceSearch}
                onDropdownVisibleChange={open => {
                  if (open && devices.length === 0) {
                    fetchDevices();
                  }
                }}
                disabled={!!editingPort}
              >
                {devices.map(device => (
                  <Option key={device.deviceId} value={device.deviceId}>
                    {device.name} ({device.deviceId})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

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
                rowKey={(record, index) => `import-row-${index}`}
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

      {/* 设备选择弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              }}
            >
              <ApiOutlined style={{ fontSize: '20px' }} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a2e', lineHeight: 1.3 }}>
                选择设备
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                为端口选择所属设备
              </div>
            </div>
          </div>
        }
        open={selectDeviceModalVisible}
        closeIcon={<CloseButton />}
        onCancel={() => {
          setSelectDeviceModalVisible(false);
          setDeviceFilterType('all');
          setDevicePage(1);
          setSelectedRowKeys([]);
        }}
        footer={null}
        width={620}
        style={{ top: 100 }}
        bodyStyle={{ padding: '0 24px 24px' }}
      >
        <div
          style={{
            margin: '0 -24px 20px',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)',
            borderBottom: '1px solid #e8ecf4',
          }}
        >
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <ApiOutlined style={{ fontSize: '14px' }} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>交换机</div>
                <div style={{ fontSize: '11px', color: '#999' }}>可直接创建端口</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <CloudServerOutlined style={{ fontSize: '14px' }} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>服务器</div>
                <div style={{ fontSize: '11px', color: '#999' }}>需先添加网卡</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Input
            placeholder="搜索设备名称、IP或位置..."
            prefix={<SearchOutlined style={{ color: '#999' }} />}
            allowClear
            onChange={e => handleDeviceSearch(e.target.value)}
            style={{
              borderRadius: '10px',
              border: '1px solid #e8ecf4',
              height: '44px',
              fontSize: '14px',
            }}
          />
        </div>

        {(() => {
          const allDevices = devices.filter(d => {
            const type = getDeviceType(d);
            return type === 'switch' || type === 'server';
          });
          const switchCount = allDevices.filter(d => getDeviceType(d) === 'switch').length;
          const serverCount = allDevices.filter(d => getDeviceType(d) === 'server').length;

          return (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                background: '#f5f7fa',
                padding: '4px',
                borderRadius: '12px',
              }}
            >
              <button
                onClick={() => { setDeviceFilterType('all'); setDevicePage(1); }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: deviceFilterType === 'all'
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'transparent',
                  color: deviceFilterType === 'all' ? '#fff' : '#666',
                  boxShadow: deviceFilterType === 'all' ? '0 2px 8px rgba(102, 126, 234, 0.3)' : 'none',
                }}
              >
                全部 ({allDevices.length})
              </button>
              <button
                onClick={() => { setDeviceFilterType('switch'); setDevicePage(1); }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: deviceFilterType === 'switch'
                    ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                    : 'transparent',
                  color: deviceFilterType === 'switch' ? '#fff' : '#666',
                  boxShadow: deviceFilterType === 'switch' ? '0 2px 8px rgba(17, 153, 142, 0.3)' : 'none',
                }}
              >
                交换机 ({switchCount})
              </button>
              <button
                onClick={() => { setDeviceFilterType('server'); setDevicePage(1); }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: deviceFilterType === 'server'
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'transparent',
                  color: deviceFilterType === 'server' ? '#fff' : '#666',
                  boxShadow: deviceFilterType === 'server' ? '0 2px 8px rgba(102, 126, 234, 0.3)' : 'none',
                }}
              >
                服务器 ({serverCount})
              </button>
            </div>
          );
        })()}

        <div style={{ maxHeight: '480px', overflowY: 'auto', margin: '0 -24px', padding: '0 16px' }}>
          {deviceSearching ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px', color: '#999', fontSize: '13px' }}>加载设备中...</div>
            </div>
          ) : paginatedDevices.list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <SearchOutlined style={{ fontSize: '32px', color: '#ccc' }} />
              </div>
              <div style={{ fontSize: '15px', color: '#666', marginBottom: '4px' }}>未找到设备</div>
              <div style={{ fontSize: '13px', color: '#999' }}>
                {deviceFilterType === 'all'
                  ? '暂无可添加端口的设备'
                  : deviceFilterType === 'switch'
                  ? '暂无可添加端口的交换机'
                  : '暂无可添加端口的服务器'}
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '12px', paddingLeft: '4px' }}>
                共 {paginatedDevices.total} 个设备
              </div>
              {paginatedDevices.list.map(device => (
                <div
                  key={device.deviceId}
                  onClick={() => handleSelectDeviceForPort(device)}
                  style={{
                    padding: '14px 16px',
                    marginBottom: '10px',
                    borderRadius: '12px',
                    border: '1px solid #e8ecf4',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: '#fff',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.background = '#f8f9ff';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e8ecf4';
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: isServerDevice(device)
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '22px',
                        boxShadow: isServerDevice(device)
                          ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                          : '0 4px 12px rgba(17, 153, 142, 0.3)',
                        flexShrink: 0,
                      }}
                    >
                      {getDeviceIcon(device)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '15px',
                          color: '#1a1a2e',
                          marginBottom: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {device.name || '未命名设备'}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#999',
                          display: 'flex',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {device.Rack?.Room?.name && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>📍</span>
                            {device.Rack.Room.name}
                          </span>
                        )}
                        {device.Rack?.name && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🗄️</span>
                            {device.Rack.name}
                          </span>
                        )}
                        {device.ipAddress && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🌐</span>
                            {device.ipAddress}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 500,
                        background: isServerDevice(device)
                          ? 'rgba(102, 126, 234, 0.1)'
                          : 'rgba(17, 153, 142, 0.1)',
                        color: isServerDevice(device) ? '#667eea' : '#11998e',
                        flexShrink: 0,
                      }}
                    >
                      {isServerDevice(device) ? '服务器' : '交换机'}
                    </div>
                  </div>
                </div>
              ))}

              {paginatedDevices.hasMore && (
                <div
                  ref={loadMoreRef}
                  style={{
                    textAlign: 'center',
                    padding: '20px 0',
                    cursor: 'pointer',
                  }}
                  onClick={() => setDevicePage(p => p + 1)}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '20px',
                      background: '#f5f7fa',
                      color: '#666',
                      fontSize: '13px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#667eea';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#f5f7fa';
                      e.currentTarget.style.color = '#666';
                    }}
                  >
                    <span>点击加载更多</span>
                    <span style={{ fontSize: '11px' }}>({Math.min(devicePage * 100, paginatedDevices.total)} / {paginatedDevices.total})</span>
                  </div>
                </div>
              )}

              {!paginatedDevices.hasMore && paginatedDevices.total > 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '20px 0',
                    color: '#999',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ marginBottom: '4px', color: '#667eea', fontWeight: 500 }}>
                    已加载全部
                  </div>
                  <div>共 {paginatedDevices.total} 个设备</div>
                </div>
              )}
            </>
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
        closeIcon={<CloseButton />}
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
