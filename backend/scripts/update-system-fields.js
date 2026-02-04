const { sequelize } = require('../db');

async function updateSystemFields() {
  try {
    console.log('开始更新系统字段标记...');
    
    // 系统字段列表
    const systemFields = [
      'deviceId', 'name', 'type', 'model', 'serialNumber',
      'rackId', 'position', 'height', 'powerConsumption',
      'status', 'purchaseDate', 'warrantyExpiry',
      'ipAddress', 'description'
    ];
    
    // 更新系统字段标记
    for (const fieldName of systemFields) {
      const [result] = await sequelize.query(
        `UPDATE deviceFields SET isSystem = 1 WHERE fieldName = '${fieldName}'`,
        { type: sequelize.QueryTypes.RAW }
      );
      console.log(`标记系统字段: ${fieldName}`);
    }
    
    console.log('系统字段标记更新完成');
    process.exit(0);
  } catch (error) {
    console.error('更新失败:', error);
    process.exit(1);
  }
}

updateSystemFields();
