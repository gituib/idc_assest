const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { authMiddleware } = require('../middleware/auth');
const {
  getBackupPath,
  ensureBackupDir,
  createBackup,
  validateBackupFile,
  restoreBackup,
  cleanOldBackups,
} = require('../utils/backup');
const {
  loadSettings,
  saveSettings,
  validateCronExpression,
  timeToCron,
  startAutoBackup,
  stopAutoBackup,
  getAutoBackupStatus,
  updateAutoBackupSettings,
  executeBackupNow,
} = require('../utils/autoBackupScheduler');
const {
  getBackupLogs,
  getBackupLogById,
  deleteOldLogs,
} = require('../utils/backupLog');
const {
  getAllTargets,
  getTarget,
  addTarget,
  updateTarget,
  deleteTarget,
  getGlobalSettings,
  updateGlobalSettings,
  getEnabledTargets,
} = require('../utils/remoteBackupConfig');
const { testRemoteConnection, PROTOCOL_TYPES, PROTOCOL_LABELS } = require('../utils/remoteBackup');

const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

router.post('/', async (req, res) => {
  try {
    const { description = '', includeFiles = true } = req.body;

    console.log('开始创建备份...');
    const result = await createBackup({
      description,
      includeFiles: includeFiles !== false,
    });

    res.json({
      success: true,
      message: '备份创建成功',
      data: result,
    });
  } catch (error) {
    console.error('创建备份失败:', error);
    res.status(500).json({
      success: false,
      message: '创建备份失败',
      error: error.message,
    });
  }
});

router.get('/list', async (req, res) => {
  try {
    const backupPath = getBackupPath();

    if (!fs.existsSync(backupPath)) {
      return res.json({
        success: true,
        data: { backups: [], total: 0 },
      });
    }

    const files = fs.readdirSync(backupPath)
      .filter(f => (f.startsWith('backup_') || f.startsWith('uploaded_')) && (f.endsWith('.json') || f.endsWith('.json.gz')))
      .map(async f => {
        const filePath = path.join(backupPath, f);
        const stats = fs.statSync(filePath);
        const isCompressed = f.endsWith('.gz');
        
        // 尝试从文件内容中提取元数据
        let metadata = {
          filename: f,
          size: stats.size,
          compressed: isCompressed,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        };
        
        try {
          // 读取文件头部的元数据信息
          let content;
          if (isCompressed) {
            const compressed = fs.readFileSync(filePath);
            content = zlib.gunzipSync(compressed).toString('utf8');
          } else {
            content = fs.readFileSync(filePath, 'utf8');
          }
          
          const backupData = JSON.parse(content);
          
          // 提取关键元数据
          metadata.description = backupData.description || '';
          metadata.backupType = backupData.backupType || 'full';
          metadata.version = backupData.version || '1.0.0';
          metadata.timestamp = backupData.timestamp;
          metadata.checksum = backupData.checksum;
          metadata.metadata = backupData.metadata;
          metadata.systemInfo = backupData.systemInfo;
          
          // 判断是否为上传的文件（通过文件名判断）
          metadata.isUploaded = f.startsWith('uploaded_');
          
        } catch (error) {
          // 如果读取失败，标记为无效文件
          metadata.invalid = true;
          metadata.error = '无法读取文件内容';
        }
        
        return metadata;
      });
    
    const resolvedFiles = await Promise.all(files);

    res.json({
      success: true,
      data: { backups: resolvedFiles, total: resolvedFiles.length },
    });
  } catch (error) {
    console.error('获取备份列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取备份列表失败',
      error: error.message,
    });
  }
});

router.get('/validate/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const backupPath = getBackupPath();
    const filePath = path.join(backupPath, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '备份文件不存在',
      });
    }

    const validation = await validateBackupFile(filePath);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error('验证备份文件失败:', error);
    res.status(500).json({
      success: false,
      message: '验证备份文件失败',
      error: error.message,
    });
  }
});

router.get('/restore-progress/:filename', authMiddleware, async (req, res) => {
  const { filename } = req.params;
  const options = req.query.options ? JSON.parse(req.query.options) : {};

  if (!filename) {
    return res.status(400).json({
      success: false,
      message: '请提供备份文件名',
    });
  }

  const backupPath = getBackupPath();
  const filePath = path.join(backupPath, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: '备份文件不存在',
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    console.log(`开始恢复备份: ${filename}`);
    sendProgress({ stage: 'start', message: '正在验证备份文件...', progress: 5 });

    const validation = await validateBackupFile(filePath);
    if (!validation.valid) {
      sendProgress({ stage: 'error', message: `备份文件验证失败: ${validation.error}`, progress: 0 });
      res.end();
      return;
    }

    sendProgress({ stage: 'validate', message: '备份文件验证通过', progress: 10, metadata: validation.metadata });

    const buffer = fs.readFileSync(filePath);
    const isCompressed = filePath.endsWith('.gz');
    
    let backupData;
    if (isCompressed) {
      sendProgress({ stage: 'decompress', message: '正在解压备份文件...', progress: 15 });
      const decompressed = zlib.gunzipSync(buffer);
      backupData = JSON.parse(decompressed.toString('utf8'));
    } else {
      backupData = JSON.parse(buffer.toString('utf8'));
    }

    sendProgress({ stage: 'parse', message: '正在解析备份数据...', progress: 20 });

    const totalTables = require('../utils/backup').RESTORE_ORDER.length;
    let processedTables = 0;

    const result = await restoreBackup(filePath, {
      overwriteExisting: options.overwriteExisting !== false,
      skipTables: options.skipTables || [],
      skipFiles: options.skipFiles === true,
      onProgress: (tableName, status, count) => {
        processedTables++;
        const progress = 20 + Math.floor((processedTables / totalTables) * 70);
        const statusMap = {
          'restored': '已恢复',
          'skipped': '已跳过',
          'empty': '无数据',
          'error': '错误',
        };
        sendProgress({
          stage: 'restore',
          message: `正在恢复: ${tableName} (${statusMap[status] || status}${count ? ` - ${count} 条` : ''})`,
          progress,
          currentTable: tableName,
          status,
          count,
          processedTables,
          totalTables,
        });
      },
    });

    sendProgress({ 
      stage: 'complete', 
      message: '恢复完成!', 
      progress: 100,
      result: {
        tablesRestored: result.tablesRestored,
        recordsRestored: result.recordsRestored,
        filesRestored: result.filesRestored,
        restoredAt: result.restoredAt,
        tableDetails: result.tableDetails,
        fileDetails: result.fileDetails,
      }
    });

    res.end();
  } catch (error) {
    console.error('恢复备份失败:', error);
    sendProgress({ stage: 'error', message: `恢复失败: ${error.message}`, progress: 0 });
    res.end();
  }
});

router.post('/restore', async (req, res) => {
  try {
    const { filename, options = {} } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: '请提供备份文件名',
      });
    }

    const backupPath = getBackupPath();
    const filePath = path.join(backupPath, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '备份文件不存在',
      });
    }

    console.log(`开始恢复备份: ${filename}`);

    const result = await restoreBackup(filePath, {
      overwriteExisting: options.overwriteExisting !== false,
      skipTables: options.skipTables || [],
      skipFiles: options.skipFiles === true,
      onProgress: (tableName, status, count) => {
        console.log(`  ${tableName}: ${status}${count ? ` (${count})` : ''}`);
      },
    });

    res.json({
      success: true,
      message: '数据恢复成功',
      data: result,
    });
  } catch (error) {
    console.error('恢复备份失败:', error);
    res.status(500).json({
      success: false,
      message: '恢复备份失败',
      error: error.message,
    });
  }
});

router.post('/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.backup) {
      return res.status(400).json({
        success: false,
        message: '请上传备份文件',
      });
    }

    const backupFile = req.files.backup;
    const originalName = backupFile.name || '';
    const nameLower = originalName.toLowerCase();
    
    // 验证文件类型
    if (!nameLower.endsWith('.json') && !nameLower.endsWith('.gz')) {
      return res.status(400).json({
        success: false,
        message: '只支持 JSON 或 GZ 格式的备份文件',
      });
    }
    
    const isCompressed = nameLower.endsWith('.gz');
    
    console.log(`上传备份文件: ${originalName}, 压缩: ${isCompressed}, 大小: ${backupFile.size}`);

    // 保存到临时文件
    const tempFilename = `upload_${Date.now()}`;
    const tempPath = path.join(tempDir, tempFilename);
    
    await backupFile.mv(tempPath);

    const validation = await validateBackupFile(tempPath, { isCompressed });

    if (!validation.valid) {
      fs.unlinkSync(tempPath);
      return res.status(400).json({
        success: false,
        message: `备份文件验证失败: ${validation.error}`,
      });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const ext = isCompressed ? '.json.gz' : '.json';
    const newFilename = `uploaded_${timestamp}${ext}`;
    const backupPath = getBackupPath();
    ensureBackupDir(backupPath);
    const targetPath = path.join(backupPath, newFilename);

    fs.renameSync(tempPath, targetPath);

    res.json({
      success: true,
      message: '备份文件上传成功',
      data: {
        filename: newFilename,
        validation,
      },
    });
  } catch (error) {
    console.error('上传备份文件失败:', error);
    res.status(500).json({
      success: false,
      message: '上传备份文件失败',
      error: error.message,
    });
  }
});

router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const backupPath = getBackupPath();
    const filePath = path.join(backupPath, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '备份文件不存在',
      });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('下载备份文件失败:', err);
      }
    });
  } catch (error) {
    console.error('下载备份文件失败:', error);
    res.status(500).json({
      success: false,
      message: '下载备份文件失败',
      error: error.message,
    });
  }
});

router.delete('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const backupPath = getBackupPath();
    const filePath = path.join(backupPath, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '备份文件不存在',
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: '备份文件已删除',
      data: { filename },
    });
  } catch (error) {
    console.error('删除备份文件失败:', error);
    res.status(500).json({
      success: false,
      message: '删除备份文件失败',
      error: error.message,
    });
  }
});

router.get('/info', (req, res) => {
  try {
    const backupPath = getBackupPath();
    let totalSize = 0;
    let backupCount = 0;

    if (fs.existsSync(backupPath)) {
      const files = fs.readdirSync(backupPath).filter(f => f.endsWith('.json') || f.endsWith('.json.gz'));
      backupCount = files.length;
      files.forEach(f => {
        const stats = fs.statSync(path.join(backupPath, f));
        totalSize += stats.size;
      });
    }

    res.json({
      success: true,
      data: {
        backupPath,
        backupCount,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
      },
    });
  } catch (error) {
    console.error('获取备份信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取备份信息失败',
      error: error.message,
    });
  }
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

router.post('/clean', (req, res) => {
  try {
    const { maxCount = 30, maxAgeDays = 90, dryRun = false } = req.body;

    const result = cleanOldBackups({ maxCount, maxAgeDays, dryRun });

    res.json({
      success: true,
      message: dryRun ? '预览完成' : '清理完成',
      data: result,
    });
  } catch (error) {
    console.error('清理备份失败:', error);
    res.status(500).json({
      success: false,
      message: '清理备份失败',
      error: error.message,
    });
  }
});

router.use((error, req, res, next) => {
  console.error('路由错误:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: error.message,
  });
});

// ==================== 自动备份接口 ====================

// 获取自动备份状态
router.get('/auto/status', (req, res) => {
  try {
    const status = getAutoBackupStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('获取自动备份状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取自动备份状态失败',
      error: error.message,
    });
  }
});

// 更新自动备份设置
router.post('/auto/settings', (req, res) => {
  try {
    const {
      enabled,
      hour,
      minute,
      cronExpression,
      description,
      includeFiles,
      compress,
      maxCount,
      maxAgeDays,
      backupType,
    } = req.body;

    const newSettings = {};
    if (enabled !== undefined) newSettings.enabled = enabled;
    if (hour !== undefined || minute !== undefined) {
      newSettings.hour = hour || 2;
      newSettings.minute = minute || 0;
    }
    if (cronExpression) {
      if (!validateCronExpression(cronExpression)) {
        return res.status(400).json({
          success: false,
          message: '无效的 Cron 表达式',
        });
      }
      newSettings.cronExpression = cronExpression;
    }
    if (description) newSettings.description = description;
    if (includeFiles !== undefined) newSettings.includeFiles = includeFiles;
    if (compress !== undefined) newSettings.compress = compress;
    if (maxCount !== undefined) newSettings.maxCount = maxCount;
    if (maxAgeDays !== undefined) newSettings.maxAgeDays = maxAgeDays;
    if (backupType !== undefined) newSettings.backupType = backupType;

    const success = updateAutoBackupSettings(newSettings);
    if (success) {
      const status = getAutoBackupStatus();
      res.json({
        success: true,
        message: '自动备份设置已更新',
        data: status,
      });
    } else {
      res.status(500).json({
        success: false,
        message: '保存设置失败',
      });
    }
  } catch (error) {
    console.error('更新自动备份设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新自动备份设置失败',
      error: error.message,
    });
  }
});

// 立即执行备份
router.post('/auto/execute', async (req, res) => {
  try {
    const { description, includeFiles, compress, backupType } = req.body;
    
    const result = await executeBackupNow({
      description: description || '手动触发备份',
      includeFiles,
      compress,
      backupType,
    });

    if (result.success) {
      res.json({
        success: true,
        message: '备份执行成功',
        data: result.result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error,
      });
    }
  } catch (error) {
    console.error('立即执行备份失败:', error);
    res.status(500).json({
      success: false,
      message: '立即执行备份失败',
      error: error.message,
    });
  }
});

// 测试 Cron 表达式
router.post('/auto/test-cron', (req, res) => {
  try {
    const { cronExpression } = req.body;
    
    if (!cronExpression) {
      return res.status(400).json({
        success: false,
        message: '请提供 Cron 表达式',
      });
    }

    const isValid = validateCronExpression(cronExpression);
    
    res.json({
      success: isValid,
      message: isValid ? 'Cron 表达式有效' : 'Cron 表达式无效',
      data: {
        valid: isValid,
        cronExpression,
      },
    });
  } catch (error) {
    console.error('测试 Cron 表达式失败:', error);
    res.status(500).json({
      success: false,
      message: '测试 Cron 表达式失败',
      error: error.message,
    });
  }
});

// ==================== 远端备份配置路由 ====================

// 获取所有远端备份目标
router.get('/remote/targets', (req, res) => {
  try {
    const targets = getAllTargets();
    res.json({
      success: true,
      data: { targets },
    });
  } catch (error) {
    console.error('获取远端备份目标失败:', error);
    res.status(500).json({
      success: false,
      message: '获取远端备份目标失败',
      error: error.message,
    });
  }
});

// 获取单个远端备份目标
router.get('/remote/targets/:id', (req, res) => {
  try {
    const target = getTarget(req.params.id);
    
    if (!target) {
      return res.status(404).json({
        success: false,
        message: '目标不存在',
      });
    }
    
    res.json({
      success: true,
      data: { target },
    });
  } catch (error) {
    console.error('获取远端备份目标失败:', error);
    res.status(500).json({
      success: false,
      message: '获取远端备份目标失败',
      error: error.message,
    });
  }
});

// 添加远端备份目标
router.post('/remote/targets', (req, res) => {
  try {
    const targetData = req.body;
    
    if (!targetData.name || !targetData.protocol) {
      return res.status(400).json({
        success: false,
        message: '请提供目标名称和协议类型',
      });
    }
    
    const target = addTarget(targetData);
    
    res.status(201).json({
      success: true,
      message: '远端备份目标已添加',
      data: { target },
    });
  } catch (error) {
    console.error('添加远端备份目标失败:', error);
    res.status(500).json({
      success: false,
      message: '添加远端备份目标失败',
      error: error.message,
    });
  }
});

// 更新远端备份目标
router.put('/remote/targets/:id', (req, res) => {
  try {
    const updates = req.body;
    const target = updateTarget(req.params.id, updates);
    
    res.json({
      success: true,
      message: '远端备份目标已更新',
      data: { target },
    });
  } catch (error) {
    console.error('更新远端备份目标失败:', error);
    res.status(500).json({
      success: false,
      message: '更新远端备份目标失败',
      error: error.message,
    });
  }
});

// 删除远端备份目标
router.delete('/remote/targets/:id', (req, res) => {
  try {
    const deleted = deleteTarget(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: '目标不存在',
      });
    }
    
    res.json({
      success: true,
      message: '远端备份目标已删除',
    });
  } catch (error) {
    console.error('删除远端备份目标失败:', error);
    res.status(500).json({
      success: false,
      message: '删除远端备份目标失败',
      error: error.message,
    });
  }
});

// 直接测试远端连接（不保存，用于添加节点前的测试）
router.post('/remote/test', async (req, res) => {
  try {
    const config = req.body;
    console.log(`[RemoteBackup] 收到连接测试请求:`, JSON.stringify(config));

    if (!config.host || !config.port || !config.username) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的连接信息（主机、端口、用户名）',
      });
    }

    if (!config.protocol) {
      const port = parseInt(config.port);
      if (port === 22 || port === 2222) {
        config.protocol = 'sftp';
      } else if (port === 445 || port === 139 || port === 443) {
        config.protocol = 'smb';
      } else if (port === 80 || port === 443 || config.url) {
        config.protocol = 'webdav';
      } else {
        config.protocol = 'ftp';
      }
      console.log(`[RemoteBackup] 推断协议类型: ${config.protocol} (基于端口 ${config.port})`);
    }

    const result = await testRemoteConnection(config);
    console.log(`[RemoteBackup] 连接测试结果:`, JSON.stringify(result));
    
    if (result.success) {
      res.json({
        success: true,
        message: '连接测试成功',
        data: result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[RemoteBackup] 测试远端连接失败:', error);
    res.status(500).json({
      success: false,
      message: '测试远端连接失败',
      error: error.message,
    });
  }
});

// 测试远端连接
router.post('/remote/targets/:id/test', async (req, res) => {
  try {
    const target = getTarget(req.params.id);
    
    if (!target) {
      return res.status(404).json({
        success: false,
        message: '目标不存在',
      });
    }
    
    const result = await testRemoteConnection(target);
    
    if (result.success) {
      res.json({
        success: true,
        message: '连接测试成功',
        data: result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('测试远端连接失败:', error);
    res.status(500).json({
      success: false,
      message: '测试远端连接失败',
      error: error.message,
    });
  }
});

// 获取远端备份全局设置
router.get('/remote/settings', (req, res) => {
  try {
    const settings = getGlobalSettings();
    res.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    console.error('获取远端备份设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取远端备份设置失败',
      error: error.message,
    });
  }
});

// 更新远端备份全局设置
router.put('/remote/settings', (req, res) => {
  try {
    const settings = updateGlobalSettings(req.body);
    res.json({
      success: true,
      message: '远端备份设置已更新',
      data: { settings },
    });
  } catch (error) {
    console.error('更新远端备份设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新远端备份设置失败',
      error: error.message,
    });
  }
});

// 获取支持的协议列表
router.get('/remote/protocols', (req, res) => {
  try {
    const protocols = Object.entries(PROTOCOL_TYPES).map(([key, value]) => ({
      key,
      value,
      label: PROTOCOL_LABELS[value],
    }));
    
    res.json({
      success: true,
      data: { protocols },
    });
  } catch (error) {
    console.error('获取协议列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取协议列表失败',
      error: error.message,
    });
  }
});

// 手动上传备份到远端
router.post('/remote/upload', async (req, res) => {
  try {
    const { filename, targetIds } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: '请提供备份文件名',
      });
    }
    
    const backupPath = getBackupPath();
    const filePath = path.join(backupPath, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '备份文件不存在',
      });
    }
    
    const { uploadToRemote } = require('../utils/remoteBackup');
    const { getTarget } = require('../utils/remoteBackupConfig');
    
    const targets = targetIds 
      ? targetIds.map(id => getTarget(id)).filter(Boolean)
      : getEnabledTargets();
    
    if (targets.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有可用的远端目标',
      });
    }
    
    const uploadResults = [];
    
    for (const target of targets) {
      try {
        const remotePath = `${target.prefix || 'backups/'}${filename}`;
        const result = await uploadToRemote(target, filePath, remotePath);
        
        uploadResults.push({
          targetId: target.id,
          targetName: target.name,
          success: true,
          ...result,
        });
      } catch (error) {
        uploadResults.push({
          targetId: target.id,
          targetName: target.name,
          success: false,
          error: error.message,
        });
      }
    }
    
    res.json({
      success: true,
      message: '上传完成',
      data: { 
        filename,
        results: uploadResults,
      },
    });
  } catch (error) {
    console.error('手动上传备份失败:', error);
    res.status(500).json({
      success: false,
      message: '手动上传备份失败',
      error: error.message,
    });
  }
});

// ==================== 备份日志接口 ====================

// 获取备份日志列表
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, logType, status } = req.query;
    
    const result = await getBackupLogs({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      logType,
      status,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('获取备份日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取备份日志失败',
      error: error.message,
    });
  }
});

// 获取备份日志详情
router.get('/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const log = await getBackupLogById(parseInt(id));
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: '备份日志不存在',
      });
    }
    
    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error('获取备份日志详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取备份日志详情失败',
      error: error.message,
    });
  }
});

// 清理旧日志
router.delete('/logs/clean', async (req, res) => {
  try {
    const { days = 30 } = req.body;
    const deletedCount = await deleteOldLogs(parseInt(days));
    
    res.json({
      success: true,
      message: '清理完成',
      data: { deletedCount },
    });
  } catch (error) {
    console.error('清理旧日志失败:', error);
    res.status(500).json({
      success: false,
      message: '清理旧日志失败',
      error: error.message,
    });
  }
});

module.exports = router;
