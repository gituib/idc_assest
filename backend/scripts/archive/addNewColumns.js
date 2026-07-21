const { sequelize } = require('./db');

async function addNewColumns() {
  try {
    console.log('开始添加新列...');

    await sequelize.query(`
      ALTER TABLE devices ADD COLUMN isIdle INTEGER DEFAULT 0;
    `);
    console.log('已添加 isIdle 列');

    await sequelize.query(`
      ALTER TABLE devices ADD COLUMN idleDate DATETIME;
    `);
    console.log('已添加 idleDate 列');

    await sequelize.query(`
      ALTER TABLE devices ADD COLUMN idleReason TEXT;
    `);
    console.log('已添加 idleReason 列');

    await sequelize.query(`
      ALTER TABLE devices ADD COLUMN warehouseId TEXT;
    `);
    console.log('已添加 warehouseId 列');

    await sequelize.query(`
      ALTER TABLE devices ADD COLUMN sourceType TEXT DEFAULT 'rack';
    `);
    console.log('已添加 sourceType 列');

    console.log('所有新列添加完成！');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('duplicate column')) {
      console.log('列已存在，跳过');
      process.exit(0);
    }
    console.error('添加列失败:', error.message);
    process.exit(1);
  }
}

addNewColumns();
