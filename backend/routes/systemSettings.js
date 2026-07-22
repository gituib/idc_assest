const logger = require('../utils/logger').module('SystemSettingsRoute');
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { authMiddleware, clearMaintenanceCache, requireAdmin } = require('../middleware/auth');

// 读取 package.json 获取版本号
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const APP_VERSION = packageJson.version || '1.0.0';

// 公开路由（无需认证）- 使用 originalUrl 匹配，兼容子路由挂载
const publicRoutes = [
  '/system/info',
  '/system/licenses',
];

// 全局认证中间件：所有路由默认需要认证
router.use((req, res, next) => {
  const fullPath = req.originalUrl || req.path;
  if (publicRoutes.some(p => fullPath.endsWith(p))) {
    return next();
  }
  return authMiddleware(req, res, next);
});
const SystemSetting = require('../models/SystemSetting');
const { FRONTEND } = require('../config');
const { logSystemOperation } = require('../utils/operationLogger');

// ===== CPU 使用率采样器 =====
// 说明：os.loadavg() 在 Windows 上始终返回 [0,0,0]，且在 Linux 上是平均负载而非使用率，
// 因此改用 os.cpus().times 差值计算真实 CPU 使用率。后台每 5 秒采样一次，请求时直接读取缓存。
const os = require('os');
const cpuSampleState = {
  prev: null,        // 上次采样的 os.cpus() 结果
  percent: 0,        // 最近一次计算得到的 CPU 使用率
  cores: (os.cpus() || []).length,
  updatedAt: 0,
};

function sampleCpuUsage() {
  try {
    const current = os.cpus();
    if (!current || current.length === 0) {
      return;
    }
    cpuSampleState.cores = current.length;

    // 首次采样只建立基线，无法计算差值
    if (!cpuSampleState.prev) {
      cpuSampleState.prev = current;
      return;
    }

    let totalDiff = 0;
    let idleDiff = 0;
    for (let i = 0; i < cpuSampleState.prev.length && i < current.length; i++) {
      const t1 = cpuSampleState.prev[i].times;
      const t2 = current[i].times;
      const idle = t2.idle - t1.idle;
      const total = (t2.user - t1.user) + (t2.nice - t1.nice) + (t2.sys - t1.sys) + idle + (t2.irq - t1.irq);
      totalDiff += total;
      idleDiff += idle;
    }

    if (totalDiff > 0) {
      let percent = Math.round((1 - idleDiff / totalDiff) * 100);
      percent = Math.min(100, Math.max(0, percent));
      cpuSampleState.percent = percent;
    }
    cpuSampleState.prev = current;
    cpuSampleState.updatedAt = Date.now();
  } catch (err) {
    logger.error('CPU 使用率采样失败', { error: err });
  }
}

// 模块加载时立即采样一次（建立基线），之后每 5 秒采样一次
sampleCpuUsage();
setInterval(sampleCpuUsage, 5000).unref();

// 初始化默认系统设置
const initDefaultSettings = async () => {
  const defaultSettings = [
    // 基本设置 - 站点信息
    {
      settingKey: 'site_name',
      settingValue: JSON.stringify('机柜管理系统'),
      settingType: 'string',
      category: 'general',
      description: '网站名称',
      isEditable: true,
    },
    {
      settingKey: 'site_logo',
      settingValue: JSON.stringify(''),
      settingType: 'string',
      category: 'general',
      description: '网站Logo URL',
      isEditable: true,
    },

    // 基本设置 - 安全设置
    {
      settingKey: 'idle_timeout',
      settingValue: JSON.stringify(30),
      settingType: 'number',
      category: 'general',
      description: '用户空闲超时时间(分钟)',
      isEditable: true,
    },
    {
      settingKey: 'max_login_attempts',
      settingValue: JSON.stringify(5),
      settingType: 'number',
      category: 'general',
      description: '最大登录尝试次数',
      isEditable: true,
    },
    {
      settingKey: 'maintenance_mode',
      settingValue: JSON.stringify(false),
      settingType: 'boolean',
      category: 'general',
      description: '维护模式',
      isEditable: true,
    },

    // 外观设置
    {
      settingKey: 'primary_color',
      settingValue: JSON.stringify('#667eea'),
      settingType: 'string',
      category: 'appearance',
      description: '主题主色调',
      isEditable: true,
    },
    {
      settingKey: 'secondary_color',
      settingValue: JSON.stringify('#764ba2'),
      settingType: 'string',
      category: 'appearance',
      description: '主题辅助色调',
      isEditable: true,
    },

    // 关于页面
    {
      settingKey: 'app_version',
      settingValue: JSON.stringify(APP_VERSION),
      settingType: 'string',
      category: 'about',
      description: '应用版本',
      isEditable: false,
    },
    {
      settingKey: 'company_name',
      settingValue: JSON.stringify(''),
      settingType: 'string',
      category: 'about',
      description: '公司/组织名称',
      isEditable: true,
    },
    {
      settingKey: 'contact_email',
      settingValue: JSON.stringify(''),
      settingType: 'string',
      category: 'about',
      description: '联系邮箱',
      isEditable: true,
    },
    {
      settingKey: 'contact_phone',
      settingValue: JSON.stringify(''),
      settingType: 'string',
      category: 'about',
      description: '联系电话',
      isEditable: true,
    },
    {
      settingKey: 'company_address',
      settingValue: JSON.stringify(''),
      settingType: 'string',
      category: 'about',
      description: '公司地址',
      isEditable: true,
    },
    {
      settingKey: 'system_description',
      settingValue: JSON.stringify('机柜管理系统 - 专业的数据中心设备管理解决方案'),
      settingType: 'string',
      category: 'about',
      description: '系统描述',
      isEditable: true,
    },
  ];

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const setting of defaultSettings) {
    try {
      const existing = await SystemSetting.findByPk(setting.settingKey);
      if (!existing) {
        await SystemSetting.create(setting);
        createdCount++;
      } else if (existing.description !== setting.description) {
        // 更新描述（用于修复英文描述问题）
        await existing.update({ description: setting.description });
        updatedCount++;
      }
    } catch (error) {
      logger.error('初始化设置 ${setting.settingKey} 失败', { error: error.message });
      errorCount++;
    }
  }

  logger.info(`系统设置初始化结果: 创建 ${createdCount} 个, 更新 ${updatedCount} 个, 失败 ${errorCount} 个`);
  return { createdCount, updatedCount, errorCount };
};

// 注意：初始化现在由 server.js 统一调用，避免重复初始化
// initDefaultSettings();

// 获取所有设置
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const where = {};
    if (category) {
      where.category = category;
    }

    const settings = await SystemSetting.findAll({
      where,
      order: [
        ['category', 'ASC'],
        ['settingKey', 'ASC'],
      ],
    });

    // 格式化返回数据
    const formattedSettings = {};
    settings.forEach(setting => {
      formattedSettings[setting.settingKey] = {
        value: JSON.parse(setting.settingValue),
        type: setting.settingType,
        category: setting.category,
        description: setting.description,
        isEditable: setting.isEditable,
        updatedAt: setting.updatedAt,
      };
    });

    res.json(formattedSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取用户空闲超时配置（公开接口，供前端使用）
// 注意：此路由必须在 /:key 之前定义，否则会被当作 key 参数处理
router.get('/idle-timeout', async (req, res) => {
  try {
    const timeoutSetting = await SystemSetting.findByPk('idle_timeout');

    // 默认配置
    const defaultTimeout = 30; // 30分钟
    const fixedWarningTime = 60; // 固定60秒警告时间

    const timeout = timeoutSetting ? JSON.parse(timeoutSetting.settingValue) : defaultTimeout;

    res.json({
      timeout: timeout * 60 * 1000, // 转换为毫秒
      warningTime: fixedWarningTime * 1000, // 固定10秒（转换为毫秒）
      timeoutMinutes: timeout,
      warningTimeSeconds: fixedWarningTime,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 邮件服务（SMTP）配置管理 ==========
// 重要：以下 /mail* 路由必须在 /:key 之前定义，否则会被当作 key 参数处理

/**
 * 辅助函数：读取 SystemSetting 中邮件配置项（已 JSON.parse）
 * @param {string} key - 配置键
 * @param {*} defaultValue - 默认值
 * @returns {Promise<*>}
 */
async function readMailSetting(key, defaultValue) {
  const setting = await SystemSetting.findByPk(key);
  if (!setting || setting.settingValue == null) return defaultValue;
  try {
    return JSON.parse(setting.settingValue);
  } catch {
    return setting.settingValue;
  }
}

/**
 * 写入或更新单个 SystemSetting 记录
 * @param {string} key - 配置键
 * @param {*} value - 配置值
 * @param {string} type - 配置类型
 * @param {string} description - 描述
 * @returns {Promise<void>}
 */
async function upsertMailSetting(key, value, type, description) {
  const existing = await SystemSetting.findByPk(key);
  if (existing) {
    await existing.update({
      settingValue: JSON.stringify(value),
      settingType: type,
    });
  } else {
    await SystemSetting.create({
      settingKey: key,
      settingValue: JSON.stringify(value),
      settingType: type,
      category: 'mail',
      description,
      isEditable: true,
    });
  }
}

/**
 * 获取 SMTP 邮件配置（密码字段返回掩码，不暴露明文）
 * GET /api/system-settings/mail
 * 权限：仅超级管理员
 */
router.get('/mail', requireAdmin, async (req, res) => {
  try {
    const { MAIL_KEYS } = require('../config/mail');
    const { decrypt, maskSecret } = require('../utils/crypto');

    const [host, port, secure, user, passEncrypted, from, fromName] = await Promise.all([
      readMailSetting(MAIL_KEYS.HOST, ''),
      readMailSetting(MAIL_KEYS.PORT, 465),
      readMailSetting(MAIL_KEYS.SECURE, true),
      readMailSetting(MAIL_KEYS.USER, ''),
      readMailSetting(MAIL_KEYS.PASS_ENCRYPTED, ''),
      readMailSetting(MAIL_KEYS.FROM, ''),
      readMailSetting(MAIL_KEYS.FROM_NAME, 'IDC资产管理系统'),
    ]);

    // 尝试解密密码以生成掩码（保留后 4 位）
    let passMasked = '';
    let hasPassword = false;
    if (passEncrypted) {
      hasPassword = true;
      try {
        const passPlain = decrypt(passEncrypted);
        passMasked = maskSecret(passPlain);
      } catch {
        // 解密失败（如 SMTP_SECRET_KEY 变更），仅显示占位
        passMasked = '••••';
      }
    }

    res.json({
      success: true,
      data: {
        smtpHost: host,
        smtpPort: Number(port) || 465,
        smtpSecure: secure === true || secure === 'true',
        smtpUser: user,
        smtpPassMasked: passMasked,
        hasPassword,
        mailFrom: from,
        mailFromName: fromName,
      },
    });
  } catch (error) {
    logger.error('获取邮件配置失败', { error: error.message });
    res.status(500).json({ success: false, message: '获取邮件配置失败', error: error.message });
  }
});

/**
 * 保存 SMTP 邮件配置（密码字段 AES-256-CBC 加密存储）
 * PUT /api/system-settings/mail
 * 权限：仅超级管理员
 * body: { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass?, mailFrom, mailFromName }
 *       smtpPass 为空字符串/undefined 时保留原密码不变
 */
router.put('/mail', requireAdmin, async (req, res) => {
  try {
    const { MAIL_KEYS } = require('../config/mail');
    const { encrypt } = require('../utils/crypto');
    const mailer = require('../services/mailer');

    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, mailFrom, mailFromName } = req.body;

    // 校验必填字段
    if (!smtpHost || !smtpUser) {
      return res.status(400).json({ success: false, message: 'SMTP 服务器和用户名为必填项' });
    }

    // 读取现有密码密文（用于 smtpPass 为空时保留）
    const existingPassEncrypted = await readMailSetting(MAIL_KEYS.PASS_ENCRYPTED, '');

    // 决定最终密码密文
    let finalPassEncrypted = existingPassEncrypted;
    const passwordChanged = smtpPass && String(smtpPass).trim() !== '';
    if (passwordChanged) {
      finalPassEncrypted = encrypt(smtpPass);
    } else if (!existingPassEncrypted) {
      return res.status(400).json({ success: false, message: '请输入 SMTP 密码/授权码' });
    }

    // 写入所有配置项
    await Promise.all([
      upsertMailSetting(MAIL_KEYS.HOST, smtpHost, 'string', 'SMTP 服务器地址'),
      upsertMailSetting(MAIL_KEYS.PORT, Number(smtpPort) || 465, 'number', 'SMTP 端口'),
      upsertMailSetting(MAIL_KEYS.SECURE, smtpSecure === true || smtpSecure === 'true', 'boolean', '是否使用 SSL'),
      upsertMailSetting(MAIL_KEYS.USER, smtpUser, 'string', 'SMTP 用户名'),
      upsertMailSetting(MAIL_KEYS.PASS_ENCRYPTED, finalPassEncrypted, 'string', 'SMTP 密码（加密存储）'),
      upsertMailSetting(MAIL_KEYS.FROM, mailFrom || smtpUser, 'string', '发件人邮箱'),
      upsertMailSetting(MAIL_KEYS.FROM_NAME, mailFromName || 'IDC资产管理系统', 'string', '发件人名称'),
    ]);

    // 重建 transporter 使新配置立即生效
    await mailer.rebuildTransporter();

    await logSystemOperation('update', '更新邮件服务 SMTP 配置', {
      targetName: '邮件服务配置',
      afterState: {
        smtpHost,
        smtpPort: Number(smtpPort) || 465,
        smtpUser,
        mailFrom: mailFrom || smtpUser,
        passwordChanged,
      },
      req,
      metadata: {
        changedFields: Object.keys(req.body),
        passwordChanged,
      },
    });

    res.json({ success: true, message: '邮件配置保存成功' });
  } catch (error) {
    logger.error('保存邮件配置失败', { error: error.message });
    await logSystemOperation('update', '保存邮件服务配置失败', {
      targetName: '邮件服务配置',
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ success: false, message: '保存邮件配置失败', error: error.message });
  }
});

/**
 * 发送测试邮件（不写入数据库，仅用当前配置发送一封测试邮件）
 * POST /api/system-settings/mail/test
 * 权限：仅超级管理员
 * body: { to: 'admin@example.com' }
 */
router.post('/mail/test', requireAdmin, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, message: '请提供收件人邮箱' });
    }

    const mailer = require('../services/mailer');
    const result = await mailer.sendTemplate(
      to,
      'test-mail',
      { to, mailFromName: 'IDC资产管理系统' },
      '【测试邮件】IDC资产管理系统'
    );

    await logSystemOperation('test', `发送测试邮件到 ${to}`, {
      targetName: '测试邮件',
      afterState: { to, success: result.success },
      result: result.success ? 'success' : 'failed',
      req,
      metadata: { to, success: result.success, error: result.error },
    });

    if (result.success) {
      res.json({ success: true, message: `测试邮件已发送到 ${to}` });
    } else {
      const errorMsg =
        result.error === 'MAIL_NOT_CONFIGURED'
          ? '邮件服务未配置，请先保存 SMTP 配置'
          : result.hint || `测试邮件发送失败：${result.error}`;
      res.status(400).json({ success: false, message: errorMsg, error: result.error });
    }
  } catch (error) {
    logger.error('发送测试邮件异常', { error: error.message });
    res.status(500).json({ success: false, message: '发送测试邮件异常', error: error.message });
  }
});

// 获取单个设置
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SystemSetting.findByPk(key);

    if (!setting) {
      return res.status(404).json({ error: '设置不存在' });
    }

    res.json({
      key: setting.settingKey,
      value: JSON.parse(setting.settingValue),
      type: setting.settingType,
      category: setting.category,
      description: setting.description,
      isEditable: setting.isEditable,
      updatedAt: setting.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新设置
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const setting = await SystemSetting.findByPk(key);

    if (!setting) {
      return res.status(404).json({ error: '设置不存在' });
    }

    if (!setting.isEditable) {
      await logSystemOperation('update', `尝试修改不可编辑的设置：${key}`, {
        targetId: key,
        targetName: key,
        result: 'failed',
        req,
        metadata: { reason: 'not_editable' },
      });
      return res.status(403).json({ error: '该设置不可编辑' });
    }

    const beforeValue = JSON.parse(setting.settingValue);

    // 验证值类型
    let parsedValue = value;
    if (setting.settingType === 'number') {
      parsedValue = Number(value);
      if (isNaN(parsedValue)) {
        return res.status(400).json({ error: '值必须是有效的数字' });
      }
    } else if (setting.settingType === 'boolean') {
      parsedValue = value === true || value === 'true' || value === '1' || value === 1;
    }

    await setting.update({
      settingValue: JSON.stringify(parsedValue),
    });

    // 如果更新了维护模式设置，清除缓存
    if (key === 'maintenance_mode') {
      clearMaintenanceCache();
    }

    // 维护模式开关单独标记操作类型，便于审计筛选
    const operationType = key === 'maintenance_mode' ? 'maintenance_mode' : 'update';
    const description =
      key === 'maintenance_mode'
        ? `切换维护模式：${beforeValue ? '开启' : '关闭'} → ${parsedValue ? '开启' : '关闭'}`
        : `更新设置【${setting.description || key}】`;

    await logSystemOperation(operationType, description, {
      targetId: key,
      targetName: setting.description || key,
      beforeState: { value: beforeValue },
      afterState: { value: parsedValue },
      req,
      metadata: { key, oldValue: beforeValue, newValue: parsedValue },
    });

    res.json({
      message: '设置更新成功',
      setting: {
        key: setting.settingKey,
        value: parsedValue,
        updatedAt: setting.updatedAt,
      },
    });
  } catch (error) {
    await logSystemOperation('update', `更新设置失败：${req.params.key}`, {
      targetId: req.params.key,
      targetName: req.params.key,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

// 批量更新设置
router.put('/', async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: '请提供有效的设置对象' });
    }

    const updatedSettings = [];
    const errors = [];
    const beforeAfterStates = [];

    for (const [key, value] of Object.entries(settings)) {
      try {
        const setting = await SystemSetting.findByPk(key);

        if (!setting) {
          errors.push({ key, error: '设置不存在' });
          continue;
        }

        if (!setting.isEditable) {
          errors.push({ key, error: '该设置不可编辑' });
          continue;
        }

        const beforeValue = JSON.parse(setting.settingValue);
        let parsedValue = value;
        if (setting.settingType === 'number') {
          parsedValue = Number(value);
          if (isNaN(parsedValue)) {
            errors.push({ key, error: '值必须是有效的数字' });
            continue;
          }
        } else if (setting.settingType === 'boolean') {
          parsedValue = Boolean(value);
        }

        await setting.update({
          settingValue: JSON.stringify(parsedValue),
        });

        updatedSettings.push({ key, value: parsedValue });
        beforeAfterStates.push({ key, before: beforeValue, after: parsedValue });
      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }

    res.json({
      message: `成功更新 ${updatedSettings.length} 个设置`,
      updatedSettings,
      errors: errors.length > 0 ? errors : undefined,
    });

    // 如果更新了维护模式设置，清除缓存
    if ('maintenance_mode' in settings) {
      clearMaintenanceCache();
    }

    // 异步记录批量更新日志
    logSystemOperation('batch_update', `批量更新系统设置：成功 ${updatedSettings.length} 个，失败 ${errors.length} 个`, {
      targetName: '系统设置批量更新',
      afterState: { updated: updatedSettings, errors },
      req,
      metadata: {
        updatedKeys: updatedSettings.map(s => s.key),
        errorKeys: errors.map(e => e.key),
        changes: beforeAfterStates,
      },
    });
  } catch (error) {
    await logSystemOperation('batch_update', `批量更新系统设置失败：${error.message}`, {
      targetName: '系统设置批量更新',
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

// 重置设置为默认值
router.post('/reset/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SystemSetting.findByPk(key);

    if (!setting) {
      return res.status(404).json({ error: '设置不存在' });
    }

    const defaultValues = {
      site_name: '机柜管理系统',
      site_logo: '',
      idle_timeout: 30,
      max_login_attempts: 5,
      maintenance_mode: false,
      primary_color: '#667eea',
      secondary_color: '#764ba2',
      company_name: '',
      contact_email: '',
      contact_phone: '',
      company_address: '',
      system_description: '机柜管理系统 - 专业的数据中心设备管理解决方案',
    };

    const defaultValue = defaultValues[key];
    if (defaultValue === undefined) {
      return res.status(400).json({ error: '该设置没有默认值' });
    }

    const beforeValue = JSON.parse(setting.settingValue);

    await setting.update({
      settingValue: JSON.stringify(defaultValue),
    });

    // 如果重置了维护模式设置，清除缓存
    if (key === 'maintenance_mode') {
      clearMaintenanceCache();
    }

    await logSystemOperation('reset', `重置设置【${setting.description || key}】为默认值`, {
      targetId: key,
      targetName: setting.description || key,
      beforeState: { value: beforeValue },
      afterState: { value: defaultValue },
      req,
      metadata: { key, oldValue: beforeValue, newValue: defaultValue },
    });

    res.json({
      message: '设置已重置为默认值',
      key,
      value: defaultValue,
    });
  } catch (error) {
    await logSystemOperation('reset', `重置设置失败：${req.params.key}`, {
      targetId: req.params.key,
      targetName: req.params.key,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

// 手动执行备份
router.post('/backup', async (req, res) => {
  try {
    // 获取系统设置中的备份路径
    const backupPathSetting = await SystemSetting.findByPk('backup_path');
    const backupPath = backupPathSetting ? JSON.parse(backupPathSetting.settingValue) : './backups';

    // 解析备份目录路径
    let backupDir;
    if (backupPath.startsWith('/') || backupPath.match(/^[A-Za-z]:\//)) {
      // 绝对路径
      backupDir = backupPath;
    } else {
      // 相对路径，基于项目根目录
      backupDir = path.join(__dirname, '../', backupPath);
    }

    // 确保备份目录存在
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_${timestamp}.json`);

    // 获取所有数据库数据
    const Device = require('../models/Device');
    const Rack = require('../models/Rack');
    const Room = require('../models/Room');
    const Consumable = require('../models/Consumable');
    const User = require('../models/User');

    const backupData = {
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      data: {
        devices: await Device.findAll({ raw: true }),
        racks: await Rack.findAll({ raw: true }),
        rooms: await Room.findAll({ raw: true }),
        consumables: await Consumable.findAll({ raw: true }),
        // 不包含敏感用户信息
        users: await User.findAll({
          attributes: ['userId', 'username', 'role', 'createdAt', 'updatedAt'],
          raw: true,
        }),
      },
    };

    // 写入备份文件
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    // 更新最后备份时间
    const lastBackupSetting = await SystemSetting.findByPk('last_backup_time');
    if (lastBackupSetting) {
      await lastBackupSetting.update({
        settingValue: JSON.stringify(new Date().toISOString()),
      });
    }

    // 统计备份文件数量
    const backupFiles = fs.readdirSync(backupDir).filter(f => f.startsWith('backup_'));
    const countSetting = await SystemSetting.findByPk('backup_count');
    if (countSetting) {
      await countSetting.update({
        settingValue: JSON.stringify(backupFiles.length),
      });
    }

    res.json({
      message: '备份成功',
      backupFile: `${backupPath}/backup_${timestamp}.json`,
      fileSize: fs.statSync(backupFile).size,
      backupCount: backupFiles.length,
    });

    await logSystemOperation('backup', `系统设置页手动备份：backup_${timestamp}.json`, {
      targetId: `backup_${timestamp}.json`,
      targetName: `backup_${timestamp}.json`,
      afterState: {
        fileSize: fs.statSync(backupFile).size,
        backupCount: backupFiles.length,
      },
      req,
      metadata: { filename: `backup_${timestamp}.json`, trigger: 'system_settings_page' },
    });
  } catch (error) {
    logger.error('备份失败', { error: error.message, stack: error.stack });
    await logSystemOperation('backup', `系统设置页手动备份失败：${error.message}`, {
      result: 'failed',
      req,
      metadata: { error: error.message, trigger: 'system_settings_page' },
    });
    res.status(500).json({ error: '备份失败' });
  }
});

// 辅助函数：获取备份目录路径
const getBackupDir = async () => {
  const backupPathSetting = await SystemSetting.findByPk('backup_path');
  const backupPath = backupPathSetting ? JSON.parse(backupPathSetting.settingValue) : './backups';

  let backupDir;
  if (backupPath.startsWith('/') || backupPath.match(/^[A-Za-z]:\//)) {
    // 绝对路径
    backupDir = backupPath;
  } else {
    // 相对路径，基于项目根目录
    backupDir = path.join(__dirname, '../', backupPath);
  }

  return backupDir;
};

// 获取备份列表
router.get('/backup/list', async (req, res) => {
  try {
    const backupDir = await getBackupDir();

    if (!fs.existsSync(backupDir)) {
      return res.json({ backups: [] });
    }

    const files = fs
      .readdirSync(backupDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => {
        const filePath = path.join(backupDir, f);
        const stats = fs.statSync(filePath);
        return {
          filename: f,
          path: `${path.basename(backupDir)}/${f}`,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ backups: files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 恢复备份
router.post('/backup/restore', async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: '请提供备份文件名' });
    }

    const backupDir = await getBackupDir();
    const backupFile = path.join(backupDir, filename);

    if (!fs.existsSync(backupFile)) {
      return res.status(404).json({ error: '备份文件不存在' });
    }

    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    // 恢复数据
    const { Device, Rack, Room, Consumable, User } = require('../models');

    const restoreCounts = {};

    if (backupData.data.devices) {
      restoreCounts.devices = backupData.data.devices.length;
      for (const device of backupData.data.devices) {
        await Device.upsert(device);
      }
    }

    if (backupData.data.racks) {
      restoreCounts.racks = backupData.data.racks.length;
      for (const rack of backupData.data.racks) {
        await Rack.upsert(rack);
      }
    }

    if (backupData.data.rooms) {
      restoreCounts.rooms = backupData.data.rooms.length;
      for (const room of backupData.data.rooms) {
        await Room.upsert(room);
      }
    }

    if (backupData.data.consumables) {
      restoreCounts.consumables = backupData.data.consumables.length;
      for (const consumable of backupData.data.consumables) {
        await Consumable.upsert(consumable);
      }
    }

    res.json({
      message: '恢复成功',
      restoredAt: new Date().toISOString(),
    });

    await logSystemOperation('restore', `系统设置页恢复备份：${filename}`, {
      targetId: filename,
      targetName: filename,
      afterState: restoreCounts,
      req,
      metadata: { filename, restoreCounts, trigger: 'system_settings_page' },
    });
  } catch (error) {
    logger.error('恢复备份失败', { error: error.message, stack: error.stack });
    await logSystemOperation('restore', `系统设置页恢复备份失败：${req.body.filename || '未知'}`, {
      targetId: req.body.filename,
      targetName: req.body.filename,
      result: 'failed',
      req,
      metadata: { error: error.message, trigger: 'system_settings_page' },
    });
    res.status(500).json({ error: '恢复备份失败' });
  }
});

// 删除备份
router.delete('/backup/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const backupDir = await getBackupDir();
    const backupFile = path.join(backupDir, filename);

    if (!fs.existsSync(backupFile)) {
      return res.status(404).json({ error: '备份文件不存在' });
    }

    fs.unlinkSync(backupFile);

    res.json({ message: '删除成功', filename });

    await logSystemOperation('delete', `系统设置页删除备份文件：${filename}`, {
      targetId: filename,
      targetName: filename,
      req,
      metadata: { filename, trigger: 'system_settings_page' },
    });
  } catch (error) {
    await logSystemOperation('delete', `系统设置页删除备份文件失败：${req.params.filename}`, {
      targetId: req.params.filename,
      targetName: req.params.filename,
      result: 'failed',
      req,
      metadata: { error: error.message, trigger: 'system_settings_page' },
    });
    res.status(500).json({ error: error.message });
  }
});

// 下载备份文件
router.get('/backup/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const backupDir = await getBackupDir();
    const backupFile = path.join(backupDir, filename);

    if (!fs.existsSync(backupFile)) {
      return res.status(404).json({ error: '备份文件不存在' });
    }

    const stats = fs.statSync(backupFile);
    logSystemOperation('download', `系统设置页下载备份文件：${filename}`, {
      targetId: filename,
      targetName: filename,
      req,
      metadata: { filename, size: stats.size, trigger: 'system_settings_page' },
    });

    res.download(backupFile, filename);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取系统信息
router.get('/system/info', async (req, res) => {
  try {
    const Device = require('../models/Device');
    const Rack = require('../models/Rack');
    const Room = require('../models/Room');
    const User = require('../models/User');
    const { sequelize, DB_TYPE, dbDialect } = require('../db');

    // 同步版本号到数据库
    try {
      const existingVersion = await SystemSetting.findByPk('app_version');
      if (existingVersion) {
        const currentVersion = JSON.parse(existingVersion.settingValue);
        if (currentVersion !== APP_VERSION) {
          await existingVersion.update({ settingValue: JSON.stringify(APP_VERSION) });
        }
      }
    } catch (syncError) {
      logger.error('同步版本号到数据库失败', { error: syncError });
    }

    const [deviceCount, rackCount, roomCount, userCount] = await Promise.all([
      Device.count(),
      Rack.count(),
      Room.count(),
      User.count(),
    ]);

    // 获取系统资源使用情况
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMemPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

    // CPU 使用率：读取后台采样器缓存（基于 os.cpus().times 差值，跨平台准确）
    const cpuCores = cpuSampleState.cores;
    const cpuPercent = cpuSampleState.percent;

    // 获取磁盘使用情况（获取根目录）
    let diskPercent = 30; // 默认值
    try {
      // 这是一个简化的方法，实际项目中可能需要使用专门的库
      // 这里使用模拟值，避免依赖额外的库
      diskPercent = Math.min(95, Math.max(20, usedMemPercent - 10));
    } catch (diskError) {
      logger.error('获取磁盘信息失败', { error: diskError });
    }

    // 数据库连接信息
    let dbInfo;
    const sequelizeVersion = require('sequelize/package.json').version;
    if (DB_TYPE === 'mysql') {
      dbInfo = {
        type: 'mysql',
        dialect: 'mysql',
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
        database: process.env.MYSQL_DATABASE || 'idc_management',
        sequelizeVersion,
        dialectModule: 'mysql2',
        status: 'unknown',
        version: null,
      };
    } else {
      // SQLite：本地文件数据库，无主机/端口概念
      const dbPath = process.env.DB_PATH || './idc_management.db';
      dbInfo = {
        type: 'sqlite',
        dialect: 'sqlite',
        host: 'local file',
        port: null,
        database: dbPath,
        sequelizeVersion,
        dialectModule: 'sqlite3',
        status: 'unknown',
        version: null,
      };
    }

    try {
      await sequelize.authenticate();
      dbInfo.status = 'connected';
      // 查询数据库版本
      const [result] = await sequelize.query(
        DB_TYPE === 'mysql' ? 'SELECT VERSION() AS version;' : 'SELECT sqlite_version() AS version;'
      );
      if (result && result[0] && result[0].version) {
        dbInfo.version = result[0].version;
      }
    } catch (dbError) {
      dbInfo.status = 'disconnected';
      dbInfo.error = dbError.message;
    }

    // 仓库与许可信息
    // 解析仓库信息，统一输出可点击的 URL 和 owner/repo
    const rawRepo = packageJson.repository || null;
    let repoUrl = null;
    let repoOwner = null;
    let repoName = null;
    if (rawRepo) {
      const rawUrl = typeof rawRepo === 'string' ? rawRepo : rawRepo.url;
      if (rawUrl) {
        // 去除 git+/ssh 协议前缀，规范化为 https URL
        let normalized = rawUrl
          .replace(/^git\+/, '')
          .replace(/^git@github\.com:/, 'https://github.com/')
          .replace(/\.git$/, '');
        if (!/^https?:\/\//.test(normalized) && normalized.includes('github.com')) {
          normalized = `https://${normalized}`;
        }
        repoUrl = normalized;
        const match = normalized.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
        if (match) {
          repoOwner = match[1];
          repoName = match[2];
        }
      }
    }
    const repoInfo = {
      repository: rawRepo,
      repoUrl,
      repoOwner,
      repoName,
      license: packageJson.license || null,
      author: packageJson.author || null,
      homepage: packageJson.homepage || null,
      issuesUrl: repoOwner && repoName ? `https://github.com/${repoOwner}/${repoName}/issues` : null,
    };

    // 技术支持信息（来自系统设置中的公司信息）
    const supportInfo = {
      companyName: null,
      contactEmail: null,
      contactPhone: null,
      companyAddress: null,
      systemDescription: null,
    };
    try {
      const supportKeys = ['company_name', 'contact_email', 'contact_phone', 'company_address', 'system_description'];
      const supportSettings = await SystemSetting.findAll({
        where: { settingKey: { [Op.in]: supportKeys } },
      });
      const supportMap = {};
      supportSettings.forEach(s => {
        supportMap[s.settingKey] = s.settingValue ? JSON.parse(s.settingValue) : null;
      });
      supportInfo.companyName = supportMap.company_name || null;
      supportInfo.contactEmail = supportMap.contact_email || null;
      supportInfo.contactPhone = supportMap.contact_phone || null;
      supportInfo.companyAddress = supportMap.company_address || null;
      supportInfo.systemDescription = supportMap.system_description || null;
    } catch (supportErr) {
      logger.error('获取技术支持信息失败', { error: supportErr });
    }

    res.json({
      system: {
        name: '机柜管理系统',
        version: APP_VERSION,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        hostname: os.hostname(),
        memoryUsage: process.memoryUsage(),
        pid: process.pid,
      },
      systemMetrics: {
        cpu: {
          percent: Math.min(100, Math.max(0, cpuPercent)),
          cores: cpuCores,
        },
        memory: {
          percent: usedMemPercent,
          totalMB: Math.round(totalMem / 1024 / 1024),
          usedMB: Math.round((totalMem - freeMem) / 1024 / 1024),
          freeMB: Math.round(freeMem / 1024 / 1024),
        },
        disk: {
          percent: diskPercent,
        },
      },
      database: dbInfo,
      repoInfo,
      supportInfo,
      statistics: {
        devices: deviceCount,
        racks: rackCount,
        rooms: roomCount,
        users: userCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取开源许可列表
 * GET /api/system-settings/system/licenses
 * 读取 backend 和 frontend 的 package.json 以及 node_modules 中的 license 字段
 */
router.get('/system/licenses', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const backendPkgPath = path.join(__dirname, '..', 'package.json');
    const frontendPkgPath = path.join(__dirname, '..', '..', 'frontend', 'package.json');

    const readPkg = (pkgPath) => {
      try {
        return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      } catch (e) {
        return null;
      }
    };

    const backendPkg = readPkg(backendPkgPath);
    const frontendPkg = readPkg(frontendPkgPath);

    // 收集所有依赖（含 dependencies 和 devDependencies）
    const collectDeps = (pkg, scope) => {
      const result = [];
      if (!pkg) return result;
      ['dependencies', 'devDependencies'].forEach((depType) => {
        if (pkg[depType]) {
          Object.entries(pkg[depType]).forEach(([name, version]) => {
            result.push({
              name,
              versionSpec: version,
              scope,
              type: depType === 'devDependencies' ? 'dev' : 'runtime',
            });
          });
        }
      });
      return result;
    };

    const allDeps = [
      ...collectDeps(backendPkg, 'backend'),
      ...collectDeps(frontendPkg, 'frontend'),
    ];

    // 尝试读取每个依赖的实际版本和 license（从 node_modules）
    const resolveLicenseInfo = (dep, scopeRoot) => {
      try {
        const depPkgPath = path.join(scopeRoot, 'node_modules', dep.name, 'package.json');
        const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
        let license = depPkg.license;
        if (!license && Array.isArray(depPkg.licenses) && depPkg.licenses.length > 0) {
          license = depPkg.licenses[0].type || depPkg.licenses[0].name;
        }
        return {
          installedVersion: depPkg.version || null,
          license: license || 'Unknown',
          homepage: depPkg.homepage || null,
          repository: depPkg.repository
            ? (typeof depPkg.repository === 'string' ? depPkg.repository : depPkg.repository.url)
            : null,
        };
      } catch (e) {
        return { installedVersion: null, license: 'Unknown', homepage: null, repository: null };
      }
    };

    const backendRoot = path.join(__dirname, '..');
    const frontendRoot = path.join(__dirname, '..', '..', 'frontend');

    const licenses = allDeps.map(dep => {
      const info = resolveLicenseInfo(dep, dep.scope === 'backend' ? backendRoot : frontendRoot);
      return { ...dep, ...info };
    }).filter(dep => dep.name !== 'all'); // 过滤掉 "all" 占位依赖

    // 按许可类型分组统计
    const licenseGroups = {};
    licenses.forEach(dep => {
      const lic = dep.license || 'Unknown';
      if (!licenseGroups[lic]) licenseGroups[lic] = [];
      licenseGroups[lic].push(dep);
    });

    res.json({
      success: true,
      total: licenses.length,
      licenses,
      groups: Object.keys(licenseGroups).map(k => ({
        license: k,
        count: licenseGroups[k].length,
      })).sort((a, b) => b.count - a.count),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取前端端口配置（供 vite.config.js 使用）
router.get('/frontend/port', async (req, res) => {
  try {
    const portSetting = await SystemSetting.findByPk('frontend_port');
    const port = portSetting ? JSON.parse(portSetting.settingValue) : FRONTEND.DEFAULT_PORT;
    res.json({ port });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 同步前端端口到配置文件（供前端保存设置后调用）
router.post('/frontend/port/sync', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    const portSetting = await SystemSetting.findByPk('frontend_port');
    const port = portSetting ? JSON.parse(portSetting.settingValue) : FRONTEND.DEFAULT_PORT;

    // 写入前端配置文件
    const frontendDir = path.join(__dirname, '../../frontend');
    const configPath = path.join(frontendDir, '.frontend-port');

    fs.writeFileSync(configPath, port.toString(), 'utf-8');

    res.json({
      message: '前端端口配置已同步',
      port,
      configPath: '.frontend-port',
      notice: '配置已更新，请重启前端服务以应用新端口',
    });

    await logSystemOperation('update', `同步前端端口配置：${port}`, {
      targetId: 'frontend_port',
      targetName: '前端端口配置',
      afterState: { port, configPath: '.frontend-port' },
      req,
      metadata: { port },
    });
  } catch (error) {
    await logSystemOperation('update', `同步前端端口配置失败：${error.message}`, {
      targetId: 'frontend_port',
      targetName: '前端端口配置',
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

// 重启前端服务
router.post('/frontend/restart', async (req, res) => {
  try {
    const { restartFrontend, getStatus } = require('../../scripts/frontend-manager');

    // 先获取当前状态
    const beforeStatus = await getStatus();

    // 执行重启
    const result = await restartFrontend();

    res.json({
      message: '前端服务重启成功',
      before: beforeStatus,
      after: {
        pid: result.pid,
        port: result.port,
        url: `http://localhost:${result.port}`,
      },
    });

    await logSystemOperation('restart', `重启前端服务：PID ${beforeStatus?.pid} → ${result.pid}`, {
      targetName: '前端服务',
      beforeState: beforeStatus,
      afterState: { pid: result.pid, port: result.port },
      req,
      metadata: { beforePid: beforeStatus?.pid, afterPid: result.pid, port: result.port },
    });
  } catch (error) {
    await logSystemOperation('restart', `重启前端服务失败：${error.message}`, {
      targetName: '前端服务',
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * 检查系统更新
 * GET /api/system-settings/system/check-update
 * 调用 GitHub API 获取最新 tag，与当前版本比较
 */
// 版本检查结果缓存（5 分钟）
let updateCheckCache = null;
let updateCheckCacheTime = 0;
const UPDATE_CHECK_CACHE_TTL = 5 * 60 * 1000;

router.get('/system/check-update', async (req, res) => {
  try {
    const now = Date.now();

    // 命中缓存直接返回
    if (updateCheckCache && (now - updateCheckCacheTime) < UPDATE_CHECK_CACHE_TTL) {
      return res.json(updateCheckCache);
    }

    // 解析仓库信息
    const rawRepo = packageJson.repository || null;
    let repoOwner = null;
    let repoName = null;
    if (rawRepo) {
      const rawUrl = typeof rawRepo === 'string' ? rawRepo : rawRepo.url;
      if (rawUrl) {
        const match = rawUrl
          .replace(/^git\+/, '')
          .replace(/^git@github\.com:/, 'https://github.com/')
          .replace(/\.git$/, '')
          .match(/github\.com[/:]([^/]+)\/([^/.]+)/);
        if (match) {
          repoOwner = match[1];
          repoName = match[2];
        }
      }
    }

    if (!repoOwner || !repoName) {
      const result = {
        success: true,
        data: {
          hasUpdate: false,
          currentVersion: APP_VERSION,
          latestVersion: null,
          latestTag: null,
          releaseUrl: null,
          releaseNotes: null,
          publishedAt: null,
          error: '未配置 GitHub 仓库信息，无法检查更新',
        },
      };
      updateCheckCache = result;
      updateCheckCacheTime = now;
      return res.json(result);
    }

    // 调用 GitHub API 获取 tags
    const axios = require('axios');
    const https = require('https');
    const githubAgent = new https.Agent({ rejectUnauthorized: false });
    let tags = [];
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repoOwner}/${repoName}/tags`,
        {
          params: { per_page: 10 },
          timeout: 10000,
          headers: { 'Accept': 'application/vnd.github.v3+json' },
          httpsAgent: githubAgent,
        }
      );
      tags = response.data || [];
    } catch (githubError) {
      logger.warn('GitHub API 请求失败', { error: githubError.message });
      const result = {
        success: true,
        data: {
          hasUpdate: false,
          currentVersion: APP_VERSION,
          latestVersion: null,
          latestTag: null,
          releaseUrl: null,
          releaseNotes: null,
          publishedAt: null,
          error: `无法访问 GitHub（${githubError.message}）`,
        },
      };
      updateCheckCache = result;
      updateCheckCacheTime = now;
      return res.json(result);
    }

    if (tags.length === 0) {
      const result = {
        success: true,
        data: {
          hasUpdate: false,
          currentVersion: APP_VERSION,
          latestVersion: null,
          latestTag: null,
          releaseUrl: null,
          releaseNotes: null,
          publishedAt: null,
          error: '未找到任何版本 tag',
        },
      };
      updateCheckCache = result;
      updateCheckCacheTime = now;
      return res.json(result);
    }

    // 从 tag 名中提取语义化版本号（去掉 v 前缀）
    const parseVersion = (tag) => {
      const match = tag.name.match(/^v?(\d+\.\d+\.\d+)/);
      if (!match) return null;
      const parts = match[1].split('.').map(Number);
      return { major: parts[0], minor: parts[1], patch: parts[2], raw: match[1] };
    };

    // 找到最新有效版本的 tag
    let latestTag = null;
    let latestVersion = null;
    for (const tag of tags) {
      const v = parseVersion(tag);
      if (v) {
        if (!latestVersion || isNewer(v, latestVersion)) {
          latestVersion = v;
          latestTag = tag;
        }
      }
    }

    // 解析当前版本
    const currentParts = APP_VERSION.split('.').map(Number);
    const currentVersion = { major: currentParts[0], minor: currentParts[1], patch: currentParts[2] };

    const hasUpdate = latestVersion && isNewer(latestVersion, currentVersion);

    // 尝试获取 release 信息（用于 changelog）
    let releaseNotes = null;
    let publishedAt = null;
    if (hasUpdate && latestTag) {
      try {
        const releaseRes = await axios.get(
          `https://api.github.com/repos/${repoOwner}/${repoName}/releases/tags/${latestTag.name}`,
          {
            timeout: 10000,
            headers: { 'Accept': 'application/vnd.github.v3+json' },
            httpsAgent: githubAgent,
          }
        );
        if (releaseRes.data) {
          releaseNotes = releaseRes.data.body || null;
          publishedAt = releaseRes.data.published_at || null;
        }
      } catch (releaseError) {
        // release 不存在不影响版本检查结果
        logger.debug('获取 release 信息失败', { tag: latestTag.name, error: releaseError.message });
      }
    }

    const result = {
      success: true,
      data: {
        hasUpdate,
        currentVersion: APP_VERSION,
        latestVersion: latestVersion ? latestVersion.raw : null,
        latestTag: latestTag ? latestTag.name : null,
        releaseUrl: hasUpdate ? `https://github.com/${repoOwner}/${repoName}/releases/tag/${latestTag.name}` : null,
        releaseNotes,
        publishedAt,
        // 项目根目录（update.js 所在位置）
        projectPath: path.join(__dirname, '..'),
        // 是否运行在 Docker 容器中
        isDocker: fs.existsSync('/.dockerenv'),
        error: null,
      },
    };

    updateCheckCache = result;
    updateCheckCacheTime = now;
    res.json(result);
  } catch (error) {
    logger.error('检查更新失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: '检查更新失败',
    });
  }
});

/**
 * 比较两个语义化版本号，返回 a > b 是否成立
 * a.newer(b) => a 比 b 新
 */
function isNewer(a, b) {
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch > b.patch;
}

module.exports = router;
module.exports.initDefaultSettings = initDefaultSettings;
