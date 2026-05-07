/**
 * 操作日志表添加 requestId 字段和索引
 * 支持请求追踪ID关联，优化查询性能
 * 支持 SQLite 和 MySQL，幂等执行
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { sequelize, dbDialect } = require('../db');

async function getTableColumns(tableName) {
  const dialect = sequelize.getDialect();
  if (dialect === 'sqlite') {
    const tableInfo = await sequelize.query(`PRAGMA table_info(${tableName})`, {
      type: sequelize.QueryTypes.SELECT,
    });
    return tableInfo.map(col => col.name);
  }
  const tableInfo = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`, {
    type: sequelize.QueryTypes.SELECT,
  });
  return tableInfo.map(col => col.Field);
}

async function tableExists(tableName) {
  const dialect = sequelize.getDialect();
  if (dialect === 'sqlite') {
    const tables = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      { replacements: [tableName], type: sequelize.QueryTypes.SELECT }
    );
    return tables.length > 0;
  }
  const tables = await sequelize.query('SHOW TABLES LIKE ?', {
    replacements: [tableName],
    type: sequelize.QueryTypes.SELECT,
  });
  return tables.length > 0;
}

async function addColumnIfNotExists(tableName, columnName, columnDef) {
  const columns = await getTableColumns(tableName);
  if (!columns.includes(columnName)) {
    await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
    console.log(`    ${tableName} 表添加 ${columnName} 字段成功`);
  } else {
    console.log(`    ${tableName} 表 ${columnName} 字段已存在，跳过`);
  }
}

async function addIndexIfNotExists(tableName, indexName, fields) {
  const dialect = sequelize.getDialect();
  try {
    if (dialect === 'sqlite') {
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${fields.join(', ')})`
      );
    } else {
      const [indexes] = await sequelize.query(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_NAME = ? AND INDEX_NAME = ? AND TABLE_SCHEMA = DATABASE()`,
        { replacements: [tableName, indexName], type: sequelize.QueryTypes.SELECT }
      );
      if (!indexes || indexes.length === 0) {
        await sequelize.query(
          `CREATE INDEX \`${indexName}\` ON \`${tableName}\`(\`${fields.join('`, `')}\`)`
        );
      } else {
        console.log(`    索引 ${indexName} 已存在，跳过`);
        return;
      }
    }
    console.log(`    索引 ${indexName} 创建成功`);
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('Duplicate key name')) {
      console.log(`    索引 ${indexName} 已存在，跳过`);
    } else {
      throw error;
    }
  }
}

async function migrateOperationLogRequestId() {
  const tableName = 'operation_logs';

  if (!(await tableExists(tableName))) {
    console.log(`    ${tableName} 表不存在，跳过`);
    return;
  }

  await addColumnIfNotExists(tableName, 'requestId', 'VARCHAR(255)');

  await addIndexIfNotExists(tableName, 'operation_logs_requestId', ['requestId']);
  await addIndexIfNotExists(tableName, 'operation_logs_module_createdAt', ['module', 'createdAt']);

  console.log('    操作日志requestId字段和索引迁移完成');
}

async function run() {
  console.log('========================================');
  console.log('  操作日志表添加requestId字段迁移脚本  ');
  console.log('========================================');
  console.log(`数据库类型: ${dbDialect}`);

  try {
    await migrateOperationLogRequestId();
    console.log('\n迁移完成');
  } catch (error) {
    console.error('迁移失败:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
