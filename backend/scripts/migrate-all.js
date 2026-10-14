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
    migrate: migrateV2,
  },
  {
    name: '用户表 pending 状态',
    description: '为用户表添加 pending 状态支持',
    migrate: migratePendingStatus,
  },
  {
    name: '耗材乐观锁',
    description: '为 consumables 表添加 version 字段',
    migrate: migrateConsumableVersion,
  },
  {
    name: '耗材操作日志表结构',
    description: '添加 isEditable、originalLogId 等修改记录字段',
    migrate: migrateConsumableLogs,
  },
  {
    name: '耗材日志解耦',
    description: '添加 isConsumableDeleted 和 consumableSnapshot 字段',
    migrate: migrateConsumableLogDecouple,
  },
  {
    name: '移除日志外键约束',
    description: '移除 consumable_logs 表的外键约束，防止级联删除',
    migrate: removeConsumableLogFK,
  },
  {
    name: '耗材日志归档表',
    description: '创建 consumable_log_archives 归档表',
    migrate: migrateConsumableLogArchive,
  },
  {
    name: '耗材SN序列号字段',
    description: '为 consumables、consumable_records、consumable_logs 添加 snList 字段',
    migrate: migrateSnList,
  },
  {
    name: '设备/耗材图片字段',
    description: '为 devices、consumables 添加 images JSON 字段（图片附件，v2.7.2）',
    migrate: migrateImagesColumn,
  },
  {
    name: '设备型号字段可空',
    description: '将 devices 表 model 字段改为可空，支持非必填',
    migrate: migrateDeviceModelField,
  },
  {
    name: '设备字段配置同步',
    description: '同步前后端字段必填配置',
    migrate: migrateDeviceFieldsConfig,
  },
  {
    name: '设备表字段可空',
    description: '将设备表所有字段改为可空，由应用层验证控制',
    migrate: migrateDeviceFieldsNullable,
  },
  {
    name: '暂存设备自定义字段',
    description: '为 pending_devices 表添加 customFields 字段，支持自定义字段存储',
    migrate: migratePendingDeviceCustomFields,
  },
  {
    name: '空闲设备与业务关联',
    description: '创建 businesses、warehouses、device_business 表，为 devices 添加空闲设备字段',
    migrate: migrateIdleDeviceAndBusiness,
  },
  {
    name: '设备字段系统标记',
    description: '为 deviceFields 表添加 isSystem 字段，标记系统字段不可删除',
    migrate: migrateDeviceFieldsIsSystem,
  },
  {
    name: '设备位置索引优化',
    description: '为 devices 表添加复合索引，优化位置冲突检测和悲观锁性能',
    migrate: migrateDevicePositionIndexes,
  },
  {
    name: '线缆表新增字段',
    description: '为 cables 表添加 cableLabel、cableColor 等新字段',
    migrate: migrateCableFields,
  },
  {
    name: '耗材日志设备关联',
    description:
      '为 consumable_logs 表添加 deviceId、deviceName、rackId、rackName、roomId、roomName 字段',
    migrate: migrateConsumableLogDeviceAssociation,
  },
  {
    name: '耗材日志名称同步',
    description: '为 consumable_logs 表添加 lastNameSyncAt 字段，支持名称同步',
    migrate: migrateConsumableLogNameSync,
  },
  {
    name: '机房布局字段',
    description: '为 rooms 表添加 gridRows、gridCols、layoutConfig 字段，支持平面图布局',
    migrate: migrateRoomLayoutFields,
  },
  {
    name: '机柜位置字段',
    description: '为 racks 表添加 rowPos、colPos、facing 字段，支持机柜位置定位',
    migrate: migrateRackPositionFields,
  },
  {
    name: '操作日志请求追踪',
    description: '为 operation_logs 表添加 requestId 字段和复合索引，支持请求追踪',
    migrate: migrateOperationLogRequestId,
  },
  {
    name: '用户账户锁定时间',
    description: '为 users 表添加 lockedUntil 字段，支持账户自动解锁',
    migrate: migrateUserLockedUntil,
  },
  {
    name: '用户邮箱验证字段',
    description: '为 users 表添加 emailVerified 字段，支持邮箱验证功能（v2.3.0）',
    migrate: migrateUserEmailVerified,
  },
  {
    name: '拓扑布局持久化表',
    description: '创建 TopologyLayouts 表，存储用户手动调整的拓扑图节点位置（v2.3.0）',
    migrate: migrateTopologyLayout,
  },
  {
    name: '权限表字段类型修复',
    description: '修改 permissions 表 type 字段为 STRING，支持 module/menu/button（v2.3.5）',
    migrate: migratePermissionTypeField,
  },
  {
    name: '权限种子数据初始化',
    description: '初始化 115 条权限种子数据，构建三级权限体系（v2.3.5）',
    migrate: migrateInitPermissions,
  },
  {
    name: '管理员角色权限修复',
    description: '将 admin 角色权限设置为 ["*"]，修复生产环境升级后显示无权限问题（v2.3.5）',
    migrate: migrateAdminRolePermissions,
  },
  {
    name: '设备凭据表',
    description: '创建 device_credentials 表，存储 SSH/SNMP/API 采集凭据（v2.4.0）',
    migrate: migrateDeviceCredential,
  },
  {
    name: 'device_credentials 协议扩展',
    description: 'protocol ENUM 增加 telnet 值，支持 Telnet 采集（v2.4.0）',
    migrate: migrateTelnetProtocol,
  },
  {
    name: '重复索引清理',
    description: '清理 MySQL 上 Sequelize sync({alter:true}) 累积的重复 UNIQUE 索引（仅 MySQL）',
    migrate: migrateCleanDuplicateIndexes,
  },
  {
    name: 'warehouseId 外键清理',
    description: '删除 devices→warehouses 外键约束，warehouseId 设计为自由文本字段（仅 MySQL）',
    migrate: migrateDropWarehouseFK,
  },
  {
    name: 'IPAM 网段与 IP 地址表',
    description: '创建 subnets、ip_addresses 表及 8 条 IPAM 权限数据（v2.5.0）',
    migrate: migrateIpamTables,
  },
  {
    name: 'IPAM ipInt 字段类型修复',
    description: '将 ip_addresses.ipInt 从 INTEGER 改为 BIGINT UNSIGNED，回填正确值（IPv4 整数超过 32 位有符号范围）',
    migrate: migrateIpamFixIpInt,
  },
  {
    name: 'IPAM IPv6 网段字段',
    description: 'subnets 表新增 ipVersion/startInt/endInt，totalHosts/usableHosts 改 STRING 支持 IPv6 超大数',
    migrate: migrateIpamV6SubnetFields,
  },
  {
    name: 'IPAM IPv6 IP 地址字段',
    description: 'ip_addresses 表新增 ipVersion/ipInt128 DECIMAL(39,0)，ipInt 改为可空兼容 IPv6',
    migrate: migrateIpamV6IpFields,
  },
  {
    name: 'IPAM IPv6 字段数据回填',
    description: '为现有 IPv4 网段/IP 回填 ipVersion/startInt/endInt/ipInt128',
    migrate: migrateIpamV6Backfill,
  },
  {
    name: 'IPAM 在线探测字段',
    description: 'ip_addresses 表新增 probeStatus/probeMethod/probeLatency/probeLastCheckedAt 在线探测字段',
    migrate: migrateIpProbeFields,
  },
  {
    name: 'IP-设备关联字段',
    description: 'ip_addresses 表新增 ipType/customTag/isPrimaryForDevice/statusAutoDriven，subnets 表新增 purpose',
    migrate: migrateIpDeviceBindingFields,
  },
  {
    name: 'IPAM IP 字符串列宽扩容',
    description: 'ip_addresses.ipAddress 和 subnets 表多个地址字段从 VARCHAR(50) 扩大到 VARCHAR(80)，适配 IPv6 长地址',
    migrate: migrateIpamWidenColumns,
  },
  {
    name: '旧 Device.ipAddress 导入 IPAM',
    description: '将 devices.ipAddress 非空记录导入 ip_addresses 表（status=used, ipType=management），幂等可重跑',
    migrate: migrateDeviceIpToIpam,
  },
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
    const tableInfo = await sequelize.query(`PRAGMA table_info(${tableName})`, {
      type: sequelize.QueryTypes.SELECT,
    });
    return tableInfo.map(col => col.name);
  } else {
    const tableInfo = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`, {
      type: sequelize.QueryTypes.SELECT,
    });
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
    const tables = await sequelize.query('SHOW TABLES LIKE ?', {
      replacements: [tableName],
      type: sequelize.QueryTypes.SELECT,
    });
    return tables.length > 0;
  }
}

async function addColumnIfNotExists(tableName, columnName, columnDef) {
  const columns = await getTableColumns(tableName);

  if (!columns.includes(columnName)) {
    const dialect = sequelize.getDialect();
    const sql =
      dialect === 'sqlite'
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
        autoIncrement: true,
      },
      nicId: {
        type: sequelize.Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: sequelize.Sequelize.STRING,
        allowNull: false,
      },
      macAddress: {
        type: sequelize.Sequelize.STRING,
      },
      ipAddress: {
        type: sequelize.Sequelize.STRING,
      },
      deviceId: {
        type: sequelize.Sequelize.STRING,
      },
      status: {
        type: sequelize.Sequelize.STRING,
        defaultValue: 'active',
      },
      createdAt: sequelize.Sequelize.DATE,
      updatedAt: sequelize.Sequelize.DATE,
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
    const fks = await sequelize.query(`PRAGMA foreign_key_list(consumable_logs);`, {
      type: sequelize.QueryTypes.SELECT,
    });

    if (!fks || fks.length === 0) {
      console.log('SQLite: 没有外键约束需要移除');
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
    await sequelize.query(
      `CREATE INDEX idx_logs_is_consumable_deleted ON consumable_logs(isConsumableDeleted)`
    );
  } else if (dialect === 'mysql') {
    try {
      const [fks] = await sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = 'consumable_logs'
        AND TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);

      if (!fks || fks.length === 0) {
        console.log('MySQL: 没有外键约束需要移除');
        return;
      }

      console.log(`MySQL: 发现 ${fks.length} 个外键约束`);

      for (const fk of fks) {
        try {
          await sequelize.query(`ALTER TABLE consumable_logs DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
          console.log(`MySQL: 已移除外键约束 ${fk.CONSTRAINT_NAME}`);
        } catch (err) {
          console.log(`MySQL: 移除外键 ${fk.CONSTRAINT_NAME} 失败:`, err.message);
        }
      }
    } catch (err) {
      console.log('MySQL: 检查外键约束失败:', err.message);
    }
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
      autoIncrement: true,
    },
    archiveId: {
      type: sequelize.Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    consumableId: {
      type: sequelize.Sequelize.STRING,
      allowNull: false,
    },
    consumableName: {
      type: sequelize.Sequelize.STRING,
      allowNull: false,
    },
    consumableSnapshot: {
      type: sequelize.Sequelize.TEXT,
    },
    totalOperations: {
      type: sequelize.Sequelize.INTEGER,
      defaultValue: 0,
    },
    firstOperationAt: {
      type: sequelize.Sequelize.DATE,
    },
    lastOperationAt: {
      type: sequelize.Sequelize.DATE,
    },
    totalInQuantity: {
      type: sequelize.Sequelize.INTEGER,
      defaultValue: 0,
    },
    totalOutQuantity: {
      type: sequelize.Sequelize.INTEGER,
      defaultValue: 0,
    },
    finalStock: {
      type: sequelize.Sequelize.INTEGER,
      defaultValue: 0,
    },
    deletedBy: {
      type: sequelize.Sequelize.STRING,
    },
    deletedAt: {
      type: sequelize.Sequelize.DATE,
    },
    deleteReason: {
      type: sequelize.Sequelize.STRING,
    },
    createdAt: {
      type: sequelize.Sequelize.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: sequelize.Sequelize.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  if (dbDialect === 'sqlite') {
    await sequelize.query(
      `CREATE INDEX idx_archive_consumable_id ON consumable_log_archives(consumableId)`
    );
    await sequelize.query(
      `CREATE INDEX idx_archive_archive_id ON consumable_log_archives(archiveId)`
    );
    await sequelize.query(
      `CREATE INDEX idx_archive_deleted_at ON consumable_log_archives(deletedAt)`
    );
  }
}

async function migrateSnList() {
  const tables = ['consumables', 'consumable_records', 'consumable_logs'];

  for (const table of tables) {
    if (await tableExists(table)) {
      const columnDef = dbDialect === 'sqlite' ? "TEXT DEFAULT '[]'" : 'JSON';
      await addColumnIfNotExists(table, 'snList', columnDef);
    } else {
      console.log(`    ${table} 表不存在，跳过`);
    }
  }
}

/**
 * 设备/耗材图片字段迁移
 *
 * 背景：MySQL 的 JSON 列不支持字面量 DEFAULT。旧版 server.js 的 safeSync 以
 * `ADD COLUMN images JSON DEFAULT '[]'` 新增该列在 MySQL 上会失败（且异常被静默
 * 吞掉），导致 devices.images / consumables.images 缺失，设备/耗材列表查询报
 * "Unknown column 'images'" 而 500。
 *
 * 本迁移：
 *   - 列已存在 → 跳过
 *   - 列缺失 → 不带默认值新增，并回填历史行为 '[]'
 * 幂等，可重复执行。
 */
async function migrateImagesColumn() {
  const tables = ['devices', 'consumables'];

  for (const table of tables) {
    if (!(await tableExists(table))) {
      console.log(`    ${table} 表不存在，跳过`);
      continue;
    }

    // MySQL/SQLite 的 JSON 列都不使用字面量 DEFAULT（SQLite 退化为带默认值的 TEXT）
    const columnDef = dbDialect === 'sqlite' ? "TEXT DEFAULT '[]'" : 'JSON';
    await addColumnIfNotExists(table, 'images', columnDef);

    // 回填历史行，避免旧数据为 NULL 导致前端渲染异常
    await sequelize.query(
      `UPDATE ${table} SET images = '[]' WHERE images IS NULL`
    );
    console.log(`    ${table} 表 images 字段历史行已回填 '[]'`);
  }
}

async function migrateDeviceModelField() {
  if (!(await tableExists('devices'))) {
    console.log('    devices 表不存在，跳过');
    return;
  }

  const dialect = sequelize.getDialect();

  if (dialect === 'mysql') {
    await sequelize.query('ALTER TABLE devices MODIFY COLUMN model VARCHAR(255) NULL');
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
      'ALTER TABLE devices MODIFY COLUMN name VARCHAR(255) NULL',
      'ALTER TABLE devices MODIFY COLUMN type VARCHAR(255) NULL',
      'ALTER TABLE devices MODIFY COLUMN model VARCHAR(255) NULL',
      'ALTER TABLE devices MODIFY COLUMN serialNumber VARCHAR(255) NULL',
      'ALTER TABLE devices MODIFY COLUMN rackId VARCHAR(255) NULL',
      'ALTER TABLE devices MODIFY COLUMN position INTEGER NULL',
      'ALTER TABLE devices MODIFY COLUMN height INTEGER NULL',
      'ALTER TABLE devices MODIFY COLUMN powerConsumption FLOAT NULL',
      'ALTER TABLE devices MODIFY COLUMN customFields JSON NULL',
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

  const columnDef = dbDialect === 'sqlite' ? "JSON DEFAULT '{}'" : 'JSON';
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
      await sequelize.query('ALTER TABLE deviceFields ADD COLUMN isSystem BOOLEAN DEFAULT 0', {
        type: sequelize.QueryTypes.RAW,
      });
      console.log('    deviceFields 表添加 isSystem 字段成功');
    } else {
      console.log('    deviceFields 表 isSystem 字段已存在，跳过');
    }
  }

  const systemFields = [
    'deviceId',
    'name',
    'type',
    'model',
    'serialNumber',
    'rackId',
    'position',
    'height',
    'powerConsumption',
    'status',
    'purchaseDate',
    'warrantyExpiry',
  ];

  for (const fieldName of systemFields) {
    await sequelize.query(`UPDATE deviceFields SET isSystem = 1 WHERE fieldName = ?`, {
      replacements: [fieldName],
      type: sequelize.QueryTypes.RAW,
    });
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
        businessId: {
          type: sequelize.Sequelize.STRING,
          primaryKey: true,
          allowNull: false,
          unique: true,
        },
        name: { type: sequelize.Sequelize.STRING, allowNull: false },
        description: { type: sequelize.Sequelize.TEXT },
        status: { type: sequelize.Sequelize.ENUM('active', 'offline'), defaultValue: 'active' },
        offlineDate: { type: sequelize.Sequelize.DATE },
        offlineReason: { type: sequelize.Sequelize.STRING },
        createdAt: { type: sequelize.Sequelize.DATE, allowNull: false },
        updatedAt: { type: sequelize.Sequelize.DATE, allowNull: false },
      });
      console.log('    businesses 表创建成功');
    } else {
      console.log('    businesses 表已存在，跳过');
    }

    if (!(await tableExists('warehouses'))) {
      await queryInterface.createTable('warehouses', {
        warehouseId: {
          type: sequelize.Sequelize.STRING,
          primaryKey: true,
          allowNull: false,
          unique: true,
        },
        name: { type: sequelize.Sequelize.STRING, allowNull: false },
        location: { type: sequelize.Sequelize.STRING },
        capacity: { type: sequelize.Sequelize.INTEGER, defaultValue: 100 },
        status: { type: sequelize.Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
        description: { type: sequelize.Sequelize.TEXT },
        createdAt: { type: sequelize.Sequelize.DATE, allowNull: false },
        updatedAt: { type: sequelize.Sequelize.DATE, allowNull: false },
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
        updatedAt: { type: sequelize.Sequelize.DATE, allowNull: false },
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

async function migrateDevicePositionIndexes() {
  const tableName = 'devices';

  if (!(await tableExists(tableName))) {
    console.log(`    ${tableName} 表不存在，跳过`);
    return;
  }

  const indexesToCreate = [
    { name: 'devices_rackId_position', fields: ['rackId', 'position'] },
    { name: 'devices_rackId_position_isIdle', fields: ['rackId', 'position', 'isIdle'] },
  ];

  for (const idx of indexesToCreate) {
    await addIndexIfNotExists(tableName, idx.name, idx.fields);
  }
}

async function migrateConsumableLogDeviceAssociation() {
  const tableName = 'consumable_logs';

  if (!(await tableExists(tableName))) {
    console.log(`    ${tableName} 表不存在，跳过`);
    return;
  }

  const columns = await getTableColumns(tableName);
  const newColumns = [
    { name: 'deviceId', def: 'VARCHAR(255)' },
    { name: 'deviceName', def: 'VARCHAR(255)' },
    { name: 'rackId', def: 'VARCHAR(255)' },
    { name: 'rackName', def: 'VARCHAR(255)' },
    { name: 'roomId', def: 'VARCHAR(255)' },
    { name: 'roomName', def: 'VARCHAR(255)' },
  ];

  for (const col of newColumns) {
    await addColumnIfNotExists(tableName, col.name, col.def);
  }

  console.log('    耗材日志设备关联迁移完成');
}

async function migrateConsumableLogNameSync() {
  const tableName = 'consumable_logs';

  if (!(await tableExists(tableName))) {
    console.log(`    ${tableName} 表不存在，跳过`);
    return;
  }

  await addColumnIfNotExists(tableName, 'lastNameSyncAt', 'DATETIME');
  console.log('    耗材日志名称同步迁移完成');
}

async function migrateRoomLayoutFields() {
  const tableName = 'rooms';
  const columns = [
    { name: 'gridRows', def: 'INTEGER DEFAULT 10' },
    { name: 'gridCols', def: 'INTEGER DEFAULT 10' },
    { name: 'layoutConfig', def: dbDialect === 'sqlite' ? 'TEXT' : 'JSON' },
  ];

  for (const col of columns) {
    await addColumnIfNotExists(tableName, col.name, col.def);
  }
  console.log('    机房布局字段迁移完成');
}

async function migrateRackPositionFields() {
  const tableName = 'racks';
  const columns = [
    { name: 'rowPos', def: 'INTEGER' },
    { name: 'colPos', def: 'INTEGER' },
    { name: 'facing', def: "VARCHAR(20) DEFAULT 'front'" },
  ];

  for (const col of columns) {
    await addColumnIfNotExists(tableName, col.name, col.def);
  }
  console.log('    机柜位置字段迁移完成');
}

async function addIndexIfNotExists(tableName, indexName, fields) {
  const dialect = sequelize.getDialect();
  try {
    if (dialect === 'sqlite') {
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${fields.join(', ')})`
      );
    } else {
      const [indexes] = await sequelize.query(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_NAME = ? AND INDEX_NAME = ? AND TABLE_SCHEMA = DATABASE()`,
        { replacements: [tableName, indexName], type: sequelize.QueryTypes.SELECT }
      );
      if (!indexes || indexes.length === 0) {
        await sequelize.query(
          `CREATE INDEX \`${indexName}\` ON \`${tableName}\`(\`${fields.join('`, `')}\`)`
        );
      } else {
        console.log(`    索引 ${indexName} 已存在，跳过`);
        return;
      }
    }
    console.log(`    索引 ${indexName} 创建成功`);
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('Duplicate key name')) {
      console.log(`    索引 ${indexName} 已存在，跳过`);
    } else {
      throw error;
    }
  }
}

async function migrateOperationLogRequestId() {
  const tableName = 'operation_logs';

  if (!(await tableExists(tableName))) {
    console.log(`    ${tableName} 表不存在，跳过`);
    return;
  }

  await addColumnIfNotExists(tableName, 'requestId', 'VARCHAR(255)');
  await addIndexIfNotExists(tableName, 'operation_logs_requestId', ['requestId']);
  await addIndexIfNotExists(tableName, 'operation_logs_module_createdAt', ['module', 'createdAt']);

  console.log('    操作日志requestId字段和索引迁移完成');
}

async function migrateUserLockedUntil() {
  const tableName = 'users';

  if (!(await tableExists(tableName))) {
    console.log(`    ${tableName} 表不存在，跳过`);
    return;
  }

  await addColumnIfNotExists(tableName, 'lockedUntil', 'DATETIME');
  console.log('    users 表 lockedUntil 字段迁移完成');
}

async function migrateUserEmailVerified() {
  const tableName = 'users';

  if (!(await tableExists(tableName))) {
    console.log(`    ${tableName} 表不存在，跳过`);
    return;
  }

  // BOOLEAN DEFAULT 0 在 MySQL（TINYINT(1)）和 SQLite（INTEGER）上均兼容
  // 与现有 migrateConsumableLogDecouple 的 isConsumableDeleted 写法一致
  await addColumnIfNotExists(tableName, 'emailVerified', 'BOOLEAN DEFAULT 0');
  console.log('    users 表 emailVerified 字段迁移完成');
}

/**
 * 创建 TopologyLayouts 表（拓扑布局持久化）
 * 存储用户手动调整的拓扑图节点位置，下次打开时恢复
 * layoutKey 格式:switch:{deviceId} 或 rack:{rackId}
 */
async function migrateTopologyLayout() {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = 'TopologyLayouts';

  // 幂等:表已存在则跳过
  if (await tableExists(tableName)) {
    console.log(`    ${tableName} 表已存在，跳过`);
    return;
  }

  // Sequelize.JSON 在 MySQL 上为 JSON 类型,在 SQLite 上自动用 TEXT 存储
  // 模型层(TopologyLayout.js)使用 DataTypes.JSON,Sequelize 会处理读写转换
  await queryInterface.createTable(tableName, {
    id: {
      type: sequelize.Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    layoutKey: {
      type: sequelize.Sequelize.STRING,
      allowNull: false,
      // 显式索引名,避免 MySQL 重复 UNIQUE 索引累积(database-migration.md 规范)
      unique: 'topology_layouts_layout_key_unique',
      comment: '布局唯一标识,如 switch:DEVxxx 或 rack:RACKxxx',
    },
    nodesData: {
      type: sequelize.Sequelize.JSON,
      allowNull: false,
      comment: '节点位置 JSON 数组 [{id, x, y}, ...]',
    },
    viewport: {
      type: sequelize.Sequelize.JSON,
      allowNull: true,
      comment: '视口状态 {x, y, zoom}',
    },
    createdAt: {
      type: sequelize.Sequelize.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: sequelize.Sequelize.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  console.log(`    ${tableName} 表创建成功`);
}

/**
 * 修改 permissions 表 type 字段为 STRING（v2.3.5）
 * 原为 ENUM('menu','button')，需支持顶级模块的 'module' 值
 */
async function migratePermissionTypeField() {
  if (!(await tableExists('permissions'))) {
    console.log('    permissions 表不存在，跳过');
    return;
  }

  const dialect = sequelize.getDialect();

  if (dialect === 'mysql') {
    // 先检查当前列类型
    const [columns] = await sequelize.query(
      `SELECT DATA_TYPE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'permissions' AND COLUMN_NAME = 'type' AND TABLE_SCHEMA = DATABASE()`
    );
    if (columns.length > 0 && columns[0].COLUMN_TYPE === "varchar(20)") {
      console.log('    permissions.type 已经是 VARCHAR(20)，跳过');
      return;
    }
    await sequelize.query("ALTER TABLE permissions MODIFY COLUMN type VARCHAR(20) DEFAULT 'button'");
    console.log('    permissions.type 已修改为 VARCHAR(20)');
  } else {
    // SQLite 无列类型约束，不需要修改
    console.log('    SQLite 无列类型约束，跳过');
  }
}

/**
 * 初始化权限种子数据（v2.3.5）
 * 插入 113 条三级权限数据（module → menu → button）
 */
async function migrateInitPermissions() {
  if (!(await tableExists('permissions'))) {
    console.log('    permissions 表不存在，跳过');
    return;
  }

  const { initPermissions } = require('./init-permissions');
  const count = await initPermissions();
  console.log(`    权限种子数据初始化完成，共处理 ${count} 条`);
}

/**
 * 修复 admin 角色权限（v2.3.5）
 * 将 admin 角色的 permissions 字段设置为 ["*"]
 * 解决生产环境升级后 admin 角色显示"无权限"的问题
 */
async function migrateAdminRolePermissions() {
  const Role = require('../models/Role');

  const adminRole = await Role.findOne({ where: { roleCode: 'admin' } });
  if (!adminRole) {
    console.log('    admin 角色不存在，跳过');
    return;
  }

  const currentPerms = adminRole.permissions || [];
  if (currentPerms.length === 1 && currentPerms[0] === '*') {
    console.log('    admin 角色权限已为 ["*"]，跳过');
    return;
  }

  adminRole.permissions = ['*'];
  await adminRole.save();
  console.log('    admin 角色权限已修复为 ["*"]');
}

// ==================== 线缆表新增字段（原 migrate-cable-fields.js） ====================

/**
 * 为 cables 表添加 cableLabel、cableColor 等新字段
 */
async function migrateCableFields() {
  const tableName = 'cables';

  if (!(await tableExists(tableName))) {
    console.log(`    ${tableName} 表不存在，跳过`);
    return;
  }

  const newColumns = [
    { name: 'cableLabel', def: 'VARCHAR(255)' },
    { name: 'cableColor', def: 'VARCHAR(50)' },
    { name: 'installedBy', def: 'VARCHAR(100)' },
    { name: 'installedAt', def: 'DATETIME' },
    { name: 'lastTestedAt', def: 'DATETIME' },
  ];

  for (const col of newColumns) {
    await addColumnIfNotExists(tableName, col.name, col.def);
  }

  console.log('    线缆表字段迁移完成');
}

// ==================== 设备凭据表（原 migrate-device-credential.js） ====================

/**
 * 创建设备凭据表 device_credentials，存储 SSH/SNMP/API 采集凭据
 * 2026-09-17 新增
 */
async function migrateDeviceCredential() {
  if (await tableExists('device_credentials')) {
    console.log('    device_credentials 表已存在，跳过');
    return;
  }

  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.createTable('device_credentials', {
    credentialId: {
      type: sequelize.Sequelize.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    deviceId: {
      type: sequelize.Sequelize.STRING,
      allowNull: false,
    },
    protocol: {
      type: sequelize.Sequelize.ENUM('ssh', 'snmp', 'api'),
      allowNull: false,
      defaultValue: 'ssh',
    },
    host: { type: sequelize.Sequelize.STRING, allowNull: true },
    port: { type: sequelize.Sequelize.INTEGER, allowNull: true },
    username: { type: sequelize.Sequelize.STRING, allowNull: true },
    password: { type: sequelize.Sequelize.TEXT, allowNull: true },
    community: { type: sequelize.Sequelize.TEXT, allowNull: true },
    vendor: { type: sequelize.Sequelize.STRING, allowNull: true },
    apiToken: { type: sequelize.Sequelize.TEXT, allowNull: true },
    apiBaseUrl: { type: sequelize.Sequelize.STRING, allowNull: true },
    isDefault: { type: sequelize.Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    lastTestedAt: { type: sequelize.Sequelize.DATE, allowNull: true },
    testStatus: { type: sequelize.Sequelize.ENUM('success', 'failed'), allowNull: true },
    testMessage: { type: sequelize.Sequelize.TEXT, allowNull: true },
    createdAt: {
      type: sequelize.Sequelize.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: sequelize.Sequelize.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  // 创建索引
  const indexSqls = [
    'CREATE INDEX IF NOT EXISTS idx_dev_cred_deviceId ON device_credentials(deviceId)',
    'CREATE INDEX IF NOT EXISTS idx_dev_cred_deviceId_default ON device_credentials(deviceId, isDefault)',
    'CREATE INDEX IF NOT EXISTS idx_dev_cred_protocol ON device_credentials(protocol)',
  ];

  for (const sql of indexSqls) {
    try {
      await sequelize.query(sql);
    } catch (_) {
      // MySQL 索引已存在时忽略
    }
  }

  console.log('    device_credentials 表创建成功');
}

// ==================== device_credentials 协议扩展（原 add-telnet-protocol.js） ====================

/**
 * 将 device_credentials.protocol ENUM 扩展为包含 'telnet'
 * 原 ENUM('ssh','snmp','api') → 新 ENUM('ssh','snmp','telnet','api')
 * 仅 MySQL 需要执行（SQLite 无 ENUM 约束）
 */
async function migrateTelnetProtocol() {
  if (!(await tableExists('device_credentials'))) {
    console.log('    device_credentials 表不存在，跳过');
    return;
  }

  const dialect = sequelize.getDialect();

  if (dialect !== 'mysql' && dialect !== 'mariadb') {
    console.log('    非 MySQL 数据库，无 ENUM 约束，跳过');
    return;
  }

  // 检查当前 ENUM 是否已包含 telnet
  const [rows] = await sequelize.query(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'device_credentials'
       AND COLUMN_NAME = 'protocol'`
  );

  if (rows.length === 0) {
    console.log('    未找到 protocol 列，跳过');
    return;
  }

  const columnType = rows[0].COLUMN_TYPE || '';
  if (/telnet/i.test(columnType)) {
    console.log(`    protocol 已包含 telnet（当前: ${columnType}），跳过`);
    return;
  }

  // 扩展 ENUM
  const TARGET_ENUM = "ENUM('ssh','snmp','telnet','api')";
  await sequelize.query(
    `ALTER TABLE \`device_credentials\` MODIFY COLUMN \`protocol\` ${TARGET_ENUM}
     NOT NULL DEFAULT 'ssh' COMMENT '采集协议（api 为历史预留）'`
  );

  console.log(`    protocol ENUM 已扩展 → ${TARGET_ENUM}`);
}

// ==================== 重复索引清理（原 fixDuplicateIndexes.js + fixCompoundIndexes.js） ====================

/**
 * 清理 MySQL 上 Sequelize sync({alter:true}) 累积的重复 UNIQUE 索引
 * 包含单列索引（fixDuplicateIndexes.js）和复合索引（fixCompoundIndexes.js）
 * 仅 MySQL 需要执行，SQLite 不支持通过 INFORMATION_SCHEMA 检查索引
 */
async function migrateCleanDuplicateIndexes() {
  const dialect = sequelize.getDialect();

  if (dialect !== 'mysql' && dialect !== 'mariadb') {
    console.log('    非 MySQL 数据库，跳过重复索引清理');
    return;
  }

  // 查询所有表
  const [tables] = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`
  );

  let totalDropped = 0;

  for (const { TABLE_NAME: table } of tables) {
    const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);

    // ========== 第一部分：单列重复 UNIQUE 索引 ==========
    // 按 (基础索引名|列名) 分组，找出 xxx_2, xxx_3 这类后缀重复
    const singleIndexGroups = new Map();
    indexes.forEach(idx => {
      const name = idx.Key_name;
      if (name === 'PRIMARY') return;
      const match = name.match(/^(.+)_(\d+)$/);
      const baseName = match ? match[1] : name;
      const key = `${baseName}|${idx.Column_name}`;
      if (!singleIndexGroups.has(key)) singleIndexGroups.set(key, []);
      singleIndexGroups.get(key).push({
        name,
        column: idx.Column_name,
        nonUnique: idx.Non_unique,
        seq: match ? parseInt(match[2], 10) : 0,
      });
    });

    for (const idxs of singleIndexGroups.values()) {
      if (idxs.length <= 1) continue;
      const uniqueIdxs = idxs.filter(i => i.nonUnique === 0);
      if (uniqueIdxs.length <= 1) continue;
      uniqueIdxs.sort((a, b) => a.seq - b.seq);
      for (const idx of uniqueIdxs.slice(1)) {
        try {
          await sequelize.query(`DROP INDEX \`${idx.name}\` ON \`${table}\``);
          totalDropped++;
        } catch (_) {
          // 忽略删除失败
        }
      }
    }

    // ========== 第二部分：复合重复 UNIQUE 索引 ==========
    // 按 Key_name 分组找出复合索引（同一 Key_name 对应多列）
    const byKeyName = new Map();
    indexes.forEach(idx => {
      if (idx.Key_name === 'PRIMARY') return;
      if (idx.Non_unique !== 0) return;
      if (!byKeyName.has(idx.Key_name)) byKeyName.set(idx.Key_name, []);
      byKeyName.get(idx.Key_name).push(idx);
    });

    const compoundGroups = new Map();
    byKeyName.forEach((cols, keyName) => {
      if (cols.length <= 1) return;
      const colSet = cols
        .sort((a, b) => a.Seq_in_index - b.Seq_in_index)
        .map(c => c.Column_name)
        .join(',');
      if (!compoundGroups.has(colSet)) compoundGroups.set(colSet, []);
      compoundGroups.get(colSet).push(keyName);
    });

    for (const [, keyNames] of compoundGroups) {
      if (keyNames.length <= 1) continue;
      keyNames.sort((a, b) => {
        const aHas = /_\d+$/.test(a);
        const bHas = /_\d+$/.test(b);
        if (aHas && !bHas) return 1;
        if (!aHas && bHas) return -1;
        return a.length - b.length;
      });
      for (const name of keyNames.slice(1)) {
        try {
          await sequelize.query(`DROP INDEX \`${name}\` ON \`${table}\``);
          totalDropped++;
        } catch (_) {
          // 忽略删除失败
        }
      }
    }
  }

  console.log(`    重复索引清理完成，共删除 ${totalDropped} 个`);
}

// ==================== warehouseId 外键清理（原 drop-device-warehouse-fk.js） ====================

/**
 * 删除 devices 表上引用 warehouses.warehouseId 的外键约束
 * 业务背景：warehouseId 设计为自由输入文本字段，不应该有外键约束
 * 仅 MySQL 需要执行（SQLite 没有显式外键约束由 Sequelize 管理）
 */
async function migrateDropWarehouseFK() {
  const dialect = sequelize.getDialect();

  if (dialect !== 'mysql' && dialect !== 'mariadb') {
    console.log('    非 MySQL 数据库，跳过 warehouseId 外键清理');
    return;
  }

  // 查询所有引用 warehouses 表的外键约束
  const [constraints] = await sequelize.query(
    `SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'devices'
       AND REFERENCED_TABLE_NAME = 'warehouses'
       AND REFERENCED_COLUMN_NAME = 'warehouseId'`
  );

  if (constraints.length === 0) {
    console.log('    devices.warehouseId 上无外键约束，跳过');
    return;
  }

  console.log(`    发现 ${constraints.length} 个外键约束待清理`);

  for (const c of constraints) {
    try {
      await sequelize.query(`ALTER TABLE devices DROP FOREIGN KEY \`${c.CONSTRAINT_NAME}\``);
      console.log(`    已删除外键: ${c.CONSTRAINT_NAME}`);
    } catch (err) {
      console.log(`    删除外键 ${c.CONSTRAINT_NAME} 失败: ${err.message}`);
    }
  }

  console.log('    warehouseId 外键清理完成');
}

// ==================== IPAM 网段与 IP 地址表（v2.5.0） ====================

const IPAM_PERMISSIONS = [
  { permissionId: 'perm_ipam', permissionName: 'IP地址管理', permissionCode: 'ipam', parentId: null, type: 'module', sort: 70, status: 'active' },
  { permissionId: 'perm_ipam_page', permissionName: '网段管理', permissionCode: 'ipam:page', parentId: 'ipam', type: 'menu', sort: 71, status: 'active' },
  { permissionId: 'perm_ipam_view', permissionName: '查看IP', permissionCode: 'ipam:view', parentId: 'ipam:page', type: 'button', sort: 72, status: 'active' },
  { permissionId: 'perm_ipam_create', permissionName: '创建网段', permissionCode: 'ipam:create', parentId: 'ipam:page', type: 'button', sort: 73, status: 'active' },
  { permissionId: 'perm_ipam_edit', permissionName: '编辑IP', permissionCode: 'ipam:edit', parentId: 'ipam:page', type: 'button', sort: 74, status: 'active' },
  { permissionId: 'perm_ipam_delete', permissionName: '删除网段', permissionCode: 'ipam:delete', parentId: 'ipam:page', type: 'button', sort: 75, status: 'active' },
  { permissionId: 'perm_ipam_import', permissionName: '批量导入', permissionCode: 'ipam:import', parentId: 'ipam:page', type: 'button', sort: 76, status: 'active' },
  { permissionId: 'perm_ipam_export', permissionName: '导出IP', permissionCode: 'ipam:export', parentId: 'ipam:page', type: 'button', sort: 77, status: 'active' },
];

/**
 * 创建 subnets、ip_addresses 表（幂等：已存在则跳过），
 * 并 upsert 8 条 IPAM 权限数据
 */
async function migrateIpamTables() {
  const queryInterface = sequelize.getQueryInterface();
  const S = sequelize.Sequelize;

  // ----- subnets -----
  if (!(await tableExists('subnets'))) {
    await queryInterface.createTable('subnets', {
      subnetId: { type: S.STRING, primaryKey: true, allowNull: false, unique: true },
      name: { type: S.STRING(200), allowNull: false },
      cidr: { type: S.STRING(50), allowNull: false },
      networkAddress: { type: S.STRING(50), allowNull: false },
      broadcastAddress: { type: S.STRING(50), allowNull: true },
      netmask: { type: S.STRING(50), allowNull: true },
      prefixLength: { type: S.INTEGER, allowNull: false },
      totalHosts: { type: S.INTEGER, allowNull: true },
      usableHosts: { type: S.INTEGER, allowNull: true },
      gateway: { type: S.STRING(50), allowNull: true },
      dns: { type: S.JSON, defaultValue: [], allowNull: true },
      vlanId: { type: S.STRING(50), allowNull: true },
      autoGenerated: { type: S.BOOLEAN, defaultValue: true },
      parentId: { type: S.STRING, allowNull: true },
      description: { type: S.TEXT, allowNull: true },
      createdAt: { type: S.DATE, allowNull: false },
      updatedAt: { type: S.DATE, allowNull: false },
    });
    await addIndexIfNotExists('subnets', 'subnets_parentId', ['parentId']);
    await addIndexIfNotExists('subnets', 'subnets_cidr', ['cidr']);
    await addIndexIfNotExists('subnets', 'subnets_network_prefix_unique', ['networkAddress', 'prefixLength']);
    console.log('    subnets 表创建成功');
  } else {
    console.log('    subnets 表已存在，跳过');
  }

  // ----- ip_addresses（ipInt 直接用 BIGINT 避免后续修复） -----
  if (!(await tableExists('ip_addresses'))) {
    await queryInterface.createTable('ip_addresses', {
      ipId: { type: S.STRING, primaryKey: true, allowNull: false, unique: true },
      subnetId: { type: S.STRING, allowNull: false },
      ipAddress: { type: S.STRING(50), allowNull: false },
      ipInt: { type: S.BIGINT.UNSIGNED, allowNull: false },
      status: { type: S.ENUM('free', 'used', 'reserved', 'gateway', 'excluded'), defaultValue: 'free', allowNull: false },
      assignmentType: { type: S.STRING(20), defaultValue: 'static' },
      label: { type: S.STRING(200), allowNull: true },
      description: { type: S.TEXT, allowNull: true },
      deviceId: { type: S.STRING, allowNull: true },
      networkCardId: { type: S.STRING, allowNull: true },
      createdAt: { type: S.DATE, allowNull: false },
      updatedAt: { type: S.DATE, allowNull: false },
    });
    await addIndexIfNotExists('ip_addresses', 'ip_addresses_subnetId', ['subnetId']);
    await addIndexIfNotExists('ip_addresses', 'ip_addresses_ipAddress', ['ipAddress']);
    await addIndexIfNotExists('ip_addresses', 'ip_addresses_subnet_status', ['subnetId', 'status']);
    await addIndexIfNotExists('ip_addresses', 'ip_addresses_subnet_ipInt', ['subnetId', 'ipInt']);
    await addIndexIfNotExists('ip_addresses', 'ip_addresses_subnet_ip_unique', ['subnetId', 'ipAddress']);
    console.log('    ip_addresses 表创建成功');
  } else {
    console.log('    ip_addresses 表已存在，跳过');
  }

  // ----- IPAM 权限 upsert -----
  if (await tableExists('permissions')) {
    const Permission = require('../models/Permission');
    let count = 0;
    for (const perm of IPAM_PERMISSIONS) {
      const [, created] = await Permission.upsert(perm);
      if (created) count++;
    }
    console.log(`    IPAM 权限 upsert 完成（新增 ${count} / 共 ${IPAM_PERMISSIONS.length}）`);
  }
}

/**
 * 将 ip_addresses.ipInt 从 INTEGER 修正为 BIGINT UNSIGNED，
 * 并回填现有行的正确 IP 整数。仅 MySQL 需要。
 * 幂等：已是 BIGINT 则跳过。
 */
async function migrateIpamFixIpInt() {
  if (!(await tableExists('ip_addresses'))) {
    console.log('    ip_addresses 表不存在，跳过');
    return;
  }

  const dialect = sequelize.getDialect();
  if (dialect !== 'mysql' && dialect !== 'mariadb') {
    console.log('    非 MySQL 数据库，BIGINT.UNSIGNED 兼容，跳过');
    return;
  }

  // 检查当前列类型
  const [cols] = await sequelize.query(
    `SELECT DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ip_addresses' AND COLUMN_NAME = 'ipInt'`
  );
  if (cols.length > 0 && cols[0].DATA_TYPE === 'bigint') {
    console.log('    ipInt 已是 BIGINT，跳过');
    return;
  }

  await sequelize.query(
    `ALTER TABLE ip_addresses MODIFY COLUMN ipInt BIGINT UNSIGNED NOT NULL`
  );
  console.log('    ipInt 已改为 BIGINT UNSIGNED');

  // 回填
  const [rows] = await sequelize.query('SELECT ipId, ipAddress FROM ip_addresses');
  let fixed = 0;
  for (const row of rows) {
    const parts = row.ipAddress.split('.').map(Number);
    const correct = ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    await sequelize.query('UPDATE ip_addresses SET ipInt = ? WHERE ipId = ?', {
      replacements: [correct, row.ipId],
    });
    fixed++;
  }
  console.log(`    已回填 ${fixed} 条 ipInt`);
}

// ==================== IPAM IPv6 扩展字段（v2.6.0） ====================

/**
 * subnets 表新增 IPv6 支持字段
 * - ipVersion ENUM('ipv4','ipv6') DEFAULT 'ipv4'
 * - startInt / endInt DECIMAL(39,0) 用于重叠检测（统一 IPv4/IPv6）
 * - totalHosts / usableHosts 从 INTEGER 改为 VARCHAR(50) 存字符串（IPv6 超大数）
 * 幂等：字段已存在则跳过
 */
async function migrateIpamV6SubnetFields() {
  if (!(await tableExists('subnets'))) {
    console.log('    subnets 表不存在，跳过');
    return;
  }

  const dialect = sequelize.getDialect();

  // 1. ipVersion
  const columns = await getTableColumns('subnets');
  if (!columns.includes('ipVersion')) {
    const colDef = dialect === 'mysql'
      ? "ENUM('ipv4','ipv6') NOT NULL DEFAULT 'ipv4' COMMENT '地址族'"
      : "VARCHAR(10) NOT NULL DEFAULT 'ipv4'";
    await sequelize.query(`ALTER TABLE subnets ADD COLUMN ipVersion ${colDef}`);
    console.log('    新增 ipVersion');
  } else {
    console.log('    ipVersion 已存在，跳过');
  }

  // 2. startInt DECIMAL(39,0)
  if (!columns.includes('startInt')) {
    await sequelize.query('ALTER TABLE subnets ADD COLUMN startInt DECIMAL(39,0) NOT NULL DEFAULT 0');
    console.log('    新增 startInt');
  } else {
    console.log('    startInt 已存在，跳过');
  }

  // 3. endInt DECIMAL(39,0)
  if (!columns.includes('endInt')) {
    await sequelize.query('ALTER TABLE subnets ADD COLUMN endInt DECIMAL(39,0) NOT NULL DEFAULT 0');
    console.log('    新增 endInt');
  } else {
    console.log('    endInt 已存在，跳过');
  }

  // 4. totalHosts 类型改 VARCHAR(50) —— 仅 MySQL 需要，SQLite 不支持 MODIFY
  if (columns.includes('totalHosts')) {
    if (dialect === 'mysql') {
      await sequelize.query(
        'ALTER TABLE subnets MODIFY COLUMN totalHosts VARCHAR(50) NULL COMMENT "总主机数（字符串）"'
      );
      console.log('    totalHosts 类型改为 VARCHAR(50)');
    }
  }

  // 5. usableHosts 同理
  if (columns.includes('usableHosts')) {
    if (dialect === 'mysql') {
      await sequelize.query(
        'ALTER TABLE subnets MODIFY COLUMN usableHosts VARCHAR(50) NULL COMMENT "可用主机数（字符串）"'
      );
      console.log('    usableHosts 类型改为 VARCHAR(50)');
    }
  }

  // 6. 新增复合索引
  await addIndexIfNotExists('subnets', 'subnets_ipVersion', ['ipVersion']);
  await addIndexIfNotExists('subnets', 'subnets_version_range', ['ipVersion', 'startInt', 'endInt']);

  console.log('    IPv6 网段字段迁移完成');
}

/**
 * ip_addresses 表新增 IPv6 支持字段
 * - ipVersion ENUM('ipv4','ipv6') DEFAULT 'ipv4'
 * - ipInt128 DECIMAL(39,0) 通用 128 位整数
 * - ipInt 改为可空（IPv6 不使用）
 */
async function migrateIpamV6IpFields() {
  if (!(await tableExists('ip_addresses'))) {
    console.log('    ip_addresses 表不存在，跳过');
    return;
  }

  const dialect = sequelize.getDialect();
  const columns = await getTableColumns('ip_addresses');

  // 1. ipVersion
  if (!columns.includes('ipVersion')) {
    const colDef = dialect === 'mysql'
      ? "ENUM('ipv4','ipv6') NOT NULL DEFAULT 'ipv4' COMMENT '地址族'"
      : "VARCHAR(10) NOT NULL DEFAULT 'ipv4'";
    await sequelize.query(`ALTER TABLE ip_addresses ADD COLUMN ipVersion ${colDef}`);
    console.log('    新增 ipVersion');
  }

  // 2. ipInt128
  if (!columns.includes('ipInt128')) {
    await sequelize.query('ALTER TABLE ip_addresses ADD COLUMN ipInt128 DECIMAL(39,0) NULL');
    console.log('    新增 ipInt128');
  }

  // 3. ipInt 改可空（IPv6 不需要 ipInt）—— 仅 MySQL
  if (columns.includes('ipInt') && dialect === 'mysql') {
    await sequelize.query('ALTER TABLE ip_addresses MODIFY COLUMN ipInt BIGINT UNSIGNED NULL');
    console.log('    ipInt 改为可空');
  }

  // 4. 索引
  await addIndexIfNotExists('ip_addresses', 'ip_addresses_ipVersion', ['ipVersion']);
  await addIndexIfNotExists('ip_addresses', 'ip_addresses_ipInt128', ['subnetId', 'ipInt128']);

  console.log('    IPv6 IP 字段迁移完成');
}

/**
 * 锁等待诊断辅助：MySQL 上有锁等待时打印出来帮助定位
 * @param {string} tableName - 要检查的表名
 */
async function diagnoseLockWait(tableName) {
  if (sequelize.getDialect() !== 'mysql') return;
  try {
    const [processes] = await sequelize.query(
      `SHOW PROCESSLIST WHERE Command = 'Sleep' OR Command = 'Query' OR Info LIKE '%${tableName}%'`
    );
    const blockers = processes.filter(p => p.Info && p.Info.toLowerCase().includes(tableName.toLowerCase()));
    if (blockers.length > 0) {
      console.log(`    ⚠ 检测到 ${tableName} 可能有活动连接持有锁：`);
      blockers.forEach(b => {
        console.log(`      [${b.Id}] ${b.User}@${b.Host} Command=${b.Command} State=${b.State}`);
      });
      console.log('    建议：停掉生产服务（pm2 stop / docker stop）后重新执行迁移');
    }
  } catch (_) { /* 诊断失败不影响主流程 */ }
}

/**
 * 带超时的查询包装：超时后自动执行锁诊断并抛错
 * @param {Promise} promise - 要执行的异步查询
 * @param {number} timeoutMs - 超时毫秒数
 * @param {string} label - 表名标签（用于日志和锁诊断）
 */
async function queryWithTimeout(promise, timeoutMs, label) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(async () => {
      await diagnoseLockWait(label);
      reject(new Error(`执行超时（${timeoutMs}ms）：${label}，疑似锁等待`));
    }, timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

/**
 * IPAM IPv6 字段数据回填
 * 为现有 IPv4 网段和 IP 回填 ipVersion / startInt / endInt / ipInt128
 * 幂等：已经回填过的记录自动跳过
 * 安全：带超时锁等待诊断，不会静默卡住
 */
async function migrateIpamV6Backfill() {
  const ipam = require('../utils/ipam');

  // ----- 回填 subnets -----
  if (await tableExists('subnets')) {
    const [subnets] = await sequelize.query(
      'SELECT subnetId, cidr, ipVersion, startInt, endInt FROM subnets'
    );
    let subnetUpdated = 0;
    let subnetSkipped = 0;
    for (const s of subnets) {
      try {
        // 幂等：ipVersion 已回填且 startInt 非空的跳过
        if (s.ipVersion && s.startInt != null && s.startInt !== '') {
          subnetSkipped++;
          continue;
        }

        const parsed = ipam.parseCidr(s.cidr);
        const ipVer = parsed.ipVersion;
        const startStr = parsed.startInt.toString();
        const endStr = parsed.endInt.toString();
        const hostsStr = parsed.totalHostsStr || String(parsed.totalHosts);

        await queryWithTimeout(
          sequelize.query(
            `UPDATE subnets SET ipVersion = ?, startInt = ?, endInt = ?,
               totalHosts = ?, usableHosts = ?
             WHERE subnetId = ?`,
            { replacements: [ipVer, startStr, endStr, hostsStr, hostsStr, s.subnetId] }
          ),
          15000,
          'subnets'
        );
        subnetUpdated++;
      } catch (e) {
        console.log(`    网段 ${s.subnetId} 回填跳过: ${e.message}`);
      }
    }
    console.log(`    网段回填完成（${subnetUpdated}/${subnets.length}）跳过 ${subnetSkipped}`);
  }

  // ----- 回填 ip_addresses -----
  if (await tableExists('ip_addresses')) {
    // 只查未回填的（ipVersion 为空或 ipInt128 为空），幂等
    const [ips] = await sequelize.query(
      "SELECT ipId, ipAddress, ipVersion, ipInt128 FROM ip_addresses WHERE ipVersion IS NULL OR ipVersion = '' OR ipVersion = '0' OR ipInt128 IS NULL"
    );
    if (ips.length === 0) {
      console.log('    IP 全部已回填，跳过');
    } else {
      console.log(`    待回填 IP 共 ${ips.length} 条`);
      const startTime = Date.now();

      // 第一阶段：内存中预处理所有行的 ipVersion 和 int128
      // 纯计算，不涉及 DB，非常快
      const batch = [];
      for (const ip of ips) {
        try {
          const ipVer = ipam.detectIpVersion(ip.ipAddress);
          let int128Str = '0';

          if (ipVer === 'ipv4') {
            const parts = (ip.ipAddress || '').split('.').map(Number);
            if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
              throw new Error(`IPv4 格式非法`);
            }
            int128Str = String(((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]);
          } else {
            const expanded = ipam.expandIPv6(ip.ipAddress);
            let val = 0n;
            for (const seg of expanded) {
              val = (val << 16n) | BigInt(parseInt(seg, 16));
            }
            int128Str = val.toString();
          }
          batch.push({ ipId: ip.ipId, ipVer, int128Str });
        } catch (e) {
          console.log(`    IP ${ip.ipId} (${ip.ipAddress}) 预处理跳过: ${e.message}`);
        }
      }

      console.log(`    预处理完成（${batch.length} 条有效），开始并发回填...`);

      // 第二阶段：分批 + 限流并发 UPDATE
      // ipId 是主键，每条写不同行，不会锁冲突
      const CONCURRENCY = 30;      // 同时在飞的 UPDATE 数
      const BATCH_SIZE = 500;     // 每批 500 条打印一次进度
      let ipUpdated = 0;
      let ipErr = 0;

      // 按并发数分小组执行
      async function runWithConcurrency(items, limit) {
        const results = new Array(items.length);
        let idx = 0;
        async function worker() {
          while (idx < items.length) {
            const myIdx = idx++;
            try {
              await queryWithTimeout(
                sequelize.query(
                  'UPDATE ip_addresses SET ipVersion = ?, ipInt128 = ? WHERE ipId = ?',
                  { replacements: [items[myIdx].ipVer, items[myIdx].int128Str, items[myIdx].ipId] }
                ),
                15000,
                'ip_addresses'
              );
              results[myIdx] = 'ok';
            } catch (e) {
              results[myIdx] = e;
            }
          }
        }
        const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
        await Promise.all(workers);
        return results;
      }

      for (let batchStart = 0; batchStart < batch.length; batchStart += BATCH_SIZE) {
        const chunk = batch.slice(batchStart, batchStart + BATCH_SIZE);
        const results = await runWithConcurrency(chunk, CONCURRENCY);

        // 统计结果
        results.forEach((r, i) => {
          if (r === 'ok') {
            ipUpdated++;
          } else {
            ipErr++;
            if (r && r.message && r.message.includes('锁等待')) {
              console.log('    ✗ 检测到锁等待，中断 IP 回填。请停掉生产服务后重新执行迁移。');
              return;
            }
            const item = chunk[i];
            console.log(`    IP ${item.ipId} 回填失败: ${r?.message || r}`);
          }
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const progress = Math.min(batchStart + BATCH_SIZE, batch.length);
        console.log(`      进度: ${progress}/${batch.length} 更新 ${ipUpdated} 错误 ${ipErr} 耗时 ${elapsed}s`);
      }
      console.log(`    IP 回填完成（更新 ${ipUpdated} / 错误 ${ipErr} / 共 ${ips.length}）`);
    }
  }

  console.log('    IPv6 数据回填完成');
}

// ==================== IPAM 在线探测字段 ====================

/**
 * ip_addresses 表新增 4 个在线探测字段
 * 幂等：字段已存在则跳过
 */
async function migrateIpProbeFields() {
  const queryInterface = sequelize.getQueryInterface();
  const table = 'ip_addresses';

  const [cols] = await sequelize.query(
    `SHOW COLUMNS FROM \`${table}\``
  );
  const colNames = cols.map(c => c.Field);

  /** 辅助：安全加列 */
  async function addCol(name, ddl) {
    if (colNames.includes(name)) {
      console.log(`    字段 ${name} 已存在，跳过`);
      return;
    }
    await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN ${name} ${ddl}`);
    console.log(`    已添加字段 ${name}`);
  }

  // probeStatus ENUM — MySQL 需先确保 ENUM 值存在（幂等方式）
  if (colNames.includes('probeStatus')) {
    console.log('    probeStatus 已存在，跳过');
  } else {
    await sequelize.query(
      `ALTER TABLE \`${table}\` ADD COLUMN probeStatus ENUM('unknown','online','offline') NOT NULL DEFAULT 'unknown' COMMENT '在线探测状态'`
    );
    console.log('    已添加 probeStatus');
  }

  await addCol('probeMethod', 'VARCHAR(10) NULL');
  await addCol('probeLatency', 'INTEGER NULL');
  await addCol('probeLastCheckedAt', 'DATETIME NULL');

  // 索引
  try {
    await sequelize.query(
      `ALTER TABLE \`${table}\` ADD INDEX \`idx_ip_addresses_probe_status\` (probeStatus)`
    );
    console.log('    已添加 probeStatus 索引');
  } catch (_) { /* 已存在 */ }

  try {
    await sequelize.query(
      `ALTER TABLE \`${table}\` ADD INDEX \`idx_ip_addresses_subnet_probe\` (subnetId, probeStatus)`
    );
    console.log('    已添加 (subnetId, probeStatus) 索引');
  } catch (_) { /* 已存在 */ }

  console.log('    在线探测字段迁移完成');
}

/**
 * IP-设备关联字段迁移
 * ip_addresses 表新增：
 *   - ipType ENUM('management','business','public','storage','other') DEFAULT 'business'
 *   - customTag VARCHAR(100) NULL
 *   - isPrimaryForDevice BOOLEAN NOT NULL DEFAULT false
 *   - statusAutoDriven BOOLEAN NOT NULL DEFAULT false
 * subnets 表新增：
 *   - purpose ENUM('management','business','public','storage','other') NULL
 * 同时候选将 ip_addresses.subnetId 改为可空（旧 Device.ipAddress 迁移时可能不在任何网段）
 */
async function migrateIpDeviceBindingFields() {
  const dialect = sequelize.getDialect();
  const table = 'ip_addresses';

  if (!(await tableExists(table))) {
    console.log(`    ${table} 表不存在，跳过`);
    return;
  }
  if (!(await tableExists('subnets'))) {
    console.log('    subnets 表不存在，跳过 purpose 字段');
  }

  const columns = await getTableColumns(table);

  // 1. ipType
  if (!columns.includes('ipType')) {
    const enumVals = "'management','business','public','storage','other'";
    const colDef = dialect === 'mysql'
      ? `ENUM(${enumVals}) NOT NULL DEFAULT 'business' COMMENT 'IP业务类型'`
      : "VARCHAR(20) NOT NULL DEFAULT 'business'";
    await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ipType ${colDef}`);
    console.log('    已添加 ipType 字段');
  } else {
    console.log('    ipType 已存在，跳过');
  }

  // 2. customTag
  await addColumnIfNotExists(table, 'customTag', "VARCHAR(100) NULL COMMENT '自定义标签'");

  // 3. isPrimaryForDevice
  await addColumnIfNotExists(table, 'isPrimaryForDevice', "BOOLEAN NOT NULL DEFAULT false COMMENT '是否为设备主IP'");

  // 4. statusAutoDriven
  await addColumnIfNotExists(table, 'statusAutoDriven', "BOOLEAN NOT NULL DEFAULT false COMMENT 'status是否绑定自动设置'");

  // 5. subnetId 改为可空（旧 Device.ipAddress 可能不在任何网段）
  if (columns.includes('subnetId')) {
    try {
      if (dialect === 'mysql') {
        await sequelize.query(
          `ALTER TABLE ${table} MODIFY COLUMN subnetId VARCHAR(255) NULL`
        );
        console.log('    已将 subnetId 改为可空');
      }
      // SQLite: ALTER COLUMN 不支持，但 SQLite 里我们之前定义就允许 null 或者通过其他方式处理
    } catch (e) {
      console.log(`    subnetId 可空化已存在或不支持: ${e.message}`);
    }
  }

  // 6. 索引
  const indexes = [
    { name: 'idx_ip_addresses_device_id', cols: ['deviceId'] },
    { name: 'idx_ip_addresses_device_id_iptype', cols: ['deviceId', 'ipType'] },
    { name: 'idx_ip_addresses_is_primary', cols: ['isPrimaryForDevice'] },
    { name: 'idx_ip_addresses_ip_type', cols: ['ipType'] },
  ];
  for (const { name, cols } of indexes) {
    try {
      if (dialect === 'mysql') {
        await sequelize.query(
          `ALTER TABLE \`${table}\` ADD INDEX \`${name}\` (${cols.join(',')})`
        );
      } else {
        await sequelize.query(
          `CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${cols.join(',')})`
        );
      }
      console.log(`    已添加索引 ${name}`);
    } catch (_) { /* 已存在 */ }
  }

  // 7. subnets.purpose
  if (await tableExists('subnets')) {
    const subnetCols = await getTableColumns('subnets');
    if (!subnetCols.includes('purpose')) {
      const enumVals = "'management','business','public','storage','other'";
      const colDef = dialect === 'mysql'
        ? `ENUM(${enumVals}) NULL COMMENT '网段默认用途'`
        : "VARCHAR(20) NULL";
      await sequelize.query(`ALTER TABLE subnets ADD COLUMN purpose ${colDef}`);
      console.log('    subnets 已添加 purpose 字段');
    }
  }

  // 8. 初始化：把已有 used 状态标记为非 autoDriven（老数据）
  try {
    await sequelize.query(
      `UPDATE ${table} SET statusAutoDriven = false WHERE status = 'used'`
    );
  } catch (_) { /* 字段可能还没完全就绪 */ }

  console.log('    IP-设备关联字段迁移完成');
}

/**
 * IPAM 字符串列宽扩容
 * IPv6 完整展开地址 + zone id 可能超过 50 字符，模型已改为 STRING(80)
 * MySQL/MariaDB 使用 ALTER TABLE MODIFY COLUMN；SQLite 不支持 ALTER COLUMN，跳过
 */
async function migrateIpamWidenColumns() {
  const dialect = sequelize.getDialect();
  if (dialect !== 'mysql' && dialect !== 'mariadb') {
    console.log('    非 MySQL 数据库，跳过（SQLite 无 ALTER COLUMN）');
    return;
  }

  const widens = [
    { table: 'ip_addresses', column: 'ipAddress', target: 'VARCHAR(80)' },
    { table: 'subnets', column: 'cidr', target: 'VARCHAR(80)' },
    { table: 'subnets', column: 'networkAddress', target: 'VARCHAR(80)' },
    { table: 'subnets', column: 'broadcastAddress', target: 'VARCHAR(80)' },
    { table: 'subnets', column: 'gateway', target: 'VARCHAR(80)' },
  ];

  for (const { table, column, target } of widens) {
    if (!(await tableExists(table))) {
      console.log(`    ${table} 表不存在，跳过 ${column}`);
      continue;
    }
    const cols = await getTableColumns(table);
    if (!cols.includes(column)) {
      console.log(`    ${table}.${column} 不存在，跳过`);
      continue;
    }
    try {
      // 先检查当前是否已经够宽
      const [info] = await sequelize.query(
        `SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'`
      );
      const currentLen = info[0]?.CHARACTER_MAXIMUM_LENGTH;
      if (currentLen >= 80) {
        console.log(`    ${table}.${column} 已是 VARCHAR(${currentLen})，跳过`);
        continue;
      }
      await sequelize.query(
        `ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${target} NULL`
      );
      console.log(`    ${table}.${column} 已扩容至 ${target}`);
    } catch (e) {
      console.log(`    ${table}.${column} 扩容跳过: ${e.message}`);
    }
  }

  console.log('    IPAM 列宽扩容完成');
}

/**
 * 将 devices.ipAddress 非空记录导入 ip_addresses 表
 * - 已在 IpAddress 中存在的（auto-generated 的网段 IP）→ UPDATE 绑定 deviceId
 * - 不存在的 → INSERT 新记录（subnetId 允许 null）
 * - 幂等：脚本可重复运行
 */
async function migrateDeviceIpToIpam() {
  if (!(await tableExists('devices')) || !(await tableExists('ip_addresses'))) {
    console.log('    devices 或 ip_addresses 表不存在，跳过');
    return;
  }

  // 读取所有有 ipAddress 的设备
  const [devices] = await sequelize.query(
    "SELECT deviceId, ipAddress FROM devices WHERE ipAddress IS NOT NULL AND ipAddress != ''"
  );

  if (devices.length === 0) {
    console.log('    无待迁移的 devices.ipAddress 记录');
    return;
  }

  let updated = 0;
  let inserted = 0;
  let skipped = 0;

  for (const dev of devices) {
    const ipStr = dev.ipAddress;
    const devId = dev.deviceId;

    try {
      // 检查 ip_addresses 中是否已有该 IP（全局搜索，因为旧数据可能不在任何网段）
      const [existing] = await sequelize.query(
        `SELECT ipId, deviceId, status FROM ip_addresses WHERE ipAddress = ? LIMIT 1`,
        { replacements: [ipStr] }
      );

      if (existing && existing.length > 0) {
        const row = existing[0];
        if (row.deviceId) {
          // 已绑定了（可能是本设备也可能是别的），跳过
          if (row.deviceId === devId) {
            skipped++;
            console.log(`    SKIP: ${ipStr} 已绑定到设备 ${devId}`);
          } else {
            skipped++;
            console.log(`    SKIP: ${ipStr} 已被设备 ${row.deviceId} 占用`);
          }
          continue;
        }

        // 已存在但未绑定 → UPDATE 绑定
        await sequelize.query(
          `UPDATE ip_addresses SET deviceId = ?, status = 'used', ipType = 'management', statusAutoDriven = true WHERE ipId = ?`,
          { replacements: [devId, row.ipId] }
        );
        updated++;
        console.log(`    UPDATE: ${ipStr} → 设备 ${devId} (status=used)`);
      } else {
        // 不存在 → INSERT 新记录
        // 计算 ipInt / ipInt128
        let ipInt = null;
        let ipInt128 = null;
        let ipVersion = 'ipv4';
        const isV6 = ipStr.includes(':');

        if (!isV6) {
          const parts = ipStr.split('.').map(Number);
          ipInt = String(((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]);
          ipVersion = 'ipv4';
          ipInt128 = ipInt;
        } else {
          ipVersion = 'ipv6';
          // 简化：IPv6 不计算 ipInt（为 null），ipInt128 留空或简单占位
          // 这些是旧迁移来的孤儿 IP，ipInt128 留 null 也能工作
          ipInt = null;
          ipInt128 = null;
        }

        const now = new Date();
        await sequelize.query(
          `INSERT INTO ip_addresses (
            ipId, subnetId, ipVersion, ipAddress, ipInt, ipInt128,
            status, deviceId, ipType, statusAutoDriven, isPrimaryForDevice,
            createdAt, updatedAt
          ) VALUES (?, NULL, ?, ?, ?, ?, 'used', ?, 'management', true, true, ?, ?)`,
          {
            replacements: [
              `LEGACY${devId}`,  // 可溯源的 ipId
              ipVersion,
              ipStr,
              ipInt,
              ipInt128,
              devId,
              now,
              now,
            ],
          }
        );
        inserted++;
        console.log(`    INSERT: ${ipStr} → 设备 ${devId} (LEGACY ipId, subnetId=NULL)`);
      }
    } catch (e) {
      skipped++;
      console.log(`    ERROR: ${ipStr} 迁移失败: ${e.message}`);
    }
  }

  console.log(`    Device.ipAddress 迁移完成：updated=${updated}, inserted=${inserted}, skipped=${skipped}`);
}

// 执行迁移
runMigrations().catch(error => {
  console.error('迁移执行失败:', error);
  process.exit(1);
});
