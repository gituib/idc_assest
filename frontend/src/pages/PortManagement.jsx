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
  Tabs,
  Badge,
  List,
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
  EyeOutlined,
  CompressOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import PortPanel from '../components/PortPanel';
import VirtualDeviceList from '../components/VirtualDeviceList';
import NetworkCardPanel from '../components/NetworkCardPanel';
import NetworkCardCreateModal from '../components/NetworkCardCreateModal';
import PortCreateModal from '../components/PortCreateModal';

const { Option } = Select;
const { Panel } = Collapse;

const designTokens = {
  colors: {
    primary: {
      main: '#667eea',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      light: '#8b9ff0',
      dark: '#4f5db8',
    },
    success: {
      main: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      light: '#34d399',
      dark: '#047857',
    },
    warning: {
      main: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      light: '#fbbf24',
      dark: '#b45309',
    },
    error: {
      main: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      light: '#f87171',
      dark: '#b91c1c',
    },
  },
  borderRadius: {
    small: '6px',
    medium: '10px',
    large: '16px',
  },
  shadows: {
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
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
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPort, setEditingPort] = useState(null);
  const [form] = Form.useForm();

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFileList, setImportFileList] = useState([]);
  const [importPreview, setImportPreview] = useState([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importing, setImporting] = useState(false);
  const [skipExisting, setSkipExisting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);

  // 视图模式：list 或 panel
  const [viewMode, setViewMode] = useState('list');

  // 面板视图优化状态
  const [panelFilters, setPanelFilters] = useState({
    deviceType: 'all',
    searchText: '',
    showOnlyOccupied: false,
  });
  const [visibleDeviceCount, setVisibleDeviceCount] = useState(10);
  const [expandedDevices, setExpandedDevices] = useState({});

  // 网卡管理相关状态
  const [networkCardModalVisible, setNetworkCardModalVisible] = useState(false);
  const [portCreateModalVisible, setPortCreateModalVisible] = useState(false);
  const [selectedDeviceForNic, setSelectedDeviceForNic] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchPorts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        pageSize: 1000, // 获取所有端口，不分页
      };

      if (filters.deviceId) params.deviceId = filters.deviceId;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.portType !== 'all') params.portType = filters.portType;
      if (filters.portSpeed !== 'all') params.portSpeed = filters.portSpeed;

      const response = await axios.get('/api/device-ports', { params });
      setPorts(response.data.ports || response.data || []);
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
    // 自动选中当前设备
    form.setFieldsValue({
      deviceId: device.deviceId,
    });
    setModalVisible(true);
  };

  // 打开网卡管理模态框
  const handleManageNetworkCards = device => {
    setSelectedDeviceForNic(device);
    setNetworkCardModalVisible(true);
  };

  // 打开添加网卡模态框
  const handleAddNetworkCard = device => {
    setSelectedDeviceForNic(device);
    setPortCreateModalVisible(true);
  };

  // 网卡/端口创建成功回调
  const handleNicSuccess = () => {
    message.success('操作成功');
    setRefreshTrigger(prev => prev + 1);
    fetchPorts();
  };

  const handlePortSuccess = () => {
    message.success('端口添加成功');
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
      message.success('删除成功');
      fetchPorts();
    } catch (error) {
      message.error('删除失败');
      console.error('删除失败:', error);
    }
  };

  // 解析端口名称范围，例如 "1/0/1-1/0/48" -> ["1/0/1", "1/0/2", ..., "1/0/48"]
  const parsePortRange = portName => {
    const rangeMatch = portName.match(/^(.*?)\/(\d+)-\1\/(\d+)$/);
    if (rangeMatch) {
      const prefix = rangeMatch[1];
      const start = parseInt(rangeMatch[2]);
      const end = parseInt(rangeMatch[3]);

      if (start <= end && end - start < 100) {
        // 限制最多100个端口
        return Array.from({ length: end - start + 1 }, (_, i) => `${prefix}/${start + i}`);
      }
    }
    return [portName]; // 如果不是范围格式，返回原名称
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingPort) {
        await axios.put(`/api/device-ports/${editingPort.portId}`, values);
        message.success('更新成功');
      } else {
        // 解析端口名称范围
        const portNames = parsePortRange(values.portName);

        if (portNames.length > 1) {
          // 批量创建端口
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
            message.success(`成功创建 ${success} 个端口`);
          }
        } else {
          // 单个创建
          await axios.post('/api/device-ports', values);
          message.success('创建成功');
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
    const errors = [];

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
        message.success(`导入完成！成功 ${success} 条`);
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
      free: { color: 'success', text: '空闲' },
      occupied: { color: 'processing', text: '占用' },
      fault: { color: 'error', text: '故障' },
      空闲: { color: 'success', text: '空闲' },
      占用: { color: 'processing', text: '占用' },
      故障: { color: 'error', text: '故障' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
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
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const portColumns = [
    {
      title: '端口名称',
      dataIndex: 'portName',
      key: 'portName',
      width: 120,
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
      render: vlanId => vlanId || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: text => (
        <Tooltip title={text}>
          <span>{text || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个端口吗？"
            onConfirm={() => handleDelete(record.portId)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Card
        style={{
          borderRadius: designTokens.borderRadius.large,
          boxShadow: designTokens.shadows.medium,
          marginBottom: 16,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="选择设备"
              style={{ width: 200 }}
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

            <Select
              placeholder="端口类型"
              style={{ width: 120 }}
              value={filters.portType}
              onChange={value => setFilters(prev => ({ ...prev, portType: value }))}
            >
              <Option value="all">全部</Option>
              <Option value="RJ45">RJ45</Option>
              <Option value="SFP">SFP</Option>
              <Option value="SFP+">SFP+</Option>
              <Option value="SFP28">SFP28</Option>
              <Option value="QSFP">QSFP</Option>
              <Option value="QSFP28">QSFP28</Option>
            </Select>

            <Select
              placeholder="端口速率"
              style={{ width: 120 }}
              value={filters.portSpeed}
              onChange={value => setFilters(prev => ({ ...prev, portSpeed: value }))}
            >
              <Option value="all">全部</Option>
              <Option value="100M">100M</Option>
              <Option value="1G">1G</Option>
              <Option value="10G">10G</Option>
              <Option value="25G">25G</Option>
              <Option value="40G">40G</Option>
              <Option value="100G">100G</Option>
            </Select>

            <Select
              placeholder="状态"
              style={{ width: 120 }}
              value={filters.status}
              onChange={value => setFilters(prev => ({ ...prev, status: value }))}
            >
              <Option value="all">全部</Option>
              <Option value="free">空闲</Option>
              <Option value="occupied">占用</Option>
              <Option value="fault">故障</Option>
            </Select>

            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              style={{ background: designTokens.colors.primary.gradient, border: 'none' }}
            >
              搜索
            </Button>

            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        </div>

        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              style={{ background: designTokens.colors.primary.gradient, border: 'none' }}
            >
              新增端口
            </Button>

            <Button
              type="primary"
              icon={<ImportOutlined />}
              onClick={handleImport}
              style={{ background: designTokens.colors.primary.gradient, border: 'none' }}
            >
              批量导入
            </Button>

            <Button icon={<ExportOutlined />}>导出</Button>
          </Space>

          <Space>
            <Button.Group>
              <Button
                type={viewMode === 'list' ? 'primary' : 'default'}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode('list')}
              >
                列表
              </Button>
              <Button
                type={viewMode === 'panel' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode('panel')}
              >
                面板
              </Button>
            </Button.Group>
          </Space>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" tip="加载端口数据中..." />
          </div>
        ) : Object.keys(groupedPorts).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <Empty description="暂无端口数据" />
          </div>
        ) : viewMode === 'panel' ? (
          // 面板视图 - 使用虚拟滚动优化
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
          // 列表视图
          <Collapse
            defaultActiveKey={Object.keys(groupedPorts).slice(0, 5)}
            style={{ background: '#f5f5f5' }}
          >
            {Object.entries(groupedPorts).map(([deviceId, data]) => {
              const device = data.device;
              const devicePorts = data.ports || [];
              const freeCount = devicePorts.filter(p => p.status === 'free').length;
              const occupiedCount = devicePorts.filter(p => p.status === 'occupied').length;
              const faultCount = devicePorts.filter(p => p.status === 'fault').length;

              return (
                <Panel
                  key={deviceId}
                  header={
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: designTokens.borderRadius.medium,
                            background: designTokens.colors.primary.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '18px',
                          }}
                        >
                          {device?.type?.toLowerCase()?.includes('server')
                            ? '🖥️'
                            : device?.type?.toLowerCase()?.includes('switch')
                              ? '🔀'
                              : device?.type?.toLowerCase()?.includes('router')
                                ? '🌐'
                                : '📦'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '16px', color: '#1e293b' }}>
                            {device?.name || '未知设备'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {device?.deviceId || '-'}
                          </div>
                        </div>
                      </div>
                      <Space size="small">
                        <Tag color="success">空闲: {freeCount}</Tag>
                        <Tag color="processing">占用: {occupiedCount}</Tag>
                        <Tag color="error">故障: {faultCount}</Tag>
                        <Tag color="blue">总计: {devicePorts.length}</Tag>
                        {/* 网卡管理按钮 - 只有服务器显示 */}
                        {device?.type?.toLowerCase()?.includes('server') && (
                          <Button
                            type="primary"
                            size="small"
                            icon={<CloudServerOutlined />}
                            onClick={e => {
                              e.stopPropagation();
                              handleManageNetworkCards(device);
                            }}
                            style={{
                              background: designTokens.colors.primary.gradient,
                              border: 'none',
                            }}
                          >
                            网卡管理
                          </Button>
                        )}
                      </Space>
                    </div>
                  }
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
                    size="small"
                    scroll={{ x: 1000 }}
                  />
                </Panel>
              );
            })}
          </Collapse>
        )}
      </Card>

      <Modal
        title={editingPort ? '编辑端口' : '新增端口'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
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

          <Form.Item name="vlanId" label="VLAN ID">
            <InputNumber placeholder="请输入VLAN ID" min={1} max={4094} />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量导入端口"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportPreview([]);
          setImportProgress({ current: 0, total: 0 });
        }}
        width={900}
        footer={[
          <Button key="cancel" onClick={() => setImportModalVisible(false)}>
            取消
          </Button>,
          <Button key="download" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载模板
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<ImportOutlined />}
            onClick={handleBatchImport}
            loading={importing}
            disabled={importPreview.length === 0}
            style={{ background: designTokens.colors.primary.gradient, border: 'none' }}
          >
            开始导入
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 16 }}>
            <Upload.Dragger
              name="file"
              accept=".xlsx,.xls,.csv"
              beforeUpload={() => false}
              customRequest={({ file, onSuccess }) => {
                handleFileUpload({ file, onSuccess });
              }}
            >
              <p className="ant-upload-drag-icon">
                <UploadIcon />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
              <p className="ant-upload-hint">支持 .xlsx, .xls, .csv 格式</p>
            </Upload.Dragger>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: 16 }}>
            <Checkbox checked={skipExisting} onChange={e => setSkipExisting(e.target.checked)}>
              跳过已存在的端口
            </Checkbox>
            <Checkbox checked={updateExisting} onChange={e => setUpdateExisting(e.target.checked)}>
              更新已存在的端口
            </Checkbox>
          </div>

          {importPreview.length > 0 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text strong>数据预览（前10条）</Text>
                  <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                    下载模板
                  </Button>
                </div>
                <Table
                  columns={[
                    {
                      title: '设备ID',
                      dataIndex: '设备ID',
                      key: 'deviceId',
                      width: 150,
                    },
                    {
                      title: '端口名称',
                      dataIndex: '端口名称',
                      key: 'portName',
                      width: 120,
                    },
                    {
                      title: '端口类型',
                      dataIndex: '端口类型',
                      key: 'portType',
                      width: 100,
                      render: type => getPortTypeTag(type),
                    },
                    {
                      title: '端口速率',
                      dataIndex: '端口速率',
                      key: 'portSpeed',
                      width: 100,
                    },
                    {
                      title: '状态',
                      dataIndex: '状态',
                      key: 'status',
                      width: 100,
                      render: status => getStatusTag(status),
                    },
                    {
                      title: 'VLAN ID',
                      dataIndex: 'VLAN ID',
                      key: 'vlanId',
                      width: 100,
                      render: vlanId => vlanId || '-',
                    },
                    {
                      title: '描述',
                      dataIndex: '描述',
                      key: 'description',
                      ellipsis: true,
                      render: text => (
                        <Tooltip title={text}>
                          <span>{text || '-'}</span>
                        </Tooltip>
                      ),
                    },
                  ]}
                  dataSource={importPreview.slice(0, 10)}
                  rowKey={(record, index) => index}
                  pagination={false}
                  size="small"
                  scroll={{ x: 1000 }}
                />
              </div>

              {importPreview.length > 10 && (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Text type="secondary">仅显示前10条数据，共 {importPreview.length} 条</Text>
                </div>
              )}
            </>
          )}

          {importing && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <Spin size="large" tip="导入中..." />
              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={Math.round((importProgress.current / importProgress.total) * 100)}
                  status="active"
                  strokeColor={{
                    '0%': designTokens.colors.primary.main,
                    '100%': designTokens.colors.success.main,
                  }}
                />
                <div style={{ marginTop: 8 }}>
                  <Text>
                    正在导入 {importProgress.current} / {importProgress.total} 条数据...
                  </Text>
                  {importProgress.current > 0 && (
                    <Text type="secondary">
                      预计剩余时间：{Math.ceil((importProgress.total - importProgress.current) / 5)}{' '}
                      秒
                    </Text>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 网卡管理模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloudServerOutlined style={{ color: '#667eea' }} />
            <span>网卡管理 - {selectedDeviceForNic?.name}</span>
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
    </div>
  );
}

export default PortManagement;
