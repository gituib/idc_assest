import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Switch,
  Button,
  Card,
  Space,
  message,
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
  ColorPicker,
  InputNumber,
} from 'antd';
import {
  SettingOutlined,
  GlobalOutlined,
  BgColorsOutlined,
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
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useConfig } from '../hooks/useConfig';

const { Title, Text, Paragraph } = Typography;

/**
 * 系统设置页面
 * 3个Tab：基本设置、外观设置、关于系统
 */
const SystemSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [activeMenu, setActiveMenu] = useState('general');
  const [systemInfo, setSystemInfo] = useState(null);
  const [form] = Form.useForm();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { reloadConfig } = useConfig();

  useEffect(() => {
    fetchSettings();
    fetchSystemInfo();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // 预设颜色
  const presetColors = [
    '#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b',
    '#fa709a', '#fee140', '#00b4db', '#0083b0', '#fcb045',
    '#1890ff', '#52c41a', '#eb2f96', '#722ed1', '#13c2c2', '#fa8c16',
  ];

  /** 颜色变更处理 */
  const handleColorChange = (color, key) => {
    const hexColor = typeof color === 'string' ? color : color.toHexString();
    form.setFieldValue(key, hexColor);

    const root = document.documentElement;
    if (key === 'primary_color') {
      root.style.setProperty('--primary-color', hexColor);
      root.style.setProperty('--primary-light', `${hexColor}20`);
    } else if (key === 'secondary_color') {
      root.style.setProperty('--secondary-color', hexColor);
      root.style.setProperty('--secondary-light', `${hexColor}20`);
    }
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

  /** 渲染外观设置Tab */
  const renderAppearanceSettings = () => {
    const primaryColor =
      form.getFieldValue('primary_color') || settings.primary_color?.value || '#667eea';
    const secondaryColor =
      form.getFieldValue('secondary_color') || settings.secondary_color?.value || '#764ba2';

    return (
      <Form form={form} layout="vertical" onFinish={handleSaveSettings}>
        <div style={{ paddingBottom: 80 }}>
          <Alert
            message="主题颜色设置"
            description="选择颜色后可实时预览效果，保存设置后永久生效。建议选择对比度适中的颜色组合。"
            type="info"
            showIcon
            style={{ marginBottom: 24, borderRadius: 12 }}
          />

          <Card
            style={{ marginBottom: 24, borderRadius: 12, border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <BgColorsOutlined style={{ color: '#fff', fontSize: 24 }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#262626', marginBottom: 6 }}>主题颜色</div>
              <div style={{ fontSize: 14, color: '#666' }}>自定义系统主题配色方案</div>
            </div>

            <Divider style={{ margin: '0 0 24px 0' }} />

            <Row gutter={[32, 24]}>
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 14, color: '#262626' }}>主色调</Text>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>用于按钮、链接等主要交互元素</Text>
                </div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <ColorPicker
                    value={primaryColor}
                    onChange={color => handleColorChange(color, 'primary_color')}
                    format="hex"
                    showText
                    presets={[{ label: '推荐配色', colors: presetColors }]}
                    style={{ width: '100%' }}
                  />
                  <Input
                    value={primaryColor}
                    onChange={e => handleColorChange(e.target.value, 'primary_color')}
                    placeholder="#667eea"
                    style={{ borderRadius: 8 }}
                    prefix={<BgColorsOutlined style={{ color: '#bfbfbf' }} />}
                  />
                </Space>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 14, color: '#262626' }}>次色调</Text>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>用于渐变、悬停效果等辅助元素</Text>
                </div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <ColorPicker
                    value={secondaryColor}
                    onChange={color => handleColorChange(color, 'secondary_color')}
                    format="hex"
                    showText
                    presets={[{ label: '推荐配色', colors: presetColors }]}
                    style={{ width: '100%' }}
                  />
                  <Input
                    value={secondaryColor}
                    onChange={e => handleColorChange(e.target.value, 'secondary_color')}
                    placeholder="#764ba2"
                    style={{ borderRadius: 8 }}
                    prefix={<BgColorsOutlined style={{ color: '#bfbfbf' }} />}
                  />
                </Space>
              </Col>
            </Row>

            <Divider style={{ margin: '24px 0' }} />

            {/* 实时预览 */}
            <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <Text strong style={{ fontSize: 13, color: '#595959', marginBottom: 12, display: 'block' }}>实时预览</Text>
              <Space size="middle" wrap>
                <Button
                  type="primary"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    border: 'none',
                  }}
                >
                  主要按钮
                </Button>
                <Button style={{ borderColor: primaryColor, color: primaryColor }}>
                  次要按钮
                </Button>
                <Tag color={primaryColor} style={{ borderRadius: 4 }}>标签样式</Tag>
                <div
                  style={{
                    width: 60, height: 24, borderRadius: 4,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  }}
                />
              </Space>
            </div>
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
          bodyStyle={{ padding: '24px' }}
        >
          <Row gutter={[20, 20]} align="middle">
            <Col xs={24} sm={6} md={5}>
              <div
                style={{
                  width: 80, height: 80, borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                <DatabaseOutlined style={{ fontSize: 40, color: '#fff' }} />
              </div>
            </Col>
            <Col xs={24} sm={18} md={19}>
              <Title level={3} style={{ color: '#fff', margin: 0, marginBottom: 6, fontSize: '22px' }}>
                机柜管理系统
              </Title>
              <Space size={12} wrap style={{ color: 'rgba(255,255,255,0.9)' }}>
                <span style={{ fontSize: 14 }}>版本 {settings.app_version?.value || '1.0.0'}</span>
                <span style={{ opacity: 0.5 }}>|</span>
                <Badge status="success" text={<span style={{ color: '#fff' }}>运行正常</span>} />
              </Space>
              <Paragraph style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8, marginBottom: 0, fontSize: 13 }}>
                专业的数据中心设备管理平台，提供机房、机柜、设备的全生命周期管理
              </Paragraph>
            </Col>
          </Row>
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

        {/* 公司信息编辑 */}
        <Card
          style={{ marginBottom: 16, borderRadius: 12, border: '1px solid #e8e8e8' }}
          bodyStyle={{ padding: '20px' }}
        >
          <div style={{ marginBottom: 16 }}>
            <Space size={10}>
              <Avatar style={{ backgroundColor: '#667eea', borderRadius: 8 }} icon={<FileTextOutlined />} size={32} />
              <Text strong style={{ fontSize: 15 }}>公司信息</Text>
            </Space>
          </div>
          <Form form={form} layout="vertical" onFinish={handleSaveSettings}>
            <Row gutter={[24, 8]}>
              <Col xs={24} sm={12}>
                <Form.Item label="公司名称" name="company_name">
                  <Input prefix={<GlobalOutlined style={{ color: '#bfbfbf' }} />} placeholder="请输入公司名称" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="联系邮箱" name="contact_email">
                  <Input prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} placeholder="请输入联系邮箱" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="联系电话" name="contact_phone">
                  <Input prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />} placeholder="请输入联系电话" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="公司地址" name="company_address">
                  <Input prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />} placeholder="请输入公司地址" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="系统描述" name="system_description">
                  <Input.TextArea rows={3} placeholder="请输入系统描述" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>
            <Divider style={{ margin: '16px 0' }} />
            <Space size="middle">
              <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />} style={{ borderRadius: 8 }}>
                保存信息
              </Button>
              <Button onClick={() => fetchSettings()} icon={<ReloadOutlined />} style={{ borderRadius: 8 }}>
                重置
              </Button>
            </Space>
          </Form>
        </Card>
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

  /** 渲染当前Tab内容 */
  const renderContent = () => {
    switch (activeMenu) {
      case 'general':
        return renderGeneralSettings();
      case 'appearance':
        return renderAppearanceSettings();
      case 'about':
        return renderAboutPage();
      default:
        return renderGeneralSettings();
    }
  };

  const menuItems = [
    { key: 'general', icon: <GlobalOutlined />, label: '基本设置', description: '站点信息、安全设置' },
    { key: 'appearance', icon: <BgColorsOutlined />, label: '外观设置', description: '主题颜色' },
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
    </div>
  );
};

export default SystemSettings;
