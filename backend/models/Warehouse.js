const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Warehouse = sequelize.define(
  'Warehouse',
  {
    warehouseId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 100,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'warehouses',
    timestamps: true,
    indexes: [{ fields: ['status'] }, { fields: ['name'] }],
  }
);

module.exports = Warehouse;
