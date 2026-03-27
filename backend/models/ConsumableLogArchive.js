const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

/**
 * 耗材操作日志归档表
 * 用于存储被删除耗材的历史操作记录
 */
const ConsumableLogArchive = sequelize.define(
  'ConsumableLogArchive',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    archiveId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '归档记录唯一标识',
    },
    consumableId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '被删除的耗材ID',
    },
    consumableName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '耗材名称',
    },
    consumableSnapshot: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '耗材快照信息',
    },
    totalOperations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '操作记录总数',
    },
    firstOperationAt: {
      type: DataTypes.DATE,
      comment: '首次操作时间',
    },
    lastOperationAt: {
      type: DataTypes.DATE,
      comment: '最后操作时间',
    },
    totalInQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '总入库数量',
    },
    totalOutQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '总出库数量',
    },
    finalStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '删除时库存',
    },
    deletedBy: {
      type: DataTypes.STRING,
      comment: '删除人',
    },
    deletedAt: {
      type: DataTypes.DATE,
      comment: '删除时间',
    },
    deleteReason: {
      type: DataTypes.STRING,
      comment: '删除原因',
    },
  },
  {
    tableName: 'consumable_log_archives',
    timestamps: true,
    comment: '耗材操作日志归档表',
    indexes: [
      { fields: ['consumableId'] },
      { fields: ['archiveId'] },
      { fields: ['deletedAt'] },
      { fields: ['consumableId', 'deletedAt'] },
    ],
  }
);

module.exports = ConsumableLogArchive;
