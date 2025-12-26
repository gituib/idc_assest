import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Card, Space, Tag, Dropdown, Menu, Tabs, Timeline, Descriptions } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, MoreOutlined, UserOutlined, ToolOutlined, CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { TabPane } = Tabs;

const getStatusColor = (status) => {
  const colors = {
    pending: 'orange',
    in_progress: 'processing',
    completed: 'green',
    closed: 'default'
  };
  return colors[status] || 'default';
};

const getStatusText = (status) => {
  const texts = {
    pending: '待处理',
    in_progress: '处理中',
    completed: '已完成',
    closed: '已关闭'
  };
  return texts[status] || status;
};

const getPriorityColor = (priority) => {
  const colors = {
    low: 'green',
    medium: 'orange',
    high: 'red',
    urgent: 'magenta'
  };
  return colors[priority] || 'default';
};

const getPriorityText = (priority) => {
  const texts = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急'
  };
  return texts[priority] || priority;
};

function TicketManagement() {
  const [tickets, setTickets] = useState([]);
  const [devices, setDevices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [processingModalVisible, setProcessingModalVisible] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [operationRecords, setOperationRecords] = useState([]);
  const [form] = Form.useForm();
  const [processForm] = Form.useForm();
  const [searchForm] = Form.useForm();

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    pageSizeOptions: ['10', '20', '30', '50'],
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条记录`
  });

  const [searchFilters, setSearchFilters] = useState({});
  const [deviceSource, setDeviceSource] = useState('select');

  const fetchTickets = useCallback(async (page = 1, pageSize = 10, filters = {}) => {
    try {
      setLoading(true);
      const params = {
        page,
        pageSize,
        ...searchFilters,
        ...filters
      };

      const response = await axios.get('/api/tickets', { params });
      const { tickets: ticketList, total } = response.data;

      setTickets(ticketList);
      setPagination(prev => ({ ...prev, current: page, pageSize, total }));
    } catch (error) {
      message.error('获取工单列表失败');
      console.error('获取工单列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchFilters]);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await axios.get('/api/devices', { params: { pageSize: 1000 } });
      setDevices(response.data.devices || []);
    } catch (error) {
      console.error('获取设备列表失败:', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get('/api/ticket-categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error('获取分类列表失败:', error);
    }
  }, []);

  const fetchTicketDetail = useCallback(async (ticketId) => {
    try {
      const [ticketRes, operationsRes] = await Promise.all([
        axios.get(`/api/tickets/${ticketId}`),
        axios.get(`/api/tickets/${ticketId}/operations`)
      ]);

      setSelectedTicket(ticketRes.data);
      setOperationRecords(operationsRes.data || []);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('获取工单详情失败');
      console.error('获取工单详情失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchDevices();
    fetchCategories();
  }, [fetchTickets, fetchDevices, fetchCategories]);

  const showModal = useCallback((ticket = null) => {
    setEditingTicket(ticket);
    if (ticket) {
      const ticketData = { ...ticket };
      if (ticketData.expectedCompletionDate) {
        ticketData.expectedCompletionDate = dayjs(ticketData.expectedCompletionDate);
      }
      if (ticketData.completionDate) {
        ticketData.completionDate = dayjs(ticketData.completionDate);
      }
      if (ticket.deviceId) {
        setDeviceSource('select');
        ticketData.deviceId = ticket.deviceId;
      } else {
        setDeviceSource('manual');
        ticketData.deviceName = ticket.deviceName;
        ticketData.serialNumber = ticket.serialNumber;
      }
      form.setFieldsValue(ticketData);
    } else {
      form.resetFields();
      setDeviceSource('select');
    }
    setModalVisible(true);
  }, []);

  const handleCancel = useCallback(() => {
    setModalVisible(false);
    setEditingTicket(null);
  }, []);

  const handleSubmit = useCallback(async (values) => {
    try {
      const ticketData = {
        ...values,
        expectedCompletionDate: values.expectedCompletionDate ? values.expectedCompletionDate.format('YYYY-MM-DD HH:mm:ss') : null,
        completionDate: values.completionDate ? values.completionDate.format('YYYY-MM-DD HH:mm:ss') : null
      };

      if (deviceSource === 'manual') {
        ticketData.deviceId = null;
        ticketData.deviceName = values.deviceName;
        ticketData.serialNumber = values.serialNumber;
      }

      if (editingTicket) {
        await axios.put(`/api/tickets/${editingTicket.ticketId}`, ticketData);
        message.success('工单更新成功');
      } else {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        ticketData.reporterId = user.userId || localStorage.getItem('userId') || 'USER001';
        ticketData.reporterName = user.username || '系统用户';
        await axios.post('/api/tickets', ticketData);
        message.success('工单创建成功');
      }

      setModalVisible(false);
      fetchTickets();
      setEditingTicket(null);
      setDeviceSource('select');
    } catch (error) {
      message.error(editingTicket ? '工单更新失败' : '工单创建失败');
      console.error(error);
    }
  }, [editingTicket, fetchTickets, deviceSource]);

  const handleDelete = useCallback(async (ticketId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个工单吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`/api/tickets/${ticketId}`);
          message.success('工单删除成功');
          fetchTickets();
        } catch (error) {
          message.error('工单删除失败');
          console.error(error);
        }
      }
    });
  }, [fetchTickets]);

  const handleProcess = useCallback((ticket) => {
    setSelectedTicket(ticket);
    processForm.resetFields();
    setProcessingModalVisible(true);
  }, []);

  const handleProcessSubmit = useCallback(async (values) => {
    try {
      await axios.put(`/api/tickets/${selectedTicket.ticketId}/process`, {
        ...values,
        operatorId: localStorage.getItem('userId'),
        operatorName: JSON.parse(localStorage.getItem('user') || '{}').username
      });
      message.success('工单处理完成');
      setProcessingModalVisible(false);
      fetchTickets();
    } catch (error) {
      message.error('处理失败');
      console.error(error);
    }
  }, [selectedTicket, fetchTickets]);

  const handleStatusChange = useCallback(async (ticketId, newStatus) => {
    try {
      await axios.put(`/api/tickets/${ticketId}/status`, {
        status: newStatus,
        operatorId: localStorage.getItem('userId'),
        operatorName: JSON.parse(localStorage.getItem('user') || '{}').username
      });
      message.success('状态更新成功');
      fetchTickets();
    } catch (error) {
      message.error('状态更新失败');
      console.error(error);
    }
  }, [fetchTickets]);

  const handleSearch = useCallback((values) => {
    setSearchFilters(values);
    fetchTickets(1, pagination.pageSize, values);
  }, [fetchTickets, pagination.pageSize]);

  const handleReset = useCallback(() => {
    searchForm.resetFields();
    setSearchFilters({});
    fetchTickets(1, pagination.pageSize, {});
  }, [fetchTickets, pagination.pageSize]);

  const handleTableChange = useCallback((paginationInfo) => {
    setPagination(paginationInfo);
    fetchTickets(paginationInfo.current, paginationInfo.pageSize, searchFilters);
  }, [fetchTickets, searchFilters]);

  const columns = useMemo(() => [
    {
      title: '工单编号',
      dataIndex: 'ticketId',
      key: 'ticketId',
      width: 150,
      render: (text, record) => (
        <Button type="link" onClick={() => fetchTicketDetail(text)}>
          {text}
        </Button>
      )
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true
    },
    {
      title: '设备信息',
      key: 'deviceInfo',
      width: 180,
      render: (_, record) => (
        <div>
          <div>{record.deviceName}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{record.serialNumber}</div>
        </div>
      )
    },
    {
      title: '故障分类',
      dataIndex: 'faultCategory',
      key: 'faultCategory',
      width: 120,
      render: (text) => text ? <Tag>{text}</Tag> : '-'
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>
          {getPriorityText(priority)}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: '报告人',
      dataIndex: ['reporter', 'username'],
      key: 'reporter',
      width: 100,
      render: (text) => text || '-'
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '期望完成时间',
      dataIndex: 'expectedCompletionDate',
      key: 'expectedCompletionDate',
      width: 160,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
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
            icon={<EyeOutlined />}
            onClick={() => fetchTicketDetail(record.ticketId)}
          >
            详情
          </Button>
          {record.status === 'pending' ? (
            <Button
              type="link"
              icon={<ToolOutlined />}
              onClick={() => handleProcess(record)}
            >
              处理
            </Button>
          ) : null}
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => showModal(record)}>
                  编辑
                </Menu.Item>
                {(record.status === 'pending' || record.status === 'in_progress') && (
                  <Menu.Item
                    key="complete"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleStatusChange(record.ticketId, 'completed')}
                  >
                    完成工单
                  </Menu.Item>
                )}
                {record.status === 'completed' && (
                  <Menu.Item
                    key="close"
                    icon={<CloseCircleOutlined />}
                    onClick={() => handleStatusChange(record.ticketId, 'closed')}
                  >
                    关闭工单
                  </Menu.Item>
                )}
                <Menu.Item
                  key="delete"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => handleDelete(record.ticketId)}
                >
                  删除
                </Menu.Item>
              </Menu>
            }
          >
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ], [fetchTicketDetail, handleStatusChange, handleDelete]);

  return (
    <div style={{ padding: 24 }}>
      <Card title="工单管理" extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          创建工单
        </Button>
      }>
        <Form form={searchForm} layout="inline" onFinish={handleSearch} style={{ marginBottom: 16 }}>
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="标题/设备/描述" allowClear style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="选择状态" allowClear style={{ width: 120 }}>
              <Option value="pending">待处理</Option>
              <Option value="in_progress">处理中</Option>
              <Option value="completed">已完成</Option>
              <Option value="closed">已关闭</Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="优先级">
            <Select placeholder="选择优先级" allowClear style={{ width: 100 }}>
              <Option value="low">低</Option>
              <Option value="medium">中</Option>
              <Option value="high">高</Option>
              <Option value="urgent">紧急</Option>
            </Select>
          </Form.Item>
          <Form.Item name="faultCategory" label="故障分类">
            <Select placeholder="选择分类" allowClear style={{ width: 150 }}>
              {categories.map(cat => (
                <Option key={cat.categoryId} value={cat.name}>{cat.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit">
              搜索
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={handleReset}>
              重置
            </Button>
          </Form.Item>
        </Form>

        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="ticketId"
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title={editingTicket ? '编辑工单' : '创建工单'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="工单标题" rules={[{ required: true }]}>
            <Input placeholder="请输入工单标题" />
          </Form.Item>

          <Form.Item label="设备来源">
            <Select value={deviceSource} onChange={setDeviceSource} style={{ width: 200 }}>
              <Option value="select">从设备列表选择</Option>
              <Option value="manual">手动输入设备信息</Option>
            </Select>
          </Form.Item>

          {deviceSource === 'select' ? (
            <Form.Item name="deviceId" label="关联设备" rules={[{ required: true }]}>
              <Select placeholder="选择设备" showSearch optionFilterProp="children">
                {devices.map(device => (
                  <Option key={device.deviceId} value={device.deviceId}>
                    {device.name} - {device.serialNumber}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          ) : (
            <>
              <Form.Item name="deviceName" label="设备名称" rules={[{ required: true }]}>
                <Input placeholder="请输入设备名称" />
              </Form.Item>
              <Form.Item name="serialNumber" label="设备序列号" rules={[{ required: true }]}>
                <Input placeholder="请输入设备序列号" />
              </Form.Item>
            </>
          )}

          <Form.Item name="faultCategory" label="故障分类" rules={[{ required: true }]}>
            <Select placeholder="选择故障分类">
              {categories.map(cat => (
                <Option key={cat.categoryId} value={cat.name}>{cat.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="priority" label="优先级" rules={[{ required: true }]}>
            <Select placeholder="选择优先级">
              <Option value="low">低</Option>
              <Option value="medium">中</Option>
              <Option value="high">高</Option>
              <Option value="urgent">紧急</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="故障描述">
            <TextArea rows={4} placeholder="请详细描述故障情况" />
          </Form.Item>

          <Form.Item name="expectedCompletionDate" label="期望完成时间">
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="resolution" label="解决方案">
            <TextArea rows={3} placeholder="请输入解决方案" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingTicket ? '更新' : '创建'}
              </Button>
              <Button onClick={handleCancel}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="处理工单"
        open={processingModalVisible}
        onCancel={() => setProcessingModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={processForm} layout="vertical" onFinish={handleProcessSubmit}>
          <Descriptions bordered column={1} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="工单编号">{selectedTicket?.ticketId}</Descriptions.Item>
            <Descriptions.Item label="标题">{selectedTicket?.title}</Descriptions.Item>
            <Descriptions.Item label="设备">{selectedTicket?.deviceName}</Descriptions.Item>
            <Descriptions.Item label="故障描述">{selectedTicket?.description}</Descriptions.Item>
          </Descriptions>

          <Form.Item name="solution" label="处理方案" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="请详细描述处理方案和步骤" />
          </Form.Item>

          <Form.Item name="result" label="处理结果" rules={[{ required: true }]}>
            <Select placeholder="选择处理结果">
              <Option value="resolved">问题已解决</Option>
              <Option value="partially_resolved">部分解决</Option>
              <Option value="unresolved">未解决</Option>
              <Option value="escalated">需升级处理</Option>
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="其他补充说明" />
          </Form.Item>

          <Form.Item name="usedParts" label="使用备件">
            <Input placeholder="使用的备件信息（名称、数量）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                提交处理结果
              </Button>
              <Button onClick={() => setProcessingModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`工单详情 - ${selectedTicket?.ticketId}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          selectedTicket?.status !== 'closed' && selectedTicket?.status !== 'completed' && (
            <Button key="process" type="primary" icon={<ToolOutlined />} onClick={() => {
              setDetailModalVisible(false);
              handleProcess(selectedTicket);
            }}>
              处理工单
            </Button>
          )
        ]}
        width={900}
      >
        {selectedTicket && (
          <Tabs defaultActiveKey="info">
            <TabPane tab="基本信息" key="info">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="工单编号">{selectedTicket.ticketId}</Descriptions.Item>
                <Descriptions.Item label="标题">{selectedTicket.title}</Descriptions.Item>
                <Descriptions.Item label="设备名称">{selectedTicket.deviceName}</Descriptions.Item>
                <Descriptions.Item label="设备序列号">{selectedTicket.serialNumber}</Descriptions.Item>
                <Descriptions.Item label="故障分类">{selectedTicket.faultCategory}</Descriptions.Item>
                <Descriptions.Item label="优先级">
                  <Tag color={getPriorityColor(selectedTicket.priority)}>
                    {getPriorityText(selectedTicket.priority)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={getStatusColor(selectedTicket.status)}>
                    {getStatusText(selectedTicket.status)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="报告人">{selectedTicket.reporter?.username || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {selectedTicket.createdAt ? dayjs(selectedTicket.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="期望完成时间">
                  {selectedTicket.expectedCompletionDate ? dayjs(selectedTicket.expectedCompletionDate).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="完成时间" span={2}>
                  {selectedTicket.completionDate ? dayjs(selectedTicket.completionDate).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="故障描述" span={2}>{selectedTicket.description || '-'}</Descriptions.Item>
                <Descriptions.Item label="解决方案" span={2}>{selectedTicket.resolution || '-'}</Descriptions.Item>
                <Descriptions.Item label="备注" span={2}>{selectedTicket.notes || '-'}</Descriptions.Item>
              </Descriptions>
            </TabPane>

            <TabPane tab={`操作记录 (${operationRecords.length})`} key="operations">
              <Timeline mode="left">
                {operationRecords.map((record, index) => (
                  <Timeline.Item
                    key={index}
                    label={dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    color={record.operationType === 'create' ? 'green' :
                           record.operationType === 'complete' ? 'blue' :
                           record.operationType === 'close' ? 'gray' : 'orange'}
                  >
                    <div><strong>{record.operationType}</strong></div>
                    <div>操作人: {record.operatorName || '-'}</div>
                    <div>内容: {record.operationDescription || '-'}</div>
                  </Timeline.Item>
                ))}
                {operationRecords.length === 0 && (
                  <p style={{ color: '#888' }}>暂无操作记录</p>
                )}
              </Timeline>
            </TabPane>
          </Tabs>
        )}
      </Modal>
    </div>
  );
}

export default React.memo(TicketManagement);
