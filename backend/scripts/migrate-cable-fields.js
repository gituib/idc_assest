const { sequelize, dbDialect } = require('../db');

async function getTableColumns(tableName) {
  if (dbDialect === 'sqlite') {
    const results = await sequelize.query(`PRAGMA table_info(${tableName})`, {
      type: sequelize.QueryTypes.SELECT,
    });
    return results.map(row => row.name);
  } else {
    const results = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`, {
      type: sequelize.QueryTypes.SELECT,
    });
    return results.map(row => row.Field);
  }
}

async function migrateCableFields() {
  const tableName = 'cables';

  try {
    console.log(`开始迁移 ${tableName} 表新字段...`);

    const existingColumns = await getTableColumns(tableName);

    const newColumns = [
      { name: 'cableLabel', type: 'VARCHAR(255)' },
      { name: 'cableColor', type: 'VARCHAR(50)' },
      { name: 'installedBy', type: 'VARCHAR(100)' },
      { name: 'installedAt', type: 'DATETIME' },
      { name: 'lastTestedAt', type: 'DATETIME' },
    ];

    for (const column of newColumns) {
      if (!existingColumns.includes(column.name)) {
        if (dbDialect === 'sqlite') {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type}`);
        } else {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type}`);
        }
        console.log(`  ✓ 添加字段: ${column.name}`);
      } else {
        console.log(`  → 字段已存在: ${column.name}`);
      }
    }

    console.log(`  ✓ ${tableName} 表字段迁移完成`);
  } catch (error) {
    console.error(`  ✗ 迁移失败: ${error.message}`);
    throw error;
  }
}

if (require.main === module) {
  migrateCableFields()
    .then(() => {
      console.log('迁移完成！');
      process.exit(0);
    })
    .catch(err => {
      console.error('迁移执行失败:', err);
      process.exit(1);
    });
}

module.exports = { migrateCableFields };