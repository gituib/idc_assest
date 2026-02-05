import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography, Divider, Space, Alert } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';

const { Title, Text } = Typography;

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

  const onFinishLogin = async (values) => {
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

  const onFinishUnlock = async (values) => {
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

  const onFinishRegister = async (values) => {
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
        realName: values.realName
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

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6B8DD6 100%)',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden'
  };

  const backgroundDecorationStyle = {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: '0.3'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: isFirstUser ? 480 : 420,
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15)',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.3)'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '32px',
    paddingTop: '8px'
  };

  const iconContainerStyle = {
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)'
  };

  const titleStyle = {
    fontSize: '26px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px'
  };

  const subtitleStyle = {
    fontSize: '14px',
    color: '#8c8c8c'
  };

  const formStyle = {
    marginTop: '24px'
  };

  const inputStyle = {
    borderRadius: '8px',
    height: '48px',
    border: '1px solid #e8e8e8'
  };

  const submitButtonStyle = {
    width: '100%',
    height: '48px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s ease'
  };

  const footerStyle = {
    textAlign: 'center',
    marginTop: '24px',
    paddingBottom: '16px'
  };

  const toggleButtonStyle = {
    color: '#667eea',
    fontWeight: '500',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'all 0.3s ease'
  };

  const inputPrefixStyle = {
    color: '#667eea',
    fontSize: '18px'
  };

  return (
    <div style={containerStyle}>
      <div style={{
        ...backgroundDecorationStyle,
        width: '400px',
        height: '400px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        top: '-100px',
        right: '-100px'
      }} />
      <div style={{
        ...backgroundDecorationStyle,
        width: '300px',
        height: '300px',
        background: 'linear-gradient(135deg, #764ba2 0%, #6B8DD6 100%)',
        bottom: '-50px',
        left: '-50px'
      }} />

      <Card style={cardStyle}>
        <div style={headerStyle}>
          <div style={iconContainerStyle}>
            <RobotOutlined style={{ fontSize: '40px', color: '#fff' }} />
          </div>
          <Title level={2} style={titleStyle}>
            {isFirstUser ? '创建管理员账户' : unlockMode ? '账户解锁' : 'IDC设备管理系统'}
          </Title>
          <Text style={subtitleStyle}>
            {isFirstUser ? '首次使用，请创建系统管理员账户' : 
             unlockMode ? '输入账户信息以解锁账户' : '安全登录您的账户'}
          </Text>
        </div>

        {isFirstUser && (
          <Alert
            message="欢迎使用IDC设备管理系统"
            description="您是第一个用户，系统将自动为您分配管理员权限。"
            type="success"
            showIcon
            style={{ marginBottom: '24px', borderRadius: '8px' }}
          />
        )}

        <Form
          name={unlockMode ? 'unlock' : registerMode ? 'register' : 'login'}
          size="large"
          onFinish={unlockMode ? onFinishUnlock : registerMode ? onFinishRegister : onFinishLogin}
          style={formStyle}
        >
          {registerMode ? (
            <>
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, max: 20, message: '用户名长度必须在3-20个字符之间' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
                ]}
              >
                <Input
                  prefix={<UserOutlined style={inputPrefixStyle} />}
                  placeholder="用户名"
                  style={inputStyle}
                />
              </Form.Item>

              <Form.Item
                name="realName"
                rules={[{ required: true, message: '请输入真实姓名' }]}
              >
                <Input
                  prefix={<SafetyCertificateOutlined style={inputPrefixStyle} />}
                  placeholder="真实姓名"
                  style={inputStyle}
                />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input
                  prefix={<MailOutlined style={inputPrefixStyle} />}
                  placeholder="邮箱"
                  style={inputStyle}
                />
              </Form.Item>

              <Form.Item
                name="phone"
              >
                <Input
                  prefix={<PhoneOutlined style={inputPrefixStyle} />}
                  placeholder="手机号（可选）"
                  style={inputStyle}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码长度不能少于6个字符' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={inputPrefixStyle} />}
                  placeholder="密码"
                  style={inputStyle}
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
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
                  prefix={<LockOutlined style={inputPrefixStyle} />}
                  placeholder="确认密码"
                  style={inputStyle}
                />
              </Form.Item>
            </>
          ) : unlockMode ? (
            <>
              <Alert
                message="账户解锁说明"
                description="当您的账户连续5次登录失败后会被锁定，请输入正确的用户名和密码进行解锁。"
                type="info"
                showIcon
                style={{ marginBottom: '24px', borderRadius: '8px' }}
              />
              
              <Form.Item
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input
                  prefix={<UserOutlined style={inputPrefixStyle} />}
                  placeholder="用户名"
                  style={inputStyle}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={inputPrefixStyle} />}
                  placeholder="密码"
                  style={inputStyle}
                />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input
                  prefix={<UserOutlined style={inputPrefixStyle} />}
                  placeholder="用户名"
                  style={inputStyle}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={inputPrefixStyle} />}
                  placeholder="密码"
                  style={inputStyle}
                />
              </Form.Item>
            </>
          )}

          <Form.Item style={{ marginBottom: '16px', marginTop: '24px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={submitButtonStyle}
            >
              {registerMode ? '立即注册' : unlockMode ? '解 锁' : '登 录'}
            </Button>
          </Form.Item>
        </Form>

        {!isFirstUser && (
          <div style={footerStyle}>
            <Divider plain>
              <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>其他方式</Text>
            </Divider>
            <Space split={<Divider type="vertical" />}>
              {unlockMode ? (
                <>
                  <Button
                    type="link"
                    size="small"
                    style={toggleButtonStyle}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(102, 126, 234, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                    }}
                    onClick={() => setUnlockMode(false)}
                  >
                    返回登录
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="link"
                    size="small"
                    style={toggleButtonStyle}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(102, 126, 234, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                    }}
                    onClick={() => setRegisterMode(!registerMode)}
                  >
                    {registerMode ? '已有账户？去登录' : '注册新账户'}
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    style={toggleButtonStyle}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(102, 126, 234, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                    }}
                    onClick={() => setUnlockMode(true)}
                  >
                    账户解锁
                  </Button>
                </>
              )}
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Login;
