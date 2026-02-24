/**
 * IDC管理系统 - 数据库迁移汇总脚本
 * 按顺序执行所有数据库迁移
 * 支持幂等执行（重复执行不会出错）
 */

const { sequelize, DB_TYPE } = require('../db');

// 迁移配置列表
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
      // 继续执行下一个迁移，不中断
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

// ==================== 迁移函数 ====================

async function migrateV2() {
  const queryInterface = sequelize.getQueryInterface();
  const dialect = sequelize.getDialect();

  // 1. 创建 network_cards 表
  const tables = await queryInterface.showAllTables();
  if (!tables.includes('network_cards')) {
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
  if (dialect === 'sqlite') {
    const tableInfo = await sequelize.query(
      "PRAGMA table_info(device_ports)",
      { type: sequelize.QueryTypes.SELECT }
    );
    if (!tableInfo.some(col => col.name === 'nic_id')) {
      await sequelize.query("ALTER TABLE device_ports ADD COLUMN nic_id INTEGER");
    }
  } else {
    try {
      await queryInterface.addColumn('device_ports', 'nic_id', {
        type: sequelize.Sequelize.INTEGER
      });
    } catch (err) {
      if (!err.message.includes('Duplicate column')) throw err;
    }
  }
}

async function migratePendingStatus() {
  const queryInterface = sequelize.getQueryInterface();
  const dialect = sequelize.getDialect();

  if (dialect === 'sqlite') {
    // 检查是否已有 status 字段
    const tableInfo = await sequelize.query(
      "PRAGMA table_info(users)",
      { type: sequelize.QueryTypes.SELECT }
    );

    if (!tableInfo.some(col => col.name === 'status')) {
      // SQLite 需要重建表
      await sequelize.query(`
        CREATE TABLE users_new (
          userId VARCHAR(255) PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          role VARCHAR(255) DEFAULT 'user',
          status VARCHAR(255) DEFAULT 'active',
          createdAt DATETIME,
          updatedAt DATETIME
        )
      `);

      await sequelize.query(`
        INSERT INTO users_new SELECT *, 'active' as status FROM users
      `);

      await sequelize.query(`DROP TABLE users`);
      await sequelize.query(`ALTER TABLE users_new RENAME TO users`);
    }
  } else {
    try {
      await queryInterface.addColumn('users', 'status', {
        type: sequelize.Sequelize.STRING,
        defaultValue: 'active'
      });
    } catch (err) {
      if (!err.message.includes('Duplicate column')) throw err;
    }
  }
}

async function migrateConsumableVersion() {
  const tableInfo = await sequelize.query(
    "PRAGMA table_info(consumables)",
    { type: sequelize.QueryTypes.SELECT }
  );

  if (!tableInfo.some(col => col.name === 'version')) {
    await sequelize.query(
      "ALTER TABLE consumables ADD COLUMN version INTEGER DEFAULT 0"
    );
  }
}

async function migrateConsumableLogs() {
  const tableInfo = await sequelize.query(
    "PRAGMA table_info(consumable_logs)",
    { type: sequelize.QueryTypes.SELECT }
  );

  const columns = tableInfo.map(col => col.name);

  if (!columns.includes('isEditable')) {
    await sequelize.query(`
      ALTER TABLE consumable_logs ADD COLUMN isEditable BOOLEAN DEFAULT 1
    `);
  }

  if (!columns.includes('originalLogId')) {
    await sequelize.query(`
      ALTER TABLE consumable_logs ADD COLUMN originalLogId INTEGER
    `);
  }

  if (!columns.includes('modifiedBy')) {
    await sequelize.query(`
      ALTER TABLE consumable_logs ADD COLUMN modifiedBy VARCHAR(255)
    `);
  }

  if (!columns.includes('modifiedAt')) {
    await sequelize.query(`
      ALTER TABLE consumable_logs ADD COLUMN modifiedAt DATETIME
    `);
  }

  if (!columns.includes('modificationReason')) {
    await sequelize.query(`
      ALTER TABLE consumable_logs ADD COLUMN modificationReason TEXT
    `);
  }
}

async function migrateConsumableLogDecouple() {
  const tableInfo = await sequelize.query(
    "PRAGMA table_info(consumable_logs)",
    { type: sequelize.QueryTypes.SELECT }
  );

  const columns = tableInfo.map(col => col.name);

  if (!columns.includes('isConsumableDeleted')) {
    await sequelize.query(`
      ALTER TABLE consumable_logs ADD COLUMN isConsumableDeleted BOOLEAN DEFAULT 0
    `);
  }

  if (!columns.includes('consumableSnapshot')) {
    await sequelize.query(`
      ALTER TABLE consumable_logs ADD COLUMN consumableSnapshot TEXT
    `);
  }
}

async function removeConsumableLogFK() {
  // SQLite 不支持直接删除外键，需要重建表
  const fks = await sequelize.query(
    `PRAGMA foreign_key_list(consumable_logs);`,
    { type: sequelize.QueryTypes.SELECT }
  );

  if (!fks || fks.length === 0) {
    return; // 没有外键约束
  }

  // 重建表（去掉外键约束）
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

  // 复制数据
  await sequelize.query(`
    INSERT INTO consumable_logs_new
    SELECT id, consumableId, consumableName, operationType, quantity,
           previousStock, currentStock, operator, reason, notes,
           isEditable, originalLogId, modifiedBy, modifiedAt, modificationReason,
           isConsumableDeleted, consumableSnapshot, relatedId, createdAt, updatedAt
    FROM consumable_logs
  `);

  // 删除旧表，重命名新表
  await sequelize.query(`DROP TABLE consumable_logs`);
  await sequelize.query(`ALTER TABLE consumable_logs_new RENAME TO consumable_logs`);

  // 创建索引
  await sequelize.query(`CREATE INDEX idx_logs_consumable_id ON consumable_logs(consumableId)`);
  await sequelize.query(`CREATE INDEX idx_logs_operation_type ON consumable_logs(operationType)`);
  await sequelize.query(`CREATE INDEX idx_logs_created_at ON consumable_logs(createdAt)`);
  await sequelize.query(`CREATE INDEX idx_logs_is_consumable_deleted ON consumable_logs(isConsumableDeleted)`);
}

async function migrateConsumableLogArchive() {
  const tables = await sequelize.getQueryInterface().showAllTables();

  if (tables.includes('consumable_log_archives')) {
    return; // 表已存在
  }

  await sequelize.query(`
    CREATE TABLE consumable_log_archives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      archiveId VARCHAR(255) NOT NULL UNIQUE,
      consumableId VARCHAR(255) NOT NULL,
      consumableName VARCHAR(255) NOT NULL,
      consumableSnapshot TEXT,
      totalOperations INTEGER DEFAULT 0,
      firstOperationAt DATETIME,
      lastOperationAt DATETIME,
      totalInQuantity INTEGER DEFAULT 0,
      totalOutQuantity INTEGER DEFAULT 0,
      finalStock INTEGER DEFAULT 0,
      deletedBy VARCHAR(255),
      deletedAt DATETIME,
      deleteReason VARCHAR(255),
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建索引
  await sequelize.query(`CREATE INDEX idx_archive_consumable_id ON consumable_log_archives(consumableId)`);
  await sequelize.query(`CREATE INDEX idx_archive_archive_id ON consumable_log_archives(archiveId)`);
  await sequelize.query(`CREATE INDEX idx_archive_deleted_at ON consumable_log_archives(deletedAt)`);
}

// 执行迁移
runMigrations().catch(error => {
  console.error('迁移执行失败:', error);
  process.exit(1);
});
