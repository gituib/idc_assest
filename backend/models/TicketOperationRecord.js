const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const TicketOperationRecord = sequelize.define('TicketOperationRecord', {
  recordId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  ticketId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '关联工单ID'
  },
  operationType: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '操作类型: create/update/status_change/assignment/comment/attachment'
  },
  operationDescription: {
    type: DataTypes.TEXT,
    comment: '操作描述'
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
  operationSteps: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '操作步骤详情'
  },
  spareParts: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '使用的备件列表'
  },
  beforeState: {
    type: DataTypes.JSON,
    comment: '操作前状态'
  },
  afterState: {
    type: DataTypes.JSON,
    comment: '操作后状态'
  },
  duration: {
    type: DataTypes.INTEGER,
    comment: '操作耗时(分钟)'
  },
  result: {
    type: DataTypes.STRING,
    comment: '操作结果: success/failed/partial'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: '备注信息'
  },
  attachments: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '附件'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: '扩展字段'
  }
}, {
  tableName: 'ticket_operation_records',
  timestamps: true,
  indexes: [
    { fields: ['ticketId'] },
    { fields: ['operatorId'] },
    { fields: ['operationType'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = TicketOperationRecord;
