const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Business = sequelize.define(
  'Business',
  {
    businessId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'offline'),
      defaultValue: 'active',
    },
    offlineDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    offlineReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'businesses',
    timestamps: true,
    indexes: [{ fields: ['status'] }, { fields: ['name'] }],
  }
);

module.exports = Business;
