const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const SystemSetting = sequelize.define('SystemSetting', {
  settingKey: {
    type: DataTypes.STRING(100),
    primaryKey: true,
    allowNull: false,
    comment: '设置键名'
  },
  settingValue: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '设置值(JSON格式)'
  },
  settingType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'string',
    comment: '设置类型: string, number, boolean, json, array'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'general',
    comment: '设置分类: general, appearance, backup, about'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '设置描述'
  },
  isEditable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否可编辑'
  }
}, {
  tableName: 'system_settings',
  timestamps: true,
  indexes: [
    { fields: ['category'] }
  ]
});

module.exports = SystemSetting;
