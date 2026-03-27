const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const NetworkCard = sequelize.define(
  'NetworkCard',
  {
    nicId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'devices',
        key: 'deviceId',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '网卡名称，如"网卡1"、"eth0"、"Primary NIC"',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '网卡描述信息',
    },
    slotNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '插槽编号',
    },
    portCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '端口数量',
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '网卡型号',
    },
    manufacturer: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '制造商',
    },
    status: {
      type: DataTypes.ENUM('normal', 'warning', 'fault', 'offline'),
      defaultValue: 'normal',
      allowNull: false,
      comment: '网卡状态',
    },
  },
  {
    tableName: 'network_cards',
    timestamps: true,
    indexes: [
      { fields: ['deviceId'] },
      { fields: ['slotNumber'] },
      { unique: true, fields: ['deviceId', 'name'] },
    ],
  }
);

module.exports = NetworkCard;
