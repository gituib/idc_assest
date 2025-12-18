const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Room = sequelize.define('Room', {
  roomId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  area: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },
  description: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'rooms',
  timestamps: true
});

module.exports = Room;