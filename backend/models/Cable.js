const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const Device = require('./Device');
const { generateId } = require('../utils/idGenerator');

const Cable = sequelize.define(
  'Cable',
  {
    cableId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: true,
      unique: true,
    },
    sourceDeviceId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'devices',
        key: 'deviceId',
      },
    },
    sourcePort: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetDeviceId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'devices',
        key: 'deviceId',
      },
    },
    targetPort: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cableType: {
      type: DataTypes.ENUM(
        // 以太网线缆
        'ethernet', 'cat5e', 'cat6', 'cat6a', 'cat7', 'cat8', 'dac', 'aoc',
        // 光纤线缆
        'fiber', 'os2', 'om1', 'om2', 'om3', 'om4', 'om5',
        // 同轴/铜质
        'copper', 'coax',
        // 其他
        'power', 'console', 'stack'
      ),
      defaultValue: 'ethernet',
      allowNull: false,
    },
    cableLength: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('normal', 'fault', 'disconnected'),
      defaultValue: 'normal',
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cableLabel: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '线缆标签/编号',
    },
    cableColor: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '线缆颜色（便于识别）',
    },
    installedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '安装人',
    },
    installedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '安装时间',
    },
    lastTestedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '上次测试时间',
    },
  },
  {
    tableName: 'cables',
    timestamps: true,
    indexes: [
      { fields: ['sourceDeviceId'] },
      { fields: ['targetDeviceId'] },
      { fields: ['status'] },
      { fields: ['cableType'] },
      { fields: ['sourceDeviceId', 'targetDeviceId'] },
      { fields: ['cableLabel'] },
    ],
    hooks: {
      beforeCreate: (cable) => {
        if (!cable.cableId) {
          cable.cableId = generateId({ prefix: 'CBL' });
        }
      },
    },
  }
);

Cable.belongsTo(Device, { foreignKey: 'sourceDeviceId', as: 'sourceDevice' });
Cable.belongsTo(Device, { foreignKey: 'targetDeviceId', as: 'targetDevice' });

module.exports = Cable;
