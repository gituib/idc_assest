/**
 * 操作日志记录器
 * 支持：
 * - 关联请求追踪ID（requestId）
 * - 数据库写入失败时降级到文件日志
 * - 统一错误处理（使用logger替代console.error）
 */

const OperationLog = require('../models/OperationLog');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

const logModule = logger.module('OperationLogger');

const generateRecordId = () => {
  return `OPLOG_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 获取操作人信息
 * @param {Object} req - Express请求对象
 * @returns {Object} 操作人信息
 */
const getOperatorInfo = req => {
  if (!req || !req.user) {
    return {
      operatorId: 'system',
      operatorName: '系统',
      operatorRole: null,
    };
  }
  return {
    operatorId: req.user.userId || req.user.id || 'unknown',
    operatorName: req.user.realName || req.user.username || '未知用户',
    operatorRole: req.user.roleName || req.user.role || null,
  };
};

/**
 * 获取客户端信息
 * @param {Object} req - Express请求对象
 * @returns {Object} 客户端信息（含requestId）
 */
const getClientInfo = req => {
  if (!req) {
    return { ipAddress: null, userAgent: null, requestId: null };
  }
  const ipAddress =
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.ip ||
    null;
  return {
    ipAddress,
    userAgent: req.headers['user-agent'] || null,
    requestId: req.requestId || null,
  };
};

const DEVICE_TYPE_MAP = {
  server: '服务器',
  switch: '交换机',
  router: '路由器',
  storage: '存储设备',
  firewall: '防火墙',
  loadbalancer: '负载均衡器',
  other: '其他设备',
};

/**
 * 生成设备操作描述
 * @param {string} operation - 操作类型描述
 * @param {Object} device - 设备信息
 * @param {Object} options - 选项
 * @returns {string} 操作描述
 */
const generateDeviceDescription = (operation, device, options = {}) => {
  const {
    includeRack = true,
    includePosition = true,
    includeSerial = true,
    includeIp = true,
    includeModel = true,
  } = options;

  const deviceType = DEVICE_TYPE_MAP[device.type] || device.type || '设备';
  const parts = [`${deviceType}【${device.name}】`];

  if (device.deviceId) {
    parts.push(`编号:${device.deviceId}`);
  }

  if (includeModel && device.model) {
    parts.push(`型号:${device.model}`);
  }

  if (includeSerial && device.serialNumber) {
    parts.push(`序列号:${device.serialNumber}`);
  }

  if (includeIp && device.ipAddress) {
    parts.push(`IP:${device.ipAddress}`);
  }

  if (includeRack && device.rackName) {
    if (includePosition && device.position !== undefined) {
      parts.push(`位置:机柜【${device.rackName}】U${device.position}`);
    } else {
      parts.push(`机柜【${device.rackName}】`);
    }
  }

  return `${operation}${parts.join('，')}`;
};

/**
 * 构建设备元数据
 * @param {Object} device - 设备信息
 * @param {Object} extra - 额外字段
 * @returns {Object} 元数据
 */
const buildDeviceMetadata = (device, extra = {}) => {
  return {
    deviceId: device.deviceId || null,
    deviceName: device.name || null,
    deviceType: device.type || null,
    deviceModel: device.model || null,
    serialNumber: device.serialNumber || null,
    ipAddress: device.ipAddress || null,
    rackId: device.rackId || null,
    rackName: device.rackName || null,
    position: device.position !== undefined ? device.position : null,
    roomId: device.roomId || null,
    roomName: device.roomName || null,
    ...extra,
  };
};

/**
 * 降级写入文件日志
 * 当数据库不可用时，将操作日志写入文件作为降级方案
 * @param {Object} logData - 日志数据
 */
const fallbackToFile = (logData) => {
  try {
    const fallbackDir = path.join(process.env.LOG_DIR || './logs', 'fallback');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    const fallbackPath = path.join(fallbackDir, `operation-fallback-${new Date().toISOString().slice(0, 10)}.log`);
    const fallbackEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      module: 'OperationLogger',
      message: '操作日志数据库写入失败（降级记录）',
      data: logData,
    };
    fs.appendFileSync(fallbackPath, JSON.stringify(fallbackEntry) + '\n');
  } catch {
    // 文件写入也失败时静默忽略，避免级联错误
  }
};

/**
 * 记录操作日志（核心方法）
 * @param {Object} params - 参数对象
 * @param {string} params.module - 模块名称
 * @param {string} params.operationType - 操作类型
 * @param {string} params.operationDescription - 操作描述
 * @param {string} params.targetId - 目标ID
 * @param {string} params.targetName - 目标名称
 * @param {Object} params.beforeState - 操作前状态
 * @param {Object} params.afterState - 操作后状态
 * @param {string} params.result - 操作结果
 * @param {Object} params.req - 请求对象
 * @param {Object} params.metadata - 附加元数据
 * @returns {Promise<Object|null>} 创建的日志记录
 */
async function logOperation({
  module,
  operationType,
  operationDescription,
  targetId,
  targetName,
  beforeState,
  afterState,
  result = 'success',
  req,
  metadata = {},
}) {
  const operatorInfo = getOperatorInfo(req);
  const clientInfo = getClientInfo(req);

  const logData = {
    module,
    operationType,
    operationDescription,
    targetId: targetId || null,
    targetName: targetName || null,
    operatorId: operatorInfo.operatorId,
    operatorName: operatorInfo.operatorName,
    operatorRole: operatorInfo.operatorRole,
    beforeState: beforeState || null,
    afterState: afterState || null,
    result,
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
    requestId: clientInfo.requestId,
    metadata,
  };

  try {
    const operationLog = await OperationLog.create({
      recordId: generateRecordId(),
      ...logData,
    });

    logModule.debug('操作日志记录成功', {
      recordId: operationLog.recordId,
      module,
      operationType,
      targetId,
      requestId: clientInfo.requestId,
    });

    return operationLog;
  } catch (error) {
    logModule.error('记录操作日志失败', {
      error: error.message,
      module,
      operationType,
      targetId,
      requestId: clientInfo.requestId,
    });

    fallbackToFile(logData);

    return null;
  }
}

/**
 * 记录设备操作日志
 * @param {string} operationType - 操作类型
 * @param {string} operationDescription - 操作描述
 * @param {Object} params - 参数
 * @returns {Promise<Object|null>}
 */
async function logDeviceOperation(
  operationType,
  operationDescription,
  { targetId, targetName, beforeState, afterState, result, req, metadata = {} }
) {
  return logOperation({
    module: 'device',
    operationType,
    operationDescription,
    targetId,
    targetName,
    beforeState,
    afterState,
    result,
    req,
    metadata,
  });
}

/**
 * 记录用户操作日志
 * @param {string} operationType - 操作类型
 * @param {string} operationDescription - 操作描述
 * @param {Object} params - 参数
 * @returns {Promise<Object|null>}
 */
async function logUserOperation(
  operationType,
  operationDescription,
  { targetId, targetName, beforeState, afterState, result, req, metadata = {} }
) {
  return logOperation({
    module: 'user',
    operationType,
    operationDescription,
    targetId,
    targetName,
    beforeState,
    afterState,
    result,
    req,
    metadata,
  });
}

/**
 * 记录角色操作日志
 * @param {string} operationType - 操作类型
 * @param {string} operationDescription - 操作描述
 * @param {Object} params - 参数
 * @returns {Promise<Object|null>}
 */
async function logRoleOperation(
  operationType,
  operationDescription,
  { targetId, targetName, beforeState, afterState, result, req, metadata = {} }
) {
  return logOperation({
    module: 'role',
    operationType,
    operationDescription,
    targetId,
    targetName,
    beforeState,
    afterState,
    result,
    req,
    metadata,
  });
}

module.exports = {
  logOperation,
  logDeviceOperation,
  logUserOperation,
  logRoleOperation,
  generateDeviceDescription,
  buildDeviceMetadata,
};
