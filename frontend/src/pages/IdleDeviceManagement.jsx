import React, { useState, useEffect, useCallback } from 'react';
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
  Tag,
  Tooltip,
  Typography,
  Pagination,
  Popconfirm,
  Row,
  Col,
  Badge,
  Avatar,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  InboxOutlined,
  ClockCircleOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { deviceAPI } from '../api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const IdleDeviceManagement = () => {
  const [idleDevices, setIdleDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isShelveModalVisible, setIsShelveModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [shelvingDevice, setShelvingDevice] = useState(null);
  const [form] = Form.useForm();
  const [shelveForm] = Form.useForm();
  const [racks, setRacks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedShelveRoomId, setSelectedShelveRoomId] = useState(null);
  const [shelvePositionConflict, setShelvePositionConflict] = useState(null);
  const [shelveSelectedRackId, setShelveSelectedRackId] = useState(null);

  const fetchIdleDevices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        keyword: searchKeyword,
        sourceType: sourceTypeFilter,
      };
      const response = await axios.get('/api/idle-devices', { params });
      setIdleDevices(response.data.idleDevices || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.total || 0,
      }));
    } catch (error) {
      message.error('获取空闲设备列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchKeyword, sourceTypeFilter]);

  const fetchRacks = async () => {
    try {
      const response = await axios.get('/api/racks/all');
      setRacks(response.data.racks || []);
    } catch (error) {
      console.error('获取机柜列表失败', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get('/api/rooms', { params: { pageSize: 100 } });
      setRooms(response.data.rooms || []);
    } catch (error) {
      console.error('获取机房列表失败', error);
    }
  };

  useEffect(() => {
    fetchIdleDevices();
  }, [fetchIdleDevices]);

  useEffect(() => {
    fetchRacks();
    fetchRooms();
  }, []);

  const handleAdd = () => {
    setEditingDevice(null);
    setSelectedRoomId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = record => {
    setEditingDevice(record);
    let roomId = null;
    if (record.rackId && record.Rack) {
      roomId = record.Rack.roomId;
      setSelectedRoomId(roomId);
    }
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      model: record.model,
      serialNumber: record.serialNumber,
      powerConsumption: record.powerConsumption,
      idleReason: record.idleReason,
      warehouseId: record.warehouseId,
      roomId: roomId,
      rackId: record.rackId,
      position: record.position,
      description: record.description,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async deviceId => {
    try {
      await axios.delete(`/api/idle-devices/${deviceId}`);
      message.success('删除成功');
      fetchIdleDevices();
    } catch (error) {
      message.error(error.response?.data?.error || '删除失败');
    }
  };

  const handleShelve = record => {
    setShelvingDevice(record);
    setShelvePositionConflict(null);
    setShelveSelectedRackId(null);
    let roomId = null;
    if (record.rackId) {
      const rack = racks.find(r => r.rackId === record.rackId);
      if (rack) {
        roomId = rack.roomId;
      }
    }
    setSelectedShelveRoomId(roomId);
    shelveForm.setFieldsValue({
      name: record.name,
      type: record.type,
      model: record.model,
      serialNumber: record.serialNumber,
      height: record.height || 1,
      powerConsumption: record.powerConsumption,
      roomId: roomId,
      rackId: record.rackId,
      position: null,
      description: record.description,
    });
    if (record.rackId) {
      setShelveSelectedRackId(record.rackId);
    }
    setIsShelveModalVisible(true);
  };

  const checkShelvePositionConflict = async (rackId, position, height) => {
    if (!rackId || !position) {
      setShelvePositionConflict(null);
      return;
    }

    try {
      console.log('检查U位冲突:', { rackId, position, height, deviceId: shelvingDevice?.deviceId });
      const result = await deviceAPI.checkPosition(rackId, { position, height: height || 1 });
      console.log('U位检查结果:', result);
      if (!result.available) {
        setShelvePositionConflict(result.reason);
      } else {
        setShelvePositionConflict(null);
      }
    } catch (error) {
      console.error('检查U位冲突失败:', error);
      setShelvePositionConflict(null);
    }
  };

  const handleShelveRackChange = value => {
    setShelveSelectedRackId(value);
    const position = shelveForm.getFieldValue('position');
    const height = shelveForm.getFieldValue('height');
    if (position) {
      checkShelvePositionConflict(value, position, height);
    } else {
      setShelvePositionConflict(null);
    }
  };

  const handleShelvePositionChange = e => {
    const value = e.target.value ? parseInt(e.target.value) : null;
    const height = shelveForm.getFieldValue('height');
    if (shelveSelectedRackId && value) {
      checkShelvePositionConflict(shelveSelectedRackId, value, height);
    } else {
      setShelvePositionConflict(null);
    }
  };

  const handleShelveHeightChange = e => {
    const value = e.target.value ? parseInt(e.target.value) : null;
    const position = shelveForm.getFieldValue('position');
    if (shelveSelectedRackId && position) {
      checkShelvePositionConflict(shelveSelectedRackId, position, value);
    } else {
      setShelvePositionConflict(null);
    }
  };

  const handleShelveSubmit = async () => {
    try {
      const values = await shelveForm.validateFields();
      if (shelvePositionConflict) {
        message.error('存在U位冲突，请重新选择上架位置');
        return;
      }
      const submitData = {
        name: values.name,
        type: values.type,
        model: values.model,
        serialNumber: values.serialNumber,
        height: values.height || 1,
        powerConsumption: values.powerConsumption || 0,
        rackId: values.rackId,
        position: values.position,
        description: values.description || '',
      };
      await axios.put(`/api/idle-devices/${shelvingDevice.deviceId}/shelve`, submitData);
      message.success('设备上架成功');
      setIsShelveModalVisible(false);
      fetchIdleDevices();
    } catch (error) {
      message.error(error.response?.data?.error || '上架失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData = { ...values };
      if (submitData.warehouseId) {
        submitData.rackId = null;
        submitData.position = null;
        submitData.sourceType = 'warehouse';
      } else if (submitData.rackId) {
        submitData.warehouseId = null;
        submitData.sourceType = 'rack';
      }
      if (editingDevice) {
        await axios.put(`/api/idle-devices/${editingDevice.deviceId}`, submitData);
        message.success('更新成功');
      } else {
        const response = await axios.post('/api/idle-devices', submitData);
        message.success(`添加成功，设备ID：${response.data.deviceId}`);
      }
      setIsModalVisible(false);
      fetchIdleDevices();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const getIdleDays = idleDate => {
    if (!idleDate) return 0;
    const diff = new Date() - new Date(idleDate);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_, __, index) => (
        <Badge
          count={index + 1 + (pagination.current - 1) * pagination.pageSize}
          style={{ backgroundColor: '#f59e0b' }}
        />
      ),
    },
    {
      title: '设备信息',
      key: 'deviceInfo',
      width: 220,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar
            style={{
              backgroundColor:
                record.type === 'server'
                  ? '#3b82f6'
                  : record.type === 'switch'
                    ? '#8b5cf6'
                    : '#64748b',
            }}
            icon={<InboxOutlined />}
          />
          <div>
            <Text strong style={{ fontSize: '14px', display: 'block' }}>
              {record.name || '-'}
            </Text>
            <Space size={4}>
              <Tag
                color={
                  record.type === 'server'
                    ? 'blue'
                    : record.type === 'switch'
                      ? 'purple'
                      : 'default'
                }
                style={{ marginRight: 0 }}
              >
                {record.type === 'server' ? '服务器' : record.type === 'switch' ? '交换机' : '其他'}
              </Tag>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.model || '-'}
              </Text>
            </Space>
          </div>
        </div>
      ),
    },
    {
      title: '设备ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 100,
      render: text => (
        <Text code style={{ fontSize: '12px', padding: '2px 6px' }}>
          {text}
        </Text>
      ),
    },
    {
      title: '位置',
      key: 'location',
      width: 160,
      render: (_, record) => {
        if (record.sourceType === 'warehouse' && record.warehouseId) {
          return (
            <Space>
              <InboxOutlined style={{ color: '#64748b' }} />
              <Text type="secondary">{record.warehouseId}</Text>
            </Space>
          );
        }
        if (record.sourceType === 'rack' && record.Rack) {
          const location = [
            record.Rack.Room?.name,
            record.Rack.name,
            record.position ? `U${record.position}` : null,
          ]
            .filter(Boolean)
            .join(' / ');
          return (
            <Space>
              <InboxOutlined style={{ color: '#3b82f6' }} />
              <Text type="secondary">{location || '-'}</Text>
            </Space>
          );
        }
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: '空闲天数',
      key: 'idleDays',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const days = getIdleDays(record.idleDate);
        const color = days > 30 ? '#ef4444' : days > 7 ? '#f59e0b' : '#22c55e';
        return (
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color, fontWeight: 600, fontSize: '16px' }}>{days}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              天
            </Text>
          </div>
        );
      },
    },
    {
      title: '空闲原因',
      dataIndex: 'idleReason',
      key: 'idleReason',
      width: 140,
      ellipsis: true,
      render: text => (
        <Tooltip title={text || '-'}>
          <Text type="secondary" ellipsis>
            {text || '-'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '来源',
      dataIndex: 'sourceType',
      key: 'sourceType',
      width: 80,
      align: 'center',
      render: type => (
        <Tag color={type === 'warehouse' ? 'green' : 'blue'}>
          {type === 'warehouse' ? '库房' : '机架'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="上架">
            <Button
              type="text"
              icon={<UploadOutlined style={{ color: '#22c55e' }} />}
              onClick={() => handleShelve(record)}
              style={{ borderRadius: '6px' }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ borderRadius: '6px', color: '#3b82f6' }}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除？"
            onConfirm={() => handleDelete(record.deviceId)}
            okText="确认"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                style={{ borderRadius: '6px' }}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const statCards = [
    {
      title: '空闲设备总数',
      value: pagination.total,
      icon: <InboxOutlined />,
      color: '#f59e0b',
      bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    },
    {
      title: '本周新增',
      value: idleDevices.filter(d => {
        if (!d.idleDate) return false;
        const diff = new Date() - new Date(d.idleDate);
        return diff < 7 * 24 * 60 * 60 * 1000;
      }).length,
      icon: <PlusOutlined />,
      color: '#22c55e',
      bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    },
    {
      title: '长期空闲(>30天)',
      value: idleDevices.filter(d => getIdleDays(d.idleDate) > 30).length,
      icon: <ClockCircleOutlined />,
      color: '#ef4444',
      bg: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={4} style={{ marginBottom: '4px', color: '#1e293b' }}>
          空闲设备管理
        </Title>
        <Text type="secondary">管理已下线或空闲的设备，支持恢复领用到设备管理</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {statCards.map((stat, index) => (
          <Col key={index} xs={12} sm={8} md={8}>
            <Card
              style={{
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                background: stat.bg,
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    {stat.title}
                  </Text>
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: stat.color,
                      lineHeight: 1.2,
                      marginTop: '4px',
                    }}
                  >
                    {stat.value}
                  </div>
                </div>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        style={{
          borderRadius: '16px',
          border: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(135deg, #fefefe 0%, #f8fafc 100%)',
            borderRadius: '16px 16px 0 0',
          }}
        >
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space size="middle" wrap>
                <Input
                  placeholder="搜索设备ID/名称/序列号"
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  style={{ borderRadius: '10px', width: '260px', height: '40px' }}
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  allowClear
                />
                <Select
                  value={sourceTypeFilter}
                  onChange={setSourceTypeFilter}
                  style={{ width: 120, height: 40 }}
                >
                  <Option value="all">全部来源</Option>
                  <Option value="rack">机架</Option>
                  <Option value="warehouse">库房</Option>
                </Select>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchIdleDevices}
                  style={{ height: 40, borderRadius: '10px' }}
                >
                  刷新
                </Button>
              </Space>
            </Col>
            <Col>
              <Space size="middle">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                  style={{
                    height: 40,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                  }}
                >
                  添加空闲设备
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={idleDevices}
          rowKey="deviceId"
          loading={loading}
          pagination={false}
          scroll={{ x: 1100 }}
          rowClassName={(record, index) => (index % 2 === 0 ? 'table-row-even' : 'table-row-odd')}
          style={{ borderRadius: '0 0 16px 16px' }}
        />

        {pagination.total > 0 && (
          <div
            style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}
          >
            <Row justify="space-between" align="middle">
              <Col>
                <Text type="secondary">
                  共 <Text strong>{pagination.total}</Text> 条记录
                </Text>
              </Col>
              <Col>
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  onChange={(page, pageSize) =>
                    setPagination(prev => ({ ...prev, current: page, pageSize }))
                  }
                  showSizeChanger
                  showQuickJumper
                  showTotal={total => `共 ${total} 条`}
                  size="small"
                />
              </Col>
            </Row>
          </div>
        )}
      </Card>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: editingDevice ? '#3b82f6' : '#f59e0b',
              }}
            />
            {editingDevice ? '编辑空闲设备' : '添加空闲设备'}
          </div>
        }
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={680}
        destroyOnClose
        bodyStyle={{ padding: '24px' }}
        style={{ top: 100 }}
      >
        <Form form={form} layout="vertical" size="middle">
          <div
            style={{
              background: 'linear-gradient(135deg, #fefefe 0%, #f8fafc 100%)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{ width: '4px', height: '16px', background: '#3b82f6', borderRadius: '2px' }}
              />
              设备基本信息
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="设备名称"
                  rules={[{ required: true, message: '请输入设备名称' }]}
                >
                  <Input placeholder="请输入设备名称" style={{ borderRadius: '8px' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="type" label="设备类型">
                  <Select placeholder="请选择设备类型" allowClear style={{ borderRadius: '8px' }}>
                    <Option value="server">服务器</Option>
                    <Option value="switch">交换机</Option>
                    <Option value="router">路由器</Option>
                    <Option value="storage">存储设备</Option>
                    <Option value="other">其他</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="model" label="设备型号">
                  <Input placeholder="请输入设备型号" style={{ borderRadius: '8px' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="serialNumber" label="序列号">
                  <Input placeholder="请输入序列号" style={{ borderRadius: '8px' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="powerConsumption" label="功耗(W)">
                  <Input
                    type="number"
                    placeholder="请输入功耗"
                    min={0}
                    style={{ borderRadius: '8px' }}
                  />
                </Form.Item>
              </Col>
              {editingDevice && (
                <Col span={12}>
                  <Form.Item label="设备ID">
                    <Input
                      value={editingDevice.deviceId}
                      disabled
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>
          </div>

          <div
            style={{
              background: 'linear-gradient(135deg, #fefefe 0%, #f8fafc 100%)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{ width: '4px', height: '16px', background: '#22c55e', borderRadius: '2px' }}
              />
              位置信息
            </div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="roomId" label="机房">
                  <Select
                    placeholder="请选择机房"
                    allowClear
                    onChange={value => {
                      setSelectedRoomId(value);
                      form.setFieldsValue({ rackId: null, position: null });
                      if (value) {
                        form.setFieldsValue({ warehouseId: null });
                      }
                    }}
                    style={{ borderRadius: '8px' }}
                  >
                    {rooms.map(room => (
                      <Option key={room.roomId} value={room.roomId}>
                        {room.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="rackId" label="机柜">
                  <Select
                    placeholder={selectedRoomId ? '请选择机柜' : '请先选择机房'}
                    allowClear
                    disabled={!selectedRoomId}
                    style={{ borderRadius: '8px' }}
                  >
                    {racks
                      .filter(rack => rack.roomId === selectedRoomId)
                      .map(rack => (
                        <Option key={rack.rackId} value={rack.rackId}>
                          {rack.name}
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="position" label="U位">
                  <Input
                    type="number"
                    placeholder="请输入U位"
                    min={1}
                    disabled={!selectedRoomId}
                    style={{ borderRadius: '8px' }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <div
              style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', margin: '8px 0' }}
            >
              — 或 —
            </div>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="warehouseId" label="库房位置">
                  <Input
                    placeholder="手动输入库房位置"
                    allowClear
                    onChange={() => {
                      if (form.getFieldValue('warehouseId')) {
                        form.setFieldsValue({ roomId: null, rackId: null, position: null });
                        setSelectedRoomId(null);
                      }
                    }}
                    style={{ borderRadius: '8px' }}
                    prefix={<InboxOutlined style={{ color: '#94a3b8' }} />}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div
            style={{
              background: 'linear-gradient(135deg, #fefefe 0%, #f8fafc 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{ width: '4px', height: '16px', background: '#64748b', borderRadius: '2px' }}
              />
              附加信息
            </div>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="idleReason" label="空闲原因">
                  <Input
                    placeholder="请输入空闲原因，如：设备下线、备件库存等"
                    style={{ borderRadius: '8px' }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="description" label="备注">
                  <TextArea rows={2} placeholder="请输入备注信息" style={{ borderRadius: '8px' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}
            />
            设备上架
          </div>
        }
        open={isShelveModalVisible}
        onOk={handleShelveSubmit}
        onCancel={() => setIsShelveModalVisible(false)}
        okText="确认上架"
        cancelText="取消"
        width={680}
        destroyOnClose
        bodyStyle={{ padding: '24px' }}
      >
        <Form form={shelveForm} layout="vertical" size="middle">
          <div
            style={{
              background: 'linear-gradient(135deg, #fefefe 0%, #f8fafc 100%)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{ width: '4px', height: '16px', background: '#3b82f6', borderRadius: '2px' }}
              />
              设备基本信息
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="设备名称"
                  rules={[{ required: true, message: '请输入设备名称' }]}
                >
                  <Input placeholder="请输入设备名称" style={{ borderRadius: '8px' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="type"
                  label="设备类型"
                  rules={[{ required: true, message: '请选择设备类型' }]}
                >
                  <Select placeholder="请选择设备类型" style={{ borderRadius: '8px' }}>
                    <Option value="server">服务器</Option>
                    <Option value="switch">交换机</Option>
                    <Option value="router">路由器</Option>
                    <Option value="storage">存储设备</Option>
                    <Option value="other">其他设备</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="model" label="设备型号">
                  <Input placeholder="请输入设备型号" style={{ borderRadius: '8px' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="serialNumber"
                  label="序列号"
                  rules={[{ required: true, message: '请输入序列号' }]}
                >
                  <Input placeholder="请输入序列号" style={{ borderRadius: '8px' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="height" label="高度(U)">
                  <Input
                    type="number"
                    placeholder="请输入高度"
                    min={1}
                    style={{ borderRadius: '8px' }}
                    onChange={handleShelveHeightChange}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="powerConsumption" label="功率(W)">
                  <Input
                    type="number"
                    placeholder="请输入功率"
                    min={0}
                    style={{ borderRadius: '8px' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div
            style={{
              background: 'linear-gradient(135deg, #fefefe 0%, #f8fafc 100%)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{ width: '4px', height: '16px', background: '#22c55e', borderRadius: '2px' }}
              />
              上架位置
            </div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="roomId" label="机房">
                  <Select
                    placeholder="请选择机房"
                    onChange={value => {
                      setSelectedShelveRoomId(value);
                      shelveForm.setFieldsValue({ rackId: null });
                    }}
                    style={{ borderRadius: '8px' }}
                  >
                    {rooms.map(room => (
                      <Option key={room.roomId} value={room.roomId}>
                        {room.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="rackId" label="机柜">
                  <Select
                    placeholder={selectedShelveRoomId ? '请选择机柜' : '请先选择机房'}
                    disabled={!selectedShelveRoomId}
                    style={{ borderRadius: '8px' }}
                    onChange={handleShelveRackChange}
                  >
                    {racks
                      .filter(rack => rack.roomId === selectedShelveRoomId)
                      .map(rack => (
                        <Option key={rack.rackId} value={rack.rackId}>
                          {rack.name}
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="position" label="U位">
                  <Input
                    type="number"
                    placeholder="请输入U位"
                    min={1}
                    style={{ borderRadius: '8px' }}
                    onChange={handleShelvePositionChange}
                  />
                </Form.Item>
              </Col>
            </Row>
            {shelvePositionConflict && (
              <div style={{ marginTop: '12px' }}>
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <ExclamationCircleOutlined
                    style={{ color: '#ef4444', fontSize: '18px', marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ color: '#dc2626', fontWeight: 600, marginBottom: '4px' }}>
                      U位冲突
                    </div>
                    <div style={{ color: '#991b1b', fontSize: '13px' }}>
                      {shelvePositionConflict}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              background: 'linear-gradient(135deg, #fefefe 0%, #f8fafc 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{ width: '4px', height: '16px', background: '#64748b', borderRadius: '2px' }}
              />
              备注信息
            </div>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="description" label="备注">
                  <TextArea rows={2} placeholder="请输入备注信息" style={{ borderRadius: '8px' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>

      <style>{`
        .ant-table-thead > tr > th {
          background: #f8fafc !important;
          font-weight: 600 !important;
          color: #334155 !important;
          border-bottom: 2px solid #e2e8f0 !important;
        }
        .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f1f5f9 !important;
          padding: 16px 12px !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: #fafafa !important;
        }
        .ant-badge-count {
          box-shadow: none !important;
        }
        .ant-btn-primary:hover {
          opacity: 0.9 !important;
        }
      `}</style>
    </div>
  );
};

export default IdleDeviceManagement;
