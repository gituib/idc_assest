import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, message, Card, Space,
  InputNumber, Progress, Drawer, Tag, Tooltip, Dropdown, Badge,
  Row, Col, Statistic, Typography, Empty, Spin, Alert, Checkbox
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  SearchOutlined, FilterOutlined, MoreOutlined, EyeOutlined,
  CloudOutlined, EnvironmentOutlined, DashboardOutlined,
  ExpandOutlined, CompressOutlined, CheckCircleOutlined,
  WarningOutlined, SyncOutlined, DeleteFilled
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

const statCardStyle = (color) => ({
  background: 'rgba(255, 255, 255, 0.15)',
  borderRadius: designTokens.borderRadius.medium,
  padding: '16px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(10px)'
});

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

const CapacityProgress = ({ used, capacity, color }) => {
  const percentage = Math.min((used / capacity) * 100, 100);
  const status = percentage >= 90 ? 'exception' : percentage >= 70 ? 'active' : 'success';

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <Text style={{ fontSize: '13px', color: designTokens.colors.text.secondary }}>
          {used} / {capacity}
        </Text>
        <Text style={{ fontSize: '13px', fontWeight: '600', color }}>
          {percentage.toFixed(1)}%
        </Text>
      </div>
      <Progress
        percent={percentage}
        showInfo={false}
        strokeColor={color}
        trailColor="#f0f0f0"
        strokeLinecap="round"
        size="small"
      />
    </div>
  );
};

const RoomCard = ({ room, onEdit, onDelete, onView, selected, onSelect }) => {
  const rackCount = room.Racks?.length || 0;
  const capacityUsage = (rackCount / room.capacity) * 100;
  const statusInfo = statusConfig[room.status];

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
      onClick={() => onSelect(room.roomId)}
      onDoubleClick={() => onView(room)}
      styles={{ body: { padding: '20px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <CloudOutlined style={{ fontSize: '20px', color: designTokens.colors.primary.main }} />
            <Text strong style={{ fontSize: '16px', color: designTokens.colors.text.primary }}>
              {room.name}
            </Text>
          </div>
          <Text type="secondary" style={{ fontSize: '13px' }}>{room.roomId}</Text>
        </div>
        <Tag color={statusInfo.color} icon={statusInfo.icon} style={{ borderRadius: '20px' }}>
          {statusInfo.text}
        </Tag>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <EnvironmentOutlined style={{ color: designTokens.colors.text.tertiary }} />
        <Text style={{ fontSize: '13px', color: designTokens.colors.text.secondary }}>
          {room.location}
        </Text>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <CapacityProgress
          used={rackCount}
          capacity={room.capacity}
          color={capacityUsage >= 90 ? designTokens.colors.error.main : capacityUsage >= 70 ? designTokens.colors.warning.main : designTokens.colors.success.main}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>面积</Text>
            <div style={{ fontSize: '14px', fontWeight: '600', color: designTokens.colors.text.primary }}>
              {room.area} ㎡
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>机柜</Text>
            <div style={{ fontSize: '14px', fontWeight: '600', color: designTokens.colors.text.primary }}>
              {rackCount}
            </div>
          </div>
        </div>
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={(e) => { e.stopPropagation(); onView(room); }}
              style={{ color: designTokens.colors.text.secondary }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => { e.stopPropagation(); onEdit(room); }}
              style={{ color: designTokens.colors.primary.main }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={(e) => { e.stopPropagation(); onDelete(room.roomId); }}
            />
          </Tooltip>
        </Space>
      </div>
    </Card>
  );
};

function RoomManagement() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [viewingRoom, setViewingRoom] = useState(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form] = Form.useForm();

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/rooms');
      setRooms(response.data);
    } catch (error) {
      message.error('获取机房列表失败');
      console.error('获取机房列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const showModal = (room = null) => {
    setEditingRoom(room);
    if (room) {
      form.setFieldsValue(room);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingRoom(null);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingRoom) {
        await axios.put(`/api/rooms/${editingRoom.roomId}`, values);
        message.success('机房更新成功');
      } else {
        await axios.post('/api/rooms', values);
        message.success('机房创建成功');
      }
      setModalVisible(false);
      fetchRooms();
      setEditingRoom(null);
    } catch (error) {
      message.error(editingRoom ? '机房更新失败' : '机房创建失败');
      console.error(editingRoom ? '机房更新失败:' : '机房创建失败:', error);
    }
  };

  const handleDelete = async (roomId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个机房吗？删除后无法恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`/api/rooms/${roomId}`);
          message.success('机房删除成功');
          fetchRooms();
        } catch (error) {
          message.error('机房删除失败');
          console.error('机房删除失败:', error);
        }
      }
    });
  };

  const handleBatchDelete = async () => {
    if (selectedRoomIds.length === 0) {
      message.warning('请先选择要删除的机房');
      return;
    }

    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRoomIds.length} 个机房吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(selectedRoomIds.map(id => axios.delete(`/api/rooms/${id}`)));
          message.success(`成功删除 ${selectedRoomIds.length} 个机房`);
          setSelectedRoomIds([]);
          fetchRooms();
        } catch (error) {
          message.error('批量删除失败');
          console.error('批量删除失败:', error);
        }
      }
    });
  };

  const handleView = (room) => {
    setViewingRoom(room);
    setDrawerVisible(true);
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchKeyword = !searchKeyword ||
        room.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        room.roomId?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        room.location?.toLowerCase().includes(searchKeyword.toLowerCase());

      const matchStatus = statusFilter === 'all' || room.status === statusFilter;

      return matchKeyword && matchStatus;
    });
  }, [rooms, searchKeyword, statusFilter]);

  const stats = useMemo(() => ({
    total: rooms.length,
    active: rooms.filter(r => r.status === 'active').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
    inactive: rooms.filter(r => r.status === 'inactive').length,
    totalRacks: rooms.reduce((sum, r) => sum + (r.Racks?.length || 0), 0),
    totalCapacity: rooms.reduce((sum, r) => sum + (r.capacity || 0), 0)
  }), [rooms]);

  const tableColumns = [
    {
      title: '机房信息',
      key: 'roomInfo',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: designTokens.colors.primary.bgGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CloudOutlined style={{ fontSize: '22px', color: designTokens.colors.primary.main }} />
          </div>
          <div>
            <div style={{ fontWeight: '600', color: designTokens.colors.text.primary }}>
              {record.name}
            </div>
            <div style={{ fontSize: '12px', color: designTokens.colors.text.tertiary }}>
              {record.roomId}
            </div>
          </div>
        </div>
      )
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      render: (location) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <EnvironmentOutlined style={{ color: designTokens.colors.text.tertiary }} />
          <span>{location}</span>
        </div>
      )
    },
    {
      title: '面积/容量',
      key: 'areaCapacity',
      render: (_, record) => (
        <div>
          <Text style={{ fontSize: '13px' }}>{record.area} ㎡</Text>
          <div style={{ marginTop: '4px' }}>
            <CapacityProgress
              used={record.Racks?.length || 0}
              capacity={record.capacity}
              color={designTokens.colors.primary.main}
            />
          </div>
        </div>
      )
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
      title: '机柜数',
      key: 'rackCount',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <DashboardOutlined style={{ color: designTokens.colors.text.tertiary }} />
          <span>{record.Racks?.length || 0}</span>
        </div>
      ),
      sorter: (a, b) => (a.Racks?.length || 0) - (b.Racks?.length || 0)
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
              onClick={() => handleDelete(record.roomId)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys: selectedRoomIds,
    onChange: (selectedRowKeys) => {
      setSelectedRoomIds(selectedRowKeys);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CloudOutlined />
              机房管理
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
              管理和监控所有机房设施
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={statCardStyle()}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>总机房</Text>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.total}</div>
            </div>
            <div style={statCardStyle()}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>在用机房</Text>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#52c41a' }}>{stats.active}</div>
            </div>
            <div style={statCardStyle()}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>总机柜</Text>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.totalRacks}</div>
            </div>
          </div>
        </div>
      </div>

      <Card style={cardStyle} styles={{ header: cardHeadStyle, body: { padding: '20px 24px' } }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '600px' }}>
            <Input
              placeholder="搜索机房名称、ID、位置..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={searchInputStyle}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '140px', height: '42px' }}
              dropdownStyle={{ borderRadius: '10px' }}
            >
              <Option value="all">全部状态</Option>
              <Option value="active">在用</Option>
              <Option value="maintenance">维护中</Option>
              <Option value="inactive">停用</Option>
            </Select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {selectedRoomIds.length > 0 && (
              <Button
                danger
                icon={<DeleteFilled />}
                onClick={handleBatchDelete}
                style={{ borderRadius: '10px', height: '42px' }}
              >
                批量删除 ({selectedRoomIds.length})
              </Button>
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchRooms}
              loading={loading}
              style={actionButtonStyle}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal()}
              style={primaryButtonStyle}
            >
              添加机房
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
            dataSource={filteredRooms}
            rowKey="roomId"
            loading={loading}
            rowSelection={rowSelection}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
            scroll={{ x: 1000 }}
            rowClassName={() => 'table-row'}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredRooms.length > 0 ? (
              filteredRooms.map(room => (
                <Col xs={24} sm={12} lg={8} xl={6} key={room.roomId}>
                  <RoomCard
                    room={room}
                    onEdit={showModal}
                    onDelete={handleDelete}
                    onView={handleView}
                    selected={selectedRoomIds.includes(room.roomId)}
                    onSelect={(id) => {
                      if (selectedRoomIds.includes(id)) {
                        setSelectedRoomIds(selectedRoomIds.filter(rid => rid !== id));
                      } else {
                        setSelectedRoomIds([...selectedRoomIds, id]);
                      }
                    }}
                  />
                </Col>
              ))
            ) : (
              <Col span={24}>
                <Empty description="暂无机房数据" style={{ padding: '60px 0' }} />
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
            {editingRoom ? '编辑机房' : '添加机房'}
          </div>
        }
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
        destroyOnHidden
        styles={{
          body: { padding: '24px' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }
        }}
        style={{ borderRadius: '16px' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="roomId"
                label="机房ID"
                rules={[{ required: true, message: '请输入机房ID' }]}
              >
                <Input placeholder="请输入机房ID" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="机房名称"
                rules={[{ required: true, message: '请输入机房名称' }]}
              >
                <Input placeholder="请输入机房名称" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="location"
            label="位置"
            rules={[{ required: true, message: '请输入机房位置' }]}
          >
            <Input prefix={<EnvironmentOutlined />} placeholder="请输入机房位置" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="area"
                label="面积(㎡)"
                rules={[{ required: true, message: '请输入机房面积' }]}
              >
                <InputNumber placeholder="请输入机房面积" min={0} step={0.1} style={{ width: '100%', borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="capacity"
                label="容量(机柜数)"
                rules={[{ required: true, message: '请输入机柜容量' }]}
              >
                <InputNumber placeholder="请输入机柜容量" min={0} style={{ width: '100%', borderRadius: '8px' }} />
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

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入机房描述" rows={3} style={{ borderRadius: '8px' }} />
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
            <CloudOutlined style={{ fontSize: '20px', color: designTokens.colors.primary.main }} />
            机房详情 - {viewingRoom?.name}
          </div>
        }
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={480}
        styles={{
          header: { borderBottom: '1px solid #f0f0f0' },
          body: { padding: '24px' }
        }}
      >
        {viewingRoom && (
          <div>
            <div style={{
              padding: '20px',
              background: designTokens.colors.primary.bgGradient,
              borderRadius: designTokens.borderRadius.medium,
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <CloudOutlined style={{ fontSize: '32px', color: designTokens.colors.primary.main }} />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: designTokens.colors.text.primary }}>
                    {viewingRoom.name}
                  </div>
                  <div style={{ fontSize: '13px', color: designTokens.colors.text.secondary }}>
                    {viewingRoom.roomId}
                  </div>
                </div>
              </div>
              <Tag color={statusConfig[viewingRoom.status].color} style={{ borderRadius: '20px' }}>
                {statusConfig[viewingRoom.status].text}
              </Tag>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>位置</Text>
              <div style={{ fontSize: '15px', fontWeight: '500', marginTop: '4px' }}>
                <EnvironmentOutlined style={{ marginRight: '8px' }} />
                {viewingRoom.location}
              </div>
            </div>

            <Row gutter={16} style={{ marginBottom: '20px' }}>
              <Col span={12}>
                <div style={{ padding: '16px', background: '#fafafa', borderRadius: '10px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>面积</Text>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: designTokens.colors.text.primary }}>
                    {viewingRoom.area} ㎡
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: '16px', background: '#fafafa', borderRadius: '10px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>容量</Text>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: designTokens.colors.text.primary }}>
                    {viewingRoom.capacity} 机柜
                  </div>
                </div>
              </Col>
            </Row>

            <div style={{ marginBottom: '20px' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>机柜使用情况</Text>
              <div style={{ marginTop: '12px' }}>
                <CapacityProgress
                  used={viewingRoom.Racks?.length || 0}
                  capacity={viewingRoom.capacity}
                  color={designTokens.colors.primary.main}
                />
              </div>
            </div>

            {viewingRoom.description && (
              <div style={{ marginBottom: '20px' }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>描述</Text>
                <div style={{ marginTop: '8px', padding: '12px', background: '#fafafa', borderRadius: '8px' }}>
                  {viewingRoom.description}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  setDrawerVisible(false);
                  showModal(viewingRoom);
                }}
                style={primaryButtonStyle}
              >
                编辑机房
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  setDrawerVisible(false);
                  handleDelete(viewingRoom.roomId);
                }}
                style={{ borderRadius: '8px', height: '42px' }}
              >
                删除机房
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default RoomManagement;
