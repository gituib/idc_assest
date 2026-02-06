import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, message, Card, Space,
  InputNumber, Progress, Drawer, Tag, Tooltip, Row, Col, Typography,
  Empty, Badge, Checkbox, Dropdown, Statistic, Upload, Spin
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
  DownloadOutlined, SearchOutlined, ReloadOutlined, EyeOutlined,
  DatabaseOutlined, HomeOutlined, ThunderboltOutlined,
  ExpandOutlined, CompressOutlined, MoreOutlined,
  CheckCircleOutlined, WarningOutlined, SyncOutlined,
  LineChartOutlined, FilterOutlined, DeleteFilled
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { Title, Text } = Typography;

const designTokens = {
  colors: {
    primary: {
      main: '#1890ff',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      bgGradient: 'linear-gradient(135deg, #667eea15 0%, #764ba208 100%)'
    },
    success: {
      main: '#52c41a',
      gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)'
    },
    warning: {
      main: '#faad14',
      gradient: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)'
    },
    error: {
      main: '#ff4d4f',
      gradient: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)'
    },
    purple: {
      main: '#722ed1',
      gradient: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)'
    },
    text: {
      primary: '#262626',
      secondary: '#8c8c8c',
      tertiary: '#bfbfbf'
    }
  },
  shadows: {
    small: '0 2px 8px rgba(0, 0, 0, 0.06)',
    medium: '0 4px 16px rgba(0, 0, 0, 0.08)',
    large: '0 8px 24px rgba(0, 0, 0, 0.12)'
  },
  borderRadius: {
    small: '8px',
    medium: '12px',
    large: '16px'
  },
  transitions: {
    normal: '0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #f5f7fa 0%, #e8ecf1 100%)',
  padding: '24px'
};

const headerStyle = {
  marginBottom: '24px',
  padding: '24px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '20px',
  color: '#fff',
  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
};

const statCardStyle = {
  background: 'rgba(255, 255, 255, 0.15)',
  borderRadius: designTokens.borderRadius.medium,
  padding: '16px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(10px)'
};

const cardStyle = {
  borderRadius: designTokens.borderRadius.large,
  border: 'none',
  boxShadow: designTokens.shadows.medium,
  background: '#fff',
  overflow: 'hidden'
};

const cardHeadStyle = {
  borderBottom: '1px solid #f0f0f0',
  padding: '16px 24px',
  background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)'
};

const primaryButtonStyle = {
  height: '42px',
  borderRadius: '10px',
  background: designTokens.colors.primary.gradient,
  border: 'none',
  boxShadow: '0 4px 16px rgba(102, 126, 234, 0.35)',
  fontWeight: '500'
};

const actionButtonStyle = {
  height: '36px',
  borderRadius: '8px',
  border: '1px solid #e8e8e8'
};

const searchInputStyle = {
  borderRadius: '10px',
  height: '42px',
  border: '1px solid #e8e8e8'
};

const statusConfig = {
  active: { text: '在用', color: 'success', icon: <CheckCircleOutlined /> },
  maintenance: { text: '维护中', color: 'warning', icon: <SyncOutlined spin /> },
  inactive: { text: '停用', color: 'default', icon: <WarningOutlined /> }
};

const PowerGauge = ({ current, max }) => {
  const percentage = Math.min((current / max) * 100, 100);
  const getColor = () => {
    if (percentage >= 80) return designTokens.colors.error.main;
    if (percentage >= 60) return designTokens.colors.warning.main;
    return designTokens.colors.success.main;
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <Text style={{ fontSize: '13px', color: designTokens.colors.text.secondary }}>
          {current} / {max} W
        </Text>
        <Text style={{ fontSize: '13px', fontWeight: '600', color: getColor() }}>
          {percentage.toFixed(1)}%
        </Text>
      </div>
      <Progress
        percent={percentage}
        showInfo={false}
        strokeColor={getColor()}
        trailColor="#f0f0f0"
        strokeLinecap="round"
        size="small"
      />
    </div>
  );
};

const RackCard = ({ rack, onEdit, onDelete, onView, selected, onSelect }) => {
  const deviceCount = rack.Devices?.length || 0;
  const powerUsage = (rack.currentPower / rack.maxPower) * 100;
  const statusInfo = statusConfig[rack.status];
  const availableU = rack.height - deviceCount;

  return (
    <Card
      hoverable
      style={{
        borderRadius: designTokens.borderRadius.medium,
        border: selected ? `2px solid ${designTokens.colors.primary.main}` : '1px solid #f0f0f0',
        boxShadow: designTokens.shadows.small,
        transition: `all ${designTokens.transitions.normal}`,
        cursor: 'pointer'
      }}
      onClick={() => onSelect(rack.rackId)}
      onDoubleClick={() => onView(rack)}
      styles={{ body: { padding: '20px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <DatabaseOutlined style={{ fontSize: '20px', color: designTokens.colors.purple.main }} />
            <Text strong style={{ fontSize: '16px', color: designTokens.colors.text.primary }}>
              {rack.name}
            </Text>
          </div>
          <Text type="secondary" style={{ fontSize: '13px' }}>{rack.rackId}</Text>
        </div>
        <Tag color={statusInfo.color} icon={statusInfo.icon} style={{ borderRadius: '20px' }}>
          {statusInfo.text}
        </Tag>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <HomeOutlined style={{ color: designTokens.colors.text.tertiary }} />
        <Text style={{ fontSize: '13px', color: designTokens.colors.text.secondary }}>
          {rack.Room?.name || '未分配'}
        </Text>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ padding: '12px', background: '#fafafa', borderRadius: '8px' }}>
          <Text type="secondary" style={{ fontSize: '11px' }}>高度/已用U位</Text>
          <div style={{ fontSize: '14px', fontWeight: '600', color: designTokens.colors.text.primary }}>
            {rack.height}U / {deviceCount}
          </div>
        </div>
        <div style={{ padding: '12px', background: '#fafafa', borderRadius: '8px' }}>
          <Text type="secondary" style={{ fontSize: '11px' }}>功率使用</Text>
          <div style={{ fontSize: '14px', fontWeight: '600', color: powerUsage >= 80 ? designTokens.colors.error.main : designTokens.colors.text.primary }}>
            {powerUsage.toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <PowerGauge current={rack.currentPower} max={rack.maxPower} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          最大功率: {rack.maxPower}W
        </Text>
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={(e) => { e.stopPropagation(); onView(rack); }}
              style={{ color: designTokens.colors.text.secondary }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => { e.stopPropagation(); onEdit(rack); }}
              style={{ color: designTokens.colors.primary.main }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={(e) => { e.stopPropagation(); onDelete(rack.rackId); }}
            />
          </Tooltip>
        </Space>
      </div>
    </Card>
  );
};

function RackManagement() {
  const [racks, setRacks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editingRack, setEditingRack] = useState(null);
  const [viewingRack, setViewingRack] = useState(null);
  const [selectedRackIds, setSelectedRackIds] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    pageSizeOptions: ['10', '20', '30', '50', '100'],
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条记录`
  });
  const [form] = Form.useForm();
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const fetchRacks = useCallback(async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/racks', {
        params: { page, pageSize }
      });
      const { racks: data, total } = response.data;
      setRacks(data);
      setPagination(prev => ({ ...prev, current: page, pageSize, total }));
    } catch (error) {
      message.error('获取机柜列表失败');
      console.error('获取机柜列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await axios.get('/api/rooms');
      setRooms(response.data);
    } catch (error) {
      message.error('获取机房列表失败');
      console.error('获取机房列表失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchRacks(pagination.current, pagination.pageSize);
    fetchRooms();
  }, [fetchRacks, fetchRooms]);

  const handleTableChange = useCallback((pagination) => {
    fetchRacks(pagination.current, pagination.pageSize);
  }, [fetchRacks]);

  const showModal = (rack = null) => {
    setEditingRack(rack);
    if (rack) {
      form.setFieldsValue(rack);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingRack(null);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingRack) {
        await axios.put(`/api/racks/${editingRack.rackId}`, values);
        message.success('机柜更新成功');
      } else {
        await axios.post('/api/racks', values);
        message.success('机柜创建成功');
      }
      setModalVisible(false);
      fetchRacks();
      setEditingRack(null);
    } catch (error) {
      message.error(editingRack ? '机柜更新失败' : '机柜创建失败');
      console.error(editingRack ? '机柜更新失败:' : '机柜创建失败:', error);
    }
  };

  const handleDelete = async (rackId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个机柜吗？删除后无法恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`/api/racks/${rackId}`);
          message.success('机柜删除成功');
          fetchRacks();
        } catch (error) {
          message.error('机柜删除失败');
          console.error('机柜删除失败:', error);
        }
      }
    });
  };

  const handleBatchDelete = async () => {
    if (selectedRackIds.length === 0) {
      message.warning('请先选择要删除的机柜');
      return;
    }

    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRackIds.length} 个机柜吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(selectedRackIds.map(id => axios.delete(`/api/racks/${id}`)));
          message.success(`成功删除 ${selectedRackIds.length} 个机柜`);
          setSelectedRackIds([]);
          fetchRacks();
        } catch (error) {
          message.error('批量删除失败');
          console.error('批量删除失败:', error);
        }
      }
    });
  };

  const handleView = (rack) => {
    setViewingRack(rack);
    setDrawerVisible(true);
  };

  const handleDownloadTemplate = useCallback(() => {
    window.open('/api/racks/import-template', '_blank');
    message.success('模板下载成功');
  }, []);

  // 导出租机柜数据
  const handleExport = useCallback(async () => {
    try {
      message.loading('正在导出租机柜数据...', 0);
      
      const response = await axios.get('/api/racks/export', {
        responseType: 'blob'
      });
      
      // 创建下载链接
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 从响应头获取文件名，或使用默认文件名
      const contentDisposition = response.headers['content-disposition'];
      let fileName = '机柜导出.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/);
        if (match) {
          fileName = decodeURIComponent(match[1].replace(/['"]/g, ''));
        }
      }
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.destroy();
      message.success('机柜导出成功');
    } catch (error) {
      message.destroy();
      message.error('机柜导出失败');
      console.error('机柜导出失败:', error);
    }
  }, []);

  const handleImport = useCallback(async (file) => {
    try {
      setIsImporting(true);
      setImportProgress(0);
      setImportPhase('正在上传文件...');
      setImportResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/racks/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setImportProgress(100);
      setImportPhase('导入完成');
      setImportResult(response.data);
      setIsImporting(false);

      if (response.data.success) {
        message.success('机柜导入成功');
      } else {
        message.warning(response.data.message || '部分记录导入失败');
      }

      fetchRacks();
      return false;
    } catch (error) {
      setIsImporting(false);
      setImportProgress(0);
      message.error('机柜导入失败');
      console.error('机柜导入失败:', error);
      return false;
    }
  }, [fetchRacks]);

  const filteredRacks = useMemo(() => {
    return racks.filter(rack => {
      const matchKeyword = !searchKeyword ||
        rack.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        rack.rackId?.toLowerCase().includes(searchKeyword.toLowerCase());

      const matchStatus = statusFilter === 'all' || rack.status === statusFilter;
      const matchRoom = roomFilter === 'all' || rack.roomId === roomFilter;

      return matchKeyword && matchStatus && matchRoom;
    });
  }, [racks, searchKeyword, statusFilter, roomFilter]);

  const stats = useMemo(() => ({
    total: racks.length,
    active: racks.filter(r => r.status === 'active').length,
    maintenance: racks.filter(r => r.status === 'maintenance').length,
    totalPower: racks.reduce((sum, r) => sum + (r.currentPower || 0), 0),
    totalDevices: racks.reduce((sum, r) => sum + (r.Devices?.length || 0), 0)
  }), [racks]);

  const tableColumns = [
    {
      title: '机柜信息',
      key: 'rackInfo',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #722ed115 0%, #722ed108 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DatabaseOutlined style={{ fontSize: '22px', color: designTokens.colors.purple.main }} />
          </div>
          <div>
            <div style={{ fontWeight: '600', color: designTokens.colors.text.primary }}>
              {record.name}
            </div>
            <div style={{ fontSize: '12px', color: designTokens.colors.text.tertiary }}>
              {record.rackId}
            </div>
          </div>
        </div>
      )
    },
    {
      title: '所属机房',
      dataIndex: ['Room', 'name'],
      key: 'room',
      render: (name, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <HomeOutlined style={{ color: designTokens.colors.text.tertiary }} />
          <span>{name || '未分配'}</span>
        </div>
      )
    },
    {
      title: '高度/已用U位',
      key: 'heightUsage',
      render: (_, record) => {
        const used = record.Devices?.length || 0;
        const percentage = (used / record.height) * 100;
        return (
          <div>
            <Text style={{ fontSize: '13px' }}>{record.height}U</Text>
            <Progress
              percent={percentage}
              size="small"
              strokeColor={percentage >= 90 ? designTokens.colors.error.main : designTokens.colors.success.main}
              trailColor="#f0f0f0"
              style={{ marginTop: '4px', marginBottom: 0 }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              已用 {used} U位
            </Text>
          </div>
        );
      },
      sorter: (a, b) => (a.Devices?.length || 0) - (b.Devices?.length || 0)
    },
    {
      title: '功率使用',
      key: 'powerUsage',
      render: (_, record) => (
        <div style={{ minWidth: '120px' }}>
          <PowerGauge current={record.currentPower} max={record.maxPower} />
        </div>
      ),
      sorter: (a, b) => (a.currentPower || 0) - (b.currentPower || 0)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = statusConfig[status];
        return (
          <Tag color={config.color} icon={config.icon} style={{ borderRadius: '20px' }}>
            {config.text}
          </Tag>
        );
      },
      filters: [
        { text: '在用', value: 'active' },
        { text: '维护中', value: 'maintenance' },
        { text: '停用', value: 'inactive' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: '设备数',
      key: 'deviceCount',
      render: (_, record) => (
        <Badge count={record.Devices?.length || 0} style={{ backgroundColor: '#52c41a' }} />
      ),
      sorter: (a, b) => (a.Devices?.length || 0) - (b.Devices?.length || 0)
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => date ? new Date(date).toLocaleString() : '-',
      sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
              style={{ color: designTokens.colors.text.secondary }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => showModal(record)}
              style={{ color: designTokens.colors.primary.main }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDelete(record.rackId)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys: selectedRackIds,
    onChange: (selectedRowKeys) => {
      setSelectedRackIds(selectedRowKeys);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <DatabaseOutlined />
              机柜管理
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
              管理和监控所有机柜设备
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={statCardStyle}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>总机柜</Text>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.total}</div>
            </div>
            <div style={statCardStyle}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>在用机柜</Text>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#52c41a' }}>{stats.active}</div>
            </div>
            <div style={statCardStyle}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>设备总数</Text>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.totalDevices}</div>
            </div>
            <div style={statCardStyle}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>总功率</Text>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{(stats.totalPower / 1000).toFixed(1)}kW</div>
            </div>
          </div>
        </div>
      </div>

      <Card style={cardStyle} styles={{ header: cardHeadStyle, body: { padding: '20px 24px' } }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '800px' }}>
            <Input
              placeholder="搜索机柜名称、ID..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={searchInputStyle}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '120px', height: '42px' }}
            >
              <Option value="all">全部状态</Option>
              <Option value="active">在用</Option>
              <Option value="maintenance">维护中</Option>
              <Option value="inactive">停用</Option>
            </Select>
            <Select
              value={roomFilter}
              onChange={setRoomFilter}
              style={{ width: '160px', height: '42px' }}
            >
              <Option value="all">全部机房</Option>
              {rooms.map(room => (
                <Option key={room.roomId} value={room.roomId}>{room.name}</Option>
              ))}
            </Select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {selectedRackIds.length > 0 && (
              <Button
                danger
                icon={<DeleteFilled />}
                onClick={handleBatchDelete}
                style={{ borderRadius: '10px', height: '42px' }}
              >
                批量删除 ({selectedRackIds.length})
              </Button>
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchRacks(pagination.current, pagination.pageSize)}
              loading={loading}
              style={actionButtonStyle}
            >
              刷新
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setImportModalVisible(true)}
              style={actionButtonStyle}
            >
              导入
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              style={actionButtonStyle}
            >
              导出
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal()}
              style={primaryButtonStyle}
            >
              添加机柜
            </Button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <Button
            type={viewMode === 'table' ? 'primary' : 'text'}
            icon={<ExpandOutlined />}
            onClick={() => setViewMode('table')}
            style={viewMode === 'table' ? primaryButtonStyle : actionButtonStyle}
          >
            表格视图
          </Button>
          <Button
            type={viewMode === 'card' ? 'primary' : 'text'}
            icon={<CompressOutlined />}
            onClick={() => setViewMode('card')}
            style={viewMode === 'card' ? primaryButtonStyle : actionButtonStyle}
          >
            卡片视图
          </Button>
        </div>

        {viewMode === 'table' ? (
          <Table
            columns={tableColumns}
            dataSource={filteredRacks}
            rowKey="rackId"
            loading={loading}
            rowSelection={rowSelection}
            pagination={pagination}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
            rowClassName={() => 'table-row'}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredRacks.length > 0 ? (
              filteredRacks.map(rack => (
                <Col xs={24} sm={12} lg={8} xl={6} key={rack.rackId}>
                  <RackCard
                    rack={rack}
                    onEdit={showModal}
                    onDelete={handleDelete}
                    onView={handleView}
                    selected={selectedRackIds.includes(rack.rackId)}
                    onSelect={(id) => {
                      if (selectedRackIds.includes(id)) {
                        setSelectedRackIds(selectedRackIds.filter(rid => rid !== id));
                      } else {
                        setSelectedRackIds([...selectedRackIds, id]);
                      }
                    }}
                  />
                </Col>
              ))
            ) : (
              <Col span={24}>
                <Empty description="暂无机柜数据" style={{ padding: '60px 0' }} />
              </Col>
            )}
          </Row>
        )}
      </Card>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '4px',
              height: '20px',
              background: designTokens.colors.primary.gradient,
              borderRadius: '2px'
            }} />
            {editingRack ? '编辑机柜' : '添加机柜'}
          </div>
        }
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
        destroyOnHidden
        styles={{
          body: { padding: '24px' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 50px 16px 24px' }
        }}
        style={{ borderRadius: '16px' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="rackId"
                label="机柜ID（留空自动生成）"
              >
                <Input placeholder="如：RACK001，留空则自动生成" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="机柜名称"
                rules={[{ required: true, message: '请输入机柜名称' }]}
              >
                <Input placeholder="请输入机柜名称" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="roomId"
            label="所属机房"
            rules={[{ required: true, message: '请选择机房' }]}
          >
            <Select placeholder="请选择机房" style={{ borderRadius: '8px' }}>
              {rooms.map(room => (
                <Option key={room.roomId} value={room.roomId}>
                  {room.name} ({room.roomId})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="height"
                label="高度(U)"
                rules={[{ required: true, message: '请输入机柜高度' }]}
              >
                <InputNumber placeholder="请输入机柜高度" min={1} max={50} style={{ width: '100%', borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maxPower"
                label="最大功率(W)"
                rules={[{ required: true, message: '请输入最大功率' }]}
              >
                <InputNumber placeholder="请输入最大功率" min={0} style={{ width: '100%', borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态" style={{ borderRadius: '8px' }}>
              <Option value="active">在用</Option>
              <Option value="maintenance">维护中</Option>
              <Option value="inactive">停用</Option>
            </Select>
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={handleCancel} style={{ borderRadius: '8px', height: '42px' }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" style={primaryButtonStyle}>
              确定
            </Button>
          </div>
        </Form>
      </Modal>

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DatabaseOutlined style={{ fontSize: '20px', color: designTokens.colors.purple.main }} />
            机柜详情 - {viewingRack?.name}
          </div>
        }
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={520}
        styles={{
          header: { borderBottom: '1px solid #f0f0f0' },
          body: { padding: '24px' }
        }}
      >
        {viewingRack && (
          <div>
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #722ed115 0%, #722ed108 100%)',
              borderRadius: designTokens.borderRadius.medium,
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <DatabaseOutlined style={{ fontSize: '32px', color: designTokens.colors.purple.main }} />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: designTokens.colors.text.primary }}>
                    {viewingRack.name}
                  </div>
                  <div style={{ fontSize: '13px', color: designTokens.colors.text.secondary }}>
                    {viewingRack.rackId}
                  </div>
                </div>
              </div>
              <Tag color={statusConfig[viewingRack.status].color} style={{ borderRadius: '20px' }}>
                {statusConfig[viewingRack.status].text}
              </Tag>
            </div>

            <Row gutter={16} style={{ marginBottom: '20px' }}>
              <Col span={12}>
                <div style={{ padding: '16px', background: '#fafafa', borderRadius: '10px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>所属机房</Text>
                  <div style={{ fontSize: '15px', fontWeight: '500', marginTop: '4px' }}>
                    {viewingRack.Room?.name || '未分配'}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: '16px', background: '#fafafa', borderRadius: '10px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>设备数量</Text>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: designTokens.colors.primary.main }}>
                    {viewingRack.Devices?.length || 0}
                  </div>
                </div>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: '20px' }}>
              <Col span={12}>
                <div style={{ padding: '16px', background: '#fafafa', borderRadius: '10px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>机柜高度</Text>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: designTokens.colors.text.primary }}>
                    {viewingRack.height}U
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: '16px', background: '#fafafa', borderRadius: '10px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>可用U位</Text>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: designTokens.colors.success.main }}>
                    {viewingRack.height - (viewingRack.Devices?.length || 0)}U
                  </div>
                </div>
              </Col>
            </Row>

            <div style={{ marginBottom: '20px' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>功率使用情况</Text>
              <div style={{ marginTop: '12px' }}>
                <PowerGauge current={viewingRack.currentPower} max={viewingRack.maxPower} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  setDrawerVisible(false);
                  showModal(viewingRack);
                }}
                style={primaryButtonStyle}
              >
                编辑机柜
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  setDrawerVisible(false);
                  handleDelete(viewingRack.rackId);
                }}
                style={{ borderRadius: '8px', height: '42px' }}
              >
                删除机柜
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '4px',
              height: '20px',
              background: designTokens.colors.primary.gradient,
              borderRadius: '2px'
            }} />
            导入机柜
          </div>
        }
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportProgress(0);
          setImportPhase('');
          setImportResult(null);
          setIsImporting(false);
        }}
        footer={null}
        width={650}
        destroyOnHidden
        styles={{
          body: { padding: '24px' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }
        }}
        style={{ borderRadius: '16px' }}
      >
        {!isImporting && !importResult ? (
          <div>
            <div style={{
              padding: '16px',
              background: designTokens.colors.primary.bgGradient,
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid #e8e8e8'
            }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: '600', color: '#262626' }}>
                请上传XLSX格式的机柜数据文件
              </p>
              <p style={{ margin: 0, color: '#8c8c8c', fontSize: '12px' }}>
                支持的编码格式：UTF-8
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: '600', marginBottom: '12px', color: '#262626' }}>
                Excel文件格式要求：
              </p>
              <ul style={{
                paddingLeft: '20px',
                marginBottom: '10px',
                color: '#595959',
                lineHeight: '1.8'
              }}>
                <li>必填字段：机柜ID、机柜名称、所属机房名称、高度(U)、最大功率(W)、状态</li>
                <li>状态值：active(在用)、maintenance(维护中)、inactive(停用)</li>
                <li>高度和功率必须是数字格式</li>
              </ul>
            </div>

            <div style={{
              padding: '16px',
              background: '#f6f6f6',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
                style={actionButtonStyle}
              >
                下载导入模板
              </Button>
              <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
                包含示例数据的XLSX模板文件
              </span>
            </div>

            <Upload
              name="file"
              accept=".xlsx, .xls"
              showUploadList={false}
              beforeUpload={handleImport}
              maxCount={1}
            >
              <Button
                type="primary"
                icon={<UploadOutlined />}
                block
                style={{
                  ...primaryButtonStyle,
                  height: '48px',
                  fontSize: '16px'
                }}
              >
                选择Excel文件
              </Button>
            </Upload>
          </div>
        ) : isImporting ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: designTokens.colors.primary.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '16px',
                color: '#fff',
                fontSize: '20px'
              }}>
                <UploadOutlined spin />
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#333', fontSize: '16px' }}>正在导入机柜数据</p>
                <p style={{ margin: 0, color: designTokens.colors.primary.main, fontSize: '14px' }}>{importPhase}</p>
              </div>
            </div>
            <Progress
              percent={importProgress}
              status="active"
              strokeColor={{
                '0%': '#667eea',
                '100%': '#764ba2'
              }}
              format={() => `${importProgress}%`}
            />
          </div>
        ) : importResult && (
          <div>
            <div style={{
              padding: '20px',
              background: '#f6f6f6',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <p style={{ marginBottom: '12px', fontWeight: '600' }}>
                导入结果：
              </p>
              <p style={{ margin: '8px 0', color: '#52c41a' }}>
                ✓ 总记录数：{importResult.total || 0}
              </p>
              <p style={{ margin: '8px 0', color: '#52c41a' }}>
                ✓ 成功导入：{importResult.successCount || 0}
              </p>
              {importResult.failedCount > 0 && (
                <p style={{ margin: '8px 0', color: '#ff4d4f' }}>
                  ✗ 导入失败：{importResult.failedCount}
                </p>
              )}
            </div>
            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontWeight: '600', marginBottom: '8px' }}>错误详情：</p>
                {importResult.errors.slice(0, 5).map((err, idx) => (
                  <div key={idx} style={{
                    padding: '8px 12px',
                    background: '#fff2f0',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    fontSize: '13px',
                    color: '#cf1322'
                  }}>
                    第{err.row || idx + 1}行：{err.error}
                  </div>
                ))}
                {importResult.errors.length > 5 && (
                  <p style={{ color: '#8c8c8c', fontSize: '12px' }}>
                    还有 {importResult.errors.length - 5} 处错误...
                  </p>
                )}
              </div>
            )}
            <Button
              type="primary"
              onClick={() => {
                setImportModalVisible(false);
                setImportResult(null);
                fetchRacks();
              }}
              style={primaryButtonStyle}
            >
              完成
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default React.memo(RackManagement);
