/**
 * AES-256-CBC 加解密工具
 * 用于敏感信息（如 SMTP 密码/授权码）的加密存储
 * 密钥来源：环境变量 SMTP_SECRET_KEY（32 字节 hex 字符串）
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * 获取加密密钥（32 字节 Buffer）
 * 若 SMTP_SECRET_KEY 未配置，回退到 JWT_SECRET 派生（保证测试环境可用）
 * @returns {Buffer} 32 字节密钥
 */
function getKey() {
  const raw = process.env.SMTP_SECRET_KEY || process.env.JWT_SECRET || 'default-dev-key-not-for-production-use-32b';
  // 使用 sha256 派生固定 32 字节密钥，避免输入长度不一致问题
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * AES-256-CBC 加密
 * @param {string} plainText - 待加密明文
 * @returns {string} 加密结果，格式为 "iv_hex:cipher_hex"
 */
function encrypt(plainText) {
  if (plainText == null) {
    throw new Error('加密内容不能为空');
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(String(plainText), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * AES-256-CBC 解密
 * @param {string} cipherText - 加密字符串，格式为 "iv_hex:cipher_hex"
 * @returns {string} 解密后的明文
 */
function decrypt(cipherText) {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.includes(':')) {
    throw new Error('密文格式无效');
  }
  const [ivHex, cipherHex] = cipherText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 对字符串进行掩码处理（仅保留后 4 位）
 * @param {string} str - 原始字符串
 * @returns {string} 掩码字符串，如 "••••••code"
 */
function maskSecret(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  if (str.length <= 4) {
    return '••••';
  }
  return `••••••${str.slice(-4)}`;
}

module.exports = {
  encrypt,
  decrypt,
  maskSecret,
  ALGORITHM,
};
