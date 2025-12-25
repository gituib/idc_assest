const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const User = require('./User');
const Device = require('./Device');

const Ticket = sequelize.define('Ticket', {
  ticketId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '工单标题'
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '关联设备ID'
  },
  deviceName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '设备名称'
  },
  deviceModel: {
    type: DataTypes.STRING,
    comment: '设备型号'
  },
  serialNumber: {
    type: DataTypes.STRING,
    comment: '设备序列号'
  },
  faultCategory: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '故障分类'
  },
  faultSubCategory: {
    type: DataTypes.STRING,
    comment: '故障子分类'
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'medium',
    comment: '优先级: critical/high/medium/low'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    comment: '工单状态: pending/in_progress/completed/closed/cancelled'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '故障描述'
  },
  expectedCompletionDate: {
    type: DataTypes.DATE,
    comment: '期望完成时间'
  },
  reporterId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '报修人ID'
  },
  reporterName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '报修人姓名'
  },
  location: {
    type: DataTypes.STRING,
    comment: '设备位置'
  },
  resolution: {
    type: DataTypes.TEXT,
    comment: '解决方案'
  },
  completionDate: {
    type: DataTypes.DATE,
    comment: '实际完成时间'
  },
  evaluation: {
    type: DataTypes.TEXT,
    comment: '用户评价'
  },
  evaluationRating: {
    type: DataTypes.INTEGER,
    comment: '评价星级(1-5)'
  },
  attachments: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '附件列表'
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '标签'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: '扩展字段'
  }
}, {
  tableName: 'tickets',
  timestamps: true,
  indexes: [
    { fields: ['deviceId'] },
    { fields: ['status'] },
    { fields: ['faultCategory'] },
    { fields: ['priority'] },
    { fields: ['reporterId'] },
    { fields: ['createdAt'] }
  ]
});

Ticket.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter', constraints: false });
Ticket.belongsTo(Device, { foreignKey: 'deviceId', constraints: false });

module.exports = Ticket;
