/**
 * IDC管理系统 - 数据库迁移汇总脚本
 * 按顺序执行所有数据库迁移
 * 支持幂等执行（重复执行不会出错）
 * 支持 SQLite 和 MySQL
 */

const { sequelize, DB_TYPE } = require('../db');

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

  const dialect = sequelize.getDialect();
  if (dialect === 'sqlite') {
    await sequelize.query(`CREATE INDEX idx_archive_consumable_id ON consumable_log_archives(consumableId)`);
    await sequelize.query(`CREATE INDEX idx_archive_archive_id ON consumable_log_archives(archiveId)`);
    await sequelize.query(`CREATE INDEX idx_archive_deleted_at ON consumable_log_archives(deletedAt)`);
  }
}

async function migrateSnList() {
  const dialect = sequelize.getDialect();
  const tables = ['consumables', 'consumable_records', 'consumable_logs'];
  
  for (const table of tables) {
    if (await tableExists(table)) {
      const columnDef = dialect === 'sqlite' ? "TEXT DEFAULT '[]'" : "JSON DEFAULT '[]'";
      await addColumnIfNotExists(table, 'snList', columnDef);
    } else {
      console.log(`    ${table} 表不存在，跳过`);
    }
  }
}

// 执行迁移
runMigrations().catch(error => {
  console.error('迁移执行失败:', error);
  process.exit(1);
});
