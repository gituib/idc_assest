import React, { useState, useEffect } from 'react';
import { version as appVersion } from '../../package.json';
import {
  Form,
  Input,
  Button,
  message,
  Typography,
  Alert,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  CloudServerOutlined,
  ArrowLeftOutlined,
  DashboardOutlined,
  SecurityScanOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const { login, register, checkAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkIsFirstUser();
  }, []);

  const checkIsFirstUser = async () => {
    try {
      const response = await checkAdmin();
      if (response.success) {
        setIsFirstUser(!response.data.hasAdmin);
      }
    } catch (error) {
      console.error('检查管理员状态失败:', error);
    }
  };

  const onFinishLogin = async (values) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password);
      if (result.success) {
        message.success('登录成功');
        navigate('/dashboard');
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const onFinishRegister = async (values) => {
    setLoading(true);
    try {
      const result = await register({
        username: values.username,
        password: values.password,
        email: values.email,
        phone: values.phone,
        realName: values.realName,
      });
      if (result.success) {
        message.success(result.isFirstUser ? '管理员账号创建成功' : '注册成功，请等待管理员审核');
        if (result.isFirstUser) {
          setIsFirstUser(false);
          navigate('/dashboard');
        } else {
          setRegisterMode(false);
        }
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <DashboardOutlined />, title: '实时监控', desc: '3D可视化机房全景', color: '#14b8a6' },
    { icon: <SecurityScanOutlined />, title: '安全可靠', desc: '多重权限防护', color: '#3b82f6' },
    { icon: <ApiOutlined />, title: '极速响应', desc: '毫秒级数据采集', color: '#8b5cf6' },
  ];

  const stats = [
    { value: '99.9%', label: '可用性', icon: '↑' },
    { value: '24/7', label: '监控', icon: '●' },
    { value: '<100ms', label: '响应', icon: '⚡' },
  ];

  const RackVisual = () => (
    <div className="rack-visual">
      <div className="rack-visual__header">
        <span className="rack-visual__title">机房概览</span>
        <span className="rack-visual__badge">3 在线</span>
      </div>
      <div className="rack-visual__body">
        {[1, 2, 3].map((rack) => (
          <div key={rack} className="rack-unit" style={{ animationDelay: `${rack * 0.1}s` }}>
            <div className="rack-unit__header">
              <span className="rack-unit__id">{rack.toString().padStart(2, '0')}</span>
              <span className="rack-unit__status" />
            </div>
            <div className="rack-unit__slots">
              {[1, 2, 3, 4, 5].map((slot) => (
                <div
                  key={slot}
                  className={`rack-unit__slot rack-unit__slot--${slot <= (4 - rack + 1) ? 'on' : 'off'}`}
                  style={{ animationDelay: `${(rack * 5 + slot) * 0.03}s` }}
                />
              ))}
            </div>
            <div className="rack-unit__load">
              <div className="rack-unit__load-bar" style={{ width: `${25 + rack * 18}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="login-container">
      <div className="login-bg-decoration">
        <div className="decoration-circle decoration-circle--1" />
        <div className="decoration-circle decoration-circle--2" />
        <div className="decoration-circle decoration-circle--3" />
        <div className="decoration-grid" />
        <div className="decoration-wave" />
      </div>

      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-card__brand">
            <div className="brand-header">
              <div className="brand-logo">
                <CloudServerOutlined />
                <div className="logo-pulse" />
              </div>
              <div className="brand-title-section">
                <h1 className="brand-title">
                  <span className="brand-title__main">IDC</span>
                  <span className="brand-title__sub">机柜管理系统</span>
                </h1>
                <p className="brand-desc">智能数据中心基础设施管理平台</p>
              </div>
            </div>

            <RackVisual />

            <div className="brand-stats">
              {stats.map((stat, index) => (
                <div key={index} className="stat-card">
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-label">{stat.label}</span>
                </div>
              ))}
            </div>

            <div className="brand-features">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="brand-feature"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div
                    className="feature-icon"
                    style={{ background: `linear-gradient(135deg, ${feature.color}15, ${feature.color}10)`, color: feature.color }}
                  >
                    {feature.icon}
                  </div>
                  <div className="feature-content">
                    <span className="feature-title">{feature.title}</span>
                    <span className="feature-desc">{feature.desc}</span>
                  </div>
                  <div className="feature-arrow">→</div>
                </div>
              ))}
            </div>

            <div className="brand-footer">
              <span className="footer-trust">
                <span className="trust-icon">🛡️</span>
                企业级安全认证
              </span>
              <span className="footer-version">v{appVersion}</span>
            </div>
          </div>

          <div className="login-card__divider" />

          <div className="login-card__form">
            <div className="form-header">
              <Title level={2} className="form-title">
                {isFirstUser ? '初始化系统' : '欢迎回来'}
              </Title>
              <Text className="form-subtitle">
                {isFirstUser 
                  ? '创建管理员账号以开始使用系统' 
                  : '请登录您的账号继续访问'}
              </Text>
            </div>

            {isFirstUser && (
              <Alert
                className="form-alert"
                message="系统初始化"
                description="首次使用需要创建管理员账号"
                type="info"
                showIcon
              />
            )}

            {registerMode && !isFirstUser && (
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => {
                  setRegisterMode(false);
                }}
                className="back-button"
              >
                返回登录
              </Button>
            )}

            <Form
              name={isFirstUser || registerMode ? 'register' : 'login'}
              layout="vertical"
              onFinish={isFirstUser ? onFinishRegister : (registerMode ? onFinishRegister : onFinishLogin)}
              size="large"
              className="login-form"
            >
              {registerMode && (
                <>
                  <Form.Item
                    name="realName"
                    label="真实姓名"
                    rules={[{ required: true, message: '请输入真实姓名' }]}
                  >
                    <Input
                      placeholder="请输入真实姓名"
                      className="login-input"
                      prefix={<UserOutlined className="input-icon" />}
                    />
                  </Form.Item>
                  <Form.Item
                    name="username"
                    label="用户名"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input
                      placeholder="请输入用户名"
                      className="login-input"
                      prefix={<UserOutlined className="input-icon" />}
                    />
                  </Form.Item>
                  <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[
                      { required: true, message: '请输入邮箱' },
                      { type: 'email', message: '请输入有效的邮箱地址' },
                    ]}
                  >
                    <Input
                      placeholder="请输入邮箱"
                      className="login-input"
                      prefix={<MailOutlined className="input-icon" />}
                    />
                  </Form.Item>
                  <Form.Item
                    name="phone"
                    label="手机号"
                    rules={[{ required: true, message: '请输入手机号' }]}
                  >
                    <Input
                      placeholder="请输入手机号"
                      className="login-input"
                      prefix={<PhoneOutlined className="input-icon" />}
                    />
                  </Form.Item>
                </>
              )}

              <Form.Item
                name="username"
                label={isFirstUser ? '管理员账号' : '用户名'}
                rules={[{ required: true, message: isFirstUser ? '请设置管理员账号' : '请输入用户名' }]}
              >
                <Input
                  prefix={<UserOutlined className="input-icon" />}
                  placeholder={isFirstUser ? '请设置管理员账号' : '请输入用户名'}
                  className="login-input"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={isFirstUser ? '管理员密码' : '密码'}
                rules={[
                  { required: true, message: isFirstUser ? '请设置管理员密码' : '请输入密码' },
                  { min: 6, message: '密码长度不能少于6位' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="input-icon" />}
                  placeholder={isFirstUser ? '请设置管理员密码' : '请输入密码'}
                  className="login-input"
                />
              </Form.Item>

              {(registerMode || isFirstUser) && (
                <Form.Item
                  name="confirmPassword"
                  label="确认密码"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: '请确认密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="input-icon" />}
                    placeholder="请确认密码"
                    className="login-input"
                  />
                </Form.Item>
              )}

              <Form.Item className="submit-item">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="submit-button"
                >
                  {isFirstUser ? '创建管理员' : (registerMode ? '立即注册' : '登 录')}
                </Button>
              </Form.Item>
            </Form>

            {!isFirstUser && !registerMode && (
              <div className="form-actions">
                <Button type="link" className="action-link" onClick={() => setRegisterMode(true)}>
                  <SafetyCertificateOutlined /> 立即注册
                </Button>
              </div>
            )}

            <div className="form-footer">
              <span>IDC Management System</span>
              <span className="footer-dot" />
              <span>v{appVersion}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;