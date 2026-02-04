const { sequelize } = require('../db');

async function addIsSystemColumn() {
  try {
    console.log('开始添加 isSystem 列到 deviceFields 表...');
    
    // 检查列是否已存在
    const tableInfo = await sequelize.query(
      "PRAGMA table_info(deviceFields)",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    const hasIsSystemColumn = tableInfo.some(col => col.name === 'isSystem');
    
    if (hasIsSystemColumn) {
      console.log('isSystem 列已存在，跳过添加');
    } else {
      // 添加 isSystem 列
      await sequelize.query(
        "ALTER TABLE deviceFields ADD COLUMN isSystem BOOLEAN DEFAULT 0",
        { type: sequelize.QueryTypes.RAW }
      );
      console.log('isSystem 列添加成功');
    }
    
    // 更新现有数据：将核心字段标记为系统字段
    const systemFields = [
      'deviceId', 'name', 'type', 'model', 'serialNumber',
      'rackId', 'position', 'height', 'powerConsumption',
      'status', 'purchaseDate', 'warrantyExpiry',
      'ipAddress', 'description'
    ];
    
    for (const fieldName of systemFields) {
      await sequelize.query(
        `UPDATE deviceFields SET isSystem = 1 WHERE fieldName = '${fieldName}'`,
        { type: sequelize.QueryTypes.RAW }
      );
    }
    console.log('系统字段标记完成');
    
    console.log('数据库迁移完成');
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

addIsSystemColumn();
