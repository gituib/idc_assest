const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const DevicePort = sequelize.define('DevicePort', {
  portId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'devices',
      key: 'deviceId'
    }
  },
  nicId: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'network_cards',
      key: 'nicId'
    },
    comment: '所属网卡ID，可为空（向后兼容）'
  },
  portName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  portType: {
    type: DataTypes.ENUM('RJ45', 'SFP', 'SFP+', 'SFP28', 'QSFP', 'QSFP28'),
    defaultValue: 'RJ45',
    allowNull: false
  },
  portSpeed: {
    type: DataTypes.ENUM('100M', '1G', '10G', '25G', '40G', '100G'),
    defaultValue: '1G',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('free', 'occupied', 'fault'),
    defaultValue: 'free',
    allowNull: false
  },
  vlanId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'device_ports',
  timestamps: true,
  indexes: [
    { fields: ['deviceId'] },
    { fields: ['nicId'] },
    { fields: ['status'] },
    { fields: ['portType'] },
    { fields: ['portSpeed'] },
    { unique: true, fields: ['deviceId', 'portName'] }
  ]
});

module.exports = DevicePort;
