const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const InventoryRecord = sequelize.define(
  'InventoryRecord',
  {
    recordId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    taskId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    planId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    deviceName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deviceType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    serialNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '系统记录的序列号',
    },
    actualSerialNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '实际盘点序列号',
    },
    rackId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '系统记录的机柜',
    },
    actualRackId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '实际盘点机柜',
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '系统记录的位置',
    },
    actualPosition: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '实际盘点位置',
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
      comment: 'pending:待盘点, normal:正常, abnormal:异常, missed:未盘点, not_found:未找到',
    },
    abnormalType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment:
        'serial_mismatch:序列号不符, position_mismatch:位置不符, device_missing:设备缺失, extra_device:多出设备',
    },
    checkedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    checkedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '盘点照片',
    },
  },
  {
    tableName: 'inventory_records',
    timestamps: true,
    indexes: [
      { fields: ['taskId'] },
      { fields: ['planId'] },
      { fields: ['deviceId'] },
      { fields: ['status'] },
      { fields: ['checkedBy'] },
    ],
  }
);

module.exports = InventoryRecord;
