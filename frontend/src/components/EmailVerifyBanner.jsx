import React, { useState, useEffect } from 'react';
import { Alert, Button } from 'antd';
import { MailOutlined, VerifiedOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/** sessionStorage 键名：本会话内是否已关闭横幅 */
const BANNER_DISMISS_KEY = 'email_verify_banner_dismissed_session';

/**
 * 邮箱未验证提示横幅
 * 仅在登录态用户邮箱未验证时显示，引导用户前往账号设置完成验证
 * - 已填邮箱：提示验证后可启用找回密码功能
 * - 未填邮箱：提示绑定并验证邮箱
 * 关闭后本会话不再显示（sessionStorage 记录），重新登录或新开会话会再次提醒
 */
function EmailVerifyBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // 会话级关闭状态：从 sessionStorage 读取
  useEffect(() => {
    try {
      if (sessionStorage.getItem(BANNER_DISMISS_KEY) === '1') {
        setDismissed(true);
      }
    } catch (e) {
      // sessionStorage 不可用时静默忽略
    }
  }, []);

  // 用户未登录、已验证、或已关闭 → 不渲染
  if (!user || user.emailVerified || dismissed) {
    return null;
  }

  /** 跳转到账号设置页 */
  const handleGoVerify = () => {
    navigate('/account-settings');
  };

  /** 关闭横幅（本会话内不再显示） */
  const handleClose = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(BANNER_DISMISS_KEY, '1');
    } catch (e) {
      // sessionStorage 不可用时静默忽略
    }
  };

  const hasEmail = !!user.email;
  const maskedEmail = hasEmail ? maskEmail(user.email) : '';

  return (
    <Alert
      message={
        hasEmail
          ? `您填写的邮箱 ${maskedEmail} 尚未验证`
          : '您尚未绑定邮箱'
      }
      description={
        hasEmail
          ? '验证邮箱后可启用「找回密码」功能，并在重要操作时接收通知。建议尽快完成验证。'
          : '绑定并验证邮箱后可启用「找回密码」功能，并在重要操作时接收通知。建议尽快前往账号设置完成绑定。'
      }
      type="warning"
      showIcon
      icon={<MailOutlined />}
      action={
        <Button
          size="small"
          type="primary"
          ghost
          icon={<VerifiedOutlined />}
          onClick={handleGoVerify}
        >
          {hasEmail ? '去验证' : '去绑定'}
        </Button>
      }
      closable
      onClose={handleClose}
      style={{
        borderRadius: 0,
        borderBottom: '1px solid #faad14',
        marginBottom: 0,
      }}
    />
  );
}

/**
 * 邮箱地址脱敏处理：保留首字符与 @ 后域名，中间以 *** 替代
 * @param {string} email - 原始邮箱
 * @returns {string} 脱敏后的邮箱，如 a***@example.com
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return email;
  const prefix = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  if (prefix.length <= 1) return `${prefix}***${domain}`;
  return `${prefix[0]}***${domain}`;
}

export default EmailVerifyBanner;
