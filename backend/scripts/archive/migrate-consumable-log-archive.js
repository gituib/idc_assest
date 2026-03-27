/**
 * 耗材操作日志归档表迁移脚本
 * 创建归档表用于存储被删除耗材的历史操作记录
 */

const { sequelize, DB_TYPE } = require('../db');

async function migrate() {
  try {
    console.log('开始创建耗材操作日志归档表...');
    console.log(`数据库类型: ${DB_TYPE}`);

    if (DB_TYPE === 'mysql') {
      await migrateMySQL();
    } else {
      await migrateSQLite();
    }

    console.log('\n归档表创建完成！');
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

async function migrateMySQL() {
  console.log('\n执行 MySQL 迁移...');

  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS consumable_log_archives (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        archiveId VARCHAR(255) NOT NULL UNIQUE COMMENT '归档记录唯一标识',
        consumableId VARCHAR(255) NOT NULL COMMENT '被删除的耗材ID',
        consumableName VARCHAR(255) NOT NULL COMMENT '耗材名称',
        consumableSnapshot JSON DEFAULT NULL COMMENT '耗材快照信息',
        totalOperations INTEGER DEFAULT 0 COMMENT '操作记录总数',
        firstOperationAt DATETIME COMMENT '首次操作时间',
        lastOperationAt DATETIME COMMENT '最后操作时间',
        totalInQuantity INTEGER DEFAULT 0 COMMENT '总入库数量',
        totalOutQuantity INTEGER DEFAULT 0 COMMENT '总出库数量',
        finalStock INTEGER DEFAULT 0 COMMENT '删除时库存',
        deletedBy VARCHAR(255) COMMENT '删除人',
        deletedAt DATETIME COMMENT '删除时间',
        deleteReason VARCHAR(255) COMMENT '删除原因',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_consumable_id (consumableId),
        INDEX idx_archive_id (archiveId),
        INDEX idx_deleted_at (deletedAt),
        INDEX idx_consumable_deleted (consumableId, deletedAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='耗材操作日志归档表'
    `);
    console.log('✓ 创建归档表成功');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('✓ 归档表已存在');
    } else {
      throw err;
    }
  }
}

async function migrateSQLite() {
  console.log('\n执行 SQLite 迁移...');

  try {
    // 检查表是否已存在
    const tables = await sequelize.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='consumable_log_archives'`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (tables && tables.length > 0) {
      console.log('✓ 归档表已存在');
      return;
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
    console.log('✓ 创建归档表成功');

    // 创建索引
    const indexes = [
      { name: 'idx_archive_consumable_id', fields: 'consumableId' },
      { name: 'idx_archive_archive_id', fields: 'archiveId' },
      { name: 'idx_archive_deleted_at', fields: 'deletedAt' },
      { name: 'idx_archive_consumable_deleted', fields: 'consumableId, deletedAt' },
    ];

    for (const idx of indexes) {
      try {
        await sequelize.query(`CREATE INDEX ${idx.name} ON consumable_log_archives(${idx.fields})`);
        console.log(`✓ 创建索引: ${idx.name}`);
      } catch (err) {
        console.log(`! 创建索引失败: ${idx.name}`, err.message);
      }
    }
  } catch (err) {
    console.error('创建归档表失败:', err);
    throw err;
  }
}

migrate();
