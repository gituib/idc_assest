import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDebounce } from '../hooks/useDebounce';
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
  InputNumber,
  Progress,
  Drawer,
  Tag,
  Tooltip,
  Row,
  Col,
  Typography,
  Empty,
  Badge,
  Checkbox,
  Dropdown,
  Statistic,
  Spin,
  Pagination,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  DatabaseOutlined,
  HomeOutlined,
  ThunderboltOutlined,
  ExpandOutlined,
  CompressOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SyncOutlined,
  LineChartOutlined,
  FilterOutlined,
  DeleteFilled,
} from '@ant-design/icons';
import { designTokens } from '../config/theme';
import CloseButton from '../components/CloseButton';
import RackImportModal from '../components/rack/RackImportModal';
import api from '../api';

const { Option } = Select;
const { Title, Text } = Typography;

const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #f5f7fa 0%, #e8ecf1 100%)',
  padding: '24px',
};

const headerStyle = {
  marginBottom: '24px',
  padding: '24px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '20px',
  color: '#fff',
  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
};

const statCardStyle = {
  background: 'rgba(255, 255, 255, 0.15)',
  borderRadius: designTokens.borderRadius.medium,
  padding: '16px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(10px)',
};

const cardStyle = {
  borderRadius: designTokens.borderRadius.large,
  border: 'none',
  boxShadow: designTokens.shadows.medium,
  background: '#fff',
  overflow: 'hidden',
};

const cardHeadStyle = {
  borderBottom: '1px solid #f0f0f0',
  padding: '16px 24px',
  background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
};

const primaryButtonStyle = {
  height: '42px',
  borderRadius: '10px',
  background: designTokens.colors.primary.gradient,
  border: 'none',
  boxShadow: '0 4px 16px rgba(102, 126, 234, 0.35)',
  fontWeight: '500',
};

const actionButtonStyle = {
  height: '36px',
  borderRadius: '8px',
  border: '1px solid #e8e8e8',
};

const searchInputStyle = {
  borderRadius: '10px',
  height: '42px',
  border: '1px solid #e8e8e8',
};

const statusConfig = {
  active: { text: '在用', color: 'success', icon: <CheckCircleOutlined /> },
  maintenance: { text: '维护中', color: 'warning', icon: <SyncOutlined spin /> },
  inactive: { text: '停用', color: 'default', icon: <WarningOutlined /> },
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
  const usedU = rack.Devices?.reduce((sum, d) => sum + (d.height || 1), 0) || 0;
  const powerUsage = (rack.currentPower / rack.maxPower) * 100;
  const statusInfo = statusConfig[rack.status];
  const availableU = rack.height - usedU;

  return (
    <Card
      hoverable
      style={{
        borderRadius: designTokens.borderRadius.medium,
        border: selected ? `2px solid ${designTokens.colors.primary.main}` : '1px solid #f0f0f0',
        boxShadow: designTokens.shadows.small,
        transition: `all ${designTokens.transitions.normal}`,
        cursor: 'pointer',
      }}
      onClick={() => onSelect(rack.rackId)}
      onDoubleClick={() => onView(rack)}
      styles={{ body: { padding: '20px' } }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <DatabaseOutlined
              style={{ fontSize: '20px', color: designTokens.colors.purple.main }}
            />
            <Text strong style={{ fontSize: '16px', color: designTokens.colors.text.primary }}>
              {rack.name}
            </Text>
          </div>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            {rack.rackId}
          </Text>
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ padding: '12px', background: '#fafafa', borderRadius: '8px' }}>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            高度/已用U位
          </Text>
          <div
            style={{ fontSize: '14px', fontWeight: '600', color: designTokens.colors.text.primary }}
          >
            {rack.height}U / {usedU}
          </div>
        </div>
        <div style={{ padding: '12px', background: '#fafafa', borderRadius: '8px' }}>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            功率使用
          </Text>
          <div
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color:
                powerUsage >= 80
                  ? designTokens.colors.error.main
                  : designTokens.colors.text.primary,
            }}
          >
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
              onClick={e => {
                e.stopPropagation();
                onView(rack);
              }}
              style={{ color: designTokens.colors.text.secondary }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={e => {
                e.stopPropagation();
                onEdit(rack);
              }}
              style={{ color: designTokens.colors.primary.main }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={e => {
                e.stopPropagation();
                onDelete(rack.rackId);
              }}
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
  const debouncedSearchKeyword = useDebounce(searchKeyword, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    pageSizeOptions: ['10', '20', '30', '50', '100'],
    showSizeChanger: true,
    showTotal: total => `共 ${total} 条记录`,
  });
  const [form] = Form.useForm();

  const fetchRacks = useCallback(
    async (page = 1, pageSize = 10) => {
      try {
        setLoading(true);
        const response = await api.get('/racks', {
          params: {
            page,
            pageSize,
            roomId: roomFilter,
            status: statusFilter,
            keyword: debouncedSearchKeyword || undefined,
          },
        });
        const { racks: data, total } = response;
        setRacks(data);
        setPagination(prev => ({ ...prev, current: page, pageSize, total }));
      } catch (error) {
        message.error('获取机柜列表失败');
        console.error('获取机柜列表失败:', error);
      } finally {
        setLoading(false);
      }
    },
    [roomFilter, statusFilter, debouncedSearchKeyword]
  );

  const fetchRooms = useCallback(async () => {
    try {
      const response = await api.get('/rooms');
      setRooms(response.rooms || []);
    } catch (error) {
      message.error('获取机房列表失败');
      console.error('获取机房列表失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchRacks(pagination.current, pagination.pageSize);
    fetchRooms();
  }, [fetchRacks, fetchRooms]);

  // 当筛选条件变化时，重置到第一页并重新加载
  useEffect(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchRacks(1, pagination.pageSize);
  }, [roomFilter, statusFilter, debouncedSearchKeyword]);

  const handleTableChange = useCallback(
    pagination => {
      fetchRacks(pagination.current, pagination.pageSize);
    },
    [fetchRacks]
  );

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

  const handleSubmit = async values => {
    try {
      if (editingRack) {
        await api.put(`/racks/${editingRack.rackId}`, values);
        message.success('机柜更新成功');
      } else {
        await api.post('/racks', values);
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

  const handleDelete = async rackId => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个机柜吗？删除后无法恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/racks/${rackId}`);
          message.success('机柜删除成功');
          fetchRacks();
        } catch (error) {
          const errorMsg = error.response?.data?.error || '机柜删除失败';
          message.error(errorMsg);
          console.error('机柜删除失败:', error);
        }
      },
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
          const results = await Promise.allSettled(
            selectedRackIds.map(id => api.delete(`/racks/${id}`))
          );
          const succeeded = results.filter(r => r.status === 'fulfilled').length;
          const failed = results.filter(r => r.status === 'rejected');
          if (succeeded > 0) {
            message.success(`成功删除 ${succeeded} 个机柜`);
          }
          if (failed.length > 0) {
            const firstError = failed[0].reason.error || '部分机柜删除失败';
            message.error(`${firstError}（${failed.length} 个失败）`);
          }
          setSelectedRackIds([]);
          fetchRacks();
        } catch (error) {
          message.error('批量删除失败');
          console.error('批量删除失败:', error);
        }
      },
    });
  };

  const handleView = rack => {
    setViewingRack(rack);
    setDrawerVisible(true);
  };

  const handleDownloadTemplate = useCallback(async () => {
    try {
      message.loading('正在下载模板...', 0);

      const response = await api.get('/racks/import-template', {
        responseType: 'blob',
      });

      // 创建下载链接
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', '机柜导入模板.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.destroy();
      message.success('模板下载成功');
    } catch (error) {
      message.destroy();
      message.error('模板下载失败');
      console.error('模板下载失败:', error);
    }
  }, []);

  // 导出租机柜数据
  const handleExport = useCallback(async () => {
    try {
      const hasSelection = selectedRackIds.length > 0;
      message.loading(hasSelection ? '正在导出选中机柜数据...' : '正在导出全部机柜数据...', 0);

      const response = await api.get('/racks/export', {
        params: hasSelection ? { rackIds: selectedRackIds.join(',') } : {},
        responseType: 'blob',
      });

      // 创建下载链接
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
      message.success(hasSelection ? `已导出 ${selectedRackIds.length} 个选中机柜` : '已导出全部机柜');
    } catch (error) {
      message.destroy();
      message.error('机柜导出失败');
      console.error('机柜导出失败:', error);
    }
  }, [selectedRackIds]);

  const handleImport = useCallback(
    (file, { onProgress } = {}) => {
      return new Promise((resolve, reject) => {
        const doImport = async () => {
          try {
            onProgress?.(10, '正在上传文件...');

            const formData = new FormData();
            formData.append('file', file);

            onProgress?.(50, '正在处理数据...');

            const response = await api.post('/racks/import', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });

            onProgress?.(100, '导入完成');

            const resData = response;
            const importResult = {
              total: resData.total || 0,
              successCount: resData.imported || 0,
              duplicates: resData.duplicates || 0,
              failedCount: 0,
              errors: [],
              createdRacks: resData.createdRacks || [],
              skippedRacks: resData.skippedRacks || [],
            };

            if (resData.details && Array.isArray(resData.details)) {
              importResult.failedCount = resData.details.length;
              importResult.errors = resData.details.map(item => ({
                row: item.row,
                error: item.errors.join('；'),
              }));
            }

            if (resData.success) {
              message.success('机柜导入成功');
            } else {
              message.warning(resData.message || '部分记录导入失败');
            }

            fetchRacks();
            resolve(importResult);
          } catch (error) {
            const errorData = error.response?.data;
            if (errorData?.details && Array.isArray(errorData.details)) {
              const importResult = {
                total: errorData.total || 0,
                successCount: 0,
                failedCount: errorData.details.length,
                errors: errorData.details.map(item => ({
                  row: item.row,
                  error: item.errors.join('；'),
                })),
              };
              resolve(importResult);
            } else {
              message.error(errorData?.error || errorData?.message || '机柜导入失败');
              console.error('机柜导入失败:', error);
              reject(new Error(errorData?.error || errorData?.message || '机柜导入失败'));
            }
          }
        };

        doImport();
      });
    },
    [fetchRacks]
  );

  // 后端已过滤，直接使用 racks 数据
  const filteredRacks = racks;

  const stats = useMemo(
    () => ({
      total: racks.length,
      active: racks.filter(r => r.status === 'active').length,
      maintenance: racks.filter(r => r.status === 'maintenance').length,
      totalPower: racks.reduce((sum, r) => sum + (r.currentPower || 0), 0),
      totalDevices: racks.reduce((sum, r) => sum + (r.Devices?.length || 0), 0),
    }),
    [racks]
  );

  const tableColumns = [
    {
      title: '机柜信息',
      key: 'rackInfo',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #722ed115 0%, #722ed108 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DatabaseOutlined
              style={{ fontSize: '22px', color: designTokens.colors.purple.main }}
            />
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
      ),
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
      ),
    },
    {
      title: '高度/已用U位',
      key: 'heightUsage',
      render: (_, record) => {
        const used = record.Devices?.reduce((sum, d) => sum + (d.height || 1), 0) || 0;
        return (
          <Text style={{ fontSize: '13px' }}>
            {record.height}U / 已用 {used} U位
          </Text>
        );
      },
      sorter: (a, b) =>
        (a.Devices?.reduce((sum, d) => sum + (d.height || 1), 0) || 0) -
        (b.Devices?.reduce((sum, d) => sum + (d.height || 1), 0) || 0),
    },
    {
      title: '功率使用',
      key: 'powerUsage',
      render: (_, record) => (
        <div style={{ minWidth: '120px' }}>
          <PowerGauge current={record.currentPower} max={record.maxPower} />
        </div>
      ),
      sorter: (a, b) => (a.currentPower || 0) - (b.currentPower || 0),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: status => {
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
        { text: '停用', value: 'inactive' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '设备数',
      key: 'deviceCount',
      render: (_, record) => (
        <Badge count={record.Devices?.length || 0} style={{ backgroundColor: '#52c41a' }} />
      ),
      sorter: (a, b) => (a.Devices?.length || 0) - (b.Devices?.length || 0),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: date => (date ? new Date(date).toLocaleString() : '-'),
      sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
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
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedRackIds,
    onChange: selectedRowKeys => {
      setSelectedRackIds(selectedRowKeys);
    },
  };

  return (
    <div style={containerStyle}>
      <style>{`
        .ant-modal-close {
          top: 16px !important;
          right: 16px !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
        }
        .ant-modal-close-x {
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
      `}</style>
      <div style={headerStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                margin: '0 0 4px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <DatabaseOutlined />
              机柜管理
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>管理和监控所有机柜设备</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={statCardStyle}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>总机柜</Text>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.total}</div>
            </div>
            <div style={statCardStyle}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>在用机柜</Text>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#52c41a' }}>
                {stats.active}
              </div>
            </div>
            <div style={statCardStyle}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>设备总数</Text>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.totalDevices}</div>
            </div>
            <div style={statCardStyle}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>总功率</Text>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>
                {(stats.totalPower / 1000).toFixed(1)}kW
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card style={cardStyle} styles={{ header: cardHeadStyle, body: { padding: '20px 24px' } }}>
        <div
          style={{
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '800px' }}>
            <Input
              placeholder="搜索机柜名称、ID..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
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
                <Option key={room.roomId} value={room.roomId}>
                  {room.name}
                </Option>
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
              {selectedRackIds.length > 0 ? `导出选中 (${selectedRackIds.length})` : '导出全部'}
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
                    onSelect={id => {
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

        {/* 卡片视图分页 - 始终显示当总数据大于0时 */}
        {viewMode === 'card' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              pageSizeOptions={pagination.pageSizeOptions}
              showSizeChanger={pagination.showSizeChanger}
              showTotal={pagination.showTotal}
              onChange={(page, pageSize) => {
                handleTableChange({ current: page, pageSize });
              }}
            />
          </div>
        )}
      </Card>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '32px' }}>
            <div
              style={{
                width: '4px',
                height: '20px',
                background: designTokens.colors.primary.gradient,
                borderRadius: '2px',
              }}
            />
            {editingRack ? '编辑机柜' : '添加机柜'}
          </div>
        }
        open={modalVisible}
        closeIcon={<CloseButton />}
        onCancel={handleCancel}
        footer={null}
        width={600}
        destroyOnHidden
        styles={{
          body: { padding: '24px' },
          header: {
            borderBottom: '1px solid #f0f0f0',
            padding: '16px 24px',
            position: 'relative',
          },
        }}
        style={{ borderRadius: '16px' }}
        classNames={{
          header: 'modal-header-fix',
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="rackId" label="机柜ID（留空自动生成）">
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
                <InputNumber
                  placeholder="请输入机柜高度"
                  min={1}
                  max={50}
                  style={{ width: '100%', borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maxPower"
                label="最大功率(W)"
                rules={[{ required: true, message: '请输入最大功率' }]}
              >
                <InputNumber
                  placeholder="请输入最大功率"
                  min={0}
                  style={{ width: '100%', borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select placeholder="请选择状态" style={{ borderRadius: '8px' }}>
              <Option value="active">在用</Option>
              <Option value="maintenance">维护中</Option>
              <Option value="inactive">停用</Option>
            </Select>
          </Form.Item>

          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}
          >
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
            <DatabaseOutlined
              style={{ fontSize: '20px', color: designTokens.colors.purple.main }}
            />
            机柜详情 - {viewingRack?.name}
          </div>
        }
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={520}
        styles={{
          header: { borderBottom: '1px solid #f0f0f0' },
          body: { padding: '24px' },
        }}
      >
        {viewingRack && (
          <div>
            <div
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #722ed115 0%, #722ed108 100%)',
                borderRadius: designTokens.borderRadius.medium,
                marginBottom: '20px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
              >
                <DatabaseOutlined
                  style={{ fontSize: '32px', color: designTokens.colors.purple.main }}
                />
                <div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: designTokens.colors.text.primary,
                    }}
                  >
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
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    所属机房
                  </Text>
                  <div style={{ fontSize: '15px', fontWeight: '500', marginTop: '4px' }}>
                    {viewingRack.Room?.name || '未分配'}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: '16px', background: '#fafafa', borderRadius: '10px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    设备数量
                  </Text>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: designTokens.colors.primary.main,
                    }}
                  >
                    {viewingRack.Devices?.length || 0}
                  </div>
                </div>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: '20px' }}>
              <Col span={12}>
                <div style={{ padding: '16px', background: '#fafafa', borderRadius: '10px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    机柜高度
                  </Text>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: designTokens.colors.text.primary,
                    }}
                  >
                    {viewingRack.height}U
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: '16px', background: '#fafafa', borderRadius: '10px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    可用U位
                  </Text>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: designTokens.colors.success.main,
                    }}
                  >
                    {viewingRack.height - (viewingRack.Devices?.reduce((sum, d) => sum + (d.height || 1), 0) || 0)}U
                  </div>
                </div>
              </Col>
            </Row>

            <div style={{ marginBottom: '20px' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                功率使用情况
              </Text>
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

      <RackImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}

export default React.memo(RackManagement);
