const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'idc_management.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('无法连接到数据库:', err);
    process.exit(1);
  }
  console.log('已连接到数据库:', dbPath);
});

const columnsToAdd = [
  { table: 'pending_devices', column: 'height', type: 'INTEGER', defaultValue: 1 },
  { table: 'pending_devices', column: 'powerConsumption', type: 'FLOAT', defaultValue: 0 },
  { table: 'pending_devices', column: 'brand', type: 'VARCHAR(255)', defaultValue: null },
  { table: 'pending_devices', column: 'purchaseDate', type: 'DATE', defaultValue: null },
  { table: 'pending_devices', column: 'warrantyExpiry', type: 'DATE', defaultValue: null },
];

db.serialize(() => {
  columnsToAdd.forEach(({ table, column, type, defaultValue }) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
      if (err) {
        console.error(`获取表 ${table} 信息失败:`, err);
        return;
      }
      
      const columnExists = rows && rows.some(row => row.name === column);
      
      if (!columnExists) {
        const defaultClause = defaultValue !== null ? ` DEFAULT ${typeof defaultValue === 'string' ? `'${defaultValue}'` : defaultValue}` : '';
        const sql = `ALTER TABLE ${table} ADD COLUMN ${column} ${type}${defaultClause}`;
        
        db.run(sql, (err) => {
          if (err) {
            console.error(`添加列 ${table}.${column} 失败:`, err.message);
          } else {
            console.log(`成功添加列 ${table}.${column}`);
          }
        });
      } else {
        console.log(`列 ${table}.${column} 已存在，跳过`);
      }
    });
  });
});

setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('关闭数据库失败:', err);
    } else {
      console.log('数据库迁移完成，连接已关闭');
    }
  });
}, 2000);
