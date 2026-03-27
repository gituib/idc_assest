const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const ConsumableCategory = sequelize.define(
  'ConsumableCategory',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: '分类名称',
    },
    description: {
      type: DataTypes.STRING,
      comment: '分类描述',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序顺序',
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active',
      comment: '状态: active-启用, inactive-停用',
    },
  },
  {
    tableName: 'consumable_categories',
    timestamps: true,
  }
);

module.exports = ConsumableCategory;
