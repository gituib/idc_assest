/**
 * 数据库初始化脚本
 * 用于生产环境首次部署时创建表结构
 */

const { sequelize } = require('../db');
const SystemSetting = require('../models/SystemSetting');

async function initDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 同步所有模型
    await sequelize.sync({ force: false, alter: true });
    console.log('数据库表结构同步完成');
    
    // 初始化默认系统设置
    const { initDefaultSettings } = require('../routes/systemSettings');
    await initDefaultSettings();
    console.log('默认系统设置初始化完成');
    
    console.log('数据库初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

initDatabase();
