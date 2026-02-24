/**
 * 耗材操作日志解耦迁移脚本
 * 添加 isConsumableDeleted 和 consumableSnapshot 字段
 * 实现耗材删除后日志仍可保留
 */

const { sequelize, DB_TYPE } = require('../db');
const Consumable = require('../models/Consumable');
const ConsumableLog = require('../models/ConsumableLog');

async function migrate() {
  try {
    console.log('开始迁移耗材操作日志解耦...');
    console.log(`数据库类型: ${DB_TYPE}`);

    const isMySQL = DB_TYPE === 'mysql';

    if (isMySQL) {
      await migrateMySQL();
    } else {
      await migrateSQLite();
    }

    await updateExistingLogs();

    console.log('\n迁移完成！耗材删除后日志将被保留。');
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
      ALTER TABLE consumable_logs 
      ADD COLUMN isConsumableDeleted TINYINT(1) DEFAULT 0 COMMENT '关联耗材是否已被删除'
    `);
    console.log('✓ 添加 isConsumableDeleted 字段成功');
  } catch (err) {
    if (err.message.includes('Duplicate column')) {
      console.log('✓ isConsumableDeleted 字段已存在');
    } else {
      throw err;
    }
  }

  try {
    await sequelize.query(`
      ALTER TABLE consumable_logs 
      ADD COLUMN consumableSnapshot JSON DEFAULT NULL COMMENT '耗材快照信息'
    `);
    console.log('✓ 添加 consumableSnapshot 字段成功');
  } catch (err) {
    if (err.message.includes('Duplicate column')) {
      console.log('✓ consumableSnapshot 字段已存在');
    } else {
      throw err;
    }
  }

  try {
    await sequelize.query(`
      CREATE INDEX idx_consumable_logs_is_deleted ON consumable_logs(isConsumableDeleted)
    `);
    console.log('✓ 创建 isConsumableDeleted 索引成功');
  } catch (err) {
    if (err.message.includes('Duplicate key name')) {
      console.log('✓ isConsumableDeleted 索引已存在');
    } else {
      console.log('! isConsumableDeleted 索引创建失败:', err.message);
    }
  }
}

async function migrateSQLite() {
  console.log('\n执行 SQLite 迁移...');

  try {
    await sequelize.query(`
      ALTER TABLE consumable_logs ADD COLUMN isConsumableDeleted BOOLEAN DEFAULT 0
    `);
    console.log('✓ 添加 isConsumableDeleted 字段成功');
  } catch (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('✓ isConsumableDeleted 字段已存在');
    } else {
      throw err;
    }
  }

  try {
    await sequelize.query(`
      ALTER TABLE consumable_logs ADD COLUMN consumableSnapshot TEXT
    `);
    console.log('✓ 添加 consumableSnapshot 字段成功');
  } catch (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('✓ consumableSnapshot 字段已存在');
    } else {
      throw err;
    }
  }

  try {
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_consumable_logs_is_deleted ON consumable_logs(isConsumableDeleted)
    `);
    console.log('✓ 创建 isConsumableDeleted 索引成功');
  } catch (err) {
    console.log('! isConsumableDeleted 索引创建失败:', err.message);
  }
}

async function updateExistingLogs() {
  console.log('\n更新现有日志数据...');

  try {
    const consumables = await Consumable.findAll({
      attributes: ['consumableId', 'category', 'unit', 'unitPrice', 'supplier', 'location', 'minStock', 'maxStock', 'status']
    });

    const consumableMap = new Map();
    consumables.forEach(c => {
      consumableMap.set(c.consumableId, {
        category: c.category,
        unit: c.unit,
        unitPrice: c.unitPrice,
        supplier: c.supplier,
        location: c.location,
        minStock: c.minStock,
        maxStock: c.maxStock,
        status: c.status
      });
    });

    const logs = await ConsumableLog.findAll({
      where: {
        consumableSnapshot: null
      }
    });

    let updatedCount = 0;
    for (const log of logs) {
      const snapshot = consumableMap.get(log.consumableId);
      if (snapshot) {
        await log.update({ consumableSnapshot: snapshot });
        updatedCount++;
      }
    }

    console.log(`✓ 更新了 ${updatedCount} 条日志的快照信息`);

    const deletedLogsCount = await ConsumableLog.count({
      where: { operationType: 'delete' }
    });
    console.log(`✓ 当前有 ${deletedLogsCount} 条删除类型日志`);

  } catch (error) {
    console.log('! 更新现有日志数据时出错:', error.message);
  }
}

migrate();
