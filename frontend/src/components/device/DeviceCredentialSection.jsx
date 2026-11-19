/**
 * 设备凭据管理面板（嵌入设备详情弹窗的「网络凭据」tab）
 * 负责：列出、新增、编辑、删除、测试指定设备的采集凭据
 * 协议按设备类型区分：服务器（server）→ Redfish/SSH/SNMP；网络设备 → SSH/SNMP/Telnet
 * UI：卡片流列表 + 分区式弹窗表单（协议卡片选择器）
 */
import { useState, useEffect } from 'react';
import { Button, Tag, Space, Modal, Form, Input, Select, Switch, Popconfirm, message, Spin, Tooltip } from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined,
  CloudServerOutlined, LinkOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ReloadOutlined, KeyOutlined, QuestionCircleOutlined, UserOutlined, CrownOutlined,
  DesktopOutlined, HddOutlined,
} from '@ant-design/icons';
import { deviceCredentialAPI } from '../../api';
import { designTokens } from '../../config/theme';
import ServerDiscoveryModal from '../ServerDiscoveryModal';

const { colors } = designTokens;

const MONO_FONT = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

/** 协议元信息（图标 / 主题色 / 描述） */
const PROTOCOL_META = {
  redfish: { label: 'Redfish', icon: <HddOutlined />, color: '#0ea5e9', bg: '#f0f9ff', desc: 'BMC 带外采集硬件清单与网卡，服务器关机可采', supported: true },
  ssh: { label: 'SSH', icon: <CloudServerOutlined />, color: '#3b82f6', bg: '#eff6ff', desc: '命令行采集，仅执行只读命令', supported: true },
  snmp: { label: 'SNMP', icon: <ThunderboltOutlined />, color: '#8b5cf6', bg: '#f5f3ff', desc: '读取 IF-MIB 标准端口表，厂商通用', supported: true },
  telnet: { label: 'Telnet', icon: <DesktopOutlined />, color: '#10b981', bg: '#ecfdf5', desc: '明文终端方式采集设备信息', supported: true },
};

/** 各设备类型的可用协议与默认协议 */
const PROTOCOLS_BY_DEVICE_TYPE = {
  server: ['redfish', 'ssh', 'snmp'],
  switch: ['ssh', 'snmp', 'telnet'],
  router: ['ssh', 'snmp', 'telnet'],
  storage: ['ssh', 'snmp'],
  other: ['ssh', 'snmp', 'telnet'],
};
const DEFAULT_PROTOCOL_BY_TYPE = { server: 'redfish' };
/** 各协议默认端口 */
const PROTOCOL_DEFAULT_PORT = { ssh: 22, snmp: 161, telnet: 23, redfish: 443 };

const VENDOR_OPTIONS = [
  { value: 'huawei', label: '华为' },
  { value: 'cisco', label: '思科' },
  { value: 'h3c', label: '华三' },
  { value: 'ruijie', label: '锐捷' },
  { value: 'generic', label: '通用' },
];

/** 弹窗内分区标题 */
function SectionTitle({ icon, title, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 12px' }}>
      <span style={{
        width: 26, height: 26, borderRadius: 8, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 13,
        background: colors.primary.bg, color: colors.primary.main,
      }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: colors.text.primary }}>{title}</span>
      {extra && <span style={{ marginLeft: 'auto', fontSize: 12, color: colors.text.tertiary }}>{extra}</span>}
    </div>
  );
}

/** 协议卡片选择器（受 Form.Item 控制的受控组件；仅展示传入的协议子集） */
function ProtocolSelector({ value, onChange, allowedProtocols }) {
  const entries = Object.entries(PROTOCOL_META)
    .filter(([key]) => allowedProtocols.includes(key));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${entries.length}, 1fr)`, gap: 10 }}>
      {entries.map(([key, meta]) => {
        const active = value === key;
        return (
          <div
            key={key}
            onClick={() => onChange(key)}
            style={{
              position: 'relative', cursor: 'pointer', padding: '12px 12px 10px',
              borderRadius: 10, border: `1.5px solid ${active ? colors.primary.main : colors.border.light}`,
              background: active ? colors.primary.bg : colors.background.primary,
              boxShadow: active ? '0 2px 8px rgba(99,102,241,.18)' : 'none',
              transition: 'all .2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 6, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 12,
                background: meta.bg, color: meta.color,
              }}>{meta.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: colors.text.primary }}>{meta.label}</span>
              {!meta.supported && (
                <span style={{
                  position: 'absolute', top: 8, right: 8, fontSize: 10, lineHeight: '16px',
                  padding: '0 5px', borderRadius: 4, background: colors.neutral[100],
                  color: colors.text.tertiary,
                }}>规划中</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: colors.text.secondary, lineHeight: 1.5, minHeight: 32 }}>{meta.desc}</div>
            <span style={{
              position: 'absolute', top: -7, right: -7, width: 14, height: 14, borderRadius: '50%',
              background: colors.primary.main, display: active ? 'block' : 'none',
              boxShadow: '0 0 0 2.5px #fff',
            }} />
          </div>
        );
      })}
    </div>
  );
}

/** 凭据卡片（列表单条） */
function CredentialCard({ cred, testing, onTest, onEdit, onDelete }) {
  const meta = PROTOCOL_META[cred.protocol] || PROTOCOL_META.ssh;
  const target = `${cred.host || '-'}:${cred.port || PROTOCOL_DEFAULT_PORT[cred.protocol] || 22}`;
  const identity = cred.protocol === 'snmp'
    ? (cred.community ? '••••••••' : '-')
    : (cred.username || '-');
  const vendor = cred.vendor ? (VENDOR_OPTIONS.find(o => o.value === cred.vendor)?.label || cred.vendor) : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
      borderRadius: 12, border: `1px solid ${colors.border.light}`,
      background: colors.background.primary, transition: 'box-shadow .2s ease, border-color .2s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,.08)'; e.currentTarget.style.borderColor = colors.border.medium; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = colors.border.light; }}
    >
      {/* 协议图标 */}
      <div style={{
        flexShrink: 0, width: 42, height: 42, borderRadius: 12,
        background: meta.bg, color: meta.color, fontSize: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {meta.icon}
      </div>

      {/* 主体信息 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: MONO_FONT, fontSize: 14, fontWeight: 600, color: colors.text.primary }}>
            {target}
          </span>
          <Tag style={{ marginInlineEnd: 0, fontSize: 11, borderRadius: 6, color: meta.color, background: meta.bg, border: 'none' }}>
            {meta.label}
          </Tag>
          {cred.isDefault && (
            <Tag color="gold" style={{ marginInlineEnd: 0, fontSize: 11, borderRadius: 6 }}>
              <CrownOutlined /> 默认
            </Tag>
          )}
          {cred.testStatus === 'success' && (
            <Tooltip title={cred.testMessage || '最近测试：成功'}>
              <Tag color="success" style={{ marginInlineEnd: 0, fontSize: 11, borderRadius: 6, border: 'none' }}>
                <CheckCircleOutlined /> 已连通
              </Tag>
            </Tooltip>
          )}
          {cred.testStatus === 'failed' && (
            <Tooltip title={cred.testMessage || '最近测试：失败'}>
              <Tag color="error" style={{ marginInlineEnd: 0, fontSize: 11, borderRadius: 6, border: 'none' }}>
                <CloseCircleOutlined /> 连接失败
              </Tag>
            </Tooltip>
          )}
          {!cred.testStatus && (
            <Tag style={{ marginInlineEnd: 0, fontSize: 11, borderRadius: 6, color: colors.text.tertiary, background: colors.neutral[100], border: 'none' }}>
              未测试
            </Tag>
          )}
        </div>
        <div style={{ marginTop: 5, fontSize: 12, color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span><UserOutlined style={{ marginRight: 4, color: colors.text.tertiary }} />{identity}</span>
          <span style={{ color: colors.neutral[300] }}>|</span>
          <span>{vendor ? `厂商：${vendor}` : '厂商：自动识别'}</span>
        </div>
      </div>

      {/* 操作区 */}
      <Space size={4} style={{ flexShrink: 0 }}>
        <Button
          type="text" size="small"
          icon={<ThunderboltOutlined />}
          loading={testing}
          onClick={() => onTest(cred)}
          style={{ color: colors.primary.main }}
        >测试</Button>
        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(cred)}>编辑</Button>
        <Popconfirm title="确定删除这条凭据？" okText="删除" cancelText="取消" onConfirm={() => onDelete(cred)}>
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    </div>
  );
}

/**
 * 凭据管理面板（卡片列表 + 新增/编辑弹窗）
 * @param {string} deviceId 当前设备 ID
 * @param {string} deviceName 设备名称（用于表单）
 * @param {string} deviceType 设备类型（server/switch/router/storage/other），决定可用协议
 */
export default function DeviceCredentialSection({ deviceId, deviceName, deviceType }) {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // 正在编辑的凭据（列表返回的掩码/元数据对象，不含明文）
  const [testingId, setTestingId] = useState(null);
  const [discoveryOpen, setDiscoveryOpen] = useState(false); // 服务器硬件清单采集弹窗
  const [form] = Form.useForm();

  /** 当前设备类型可用的协议列表与默认协议 */
  const allowedProtocols = PROTOCOLS_BY_DEVICE_TYPE[deviceType] || PROTOCOLS_BY_DEVICE_TYPE.other;
  const defaultProtocol = DEFAULT_PROTOCOL_BY_TYPE[deviceType] || 'ssh';
  const isServer = deviceType === 'server';

  /** 加载凭据列表 */
  const loadCredentials = async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const res = await deviceCredentialAPI.list({ deviceId });
      setCredentials(res.data || []);
    } catch (err) {
      message.error(err?.response?.data?.message || '加载凭据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCredentials(); }, [deviceId]);

  /** 打开新增弹窗（默认协议按设备类型：服务器 → Redfish，其余 → SSH） */
  const handleCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      protocol: defaultProtocol,
      port: PROTOCOL_DEFAULT_PORT[defaultProtocol],
      isDefault: false,
      vendor: isServer ? undefined : 'huawei',
    });
    setModalOpen(true);
  };

  /** 打开编辑弹窗：直接使用列表返回的掩码/元数据对象，不再调用 /raw 把明文口令拉进前端内存 */
  const handleEdit = (cred) => {
    setEditing(cred);
    form.setFieldsValue({
      protocol: cred.protocol,
      host: cred.host,
      port: cred.port,
      username: cred.username,
      password: '', // 保持为空——用户不输入就不改
      community: '',
      vendor: cred.vendor || undefined,
      isDefault: !!cred.isDefault,
    });
    setModalOpen(true);
  };

  /** 删除凭据 */
  const handleDelete = async (cred) => {
    try {
      const res = await deviceCredentialAPI.delete(cred.credentialId);
      if (res.success) {
        message.success('已删除');
        loadCredentials();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (err) {
      message.error(err?.response?.data?.message || '删除失败');
    }
  };

  /** 测试连通性 */
  const handleTest = async (cred) => {
    setTestingId(cred.credentialId);
    try {
      const res = await deviceCredentialAPI.test(cred.credentialId);
      if (res.success) {
        message.success(`连接成功：${res.message || '设备可达'}${res.vendor ? `（识别为 ${VENDOR_OPTIONS.find(v => v.value === res.vendor)?.label || res.vendor}）` : ''}`);
      } else {
        message.error(`连接失败：${res.message || '无法连接'}`);
      }
      loadCredentials();
    } catch (err) {
      message.error(err?.response?.data?.message || '测试请求失败');
    } finally {
      setTestingId(null);
    }
  };

  /** 提交表单（新增 / 更新） */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values, deviceId };

      let res;
      if (editing) {
        // 更新：空密码字段不传，保留原值
        if (!payload.password) delete payload.password;
        if (!payload.community) delete payload.community;
        res = await deviceCredentialAPI.update(editing.credentialId, payload);
      } else {
        res = await deviceCredentialAPI.create(payload);
      }

      if (res.success) {
        message.success(editing ? '更新成功' : '创建成功');
        setModalOpen(false);
        loadCredentials();
      } else {
        message.error(res.message || '保存失败');
      }
    } catch (err) {
      if (err?.errorFields) return; // 表单校验错误
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        JSON.stringify(err).slice(0, 200);
      message.error(`保存失败：${detail}`);
    }
  };

  const protocol = Form.useWatch('protocol', form);

  /** 切换协议时，端口自动改为对应协议默认值（避免带着上一协议的端口提交） */
  const handleProtocolChange = (changed) => {
    if (changed.protocol !== undefined) {
      form.setFieldsValue({ port: PROTOCOL_DEFAULT_PORT[changed.protocol] });
    }
  };

  return (
    <div>
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 16,
            background: colors.primary.bg, color: colors.primary.main,
          }}><KeyOutlined /></span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: colors.text.primary }}>
              {isServer ? '服务器采集凭据' : '网络采集凭据'}
            </div>
            <div style={{ color: colors.text.secondary, fontSize: 12 }}>
              {isServer
                ? '通过 BMC 管理口（Redfish）自动采集硬件清单与网卡，关机可采'
                : '用于从设备自动采集端口列表，仅执行只读命令'}
              {credentials.length > 0 && ` · 共 ${credentials.length} 条`}
            </div>
          </div>
        </div>
        <Space size="small">
          {isServer && (
            <Tooltip title="通过 BMC（Redfish）采集硬件清单与网卡端口">
              <Button icon={<HddOutlined />} onClick={() => setDiscoveryOpen(true)}>
                采集硬件清单
              </Button>
            </Tooltip>
          )}
          <Tooltip title="刷新">
            <Button icon={<ReloadOutlined />} onClick={loadCredentials} loading={loading} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增凭据
          </Button>
        </Space>
      </div>

      {/* 卡片列表 / 空状态 */}
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : credentials.length === 0 ? (
        <div style={{
          padding: '44px 24px', textAlign: 'center',
          border: `1.5px dashed ${colors.border.medium}`, borderRadius: 14,
          background: colors.background.secondary,
        }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 14px', borderRadius: 16,
            background: colors.primary.bg, color: colors.primary.main, fontSize: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><KeyOutlined /></div>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.text.primary, marginBottom: 6 }}>
            还没有采集凭据
          </div>
          <div style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 18 }}>
            {isServer
              ? `为「${deviceName || '该服务器'}」添加 Redfish 凭据（BMC 管理地址 + 账号），即可自动采集硬件清单`
              : `为「${deviceName || '该设备'}」添加 SSH 凭据后，即可自动采集端口列表`}
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新增第一条凭据</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {credentials.map(cred => (
            <CredentialCard
              key={cred.credentialId}
              cred={cred}
              testing={testingId === cred.credentialId}
              onTest={handleTest}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 安全提示条 */}
      <div style={{
        marginTop: 14, padding: '10px 14px', borderRadius: 10, fontSize: 12,
        background: colors.info?.bg || '#eff6ff', border: '1px solid #dbeafe',
        color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <QuestionCircleOutlined style={{ fontSize: 13 }} />
        <span>
          {isServer ? (
            <>
              Redfish 走 BMC 管理口（HTTPS 443）只读采集，服务器关机也可采；BMC 均为自签证书，系统会自动放行证书校验。建议为采集创建 BMC 只读账号。
            </>
          ) : (
            <>
              SSH/Telnet 采集仅执行 <code style={{ padding: '1px 5px', background: 'rgba(255,255,255,.7)', borderRadius: 4 }}>display interface brief</code> 等只读命令；SNMP 采集仅读取 IF-MIB 标准端口表。均不会对设备配置产生任何修改。注意：Telnet 为明文协议，建议仅在隔离管理网内使用。
            </>
          )}
        </span>
      </div>

      {/* 服务器硬件清单采集弹窗（Redfish，落库后刷新凭据测试状态） */}
      {isServer && (
        <ServerDiscoveryModal
          open={discoveryOpen}
          onClose={() => setDiscoveryOpen(false)}
          deviceId={deviceId}
          deviceName={deviceName}
        />
      )}

      {/* 新增 / 编辑弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              background: colors.primary.bg, color: colors.primary.main,
            }}><KeyOutlined /></span>
            <span>{editing ? '编辑采集凭据' : '新增采集凭据'}</span>
            {deviceName && (
              <span style={{ color: colors.text.secondary, fontWeight: 400, fontSize: 13 }}>
                — {deviceName}
              </span>
            )}
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editing ? '保存' : '创建'}
        cancelText="取消"
        width={620}
        maskClosable={false}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 4 }} onValuesChange={handleProtocolChange}>
          {/* 协议选择（按设备类型过滤） */}
          <Form.Item name="protocol" rules={[{ required: true, message: '请选择协议' }]}>
            <ProtocolSelector allowedProtocols={allowedProtocols} />
          </Form.Item>

          {/* 连接目标 */}
          <SectionTitle icon={<LinkOutlined />} title="连接目标" />
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item
              name="host" style={{ flex: 1, marginBottom: 12 }}
              label={protocol === 'redfish' ? 'BMC 管理地址' : '设备 IP / Hostname'}
              rules={[{ required: true, message: protocol === 'redfish' ? '请输入 BMC 管理地址' : '请输入设备 IP' }]}
            >
              <Input placeholder={protocol === 'redfish' ? '如 10.0.100.1（服务器 BMC 管理口）' : '如 10.0.1.1 或 switch01'} />
            </Form.Item>
            <Form.Item name="port" style={{ width: 110, marginBottom: 12 }} label="端口">
              <Input type="number" placeholder={String(PROTOCOL_DEFAULT_PORT[protocol] || '')} />
            </Form.Item>
          </div>

          {/* 认证信息 */}
          <SectionTitle icon={<KeyOutlined />} title="认证信息" />
          {(protocol === 'ssh' || protocol === 'telnet' || protocol === 'redfish') && (
            <>
              {protocol === 'redfish' && (
                <div style={{ marginBottom: 10, fontSize: 12, color: colors.text.secondary }}>
                  使用 BMC 管理账号（iDRAC / iLO / iBMC 登录账号），建议创建只读账号专用于采集
                </div>
              )}
              <Form.Item name="username" label={protocol === 'redfish' ? 'BMC 用户名' : '用户名'} rules={[{ required: true, message: '请输入用户名' }]}>
                <Input placeholder={protocol === 'redfish' ? '如 root / admin' : '如 admin'} prefix={<UserOutlined style={{ color: colors.text.tertiary }} />} />
              </Form.Item>
              <Form.Item
                name="password"
                label={editing ? '密码（留空保持原值）' : '密码'}
                rules={editing ? [] : [{ required: true, message: '请输入密码' }]}
              >
                <Input.Password placeholder="输入登录密码" />
              </Form.Item>
            </>
          )}
          {protocol === 'snmp' && (
            <Form.Item
              name="community"
              label={editing ? 'Community（留空保持原值）' : 'Community'}
              extra="当前仅支持 SNMPv2c 团体字认证；端口默认 161，采集只读 IF-MIB 标准端口表"
              rules={editing ? [] : [{ required: true, message: '请输入 community' }]}
            >
              <Input.Password placeholder="如 public / private" />
            </Form.Item>
          )}

          {/* 采集选项 */}
          <SectionTitle icon={<ThunderboltOutlined />} title="采集选项" />
          <div style={{ display: 'flex', gap: 12 }}>
            {protocol !== 'redfish' && (
              <Form.Item name="vendor" style={{ flex: 1, marginBottom: 12 }} label="设备厂商">
                <Select placeholder="不指定则自动识别" allowClear>
                  {VENDOR_OPTIONS.map(o => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}
                </Select>
              </Form.Item>
            )}
            {protocol === 'redfish' && (
              <div style={{ flex: 1, marginBottom: 12, fontSize: 12, color: colors.text.secondary, alignSelf: 'center' }}>
                厂商将自动识别（Redfish Manufacturer 字段），无需指定
              </div>
            )}
            <Form.Item name="isDefault" style={{ width: 200, marginBottom: 12 }} label="设为默认凭据" valuePropName="checked">
              <Switch checkedChildren="默认" unCheckedChildren="否" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

/** 认证信息分区图标（防止顶部 import 未使用告警的封装） */
function SafetyCertificateOutlined_safe() {
  return <KeyOutlined style={{ fontSize: 13 }} />;
}
