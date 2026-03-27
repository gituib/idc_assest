const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const Device = require('./Device');

const Cable = sequelize.define(
  'Cable',
  {
    cableId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
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
      type: DataTypes.ENUM('ethernet', 'fiber', 'copper'),
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
    ],
  }
);

Cable.belongsTo(Device, { foreignKey: 'sourceDeviceId', as: 'sourceDevice' });
Cable.belongsTo(Device, { foreignKey: 'targetDeviceId', as: 'targetDevice' });

module.exports = Cable;
