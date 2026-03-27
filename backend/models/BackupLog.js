const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const BackupLog = sequelize.define(
  'BackupLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    logType: {
      type: DataTypes.ENUM('auto', 'manual'),
      allowNull: false,
      comment: '备份类型：auto自动，manual手动',
    },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'success', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
      comment: '状态：pending待执行，running执行中，success成功，failed失败',
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '备份描述',
    },
    backupType: {
      type: DataTypes.ENUM('full', 'incremental'),
      allowNull: true,
      comment: '备份类型：full全量，incremental增量',
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '备份文件名',
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '备份文件路径',
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: '文件大小（字节）',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '错误信息',
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '开始时间',
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '结束时间',
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '执行时长（毫秒）',
    },
    includeFiles: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否包含文件',
    },
    compressed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否压缩',
    },
    remoteUploads: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '远端上传结果',
    },
  },
  {
    tableName: 'backup_logs',
    timestamps: true,
    comment: '备份日志表',
    indexes: [
      { fields: ['logType'] },
      { fields: ['status'] },
      { fields: ['createdAt'] },
      { fields: ['logType', 'createdAt'] },
    ],
  }
);

module.exports = BackupLog;
