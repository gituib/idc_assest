const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const Consumable = require('./Consumable');

const ConsumableRecord = sequelize.define(
  'ConsumableRecord',
  {
    recordId: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    consumableId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Consumable,
        key: 'consumableId',
      },
    },
    type: {
      type: DataTypes.ENUM('in', 'out'),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    previousStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    currentStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    operator: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING,
    },
    recipient: {
      type: DataTypes.STRING,
    },
    notes: {
      type: DataTypes.TEXT,
    },
    snList: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: '本次操作的SN序列号列表',
    },
  },
  {
    tableName: 'consumable_records',
    timestamps: true,
    indexes: [{ fields: ['consumableId'] }, { fields: ['type'] }, { fields: ['createdAt'] }],
  }
);

ConsumableRecord.belongsTo(Consumable, {
  foreignKey: 'consumableId',
  as: 'consumable',
  onDelete: 'CASCADE',
});
Consumable.hasMany(ConsumableRecord, {
  foreignKey: 'consumableId',
  as: 'records',
  onDelete: 'CASCADE',
});

module.exports = ConsumableRecord;
