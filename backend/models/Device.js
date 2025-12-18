const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const Rack = require('./Rack');

const Device = sequelize.define('Device', {
  deviceId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false
  },
  serialNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  rackId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: Rack,
      key: 'rackId'
    }
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false // 设备在机柜中的位置（U数）
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1 // 设备高度（U数）
  },
  powerConsumption: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'running'
  },
  purchaseDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  warrantyExpiry: {
    type: DataTypes.DATE,
    allowNull: false
  },
  ipAddress: {
    type: DataTypes.STRING
  },
  description: {
    type: DataTypes.TEXT
  },
  customFields: {
    type: DataTypes.JSON,
    defaultValue: {},
    allowNull: false
  }
}, {
  tableName: 'devices',
  timestamps: true
});

// 关联关系
Device.belongsTo(Rack, { foreignKey: 'rackId' });
Rack.hasMany(Device, { foreignKey: 'rackId' });

module.exports = Device;