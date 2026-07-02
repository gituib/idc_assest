/**
 * 清理 devices 表上针对 warehouseId 的外键约束
 *
 * 背景：
 * 业务上 warehouseId 设计为自由输入文本字段（项目无库房管理功能），
 * 但早期 Device.belongsTo(Warehouse) 通过 Sequelize sync 在 MySQL 上自动创建了
 * 外键约束 devices_ibfk_8（引用 warehouses.warehouseId），
 * 导致用户在前端输入任意库房位置时触发外键违反错误：
 *   Cannot add or update a child row: a foreign key constraint fails
 *
 * 本脚本：
 * 1. 查询 devices 表上所有引用 warehouses 表的外键约束名
 * 2. 逐一 DROP FOREIGN KEY
 * 3. 幂等执行：无外键时安全跳过
 *
 * 配合模型层修改（constraints: false）使用，
 * 确保 sync({alter:true}) 不会重新创建该外键。
 *
 * 使用方法：
 *   node backend/scripts/drop-device-warehouse-fk.js
 */

require('dotenv').config();
const { sequelize, dbDialect } = require('../db');

/**
 * 脚本主入口
 */
async function main() {
  console.log('开始清理 devices.warehouseId 外键约束...');
  console.log(`数据库类型: ${dbDialect}`);

  if (dbDialect !== 'mysql' && dbDialect !== 'mariadb') {
    console.log('SQLite/其他数据库：Sequelize sync 在 constraints:false 下不会创建外键，无需清理');
    process.exit(0);
  }

  try {
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
      console.log('未发现 devices.warehouseId 上的外键约束，无需清理');
      process.exit(0);
    }

    console.log(`发现 ${constraints.length} 个外键约束待清理：`);
    constraints.forEach(c => {
      console.log(`  - ${c.CONSTRAINT_NAME} (列: ${c.COLUMN_NAME})`);
    });

    // 逐一删除外键
    for (const c of constraints) {
      console.log(`正在删除外键: ${c.CONSTRAINT_NAME}`);
      await sequelize.query(`ALTER TABLE devices DROP FOREIGN KEY ${c.CONSTRAINT_NAME}`);
      console.log(`  已删除: ${c.CONSTRAINT_NAME}`);
    }

    console.log('\n清理完成！');
    console.log('注意：配合 Device.belongsTo(Warehouse, { constraints: false }) 使用，');
    console.log('否则下次 sync({alter:true}) 会重新创建外键。');
    process.exit(0);
  } catch (error) {
    console.error('清理失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
