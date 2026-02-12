import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Typography,
  Divider,
  Space,
  Alert,
  Row,
  Col,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  CloudServerOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';

const { Title, Text, Paragraph } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const [unlockMode, setUnlockMode] = useState(false);
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
        if (!response.data.hasAdmin) {
          setRegisterMode(true);
        }
      }
    } catch (error) {
      console.error('检查用户状态失败:', error);
    }
  };

  const onFinishLogin = async values => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password);
      if (result.success) {
        message.success('登录成功');
        navigate('/');
      } else {
        if (result.code === 'PENDING_APPROVAL') {
          message.warning('账户待审核，请联系管理员激活');
        } else {
          message.error(result.message || '登录失败');
        }
      }
    } catch (error) {
      message.error(error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const onFinishUnlock = async values => {
    setLoading(true);
    try {
      const response = await authAPI.unlock(values);
      if (response.success) {
        message.success('解锁成功，请重新登录');
        setUnlockMode(false);
      } else {
        message.error(response.message || '解锁失败');
      }
    } catch (error) {
      message.error(error || '解锁失败');
    } finally {
      setLoading(false);
    }
  };

  const onFinishRegister = async values => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

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
        if (result.isFirstUser) {
          message.success('注册成功，已为您创建管理员账户');
          navigate('/');
        } else if (result.pendingApproval) {
          message.success('注册成功，请等待管理员审核');
          setRegisterMode(false);
        } else {
          message.success('注册成功');
          navigate('/');
        }
      } else {
        message.error(result.message || '注册失败');
      }
    } catch (error) {
      message.error(error || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  // 左侧宣传区域组件
  const LeftPanel = () => (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景装饰 */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          top: '-200px',
          left: '-200px',
          filter: 'blur(60px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          bottom: '-100px',
          right: '-100px',
          filter: 'blur(40px)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '40px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        >
          <CloudServerOutlined style={{ fontSize: '40px', color: '#fff' }} />
        </div>

        <Title
          level={1}
          style={{
            color: '#fff',
            fontSize: '48px',
            fontWeight: 700,
            marginBottom: '24px',
            lineHeight: 1.2,
          }}
        >
          IDC设备
          <br />
          管理系统
        </Title>

        <Paragraph
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: '18px',
            lineHeight: 1.8,
            maxWidth: '480px',
            marginBottom: '48px',
          }}
        >
          专业的数据中心设备管理平台，提供机房、机柜、设备的全生命周期管理，
          助力企业实现高效的IT资产管理。
        </Paragraph>

        <Row gutter={[24, 24]}>
          <Col xs={8} sm={8} md={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>99.9%</div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>系统稳定性</div>
            </div>
          </Col>
          <Col xs={8} sm={8} md={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>24/7</div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>全天候监控</div>
            </div>
          </Col>
          <Col xs={8} sm={8} md={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>100%</div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>数据安全</div>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );

  // 获取标题和副标题
  const getHeaderContent = () => {
    if (isFirstUser) {
      return {
        title: '创建管理员账户',
        subtitle: '首次使用，请创建系统管理员账户',
      };
    }
    if (unlockMode) {
      return {
        title: '账户解锁',
        subtitle: '输入账户信息以解锁账户',
      };
    }
    if (registerMode) {
      return {
        title: '注册新账户',
        subtitle: '填写信息完成账户注册',
      };
    }
    return {
      title: '欢迎回来',
      subtitle: '请登录您的账户以继续',
    };
  };

  const headerContent = getHeaderContent();

  return (
    <Row style={{ minHeight: '100vh', overflow: 'hidden' }}>
      {/* 左侧区域 - 桌面端显示 */}
      <Col
        xs={0}
        sm={0}
        md={0}
        lg={12}
        xl={14}
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6B8DD6 100%)',
        }}
      >
        <LeftPanel />
      </Col>

      {/* 右侧登录区域 */}
      <Col
        xs={24}
        sm={24}
        md={24}
        lg={12}
        xl={10}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: '24px',
          position: 'relative',
        }}
      >
        {/* 移动端背景 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '200px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'none',
          }}
          className="mobile-bg"
        />

        <Card
          style={{
            width: '100%',
            maxWidth: registerMode ? 520 : 440,
            borderRadius: '24px',
            boxShadow: '0 25px 80px rgba(0,0,0,0.15), 0 10px 30px rgba(0,0,0,0.1)',
            background: '#fff',
            border: 'none',
            position: 'relative',
            zIndex: 1,
          }}
          bodyStyle={{ padding: '48px' }}
        >
          {/* 返回按钮 */}
          {(registerMode || unlockMode) && !isFirstUser && (
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                setRegisterMode(false);
                setUnlockMode(false);
              }}
              style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                color: '#667eea',
                padding: '4px 8px',
              }}
            >
              返回
            </Button>
          )}

          {/* 头部 */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.35)',
              }}
            >
              <CloudServerOutlined style={{ fontSize: '32px', color: '#fff' }} />
            </div>
            <Title
              level={3}
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '8px',
              }}
            >
              {headerContent.title}
            </Title>
            <Text style={{ fontSize: '15px', color: '#64748b' }}>
              {headerContent.subtitle}
            </Text>
          </div>

          {/* 首次使用提示 */}
          {isFirstUser && (
            <Alert
              message="欢迎使用IDC设备管理系统"
              description="您是第一个用户，系统将自动为您分配管理员权限。"
              type="success"
              showIcon
              style={{ marginBottom: '24px', borderRadius: '12px' }}
            />
          )}

          {/* 解锁模式提示 */}
          {unlockMode && (
            <Alert
              message="账户解锁说明"
              description="当您的账户连续5次登录失败后会被锁定，请输入正确的用户名和密码进行解锁。"
              type="info"
              showIcon
              style={{ marginBottom: '24px', borderRadius: '12px' }}
            />
          )}

          {/* 表单 */}
          <Form
            name={unlockMode ? 'unlock' : registerMode ? 'register' : 'login'}
            size="large"
            onFinish={unlockMode ? onFinishUnlock : registerMode ? onFinishRegister : onFinishLogin}
            layout="vertical"
            requiredMark={false}
          >
            {registerMode ? (
              <>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="username"
                      label="用户名"
                      rules={[
                        { required: true, message: '请输入用户名' },
                        { min: 3, max: 20, message: '用户名长度必须在3-20个字符之间' },
                        { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined style={{ color: '#94a3b8', fontSize: '18px' }} />}
                        placeholder="请输入用户名"
                        style={{ borderRadius: '12px', height: '48px' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="realName"
                      label="真实姓名"
                      rules={[{ required: true, message: '请输入真实姓名' }]}
                    >
                      <Input
                        prefix={<SafetyCertificateOutlined style={{ color: '#94a3b8', fontSize: '18px' }} />}
                        placeholder="请输入真实姓名"
                        style={{ borderRadius: '12px', height: '48px' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="email"
                      label="邮箱"
                      rules={[
                        { required: true, message: '请输入邮箱' },
                        { type: 'email', message: '请输入有效的邮箱地址' },
                      ]}
                    >
                      <Input
                        prefix={<MailOutlined style={{ color: '#94a3b8', fontSize: '18px' }} />}
                        placeholder="请输入邮箱"
                        style={{ borderRadius: '12px', height: '48px' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="phone" label="手机号">
                      <Input
                        prefix={<PhoneOutlined style={{ color: '#94a3b8', fontSize: '18px' }} />}
                        placeholder="请输入手机号（可选）"
                        style={{ borderRadius: '12px', height: '48px' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="password"
                      label="密码"
                      rules={[
                        { required: true, message: '请输入密码' },
                        { min: 6, message: '密码长度不能少于6个字符' },
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined style={{ color: '#94a3b8', fontSize: '18px' }} />}
                        placeholder="请输入密码"
                        style={{ borderRadius: '12px', height: '48px' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
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
                        prefix={<LockOutlined style={{ color: '#94a3b8', fontSize: '18px' }} />}
                        placeholder="请再次输入密码"
                        style={{ borderRadius: '12px', height: '48px' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            ) : (
              <>
                <Form.Item
                  name="username"
                  label="用户名"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: '#94a3b8', fontSize: '18px' }} />}
                    placeholder="请输入用户名"
                    style={{ borderRadius: '12px', height: '52px' }}
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="密码"
                  rules={[{ required: true, message: '请输入密码' }]}
                  style={{ marginBottom: '8px' }}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#94a3b8', fontSize: '18px' }} />}
                    placeholder="请输入密码"
                    style={{ borderRadius: '12px', height: '52px' }}
                  />
                </Form.Item>

                {!registerMode && !unlockMode && (
                  <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                    <Button type="link" style={{ color: '#667eea', padding: 0 }}>
                      忘记密码？
                    </Button>
                  </div>
                )}
              </>
            )}

            <Form.Item style={{ marginTop: '32px', marginBottom: '16px' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: '52px',
                  fontSize: '16px',
                  fontWeight: 600,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.35)',
                }}
              >
                {registerMode ? '立即注册' : unlockMode ? '立即解锁' : '登 录'}
              </Button>
            </Form.Item>
          </Form>

          {/* 底部切换 */}
          {!isFirstUser && (
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              {!unlockMode && !registerMode && (
                <Space split={<Divider type="vertical" />} size="large">
                  <Button
                    type="link"
                    onClick={() => setRegisterMode(true)}
                    style={{ color: '#64748b', fontWeight: 500 }}
                  >
                    注册新账户
                  </Button>
                  <Button
                    type="link"
                    onClick={() => setUnlockMode(true)}
                    style={{ color: '#64748b', fontWeight: 500 }}
                  >
                    账户解锁
                  </Button>
                </Space>
              )}

              {(registerMode || unlockMode) && (
                <Text style={{ color: '#64748b' }}>
                  已有账户？{' '}
                  <Button
                    type="link"
                    onClick={() => {
                      setRegisterMode(false);
                      setUnlockMode(false);
                    }}
                    style={{ color: '#667eea', fontWeight: 600, padding: 0 }}
                  >
                    立即登录
                  </Button>
                </Text>
              )}
            </div>
          )}
        </Card>

        {/* 移动端底部版权 */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '13px',
            display: 'none',
          }}
          className="mobile-footer"
        >
          © 2024 IDC设备管理系统. All rights reserved.
        </div>
      </Col>

      {/* 响应式样式 */}
      <style>{`
        @media (max-width: 991px) {
          .mobile-bg {
            display: block !important;
          }
          .mobile-footer {
            display: block !important;
          }
        }
        @media (max-width: 575px) {
          .ant-card-body {
            padding: 32px 24px !important;
          }
        }
      `}</style>
    </Row>
  );
};

export default Login;
