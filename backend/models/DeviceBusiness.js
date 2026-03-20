const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const Device = require('./Device');
const Business = require('./Business');

const DeviceBusiness = sequelize.define('DeviceBusiness', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: Device,
      key: 'deviceId'
    }
  },
  businessId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: Business,
      key: 'businessId'
    }
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'device_business',
  timestamps: true,
  indexes: [
    { fields: ['deviceId'] },
    { fields: ['businessId'] },
    { unique: true, fields: ['deviceId', 'businessId'] }
  ]
});

Device.belongsToMany(Business, {
  through: DeviceBusiness,
  foreignKey: 'deviceId',
  otherKey: 'businessId'
});

Business.belongsToMany(Device, {
  through: DeviceBusiness,
  foreignKey: 'businessId',
  otherKey: 'deviceId'
});

DeviceBusiness.belongsTo(Business, { foreignKey: 'businessId' });
DeviceBusiness.belongsTo(Device, { foreignKey: 'deviceId' });

module.exports = DeviceBusiness;
