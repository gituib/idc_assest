/**
 * 配置统一导出
 */

const security = require('./security');
const constants = require('./constants');

module.exports = {
  ...security,
  ...constants,
  security,
  constants,
};
