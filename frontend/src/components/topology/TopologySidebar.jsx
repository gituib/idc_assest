import React from 'react';
import { Drawer, Card, Descriptions, Tag, Badge, Row, Col, Statistic, Typography, Space, Progress } from 'antd';
import {
  CloudServerOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  SwapOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

const DEVICE_COLORS = {
  switch: '#1890ff',
  router: '#722ed1',
  server: '#52c41a',
  storage: '#fa8c16',
  default: '#8c8c8c'
};

const DEVICE_ICONS = {
  switch: AppstoreOutlined,
  router: SwapOutlined,
  server: CloudServerOutlined,
  storage: DatabaseOutlined,
  default: CloudServerOutlined
};

const CABLE_COLORS = {
  ethernet: '#1890ff',
  fiber: '#13c2c2',
  copper: '#fa8c16'
};

function TopologySidebar({ visible, onClose, selectedNode, selectedEdge, data }) {
  if (!selectedNode && !selectedEdge) {
    return null;
  }

  const renderDeviceDetail = () => {
    if (!selectedNode) return null;

    const IconComponent = DEVICE_ICONS[selectedNode.type] || DEVICE_ICONS.default;
    const nodeColor = DEVICE_COLORS[selectedNode.type] || DEVICE_COLORS.default;
    const portCount = selectedNode.portCount || {};
    const usedPercent = portCount.total > 0 ? Math.round((portCount.used / portCount.total) * 100) : 0;

    return (
      <div>
        <div
          style={{
            textAlign: 'center',
            padding: '24px 16px',
            background: `linear-gradient(135deg, ${nodeColor}15 0%, ${nodeColor}05 100%)`,
            borderRadius: 12,
            marginBottom: 20,
            border: `1px solid ${nodeColor}30`
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `${nodeColor}20`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12
            }}
          >
            <IconComponent style={{ fontSize: 32, color: nodeColor }} />
          </div>
          <Title level={4} style={{ margin: '8px 0 4px' }}>{selectedNode.name}</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>{selectedNode.deviceId}</Text>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8 }}>
            <Tag color={nodeColor} style={{ borderRadius: 4, margin: 0 }}>
              {selectedNode.type === 'switch' ? '交换机' :
               selectedNode.type === 'router' ? '路由器' :
               selectedNode.type === 'server' ? '服务器' :
               selectedNode.type === 'storage' ? '存储' : '设备'}
            </Tag>
            {selectedNode.isCenter && (
              <Tag color="gold" style={{ borderRadius: 4, margin: 0 }}>拓扑中心</Tag>
            )}
          </div>
        </div>

        <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label={<Text type="secondary">设备型号</Text>}>
              <Text>{selectedNode.model || '-'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text type="secondary">IP地址</Text>}>
              <Text code>{selectedNode.ipAddress || '-'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text type="secondary">所属机房</Text>}>
              <Text>{selectedNode.roomName || '-'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text type="secondary">所属机柜</Text>}>
              <Text>{selectedNode.rackName || '-'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text type="secondary">U位</Text>}>
              <Text>{typeof selectedNode.position === 'string' || typeof selectedNode.position === 'number'
                ? selectedNode.position
                : selectedNode.position?.x !== undefined
                  ? `坐标(${selectedNode.position.x}, ${selectedNode.position.y})`
                  : '-'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text type="secondary">状态</Text>}>
              <Badge
                status={selectedNode.status === 'online' ? 'success' :
                        selectedNode.status === 'fault' ? 'error' : 'default'}
                text={selectedNode.status === 'online' ? '在线' :
                       selectedNode.status === 'fault' ? '故障' : '离线'}
              />
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {portCount.total > 0 && (
          <Card size="small" title={<Text style={{ fontSize: 13 }}>端口统计</Text>} style={{ marginBottom: 16, borderRadius: 8 }}>
            <Row gutter={[8, 12]}>
              <Col span={24}>
                <Progress
                  percent={usedPercent}
                  strokeColor={nodeColor}
                  trailColor="#f0f0f0"
                  size="small"
                  format={(percent) => (
                    <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                      {portCount.used}/{portCount.total} 已用 ({percent}%)
                    </span>
                  )}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={<Text style={{ fontSize: 11 }}>总数</Text>}
                  value={portCount.total || 0}
                  valueStyle={{ fontSize: 18, color: '#262626' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={<Text style={{ fontSize: 11 }}>已用</Text>}
                  value={portCount.used || 0}
                  valueStyle={{ fontSize: 18, color: '#1890ff' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={<Text style={{ fontSize: 11 }}>空闲</Text>}
                  value={portCount.free || 0}
                  valueStyle={{ fontSize: 18, color: '#52c41a' }}
                />
              </Col>
              {portCount.fault > 0 && (
                <Col span={8}>
                  <Statistic
                    title={<Text style={{ fontSize: 11 }}>故障</Text>}
                    value={portCount.fault || 0}
                    valueStyle={{ fontSize: 18, color: '#ff4d4f' }}
                  />
                </Col>
              )}
            </Row>
          </Card>
        )}
      </div>
    );
  };

  const renderEdgeDetail = () => {
    if (!selectedEdge) return null;

    const centerDevice = data?.centerDevice;
    const sourceDevice = selectedEdge.source === centerDevice?.deviceId
      ? centerDevice
      : data?.nodes?.find(n => n.id === selectedEdge.source);
    const targetDevice = selectedEdge.target === centerDevice?.deviceId
      ? centerDevice
      : data?.nodes?.find(n => n.id === selectedEdge.target);
    const cableColor = CABLE_COLORS[selectedEdge.cableType] || '#8c8c8c';

    return (
      <div>
        <div
          style={{
            padding: '24px 16px',
            background: `linear-gradient(135deg, ${cableColor}15 0%, ${cableColor}05 100%)`,
            borderRadius: 12,
            marginBottom: 20,
            border: `1px solid ${cableColor}30`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: `${DEVICE_COLORS[sourceDevice?.type] || '#8c8c8c'}20`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8
                }}
              >
                {React.createElement(DEVICE_ICONS[sourceDevice?.type] || DEVICE_ICONS.default, {
                  style: { fontSize: 24, color: DEVICE_COLORS[sourceDevice?.type] || '#8c8c8c' }
                })}
              </div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{sourceDevice?.name || selectedEdge.source}</div>
              <Tag size="small" style={{ marginTop: 4 }}>{selectedEdge.sourcePort}</Tag>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 40,
                  height: 2,
                  background: cableColor,
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    right: -4,
                    top: -3,
                    width: 0,
                    height: 0,
                    borderLeft: `8px solid ${cableColor}`,
                    borderTop: '4px solid transparent',
                    borderBottom: '4px solid transparent'
                  }}
                />
              </div>
              <Tag color={cableColor} style={{ fontSize: 10, borderRadius: 4 }}>
                {selectedEdge.cableType === 'ethernet' ? '网线' :
                 selectedEdge.cableType === 'fiber' ? '光纤' :
                 selectedEdge.cableType === 'copper' ? '铜缆' : selectedEdge.cableType}
              </Tag>
            </div>

            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: `${DEVICE_COLORS[targetDevice?.type] || '#8c8c8c'}20`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8
                }}
              >
                {React.createElement(DEVICE_ICONS[targetDevice?.type] || DEVICE_ICONS.default, {
                  style: { fontSize: 24, color: DEVICE_COLORS[targetDevice?.type] || '#8c8c8c' }
                })}
              </div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{targetDevice?.name || selectedEdge.target}</div>
              <Tag size="small" style={{ marginTop: 4 }}>{selectedEdge.targetPort}</Tag>
            </div>
          </div>
        </div>

        <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label={<Text type="secondary">线缆ID</Text>}>
              <Text code>{selectedEdge.cableId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text type="secondary">线缆类型</Text>}>
              <Tag color={cableColor}>
                {selectedEdge.cableType === 'ethernet' ? '网线' :
                 selectedEdge.cableType === 'fiber' ? '光纤' :
                 selectedEdge.cableType === 'copper' ? '铜缆' : selectedEdge.cableType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={<Text type="secondary">线缆长度</Text>}>
              <Text>{selectedEdge.cableLength ? `${selectedEdge.cableLength}m` : '-'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text type="secondary">线缆标签</Text>}>
              <Text>{selectedEdge.cableLabel || '-'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text type="secondary">状态</Text>}>
              <Badge
                status={selectedEdge.status === 'normal' ? 'success' :
                        selectedEdge.status === 'fault' ? 'error' : 'default'}
                text={selectedEdge.status === 'normal' ? '正常' :
                       selectedEdge.status === 'fault' ? '故障' : '未连接'}
              />
            </Descriptions.Item>
            <Descriptions.Item label={<Text type="secondary">安装时间</Text>}>
              <Text>{selectedEdge.installedAt ? new Date(selectedEdge.installedAt).toLocaleDateString() : '-'}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {selectedEdge.description && (
          <Card size="small" title={<Text style={{ fontSize: 13 }}>描述</Text>} style={{ borderRadius: 8 }}>
            <Text>{selectedEdge.description}</Text>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Drawer
      title={
        <Space>
          {selectedNode
            ? React.createElement(DEVICE_ICONS[selectedNode?.type] || DEVICE_ICONS.default, {})
            : React.createElement(SwapOutlined, {})}
          <span>{selectedNode ? '设备详情' : '连接详情'}</span>
        </Space>
      }
      placement="right"
      width={340}
      open={visible}
      onClose={onClose}
      destroyOnClose
    >
      {selectedNode && renderDeviceDetail()}
      {selectedEdge && renderEdgeDetail()}
    </Drawer>
  );
}

export default TopologySidebar;
