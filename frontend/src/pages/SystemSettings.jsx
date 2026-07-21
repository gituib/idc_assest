import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Switch,
  Button,
  Card,
  Space,
  message,
  notification,
  Modal,
  Tag,
  Divider,
  Descriptions,
  Alert,
  Row,
  Col,
  Typography,
  Badge,
  Tooltip,
  Avatar,
  InputNumber,
  Skeleton,
  Table,
} from 'antd';
import {
  SettingOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  ReloadOutlined,
  SaveOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LinkOutlined,
  ArrowRightOutlined,
  GithubOutlined,
  ClusterOutlined,
  QqOutlined,
  DesktopOutlined,
  ExportOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useConfig } from '../hooks/useConfig';
import { useAuth } from '../hooks/useAuth';
import { systemSettingsAPI } from '../api';

const { Title, Text, Paragraph } = Typography;

/** 邮件服务页面专用配色（基于 ui-ux-pro-max 推荐：Indigo + Emerald） */
const MAIL_COLORS = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryBg: '#F5F3FF',
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  textPrimary: '#1E1B4B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
};

/** 常用 SMTP 服务商预设（一键填充，减少输入错误） */
const SMTP_PRESETS = [
  {
    key: 'qq',
    label: 'QQ 邮箱',
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    helpUrl: 'https://service.mail.qq.com/detail/0/75',
    userHint: '完整 QQ 邮箱地址（如 12345@qq.com）',
    passHint: '需在 QQ 邮箱设置中开启 SMTP 并生成授权码',
  },
  {
    key: '163',
    label: '163 邮箱',
    host: 'smtp.163.com',
    port: 465,
    secure: true,
    helpUrl: 'https://help.mail.163.com/faqDetail.do?code=d7a5dc747dc9e012a5b8f3f0e0c2845b',
    userHint: '完整 163 邮箱地址（如 user@163.com）',
    passHint: '需在 163 邮箱设置中开启 SMTP 并生成授权码',
  },
  {
    key: 'aliyun',
    label: '阿里云邮件',
    host: 'smtpdm.aliyun.com',
    port: 465,
    secure: true,
    helpUrl: 'https://help.aliyun.com/document_detail/29444.html',
    userHint: '阿里云邮件推送控制台分配的 AccessKey',
    passHint: '阿里云邮件推送控制台分配的 SecretKey',
  },
  {
    key: 'gmail',
    label: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    helpUrl: 'https://support.google.com/mail/answer/185833',
    userHint: '完整 Gmail 邮箱地址（如 user@gmail.com）',
    passHint: '需开启两步验证后生成应用专用密码',
  },
];

/**
 * 系统设置页面
 * Tab:基本设置、关于系统(管理员额外显示邮件服务)
 */
const SystemSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [activeMenu, setActiveMenu] = useState('general');
  const [systemInfo, setSystemInfo] = useState(null);
  const [form] = Form.useForm();
  const [mailForm] = Form.useForm();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { reloadConfig } = useConfig();
  const { user } = useAuth();
  const isAdmin = user?.roles?.some(r => r.roleCode === 'admin');

  // 邮件服务配置相关状态
  const [mailSaving, setMailSaving] = useState(false);
  const [mailTesting, setMailTesting] = useState(false);
  const [mailLoading, setMailLoading] = useState(false);
  const [hasMailPassword, setHasMailPassword] = useState(false);
  const [mailConfigLoaded, setMailConfigLoaded] = useState(false);
  const [mailFormDirty, setMailFormDirty] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [testMailModalOpen, setTestMailModalOpen] = useState(false);
  const [testMailForm] = Form.useForm();

  // 关于系统：开源许可
  const [licenseModal, setLicenseModal] = useState({ open: false, loading: false, data: null });

  useEffect(() => {
    fetchSettings();
    fetchSystemInfo();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 邮件配置懒加载：仅在切换到「邮件服务」菜单且为管理员时加载
  // 避免组件挂载时 mailForm 尚未挂载导致 setFieldsValue 失效
  useEffect(() => {
    if (activeMenu === 'mail' && isAdmin && !mailConfigLoaded) {
      fetchMailConfig();
    }
  }, [activeMenu, isAdmin, mailConfigLoaded]);

  /** 获取所有系统设置 */
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/system-settings');
      setSettings(response.data);

      const formValues = {};
      Object.entries(response.data).forEach(([key, data]) => {
        formValues[key] = data.value;
      });
      form.setFieldsValue(formValues);
    } catch (error) {
      message.error('获取设置失败');
    } finally {
      setLoading(false);
    }
  };

  /** 获取系统运行信息 */
  const fetchSystemInfo = async () => {
    try {
      const response = await axios.get('/api/system-settings/system/info');
      setSystemInfo(response.data);
    } catch (error) {
      console.error('获取系统信息失败');
    }
  };

  /** 打开开源许可 Modal */
  const handleOpenLicenses = async () => {
    setLicenseModal({ open: true, loading: true, data: null });
    try {
      const res = await systemSettingsAPI.getLicenses();
      setLicenseModal({ open: true, loading: false, data: res });
    } catch (error) {
      setLicenseModal({ open: true, loading: false, data: null });
      message.error('获取开源许可列表失败');
    }
  };

  /** 获取邮件服务（SMTP）配置 */
  const fetchMailConfig = async () => {
    setMailLoading(true);
    try {
      const res = await systemSettingsAPI.getMailConfig();
      if (res?.success) {
        const data = res.data || {};
        setHasMailPassword(!!data.hasPassword);
        // 注意：密码字段保持空，仅当用户输入新值时才提交
        mailForm.setFieldsValue({
          smtpHost: data.smtpHost || '',
          smtpPort: data.smtpPort || 465,
          smtpSecure: data.smtpSecure !== false,
          smtpUser: data.smtpUser || '',
          smtpPass: '',
          mailFromName: data.mailFromName || '',
        });
        // 根据已加载配置匹配当前预设
        const matchedPreset = SMTP_PRESETS.find(p => p.host === data.smtpHost);
        setActivePreset(matchedPreset?.key || null);
        setMailFormDirty(false);
      }
    } catch (error) {
      message.error('获取邮件服务配置失败');
    } finally {
      setMailLoading(false);
      setMailConfigLoaded(true);
    }
  };

  /** 应用 SMTP 预设（一键填充常用服务商配置）
   *  保护机制：若连接参数（主机/端口/SSL）已有内容，弹确认框避免误覆盖
   */
  const [overwritePreset, setOverwritePreset] = useState(null);

  const applySmtpPreset = preset => {
    const currentHost = mailForm.getFieldValue('smtpHost');
    const currentPort = mailForm.getFieldValue('smtpPort');

    // 输入框已有内容时，弹受控确认框避免误覆盖
    if (currentHost || currentPort) {
      setOverwritePreset({
        preset,
        current: {
          host: currentHost || '—',
          port: currentPort || '—',
          secure: mailForm.getFieldValue('smtpSecure'),
        },
      });
      return;
    }

    doApplyPreset(preset);
  };

  /** 实际执行预设应用 */
  const doApplyPreset = preset => {
    mailForm.setFieldsValue({
      smtpHost: preset.host,
      smtpPort: preset.port,
      smtpSecure: preset.secure,
    });
    setActivePreset(preset.key);
    setMailFormDirty(true);
    message.success(`已应用 ${preset.label} 预设（请补充账号和密码）`);
  };

  /** 确认覆盖现有配置 */
  const handleConfirmOverwrite = () => {
    if (overwritePreset) {
      doApplyPreset(overwritePreset.preset);
      setOverwritePreset(null);
    }
  };

  /** 监听邮件表单字段变化（用于脏数据检测） */
  const handleMailFormChange = () => {
    setMailFormDirty(true);
  };

  /** 保存邮件服务配置 */
  const handleSaveMailConfig = async values => {
    setMailSaving(true);
    try {
      const payload = { ...values };
      // 如果未输入密码且后端已有密码，则不传 smtpPass（后端保留原密码）
      if (!values.smtpPass && hasMailPassword) {
        delete payload.smtpPass;
      }
      const res = await systemSettingsAPI.saveMailConfig(payload);
      if (res?.success) {
        message.success('邮件服务配置保存成功');
        setMailFormDirty(false);
        fetchMailConfig();
      } else {
        message.error(res?.message || '保存失败');
      }
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || '保存失败';
      message.error(msg);
    } finally {
      setMailSaving(false);
    }
  };

  /** 发送测试邮件（使用已保存的 SMTP 配置，非表单当前值） */
  const handleSendTestMail = async () => {
    // 检查后端是否已保存有效配置（hasMailPassword 反映后端是否有完整配置）
    if (!hasMailPassword) {
      message.warning('请先填写并保存 SMTP 配置后再发送测试邮件');
      return;
    }

    // 检查表单是否有未保存的修改，提示用户先保存
    const currentValues = mailForm.getFieldsValue();
    const hasUnsavedPassword = !!currentValues.smtpPass;
    if (hasUnsavedPassword) {
      message.warning('表单中的密码尚未保存，请先点击"保存配置"');
      return;
    }

    // 使用受控 Modal，避免 Modal.confirm 中无法使用 Form 的问题
    setTestMailModalOpen(true);
    testMailForm.resetFields();
  };

  /** 提交测试邮件发送 */
  const handleTestMailSubmit = async () => {
    try {
      const values = await testMailForm.validateFields();
      setMailTesting(true);
      try {
        const res = await systemSettingsAPI.sendTestMail(values.to);
        if (res?.success) {
          message.success(`测试邮件已发送至 ${values.to}`);
          setTestMailModalOpen(false);
        } else {
          // 错误提示较长时使用 notification 完整展示排查建议
          notification.error({
            message: '测试邮件发送失败',
            description: res?.message || '请检查 SMTP 配置',
            duration: 8,
            placement: 'topRight',
          });
        }
      } catch (error) {
        const errData = error?.response?.data || {};
        const errMsg = errData.message || error?.message || '测试邮件发送失败';
        // 区分 MAIL_NOT_CONFIGURED（短提示）与其他错误（长提示用 notification）
        if (errData.error === 'MAIL_NOT_CONFIGURED') {
          message.error(errMsg);
        } else {
          notification.error({
            message: '测试邮件发送失败',
            description: errMsg,
            duration: 8,
            placement: 'topRight',
          });
        }
      } finally {
        setMailTesting(false);
      }
    } catch {
      // 表单校验失败，Modal 不关闭
    }
  };

  /** 保存设置 */
  const handleSaveSettings = async values => {
    setSaving(true);
    try {
      const updates = {};
      Object.entries(values).forEach(([key, value]) => {
        if (settings[key] && settings[key].isEditable) {
          updates[key] = value;
        }
      });

      await axios.put('/api/system-settings', { settings: updates });
      message.success('设置保存成功');

      fetchSettings();
      await reloadConfig();
    } catch (error) {
      message.error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  /** 预览Logo */
  const handlePreviewLogo = () => {
    const logoUrl = form.getFieldValue('site_logo');
    if (!logoUrl) {
      message.warning('请先输入Logo URL');
      return;
    }
    Modal.info({
      title: 'Logo 预览',
      content: (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <img
            src={logoUrl}
            alt="Logo预览"
            style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
            onError={e => {
              e.target.style.display = 'none';
              e.target.parentNode.innerHTML =
                '<div style="color:#ff4d4f;padding:20px;">图片加载失败，请检查URL是否正确</div>';
            }}
          />
        </div>
      ),
      okText: '关闭',
      width: 480,
    });
  };

  /** 渲染基本设置Tab */
  const renderGeneralSettings = () => {
    const maintenanceMode = form.getFieldValue('maintenance_mode');

    return (
      <Form form={form} layout="vertical" onFinish={handleSaveSettings}>
        <div style={{ paddingBottom: 80 }}>
          {/* 站点信息卡片 */}
          <Card
            style={{ marginBottom: 24, borderRadius: 12, border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <GlobalOutlined style={{ color: '#fff', fontSize: 24 }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#262626', marginBottom: 6 }}>站点信息</div>
              <div style={{ fontSize: 14, color: '#666' }}>配置系统基本信息和站点标识</div>
            </div>
            <Divider style={{ margin: '0 0 24px 0' }} />
            <Row gutter={[32, 16]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>网站名称</span>}
                  name="site_name"
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="请输入网站名称" style={{ height: 40, borderRadius: 8 }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>网站Logo URL</span>}
                  name="site_logo"
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    placeholder="请输入Logo图片URL"
                    style={{ height: 40, borderRadius: 8 }}
                    suffix={
                      <Button type="link" size="small" style={{ padding: 0 }} onClick={handlePreviewLogo}>
                        <EyeOutlined /> 预览
                      </Button>
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 公司信息卡片 */}
          <Card
            style={{ marginBottom: 24, borderRadius: 12, border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <FileTextOutlined style={{ color: '#fff', fontSize: 24 }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#262626', marginBottom: 6 }}>公司信息</div>
              <div style={{ fontSize: 14, color: '#666' }}>配置公司基本联系信息与系统描述</div>
            </div>
            <Divider style={{ margin: '0 0 24px 0' }} />
            <Row gutter={[32, 16]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>公司名称</span>}
                  name="company_name"
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    prefix={<GlobalOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="请输入公司名称"
                    style={{ height: 40, borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>联系邮箱</span>}
                  name="contact_email"
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="请输入联系邮箱"
                    style={{ height: 40, borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>联系电话</span>}
                  name="contact_phone"
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="请输入联系电话"
                    style={{ height: 40, borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>公司地址</span>}
                  name="company_address"
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="请输入公司地址"
                    style={{ height: 40, borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>系统描述</span>}
                  name="system_description"
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea rows={3} placeholder="请输入系统描述" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 安全设置卡片 */}
          <Card
            style={{ marginBottom: 24, borderRadius: 12, border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <SafetyCertificateOutlined style={{ color: '#fff', fontSize: 24 }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#262626', marginBottom: 6 }}>安全设置</div>
              <div style={{ fontSize: 14, color: '#666' }}>配置登录安全策略和维护模式</div>
            </div>
            <Divider style={{ margin: '0 0 24px 0' }} />

            {/* 维护模式警告 */}
            {maintenanceMode && (
              <Alert
                message="维护模式已开启"
                description="开启后普通用户将无法登录和访问系统，仅管理员可正常使用。请在维护完成后及时关闭。"
                type="warning"
                showIcon
                style={{ marginBottom: 24, borderRadius: 8 }}
              />
            )}

            <Row gutter={[32, 16]} align="middle">
              <Col xs={24} md={8}>
                <Form.Item
                  label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>空闲超时时间</span>}
                  name="idle_timeout"
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    min={1}
                    max={120}
                    placeholder="超时时间"
                    style={{ width: '100%', height: 40, borderRadius: 8 }}
                    addonAfter="分钟"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>最大登录尝试次数</span>}
                  name="max_login_attempts"
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    min={1}
                    max={20}
                    placeholder="尝试次数"
                    style={{ width: '100%', height: 40, borderRadius: 8 }}
                    addonAfter="次"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>维护模式</span>}
                  name="maintenance_mode"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Tooltip title="开启后普通用户将无法登录和访问系统">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭" style={{ marginTop: 8 }} />
                  </Tooltip>
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </div>
        {renderFixedFooter()}
      </Form>
    );
  };

  /** 渲染关于系统Tab */
  const renderAboutPage = () => {
    return (
      <div>
        <Card
          style={{ marginBottom: 16, borderRadius: 12, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
          bodyStyle={{ padding: '32px 24px' }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 72, height: 72, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.18)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
                boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <DatabaseOutlined style={{ fontSize: 36, color: '#fff' }} />
            </div>
            <Title level={3} style={{ color: '#fff', margin: 0, marginBottom: 10, fontSize: '22px', fontWeight: 600 }}>
              机柜管理系统
            </Title>
            <div style={{ marginBottom: 10 }}>
              <Space size={10} wrap style={{ color: 'rgba(255,255,255,0.9)', justifyContent: 'center' }}>
                <Tag color="rgba(255,255,255,0.22)" style={{ color: '#fff', border: 'none', borderRadius: 12, padding: '2px 12px', fontSize: 13 }}>
                  v{settings.app_version?.value || '1.0.0'}
                </Tag>
                <Badge status="success" text={<span style={{ color: '#fff', fontSize: 13 }}>运行正常</span>} />
              </Space>
            </div>
            <Paragraph style={{ color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: 13, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
              专业的数据中心设备管理平台，提供机房、机柜、设备的全生命周期管理
            </Paragraph>
          </div>
        </Card>

        {systemInfo && (
          <Card
            style={{ marginBottom: 16, borderRadius: 12, border: '1px solid #e8e8e8' }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ marginBottom: 16 }}>
              <Space size={10}>
                <Avatar style={{ backgroundColor: '#52c41a', borderRadius: 8 }} icon={<CloudServerOutlined />} size={32} />
                <Text strong style={{ fontSize: 15 }}>系统统计</Text>
              </Space>
            </div>
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center', borderRadius: 10, background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', padding: '16px 12px' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a', marginBottom: 2 }}>
                    {systemInfo.statistics?.devices || 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>设备总数</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center', borderRadius: 10, background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', padding: '16px 12px' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff', marginBottom: 2 }}>
                    {systemInfo.statistics?.racks || 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>机柜总数</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center', borderRadius: 10, background: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)', padding: '16px 12px' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#722ed1', marginBottom: 2 }}>
                    {systemInfo.statistics?.rooms || 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>机房总数</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center', borderRadius: 10, background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)', padding: '16px 12px' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#fa8c16', marginBottom: 2 }}>
                    {systemInfo.statistics?.users || 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>用户总数</Text>
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: '20px 0' }} />

            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" labelStyle={{ fontWeight: 500, fontSize: 13 }}>
              <Descriptions.Item label="Node.js 版本">
                <Tag color="blue" size="small">{systemInfo.system?.nodeVersion}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="运行平台">
                <Text style={{ fontSize: 13 }}>{systemInfo.system?.platform} ({systemInfo.system?.arch})</Text>
              </Descriptions.Item>
              <Descriptions.Item label="进程 ID">
                <Tag size="small">{systemInfo.system?.pid}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="运行时间">
                <Text style={{ fontSize: 13 }}>
                  {systemInfo.system?.uptime
                    ? `${Math.floor(systemInfo.system.uptime / 3600)}小时${Math.floor((systemInfo.system.uptime % 3600) / 60)}分钟`
                    : '-'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="内存使用">
                <Text style={{ fontSize: 13 }}>
                  {systemInfo.system?.memoryUsage
                    ? `${(systemInfo.system.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`
                    : '-'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="系统时间">
                <Text style={{ fontSize: 13 }}>
                  {systemInfo.timestamp ? new Date(systemInfo.timestamp).toLocaleString('zh-CN') : '-'}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* 数据库信息卡片 */}
        {systemInfo?.database && (
          <Card
            style={{ marginBottom: 16, borderRadius: 12, border: '1px solid #e8e8e8' }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space size={10}>
                <Avatar style={{ backgroundColor: '#1890ff', borderRadius: 8 }} icon={<DatabaseOutlined />} size={32} />
                <Text strong style={{ fontSize: 15 }}>数据库信息</Text>
              </Space>
              <Tag
                color={systemInfo.database.status === 'connected' ? 'success' : 'error'}
                style={{ borderRadius: 12, padding: '2px 12px' }}
              >
                {systemInfo.database.status === 'connected' ? '● 已连接' : '● 连接失败'}
              </Tag>
            </div>
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" labelStyle={{ fontWeight: 500, fontSize: 13 }}>
              <Descriptions.Item label="数据库类型">
                <Tag color="blue">{systemInfo.database.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="数据库版本">
                <Text style={{ fontSize: 13 }}>{systemInfo.database.version || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="sequelize 版本">
                <Text style={{ fontSize: 13 }}>{systemInfo.database.sequelizeVersion}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="驱动模块">
                <Tag>{systemInfo.database.dialectModule}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="主机地址">
                <Text style={{ fontSize: 13 }}>
                  {systemInfo.database.host}{systemInfo.database.port ? `:${systemInfo.database.port}` : ''}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={systemInfo.database.type === 'mysql' ? '数据库名' : '数据库文件'} span={2}>
                <Text style={{ fontSize: 13 }} code>{systemInfo.database.database}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* 技术支持卡片 */}
        {systemInfo && (
          <Card
            style={{ marginBottom: 16, borderRadius: 12, border: '1px solid #e8e8e8' }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ marginBottom: 16 }}>
              <Space size={10}>
                <Avatar style={{ backgroundColor: '#eb2f96', borderRadius: 8 }} icon={<SafetyCertificateOutlined />} size={32} />
                <Text strong style={{ fontSize: 15 }}>技术支持</Text>
              </Space>
            </div>
            <Descriptions column={4} size="small" labelStyle={{ fontWeight: 500, fontSize: 13 }}>
              <Descriptions.Item label="GitHub 仓库">
                {systemInfo?.repoInfo?.repoUrl ? (
                  <a href={systemInfo.repoInfo.repoUrl} target="_blank" rel="noopener noreferrer">
                    <GithubOutlined /> {systemInfo.repoInfo.repoOwner}/{systemInfo.repoInfo.repoName}
                  </a>
                ) : <Text type="secondary">-</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="问题反馈">
                {systemInfo?.repoInfo?.issuesUrl ? (
                  <a href={systemInfo.repoInfo.issuesUrl} target="_blank" rel="noopener noreferrer">
                    <LinkOutlined /> 提交 Issue
                  </a>
                ) : <Text type="secondary">-</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="QQ 群">
                <Text copyable style={{ fontSize: 13 }}>
                  <QqOutlined /> 1081123775
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="开源协议">
                <Tag color="blue" style={{ borderRadius: 12, padding: '2px 12px' }}>
                  {systemInfo?.repoInfo?.license || 'MIT'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            <Divider style={{ margin: '16px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Space size={12}>
                <Tag color="purple" style={{ borderRadius: 12, padding: '2px 12px' }}>
                  Host: {systemInfo?.system?.hostname || '-'}
                </Tag>
                <Tag icon={<GithubOutlined />} color="default" style={{ borderRadius: 12, padding: '2px 12px' }}>
                  {systemInfo?.repoInfo?.repoOwner && systemInfo?.repoInfo?.repoName
                    ? `${systemInfo.repoInfo.repoOwner}/${systemInfo.repoInfo.repoName}`
                    : '未配置'}
                </Tag>
              </Space>
              <Button
                type="link"
                icon={<CodeOutlined />}
                onClick={handleOpenLicenses}
                style={{ padding: 0 }}
              >
                查看开源许可
              </Button>
            </div>
          </Card>
        )}
      </div>
    );
  };

  /** 底部固定操作栏 */
  const renderFixedFooter = () => (
    <div
      style={{
        position: 'sticky', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e8e8e8',
        padding: '16px 24px', display: 'flex', justifyContent: 'center', gap: 16,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)', zIndex: 10, marginTop: 24,
      }}
    >
      <Button
        type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />} size="large"
        style={{ borderRadius: 8, minWidth: 140, height: 44, fontSize: 15, fontWeight: 500 }}
      >
        保存设置
      </Button>
      <Button
        onClick={() => fetchSettings()} icon={<ReloadOutlined />} size="large"
        style={{ borderRadius: 8, minWidth: 120, height: 44, fontSize: 15 }}
      >
        重置表单
      </Button>
    </div>
  );

  /** 渲染邮件服务配置卡片（仅超管可见） */
  const renderMailSettings = () => {
    // 加载中：显示骨架屏，避免空白闪烁
    if (mailLoading && !mailConfigLoaded) {
      return (
        <div style={{ paddingBottom: 80 }}>
          <Card style={{ marginBottom: 24, borderRadius: 12 }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </div>
      );
    }

    return (
      <>
        <Form
          form={mailForm}
          layout="vertical"
          size="large"
          onFinish={handleSaveMailConfig}
          onValuesChange={handleMailFormChange}
        >
          <div style={{ paddingBottom: 80 }}>
            {/* 顶部说明 + 配置状态徽章 */}
            <Alert
              message={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: MAIL_COLORS.textPrimary }}>
                    邮件服务（SMTP）配置
                  </span>
                  <Tag
                    icon={hasMailPassword ? <SafetyCertificateOutlined /> : <InfoCircleOutlined />}
                    color={hasMailPassword ? 'success' : 'warning'}
                    style={{ margin: 0, padding: '2px 12px', fontSize: 13 }}
                  >
                    {hasMailPassword ? '已配置' : '未配置'}
                  </Tag>
                </div>
              }
              description={
                <span style={{ color: MAIL_COLORS.textSecondary, lineHeight: 1.6 }}>
                  仅超级管理员可见。配置后系统可发送邮箱验证码、系统通知等邮件。
                  密码/授权码采用 <Text strong style={{ color: MAIL_COLORS.primary }}>AES-256-CBC</Text> 加密存储，保存后立即生效。
                </span>
              }
              type="info"
              showIcon
              style={{
                marginBottom: 24,
                borderRadius: 12,
                border: `1px solid ${MAIL_COLORS.border}`,
                background: MAIL_COLORS.primaryBg,
              }}
            />

            {/* 未保存修改提示 */}
            {mailFormDirty && (
              <Alert
                message="表单有未保存的修改"
                description="点击下方「保存配置」按钮使修改生效，或点击「重置」放弃修改。"
                type="warning"
                showIcon
                style={{ marginBottom: 16, borderRadius: 8 }}
                closable
                onClose={() => setMailFormDirty(false)}
              />
            )}

            <Card
              style={{
                marginBottom: 24,
                borderRadius: 12,
                border: `1px solid ${MAIL_COLORS.border}`,
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.06)',
              }}
              bodyStyle={{ padding: '28px' }}
            >
              {/* 标题区 */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${MAIL_COLORS.primary} 0%, ${MAIL_COLORS.primaryLight} 100%)`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 12,
                    boxShadow: `0 4px 12px ${MAIL_COLORS.primary}40`,
                  }}
                >
                  <MailOutlined style={{ color: '#fff', fontSize: 26 }} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: MAIL_COLORS.textPrimary, marginBottom: 6 }}>
                  SMTP 服务
                </div>
                <div style={{ fontSize: 14, color: MAIL_COLORS.textSecondary }}>
                  配置第三方 SMTP 服务用于系统邮件发送
                </div>
              </div>

              {/* SMTP 服务商快速预设 */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 10, fontSize: 13, color: MAIL_COLORS.textSecondary }}>
                  <Text strong style={{ color: MAIL_COLORS.textPrimary }}>快捷预设</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>点击一键填充常用服务商配置</Text>
                </div>
                <Space size="small" wrap>
                  {SMTP_PRESETS.map(preset => (
                    <Tooltip
                      key={preset.key}
                      title={
                        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                          <div>主机：{preset.host}</div>
                          <div>端口：{preset.port}（{preset.secure ? 'SSL' : 'STARTTLS'}）</div>
                          <div style={{ marginTop: 4, color: '#a5b4fc' }}>点击一键填充以上配置</div>
                        </div>
                      }
                    >
                      <Tag
                        style={{
                          cursor: 'pointer',
                          padding: '4px 12px',
                          fontSize: 13,
                          borderRadius: 6,
                          margin: 0,
                          border: activePreset === preset.key
                            ? `1px solid ${MAIL_COLORS.primary}`
                            : `1px solid ${MAIL_COLORS.border}`,
                          background: activePreset === preset.key
                            ? MAIL_COLORS.primaryBg
                            : '#fff',
                          color: activePreset === preset.key
                            ? MAIL_COLORS.primary
                            : MAIL_COLORS.textSecondary,
                          fontWeight: activePreset === preset.key ? 600 : 400,
                          transition: 'all 0.2s',
                        }}
                        onClick={() => applySmtpPreset(preset)}
                      >
                        {preset.label}
                      </Tag>
                    </Tooltip>
                  ))}
                </Space>

                {/* 选中预设后显示对应的官方帮助文档入口 */}
                {activePreset && (
                  <div style={{ marginTop: 12 }}>
                    {(() => {
                      const preset = SMTP_PRESETS.find(p => p.key === activePreset);
                      if (!preset) return null;
                      return (
                        <a
                          href={preset.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            color: MAIL_COLORS.primary,
                            transition: 'opacity 0.2s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = 0.8)}
                          onMouseLeave={e => (e.currentTarget.style.opacity = 1)}
                        >
                          <LinkOutlined />
                          查看 {preset.label} SMTP 开启教程
                        </a>
                      );
                    })()}
                  </div>
                )}
              </div>

              <Divider orientation="left" style={{ color: MAIL_COLORS.primary, fontWeight: 600, margin: '8px 0 20px 0' }}>
                <CloudServerOutlined style={{ marginRight: 6 }} />
                连接参数
              </Divider>

              {/* 第一组：连接参数 */}
              <Row gutter={[24, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={<span style={{ fontSize: 14, color: MAIL_COLORS.textPrimary, fontWeight: 500 }}>SMTP 主机</span>}
                    name="smtpHost"
                    rules={[{ required: true, message: '请输入 SMTP 主机地址' }]}
                  >
                    <Input
                      placeholder="如：smtp.qq.com / smtp.163.com / smtpdm.aliyun.com"
                      prefix={<CloudServerOutlined style={{ color: MAIL_COLORS.primaryLight }} />}
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    label={<span style={{ fontSize: 14, color: MAIL_COLORS.textPrimary, fontWeight: 500 }}>SMTP 端口</span>}
                    name="smtpPort"
                    rules={[{ required: true, message: '请输入端口号' }]}
                  >
                    <InputNumber
                      min={1}
                      max={65535}
                      placeholder="465 / 587 / 25"
                      style={{ width: '100%', borderRadius: 8 }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    label={<span style={{ fontSize: 14, color: MAIL_COLORS.textPrimary, fontWeight: 500 }}>SSL/TLS</span>}
                    name="smtpSecure"
                    valuePropName="checked"
                    tooltip="465 端口通常为 true（SSL），587 端口通常为 false（STARTTLS）"
                    // Switch 不受 Form size 控制，用 labelCol/wrapperCol 的样式模拟 large 尺寸高度
                    style={{ marginBottom: 0 }}
                    wrapperCol={{ style: { height: 40, display: 'flex', alignItems: 'center' } }}
                  >
                    <Switch checkedChildren="启用" unCheckedChildren="关闭" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" style={{ color: MAIL_COLORS.primary, fontWeight: 600, margin: '8px 0 20px 0' }}>
                <LockOutlined style={{ marginRight: 6 }} />
                认证信息
              </Divider>

              {/* 第二组：认证信息 */}
              <Row gutter={[24, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={<span style={{ fontSize: 14, color: MAIL_COLORS.textPrimary, fontWeight: 500 }}>SMTP 账号</span>}
                    name="smtpUser"
                    rules={[{ required: true, message: '请输入 SMTP 账号' }]}
                    extra={activePreset && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {SMTP_PRESETS.find(p => p.key === activePreset)?.userHint}
                      </Text>
                    )}
                  >
                    <Input
                      placeholder="发件邮箱地址或授权账号"
                      prefix={<UserOutlined style={{ color: MAIL_COLORS.primaryLight }} />}
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={
                      <span style={{ fontSize: 14, color: MAIL_COLORS.textPrimary, fontWeight: 500 }}>
                        SMTP 密码/授权码
                        {hasMailPassword && (
                          <Tag color="success" style={{ marginLeft: 8, fontSize: 12 }}>
                            <SafetyCertificateOutlined /> 已加密存储
                          </Tag>
                        )}
                      </span>
                    }
                    name="smtpPass"
                    tooltip="QQ/163 邮箱需使用授权码而非登录密码；留空表示不修改原密码"
                    extra={activePreset && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {SMTP_PRESETS.find(p => p.key === activePreset)?.passHint}
                      </Text>
                    )}
                  >
                    <Input.Password
                      placeholder={hasMailPassword ? '••••••（已加密存储，留空不修改）' : '请输入密码或授权码'}
                      prefix={<LockOutlined style={{ color: MAIL_COLORS.primaryLight }} />}
                      style={{ borderRadius: 8 }}
                      iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" style={{ color: MAIL_COLORS.primary, fontWeight: 600, margin: '8px 0 20px 0' }}>
                <MailOutlined style={{ marginRight: 6 }} />
                发件人设置
              </Divider>

              {/* 第三组：发件人设置 */}
              <Row gutter={[24, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={<span style={{ fontSize: 14, color: MAIL_COLORS.textPrimary, fontWeight: 500 }}>发件人名称</span>}
                    name="mailFromName"
                    tooltip="收件人看到的发件人显示名称"
                  >
                    <Input
                      placeholder="如：IDC 资产管理系统"
                      prefix={<MailOutlined style={{ color: MAIL_COLORS.primaryLight }} />}
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  {/* 用空 label 的 Form.Item 占位，使右侧说明卡片与左侧 Input 在同一基线对齐 */}
                  <Form.Item label=" " colon={false}>
                    <div
                      style={{
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 16px',
                        borderRadius: 8,
                        background: MAIL_COLORS.primaryBg,
                        border: `1px dashed ${MAIL_COLORS.primaryLight}`,
                        color: MAIL_COLORS.textSecondary,
                        fontSize: 13,
                      }}
                    >
                      <InfoCircleOutlined style={{ marginRight: 8, color: MAIL_COLORS.primary, flexShrink: 0 }} />
                      <span>发件人邮箱地址默认使用 SMTP 账号，无需单独设置</span>
                    </div>
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: '20px 0 16px 0' }} />

              {/* 操作按钮区 */}
              <Space size="middle" wrap>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={mailSaving}
                  icon={<SaveOutlined />}
                  style={{
                    borderRadius: 8,
                    background: MAIL_COLORS.primary,
                    borderColor: MAIL_COLORS.primary,
                    height: 40,
                    paddingInline: 24,
                  }}
                >
                  保存配置
                </Button>
                <Tooltip title={hasMailPassword ? '使用已保存的 SMTP 配置发送测试邮件' : '请先保存配置'}>
                  <Button
                    icon={<MailOutlined />}
                    onClick={handleSendTestMail}
                    loading={mailTesting}
                    disabled={!hasMailPassword}
                    style={{ borderRadius: 8, height: 40 }}
                  >
                    发送测试邮件
                  </Button>
                </Tooltip>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => fetchMailConfig()}
                  style={{ borderRadius: 8, height: 40 }}
                >
                  重置
                </Button>
              </Space>
            </Card>
          </div>
        </Form>

        {/* 测试邮件 Modal（含邮箱校验） */}
        <Modal
          open={testMailModalOpen}
          title={
            <Space>
              <MailOutlined style={{ color: MAIL_COLORS.primary }} />
              <span>发送测试邮件</span>
            </Space>
          }
          onOk={handleTestMailSubmit}
          onCancel={() => setTestMailModalOpen(false)}
          okText="发送"
          cancelText="取消"
          confirmLoading={mailTesting}
          destroyOnClose
        >
          <div style={{ padding: '8px 0' }}>
            <Alert
              message="将使用已保存的 SMTP 配置发送测试邮件"
              description="测试邮件包含品牌标识和连接验证信息，用于验证 SMTP 配置是否正确。"
              type="info"
              showIcon
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
            <Form form={testMailForm} layout="vertical" size="large">
              <Form.Item
                label="收件邮箱"
                name="to"
                rules={[
                  { required: true, message: '请输入收件邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input
                  placeholder="如：test@example.com"
                  prefix={<MailOutlined style={{ color: MAIL_COLORS.primaryLight }} />}
                  style={{ borderRadius: 8 }}
                  autoFocus
                />
              </Form.Item>
            </Form>
          </div>
        </Modal>

        {/* 覆盖现有配置确认 Modal */}
        <Modal
          open={!!overwritePreset}
          onCancel={() => setOverwritePreset(null)}
          footer={null}
          width={480}
          destroyOnClose
          centered
          styles={{
            body: { padding: 0 },
            header: { display: 'none' },
            content: { borderRadius: 16, overflow: 'hidden', padding: 0 },
          }}
        >
          {overwritePreset && (
            <div>
              {/* 顶部警示横幅 */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
                  padding: '20px 24px',
                  borderBottom: '1px solid #ffd591',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(250, 140, 22, 0.3)',
                    flexShrink: 0,
                  }}
                >
                  <ExclamationCircleOutlined style={{ color: '#fff', fontSize: 20 }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#874d00' }}>
                    覆盖现有 SMTP 配置？
                  </div>
                  <div style={{ fontSize: 12, color: '#ad6800', marginTop: 2 }}>
                    应用「{overwritePreset.preset.label}」预设将替换当前连接参数
                  </div>
                </div>
              </div>

              {/* 配置对比卡片 */}
              <div style={{ padding: '20px 24px' }}>
                <Row gutter={12} align="middle">
                  {/* 当前配置 */}
                  <Col span={10}>
                    <div
                      style={{
                        background: '#fafafa',
                        border: '1px solid #f0f0f0',
                        borderRadius: 10,
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: '#8c8c8c',
                          marginBottom: 10,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                        }}
                      >
                        当前配置
                      </div>
                      <div style={{ fontSize: 13, color: '#595959', lineHeight: 1.9 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#8c8c8c' }}>主机</span>
                          <Text style={{ fontSize: 12, maxWidth: 120 }} ellipsis>
                            {overwritePreset.current.host}
                          </Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#8c8c8c' }}>端口</span>
                          <span>{overwritePreset.current.port}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#8c8c8c' }}>加密</span>
                          <span>
                            {overwritePreset.current.secure ? 'SSL' : 'STARTTLS'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Col>

                  {/* 箭头 */}
                  <Col span={4} style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        margin: '0 auto',
                        borderRadius: '50%',
                        background: `${MAIL_COLORS.primary}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ArrowRightOutlined style={{ color: MAIL_COLORS.primary, fontSize: 14 }} />
                    </div>
                  </Col>

                  {/* 新配置 */}
                  <Col span={10}>
                    <div
                      style={{
                        background: MAIL_COLORS.primaryBg,
                        border: `1px solid ${MAIL_COLORS.primary}40`,
                        borderRadius: 10,
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: MAIL_COLORS.primary,
                          marginBottom: 10,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                        }}
                      >
                        新配置
                      </div>
                      <div style={{ fontSize: 13, color: '#262626', lineHeight: 1.9, fontWeight: 500 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: MAIL_COLORS.textSecondary }}>主机</span>
                          <Text style={{ fontSize: 12, maxWidth: 120 }} ellipsis>
                            {overwritePreset.preset.host}
                          </Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: MAIL_COLORS.textSecondary }}>端口</span>
                          <span>{overwritePreset.preset.port}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: MAIL_COLORS.textSecondary }}>加密</span>
                          <span>
                            {overwritePreset.preset.secure ? 'SSL' : 'STARTTLS'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>

                {/* 说明文字 */}
                <Alert
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                  style={{
                    marginTop: 16,
                    borderRadius: 8,
                    backgroundColor: '#f0f5ff',
                    border: '1px solid #d6e4ff',
                  }}
                  message={
                    <Text style={{ fontSize: 12, color: '#475569' }}>
                      SMTP 账号和密码不会被覆盖，仍需手动填写。
                    </Text>
                  }
                />

                {/* 操作按钮 */}
                <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                  <Button
                    onClick={() => setOverwritePreset(null)}
                    style={{ borderRadius: 8, padding: '0 18px' }}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    danger
                    onClick={handleConfirmOverwrite}
                    style={{ borderRadius: 8, padding: '0 18px', fontWeight: 500 }}
                  >
                    确认覆盖
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </>
    );
  };

  /** 渲染当前Tab内容 */
  const renderContent = () => {
    switch (activeMenu) {
      case 'general':
        return renderGeneralSettings();
      case 'about':
        return renderAboutPage();
      case 'mail':
        return isAdmin ? renderMailSettings() : renderGeneralSettings();
      default:
        return renderGeneralSettings();
    }
  };

  const menuItems = [
    { key: 'general', icon: <GlobalOutlined />, label: '基本设置', description: '站点信息、公司信息、安全设置' },
    ...(isAdmin
      ? [{ key: 'mail', icon: <MailOutlined />, label: '邮件服务', description: 'SMTP 配置、测试邮件' }]
      : []),
    { key: 'about', icon: <InfoCircleOutlined />, label: '关于系统', description: '系统信息、版本详情' },
  ];

  /** 桌面端顶部导航栏 */
  const renderTopNav = () => (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}
    >
      {menuItems.map(item => (
        <div
          key={item.key}
          onClick={() => setActiveMenu(item.key)}
          style={{
            display: 'flex', alignItems: 'center', padding: '8px 16px',
            borderRadius: 20, cursor: 'pointer', transition: 'all 0.3s ease',
            backgroundColor: activeMenu === item.key ? 'rgba(255,255,255,0.25)' : 'transparent',
            color: '#fff', whiteSpace: 'nowrap', fontSize: 14,
            fontWeight: activeMenu === item.key ? 600 : 400,
          }}
          onMouseEnter={e => {
            if (activeMenu !== item.key) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={e => {
            if (activeMenu !== item.key) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ marginRight: 6, fontSize: 16 }}>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );

  /** 移动端下拉导航 */
  const renderMobileNav = () => (
    <Select
      value={activeMenu}
      onChange={value => setActiveMenu(value)}
      style={{ width: 140 }}
      bordered={false}
      dropdownStyle={{ borderRadius: 8 }}
      suffixIcon={<MenuUnfoldOutlined style={{ color: '#fff' }} />}
    >
      {menuItems.map(item => (
        <Select.Option key={item.key} value={item.key}>
          <Space>{item.icon}{item.label}</Space>
        </Select.Option>
      ))}
    </Select>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部固定导航栏 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ maxWidth: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space align="center">
            <SettingOutlined style={{ fontSize: 20, color: '#fff' }} />
            <Title level={4} style={{ margin: 0, color: '#fff', fontSize: 18 }}>系统设置</Title>
          </Space>
          {!isMobile && renderTopNav()}
          {isMobile && renderMobileNav()}
        </div>
      </div>

      {/* 主内容区 */}
      <div style={{ flex: 1, padding: '16px 24px' }}>
        <div style={{ maxWidth: '100%' }}>{renderContent()}</div>
      </div>

      {/* 开源许可 Modal */}
      <Modal
        open={licenseModal.open}
        onCancel={() => setLicenseModal({ open: false, loading: false, data: null })}
        title={
          <Space>
            <CodeOutlined style={{ color: '#722ed1' }} />
            <span>开源许可声明</span>
            {licenseModal.data?.total && (
              <Tag color="purple" style={{ marginLeft: 8 }}>
                {licenseModal.data.total} 个依赖
              </Tag>
            )}
          </Space>
        }
        footer={null}
        width={800}
        centered
        destroyOnClose
      >
        {licenseModal.loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">正在加载开源许可信息...</Text>
          </div>
        ) : licenseModal.data?.success ? (
          <div>
            {/* 许可类型分组统计 */}
            {licenseModal.data.groups?.length > 0 && (
              <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                  <SafetyCertificateOutlined /> 许可类型分布
                </Text>
                <Space size={6} wrap>
                  {licenseModal.data.groups.map(g => (
                    <Tag key={g.license} style={{ borderRadius: 12 }}>
                      {g.license}: {g.count}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
            {/* 依赖列表表格 */}
            <Table
              size="small"
              dataSource={licenseModal.data.licenses}
              rowKey={r => `${r.scope}-${r.name}`}
              pagination={{ pageSize: 10, showSizeChanger: false, size: 'small' }}
              scroll={{ y: 360 }}
              columns={[
                {
                  title: '依赖名称',
                  dataIndex: 'name',
                  key: 'name',
                  width: '32%',
                  render: (v, r) => (
                    <Space size={4}>
                      <Text strong style={{ fontSize: 13 }}>{v}</Text>
                      <Tag color={r.scope === 'backend' ? 'blue' : 'magenta'} style={{ fontSize: 11 }}>
                        {r.scope}
                      </Tag>
                    </Space>
                  ),
                },
                {
                  title: '版本',
                  dataIndex: 'installedVersion',
                  key: 'version',
                  width: '18%',
                  render: v => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">-</Text>,
                },
                {
                  title: '许可',
                  dataIndex: 'license',
                  key: 'license',
                  width: '20%',
                  render: v => {
                    const isUnknown = !v || v === 'Unknown';
                    return <Tag color={isUnknown ? 'default' : 'green'} style={{ fontSize: 12 }}>{v || 'Unknown'}</Tag>;
                  },
                },
                {
                  title: '类型',
                  dataIndex: 'type',
                  key: 'type',
                  width: '12%',
                  render: v => (
                    <Tag color={v === 'runtime' ? 'success' : 'warning'} style={{ fontSize: 11 }}>
                      {v === 'runtime' ? '运行' : '开发'}
                    </Tag>
                  ),
                },
                {
                  title: '主页',
                  dataIndex: 'homepage',
                  key: 'homepage',
                  width: '18%',
                  render: v => v ? (
                    <a href={v} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                      <LinkOutlined /> 主页
                    </a>
                  ) : <Text type="secondary">-</Text>,
                },
              ]}
            />
            <div style={{ marginTop: 12, padding: 12, background: '#fffbe6', borderRadius: 8, fontSize: 12, color: '#874d00' }}>
              <SafetyCertificateOutlined /> 本系统基于上述开源软件构建，感谢开源社区的贡献。
              许可信息读取自各依赖包的 package.json，如有出入以原始许可文本为准。
            </div>
          </div>
        ) : (
          <Alert
            type="error"
            showIcon
            message="加载失败"
            description="无法获取开源许可列表，请稍后重试"
          />
        )}
      </Modal>
    </div>
  );
};

export default SystemSettings;
