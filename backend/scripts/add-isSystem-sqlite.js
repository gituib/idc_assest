const { sequelize } = require('../db');

async function migrate() {
  try {
    console.log('开始 SQLite 数据库迁移...');
    
    // 检查列是否存在（SQLite 使用 PRAGMA）
    const tableInfo = await sequelize.query(
      "PRAGMA table_info(deviceFields)",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    const hasIsSystemColumn = tableInfo.some(col => col.name === 'isSystem');
    
    if (!hasIsSystemColumn) {
      // 添加 isSystem 列
      await sequelize.query(
        "ALTER TABLE deviceFields ADD COLUMN isSystem BOOLEAN DEFAULT 0",
        { type: sequelize.QueryTypes.RAW }
      );
      console.log('isSystem 列添加成功');
    } else {
      console.log('isSystem 列已存在');
    }
    
    // 更新系统字段标记
    const systemFields = [
      'deviceId', 'name', 'type', 'model', 'serialNumber',
      'rackId', 'position', 'height', 'powerConsumption',
      'status', 'purchaseDate', 'warrantyExpiry'
    ];
    
    for (const fieldName of systemFields) {
      await sequelize.query(
        `UPDATE deviceFields SET isSystem = 1 WHERE fieldName = '${fieldName}'`,
        { type: sequelize.QueryTypes.RAW }
      );
      console.log(`标记系统字段: ${fieldName}`);
    }
    
    console.log('迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

migrate();
