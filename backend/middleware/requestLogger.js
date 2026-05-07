/**
 * HTTP 请求日志中间件
 * 支持：
 * - 唯一请求ID生成（UUID格式，避免碰撞）
 * - 全链路请求追踪
 * - 请求/响应信息结构化记录
 */

const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * 生成唯一请求ID
 * 使用UUID格式确保全局唯一性
 * @returns {string} 请求ID
 */
const generateRequestId = () => {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${crypto.randomBytes(16).toString('hex')}`;
};

/**
 * 请求日志中间件
 * 为每个请求生成唯一ID，记录请求/响应信息
 * 支持全链路追踪：requestId贯穿请求生命周期
 */
const requestLogger = (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  req.requestId = requestId;

  const reqLogger = logger.withRequestId(requestId, 'HTTP');

  reqLogger.debug('请求开始', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId || null,
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error'
      : res.statusCode >= 400 ? 'warn' : 'debug';

    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId || null,
      contentLength: res.get('Content-Length') || 0,
    };

    if (res.statusCode >= 400) {
      logData.errorMessage = res.locals.errorMessage || null;
      logData.errorStack = res.locals.errorStack || null;
    }

    reqLogger[level](`${req.method} ${req.originalUrl}`, logData);
  });

  res.on('error', (error) => {
    reqLogger.error('响应错误', {
      error: error.message,
      stack: error.stack,
    });
  });

  next();
};

module.exports = requestLogger;
