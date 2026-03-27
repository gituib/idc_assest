const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const User = require('./User');
const Role = require('./Role');

const UserRole = sequelize.define(
  'UserRole',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
  },
  {
    tableName: 'user_roles',
    timestamps: true,
  }
);

UserRole.belongsTo(User, { foreignKey: 'UserId', onDelete: 'CASCADE' });
UserRole.belongsTo(Role, { foreignKey: 'RoleId', onDelete: 'CASCADE' });
User.hasMany(UserRole, { foreignKey: 'UserId', onDelete: 'CASCADE' });
Role.hasMany(UserRole, { foreignKey: 'RoleId', onDelete: 'CASCADE' });

module.exports = UserRole;
