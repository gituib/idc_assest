const { Sequelize } = require('sequelize');

// 创建并导出sequelize实例
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './idc_management.db' // SQLite数据库文件路径
});

module.exports = { sequelize };