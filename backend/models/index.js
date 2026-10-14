const Room = require('./Room');
const Rack = require('./Rack');
const Device = require('./Device');
const DeviceField = require('./DeviceField');
const DevicePort = require('./DevicePort');
const NetworkCard = require('./NetworkCard');
const Cable = require('./Cable');
const Ticket = require('./Ticket');
const InventoryRecord = require('./InventoryRecord');
const Warehouse = require('./Warehouse');
const TopologyLayout = require('./TopologyLayout');
const Subnet = require('./Subnet');
const IpAddress = require('./IpAddress');

// Rack 与 Device 的关联
Rack.hasMany(Device, { foreignKey: 'rackId', as: 'Devices' });

// Subnet 自关联（父子嵌套）
Subnet.belongsTo(Subnet, { foreignKey: 'parentId', as: 'parent', allowNull: true });
Subnet.hasMany(Subnet, { foreignKey: 'parentId', as: 'children' });

// Subnet 与 IpAddress 的关联
Subnet.hasMany(IpAddress, { foreignKey: 'subnetId', as: 'ips' });
IpAddress.belongsTo(Subnet, { foreignKey: 'subnetId', onDelete: 'CASCADE' });

// Device 与 IpAddress 的关联（一台设备可以有多个 IP，一个 IP 绑定一台设备）
Device.hasMany(IpAddress, { foreignKey: 'deviceId', as: 'ipAddresses', constraints: false });
IpAddress.belongsTo(Device, { foreignKey: 'deviceId', constraints: false });

module.exports = {
  Room,
  Rack,
  Device,
  DeviceField,
  DevicePort,
  NetworkCard,
  Cable,
  Ticket,
  InventoryRecord,
  Warehouse,
  TopologyLayout,
  Subnet,
  IpAddress,
};
