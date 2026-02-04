const { sequelize } = require('../db');

async function updateSystemFields() {
  try {
    console.log('开始调整系统字段标记...');
    
    // 核心系统字段（数据库必填字段，不可删除）
    const coreSystemFields = [
      'deviceId', 'name', 'type', 'model', 'serialNumber',
      'rackId', 'position', 'height', 'powerConsumption',
      'status', 'purchaseDate', 'warrantyExpiry'
    ];
    
    // 可选字段（非系统字段，可删除）
    const optionalFields = [
      'ipAddress', 'description', 'owner', 'department', 'assetId', 'brand'
    ];
    
    // 先将所有字段设为非系统字段
    await sequelize.query(
      `UPDATE deviceFields SET isSystem = 0`,
      { type: sequelize.QueryTypes.RAW }
    );
    console.log('已重置所有字段为非系统字段');
    
    // 标记核心系统字段
    for (const fieldName of coreSystemFields) {
      await sequelize.query(
        `UPDATE deviceFields SET isSystem = 1 WHERE fieldName = '${fieldName}'`,
        { type: sequelize.QueryTypes.RAW }
      );
      console.log(`标记为核心系统字段: ${fieldName}`);
    }
    
    // 确保可选字段为非系统字段
    for (const fieldName of optionalFields) {
      await sequelize.query(
        `UPDATE deviceFields SET isSystem = 0 WHERE fieldName = '${fieldName}'`,
        { type: sequelize.QueryTypes.RAW }
      );
      console.log(`标记为可选字段: ${fieldName}`);
    }
    
    console.log('\n系统字段调整完成！');
    console.log('核心系统字段（不可删除）:', coreSystemFields.join(', '));
    console.log('可选字段（可删除）:', optionalFields.join(', '));
    
    process.exit(0);
  } catch (error) {
    console.error('更新失败:', error);
    process.exit(1);
  }
}

updateSystemFields();
