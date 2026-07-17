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
 * 模块中文名映射表
 */
const MODULE_LABELS = {
  device: '设备',
  idle_device: '空闲设备',
  user: '用户',
  role: '角色',
  room: '机房',
  rack: '机柜',
  cable: '线缆',
  port: '端口',
  network_card: '网卡',
  consumable: '耗材',
  ticket: '工单',
  warehouse: '库房',
  inventory: '盘点',
  auth: '认证',
  backup: '备份',
  system: '系统设置',
};

/**
 * 操作类型中文名映射表
 */
const OPERATION_TYPE_LABELS = {
  create: '创建',
  update: '更新',
  delete: '删除',
  batch_create: '批量创建',
  batch_delete: '批量删除',
  batch_update: '批量更新',
  batch_warranty_update: '批量保修更新',
  batch_to_idle: '批量转入空闲',
  batch_restore: '批量上架',
  status_change: '状态变更',
  move: '移动',
  permission_change: '权限变更',
  to_idle: '转入空闲',
  shelve: '上架',
  restore: '恢复',
  import: '导入',
  import_preview: '导入预览',
  import_records: '导入记录',
  export: '导出',
  update_position: '位置调整',
  update_layout: '更新布局',
  update_rack_position: '调整机柜位置',
  init_layout: '初始化布局',
  login: '登录',
  logout: '登出',
  register: '注册',
  unlock: '解锁',
  change_password: '修改密码',
  update_profile: '更新资料',
  upload: '上传',
  download: '下载',
  clean: '清理',
  update_settings: '更新设置',
  reset: '重置',
  maintenance_mode: '维护模式',
  backup: '备份',
  restart: '重启',
  adjust: '库存调整',
  stock_in: '入库',
  stock_out: '出库',
  start: '启动',
  check: '盘点检查',
  complete: '完成',
  sync: '同步',
  evaluate: '评价',
  process: '流程处理',
};

/**
 * 将时间格式化为可读的本地时间字符串
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的时间字符串，如 "2026-07-17 16:30:25"
 */
const formatTimestamp = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/**
 * 构建完整的操作描述
 * 格式：[操作人] 于 [时间] [动作描述] → [结果]
 * 当传入的 operationDescription 已包含完整信息时，仅补充操作人和时间
 * @param {Object} params - 参数对象
 * @param {string} params.operationDescription - 原始操作描述
 * @param {string} params.module - 模块名称
 * @param {string} params.operationType - 操作类型
 * @param {Object} params.operatorInfo - 操作人信息
 * @param {string} params.result - 操作结果
 * @param {string} params.targetName - 目标名称
 * @returns {string} 增强后的操作描述
 */
const buildFullDescription = ({
  operationDescription,
  module,
  operationType,
  operatorInfo,
  result,
  targetName,
}) => {
  const operator = operatorInfo.operatorName || '系统';
  const timestamp = formatTimestamp(new Date());
  const resultText = result === 'success' ? '成功' : '失败';

  // 原始描述为空时，使用模块+操作类型+目标名称生成默认描述
  let action = operationDescription;
  if (!action) {
    const moduleLabel = MODULE_LABELS[module] || module || '';
    const typeLabel = OPERATION_TYPE_LABELS[operationType] || operationType || '';
    const target = targetName ? `【${targetName}】` : '';
    action = `${typeLabel}${moduleLabel}${target}`;
  }

  // 组合完整描述：操作人 于 时间 动作描述 → 结果
  return `${operator} 于 ${timestamp} ${action} → ${resultText}`;
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

  // 增强操作描述：自动补充操作人、时间、结果，生成完整审计语句
  const fullDescription = buildFullDescription({
    operationDescription,
    module,
    operationType,
    operatorInfo,
    result,
    targetName,
  });

  const logData = {
    module,
    operationType,
    operationDescription: fullDescription,
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
    metadata: {
      ...metadata,
      // 保留原始动作描述，供前端详情面板单独展示
      rawDescription: operationDescription || '',
    },
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

/**
 * 记录认证操作日志（登录/登出/注册/解锁/密码修改等）
 * @param {string} operationType - 操作类型
 * @param {string} operationDescription - 操作描述
 * @param {Object} params - 参数
 * @returns {Promise<Object|null>}
 */
async function logAuthOperation(
  operationType,
  operationDescription,
  { targetId, targetName, beforeState, afterState, result, req, metadata = {} }
) {
  return logOperation({
    module: 'auth',
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
 * 记录备份操作日志（创建/恢复/上传/删除/清理/远端备份等）
 * @param {string} operationType - 操作类型
 * @param {string} operationDescription - 操作描述
 * @param {Object} params - 参数
 * @returns {Promise<Object|null>}
 */
async function logBackupOperation(
  operationType,
  operationDescription,
  { targetId, targetName, beforeState, afterState, result, req, metadata = {} }
) {
  return logOperation({
    module: 'backup',
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
 * 记录系统设置操作日志（设置变更/维护模式/重置/前端操作等）
 * @param {string} operationType - 操作类型
 * @param {string} operationDescription - 操作描述
 * @param {Object} params - 参数
 * @returns {Promise<Object|null>}
 */
async function logSystemOperation(
  operationType,
  operationDescription,
  { targetId, targetName, beforeState, afterState, result, req, metadata = {} }
) {
  return logOperation({
    module: 'system',
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
  logAuthOperation,
  logBackupOperation,
  logSystemOperation,
  generateDeviceDescription,
  buildDeviceMetadata,
};
