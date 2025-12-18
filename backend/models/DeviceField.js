const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const DeviceField = sequelize.define('DeviceField', {
  fieldId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  fieldName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fieldType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'string'
  },
  required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  options: {
    type: DataTypes.JSON,
    allowNull: true
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  visible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'deviceFields',
  timestamps: true
});

module.exports = DeviceField;