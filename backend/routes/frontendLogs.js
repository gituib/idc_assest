const express = require('express');
const router = express.Router();
const logger = require('../utils/logger').module('Frontend');

/**
 * 前端错误日志上报
 * 接收前端 window.onerror / unhandledrejection / ErrorBoundary 捕获的错误，
 * 写入现有 winston 日志体系统一落盘（app/ 与 error/ 目录）。
 * @route POST /api/frontend-logs
 */
router.post('/', (req, res) => {
  try {
    const { type = 'error', message, stack, componentStack, url, userAgent } = req.body || {};

    logger.error(`前端${type}上报`, {
      type,
      message: message || '',
      stack: String(stack || '').slice(0, 4000),
      componentStack: componentStack || '',
      url: url || '',
      userAgent: userAgent || req.headers['user-agent'],
      ip: req.ip,
    });

    res.json({ success: true, message: '已记录' });
  } catch (error) {
    logger.error('处理前端日志上报失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: '记录日志失败',
    });
  }
});

module.exports = router;
