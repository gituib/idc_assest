/**
 * 邮件发送服务（基于 nodemailer）
 * 提供：transporter 单例管理、模板渲染、模板邮件发送
 * 模板存放于 backend/templates/emails/<name>.ejs
 */
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const logger = require('../utils/logger').module('Mailer');
const { loadMailConfig } = require('../config/mail');

const TEMPLATE_DIR = path.join(__dirname, '../templates/emails');
const SEND_TIMEOUT_MS = 10000; // 发送超时 10 秒

let transporter = null;

/**
 * 将 SMTP 原始错误分类为结构化错误信息
 * @param {string|Error} rawError - 原始错误对象或错误码
 * @returns {{error: string, hint?: string, detail?: string}} 结构化错误
 *   - error: 错误码（保持字符串，向后兼容）
 *   - hint: 面向用户的排查建议
 *   - detail: 原始错误消息（调试用）
 */
function classifySmtpError(rawError) {
  const detail = String(rawError?.message || rawError || '');
  const msg = detail.toLowerCase();

  // 超时（端口/secure 不匹配或网络不通）
  if (detail === 'SEND_TIMEOUT') {
    return {
      error: 'SEND_TIMEOUT',
      hint: 'SMTP 连接超时。请检查：1) 端口与 secure 配置是否匹配（465 端口需 secure=true，587/25 端口需 secure=false）；2) 网络是否能访问 SMTP 服务器；3) 防火墙是否放行端口',
      detail,
    };
  }

  // 认证失败（授权码错误）
  if (
    msg.includes('eauth') ||
    msg.includes('auth failed') ||
    msg.includes('authentication failed') ||
    msg.includes('invalid login') ||
    msg.includes('username and password not accepted') ||
    msg.includes('535') ||
    msg.includes('auth unsuccessful')
  ) {
    return {
      error: 'SMTP_AUTH_FAILED',
      hint: 'SMTP 认证失败。请检查 SMTP 账号与授权码（注意 QQ/163/Gmail 等邮箱需使用授权码，不是登录密码）',
      detail,
    };
  }

  // 连接被拒绝（端口/主机错误）
  if (
    msg.includes('econnrefused') ||
    msg.includes('connect econnrefused') ||
    msg.includes('connection refused') ||
    msg.includes('connect refused')
  ) {
    return {
      error: 'SMTP_CONNECTION_REFUSED',
      hint: 'SMTP 连接被拒绝。请检查：1) SMTP 主机地址是否正确；2) 端口是否正确；3) 防火墙是否放行',
      detail,
    };
  }

  // 主机无法解析
  if (msg.includes('enotfound') || msg.includes('getaddrinfo')) {
    return {
      error: 'SMTP_HOST_NOT_FOUND',
      hint: 'SMTP 主机无法解析。请检查 SMTP 主机地址是否正确（如 smtp.qq.com）',
      detail,
    };
  }

  // SSL/TLS 握手失败
  if (
    msg.includes('essl') ||
    msg.includes('ssl') ||
    msg.includes('tls') ||
    msg.includes('certificate') ||
    msg.includes('handshake')
  ) {
    return {
      error: 'SMTP_TLS_ERROR',
      hint: 'SSL/TLS 握手失败。请检查 secure 配置：465 端口应设 secure=true，587/25 端口应设 secure=false',
      detail,
    };
  }

  // 收件人地址被拒绝
  if (
    msg.includes('550') ||
    msg.includes('553') ||
    msg.includes('envelope') ||
    msg.includes('recipient') ||
    msg.includes('recipient address rejected')
  ) {
    return {
      error: 'SMTP_RECIPIENT_REJECTED',
      hint: '收件人地址被拒绝。请检查收件人邮箱地址是否正确',
      detail,
    };
  }

  // 网络不可达
  if (msg.includes('ehostunreach') || msg.includes('enetunreach')) {
    return {
      error: 'SMTP_NETWORK_UNREACHABLE',
      hint: '网络不可达。请检查服务器是否能访问外网，以及防火墙设置',
      detail,
    };
  }

  // 兜底
  return {
    error: 'SMTP_SEND_FAILED',
    hint: '邮件发送失败，请稍后重试或联系管理员',
    detail,
  };
}

/**
 * 创建 nodemailer transporter（懒加载单例）
 * @returns {Promise<Object|null>} transporter 实例，未配置时返回 null
 */
async function getTransporter() {
  if (transporter) {
    return transporter;
  }
  const config = await loadMailConfig();
  if (!config) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
  return transporter;
}

/**
 * 渲染邮件模板
 * @param {string} templateName - 模板名（不含扩展名，如 'verify-code'）
 * @param {Object} data - 模板变量
 * @returns {Promise<string>} 渲染后的 HTML 字符串
 */
async function renderTemplate(templateName, data) {
  const templatePath = path.join(TEMPLATE_DIR, `${templateName}.ejs`);
  return ejs.renderFile(templatePath, data || {}, { async: true });
}

/**
 * 发送模板邮件
 * @param {string} to - 收件人邮箱
 * @param {string} templateName - 模板名
 * @param {Object} data - 模板变量
 * @param {string} [subject] - 邮件主题（可选，默认由模板内部决定时不传）
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendTemplate(to, templateName, data, subject) {
  const tp = await getTransporter();
  if (!tp) {
    return { success: false, error: 'MAIL_NOT_CONFIGURED' };
  }

  const config = await loadMailConfig();
  let html;
  try {
    html = await renderTemplate(templateName, { ...data, subject });
  } catch (error) {
    logger.error('渲染邮件模板失败', { templateName, error: error.message });
    return { success: false, error: `TEMPLATE_RENDER_FAILED: ${error.message}` };
  }

  const mailOptions = {
    from: `"${config.mailFromName}" <${config.mailFrom}>`,
    to,
    subject: subject || 'IDC资产管理系统通知',
    html,
  };

  // 超时保护，避免 SMTP 卡死阻塞 API
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      const classified = classifySmtpError('SEND_TIMEOUT');
      logger.error('邮件发送超时', { to, templateName, timeout: SEND_TIMEOUT_MS });
      resolve({ success: false, ...classified });
    }, SEND_TIMEOUT_MS);

    tp.sendMail(mailOptions)
      .then(info => {
        clearTimeout(timer);
        logger.info('邮件发送成功', { to, templateName, messageId: info.messageId });
        resolve({ success: true, messageId: info.messageId });
      })
      .catch(error => {
        clearTimeout(timer);
        const classified = classifySmtpError(error);
        logger.error('邮件发送失败', { to, templateName, error: classified.error, detail: classified.detail });
        resolve({ success: false, ...classified });
      });
  });
}

/**
 * 重建 transporter（SMTP 配置变更后调用）
 * @returns {Promise<void>}
 */
async function rebuildTransporter() {
  if (transporter) {
    try {
      transporter.close();
    } catch (e) {
      // 忽略关闭错误
    }
    transporter = null;
  }
  await getTransporter();
}

/**
 * 测试 SMTP 连接（不发送真实邮件）
 * @returns {Promise<{success: boolean, error?: string, hint?: string, detail?: string}>}
 */
async function verifyConnection() {
  const tp = await getTransporter();
  if (!tp) {
    return { success: false, error: 'MAIL_NOT_CONFIGURED' };
  }
  try {
    await tp.verify();
    return { success: true };
  } catch (error) {
    const classified = classifySmtpError(error);
    return { success: false, ...classified };
  }
}

/**
 * 重置 transporter（仅供测试使用）
 * @returns {void}
 */
function _resetForTest() {
  transporter = null;
}

module.exports = {
  getTransporter,
  renderTemplate,
  sendTemplate,
  rebuildTransporter,
  verifyConnection,
  classifySmtpError,
  _resetForTest,
  SEND_TIMEOUT_MS,
};
