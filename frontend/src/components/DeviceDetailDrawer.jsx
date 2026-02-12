import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Drawer,
  Tabs,
  Tag,
  Space,
  Typography,
  Empty,
  Card,
  Tooltip,
  Button,
  Popconfirm,
  Table,
  Badge,
} from 'antd';
import {
  ApiOutlined,
  CloudServerOutlined,
  EnvironmentOutlined,
  EditOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ToolOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import NetworkCardPanel from './NetworkCardPanel';
import { deviceAPI } from '../api';

const { Text, Title } = Typography;

const designTokens = {
  colors: {
    primary: '#667eea',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
  },
  spacing: {
    sm: 8,
    md: 16,
  },
};

function DeviceDetailDrawer({
  device,
  visible,
  onClose,
  cables,
  onRefreshCables,
  onEdit,
  onAddNic,
  onAddPort,
  onAddCable,
  onDeleteCable,
  tooltipFields,
  refreshTrigger,
  onViewTicket,
  onCreateTicket,
}) {
  const [activeTab, setActiveTab] = useState('ports');
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsPagination, setTicketsPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  // 获取设备关联的工单列表
  const fetchDeviceTickets = useCallback(async (page = 1, pageSize = 5) => {
    if (!device?.deviceId) return;
    setTicketsLoading(true);
    try {
      const response = await deviceAPI.getTickets(device.deviceId, {
        page,
        pageSize,
      });
      setTickets(response.data || []);
      setTicketsPagination({
        current: response.page || 1,
        pageSize: response.pageSize || 5,
        total: response.total || 0,
      });
    } catch (error) {
      console.error('获取设备工单失败:', error);
    } finally {
      setTicketsLoading(false);
    }
  }, [device?.deviceId]);

  // 当设备变化或标签页切换到工单时，加载工单数据
  useEffect(() => {
    if (visible && device?.deviceId && activeTab === 'tickets') {
      fetchDeviceTickets(1, 5);
    }
  }, [visible, device?.deviceId, activeTab, fetchDeviceTickets]);

  // 工单表格列定义
  const ticketColumns = useMemo(() => [
    {
      title: '工单编号',
      dataIndex: 'ticketId',
      key: 'ticketId',
      width: 120,
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status) => {
        const statusConfig = {
          pending: { color: 'warning', text: '待处理' },
          processing: { color: 'processing', text: '处理中' },
          completed: { color: 'success', text: '已完成' },
          closed: { color: 'default', text: '已关闭' },
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Badge status={config.color} text={config.text} />;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority) => {
        const priorityConfig = {
          low: { color: 'success', text: '低' },
          medium: { color: 'warning', text: '中' },
          high: { color: 'error', text: '高' },
          critical: { color: 'purple', text: '紧急' },
        };
        const config = priorityConfig[priority] || { color: 'default', text: priority };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onViewTicket?.(record)}
        >
          查看
        </Button>
      ),
    },
  ], [onViewTicket]);

  const deviceCables = useMemo(() => {
    if (!device || !cables) return [];
    return cables.filter(
      c => c.sourceDeviceId === device.deviceId || c.targetDeviceId === device.deviceId
    );
  }, [device, cables]);

  const getStatusTag = useCallback(status => {
    const config = {
      running: { color: 'success', text: '运行中' },
      normal: { color: 'success', text: '正常' },
      warning: { color: 'warning', text: '警告' },
      error: { color: 'error', text: '故障' },
      fault: { color: 'error', text: '故障' },
      offline: { color: 'default', text: '离线' },
      maintenance: { color: 'processing', text: '维护中' },
    };
    const { color, text } = config[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  }, []);

  const getDeviceTypeName = useCallback(type => {
    const typeMap = {
      server: '服务器',
      switch: '交换机',
      router: '路由器',
      storage: '存储设备',
      firewall: '防火墙',
      ups: 'UPS',
      pdu: 'PDU',
    };
    return typeMap[type?.toLowerCase()] || type || '未知设备';
  }, []);

  const renderFieldValue = useCallback(
    (field, device) => {
      const fieldKey = field.field;
      if (fieldKey === 'status') return getStatusTag(device.status);

      // 优先从device对象获取值，如果没有则从customFields中获取
      let value = device[fieldKey];
      if (
        (value === undefined || value === null) &&
        device.customFields &&
        typeof device.customFields === 'object'
      ) {
        value = device.customFields[fieldKey];
      }

      if (fieldKey === 'type') value = getDeviceTypeName(value);
      else if (fieldKey === 'position')
        value = `U${device.position} ${device.height ? `(${device.height}U)` : ''}`;

      return (
        <Text strong style={{ fontSize: '14px' }}>
          {value !== undefined && value !== null ? value : '-'}
        </Text>
      );
    },
    [getStatusTag, getDeviceTypeName]
  );

  const displayFields = useMemo(() => {
    if (tooltipFields && Object.keys(tooltipFields).length > 0) {
      return Object.values(tooltipFields).filter(f => f.enabled);
    }

    // Default fallback fields if no config
    return [
      { field: 'deviceId', label: '设备ID' },
      { field: 'type', label: '设备类型' },
      { field: 'status', label: '设备状态' },
      { field: 'position', label: '位置' },
      { field: 'ipAddress', label: 'IP地址' },
      { field: 'brand', label: '品牌' },
    ];
  }, [tooltipFields]);

  const tabItems = [
    {
      key: 'ports',
      label: (
        <span>
          <ApiOutlined />
          端口与网卡
        </span>
      ),
      children: (
        <NetworkCardPanel
          deviceId={device?.deviceId}
          deviceName={device?.name}
          onRefresh={onRefreshCables}
          refreshTrigger={refreshTrigger}
        />
      ),
    },
    {
      key: 'cables',
      label: (
        <span>
          <EnvironmentOutlined />
          接线 ({deviceCables.length})
        </span>
      ),
      children: (
        <div className="cable-panel">
          {deviceCables.length === 0 ? (
            <Empty description="该设备暂无接线" />
          ) : (
            <Space direction="vertical" size={designTokens.spacing.md} style={{ width: '100%' }}>
              {deviceCables.map(cable => (
                <Card
                  key={cable.cableId}
                  size="small"
                  style={{ borderRadius: '8px' }}
                  extra={
                    <Popconfirm
                      title="确定要删除这条接线吗？"
                      onConfirm={() => onDeleteCable?.(cable.cableId)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                    </Popconfirm>
                  }
                >
                  <div style={{ marginBottom: designTokens.spacing.sm }}>
                    <Space direction="vertical" size={4}>
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          源设备：
                        </Text>
                        <div style={{ fontWeight: 500 }}>
                          {cable.sourceDevice?.name || '-'}
                          <Tag color="blue" style={{ marginLeft: '8px' }}>
                            {cable.sourcePort}
                          </Tag>
                        </div>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          目标设备：
                        </Text>
                        <div style={{ fontWeight: 500 }}>
                          {cable.targetDevice?.name || '-'}
                          <Tag color="green" style={{ marginLeft: '8px' }}>
                            {cable.targetPort}
                          </Tag>
                        </div>
                      </div>
                    </Space>
                  </div>

                  <Space wrap>
                    <Tag
                      color={
                        cable.status === 'normal'
                          ? 'success'
                          : cable.status === 'fault'
                            ? 'error'
                            : 'default'
                      }
                    >
                      {cable.status === 'normal'
                        ? '正常'
                        : cable.status === 'fault'
                          ? '故障'
                          : '未连接'}
                    </Tag>
                    <Tag color="purple">
                      {cable.cableType === 'ethernet'
                        ? '网线'
                        : cable.cableType === 'fiber'
                          ? '光纤'
                          : '铜缆'}
                    </Tag>
                    {cable.cableLength && <Tag color="orange">{cable.cableLength}m</Tag>}
                  </Space>

                  {cable.description && (
                    <div
                      style={{
                        marginTop: designTokens.spacing.sm,
                        fontSize: '12px',
                        color: '#666',
                      }}
                    >
                      {cable.description}
                    </div>
                  )}
                </Card>
              ))}
            </Space>
          )}
        </div>
      ),
    },
    {
      key: 'tickets',
      label: (
        <span>
          <FileTextOutlined />
          工单记录 ({ticketsPagination.total})
        </span>
      ),
      children: (
        <div className="tickets-panel">
          <div style={{ marginBottom: designTokens.spacing.md }}>
            <Button
              type="primary"
              icon={<ToolOutlined />}
              onClick={() => onCreateTicket?.(device)}
            >
              创建工单
            </Button>
          </div>
          <Table
            columns={ticketColumns}
            dataSource={tickets}
            rowKey="ticketId"
            loading={ticketsLoading}
            pagination={{
              ...ticketsPagination,
              onChange: (page, pageSize) => fetchDeviceTickets(page, pageSize),
            }}
            size="small"
          />
        </div>
      ),
    },
  ];

  if (!device) return null;

  return (
    <Drawer
      title={
        <Space style={{ maxWidth: '280px', overflow: 'hidden' }}>
          <CloudServerOutlined style={{ color: designTokens.colors.primary, flexShrink: 0 }} />
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            设备详情 - {device.name}
          </span>
        </Space>
      }
      placement="right"
      width={600}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Tooltip title="编辑设备信息">
            <Button icon={<EditOutlined />} onClick={() => onEdit?.(device)} />
          </Tooltip>
          <Tooltip title="添加网卡">
            <Button icon={<PlusCircleOutlined />} onClick={() => onAddNic?.(device)}>
              加网卡
            </Button>
          </Tooltip>
          <Tooltip title="添加端口">
            <Button icon={<ApiOutlined />} onClick={() => onAddPort?.(device)}>
              加端口
            </Button>
          </Tooltip>
          <Tooltip title="添加接线">
            <Button icon={<EnvironmentOutlined />} onClick={() => onAddCable?.(device)}>
              加接线
            </Button>
          </Tooltip>
        </Space>
      }
      styles={{ body: { padding: '16px 20px', overflow: 'auto' } }}
    >
      <div className="device-info-section" style={{ marginBottom: '20px' }}>
        <Title level={5} style={{ margin: '0 0 12px 0', color: '#1e293b' }}>
          基本信息
        </Title>
        <div
          className="info-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '10px',
          }}
        >
          {displayFields.map(field => (
            <div className="info-item" key={field.field}>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                {field.label}
              </Text>
              {renderFieldValue(field, device)}
            </div>
          ))}
        </div>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </Drawer>
  );
}

export default React.memo(DeviceDetailDrawer);
