/**
 * 移除 consumable_logs 表的外键约束
 * 解决删除耗材时日志被级联删除的问题
 */

const { sequelize, DB_TYPE } = require('../db');

async function removeForeignKey() {
  try {
    console.log('开始移除 consumable_logs 表的外键约束...');
    console.log(`数据库类型: ${DB_TYPE}`);

    if (DB_TYPE === 'mysql') {
      await removeMySQLForeignKey();
    } else {
      await removeSQLiteForeignKey();
    }

    console.log('\n外键约束移除完成！');
    process.exit(0);
  } catch (error) {
    console.error('移除外键约束失败:', error);
    process.exit(1);
  }
}

async function removeMySQLForeignKey() {
  console.log('\n执行 MySQL 外键移除...');

  // 获取外键名称
  const [fks] = await sequelize.query(`
    SELECT CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_NAME = 'consumable_logs' 
    AND TABLE_SCHEMA = DATABASE()
    AND REFERENCED_TABLE_NAME IS NOT NULL
  `);

  console.log('发现外键约束:', fks);

  for (const fk of fks) {
    try {
      await sequelize.query(`
        ALTER TABLE consumable_logs DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}
      `);
      console.log(`✓ 移除外键约束: ${fk.CONSTRAINT_NAME}`);
    } catch (err) {
      console.log(`! 移除外键约束失败: ${fk.CONSTRAINT_NAME}`, err.message);
    }
  }
}

async function removeSQLiteForeignKey() {
  console.log('\n执行 SQLite 外键移除...');
  console.log('SQLite 不支持直接删除外键，需要重建表');

  // 检查外键是否存在
  const fks = await sequelize.query(`PRAGMA foreign_key_list(consumable_logs);`, {
    type: sequelize.QueryTypes.SELECT,
  });

  if (!fks || fks.length === 0) {
    console.log('✓ 没有外键约束需要移除');
    return;
  }

  console.log('发现外键约束:', fks);

  // SQLite 不支持 ALTER TABLE DROP FOREIGN KEY，需要重建表
  await sequelize.transaction(async transaction => {
    // 获取表结构
    const columns = await sequelize.query(`PRAGMA table_info(consumable_logs);`, {
      type: sequelize.QueryTypes.SELECT,
      transaction,
    });

    console.log(
      '\n当前表列:',
      columns.map(c => c.name)
    );

    // 创建新表（不包含外键约束）
    await sequelize.query(
      `
      CREATE TABLE consumable_logs_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consumableId VARCHAR(255) NOT NULL,
        consumableName VARCHAR(255) NOT NULL,
        operationType TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        previousStock INTEGER NOT NULL,
        currentStock INTEGER NOT NULL,
        operator VARCHAR(255),
        reason VARCHAR(255),
        notes TEXT,
        relatedId VARCHAR(255),
        isEditable TINYINT(1) DEFAULT 1,
        originalLogId INTEGER,
        modifiedBy VARCHAR(255),
        modifiedAt DATETIME,
        modificationReason VARCHAR(255),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        isConsumableDeleted BOOLEAN DEFAULT 0,
        consumableSnapshot TEXT
      )
    `,
      { transaction }
    );

    console.log('✓ 创建新表成功');

    // 复制数据
    await sequelize.query(
      `
      INSERT INTO consumable_logs_new 
      SELECT * FROM consumable_logs
    `,
      { transaction }
    );

    const countResult = await sequelize.query(`SELECT COUNT(*) as count FROM consumable_logs_new`, {
      type: sequelize.QueryTypes.SELECT,
      transaction,
    });
    console.log(`✓ 复制了 ${countResult[0].count} 条数据`);

    // 删除旧表
    await sequelize.query(`DROP TABLE consumable_logs`, { transaction });
    console.log('✓ 删除旧表成功');

    // 重命名新表
    await sequelize.query(`ALTER TABLE consumable_logs_new RENAME TO consumable_logs`, {
      transaction,
    });
    console.log('✓ 重命名新表成功');

    // 创建索引
    const indexes = [
      { name: 'consumable_logs_consumable_id', fields: ['consumableId'] },
      { name: 'consumable_logs_operation_type', fields: ['operationType'] },
      { name: 'consumable_logs_created_at', fields: ['createdAt'] },
      { name: 'consumable_logs_consumable_id_created_at', fields: ['consumableId', 'createdAt'] },
      { name: 'consumable_logs_original_log_id', fields: ['originalLogId'] },
      { name: 'consumable_logs_is_editable', fields: ['isEditable'] },
      { name: 'idx_consumable_logs_is_deleted', fields: ['isConsumableDeleted'] },
    ];

    for (const idx of indexes) {
      try {
        await sequelize.query(
          `CREATE INDEX IF NOT EXISTS ${idx.name} ON consumable_logs(${idx.fields.join(', ')})`,
          { transaction }
        );
        console.log(`✓ 创建索引: ${idx.name}`);
      } catch (err) {
        console.log(`! 创建索引失败: ${idx.name}`, err.message);
      }
    }
  });

  console.log('\n✓ 表重建完成，外键约束已移除');
}

removeForeignKey();
