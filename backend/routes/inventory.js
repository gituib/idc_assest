const logger = require('../utils/logger').module('InventoryRoute');
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize, dbDialect } = require('../db');
const InventoryPlan = require('../models/InventoryPlan');
const InventoryTask = require('../models/InventoryTask');
const InventoryRecord = require('../models/InventoryRecord');
const Device = require('../models/Device');
const Rack = require('../models/Rack');
const Room = require('../models/Room');
const User = require('../models/User');
const PendingDevice = require('../models/PendingDevice');
const { authMiddleware, authorize } = require('../middleware/auth');
const { PAGINATION } = require('../config');
const { generateId } = require('../utils/idGenerator');
const { logOperation } = require('../utils/operationLogger');

/**
 * 记录库存操作日志
 * @param {string} operationType - 操作类型
 * @param {string} operationDescription - 操作描述
 * @param {Object} params - 参数
 * @returns {Promise<Object|null>}
 */
const logInventoryOperation = (operationType, operationDescription, params) =>
  logOperation({ module: 'inventory', operationType, operationDescription, ...params });

InventoryTask.belongsTo(InventoryPlan, { foreignKey: 'planId', as: 'Plan' });
InventoryPlan.hasMany(InventoryTask, { foreignKey: 'planId', as: 'Tasks' });
InventoryTask.belongsTo(User, { foreignKey: 'assignedTo', as: 'Assignee' });
InventoryRecord.belongsTo(InventoryTask, { foreignKey: 'taskId', as: 'Task' });
InventoryTask.hasMany(InventoryRecord, { foreignKey: 'taskId', as: 'Records' });
InventoryRecord.belongsTo(InventoryPlan, { foreignKey: 'planId', as: 'Plan' });
InventoryPlan.hasMany(InventoryRecord, { foreignKey: 'planId', as: 'Records' });
InventoryRecord.belongsTo(Device, { foreignKey: 'deviceId', as: 'Device' });
InventoryRecord.belongsTo(User, { foreignKey: 'checkedBy', as: 'Checker' });

function generatePlanId() {
  return generateId({ prefix: 'PLAN' });
}

function generateTaskId() {
  return generateId({ prefix: 'TASK' });
}

function generateRecordId() {
  return generateId({ prefix: 'REC' });
}

router.use(authMiddleware);

router.get('/plans', async (req, res) => {
  try {
    const { status, page = 1, pageSize = PAGINATION.DEFAULT_PAGE_SIZE, keyword } = req.query;
    const offset = (page - 1) * pageSize;
    const where = {};

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const { count, rows } = await InventoryPlan.findAndCountAll({
      where,
      include: [
        {
          model: require('../models/User'),
          as: 'Creator',
          attributes: ['userId', 'username', 'realName'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset: parseInt(offset),
    });

    res.json({
      plans: rows,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/plans/:planId', async (req, res) => {
  try {
    const plan = await InventoryPlan.findByPk(req.params.planId, {
      include: [
        {
          model: require('../models/User'),
          as: 'Creator',
          attributes: ['userId', 'username', 'realName'],
        },
      ],
    });

    if (!plan) {
      return res.status(404).json({ error: '盘点计划不存在' });
    }

    const tasks = await InventoryTask.findAll({
      where: { planId: plan.planId },
      include: [
        {
          model: require('../models/User'),
          as: 'Assignee',
          attributes: ['userId', 'username', 'realName'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    res.json({ plan, tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/plans', async (req, res) => {
  try {
    const { name, type, description, scheduledDate, targetRooms, targetRacks } = req.body;

    const plan = await InventoryPlan.create({
      planId: generatePlanId(),
      name,
      type: type || 'full',
      description,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      targetRooms: targetRooms || [],
      targetRacks: targetRacks || [],
      status: 'draft',
      createdBy: req.user?.userId,
    });

    await logInventoryOperation('create', `创建盘点计划【${plan.name}】`, {
      targetId: plan.planId,
      targetName: plan.name,
      afterState: { status: plan.status, type: plan.type, scheduledDate: plan.scheduledDate },
      req,
      metadata: { targetRooms: plan.targetRooms, targetRacks: plan.targetRacks },
    });

    res.status(201).json(plan);
  } catch (error) {
    await logInventoryOperation('create', '创建盘点计划失败', {
      targetName: req.body?.name,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

router.put('/plans/:planId', async (req, res) => {
  try {
    const plan = await InventoryPlan.findByPk(req.params.planId);
    if (!plan) {
      return res.status(404).json({ error: '盘点计划不存在' });
    }

    const beforeState = {
      name: plan.name,
      type: plan.type,
      description: plan.description,
      scheduledDate: plan.scheduledDate,
      targetRooms: plan.targetRooms,
      targetRacks: plan.targetRacks,
      status: plan.status,
    };

    const { name, type, description, scheduledDate, targetRooms, targetRacks, status } = req.body;

    await plan.update({
      name: name || plan.name,
      type: type || plan.type,
      description: description !== undefined ? description : plan.description,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : plan.scheduledDate,
      targetRooms: Array.isArray(targetRooms) ? targetRooms : plan.targetRooms,
      targetRacks: Array.isArray(targetRacks) ? targetRacks : plan.targetRacks,
      status: status !== undefined ? status : plan.status,
    });

    await logInventoryOperation('update', `更新盘点计划【${plan.name}】`, {
      targetId: plan.planId,
      targetName: plan.name,
      beforeState,
      afterState: {
        name: plan.name,
        type: plan.type,
        description: plan.description,
        scheduledDate: plan.scheduledDate,
        targetRooms: plan.targetRooms,
        targetRacks: plan.targetRacks,
        status: plan.status,
      },
      req,
      metadata: {},
    });

    res.json(plan);
  } catch (error) {
    await logInventoryOperation('update', '更新盘点计划失败', {
      targetId: req.params?.planId,
      targetName: req.body?.name,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/plans/:planId', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const plan = await InventoryPlan.findByPk(req.params.planId, { transaction });
    if (!plan) {
      await transaction.rollback();
      return res.status(404).json({ error: '盘点计划不存在' });
    }

    // 状态保护：进行中不可删除，避免孤儿 task/record 及盘点数据被破坏
    if (plan.status === 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({
        error: '盘点进行中，不可删除，请先完成盘点或中止后再删除',
      });
    }

    const beforeState = {
      planId: plan.planId,
      name: plan.name,
      status: plan.status,
      type: plan.type,
    };

    // 事务保护：record/task/plan 三表删除原子性
    await InventoryRecord.destroy({ where: { planId: plan.planId }, transaction });
    await InventoryTask.destroy({ where: { planId: plan.planId }, transaction });
    await plan.destroy({ transaction });

    await transaction.commit();

    await logInventoryOperation('delete', `删除盘点计划【${plan.name}】`, {
      targetId: plan.planId,
      targetName: plan.name,
      beforeState,
      req,
      metadata: {},
    });

    res.json({ message: '盘点计划删除成功' });
  } catch (error) {
    await transaction.rollback();
    logger.error('删除盘点计划错误', { error: error.message, stack: error.stack });
    await logInventoryOperation('delete', '删除盘点计划失败', {
      targetId: req.params?.planId,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

router.post('/plans/:planId/start', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    // 原子抢占：UPDATE ... WHERE status IN ('draft','pending')
    // 任一请求抢到后，其他并发请求因 status 不匹配而 affectedCount=0
    // 所有数据库（SQLite/MySQL）通用，不依赖行锁语义
    const [affectedCount] = await InventoryPlan.update(
      { status: 'in_progress' },
      {
        where: {
          planId: req.params.planId,
          status: { [Op.in]: ['draft', 'pending'] },
        },
        transaction,
      }
    );

    if (affectedCount === 0) {
      // 区分两种情况：plan 不存在 / 已被别的请求抢先启动
      const exists = await InventoryPlan.findByPk(req.params.planId, {
        attributes: ['planId', 'status'],
        transaction,
      });
      await transaction.rollback();
      if (!exists) {
        return res.status(404).json({ error: '盘点计划不存在' });
      }
      return res.status(409).json({ error: '盘点计划正在启动或已启动，请勿重复操作' });
    }

    // 此时该 plan 已变为 in_progress，其他并发请求都会因 status 不匹配而失败
    const plan = await InventoryPlan.findByPk(req.params.planId, { transaction });

    const beforeState = {
      status: 'draft', // 抢占前必为 draft/pending
      totalDevices: plan.totalDevices,
      checkedDevices: plan.checkedDevices,
    };

    const targetRooms = plan.targetRooms || [];
    const targetRacks = plan.targetRacks || [];
    let allDevices = [];

    if (targetRacks.length > 0) {
      allDevices = await Device.findAll({
        where: { rackId: { [Op.in]: targetRacks } },
        transaction,
      });
    } else if (targetRooms.length > 0) {
      const racksInRooms = await Rack.findAll({
        where: { roomId: { [Op.in]: targetRooms } },
        attributes: ['rackId'],
        transaction,
      });
      const rackIds = racksInRooms.map(r => r.rackId);
      allDevices = await Device.findAll({
        where: { rackId: { [Op.in]: rackIds } },
        transaction,
      });
    } else {
      allDevices = await Device.findAll({ transaction });
    }

    const taskId = generateTaskId();

    const tasksToCreate = [
      {
        taskId,
        planId: plan.planId,
        targetType: 'all',
        targetId: 'all',
        targetName: '全部设备',
        status: 'pending',
        totalDevices: allDevices.length,
      },
    ];

    const recordsToCreate = allDevices.map(device => ({
      recordId: generateRecordId(),
      taskId,
      planId: plan.planId,
      deviceId: device.deviceId,
      deviceName: device.name,
      deviceType: device.type,
      serialNumber: device.serialNumber,
      rackId: device.rackId,
      position: device.position,
      status: 'pending',
    }));

    await InventoryTask.bulkCreate(tasksToCreate, {
      individualHooks: false,
      transaction,
    });

    if (recordsToCreate.length > 0) {
      // 分批 bulkCreate，避免单次 SQL 超出变量数限制（SQLite 默认 999）
      // 每批 500 条，事务内串行执行
      const BATCH_SIZE = 500;
      for (let i = 0; i < recordsToCreate.length; i += BATCH_SIZE) {
        await InventoryRecord.bulkCreate(recordsToCreate.slice(i, i + BATCH_SIZE), {
          individualHooks: false,
          transaction,
        });
      }
    }

    // 抢占时已设为 in_progress，这里补全统计字段
    await plan.update(
      {
        totalDevices: allDevices.length,
        checkedDevices: 0,
        normalDevices: 0,
        abnormalDevices: 0,
        missedDevices: allDevices.length,
      },
      { transaction }
    );

    await transaction.commit();

    await logInventoryOperation('start', `启动盘点计划【${plan.name}】`, {
      targetId: plan.planId,
      targetName: plan.name,
      beforeState,
      afterState: {
        status: plan.status,
        totalDevices: plan.totalDevices,
        checkedDevices: plan.checkedDevices,
      },
      req,
      metadata: { taskCount: tasksToCreate.length, deviceCount: allDevices.length, taskId },
    });

    res.json({
      message: '盘点任务已启动',
      taskCount: tasksToCreate.length,
      deviceCount: allDevices.length,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('启动盘点错误', { error: error.message, stack: error.stack });
    await logInventoryOperation('start', '启动盘点计划失败', {
      targetId: req.params?.planId,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

router.get('/tasks/:taskId', async (req, res) => {
  try {
    const task = await InventoryTask.findByPk(req.params.taskId, {
      include: [
        { model: InventoryPlan, as: 'Plan', attributes: ['planId', 'name'] },
        {
          model: require('../models/User'),
          as: 'Assignee',
          attributes: ['userId', 'username', 'realName'],
        },
      ],
    });

    if (!task) {
      return res.status(404).json({ error: '盘点任务不存在' });
    }

    const records = await InventoryRecord.findAll({
      where: { taskId: task.taskId },
      include: [
        {
          model: Device,
          as: 'Device',
          attributes: ['deviceId', 'name', 'type', 'serialNumber', 'rackId', 'position'],
        },
        {
          model: require('../models/User'),
          as: 'Checker',
          attributes: ['userId', 'username', 'realName'],
        },
      ],
    });

    const rackIds = [...new Set(records.map(r => r.rackId).filter(Boolean))];
    const racks = await Rack.findAll({
      where: { rackId: rackIds },
      include: [{ model: Room, as: 'Room' }],
    });
    const rackMap = {};
    racks.forEach(r => {
      rackMap[r.rackId] = r;
    });

    const enrichedRecords = records.map(record => {
      const rackInfo = rackMap[record.rackId];
      const roomName = rackInfo?.Room?.name || '';
      const rackName = rackInfo?.name || record.rackId || '';
      const position = record.position || '';

      return {
        ...record.toJSON(),
        displayLocation: roomName
          ? `${roomName} - ${rackName} - U${position}`
          : `${rackName} - U${position}`,
      };
    });

    res.json({ task, records: enrichedRecords });
  } catch (error) {
    logger.error('获取盘点任务记录错误', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

router.put('/tasks/:taskId', async (req, res) => {
  try {
    const task = await InventoryTask.findByPk(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: '盘点任务不存在' });
    }

    const beforeState = {
      assignedTo: task.assignedTo,
      assignedAt: task.assignedAt,
      status: task.status,
      completedAt: task.completedAt,
    };

    const { assignedTo, status } = req.body;

    if (assignedTo !== undefined) {
      await task.update({
        assignedTo,
        assignedAt: assignedTo ? new Date() : task.assignedAt,
      });
    }

    if (status) {
      await task.update({
        status,
        completedAt: status === 'completed' ? new Date() : null,
      });
    }

    await logInventoryOperation('update', `更新盘点任务【${task.taskId}】`, {
      targetId: task.taskId,
      targetName: task.targetName,
      beforeState,
      afterState: {
        assignedTo: task.assignedTo,
        assignedAt: task.assignedAt,
        status: task.status,
        completedAt: task.completedAt,
      },
      req,
      metadata: { planId: task.planId },
    });

    res.json(task);
  } catch (error) {
    await logInventoryOperation('update', '更新盘点任务失败', {
      targetId: req.params?.taskId,
      result: 'failed',
      req,
      metadata: { error: error.message, body: req.body },
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * 通过 SQL GROUP BY 聚合统计 records 的状态分布
 * 避免把全表加载到内存再 filter（大数据量时内存暴涨 + N 次遍历）
 * @param {Object} where - 查询条件
 * @param {Object} transaction - 事务
 * @returns {Promise<{totalDevices:number, checkedDevices:number, normalDevices:number, abnormalDevices:number, missedDevices:number}>}
 */
async function aggregateStatsByStatus(where, transaction) {
  const groups = await InventoryRecord.findAll({
    where,
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('status')), 'count'],
    ],
    group: ['status'],
    raw: true,
    transaction,
  });
  const counts = { pending: 0, normal: 0, abnormal: 0, not_found: 0, missed: 0 };
  groups.forEach(g => {
    counts[g.status] = parseInt(g.count, 10) || 0;
  });
  const totalDevices = counts.pending + counts.normal + counts.abnormal + counts.not_found + counts.missed;
  // pending + missed 都算作未盘点（missed 在 plan.complete 时由 pending 转换而来）
  const pendingCount = counts.pending + counts.missed;
  return {
    totalDevices,
    checkedDevices: counts.normal + counts.abnormal + counts.not_found,
    normalDevices: counts.normal,
    abnormalDevices: counts.abnormal,
    missedDevices: pendingCount,
  };
}

/**
 * 根据统计数据推导 task/plan 应有的状态
 * - 未开始（无任何已盘点记录）：pending
 * - 部分盘点：in_progress
 * - 全部盘点完成：completed
 * @param {Object} stats - aggregateStatsByStatus 返回的统计
 * @param {string} currentStatus - 当前状态（避免已 completed 的被回退）
 * @returns {string} 推导出的状态
 */
function deriveStatusFromStats(stats, currentStatus) {
  if (stats.totalDevices === 0) return currentStatus || 'pending';
  if (stats.missedDevices === 0) return 'completed';
  if (stats.checkedDevices > 0) return 'in_progress';
  return currentStatus || 'pending';
}

/**
 * 批量盘点记录（一键正常/异常/未找到）
 * 单事务批量更新，只聚合统计一次 task/plan，避免 N 次并发请求导致的超时与锁竞争
 * @route POST /api/inventory/records/batch-check
 */
router.post('/records/batch-check', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { recordIds, status, remark } = req.body;

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return res.status(400).json({ error: '未提供需要盘点的记录' });
    }
    if (!['normal', 'abnormal', 'not_found'].includes(status)) {
      return res.status(400).json({ error: '无效的盘点状态' });
    }

    // 只取统计/日志需要的少量字段，不 include Device（避免大数据量时加载完整关联）
    // 仅查询 pending 状态的记录，自动过滤已盘点的记录（API 层重复盘点防护）
    const records = await InventoryRecord.findAll({
      where: { recordId: { [Op.in]: recordIds }, status: 'pending' },
      attributes: ['recordId', 'taskId', 'planId', 'deviceName'],
      transaction,
    });

    if (records.length === 0) {
      await transaction.rollback();
      return res.status(409).json({ error: '所选记录均已盘点或不存在，无需重复操作' });
    }

    const now = new Date();
    const checkedBy = req.user?.userId;
    // 一键批量场景未提供具体差异字段，abnormal 仅标记状态；not_found 固定为设备丢失
    const abnormalType = status === 'not_found' ? 'device_missing' : null;

    // 单条 UPDATE ... WHERE recordId IN (...) 一次性批量更新，N 次 SQL 降为 1 次
    await InventoryRecord.update(
      {
        status,
        abnormalType,
        checkedBy,
        checkedAt: now,
        remark: remark || null,
      },
      {
        where: { recordId: { [Op.in]: recordIds } },
        transaction,
      }
    );

    // SQL GROUP BY 聚合统计涉及的 task（通常只有一个），避免全表加载到内存
    const taskIds = [...new Set(records.map(r => r.taskId))];
    const taskStatsMap = {};
    for (const taskId of taskIds) {
      const stats = await aggregateStatsByStatus({ taskId }, transaction);
      taskStatsMap[taskId] = stats;
      const task = await InventoryTask.findByPk(taskId, { transaction });
      if (task) {
        // 同步推导 status：全部盘点完成 → completed；有盘点记录 → in_progress
        const derivedStatus = deriveStatusFromStats(stats, task.status);
        await task.update(
          {
            ...stats,
            status: derivedStatus,
            completedAt: derivedStatus === 'completed' ? task.completedAt || new Date() : null,
          },
          { transaction }
        );
      }
    }

    // SQL GROUP BY 聚合统计涉及的 plan（通常只有一个）
    const planIds = [...new Set(records.map(r => r.planId))];
    const planStatsMap = {};
    for (const planId of planIds) {
      const stats = await aggregateStatsByStatus({ planId }, transaction);
      planStatsMap[planId] = stats;
      const plan = await InventoryPlan.findByPk(planId, { transaction });
      if (plan) {
        const derivedStatus = deriveStatusFromStats(stats, plan.status);
        await plan.update(
          {
            ...stats,
            status: derivedStatus,
            completedDate:
              derivedStatus === 'completed' ? plan.completedDate || new Date() : null,
          },
          { transaction }
        );
      }
    }

    await transaction.commit();

    const statusLabel = { normal: '正常', abnormal: '异常', not_found: '未找到' }[status];
    await logInventoryOperation('check', `批量盘点 ${records.length} 条记录（${statusLabel}）`, {
      targetId: records[0].recordId,
      targetName: records[0].deviceName,
      req,
      metadata: {
        recordIds: records.map(r => r.recordId),
        count: records.length,
        status,
        taskIds,
        planIds,
        taskStatsMap,
        planStatsMap,
      },
    });

    res.json({
      message: `已批量标记 ${records.length} 条记录`,
      updatedCount: records.length,
      taskStats: taskStatsMap,
      planStats: planStatsMap,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('批量盘点记录失败', { error: error.message, stack: error.stack });
    await logInventoryOperation('check', '批量盘点记录失败', {
      result: 'failed',
      req,
      metadata: { error: error.message, body: req.body },
    });
    res.status(500).json({ error: error.message });
  }
});

router.post('/records/:recordId/check', async (req, res) => {
  try {
    const record = await InventoryRecord.findByPk(req.params.recordId, {
      include: [{ model: Device, as: 'Device' }],
    });

    if (!record) {
      return res.status(404).json({ error: '盘点记录不存在' });
    }

    // API 层重复盘点防护：已盘点的记录不可再次盘点
    if (record.status !== 'pending') {
      return res.status(409).json({
        error: `该记录已盘点（当前状态：${record.status}），不可重复盘点`,
      });
    }

    const beforeState = {
      status: record.status,
      actualSerialNumber: record.actualSerialNumber,
      actualRackId: record.actualRackId,
      actualPosition: record.actualPosition,
      abnormalType: record.abnormalType,
      checkedBy: record.checkedBy,
      checkedAt: record.checkedAt,
    };

    const { actualSerialNumber, actualRackId, actualPosition, status, remark, photoUrl } = req.body;

    let abnormalType = null;
    if (status === 'abnormal') {
      if (actualSerialNumber && actualSerialNumber !== record.serialNumber) {
        abnormalType = 'serial_mismatch';
      } else if (actualRackId && actualRackId !== record.rackId) {
        abnormalType = 'position_mismatch';
      }
    } else if (status === 'not_found') {
      abnormalType = 'device_missing';
    }

    await record.update({
      actualSerialNumber: actualSerialNumber || null,
      actualRackId: actualRackId || null,
      actualPosition: actualPosition || null,
      status: status || record.status,
      abnormalType,
      checkedBy: req.user?.userId,
      checkedAt: new Date(),
      remark: remark || null,
      photoUrl: photoUrl || null,
    });

    const task = await InventoryTask.findByPk(record.taskId);
    const plan = await InventoryPlan.findByPk(record.planId);

    // 复用 SQL GROUP BY 聚合，避免全表加载到内存
    const taskStats = await aggregateStatsByStatus({ taskId: task.taskId });

    // 同步推导 task 状态
    const taskDerivedStatus = deriveStatusFromStats(taskStats, task.status);
    await task.update({
      ...taskStats,
      status: taskDerivedStatus,
      completedAt: taskDerivedStatus === 'completed' ? task.completedAt || new Date() : null,
    });

    const planStats = await aggregateStatsByStatus({ planId: plan.planId });

    // 同步推导 plan 状态
    const planDerivedStatus = deriveStatusFromStats(planStats, plan.status);
    await plan.update({
      ...planStats,
      status: planDerivedStatus,
      completedDate: planDerivedStatus === 'completed' ? plan.completedDate || new Date() : null,
    });

    await logInventoryOperation('check', `盘点记录【${record.deviceName || record.recordId}】`, {
      targetId: record.recordId,
      targetName: record.deviceName,
      beforeState,
      afterState: {
        status: record.status,
        actualSerialNumber: record.actualSerialNumber,
        actualRackId: record.actualRackId,
        actualPosition: record.actualPosition,
        abnormalType: record.abnormalType,
        checkedBy: record.checkedBy,
        checkedAt: record.checkedAt,
      },
      req,
      metadata: {
        taskId: record.taskId,
        planId: record.planId,
        deviceId: record.deviceId,
        taskStats,
        planStats,
      },
    });

    res.json({ record, taskStats, planStats });
  } catch (error) {
    await logInventoryOperation('check', '盘点记录检查失败', {
      targetId: req.params?.recordId,
      result: 'failed',
      req,
      metadata: { error: error.message, body: req.body },
    });
    res.status(500).json({ error: error.message });
  }
});

router.get('/records', async (req, res) => {
  try {
    const { planId, taskId, status, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    const where = {};

    if (planId) {
      where.planId = planId;
    }
    if (taskId) {
      where.taskId = taskId;
    }
    if (status) {
      where.status = status;
    }

    const { count, rows } = await InventoryRecord.findAndCountAll({
      where,
      include: [
        {
          model: Device,
          as: 'Device',
          attributes: ['deviceId', 'name', 'type', 'serialNumber', 'rackId', 'position'],
        },
        {
          model: require('../models/User'),
          as: 'Checker',
          attributes: ['userId', 'username', 'realName'],
        },
      ],
      order: [
        ['checkedAt', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: parseInt(pageSize),
      offset: parseInt(offset),
    });

    res.json({
      records: rows,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/plans/:planId/complete', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const plan = await InventoryPlan.findByPk(req.params.planId, { transaction });

    if (!plan) {
      await transaction.rollback();
      return res.status(404).json({ error: '盘点计划不存在' });
    }

    // 状态保护：仅 in_progress 状态可完成；已 completed 直接返回成功（幂等）
    if (plan.status === 'completed') {
      await transaction.rollback();
      return res.json({ message: '盘点已完成', plan });
    }
    if (plan.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({ error: `当前状态（${plan.status}）不可完成，需先启动盘点` });
    }

    const beforeState = {
      status: plan.status,
      checkedDevices: plan.checkedDevices,
      normalDevices: plan.normalDevices,
      abnormalDevices: plan.abnormalDevices,
      missedDevices: plan.missedDevices,
    };

    // 完成前先统计 pending 数量，用于返回提示信息
    const pendingCount = await InventoryRecord.count({
      where: { planId: plan.planId, status: 'pending' },
      transaction,
    });

    // 把剩余 pending 记录标记为 missed（未盘点）
    if (pendingCount > 0) {
      await InventoryRecord.update(
        { status: 'missed' },
        {
          where: { planId: plan.planId, status: 'pending' },
          transaction,
        }
      );
    }

    // 复用 SQL GROUP BY 聚合，避免全表加载到内存
    const finalStats = await aggregateStatsByStatus({ planId: plan.planId }, transaction);

    await plan.update(
      {
        ...finalStats,
        status: 'completed',
        completedDate: new Date(),
      },
      { transaction }
    );

    // 同步完成所有未完成的 task
    await InventoryTask.update(
      { status: 'completed' },
      {
        where: { planId: plan.planId, status: { [Op.ne]: 'completed' } },
        transaction,
      }
    );

    await transaction.commit();

    await logInventoryOperation('complete', `完成盘点计划【${plan.name}】`, {
      targetId: plan.planId,
      targetName: plan.name,
      beforeState,
      afterState: {
        status: plan.status,
        checkedDevices: plan.checkedDevices,
        normalDevices: plan.normalDevices,
        abnormalDevices: plan.abnormalDevices,
        missedDevices: plan.missedDevices,
        completedDate: plan.completedDate,
      },
      req,
      metadata: {
        totalRecords: finalStats.totalDevices,
        missedPendingCount: pendingCount,
      },
    });

    res.json({
      message:
        pendingCount > 0
          ? `盘点已完成，其中 ${pendingCount} 条未盘点的记录已标记为遗漏`
          : '盘点已完成',
      plan,
      missedPendingCount: pendingCount,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('完成盘点计划错误', { error: error.message, stack: error.stack });
    await logInventoryOperation('complete', '完成盘点计划失败', {
      targetId: req.params?.planId,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats/dashboard', async (req, res) => {
  try {
    const totalPlans = await InventoryPlan.count();
    const completedPlans = await InventoryPlan.count({ where: { status: 'completed' } });
    const inProgressPlans = await InventoryPlan.count({ where: { status: 'in_progress' } });

    const totalRecords = await InventoryRecord.count();
    const normalRecords = await InventoryRecord.count({ where: { status: 'normal' } });
    const abnormalRecords = await InventoryRecord.count({ where: { status: 'abnormal' } });
    const pendingRecords = await InventoryRecord.count({ where: { status: 'pending' } });

    const recentPlans = await InventoryPlan.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: require('../models/User'),
          as: 'Creator',
          attributes: ['userId', 'username', 'realName'],
        },
      ],
    });

    res.json({
      totalPlans,
      completedPlans,
      inProgressPlans,
      totalRecords,
      normalRecords,
      abnormalRecords,
      pendingRecords,
      completionRate:
        totalRecords > 0
          ? (((normalRecords + abnormalRecords) / totalRecords) * 100).toFixed(1)
          : 0,
      abnormalRate: totalRecords > 0 ? ((abnormalRecords / totalRecords) * 100).toFixed(1) : 0,
      recentPlans,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/quick-add-device', async (req, res) => {
  try {
    const {
      taskId,
      planId,
      serialNumber,
      SN,
      deviceName,
      name,
      deviceType,
      type,
      roomId,
      rackId,
      position,
      model,
      brand,
      height,
      powerConsumption,
      ipAddress,
      purchaseDate,
      warrantyExpiry,
      description,
      remark,
      ...restFields
    } = req.body;

    // 字段名映射：优先使用数据库字段名，其次使用默认字段名
    const finalSerialNumber = serialNumber || SN;
    const finalDeviceName = name || deviceName;
    const finalDeviceType = type || deviceType;

    if (!planId || !finalSerialNumber) {
      return res.status(400).json({ error: '缺少必要参数：planId, serialNumber' });
    }

    const plan = await InventoryPlan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ error: '盘点计划不存在' });
    }

    const existingDevice = await Device.findOne({ where: { serialNumber: finalSerialNumber } });
    if (existingDevice) {
      return res
        .status(400)
        .json({ error: '该序列号的设备已存在于设备管理中', deviceId: existingDevice.deviceId });
    }

    const existingPending = await PendingDevice.findOne({
      where: { serialNumber: finalSerialNumber, status: 'pending' },
    });
    if (existingPending) {
      return res
        .status(400)
        .json({ error: '该序列号的设备已在暂存列表中', pendingId: existingPending.pendingId });
    }

    const pendingId = `PEND${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // 只有当用户没有填写设备名称时，才使用默认名称
    const finalName =
      finalDeviceName && finalDeviceName.trim() !== ''
        ? finalDeviceName.trim()
        : `新设备-${finalSerialNumber.slice(-6)}`;

    const pendingDevice = await PendingDevice.create({
      pendingId,
      serialNumber: finalSerialNumber,
      deviceName: finalName,
      deviceType: finalDeviceType || 'other',
      roomId: roomId || null,
      rackId: rackId || null,
      position: position || null,
      model: model || null,
      brand: brand || null,
      height: height || 1,
      powerConsumption: powerConsumption || 0,
      ipAddress: ipAddress || null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
      description: description || null,
      customFields: Object.keys(restFields).length > 0 ? restFields : null,
      planId,
      taskId: taskId || null,
      createdBy: req.user?.userId,
      status: 'pending',
      remark: remark || '盘点时快速添加',
    });

    await logInventoryOperation('create', `快速添加暂存设备【${finalName}】`, {
      targetId: pendingDevice.pendingId,
      targetName: finalName,
      afterState: {
        status: pendingDevice.status,
        deviceType: pendingDevice.deviceType,
        serialNumber: pendingDevice.serialNumber,
        planId: pendingDevice.planId,
        taskId: pendingDevice.taskId,
      },
      req,
      metadata: { rackId, roomId, position },
    });

    res.status(201).json({
      message: '设备已暂存，请前往暂存设备页面完善信息后同步',
      pendingDevice,
    });
  } catch (error) {
    logger.error('快速添加设备错误', { error: error.message, stack: error.stack });
    await logInventoryOperation('create', '快速添加暂存设备失败', {
      targetName: req.body?.name || req.body?.deviceName,
      result: 'failed',
      req,
      metadata: {
        error: error.message,
        planId: req.body?.planId,
        serialNumber: req.body?.serialNumber || req.body?.SN,
      },
    });
    res.status(500).json({ error: error.message });
  }
});

router.get('/pending-devices', async (req, res) => {
  try {
    const {
      status,
      planId,
      roomId,
      keyword,
      page = 1,
      pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
    } = req.query;
    const offset = (page - 1) * pageSize;
    const where = {};

    if (status) {
      where.status = status;
    }
    if (planId) {
      where.planId = planId;
    }
    if (roomId) {
      where.roomId = roomId;
    }
    if (keyword) {
      where[Op.or] = [
        { serialNumber: { [Op.like]: `%${keyword}%` } },
        { deviceName: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const { count, rows } = await PendingDevice.findAndCountAll({
      where,
      include: [
        { model: User, as: 'Creator', attributes: ['userId', 'username', 'realName'] },
        { model: User, as: 'Syncer', attributes: ['userId', 'username', 'realName'] },
        { model: InventoryPlan, as: 'Plan', attributes: ['planId', 'name'] },
        { model: Room, as: 'Room', attributes: ['roomId', 'name'] },
        { model: Rack, as: 'Rack', attributes: ['rackId', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset: parseInt(offset),
    });

    res.json({
      pendingDevices: rows,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    logger.error('获取暂存设备列表错误', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

router.get('/pending-devices/stats', async (req, res) => {
  try {
    const total = await PendingDevice.count();
    const pending = await PendingDevice.count({ where: { status: 'pending' } });
    const synced = await PendingDevice.count({ where: { status: 'synced' } });

    res.json({ total, pending, synced });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pending-devices/:pendingId', async (req, res) => {
  try {
    const pendingDevice = await PendingDevice.findByPk(req.params.pendingId, {
      include: [
        { model: User, as: 'Creator', attributes: ['userId', 'username', 'realName'] },
        { model: User, as: 'Syncer', attributes: ['userId', 'username', 'realName'] },
        { model: InventoryPlan, as: 'Plan', attributes: ['planId', 'name'] },
        { model: Room, as: 'Room', attributes: ['roomId', 'name'] },
        { model: Rack, as: 'Rack', attributes: ['rackId', 'name'] },
      ],
    });

    if (!pendingDevice) {
      return res.status(404).json({ error: '暂存设备不存在' });
    }

    res.json(pendingDevice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/pending-devices/:pendingId', async (req, res) => {
  try {
    const pendingDevice = await PendingDevice.findByPk(req.params.pendingId);
    if (!pendingDevice) {
      return res.status(404).json({ error: '暂存设备不存在' });
    }

    if (pendingDevice.status === 'synced') {
      return res.status(400).json({ error: '已同步的设备无法修改' });
    }

    const beforeState = {
      deviceName: pendingDevice.deviceName,
      deviceType: pendingDevice.deviceType,
      roomId: pendingDevice.roomId,
      rackId: pendingDevice.rackId,
      position: pendingDevice.position,
      model: pendingDevice.model,
      brand: pendingDevice.brand,
      height: pendingDevice.height,
      powerConsumption: pendingDevice.powerConsumption,
      ipAddress: pendingDevice.ipAddress,
      description: pendingDevice.description,
      remark: pendingDevice.remark,
    };

    const {
      deviceName,
      deviceType,
      roomId,
      rackId,
      position,
      model,
      brand,
      height,
      powerConsumption,
      ipAddress,
      purchaseDate,
      warrantyExpiry,
      description,
      remark,
      ...restFields
    } = req.body;

    const updateData = {
      deviceName: deviceName !== undefined ? deviceName : pendingDevice.deviceName,
      deviceType: deviceType !== undefined ? deviceType : pendingDevice.deviceType,
      roomId: roomId !== undefined ? roomId : pendingDevice.roomId,
      rackId: rackId !== undefined ? rackId : pendingDevice.rackId,
      position: position !== undefined ? position : pendingDevice.position,
      model: model !== undefined ? model : pendingDevice.model,
      brand: brand !== undefined ? brand : pendingDevice.brand,
      height: height !== undefined ? height : pendingDevice.height,
      powerConsumption:
        powerConsumption !== undefined ? powerConsumption : pendingDevice.powerConsumption,
      ipAddress: ipAddress !== undefined ? ipAddress : pendingDevice.ipAddress,
      purchaseDate:
        purchaseDate !== undefined
          ? purchaseDate
            ? new Date(purchaseDate)
            : null
          : pendingDevice.purchaseDate,
      warrantyExpiry:
        warrantyExpiry !== undefined
          ? warrantyExpiry
            ? new Date(warrantyExpiry)
            : null
          : pendingDevice.warrantyExpiry,
      description: description !== undefined ? description : pendingDevice.description,
      remark: remark !== undefined ? remark : pendingDevice.remark,
    };

    if (Object.keys(restFields).length > 0) {
      const existingCustomFields = pendingDevice.customFields || {};
      updateData.customFields = { ...existingCustomFields, ...restFields };
    }

    await pendingDevice.update(updateData);

    await logInventoryOperation('update', `更新暂存设备【${pendingDevice.deviceName}】`, {
      targetId: pendingDevice.pendingId,
      targetName: pendingDevice.deviceName,
      beforeState,
      afterState: {
        deviceName: pendingDevice.deviceName,
        deviceType: pendingDevice.deviceType,
        roomId: pendingDevice.roomId,
        rackId: pendingDevice.rackId,
        position: pendingDevice.position,
        model: pendingDevice.model,
        brand: pendingDevice.brand,
        height: pendingDevice.height,
        powerConsumption: pendingDevice.powerConsumption,
        ipAddress: pendingDevice.ipAddress,
        description: pendingDevice.description,
        remark: pendingDevice.remark,
      },
      req,
      metadata: { planId: pendingDevice.planId },
    });

    res.json(pendingDevice);
  } catch (error) {
    await logInventoryOperation('update', '更新暂存设备失败', {
      targetId: req.params?.pendingId,
      targetName: req.body?.deviceName,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/pending-devices/:pendingId', async (req, res) => {
  try {
    const pendingDevice = await PendingDevice.findByPk(req.params.pendingId);
    if (!pendingDevice) {
      return res.status(404).json({ error: '暂存设备不存在' });
    }

    const beforeState = {
      pendingId: pendingDevice.pendingId,
      deviceName: pendingDevice.deviceName,
      serialNumber: pendingDevice.serialNumber,
      status: pendingDevice.status,
      planId: pendingDevice.planId,
    };

    await pendingDevice.destroy();

    await logInventoryOperation('delete', `删除暂存设备【${pendingDevice.deviceName}】`, {
      targetId: pendingDevice.pendingId,
      targetName: pendingDevice.deviceName,
      beforeState,
      req,
      metadata: {},
    });

    res.json({ message: '删除成功' });
  } catch (error) {
    await logInventoryOperation('delete', '删除暂存设备失败', {
      targetId: req.params?.pendingId,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

router.post('/pending-devices/:pendingId/sync', async (req, res) => {
  try {
    const pendingDevice = await PendingDevice.findByPk(req.params.pendingId);
    if (!pendingDevice) {
      return res.status(404).json({ error: '暂存设备不存在' });
    }

    if (pendingDevice.status === 'synced') {
      return res.status(400).json({ error: '该设备已同步' });
    }

    const existingDevice = await Device.findOne({
      where: { serialNumber: pendingDevice.serialNumber },
    });
    if (existingDevice) {
      return res.status(400).json({ error: '该序列号的设备已存在于设备管理中' });
    }

    const devices = await Device.findAll({ where: { deviceId: { [Op.like]: 'DEV%' } } });
    let maxNumber = 0;
    devices.forEach(device => {
      const match = device.deviceId.match(/^DEV(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });
    const deviceId = `DEV${String(maxNumber + 1).padStart(3, '0')}`;

    const beforeState = {
      status: pendingDevice.status,
      syncedAt: pendingDevice.syncedAt,
      syncedBy: pendingDevice.syncedBy,
      syncedDeviceId: pendingDevice.syncedDeviceId,
    };

    const newDevice = await Device.create({
      deviceId,
      name: pendingDevice.deviceName,
      type: pendingDevice.deviceType,
      serialNumber: pendingDevice.serialNumber,
      rackId: pendingDevice.rackId,
      position: pendingDevice.position,
      height: pendingDevice.height || 1,
      powerConsumption: pendingDevice.powerConsumption || 0,
      model: pendingDevice.model,
      ipAddress: pendingDevice.ipAddress,
      description: pendingDevice.description,
      purchaseDate: pendingDevice.purchaseDate,
      warrantyExpiry: pendingDevice.warrantyExpiry,
      customFields: pendingDevice.customFields,
      status: 'running',
    });

    await pendingDevice.update({
      status: 'synced',
      syncedAt: new Date(),
      syncedBy: req.user?.userId,
      syncedDeviceId: newDevice.deviceId,
    });

    await logInventoryOperation('sync', `同步暂存设备【${pendingDevice.deviceName}】到设备管理`, {
      targetId: pendingDevice.pendingId,
      targetName: pendingDevice.deviceName,
      beforeState,
      afterState: {
        status: pendingDevice.status,
        syncedAt: pendingDevice.syncedAt,
        syncedBy: pendingDevice.syncedBy,
        syncedDeviceId: pendingDevice.syncedDeviceId,
      },
      req,
      metadata: {
        newDeviceId: newDevice.deviceId,
        serialNumber: pendingDevice.serialNumber,
      },
    });

    res.json({
      message: '同步成功',
      device: newDevice,
      pendingDevice,
    });
  } catch (error) {
    logger.error('同步设备错误', { error: error.message, stack: error.stack });
    await logInventoryOperation('sync', '同步暂存设备失败', {
      targetId: req.params?.pendingId,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

router.post('/pending-devices/batch-sync', async (req, res) => {
  try {
    const { pendingIds } = req.body;
    if (!pendingIds || pendingIds.length === 0) {
      return res.status(400).json({ error: '请选择要同步的设备' });
    }

    const pendingDevices = await PendingDevice.findAll({
      where: {
        pendingId: { [Op.in]: pendingIds },
        status: 'pending',
      },
    });

    if (pendingDevices.length === 0) {
      return res.status(400).json({ error: '没有可同步的设备' });
    }

    const devices = await Device.findAll({ where: { deviceId: { [Op.like]: 'DEV%' } } });
    let maxNumber = 0;
    devices.forEach(device => {
      const match = device.deviceId.match(/^DEV(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    const results = [];
    const errors = [];

    for (const pending of pendingDevices) {
      try {
        const existingDevice = await Device.findOne({
          where: { serialNumber: pending.serialNumber },
        });
        if (existingDevice) {
          errors.push({
            pendingId: pending.pendingId,
            serialNumber: pending.serialNumber,
            error: '序列号已存在',
          });
          continue;
        }

        maxNumber++;
        const deviceId = `DEV${String(maxNumber).padStart(3, '0')}`;

        const newDevice = await Device.create({
          deviceId,
          name: pending.deviceName,
          type: pending.deviceType,
          serialNumber: pending.serialNumber,
          rackId: pending.rackId,
          position: pending.position,
          height: pending.height || 1,
          powerConsumption: pending.powerConsumption || 0,
          model: pending.model,
          ipAddress: pending.ipAddress,
          description: pending.description,
          purchaseDate: pending.purchaseDate,
          warrantyExpiry: pending.warrantyExpiry,
          customFields: pending.customFields,
          status: 'running',
        });

        await pending.update({
          status: 'synced',
          syncedAt: new Date(),
          syncedBy: req.user?.userId,
          syncedDeviceId: newDevice.deviceId,
        });

        results.push({ pendingId: pending.pendingId, deviceId: newDevice.deviceId });
      } catch (err) {
        errors.push({ pendingId: pending.pendingId, error: err.message });
      }
    }

    await logInventoryOperation('sync', '批量同步暂存设备', {
      targetId: pendingIds.join(','),
      targetName: `批量同步 ${results.length} 台设备`,
      req,
      metadata: {
        totalRequested: pendingIds.length,
        successCount: results.length,
        errorCount: errors.length,
        results,
        errors,
      },
    });

    res.json({
      message: `成功同步 ${results.length} 台设备`,
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors,
    });
  } catch (error) {
    logger.error('批量同步设备错误', { error: error.message, stack: error.stack });
    await logInventoryOperation('sync', '批量同步暂存设备失败', {
      targetId: req.body?.pendingIds ? req.body.pendingIds.join(',') : null,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
