const { Sequelize } = require('sequelize');

// 获取数据库配置
const DB_TYPE = process.env.DB_TYPE || 'sqlite'; // 数据库类型：sqlite 或 mysql

// 根据数据库类型创建连接
let sequelize;
let dbDialect = 'sqlite'; // 实际使用的数据库类型

if (DB_TYPE === 'mysql') {
  // MySQL 配置
  sequelize = new Sequelize(
    process.env.MYSQL_DATABASE || 'idc_management',
    process.env.MYSQL_USERNAME || 'root',
    process.env.MYSQL_PASSWORD || '',
    {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      // 连接池配置 - 提升并发处理能力
      pool: {
        max: 10,        // 最大连接数
        min: 2,         // 最小连接数
        acquire: 30000, // 获取连接超时时间(ms)
        idle: 10000     // 连接空闲时间(ms)
      }
    }
  );
  dbDialect = 'mysql';
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_PATH || './idc_management.db',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    // SQLite 连接池配置
    pool: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 10000
    }
  });
  dbDialect = 'sqlite';
}

module.exports = { sequelize, DB_TYPE, dbDialect };