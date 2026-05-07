/**
 * 统一日志模块
 * 基于 winston 的日志系统，支持：
 * - 文件轮转、级别控制、模块标识
 * - JSON结构化输出（生产环境）
 * - 请求追踪ID传递
 * - 模块级别精细控制
 * - 日志采样过滤
 * 全项目唯一日志入口
 */

const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../logs');

const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const LOG_MAX_FILE_SIZE = process.env.LOG_MAX_FILE_SIZE || '20m';

const LOG_MAX_FILES = process.env.LOG_MAX_FILES || '30d';

/**
 * 模块级别配置
 * 支持按模块精细控制日志级别，JSON格式
 * 示例：MODULE_LOG_LEVELS={"device":"debug","backup":"warn"}
 */
let MODULE_LOG_LEVELS = {};
try {
  MODULE_LOG_LEVELS = process.env.MODULE_LOG_LEVELS
    ? JSON.parse(process.env.MODULE_LOG_LEVELS)
    : {};
} catch {
  MODULE_LOG_LEVELS = {};
}

/**
 * 日志采样配置
 * 高频日志采样输出，rate表示采样率(0-1)
 * 示例：LOG_SAMPLING={"HTTP":0.1,"device":0.5}
 */
let LOG_SAMPLING = {};
try {
  LOG_SAMPLING = process.env.LOG_SAMPLING
    ? JSON.parse(process.env.LOG_SAMPLING)
    : {};
} catch {
  LOG_SAMPLING = {};
}

const samplingCounters = {};

/**
 * 获取模块日志级别
 * @param {string} moduleName - 模块名称
 * @returns {string} 日志级别
 */
const getModuleLevel = (moduleName) => {
  return MODULE_LOG_LEVELS[moduleName] || LOG_LEVEL;
};

/**
 * 日志级别优先级映射
 */
const LEVEL_PRIORITY = { error: 0, warn: 1, info: 2, debug: 3 };

/**
 * 判断是否应该输出该级别日志
 * @param {string} level - 当前日志级别
 * @param {string} minLevel - 最低输出级别
 * @returns {boolean}
 */
const shouldLog = (level, minLevel) => {
  return (LEVEL_PRIORITY[level] || 99) <= (LEVEL_PRIORITY[minLevel] || 99);
};

/**
 * 日志采样判断
 * @param {string} moduleName - 模块名称
 * @param {string} level - 日志级别
 * @returns {boolean} 是否应该输出
 */
const shouldSample = (moduleName, level) => {
  if (level === 'error' || level === 'warn') return true;

  const samplingConfig = LOG_SAMPLING[moduleName];
  if (!samplingConfig || samplingConfig.rate >= 1) return true;

  samplingCounters[moduleName] = (samplingCounters[moduleName] || 0) + 1;
  return samplingCounters[moduleName] % Math.floor(1 / samplingConfig.rate) === 0;
};

/**
 * JSON格式输出（生产环境文件日志）
 */
const jsonFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'module', 'requestId'] }),
  format.json()
);

/**
 * 文本格式输出（开发环境控制台）
 */
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'HH:mm:ss.SSS' }),
  format.printf(({ timestamp, level, message, module, requestId, metadata }) => {
    const moduleTag = module ? `[${module}]` : '';
    const requestTag = requestId ? `[${requestId}]` : '';
    const metaStr = metadata && Object.keys(metadata).length
      ? ' ' + JSON.stringify(metadata)
      : '';
    return `${timestamp} ${level} ${moduleTag}${requestTag} ${message}${metaStr}`;
  })
);

/**
 * 创建 winston logger 实例
 */
const logger = createLogger({
  level: LOG_LEVEL,
  format: jsonFormat,
  defaultMeta: { service: 'idc-management' },
  transports: [
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'app'),
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: LOG_MAX_FILES,
      maxSize: LOG_MAX_FILE_SIZE,
      level: 'debug',
    }),
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'error'),
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '60d',
      maxSize: LOG_MAX_FILE_SIZE,
      level: 'error',
    }),
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'request'),
      filename: 'request-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '15d',
      maxSize: LOG_MAX_FILE_SIZE,
      level: 'debug',
    }),
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'error'),
      filename: 'exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: LOG_MAX_FILES,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'error'),
      filename: 'rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: LOG_MAX_FILES,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: consoleFormat,
    level: 'debug',
  }));
}

/**
 * 创建带模块名的子 logger
 * 支持模块级别精细控制和日志采样
 * @param {string} moduleName - 模块名称
 * @returns {Object} 包含 debug/info/warn/error 方法的对象
 */
logger.module = (moduleName) => {
  const moduleLevel = getModuleLevel(moduleName);

  const logWithLevel = (level, msg, meta = {}) => {
    if (!shouldLog(level, moduleLevel)) return;
    if (!shouldSample(moduleName, level)) return;
    logger.log(level, msg, { module: moduleName, ...meta });
  };

  return {
    debug: (msg, meta) => logWithLevel('debug', msg, meta),
    info: (msg, meta) => logWithLevel('info', msg, meta),
    warn: (msg, meta) => logWithLevel('warn', msg, meta),
    error: (msg, meta) => logWithLevel('error', msg, meta),
  };
};

/**
 * 创建带请求ID的 logger
 * 用于全链路请求追踪
 * @param {string} requestId - 请求追踪ID
 * @param {string} moduleName - 模块名称（可选）
 * @returns {Object} 包含日志方法的对象
 */
logger.withRequestId = (requestId, moduleName = null) => {
  const baseLogger = moduleName ? logger.module(moduleName) : logger;

  const wrapMethod = (method) => (msg, meta = {}) => {
    baseLogger[method](msg, { requestId, ...meta });
  };

  return {
    debug: wrapMethod('debug'),
    info: wrapMethod('info'),
    warn: wrapMethod('warn'),
    error: wrapMethod('error'),
  };
};

module.exports = logger;
