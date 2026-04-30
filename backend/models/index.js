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

// 建立Rack与Device的关联关系（Device模型中已有反向关联定义）
Rack.hasMany(Device, { foreignKey: 'rackId', as: 'Devices' });

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
};
