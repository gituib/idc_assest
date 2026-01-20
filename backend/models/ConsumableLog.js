const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const Consumable = require('./Consumable');

const ConsumableLog = sequelize.define('ConsumableLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  consumableId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '耗材ID'
  },
  consumableName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '耗材名称'
  },
  operationType: {
    type: DataTypes.ENUM('in', 'out', 'create', 'update', 'delete', 'adjust', 'import'),
    allowNull: false,
    comment: '操作类型'
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '变动数量（入库为正，出库为负）'
  },
  previousStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '操作前库存'
  },
  currentStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '操作后库存'
  },
  operator: {
    type: DataTypes.STRING,
    comment: '操作人'
  },
  reason: {
    type: DataTypes.STRING,
    comment: '操作原因'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: '备注'
  },
  relatedId: {
    type: DataTypes.STRING,
    comment: '关联ID（如订单号、盘点ID等）'
  }
}, {
  tableName: 'consumable_logs',
  timestamps: true,
  comment: '耗材操作日志表',
  indexes: [
    { fields: ['consumableId'] },
    { fields: ['operationType'] },
    { fields: ['createdAt'] },
    { fields: ['consumableId', 'createdAt'] }
  ]
});

ConsumableLog.belongsTo(Consumable, {
  foreignKey: 'consumableId',
  onDelete: 'CASCADE'
});

module.exports = ConsumableLog;
