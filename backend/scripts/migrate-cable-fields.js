const { sequelize } = require('../db');
const Cable = require('../models/Cable');

async function migrateCableFields() {
  try {
    console.log('开始迁移 Cable 模型字段...');

    // 检查字段是否已存在
    const [results] = await sequelize.query('PRAGMA table_info(cables)');
    const existingColumns = results.map(row => row.name);

    const newColumns = [
      { name: 'cableLabel', type: 'VARCHAR(255)' },
      { name: 'cableColor', type: 'VARCHAR(50)' },
      { name: 'installedBy', type: 'VARCHAR(100)' },
      { name: 'installedAt', type: 'DATETIME' },
      { name: 'lastTestedAt', type: 'DATETIME' },
    ];

    for (const column of newColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`添加字段: ${column.name}`);
        await sequelize.query(`ALTER TABLE cables ADD COLUMN ${column.name} ${column.type}`);
      } else {
        console.log(`字段已存在: ${column.name}`);
      }
    }

    console.log('迁移完成！');
    console.log('\n新增字段:');
    console.log('  - cableLabel: 线缆标签/编号');
    console.log('  - cableColor: 线缆颜色（便于识别）');
    console.log('  - installedBy: 安装人');
    console.log('  - installedAt: 安装时间');
    console.log('  - lastTestedAt: 上次测试时间');
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

migrateCableFields();
