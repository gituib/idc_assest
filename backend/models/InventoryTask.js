const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const InventoryTask = sequelize.define(
  'InventoryTask',
  {
    taskId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    planId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'room:机房, rack:机柜, device:设备',
    },
    targetId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '目标ID（机房ID/机柜ID/设备ID）',
    },
    targetName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '目标名称',
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
      comment: 'pending:待执行, in_progress:进行中, completed:已完成, skipped:已跳过',
    },
    totalDevices: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '设备总数',
    },
    checkedDevices: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '已盘点设备数',
    },
    normalDevices: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '正常设备数',
    },
    abnormalDevices: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '异常设备数',
    },
    assignedTo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'inventory_tasks',
    timestamps: true,
    indexes: [{ fields: ['planId'] }, { fields: ['status'] }, { fields: ['assignedTo'] }],
  }
);

module.exports = InventoryTask;
