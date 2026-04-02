const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const { generateId } = require('../utils/idGenerator');

const Role = sequelize.define(
  'Role',
  {
    roleId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: true,
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
    hooks: {
      beforeCreate: (role) => {
        if (!role.roleId) {
          role.roleId = generateId({ prefix: 'ROLE' });
        }
      },
    },
  }
);

module.exports = Role;
