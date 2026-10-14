/**
 * 网段创建 / 编辑弹窗
 * - 头部图标胶囊 + 渐变背景
 * - 分区卡片布局（基础信息 / CIDR 实时预览 / 网络配置 / 用途描述）
 * - IPv4 / IPv6 双协议支持，CIDR 实时解析预览
 * - 自动生成 IP 提示
 */
import React, { useState, useEffect } from 'react';
import {
  Modal, Form, Input, Select, Tag, Space, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, ApiOutlined, ClusterOutlined,
  GlobalOutlined, PushpinOutlined,
} from '@ant-design/icons';
import useSWR from 'swr';
import api from '../../api';
import { ipamAPI } from '../../api/ipam';
import { designTokens } from '../../config/theme';

const fetcher = (url) => api.get(url).then((res) => res);

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
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

/** CIDR 预览信息项 */
const previewItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const previewItemLabelStyle = {
  fontSize: 11,
  color: designTokens.colors.neutral[500],
};

const previewItemValueStyle = {
  fontFamily: '"SF Mono", Consolas, "Courier New", monospace',
  fontWeight: 600,
  fontSize: 13,
  color: designTokens.colors.text.primary,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export default function SubnetFormModal({
  open,
  subnet,
  parentSubnetId,
  onCancel,
  onSubmit,
  submitting = false,
}) {
  const [form] = Form.useForm();
  /** CIDR 解析预览结果 */
  const [preview, setPreview] = useState(null);

  const { data: subnets } = useSWR('/ipam/subnets', fetcher);
  const flatSubnets = flattenTree(subnets?.data || []);

  /** 打开弹窗时初始化表单 */
  useEffect(() => {
    if (open) {
      if (subnet) {
        form.resetFields();
        form.setFieldsValue({
          name: subnet.name,
          cidr: subnet.cidr,
          gateway: subnet.gateway || '',
          vlanId: subnet.vlanId || '',
          dns: subnet.dns?.join(', ') || '',
          parentId: subnet.parentId || null,
          purpose: subnet.purpose || undefined,
          description: subnet.description || '',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          parentId: parentSubnetId || null,
          purpose: undefined,
          dns: '',
        });
      }
      setPreview(null);
    }
  }, [open, subnet, parentSubnetId, form]);

  /** CIDR 输入变化时实时预览 */
  const handleCidrChange = async (e) => {
    const cidr = e.target.value;
    if (!cidr || !cidr.includes('/')) {
      setPreview(null);
      return;
    }
    try {
      const res = await ipamAPI.parseCidr(cidr);
      if (res.success) {
        setPreview(res.data);
      } else {
        setPreview({ error: res.message });
      }
    } catch (err) {
      setPreview({ error: err.message });
    }
  };

  /** 提交表单 */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const dns = values.dns ? values.dns.split(/[,，\s]+/).filter(Boolean) : [];
      const parsed = await ipamAPI.parseCidr(values.cidr);
      if (!parsed.success) {
        return;
      }
      const data = {
        name: values.name,
        cidr: values.cidr,
        gateway: values.gateway || null,
        vlanId: values.vlanId || null,
        dns,
        parentId: values.parentId || null,
        description: values.description || null,
      };
      await onSubmit(data);
    } catch (e) {
      // 表单校验错误由 antd 自动提示
    }
  };

  /**
   * 安全展示主机数
   * - IPv6 超大数：用 2^(128-prefixLength) 简化
   * - IPv4 常规数：千分位
   */
  const formatHosts = (preview, field) => {
    if (!preview || preview.error) return '-';
    const rawStr = preview[field + 'Str'] || String(preview[field] || '');
    const n = Number(rawStr);

    // IPv6：简化为 2^N
    if (preview.ipVersion === 'ipv6' && preview.prefixLength !== undefined) {
      if (!isNaN(n) && n > 1e15) return `2^${128 - preview.prefixLength}`;
    }
    // IPv4 常规数：千分位
    if (!isNaN(n) && n > 0 && n <= Number.MAX_SAFE_INTEGER) {
      return n.toLocaleString();
    }
    // 兜底：科学计数法
    if (!isNaN(n) && n > 1e15) {
      const exp = Math.floor(Math.log10(n));
      return `${(n / Math.pow(10, exp)).toFixed(2)}e${exp}`;
    }
    return rawStr;
  };

  /** 是否自动生成 IP */
  const shouldAutoGen = preview && !preview.error && (
    preview.ipVersion === 'ipv6'
      ? preview.prefixLength >= 120
      : preview.prefixLength >= 16
  );

  const isEditing = !!subnet;
  const modalTitle = isEditing ? '编辑网段' : '新增网段';
  const TitleIcon = isEditing ? EditOutlined : PlusOutlined;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={headerIconStyle}>
            <TitleIcon />
          </div>
          <span style={{ fontSize: 17, fontWeight: 600, color: designTokens.colors.text.primary }}>
            {modalTitle}
          </span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText={isEditing ? '保存修改' : '创建网段'}
      cancelText="取消"
      width={720}
      destroyOnClose
      styles={{ body: { padding: '20px 24px' } }}
    >
      <Form form={form} layout="vertical">
        {/* ===== 基础信息 ===== */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <ApiOutlined style={{ color: designTokens.colors.primary.main }} />
            基础信息
          </div>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                label="网段名称"
                name="name"
                rules={[{ required: true, message: '请输入网段名称' }]}
              >
                <Input placeholder="如：北京机房-服务器区" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="父网段" name="parentId">
                <Select
                  allowClear
                  placeholder="顶级网段"
                  options={flatSubnets
                    .filter((s) => !subnet || s.subnetId !== subnet.subnetId)
                    .map((s) => ({
                      value: s.subnetId,
                      label: `${s.displayName} (${s.cidr})`,
                    }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* ===== CIDR 网段地址 ===== */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <GlobalOutlined style={{ color: designTokens.colors.purple.main }} />
            CIDR 网段地址
          </div>
          <Form.Item
            label="CIDR 表示法"
            name="cidr"
            rules={[
              { required: true, message: '请输入 CIDR' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  if (!value.includes('/')) return Promise.reject(new Error('CIDR 必须包含 /prefix'));
                  const [addr, prefix] = value.split('/');
                  if (!addr || !prefix) return Promise.reject(new Error('CIDR 格式错误'));
                  const p = parseInt(prefix, 10);
                  if (addr.includes(':')) {
                    if (isNaN(p) || p < 0 || p > 128)
                      return Promise.reject(new Error('IPv6 前缀长度必须在 0~128 之间'));
                  } else {
                    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(addr))
                      return Promise.reject(new Error('IPv4 地址格式错误'));
                    if (isNaN(p) || p < 8 || p > 32)
                      return Promise.reject(new Error('IPv4 前缀长度必须在 8~32 之间'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              placeholder="IPv4: 192.168.1.0/24  |  IPv6: 2001:db8::/32"
              onChange={handleCidrChange}
            />
          </Form.Item>

          {/* CIDR 实时预览 */}
          {preview && (
            <div
              style={{
                marginTop: 4,
                padding: '12px 16px',
                borderRadius: designTokens.borderRadius.small,
                border: `1px solid ${preview.error ? '#ffccc7' : designTokens.colors.neutral[200]}`,
                background: preview.error ? designTokens.colors.error.bg : '#fff',
              }}
            >
              {preview.error ? (
                <div style={{ color: designTokens.colors.error.main, fontSize: 13 }}>
                  CIDR 无效：{preview.error}
                </div>
              ) : (
                <>
                  {/* 顶部标签行 */}
                  <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag
                      color={preview.ipVersion === 'ipv6' ? 'purple' : 'blue'}
                      style={{ margin: 0, fontWeight: 500 }}
                    >
                      {preview.ipVersion === 'ipv6' ? 'IPv6' : 'IPv4'}
                    </Tag>
                    <Tag color="default" style={{ margin: 0 }}>
                      前缀 /{preview.prefixLength}
                    </Tag>
                    {/* 自动生成提示 */}
                    <Tag
                      color={shouldAutoGen ? 'green' : 'orange'}
                      style={{ margin: 0, marginLeft: 'auto' }}
                    >
                      {shouldAutoGen
                        ? '✓ 创建时自动生成全部 IP'
                        : '网段较大，不预生成 IP'}
                    </Tag>
                  </div>

                  {/* 三列信息 */}
                  <Row gutter={[16, 10]}>
                    <Col span={8}>
                      <div style={previewItemStyle}>
                        <span style={previewItemLabelStyle}>网络地址</span>
                        <span style={previewItemValueStyle} title={preview.networkAddress}>
                          {preview.networkAddress}
                        </span>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={previewItemStyle}>
                        <span style={previewItemLabelStyle}>结束地址</span>
                        <span style={previewItemValueStyle} title={preview.broadcastAddress}>
                          {preview.broadcastAddress}
                        </span>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={previewItemStyle}>
                        <span style={previewItemLabelStyle}>
                          {preview.ipVersion === 'ipv6' ? '地址空间' : '子网掩码'}
                        </span>
                        <span style={previewItemValueStyle} title={preview.netmask}>
                          {preview.netmask || 'N/A'}
                        </span>
                      </div>
                    </Col>
                  </Row>

                  {/* 主机数 */}
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${designTokens.colors.neutral[200]}` }}>
                    <Space size={[12, 8]} wrap>
                      <span style={{ fontSize: 12, color: designTokens.colors.neutral[500] }}>
                        可用主机数：
                        <span style={{ fontWeight: 600, color: designTokens.colors.success.main, fontSize: 14 }}>
                          {formatHosts(preview, 'usableHosts')}
                        </span>
                      </span>
                      <span style={{ fontSize: 12, color: designTokens.colors.neutral[500] }}>
                        总地址数：
                        <span style={{ fontWeight: 600, color: designTokens.colors.primary.main, fontSize: 14 }}>
                          {formatHosts(preview, 'totalHosts')}
                        </span>
                      </span>
                    </Space>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ===== 网络配置 ===== */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <ClusterOutlined style={{ color: designTokens.colors.info.main }} />
            网络配置（可选）
          </div>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="网关地址" name="gateway">
                <Input placeholder="如：192.168.1.1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="VLAN ID" name="vlanId">
                <Input placeholder="如：100" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="DNS 服务器"
                name="dns"
                tooltip="多个 DNS 用逗号或空格分隔"
              >
                <Input placeholder="8.8.8.8, 114.114.114.114" />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* ===== 用途与描述 ===== */}
        <div style={{ ...cardStyle, marginBottom: 0 }}>
          <div style={cardTitleStyle}>
            <PushpinOutlined style={{ color: designTokens.colors.warning.main }} />
            用途与描述
          </div>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="网段用途"
                name="purpose"
                tooltip="标记该网段默认用途，网段内 IP 绑定时自动推荐对应的业务类型"
              >
                <Select
                  allowClear
                  placeholder="请选择（可选）"
                  options={[
                    { value: 'management', label: '带外管理' },
                    { value: 'business', label: '带内业务' },
                    { value: 'public', label: '公网出口' },
                    { value: 'storage', label: '存储网络' },
                    { value: 'other', label: '其他' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="备注描述" name="description">
            <Input.TextArea
              rows={2}
              placeholder="可选，记录用途、负责人、变更历史等信息"
              showCount
              maxLength={200}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

/** 把嵌套网段树拍平为单层列表，供 Select 使用 */
function flattenTree(nodes, depth = 0) {
  const result = [];
  for (const n of nodes) {
    result.push({
      ...n,
      displayName: `${'　'.repeat(depth)}${n.name}`,
    });
    if (n.children?.length > 0) {
      result.push(...flattenTree(n.children, depth + 1));
    }
  }
  return result;
}
