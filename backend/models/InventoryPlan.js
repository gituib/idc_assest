const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const User = require('./User');

const InventoryPlan = sequelize.define(
  'InventoryPlan',
  {
    planId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'full',
      comment: 'full:全面盘点, partial:局部盘点, sample:抽样盘点',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'draft',
      comment: 'draft:草稿, pending:待执行, in_progress:进行中, completed:已完成, cancelled:已取消',
    },
    scheduledDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    targetRooms: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: '目标机房ID列表',
    },
    targetRacks: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: '目标机柜ID列表',
    },
    totalDevices: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '盘点设备总数',
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
    missedDevices: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '漏盘设备数',
    },
    extraDevices: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '多出设备数',
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: User,
        key: 'userId',
      },
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'inventory_plans',
    timestamps: true,
    indexes: [{ fields: ['status'] }, { fields: ['scheduledDate'] }, { fields: ['createdAt'] }],
  }
);

InventoryPlan.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });
User.hasMany(InventoryPlan, { foreignKey: 'createdBy' });

module.exports = InventoryPlan;
