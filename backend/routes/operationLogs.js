const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../db');
const OperationLog = require('../models/OperationLog');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      module,
      operationType,
      targetId,
      operatorId,
      keyword,
      startDate,
      endDate,
      result,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = Math.min(parseInt(pageSize), 100);

    const where = {};

    if (module && module !== 'all') {
      where.module = module;
    }

    if (operationType && operationType !== 'all') {
      where.operationType = operationType;
    }

    if (targetId) {
      where.targetId = { [Op.like]: `%${targetId}%` };
    }

    if (operatorId) {
      where.operatorId = operatorId;
    }

    if (keyword) {
      where[Op.or] = [
        { operationDescription: { [Op.like]: `%${keyword}%` } },
        { targetName: { [Op.like]: `%${keyword}%` } },
        { operatorName: { [Op.like]: `%${keyword}%` } },
      ];
    }

    if (result && result !== 'all') {
      where.result = result;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = endOfDay;
      }
    }

    const { count, rows: logs } = await OperationLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });

    res.json({
      success: true,
      data: {
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        logs,
      },
    });
  } catch (error) {
    console.error('获取操作日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取操作日志失败',
    });
  }
});

router.get('/modules', authMiddleware, async (req, res) => {
  try {
    const modules = await OperationLog.findAll({
      attributes: ['module'],
      group: ['module'],
    });

    const moduleList = modules.map(m => ({
      value: m.module,
      label: getModuleName(m.module),
    }));

    res.json({
      success: true,
      data: moduleList,
    });
  } catch (error) {
    console.error('获取模块列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取模块列表失败',
    });
  }
});

router.get('/types', authMiddleware, async (req, res) => {
  try {
    const { module } = req.query;

    const where = {};
    if (module && module !== 'all') {
      where.module = module;
    }

    const types = await OperationLog.findAll({
      where,
      attributes: ['operationType'],
      group: ['operationType'],
    });

    const typeList = types.map(t => ({
      value: t.operationType,
      label: getOperationTypeName(t.operationType),
    }));

    res.json({
      success: true,
      data: typeList,
    });
  } catch (error) {
    console.error('获取操作类型列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取操作类型列表失败',
    });
  }
});

router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = endOfDay;
      }
    }

    const [moduleStats, typeStats, dailyStats] = await Promise.all([
      OperationLog.findAll({
        where,
        attributes: ['module', [sequelize.fn('COUNT', sequelize.col('module')), 'count']],
        group: ['module'],
      }),
      OperationLog.findAll({
        where,
        attributes: [
          'operationType',
          [sequelize.fn('COUNT', sequelize.col('operationType')), 'count'],
        ],
        group: ['operationType'],
      }),
      OperationLog.findAll({
        where,
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('COUNT', '*'), 'count'],
        ],
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'DESC']],
        limit: 30,
      }),
    ]);

    res.json({
      success: true,
      data: {
        byModule: moduleStats.map(s => ({ module: s.module, count: s.get('count') })),
        byType: typeStats.map(s => ({ type: s.operationType, count: s.get('count') })),
        byDay: dailyStats.map(s => ({ date: s.get('date'), count: s.get('count') })),
      },
    });
  } catch (error) {
    console.error('获取操作日志统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取操作日志统计失败',
    });
  }
});

router.get('/:recordId', authMiddleware, async (req, res) => {
  try {
    const log = await OperationLog.findByPk(req.params.recordId);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: '日志记录不存在',
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error('获取操作日志详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取操作日志详情失败',
    });
  }
});

function getModuleName(module) {
  const moduleNames = {
    device: '设备管理',
    user: '用户管理',
    role: '角色管理',
    consumable: '耗材管理',
    rack: '机柜管理',
    room: '机房管理',
    ticket: '工单管理',
    backup: '备份管理',
  };
  return moduleNames[module] || module;
}

function getOperationTypeName(type) {
  const typeNames = {
    create: '创建',
    update: '更新',
    delete: '删除',
    batch_delete: '批量删除',
    batch_update: '批量更新',
    status_change: '状态变更',
    move: '移动',
    permission_change: '权限变更',
    import: '导入',
    export: '导出',
  };
  return typeNames[type] || type;
}

module.exports = router;
