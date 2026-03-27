/**
 * 远端备份配置管理模块
 * 管理多个远端备份目标的配置
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PROTOCOL_TYPES } = require('./remoteBackup');

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '..', 'config', 'remote-backup-configs.json');

// 默认配置
const DEFAULT_CONFIG = {
  targets: [],
  globalSettings: {
    enabled: false,
    uploadAfterBackup: true,
    deleteLocalAfterUpload: false,
    retryCount: 3,
    retryDelay: 5000,
    timeout: 300000,
  },
};

/**
 * 加密敏感信息
 */
function encrypt(text) {
  if (!text) {
    return '';
  }
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.JWT_SECRET || 'default-secret', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * 解密敏感信息
 */
function decrypt(text) {
  if (!text) {
    return '';
  }
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.JWT_SECRET || 'default-secret', 'salt', 32);
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('解密失败:', error.message);
    return text;
  }
}

/**
 * 加载配置
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(content);
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    console.error('加载远端备份配置失败:', error);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * 保存配置
 */
function saveConfig(config) {
  try {
    const configDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存远端备份配置失败:', error);
    return false;
  }
}

/**
 * 获取所有远端备份目标（隐藏敏感信息）
 */
function getAllTargets() {
  const config = loadConfig();
  return config.targets.map(target => ({
    ...target,
    password: target.password ? '********' : undefined,
    accessKeySecret: target.accessKeySecret ? '********' : undefined,
    secretKey: target.secretKey ? '********' : undefined,
    privateKey: target.privateKey ? '********' : undefined,
    passphrase: target.passphrase ? '********' : undefined,
  }));
}

/**
 * 获取单个目标（包含解密后的敏感信息）
 */
function getTarget(id) {
  const config = loadConfig();
  const target = config.targets.find(t => t.id === id);

  if (!target) {
    return null;
  }

  return {
    ...target,
    password: target.password ? decrypt(target.password) : undefined,
    accessKeySecret: target.accessKeySecret ? decrypt(target.accessKeySecret) : undefined,
    secretKey: target.secretKey ? decrypt(target.secretKey) : undefined,
    privateKey: target.privateKey ? decrypt(target.privateKey) : undefined,
    passphrase: target.passphrase ? decrypt(target.passphrase) : undefined,
  };
}

/**
 * 添加远端备份目标
 */
function addTarget(targetData) {
  const config = loadConfig();

  const newTarget = {
    id: `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: targetData.name,
    protocol: targetData.protocol,
    enabled: targetData.enabled !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  switch (targetData.protocol) {
    case PROTOCOL_TYPES.FTP:
    case PROTOCOL_TYPES.SFTP:
      Object.assign(newTarget, {
        host: targetData.host,
        port: targetData.port,
        username: targetData.username,
        password: targetData.password ? encrypt(targetData.password) : undefined,
        rootPath: targetData.rootPath || '/',
        secure: targetData.secure,
      });
      break;

    case PROTOCOL_TYPES.WEBDAV:
      Object.assign(newTarget, {
        url: targetData.url,
        username: targetData.username,
        password: targetData.password ? encrypt(targetData.password) : undefined,
        authType: targetData.authType || 'password',
        rootPath: targetData.rootPath || '/',
      });
      break;

    case PROTOCOL_TYPES.SMB:
      Object.assign(newTarget, {
        host: targetData.host,
        share: targetData.share,
        domain: targetData.domain,
        username: targetData.username,
        password: targetData.password ? encrypt(targetData.password) : undefined,
        rootPath: targetData.rootPath || '/',
      });
      break;

    default:
      throw new Error(`不支持的协议类型：${targetData.protocol}`);
  }

  config.targets.push(newTarget);

  if (saveConfig(config)) {
    return newTarget;
  }

  throw new Error('保存配置失败');
}

/**
 * 更新远端备份目标
 */
function updateTarget(id, updates) {
  const config = loadConfig();
  const targetIndex = config.targets.findIndex(t => t.id === id);

  if (targetIndex === -1) {
    throw new Error('目标不存在');
  }

  const existingTarget = config.targets[targetIndex];
  const updatedTarget = { ...existingTarget, ...updates, updatedAt: new Date().toISOString() };

  if (updates.password) {
    updatedTarget.password = encrypt(updates.password);
  }
  if (updates.accessKeySecret) {
    updatedTarget.accessKeySecret = encrypt(updates.accessKeySecret);
  }
  if (updates.secretKey) {
    updatedTarget.secretKey = encrypt(updates.secretKey);
  }
  if (updates.privateKey) {
    updatedTarget.privateKey = encrypt(updates.privateKey);
  }
  if (updates.passphrase) {
    updatedTarget.passphrase = encrypt(updates.passphrase);
  }

  config.targets[targetIndex] = updatedTarget;

  if (saveConfig(config)) {
    return updatedTarget;
  }

  throw new Error('保存配置失败');
}

/**
 * 删除远端备份目标
 */
function deleteTarget(id) {
  const config = loadConfig();
  const initialLength = config.targets.length;

  config.targets = config.targets.filter(t => t.id !== id);

  if (config.targets.length < initialLength) {
    if (saveConfig(config)) {
      return true;
    }
    throw new Error('保存配置失败');
  }

  return false;
}

/**
 * 获取全局设置
 */
function getGlobalSettings() {
  const config = loadConfig();
  return config.globalSettings;
}

/**
 * 更新全局设置
 */
function updateGlobalSettings(settings) {
  const config = loadConfig();
  config.globalSettings = { ...config.globalSettings, ...settings };

  if (saveConfig(config)) {
    return config.globalSettings;
  }

  throw new Error('保存配置失败');
}

/**
 * 获取启用的目标列表
 */
function getEnabledTargets() {
  const config = loadConfig();
  if (!config.globalSettings.enabled) {
    return [];
  }
  return config.targets.filter(t => t.enabled);
}

module.exports = {
  loadConfig,
  saveConfig,
  getAllTargets,
  getTarget,
  addTarget,
  updateTarget,
  deleteTarget,
  getGlobalSettings,
  updateGlobalSettings,
  getEnabledTargets,
  encrypt,
  decrypt,
};
