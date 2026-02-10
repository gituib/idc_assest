import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Space, Typography, Spin, Empty, Button, Tooltip, Tag, Modal } from 'antd';
import {
  CloudServerOutlined,
  PlusOutlined,
  ReloadOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  DesktopOutlined,
  UsbOutlined,
  MonitorOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import PortPanel from './PortPanel';
import axios from 'axios';

const { Text } = Typography;

const designTokens = {
  colors: {
    primary: { main: '#667eea', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    metal: { light: '#9ca3af', DEFAULT: '#6b7280', dark: '#4b5563' },
    slot: { empty: '#d1d5db', occupied: '#3b82f6' },
  },
};

/**
 * 服务器背板可视化组件
 * 按照真实服务器背板布局展示网卡和端口
 *
 * @param {string} deviceId - 设备ID
 * @param {string} deviceName - 设备名称
 * @param {Object[]} cables - 接线列表
 * @param {Object[]} allDevices - 所有设备列表
 * @param {Function} onPortClick - 端口点击回调
 * @param {Function} onManageNetworkCards - 网卡管理回调
 */
const ServerBackplanePanel = ({
  deviceId,
  deviceName,
  cables,
  allDevices,
  onPortClick,
  onManageNetworkCards,
}) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // 获取网卡及端口数据
  const fetchData = useCallback(async () => {
    if (!deviceId) return;

    try {
      setLoading(true);
      const response = await axios.get(`/api/network-cards/device/${deviceId}/with-ports`);
      const cardsData = response.data || [];
      setCards(cardsData);
    } catch (error) {
      console.error('获取网卡数据失败:', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 按类型和槽位号对网卡进行分类
  const categorizeCards = () => {
    const onboard = []; // 板载网卡
    const management = []; // 管理口
    const expansionSlots = []; // 扩展插槽

    cards.forEach(card => {
      const slotNum = card.slotNumber;
      const name = (card.name || '').toLowerCase();

      // 判断网卡类型
      if (
        name.includes('idrac') ||
        name.includes('ilo') ||
        name.includes('bmc') ||
        name.includes('mgmt') ||
        name.includes('管理')
      ) {
        management.push({ ...card, type: 'management' });
      } else if (
        slotNum === 0 ||
        name.includes('onboard') ||
        name.includes('板载') ||
        name.includes('内置')
      ) {
        onboard.push({ ...card, type: 'onboard' });
      } else {
        expansionSlots.push({ ...card, type: 'expansion', slotIndex: slotNum });
      }
    });

    // 按槽位号排序扩展插槽
    expansionSlots.sort((a, b) => (a.slotNumber || 0) - (b.slotNumber || 0));

    return { onboard, management, expansionSlots };
  };

  const { onboard, management, expansionSlots } = categorizeCards();

  // 渲染管理口区域（左侧）
  const renderManagementArea = () => {
    const mgmtCard = management[0];

    return (
      <div
        style={{
          width: '80px',
          background: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)',
          borderRadius: '4px',
          padding: '8px 4px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          border: '2px solid #4b5563',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600 }}>MGMT</div>
        {mgmtCard ? (
          <div
            onClick={() => setSelectedSlot(mgmtCard)}
            style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(145deg, #1f2937 0%, #111827 100%)',
              borderRadius: '4px',
              border: `2px solid ${mgmtCard.ports?.length > 0 ? designTokens.colors.success : '#6b7280'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            <SettingOutlined style={{ fontSize: 16, color: '#10b981' }} />
            <span style={{ fontSize: '9px', color: '#9ca3af', marginTop: 2 }}>
              {mgmtCard.ports?.length || 0}口
            </span>
          </div>
        ) : (
          <div
            style={{
              width: '48px',
              height: '48px',
              background: '#374151',
              borderRadius: '4px',
              border: '2px dashed #6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlusOutlined style={{ fontSize: 14, color: '#6b7280' }} />
          </div>
        )}

        {/* 其他接口占位 */}
        <div
          style={{
            width: '48px',
            height: '24px',
            background: '#1f2937',
            borderRadius: '2px',
            border: '1px solid #4b5563',
          }}
        >
          <Text
            style={{
              fontSize: '8px',
              color: '#6b7280',
              display: 'block',
              textAlign: 'center',
              lineHeight: '22px',
            }}
          >
            VGA
          </Text>
        </div>
        <div
          style={{
            width: '48px',
            height: '16px',
            background: '#1f2937',
            borderRadius: '2px',
            border: '1px solid #4b5563',
          }}
        >
          <Text
            style={{
              fontSize: '8px',
              color: '#6b7280',
              display: 'block',
              textAlign: 'center',
              lineHeight: '14px',
            }}
          >
            USB
          </Text>
        </div>
      </div>
    );
  };

  // 渲染板载网卡区域
  const renderOnboardArea = () => {
    const onboardCard = onboard[0];

    return (
      <div
        style={{
          flex: 1,
          background: 'linear-gradient(180deg, #4b5563 0%, #374151 100%)',
          borderRadius: '4px',
          padding: '12px',
          border: '2px solid #6b7280',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <Text style={{ fontSize: '11px', color: '#d1d5db', fontWeight: 600 }}>
            板载网卡 (Onboard)
          </Text>
          {onboardCard && (
            <Badge
              count={onboardCard.ports?.length || 0}
              style={{ backgroundColor: designTokens.colors.primary.main }}
            />
          )}
        </div>

        {onboardCard ? (
          <div
            onClick={() => setSelectedSlot(onboardCard)}
            style={{
              background: 'linear-gradient(145deg, #1f2937 0%, #111827 100%)',
              borderRadius: '6px',
              padding: '12px',
              border: `2px solid ${onboardCard.ports?.length > 0 ? designTokens.colors.primary.main : '#6b7280'}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {/* 4个RJ45端口布局 */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {[0, 1, 2, 3].map(idx => {
                const port = onboardCard.ports?.[idx];
                const hasPort = !!port;
                const isOccupied = hasPort && port.status === 'occupied';

                return (
                  <Tooltip
                    key={idx}
                    title={hasPort ? `${port.portName} - ${port.status}` : '未配置'}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '32px',
                        background: hasPort
                          ? 'linear-gradient(180deg, #374151 0%, #1f2937 100%)'
                          : '#374151',
                        borderRadius: '4px',
                        border: `2px solid ${
                          hasPort
                            ? isOccupied
                              ? designTokens.colors.success
                              : designTokens.colors.metal.light
                            : '#4b5563'
                        }`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      {/* LED指示灯 */}
                      <div
                        style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: hasPort ? (isOccupied ? '#10b981' : '#6b7280') : '#374151',
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          boxShadow: isOccupied ? '0 0 4px #10b981' : 'none',
                        }}
                      />
                      <span style={{ fontSize: '8px', color: '#9ca3af' }}>⬡</span>
                      <span style={{ fontSize: '7px', color: '#6b7280', marginTop: '1px' }}>
                        {hasPort ? idx + 1 : '-'}
                      </span>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            onClick={onManageNetworkCards}
            style={{
              background: '#374151',
              borderRadius: '6px',
              padding: '20px',
              border: '2px dashed #6b7280',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              gap: '8px',
            }}
          >
            <PlusOutlined style={{ fontSize: 20, color: '#6b7280' }} />
            <Text style={{ fontSize: '11px', color: '#9ca3af' }}>添加板载网卡</Text>
          </div>
        )}
      </div>
    );
  };

  // 渲染扩展插槽区域
  const renderExpansionSlots = () => {
    // 标准2U服务器通常有4-8个PCIe插槽
    const totalSlots = 6;
    const slots = [];

    for (let i = 1; i <= totalSlots; i++) {
      const card = expansionSlots.find(c => c.slotNumber === i);
      slots.push({ slotNumber: i, card });
    }

    return (
      <div
        style={{
          flex: 1.5,
          background: 'linear-gradient(180deg, #4b5563 0%, #374151 100%)',
          borderRadius: '4px',
          padding: '12px',
          border: '2px solid #6b7280',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <Text style={{ fontSize: '11px', color: '#d1d5db', fontWeight: 600 }}>PCIe 扩展插槽</Text>
          <Space size={4}>
            <Badge
              count={expansionSlots.length}
              style={{ backgroundColor: designTokens.colors.primary.main }}
            />
            <Text style={{ fontSize: '10px', color: '#9ca3af' }}>/{totalSlots}</Text>
          </Space>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {slots.map(({ slotNumber, card }) => (
            <Tooltip
              key={slotNumber}
              title={
                card ? `${card.name} (${card.ports?.length || 0}口)` : `插槽 ${slotNumber} (空闲)`
              }
            >
              <div
                onClick={() => card && setSelectedSlot(card)}
                style={{
                  width: '70px',
                  height: '90px',
                  background: card
                    ? 'linear-gradient(145deg, #1f2937 0%, #111827 100%)'
                    : '#374151',
                  borderRadius: '4px',
                  border: `2px solid ${card ? designTokens.colors.slot.occupied : designTokens.colors.slot.empty}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px',
                  cursor: card ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  boxShadow: card ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
                }}
              >
                <Text style={{ fontSize: '9px', color: '#6b7280', fontWeight: 600 }}>
                  Slot {slotNumber}
                </Text>

                {card ? (
                  <>
                    <CloudServerOutlined style={{ fontSize: 20, color: '#3b82f6' }} />
                    <div
                      style={{
                        display: 'flex',
                        gap: '2px',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                      }}
                    >
                      {card.ports?.slice(0, 4).map((port, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '1px',
                            background: port.status === 'occupied' ? '#10b981' : '#6b7280',
                            boxShadow: port.status === 'occupied' ? '0 0 2px #10b981' : 'none',
                          }}
                        />
                      ))}
                      {card.ports?.length > 4 && (
                        <Text style={{ fontSize: '8px', color: '#9ca3af' }}>
                          +{card.ports.length - 4}
                        </Text>
                      )}
                    </div>
                    <Text style={{ fontSize: '8px', color: '#9ca3af' }}>
                      {card.ports?.length || 0}口
                    </Text>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        border: '2px dashed #4b5563',
                        borderRadius: '4px',
                      }}
                    />
                    <Text style={{ fontSize: '8px', color: '#6b7280' }}>空闲</Text>
                  </>
                )}
              </div>
            </Tooltip>
          ))}
        </div>
      </div>
    );
  };

  // 渲染电源区域（右侧）
  const renderPowerArea = () => {
    return (
      <div
        style={{
          width: '100px',
          background: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)',
          borderRadius: '4px',
          padding: '8px',
          border: '2px solid #4b5563',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <Text style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, textAlign: 'center' }}>
          电源
        </Text>
        {[1, 2].map(psu => (
          <div
            key={psu}
            style={{
              flex: 1,
              background: 'linear-gradient(145deg, #1f2937 0%, #111827 100%)',
              borderRadius: '4px',
              border: '2px solid #10b981',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <ThunderboltOutlined style={{ fontSize: 20, color: '#10b981' }} />
            <Text style={{ fontSize: '9px', color: '#10b981' }}>PSU {psu}</Text>
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 6px #10b981',
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" tip="加载背板数据中..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 工具栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        <Space>
          <Badge
            count={cards.filter(c => !c.isUngrouped).length}
            style={{ backgroundColor: designTokens.colors.primary.main }}
          />
          <Text type="secondary" style={{ fontSize: '13px' }}>
            个网卡
          </Text>
          <Badge
            count={cards.reduce((acc, card) => acc + (card.ports?.length || 0), 0)}
            style={{ backgroundColor: '#667eea' }}
          />
          <Text type="secondary" style={{ fontSize: '13px' }}>
            个端口
          </Text>
        </Space>
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<CloudServerOutlined />}
            onClick={onManageNetworkCards}
            style={{ background: designTokens.colors.primary.gradient, border: 'none' }}
          >
            网卡管理
          </Button>
        </Space>
      </div>

      {/* 服务器背板主体 */}
      <div
        style={{
          background: 'linear-gradient(180deg, #6b7280 0%, #4b5563 100%)',
          borderRadius: '8px',
          padding: '16px',
          border: '3px solid #374151',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {/* 服务器标识 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '4px',
          }}
        >
          <DesktopOutlined style={{ fontSize: 14, color: '#9ca3af', marginRight: 8 }} />
          <Text style={{ fontSize: '12px', color: '#d1d5db', fontWeight: 600 }}>
            {deviceName || '服务器'} - 背板视图
          </Text>
        </div>

        {/* 背板布局 */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
          {/* 左侧：管理口区域 */}
          {renderManagementArea()}

          {/* 中间左：板载网卡 */}
          {renderOnboardArea()}

          {/* 中间：扩展插槽 */}
          {renderExpansionSlots()}

          {/* 右侧：电源 */}
          {renderPowerArea()}
        </div>
      </div>

      {/* 选中插槽的端口详情模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloudServerOutlined style={{ color: '#667eea' }} />
            <span>
              {selectedSlot?.name}
              {selectedSlot?.slotNumber > 0 && ` (Slot ${selectedSlot.slotNumber})`}
            </span>
          </div>
        }
        open={!!selectedSlot}
        onCancel={() => setSelectedSlot(null)}
        footer={null}
        width={700}
        destroyOnClose
      >
        {selectedSlot && (
          <div>
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
              }}
            >
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text type="secondary">
                  类型:{' '}
                  {selectedSlot.type === 'onboard'
                    ? '板载网卡'
                    : selectedSlot.type === 'management'
                      ? '管理口'
                      : '扩展网卡'}
                </Text>
                {selectedSlot.description && (
                  <Text type="secondary">描述: {selectedSlot.description}</Text>
                )}
                <div>
                  <Text type="secondary">端口统计: </Text>
                  <Space size={8}>
                    <Tag color="success">空闲: {selectedSlot.stats?.free || 0}</Tag>
                    <Tag color="processing">占用: {selectedSlot.stats?.occupied || 0}</Tag>
                    {selectedSlot.stats?.fault > 0 && (
                      <Tag color="error">故障: {selectedSlot.stats.fault}</Tag>
                    )}
                    <Tag color="blue">总计: {selectedSlot.ports?.length || 0}</Tag>
                  </Space>
                </div>
              </Space>
            </div>

            {selectedSlot.ports && selectedSlot.ports.length > 0 ? (
              <PortPanel
                ports={selectedSlot.ports}
                deviceName={deviceName}
                deviceId={deviceId}
                cables={cables}
                devices={allDevices}
                onPortClick={onPortClick}
                compact={true}
              />
            ) : (
              <Empty
                description={
                  <span>
                    该网卡暂无端口
                    <br />
                    <Button
                      type="link"
                      icon={<PlusOutlined />}
                      onClick={onManageNetworkCards}
                      style={{ padding: 0, marginTop: 8 }}
                    >
                      前往网卡管理添加端口
                    </Button>
                  </span>
                }
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ServerBackplanePanel;
