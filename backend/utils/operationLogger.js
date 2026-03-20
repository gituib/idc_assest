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
  logRoleOperation
};
