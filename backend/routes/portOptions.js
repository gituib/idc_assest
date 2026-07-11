const express = require('express');
const router = express.Router();
const {
  PORT_TYPE_OPTIONS,
  PORT_SPEED_OPTIONS,
  CABLE_TYPE_OPTIONS,
} = require('../config/portOptions');

/**
 * @description 获取端口类型/速率/线缆类型三类下拉选项
 * @route GET /api/port-options
 * @returns {Object} { portTypes, portSpeeds, cableTypes }
 */
router.get('/', (req, res) => {
  res.json({
    portTypes: PORT_TYPE_OPTIONS,
    portSpeeds: PORT_SPEED_OPTIONS,
    cableTypes: CABLE_TYPE_OPTIONS,
  });
});

module.exports = router;
