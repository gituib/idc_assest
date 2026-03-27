const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const User = require('./User');
const InventoryPlan = require('./InventoryPlan');
const InventoryTask = require('./InventoryTask');
const Room = require('./Room');
const Rack = require('./Rack');

const PendingDevice = sequelize.define(
  'PendingDevice',
  {
    pendingId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    serialNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '设备序列号',
    },
    deviceName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '设备名称',
    },
    deviceType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'other',
      comment: '设备类型: server, switch, router, storage, other',
    },
    roomId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: Room,
        key: 'roomId',
      },
      comment: '所属机房ID',
    },
    rackId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: Rack,
        key: 'rackId',
      },
      comment: '所属机柜ID',
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'U位',
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: '高度(U)',
    },
    powerConsumption: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
      comment: '功率(W)',
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '设备型号',
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '品牌',
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'IP地址',
    },
    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '购买日期',
    },
    warrantyExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '保修到期',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '描述',
    },
    customFields: {
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
      comment: 'pending: 待同步, synced: 已同步, deleted: 已删除',
    },
    planId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: InventoryPlan,
        key: 'planId',
      },
      comment: '关联的盘点计划ID',
    },
    taskId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: InventoryTask,
        key: 'taskId',
      },
      comment: '关联的盘点任务ID',
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: User,
        key: 'userId',
      },
      comment: '创建人',
    },
    syncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '同步时间',
    },
    syncedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: User,
        key: 'userId',
      },
      comment: '同步人',
    },
    syncedDeviceId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '同步后生成的设备ID',
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注',
    },
  },
  {
    tableName: 'pending_devices',
    timestamps: true,
    indexes: [
      { fields: ['serialNumber'] },
      { fields: ['status'] },
      { fields: ['planId'] },
      { fields: ['taskId'] },
      { fields: ['createdBy'] },
      { fields: ['roomId'] },
      { fields: ['rackId'] },
    ],
  }
);

PendingDevice.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });
PendingDevice.belongsTo(User, { foreignKey: 'syncedBy', as: 'Syncer' });
PendingDevice.belongsTo(InventoryPlan, { foreignKey: 'planId', as: 'Plan' });
PendingDevice.belongsTo(InventoryTask, { foreignKey: 'taskId', as: 'Task' });
PendingDevice.belongsTo(Room, { foreignKey: 'roomId', as: 'Room' });
PendingDevice.belongsTo(Rack, { foreignKey: 'rackId', as: 'Rack' });

module.exports = PendingDevice;
