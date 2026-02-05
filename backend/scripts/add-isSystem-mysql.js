require('dotenv').config();
const { sequelize } = require('../db');

async function migrate() {
  try {
    console.log('开始 MySQL 数据库迁移...');
    console.log('数据库类型:', process.env.DB_TYPE);
    
    // 检查列是否存在（MySQL 方式）
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'deviceFields' 
      AND COLUMN_NAME = 'isSystem'
      AND TABLE_SCHEMA = '${process.env.MYSQL_DATABASE || 'it_assest'}'
    `);
    
    if (columns.length === 0) {
      // 添加 isSystem 列
      await sequelize.query(`
        ALTER TABLE deviceFields 
        ADD COLUMN isSystem BOOLEAN DEFAULT 0 
        COMMENT '是否为系统字段，系统字段不可删除'
      `);
      console.log('✓ isSystem 列添加成功');
    } else {
      console.log('✓ isSystem 列已存在');
    }
    
    // 更新系统字段标记
    const systemFields = [
      'deviceId', 'name', 'type', 'model', 'serialNumber',
      'rackId', 'position', 'height', 'powerConsumption',
      'status', 'purchaseDate', 'warrantyExpiry'
    ];
    
    for (const fieldName of systemFields) {
      await sequelize.query(`
        UPDATE deviceFields SET isSystem = 1 WHERE fieldName = '${fieldName}'
      `);
      console.log(`✓ 标记系统字段: ${fieldName}`);
    }
    
    // 验证结果
    const [results] = await sequelize.query(`
      SELECT fieldName, displayName, isSystem 
      FROM deviceFields 
      ORDER BY isSystem DESC, fieldName
    `);
    
    console.log('\n========== 迁移结果 ==========');
    console.log('字段总数:', results.length);
    console.log('系统字段数:', results.filter(r => r.isSystem).length);
    console.log('\n系统字段列表:');
    results.filter(r => r.isSystem).forEach(r => {
      console.log(`  🔒 ${r.displayName} (${r.fieldName})`);
    });
    console.log('\n可选字段列表:');
    results.filter(r => !r.isSystem).forEach(r => {
      console.log(`  ✏️ ${r.displayName} (${r.fieldName})`);
    });
    console.log('==============================\n');
    
    console.log('✅ 迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrate();
