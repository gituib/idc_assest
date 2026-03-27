const { sequelize } = require('../db');
const { QueryTypes } = require('sequelize');

async function ensureSchema() {
  try {
    const dbType = sequelize.getDialect();
    console.log(`Checking schema for ${dbType}...`);

    if (dbType === 'sqlite') {
      // Check if nicId column exists in device_ports
      const [columns] = await sequelize.query('PRAGMA table_info(device_ports)');
      const hasNicId = columns.some(col => col.name === 'nicId');

      if (!hasNicId) {
        console.log('Adding nicId column to device_ports...');
        await sequelize.query(
          'ALTER TABLE device_ports ADD COLUMN nicId VARCHAR(255) NULL REFERENCES network_cards(nicId)'
        );
        console.log('Added nicId column.');
      } else {
        console.log('nicId column already exists in device_ports.');
      }
    } else if (dbType === 'mysql') {
      const [columns] = await sequelize.query("SHOW COLUMNS FROM `device_ports` LIKE 'nicId'", {
        type: QueryTypes.SELECT,
      });

      if (columns.length === 0) {
        console.log('Adding nicId column to device_ports...');
        await sequelize.query(
          'ALTER TABLE `device_ports` ADD COLUMN `nicId` VARCHAR(255) NULL AFTER `deviceId`'
        );
        console.log('Added nicId column.');
      } else {
        console.log('nicId column already exists.');
      }
    }

    console.log('Schema check complete.');
  } catch (error) {
    console.error('Schema check failed:', error);
  } finally {
    await sequelize.close();
  }
}

ensureSchema();
