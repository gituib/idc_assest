const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

/** IP ID 生成函数 */
const genIpId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  let rnd = '';
  for (let i = 0; i < 6; i++) {
    rnd += Math.floor(Math.random() * 36).toString(36).toUpperCase();
  }
  return `IP${ts}${rnd}`;
};

/**
 * IpAddress IP 地址模型
 * 一个网段包含多个 IP 地址记录，支持 IPv4 / IPv6 双栈
 */
const IpAddress = sequelize.define(
  'IpAddress',
  {
    ipId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
      defaultValue: genIpId,
    },
    subnetId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    /** 地址族版本（从所属网段继承，也允许独立指定） */
    ipVersion: {
      type: DataTypes.ENUM('ipv4', 'ipv6'),
      allowNull: false,
      defaultValue: 'ipv4',
    },
    ipAddress: {
      type: DataTypes.STRING(80),
      allowNull: false,
      comment: 'IP 地址字符串',
    },
    /** IPv4 整数（BIGINT，IPv6 为 NULL） */
    ipInt: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: 'IPv4 整数，用于排序和范围查询',
    },
    /** 通用 128 位整数（IPv6 用此字段，IPv4 也冗余存一份保证排序统一） */
    ipInt128: {
      type: DataTypes.DECIMAL(39, 0),
      allowNull: true,
      comment: 'IP 转 128 位整数（DECIMAL 存），IPv4/IPv6 通用',
    },
    status: {
      type: DataTypes.ENUM('free', 'used', 'reserved', 'gateway', 'excluded'),
      defaultValue: 'free',
      allowNull: false,
    },
    /** IP 业务类型：management=带外管理, business=带内业务, public=公网, storage=存储网, other=其他 */
    ipType: {
      type: DataTypes.ENUM('management', 'business', 'public', 'storage', 'other'),
      allowNull: false,
      defaultValue: 'business',
    },
    /** 用户自定义标签，如"主备"、"VIP"、"cluster" */
    customTag: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    /** 是否为所属设备的主 IP（每设备全局最多一个） */
    isPrimaryForDevice: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    /** 当前 status 是否由上次绑定自动设置（used）。true=未被用户手动 override，解绑时可自动回退 free */
    statusAutoDriven: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    assignmentType: {
      type: DataTypes.STRING(20),
      defaultValue: 'static',
    },
    label: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    networkCardId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // ===== 在线探测字段 =====
    /** 在线状态：unknown（未探测）/ online / offline */
    probeStatus: {
      type: DataTypes.ENUM('unknown', 'online', 'offline'),
      defaultValue: 'unknown',
      allowNull: false,
      comment: '在线探测状态',
    },
    /** 探测方式：ping / tcp / both */
    probeMethod: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: '探测成功方式',
    },
    /** 探测延迟（毫秒） */
    probeLatency: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '探测延迟 ms',
    },
    /** 最后探测时间 */
    probeLastCheckedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'ip_addresses',
    timestamps: true,
    indexes: [
      { fields: ['subnetId'] },
      { fields: ['ipAddress'] },
      { fields: ['ipVersion'] },
      { fields: ['subnetId', 'status'] },
      { fields: ['subnetId', 'ipInt'] },
      { fields: ['subnetId', 'ipInt128'] },
      { fields: ['probeStatus'] },
      { fields: ['subnetId', 'probeStatus'] },
      { fields: ['deviceId'] },
      { fields: ['deviceId', 'ipType'] },
      { fields: ['isPrimaryForDevice'] },
      { fields: ['ipType'] },
      {
        fields: ['subnetId', 'ipAddress'],
        unique: true,
        name: 'ip_addresses_subnet_id_ip_address_unique',
      },
    ],
  }
);

module.exports = IpAddress;
