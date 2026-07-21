import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Tag,
  Space,
  Typography,
  Alert,
  message,
  Row,
  Col,
  Tooltip,
  Progress,
} from 'antd';
import {
  MailOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  UserOutlined,
  LockOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { authAPI } from '../api';

const { Title, Text } = Typography;

/** 倒计时时长（秒） */
const COUNTDOWN_SECONDS = 60;

/**
 * 卡片头部（左对齐紧凑设计：图标 + 标题 + 描述 + 右侧状态/操作）
 * @param {Object} props
 * @param {React.ReactNode} props.icon - 头部图标
 * @param {string} props.title - 标题
 * @param {string} props.desc - 描述文字
 * @param {React.ReactNode} [props.extra] - 右侧额外内容（状态标签或操作按钮）
 * @param {string} [props.iconBg] - 图标背景（默认使用主色渐变）
 */
const SectionHeader = ({ icon, title, desc, extra, iconBg }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: iconBg || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 10px rgba(102, 126, 234, 0.25)',
      }}
    >
      {React.cloneElement(icon, { style: { color: '#fff', fontSize: 20 } })}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text strong style={{ fontSize: 17, color: '#0f172a', letterSpacing: '-0.01em' }}>{title}</Text>
        {extra}
      </div>
      {desc && (
        <Text style={{ fontSize: 13, display: 'block', marginTop: 2, color: '#64748b' }}>
          {desc}
        </Text>
      )}
    </div>
  </div>
);

/**
 * 账号设置页面
 * 当前能力：邮箱地址维护 + 邮箱验证（OTP 验证码）+ 通过邮箱验证码重置密码
 * 设计风格：Minimalism & Swiss Style（极简瑞士风格），适用于企业级 SaaS
 */
const AccountSettings = () => {
  const { user, updateUser } = useAuth();
  const designTokens = useDesignTokens();

  const [form] = Form.useForm();
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [code, setCode] = useState('');
  const [pageError, setPageError] = useState(null);
  const [pageInfo, setPageInfo] = useState(null);
  const timerRef = useRef(null);

  // ===== 修改密码（旧密码 + 新密码） =====
  const [pwdForm] = Form.useForm();
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdInfo, setPwdInfo] = useState(null);
  const [pwdError, setPwdError] = useState(null);

  /** 当前邮箱（来自 user 状态） */
  const currentEmail = user?.email || '';
  const emailVerified = !!user?.emailVerified;

  /** 账号安全度（已完成项 / 总项数） */
  const securitySteps = useMemo(() => ([
    { key: 'email', label: '绑定邮箱', done: !!currentEmail },
    { key: 'verify', label: '邮箱验证', done: emailVerified },
    { key: 'password', label: '设置密码', done: true }, // 注册时即设置密码
  ]), [currentEmail, emailVerified]);

  const completedSteps = securitySteps.filter(s => s.done).length;
  const securityPercent = Math.round((completedSteps / securitySteps.length) * 100);

  /** 清理倒计时定时器 */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  /** user 异步到达时同步邮箱预填，避免 initialValues 仅首次挂载生效导致预填失败 */
  useEffect(() => {
    if (currentEmail) {
      form.setFieldsValue({ email: currentEmail });
    }
  }, [currentEmail, form]);

  /** 启动 60s 倒计时 */
  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  /** 表单中的邮箱（用于发送验证码与验证） */
  const getFormEmail = () => {
    const v = form.getFieldValue('email');
    return (v || '').trim().toLowerCase();
  };

  /** 发送验证码 */
  const handleSendCode = async () => {
    const email = getFormEmail();
    setPageError(null);
    setPageInfo(null);

    if (!email) {
      setPageError('请输入邮箱地址');
      return;
    }

    setSending(true);
    try {
      const res = await authAPI.sendVerifyCode(email);
      if (res?.success) {
        setPageInfo(res.message || `验证码已发送至 ${email}，请查收邮件（10 分钟内有效）`);
        startCountdown();
        message.success('验证码已发送');
      } else {
        setPageError(res?.message || '验证码发送失败');
      }
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data || {};
      if (status === 429) {
        if (data.error === 'CODE_COOLDOWN') {
          const retryAfter = data.retryAfter || COUNTDOWN_SECONDS;
          setPageError(`请稍后再试，剩余 ${retryAfter} 秒`);
          setCountdown(retryAfter);
          startCountdown();
        } else if (data.error === 'DAILY_LIMIT_EXCEEDED') {
          setPageError(data.message || '今日发送次数已达上限，请明日再试');
        } else {
          setPageError(data.message || '请求过于频繁，请稍后再试');
        }
      } else if (status === 503) {
        setPageError(data.message || '邮件服务未配置，请联系管理员');
      } else {
        setPageError(data.message || error?.message || '验证码发送失败');
      }
    } finally {
      setSending(false);
    }
  };

  /** 验证邮箱 */
  const handleVerify = async () => {
    const email = getFormEmail();
    const trimmedCode = (code || '').trim();

    setPageError(null);
    setPageInfo(null);

    if (!email) {
      setPageError('请输入邮箱地址');
      return;
    }
    if (!trimmedCode || trimmedCode.length !== 6) {
      setPageError('请输入 6 位验证码');
      return;
    }

    setVerifying(true);
    try {
      const res = await authAPI.verifyEmail(email, trimmedCode);
      if (res?.success) {
        message.success('邮箱验证成功');
        // 同步本地用户状态
        updateUser({ email, emailVerified: true });
        setCode('');
        setPageInfo('邮箱验证成功，已开启邮箱通知能力');
      } else {
        setPageError(res?.message || '验证失败');
      }
    } catch (error) {
      const data = error?.response?.data || {};
      const errCode = data.error;
      if (errCode === 'CODE_NOT_FOUND' || errCode === 'CODE_EXPIRED') {
        setPageError(data.message || '验证码已失效，请重新获取');
      } else if (errCode === 'CODE_INVALID') {
        setPageError(data.message || '验证码错误，请重新输入');
      } else if (errCode === 'INVALID_INPUT') {
        setPageError(data.message || '邮箱或验证码格式错误');
      } else {
        setPageError(data.message || error?.message || '验证失败');
      }
    } finally {
      setVerifying(false);
    }
  };

  /** 重置表单 */
  const handleReset = () => {
    form.setFieldsValue({ email: currentEmail });
    setCode('');
    setPageError(null);
    setPageInfo(null);
  };

  /** 邮箱是否未变化且已验证（无需再次验证） */
  const isAlreadyVerified = emailVerified && currentEmail === getFormEmail();

  // ===== 修改密码：旧密码 + 新密码 =====

  /** 修改密码（旧密码 + 新密码） */
  const handleChangePwd = async () => {
    setPwdError(null);
    setPwdInfo(null);

    try {
      const values = await pwdForm.validateFields();
      setChangingPwd(true);
      const res = await authAPI.changePassword(values.oldPassword, values.newPassword);
      if (res?.success) {
        message.success(res.message || '密码修改成功');
        setPwdInfo('密码已修改，下次登录请使用新密码');
        pwdForm.resetFields();
      } else {
        setPwdError(res?.message || '密码修改失败');
      }
    } catch (error) {
      // antd Form.validateFields 抛出的 error 包含 errorFields，不算作网络错误
      if (error?.errorFields) {
        return;
      }
      const data = error?.response?.data || {};
      setPwdError(data.message || error?.message || '密码修改失败');
    } finally {
      setChangingPwd(false);
    }
  };

  /** 通用卡片样式（含 hover 微交互） */
  const cardStyle = useMemo(() => ({
    borderRadius: 12,
    border: '1px solid #e8e8e8',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    transition: 'box-shadow 0.25s ease, transform 0.25s ease',
    height: '100%',
  }), []);

  /** 主按钮样式（渐变填充） */
  const primaryBtnStyle = useMemo(() => ({
    borderRadius: 8,
    background: designTokens.colors.primary.gradient,
    border: 'none',
    boxShadow: '0 2px 6px rgba(102, 126, 234, 0.3)',
  }), [designTokens.colors.primary.gradient]);

  /** 次按钮样式（描边） */
  const defaultBtnStyle = useMemo(() => ({
    borderRadius: 8,
  }), []);

  /** 输入框统一样式 */
  const inputStyle = useMemo(() => ({
    height: 40,
    borderRadius: 8,
  }), []);

  /** 表单 label 样式 */
  const labelStyle = useMemo(() => ({ fontSize: 13, color: '#262626', fontWeight: 500 }), []);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部 Hero 区：渐变背景 + 标题 + 安全度概览 */}
      <div
        style={{
          background: designTokens.colors.primary.gradient,
          padding: '32px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 4px 16px rgba(102, 126, 234, 0.2)',
        }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SafetyCertificateOutlined style={{ color: '#fff', fontSize: 24 }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 600 }}>
                账号设置
              </Title>
              <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13 }}>
                管理你的账号信息、邮箱验证和密码安全
              </Text>
            </div>
          </div>

          {/* 安全度进度条 */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>账号安全度</Text>
              <Tag
                color={securityPercent === 100 ? 'success' : 'warning'}
                style={{ margin: 0, borderRadius: 10, fontWeight: 600 }}
              >
                {completedSteps}/{securitySteps.length} 已完成
              </Tag>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Progress
                percent={securityPercent}
                strokeColor={{ from: '#ffffff', to: '#e0e7ff' }}
                trailColor="rgba(255, 255, 255, 0.2)"
                showInfo={false}
                size="small"
              />
            </div>
            <Space size={4} wrap>
              {securitySteps.map(step => (
                <Tooltip key={step.key} title={step.label}>
                  <Tag
                    style={{
                      margin: 0,
                      borderRadius: 10,
                      background: step.done ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.15)',
                      color: step.done ? '#1e293b' : '#fff',
                      border: 'none',
                      fontSize: 12,
                    }}
                  >
                    {step.done ? <CheckCircleOutlined style={{ marginRight: 4 }} /> : null}
                    {step.label}
                  </Tag>
                </Tooltip>
              ))}
            </Space>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div style={{ flex: 1, padding: '24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          {/* 第一行：账号信息 + 邮箱验证（桌面双栏，移动单列） */}
          <Row gutter={[24, 24]}>
            {/* 账号信息卡片 */}
            <Col xs={24} lg={8}>
              <Card
                style={cardStyle}
                bodyStyle={{ padding: 24 }}
                className="account-settings-card"
              >
                <SectionHeader
                  icon={<UserOutlined />}
                  title="账号信息"
                  desc="查看当前账号基本信息"
                />

                {/* 用户首字母头像 + 用户名（视觉焦点） */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 0 16px',
                    marginBottom: 8,
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: designTokens.colors.primary.gradient,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: 600 }}>
                      {(user?.username || user?.realName || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 15, color: '#0f172a', display: 'block' }}>
                      {user?.realName || user?.username || '-'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>
                      @{user?.username || '-'}
                    </Text>
                  </div>
                </div>

                {/* 信息项列表 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <Text style={{ fontSize: 13, color: '#64748b' }}>用户名</Text>
                    <Text strong style={{ fontSize: 13, color: '#0f172a' }}>{user?.username || '-'}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <Text style={{ fontSize: 13, color: '#64748b' }}>真实姓名</Text>
                    <Text strong style={{ fontSize: 13, color: '#0f172a' }}>{user?.realName || '-'}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <Text style={{ fontSize: 13, color: '#64748b' }}>当前邮箱</Text>
                    {currentEmail ? (
                      <Text strong style={{ fontSize: 13, color: '#0f172a' }}>{currentEmail}</Text>
                    ) : (
                      <Text style={{ fontSize: 13, color: '#94a3b8' }}>未设置</Text>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                    <Text style={{ fontSize: 13, color: '#64748b' }}>邮箱状态</Text>
                    {emailVerified ? (
                      <Tag icon={<CheckCircleOutlined />} color="success" style={{ margin: 0, borderRadius: 10 }}>已验证</Tag>
                    ) : (
                      <Tag icon={<ExclamationCircleOutlined />} color="warning" style={{ margin: 0, borderRadius: 10 }}>未验证</Tag>
                    )}
                  </div>
                </div>
              </Card>
            </Col>

            {/* 邮箱验证卡片 */}
            <Col xs={24} lg={16}>
              <Card
                style={cardStyle}
                bodyStyle={{ padding: 24 }}
                className="account-settings-card"
              >
                <SectionHeader
                  icon={<MailOutlined />}
                  title="邮箱验证"
                  desc="绑定邮箱后可用于接收系统通知、找回密码等场景"
                  extra={
                    emailVerified ? (
                      <Tag color="success" style={{ margin: 0, borderRadius: 10 }}>
                        <CheckCircleOutlined style={{ marginRight: 4 }} />已验证
                      </Tag>
                    ) : (
                      <Tag color="warning" style={{ margin: 0, borderRadius: 10 }}>
                        <ExclamationCircleOutlined style={{ marginRight: 4 }} />未验证
                      </Tag>
                    )
                  }
                />

                <Form form={form} layout="vertical" initialValues={{ email: currentEmail }}>
                  {isAlreadyVerified && (
                    <Alert
                      message="当前邮箱已验证"
                      description="如需更换邮箱，请在下方输入新邮箱并重新发送验证码"
                      type="success"
                      showIcon
                      style={{ marginBottom: 16, borderRadius: 8 }}
                    />
                  )}

                  {pageInfo && (
                    <Alert
                      message={pageInfo}
                      type="success"
                      showIcon
                      style={{ marginBottom: 16, borderRadius: 8 }}
                      closable
                      onClose={() => setPageInfo(null)}
                    />
                  )}

                  {pageError && (
                    <Alert
                      message={pageError}
                      type="error"
                      showIcon
                      style={{ marginBottom: 16, borderRadius: 8 }}
                      closable
                      onClose={() => setPageError(null)}
                    />
                  )}

                  <Form.Item
                    label={<span style={labelStyle}>邮箱地址</span>}
                    name="email"
                    rules={[
                      { required: true, message: '请输入邮箱地址' },
                      { type: 'email', message: '邮箱格式不正确' },
                    ]}
                  >
                    <Input
                      placeholder="请输入邮箱地址"
                      prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                      style={inputStyle}
                      onChange={() => {
                        setCode('');
                        setPageError(null);
                        setPageInfo(null);
                      }}
                      allowClear
                      aria-label="邮箱地址输入框"
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span style={labelStyle}>验证码</span>}
                    required
                  >
                    <Input.OTP
                      length={6}
                      value={code}
                      onChange={setCode}
                      style={{ width: '100%', height: 40 }}
                      inputMode="numeric"
                      placeholder="请输入 6 位验证码"
                      aria-label="邮箱验证码输入框"
                    />
                  </Form.Item>

                  <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleSendCode}
                        loading={sending}
                        disabled={countdown > 0}
                        style={primaryBtnStyle}
                      >
                        {countdown > 0 ? `${countdown}s 后重试` : '发送验证码'}
                      </Button>
                      <Button
                        type="primary"
                        icon={<SafetyCertificateOutlined />}
                        onClick={handleVerify}
                        loading={verifying}
                        disabled={!code || code.length !== 6}
                        style={primaryBtnStyle}
                      >
                        验证
                      </Button>
                    </Space>
                    <Button icon={<ReloadOutlined />} onClick={handleReset} style={defaultBtnStyle}>
                      重置
                    </Button>
                  </Space>

                  <Alert
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    style={{ marginTop: 16, borderRadius: 8, backgroundColor: '#f0f5ff', border: '1px solid #d6e4ff' }}
                    message={
                      <Text style={{ fontSize: 12, color: '#475569' }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        验证码 10 分钟内有效；同一邮箱 60 秒内仅可发送一次，每日上限 10 次。
                        如未收到邮件，请检查垃圾邮件箱或联系管理员。
                      </Text>
                    }
                  />
                </Form>
              </Card>
            </Col>
          </Row>

          {/* 修改密码卡片（旧密码 + 新密码） */}
          <Row gutter={[24, 24]} style={{ marginTop: 0 }}>
            <Col xs={24}>
              <Card
                style={cardStyle}
                bodyStyle={{ padding: 24 }}
                className="account-settings-card"
              >
                <SectionHeader
                  icon={<LockOutlined />}
                  title="修改密码"
                  desc="通过旧密码验证身份后设置新密码"
                  extra={
                    <Tag color="processing" style={{ margin: 0, borderRadius: 10 }}>
                      <SafetyCertificateOutlined style={{ marginRight: 4 }} />可用
                    </Tag>
                  }
                />

                {pwdInfo && (
                  <Alert
                    message={pwdInfo}
                    type="success"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    closable
                    onClose={() => setPwdInfo(null)}
                  />
                )}

                {pwdError && (
                  <Alert
                    message={pwdError}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    closable
                    onClose={() => setPwdError(null)}
                  />
                )}

                <Form form={pwdForm} layout="vertical">
                  <Row gutter={16}>
                    <Col xs={24} md={12} xl={8}>
                      <Form.Item
                        label={<span style={labelStyle}>旧密码</span>}
                        name="oldPassword"
                        rules={[
                          { required: true, message: '请输入旧密码' },
                        ]}
                      >
                        <Input.Password
                          placeholder="请输入当前密码"
                          prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                          style={inputStyle}
                          aria-label="旧密码输入框"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xl={8}>
                      <Form.Item
                        label={<span style={labelStyle}>新密码</span>}
                        name="newPassword"
                        rules={[
                          { required: true, message: '请输入新密码' },
                          { min: 6, message: '密码长度不能少于 6 位' },
                        ]}
                      >
                        <Input.Password
                          placeholder="请输入新密码（至少 6 位）"
                          prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                          style={inputStyle}
                          aria-label="新密码输入框"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xl={8}>
                      <Form.Item
                        label={<span style={labelStyle}>确认新密码</span>}
                        name="confirmPassword"
                        dependencies={['newPassword']}
                        rules={[
                          { required: true, message: '请确认新密码' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('newPassword') === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error('两次输入的密码不一致'));
                            },
                          }),
                        ]}
                      >
                        <Input.Password
                          placeholder="请再次输入新密码"
                          prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                          style={inputStyle}
                          aria-label="确认新密码输入框"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
                    <Button
                      type="primary"
                      icon={<SafetyCertificateOutlined />}
                      onClick={handleChangePwd}
                      loading={changingPwd}
                      style={primaryBtnStyle}
                    >
                      修改密码
                    </Button>
                  </Space>

                  <Alert
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    style={{ marginTop: 16, borderRadius: 8, backgroundColor: '#f0f5ff', border: '1px solid #d6e4ff' }}
                    message={
                      <Text style={{ fontSize: 12, color: '#475569' }}>
                        <SafetyCertificateOutlined style={{ marginRight: 4 }} />
                        需要提供当前账号的旧密码以验证身份；新密码不能与旧密码相同。
                      </Text>
                    }
                  />
                </Form>
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      {/* hover 微交互样式 */}
      <style>{`
        .account-settings-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08) !important;
          transform: translateY(-2px);
        }
        .account-settings-card {
          cursor: default;
        }
      `}</style>
    </div>
  );
};

export default AccountSettings;
