import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  message,
  Card,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Progress,
  Descriptions,
  Empty,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  SyncOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { designTokens } from '../config/theme';
import CloseButton from '../components/CloseButton';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const PendingDeviceManagement = () => {
  const navigate = useNavigate();
  const [pendingDevices, setPendingDevices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [racks, setRacks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [deviceFields, setDeviceFields] = useState(null); // 初始值改为 null，表示未加载
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, synced: 0 });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [form] = Form.useForm();
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  
  const [filters, setFilters] = useState({
    status: null,
    planId: null,
    roomId: null,
    keyword: '',
  });

  const defaultDeviceFields = [
    { fieldName: 'deviceName', displayName: '设备名称', fieldType: 'string', required: true, visible: true, order: 1 },
    { fieldName: 'deviceType', displayName: '设备类型', fieldType: 'select', required: true, visible: true, order: 2, options: [
      { value: 'server', label: '服务器' },
      { value: 'switch', label: '交换机' },
      { value: 'router', label: '路由器' },
      { value: 'storage', label: '存储设备' },
      { value: 'other', label: '其他' },
    ]},
    { fieldName: 'model', displayName: '型号', fieldType: 'string', required: false, visible: true, order: 3 },
    { fieldName: 'serialNumber', displayName: '序列号', fieldType: 'string', required: true, visible: true, order: 4 },
    { fieldName: 'roomId', displayName: '所属机房', fieldType: 'select', required: false, visible: true, order: 5 },
    { fieldName: 'rackId', displayName: '所属机柜', fieldType: 'select', required: false, visible: true, order: 6 },
    { fieldName: 'position', displayName: '位置(U)', fieldType: 'number', required: false, visible: true, order: 7 },
    { fieldName: 'height', displayName: '高度(U)', fieldType: 'number', required: false, visible: true, order: 8 },
    { fieldName: 'powerConsumption', displayName: '功率(W)', fieldType: 'number', required: false, visible: true, order: 9 },
    { fieldName: 'purchaseDate', displayName: '购买日期', fieldType: 'date', required: false, visible: true, order: 10 },
    { fieldName: 'warrantyExpiry', displayName: '保修到期', fieldType: 'date', required: false, visible: true, order: 11 },
    { fieldName: 'ipAddress', displayName: 'IP地址', fieldType: 'string', required: false, visible: true, order: 12 },
    { fieldName: 'brand', displayName: '品牌', fieldType: 'string', required: false, visible: true, order: 13 },
    { fieldName: 'description', displayName: '描述', fieldType: 'textarea', required: false, visible: true, order: 14 },
    { fieldName: 'remark', displayName: '备注', fieldType: 'textarea', required: false, visible: true, order: 15 },
  ];

  const fetchDeviceFields = async () => {
    try {
      const res = await api.get('/deviceFields');
      const sortedFields = res.data.sort((a, b) => a.order - b.order);
      setDeviceFields(sortedFields);
    } catch (error) {
      console.error('获取字段配置失败:', error);
      setDeviceFields(defaultDeviceFields);
    }
  };

  const fetchPendingDevices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      };
      Object.keys(params).forEach(key => {
        if (params[key] === null || params[key] === '' || params[key] === undefined) {
          delete params[key];
        }
      });

      const res = await api.get('/inventory/pending-devices', { params });
      setPendingDevices(res.data.pendingDevices || []);
      setPagination(prev => ({ ...prev, total: res.data.total }));
    } catch (error) {
      message.error('获取暂存设备列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/inventory/pending-devices/stats');
      setStats(res.data);
    } catch (error) {
      console.error('获取统计失败', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data.rooms || res.data || []);
    } catch (error) {
      console.error('获取机房列表失败', error);
    }
  };

  const fetchRacks = async () => {
    try {
      const res = await api.get('/racks', { params: { pageSize: 1000 } });
      setRacks(res.data.racks || res.data || []);
    } catch (error) {
      console.error('获取机柜列表失败', error);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get('/inventory/plans', { params: { pageSize: 100 } });
      setPlans(res.data.plans || []);
    } catch (error) {
      console.error('获取盘点计划列表失败', error);
    }
  };

  useEffect(() => {
    fetchPendingDevices();
    fetchStats();
  }, [fetchPendingDevices]);

  useEffect(() => {
    fetchRooms();
    fetchRacks();
    fetchPlans();
    fetchDeviceFields();
  }, []);

  const filteredRacks = selectedRoomId 
    ? racks.filter(rack => rack.roomId === selectedRoomId)
    : racks;

  const handleSync = async (pendingId) => {
    try {
      const res = await api.post(`/inventory/pending-devices/${pendingId}/sync`);
      message.success(res.data.message);
      fetchPendingDevices();
      fetchStats();
    } catch (error) {
      message.error(error.response?.data?.error || '同步失败');
    }
  };

  const handleBatchSync = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要同步的设备');
      return;
    }
    
    try {
      const res = await api.post('/inventory/pending-devices/batch-sync', {
        pendingIds: selectedRowKeys,
      });
      message.success(res.data.message);
      setSelectedRowKeys([]);
      fetchPendingDevices();
      fetchStats();
    } catch (error) {
      message.error(error.response?.data?.error || '批量同步失败');
    }
  };

  const handleEdit = (record) => {
    setCurrentDevice(record);
    setSelectedRoomId(record.roomId);
    
    // 字段名映射：数据库字段名 -> PendingDevice 模型字段名
    const fieldMapping = {
      'name': 'deviceName',
      'type': 'deviceType',
      'SN': 'serialNumber',
    };
    
    // 确保使用 deviceFields 中定义的字段名来设置表单值
    const formValues = {
      serialNumber: record.serialNumber,
      roomId: record.roomId,
      rackId: record.rackId,
    };
    
    // 使用已加载的字段配置或默认配置
    const fields = deviceFields || defaultDeviceFields;
    
    // 遍历字段，将 record 中对应的值设置到表单
    fields.forEach(field => {
      const fieldName = field.fieldName;
      // 获取实际在 record 中的字段名（使用映射）
      const recordFieldName = fieldMapping[fieldName] || fieldName;
      if (record[recordFieldName] !== undefined && record[recordFieldName] !== null) {
        formValues[fieldName] = record[recordFieldName];
      }
    });
    
    // 处理自定义字段
    if (record.customFields) {
      Object.entries(record.customFields).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formValues[key] = value;
        }
      });
    }
    
    form.setFieldsValue(formValues);
    setEditModalVisible(true);
  };

  const handleEditSubmit = async (values) => {
    try {
      const { purchaseDate, warrantyExpiry, ...otherValues } = values;
      
      const payload = {
        ...otherValues,
        purchaseDate: purchaseDate ? dayjs(purchaseDate).toISOString() : null,
        warrantyExpiry: warrantyExpiry ? dayjs(warrantyExpiry).toISOString() : null
      };
      
      await api.put(`/inventory/pending-devices/${currentDevice.pendingId}`, payload);
      message.success('更新成功');
      setEditModalVisible(false);
      setSelectedRoomId(null);
      fetchPendingDevices();
    } catch (error) {
      message.error(error.response?.data?.error || '更新失败');
    }
  };

  const handleDelete = async (pendingId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个待同步设备吗？此操作不可恢复！',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/inventory/pending-devices/${pendingId}`);
          message.success('删除成功');
          fetchPendingDevices();
          fetchStats();
        } catch (error) {
          message.error(error.response?.data?.error || '删除失败');
        }
      },
    });
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'processing', text: '待同步', icon: <SyncOutlined spin /> },
      synced: { color: 'success', text: '已同步', icon: <CheckCircleOutlined /> },
    };
    const config = statusMap[status] || statusMap.pending;
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  const getTypeLabel = (type) => {
    const typeMap = {
      server: '服务器',
      switch: '交换机',
      router: '路由器',
      storage: '存储设备',
      other: '其他',
    };
    return typeMap[type] || type;
  };

  const renderFormField = (field) => {
    const { fieldName, displayName, fieldType, required, options } = field;

    if (fieldName === 'roomId') {
      return (
        <Form.Item
          key={fieldName}
          name={fieldName}
          label={displayName}
          rules={required ? [{ required: true, message: `请选择${displayName}` }] : []}
        >
          <Select 
            placeholder={`请选择${displayName}`} 
            allowClear 
            showSearch 
            optionFilterProp="children"
            onChange={(value) => {
              setSelectedRoomId(value);
              form.setFieldsValue({ rackId: undefined });
            }}
          >
            {rooms.length > 0 ? (
              rooms.map(room => (
                <Select.Option key={room.roomId} value={room.roomId}>
                  {room.name}
                </Select.Option>
              ))
            ) : (
              <Select.Option value="" disabled>暂无机房数据</Select.Option>
            )}
          </Select>
        </Form.Item>
      );
    }

    if (fieldName === 'rackId') {
      const hasRoom = selectedRoomId || rooms.length === 0;
      return (
        <Form.Item
          key={fieldName}
          name={fieldName}
          label={displayName}
          rules={required ? [{ required: true, message: `请选择${displayName}` }] : []}
        >
          <Select 
            placeholder={selectedRoomId ? `请选择${displayName}` : "请先选择机房"} 
            allowClear 
            showSearch 
            optionFilterProp="children"
            disabled={!selectedRoomId}
          >
            {selectedRoomId ? (
              filteredRacks.length > 0 ? (
                filteredRacks.map(rack => (
                  <Select.Option key={rack.rackId} value={rack.rackId}>
                    {rack.name}
                  </Select.Option>
                ))
              ) : (
                <Select.Option value="" disabled>该机房下无机柜</Select.Option>
              )
            ) : (
              <Select.Option value="" disabled>请先选择机房</Select.Option>
            )}
          </Select>
        </Form.Item>
      );
    }

    if (fieldName === 'deviceType') {
      return (
        <Form.Item
          key={fieldName}
          name={fieldName}
          label={displayName}
          rules={required ? [{ required: true, message: `请选择${displayName}` }] : []}
        >
          <Select placeholder={`请选择${displayName}`}>
            {(Array.isArray(options) ? options : [
              { value: 'server', label: '服务器' },
              { value: 'switch', label: '交换机' },
              { value: 'router', label: '路由器' },
              { value: 'storage', label: '存储设备' },
              { value: 'other', label: '其他' },
            ]).map(opt => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      );
    }

    if (fieldType === 'select') {
      return (
        <Form.Item
          key={fieldName}
          name={fieldName}
          label={displayName}
          rules={required ? [{ required: true, message: `请选择${displayName}` }] : []}
        >
          <Select placeholder={`请选择${displayName}`} allowClear>
            {(Array.isArray(options) ? options : []).map(opt => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      );
    }

    if (fieldType === 'number') {
      return (
        <Form.Item
          key={fieldName}
          name={fieldName}
          label={displayName}
          rules={required ? [{ required: true, message: `请输入${displayName}` }] : []}
        >
          <InputNumber placeholder={`请输入${displayName}`} style={{ width: '100%' }} />
        </Form.Item>
      );
    }

    if (fieldType === 'date') {
      return (
        <Form.Item
          key={fieldName}
          name={fieldName}
          label={displayName}
          rules={required ? [{ required: true, message: `请选择${displayName}` }] : []}
        >
          <DatePicker style={{ width: '100%' }} placeholder={`请选择${displayName}`} />
        </Form.Item>
      );
    }

    if (fieldType === 'text' || fieldType === 'textarea') {
      return (
        <Form.Item
          key={fieldName}
          name={fieldName}
          label={displayName}
          rules={required ? [{ required: true, message: `请输入${displayName}` }] : []}
        >
          <Input.TextArea rows={2} placeholder={`请输入${displayName}`} />
        </Form.Item>
      );
    }

    return (
      <Form.Item
        key={fieldName}
        name={fieldName}
        label={displayName}
        rules={required ? [{ required: true, message: `请输入${displayName}` }] : []}
      >
        <Input placeholder={`请输入${displayName}`} />
      </Form.Item>
    );
  };

  const renderFormFields = () => {
    // 如果字段配置未加载，使用默认配置
    const fields = deviceFields || defaultDeviceFields;
    
    // 排除机房和机柜字段（已在Modal中单独渲染）
    const textFields = []; // 描述、备注等全文本字段
    const otherFields = []; // 其他字段
    
    fields.forEach(field => {
      // 排除 roomId 和 rackId
      if (field.fieldName === 'roomId' || field.fieldName === 'rackId') {
        return;
      }
      if (field.visible !== false) {
        if (field.fieldType === 'text') {
          textFields.push(field);
        } else {
          otherFields.push(field);
        }
      }
    });

    return (
      <>
        {/* 其他字段两列布局 */}
        {otherFields.length > 0 && (
          <Row gutter={16}>
            <Col span={12}>
              {otherFields.filter((_, i) => i % 2 === 0).map(renderFormField)}
            </Col>
            <Col span={12}>
              {otherFields.filter((_, i) => i % 2 === 1).map(renderFormField)}
            </Col>
          </Row>
        )}
        
        {/* 文本字段全文本显示 */}
        {textFields.map(renderFormField)}
      </>
    );
  };

  const columns = [
    {
      title: '设备信息',
      key: 'deviceInfo',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.deviceName}</div>
          <div style={{ fontSize: '12px', color: designTokens.colors.text.tertiary }}>
            <code>{record.serialNumber}</code>
          </div>
        </div>
      ),
    },
    {
      title: '设备类型',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 100,
      render: (type) => getTypeLabel(type),
    },
    {
      title: '位置',
      key: 'location',
      width: 180,
      render: (_, record) => (
        <span>
          {record.Room?.name || '-'} 
          {record.Rack ? ` / ${record.Rack.name}` : ''} 
          {record.position ? ` / U${record.position}` : ''}
        </span>
      ),
    },
    {
      title: '盘点计划',
      dataIndex: ['Plan', 'name'],
      key: 'planName',
      width: 150,
      render: (name) => name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '创建人',
      dataIndex: ['Creator', 'realName'],
      key: 'creator',
      width: 100,
      render: (name) => name || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '同步时间',
      dataIndex: 'syncedAt',
      key: 'syncedAt',
      width: 140,
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Tooltip title="同步到设备管理">
                <Button
                  type="text"
                  icon={<CloudUploadOutlined />}
                  onClick={() => handleSync(record.pendingId)}
                  style={{ color: '#1890ff' }}
                />
              </Tooltip>
              <Tooltip title="编辑">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                  style={{ color: '#52c41a' }}
                />
              </Tooltip>
            </>
          )}
          {record.status === 'synced' && record.syncedDeviceId && (
            <Tooltip title="查看设备">
              <Button
                type="text"
                icon={<CloudServerOutlined />}
                onClick={() => navigate(`/devices?deviceId=${record.syncedDeviceId}`)}
                style={{ color: '#1890ff' }}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="确定要删除此暂存设备吗？"
            onConfirm={() => handleDelete(record.pendingId)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                style={{ color: '#ff4d4f' }}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: designTokens.colors.background.secondary, minHeight: '100vh' }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 12, height: '100%', minHeight: 100 }}>
            <Statistic
              title="暂存设备总数"
              value={stats.total}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 12, height: '100%', minHeight: 100 }}>
            <Statistic
              title="待同步"
              value={stats.pending}
              valueStyle={{ color: '#1890ff' }}
              prefix={<SyncOutlined spin />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 12, height: '100%', minHeight: 100 }}>
            <Statistic
              title="已同步"
              value={stats.synced}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 12, height: '100%', minHeight: 100 }}>
            <Statistic
              title="同步进度"
              value={stats.total > 0 ? Math.round((stats.synced / stats.total) * 100) : 0}
              suffix="%"
            />
            <Progress 
              percent={stats.total > 0 ? Math.round((stats.synced / stats.total) * 100) : 0} 
              showInfo={false}
              strokeColor="#52c41a"
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Input
              placeholder="搜索序列号/设备名称"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              onPressEnter={() => setPagination(prev => ({ ...prev, current: 1 }))}
            />
            <Select
              placeholder="状态筛选"
              style={{ width: 120 }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <Select.Option value="pending">待同步</Select.Option>
              <Select.Option value="synced">已同步</Select.Option>
            </Select>
            <Select
              placeholder="盘点计划"
              style={{ width: 180 }}
              allowClear
              showSearch
              optionFilterProp="children"
              value={filters.planId}
              onChange={(value) => setFilters(prev => ({ ...prev, planId: value }))}
            >
              {plans.map(plan => (
                <Select.Option key={plan.planId} value={plan.planId}>
                  {plan.name}
                </Select.Option>
              ))}
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setPagination(prev => ({ ...prev, current: 1 }));
                fetchPendingDevices();
                fetchStats();
              }}
            >
              刷新
            </Button>
          </div>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={handleBatchSync}
            disabled={selectedRowKeys.length === 0}
          >
            批量同步 ({selectedRowKeys.length})
          </Button>
        </div>

        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record) => ({
              disabled: record.status !== 'pending',
            }),
          }}
          columns={columns}
          dataSource={pendingDevices}
          rowKey="pendingId"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }));
            },
          }}
          scroll={{ x: 1400 }}
          locale={{
            emptyText: <Empty description="暂无暂存设备" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
          }}
        />
      </Card>

      <Modal
        title="编辑暂存设备"
        open={editModalVisible}
        closeIcon={<CloseButton />}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedRoomId(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="序列号">
              <code>{currentDevice?.serialNumber}</code>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {getStatusTag(currentDevice?.status)}
            </Descriptions.Item>
          </Descriptions>

          {/* 机房机柜选择 - 始终显示 */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="roomId"
                label="所属机房"
              >
                <Select 
                  placeholder="请选择机房" 
                  allowClear 
                  showSearch 
                  optionFilterProp="children"
                  onChange={(value) => {
                    setSelectedRoomId(value);
                    form.setFieldsValue({ rackId: undefined });
                  }}
                >
                  {rooms.length > 0 ? (
                    rooms.map(room => (
                      <Select.Option key={room.roomId} value={room.roomId}>
                        {room.name}
                      </Select.Option>
                    ))
                  ) : (
                    <Select.Option value="" disabled>暂无机房数据</Select.Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="rackId"
                label="所属机柜"
              >
                <Select 
                  placeholder={selectedRoomId ? "请选择机柜" : "请先选择机房"} 
                  allowClear 
                  showSearch 
                  optionFilterProp="children"
                  disabled={!selectedRoomId}
                >
                  {selectedRoomId ? (
                    filteredRacks.length > 0 ? (
                      filteredRacks.map(rack => (
                        <Select.Option key={rack.rackId} value={rack.rackId}>
                          {rack.name}
                        </Select.Option>
                      ))
                    ) : (
                      <Select.Option value="" disabled>该机房下无机柜</Select.Option>
                    )
                  ) : (
                    <Select.Option value="" disabled>请先选择机房</Select.Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {renderFormFields()}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => {
                setEditModalVisible(false);
                setSelectedRoomId(null);
              }}>取消</Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PendingDeviceManagement;
