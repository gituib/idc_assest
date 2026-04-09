import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Timeline,
  Tag,
  Space,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Empty,
  Tooltip,
  Badge,
} from 'antd';
import {
  ClockCircleOutlined,
  InboxOutlined,
  ExportOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SwapOutlined,
  UploadOutlined,
  UserOutlined,
  EnvironmentOutlined,
  BarcodeOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import CloseButton from './CloseButton';
import { designTokens } from '../config/theme';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

const getOperationConfig = type => {
  const config = {
    in: {
      color: designTokens.colors.success.main,
      bg: designTokens.colors.success.bg,
      icon: <InboxOutlined />,
      label: '入库',
      prefix: '+',
    },
    out: {
      color: designTokens.colors.error.main,
      bg: designTokens.colors.error.bg,
      icon: <ExportOutlined />,
      label: '出库',
      prefix: '',
    },
    create: {
      color: designTokens.colors.primary.main,
      bg: designTokens.colors.primary.bg,
      icon: <PlusOutlined />,
      label: '创建',
      prefix: '',
    },
    update: {
      color: designTokens.colors.warning.main,
      bg: designTokens.colors.warning.bg,
      icon: <EditOutlined />,
      label: '更新',
      prefix: '',
    },
    delete: {
      color: designTokens.colors.error.main,
      bg: designTokens.colors.error.bg,
      icon: <DeleteOutlined />,
      label: '删除',
      prefix: '',
    },
    adjust: {
      color: designTokens.colors.purple.main,
      bg: '#f5f3ff',
      icon: <SwapOutlined />,
      label: '调整',
      prefix: '',
    },
    import: {
      color: designTokens.colors.info.main,
      bg: designTokens.colors.info.bg,
      icon: <UploadOutlined />,
      label: '导入',
      prefix: '',
    },
  };
  return config[type] || {
    color: designTokens.colors.neutral[500],
    bg: designTokens.colors.neutral[100],
    icon: <ClockCircleOutlined />,
    label: type,
    prefix: '',
  };
};

const TimelineItem = ({ log, isFirst, isLast }) => {
  const config = getOperationConfig(log.operationType);
  const isPositive = log.quantity > 0;

  return (
    <Card
      size="small"
      style={{
        borderRadius: designTokens.borderRadius.md,
        borderLeft: `3px solid ${config.color}`,
        background: '#fff',
        boxShadow: designTokens.shadows.sm,
        marginBottom: isLast ? 0 : '12px',
        transition: 'all 0.2s ease',
      }}
      bodyStyle={{ padding: '12px 16px' }}
    >
      <Row gutter={[12, 8]} align="middle">
        <Col span={24}>
          <Space size="small" wrap>
            <Tag
              color={config.color}
              style={{
                borderRadius: '6px',
                padding: '2px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {config.icon} {config.label}
            </Tag>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Text>
            <Tooltip title={dayjs(log.createdAt).fromNow()}>
              <Text type="secondary" style={{ fontSize: '11px', cursor: 'help' }}>
                ({dayjs(log.createdAt).fromNow()})
              </Text>
            </Tooltip>
          </Space>
        </Col>
      </Row>

      <Row gutter={[12, 8]} style={{ marginTop: '8px' }}>
        <Col xs={24} sm={12} md={8}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              background: config.bg,
              borderRadius: '8px',
            }}
          >
            <Text type="secondary" style={{ fontSize: '12px' }}>
              变动数量
            </Text>
            <Text
              strong
              style={{
                color: isPositive ? designTokens.colors.success.main : designTokens.colors.error.main,
                fontSize: '14px',
              }}
            >
              {config.prefix}
              {log.quantity}
            </Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div style={{ padding: '6px 10px' }}>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
              库存变化
            </Text>
            <Space size="small">
              <Text style={{ fontSize: '13px' }}>{log.previousStock}</Text>
              <Text type="secondary">→</Text>
              <Text strong style={{ fontSize: '13px' }}>
                {log.currentStock}
              </Text>
            </Space>
          </div>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div style={{ padding: '6px 10px' }}>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
              操作人
            </Text>
            <Space size="small">
              <UserOutlined style={{ color: designTokens.colors.neutral[400] }} />
              <Text style={{ fontSize: '13px' }}>{log.operator || '系统'}</Text>
            </Space>
          </div>
        </Col>
      </Row>

      {(log.reason || log.notes) && (
        <div style={{ marginTop: '8px', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px' }}>
          {log.reason && (
            <div style={{ marginBottom: log.notes ? '4px' : 0 }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                原因：
              </Text>
              <Text style={{ fontSize: '12px', marginLeft: '4px' }}>{log.reason}</Text>
            </div>
          )}
          {log.notes && (
            <div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                备注：
              </Text>
              <Text style={{ fontSize: '12px', marginLeft: '4px' }}>{log.notes}</Text>
            </div>
          )}
        </div>
      )}

      {log.snList && log.snList.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
            <BarcodeOutlined style={{ marginRight: '4px' }} />
            SN序列号 ({log.snList.length}个)
          </Text>
          <Space size="small" wrap>
            {log.snList.slice(0, 5).map((sn, idx) => (
              <Tag key={idx} color="purple" style={{ fontSize: '11px', borderRadius: '4px' }}>
                {sn}
              </Tag>
            ))}
            {log.snList.length > 5 && (
              <Tag style={{ fontSize: '11px', borderRadius: '4px' }}>...</Tag>
            )}
          </Space>
        </div>
      )}
    </Card>
  );
};

const ConsumableTimelineModal = ({ visible, consumable, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [stats, setStats] = useState({ totalIn: 0, totalOut: 0, netChange: 0 });

  const fetchLogs = useCallback(async (page = 1) => {
    if (!consumable?.consumableId) return;

    setLoading(true);
    try {
      const response = await axios.get('/api/consumables/logs', {
        params: {
          consumableId: consumable.consumableId,
          page,
          pageSize: pagination.pageSize,
        },
      });

      const fetchedLogs = (response.data.logs || []).filter(
        log => log.operationType !== 'update'
      );
      setLogs(page === 1 ? fetchedLogs : [...logs, ...fetchedLogs]);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: response.data.total - (response.data.logs || []).filter(log => log.operationType === 'update').length,
      }));

      const totalIn = fetchedLogs
        .filter(log => log.operationType === 'in')
        .reduce((sum, log) => sum + Math.abs(log.quantity), 0);
      const totalOut = fetchedLogs
        .filter(log => log.operationType === 'out')
        .reduce((sum, log) => sum + Math.abs(log.quantity), 0);
      setStats({
        totalIn,
        totalOut,
        netChange: totalIn - totalOut,
      });
    } catch (error) {
      console.error('获取耗材操作记录失败:', error);
    } finally {
      setLoading(false);
    }
  }, [consumable, pagination.pageSize, logs]);

  useEffect(() => {
    if (visible && consumable?.consumableId) {
      setLogs([]);
      setPagination(prev => ({ ...prev, current: 1 }));
      fetchLogs(1);
    }
  }, [visible, consumable]);

  const handleLoadMore = () => {
    if (!loading && logs.length < pagination.total) {
      fetchLogs(pagination.current + 1);
    }
  };

  if (!consumable) return null;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      closeIcon={<CloseButton />}
      footer={null}
      width={900}
      title={
        <Space>
          <ClockCircleOutlined style={{ color: designTokens.colors.primary.main }} />
          <span>耗材操作记录</span>
          <Tag color="blue" style={{ borderRadius: '6px' }}>
            {consumable.name}
          </Tag>
          <Text type="secondary" style={{ fontSize: '12px', fontWeight: 'normal' }}>
            ({consumable.consumableId})
          </Text>
        </Space>
      }
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '16px 24px' }}
    >
      <Card
        size="small"
        style={{
          marginBottom: '16px',
          borderRadius: designTokens.borderRadius.md,
          background: `linear-gradient(135deg, ${designTokens.colors.primary.bg} 0%, #fff 100%)`,
          border: `1px solid ${designTokens.colors.primary.light}20`,
        }}
        bodyStyle={{ padding: '16px' }}
      >
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Statistic
              title={
                <Space size="small">
                  <InboxOutlined style={{ color: designTokens.colors.success.main }} />
                  <span>总入库</span>
                </Space>
              }
              value={stats.totalIn}
              valueStyle={{ color: designTokens.colors.success.main, fontSize: '24px' }}
              suffix={consumable.unit || '个'}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={
                <Space size="small">
                  <ExportOutlined style={{ color: designTokens.colors.error.main }} />
                  <span>总出库</span>
                </Space>
              }
              value={stats.totalOut}
              valueStyle={{ color: designTokens.colors.error.main, fontSize: '24px' }}
              suffix={consumable.unit || '个'}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={
                <Space size="small">
                  <SwapOutlined style={{ color: designTokens.colors.purple.main }} />
                  <span>净变化</span>
                </Space>
              }
              value={stats.netChange}
              valueStyle={{
                color: stats.netChange >= 0 ? designTokens.colors.success.main : designTokens.colors.error.main,
                fontSize: '24px',
              }}
              prefix={stats.netChange >= 0 ? '+' : ''}
              suffix={consumable.unit || '个'}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={
                <Space size="small">
                  <ClockCircleOutlined style={{ color: designTokens.colors.info.main }} />
                  <span>当前库存</span>
                </Space>
              }
              value={consumable.currentStock || 0}
              valueStyle={{ color: designTokens.colors.info.main, fontSize: '24px' }}
              suffix={consumable.unit || '个'}
            />
          </Col>
        </Row>
      </Card>

      <div
        style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: designTokens.colors.neutral[50],
          borderRadius: designTokens.borderRadius.md,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          <Badge status="processing" />
          <Text type="secondary">
            共 {pagination.total} 条操作记录
          </Text>
        </Space>
        <Space>
          <Tag color="green" style={{ borderRadius: '4px' }}>入库</Tag>
          <Tag color="red" style={{ borderRadius: '4px' }}>出库</Tag>
          <Tag color="blue" style={{ borderRadius: '4px' }}>创建</Tag>
          <Tag color="purple" style={{ borderRadius: '4px' }}>调整</Tag>
        </Space>
      </div>

      {loading && logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <Text type="secondary" style={{ display: 'block', marginTop: '16px' }}>
            加载中...
          </Text>
        </div>
      ) : logs.length === 0 ? (
        <Empty
          description={
            <Text type="secondary">
              暂无操作记录
            </Text>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '40px' }}
        />
      ) : (
        <>
          <Timeline
            mode="left"
            items={logs.map((log, index) => ({
              key: log.id || index,
              color: getOperationConfig(log.operationType).color,
              dot: (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: getOperationConfig(log.operationType).bg,
                    border: `2px solid ${getOperationConfig(log.operationType).color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getOperationConfig(log.operationType).color,
                  }}
                >
                  {getOperationConfig(log.operationType).icon}
                </div>
              ),
              children: (
                <TimelineItem
                  log={log}
                  isFirst={index === 0}
                  isLast={index === logs.length - 1}
                />
              ),
            }))}
          />

          {logs.length < pagination.total && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Tag
                onClick={handleLoadMore}
                style={{
                  cursor: loading ? 'not-allowed' : 'pointer',
                  padding: '8px 24px',
                  borderRadius: '20px',
                  background: loading ? designTokens.colors.neutral[100] : designTokens.colors.primary.bg,
                  color: loading ? designTokens.colors.neutral[400] : designTokens.colors.primary.main,
                  border: `1px solid ${loading ? designTokens.colors.neutral[200] : designTokens.colors.primary.light}`,
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? '加载中...' : `加载更多 (${logs.length}/${pagination.total})`}
              </Tag>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default ConsumableTimelineModal;
