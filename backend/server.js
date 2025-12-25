require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { sequelize } = require('./db');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 8000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } }));
app.use('/temp', express.static('temp'));

// 数据库连接已从db.js导入

// 测试数据库连接并同步表结构
sequelize.authenticate()
  .then(() => {
    console.log('数据库连接成功');
    // 自动同步表结构，不再强制删除表
    return sequelize.sync({
      force: false, // 改为false，避免每次启动都删除表结构
      alter: false  // SQLite不支持复杂的表结构修改
    });
  })
  .then(() => {
    console.log('数据库表结构同步完成');
    // 同步完成后初始化设备字段
    return require('./initDeviceFields')();
  })
  .then(() => {
    // 初始化工单模型关联
    return require('./models/ticketIndex').initializeModels();
  })
  .catch(err => console.error('数据库操作失败:', err));

// 导入路由
const deviceRoutes = require('./routes/devices');
const rackRoutes = require('./routes/racks');
const roomRoutes = require('./routes/rooms');
const deviceFieldRoutes = require('./routes/deviceFields');
const backgroundRoutes = require('./routes/background');
const consumableRoutes = require('./routes/consumables');
const consumableRecordRoutes = require('./routes/consumableRecords');
const consumableCategoryRoutes = require('./routes/consumableCategories');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const rolesRoutes = require('./routes/roles');
const loginHistoryRoutes = require('./routes/loginHistory');
const operationLogsRoutes = require('./routes/operationLogs');
const ticketRoutes = require('./routes/tickets');
const ticketCategoryRoutes = require('./routes/ticketCategories');

// 使用路由
app.use('/api/devices', deviceRoutes);
app.use('/api/racks', rackRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/deviceFields', deviceFieldRoutes);
app.use('/api/background', backgroundRoutes);
app.use('/api/consumables', consumableRoutes);
app.use('/api/consumable-records', consumableRecordRoutes);
app.use('/api/consumable-categories', consumableCategoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/login-history', loginHistoryRoutes);
app.use('/api/operation-logs', operationLogsRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/ticket-categories', ticketCategoryRoutes);

// 静态文件服务
app.use('/uploads', express.static('uploads'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'IDC设备管理系统后端服务正常运行' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});