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
  Pagination,
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
  FilterOutlined,
  ClearOutlined,
  CloudServerOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DisconnectOutlined,
  UpOutlined,
  DownOutlined,
  TagOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import api from '../api';
import { roomAPI, rackAPI } from '../api/cache';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import NetworkCardPanel from '../components/NetworkCardPanel';
import NetworkCardCreateModal from '../components/NetworkCardCreateModal';
import NetworkCardImportModal from '../components/NetworkCardImportModal';
import BatchImportModal from '../components/BatchImportModal';
import PortAddGuideModal from '../components/PortAddGuideModal';
import ServerNicCard from '../components/ServerNicCard';
import PortExportModal from '../components/PortExportModal';
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
  const [groupedPorts, setGroupedPorts] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    deviceId: '',
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPort, setEditingPort] = useState(null);
  const [form] = Form.useForm();

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importing, setImporting] = useState(false);
  const [skipExisting, setSkipExisting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);

  // 视图模式：list 或 panel
  // const [viewMode, setViewMode] = useState('list');

  // 网卡管理相关状态
  const [networkCardModalVisible, setNetworkCardModalVisible] = useState(false);
  const [serverNicListVisible, setServerNicListVisible] = useState(false);
  const [serverNicList, setServerNicList] = useState([]);
  const [serverNicLoading, setServerNicLoading] = useState(false);
  const [portCreateModalVisible, setPortCreateModalVisible] = useState(false);
  const [selectedDeviceForNic, setSelectedDeviceForNic] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [networkCardImportModalVisible, setNetworkCardImportModalVisible] = useState(false);
  const [batchImportModalVisible, setBatchImportModalVisible] = useState(false);
  const [portAddGuideModalVisible, setPortAddGuideModalVisible] = useState(false);
  const [portExportModalVisible, setPortExportModalVisible] = useState(false);

  // 展开的设备
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectDeviceModalVisible, setSelectDeviceModalVisible] = useState(false);
  const [selectedDeviceForPort, setSelectedDeviceForPort] = useState(null);
  const [nicList, setNicList] = useState([]);

  // 批量选择相关状态
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // 设备选择弹窗 Tab 状态
  const [deviceFilterType, setDeviceFilterType] = useState('all');
  const [guidedDeviceType, setGuidedDeviceType] = useState(null);
  const [devicePage, setDevicePage] = useState(1);

  // 机房机柜筛选状态
  const [roomList, setRoomList] = useState([]);
  const [rackList, setRackList] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedRackId, setSelectedRackId] = useState(null);

  const loadMoreRef = useRef(null);
  const hasMoreRef = useRef(true);
  const isLoadingRef = useRef(false);

  // 设备卡片分页状态
  const [deviceCardPage, setDeviceCardPage] = useState(1);
  const deviceCardPageSize = 10;
  const [deviceCardTotal, setDeviceCardTotal] = useState(0);

  // 分页和懒加载状态
  const [portPage, setPortPage] = useState(1);
  const [portPageSize, setPortPageSize] = useState(50);
  const [portTotal, setPortTotal] = useState(0);
  const [portLoading, setPortLoading] = useState(false);
  const [portLoadingMore, setPortLoadingMore] = useState(false);

  // 服务器网卡卡片列表状态
  const [serverNicSearchText, setServerNicSearchText] = useState('');
  const [serverNicRoomFilter, setServerNicRoomFilter] = useState('all');
  const [serverNicRackFilter, setServerNicRackFilter] = useState('all');
  const [serverNicCardPage, setServerNicCardPage] = useState(1);
  const serverNicCardPageSize = 12;

  const fetchPorts = useCallback(async (page = 1, append = false) => {
    const validPage = Number.isInteger(page) && page > 0 ? page : 1;
    const validPageSize = Number.isInteger(portPageSize) && portPageSize > 0 ? portPageSize : 50;
    try {
      if (append) {
        setPortLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params = {
        page: validPage,
        pageSize: validPageSize,
      };

      if (filters.deviceId) params.deviceId = filters.deviceId;

      const response = await api.get('/device-ports', { params });
      const portsData = response.ports || [];
      const total = response.total || 0;
      const filteredPorts = portsData;

      if (append) {
        setPorts(prev => [...prev, ...filteredPorts]);
      } else {
        setPorts(filteredPorts);
      }
      setPortTotal(total);
      setPortPage(page);
      hasMoreRef.current = page * portPageSize < total;
    } catch (error) {
      message.error('获取端口列表失败');
      console.error('获取端口列表失败:', error);
    } finally {
      setLoading(false);
      setPortLoadingMore(false);
    }
  }, [filters, portPageSize]);

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

  useEffect(() => {
    fetchPorts(1, false);
    fetchDevices();
  }, [fetchPorts, fetchDevices]);

  const handleLoadMore = useCallback(() => {
    if (!hasMoreRef.current || isLoadingRef.current || portLoadingMore) return;
    isLoadingRef.current = true;
    const nextPage = portPage + 1;
    fetchPorts(nextPage, true).then(() => {
      isLoadingRef.current = false;
    });
  }, [portPage, portLoadingMore, fetchPorts]);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreRef.current && !portLoadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [handleLoadMore, portLoadingMore]);

  const handlePageSizeChange = useCallback((newPage, newPageSize) => {
    setPortPageSize(newPageSize);
    setPortPage(1);
    fetchPorts(1, false);
  }, [fetchPorts]);

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

    const deviceIds = Object.keys(grouped);
    const newTotal = deviceIds.length;
    setDeviceCardTotal(newTotal);
    if (deviceCardPage > Math.ceil(newTotal / deviceCardPageSize)) {
      setDeviceCardPage(1);
    }
    setExpandedKeys([]);
  }, [ports, devices, deviceCardPage, deviceCardPageSize]);

  const handleSearch = useCallback(() => {
    setPortPage(1);
    setDeviceCardPage(1);
    hasMoreRef.current = true;
    fetchPorts(1, false);
  }, [fetchPorts]);

  const handleReset = useCallback(() => {
    setFilters({
      deviceId: '',
    });
    setPortPage(1);
    setDeviceCardPage(1);
    hasMoreRef.current = true;
    fetchPorts(1, false);
  }, [fetchPorts]);

  const handleAdd = () => {
    setEditingPort(null);
    form.resetFields();
    setPortAddGuideModalVisible(true);
  };

  const handleGuideSelectType = (type) => {
    setPortAddGuideModalVisible(false);
    setGuidedDeviceType(type);
    fetchDevices();
    fetchRoomsAndRacks();
    if (type === 'switch') {
      setDeviceFilterType('switch');
    } else if (type === 'server') {
      setDeviceFilterType('server');
    }
    setSelectDeviceModalVisible(true);
  };

  const fetchRoomsAndRacks = async () => {
    try {
      const [roomsData, racksData] = await Promise.all([
        roomAPI.list(),
        api.get('/racks', { params: { pageSize: 1000 } }),
      ]);
      setRoomList(roomsData.rooms || roomsData || []);
      setRackList(racksData.racks || racksData || []);
    } catch (error) {
      console.error('获取机房机柜数据失败:', error);
    }
  };

  const handleManageServerNics = async () => {
    setServerNicListVisible(true);
    setServerNicLoading(true);
    try {
      const [devicesResponse, portsResponse, nicsResponse, roomsData, racksData] = await Promise.all([
        api.get('/devices/all', { params: { type: 'server' } }),
        api.get('/device-ports', { params: { pageSize: 10000 } }),
        api.get('/network-cards'),
        roomAPI.list(),
        api.get('/racks', { params: { pageSize: 1000 } }),
      ]);
      setRoomList(roomsData.rooms || roomsData || []);
      setRackList(racksData.racks || racksData || []);

      const servers = devicesResponse.devices || devicesResponse || [];
      const ports = portsResponse.ports || portsResponse || [];
      let allNics = [];

      if (Array.isArray(nicsResponse)) {
        allNics = nicsResponse;
      } else if (nicsResponse && Array.isArray(nicsResponse.data)) {
        allNics = nicsResponse.data;
      } else if (nicsResponse && Array.isArray(nicsResponse.networkCards)) {
        allNics = nicsResponse.networkCards;
      }

      console.log('[DEBUG] handleManageServerNics:', {
        serversCount: servers.length,
        portsCount: ports.length,
        nicsCount: allNics.length,
        sampleServer: servers[0],
        sampleNic: allNics[0]
      });

      const serversWithPorts = new Set(ports.map(p => p.deviceId));
      const serversWithNics = servers.filter(server => {
        const serverNics = allNics.filter(nic => nic.deviceId === server.deviceId);
        return serverNics.length > 0;
      });

      const serversNeedingAttention = serversWithNics
        .filter(server => !serversWithPorts.has(server.deviceId))
        .map(server => {
          const serverNics = allNics.filter(nic => nic.deviceId === server.deviceId);
          return { ...server, nics: serverNics, nicCount: serverNics.length };
        });

      console.log('[DEBUG] serversWithNics:', serversWithNics.length, 'serversNeedingAttention:', serversNeedingAttention.length);

      setServerNicList(serversNeedingAttention);
    } catch (error) {
      console.error('获取服务器列表失败:', error);
      message.error('获取服务器列表失败: ' + (error.message || error));
    } finally {
      setServerNicLoading(false);
    }
  };

  const handleSelectDeviceForPort = device => {
    setSelectDeviceModalVisible(false);
    if (!device) return;

    const deviceType = getDeviceType(device);

    if (deviceType === 'server') {
      api.get(`/network-cards/device/${device.deviceId}`)
        .then(nicList => {
          const validNicList = Array.isArray(nicList) ? nicList : [];
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
        .then(nicList => {
          const validNicList = Array.isArray(nicList) ? nicList : [];
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
    fetchPorts(1, false);
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
          fetchPorts(1, false);
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
          fetchPorts(1, false);
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
            status: 'free',
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
            status: 'free',
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
      fetchPorts(1, false);
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

  const handleFileUpload = (file, onSuccess) => {
    console.log('handleFileUpload 被调用', file.name, file.size);
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
          parsedData = Papa.parse(data, {
            header: true,
            skipEmptyLines: true,
          }).data;
        } else {
          message.error('不支持的文件格式，请上传 .xlsx 或 .csv 文件');
          return;
        }

        if (parsedData.length === 0) {
          message.warning('文件内容为空，请检查文件内容');
          return;
        }

        const validatedResult = await validateImportData(parsedData);
        console.log('文件解析结果:', {
          总行数: parsedData.length,
          有效数据: validatedResult.validData.length,
          错误数据: validatedResult.errors.length,
          第一行数据: parsedData[0]
        });
        setImportPreview(validatedResult.validData);
        setImportErrors(validatedResult.errors);
        setImportProgress({ current: 0, total: validatedResult.validData.length });
        if (onSuccess) onSuccess();
      } catch (error) {
        message.error('文件解析失败');
        console.error('文件解析失败:', error);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const validateImportData = async data => {
    const validData = [];
    const allErrors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const result = await validatePortRow(row, i);

      if (result.valid) {
        validData.push(row);
      } else {
        allErrors.push(...result.errors.map(err => ({ ...err, originalRow: row })));
      }
    }

    if (allErrors.length > 0) {
      message.warning({
        content: `发现 ${allErrors.length} 个数据错误，请查看错误详情并修正后重新导入`,
        duration: 5,
      });
    }

    return { validData, errors: allErrors };
  };

  const validatePortRow = async (row, index) => {
    const rowNum = index + 2;
    const errors = [];

    if (!row['设备ID']) {
      errors.push({
        row: rowNum,
        field: '设备ID',
        value: row['设备ID'] || '(空)',
        error: '缺少必填字段',
        suggestion: '请填写设备ID，格式如：DEV001',
      });
    }

    if (!row['端口名称']) {
      errors.push({
        row: rowNum,
        field: '端口名称',
        value: row['端口名称'] || '(空)',
        error: '缺少必填字段',
        suggestion: '请填写端口名称，格式如：eth0/1 或 GigabitEthernet0/0/1',
      });
    }

    if (row['设备ID']) {
      const device = devices.find(d => d.deviceId === row['设备ID']);
      if (!device) {
        errors.push({
          row: rowNum,
          field: '设备ID',
          value: row['设备ID'],
          error: '设备不存在',
          suggestion: `设备ID "${row['设备ID']}" 未在系统中注册，请先在设备管理中添加该设备`,
        });
      }
    }

    const validPortTypes = ['RJ45', 'SFP', 'SFP+', 'SFP28', 'QSFP', 'QSFP28'];
    if (row['端口类型'] && !validPortTypes.includes(row['端口类型'])) {
      errors.push({
        row: rowNum,
        field: '端口类型',
        value: row['端口类型'],
        error: '无效的端口类型',
        suggestion: `端口类型 "${row['端口类型']}" 不支持。可选值：${validPortTypes.join('、')}`,
      });
    }

    const validPortSpeeds = ['100M', '1G', '10G', '25G', '40G', '100G'];
    if (row['端口速率'] && !validPortSpeeds.includes(row['端口速率'])) {
      errors.push({
        row: rowNum,
        field: '端口速率',
        value: row['端口速率'],
        error: '无效的端口速率',
        suggestion: `端口速率 "${row['端口速率']}" 不支持。可选值：${validPortSpeeds.join('、')}`,
      });
    }

    const validStatuses = ['空闲', '占用', '故障'];
    if (row['状态'] && !validStatuses.includes(row['状态'])) {
      errors.push({
        row: rowNum,
        field: '状态',
        value: row['状态'],
        error: '无效的状态值',
        suggestion: `状态 "${row['状态']}" 不支持。可选值：${validStatuses.join('、')}`,
      });
    }

    if (row['VLAN ID']) {
      const vlanPattern = /^\d+$/;
      if (!vlanPattern.test(row['VLAN ID'])) {
        errors.push({
          row: rowNum,
          field: 'VLAN ID',
          value: row['VLAN ID'],
          error: 'VLAN ID 格式错误',
          suggestion: 'VLAN ID 必须为数字，如：100、200',
        });
      } else {
        const vlanNum = parseInt(row['VLAN ID']);
        if (vlanNum < 1 || vlanNum > 4094) {
          errors.push({
            row: rowNum,
            field: 'VLAN ID',
            value: row['VLAN ID'],
            error: 'VLAN ID 范围超限',
            suggestion: 'VLAN ID 必须介于 1-4094 之间',
          });
        }
      }
    }

    if (row['网卡名称'] && row['设备ID']) {
      try {
        const nicResponse = await api.get('/network-cards/find', {
          params: { deviceId: row['设备ID'], name: row['网卡名称'] }
        });
        row._nicId = nicResponse.nicId || null;
      } catch (error) {
        row._nicId = null;
      }
    }

    if (row['设备ID']) {
      const device = devices.find(d => d.deviceId === row['设备ID']);
      if (device) {
        const isServer = device.type && device.type.toLowerCase().includes('server');
        if (isServer) {
          if (!row['网卡名称'] && !row._nicId) {
            errors.push({
              row: rowNum,
              field: '网卡名称',
              value: row['网卡名称'] || '(空)',
              error: '服务器端口必须关联网卡',
              suggestion: `服务器 "${device.name}" 的端口必须关联到网卡，请先在网卡管理中添加网卡，或在导入模板中填写网卡名称`,
            });
          } else if (row['网卡名称'] && !row._nicId) {
            errors.push({
              row: rowNum,
              field: '网卡名称',
              value: row['网卡名称'],
              error: '网卡不存在',
              suggestion: `服务器 "${device.name}" 的网卡"${row['网卡名称']}"不存在，请先在网卡管理中添加该网卡`,
            });
          }
        }
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
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

      fetchPorts(1, false);
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

  const handleExport = async ({ scope, format }) => {
    try {
      let exportData = [];
      let totalCount = 0;

      if (scope === 'all') {
        const params = {
          pageSize: 50000,
        };
        const response = await api.get('/device-ports/export/all', { params });
        exportData = response.ports || [];
        totalCount = response.total || exportData.length;
      } else if (scope === 'filtered') {
        const params = {
          deviceId: filters.deviceId || undefined,
          pageSize: 50000,
        };
        const response = await api.get('/device-ports/export/all', { params });
        exportData = response.ports || [];
        totalCount = response.total || exportData.length;
      } else {
        exportData = ports.map(port => {
          const device = devices.find(d => d.deviceId === port.deviceId);
          const statusMap = { free: '空闲', occupied: '占用', fault: '故障' };
          return {
            端口ID: port.portId,
            设备ID: port.deviceId,
            设备名称: device?.name || '-',
            设备类型: device?.type || '-',
            机房: '-',
            机架: '-',
            网卡名称: port.nicId || '-',
            端口名称: port.portName,
            端口类型: port.portType,
            端口速率: port.portSpeed,
            状态: statusMap[port.status] || port.status,
            VLAN_ID: port.vlanId || '-',
            描述: port.description || '-',
            创建时间: port.createdAt ? new Date(port.createdAt).toLocaleString('zh-CN') : '-',
          };
        });
        totalCount = exportData.length;
      }

      if (exportData.length === 0) {
        message.warning('没有可导出的端口数据');
        return;
      }

      if (format === 'csv') {
        const csvContent = Papa.unparse(exportData);
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `端口导出_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '端口数据');

        const colWidths = [
          { wch: 20 },
          { wch: 15 },
          { wch: 20 },
          { wch: 12 },
          { wch: 10 },
          { wch: 12 },
          { wch: 15 },
          { wch: 15 },
          { wch: 10 },
          { wch: 8 },
          { wch: 10 },
          { wch: 10 },
          { wch: 25 },
          { wch: 20 },
        ];
        worksheet['!cols'] = colWidths;

        XLSX.writeFile(workbook, `端口导出_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`);
      }

      message.success({
        content: `成功导出 ${totalCount} 个端口`,
        icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
      });
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
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
    const rackRoomMap = {};
    rackList.forEach(rack => {
      rackRoomMap[rack.rackId] = rack.roomId;
    });

    const filtered = devices.filter(d => {
      const type = getDeviceType(d);
      if (type !== 'switch' && type !== 'server') return false;
      if (deviceFilterType !== 'all' && type !== deviceFilterType) return false;
      if (selectedRackId && d.rackId !== selectedRackId) return false;
      if (selectedRoomId && d.rackId && rackRoomMap[d.rackId] !== selectedRoomId) return false;
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
  }, [devices, deviceFilterType, devicePage, rackList, selectedRoomId, selectedRackId]);

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
          {/* 功能区：过滤 + 操作按钮 */}
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
                <Col xs={24} sm={24} md={10} lg={8}>
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: designTokens.colors.neutral[600], fontWeight: 500 }}>
                    设备筛选
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

                <Col xs={24} sm={24} md={14} lg={16}>
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: designTokens.colors.neutral[600], fontWeight: 500 }}>
                    操作
                  </div>
                  <Space size="small" wrap>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAdd}
                      size="middle"
                      style={{
                        background: designTokens.colors.primary.gradient,
                        border: 'none',
                        borderRadius: designTokens.borderRadius.sm,
                      }}
                    >
                      新增端口
                    </Button>
                    <Button
                      icon={<CloudServerOutlined />}
                      onClick={handleManageServerNics}
                      size="middle"
                      style={{ borderRadius: designTokens.borderRadius.sm }}
                    >
                      管理网卡
                    </Button>
                    <Button
                      icon={<ImportOutlined />}
                      onClick={() => setBatchImportModalVisible(true)}
                      size="middle"
                      style={{ borderRadius: designTokens.borderRadius.sm }}
                    >
                      批量导入
                    </Button>
                    <Button
                      icon={<ExportOutlined />}
                      onClick={() => setPortExportModalVisible(true)}
                      size="middle"
                      style={{ borderRadius: designTokens.borderRadius.sm }}
                    >
                      导出
                    </Button>
                    <Tooltip title="刷新数据">
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchPorts}
                        loading={loading}
                        size="middle"
                        style={{ borderRadius: designTokens.borderRadius.sm }}
                      />
                    </Tooltip>
                  </Space>
                </Col>
              </Row>
            </Card>
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
                      点击下方按钮添加端口
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
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(groupedPorts).slice((deviceCardPage - 1) * deviceCardPageSize, deviceCardPage * deviceCardPageSize).map(([deviceId, data], index) => {
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
              {deviceCardTotal > deviceCardPageSize && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 0' }}>
                  <Pagination
                    current={deviceCardPage}
                    pageSize={deviceCardPageSize}
                    total={deviceCardTotal}
                    onChange={(page) => {
                      setDeviceCardPage(page);
                      setExpandedKeys([]);
                    }}
                    showSizeChanger={false}
                    showTotal={(total, range) => `第 ${range[0]}-${range[1]} 个，共 ${total} 个设备`}
                  />
                </div>
              )}
              {hasMoreRef.current && (
                <div ref={loadMoreRef} style={{ textAlign: 'center', padding: '20px' }}>
                  {portLoadingMore && <Spin tip="加载更多端口..." />}
                </div>
              )}
              {!hasMoreRef.current && ports.length > 0 && (
                <div style={{ textAlign: 'center', padding: '16px', color: '#999' }}>
                  已加载全部 {portTotal} 个端口
                </div>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* 新增/编辑端口弹窗 */}
      <Modal
        open={modalVisible}
        closeIcon={<CloseButton />}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedDeviceForPort(null);
        }}
        footer={null}
        width={600}
        zIndex={1050}
        style={{ borderRadius: '16px' }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{
          background: `linear-gradient(135deg, ${designTokens.colors.primary.main} 0%, ${designTokens.colors.primary.dark} 100%)`,
          padding: '20px 24px',
          borderRadius: '16px 16px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: designTokens.borderRadius.md,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <ApiOutlined />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>
              {editingPort ? '编辑端口' : '新增端口'}
            </span>
            {selectedDeviceForPort && (
              <Tag style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                fontWeight: 500,
              }}>
                {selectedDeviceForPort.name}
              </Tag>
            )}
          </div>
        </div>

        <div style={{ padding: '24px', background: '#fff' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '24px',
            gap: '8px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 500,
              background: designTokens.colors.primary.bg,
              color: designTokens.colors.primary.main,
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: designTokens.colors.primary.main,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 600,
              }}>1</div>
              <span>基本信息</span>
            </div>
            <div style={{
              width: '40px',
              height: '2px',
              background: designTokens.colors.primary.main,
              alignSelf: 'center',
            }} />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 500,
              background: designTokens.colors.neutral[100],
              color: designTokens.colors.neutral[500],
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'transparent',
                color: designTokens.colors.neutral[500],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 600,
                border: `1px solid ${designTokens.colors.neutral[400]}`,
              }}>2</div>
              <span>高级配置</span>
            </div>
          </div>

          <Form form={form} layout="vertical">
            <Alert
              message="格式说明"
              description={
                <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                  <div>• <strong>单个端口：</strong>eth0/1、gigabitethernet1/0/1</div>
                  <div>• <strong>端口范围：</strong>1/0/1-1/0/48（创建 1/0/1 到 1/0/48 共48个端口）</div>
                </div>
              }
              type="info"
              showIcon
              style={{
                borderRadius: '8px',
                background: designTokens.colors.info.bg,
                border: `1px solid ${designTokens.colors.info.light}40`,
                marginBottom: '16px',
              }}
            />

            <div style={{
              background: designTokens.colors.neutral[50],
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              border: `1px solid ${designTokens.colors.neutral[200]}`,
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: designTokens.colors.neutral[800],
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <TagOutlined style={{ color: designTokens.colors.primary.main }} />
                端口标识
              </div>

              {selectedDeviceForPort ? (
                <>
                  <Form.Item label={<span style={{ fontSize: '13px', fontWeight: 500 }}>设备</span>}>
                    <Input
                      value={selectedDeviceForPort.name}
                      disabled
                      addonAfter={
                        <span style={{ color: isServerDevice(selectedDeviceForPort) ? designTokens.colors.warning.main : designTokens.colors.success.main }}>
                          {isServerDevice(selectedDeviceForPort) ? '服务器' : isSwitchDevice(selectedDeviceForPort) ? '交换机' : '设备'}
                        </span>
                      }
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Item>

                  <div style={{ display: 'grid', gridTemplateColumns: isServerDevice(selectedDeviceForPort) ? '1fr 1fr' : '1fr', gap: '16px' }}>
                    {isServerDevice(selectedDeviceForPort) && (
                      <Form.Item
                        name="nicId"
                        label={<span style={{ fontSize: '13px', fontWeight: 500 }}>所属网卡</span>}
                        rules={[{ required: true, message: '请选择网卡' }]}
                      >
                        <Select
                          placeholder="请选择网卡"
                          size="large"
                          style={{ borderRadius: '8px' }}
                        >
                          {nicList.map(nic => (
                            <Option key={nic.nicId} value={nic.nicId}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                                <div>
                                  <div style={{ fontWeight: 500 }}>{nic.name}</div>
                                  {nic.speed && (
                                    <div style={{ fontSize: '12px', color: designTokens.colors.neutral[500] }}>
                                      {nic.speed}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    )}

                    <Form.Item
                      name="portName"
                      label={<span style={{ fontSize: '13px', fontWeight: 500 }}>端口名称</span>}
                      rules={[{ required: true, message: '请输入端口名称' }]}
                    >
                      <Input
                        placeholder="例如: eth0/1 或 1/0/1-1/0/48"
                        size="large"
                        prefix={<TagOutlined style={{ color: designTokens.colors.neutral[400] }} />}
                        suffix={
                          <Tooltip title="支持批量添加，例如: 1/0/1-1/0/48 将创建 48 个端口">
                            <InfoCircleOutlined style={{ color: designTokens.colors.neutral[400] }} />
                          </Tooltip>
                        }
                        style={{ borderRadius: '8px' }}
                      />
                    </Form.Item>
                  </div>
                </>
              ) : (
                <Form.Item
                  name="deviceId"
                  label={<span style={{ fontSize: '13px', fontWeight: 500 }}>设备</span>}
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
                    size="large"
                    style={{ borderRadius: '8px' }}
                  >
                    {devices.map(device => (
                      <Option key={device.deviceId} value={device.deviceId}>
                        {device.name} ({device.deviceId})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </div>

            <div style={{
              background: designTokens.colors.neutral[50],
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              border: `1px solid ${designTokens.colors.neutral[200]}`,
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: designTokens.colors.neutral[800],
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <ThunderboltOutlined style={{ color: designTokens.colors.primary.main }} />
                端口属性
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Item
                  name="portType"
                  label={<span style={{ fontSize: '13px', fontWeight: 500 }}>端口类型</span>}
                  rules={[{ required: true, message: '请选择端口类型' }]}
                  initialValue="RJ45"
                >
                  <Select size="large" style={{ borderRadius: '8px' }}>
                    <Option value="RJ45">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: designTokens.colors.device.server }} />
                        RJ45
                      </div>
                    </Option>
                    <Option value="SFP">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: designTokens.colors.device.switch }} />
                        SFP
                      </div>
                    </Option>
                    <Option value="SFP+">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: designTokens.colors.purple.main }} />
                        SFP+
                      </div>
                    </Option>
                    <Option value="SFP28">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: designTokens.colors.info.main }} />
                        SFP28
                      </div>
                    </Option>
                    <Option value="QSFP">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: designTokens.colors.warning.main }} />
                        QSFP
                      </div>
                    </Option>
                    <Option value="QSFP28">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: designTokens.colors.secondary.main }} />
                        QSFP28
                      </div>
                    </Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="vlanId"
                  label={<span style={{ fontSize: '13px', fontWeight: 500 }}>VLAN ID</span>}
                >
                  <InputNumber
                    placeholder="1-4094"
                    min={1}
                    max={4094}
                    size="large"
                    style={{ width: '100%', borderRadius: '8px' }}
                  />
                </Form.Item>
              </div>

              {!editingPort && (
                <div style={{
                  background: designTokens.colors.success.bg,
                  border: `1px solid ${designTokens.colors.success.light}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <CheckCircleOutlined style={{ color: designTokens.colors.success.main, fontSize: '18px' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: designTokens.colors.success.dark }}>
                      新建端口默认状态为空闲
                    </div>
                    <div style={{ fontSize: '12px', color: designTokens.colors.success.main }}>
                      接线后状态将自动更新为占用
                    </div>
                  </div>
                </div>
              )}

              {editingPort && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Form.Item
                    name="status"
                    label={<span style={{ fontSize: '13px', fontWeight: 500 }}>状态</span>}
                    rules={[{ required: true, message: '请选择状态' }]}
                  >
                    <Select size="large" style={{ borderRadius: '8px' }}>
                      <Option value="free"><Tag color="success">空闲</Tag></Option>
                      <Option value="occupied"><Tag color="warning">占用</Tag></Option>
                      <Option value="fault"><Tag color="error">故障</Tag></Option>
                    </Select>
                  </Form.Item>
                </div>
              )}
            </div>

            <div style={{
              background: designTokens.colors.neutral[50],
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              border: `1px solid ${designTokens.colors.neutral[200]}`,
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: designTokens.colors.neutral[800],
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <FileTextOutlined style={{ color: designTokens.colors.primary.main }} />
                描述信息
              </div>
              <Form.Item name="description" style={{ marginBottom: 0 }}>
                <TextArea
                  rows={3}
                  placeholder="请输入描述信息（可选）"
                  style={{ borderRadius: '8px', resize: 'none' }}
                />
              </Form.Item>
            </div>
          </Form>
        </div>

        <div style={{
          padding: '16px 24px',
          background: designTokens.colors.neutral[50],
          borderTop: `1px solid ${designTokens.colors.neutral[200]}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '0 0 16px 16px',
        }}>
          <div style={{ fontSize: '12px', color: designTokens.colors.neutral[500] }}>
            {editingPort ? '编辑模式下仅修改单个端口' : '支持批量创建端口'}
          </div>
          <Space>
            <Button
              size="large"
              onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setSelectedDeviceForPort(null);
              }}
              style={{ borderRadius: '8px', minWidth: '80px' }}
            >
              取消
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={handleSubmit}
              icon={<PlusOutlined />}
              style={{
                background: `linear-gradient(135deg, ${designTokens.colors.primary.main} 0%, ${designTokens.colors.primary.dark} 100%)`,
                border: 'none',
                borderRadius: '8px',
                boxShadow: `0 4px 12px ${designTokens.colors.primary.main}40`,
                minWidth: '120px',
              }}
            >
              {editingPort ? '保存' : '创建'}
            </Button>
          </Space>
        </div>
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
          setImportErrors([]);
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
          <Alert
            message="操作说明"
            description={
              <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                <div><strong>适用范围：</strong>批量导入端口适用于<span style={{ color: '#1890ff', fontWeight: 600 }}>所有设备类型</span>（交换机、服务器、路由器、存储等）</div>
                <div style={{ marginTop: '8px' }}><strong>前置条件：</strong></div>
                <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                  <div>• <strong>交换机端口：</strong>可直接导入，无需前置操作</div>
                  <div>• <strong>服务器端口：</strong>必须先在<span style={{ color: '#1890ff', fontWeight: 600 }}>网卡管理</span>中添加网卡，服务器端口与网卡是<span style={{ color: '#ff4d4f', fontWeight: 600 }}>层级关系</span>：设备 → 网卡 → 端口</div>
                </div>
                <div style={{ marginTop: '8px' }}><strong>操作步骤：</strong></div>
                <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                  <div>1. 点击「下载模板」获取标准Excel/CSV文件</div>
                  <div>2. 按模板格式填写端口信息，<span style={{ color: '#ff4d4f', fontWeight: 600 }}>设备ID</span>和<span style={{ color: '#ff4d4f', fontWeight: 600 }}>端口名称</span>为必填项</div>
                  <div>3. 服务器端口可在「网卡名称」列填写对应的网卡名称（如eth0），不填则归入「未分组端口」</div>
                  <div>4. 点击上传区域选择文件，或直接拖拽文件到上传区域</div>
                  <div>5. 系统自动校验数据，可预览前10条数据及错误详情</div>
                  <div>6. 选择导入策略（跳过/更新已存在），点击「开始导入」</div>
                </div>
                <div style={{ marginTop: '8px' }}><strong>字段说明：</strong></div>
                <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                  <div>• <strong>设备ID</strong>（必填）：设备的唯一标识，如DEV001</div>
                  <div>• <strong>端口名称</strong>（必填）：端口的名称或标识，如eth0/1、GigabitEthernet0/0/1</div>
                  <div>• <strong>网卡名称</strong>（选填）：服务器端口所属的网卡名称，如eth0；交换机端口留空</div>
                  <div>• <strong>端口类型</strong>（选填）：如RJ45、LC、SC、FC、SFP+、QSFP28等</div>
                  <div>• <strong>端口速率</strong>（选填）：如1G、10G、25G、100G、40G等</div>
                  <div>• <strong>状态</strong>（选填）：空闲/占用/故障，默认为空闲</div>
                  <div>• <strong>VLAN ID</strong>（选填）：端口所属的VLAN编号，如100</div>
                  <div>• <strong>描述</strong>（选填）：备注信息</div>
                </div>
                <div style={{ marginTop: '8px', color: '#faad14' }}><strong>注意事项：</strong></div>
                <div style={{ paddingLeft: '12px', marginTop: '4px', color: '#faad14' }}>
                  <div>• 同一设备下端口名称不可重复</div>
                  <div>• 批量导入支持最多50000条记录</div>
                  <div>• 状态字段请使用：空闲/占用/故障，勿使用其他值</div>
                </div>
              </div>
            }
            type="info"
            showIcon
            style={{
              borderRadius: designTokens.borderRadius.md,
              background: designTokens.colors.info.bg,
              border: `1px solid ${designTokens.colors.info.light}40`,
              marginBottom: '16px',
            }}
          />
          <Upload.Dragger
            name="file"
            accept=".xlsx,.xls,.csv"
            showUploadList={false}
            beforeUpload={file => {
              handleFileUpload(file, null);
              return false;
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

          {importErrors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ marginTop: '16px' }}
            >
              <Alert
                message={`发现 ${importErrors.length} 个错误`}
                description={
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <Table
                      columns={[
                        { title: '行号', dataIndex: 'row', key: 'row', width: 70, render: row => <Tag color="red">{row}</Tag> },
                        { title: '字段', dataIndex: 'field', key: 'field', width: 100, render: field => <Text strong>{field}</Text> },
                        { title: '错误值', dataIndex: 'value', key: 'value', width: 120, render: val => <Text code>{val}</Text> },
                        { title: '错误原因', dataIndex: 'error', key: 'error', render: err => <Text type="danger">{err}</Text> },
                        { title: '修正建议', dataIndex: 'suggestion', key: 'suggestion', render: sug => <Text type="secondary">{sug}</Text> },
                      ]}
                      dataSource={importErrors}
                      rowKey={(record, index) => `error-${index}`}
                      pagination={{
                        pageSize: 5,
                        size: 'small',
                        showSizeChanger: false,
                        showTotal: total => `共 ${total} 条错误`,
                      }}
                      size="small"
                      scroll={{ x: 600 }}
                      style={{ marginTop: '8px' }}
                    />
                  </div>
                }
                type="error"
                showIcon
                style={{ borderRadius: designTokens.borderRadius.md }}
              />
            </motion.div>
          )}

          {importPreview.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ marginTop: '24px' }}
            >
              <Alert
                message={
                  <span>
                    成功解析 {importPreview.length} 条有效数据
                    {importErrors.length > 0 && <span style={{ color: '#ff4d4f', marginLeft: 8 }}>（{importErrors.length} 条错误）</span>}
                  </span>
                }
                type={importErrors.length > 0 ? 'warning' : 'success'}
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
          setGuidedDeviceType(null);
          setSelectedRoomId(null);
          setSelectedRackId(null);
        }}
        footer={null}
        width={620}
        style={{ top: 100 }}
        bodyStyle={{ padding: '0 24px 24px' }}
      >
        {guidedDeviceType && (
          <div
            style={{
              margin: '0 -24px 16px',
              padding: '12px 24px',
              background: guidedDeviceType === 'switch'
                ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
                : 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
              borderBottom: `1px solid ${guidedDeviceType === 'switch' ? '#bbf7d0' : '#c7d2fe'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {guidedDeviceType === 'switch' ? (
                <ApiOutlined style={{ fontSize: '16px', color: '#059669' }} />
              ) : (
                <CloudServerOutlined style={{ fontSize: '16px', color: '#6366f1' }} />
              )}
              <span style={{
                fontSize: '13px',
                fontWeight: 500,
                color: guidedDeviceType === 'switch' ? '#047857' : '#4f46e5',
              }}>
                {guidedDeviceType === 'switch' ? '添加交换机端口' : '添加服务器端口'}
              </span>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {guidedDeviceType === 'switch' ? '（交换机端口可直接创建，无需关联网卡）' : '（服务器端口需关联网卡）'}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
          <Input
            placeholder="搜索设备名称、IP或位置..."
            prefix={<SearchOutlined style={{ color: '#999' }} />}
            allowClear
            onChange={e => handleDeviceSearch(e.target.value)}
            style={{
              flex: 1,
              borderRadius: '10px',
              border: '1px solid #e8ecf4',
              height: '40px',
              fontSize: '14px',
            }}
          />
          <Select
            placeholder="按机房筛选"
            allowClear
            value={selectedRoomId}
            onChange={value => {
              setSelectedRoomId(value);
              setSelectedRackId(null);
            }}
            style={{ width: 140 }}
            size="middle"
          >
            {roomList.map(room => (
              <Select.Option key={room.roomId} value={room.roomId}>
                {room.name}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="按机柜筛选"
            allowClear
            value={selectedRackId}
            onChange={value => setSelectedRackId(value)}
            style={{ width: 140 }}
            size="middle"
            disabled={!selectedRoomId}
          >
            {rackList
              .filter(rack => !selectedRoomId || rack.roomId === selectedRoomId)
              .map(rack => (
                <Select.Option key={rack.rackId} value={rack.rackId}>
                  {rack.name}
                </Select.Option>
              ))}
          </Select>
        </div>

        {(() => {
          const rackRoomMap = {};
          rackList.forEach(rack => {
            rackRoomMap[rack.rackId] = rack.roomId;
          });

          const allDevices = devices.filter(d => {
            const type = getDeviceType(d);
            if (type !== 'switch' && type !== 'server') return false;
            if (selectedRackId && d.rackId !== selectedRackId) return false;
            if (selectedRoomId && d.rackId && rackRoomMap[d.rackId] !== selectedRoomId) return false;
            return true;
          });
          const switchCount = allDevices.filter(d => getDeviceType(d) === 'switch').length;
          const serverCount = allDevices.filter(d => getDeviceType(d) === 'server').length;
          const showSwitchTab = guidedDeviceType === null || guidedDeviceType === 'switch';
          const showServerTab = guidedDeviceType === null || guidedDeviceType === 'server';

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
              {guidedDeviceType === null && (
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
              )}
              {showSwitchTab && (
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
              )}
              {showServerTab && (
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
              )}
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

      {/* 服务器网卡列表弹窗 */}
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
              服务器网卡管理
            </span>
          </div>
        }
        open={serverNicListVisible}
        closeIcon={<CloseButton />}
        onCancel={() => {
          setServerNicListVisible(false);
          setServerNicList([]);
          setServerNicSearchText('');
          setServerNicRoomFilter('all');
          setServerNicRackFilter('all');
          setServerNicCardPage(1);
        }}
        footer={null}
        width={900}
        destroyOnClose
      >
        {serverNicLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px', color: '#999' }}>加载中...</div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap',
              }}
            >
              <Input
                placeholder="搜索服务器名称或ID..."
                prefix={<SearchOutlined style={{ color: designTokens.colors.primary.main }} />}
                value={serverNicSearchText}
                onChange={e => {
                  setServerNicSearchText(e.target.value);
                  setServerNicCardPage(1);
                }}
                allowClear
                style={{
                  width: '260px',
                  borderRadius: designTokens.borderRadius.md,
                }}
              />
              <Select
                value={serverNicRoomFilter}
                onChange={value => {
                  setServerNicRoomFilter(value);
                  setServerNicRackFilter('all');
                  setServerNicCardPage(1);
                }}
                style={{ width: '140px' }}
                placeholder="选择机房"
              >
                <Option value="all">全部机房</Option>
                {roomList.map(room => (
                  <Option key={room.roomId} value={room.roomId}>{room.name}</Option>
                ))}
              </Select>
              <Select
                value={serverNicRackFilter}
                onChange={value => {
                  setServerNicRackFilter(value);
                  setServerNicCardPage(1);
                }}
                style={{ width: '140px' }}
                placeholder="选择机柜"
                disabled={serverNicRoomFilter === 'all'}
              >
                <Option value="all">全部机柜</Option>
                {rackList
                  .filter(rack => serverNicRoomFilter === 'all' || rack.roomId === serverNicRoomFilter)
                  .map(rack => (
                    <Option key={rack.rackId} value={rack.rackId}>{rack.name}</Option>
                  ))}
              </Select>
              <div style={{ marginLeft: 'auto', color: designTokens.colors.text.secondary, fontSize: '13px', alignSelf: 'center' }}>
                共 {serverNicList.length} 台设备
              </div>
            </div>

            {serverNicList.length === 0 ? (
              <Empty description="暂无服务器数据" />
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '16px',
                    maxHeight: '520px',
                    overflowY: 'auto',
                    padding: '4px',
                  }}
                >
                  {serverNicList
                    .filter(server => {
                      const searchMatch =
                        !serverNicSearchText ||
                        server.name?.toLowerCase().includes(serverNicSearchText.toLowerCase()) ||
                        server.deviceId?.toLowerCase().includes(serverNicSearchText.toLowerCase());
                      const roomMatch = serverNicRoomFilter === 'all' || server.roomId === serverNicRoomFilter;
                      const rackMatch = serverNicRackFilter === 'all' || server.rackId === serverNicRackFilter;
                      return searchMatch && roomMatch && rackMatch;
                    })
                    .slice(
                      (serverNicCardPage - 1) * serverNicCardPageSize,
                      serverNicCardPage * serverNicCardPageSize
                    )
                    .map(server => (
                      <ServerNicCard
                        key={server.deviceId}
                        server={server}
                        onManage={() => {
                          setSelectedDeviceForNic(server);
                          setServerNicListVisible(false);
                          setNetworkCardModalVisible(true);
                        }}
                      />
                    ))}
                </div>

                {serverNicList.filter(server => {
                  const searchMatch =
                    !serverNicSearchText ||
                    server.name?.toLowerCase().includes(serverNicSearchText.toLowerCase()) ||
                    server.deviceId?.toLowerCase().includes(serverNicSearchText.toLowerCase());
                  const roomMatch = serverNicRoomFilter === 'all' || server.roomId === serverNicRoomFilter;
                  const rackMatch = serverNicRackFilter === 'all' || server.rackId === serverNicRackFilter;
                  return searchMatch && roomMatch && rackMatch;
                }).length > serverNicCardPageSize && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      marginTop: '16px',
                      paddingTop: '12px',
                      borderTop: `1px solid ${designTokens.colors.border.light}`,
                    }}
                  >
                    <Pagination
                      current={serverNicCardPage}
                      pageSize={serverNicCardPageSize}
                      total={serverNicList.filter(server => {
                        const searchMatch =
                          !serverNicSearchText ||
                          server.name?.toLowerCase().includes(serverNicSearchText.toLowerCase()) ||
                          server.deviceId?.toLowerCase().includes(serverNicSearchText.toLowerCase());
                        const typeMatch = serverNicTypeFilter === 'all' || server.type === serverNicTypeFilter;
                        return searchMatch && typeMatch;
                      }).length}
                      onChange={page => setServerNicCardPage(page)}
                      showSizeChanger={false}
                      showQuickJumper
                      size="small"
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Modal>

      {/* 批量导入选择弹窗 */}
      <BatchImportModal
        visible={batchImportModalVisible}
        onClose={() => setBatchImportModalVisible(false)}
        onImportNetworkCard={() => setNetworkCardImportModalVisible(true)}
        onImportPort={() => {
          handleImport();
        }}
      />

      {/* 网卡批量导入弹窗 */}
      <NetworkCardImportModal
        visible={networkCardImportModalVisible}
        onClose={() => setNetworkCardImportModalVisible(false)}
        onSuccess={() => {
          message.success({
            content: '网卡导入成功',
            icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
          });
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* 端口新增引导弹窗 */}
      <PortAddGuideModal
        visible={portAddGuideModalVisible}
        onClose={() => setPortAddGuideModalVisible(false)}
        onSelectType={handleGuideSelectType}
      />

      {/* 端口导出弹窗 */}
      <PortExportModal
        visible={portExportModalVisible}
        filters={filters}
        totalCount={portTotal}
        currentPageCount={ports.length}
        selectedCount={selectedRowKeys.length}
        onExport={handleExport}
        onCancel={() => setPortExportModalVisible(false)}
      />
    </motion.div>
  );
}

export default PortManagement;
