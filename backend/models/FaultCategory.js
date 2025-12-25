const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const FaultCategory = sequelize.define('FaultCategory', {
  categoryId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '分类名称'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '分类说明 - 说明此类故障代表什么问题'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序优先级'
  },
  defaultPriority: {
    type: DataTypes.STRING,
    defaultValue: 'medium',
    comment: '默认优先级: critical/high/medium/low'
  },
  expectedDuration: {
    type: DataTypes.INTEGER,
    comment: '预计处理时长(小时)'
  },
  solutions: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '常见解决方案'
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否系统内置分类'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: '扩展字段'
  }
}, {
  tableName: 'fault_categories',
  timestamps: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['isActive'] },
    { fields: ['priority'] }
  ]
});

module.exports = FaultCategory;
