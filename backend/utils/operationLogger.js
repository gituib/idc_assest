const OperationLog = require('../models/OperationLog');

const generateRecordId = () => {
  return `OPLOG_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
};

const getOperatorInfo = (req) => {
  if (!req || !req.user) {
    return {
      operatorId: 'system',
      operatorName: '系统',
      operatorRole: null
    };
  }
  return {
    operatorId: req.user.userId || req.user.id || 'unknown',
    operatorName: req.user.realName || req.user.username || '未知用户',
    operatorRole: req.user.roleName || req.user.role || null
  };
};

const getClientInfo = (req) => {
  if (!req) {
    return { ipAddress: null, userAgent: null };
  }
  const ipAddress = req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.ip ||
    null;
  const userAgent = req.headers['user-agent'] || null;
  return { ipAddress, userAgent };
};

const DEVICE_TYPE_MAP = {
  server: '服务器',
  switch: '交换机',
  router: '路由器',
  storage: '存储设备',
  firewall: '防火墙',
  loadbalancer: '负载均衡器',
  other: '其他设备'
};

const generateDeviceDescription = (operation, device, options = {}) => {
  const {
    includeRack = true,
    includePosition = true,
    includeSerial = true,
    includeIp = true,
    includeModel = true
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
    ...extra
  };
};

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
  metadata = {}
}) {
  try {
    const operatorInfo = getOperatorInfo(req);
    const clientInfo = getClientInfo(req);

    await OperationLog.create({
      recordId: generateRecordId(),
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
      metadata
    });
  } catch (error) {
    console.error('记录操作日志失败:', error);
  }
}

async function logDeviceOperation(operationType, operationDescription, { targetId, targetName, beforeState, afterState, result, req, metadata = {} }) {
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
    metadata
  });
}

async function logUserOperation(operationType, operationDescription, { targetId, targetName, beforeState, afterState, result, req, metadata = {} }) {
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
    metadata
  });
}

async function logRoleOperation(operationType, operationDescription, { targetId, targetName, beforeState, afterState, result, req, metadata = {} }) {
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
    metadata
  });
}

module.exports = {
  logOperation,
  logDeviceOperation,
  logUserOperation,
  logRoleOperation,
  generateDeviceDescription,
  buildDeviceMetadata
};
