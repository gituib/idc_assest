const logger = require('./logger').module('ErrorHandler');

class AppError extends Error {
  constructor(code, message, statusCode = 500, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
};

const STATUS_CODE_MAP = {
  400: ERROR_CODES.BAD_REQUEST,
  401: ERROR_CODES.UNAUTHORIZED,
  403: ERROR_CODES.FORBIDDEN,
  404: ERROR_CODES.NOT_FOUND,
  409: ERROR_CODES.CONFLICT,
  500: ERROR_CODES.INTERNAL_ERROR,
};

const FRIENDLY_MESSAGES = {
  [ERROR_CODES.BAD_REQUEST]: '请求参数错误，请检查输入',
  [ERROR_CODES.UNAUTHORIZED]: '未授权访问，请先登录',
  [ERROR_CODES.FORBIDDEN]: '无权执行此操作',
  [ERROR_CODES.NOT_FOUND]: '请求的资源不存在',
  [ERROR_CODES.CONFLICT]: '数据冲突，请刷新后重试',
  [ERROR_CODES.VALIDATION_ERROR]: '数据验证失败',
  [ERROR_CODES.INTERNAL_ERROR]: '服务器内部错误，请稍后重试',
  [ERROR_CODES.DATABASE_ERROR]: '数据库操作失败',
  [ERROR_CODES.NETWORK_ERROR]: '网络连接错误',
};

function logError(error, req = null) {
  const logData = {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
    details: error.details,
    userAgent: req?.headers?.['user-agent'],
    ip: req?.ip,
    path: req?.path,
    method: req?.method,
  };

  logger.error('应用错误', logData);
}

function buildErrorResponse(error) {
  const code = error.code || STATUS_CODE_MAP[error.statusCode] || ERROR_CODES.INTERNAL_ERROR;
  const message =
    error.message || FRIENDLY_MESSAGES[code] || FRIENDLY_MESSAGES[ERROR_CODES.INTERNAL_ERROR];

  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (error.details) {
    response.error.details = error.details;
  }

  return response;
}

function createError(code, message, statusCode = 500, details = null) {
  return new AppError(code, message, statusCode, details);
}

function sendErrorResponse(res, error, req = null) {
  logError(error, req);

  let statusCode = 500;
  let appError = error;

  if (!(error instanceof AppError)) {
    if (error.name === 'SequelizeValidationError') {
      statusCode = 400;
      const details = error.errors.map(err => ({
        field: err.path,
        message: err.message,
      }));
      appError = createError(
        ERROR_CODES.VALIDATION_ERROR,
        FRIENDLY_MESSAGES[ERROR_CODES.VALIDATION_ERROR],
        statusCode,
        details
      );
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      statusCode = 409;
      appError = createError(ERROR_CODES.CONFLICT, '数据已存在', statusCode);
    } else {
      statusCode = error.statusCode || 500;
      appError = createError(
        STATUS_CODE_MAP[statusCode] || ERROR_CODES.INTERNAL_ERROR,
        FRIENDLY_MESSAGES[STATUS_CODE_MAP[statusCode] || ERROR_CODES.INTERNAL_ERROR],
        statusCode,
        process.env.NODE_ENV === 'development' ? error.stack : null
      );
    }
  }

  statusCode = appError.statusCode || statusCode;
  res.status(statusCode).json(buildErrorResponse(appError));
}

function errorHandlerMiddleware(err, req, res, next) {
  sendErrorResponse(res, err, req);
}

module.exports = {
  AppError,
  ERROR_CODES,
  createError,
  logError,
  buildErrorResponse,
  sendErrorResponse,
  errorHandlerMiddleware,
};
