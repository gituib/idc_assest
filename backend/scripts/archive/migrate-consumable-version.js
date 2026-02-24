/**
 * 耗材管理乐观锁迁移脚本
 * 为 consumables 表添加 version 字段
 */

require('dotenv').config();
const { sequelize, dbDialect } = require('../db');

// 从环境变量重新确定数据库类型
const actualDbType = process.env.DB_TYPE || 'sqlite';

async function migrate() {
  try {
    console.log('开始执行耗材乐观锁迁移...');
    console.log('数据库类型:', actualDbType);

    if (actualDbType === 'sqlite') {
      // SQLite: 检查字段是否存在
      const tableInfo = await sequelize.query(
        "PRAGMA table_info(consumables)",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      const hasVersion = tableInfo.some(col => col.name === 'version');
      
      if (!hasVersion) {
        console.log('添加 version 字段...');
        await sequelize.query(
          "ALTER TABLE consumables ADD COLUMN version INTEGER DEFAULT 0"
        );
        console.log('version 字段添加成功');
      } else {
        console.log('version 字段已存在，跳过');
      }

      // 检查 updatedAt 索引
      const indexes = await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='consumables'",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      const hasUpdatedAtIndex = indexes.some(idx => idx.name === 'consumables_updatedAt');
      
      if (!hasUpdatedAtIndex) {
        console.log('添加 updatedAt 索引...');
        await sequelize.query(
          "CREATE INDEX consumables_updatedAt ON consumables(updatedAt)"
        );
        console.log('updatedAt 索引添加成功');
      } else {
        console.log('updatedAt 索引已存在，跳过');
      }

    } else if (actualDbType === 'mysql') {
      // MySQL: 检查并添加字段
      try {
        console.log('添加 version 字段...');
        await sequelize.query(
          "ALTER TABLE consumables ADD COLUMN version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号'"
        );
        console.log('version 字段添加成功');
      } catch (err) {
        if (err.message.includes('Duplicate column')) {
          console.log('version 字段已存在，跳过');
        } else {
          throw err;
        }
      }

      // 添加索引
      try {
        console.log('添加 updatedAt 索引...');
        await sequelize.query(
          "CREATE INDEX idx_consumables_updatedAt ON consumables(updatedAt)"
        );
        console.log('updatedAt 索引添加成功');
      } catch (err) {
        if (err.message.includes('Duplicate key')) {
          console.log('updatedAt 索引已存在，跳过');
        } else {
          throw err;
        }
      }
    }

    // 初始化现有数据的 version 值
    console.log('初始化现有数据的 version 值...');
    await sequelize.query(
      "UPDATE consumables SET version = 0 WHERE version IS NULL"
    );
    console.log('version 值初始化完成');

    console.log('迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

migrate();
