import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Alert,
  Space,
  Divider,
  Row,
  Col,
  message,
} from 'antd';
import {
  MailOutlined,
  LockOutlined,
  SendOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api';

const { Title, Text, Paragraph } = Typography;

/** 倒计时时长（秒） */
const COUNTDOWN_SECONDS = 60;

/** 设计令牌：Flat Design + 安全蓝主题（参考 ui-ux-pro-max 推荐） */
const TOKENS = {
  // 颜色
  primary: '#0369A1',         // 主色 - 安全深蓝
  primaryHover: '#075985',    // 主色 hover
  secondary: '#0EA5E9',       // 次色 - 天蓝
  success: '#22C55E',         // 成功 - 受保护绿
  successHover: '#16A34A',
  warning: '#F59E0B',         // 警示橙
  warningBg: '#FEF3C7',
  warningBorder: '#FDE68A',
  warningText: '#92400E',
  warningTextStrong: '#78350F',
  // 中性色
  textPrimary: '#0C4A6E',     // 主文字 - 深蓝
  textSecondary: '#475569',   // 次要文字 - slate-600
  textTertiary: '#64748B',    // 第三级文字 - slate-500
  textPlaceholder: '#94A3B8', // 占位符 - slate-400
  border: '#E2E8F0',          // 边框 - slate-200
  borderHover: '#94A3B8',     // 边框 hover
  bgPage: '#F0F9FF',          // 页面背景 - 极浅蓝
  bgCard: '#FFFFFF',          // 卡片背景
  bgSubtle: '#F8FAFC',        // 次级背景
  // 间距
  spaceXs: 4,
  spaceSm: 8,
  spaceMd: 16,
  spaceLg: 20,
  spaceXl: 24,
  space2Xl: 32,
  // 圆角
  radiusSm: 6,
  radiusMd: 8,
  radiusLg: 12,
  // 过渡
  transition: '150ms ease',
};

/**
 * 找回密码页面（未登录访问）
 * 流程：输入账户名或邮箱 → 发送验证码 → 输入验证码 + 新密码 → 重置成功 → 跳转登录
 * 支持账户名（username）和邮箱（email）双模式输入，后端自动识别
 *
 * 设计：Flat Design + 安全蓝主题（参考 ui-ux-pro-max 推荐）
 *  - 无渐变/无阴影，纯净背景突出表单
 *  - 一致间距（16/20/24）与圆角（8/12）
 *  - 显式 label，placeholder 仅作辅助提示
 */
const ForgotPassword = () => {
  const navigate = useNavigate();

  const [form] = Form.useForm();
  const [sendingCode, setSendingCode] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [code, setCode] = useState('');
  const [pageError, setPageError] = useState(null);
  const [pageInfo, setPageInfo] = useState(null);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  /** 清理倒计时定时器 */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  /** 启动 60s 倒计时 */
  const startCountdown = useCallback((initialSeconds) => {
    const seconds = initialSeconds && initialSeconds > 0 ? initialSeconds : COUNTDOWN_SECONDS;
    setCountdown(seconds);
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

  /** 发送找回密码验证码 */
  const handleSendCode = async () => {
    const account = (form.getFieldValue('account') || '').trim();
    setPageError(null);
    setPageInfo(null);

    if (!account) {
      setPageError('请输入账户名或邮箱');
      return;
    }

    setSendingCode(true);
    try {
      const res = await authAPI.forgotPasswordSendCode(account);
      if (res?.success) {
        // 后端为防枚举统一返回成功，统一展示提示
        setPageInfo(res.message || `如果该账户已注册并验证邮箱，验证码已发送至账户绑定邮箱（10 分钟内有效）。若长时间未收到邮件，请确认账户已在「账号设置」中完成邮箱验证。`);
        startCountdown();
        message.success('验证码已发送');
      } else {
        setPageError(res?.message || '验证码发送失败');
      }
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data || {};
      if (status === 429) {
        if (data.error === 'DAILY_LIMIT_EXCEEDED') {
          setPageError(data.message || '今日该账户发送次数已达上限，请明日再试');
        } else {
          setPageError(data.message || '请求过于频繁，请稍后再试');
        }
      } else if (status === 503) {
        setPageError(data.message || '邮件服务未配置，请联系管理员');
      } else {
        setPageError(data.message || error?.message || '验证码发送失败');
      }
    } finally {
      setSendingCode(false);
    }
  };

  /** 提交找回密码 */
  const handleReset = async () => {
    const account = (form.getFieldValue('account') || '').trim();
    const trimmedCode = (code || '').trim();

    setPageError(null);
    setPageInfo(null);

    if (!account) {
      setPageError('请输入账户名或邮箱');
      return;
    }
    if (!trimmedCode || trimmedCode.length !== 6) {
      setPageError('请输入 6 位验证码');
      return;
    }

    try {
      const values = await form.validateFields();
      setResetting(true);
      const res = await authAPI.forgotPasswordReset(account, trimmedCode, values.newPassword);
      if (res?.success) {
        message.success(res.message || '密码已重置');
        setDone(true);
      } else {
        setPageError(res?.message || '密码重置失败');
      }
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      const data = error?.response?.data || {};
      const errCode = data.error;
      if (errCode === 'CODE_NOT_FOUND' || errCode === 'CODE_EXPIRED') {
        setPageError(data.message || '验证码已失效，请重新获取');
      } else if (errCode === 'CODE_INVALID') {
        setPageError(data.message || '验证码错误，请重新输入');
      } else {
        setPageError(data.message || error?.message || '密码重置失败');
      }
    } finally {
      setResetting(false);
    }
  };

  /** 重置整个表单 */
  const handleResetForm = () => {
    form.resetFields();
    setCode('');
    setPageError(null);
    setPageInfo(null);
  };

  /** 渲染成功态 */
  if (done) {
    return (
      <div style={{
        minHeight: '100vh',
        background: TOKENS.bgPage,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: TOKENS.spaceXl,
      }}>
        <Card
          style={{
            maxWidth: 560,
            width: '100%',
            borderRadius: TOKENS.radiusLg,
            border: `1px solid ${TOKENS.border}`,
            boxShadow: 'none',
          }}
          styles={{ body: { padding: TOKENS.space2Xl } }}
        >
          <div style={{ textAlign: 'center', marginBottom: TOKENS.spaceXl }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: TOKENS.success,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: TOKENS.spaceLg,
              }}
            >
              <CheckCircleOutlined style={{ color: '#fff', fontSize: 32 }} />
            </div>
            <Title level={3} style={{ margin: 0, marginBottom: TOKENS.spaceSm, color: TOKENS.textPrimary }}>
              密码已重置
            </Title>
            <Text style={{ color: TOKENS.textSecondary, fontSize: 14 }}>
              您的账户密码已成功更新，请使用新密码登录系统
            </Text>
          </div>
          <Button
            type="primary"
            block
            size="large"
            onClick={() => navigate('/login')}
            style={{
              borderRadius: TOKENS.radiusMd,
              height: 44,
              background: TOKENS.primary,
              borderColor: TOKENS.primary,
              transition: `background ${TOKENS.transition}`,
            }}
          >
            返回登录
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: TOKENS.bgPage,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: TOKENS.spaceXl,
      }}
    >
      <Card
        style={{
          maxWidth: 720,
          width: '100%',
          borderRadius: TOKENS.radiusLg,
          border: `1px solid ${TOKENS.border}`,
          boxShadow: 'none',
        }}
        styles={{ body: { padding: TOKENS.space2Xl } }}
      >
        {/* 头部：图标 + 标题 + 副标题 + 返回登录 */}
        <div style={{ textAlign: 'center', marginBottom: TOKENS.spaceXl, position: 'relative' }}>
          {/* 左上角返回登录按钮（常驻可见） */}
          <Link
            to="/login"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              fontSize: 13,
              color: TOKENS.textSecondary,
              display: 'inline-flex',
              alignItems: 'center',
              gap: TOKENS.spaceXs,
              padding: `${TOKENS.spaceSm}px ${TOKENS.spaceMd}px`,
              borderRadius: TOKENS.radiusMd,
              border: `1px solid ${TOKENS.border}`,
              background: TOKENS.bgCard,
              transition: `all ${TOKENS.transition}`,
            }}
          >
            <ArrowLeftOutlined />
            返回登录
          </Link>

          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: TOKENS.radiusLg,
              background: TOKENS.primary,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: TOKENS.spaceLg,
            }}
          >
            <LockOutlined style={{ color: '#fff', fontSize: 26 }} />
          </div>
          <Title level={3} style={{ margin: 0, marginBottom: TOKENS.spaceSm, color: TOKENS.textPrimary }}>
            找回密码
          </Title>
          <Text style={{ color: TOKENS.textSecondary, fontSize: 14 }}>
            通过已验证邮箱重置您的账户密码
          </Text>
        </div>

        {/* 前置条件提示卡片：扁平化警示设计 */}
        <div
          style={{
            marginBottom: TOKENS.spaceXl,
            padding: `${TOKENS.spaceMd}px ${TOKENS.spaceLg}px`,
            borderRadius: TOKENS.radiusMd,
            background: TOKENS.warningBg,
            border: `1px solid ${TOKENS.warningBorder}`,
            display: 'flex',
            gap: TOKENS.spaceMd,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: TOKENS.radiusSm,
              background: TOKENS.warning,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <WarningOutlined style={{ color: '#fff', fontSize: 14 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.warningText, marginBottom: TOKENS.spaceXs }}>
              使用前提
            </div>
            <div style={{ fontSize: 12, color: TOKENS.warningTextStrong, lineHeight: 1.7 }}>
              本功能仅适用于账户已
              <Text strong style={{ color: TOKENS.warningText }}>绑定并验证邮箱</Text>
              的用户。输入账户名或邮箱后，验证码将发送至该账户绑定的邮箱。若邮箱未验证，验证码将无法送达，请先
              <Link to="/login" style={{ color: TOKENS.warningText, fontWeight: 500, margin: `0 ${TOKENS.spaceXs}px` }}>
                登录系统
              </Link>
              → 进入
              <Text strong style={{ color: TOKENS.warningText }}>「账号设置」</Text>
              完成邮箱验证后再使用此功能。
            </div>
          </div>
        </div>

        {/* 通知区域：成功/错误提示 */}
        {pageInfo && (
          <Alert
            message={pageInfo}
            type="success"
            showIcon
            style={{
              marginBottom: TOKENS.spaceLg,
              borderRadius: TOKENS.radiusMd,
              border: `1px solid ${TOKENS.border}`,
            }}
            closable
            onClose={() => setPageInfo(null)}
          />
        )}

        {pageError && (
          <Alert
            message={pageError}
            type="error"
            showIcon
            style={{
              marginBottom: TOKENS.spaceLg,
              borderRadius: TOKENS.radiusMd,
              border: `1px solid ${TOKENS.border}`,
            }}
            closable
            onClose={() => setPageError(null)}
          />
        )}

        {/* 表单主体：双列布局减少纵向高度 */}
        <Form
          form={form}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          {/* 第一行：账户名或邮箱 + 发送验证码按钮（紧凑组合） */}
          <Form.Item
            label={<span style={{ color: TOKENS.textPrimary, fontWeight: 500, fontSize: 13 }}>账户名或邮箱</span>}
            required
            style={{ marginBottom: TOKENS.spaceLg }}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name="account"
                noStyle
                rules={[
                  { required: true, message: '请输入账户名或邮箱' },
                ]}
              >
                <Input
                  placeholder="请输入账户名（如 admin）或邮箱地址"
                  prefix={<MailOutlined style={{ color: TOKENS.textPlaceholder }} />}
                  style={{
                    borderRadius: `${TOKENS.radiusMd}px 0 0 ${TOKENS.radiusMd}px`,
                    borderColor: TOKENS.border,
                    height: 44,
                    transition: `border-color ${TOKENS.transition}`,
                  }}
                  allowClear
                />
              </Form.Item>
              <Button
                icon={<SendOutlined />}
                onClick={handleSendCode}
                loading={sendingCode}
                disabled={countdown > 0}
                style={{
                  borderRadius: `0 ${TOKENS.radiusMd}px ${TOKENS.radiusMd}px 0`,
                  height: 44,
                  padding: `0 ${TOKENS.spaceLg}px`,
                  borderColor: TOKENS.border,
                  background: TOKENS.bgSubtle,
                  color: countdown > 0 ? TOKENS.textTertiary : TOKENS.primary,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  transition: `all ${TOKENS.transition}`,
                }}
              >
                {countdown > 0 ? `${countdown}s 后重试` : '发送验证码'}
              </Button>
            </Space.Compact>
          </Form.Item>

          {/* 第二行：验证码（全宽，OTP 比较宽） */}
          <Form.Item
            label={<span style={{ color: TOKENS.textPrimary, fontWeight: 500, fontSize: 13 }}>验证码</span>}
            required
            style={{ marginBottom: TOKENS.spaceLg }}
          >
            <Input.OTP
              length={6}
              value={code}
              onChange={setCode}
              style={{ width: '100%' }}
              inputMode="numeric"
              placeholder="请输入 6 位验证码"
            />
          </Form.Item>

          {/* 第三行：新密码 + 确认新密码（双列） */}
          <Row gutter={TOKENS.spaceLg}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<span style={{ color: TOKENS.textPrimary, fontWeight: 500, fontSize: 13 }}>新密码</span>}
                name="newPassword"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码长度不能少于 6 位' },
                ]}
                style={{ marginBottom: TOKENS.spaceLg }}
              >
                <Input.Password
                  placeholder="至少 6 位"
                  prefix={<LockOutlined style={{ color: TOKENS.textPlaceholder }} />}
                  style={{
                    borderRadius: TOKENS.radiusMd,
                    borderColor: TOKENS.border,
                    height: 44,
                    transition: `border-color ${TOKENS.transition}`,
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<span style={{ color: TOKENS.textPrimary, fontWeight: 500, fontSize: 13 }}>确认新密码</span>}
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
                style={{ marginBottom: TOKENS.spaceLg }}
              >
                <Input.Password
                  placeholder="再次输入新密码"
                  prefix={<LockOutlined style={{ color: TOKENS.textPlaceholder }} />}
                  style={{
                    borderRadius: TOKENS.radiusMd,
                    borderColor: TOKENS.border,
                    height: 44,
                    transition: `border-color ${TOKENS.transition}`,
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 操作按钮区：主按钮全宽 + 次按钮辅助 */}
          <div style={{
            display: 'flex',
            gap: TOKENS.spaceMd,
            alignItems: 'center',
            marginBottom: TOKENS.spaceLg,
          }}>
            <Button
              type="primary"
              icon={<SafetyCertificateOutlined />}
              onClick={handleReset}
              loading={resetting}
              disabled={!code || code.length !== 6}
              block
              style={{
                borderRadius: TOKENS.radiusMd,
                height: 44,
                background: TOKENS.primary,
                borderColor: TOKENS.primary,
                fontWeight: 500,
                transition: `background ${TOKENS.transition}`,
              }}
            >
              重置密码
            </Button>
            <Button
              type="link"
              onClick={handleResetForm}
              style={{
                padding: `0 ${TOKENS.spaceMd}px`,
                color: TOKENS.textTertiary,
                fontSize: 13,
                whiteSpace: 'nowrap',
                transition: `color ${TOKENS.transition}`,
              }}
            >
              重置表单
            </Button>
          </div>

          {/* 底部安全说明 */}
          <Divider style={{ margin: `${TOKENS.spaceLg}px 0 ${TOKENS.spaceMd}px 0`, borderColor: TOKENS.border }} />
          <div style={{
            padding: TOKENS.spaceMd,
            background: TOKENS.bgSubtle,
            borderRadius: TOKENS.radiusMd,
            border: `1px solid ${TOKENS.border}`,
          }}>
            <Paragraph style={{ fontSize: 12, margin: 0, color: TOKENS.textSecondary, lineHeight: 1.7 }}>
              <SafetyCertificateOutlined style={{ marginRight: TOKENS.spaceSm, color: TOKENS.secondary }} />
              为防止账户枚举攻击，系统对不存在的账户或未验证邮箱的账户也将返回成功提示，但不会实际发送邮件。
              验证码 10 分钟内有效；同一账户 60 秒内仅可发送一次，每日上限 10 次。
            </Paragraph>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ForgotPassword;
