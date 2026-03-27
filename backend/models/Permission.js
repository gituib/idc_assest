const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Permission = sequelize.define(
  'Permission',
  {
    permissionId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    permissionName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    permissionCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    parentId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('menu', 'button'),
      defaultValue: 'button',
    },
    path: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sort: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
    },
  },
  {
    tableName: 'permissions',
    timestamps: true,
  }
);

module.exports = Permission;
