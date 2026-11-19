/**
 * 设备凭据模型
 * 存储 SSH/SNMP/API 采集凭据，密码通过 crypto.js 加密存储
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const { generateId } = require('../utils/idGenerator');
const Device = require('./Device');

const DeviceCredential = sequelize.define(
  'DeviceCredential',
  {
    credentialId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: true, // 由 beforeCreate hook 自动生成 ID，hook 在验证之后运行，此处必须放宽
      unique: true,
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'devices',
        key: 'deviceId',
      },
      comment: '关联设备',
    },
    protocol: {
      type: DataTypes.ENUM('ssh', 'snmp', 'telnet', 'api', 'redfish'),
      allowNull: false,
      defaultValue: 'ssh',
      comment: '采集协议（api 为历史预留，不再对外提供；redfish 为服务器 BMC 带外采集）',
    },
    host: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '设备 IP 或 hostname（SSH/SNMP），或平台 baseURL（API）',
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '端口（SSH 22 / SNMP 161 / Telnet 23 / HTTPS 443）',
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'SSH 用户名（SNMP/API 可留空）',
    },
    password: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '加密后的 SSH 密码',
    },
    community: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '加密后的 SNMP community string',
    },
    vendor: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '厂商标识：huawei / cisco / h3c / ruijie / generic',
    },
    apiToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '加密后的平台 API Token',
    },
    apiBaseUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '平台对接 baseURL',
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否为该设备该协议下的默认凭据',
    },
    lastTestedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最近一次测试连通时间',
    },
    testStatus: {
      type: DataTypes.ENUM('success', 'failed'),
      allowNull: true,
      comment: '最近测试结果',
    },
    testMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '最近测试的错误信息或成功说明',
    },
  },
  {
    tableName: 'device_credentials',
    charset: 'utf8mb4',
    collate: 'utf8mb4_0900_ai_ci',
    timestamps: true,
    indexes: [
      { fields: ['deviceId'] },
      { fields: ['deviceId', 'isDefault'] },
      { fields: ['protocol'] },
    ],
    hooks: {
      beforeCreate: (cred) => {
        if (!cred.credentialId) {
          cred.credentialId = generateId({ prefix: 'DCRE', randomLength: 4 });
        }
      },
      afterCreate: async (cred, options) => {
        // 同一设备同一协议只允许一个默认凭据
        if (cred.isDefault) {
          await DeviceCredential.update(
            { isDefault: false },
            {
              where: {
                deviceId: cred.deviceId,
                protocol: cred.protocol,
                credentialId: { [require('sequelize').Op.ne]: cred.credentialId },
              },
              transaction: options?.transaction,
            }
          );
        }
      },
    },
  }
);

DeviceCredential.belongsTo(Device, { foreignKey: 'deviceId', onDelete: 'CASCADE' });

module.exports = DeviceCredential;
