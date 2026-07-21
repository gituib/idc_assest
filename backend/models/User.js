const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const { generateId } = require('../utils/idGenerator');

const User = sequelize.define(
  'User',
  {
    userId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'users_username_unique',
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '邮箱是否已验证',
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    realName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'locked', 'pending'),
      defaultValue: 'active',
    },
    lastLoginTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginIp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    loginCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '连续登录失败次数，登录成功后重置',
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '账户锁定过期时间，NULL表示未锁定或已解锁',
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    indexes: [{ fields: ['status'] }, { fields: ['username'] }, { fields: ['email'] }],
    hooks: {
      beforeCreate: (user) => {
        if (!user.userId) {
          user.userId = generateId({ prefix: 'USR' });
        }
      },
    },
  }
);

module.exports = User;
