import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Card, Space, Tag, Dropdown, Menu, Tabs, Timeline, Descriptions, Checkbox, Popover, InputNumber, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, MoreOutlined, UserOutlined, ToolOutlined, CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, CloseCircleOutlined, SettingOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { TabPane } = Tabs;

const BUILTIN_TICKET_FIELDS = [
  'ticketId', 'title', 'deviceId', 'deviceName', 'deviceModel', 'serialNumber',
  'faultCategory', 'faultSubCategory', 'priority', 'status', 'description',
  'expectedCompletionDate', 'reporterId', 'reporterName', 'assigneeId', 'assigneeName',
  'location', 'resolution', 'completionDate', 'evaluation', 'evaluationRating',
  'attachments', 'tags', 'notes', 'result', 'solution', 'usedParts'
];

const DEFAULT_TICKET_FIELDS = [
  { fieldName: 'title', displayName: '标题', fieldType: 'string', required: true, order: 1, visible: true },
  { fieldName: 'deviceId', displayName: '关联设备', fieldType: 'device', required: false, order: 2, visible: true },
  { fieldName: 'deviceName', displayName: '设备名称', fieldType: 'string', required: false, order: 3, visible: true },
  { fieldName: 'serialNumber', displayName: '设备序列号', fieldType: 'string', required: false, order: 4, visible: true },
  { fieldName: 'faultCategory', displayName: '故障分类', fieldType: 'select', required: true, order: 5, visible: true, options: [] },
  { fieldName: 'priority', displayName: '优先级', fieldType: 'select', required: true, order: 6, visible: true, options: [
    { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' }, { value: 'urgent', label: '紧急' }
  ]},
  { fieldName: 'description', displayName: '故障描述', fieldType: 'textarea', required: true, order: 7, visible: true },
  { fieldName: 'expectedCompletionDate', displayName: '期望完成时间', fieldType: 'datetime', required: false, order: 8, visible: true },
  { fieldName: 'resolution', displayName: '解决方案', fieldType: 'textarea', required: false, order: 9, visible: true },
  { fieldName: 'notes', displayName: '备注', fieldType: 'textarea', required: false, order: 10, visible: true }
];

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
  const [ticketFields, setTicketFields] = useState(DEFAULT_TICKET_FIELDS);
  const [loadingFields, setLoadingFields] = useState(true);

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

      const processedTickets = ticketList.map(ticket => {
        const processed = { ...ticket };
        if (ticket.metadata && typeof ticket.metadata === 'object') {
          Object.entries(ticket.metadata).forEach(([key, value]) => {
            processed[key] = value;
          });
        }
        return processed;
      });

      setTickets(processedTickets);
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
      const categoryOptions = (response.data || []).map(cat => ({ value: cat.name, label: cat.name }));
      setCategories(response.data || []);
      setTicketFields(prev => prev.map(field => 
        field.fieldName === 'faultCategory' ? { ...field, options: categoryOptions } : field
      ));
    } catch (error) {
      console.error('获取分类列表失败:', error);
    }
  }, []);

  const fetchTicketFields = useCallback(async () => {
    try {
      setLoadingFields(true);
      const response = await axios.get('/api/ticket-fields');
      const sortedFields = response.data.sort((a, b) => a.order - b.order);
      setTicketFields(sortedFields);
    } catch (error) {
      console.error('获取工单字段配置失败:', error);
      setTicketFields(DEFAULT_TICKET_FIELDS);
    } finally {
      setLoadingFields(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchDevices();
    fetchCategories();
    fetchTicketFields();
  }, [fetchTickets, fetchDevices, fetchCategories, fetchTicketFields]);

  const renderFormItem = useCallback((field) => {
    const { fieldName, displayName, fieldType, required, options, placeholder } = field;
    const rules = required ? [{ required: true, message: `请选择或输入${displayName}` }] : [];

    let formItem;
    switch (fieldType) {
      case 'string':
        formItem = <Input placeholder={placeholder || `请输入${displayName}`} />;
        break;
      case 'number':
        formItem = <InputNumber placeholder={placeholder || `请输入${displayName}`} style={{ width: '100%' }} />;
        break;
      case 'textarea':
        formItem = <Input.TextArea rows={3} placeholder={placeholder || `请输入${displayName}`} />;
        break;
      case 'boolean':
        formItem = <Switch />;
        break;
      case 'date':
        formItem = <DatePicker style={{ width: '100%' }} />;
        break;
      case 'datetime':
        formItem = <DatePicker showTime style={{ width: '100%' }} />;
        break;
      case 'select':
        const selectOptions = options && Array.isArray(options) ? options : [];
        formItem = (
          <Select placeholder={placeholder || `请选择${displayName}`}>
            {selectOptions.map((opt, idx) => (
              <Option key={idx} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        );
        break;
      case 'device':
        formItem = (
          <Select placeholder="选择设备" showSearch optionFilterProp="children">
            {devices.map(device => (
              <Option key={device.deviceId} value={device.deviceId}>
                {device.name} - {device.serialNumber}
              </Option>
            ))}
          </Select>
        );
        break;
      default:
        formItem = <Input placeholder={placeholder || `请输入${displayName}`} />;
    }

    return (
      <Form.Item key={fieldName} name={fieldName} label={displayName} rules={rules}>
        {formItem}
      </Form.Item>
    );
  }, [devices]);

  const getTableColumns = useCallback(() => {
    const baseColumns = [
      { title: '工单编号', dataIndex: 'ticketId', key: 'ticketId', width: 150, fixed: 'left' },
      { title: '标题', dataIndex: 'title', key: 'title', width: 200, ellipsis: true },
      { 
        title: '设备信息', 
        key: 'deviceInfo', 
        width: 180,
        render: (_, record) => (
          <div>
            <div>{record.deviceName || '-'}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{record.serialNumber || '-'}</div>
          </div>
        )
      },
      { 
        title: '故障分类', 
        dataIndex: 'faultCategory', 
        key: 'faultCategory', 
        width: 120,
        render: (value) => value ? <Tag>{value}</Tag> : '-'
      },
      { 
        title: '优先级', 
        dataIndex: 'priority', 
        key: 'priority', 
        width: 80,
        render: (value) => <Tag color={getPriorityColor(value)}>{getPriorityText(value)}</Tag>
      },
      { 
        title: '状态', 
        dataIndex: 'status', 
        key: 'status', 
        width: 100,
        render: (value) => <Tag color={getStatusColor(value)}>{getStatusText(value)}</Tag>
      },
      { title: '报告人', dataIndex: 'reporterName', key: 'reporterName', width: 100 },
      { 
        title: '创建时间', 
        dataIndex: 'createdAt', 
        key: 'createdAt', 
        width: 160,
        render: (value) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'
      }
    ];

    const customFieldColumns = ticketFields
      .filter(field => !BUILTIN_TICKET_FIELDS.includes(field.fieldName) && field.visible)
      .map(field => ({
        title: field.displayName,
        dataIndex: field.fieldName,
        key: field.fieldName,
        width: 120,
        render: (value) => {
          if (value === null || value === undefined) return '-';
          if (field.fieldType === 'boolean') {
            return <Switch checked={value} disabled />;
          }
          if (field.fieldType === 'date' || field.fieldType === 'datetime') {
            return value ? dayjs(value).format(field.fieldType === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm') : '-';
          }
          if (field.fieldType === 'select' && Array.isArray(field.options)) {
            const option = field.options.find(opt => opt.value === value);
            return option ? option.label : value;
          }
          return String(value);
        }
      }));

    return [...baseColumns, ...customFieldColumns];
  }, [ticketFields]);

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
      if (ticket.metadata && typeof ticket.metadata === 'object') {
        Object.entries(ticket.metadata).forEach(([key, value]) => {
          ticketData[key] = value;
        });
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
        completionDate: values.completionDate ? values.completionDate.format('YYYY-MM-DD HH:mm:ss') : null,
        metadata: {}
      };

      ticketFields.forEach(field => {
        if (!BUILTIN_TICKET_FIELDS.includes(field.fieldName)) {
          if (values[field.fieldName] !== undefined) {
            ticketData.metadata[field.fieldName] = values[field.fieldName];
          }
          delete ticketData[field.fieldName];
        }
      });

      if (deviceSource === 'manual') {
        ticketData.deviceId = null;
        ticketData.deviceName = values.deviceName;
        ticketData.serialNumber = values.serialNumber;
      } else {
        const selectedDevice = devices.find(d => d.deviceId === values.deviceId);
        if (selectedDevice) {
          ticketData.deviceName = selectedDevice.name;
          ticketData.serialNumber = selectedDevice.serialNumber;
        }
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
  }, [editingTicket, fetchTickets, deviceSource, ticketFields, devices]);

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

  const handleDeviceSourceChange = useCallback((value) => {
    setDeviceSource(value);
  }, []);

  const renderDeviceFormItems = useCallback(() => {
    if (deviceSource === 'select') {
      return (
        <Form.Item name="deviceId" label="关联设备" rules={[{ required: false }]}>
          <Select placeholder="选择设备" showSearch optionFilterProp="children" allowClear>
            {devices.map(device => (
              <Option key={device.deviceId} value={device.deviceId}>
                {device.name} - {device.serialNumber}
              </Option>
            ))}
          </Select>
        </Form.Item>
      );
    }
    return (
      <>
        <Form.Item name="deviceName" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}>
          <Input placeholder="请输入设备名称" />
        </Form.Item>
        <Form.Item name="serialNumber" label="设备序列号" rules={[{ required: true, message: '请输入设备序列号' }]}>
          <Input placeholder="请输入设备序列号" />
        </Form.Item>
      </>
    );
  }, [deviceSource, devices]);

  const renderFormItems = useCallback(() => {
    return ticketFields.map(field => {
      if (field.fieldName === 'deviceId') {
        return (
          <React.Fragment key="deviceSource">
            <Form.Item label="设备来源" required>
              <Select value={deviceSource} onChange={handleDeviceSourceChange} style={{ width: 200 }}>
                <Option value="select">从设备管理选择</Option>
                <Option value="manual">手动输入</Option>
              </Select>
            </Form.Item>
            {renderDeviceFormItems()}
          </React.Fragment>
        );
      }
      return renderFormItem(field);
    });
  }, [ticketFields, deviceSource, devices, handleDeviceSourceChange, renderDeviceFormItems, renderFormItem]);

  const getActionItems = useCallback((record) => (
    <Menu
      items={[
        { key: 'view', icon: <EyeOutlined />, label: '查看详情', onClick: () => fetchTicketDetail(record.ticketId) },
        { key: 'process', icon: <ToolOutlined />, label: '处理工单', disabled: record.status === 'closed' || record.status === 'completed',
          onClick: () => handleProcess(record) },
        { type: 'divider' },
        { key: 'pending', label: '标记为待处理', disabled: record.status !== 'pending',
          onClick: () => handleStatusChange(record.ticketId, 'pending') },
        { key: 'in_progress', label: '标记为处理中', disabled: record.status !== 'pending',
          onClick: () => handleStatusChange(record.ticketId, 'in_progress') },
        { key: 'completed', label: '标记为已完成', disabled: record.status === 'completed' || record.status === 'closed',
          onClick: () => handleStatusChange(record.ticketId, 'completed') },
        { key: 'closed', label: '标记为已关闭', disabled: record.status === 'closed',
          onClick: () => handleStatusChange(record.ticketId, 'closed') },
        { type: 'divider' },
        { key: 'delete', icon: <DeleteOutlined />, label: '删除工单', danger: true,
          onClick: () => handleDelete(record.ticketId) }
      ]}
    />
  ), [fetchTicketDetail, handleProcess, handleStatusChange, handleDelete]);

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
          columns={getTableColumns()}
          dataSource={tickets}
          rowKey="ticketId"
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          columnsState={{
            onChange: ({ visibleColumns }) => {
              localStorage.setItem('ticketVisibleColumns', JSON.stringify(visibleColumns));
            }
          }}
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
          {renderFormItems()}
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
                <Descriptions.Item label="报告人">{selectedTicket.reporterName}</Descriptions.Item>
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
