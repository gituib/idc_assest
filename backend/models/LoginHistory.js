const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const LoginHistory = sequelize.define('LoginHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '用户ID'
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '用户名'
  },
  realName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '真实姓名'
  },
  loginTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '登录时间'
  },
  loginIp: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '登录IP'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '浏览器UA'
  },
  loginType: {
    type: DataTypes.ENUM('success', 'failed'),
    defaultValue: 'success',
    comment: '登录结果'
  },
  failReason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '失败原因'
  }
}, {
  tableName: 'login_histories',
  timestamps: true,
  createdAt: 'loginTime',
  updatedAt: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['loginTime'] },
    { fields: ['loginType'] },
    { fields: ['userId', 'loginTime'] }
  ]
});

module.exports = LoginHistory;
