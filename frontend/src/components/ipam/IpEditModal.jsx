/**
 * IP 地址编辑弹窗
 * - 头部大字号 IP 地址 + 状态标签
 * - 只读信息卡（IP类型、分配类型、创建时间）
 * - 绑定状态卡（已绑定设备信息 + 解绑入口）
 * - 状态快速切换（按钮组样式）
 * - 可编辑表单（业务分类 / 标签信息 / 备注）
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  Modal, Form, Input, Select, Tag, Row, Col, Tooltip, Button, Switch, Space, message,
} from 'antd';
import {
  EditOutlined, CopyOutlined, CloudServerOutlined, ExperimentOutlined,
  GlobalOutlined, StopOutlined, LinkOutlined, DisconnectOutlined,
  StarOutlined, SwapOutlined,
} from '@ant-design/icons';
import { designTokens } from '../../config/theme';

/** 状态配置：标签文案 + 颜色 + 图标 */
const STATUS_CONFIG = {
  free:     { label: '空闲', tagColor: 'default', bg: '#f5f5f5', dotColor: '#bfbfbf', icon: <SwapOutlined /> },
  used:     { label: '已用', tagColor: 'blue',    bg: '#e6f4ff', dotColor: '#1677ff', icon: <CloudServerOutlined /> },
  reserved: { label: '预留', tagColor: 'orange',  bg: '#fff7e6', dotColor: '#fa8c16', icon: <ExperimentOutlined /> },
  gateway:  { label: '网关', tagColor: 'green',   bg: '#f6ffed', dotColor: '#52c41a', icon: <GlobalOutlined /> },
  excluded: { label: '排除', tagColor: 'default', bg: '#f5f5f5', dotColor: '#595959', icon: <StopOutlined /> },
};

/** IP 业务类型配置（与后端枚举同步） */
const IP_TYPE_CONFIG = {
  management: { label: '带外管理', tagColor: 'red' },
  business:   { label: '带内业务', tagColor: 'blue' },
  public:     { label: '公网出口', tagColor: 'green' },
  storage:    { label: '存储网络', tagColor: 'purple' },
  other:      { label: '其他',     tagColor: 'default' },
};

const IP_TYPE_OPTIONS = Object.entries(IP_TYPE_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

/** 网关 / 排除状态不允许绑定设备 */
const UNBINDABLE_STATUS = ['gateway', 'excluded'];

/** 头部图标胶囊样式 */
const headerIconStyle = {
  width: 36,
  height: 36,
  borderRadius: designTokens.borderRadius.medium,
  background: designTokens.colors.primary.gradient,
  color: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  boxShadow: designTokens.shadows.medium,
  flexShrink: 0,
};

/** 卡片容器样式 */
const cardStyle = {
  background: '#fafbfc',
  border: `1px solid ${designTokens.colors.neutral[200]}`,
  borderRadius: designTokens.borderRadius.medium,
  padding: '14px 16px',
  marginBottom: 16,
};

/** 卡片标题样式 */
const cardTitleStyle = {
  fontSize: 12,
  color: designTokens.colors.neutral[500],
  marginBottom: 12,
  fontWeight: 500,
  letterSpacing: 0.5,
};

export default function IpEditModal({ open, ip, onCancel, onSubmit, onUnbind, onBind }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  /** 当前选中状态（用于状态按钮高亮） */
  const [currentStatus, setCurrentStatus] = useState(null);

  /** 打开弹窗时初始化表单 */
  useEffect(() => {
    if (open && ip) {
      form.resetFields();
      form.setFieldsValue({
        status: ip.status,
        label: ip.label || '',
        description: ip.description || '',
        assignmentType: ip.assignmentType || 'static',
        ipType: ip.ipType || 'business',
        customTag: ip.customTag || '',
        isPrimaryForDevice: !!ip.isPrimaryForDevice,
      });
      setCurrentStatus(ip.status);
    }
  }, [open, ip, form]);

  /** 一键切换状态 */
  const handleQuickStatus = (status) => {
    form.setFieldsValue({ status });
    setCurrentStatus(status);
  };

  /** 提交表单 */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onSubmit(values);
    } catch (e) {
      // 表单校验错误，由 antd 自动处理
    } finally {
      setSubmitting(false);
    }
  };

  /** 复制 IP 到剪贴板 */
  const handleCopy = () => {
    navigator.clipboard?.writeText(ip.ipAddress).then(
      () => message.success('已复制 IP 地址'),
      () => message.warning('复制失败，请手动选择复制')
    );
  };

  if (!ip) return null;

  const statusKey = currentStatus || ip.status;
  const statusCfg = STATUS_CONFIG[statusKey];
  const isBound = !!ip.deviceId;
  const canBind = !UNBINDABLE_STATUS.includes(ip.status);

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={headerIconStyle}>
            <EditOutlined />
          </div>
          <span style={{ fontSize: 17, fontWeight: 600, color: designTokens.colors.text.primary }}>
            编辑 IP 地址
          </span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="保存修改"
      cancelText="取消"
      confirmLoading={submitting}
      width={640}
      destroyOnClose
      styles={{ body: { padding: '20px 24px' } }}
    >
      {/* ===== 头部 IP 地址区 ===== */}
      <div
        style={{
          ...cardStyle,
          padding: '16px 20px',
          background: `linear-gradient(135deg, ${designTokens.colors.primary.bg} 0%, #f8fafc 100%)`,
          borderColor: designTokens.colors.neutral[200],
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Tooltip title={ip.ipAddress} mouseEnterDelay={0.3}>
            <div
              style={{
                fontFamily: '"SF Mono", Consolas, "Courier New", monospace',
                fontSize: 22,
                fontWeight: 700,
                color: designTokens.colors.text.primary,
                letterSpacing: 0.5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {ip.ipAddress}
              <span
                onClick={handleCopy}
                title="复制"
                style={{
                  fontSize: 14,
                  color: designTokens.colors.neutral[400],
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = designTokens.colors.primary.main;
                  e.currentTarget.style.background = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = designTokens.colors.neutral[400];
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <CopyOutlined />
              </span>
            </div>
          </Tooltip>
          <Space size={6}>
            <Tag
              color={statusCfg.tagColor}
              style={{
                margin: 0,
                fontWeight: 500,
                padding: '4px 12px',
                fontSize: 13,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: statusCfg.dotColor,
                  marginRight: 6,
                  verticalAlign: 'middle',
                }}
              />
              {statusCfg.label}
            </Tag>
            {ip.ipType && (
              <Tag color={IP_TYPE_CONFIG[ip.ipType]?.tagColor || 'default'} style={{ margin: 0 }}>
                {IP_TYPE_CONFIG[ip.ipType]?.label || ip.ipType}
              </Tag>
            )}
          </Space>
        </div>
      </div>

      {/* ===== 只读信息区 ===== */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>基本信息</div>
        <Row gutter={[24, 12]}>
          <Col span={8}>
            <div style={{ fontSize: 12, color: designTokens.colors.neutral[500], marginBottom: 4 }}>IP 业务类型</div>
            <div style={{ fontSize: 14, color: designTokens.colors.text.primary }}>
              {IP_TYPE_CONFIG[ip.ipType]?.label || ip.ipType || '带内业务'}
            </div>
          </Col>
          <Col span={8}>
            <div style={{ fontSize: 12, color: designTokens.colors.neutral[500], marginBottom: 4 }}>分配类型</div>
            <div style={{ fontSize: 14, color: designTokens.colors.text.primary }}>
              {ip.assignmentType === 'dhcp' ? (
                <Tag color="purple" style={{ margin: 0 }}>DHCP 动态</Tag>
              ) : (
                <span>静态分配</span>
              )}
            </div>
          </Col>
          <Col span={8}>
            <div style={{ fontSize: 12, color: designTokens.colors.neutral[500], marginBottom: 4 }}>创建时间</div>
            <div style={{ fontSize: 14, color: designTokens.colors.text.primary }}>
              {ip.createdAt ? new Date(ip.createdAt).toLocaleString('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit',
              }) : '-'}
            </div>
          </Col>
        </Row>
      </div>

      {/* ===== 绑定状态区 ===== */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>设备绑定</div>
        {isBound ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '10px 14px',
            background: designTokens.colors.info.bg,
            borderRadius: designTokens.borderRadius.small,
            border: `1px solid #bfdbfe`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: designTokens.colors.info.main,
                color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }}>
                <LinkOutlined />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: designTokens.colors.text.primary, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {ip.deviceName || `设备 #${ip.deviceId}`}
                  {ip.isPrimaryForDevice && (
                    <Tooltip title="设备主 IP">
                      <StarOutlined style={{ color: '#faad14', fontSize: 14 }} />
                    </Tooltip>
                  )}
                </div>
                <div style={{ fontSize: 12, color: designTokens.colors.neutral[500] }}>
                  设备 ID: {ip.deviceId}
                </div>
              </div>
            </div>
            <Button
              size="small"
              danger
              icon={<DisconnectOutlined />}
              onClick={() => onUnbind && onUnbind(ip)}
            >
              解绑
            </Button>
          </div>
        ) : canBind ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '10px 14px',
            background: designTokens.colors.warning.bg,
            borderRadius: designTokens.borderRadius.small,
            border: `1px solid #fed7aa`,
          }}>
            <div style={{ fontSize: 14, color: designTokens.colors.text.primary }}>
              该 IP 未绑定任何设备
            </div>
            <Button
              size="small"
              type="link"
              icon={<LinkOutlined />}
              onClick={() => onBind && onBind(ip)}
            >
              立即绑定 →
            </Button>
          </div>
        ) : (
          <div style={{
            padding: '10px 14px',
            background: designTokens.colors.neutral[100],
            borderRadius: designTokens.borderRadius.small,
            border: `1px dashed ${designTokens.colors.neutral[300]}`,
            fontSize: 13,
            color: designTokens.colors.neutral[500],
          }}>
            {statusCfg.label} 状态的 IP 不参与设备绑定
          </div>
        )}
      </div>

      {/* ===== 状态快速切换 ===== */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>快速切换状态</div>
        <Space wrap size={[8, 8]}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const selected = currentStatus === key;
            return (
              <div
                key={key}
                onClick={() => handleQuickStatus(key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 16px',
                  borderRadius: designTokens.borderRadius.small,
                  fontSize: 13,
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease',
                  background: selected ? cfg.bg : '#fff',
                  border: selected
                    ? `1.5px solid ${cfg.dotColor}`
                    : `1px solid ${designTokens.colors.neutral[200]}`,
                  color: selected ? designTokens.colors.text.primary : designTokens.colors.neutral[600],
                  fontWeight: selected ? 600 : 400,
                  boxShadow: selected ? designTokens.shadows.small : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!selected) {
                    e.currentTarget.style.borderColor = designTokens.colors.neutral[400];
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selected) {
                    e.currentTarget.style.borderColor = designTokens.colors.neutral[200];
                  }
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: cfg.dotColor,
                  }}
                />
                {cfg.label}
              </div>
            );
          })}
        </Space>
      </div>

      {/* ===== 编辑表单 ===== */}
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 4 }}
      >
        {/* 隐藏字段：状态值由快速按钮通过 setFieldsValue 写入 */}
        <Form.Item name="status" hidden rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        {/* 业务分类行 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="IP 业务类型" name="ipType">
              <Select options={IP_TYPE_OPTIONS} placeholder="选择 IP 业务类型" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="分配类型" name="assignmentType">
              <Select
                placeholder="选择分配类型"
                options={[
                  { value: 'static', label: '静态分配' },
                  { value: 'dhcp', label: 'DHCP 动态分配' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 标签信息行 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="IP 别名" name="label">
              <Input placeholder="如：web-server-01、printer" allowClear />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="分组标签" name="customTag">
              <Input placeholder="如：主备、VIP、cluster" allowClear />
            </Form.Item>
          </Col>
        </Row>

        {/* 主 IP 开关行 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="是否为设备主 IP" name="isPrimaryForDevice" valuePropName="checked">
              <Switch checkedChildren="主 IP" unCheckedChildren="普通 IP" />
            </Form.Item>
          </Col>
        </Row>

        {/* 备注 */}
        <Form.Item label="备注" name="description">
          <Input.TextArea
            rows={2}
            placeholder="可选，记录用途、负责人、变更历史等信息"
            showCount
            maxLength={200}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
