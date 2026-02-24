const { sequelize } = require('../db');
const NetworkCard = require('../models/NetworkCard');
const DevicePort = require('../models/DevicePort');
const Device = require('../models/Device');

async function migrate() {
  console.log('========================================');
  console.log('    IDC管理系统 - 数据库迁移脚本 v2.0    ');
  console.log('========================================');
  console.log('');
  
  try {
    console.log('🔍 检测数据库类型...');
    const dbType = sequelize.getDialect();
    console.log(`   数据库类型: ${dbType}`);
    console.log('');
    
    console.log('📋 开始迁移...');
    console.log('   1. 创建 network_cards 表');
    console.log('   2. 为 device_ports 添加 nic_id 字段');
    console.log('   3. 创建相关索引');
    console.log('');
    
    if (dbType === 'sqlite') {
      await migrateSQLite();
    } else if (dbType === 'mysql') {
      await migrateMySQL();
    } else {
      console.log(`⚠️  不支持的数据库类型: ${dbType}`);
      process.exit(1);
    }
    
    console.log('');
    console.log('✅ 迁移完成！');
    console.log('');
    console.log('📊 验证迁移结果...');
    
    const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log(`   数据库表: ${tables.map(t => t.name).join(', ')}`);
    
    const portCount = await DevicePort.count();
    const cardCount = await NetworkCard.count();
    console.log(`   device_ports: ${portCount} 条记录`);
    console.log(`   network_cards: ${cardCount} 条记录`);
    
    console.log('');
    console.log('========================================');
    console.log('        迁移成功完成！🎉');
    console.log('========================================');
    
  } catch (error) {
    console.error('');
    console.error('❌ 迁移失败:', error.message);
    console.error('');
    console.error('错误详情:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

async function migrateSQLite() {
  console.log('');
  console.log('🔄 执行 SQLite 迁移...');
  
  await sequelize.query('PRAGMA foreign_keys = OFF');
  
  try {
    console.log('   → 删除旧的 device_ports 表...');
    await sequelize.query('DROP TABLE IF EXISTS `device_ports`');
    
    console.log('   → 删除旧的 network_cards 表...');
    await sequelize.query('DROP TABLE IF EXISTS `network_cards`');
    
    console.log('   → 同步 DevicePort 模型...');
    await DevicePort.sync({ force: false });
    
    console.log('   → 同步 NetworkCard 模型...');
    await NetworkCard.sync({ force: false });
    
    console.log('   → 同步 Device 模型（确保外键关系）...');
    await Device.sync({ force: false });
    
    console.log('   → 重新同步 DevicePort 模型（含外键）...');
    await DevicePort.sync({ force: true });
    
    console.log('   → 重新同步 NetworkCard 模型...');
    await NetworkCard.sync({ force: false });
    
    await sequelize.query('PRAGMA foreign_keys = ON');
    
  } catch (error) {
    await sequelize.query('PRAGMA foreign_keys = ON');
    throw error;
  }
}

async function migrateMySQL() {
  console.log('');
  console.log('🔄 执行 MySQL 迁移...');
  
  const tableName = 'network_cards';
  console.log(`   → 创建表: ${tableName}`);
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      \`nic_id\` VARCHAR(255) NOT NULL PRIMARY KEY,
      \`device_id\` VARCHAR(255) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`description\` TEXT,
      \`slot_number\` INT,
      \`port_count\` INT DEFAULT 0,
      \`model\` VARCHAR(255),
      \`manufacturer\` VARCHAR(255),
      \`status\` ENUM('normal', 'warning', 'fault', 'offline') DEFAULT 'normal',
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_device_id\` (\`device_id\`),
      INDEX \`idx_slot_number\` (\`slot_number\`),
      UNIQUE INDEX \`idx_device_name\` (\`device_id\`, \`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  await sequelize.query(createTableSQL);
  
  console.log('   → 检查 nic_id 字段是否存在...');
  const [columns] = await sequelize.query(
    "SHOW COLUMNS FROM `device_ports` LIKE 'nic_id'",
    { type: sequelize.QueryTypes.SELECT }
  );
  
  if (columns.length === 0) {
    console.log('   → 添加 nic_id 字段...');
    await sequelize.query(
      'ALTER TABLE `device_ports` ADD COLUMN `nic_id` VARCHAR(255) NULL AFTER `device_id`'
    );
  } else {
    console.log('   → nic_id 字段已存在，跳过');
  }
  
  console.log('   → 创建 nic_id 索引...');
  try {
    await sequelize.query('CREATE INDEX `idx_port_nic_id` ON `device_ports`(`nic_id`)');
  } catch (error) {
    if (error.message.includes('Duplicate key name')) {
      console.log('   → 索引已存在，跳过');
    } else {
      throw error;
    }
  }
  
  console.log('   → 同步模型以确保关系正确...');
  await NetworkCard.sync({ force: false });
  await DevicePort.sync({ force: false });
  
  console.log('   → 添加外键约束...');
  try {
    await sequelize.query(
      'ALTER TABLE `device_ports` ADD CONSTRAINT `fk_port_nic` FOREIGN KEY (`nic_id`) REFERENCES `network_cards`(`nic_id`)'
    );
  } catch (error) {
    if (error.message.includes('Duplicate key name') || error.message.includes('already exists')) {
      console.log('   → 外键约束已存在，跳过');
    } else {
      throw error;
    }
  }
}

migrate();
