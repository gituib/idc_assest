const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const OperationLog = sequelize.define('OperationLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '操作人ID'
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '操作人用户名'
  },
  realName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '操作人真实姓名'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '操作类型'
  },
  module: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '操作模块'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '操作描述'
  },
  targetId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '目标对象ID'
  },
  targetName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '目标对象名称'
  },
  oldValue: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '旧值'
  },
  newValue: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '新值'
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '操作IP'
  },
  status: {
    type: DataTypes.ENUM('success', 'failed'),
    defaultValue: 'success',
    comment: '操作状态'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息'
  }
}, {
  tableName: 'operation_logs',
  timestamps: true,
  createdAt: 'operateTime',
  updatedAt: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['action'] },
    { fields: ['module'] },
    { fields: ['createdAt'] },
    { fields: ['userId', 'createdAt'] }
  ]
});

module.exports = OperationLog;
