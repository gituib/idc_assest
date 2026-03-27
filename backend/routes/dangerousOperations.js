const express = require('express');
const router = express.Router();
const {
  logDangerousOperation,
  getDangerousOperationsLogs,
  cleanOldLogs,
  DANGEROUS_OPERATION_TYPES,
  RISK_LEVELS,
  calculateRiskLevel,
} = require('../utils/dangerousOperationLogger');

router.post('/log', async (req, res) => {
  try {
    const {
      operationType,
      operationName,
      targetType,
      targetId,
      targetName,
      beforeState,
      metadata = {},
      success = true,
      errorMessage = null,
    } = req.body;

    if (!operationType || !operationName) {
      return res.status(400).json({ error: '缺少必需参数 operationType 或 operationName' });
    }

    const riskLevel =
      metadata.riskLevel ||
      calculateRiskLevel(operationType, metadata.itemCount || 1, {
        hasRelatedData: metadata.relatedDataCount > 0,
        isSystemLevel: metadata.isSystemLevel,
      });

    await logDangerousOperation(req, {
      operationType,
      operationName,
      targetType,
      targetId,
      targetName,
      beforeState,
      metadata: {
        ...metadata,
        riskLevel,
      },
      success,
      errorMessage,
    });

    res.json({ success: true, riskLevel });
  } catch (error) {
    console.error('Failed to log dangerous operation:', error);
    res.status(500).json({ error: '日志记录失败' });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const {
      operationType,
      targetType,
      success,
      startDate,
      endDate,
      username,
      riskLevel,
      page = 1,
      pageSize = 50,
    } = req.query;

    const filters = {
      operationType,
      targetType,
      success: success !== undefined ? success === 'true' : undefined,
      startDate,
      endDate,
      username,
      riskLevel,
    };

    const allLogs = getDangerousOperationsLogs(filters);
    const total = allLogs.length;
    const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
    const endIndex = startIndex + parseInt(pageSize);
    const logs = allLogs.slice(startIndex, endIndex);

    res.json({
      logs,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize)),
    });
  } catch (error) {
    console.error('Failed to get dangerous operations logs:', error);
    res.status(500).json({ error: '获取日志失败' });
  }
});

router.delete('/logs/clean', async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.query;

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: '只有管理员才能清理日志' });
    }

    const result = await cleanOldLogs(parseInt(daysToKeep));

    await logDangerousOperation(req, {
      operationType: DANGEROUS_OPERATION_TYPES.PURGE,
      operationName: '清理危险操作日志',
      targetType: 'operation_logs',
      targetId: null,
      targetName: `清理 ${daysToKeep} 天前的日志`,
      metadata: {
        riskLevel: RISK_LEVELS.MEDIUM,
        deletedCount: result.deletedCount,
        remainingCount: result.remainingCount,
        daysToKeep: parseInt(daysToKeep),
      },
      success: true,
    });

    res.json({
      success: true,
      message: `已清理 ${result.deletedCount} 条过期日志，保留 ${result.remainingCount} 条日志`,
      deletedCount: result.deletedCount,
      remainingCount: result.remainingCount,
    });
  } catch (error) {
    console.error('Failed to clean logs:', error);
    res.status(500).json({ error: '清理日志失败' });
  }
});

router.get('/risk-assessment', async (req, res) => {
  try {
    const { operationType, itemCount, hasRelatedData, isSystemLevel } = req.query;

    const riskLevel = calculateRiskLevel(operationType, parseInt(itemCount) || 1, {
      hasRelatedData: hasRelatedData === 'true',
      isSystemLevel: isSystemLevel === 'true',
    });

    const riskDescriptions = {
      [RISK_LEVELS.EXTREME]: '极高风险操作，需要输入确认关键词才能执行',
      [RISK_LEVELS.HIGH]: '高风险操作，需要详细确认信息',
      [RISK_LEVELS.MEDIUM]: '中等风险操作，需要明确确认',
      [RISK_LEVELS.LOW]: '低风险操作，使用标准确认即可',
    };

    res.json({
      riskLevel,
      description: riskDescriptions[riskLevel],
      requiresKeyword: riskLevel === RISK_LEVELS.EXTREME,
      confirmationLevel:
        riskLevel === RISK_LEVELS.EXTREME
          ? 'KEYWORD'
          : riskLevel === RISK_LEVELS.HIGH
            ? 'ENHANCED'
            : 'STANDARD',
    });
  } catch (error) {
    console.error('Failed to assess risk:', error);
    res.status(500).json({ error: '风险评估失败' });
  }
});

module.exports = router;
