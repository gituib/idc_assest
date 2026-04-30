const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const { generateId } = require('../utils/idGenerator');
const Room = require('./Room');

const Rack = sequelize.define(
  'Rack',
  {
    rackId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: true,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 45,
    },
    maxPower: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    currentPower: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active',
    },
    roomId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Room,
        key: 'roomId',
      },
    },
    rowPos: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    colPos: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    facing: {
      type: DataTypes.STRING,
      defaultValue: 'front',
    },
  },
  {
    tableName: 'racks',
    timestamps: true,
    indexes: [{ fields: ['roomId'] }, { fields: ['status'] }, { fields: ['roomId', 'status'] }],
    hooks: {
      beforeCreate: (rack) => {
        if (!rack.rackId) {
          rack.rackId = generateId({ prefix: 'RCK' });
        }
      },
    },
  }
);

// 关联关系
Rack.belongsTo(Room, { foreignKey: 'roomId', onDelete: 'CASCADE' });
Room.hasMany(Rack, { foreignKey: 'roomId', onDelete: 'CASCADE' });

module.exports = Rack;
