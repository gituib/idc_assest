const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const TicketField = sequelize.define('TicketField', {
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
  },
  placeholder: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'ticketFields',
  timestamps: true
});

module.exports = TicketField;
