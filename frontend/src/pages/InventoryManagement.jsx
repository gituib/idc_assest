import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Card,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Popconfirm,
  Tooltip,
  Empty,
  Progress,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  FileSearchOutlined,
  ClockCircleOutlined,
  CheckSquareOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { designTokens } from '../config/theme';
import CloseButton from '../components/CloseButton';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const InventoryManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIdParam = searchParams.get('planId');
  const [activeTab, setActiveTab] = useState(planIdParam ? 'execution' : 'list');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [racks, setRacks] = useState([]);
  const [filteredRacks, setFilteredRacks] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [stats, setStats] = useState({
    totalPlans: 0,
    completedPlans: 0,
    inProgressPlans: 0,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchParamsObj, setSearchParamsObj] = useState({});
  const [form] = Form.useForm();

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...searchParamsObj,
      };
      const res = await api.get('/inventory/plans', { params });
      setPlans(res.data.plans || []);
      setPagination(prev => ({
        ...prev,
        total: res.data.total || 0,
      }));
    } catch (error) {
      message.error('获取盘点计划失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchParamsObj]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/inventory/stats/dashboard');
      setStats({
        totalPlans: res.data.totalPlans || 0,
        completedPlans: res.data.completedPlans || 0,
        inProgressPlans: res.data.inProgressPlans || 0,
      });
    } catch (error) {
      console.error('获取统计失败', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms', { params: { pageSize: 1000 } });
      setRooms(Array.isArray(res.data) ? res.data : res.data.rooms || []);
    } catch (error) {
      console.error('获取机房失败', error);
    }
  };

  const fetchRacks = async () => {
    try {
      const res = await api.get('/racks', { params: { pageSize: 1000 } });
      const allRacks = Array.isArray(res.data) ? res.data : res.data.racks || [];
      setRacks(allRacks);
      setFilteredRacks(allRacks);
    } catch (error) {
      console.error('获取机柜失败', error);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchStats();
    fetchRooms();
    fetchRacks();
  }, [fetchPlans]);

  useEffect(() => {
    if (planIdParam) {
      setActiveTab('execution');
    }
  }, [planIdParam]);

  const handleAdd = () => {
    setEditingPlan(null);
    form.resetFields();
    setSelectedRooms([]);
    setFilteredRacks(racks);
    setModalVisible(true);
  };

  const handleEdit = record => {
    setEditingPlan(record);
    const targetRooms = record.targetRooms || [];
    setSelectedRooms(targetRooms);

    if (targetRooms.length > 0) {
      const filtered = racks.filter(
        rack =>
          targetRooms.includes(rack.roomId) || (rack.Room && targetRooms.includes(rack.Room.roomId))
      );
      setFilteredRacks(filtered);
    } else {
      setFilteredRacks(racks);
    }

    form.setFieldsValue({
      name: record.name,
      type: record.type,
      description: record.description,
      scheduledDate: record.scheduledDate ? dayjs(record.scheduledDate) : null,
      targetRooms: targetRooms,
      targetRacks: record.targetRacks || [],
    });
    setModalVisible(true);
  };

  const handleDelete = async planId => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个盘点计划吗？此操作不可恢复！',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/inventory/plans/${planId}`);
          message.success('删除成功');
          fetchPlans();
          fetchStats();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubmit = async values => {
    try {
      const data = {
        ...values,
        scheduledDate: values.scheduledDate?.toISOString(),
        targetRooms: values.targetRooms || [],
        targetRacks: values.targetRacks || [],
      };

      if (editingPlan) {
        await api.put(`/inventory/plans/${editingPlan.planId}`, data);
        message.success('更新成功');
      } else {
        await api.post('/inventory/plans', data);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchPlans();
      fetchStats();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleStart = async plan => {
    try {
      await api.post(`/inventory/plans/${plan.planId}/start`);
      message.success('盘点任务已启动');
      fetchPlans();
      fetchStats();
    } catch (error) {
      message.error(error.response?.data?.error || '启动失败');
    }
  };

  const handleComplete = async plan => {
    try {
      await api.post(`/inventory/plans/${plan.planId}/complete`);
      message.success('盘点已完成');
      fetchPlans();
      fetchStats();
    } catch (error) {
      message.error(error.response?.data?.error || '完成失败');
    }
  };

  const handleViewTasks = plan => {
    navigate(`/inventory/execution?planId=${plan.planId}`);
  };

  const handleRoomsChange = roomIds => {
    setSelectedRooms(roomIds || []);
    if (!roomIds || roomIds.length === 0) {
      setFilteredRacks(racks);
    } else {
      const filtered = racks.filter(
        rack => roomIds.includes(rack.roomId) || (rack.Room && roomIds.includes(rack.Room.roomId))
      );
      setFilteredRacks(filtered);
    }
  };

  const getStatusTag = status => {
    const statusMap = {
      draft: { color: 'default', text: '草稿', icon: <FileSearchOutlined /> },
      pending: { color: 'orange', text: '待执行', icon: <ClockCircleOutlined /> },
      in_progress: { color: 'processing', text: '进行中', icon: <SyncOutlined spin /> },
      completed: { color: 'success', text: '已完成', icon: <CheckSquareOutlined /> },
      cancelled: { color: 'error', text: '已取消', icon: <DeleteOutlined /> },
    };
    const config = statusMap[status] || statusMap.draft;
    return (
      <Tag color={config.color} icon={config.icon} style={{ borderRadius: 6, padding: '2px 8px' }}>
        {config.text}
      </Tag>
    );
  };

  const getTypeTag = type => {
    const typeMap = {
      full: { color: 'blue', text: '全面盘点' },
      partial: { color: 'cyan', text: '局部盘点' },
      sample: { color: 'purple', text: '抽样盘点' },
    };
    const config = typeMap[type] || typeMap.full;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getProgressPercent = plan => {
    if (!plan.totalDevices || plan.totalDevices === 0) return 0;
    return Math.round((plan.checkedDevices / plan.totalDevices) * 100);
  };

  const columns = [
    {
      title: '盘点计划',
      key: 'planInfo',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1890ff15 0%, #1890ff08 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <InboxOutlined style={{ fontSize: '22px', color: designTokens.colors.primary.main }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: designTokens.colors.text.primary }}>
              {record.name}
            </div>
            <div style={{ fontSize: '12px', color: designTokens.colors.text.tertiary }}>
              {record.planId}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: type => getTypeTag(type),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: status => getStatusTag(status),
    },
    {
      title: '盘点进度',
      key: 'progress',
      width: 180,
      render: (_, record) => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
              已盘: {record.checkedDevices || 0} / {record.totalDevices || 0}
            </span>
            <span style={{ fontSize: 12, color: '#52c41a', fontWeight: 600 }}>
              {getProgressPercent(record)}%
            </span>
          </div>
          <Progress
            percent={getProgressPercent(record)}
            size="small"
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#52c41a',
            }}
          />
        </div>
      ),
    },
    {
      title: '异常设备',
      key: 'abnormal',
      width: 100,
      render: (_, record) =>
        record.abnormalDevices > 0 ? (
          <Tag color="error">{record.abnormalDevices} 异常</Tag>
        ) : (
          <span style={{ color: '#8c8c8c' }}>-</span>
        ),
    },
    {
      title: '创建人',
      dataIndex: ['Creator', 'realName'],
      key: 'creator',
      width: 100,
      render: name => name || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: date => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看任务">
            <Button
              type="text"
              icon={<InfoCircleOutlined />}
              onClick={() => handleViewTasks(record)}
              style={{ color: designTokens.colors.text.secondary }}
            />
          </Tooltip>
          {record.status === 'draft' || record.status === 'pending' ? (
            <Tooltip title="启动盘点">
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                onClick={() => handleStart(record)}
                style={{ color: '#52c41a' }}
              />
            </Tooltip>
          ) : null}
          {record.status === 'in_progress' ? (
            <>
              <Tooltip title="继续盘点">
                <Button
                  type="text"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleViewTasks(record)}
                  style={{ color: '#1890ff' }}
                />
              </Tooltip>
              <Tooltip title="完成盘点">
                <Button
                  type="text"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleComplete(record)}
                  style={{ color: '#52c41a' }}
                />
              </Tooltip>
            </>
          ) : null}
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ color: designTokens.colors.primary.main }}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此盘点计划吗？"
            onConfirm={() => handleDelete(record.planId)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="text" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const statCards = [
    {
      title: '总计划',
      value: stats.totalPlans,
      icon: <InboxOutlined />,
      gradient: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
    },
    {
      title: '已完成',
      value: stats.completedPlans,
      icon: <CheckCircleOutlined />,
      gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
    },
    {
      title: '进行中',
      value: stats.inProgressPlans,
      icon: <SyncOutlined spin />,
      gradient: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)',
    },
  ];

  return (
    <div
      style={{
        padding: 24,
        background: designTokens.colors.background.secondary,
        minHeight: '100vh',
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          {statCards.map((stat, index) => (
            <Col xs={24} sm={8} key={index}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 16,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  background: stat.gradient,
                }}
                bodyStyle={{ padding: 20 }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 8 }}>
                      {stat.title}
                    </div>
                    <div style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>
                      {stat.value || 0}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      color: '#fff',
                    }}
                  >
                    {stat.icon}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginBottom: 16 }}>
          <TabPane tab="盘点计划列表" key="list">
            <div
              style={{
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <Input
                  placeholder="搜索计划名称"
                  prefix={<SearchOutlined />}
                  style={{ width: 240, borderRadius: 8 }}
                  onChange={e => setSearchParamsObj({ keyword: e.target.value })}
                  onPressEnter={() => {
                    setPagination(prev => ({ ...prev, current: 1 }));
                    fetchPlans();
                  }}
                />
                <Select
                  placeholder="选择状态"
                  style={{ width: 140, borderRadius: 8 }}
                  allowClear
                  onChange={value => {
                    setSearchParamsObj(prev => ({ ...prev, status: value }));
                    setPagination(prev => ({ ...prev, current: 1 }));
                  }}
                >
                  <Select.Option value="draft">草稿</Select.Option>
                  <Select.Option value="pending">待执行</Select.Option>
                  <Select.Option value="in_progress">进行中</Select.Option>
                  <Select.Option value="completed">已完成</Select.Option>
                </Select>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setSearchParamsObj({});
                    fetchPlans();
                    fetchStats();
                  }}
                  style={{ borderRadius: 8 }}
                >
                  刷新
                </Button>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
                style={{ borderRadius: 8, height: 40 }}
              >
                新建盘点计划
              </Button>
            </div>

            <Table
              columns={columns}
              dataSource={plans}
              loading={loading}
              rowKey="planId"
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: total => `共 ${total} 条记录`,
                onChange: (page, pageSize) => {
                  setPagination(prev => ({ ...prev, current: page, pageSize }));
                },
              }}
              scroll={{ x: 1200 }}
              locale={{
                emptyText: (
                  <Empty description="暂无盘点计划" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InboxOutlined style={{ fontSize: 18, color: '#1890ff' }} />
            <span>{editingPlan ? '编辑盘点计划' : '新建盘点计划'}</span>
          </div>
        }
        open={modalVisible}
        closeIcon={<CloseButton />}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={640}
        centered
        styles={{
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },
          body: { padding: 24 },
          footer: { borderTop: '1px solid #f0f0f0', padding: '12px 24px' },
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="计划名称"
                rules={[{ required: true, message: '请输入计划名称' }]}
              >
                <Input placeholder="请输入计划名称" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="type"
                label="盘点类型"
                rules={[{ required: true, message: '请选择盘点类型' }]}
                initialValue="full"
              >
                <Select style={{ borderRadius: 8 }}>
                  <Select.Option value="full">全面盘点</Select.Option>
                  <Select.Option value="partial">局部盘点</Select.Option>
                  <Select.Option value="sample">抽样盘点</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="请输入描述" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="scheduledDate" label="计划日期">
                <DatePicker style={{ width: '100%', borderRadius: 8 }} placeholder="选择计划日期" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetRooms" label="目标机房">
                <Select
                  mode="multiple"
                  placeholder="选择目标机房（不选则为全部）"
                  allowClear
                  onChange={handleRoomsChange}
                  style={{ borderRadius: 8 }}
                >
                  {rooms.map(room => (
                    <Select.Option key={room.roomId} value={room.roomId}>
                      {room.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="targetRacks" label="目标机柜">
            <Select
              mode="multiple"
              placeholder="选择目标机柜（不选则为全部）"
              allowClear
              style={{ borderRadius: 8 }}
            >
              {filteredRacks.map(rack => (
                <Select.Option key={rack.rackId} value={rack.rackId}>
                  {rack.name} ({rack.Room?.name || ''})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setModalVisible(false)} style={{ borderRadius: 8 }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" style={{ borderRadius: 8 }}>
                {editingPlan ? '更新' : '创建'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryManagement;
