const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const DevicePort = sequelize.define(
  'DevicePort',
  {
    portId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'devices',
        key: 'deviceId',
      },
    },
    nicId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'network_cards',
        key: 'nicId',
      },
      comment: '所属网卡ID，可为空（向后兼容）',
    },
    portName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    portType: {
      type: DataTypes.ENUM(
        'RJ45', 'PoE', 'PoE+', 'PoE++',
        'SFP', 'GBIC',
        'SFP+', 'XFP', 'X2', 'XENPAK',
        'SFP28',
        'QSFP', 'QSFP+',
        'SFP56',
        'QSFP28', 'CFP', 'CFP2', 'CFP4', 'CXP', 'SFP-DD',
        'QSFP56',
        'QSFP-DD', 'OSFP', 'CFP8',
        'OSFP-XD', 'QSFP-DD800G',
        'LC', 'SC', 'FC', 'ST', 'MPO-12', 'MPO-24',
        'Console-RJ45', 'Console-USBC', 'MGMT', 'USB-A', 'USB-C',
        'Stacking'
      ),
      defaultValue: 'RJ45',
      allowNull: false,
    },
    portSpeed: {
      type: DataTypes.ENUM('100M', '1G', '10G', '25G', '40G', '50G', '100G', '200G', '400G', '800G'),
      defaultValue: '1G',
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('free', 'occupied', 'fault'),
      defaultValue: 'free',
      allowNull: false,
    },
    vlanId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'device_ports',
    timestamps: true,
    indexes: [
      { fields: ['deviceId'] },
      { fields: ['nicId'] },
      { fields: ['status'] },
      { fields: ['portType'] },
      { fields: ['portSpeed'] },
      { unique: true, name: 'device_ports_device_id_port_name', fields: ['deviceId', 'portName'] },
    ],
  }
);

module.exports = DevicePort;
