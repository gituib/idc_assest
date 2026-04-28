/**
 * 数据备份与恢复工具模块
 * 支持完整备份所有数据库表和上传文件
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { sequelize, dbDialect } = require('../db');
const logger = require('./logger').module('Backup');
const { enableMaintenanceMode, disableMaintenanceMode } = require('./maintenanceMode');

const BACKUP_VERSION = '2.0.0';

const BATCH_SIZE = 500;

/**
 * 还原点管理
 * 恢复前自动创建当前数据的临时备份，用于中断或失败时回滚
 */
const SNAPSHOT_DIR = path.join(__dirname, '..', 'backups', '.snapshots');

/**
 * 确保还原点目录存在
 */
function ensureSnapshotDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
  return SNAPSHOT_DIR;
}

/**
 * 生成还原点文件名
 */
function getSnapshotFileName(snapshotId) {
  return path.join(SNAPSHOT_DIR, `snapshot_${snapshotId}.json.gz`);
}

/**
 * 创建还原点（恢复前自动调用）
 * 备份当前数据库所有表的数据
 * @returns {Promise<string|null>} 还原点ID，失败返回null
 */
async function createSnapshot() {
  try {
    ensureSnapshotDir();
    const snapshotId = `pre_restore_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const snapshotPath = getSnapshotFileName(snapshotId);

    logger.info('创建还原点...', { snapshotId });

    // 收集当前所有表的数据
    const snapshotData = {
      version: BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      type: 'snapshot',
      data: {},
      files: null,
    };

    for (const config of BACKUP_MODELS_CONFIG) {
      try {
        const Model = require(config.modelPath);
        const records = await Model.findAll({ raw: true });
        if (records.length > 0) {
          snapshotData.data[config.name] = records;
        }
      } catch (error) {
        logger.warn(`创建还原点时跳过表 ${config.name}`, { error: error.message });
      }
    }

    // 压缩并保存
    const jsonStr = JSON.stringify(snapshotData);
    const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf8'));
    fs.writeFileSync(snapshotPath, compressed);

    logger.info('还原点创建成功', { snapshotId, path: snapshotPath, tables: Object.keys(snapshotData.data).length });
    return snapshotId;
  } catch (error) {
    logger.error('创建还原点失败', { error: error.message, stack: error.stack });
    return null;
  }
}

/**
 * 从还原点恢复数据
 * 当恢复过程被中断或失败时调用，回滚到恢复前的状态
 * @param {string} snapshotId - 还原点ID
 * @returns {Promise<boolean>} 是否成功回滚
 */
async function restoreFromSnapshot(snapshotId) {
  const snapshotPath = getSnapshotFileName(snapshotId);

  if (!fs.existsSync(snapshotPath)) {
    logger.error('还原点不存在，无法回滚', { snapshotId });
    return false;
  }

  try {
    logger.info('开始从还原点回滚数据...', { snapshotId });

    // 读取还原点数据
    const compressed = fs.readFileSync(snapshotPath);
    const decompressed = zlib.gunzipSync(compressed);
    const snapshotData = JSON.parse(decompressed.toString('utf8'));

    if (!snapshotData.data) {
      logger.error('还原点数据无效');
      return false;
    }

    await disableForeignKeyChecks();

    try {
      // 清空所有表（按恢复顺序的逆序，避免外键冲突）
      const clearOrder = [...RESTORE_ORDER].reverse();
      for (const tableName of clearOrder) {
        const config = BACKUP_MODELS_CONFIG.find(c => c.name === tableName);
        if (!config) continue;

        try {
          const Model = require(config.modelPath);
          await Model.destroy({ where: {}, truncate: true });
        } catch (error) {
          logger.warn(`回滚时清空表 ${tableName} 失败`, { error: error.message });
        }
      }

      // 从还原点恢复数据
      let restoredCount = 0;
      for (const tableName of RESTORE_ORDER) {
        const tableData = snapshotData.data[tableName];
        if (!tableData || tableData.length === 0) continue;

        const config = BACKUP_MODELS_CONFIG.find(c => c.name === tableName);
        if (!config) continue;

        try {
          const Model = require(config.modelPath);

          for (let i = 0; i < tableData.length; i += BATCH_SIZE) {
            const batch = tableData.slice(i, i + BATCH_SIZE);
            try {
              await Model.bulkCreate(batch, {
                validate: false,
                individualHooks: false,
                logging: false,
              });
              restoredCount += batch.length;
            } catch (bulkError) {
              for (const record of batch) {
                try {
                  await Model.create(record, { validate: false, silent: true });
                  restoredCount++;
                } catch (insertError) {
                  logger.warn(`回滚时插入 ${tableName} 记录失败`, { error: insertError.message });
                }
              }
            }
          }
        } catch (error) {
          logger.error(`回滚表 ${tableName} 失败`, { error: error.message });
        }
      }

      logger.info('还原点回滚完成', { restoredCount });
      return true;
    } finally {
      await enableForeignKeyChecks();
    }
  } catch (error) {
    logger.error('从还原点回滚失败', { error: error.message, stack: error.stack });
    return false;
  }
}

/**
 * 删除还原点
 * @param {string} snapshotId - 还原点ID
 */
function deleteSnapshot(snapshotId) {
  const snapshotPath = getSnapshotFileName(snapshotId);
  if (fs.existsSync(snapshotPath)) {
    try {
      fs.unlinkSync(snapshotPath);
      logger.info('还原点已删除', { snapshotId });
    } catch (error) {
      logger.warn('删除还原点失败', { snapshotId, error: error.message });
    }
  }
}

/**
 * 清理过期的还原点（保留最近7天）
 */
function cleanupOldSnapshots() {
  try {
    if (!fs.existsSync(SNAPSHOT_DIR)) return;

    const now = Date.now();
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7天

    const files = fs.readdirSync(SNAPSHOT_DIR);
    let deletedCount = 0;

    for (const file of files) {
      if (!file.startsWith('snapshot_pre_restore_')) continue;

      const filePath = path.join(SNAPSHOT_DIR, file);
      const stat = fs.statSync(filePath);
      const age = now - stat.mtimeMs;

      if (age > maxAgeMs) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info('清理过期还原点', { deletedCount });
    }
  } catch (error) {
    logger.warn('清理过期还原点失败', { error: error.message });
  }
}

async function disableForeignKeyChecks() {
  if (dbDialect === 'sqlite') {
    await sequelize.query('PRAGMA foreign_keys = OFF');
  } else if (dbDialect === 'mysql') {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  }
}

async function enableForeignKeyChecks() {
  if (dbDialect === 'sqlite') {
    await sequelize.query('PRAGMA foreign_keys = ON');
  } else if (dbDialect === 'mysql') {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}

// 数据表名称中英文映射
const TABLE_NAME_MAPPING = {
  User: '用户',
  Role: '角色',
  UserRole: '用户角色关联',
  Permission: '权限',
  Room: '机房',
  Rack: '机柜',
  Device: '设备',
  DeviceField: '设备自定义字段',
  DevicePort: '设备端口',
  NetworkCard: '网卡',
  Cable: '线缆',
  PendingDevice: '待入库设备',
  FaultCategory: '故障分类',
  Ticket: '工单',
  TicketField: '工单自定义字段',
  TicketOperationRecord: '工单操作记录',
  ConsumableCategory: '耗材分类',
  Consumable: '耗材',
  ConsumableRecord: '耗材记录',
  ConsumableLog: '耗材操作日志',
  ConsumableLogArchive: '耗材操作日志归档',
  InventoryPlan: '盘点计划',
  InventoryTask: '盘点任务',
  InventoryRecord: '盘点记录',
  SystemSetting: '系统设置',
};

// 增量备份配置
const INCREMENTAL_BACKUP_CONFIG = {
  // 哪些表支持增量备份（需要有 updatedAt 或 createdAt 字段）
  supportedTables: [
    'Device',
    'Ticket',
    'TicketOperationRecord',
    'Consumable',
    'ConsumableRecord',
    'ConsumableLog',
    'InventoryTask',
    'InventoryRecord',
  ],
  // 必须全量备份的表
  fullBackupTables: [
    'User',
    'Role',
    'UserRole',
    'Permission',
    'Room',
    'Rack',
    'DeviceField',
    'DevicePort',
    'NetworkCard',
    'Cable',
    'PendingDevice',
    'FaultCategory',
    'TicketField',
    'ConsumableCategory',
    'ConsumableLogArchive',
    'InventoryPlan',
    'SystemSetting',
  ],
};

const BACKUP_MODELS_CONFIG = [
  { name: 'User', modelPath: '../models/User' },
  { name: 'Role', modelPath: '../models/Role' },
  { name: 'UserRole', modelPath: '../models/UserRole' },
  { name: 'Permission', modelPath: '../models/Permission' },
  { name: 'Room', modelPath: '../models/Room' },
  { name: 'Rack', modelPath: '../models/Rack' },
  { name: 'Device', modelPath: '../models/Device' },
  { name: 'DeviceField', modelPath: '../models/DeviceField' },
  { name: 'DevicePort', modelPath: '../models/DevicePort' },
  { name: 'NetworkCard', modelPath: '../models/NetworkCard' },
  { name: 'Cable', modelPath: '../models/Cable' },
  { name: 'PendingDevice', modelPath: '../models/PendingDevice' },
  { name: 'FaultCategory', modelPath: '../models/FaultCategory' },
  { name: 'Ticket', modelPath: '../models/Ticket' },
  { name: 'TicketField', modelPath: '../models/TicketField' },
  { name: 'TicketOperationRecord', modelPath: '../models/TicketOperationRecord' },
  { name: 'ConsumableCategory', modelPath: '../models/ConsumableCategory' },
  { name: 'Consumable', modelPath: '../models/Consumable' },
  { name: 'ConsumableRecord', modelPath: '../models/ConsumableRecord' },
  { name: 'ConsumableLog', modelPath: '../models/ConsumableLog' },
  { name: 'ConsumableLogArchive', modelPath: '../models/ConsumableLogArchive' },
  { name: 'InventoryPlan', modelPath: '../models/InventoryPlan' },
  { name: 'InventoryTask', modelPath: '../models/InventoryTask' },
  { name: 'InventoryRecord', modelPath: '../models/InventoryRecord' },
  { name: 'SystemSetting', modelPath: '../models/SystemSetting' },
];

const RESTORE_ORDER = [
  'SystemSetting',
  'Role',
  'User',
  'UserRole',
  'Permission',
  'Room',
  'Rack',
  'DeviceField',
  'Device',
  'DevicePort',
  'NetworkCard',
  'Cable',
  'PendingDevice',
  'FaultCategory',
  'TicketField',
  'Ticket',
  'TicketOperationRecord',
  'ConsumableCategory',
  'Consumable',
  'ConsumableRecord',
  'ConsumableLog',
  'ConsumableLogArchive',
  'InventoryPlan',
  'InventoryTask',
  'InventoryRecord',
];

function getBackupPath() {
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

/**
 * 获取上次备份的时间
 */
function getLastBackupTime() {
  const backupDir = getBackupPath();
  const files = fs
    .readdirSync(backupDir)
    .filter(
      f =>
        (f.startsWith('backup_') || f.startsWith('incremental_')) &&
        (f.endsWith('.json') || f.endsWith('.json.gz'))
    )
    .map(f => {
      const filePath = path.join(backupDir, f);
      return {
        filename: f,
        createdAt: fs.statSync(filePath).birthtime,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  if (files.length > 0) {
    return files[0].createdAt;
  }
  return null;
}

/**
 * 收集增量数据（只收集自上次备份以来变化的数据）
 */
async function collectIncrementalData(lastBackupTime) {
  const incrementalData = {};
  let totalNewRecords = 0;
  let totalUpdatedRecords = 0;

  for (const config of BACKUP_MODELS_CONFIG) {
    if (!INCREMENTAL_BACKUP_CONFIG.supportedTables.includes(config.name)) {
      continue;
    }

    try {
      const Model = require(config.modelPath);

      // 查询自上次备份以来新增或更新的记录
      const newRecords = await Model.findAll({
        where: {
          createdAt: {
            [require('sequelize').Op.gt]: lastBackupTime,
          },
        },
      });

      const updatedRecords = await Model.findAll({
        where: {
          updatedAt: {
            [require('sequelize').Op.gt]: lastBackupTime,
          },
          createdAt: {
            [require('sequelize').Op.lte]: lastBackupTime,
          },
        },
      });

      if (newRecords.length > 0 || updatedRecords.length > 0) {
        incrementalData[config.name] = {
          new: newRecords.map(r => r.toJSON()),
          updated: updatedRecords.map(r => r.toJSON()),
          deleted: [], // 删除的记录需要特殊处理，暂时不支持
        };
        totalNewRecords += newRecords.length;
        totalUpdatedRecords += updatedRecords.length;
      }
    } catch (error) {
      console.warn(`收集表 ${config.name} 的增量数据失败:`, error.message);
    }
  }

  return {
    data: incrementalData,
    totalNewRecords,
    totalUpdatedRecords,
    totalChangedRecords: totalNewRecords + totalUpdatedRecords,
  };
}

function ensureBackupDir(backupPath) {
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }
}

async function collectAllData(tableNames = null) {
  const data = {};
  let totalRecords = 0;

  const configsToProcess = tableNames
    ? BACKUP_MODELS_CONFIG.filter(c => tableNames.includes(c.name))
    : BACKUP_MODELS_CONFIG;

  for (const config of configsToProcess) {
    try {
      const Model = require(config.modelPath);
      const records = await Model.findAll({ raw: true });
      data[config.name] = records;
      totalRecords += records.length;
      console.log(`收集 ${config.name}: ${records.length} 条记录`);
    } catch (error) {
      console.warn(`收集 ${config.name} 失败:`, error.message);
      data[config.name] = [];
    }
  }

  return { data, totalRecords };
}

async function collectFiles(uploadsDir) {
  const files = {
    avatars: [],
    others: [],
  };

  const avatarsDir = path.join(uploadsDir, 'avatars');
  if (fs.existsSync(avatarsDir)) {
    const avatarFiles = fs.readdirSync(avatarsDir);
    for (const filename of avatarFiles) {
      const filePath = path.join(avatarsDir, filename);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        const content = fs.readFileSync(filePath);
        files.avatars.push({
          filename,
          path: 'uploads/avatars/',
          content: content.toString('base64'),
          size: stat.size,
        });
      }
    }
  }

  if (fs.existsSync(uploadsDir)) {
    const otherFiles = fs.readdirSync(uploadsDir).filter(f => {
      const filePath = path.join(uploadsDir, f);
      return fs.statSync(filePath).isFile();
    });

    for (const filename of otherFiles) {
      const filePath = path.join(uploadsDir, filename);
      const content = fs.readFileSync(filePath);
      files.others.push({
        filename,
        path: 'uploads/',
        content: content.toString('base64'),
        size: content.length,
      });
    }
  }

  return files;
}

function calculateChecksum(data) {
  const content = JSON.stringify(data);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function createBackup(options = {}) {
  const {
    description = '',
    includeFiles = true,
    backupPath = null,
    compress = true,
    autoClean = true,
    maxCount = 30,
    maxAgeDays = 90,
  } = options;

  const finalBackupPath = backupPath || getBackupPath();
  ensureBackupDir(finalBackupPath);

  console.log('开始备份数据...');
  const { data, totalRecords } = await collectAllData();

  let files = { avatars: [], others: [] };
  let fileCount = 0;

  if (includeFiles) {
    console.log('备份上传文件...');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    files = await collectFiles(uploadsDir);
    fileCount = files.avatars.length + files.others.length;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const ext = compress ? '.json.gz' : '.json';
  const filename = `backup_${timestamp}${ext}`;

  const backupData = {
    version: BACKUP_VERSION,
    backupType: 'full',
    timestamp: new Date().toISOString(),
    description,
    compressed: compress,
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      dbType: process.env.DB_TYPE || 'sqlite',
    },
    metadata: {
      tableCount: Object.keys(data).length,
      totalRecords,
      fileCount,
    },
    data,
    files,
  };

  backupData.checksum = calculateChecksum(backupData);

  const filePath = path.join(finalBackupPath, filename);
  const jsonContent = JSON.stringify(backupData);

  if (compress) {
    const compressed = zlib.gzipSync(Buffer.from(jsonContent, 'utf8'));
    fs.writeFileSync(filePath, compressed);
  } else {
    fs.writeFileSync(filePath, jsonContent, 'utf8');
  }

  const stat = fs.statSync(filePath);

  console.log(`备份完成: ${filename}`);
  console.log(`文件大小: ${(stat.size / 1024).toFixed(2)} KB`);
  if (compress) {
    const originalSize = Buffer.byteLength(jsonContent, 'utf8');
    const ratio = ((1 - stat.size / originalSize) * 100).toFixed(1);
    console.log(`压缩率: ${ratio}% (原始 ${(originalSize / 1024).toFixed(2)} KB)`);
  }
  console.log(`数据记录: ${totalRecords} 条`);
  console.log(`文件数量: ${fileCount} 个`);

  let cleanResult = null;
  if (autoClean) {
    console.log('\n检查旧备份文件...');
    cleanResult = cleanOldBackups({ maxCount, maxAgeDays });
    if (cleanResult.deletedCount > 0) {
      console.log(
        `已清理 ${cleanResult.deletedCount} 个旧备份，释放 ${cleanResult.freedSizeFormatted}`
      );
    } else {
      console.log('无需清理旧备份');
    }
  }

  return {
    filename,
    path: filePath,
    size: stat.size,
    recordCount: totalRecords,
    fileCount,
    compressed: compress,
    createdAt: backupData.timestamp,
    cleaned: cleanResult,
  };
}

/**
 * 创建增量备份
 */
async function createIncrementalBackup(options = {}) {
  const {
    description = '',
    includeFiles = false,
    backupPath = null,
    compress = true,
    autoClean = true,
    maxCount = 30,
    maxAgeDays = 90,
  } = options;

  const finalBackupPath = backupPath || getBackupPath();
  ensureBackupDir(finalBackupPath);

  // 获取上次备份时间
  const lastBackupTime = getLastBackupTime();
  if (!lastBackupTime) {
    console.log('未找到上次备份，执行全量备份');
    return await createBackup(options);
  }

  console.log(`开始增量备份（上次备份时间：${lastBackupTime.toISOString()})...`);

  // 收集增量数据
  const { data: incrementalData, totalChangedRecords } =
    await collectIncrementalData(lastBackupTime);

  if (totalChangedRecords === 0) {
    console.log('自上次备份以来没有数据变化，跳过备份');
    return null;
  }

  // 收集配置数据（总是全量备份）
  console.log('备份配置数据...');
  const { data: fullData } = await collectAllData(INCREMENTAL_BACKUP_CONFIG.fullBackupTables);

  let files = { avatars: [], others: [] };
  let fileCount = 0;

  if (includeFiles) {
    console.log('备份上传文件...');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    files = await collectFiles(uploadsDir);
    fileCount = files.avatars.length + files.others.length;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const ext = compress ? '.json.gz' : '.json';
  const filename = `incremental_${timestamp}${ext}`;

  const backupData = {
    version: BACKUP_VERSION,
    backupType: 'incremental',
    timestamp: new Date().toISOString(),
    description,
    compressed: compress,
    lastBackupTime: lastBackupTime.toISOString(),
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      dbType: process.env.DB_TYPE || 'sqlite',
    },
    metadata: {
      fullBackupTables: Object.keys(fullData).length,
      incrementalTables: Object.keys(incrementalData).length,
      totalChangedRecords,
      fileCount,
    },
    fullData,
    incrementalData,
    files,
  };

  backupData.checksum = calculateChecksum(backupData);

  const filePath = path.join(finalBackupPath, filename);
  const jsonContent = JSON.stringify(backupData);

  if (compress) {
    const compressed = zlib.gzipSync(Buffer.from(jsonContent, 'utf8'));
    fs.writeFileSync(filePath, compressed);
  } else {
    fs.writeFileSync(filePath, jsonContent, 'utf8');
  }

  const stat = fs.statSync(filePath);

  console.log(`增量备份完成：${filename}`);
  console.log(`文件大小：${(stat.size / 1024).toFixed(2)} KB`);
  if (compress) {
    const originalSize = Buffer.byteLength(jsonContent, 'utf8');
    const ratio = ((1 - stat.size / originalSize) * 100).toFixed(1);
    console.log(`压缩率：${ratio}% (原始 ${(originalSize / 1024).toFixed(2)} KB)`);
  }
  console.log(`变化记录：${totalChangedRecords} 条`);
  console.log(`文件数量：${fileCount} 个`);

  let cleanResult = null;
  if (autoClean) {
    console.log('\n检查旧备份文件...');
    cleanResult = cleanOldBackups({ maxCount, maxAgeDays });
    if (cleanResult.deletedCount > 0) {
      console.log(
        `已清理 ${cleanResult.deletedCount} 个旧备份，释放 ${cleanResult.freedSizeFormatted}`
      );
    } else {
      console.log('无需清理旧备份');
    }
  }

  return {
    filename,
    path: filePath,
    size: stat.size,
    recordCount: totalChangedRecords,
    fileCount,
    compressed: compress,
    createdAt: backupData.timestamp,
    cleaned: cleanResult,
    isIncremental: true,
  };
}

async function validateBackupFile(filePath, options = {}) {
  const { isCompressed: forceCompressed } = options;

  if (!fs.existsSync(filePath)) {
    return { valid: false, error: '备份文件不存在' };
  }

  let backupData;
  try {
    const buffer = fs.readFileSync(filePath);
    const isCompressed = forceCompressed !== undefined ? forceCompressed : filePath.endsWith('.gz');

    if (isCompressed) {
      const decompressed = zlib.gunzipSync(buffer);
      backupData = JSON.parse(decompressed.toString('utf8'));
    } else {
      backupData = JSON.parse(buffer.toString('utf8'));
    }
  } catch (error) {
    console.error('备份文件解析失败:', error.message);
    return { valid: false, error: `备份文件格式无效: ${error.message}` };
  }

  if (!backupData.version) {
    return { valid: false, error: '备份文件缺少版本信息' };
  }

  const isIncremental = backupData.backupType === 'incremental';
  const dataToValidate = isIncremental ? backupData.fullData : backupData.data;

  if (!dataToValidate && !isIncremental) {
    return { valid: false, error: '备份文件缺少数据内容' };
  }

  const savedChecksum = backupData.checksum;
  if (savedChecksum) {
    const dataToCheck = { ...backupData };
    delete dataToCheck.checksum;
    const calculatedChecksum = calculateChecksum(dataToCheck);
    if (calculatedChecksum !== savedChecksum) {
      return { valid: false, error: '备份文件校验和不匹配，文件可能已损坏' };
    }
  }

  const tableDetails = {};
  let totalRecords = 0;

  if (isIncremental) {
    if (backupData.fullData) {
      for (const tableName of Object.keys(backupData.fullData)) {
        if (Array.isArray(backupData.fullData[tableName])) {
          const recordCount = backupData.fullData[tableName].length;
          tableDetails[tableName] = {
            recordCount,
            hasData: recordCount > 0,
            displayName: TABLE_NAME_MAPPING[tableName] || tableName,
            type: 'full',
          };
          totalRecords += recordCount;
        }
      }
    }
    if (backupData.incrementalData) {
      for (const tableName of Object.keys(backupData.incrementalData)) {
        const inc = backupData.incrementalData[tableName];
        const newCount = inc.new?.length || 0;
        const updatedCount = inc.updated?.length || 0;
        if (newCount > 0 || updatedCount > 0) {
          tableDetails[tableName] = {
            ...tableDetails[tableName],
            newCount,
            updatedCount,
            recordCount: (tableDetails[tableName]?.recordCount || 0) + newCount + updatedCount,
            hasData: true,
            displayName: TABLE_NAME_MAPPING[tableName] || tableName,
            type: tableDetails[tableName] ? 'both' : 'incremental',
          };
          totalRecords += newCount + updatedCount;
        }
      }
    }
  } else {
    for (const tableName of Object.keys(backupData.data)) {
      if (Array.isArray(backupData.data[tableName])) {
        const recordCount = backupData.data[tableName].length;
        tableDetails[tableName] = {
          recordCount,
          hasData: recordCount > 0,
          displayName: TABLE_NAME_MAPPING[tableName] || tableName,
        };
        totalRecords += recordCount;
      }
    }
  }

  const fileDetails = {
    avatars: backupData.files?.avatars?.length || 0,
    others: backupData.files?.others?.length || 0,
    total: (backupData.files?.avatars?.length || 0) + (backupData.files?.others?.length || 0),
    avatarList:
      backupData.files?.avatars?.map(f => ({
        filename: f.filename,
        size: f.size,
      })) || [],
    otherList:
      backupData.files?.others?.map(f => ({
        filename: f.filename,
        size: f.size,
      })) || [],
  };

  const metadata = isIncremental
    ? {
        tableCount: Object.keys(backupData.fullData || {}).length,
        incrementalTableCount: Object.keys(backupData.incrementalData || {}).length,
        totalRecords,
        totalChangedRecords: backupData.metadata?.totalChangedRecords || totalRecords,
        fileCount: fileDetails.total,
        lastBackupTime: backupData.lastBackupTime,
      }
    : {
        tableCount: Object.keys(backupData.data).length,
        totalRecords,
        fileCount: fileDetails.total,
      };

  return {
    valid: true,
    version: backupData.version,
    backupType: backupData.backupType,
    timestamp: backupData.timestamp,
    description: backupData.description,
    compressed: backupData.compressed,
    systemInfo: backupData.systemInfo,
    metadata,
    details: {
      tables: tableDetails,
      files: fileDetails,
      systemInfo: backupData.systemInfo,
    },
  };
}

// 用户相关表定义
const USER_RELATED_TABLES = ['User', 'UserRole'];

async function restoreData(backupData, options = {}) {
  const { 
    overwriteExisting = true, 
    skipTables = [], 
    skipUserData = false,
    shouldStop = () => false,
    onProgress = () => {} 
  } = options;

  const results = {
    tablesRestored: 0,
    recordsRestored: 0,
    errors: [],
    skipped: [],
    tableDetails: {},
    stopped: false,
  };

  const isIncremental = backupData.backupType === 'incremental';
  const dataToRestore = isIncremental ? backupData.fullData : backupData.data;

  if (!dataToRestore) {
    results.errors.push({ error: '备份数据为空' });
    return results;
  }

  // 如果选择跳过用户数据，将用户相关表添加到跳过列表
  const effectiveSkipTables = [...skipTables];
  if (skipUserData) {
    USER_RELATED_TABLES.forEach(table => {
      if (!effectiveSkipTables.includes(table)) {
        effectiveSkipTables.push(table);
      }
    });
    console.log('已配置跳过用户相关表:', USER_RELATED_TABLES);
  }

  await disableForeignKeyChecks();

  try {
    for (const tableName of RESTORE_ORDER) {
      // 检查是否请求停止
      if (shouldStop()) {
        results.stopped = true;
        console.log('恢复操作被用户中断');
        break;
      }

      if (effectiveSkipTables.includes(tableName)) {
        results.skipped.push(tableName);
        onProgress(tableName, 'skipped');
        continue;
      }

      const tableData = dataToRestore[tableName];
      if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
        onProgress(tableName, 'empty');
        continue;
      }

      const config = BACKUP_MODELS_CONFIG.find(c => c.name === tableName);
      if (!config) {
        results.errors.push({ table: tableName, error: '未找到模型配置' });
        continue;
      }

      try {
        const Model = require(config.modelPath);

        // 对于用户相关表，即使设置了 overwriteExisting 也不截断
        if (overwriteExisting && !USER_RELATED_TABLES.includes(tableName)) {
          await Model.destroy({ where: {}, truncate: true });
        }

        const processedRecords = tableData.map(record => {
          const processed = { ...record };

          if (
            tableName === 'Device' &&
            processed.customFields !== undefined &&
            processed.customFields !== null
          ) {
            if (typeof processed.customFields === 'string') {
              try {
                processed.customFields = JSON.parse(processed.customFields);
              } catch (e) {
                console.warn(
                  `解析 Device.customFields 失败：${processed.deviceId}, 错误：${e.message}`
                );
                processed.customFields = {};
              }
            }
          }

          return processed;
        });

        let insertedCount = 0;

        for (let i = 0; i < processedRecords.length; i += BATCH_SIZE) {
          if (shouldStop()) {
            results.stopped = true;
            logger.info('恢复操作在插入数据时被用户中断');
            break;
          }

          const batch = processedRecords.slice(i, i + BATCH_SIZE);

          try {
            await Model.bulkCreate(batch, {
              validate: false,
              individualHooks: false,
              logging: false,
            });
            insertedCount += batch.length;
          } catch (bulkError) {
            for (const record of batch) {
              try {
                await Model.create(record, { validate: false, silent: true });
                insertedCount++;
              } catch (insertError) {
                if (insertError.name === 'SequelizeUniqueConstraintError') {
                  try {
                    await Model.upsert(record, { validate: false, silent: true });
                    insertedCount++;
                  } catch (upsertError) {
                    results.errors.push({
                      table: tableName,
                      record: record[Object.keys(record)[0]],
                      error: upsertError.message,
                    });
                  }
                } else {
                  results.errors.push({
                    table: tableName,
                    record: record[Object.keys(record)[0]],
                    error: insertError.message,
                  });
                }
              }
            }
          }
        }

        // 如果已停止，跳出外层循环
        if (results.stopped) {
          break;
        }

        results.tablesRestored++;
        results.recordsRestored += insertedCount;

        results.tableDetails[tableName] = {
          recordCount: insertedCount,
          displayName: TABLE_NAME_MAPPING[tableName] || tableName,
          success: insertedCount > 0,
        };

        onProgress(tableName, 'restored', insertedCount);
      } catch (error) {
        results.errors.push({ table: tableName, error: error.message });
        onProgress(tableName, 'error', error.message);
      }
    }

    if (isIncremental && backupData.incrementalData) {
      console.log('\n恢复增量数据...');
      const incrementalResults = await restoreIncrementalData(backupData.incrementalData, options);
      results.tablesRestored += incrementalResults.tablesRestored;
      results.recordsRestored += incrementalResults.recordsRestored;
      results.errors.push(...incrementalResults.errors);
      Object.assign(results.tableDetails, incrementalResults.tableDetails);
    }
  } finally {
    await enableForeignKeyChecks();
  }

  return results;
}

async function restoreIncrementalData(incrementalData, options = {}) {
  const results = {
    tablesRestored: 0,
    recordsRestored: 0,
    errors: [],
    tableDetails: {},
  };

  for (const tableName of Object.keys(incrementalData)) {
    const tableIncrement = incrementalData[tableName];
    const config = BACKUP_MODELS_CONFIG.find(c => c.name === tableName);

    if (!config) {
      results.errors.push({ table: tableName, error: '未找到模型配置' });
      continue;
    }

    try {
      const Model = require(config.modelPath);
      let updatedCount = 0;

      if (tableIncrement.new && tableIncrement.new.length > 0) {
        for (let i = 0; i < tableIncrement.new.length; i += BATCH_SIZE) {
          const batch = tableIncrement.new.slice(i, i + BATCH_SIZE);
          try {
            await Model.bulkCreate(batch, {
              validate: false,
              individualHooks: false,
              logging: false,
            });
            updatedCount += batch.length;
          } catch (bulkError) {
            for (const record of batch) {
              try {
                await Model.create(record, { validate: false, silent: true });
                updatedCount++;
              } catch (insertError) {
                if (insertError.name === 'SequelizeUniqueConstraintError') {
                  await Model.upsert(record, { validate: false, silent: true });
                  updatedCount++;
                } else {
                  results.errors.push({
                    table: tableName,
                    record: record[Object.keys(record)[0]],
                    error: `新增失败: ${insertError.message}`,
                  });
                }
              }
            }
          }
        }
      }

      if (tableIncrement.updated && tableIncrement.updated.length > 0) {
        for (let i = 0; i < tableIncrement.updated.length; i += BATCH_SIZE) {
          const batch = tableIncrement.updated.slice(i, i + BATCH_SIZE);
          for (const record of batch) {
            try {
              await Model.upsert(record, { validate: false, silent: true });
              updatedCount++;
            } catch (updateError) {
              results.errors.push({
                table: tableName,
                record: record[Object.keys(record)[0]],
                error: `更新失败: ${updateError.message}`,
              });
            }
          }
        }
      }

      if (updatedCount > 0) {
        results.tablesRestored++;
        results.recordsRestored += updatedCount;
        results.tableDetails[tableName] = {
          recordCount: updatedCount,
          displayName: TABLE_NAME_MAPPING[tableName] || tableName,
          success: true,
          isIncremental: true,
        };
      }
    } catch (error) {
      results.errors.push({ table: tableName, error: error.message });
    }
  }

  return results;
}

async function restoreFiles(files, uploadsDir) {
  const results = {
    filesRestored: 0,
    errors: [],
  };

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const avatarsDir = path.join(uploadsDir, 'avatars');
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  if (files.avatars && Array.isArray(files.avatars)) {
    for (const file of files.avatars) {
      try {
        const filePath = path.join(avatarsDir, file.filename);
        const content = Buffer.from(file.content, 'base64');
        fs.writeFileSync(filePath, content);
        results.filesRestored++;
      } catch (error) {
        results.errors.push({ file: file.filename, error: error.message });
      }
    }
  }

  if (files.others && Array.isArray(files.others)) {
    for (const file of files.others) {
      try {
        const filePath = path.join(uploadsDir, file.filename);
        const content = Buffer.from(file.content, 'base64');
        fs.writeFileSync(filePath, content);
        results.filesRestored++;
      } catch (error) {
        results.errors.push({ file: file.filename, error: error.message });
      }
    }
  }

  return results;
}

async function restoreBackup(filePath, options = {}) {
  const {
    overwriteExisting = true,
    skipTables = [],
    skipFiles = false,
    skipUserData = false,
    shouldStop = () => false,
    onProgress = () => {},
    enableRollback = true,
  } = options;

  let snapshotId = null;

  try {
    logger.info('验证备份文件...');
    const validation = await validateBackupFile(filePath);
    if (!validation.valid) {
      throw new Error(`备份文件验证失败: ${validation.error}`);
    }

    logger.info('备份文件信息', {
      version: validation.version,
      compressed: validation.compressed,
      tableCount: validation.metadata.tableCount,
      totalRecords: validation.metadata.totalRecords,
      fileCount: validation.metadata.fileCount,
    });

    // 步骤1: 启用维护模式，防止并发操作导致数据不一致
    logger.info('启用维护模式...');
    enableMaintenanceMode('正在恢复备份数据');
    onProgress('maintenance', 'enabled', 0);

    try {
      // 步骤2: 创建还原点（如果启用回滚保护）
      if (enableRollback) {
        logger.info('创建还原点...');
        onProgress('snapshot', 'creating', 0);
        snapshotId = await createSnapshot();

        if (snapshotId) {
          logger.info('还原点创建成功，开始恢复数据...');
          onProgress('snapshot', 'created', 5);
        } else {
          logger.warn('还原点创建失败，继续恢复但无法回滚');
          onProgress('snapshot', 'warning', 5);
        }
      }

      // 步骤3: 读取备份数据
      logger.info('读取备份数据...');
      const buffer = fs.readFileSync(filePath);
      const isCompressed = filePath.endsWith('.gz');

      let backupData;
      if (isCompressed) {
        logger.info('解压备份文件...');
        const decompressed = zlib.gunzipSync(buffer);
        backupData = JSON.parse(decompressed.toString('utf8'));
      } else {
        backupData = JSON.parse(buffer.toString('utf8'));
      }

      // 步骤4: 恢复数据
      logger.info('开始恢复数据...');
      const dataResults = await restoreData(backupData, {
        overwriteExisting,
        skipTables,
        skipUserData,
        shouldStop,
        onProgress,
      });

      // 步骤5: 恢复上传文件（仅在数据恢复未停止时）
      let fileResults = { filesRestored: 0, errors: [] };
      if (!skipFiles && backupData.files && !dataResults.stopped) {
        logger.info('恢复上传文件...');
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        fileResults = await restoreFiles(backupData.files, uploadsDir);
      }

      // 步骤6: 处理恢复结果
      const stat = fs.statSync(filePath);

      if (dataResults.stopped) {
        // 用户中断恢复 - 自动回滚到还原点
        logger.info('恢复被用户中断，准备回滚数据...');

        if (snapshotId && enableRollback) {
          onProgress('rollback', 'starting', 0);
          const rollbackSuccess = await restoreFromSnapshot(snapshotId);

          if (rollbackSuccess) {
            logger.info('数据已成功回滚到恢复前的状态');
            onProgress('rollback', 'completed', 100);
          } else {
            logger.error('数据回滚失败！数据可能处于不一致状态');
            onProgress('rollback', 'failed', 0);
          }
        } else {
          logger.warn('无法回滚：没有可用的还原点');
        }

        // 清理还原点
        if (snapshotId) {
          deleteSnapshot(snapshotId);
        }

        return {
          restoredAt: new Date().toISOString(),
          tablesRestored: dataResults.tablesRestored,
          recordsRestored: dataResults.recordsRestored,
          filesRestored: fileResults.filesRestored,
          errors: dataResults.errors,
          skipped: dataResults.skipped || [],
          stopped: true,
          rolledBack: snapshotId ? true : false,
          tableDetails: dataResults.tableDetails,
          fileDetails: backupData.files
            ? {
                avatars: backupData.files.avatars?.length || 0,
                others: backupData.files.others?.length || 0,
              }
            : null,
        };
      }

      // 恢复成功
      logger.info('恢复完成!', {
        fileSize: `${(stat.size / 1024 / 1024).toFixed(2)} MB`,
        recordsRestored: dataResults.recordsRestored,
        tablesRestored: dataResults.tablesRestored,
        filesRestored: fileResults.filesRestored,
      });

      // 清理还原点（恢复成功，不再需要）
      if (snapshotId) {
        deleteSnapshot(snapshotId);
      }

      // 清理过期还原点
      cleanupOldSnapshots();

      if (dataResults.errors.length > 0) {
        logger.warn('恢复过程中有错误', { errors: dataResults.errors });
      }

      return {
        restoredAt: new Date().toISOString(),
        tablesRestored: dataResults.tablesRestored,
        recordsRestored: dataResults.recordsRestored,
        filesRestored: fileResults.filesRestored,
        errors: dataResults.errors,
        skipped: dataResults.skipped || [],
        stopped: false,
        rolledBack: false,
        tableDetails: dataResults.tableDetails,
        fileDetails: backupData.files
          ? {
              avatars: backupData.files.avatars?.length || 0,
              others: backupData.files.others?.length || 0,
            }
          : null,
      };
    } finally {
      // 无论成功或中断，都解除维护模式
      disableMaintenanceMode();
      onProgress('maintenance', 'disabled', 100);
    }
  } catch (error) {
    // 恢复过程发生异常 - 尝试回滚
    logger.error('恢复过程发生错误', { error: error.message, stack: error.stack });

    if (snapshotId && enableRollback) {
      logger.info('尝试回滚数据到恢复前的状态...');
      const rollbackSuccess = await restoreFromSnapshot(snapshotId);

      if (rollbackSuccess) {
        logger.info('数据已成功回滚');
      } else {
        logger.error('数据回滚失败！数据可能处于不一致状态');
      }

      deleteSnapshot(snapshotId);
    }

    throw error;
  }
}

function cleanOldBackups(options = {}) {
  const { maxCount = 30, maxAgeDays = 90, dryRun = false } = options;

  const backupPath = getBackupPath();

  if (!fs.existsSync(backupPath)) {
    return { deleted: [], kept: [], totalSize: 0, freedSize: 0 };
  }

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  const files = fs
    .readdirSync(backupPath)
    .filter(
      f =>
        (f.startsWith('backup_') || f.startsWith('uploaded_') || f.startsWith('incremental_')) &&
        (f.endsWith('.json') || f.endsWith('.json.gz'))
    )
    .map(f => {
      const filePath = path.join(backupPath, f);
      const stats = fs.statSync(filePath);
      return {
        filename: f,
        path: filePath,
        size: stats.size,
        createdAt: stats.birthtime,
        createdMs: stats.birthtimeMs || stats.birthtime.getTime(),
        age: now - (stats.birthtimeMs || stats.birthtime.getTime()),
      };
    })
    .sort((a, b) => b.createdMs - a.createdMs);

  const toDelete = [];
  const toKeep = [];
  let freedSize = 0;

  files.forEach((file, index) => {
    const tooOld = file.age > maxAgeMs;
    const tooMany = index >= maxCount;

    if (tooOld || tooMany) {
      toDelete.push(file);
      freedSize += file.size;
    } else {
      toKeep.push(file);
    }
  });

  if (!dryRun) {
    toDelete.forEach(file => {
      try {
        fs.unlinkSync(file.path);
        console.log(`已删除旧备份: ${file.filename}`);
      } catch (err) {
        console.warn(`删除备份失败: ${file.filename}`, err.message);
      }
    });
  }

  return {
    deleted: toDelete.map(f => f.filename),
    kept: toKeep.map(f => f.filename),
    deletedCount: toDelete.length,
    keptCount: toKeep.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    freedSize,
    freedSizeFormatted: formatBytes(freedSize),
  };
}

function formatBytes(bytes) {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  BACKUP_VERSION,
  BACKUP_MODELS_CONFIG,
  RESTORE_ORDER,
  INCREMENTAL_BACKUP_CONFIG,
  getBackupPath,
  ensureBackupDir,
  createBackup,
  createIncrementalBackup,
  getLastBackupTime,
  validateBackupFile,
  restoreData,
  restoreIncrementalData,
  restoreFiles,
  restoreBackup,
  calculateChecksum,
  cleanOldBackups,
  createSnapshot,
  restoreFromSnapshot,
  deleteSnapshot,
  cleanupOldSnapshots,
};
