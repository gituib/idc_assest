import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Switch,
  Select,
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
} from 'antd';
import {
  SettingOutlined,
  GlobalOutlined,
  BgColorsOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  ClockCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  ReloadOutlined,
  SaveOutlined,
  BellOutlined,
  CloudServerOutlined,
  UserOutlined,
  SecurityScanOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useConfig } from '../context/ConfigContext';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

const SystemSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [activeMenu, setActiveMenu] = useState('general');
  const [systemInfo, setSystemInfo] = useState(null);
  const [form] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);
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

  const fetchSystemInfo = async () => {
    try {
      const response = await axios.get('/api/system-settings/system/info');
      setSystemInfo(response.data);
    } catch (error) {
      console.error('获取系统信息失败');
    }
  };

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

      if ('frontend_port' in updates) {
        try {
          await axios.post('/api/system-settings/frontend/port/sync');
          const statusRes = await axios.get('/api/system-settings/frontend/status');
          const isProduction = statusRes.data.isProduction;

          if (isProduction) {
            Modal.info({
              title: '前端端口已修改（生产环境）',
              content: (
                <div>
                  <p>
                    前端端口已从 <strong>{settings.frontend_port?.value}</strong> 更改为{' '}
                    <strong>{updates.frontend_port}</strong>
                  </p>
                  <Alert
                    message="请手动更新服务器配置"
                    description={
                      <div>
                        <p>生产环境由 Nginx 或其他服务器托管，请手动更新服务器配置文件</p>
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                </div>
              ),
              okText: '知道了',
            });
          } else {
            Modal.confirm({
              title: '前端端口已修改',
              icon: <ExclamationCircleOutlined />,
              content: (
                <div>
                  <p>
                    前端端口已从 <strong>{settings.frontend_port?.value}</strong> 更改为{' '}
                    <strong>{updates.frontend_port}</strong>
                  </p>
                  <p>是否立即重启前端服务以应用新端口？</p>
                </div>
              ),
              okText: '立即重启',
              cancelText: '稍后手动重启',
              onOk: async () => {
                const newPort = updates.frontend_port;
                const newUrl = `http://localhost:${newPort}`;
                Modal.success({
                  title: '正在重启前端服务',
                  content: (
                    <div>
                      <p>前端服务正在重启，新端口：<strong>{newPort}</strong></p>
                      <p>页面将在3秒后自动跳转到新地址...</p>
                    </div>
                  ),
                  okText: '立即跳转',
                  closable: false,
                  maskClosable: false,
                  onOk: () => {
                    window.location.href = newUrl;
                  },
                });
                setTimeout(async () => {
                  try {
                    await axios.post('/api/system-settings/frontend/restart', {}, { timeout: 5000 });
                  } catch (error) {
                    console.log('重启请求已发送，服务正在重启...');
                  }
                }, 1000);
                setTimeout(() => {
                  window.location.href = newUrl;
                }, 3000);
              },
            });
          }
        } catch (syncError) {
          console.warn('同步前端端口配置失败:', syncError);
          message.warning('端口配置已保存，但同步到配置文件失败');
        }
      } else {
        message.success('设置保存成功');
      }

      fetchSettings();
      await reloadConfig();
    } catch (error) {
      message.error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSetting = key => {
    Modal.confirm({
      title: '确认重置',
      icon: <ExclamationCircleOutlined />,
      content: `确定要将 "${settings[key]?.description || key}" 重置为默认值吗？`,
      onOk: async () => {
        try {
          await axios.post(`/api/system-settings/reset/${key}`);
          message.success('重置成功');
          fetchSettings();
          await reloadConfig();
        } catch (error) {
          message.error('重置失败');
        }
      },
    });
  };

  const renderFormItem = (key, data) => {
    if (!data.isEditable) {
      return (
        <Form.Item key={key} label={data.description || key} name={key}>
          <Input disabled suffix={<LockOutlined />} />
        </Form.Item>
      );
    }

    switch (data.type) {
      case 'boolean':
        return (
          <Form.Item key={key} label={data.description || key} name={key} valuePropName="checked">
            <Switch />
          </Form.Item>
        );
      case 'number':
        const isPortField = key === 'frontend_port';
        return (
          <Form.Item
            key={key}
            label={data.description || key}
            name={key}
            rules={[
              { required: false, message: `请输入${data.description || key}` },
              ...(isPortField
                ? [
                    {
                      type: 'number',
                      min: 1,
                      max: 65535,
                      message: '端口号必须在 1-65535 之间',
                      transform: value => Number(value),
                    },
                  ]
                : []),
            ]}
          >
            <Input
              type="number"
              style={{ width: '100%' }}
              min={isPortField ? 1 : undefined}
              max={isPortField ? 65535 : undefined}
            />
          </Form.Item>
        );
      case 'select':
        const options = getSelectOptions(key);
        return (
          <Form.Item key={key} label={data.description || key} name={key}>
            <Select>
              {options.map(opt => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );
      default:
        return (
          <Form.Item key={key} label={data.description || key} name={key}>
            <Input />
          </Form.Item>
        );
    }
  };

  const getSelectOptions = key => {
    const optionsMap = {
      timezone: [
        { value: 'Asia/Shanghai', label: '亚洲/上海 (UTC+8)' },
        { value: 'Asia/Beijing', label: '亚洲/北京 (UTC+8)' },
        { value: 'America/New_York', label: '美洲/纽约 (UTC-5)' },
        { value: 'Europe/London', label: '欧洲/伦敦 (UTC+0)' },
        { value: 'UTC', label: 'UTC (UTC+0)' },
      ],
      date_format: [
        { value: 'YYYY-MM-DD', label: '2024-01-01' },
        { value: 'YYYY/MM/DD', label: '2024/01/01' },
        { value: 'DD/MM/YYYY', label: '01/01/2024' },
        { value: 'MM/DD/YYYY', label: '01/01/2024' },
      ],
      primary_color: [
        { value: '#667eea', label: '蓝色 (#667eea)' },
        { value: '#764ba2', label: '紫色 (#764ba2)' },
        { value: '#f093fb', label: '粉色 (#f093fb)' },
        { value: '#4facfe', label: '浅蓝色 (#4facfe)' },
        { value: '#43e97b', label: '绿色 (#43e97b)' },
        { value: '#fa709a', label: '红色 (#fa709a)' },
        { value: '#fee140', label: '黄色 (#fee140)' },
        { value: '#00b4db', label: '青色 (#00b4db)' },
        { value: '#0083b0', label: '深蓝色 (#0083b0)' },
        { value: '#fcb045', label: '橙色 (#fcb045)' },
      ],
      secondary_color: [
        { value: '#764ba2', label: '紫色 (#764ba2)' },
        { value: '#667eea', label: '蓝色 (#667eea)' },
        { value: '#4facfe', label: '浅蓝色 (#4facfe)' },
        { value: '#43e97b', label: '绿色 (#43e97b)' },
        { value: '#fa709a', label: '红色 (#fa709a)' },
        { value: '#fee140', label: '黄色 (#fee140)' },
        { value: '#00b4db', label: '青色 (#00b4db)' },
        { value: '#0083b0', label: '深蓝色 (#0083b0)' },
        { value: '#fcb045', label: '橙色 (#fcb045)' },
        { value: '#f093fb', label: '粉色 (#f093fb)' },
      ],
      table_row_height: [
        { value: 'small', label: '紧凑 (Small)' },
        { value: 'default', label: '默认 (Default)' },
        { value: 'middle', label: '中等 (Middle)' },
        { value: 'large', label: '宽松 (Large)' },
      ],
      dark_mode: [
        { value: 'false', label: '关闭' },
        { value: 'true', label: '开启' },
      ],
      compact_mode: [
        { value: 'false', label: '关闭' },
        { value: 'true', label: '开启' },
      ],
      animation_enabled: [
        { value: 'false', label: '关闭' },
        { value: 'true', label: '开启' },
      ],
      sidebar_collapsed: [
        { value: 'false', label: '展开' },
        { value: 'true', label: '折叠' },
      ],
    };
    return optionsMap[key] || [];
  };

  const settingGroups = {
    general: [
      {
        title: '站点信息',
        icon: <GlobalOutlined />,
        description: '配置系统基本信息和站点标识',
        keys: ['site_name', 'site_logo'],
      },
      {
        title: '时间设置',
        icon: <ClockCircleOutlined />,
        description: '设置系统时区和日期显示格式',
        keys: ['timezone', 'date_format'],
      },
      {
        title: '安全设置',
        icon: <SafetyCertificateOutlined />,
        description: '配置登录安全策略和维护模式',
        keys: ['idle_timeout', 'max_login_attempts', 'maintenance_mode'],
      },
    ],
    appearance: [
      {
        title: '主题颜色',
        icon: <BgColorsOutlined />,
        description: '自定义系统主题配色方案',
        keys: ['primary_color', 'secondary_color'],
      },
      {
        title: '界面布局',
        icon: <DesktopOutlined />,
        description: '调整界面显示密度和布局方式',
        keys: ['compact_mode', 'sidebar_collapsed', 'table_row_height'],
      },
      {
        title: '动画效果',
        icon: <ThunderboltOutlined />,
        description: '控制界面动画和过渡效果',
        keys: ['animation_enabled'],
      },
    ],
  };

  const menuItems = [
    {
      key: 'general',
      icon: <GlobalOutlined />,
      label: '全局配置',
      description: '站点信息、时间、安全设置',
    },
    {
      key: 'appearance',
      icon: <BgColorsOutlined />,
      label: '外观设置',
      description: '主题颜色、界面布局',
    },
    {
      key: 'about',
      icon: <InfoCircleOutlined />,
      label: '关于系统',
      description: '系统信息、版本详情',
    },
  ];

  const renderSettingGroup = (group) => {
    // 根据分组决定布局
    const isSiteInfo = group.title === '站点信息';
    const isTimeSetting = group.title === '时间设置';
    const isSecurity = group.title === '安全设置';

    return (
      <Card
        key={group.title}
        style={{
          marginBottom: 24,
          borderRadius: 12,
          border: '1px solid #e8e8e8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
        bodyStyle={{ padding: '24px' }}
      >
        {/* 居中的标题区 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}>
            <span style={{ color: '#fff', fontSize: 24 }}>{group.icon}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#262626', marginBottom: 6 }}>
            {group.title}
          </div>
          <div style={{ fontSize: 14, color: '#666' }}>
            {group.description}
          </div>
        </div>

        <Divider style={{ margin: '0 0 24px 0' }} />

        {/* 表单内容区 */}
        {isSiteInfo && (
          <Row gutter={[32, 16]}>
            <Col xs={24} md={12}>
              <Form.Item 
                label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>网站名称</span>} 
                name="site_name"
                style={{ marginBottom: 0 }}
              >
                <Input 
                  placeholder="请输入网站名称" 
                  style={{ height: 40, borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item 
                label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>网站Logo URL</span>} 
                name="site_logo"
                style={{ marginBottom: 0 }}
              >
                <Input 
                  placeholder="请输入Logo URL" 
                  style={{ height: 40, borderRadius: 8 }}
                  suffix={
                    <Button type="link" size="small" style={{ padding: 0 }}>
                      预览
                    </Button>
                  }
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {isTimeSetting && (
          <Row gutter={[32, 16]}>
            <Col xs={24} md={12}>
              <Form.Item 
                label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>时区设置</span>} 
                name="timezone"
                style={{ marginBottom: 0 }}
              >
                <Select 
                  placeholder="请选择时区" 
                  style={{ width: '100%', height: 40 }}
                  dropdownStyle={{ borderRadius: 8 }}
                >
                  {getSelectOptions('timezone').map(opt => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item 
                label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>日期格式</span>} 
                name="date_format"
                style={{ marginBottom: 0 }}
              >
                <Select 
                  placeholder="请选择日期格式" 
                  style={{ width: '100%', height: 40 }}
                  dropdownStyle={{ borderRadius: 8 }}
                >
                  {getSelectOptions('date_format').map(opt => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        )}

        {isSecurity && (
          <Row gutter={[32, 16]} align="middle">
            <Col xs={24} md={8}>
              <Form.Item 
                label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>用户空闲超时时间</span>} 
                name="idle_timeout"
                style={{ marginBottom: 0 }}
              >
                <Input 
                  type="number" 
                  placeholder="请输入超时时间" 
                  style={{ height: 40, borderRadius: 8 }}
                  suffix={<span style={{ color: '#999' }}>分钟</span>}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item 
                label={<span style={{ fontSize: 14, color: '#262626', fontWeight: 500 }}>最大登录尝试次数</span>} 
                name="max_login_attempts"
                style={{ marginBottom: 0 }}
              >
                <Input 
                  type="number" 
                  placeholder="请输入次数" 
                  style={{ height: 40, borderRadius: 8 }}
                  suffix={<span style={{ color: '#999' }}>次</span>}
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
                <Tooltip title="开启后所有用户将无法登录">
                  <Switch 
                    checkedChildren="开启" 
                    unCheckedChildren="关闭"
                    style={{ marginTop: 8 }}
                  />
                </Tooltip>
              </Form.Item>
            </Col>
          </Row>
        )}

        {!isSiteInfo && !isTimeSetting && !isSecurity && (
          <Row gutter={[32, 16]}>
            {group.keys.map(key => {
              const settingData = { ...settings[key] };
              if (key === 'timezone' || key === 'date_format') {
                settingData.type = 'select';
              }
              if (key === 'primary_color' || key === 'secondary_color') {
                settingData.type = 'select';
              }
              return (
                <Col xs={24} md={12} lg={8} key={key}>
                  {renderFormItem(key, settingData)}
                </Col>
              );
            })}
          </Row>
        )}
      </Card>
    );
  };

  // 底部固定操作栏
  const renderFixedFooter = (onSubmit) => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#fff',
      borderTop: '1px solid #e8e8e8',
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'center',
      gap: 16,
      boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
      zIndex: 10,
      marginTop: 24,
    }}>
      <Button
        type="primary"
        htmlType="submit"
        loading={saving}
        icon={<SaveOutlined />}
        size="large"
        style={{ 
          borderRadius: 8, 
          minWidth: 140,
          height: 44,
          fontSize: 15,
          fontWeight: 500,
        }}
      >
        保存设置
      </Button>
      <Button
        onClick={() => fetchSettings()}
        icon={<ReloadOutlined />}
        size="large"
        style={{ 
          borderRadius: 8, 
          minWidth: 120,
          height: 44,
          fontSize: 15,
        }}
      >
        重置表单
      </Button>
    </div>
  );

  const renderGeneralSettings = () => {
    return (
      <Form form={form} layout="vertical" onFinish={handleSaveSettings}>
        <div style={{ paddingBottom: 80 }}>
          {settingGroups.general.map(group => renderSettingGroup(group))}
        </div>
        {renderFixedFooter()}
      </Form>
    );
  };

  const renderAppearanceSettings = () => {
    return (
      <Form form={form} layout="vertical" onFinish={handleSaveSettings}>
        <div style={{ paddingBottom: 80 }}>
          <Alert
            message="主题颜色设置"
            description="修改主题颜色后需要刷新页面才能生效。建议选择对比度适中的颜色组合。"
            type="info"
            showIcon
            style={{ marginBottom: 24, borderRadius: 12 }}
          />
          {settingGroups.appearance.map(group => renderSettingGroup(group))}
        </div>
        {renderFixedFooter()}
      </Form>
    );
  };

  const renderAboutPage = () => {
    return (
      <div>
        <Card
          style={{
            marginBottom: 16,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <Row gutter={[20, 20]} align="middle">
            <Col xs={24} sm={6} md={5}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
                <div
                  style={{
                    textAlign: 'center',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                    padding: '16px 12px',
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a', marginBottom: 2 }}>
                    {systemInfo.statistics?.devices || 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>设备总数</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div
                  style={{
                    textAlign: 'center',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                    padding: '16px 12px',
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff', marginBottom: 2 }}>
                    {systemInfo.statistics?.racks || 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>机柜总数</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div
                  style={{
                    textAlign: 'center',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)',
                    padding: '16px 12px',
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#722ed1', marginBottom: 2 }}>
                    {systemInfo.statistics?.rooms || 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>机房总数</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div
                  style={{
                    textAlign: 'center',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)',
                    padding: '16px 12px',
                  }}
                >
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
                <Text style={{ fontSize: 13 }}>{systemInfo.system?.uptime
                  ? `${Math.floor(systemInfo.system.uptime / 3600)}小时${Math.floor((systemInfo.system.uptime % 3600) / 60)}分钟`
                  : '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="内存使用">
                <Text style={{ fontSize: 13 }}>{systemInfo.system?.memoryUsage
                  ? `${(systemInfo.system.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`
                  : '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="系统时间">
                <Text style={{ fontSize: 13 }}>{systemInfo.timestamp
                  ? new Date(systemInfo.timestamp).toLocaleString('zh-CN')
                  : '-'}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

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
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
                style={{ borderRadius: 8 }}
              >
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

  // 顶部导航栏菜单
  const renderTopNav = () => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center',
      gap: '4px',
      flexWrap: 'nowrap',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}>
      {menuItems.map(item => (
        <div
          key={item.key}
          onClick={() => setActiveMenu(item.key)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 16px',
            borderRadius: 20,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: activeMenu === item.key ? 'rgba(255,255,255,0.25)' : 'transparent',
            color: '#fff',
            whiteSpace: 'nowrap',
            fontSize: 14,
            fontWeight: activeMenu === item.key ? 600 : 400,
          }}
          onMouseEnter={(e) => {
            if (activeMenu !== item.key) {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeMenu !== item.key) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <span style={{ marginRight: 6, fontSize: 16 }}>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );

  // 移动端下拉菜单
  const renderMobileNav = () => (
    <Select
      value={activeMenu}
      onChange={(value) => setActiveMenu(value)}
      style={{ width: 140 }}
      bordered={false}
      dropdownStyle={{ borderRadius: 8 }}
      suffixIcon={<MenuUnfoldOutlined style={{ color: '#fff' }} />}
    >
      {menuItems.map(item => (
        <Option key={item.key} value={item.key}>
          <Space>
            {item.icon}
            {item.label}
          </Space>
        </Option>
      ))}
    </Select>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部固定导航栏 */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <div style={{ maxWidth: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space align="center">
            <SettingOutlined style={{ fontSize: 20, color: '#fff' }} />
            <Title level={4} style={{ margin: 0, color: '#fff', fontSize: 18 }}>系统设置</Title>
          </Space>
          
          {/* 桌面端导航 */}
          {!isMobile && renderTopNav()}
          
          {/* 移动端导航 */}
          {isMobile && renderMobileNav()}
        </div>
      </div>

      {/* 主内容区 - 平铺填充 */}
      <div style={{ flex: 1, padding: '16px 24px' }}>
        <div style={{ maxWidth: '100%' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
