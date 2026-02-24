/**
 * 耗材操作日志表结构迁移脚本
 * 添加修改记录相关字段
 */

const { sequelize } = require('../db');

async function migrate() {
  try {
    console.log('开始迁移耗材操作日志表...');

    // 检查并添加 isEditable 字段
    try {
      await sequelize.query(`
        ALTER TABLE consumable_logs ADD COLUMN isEditable BOOLEAN DEFAULT 1
      `);
      console.log('✓ 添加 isEditable 字段成功');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✓ isEditable 字段已存在');
      } else {
        throw err;
      }
    }

    // 检查并添加 originalLogId 字段
    try {
      await sequelize.query(`
        ALTER TABLE consumable_logs ADD COLUMN originalLogId INTEGER
      `);
      console.log('✓ 添加 originalLogId 字段成功');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✓ originalLogId 字段已存在');
      } else {
        throw err;
      }
    }

    // 检查并添加 modifiedBy 字段
    try {
      await sequelize.query(`
        ALTER TABLE consumable_logs ADD COLUMN modifiedBy VARCHAR(255)
      `);
      console.log('✓ 添加 modifiedBy 字段成功');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✓ modifiedBy 字段已存在');
      } else {
        throw err;
      }
    }

    // 检查并添加 modifiedAt 字段
    try {
      await sequelize.query(`
        ALTER TABLE consumable_logs ADD COLUMN modifiedAt DATETIME
      `);
      console.log('✓ 添加 modifiedAt 字段成功');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✓ modifiedAt 字段已存在');
      } else {
        throw err;
      }
    }

    // 检查并添加 modificationReason 字段
    try {
      await sequelize.query(`
        ALTER TABLE consumable_logs ADD COLUMN modificationReason VARCHAR(255)
      `);
      console.log('✓ 添加 modificationReason 字段成功');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✓ modificationReason 字段已存在');
      } else {
        throw err;
      }
    }

    // 创建索引
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_consumable_logs_original_log_id ON consumable_logs(originalLogId)
      `);
      console.log('✓ 创建 originalLogId 索引成功');
    } catch (err) {
      console.log('! originalLogId 索引创建失败:', err.message);
    }

    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_consumable_logs_is_editable ON consumable_logs(isEditable)
      `);
      console.log('✓ 创建 isEditable 索引成功');
    } catch (err) {
      console.log('! isEditable 索引创建失败:', err.message);
    }

    // 更新现有记录：将出入库、调整等系统生成的记录标记为不可编辑
    const [result] = await sequelize.query(`
      UPDATE consumable_logs
      SET isEditable = 0
      WHERE operationType IN ('in', 'out', 'adjust')
        AND (isEditable IS NULL OR isEditable = 1)
    `);
    console.log(`✓ 更新 ${result.changes || 0} 条系统生成记录为不可编辑状态`);

    console.log('\n迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

migrate();
