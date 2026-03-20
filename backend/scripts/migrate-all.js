/**
 * IDC管理系统 - 数据库迁移汇总脚本
 * 按顺序执行所有数据库迁移
 * 支持幂等执行（重复执行不会出错）
 * 支持 SQLite 和 MySQL
 */

// 必须在最前面加载环境变量
const path = require('path');
const envPath = path.join(__dirname, '../.env');
console.log(`加载环境变量文件: ${envPath}`);
require('dotenv').config({ path: envPath });

console.log('环境变量检查:');
console.log(`  DB_TYPE: ${process.env.DB_TYPE}`);
console.log(`  MYSQL_HOST: ${process.env.MYSQL_HOST}`);
console.log(`  MYSQL_DATABASE: ${process.env.MYSQL_DATABASE}`);
console.log(`  MYSQL_USERNAME: ${process.env.MYSQL_USERNAME}`);

const { sequelize, DB_TYPE, dbDialect } = require('../db');

console.log(`\n数据库连接信息:`);
console.log(`  DB_TYPE (from env): ${DB_TYPE}`);
console.log(`  dbDialect (actual): ${dbDialect}`);
console.log(`  sequelize.getDialect(): ${sequelize.getDialect()}`);

const migrations = [
  {
    name: 'v2.0 - 网卡和端口表',
    description: '创建 network_cards 表，为 device_ports 添加 nic_id 字段',
    migrate: migrateV2
  },
  {
    name: '用户表 pending 状态',
    description: '为用户表添加 pending 状态支持',
    migrate: migratePendingStatus
  },
  {
    name: '耗材乐观锁',
    description: '为 consumables 表添加 version 字段',
    migrate: migrateConsumableVersion
  },
  {
    name: '耗材操作日志表结构',
    description: '添加 isEditable、originalLogId 等修改记录字段',
    migrate: migrateConsumableLogs
  },
  {
    name: '耗材日志解耦',
    description: '添加 isConsumableDeleted 和 consumableSnapshot 字段',
    migrate: migrateConsumableLogDecouple
  },
  {
    name: '移除日志外键约束',
    description: '移除 consumable_logs 表的外键约束，防止级联删除',
    migrate: removeConsumableLogFK
  },
  {
    name: '耗材日志归档表',
    description: '创建 consumable_log_archives 归档表',
    migrate: migrateConsumableLogArchive
  },
  {
    name: '耗材SN序列号字段',
    description: '为 consumables、consumable_records、consumable_logs 添加 snList 字段',
    migrate: migrateSnList
  },
  {
    name: '设备型号字段可空',
    description: '将 devices 表 model 字段改为可空，支持非必填',
    migrate: migrateDeviceModelField
  },
  {
    name: '设备字段配置同步',
    description: '同步前后端字段必填配置',
    migrate: migrateDeviceFieldsConfig
  },
  {
    name: '设备表字段可空',
    description: '将设备表所有字段改为可空，由应用层验证控制',
    migrate: migrateDeviceFieldsNullable
  },
  {
    name: '暂存设备自定义字段',
    description: '为 pending_devices 表添加 customFields 字段，支持自定义字段存储',
    migrate: migratePendingDeviceCustomFields
  },
  {
    name: '空闲设备与业务关联',
    description: '创建 businesses、warehouses、device_business 表，为 devices 添加空闲设备字段',
    migrate: migrateIdleDeviceAndBusiness
  },
  {
    name: '设备字段系统标记',
    description: '为 deviceFields 表添加 isSystem 字段，标记系统字段不可删除',
    migrate: migrateDeviceFieldsIsSystem
  }
];

async function runMigrations() {
  console.log('========================================');
  console.log('    IDC管理系统 - 数据库迁移汇总脚本    ');
  console.log('========================================');
  console.log(`数据库类型: ${DB_TYPE}`);
  console.log(`迁移数量: ${migrations.length}`);
  console.log('');

  const results = [];

  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    console.log(`\n[${i + 1}/${migrations.length}] ${migration.name}`);
    console.log(`    ${migration.description}`);

    try {
      await migration.migrate();
      results.push({ name: migration.name, status: '成功' });
      console.log(`    ✓ 完成`);
    } catch (error) {
      results.push({ name: migration.name, status: '失败', error: error.message });
      console.error(`    ✗ 失败: ${error.message}`);
    }
  }

  console.log('\n========================================');
  console.log('              迁移结果汇总              ');
  console.log('========================================');

  const successCount = results.filter(r => r.status === '成功').length;
  const failCount = results.filter(r => r.status === '失败').length;

  results.forEach((result, index) => {
    const icon = result.status === '成功' ? '✓' : '✗';
    console.log(`${icon} [${index + 1}] ${result.name}: ${result.status}`);
    if (result.error) {
      console.log(`    错误: ${result.error}`);
    }
  });

  console.log('\n----------------------------------------');
  console.log(`总计: ${results.length} | 成功: ${successCount} | 失败: ${failCount}`);
  console.log('========================================');

  await sequelize.close();
  process.exit(failCount > 0 ? 1 : 0);
}

// ==================== 工具函数 ====================

async function getTableColumns(tableName) {
  const dialect = sequelize.getDialect();
  
  if (dialect === 'sqlite') {
    const tableInfo = await sequelize.query(
      `PRAGMA table_info(${tableName})`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return tableInfo.map(col => col.name);
  } else {
    const tableInfo = await sequelize.query(
      `SHOW COLUMNS FROM ${tableName}`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return tableInfo.map(col => col.Field);
  }
}

async function tableExists(tableName) {
  const dialect = sequelize.getDialect();
  
  if (dialect === 'sqlite') {
    const tables = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      { replacements: [tableName], type: sequelize.QueryTypes.SELECT }
    );
    return tables.length > 0;
  } else {
    const tables = await sequelize.query(
      "SHOW TABLES LIKE ?",
      { replacements: [tableName], type: sequelize.QueryTypes.SELECT }
    );
    return tables.length > 0;
  }
}

async function addColumnIfNotExists(tableName, columnName, columnDef) {
  const columns = await getTableColumns(tableName);
  
  if (!columns.includes(columnName)) {
    const dialect = sequelize.getDialect();
    const sql = dialect === 'sqlite' 
      ? `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`
      : `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`;
    await sequelize.query(sql);
    console.log(`    ${tableName} 表添加 ${columnName} 字段成功`);
  } else {
    console.log(`    ${tableName} 表 ${columnName} 字段已存在，跳过`);
  }
}

// ==================== 迁移函数 ====================

async function migrateV2() {
  const queryInterface = sequelize.getQueryInterface();
  const dialect = sequelize.getDialect();

  // 1. 创建 network_cards 表
  if (!(await tableExists('network_cards'))) {
    await queryInterface.createTable('network_cards', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nicId: {
        type: sequelize.Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      name: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      macAddress: {
        type: sequelize.Sequelize.STRING
      },
      ipAddress: {
        type: sequelize.Sequelize.STRING
      },
      deviceId: {
        type: sequelize.Sequelize.STRING
      },
      status: {
        type: sequelize.Sequelize.STRING,
        defaultValue: 'active'
      },
      createdAt: sequelize.Sequelize.DATE,
      updatedAt: sequelize.Sequelize.DATE
    });
  }

  // 2. 为 device_ports 添加 nic_id 字段
  if (await tableExists('device_ports')) {
    await addColumnIfNotExists('device_ports', 'nic_id', 'INTEGER');
  }
}

async function migratePendingStatus() {
  if (await tableExists('users')) {
    await addColumnIfNotExists('users', 'status', "VARCHAR(255) DEFAULT 'active'");
  }
}

async function migrateConsumableVersion() {
  if (await tableExists('consumables')) {
    await addColumnIfNotExists('consumables', 'version', 'INTEGER DEFAULT 0');
  }
}

async function migrateConsumableLogs() {
  if (await tableExists('consumable_logs')) {
    await addColumnIfNotExists('consumable_logs', 'isEditable', 'BOOLEAN DEFAULT 1');
    await addColumnIfNotExists('consumable_logs', 'originalLogId', 'INTEGER');
    await addColumnIfNotExists('consumable_logs', 'modifiedBy', 'VARCHAR(255)');
    await addColumnIfNotExists('consumable_logs', 'modifiedAt', 'DATETIME');
    await addColumnIfNotExists('consumable_logs', 'modificationReason', 'TEXT');
  }
}

async function migrateConsumableLogDecouple() {
  if (await tableExists('consumable_logs')) {
    await addColumnIfNotExists('consumable_logs', 'isConsumableDeleted', 'BOOLEAN DEFAULT 0');
    await addColumnIfNotExists('consumable_logs', 'consumableSnapshot', 'TEXT');
  }
}

async function removeConsumableLogFK() {
  const dialect = sequelize.getDialect();
  
  if (dialect === 'sqlite') {
    const fks = await sequelize.query(
      `PRAGMA foreign_key_list(consumable_logs);`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (!fks || fks.length === 0) {
      return;
    }

    await sequelize.query(`
      CREATE TABLE consumable_logs_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consumableId VARCHAR(255),
        consumableName VARCHAR(255),
        operationType VARCHAR(50),
        quantity INTEGER,
        previousStock INTEGER,
        currentStock INTEGER,
        operator VARCHAR(255),
        reason TEXT,
        notes TEXT,
        isEditable BOOLEAN DEFAULT 1,
        originalLogId INTEGER,
        modifiedBy VARCHAR(255),
        modifiedAt DATETIME,
        modificationReason TEXT,
        isConsumableDeleted BOOLEAN DEFAULT 0,
        consumableSnapshot TEXT,
        relatedId VARCHAR(255),
        createdAt DATETIME,
        updatedAt DATETIME
      )
    `);

    await sequelize.query(`
      INSERT INTO consumable_logs_new
      SELECT id, consumableId, consumableName, operationType, quantity,
             previousStock, currentStock, operator, reason, notes,
             isEditable, originalLogId, modifiedBy, modifiedAt, modificationReason,
             isConsumableDeleted, consumableSnapshot, relatedId, createdAt, updatedAt
      FROM consumable_logs
    `);

    await sequelize.query(`DROP TABLE consumable_logs`);
    await sequelize.query(`ALTER TABLE consumable_logs_new RENAME TO consumable_logs`);

    await sequelize.query(`CREATE INDEX idx_logs_consumable_id ON consumable_logs(consumableId)`);
    await sequelize.query(`CREATE INDEX idx_logs_operation_type ON consumable_logs(operationType)`);
    await sequelize.query(`CREATE INDEX idx_logs_created_at ON consumable_logs(createdAt)`);
    await sequelize.query(`CREATE INDEX idx_logs_is_consumable_deleted ON consumable_logs(isConsumableDeleted)`);
  }
}

async function migrateConsumableLogArchive() {
  if (await tableExists('consumable_log_archives')) {
    return;
  }

  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.createTable('consumable_log_archives', {
    id: {
      type: sequelize.Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    archiveId: {
      type: sequelize.Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    consumableId: {
      type: sequelize.Sequelize.STRING,
      allowNull: false
    },
    consumableName: {
      type: sequelize.Sequelize.STRING,
      allowNull: false
    },
    consumableSnapshot: {
      type: sequelize.Sequelize.TEXT
    },
    totalOperations: {
      type: sequelize.Sequelize.INTEGER,
      defaultValue: 0
    },
    firstOperationAt: {
      type: sequelize.Sequelize.DATE
    },
    lastOperationAt: {
      type: sequelize.Sequelize.DATE
    },
    totalInQuantity: {
      type: sequelize.Sequelize.INTEGER,
      defaultValue: 0
    },
    totalOutQuantity: {
      type: sequelize.Sequelize.INTEGER,
      defaultValue: 0
    },
    finalStock: {
      type: sequelize.Sequelize.INTEGER,
      defaultValue: 0
    },
    deletedBy: {
      type: sequelize.Sequelize.STRING
    },
    deletedAt: {
      type: sequelize.Sequelize.DATE
    },
    deleteReason: {
      type: sequelize.Sequelize.STRING
    },
    createdAt: {
      type: sequelize.Sequelize.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updatedAt: {
      type: sequelize.Sequelize.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });

  if (dbDialect === 'sqlite') {
    await sequelize.query(`CREATE INDEX idx_archive_consumable_id ON consumable_log_archives(consumableId)`);
    await sequelize.query(`CREATE INDEX idx_archive_archive_id ON consumable_log_archives(archiveId)`);
    await sequelize.query(`CREATE INDEX idx_archive_deleted_at ON consumable_log_archives(deletedAt)`);
  }
}

async function migrateSnList() {
  const tables = ['consumables', 'consumable_records', 'consumable_logs'];
  
  for (const table of tables) {
    if (await tableExists(table)) {
      const columnDef = dbDialect === 'sqlite' ? "TEXT DEFAULT '[]'" : "JSON";
      await addColumnIfNotExists(table, 'snList', columnDef);
    } else {
      console.log(`    ${table} 表不存在，跳过`);
    }
  }
}

async function migrateDeviceModelField() {
  if (!(await tableExists('devices'))) {
    console.log('    devices 表不存在，跳过');
    return;
  }

  const dialect = sequelize.getDialect();
  
  if (dialect === 'mysql') {
    await sequelize.query(
      'ALTER TABLE devices MODIFY COLUMN model VARCHAR(255) NULL'
    );
    console.log('    devices 表 model 字段已改为可空');
  } else if (dialect === 'sqlite') {
    const columns = await getTableColumns('devices');
    if (columns.includes('model_old')) {
      console.log('    model_old 字段已存在，跳过迁移');
      return;
    }
    
    await sequelize.query('ALTER TABLE devices RENAME COLUMN model TO model_old');
    await sequelize.query('ALTER TABLE devices ADD COLUMN model VARCHAR(255)');
    await sequelize.query('UPDATE devices SET model = model_old');
    await sequelize.query('ALTER TABLE devices DROP COLUMN model_old');
    console.log('    devices 表 model 字段已改为可空');
  }
}

async function migrateDeviceFieldsConfig() {
  const DeviceField = require('../models/DeviceField');
  
  const updates = [
    { fieldName: 'model', required: false },
    { fieldName: 'powerConsumption', required: true },
    { fieldName: 'purchaseDate', required: false },
    { fieldName: 'warrantyExpiry', required: false },
  ];
  
  for (const update of updates) {
    const field = await DeviceField.findOne({ where: { fieldName: update.fieldName } });
    if (field && field.required !== update.required) {
      await field.update(update);
      console.log(`    更新字段 ${update.fieldName}: required=${update.required}`);
    } else if (!field) {
      console.log(`    字段 ${update.fieldName} 不存在，跳过`);
    } else {
      console.log(`    字段 ${update.fieldName} 配置已正确，跳过`);
    }
  }
}

async function migrateDeviceFieldsNullable() {
  const dialect = sequelize.getDialect();
  
  if (dialect === 'mysql') {
    const alterCommands = [
      "ALTER TABLE devices MODIFY COLUMN name VARCHAR(255) NULL",
      "ALTER TABLE devices MODIFY COLUMN type VARCHAR(255) NULL",
      "ALTER TABLE devices MODIFY COLUMN model VARCHAR(255) NULL",
      "ALTER TABLE devices MODIFY COLUMN serialNumber VARCHAR(255) NULL",
      "ALTER TABLE devices MODIFY COLUMN rackId VARCHAR(255) NULL",
      "ALTER TABLE devices MODIFY COLUMN position INTEGER NULL",
      "ALTER TABLE devices MODIFY COLUMN height INTEGER NULL",
      "ALTER TABLE devices MODIFY COLUMN powerConsumption FLOAT NULL",
      "ALTER TABLE devices MODIFY COLUMN customFields JSON NULL"
    ];
    
    for (const sql of alterCommands) {
      try {
        await sequelize.query(sql);
      } catch (e) {
        if (!e.message.includes('Unknown column')) {
          console.log(`    警告: ${e.message}`);
        }
      }
    }
    console.log('    devices 表字段已改为可空');
    
  } else if (dialect === 'sqlite') {
    const columns = await getTableColumns('devices');
    const hasNullableFlag = columns.includes('_nullable_migration_done');
    
    if (hasNullableFlag) {
      console.log('    已完成可空迁移，跳过');
      return;
    }
    
    await sequelize.query('PRAGMA foreign_keys = OFF');
    
    try {
      await sequelize.query('DROP TABLE IF EXISTS devices_new');
      
      await sequelize.query(`
        CREATE TABLE devices_new (
          deviceId VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,
          name VARCHAR(255),
          type VARCHAR(255),
          model VARCHAR(255),
          serialNumber VARCHAR(255) UNIQUE,
          rackId VARCHAR(255),
          position INTEGER,
          height INTEGER DEFAULT 1,
          powerConsumption FLOAT DEFAULT 0,
          status VARCHAR(255) DEFAULT 'offline',
          purchaseDate DATETIME,
          warrantyExpiry DATETIME,
          ipAddress VARCHAR(255),
          description TEXT,
          customFields JSON DEFAULT '{}',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          _nullable_migration_done INTEGER DEFAULT 1
        )
      `);
      
      await sequelize.query(`
        INSERT INTO devices_new (
          deviceId, name, type, model, serialNumber, rackId, position, height,
          powerConsumption, status, purchaseDate, warrantyExpiry, ipAddress,
          description, customFields, createdAt, updatedAt
        )
        SELECT 
          deviceId, name, type, model, serialNumber, rackId, position, height,
          powerConsumption, status, purchaseDate, warrantyExpiry, ipAddress,
          description, customFields, createdAt, updatedAt
        FROM devices
      `);
      
      await sequelize.query('DROP TABLE devices');
      await sequelize.query('ALTER TABLE devices_new RENAME TO devices');
      
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status)');
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type)');
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_devices_rackId ON devices(rackId)');
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_devices_name ON devices(name)');
      
      console.log('    devices 表字段已改为可空');
    } finally {
      await sequelize.query('PRAGMA foreign_keys = ON');
    }
  }
}

async function migratePendingDeviceCustomFields() {
  if (!(await tableExists('pending_devices'))) {
    console.log('    pending_devices 表不存在，跳过');
    return;
  }

  const columnDef = dbDialect === 'sqlite' ? "JSON DEFAULT '{}'" : "JSON";
  await addColumnIfNotExists('pending_devices', 'customFields', columnDef);
}

async function migrateDeviceFieldsIsSystem() {
  const dialect = sequelize.getDialect();

  if (!(await tableExists('deviceFields'))) {
    console.log('    deviceFields 表不存在，跳过');
    return;
  }

  if (dialect === 'mysql') {
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'deviceFields'
      AND COLUMN_NAME = 'isSystem'
      AND TABLE_SCHEMA = '${process.env.MYSQL_DATABASE || 'it_assest'}'
    `);

    if (columns.length === 0) {
      await sequelize.query(`
        ALTER TABLE deviceFields
        ADD COLUMN isSystem BOOLEAN DEFAULT 0
        COMMENT '是否为系统字段，系统字段不可删除'
      `);
      console.log('    deviceFields 表添加 isSystem 字段成功');
    } else {
      console.log('    deviceFields 表 isSystem 字段已存在，跳过');
    }
  } else {
    const columns = await getTableColumns('deviceFields');
    if (!columns.includes('isSystem')) {
      await sequelize.query(
        "ALTER TABLE deviceFields ADD COLUMN isSystem BOOLEAN DEFAULT 0",
        { type: sequelize.QueryTypes.RAW }
      );
      console.log('    deviceFields 表添加 isSystem 字段成功');
    } else {
      console.log('    deviceFields 表 isSystem 字段已存在，跳过');
    }
  }

  const systemFields = [
    'deviceId', 'name', 'type', 'model', 'serialNumber',
    'rackId', 'position', 'height', 'powerConsumption',
    'status', 'purchaseDate', 'warrantyExpiry'
  ];

  for (const fieldName of systemFields) {
    await sequelize.query(
      `UPDATE deviceFields SET isSystem = 1 WHERE fieldName = ?`,
      { replacements: [fieldName], type: sequelize.QueryTypes.RAW }
    );
    console.log(`    标记系统字段: ${fieldName}`);
  }

  console.log('    设备字段系统标记迁移完成');
}

async function migrateIdleDeviceAndBusiness() {
  const queryInterface = sequelize.getQueryInterface();
  const dialect = sequelize.getDialect();

  if (dialect === 'sqlite') {
    await sequelize.query('PRAGMA foreign_keys = OFF');
  }

  try {
    if (!(await tableExists('businesses'))) {
      await queryInterface.createTable('businesses', {
        businessId: { type: sequelize.Sequelize.STRING, primaryKey: true, allowNull: false, unique: true },
        name: { type: sequelize.Sequelize.STRING, allowNull: false },
        description: { type: sequelize.Sequelize.TEXT },
        status: { type: sequelize.Sequelize.ENUM('active', 'offline'), defaultValue: 'active' },
        offlineDate: { type: sequelize.Sequelize.DATE },
        offlineReason: { type: sequelize.Sequelize.STRING },
        createdAt: { type: sequelize.Sequelize.DATE, allowNull: false },
        updatedAt: { type: sequelize.Sequelize.DATE, allowNull: false }
      });
      console.log('    businesses 表创建成功');
    } else {
      console.log('    businesses 表已存在，跳过');
    }

    if (!(await tableExists('warehouses'))) {
      await queryInterface.createTable('warehouses', {
        warehouseId: { type: sequelize.Sequelize.STRING, primaryKey: true, allowNull: false, unique: true },
        name: { type: sequelize.Sequelize.STRING, allowNull: false },
        location: { type: sequelize.Sequelize.STRING },
        capacity: { type: sequelize.Sequelize.INTEGER, defaultValue: 100 },
        status: { type: sequelize.Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
        description: { type: sequelize.Sequelize.TEXT },
        createdAt: { type: sequelize.Sequelize.DATE, allowNull: false },
        updatedAt: { type: sequelize.Sequelize.DATE, allowNull: false }
      });
      console.log('    warehouses 表创建成功');
    } else {
      console.log('    warehouses 表已存在，跳过');
    }

    if (!(await tableExists('device_business'))) {
      await queryInterface.createTable('device_business', {
        id: { type: sequelize.Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        deviceId: { type: sequelize.Sequelize.STRING, allowNull: false },
        businessId: { type: sequelize.Sequelize.STRING, allowNull: false },
        isPrimary: { type: sequelize.Sequelize.BOOLEAN, defaultValue: false },
        createdAt: { type: sequelize.Sequelize.DATE, allowNull: false },
        updatedAt: { type: sequelize.Sequelize.DATE, allowNull: false }
      });
      console.log('    device_business 表创建成功');
    } else {
      console.log('    device_business 表已存在，跳过');
    }

    if (await tableExists('devices')) {
      await addColumnIfNotExists('devices', 'isIdle', 'BOOLEAN DEFAULT 0');
      await addColumnIfNotExists('devices', 'idleDate', 'DATETIME');
      await addColumnIfNotExists('devices', 'idleReason', 'TEXT');
      await addColumnIfNotExists('devices', 'warehouseId', 'VARCHAR(255)');
      await addColumnIfNotExists('devices', 'sourceType', "VARCHAR(255) DEFAULT 'rack'");
    }

    console.log('    空闲设备与业务关联迁移完成');
  } finally {
    if (dialect === 'sqlite') {
      await sequelize.query('PRAGMA foreign_keys = ON');
    }
  }
}

// 执行迁移
runMigrations().catch(error => {
  console.error('迁移执行失败:', error);
  process.exit(1);
});
