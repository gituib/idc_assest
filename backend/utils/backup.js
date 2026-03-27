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

const BACKUP_VERSION = '2.0.0';

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

async function restoreData(backupData, options = {}) {
  const { overwriteExisting = true, skipTables = [], onProgress = () => {} } = options;

  const results = {
    tablesRestored: 0,
    recordsRestored: 0,
    errors: [],
    skipped: [],
    tableDetails: {},
  };

  const isIncremental = backupData.backupType === 'incremental';
  const dataToRestore = isIncremental ? backupData.fullData : backupData.data;

  if (!dataToRestore) {
    results.errors.push({ error: '备份数据为空' });
    return results;
  }

  await disableForeignKeyChecks();

  try {
    for (const tableName of RESTORE_ORDER) {
      if (skipTables.includes(tableName)) {
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

        if (overwriteExisting) {
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
        for (const record of processedRecords) {
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
        for (const record of tableIncrement.new) {
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

      if (tableIncrement.updated && tableIncrement.updated.length > 0) {
        for (const record of tableIncrement.updated) {
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
    onProgress = () => {},
  } = options;

  console.log('验证备份文件...');
  const validation = await validateBackupFile(filePath);
  if (!validation.valid) {
    throw new Error(`备份文件验证失败: ${validation.error}`);
  }

  console.log('备份文件信息:');
  console.log(`  版本: ${validation.version}`);
  console.log(`  压缩: ${validation.compressed ? '是' : '否'}`);
  console.log(`  表数: ${validation.metadata.tableCount}`);
  console.log(`  记录数: ${validation.metadata.totalRecords}`);
  console.log(`  文件数: ${validation.metadata.fileCount}`);

  console.log('\n读取备份数据...');
  const buffer = fs.readFileSync(filePath);
  const isCompressed = filePath.endsWith('.gz');

  let backupData;
  if (isCompressed) {
    console.log('解压备份文件...');
    const decompressed = zlib.gunzipSync(buffer);
    backupData = JSON.parse(decompressed.toString('utf8'));
  } else {
    backupData = JSON.parse(buffer.toString('utf8'));
  }

  console.log('\n开始恢复数据...');
  const dataResults = await restoreData(backupData, {
    overwriteExisting,
    skipTables,
    onProgress,
  });

  let fileResults = { filesRestored: 0, errors: [] };
  if (!skipFiles && backupData.files) {
    console.log('\n恢复上传文件...');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    fileResults = await restoreFiles(backupData.files, uploadsDir);
  }

  const stat = fs.statSync(filePath);
  console.log('\n恢复完成!');
  console.log(`备份文件: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`数据记录: ${dataResults.recordsRestored} 条`);
  console.log(`恢复表数: ${dataResults.tablesRestored} 个`);
  console.log(`文件恢复: ${fileResults.filesRestored} 个`);

  if (dataResults.errors.length > 0) {
    console.log('\n恢复错误:');
    dataResults.errors.forEach(err => {
      console.log(`  - ${err.table}: ${err.error}`);
    });
  }

  return {
    restoredAt: new Date().toISOString(),
    tablesRestored: dataResults.tablesRestored,
    recordsRestored: dataResults.recordsRestored,
    filesRestored: fileResults.filesRestored,
    errors: dataResults.errors,
    tableDetails: dataResults.tableDetails, // 每个表的详细恢复信息
    fileDetails: backupData.files
      ? {
          avatars: backupData.files.avatars?.length || 0,
          others: backupData.files.others?.length || 0,
        }
      : null,
  };
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
};
