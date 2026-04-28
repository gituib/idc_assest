const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { createBackup, createIncrementalBackup, getBackupPath } = require('./backup');
const { uploadToRemote } = require('./remoteBackup');
const { getEnabledTargets, getGlobalSettings } = require('./remoteBackupConfig');
const { createLogEntry, updateLogStatus } = require('./backupLog');
const logger = require('./logger').module('AutoBackup');

const schedulers = new Map();

const SETTINGS_FILE = path.join(__dirname, '..', 'config', 'auto-backup-settings.json');

const DEFAULT_SETTINGS = {
  enabled: false,
  cronExpression: '0 2 * * *',
  description: '自动备份',
  backupType: 'full',
  includeFiles: true,
  compress: true,
  maxCount: 30,
  maxAgeDays: 90,
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
    }
  } catch (error) {
    logger.error('加载自动备份设置失败', { error: error.message, stack: error.stack });
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  try {
    const configDir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    logger.error('保存自动备份设置失败', { error: error.message, stack: error.stack });
    return false;
  }
}

function validateCronExpression(expression) {
  return cron.validate(expression);
}

function timeToCron(hour, minute) {
  return `${minute} ${hour} * * *`;
}

function calculateNextRun(cronExpression) {
  try {
    const parts = cronExpression.split(' ');
    const minute = parseInt(parts[0]) || 0;
    const hour = parseInt(parts[1]) || 0;

    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next.toLocaleString('zh-CN');
  } catch (error) {
    return '计算失败';
  }
}

function getFileSize(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return stats.size;
    }
  } catch (error) {
    logger.error('获取文件大小失败', { error: error.message, stack: error.stack });
  }
  return null;
}

function createAutoBackupTask(settings) {
  const { cronExpression, description, backupType, includeFiles, compress, maxCount, maxAgeDays } =
    settings;

  if (!validateCronExpression(cronExpression)) {
    throw new Error('无效的 Cron 表达式');
  }

  logger.info('创建自动备份任务', { cronExpression, backupType, nextRun: calculateNextRun(cronExpression) });

  if (schedulers.has('auto-backup')) {
    logger.info('停止已存在的调度器...');
    stopAutoBackup();
  }

  logger.info('创建新调度器...');
  const task = cron.schedule(
    cronExpression,
    async function () {
      logger.info('自动备份任务触发', { triggerTime: new Date().toLocaleString('zh-CN') });

      let logId = null;

      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

        logger.info('创建备份日志...');
        const log = await createLogEntry({
          logType: 'auto',
          description: `${description} - ${timestamp}`,
          backupType: backupType,
          includeFiles: includeFiles,
          compressed: compress,
        });
        logId = log ? log.id : null;

        if (logId) {
          await updateLogStatus(logId, 'running');
        }

        logger.info('准备执行备份...');
        const backupFunction =
          backupType === 'incremental' ? createIncrementalBackup : createBackup;

        const result = await backupFunction({
          description: `${description} - ${timestamp}`,
          includeFiles,
          compress,
          autoClean: true,
          maxCount,
          maxAgeDays,
        });

        if (result) {
          logger.info('自动备份完成', { filename: result.filename, type: result.isIncremental ? '增量备份' : '全量备份' });

          const fileSize = getFileSize(result.path);

          const uploadResults = await uploadToRemoteTargets(result.path, result.filename);

          if (logId) {
            await updateLogStatus(logId, 'success', {
              filename: result.filename,
              filePath: result.path,
              fileSize: fileSize,
              remoteUploads: uploadResults,
            });
          }
        } else {
          logger.info('无数据变化，跳过备份');
          if (logId) {
            await updateLogStatus(logId, 'success', {
              errorMessage: '无数据变化，跳过备份',
            });
          }
        }
      } catch (error) {
        logger.error('自动备份失败', { error: error.message, stack: error.stack });

        if (logId) {
          await updateLogStatus(logId, 'failed', {
            errorMessage: error.message || '未知错误',
          });
        }
      }
    },
    {
      timezone: 'Asia/Shanghai',
    }
  );

  schedulers.set('auto-backup', task);
  logger.info('自动备份任务已成功创建并启动');

  return task;
}

function startAutoBackup(settings = null) {
  if (!settings) {
    settings = loadSettings();
  }

  if (!settings.enabled) {
    logger.info('自动备份已禁用');
    return false;
  }

  try {
    createAutoBackupTask(settings);
    return true;
  } catch (error) {
    logger.error('启动自动备份失败', { error: error.message, stack: error.stack });
    return false;
  }
}

function stopAutoBackup() {
  if (schedulers.has('auto-backup')) {
    const task = schedulers.get('auto-backup');
    task.stop();
    schedulers.delete('auto-backup');
    logger.info('自动备份任务已停止');
    return true;
  }
  return false;
}

function getAutoBackupStatus() {
  const settings = loadSettings();
  const isActive = schedulers.has('auto-backup');

  let nextRun = null;
  if (isActive && settings.enabled) {
    const now = new Date();
    const [minute, hour] = settings.cronExpression.split(' ').slice(0, 2);

    const next = new Date(now);
    next.setHours(parseInt(hour), parseInt(minute), 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    nextRun = next.toISOString();
  }

  return {
    enabled: settings.enabled,
    isActive,
    cronExpression: settings.cronExpression,
    description: settings.description,
    backupType: settings.backupType || 'full',
    includeFiles: settings.includeFiles,
    compress: settings.compress,
    maxCount: settings.maxCount,
    maxAgeDays: settings.maxAgeDays,
    nextRun,
  };
}

function updateAutoBackupSettings(newSettings) {
  const currentSettings = loadSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };

  if (newSettings.hour !== undefined && newSettings.minute !== undefined) {
    updatedSettings.cronExpression = timeToCron(newSettings.hour, newSettings.minute);
    delete updatedSettings.hour;
    delete updatedSettings.minute;
  }

  if (!validateCronExpression(updatedSettings.cronExpression)) {
    throw new Error('无效的 Cron 表达式');
  }

  if (saveSettings(updatedSettings)) {
    if (updatedSettings.enabled) {
      startAutoBackup(updatedSettings);
    } else {
      stopAutoBackup();
    }
    return true;
  }

  return false;
}

async function uploadToRemoteTargets(localFilePath, filename) {
  const globalSettings = getGlobalSettings();

  if (!globalSettings.enabled || !globalSettings.uploadAfterBackup) {
    logger.info('远端备份已禁用');
    return [];
  }

  const enabledTargets = getEnabledTargets();

  if (enabledTargets.length === 0) {
    logger.info('没有启用的远端备份目标');
    return [];
  }

  const uploadResults = [];

  for (const target of enabledTargets) {
    try {
      logger.info(`开始上传到目标：${target.name} (${target.protocol})`);

      const remotePath = (target.prefix || 'backups/') + filename;

      const result = await uploadToRemote(target, localFilePath, remotePath);

      uploadResults.push({
        targetId: target.id,
        targetName: target.name,
        protocol: target.protocol,
        success: true,
        ...result,
      });

      logger.info(`上传到 ${target.name} 成功`);
    } catch (error) {
      logger.error(`上传到 ${target.name} 失败`, { error: error.message, stack: error.stack });
      uploadResults.push({
        targetId: target.id,
        targetName: target.name,
        protocol: target.protocol,
        success: false,
        error: error.message,
      });
    }
  }

  const settings = getGlobalSettings();
  if (settings.deleteLocalAfterUpload && uploadResults.every(r => r.success)) {
    try {
      fs.unlinkSync(localFilePath);
      logger.info('本地备份文件已删除');
    } catch (error) {
      logger.error('删除本地备份文件失败', { error: error.message, stack: error.stack });
    }
  }

  return uploadResults;
}

async function executeBackupNow(options = {}) {
  logger.info('手动触发备份');

  let logId = null;

  try {
    const settings = loadSettings();
    const backupType = options.backupType || settings.backupType || 'full';

    logger.info('创建备份日志...');
    const log = await createLogEntry({
      logType: 'manual',
      description: options.description || '手动备份',
      backupType: backupType,
      includeFiles:
        options.includeFiles !== undefined ? options.includeFiles : settings.includeFiles,
      compressed: options.compress !== undefined ? options.compress : settings.compress,
    });
    logId = log ? log.id : null;

    if (logId) {
      await updateLogStatus(logId, 'running');
    }

    const backupFunction = backupType === 'incremental' ? createIncrementalBackup : createBackup;
    const result = await backupFunction({
      description: options.description || '手动备份',
      includeFiles:
        options.includeFiles !== undefined ? options.includeFiles : settings.includeFiles,
      compress: options.compress !== undefined ? options.compress : settings.compress,
      autoClean: true,
      maxCount: settings.maxCount,
      maxAgeDays: settings.maxAgeDays,
    });

    logger.info('手动备份完成', { filename: result.filename });

    const fileSize = getFileSize(result.path);

    const uploadResults = await uploadToRemoteTargets(result.path, result.filename);

    if (logId) {
      await updateLogStatus(logId, 'success', {
        filename: result.filename,
        filePath: result.path,
        fileSize: fileSize,
        remoteUploads: uploadResults,
      });
    }

    return {
      success: true,
      result,
      remoteUploads: uploadResults,
    };
  } catch (error) {
    logger.error('手动备份失败', { error: error.message, stack: error.stack });

    if (logId) {
      await updateLogStatus(logId, 'failed', {
        errorMessage: error.message || '未知错误',
      });
    }

    return { success: false, error: error.message };
  }
}

function initAutoBackup() {
  logger.info('初始化自动备份调度器');

  const settings = loadSettings();

  logger.info('当前设置', {
    enabled: settings.enabled,
    cronExpression: settings.cronExpression,
    backupType: settings.backupType,
  });

  if (settings.enabled) {
    startAutoBackup(settings);
  } else {
    logger.info('自动备份当前为禁用状态');
  }

  return getAutoBackupStatus();
}

module.exports = {
  loadSettings,
  saveSettings,
  validateCronExpression,
  timeToCron,
  startAutoBackup,
  stopAutoBackup,
  getAutoBackupStatus,
  updateAutoBackupSettings,
  executeBackupNow,
  initAutoBackup,
};
