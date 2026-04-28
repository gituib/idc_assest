/**
 * HTTP 请求日志中间件
 * 为每个请求生成唯一 ID，记录请求/响应信息
 */

const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * 请求日志中间件
 * 记录每个 HTTP 请求的方法、URL、状态码、耗时、用户ID 等信息
 */
const requestLogger = (req, res, next) => {
  const requestId = crypto.randomBytes(4).toString('hex');
  const startTime = Date.now();

  req.requestId = requestId;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error'
      : res.statusCode >= 400 ? 'warn' : 'debug';

    logger[level](`${req.method} ${req.originalUrl}`, {
      module: 'HTTP',
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId || null,
    });
  });

  next();
};

module.exports = requestLogger;
