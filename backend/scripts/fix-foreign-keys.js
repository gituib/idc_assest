/**
 * 数据库外键约束修复迁移脚本
 * 
 * 功能：
 * 1. 清理现有孤儿数据
 * 2. 添加外键约束和 onDelete 策略
 * 3. 确保脚本幂等执行
 * 
 * 使用方法：
 * node backend/scripts/fix-foreign-keys.js
 */

const { sequelize } = require('../db');

/**
 * 主迁移函数
 */
async function migrate() {
  console.log('开始执行外键约束修复迁移...');

  try {
    // 第一步：清理孤儿数据
    await cleanOrphanData();

    // 第二步：添加外键约束
    await addForeignKeyConstraints();

    console.log('外键约束修复迁移完成！');
  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  }
}

/**
 * 清理孤儿数据
 */
async function cleanOrphanData() {
  console.log('正在清理孤儿数据...');

  const transaction = await sequelize.transaction();

  try {
    // 清理 Device 表中无效的 rackId
    const [orphanDevicesWithRack] = await sequelize.query(
      `SELECT COUNT(*) as count FROM devices d 
       LEFT JOIN racks r ON d.rackId = r.rackId 
       WHERE d.rackId IS NOT NULL AND r.rackId IS NULL`,
      { transaction }
    );

    console.log(`发现 ${orphanDevicesWithRack[0].count} 条无效 rackId 的设备记录`);

    await sequelize.query(
      `UPDATE devices SET rackId = NULL 
       WHERE rackId IS NOT NULL 
       AND rackId NOT IN (SELECT rackId FROM racks WHERE rackId IS NOT NULL)`,
      { transaction }
    );

    // 清理 Device 表中无效的 warehouseId
    const [orphanDevicesWithWarehouse] = await sequelize.query(
      `SELECT COUNT(*) as count FROM devices d 
       LEFT JOIN warehouses w ON d.warehouseId = w.warehouseId 
       WHERE d.warehouseId IS NOT NULL AND w.warehouseId IS NULL`,
      { transaction }
    );

    console.log(`发现 ${orphanDevicesWithWarehouse[0].count} 条无效 warehouseId 的设备记录`);

    await sequelize.query(
      `UPDATE devices SET warehouseId = NULL 
       WHERE warehouseId IS NOT NULL 
       AND warehouseId NOT IN (SELECT warehouseId FROM warehouses WHERE warehouseId IS NOT NULL)`,
      { transaction }
    );

    // 清理 Rack 表中无效的 roomId
    const [orphanRacks] = await sequelize.query(
      `SELECT COUNT(*) as count FROM racks r 
       LEFT JOIN rooms rm ON r.roomId = rm.roomId 
       WHERE r.roomId IS NOT NULL AND rm.roomId IS NULL`,
      { transaction }
    );

    console.log(`发现 ${orphanRacks[0].count} 条无效 roomId 的机柜记录，准备删除`);

    await sequelize.query(
      `DELETE FROM racks 
       WHERE roomId IS NOT NULL 
       AND roomId NOT IN (SELECT roomId FROM rooms WHERE roomId IS NOT NULL)`,
      { transaction }
    );

    // 清理 Ticket 表中无效的 deviceId
    const [orphanTicketsWithDevice] = await sequelize.query(
      `SELECT COUNT(*) as count FROM tickets t 
       LEFT JOIN devices d ON t.deviceId = d.deviceId 
       WHERE t.deviceId IS NOT NULL AND d.deviceId IS NULL`,
      { transaction }
    );

    console.log(`发现 ${orphanTicketsWithDevice[0].count} 条无效 deviceId 的工单记录`);

    await sequelize.query(
      `UPDATE tickets SET deviceId = NULL 
       WHERE deviceId IS NOT NULL 
       AND deviceId NOT IN (SELECT deviceId FROM devices WHERE deviceId IS NOT NULL)`,
      { transaction }
    );

    // 清理 Ticket 表中无效的 reporterId (NOT NULL 约束，必须删除)
    const [orphanTicketsWithReporter] = await sequelize.query(
      `SELECT COUNT(*) as count FROM tickets t 
       LEFT JOIN users u ON t.reporterId = u.userId 
       WHERE t.reporterId IS NOT NULL AND u.userId IS NULL`,
      { transaction }
    );

    console.log(`发现 ${orphanTicketsWithReporter[0].count} 条无效 reporterId 的工单记录，准备删除`);

    await sequelize.query(
      `DELETE FROM tickets 
       WHERE reporterId IS NOT NULL 
       AND reporterId NOT IN (SELECT userId FROM users WHERE userId IS NOT NULL)`,
      { transaction }
    );

    // 清理 Ticket 表中无效的 assigneeId (允许 NULL，可以置空)
    const [orphanTicketsWithAssignee] = await sequelize.query(
      `SELECT COUNT(*) as count FROM tickets t 
       LEFT JOIN users u ON t.assigneeId = u.userId 
       WHERE t.assigneeId IS NOT NULL AND u.userId IS NULL`,
      { transaction }
    );

    console.log(`发现 ${orphanTicketsWithAssignee[0].count} 条无效 assigneeId 的工单记录`);

    await sequelize.query(
      `UPDATE tickets SET assigneeId = NULL 
       WHERE assigneeId IS NOT NULL 
       AND assigneeId NOT IN (SELECT userId FROM users WHERE userId IS NOT NULL)`,
      { transaction }
    );

    await transaction.commit();
    console.log('孤儿数据清理完成！');
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * 添加外键约束
 */
async function addForeignKeyConstraints() {
  console.log('正在添加外键约束...');

  const queryInterface = sequelize.getQueryInterface();
  const dialect = sequelize.options.dialect;

  try {
    if (dialect === 'mysql' || dialect === 'mariadb') {
      await addMySQLConstraints(queryInterface);
    } else if (dialect === 'sqlite') {
      await addSQLiteConstraints(queryInterface);
    } else {
      console.warn(`数据库类型 ${dialect} 的外键约束需要手动配置`);
    }

    console.log('外键约束添加完成！');
  } catch (error) {
    console.error('添加外键约束失败:', error);
    throw error;
  }
}

/**
 * 为 MySQL 添加外键约束
 */
async function addMySQLConstraints(queryInterface) {
  // 获取当前外键约束
  const [foreignKeys] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, DELETE_RULE
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
     AND (TABLE_NAME = 'devices' OR TABLE_NAME = 'racks' OR TABLE_NAME = 'tickets')
     AND REFERENCED_TABLE_NAME IS NOT NULL`
  );

  console.log(`当前存在 ${foreignKeys.length} 个外键约束`);

  // 删除现有的外键约束（如果存在）
  for (const fk of foreignKeys) {
    console.log(`删除现有外键: ${fk.CONSTRAINT_NAME}`);
    await queryInterface.sequelize.query(
      `ALTER TABLE ${fk.TABLE_NAME} DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`
    );
  }

  // 添加新的外键约束
  await queryInterface.sequelize.query(`
    ALTER TABLE devices 
    ADD CONSTRAINT fk_device_rack 
    FOREIGN KEY (rackId) REFERENCES racks(rackId) 
    ON DELETE SET NULL
  `);
  console.log('添加外键: Device.rackId → Rack.rackId (ON DELETE SET NULL)');

  await queryInterface.sequelize.query(`
    ALTER TABLE devices 
    ADD CONSTRAINT fk_device_warehouse 
    FOREIGN KEY (warehouseId) REFERENCES warehouses(warehouseId) 
    ON DELETE SET NULL
  `);
  console.log('添加外键: Device.warehouseId → Warehouse.warehouseId (ON DELETE SET NULL)');

  await queryInterface.sequelize.query(`
    ALTER TABLE racks 
    ADD CONSTRAINT fk_rack_room 
    FOREIGN KEY (roomId) REFERENCES rooms(roomId) 
    ON DELETE CASCADE
  `);
  console.log('添加外键: Rack.roomId → Room.roomId (ON DELETE CASCADE)');

  await queryInterface.sequelize.query(`
    ALTER TABLE tickets 
    ADD CONSTRAINT fk_ticket_device 
    FOREIGN KEY (deviceId) REFERENCES devices(deviceId) 
    ON DELETE SET NULL
  `);
  console.log('添加外键: Ticket.deviceId → Device.deviceId (ON DELETE SET NULL)');

  await queryInterface.sequelize.query(`
    ALTER TABLE tickets 
    ADD CONSTRAINT fk_ticket_reporter 
    FOREIGN KEY (reporterId) REFERENCES users(userId) 
    ON DELETE SET NULL
  `);
  console.log('添加外键: Ticket.reporterId → User.userId (ON DELETE SET NULL)');

  await queryInterface.sequelize.query(`
    ALTER TABLE tickets 
    ADD CONSTRAINT fk_ticket_assignee 
    FOREIGN KEY (assigneeId) REFERENCES users(userId) 
    ON DELETE SET NULL
  `);
  console.log('添加外键: Ticket.assigneeId → User.userId (ON DELETE SET NULL)');
}

/**
 * 为 SQLite 添加外键约束
 * 注意：SQLite 不支持直接 ALTER TABLE 添加外键，需要重建表
 */
async function addSQLiteConstraints(queryInterface) {
  console.log('SQLite 数据库：外键约束通过 Sequelize 同步自动创建');
  console.log('注意：SQLite 默认不启用外键检查，需在连接配置中启用');

  // SQLite 不需要手动添加外键，Sequelize 的 sync 会自动处理
  // 但需要确保在连接时启用外键支持
  await queryInterface.sequelize.query('PRAGMA foreign_keys = ON');
  console.log('已启用 SQLite 外键检查');
}

// 执行迁移
migrate()
  .then(() => {
    console.log('迁移成功完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移失败:', error);
    process.exit(1);
  });
