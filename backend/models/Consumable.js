const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Consumable = sequelize.define('Consumable', {
  consumableId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '个'
  },
  currentStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  minStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  maxStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  supplier: {
    type: DataTypes.STRING
  },
  location: {
    type: DataTypes.STRING,
    comment: '存放位置'
  },
  description: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '乐观锁版本号'
  }
}, {
  tableName: 'consumables',
  timestamps: true,
  indexes: [
    { fields: ['category'] },
    { fields: ['status'] },
    { fields: ['category', 'status'] },
    { fields: ['updatedAt'] }
  ]
});

module.exports = Consumable;
