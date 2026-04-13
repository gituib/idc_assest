const path = require('path');

const routesConfig = [
  {
    file: 'consumableImport.js',
    path: '/api',
  },
  {
    file: 'devices.js',
    path: '/api/devices',
  },
  {
    file: 'racks.js',
    path: '/api/racks',
  },
  {
    file: 'rooms.js',
    path: '/api/rooms',
  },
  {
    file: 'deviceFields.js',
    path: '/api/deviceFields',
  },
  {
    file: 'background.js',
    path: '/api/background',
  },
  {
    file: 'consumables.js',
    path: '/api/consumables',
  },
  {
    file: 'consumableRecords.js',
    path: '/api/consumable-records',
  },
  {
    file: 'consumableCategories.js',
    path: '/api/consumable-categories',
  },
  {
    file: 'auth.js',
    path: '/api/auth',
  },
  {
    file: 'users.js',
    path: '/api/users',
  },
  {
    file: 'roles.js',
    path: '/api/roles',
  },
  {
    file: 'tickets.js',
    path: '/api/tickets',
  },
  {
    file: 'ticketCategories.js',
    path: '/api/ticket-categories',
  },
  {
    file: 'ticketFields.js',
    path: '/api/ticket-fields',
  },
  {
    file: 'systemSettings.js',
    path: '/api/system-settings',
  },
  {
    file: 'cables.js',
    path: '/api/cables',
  },
  {
    file: 'devicePorts.js',
    path: '/api/device-ports',
  },
  {
    file: 'networkCards.js',
    path: '/api/network-cards',
  },
  {
    file: 'inventory.js',
    path: '/api/inventory',
  },
  {
    file: 'backup.js',
    path: '/api/backup',
  },
  {
    file: 'statistics.js',
    path: '/api/statistics',
  },
  {
    file: 'operationLogs.js',
    path: '/api/operation-logs',
  },
  {
    file: 'idleDevices.js',
    path: '/api/idle-devices',
  },
  {
    file: 'warehouses.js',
    path: '/api/warehouses',
  },
  {
    file: 'dangerousOperations.js',
    path: '/api/dangerous-operations',
  },
  {
    file: 'topology.js',
    path: '/api/topology',
  },
];

module.exports = routesConfig;
