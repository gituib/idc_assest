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
  Table,
  Badge,
  Row,
  Col,
  Divider,
  Collapse,
  Spin,
  Pagination,
} from 'antd';
import {
  ApiOutlined,
  CloudServerOutlined,
  EditOutlined,
  FileTextOutlined,
  DesktopOutlined,
  LinkOutlined,
  FolderOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { deviceAPI } from '../api';
import { designTokens } from '../config/theme';
import dayjs from 'dayjs';
import api from '../api';

const { Text, Title } = Typography;
const { Panel } = Collapse;

const PAGE_SIZE = 3;

function DeviceDetailDrawer({
  device,
  visible,
  onClose,
  cables,
  onEdit,
  tooltipFields,
  refreshTrigger,
}) {
  const [activeTab, setActiveTab] = useState('ports');
  
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsPagination, setTicketsPagination] = useState({
    current: 1,
    pageSize: PAGE_SIZE,
    total: 0,
  });

  const [networkCards, setNetworkCards] = useState([]);
  const [networkCardsLoading, setNetworkCardsLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState([]);
  const [portsPage, setPortsPage] = useState(1);

  const [cablesPage, setCablesPage] = useState(1);

  const fetchNetworkCards = useCallback(async () => {
    if (!device?.deviceId) return;
    setNetworkCardsLoading(true);
    try {
      const response = await api.get(`/network-cards/device/${device.deviceId}/with-ports`);
      const cardsData = response.data || response || [];
      setNetworkCards(cardsData);
      const initialExpanded = cardsData
        .filter(card => card.ports && card.ports.length > 0)
        .map(card => card.nicId);
      setExpandedCards(initialExpanded);
      setPortsPage(1);
    } catch (error) {
      console.error('获取网卡数据失败:', error);
      setNetworkCards([]);
    } finally {
      setNetworkCardsLoading(false);
    }
  }, [device?.deviceId]);

  useEffect(() => {
    if (visible && device?.deviceId) {
      fetchNetworkCards();
    }
  }, [visible, device?.deviceId, fetchNetworkCards, refreshTrigger]);

  const fetchDeviceTickets = useCallback(async (page = 1, pageSize = PAGE_SIZE) => {
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
        pageSize: response.pageSize || PAGE_SIZE,
        total: response.total || 0,
      });
    } catch (error) {
      console.error('获取设备工单失败:', error);
    } finally {
      setTicketsLoading(false);
    }
  }, [device?.deviceId]);

  useEffect(() => {
    if (visible && device?.deviceId && activeTab === 'tickets') {
      fetchDeviceTickets(1, PAGE_SIZE);
    }
  }, [visible, device?.deviceId, activeTab, fetchDeviceTickets]);

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
  ], []);

  const deviceCables = useMemo(() => {
    if (!device || !cables) return [];
    return cables.filter(
      c => c.sourceDeviceId === device.deviceId || c.targetDeviceId === device.deviceId
    );
  }, [device, cables]);

  const paginatedCables = useMemo(() => {
    const start = (cablesPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return deviceCables.slice(start, end);
  }, [deviceCables, cablesPage]);

  const cablesTotalPages = Math.ceil(deviceCables.length / PAGE_SIZE);

  useEffect(() => {
    setCablesPage(1);
  }, [deviceCables.length]);

  const getStatusTag = useCallback(status => {
    const config = {
      running: { color: 'success', text: '运行中' },
      normal: { color: 'success', text: '正常' },
      warning: { color: 'warning', text: '警告' },
      error: { color: 'error', text: '故障' },
      fault: { color: 'error', text: '故障' },
      offline: { color: 'default', text: '离线' },
      maintenance: { color: 'processing', text: '维护中' },
      free: { color: 'success', text: '空闲' },
      occupied: { color: 'processing', text: '占用' },
    };
    const { color, text } = config[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  }, []);

  const getPortTypeTag = useCallback(type => {
    const config = {
      RJ45: { color: 'blue', text: 'RJ45' },
      SFP: { color: 'green', text: 'SFP' },
      'SFP+': { color: 'cyan', text: 'SFP+' },
      SFP28: { color: 'purple', text: 'SFP28' },
      QSFP: { color: 'orange', text: 'QSFP' },
      QSFP28: { color: 'red', text: 'QSFP28' },
    };
    const { color, text } = config[type] || { color: 'default', text: type };
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

  const renderPortTable = (ports) => {
    const columns = [
      {
        title: '端口名称',
        dataIndex: 'portName',
        key: 'portName',
        width: 120,
        render: text => <span style={{ fontWeight: 500 }}>{text}</span>,
      },
      {
        title: '类型',
        dataIndex: 'portType',
        key: 'portType',
        width: 80,
        render: type => getPortTypeTag(type),
      },
      {
        title: '速率',
        dataIndex: 'portSpeed',
        key: 'portSpeed',
        width: 70,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 70,
        render: status => getStatusTag(status),
      },
      {
        title: 'VLAN',
        dataIndex: 'vlanId',
        key: 'vlanId',
        width: 60,
        render: vlanId => vlanId || '-',
      },
    ];

    return (
      <Table
        columns={columns}
        dataSource={ports}
        rowKey="portId"
        pagination={false}
        size="small"
        scroll={{ x: 400 }}
      />
    );
  };

  const renderCardHeader = card => {
    const stats = card.stats || { free: 0, occupied: 0, fault: 0, total: 0 };

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: card.isUngrouped
                ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            {card.isUngrouped ? <FolderOutlined /> : <CloudServerOutlined />}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
              {card.name}
              {card.slotNumber && (
                <span style={{ color: '#94a3b8', marginLeft: 8 }}>插槽 {card.slotNumber}</span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {card.description || (card.isUngrouped ? '未分配到网卡的端口' : '网卡')}
            </div>
          </div>
        </div>
        <Space size={12}>
          <Badge count={stats.free} style={{ backgroundColor: designTokens.colors.success }} />
          <span style={{ fontSize: '12px', color: '#64748b' }}>空闲</span>
          <Badge count={stats.occupied} style={{ backgroundColor: '#1677ff' }} />
          <span style={{ fontSize: '12px', color: '#64748b' }}>占用</span>
          <Badge count={stats.fault} style={{ backgroundColor: designTokens.colors.error }} />
          <span style={{ fontSize: '12px', color: '#64748b' }}>故障</span>
        </Space>
      </div>
    );
  };

  const paginatedNetworkCards = useMemo(() => {
    const start = (portsPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return networkCards.slice(start, end);
  }, [networkCards, portsPage]);

  const portsTotalPages = Math.ceil(networkCards.length / PAGE_SIZE);

  const renderPortsTab = () => {
    if (networkCardsLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" tip="加载网卡数据中..." />
        </div>
      );
    }

    const totalStats = networkCards.reduce(
      (acc, card) => {
        const stats = card.stats || {};
        acc.total += stats.total || 0;
        acc.free += stats.free || 0;
        acc.occupied += stats.occupied || 0;
        acc.fault += stats.fault || 0;
        return acc;
      },
      { total: 0, free: 0, occupied: 0, fault: 0 }
    );

    if (networkCards.length === 0) {
      return <Empty description="该设备暂无网卡和端口" />;
    }

    return (
      <div className="network-card-panel">
        <div
          style={{
            display: 'flex',
            gap: '24px',
            marginBottom: '16px',
            padding: '12px 16px',
            background: '#f8fafc',
            borderRadius: '8px',
          }}
        >
          <Space size={16}>
            <Badge
              count={networkCards.filter(c => !c.isUngrouped).length}
              style={{ backgroundColor: designTokens.colors.primary.main }}
            />
            <span style={{ color: '#64748b', fontSize: '13px' }}>个网卡</span>
            <Badge count={totalStats.total} style={{ backgroundColor: '#667eea' }} />
            <span style={{ color: '#64748b', fontSize: '13px' }}>个端口</span>
          </Space>
        </div>

        <Collapse
          activeKey={expandedCards.filter(id => 
            paginatedNetworkCards.some(card => card.nicId === id)
          )}
          onChange={keys => setExpandedCards(keys)}
          expandIconPosition="end"
          style={{ background: 'transparent' }}
        >
          {paginatedNetworkCards.map(card => (
            <Panel
              key={card.nicId}
              header={renderCardHeader(card)}
              style={{
                background: '#fff',
                borderRadius: '8px',
                marginBottom: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              {card.ports && card.ports.length > 0 ? (
                renderPortTable(card.ports)
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  该{card.isUngrouped ? '分组' : '网卡'}暂无端口
                </div>
              )}
            </Panel>
          ))}
        </Collapse>

        {portsTotalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 16,
              gap: 12,
            }}
          >
            <Button
              icon={<LeftOutlined />}
              disabled={portsPage === 1}
              onClick={() => setPortsPage(prev => prev - 1)}
              size="small"
            />
            <span style={{ color: '#64748b', fontSize: '13px' }}>
              {portsPage} / {portsTotalPages}
            </span>
            <Button
              icon={<RightOutlined />}
              disabled={portsPage === portsTotalPages}
              onClick={() => setPortsPage(prev => prev + 1)}
              size="small"
            />
          </div>
        )}
      </div>
    );
  };

  const renderCablesTab = () => {
    if (deviceCables.length === 0) {
      return <Empty description="该设备暂无接线" />;
    }

    return (
      <div className="cable-panel">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {paginatedCables.map(cable => (
            <Card
              key={cable.cableId}
              size="small"
              style={{ borderRadius: '8px' }}
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

        {cablesTotalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 16,
              gap: 12,
            }}
          >
            <Button
              icon={<LeftOutlined />}
              disabled={cablesPage === 1}
              onClick={() => setCablesPage(prev => prev - 1)}
              size="small"
            />
            <span style={{ color: '#64748b', fontSize: '13px' }}>
              {cablesPage} / {cablesTotalPages}
            </span>
            <Button
              icon={<RightOutlined />}
              disabled={cablesPage === cablesTotalPages}
              onClick={() => setCablesPage(prev => prev + 1)}
              size="small"
            />
          </div>
        )}
      </div>
    );
  };

  if (!device) return null;

  const customFields = device.customFields || {};
  const standardFields = ['deviceId', 'name', 'type', 'model', 'serialNumber', 'status', 'ipAddress', 'position', 'height', 'powerConsumption', 'purchaseDate', 'warrantyExpiry', 'description'];
  const customFieldEntries = Object.entries(customFields).filter(([key]) => !standardFields.includes(key));

  const tabItems = [
    {
      key: 'ports',
      label: (
        <span>
          <ApiOutlined />
          端口与网卡 ({networkCards.length})
        </span>
      ),
      children: renderPortsTab(),
    },
    {
      key: 'cables',
      label: (
        <span>
          <LinkOutlined />
          接线 ({deviceCables.length})
        </span>
      ),
      children: renderCablesTab(),
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
          <Table
            columns={ticketColumns}
            dataSource={tickets}
            rowKey="ticketId"
            loading={ticketsLoading}
            pagination={{
              current: ticketsPagination.current,
              pageSize: ticketsPagination.pageSize,
              total: ticketsPagination.total,
              onChange: (page, pageSize) => fetchDeviceTickets(page, pageSize),
              showSizeChanger: false,
              size: 'small',
            }}
            size="small"
            locale={{ emptyText: <Empty description="该设备暂无工单记录" /> }}
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
        <Tooltip title="编辑设备信息">
          <Button icon={<EditOutlined />} onClick={() => onEdit?.(device)}>
            编辑
          </Button>
        </Tooltip>
      }
      styles={{ body: { padding: '0', overflow: 'auto' } }}
    >
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

      <div style={{ padding: '20px 24px' }}>
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

        {device.description && (
          <Card title="描述" size="small" style={{ marginBottom: 16 }}>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{device.description}</div>
          </Card>
        )}

        {customFieldEntries.length > 0 && (
          <Card title="自定义字段" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={[24, 16]}>
              {customFieldEntries.map(([key, value]) => {
                const fieldLabel = tooltipFields?.[key]?.label || key;
                return (
                  <Col span={8} key={key}>
                    <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>{fieldLabel}</div>
                    <div style={{ fontWeight: 500 }}>{String(value)}</div>
                  </Col>
                );
              })}
            </Row>
          </Card>
        )}

        <Divider style={{ margin: '24px 0' }} />

        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </div>
    </Drawer>
  );
}

export default React.memo(DeviceDetailDrawer);
