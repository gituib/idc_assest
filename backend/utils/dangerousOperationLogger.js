const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const DANGEROUS_OPERATIONS_LOG = path.join(LOG_DIR, 'dangerous-operations.log');

const ensureLogDir = () => {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
};

const formatLogEntry = (entry) => {
  const timestamp = new Date().toISOString();
  return JSON.stringify({
    timestamp,
    ...entry,
  }) + '\n';
};

const logDangerousOperation = async (req, {
  operationType,
  operationName,
  targetType,
  targetId,
  targetName,
  beforeState,
  metadata = {},
  success = true,
  errorMessage = null,
}) => {
  ensureLogDir();

  const clientIp = req?.ip || req?.connection?.remoteAddress || 'unknown';
  const userAgent = req?.get?.('User-Agent') || 'unknown';
  const userId = req?.user?.userId || req?.session?.userId || 'anonymous';
  const username = req?.user?.username || req?.session?.username || 'anonymous';

  const logEntry = {
    operationType,
    operationName,
    targetType,
    targetId,
    targetName,
    beforeState: beforeState ? JSON.stringify(beforeState) : null,
    metadata,
    success,
    errorMessage,
    clientIp,
    userAgent,
    userId,
    username,
    riskLevel: metadata.riskLevel || 'UNKNOWN',
    relatedDataCount: metadata.relatedDataCount || 0,
    itemCount: metadata.itemCount || 1,
  };

  try {
    fs.appendFileSync(DANGEROUS_OPERATIONS_LOG, formatLogEntry(logEntry));
    console.log(`[DANGEROUS-OP] ${logEntry.operationName} by ${logEntry.username} - ${success ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error('Failed to write dangerous operation log:', error);
  }
};

const getDangerousOperationsLogs = (filters = {}) => {
  ensureLogDir();

  if (!fs.existsSync(DANGEROUS_OPERATIONS_LOG)) {
    return [];
  }

  try {
    const content = fs.readFileSync(DANGEROUS_OPERATIONS_LOG, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    let logs = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(log => log !== null);

    if (filters.operationType) {
      logs = logs.filter(log => log.operationType === filters.operationType);
    }

    if (filters.targetType) {
      logs = logs.filter(log => log.targetType === filters.targetType);
    }

    if (filters.success !== undefined) {
      logs = logs.filter(log => log.success === filters.success);
    }

    if (filters.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
    }

    if (filters.username) {
      logs = logs.filter(log => log.username?.toLowerCase().includes(filters.username.toLowerCase()));
    }

    if (filters.riskLevel) {
      logs = logs.filter(log => log.riskLevel === filters.riskLevel);
    }

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Failed to read dangerous operations log:', error);
    return [];
  }
};

const cleanOldLogs = (daysToKeep = 90) => {
  ensureLogDir();

  if (!fs.existsSync(DANGEROUS_OPERATIONS_LOG)) {
    return { deletedCount: 0 };
  }

  try {
    const content = fs.readFileSync(DANGEROUS_OPERATIONS_LOG, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const remainingLogs = [];
    let deletedCount = 0;

    for (const line of lines) {
      try {
        const logEntry = JSON.parse(line);
        if (new Date(logEntry.timestamp) >= cutoffDate) {
          remainingLogs.push(line);
        } else {
          deletedCount++;
        }
      } catch {
        deletedCount++;
      }
    }

    fs.writeFileSync(DANGEROUS_OPERATIONS_LOG, remainingLogs.join('\n') + '\n');

    return { deletedCount, remainingCount: remainingLogs.length };
  } catch (error) {
    console.error('Failed to clean old logs:', error);
    throw error;
  }
};

const DANGEROUS_OPERATION_TYPES = {
  DELETE_SINGLE: 'DELETE_SINGLE',
  DELETE_BATCH: 'DELETE_BATCH',
  DELETE_ALL: 'DELETE_ALL',
  UPDATE_BATCH: 'UPDATE_BATCH',
  RESTORE: 'RESTORE',
  PURGE: 'PURGE',
  BATCH_RESTORE: 'BATCH_RESTORE',
};

const RISK_LEVELS = {
  EXTREME: 'EXTREME',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

const calculateRiskLevel = (operationType, itemCount, options = {}) => {
  const { hasRelatedData = false, isSystemLevel = false } = options;

  if (operationType === DANGEROUS_OPERATION_TYPES.DELETE_ALL || isSystemLevel) {
    return RISK_LEVELS.EXTREME;
  }

  if (operationType === DANGEROUS_OPERATION_TYPES.DELETE_BATCH) {
    if (itemCount > 10) {
      return RISK_LEVELS.EXTREME;
    }
    return itemCount > 3 ? RISK_LEVELS.HIGH : RISK_LEVELS.MEDIUM;
  }

  if (hasRelatedData) {
    return RISK_LEVELS.MEDIUM;
  }

  return RISK_LEVELS.LOW;
};

module.exports = {
  logDangerousOperation,
  getDangerousOperationsLogs,
  cleanOldLogs,
  DANGEROUS_OPERATION_TYPES,
  RISK_LEVELS,
  calculateRiskLevel,
};
