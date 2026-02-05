const { sequelize } = require('./db');

async function fixMaxStock() {
  try {
    console.log('开始修复 maxStock 字段...');

    // 检查当前表结构
    const [results] = await sequelize.query(
      "PRAGMA table_info(consumables);"
    );

    console.log('当前表结构:');
    results.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'} default=${col.dflt_value}`);
    });

    const maxStockCol = results.find(c => c.name === 'maxStock');
    if (maxStockCol) {
      console.log('\n当前 maxStock 字段:', maxStockCol);

      // SQLite 不支持直接修改列，需要创建新表
      console.log('\n需要重建表结构...');

      // 1. 创建新表
      await sequelize.query(`
        CREATE TABLE consumables_new (
          consumableId VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(255) NOT NULL,
          unit VARCHAR(255) NOT NULL DEFAULT '个',
          currentStock INTEGER NOT NULL DEFAULT 0,
          minStock INTEGER NOT NULL DEFAULT 10,
          maxStock INTEGER NOT NULL DEFAULT 0,
          unitPrice DECIMAL(10,2) NOT NULL DEFAULT 0,
          supplier VARCHAR(255),
          location VARCHAR(255),
          description TEXT,
          status VARCHAR(255) DEFAULT 'active',
          version INTEGER NOT NULL DEFAULT 0,
          createdAt DATETIME,
          updatedAt DATETIME
        )
      `);

      // 2. 复制数据（将 null 转换为 0）
      await sequelize.query(`
        INSERT INTO consumables_new
        SELECT
          consumableId,
          name,
          category,
          unit,
          currentStock,
          minStock,
          COALESCE(maxStock, 0) as maxStock,
          unitPrice,
          supplier,
          location,
          description,
          status,
          version,
          createdAt,
          updatedAt
        FROM consumables
      `);

      // 3. 删除旧表
      await sequelize.query('DROP TABLE consumables');

      // 4. 重命名新表
      await sequelize.query('ALTER TABLE consumables_new RENAME TO consumables');

      // 5. 创建索引
      await sequelize.query('CREATE INDEX consumables_category ON consumables(category)');
      await sequelize.query('CREATE INDEX consumables_status ON consumables(status)');
      await sequelize.query('CREATE INDEX consumables_category_status ON consumables(category, status)');
      await sequelize.query('CREATE INDEX consumables_updatedAt ON consumables(updatedAt)');

      console.log('\n表结构修复完成！');

      // 验证新表结构
      const [newResults] = await sequelize.query(
        "PRAGMA table_info(consumables);"
      );
      console.log('\n新表结构:');
      newResults.forEach(col => {
        console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'} default=${col.dflt_value}`);
      });
    }

    console.log('\n修复完成！');
    process.exit(0);
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

fixMaxStock();
