/**
 * 邮件配置加载模块
 * 从 SystemSetting 表读取 SMTP 配置，密码使用 AES-256-CBC 解密
 * 配置项：smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_encrypted, mail_from, mail_from_name
 */
const SystemSetting = require('../models/SystemSetting');
const { decrypt } = require('../utils/crypto');

// SystemSetting 中邮件相关键名
const MAIL_KEYS = {
  HOST: 'smtp_host',
  PORT: 'smtp_port',
  SECURE: 'smtp_secure',
  USER: 'smtp_user',
  PASS_ENCRYPTED: 'smtp_pass_encrypted',
  FROM: 'mail_from',
  FROM_NAME: 'mail_from_name',
};

/**
 * 从 SystemSetting 表读取单个配置值（已 JSON.parse）
 * @param {string} key - 配置键
 * @param {*} defaultValue - 默认值
 * @returns {Promise<*>} 配置值
 */
async function readSetting(key, defaultValue = null) {
  const setting = await SystemSetting.findByPk(key);
  if (!setting || setting.settingValue == null) {
    return defaultValue;
  }
  try {
    return JSON.parse(setting.settingValue);
  } catch {
    return setting.settingValue;
  }
}

/**
 * 加载完整邮件配置（含解密后的密码）
 * @returns {Promise<Object|null>} 配置对象，未配置时返回 null
 *   - smtpHost {string}
 *   - smtpPort {number}
 *   - smtpSecure {boolean}
 *   - smtpUser {string}
 *   - smtpPass {string} 解密后的明文密码
 *   - mailFrom {string}
 *   - mailFromName {string}
 */
async function loadMailConfig() {
  const [host, port, secure, user, passEncrypted, from, fromName] = await Promise.all([
    readSetting(MAIL_KEYS.HOST, ''),
    readSetting(MAIL_KEYS.PORT, 465),
    readSetting(MAIL_KEYS.SECURE, true),
    readSetting(MAIL_KEYS.USER, ''),
    readSetting(MAIL_KEYS.PASS_ENCRYPTED, ''),
    readSetting(MAIL_KEYS.FROM, ''),
    readSetting(MAIL_KEYS.FROM_NAME, 'IDC资产管理系统'),
  ]);

  if (!host || !user || !passEncrypted) {
    return null;
  }

  let smtpPass = '';
  try {
    smtpPass = decrypt(passEncrypted);
  } catch (error) {
    // 解密失败时返回 null，调用方需提示管理员重新配置
    return null;
  }

  return {
    smtpHost: host,
    smtpPort: Number(port) || 465,
    smtpSecure: secure === true || secure === 'true',
    smtpUser: user,
    smtpPass,
    mailFrom: from || user,
    mailFromName: fromName || 'IDC资产管理系统',
  };
}

/**
 * 检查邮件服务是否已配置（host + user + 加密密码 均非空）
 * @returns {Promise<boolean>}
 */
async function isMailConfigured() {
  const config = await loadMailConfig();
  return config !== null;
}

module.exports = {
  loadMailConfig,
  isMailConfigured,
  MAIL_KEYS,
};
