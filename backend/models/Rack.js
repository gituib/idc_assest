const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const Room = require('./Room');

const Rack = sequelize.define('Rack', {
  rackId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 42 // 标准机柜高度（U数）
  },
  maxPower: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  currentPower: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },
  roomId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: Room,
      key: 'roomId'
    }
  }
}, {
  tableName: 'racks',
  timestamps: true,
  indexes: [
    { fields: ['roomId'] },
    { fields: ['status'] },
    { fields: ['roomId', 'status'] }
  ]
});

// 关联关系
Rack.belongsTo(Room, { foreignKey: 'roomId' });
Room.hasMany(Rack, { foreignKey: 'roomId' });

module.exports = Rack;