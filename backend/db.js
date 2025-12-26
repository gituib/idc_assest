const { Sequelize } = require('sequelize');

// 获取数据库配置
const DB_TYPE = process.env.DB_TYPE || 'sqlite'; // 数据库类型：sqlite 或 mysql

// 根据数据库类型创建连接
let sequelize;

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
      logging: process.env.NODE_ENV === 'development' ? console.log : false
    }
  );
} else {
  // SQLite 配置（默认）
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_PATH || './idc_management.db',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      charset: 'utf8mb4'
    }
  });
}

module.exports = { sequelize, DB_TYPE };