import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  Empty,
  Spin,
  Badge,
  Collapse,
  Card,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ApiOutlined,
  CloudServerOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import PortCreateModal from './PortCreateModal';
import NetworkCardCreateModal from './NetworkCardCreateModal';

const { Panel } = Collapse;

const designTokens = {
  colors: {
    primary: {
      main: '#667eea',
    },
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
  },
};

function NetworkCardPanel({ deviceId, deviceName, onRefresh, refreshTrigger }) {
  const [cards, setCards] = useState([]);
  const [networkCards, setNetworkCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createPortModalVisible, setCreatePortModalVisible] = useState(false);
  const [createCardModalVisible, setCreateCardModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [expandedCards, setExpandedCards] = useState([]);

  const fetchData = useCallback(async () => {
    if (!deviceId) return;

    try {
      setLoading(true);
      const [cardsResponse, networkCardsResponse] = await Promise.all([
        axios.get(`/api/network-cards/device/${deviceId}/with-ports`),
        axios.get(`/api/network-cards/device/${deviceId}`),
      ]);

      const cardsData = cardsResponse.data || [];
      setCards(cardsData);
      setNetworkCards(networkCardsResponse.data || []);

      const initialExpanded = cardsData
        .filter(card => card.ports && card.ports.length > 0)
        .map(card => card.nicId);
      setExpandedCards(initialExpanded);
    } catch (error) {
      console.error('获取网卡数据失败:', error);
      setCards([]);
      setNetworkCards([]);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const handleDeleteCard = useCallback(
    async card => {
      try {
        await axios.delete(`/api/network-cards/${card.nicId}`);
        import('antd').then(({ message }) => message.success('网卡删除成功'));
        fetchData();
        onRefresh?.();
      } catch (error) {
        import('antd').then(({ message }) =>
          message.error(error.response?.data?.error || '网卡删除失败')
        );
      }
    },
    [fetchData, onRefresh]
  );

  const handleDeletePort = useCallback(
    async port => {
      try {
        await axios.delete(`/api/device-ports/${port.portId}`);
        import('antd').then(({ message }) => message.success('端口删除成功'));
        fetchData();
        onRefresh?.();
      } catch (error) {
        import('antd').then(({ message }) => message.error('端口删除失败'));
      }
    },
    [fetchData, onRefresh]
  );

  const handleCreateCardSuccess = useCallback(() => {
    fetchData();
    onRefresh?.();
  }, [fetchData, onRefresh]);

  const handleCreatePortSuccess = useCallback(() => {
    fetchData();
    onRefresh?.();
  }, [fetchData, onRefresh]);

  const handleExpand = nicId => {
    setExpandedCards(prev => {
      if (prev.includes(nicId)) {
        return prev.filter(id => id !== nicId);
      }
      return [...prev, nicId];
    });
  };

  const getStatusTag = status => {
    const config = {
      free: { color: 'success', text: '空闲' },
      occupied: { color: 'processing', text: '占用' },
      fault: { color: 'error', text: '故障' },
      normal: { color: 'success', text: '正常' },
      warning: { color: 'warning', text: '警告' },
      offline: { color: 'default', text: '离线' },
    };
    const { color, text } = config[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  const getTypeTag = type => {
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
  };

  const renderPortTable = (ports, nicId) => {
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
        render: type => getTypeTag(type),
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
      {
        title: '操作',
        key: 'action',
        width: 80,
        render: (_, record) => (
          <Space size="small">
            <Popconfirm
              title="确定要删除此端口吗？"
              onConfirm={() => handleDeletePort(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];

    return (
      <Table
        columns={columns}
        dataSource={ports}
        rowKey="portId"
        pagination={false}
        size="small"
        scroll={{ x: 500 }}
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
          {!card.isUngrouped && (
            <Popconfirm
              title="确定要删除此网卡吗？"
              description="删除网卡前需确保其下无端口"
              onConfirm={() => handleDeleteCard(card)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除网卡
              </Button>
            </Popconfirm>
          )}
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={e => {
              e.stopPropagation();
              setSelectedCard(card);
              setCreatePortModalVisible(true);
            }}
            style={{ background: designTokens.colors.primary.gradient, border: 'none' }}
          >
            添加端口
          </Button>
        </Space>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" tip="加载网卡数据中..." />
      </div>
    );
  }

  const totalStats = cards.reduce(
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

  return (
    <div className="network-card-panel">
      <div
        className="panel-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div className="stats" style={{ display: 'flex', gap: '24px' }}>
          <Space size={16}>
            <Badge
              count={networkCards.length}
              style={{ backgroundColor: designTokens.colors.primary.main }}
            />
            <span style={{ color: '#64748b', fontSize: '13px' }}>个网卡</span>
            <Badge count={totalStats.total} style={{ backgroundColor: '#667eea' }} />
            <span style={{ color: '#64748b', fontSize: '13px' }}>个端口</span>
          </Space>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData} size="small">
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateCardModalVisible(true)}
            style={{ background: designTokens.colors.primary.gradient, border: 'none' }}
          >
            新增网卡
          </Button>
        </Space>
      </div>

      {cards.length === 0 ? (
        <div className="empty-state">
          <Empty
            description={
              <span>
                该设备暂无网卡和端口
                <br />
                <Button
                  type="link"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateCardModalVisible(true)}
                  style={{ padding: 0, marginTop: 8 }}
                >
                  立即添加网卡
                </Button>
              </span>
            }
          >
            <CloudServerOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          </Empty>
        </div>
      ) : (
        <Collapse
          activeKey={expandedCards}
          onChange={keys => setExpandedCards(keys)}
          expandIconPosition="end"
          style={{ background: 'transparent' }}
        >
          {cards.map(card => (
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
                renderPortTable(card.ports, card.nicId)
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  该{card.isUngrouped ? '分组' : '网卡'}暂无端口
                  <br />
                  <Button
                    type="link"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setSelectedCard(card);
                      setCreatePortModalVisible(true);
                    }}
                    style={{ padding: 0, marginTop: 8 }}
                  >
                    添加端口
                  </Button>
                </div>
              )}
            </Panel>
          ))}
        </Collapse>
      )}

      <NetworkCardCreateModal
        device={{ deviceId, name: deviceName }}
        visible={createCardModalVisible}
        onClose={() => setCreateCardModalVisible(false)}
        onSuccess={handleCreateCardSuccess}
      />

      <PortCreateModal
        device={{ deviceId, name: deviceName }}
        visible={createPortModalVisible}
        onClose={() => {
          setCreatePortModalVisible(false);
          setSelectedCard(null);
        }}
        onSuccess={handleCreatePortSuccess}
        defaultNicId={selectedCard?.nicId}
      />
    </div>
  );
}

export default React.memo(NetworkCardPanel);
