import React, { useEffect, useState } from 'react';
import { Modal, Button, Row, Col, Tag, Progress } from 'antd';
import {
  AppstoreOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  StopOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { designTokens } from '../../config/theme';
import { getStatusConfig, getTypeLabel, getDeviceTypeIcon } from '../../utils/deviceUtils.jsx';

const { colors, shadows, borderRadius, transitions, spacing } = designTokens;

const DeviceDetailModal = ({
  visible,
  device,
  deviceFields,
  onClose,
  onEdit,
  onViewTickets,
  onCreateTicket,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!device) return null;

  const getStatusIcon = (status) => {
    const iconMap = {
      running: <SyncOutlined spin style={{ color: colors.status.running }} />,
      maintenance: <ClockCircleOutlined style={{ color: colors.status.maintenance }} />,
      offline: <StopOutlined style={{ color: colors.status.offline }} />,
      fault: <ExclamationCircleOutlined style={{ color: colors.status.fault }} />,
      idle: <CheckCircleOutlined style={{ color: '#36cfc9' }} />,
    };
    return iconMap[status] || <DesktopOutlined style={{ color: colors.text.tertiary }} />;
  };

  const getDeviceTypeColor = (type) => {
    return colors.device[type] || colors.device.other;
  };

  const isWarrantyExpired = device.warrantyExpiry && new Date(device.warrantyExpiry) < new Date();
  const warrantyDaysLeft = device.warrantyExpiry
    ? Math.ceil((new Date(device.warrantyExpiry) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const InfoCard = ({ title, icon, children, className = '' }) => (
    <div
      className={`info-card ${className}`}
      style={{
        background: colors.background.primary,
        borderRadius: borderRadius.large,
        border: `1px solid ${colors.border.light}`,
        boxShadow: shadows.small,
        overflow: 'hidden',
        transition: `all ${transitions.normal}`,
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.border.light}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: `linear-gradient(180deg, ${colors.background.secondary} 0%, ${colors.background.primary} 100%)`,
        }}
      >
        <span style={{ color: colors.primary.main, fontSize: '16px' }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: '15px', color: colors.text.primary }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );

  const InfoItem = ({ label, value, status, copyable = false, fullWidth = false }) => {
    const renderValue = () => {
      if (status === 'warning') {
        return (
          <span
            style={{
              color: colors.warning.main,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ExclamationCircleOutlined />
            {value}
          </span>
        );
      }
      if (status === 'danger') {
        return (
          <span
            style={{
              color: colors.error.main,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CloseCircleOutlined />
            {value}
          </span>
        );
      }
      return <span style={{ fontWeight: 500 }}>{value || '-'}</span>;
    };

    return (
      <div
        style={{
          marginBottom: '16px',
          paddingBottom: '16px',
          borderBottom: `1px dashed ${colors.border.light}`,
        }}
        className={fullWidth ? 'info-item-full' : ''}
      >
        <div
          style={{
            fontSize: '12px',
            color: colors.text.tertiary,
            marginBottom: '6px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '14px',
            color: colors.text.primary,
          }}
        >
          {renderValue()}
        </div>
      </div>
    );
  };

  const tabItems = [
    { key: 'basic', label: '基本信息' },
    { key: 'location', label: '位置信息' },
    { key: 'maintenance', label: '维保信息' },
  ];

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
      centered
      className="device-detail-modal"
      styles={{
        mask: {
          backdropFilter: 'blur(4px)',
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
        },
        content: {
          padding: 0,
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
          boxShadow: shadows.xl,
        },
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .device-detail-modal .info-card:hover {
          box-shadow: ${shadows.md};
          transform: translateY(-2px);
        }

        .device-detail-modal .info-item:last-child {
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
          border-bottom: none !important;
        }

        .device-detail-modal .tab-btn {
          transition: all ${transitions.fast};
          border-bottom: 2px solid transparent;
        }

        .device-detail-modal .tab-btn:hover {
          color: ${colors.primary.main};
          background: ${colors.primary.bg};
        }

        .device-detail-modal .tab-btn.active {
          color: ${colors.primary.main};
          border-bottom-color: ${colors.primary.main};
          background: ${colors.primary.bg};
        }

        .device-detail-modal .action-btn {
          transition: all ${transitions.fast};
        }

        .device-detail-modal .action-btn:hover {
          transform: translateY(-1px);
          box-shadow: ${shadows.md};
        }

        .device-detail-modal .device-icon-wrapper {
          transition: all ${transitions.normal};
        }

        .device-detail-modal .device-icon-wrapper:hover {
          transform: scale(1.05);
        }

        .device-detail-modal .progress-bar {
          transition: all ${transitions.slow};
        }

        @media (max-width: 768px) {
          .device-detail-modal .ant-modal {
            max-width: 95vw !important;
            margin: 10px auto !important;
          }
        }
      `}</style>

      <div
        style={{
          background: `linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)`,
          padding: '28px 32px',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            borderRadius: '0 0 0 100%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-50px',
            left: '20%',
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', position: 'relative', zIndex: 1 }}>
          <div
            className="device-icon-wrapper"
            style={{
              width: '72px',
              height: '72px',
              borderRadius: borderRadius.large,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 32px rgba(0, 0, 0, 0.2)`,
            }}
          >
            <div style={{ fontSize: '32px', color: '#fff' }}>
              {getDeviceTypeIcon(device.type)}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#fff',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              >
                {device.name}
              </h2>
              {device.status && (
                <Tag
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#fff',
                    borderRadius: borderRadius.round,
                    padding: '2px 12px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {getStatusIcon(device.status)}
                  {getStatusConfig(device.status).text}
                </Tag>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                opacity: 0.9,
                fontSize: '14px',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '4px 12px',
                  borderRadius: borderRadius.round,
                }}
              >
                <AppstoreOutlined style={{ fontSize: '12px' }} />
                {getTypeLabel(device.type)}
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '4px 12px',
                  borderRadius: borderRadius.round,
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{device.deviceId}</span>
              </span>
              {device.model && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: '4px 12px',
                    borderRadius: borderRadius.round,
                  }}
                >
                  {device.model}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px', backgroundColor: colors.background.secondary }}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            paddingTop: '16px',
          }}
        >
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: activeTab === tab.key ? colors.primary.main : colors.text.secondary,
                borderRadius: borderRadius.medium,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: colors.primary.main,
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxHeight: '480px', overflowY: 'auto' }}>
        {activeTab === 'basic' && (
          <InfoCard
            title="基本信息"
            icon={<AppstoreOutlined />}
            style={{ animation: 'fadeInUp 0.3s ease-out' }}
          >
            <Row gutter={[24, 16]}>
              <Col span={8}>
                <InfoItem label="设备ID" value={device.deviceId} />
              </Col>
              <Col span={8}>
                <InfoItem label="设备名称" value={device.name} />
              </Col>
              <Col span={8}>
                <InfoItem label="设备类型" value={getTypeLabel(device.type)} />
              </Col>
              <Col span={8}>
                <InfoItem label="设备型号" value={device.model} />
              </Col>
              <Col span={8}>
                <InfoItem label="序列号" value={device.serialNumber} />
              </Col>
              <Col span={8}>
                <InfoItem label="IP地址" value={device.ipAddress} />
              </Col>
              <Col span={8}>
                <InfoItem
                  label="设备状态"
                  value={device.status ? getStatusConfig(device.status).text : '-'}
                  status={
                    device.status === 'fault'
                      ? 'danger'
                      : device.status === 'maintenance'
                        ? 'warning'
                        : undefined
                  }
                />
              </Col>
              <Col span={8}>
                <InfoItem label="功率消耗" value={device.powerConsumption ? `${device.powerConsumption}W` : '-'} />
              </Col>
              <Col span={8}>
                <InfoItem label="设备高度" value={device.height ? `${device.height}U` : '-'} />
              </Col>
            </Row>
            {device.description && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px dashed ${colors.border.light}` }}>
                <InfoItem label="设备描述" value={device.description} fullWidth />
              </div>
            )}
            {device.customFields && Object.keys(device.customFields).length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px dashed ${colors.border.light}` }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: colors.text.tertiary,
                    marginBottom: '12px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  自定义字段
                </div>
                <Row gutter={[16, 16]}>
                  {Object.entries(device.customFields).map(([key, value]) => {
                    const fieldConfig = deviceFields.find((f) => f.fieldName === key);
                    const displayName = fieldConfig?.displayName || key;
                    return (
                      <Col span={8} key={key}>
                        <div
                          style={{
                            padding: '12px 16px',
                            background: colors.background.secondary,
                            borderRadius: borderRadius.medium,
                            border: `1px solid ${colors.border.light}`,
                          }}
                        >
                          <div
                            style={{
                              fontSize: '12px',
                              color: colors.text.tertiary,
                              marginBottom: '4px',
                              fontWeight: 500,
                            }}
                          >
                            {displayName}
                          </div>
                          <div
                            style={{
                              fontSize: '14px',
                              color: colors.text.primary,
                              fontWeight: 500,
                            }}
                          >
                            {String(value)}
                          </div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            )}
          </InfoCard>
        )}

        {activeTab === 'location' && (
          <InfoCard
            title="位置信息"
            icon={<EnvironmentOutlined />}
            style={{ animation: 'fadeInUp 0.3s ease-out' }}
          >
            <Row gutter={[24, 16]}>
              <Col span={8}>
                <InfoItem label="所在机房" value={device.Rack?.Room?.name} />
              </Col>
              <Col span={8}>
                <InfoItem label="所在机柜" value={device.Rack?.name} />
              </Col>
              <Col span={8}>
                <InfoItem label="机柜编号" value={device.Rack?.rackId} />
              </Col>
              <Col span={8}>
                <InfoItem label="安装位置" value={device.position ? `U${device.position}` : '-'} />
              </Col>
            </Row>
          </InfoCard>
        )}

        {activeTab === 'maintenance' && (
          <>
            <InfoCard
              title="购买与维保信息"
              icon={<CalendarOutlined />}
              style={{ animation: 'fadeInUp 0.3s ease-out', marginBottom: '20px' }}
            >
              <Row gutter={[24, 16]}>
                <Col span={8}>
                  <InfoItem label="购买日期" value={device.purchaseDate ? new Date(device.purchaseDate).toLocaleDateString('zh-CN') : '-'} />
                </Col>
                <Col span={8}>
                  <InfoItem
                    label="保修到期"
                    value={device.warrantyExpiry ? new Date(device.warrantyExpiry).toLocaleDateString('zh-CN') : '-'}
                    status={isWarrantyExpired ? 'danger' : undefined}
                  />
                </Col>
                {warrantyDaysLeft !== null && warrantyDaysLeft > 0 && (
                  <Col span={24}>
                    <div
                      style={{
                        fontSize: '12px',
                        color: colors.text.tertiary,
                        marginBottom: '8px',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      保修剩余天数
                    </div>
                    <Progress
                      percent={Math.min(Math.round((warrantyDaysLeft / 365) * 100), 100)}
                      format={() => `${warrantyDaysLeft} 天`}
                      strokeColor={warrantyDaysLeft < 30 ? colors.error.main : colors.primary.main}
                      trailColor={colors.border.light}
                      size="small"
                    />
                  </Col>
                )}
              </Row>
              {isWarrantyExpired && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: colors.error.bg,
                    borderRadius: borderRadius.medium,
                    border: `1px solid ${colors.error.main}30`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <ExclamationCircleOutlined style={{ color: colors.error.main, fontSize: '18px' }} />
                  <span style={{ color: colors.error.main, fontSize: '13px', fontWeight: 500 }}>
                    设备已过保，建议续保
                  </span>
                </div>
              )}
            </InfoCard>
          </>
        )}
      </div>

      <div
        style={{
          padding: '20px 32px',
          borderTop: `1px solid ${colors.border.light}`,
          background: colors.background.primary,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            className="action-btn"
            icon={<FileTextOutlined />}
            onClick={() => onViewTickets(device)}
            style={{
              height: '40px',
              borderRadius: borderRadius.medium,
              border: `1px solid ${colors.border.light}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 500,
            }}
          >
            查看工单
          </Button>
          <Button
            className="action-btn"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => onCreateTicket(device)}
            style={{
              height: '40px',
              borderRadius: borderRadius.medium,
              background: colors.primary.gradient,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 500,
              boxShadow: shadows.small,
            }}
          >
            创建工单
          </Button>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            onClick={onClose}
            style={{
              height: '40px',
              borderRadius: borderRadius.medium,
              border: `1px solid ${colors.border.light}`,
              fontWeight: 500,
            }}
          >
            关闭
          </Button>
          <Button
            className="action-btn"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              onClose();
              onEdit(device);
            }}
            style={{
              height: '40px',
              borderRadius: borderRadius.medium,
              background: colors.primary.gradient,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 500,
              boxShadow: shadows.small,
            }}
          >
            编辑设备
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default React.memo(DeviceDetailModal);
