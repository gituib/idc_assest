const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const SystemSetting = require('../models/SystemSetting');

// 初始化默认系统设置
const initDefaultSettings = async () => {
  const defaultSettings = [
    // 全局配置
    { settingKey: 'site_name', settingValue: JSON.stringify('机柜管理系统'), settingType: 'string', category: 'general', description: '网站名称', isEditable: true },
    { settingKey: 'site_logo', settingValue: JSON.stringify(''), settingType: 'string', category: 'general', description: '网站Logo URL', isEditable: true },
    { settingKey: 'timezone', settingValue: JSON.stringify('Asia/Shanghai'), settingType: 'string', category: 'general', description: '时区设置', isEditable: true },
    { settingKey: 'date_format', settingValue: JSON.stringify('YYYY-MM-DD'), settingType: 'string', category: 'general', description: '日期格式', isEditable: true },
    { settingKey: 'session_timeout', settingValue: JSON.stringify(30), settingType: 'number', category: 'general', description: '会话超时时间(分钟)', isEditable: true },
    { settingKey: 'max_login_attempts', settingValue: JSON.stringify(5), settingType: 'number', category: 'general', description: '最大登录尝试次数', isEditable: true },
    { settingKey: 'maintenance_mode', settingValue: JSON.stringify(false), settingType: 'boolean', category: 'general', description: '维护模式', isEditable: true },

    // 外观设置
    { settingKey: 'primary_color', settingValue: JSON.stringify('#667eea'), settingType: 'string', category: 'appearance', description: '主题主色调', isEditable: true },
    { settingKey: 'secondary_color', settingValue: JSON.stringify('#764ba2'), settingType: 'string', category: 'appearance', description: '主题辅助色调', isEditable: true },
    { settingKey: 'compact_mode', settingValue: JSON.stringify(false), settingType: 'boolean', category: 'appearance', description: '紧凑模式', isEditable: true },
    { settingKey: 'sidebar_collapsed', settingValue: JSON.stringify(false), settingType: 'boolean', category: 'appearance', description: '侧边栏默认折叠', isEditable: true },
    { settingKey: 'table_row_height', settingValue: JSON.stringify('default'), settingType: 'string', category: 'appearance', description: '表格行高: small/default/middle/large', isEditable: true },
    { settingKey: 'animation_enabled', settingValue: JSON.stringify(true), settingType: 'boolean', category: 'appearance', description: '启用动画效果', isEditable: true },

    // 关于页面
    { settingKey: 'app_version', settingValue: JSON.stringify('1.0.0'), settingType: 'string', category: 'about', description: '应用版本', isEditable: false },
    { settingKey: 'company_name', settingValue: JSON.stringify(''), settingType: 'string', category: 'about', description: '公司/组织名称', isEditable: true },
    { settingKey: 'contact_email', settingValue: JSON.stringify(''), settingType: 'string', category: 'about', description: '联系邮箱', isEditable: true },
    { settingKey: 'contact_phone', settingValue: JSON.stringify(''), settingType: 'string', category: 'about', description: '联系电话', isEditable: true },
    { settingKey: 'company_address', settingValue: JSON.stringify(''), settingType: 'string', category: 'about', description: '公司地址', isEditable: true },
    { settingKey: 'system_description', settingValue: JSON.stringify('机柜管理系统 - 专业的数据中心设备管理解决方案'), settingType: 'string', category: 'about', description: '系统描述', isEditable: true },
    { settingKey: 'privacy_policy', settingValue: JSON.stringify(''), settingType: 'string', category: 'about', description: '隐私政策URL', isEditable: true },
    { settingKey: 'terms_of_service', settingValue: JSON.stringify(''), settingType: 'string', category: 'about', description: '服务条款URL', isEditable: true },
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
      console.error(`初始化设置 ${setting.settingKey} 失败:`, error.message);
      errorCount++;
    }
  }

  console.log(`系统设置初始化结果: 创建 ${createdCount} 个, 更新 ${updatedCount} 个, 失败 ${errorCount} 个`);
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
      order: [['category', 'ASC'], ['settingKey', 'ASC']]
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
        updatedAt: setting.updatedAt
      };
    });
    
    res.json(formattedSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      updatedAt: setting.updatedAt
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
      return res.status(403).json({ error: '该设置不可编辑' });
    }
    
    // 验证值类型
    let parsedValue = value;
    if (setting.settingType === 'number') {
      parsedValue = Number(value);
      if (isNaN(parsedValue)) {
        return res.status(400).json({ error: '值必须是有效的数字' });
      }
    } else if (setting.settingType === 'boolean') {
      parsedValue = Boolean(value);
    }
    
    await setting.update({
      settingValue: JSON.stringify(parsedValue)
    });
    
    res.json({
      message: '设置更新成功',
      setting: {
        key: setting.settingKey,
        value: parsedValue,
        updatedAt: setting.updatedAt
      }
    });
  } catch (error) {
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
          settingValue: JSON.stringify(parsedValue)
        });
        
        updatedSettings.push({ key, value: parsedValue });
      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }
    
    res.json({
      message: `成功更新 ${updatedSettings.length} 个设置`,
      updatedSettings,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
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
      timezone: 'Asia/Shanghai',
      date_format: 'YYYY-MM-DD',
      session_timeout: 30,
      max_login_attempts: 5,
      maintenance_mode: false,
      frontend_port: 3000,
      primary_color: '#667eea',
      secondary_color: '#764ba2',
      compact_mode: false,
      sidebar_collapsed: false,
      table_row_height: 'default',
      animation_enabled: true,
      company_name: '',
      contact_email: '',
      contact_phone: '',
      company_address: '',
      system_description: '机柜管理系统 - 专业的数据中心设备管理解决方案',
      privacy_policy: '',
      terms_of_service: ''
    };
    
    const defaultValue = defaultValues[key];
    if (defaultValue === undefined) {
      return res.status(400).json({ error: '该设置没有默认值' });
    }
    
    await setting.update({
      settingValue: JSON.stringify(defaultValue)
    });
    
    res.json({
      message: '设置已重置为默认值',
      key,
      value: defaultValue
    });
  } catch (error) {
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
      version: '1.0.0',
      data: {
        devices: await Device.findAll({ raw: true }),
        racks: await Rack.findAll({ raw: true }),
        rooms: await Room.findAll({ raw: true }),
        consumables: await Consumable.findAll({ raw: true }),
        // 不包含敏感用户信息
        users: await User.findAll({ 
          attributes: ['userId', 'username', 'role', 'createdAt', 'updatedAt'],
          raw: true 
        })
      }
    };
    
    // 写入备份文件
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    // 更新最后备份时间
    const lastBackupSetting = await SystemSetting.findByPk('last_backup_time');
    if (lastBackupSetting) {
      await lastBackupSetting.update({
        settingValue: JSON.stringify(new Date().toISOString())
      });
    }
    
    // 统计备份文件数量
    const backupFiles = fs.readdirSync(backupDir).filter(f => f.startsWith('backup_'));
    const countSetting = await SystemSetting.findByPk('backup_count');
    if (countSetting) {
      await countSetting.update({
        settingValue: JSON.stringify(backupFiles.length)
      });
    }
    
    res.json({
      message: '备份成功',
      backupFile: `${backupPath}/backup_${timestamp}.json`,
      fileSize: fs.statSync(backupFile).size,
      backupCount: backupFiles.length
    });
  } catch (error) {
    console.error('备份失败:', error);
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
    
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => {
        const filePath = path.join(backupDir, f);
        const stats = fs.statSync(filePath);
        return {
          filename: f,
          path: `${path.basename(backupDir)}/${f}`,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
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
    
    if (backupData.data.devices) {
      for (const device of backupData.data.devices) {
        await Device.upsert(device);
      }
    }
    
    if (backupData.data.racks) {
      for (const rack of backupData.data.racks) {
        await Rack.upsert(rack);
      }
    }
    
    if (backupData.data.rooms) {
      for (const room of backupData.data.rooms) {
        await Room.upsert(room);
      }
    }
    
    if (backupData.data.consumables) {
      for (const consumable of backupData.data.consumables) {
        await Consumable.upsert(consumable);
      }
    }
    
    res.json({
      message: '恢复成功',
      restoredAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('恢复备份失败:', error);
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
  } catch (error) {
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
    
    const [deviceCount, rackCount, roomCount, userCount] = await Promise.all([
      Device.count(),
      Rack.count(),
      Room.count(),
      User.count()
    ]);
    
    res.json({
      system: {
        name: '机柜管理系统',
        version: '1.0.0',
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
        pid: process.pid
      },
      statistics: {
        devices: deviceCount,
        racks: rackCount,
        rooms: roomCount,
        users: userCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取前端端口配置（供 vite.config.js 使用）
router.get('/frontend/port', async (req, res) => {
  try {
    const portSetting = await SystemSetting.findByPk('frontend_port');
    const port = portSetting ? JSON.parse(portSetting.settingValue) : 3000;
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
    const port = portSetting ? JSON.parse(portSetting.settingValue) : 3000;

    // 写入前端配置文件
    const frontendDir = path.join(__dirname, '../../frontend');
    const configPath = path.join(frontendDir, '.frontend-port');

    fs.writeFileSync(configPath, port.toString(), 'utf-8');

    res.json({
      message: '前端端口配置已同步',
      port,
      configPath: '.frontend-port',
      notice: '配置已更新，请重启前端服务以应用新端口'
    });
  } catch (error) {
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
        url: `http://localhost:${result.port}`
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.initDefaultSettings = initDefaultSettings;
