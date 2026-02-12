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
  Row,
  Col,
  Divider,
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
  DesktopOutlined,
  FieldTimeOutlined,
  InfoCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import NetworkCardPanel from './NetworkCardPanel';
import { deviceAPI } from '../api';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const designTokens = {
  colors: {
    primary: '#1890ff',
    success: '#52c41a',
    error: '#f5222d',
    warning: '#faad14',
    info: '#13c2c2',
    gray: '#8c8c8c',
    bgLight: '#f6ffed',
    bgBlue: '#e6f7ff',
    bgGray: '#f5f5f5',
    bgOrange: '#fff7e6',
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
        return dayjs(date).format('YYYY-MM-DD HH:mm');
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

  if (!device) return null;

  // 解析自定义字段
  const customFields = device.customFields || {};
  const standardFields = ['deviceId', 'name', 'type', 'model', 'serialNumber', 'status', 'ipAddress', 'position', 'height', 'powerConsumption', 'purchaseDate', 'warrantyExpiry', 'description'];
  const customFieldEntries = Object.entries(customFields).filter(([key]) => !standardFields.includes(key));

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
          <LinkOutlined />
          接线 ({deviceCables.length})
        </span>
      ),
      children: (
        <div className="cable-panel">
          {deviceCables.length === 0 ? (
            <Empty description="该设备暂无接线" />
          ) : (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
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
                  <Row gutter={[16, 8]}>
                    <Col span={12}>
                      <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>源设备</div>
                      <div style={{ fontWeight: 500 }}>
                        {cable.sourceDevice?.name || '-'}
                        <Tag color="blue" style={{ marginLeft: '8px' }}>
                          {cable.sourcePort}
                        </Tag>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>目标设备</div>
                      <div style={{ fontWeight: 500 }}>
                        {cable.targetDevice?.name || '-'}
                        <Tag color="green" style={{ marginLeft: '8px' }}>
                          {cable.targetPort}
                        </Tag>
                      </div>
                    </Col>
                    <Col span={24}>
                      <Space wrap style={{ marginTop: 8 }}>
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
                    </Col>
                    {cable.description && (
                      <Col span={24}>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                          {cable.description}
                        </div>
                      </Col>
                    )}
                  </Row>
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
          <div style={{ marginBottom: 16 }}>
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

  return (
    <Drawer
      title={
        <Space>
          <CloudServerOutlined style={{ color: designTokens.colors.primary, fontSize: 20 }} />
          <span style={{ fontSize: 18, fontWeight: 600 }}>设备详情</span>
        </Space>
      }
      placement="right"
      width={700}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Tooltip title="编辑设备信息">
            <Button icon={<EditOutlined />} onClick={() => onEdit?.(device)}>
              编辑
            </Button>
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
      styles={{ body: { padding: '0', overflow: 'auto' } }}
    >
      {/* 设备头部信息 */}
      <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <DesktopOutlined style={{ fontSize: 48, opacity: 0.9 }} />
          </Col>
          <Col flex="auto">
            <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>{device.name}</div>
            <Space size={16}>
              <span>{getDeviceTypeName(device.type)}</span>
              <span>|</span>
              <span>{device.deviceId}</span>
              <span>|</span>
              {getStatusTag(device.status)}
            </Space>
          </Col>
        </Row>
      </div>

      {/* 设备信息内容 */}
      <div style={{ padding: '20px 24px' }}>
        {/* 基本信息卡片 */}
        <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[24, 16]}>
            <Col span={8}>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>设备型号</div>
              <div style={{ fontWeight: 500 }}>{device.model || '-'}</div>
            </Col>
            <Col span={8}>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>序列号</div>
              <div style={{ fontWeight: 500 }}>{device.serialNumber || '-'}</div>
            </Col>
            <Col span={8}>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>IP地址</div>
              <div style={{ fontWeight: 500 }}>{device.ipAddress || '-'}</div>
            </Col>
            <Col span={8}>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>位置</div>
              <div style={{ fontWeight: 500 }}>U{device.position || '-'}</div>
            </Col>
            <Col span={8}>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>高度</div>
              <div style={{ fontWeight: 500 }}>{device.height ? `${device.height}U` : '-'}</div>
            </Col>
            <Col span={8}>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>功耗</div>
              <div style={{ fontWeight: 500 }}>{device.powerConsumption ? `${device.powerConsumption}W` : '-'}</div>
            </Col>
          </Row>
        </Card>

        {/* 维保信息卡片 */}
        <Card title="维保信息" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[24, 16]}>
            <Col span={12}>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>购买日期</div>
              <div style={{ fontWeight: 500 }}>
                {device.purchaseDate ? dayjs(device.purchaseDate).format('YYYY-MM-DD') : '-'}
              </div>
            </Col>
            <Col span={12}>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>保修到期</div>
              <div style={{ fontWeight: 500 }}>
                {device.warrantyExpiry ? dayjs(device.warrantyExpiry).format('YYYY-MM-DD') : '-'}
              </div>
            </Col>
          </Row>
        </Card>

        {/* 描述信息 */}
        {device.description && (
          <Card title="描述" size="small" style={{ marginBottom: 16 }}>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{device.description}</div>
          </Card>
        )}

        {/* 自定义字段卡片 */}
        {customFieldEntries.length > 0 && (
          <Card title="自定义字段" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={[24, 16]}>
              {customFieldEntries.map(([key, value]) => (
                <Col span={8} key={key}>
                  <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>{key}</div>
                  <div style={{ fontWeight: 500 }}>{String(value)}</div>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        <Divider style={{ margin: '24px 0' }} />

        {/* 标签页 */}
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </div>
    </Drawer>
  );
}

export default React.memo(DeviceDetailDrawer);
