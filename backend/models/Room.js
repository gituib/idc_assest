const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

async function generateRoomSequenceId() {
  const RoomModel = require('./Room');
  const prefix = 'ROOM';
  const paddingLength = 6;

  try {
    const latestRoom = await RoomModel.findOne({
      attributes: ['roomId'],
      where: {
        roomId: {
          [require('sequelize').Op.like]: `${prefix}%`,
        },
      },
      order: [['roomId', 'DESC']],
    });

    let nextNumber = 1;
    if (latestRoom && latestRoom.roomId) {
      const numStr = latestRoom.roomId.replace(prefix, '');
      const currentNum = parseInt(numStr, 10);
      if (!isNaN(currentNum)) {
        nextNumber = currentNum + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(paddingLength, '0')}`;
  } catch (error) {
    const fallbackId = `${prefix}${Date.now().toString().slice(-6)}`;
    return fallbackId;
  }
}

const Room = sequelize.define(
  'Room',
  {
    roomId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: true,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    area: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active',
    },
    description: {
      type: DataTypes.TEXT,
    },
    gridRows: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    gridCols: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    layoutConfig: {
      type: DataTypes.JSON,
      defaultValue: null,
    },
  },
  {
    tableName: 'rooms',
    timestamps: true,
    indexes: [{ fields: ['status'] }, { fields: ['name'] }],
    hooks: {
      beforeCreate: async (room) => {
        if (!room.roomId) {
          room.roomId = await generateRoomSequenceId();
        }
      },
    },
  }
);

module.exports = Room;
