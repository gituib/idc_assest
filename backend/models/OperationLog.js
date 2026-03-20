const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const generateRecordId = () => {
  return `OPLOG_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
};

const OperationLog = sequelize.define('OperationLog', {
  recordId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  module: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '模块：device/user/role/consumable/rack/room'
  },
  operationType: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '操作类型: create/update/delete/batch_delete/batch_update/status_change/move/permission_change'
  },
  operationDescription: {
    type: DataTypes.TEXT,
    comment: '操作描述'
  },
  targetId: {
    type: DataTypes.STRING,
    comment: '目标对象ID'
  },
  targetName: {
    type: DataTypes.STRING,
    comment: '目标对象名称（冗余便于展示）'
  },
  operatorId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '操作人ID'
  },
  operatorName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '操作人姓名'
  },
  operatorRole: {
    type: DataTypes.STRING,
    comment: '操作人角色'
  },
  beforeState: {
    type: DataTypes.JSON,
    comment: '操作前状态'
  },
  afterState: {
    type: DataTypes.JSON,
    comment: '操作后状态'
  },
  result: {
    type: DataTypes.STRING,
    defaultValue: 'success',
    comment: '操作结果: success/failed'
  },
  ipAddress: {
    type: DataTypes.STRING,
    comment: 'IP地址'
  },
  userAgent: {
    type: DataTypes.STRING,
    comment: '用户代理'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: '扩展字段'
  }
}, {
  tableName: 'operation_logs',
  timestamps: true,
  indexes: [
    { fields: ['module'] },
    { fields: ['operationType'] },
    { fields: ['targetId'] },
    { fields: ['operatorId'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = OperationLog;
