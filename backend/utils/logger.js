/**
 * 统一日志模块
 * 基于 winston 的日志系统，支持文件轮转、级别控制、模块标识
 * 全项目唯一日志入口
 */

const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// 日志目录
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../logs');

// 日志级别
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// 单个日志文件最大大小
const LOG_MAX_FILE_SIZE = process.env.LOG_MAX_FILE_SIZE || '20m';

// 日志文件最大保留天数
const LOG_MAX_FILES = process.env.LOG_MAX_FILES || '30d';

/**
 * 统一日志格式：时间 | 级别 | 模块 | 消息 | 元数据
 */
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'module'] }),
  format.printf(({ timestamp, level, message, module, metadata, stack }) => {
    const moduleTag = module ? `[${module}]` : '';
    const metaStr = metadata && Object.keys(metadata).length
      ? ' ' + JSON.stringify(metadata)
      : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} ${level.toUpperCase().padEnd(5)} ${moduleTag} ${message}${metaStr}${stackStr}`;
  })
);

/**
 * 创建 winston logger 实例
 */
const logger = createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'idc-management' },
  transports: [
    // 应用日志 - 按天轮转
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'app'),
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: LOG_MAX_FILES,
      maxSize: LOG_MAX_FILE_SIZE,
      level: 'info',
    }),
    // 错误日志 - 独立存储
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'error'),
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '60d',
      maxSize: LOG_MAX_FILE_SIZE,
      level: 'error',
    }),
  ],
  // 未捕获异常处理
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'error'),
      filename: 'exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: LOG_MAX_FILES,
    }),
  ],
  // 未处理 Promise 拒绝处理
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'error'),
      filename: 'rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: LOG_MAX_FILES,
    }),
  ],
});

// 开发环境添加控制台输出（带颜色）
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.timestamp({ format: 'HH:mm:ss' }),
      format.printf(({ timestamp, level, message, module }) => {
        const moduleTag = module ? `[${module}]` : '';
        return `${timestamp} ${level} ${moduleTag} ${message}`;
      })
    ),
  }));
}

/**
 * 创建带模块名的子 logger
 * @param {string} moduleName - 模块名称
 * @returns {Object} 包含 debug/info/warn/error 方法的对象
 */
logger.module = (moduleName) => ({
  debug: (msg, meta) => logger.debug(msg, { module: moduleName, ...meta }),
  info: (msg, meta) => logger.info(msg, { module: moduleName, ...meta }),
  warn: (msg, meta) => logger.warn(msg, { module: moduleName, ...meta }),
  error: (msg, meta) => logger.error(msg, { module: moduleName, ...meta }),
});

module.exports = logger;
