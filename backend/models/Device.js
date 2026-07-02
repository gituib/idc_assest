const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const { generateId } = require('../utils/idGenerator');
const Rack = require('./Rack');
const Warehouse = require('./Warehouse');

const Device = sequelize.define(
  'Device',
  {
    deviceId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: true,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    serialNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    rackId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    powerConsumption: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'offline',
    },
    isIdle: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    idleDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    idleReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    warehouseId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sourceType: {
      type: DataTypes.ENUM('rack', 'warehouse'),
      defaultValue: 'rack',
    },
    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    warrantyExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    customFields: {
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: true,
    },
  },
  {
    tableName: 'devices',
    timestamps: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['type'] },
      { fields: ['rackId'] },
      { fields: ['createdAt'] },
      { fields: ['status', 'type'] },
      { fields: ['name'] },
      // 优化位置冲突检测的复合索引
      { fields: ['rackId', 'position'] },
      { fields: ['rackId', 'position', 'isIdle'] },
    ],
    hooks: {
      beforeCreate: (device) => {
        if (!device.deviceId) {
          device.deviceId = generateId({ prefix: 'DEV' });
        }
      },
    },
  }
);

Device.belongsTo(Rack, { foreignKey: 'rackId', onDelete: 'SET NULL' });
// warehouseId 业务上为自由输入文本（无库房管理功能），关闭数据库外键约束
// 保留模型关联以便未来通过 include 查询，但不创建实际 FK 约束
Device.belongsTo(Warehouse, {
  foreignKey: 'warehouseId',
  onDelete: 'SET NULL',
  constraints: false,
});

module.exports = Device;
