const BackupLog = require('../models/BackupLog');
const fs = require('fs');

async function createLogEntry(options) {
  const { logType, description, backupType, includeFiles, compressed } = options;

  try {
    const log = await BackupLog.create({
      logType: logType || 'manual',
      status: 'pending',
      description: description || '',
      backupType: backupType || 'full',
      includeFiles: includeFiles || false,
      compressed: compressed || false,
      startTime: new Date(),
    });
    return log;
  } catch (error) {
    console.error('创建备份日志失败:', error);
    return null;
  }
}

async function updateLogStatus(logId, status, options = {}) {
  try {
    const updateData = { status };

    if (status === 'running') {
      updateData.startTime = new Date();
    }

    if (status === 'success' || status === 'failed') {
      updateData.endTime = new Date();

      const log = await BackupLog.findByPk(logId);
      if (log && log.startTime) {
        updateData.duration = new Date() - new Date(log.startTime);
      }
    }

    if (options.filename) {
      updateData.filename = options.filename;
    }
    if (options.filePath) {
      updateData.filePath = options.filePath;
    }
    if (options.fileSize) {
      updateData.fileSize = options.fileSize;
    }
    if (options.errorMessage) {
      updateData.errorMessage = options.errorMessage;
    }
    if (options.remoteUploads) {
      updateData.remoteUploads = options.remoteUploads;
    }

    await BackupLog.update(updateData, {
      where: { id: logId },
    });

    return true;
  } catch (error) {
    console.error('更新备份日志失败:', error);
    return false;
  }
}

async function getBackupLogs(options = {}) {
  try {
    const { page = 1, pageSize = 20, logType, status } = options;
    const where = {};

    if (logType) {
      where.logType = logType;
    }
    if (status) {
      where.status = status;
    }

    const offset = (page - 1) * pageSize;

    const { count, rows } = await BackupLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    return {
      logs: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    };
  } catch (error) {
    console.error('获取备份日志失败:', error);
    return { logs: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }
}

async function getBackupLogById(id) {
  try {
    return await BackupLog.findByPk(id);
  } catch (error) {
    console.error('获取备份日志详情失败:', error);
    return null;
  }
}

async function deleteOldLogs(days = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const deletedCount = await BackupLog.destroy({
      where: {
        createdAt: {
          [require('sequelize').Op.lt]: cutoffDate,
        },
      },
    });

    console.log(`删除了 ${deletedCount} 条旧备份日志`);
    return deletedCount;
  } catch (error) {
    console.error('删除旧备份日志失败:', error);
    return 0;
  }
}

module.exports = {
  createLogEntry,
  updateLogStatus,
  getBackupLogs,
  getBackupLogById,
  deleteOldLogs,
};
