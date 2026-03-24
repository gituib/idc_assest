import React from 'react';
import { Modal, Button, Card, Row, Col, Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { designTokens } from '../../config/theme';
import { getStatusConfig, getTypeLabel, getDeviceTypeIcon } from '../../utils/deviceUtils.jsx';

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '18px',
  fontWeight: 600,
};

const secondaryActionStyle = {
  height: '40px',
  borderRadius: designTokens.borderRadius.small,
  border: `1px solid ${designTokens.colors.border.light}`,
  fontWeight: '500',
};

const DeviceDetailModal = ({
  visible,
  device,
  deviceFields,
  onClose,
  onEdit,
  onViewTickets,
  onCreateTicket,
}) => {
  if (!device) return null;

  return (
    <Modal
      title={
        <div style={{ ...modalHeaderStyle, paddingRight: '32px' }}>
          <AppstoreOutlined style={{ color: '#667eea' }} />
          设备详情
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose} style={secondaryActionStyle}>
          关闭
        </Button>,
        <Button key="viewTickets" onClick={() => onViewTickets(device)} style={secondaryActionStyle}>
          查看工单
        </Button>,
        <Button key="createTicket" onClick={() => onCreateTicket(device)} style={secondaryActionStyle}>
          创建工单
        </Button>,
        <Button
          key="edit"
          type="primary"
          onClick={() => {
            onClose();
            onEdit(device);
          }}
          style={{
            height: '40px',
            borderRadius: designTokens.borderRadius.small,
            background: designTokens.colors.primary.gradient,
            border: 'none',
            color: '#ffffff',
            boxShadow: designTokens.shadows.small,
            fontWeight: '500',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          编辑
        </Button>,
      ]}
      width={700}
      destroyOnHidden
      styles={{
        header: {
          borderBottom: '1px solid #f0f0f0',
          padding: '16px 24px',
          position: 'relative',
        },
        body: { padding: '0', overflow: 'auto' },
      }}
    >
      <div>
        <div
          style={{
            padding: '24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getDeviceTypeIcon(device.type)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
                {device.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.9 }}>
                <span>{getTypeLabel(device.type)}</span>
                <span>|</span>
                <span>{device.deviceId}</span>
                <span>|</span>
                <Tag
                  color={device.status ? getStatusConfig(device.status).badgeColor : 'default'}
                  style={{ margin: 0 }}
                >
                  {device.status ? getStatusConfig(device.status).text : '-'}
                </Tag>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <Card
            size="small"
            title={<span style={{ fontWeight: 600 }}>基本信息</span>}
            style={{ marginBottom: '16px', borderRadius: '8px' }}
          >
            <Row gutter={[24, 16]}>
              <Col span={8}>
                <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>设备型号</div>
                <div style={{ fontWeight: 500 }}>{device.model || '-'}</div>
              </Col>
              <Col span={8}>
                <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>序列号</div>
                <div style={{ fontWeight: 500 }}>{device.serialNumber || '-'}</div>
              </Col>
              <Col span={8}>
                <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>IP地址</div>
                <div style={{ fontWeight: 500 }}>{device.ipAddress || '-'}</div>
              </Col>
              <Col span={8}>
                <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>所在机房</div>
                <div style={{ fontWeight: 500 }}>{device.Rack?.Room?.name || '-'}</div>
              </Col>
              <Col span={8}>
                <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>所在机柜</div>
                <div style={{ fontWeight: 500 }}>{device.Rack?.name || '-'}</div>
              </Col>
              <Col span={8}>
                <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>位置(U)</div>
                <div style={{ fontWeight: 500 }}>U{device.position || '-'}</div>
              </Col>
              <Col span={8}>
                <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>高度</div>
                <div style={{ fontWeight: 500 }}>{device.height ? `${device.height}U` : '-'}</div>
              </Col>
              <Col span={8}>
                <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>功率</div>
                <div style={{ fontWeight: 500 }}>{device.powerConsumption ? `${device.powerConsumption}W` : '-'}</div>
              </Col>
              <Col span={8}>
                <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>状态</div>
                <div
                  style={{
                    fontWeight: 500,
                    color: device.status ? getStatusConfig(device.status).color : '#666',
                  }}
                >
                  {device.status ? getStatusConfig(device.status).text : '-'}
                </div>
              </Col>
            </Row>
          </Card>

          <Card
            size="small"
            title={<span style={{ fontWeight: 600 }}>维保信息</span>}
            style={{ marginBottom: '16px', borderRadius: '8px' }}
          >
            <Row gutter={[24, 16]}>
              <Col span={12}>
                <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>购买日期</div>
                <div style={{ fontWeight: 500 }}>
                  {device.purchaseDate
                    ? new Date(device.purchaseDate).toLocaleDateString('zh-CN')
                    : '-'}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>保修到期</div>
                <div
                  style={{
                    fontWeight:
                      device.warrantyExpiry && new Date(device.warrantyExpiry) < new Date()
                        ? 600
                        : 500,
                    color:
                      device.warrantyExpiry && new Date(device.warrantyExpiry) < new Date()
                        ? '#d93025'
                        : '#333',
                  }}
                >
                  {device.warrantyExpiry
                    ? new Date(device.warrantyExpiry).toLocaleDateString('zh-CN')
                    : '-'}
                </div>
              </Col>
            </Row>
          </Card>

          {device.description && (
            <Card
              size="small"
              title={<span style={{ fontWeight: 600 }}>描述</span>}
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            >
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{device.description}</div>
            </Card>
          )}

          {device.customFields && Object.keys(device.customFields).length > 0 && (
            <Card
              size="small"
              title={<span style={{ fontWeight: 600 }}>自定义字段</span>}
              style={{ borderRadius: '8px' }}
            >
              <Row gutter={[24, 16]}>
                {Object.entries(device.customFields).map(([key, value]) => {
                  const fieldConfig = deviceFields.find((f) => f.fieldName === key);
                  const displayName = fieldConfig?.displayName || key;
                  return (
                    <Col span={8} key={key}>
                      <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>
                        {displayName}
                      </div>
                      <div style={{ fontWeight: 500 }}>{String(value)}</div>
                    </Col>
                  );
                })}
              </Row>
            </Card>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default React.memo(DeviceDetailModal);
