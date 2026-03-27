const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Role = sequelize.define(
  'Role',
  {
    roleId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    roleName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    roleCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
    },
    permissions: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    sort: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'roles',
    timestamps: true,
  }
);

module.exports = Role;
