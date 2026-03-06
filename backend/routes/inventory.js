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
const { authMiddleware, authorize } = require('../middleware/auth');
const { PAGINATION } = require('../config');

InventoryTask.belongsTo(InventoryPlan, { foreignKey: 'planId', as: 'Plan' });
InventoryPlan.hasMany(InventoryTask, { foreignKey: 'planId', as: 'Tasks' });
InventoryTask.belongsTo(User, { foreignKey: 'assignedTo', as: 'Assignee' });
InventoryRecord.belongsTo(InventoryTask, { foreignKey: 'taskId', as: 'Task' });
InventoryTask.hasMany(InventoryRecord, { foreignKey: 'taskId', as: 'Records' });
InventoryRecord.belongsTo(InventoryPlan, { foreignKey: 'planId', as: 'Plan' });
InventoryPlan.hasMany(InventoryRecord, { foreignKey: 'planId', as: 'Records' });
InventoryRecord.belongsTo(Device, { foreignKey: 'deviceId', as: 'Device' });
InventoryRecord.belongsTo(User, { foreignKey: 'checkedBy', as: 'Checker' });

function generateId(prefix) {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

function generatePlanId() {
  return `PLAN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
}

function generateTaskId() {
  return `TASK${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
}

function generateRecordId() {
  return `REC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
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
        { description: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const { count, rows } = await InventoryPlan.findAndCountAll({
      where,
      include: [
        { model: require('../models/User'), as: 'Creator', attributes: ['userId', 'username', 'realName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset: parseInt(offset)
    });

    res.json({
      plans: rows,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/plans/:planId', async (req, res) => {
  try {
    console.log('=== GET /plans/:planId ===', req.params.planId);
    
    const plan = await InventoryPlan.findByPk(req.params.planId, {
      include: [
        { model: require('../models/User'), as: 'Creator', attributes: ['userId', 'username', 'realName'] }
      ]
    });

    if (!plan) {
      console.log('Plan not found');
      return res.status(404).json({ error: '盘点计划不存在' });
    }

    const tasks = await InventoryTask.findAll({
      where: { planId: plan.planId },
      include: [
        { model: require('../models/User'), as: 'Assignee', attributes: ['userId', 'username', 'realName'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    console.log('Found tasks:', tasks.length);
    res.json({ plan, tasks });
  } catch (error) {
    console.error('Error:', error);
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
      createdBy: req.user?.userId
    });

    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/plans/:planId', async (req, res) => {
  try {
    const plan = await InventoryPlan.findByPk(req.params.planId);
    if (!plan) {
      return res.status(404).json({ error: '盘点计划不存在' });
    }

    const { name, type, description, scheduledDate, targetRooms, targetRacks, status } = req.body;

    await plan.update({
      name: name || plan.name,
      type: type || plan.type,
      description: description !== undefined ? description : plan.description,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : plan.scheduledDate,
      targetRooms: targetRooms || plan.targetRooms,
      targetRacks: targetRacks || plan.targetRacks,
      status: status || plan.status
    });

    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/plans/:planId', async (req, res) => {
  try {
    const plan = await InventoryPlan.findByPk(req.params.planId);
    if (!plan) {
      return res.status(404).json({ error: '盘点计划不存在' });
    }

    await InventoryRecord.destroy({ where: { planId: plan.planId } });
    await InventoryTask.destroy({ where: { planId: plan.planId } });
    await plan.destroy();

    res.json({ message: '盘点计划删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/plans/:planId/start', async (req, res) => {
  try {
    const plan = await InventoryPlan.findByPk(req.params.planId);

    if (!plan) {
      return res.status(404).json({ error: '盘点计划不存在' });
    }

    if (plan.status !== 'draft' && plan.status !== 'pending') {
      return res.status(400).json({ error: '只有草稿或待执行状态的盘点计划可以启动' });
    }

    const targetRooms = plan.targetRooms || [];
    const targetRacks = plan.targetRacks || [];
    let allDevices = [];

    if (targetRacks.length > 0) {
      allDevices = await Device.findAll({
        where: { rackId: { [Op.in]: targetRacks } }
      });
    } else if (targetRooms.length > 0) {
      const racksInRooms = await Rack.findAll({
        where: { roomId: { [Op.in]: targetRooms } },
        attributes: ['rackId']
      });
      const rackIds = racksInRooms.map(r => r.rackId);
      allDevices = await Device.findAll({
        where: { rackId: { [Op.in]: rackIds } }
      });
    } else {
      allDevices = await Device.findAll();
    }

    const tasksToCreate = [];
    const recordsToCreate = [];

    const taskId = generateTaskId();
    
    tasksToCreate.push({
      taskId,
      planId: plan.planId,
      targetType: 'all',
      targetId: 'all',
      targetName: '全部设备',
      status: 'pending',
      totalDevices: allDevices.length
    });

    for (let i = 0; i < allDevices.length; i++) {
      const device = allDevices[i];
      recordsToCreate.push({
        recordId: generateRecordId(),
        taskId,
        planId: plan.planId,
        deviceId: device.deviceId,
        deviceName: device.name,
        deviceType: device.type,
        serialNumber: device.serialNumber,
        rackId: device.rackId,
        position: device.position,
        status: 'pending'
      });
    }

    if (tasksToCreate.length > 0) {
      await InventoryTask.bulkCreate(tasksToCreate, { individualHooks: false });
    }

    if (recordsToCreate.length > 0) {
      const now = dbDialect === 'mysql' 
        ? new Date().toISOString().replace('T', ' ').replace('Z', '')
        : new Date().toISOString();
      const placeholders = recordsToCreate.map(r => 
        `('${r.recordId}', '${r.taskId}', '${r.planId}', '${r.deviceId}', '${r.deviceName}', '${r.deviceType}', '${r.serialNumber || ''}', '${r.rackId}', ${r.position}, 'pending', '${now}', '${now}')`
      ).join(',');
      
      if (placeholders) {
        await sequelize.query(`
          INSERT INTO inventory_records (recordId, taskId, planId, deviceId, deviceName, deviceType, serialNumber, rackId, position, status, createdAt, updatedAt)
          VALUES ${placeholders}
        `);
      }
    }

    await plan.update({
      status: 'in_progress',
      totalDevices: allDevices.length,
      checkedDevices: 0,
      normalDevices: 0,
      abnormalDevices: 0,
      missedDevices: allDevices.length
    });

    res.json({ message: '盘点任务已启动', taskCount: tasksToCreate.length, deviceCount: allDevices.length });
  } catch (error) {
    console.error('启动盘点错误:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/tasks/:taskId', async (req, res) => {
  try {
    const task = await InventoryTask.findByPk(req.params.taskId, {
      include: [
        { model: InventoryPlan, as: 'Plan', attributes: ['planId', 'name'] },
        { model: require('../models/User'), as: 'Assignee', attributes: ['userId', 'username', 'realName'] }
      ]
    });

    if (!task) {
      return res.status(404).json({ error: '盘点任务不存在' });
    }

    const records = await InventoryRecord.findAll({
      where: { taskId: task.taskId },
      include: [
        { model: Device, as: 'Device', attributes: ['deviceId', 'name', 'type', 'serialNumber', 'rackId', 'position'] },
        { model: require('../models/User'), as: 'Checker', attributes: ['userId', 'username', 'realName'] }
      ]
    });

    const rackIds = [...new Set(records.map(r => r.rackId).filter(Boolean))];
    const racks = await Rack.findAll({
      where: { rackId: rackIds },
      include: [{ model: Room, as: 'Room' }]
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
        displayLocation: roomName ? `${roomName} - ${rackName} - U${position}` : `${rackName} - U${position}`
      };
    });

    res.json({ task, records: enrichedRecords });
  } catch (error) {
    console.error('获取盘点任务记录错误:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/tasks/:taskId', async (req, res) => {
  try {
    const task = await InventoryTask.findByPk(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: '盘点任务不存在' });
    }

    const { assignedTo, status } = req.body;

    if (assignedTo !== undefined) {
      await task.update({
        assignedTo,
        assignedAt: assignedTo ? new Date() : task.assignedAt
      });
    }

    if (status) {
      await task.update({
        status,
        completedAt: status === 'completed' ? new Date() : null
      });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/records/:recordId/check', async (req, res) => {
  try {
    const record = await InventoryRecord.findByPk(req.params.recordId, {
      include: [{ model: Device, as: 'Device' }]
    });

    if (!record) {
      return res.status(404).json({ error: '盘点记录不存在' });
    }

    const { actualSerialNumber, actualRackId, actualPosition, status, remark, photoUrl } = req.body;

    let abnormalType = null;
    if (status === 'abnormal') {
      if (actualSerialNumber && actualSerialNumber !== record.serialNumber) {
        abnormalType = 'serial_mismatch';
      } else if (actualRackId && actualRackId !== record.rackId) {
        abnormalType = 'position_mismatch';
      } else if (status === 'not_found') {
        abnormalType = 'device_missing';
      }
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
      photoUrl: photoUrl || null
    });

    const task = await InventoryTask.findByPk(record.taskId);
    const plan = await InventoryPlan.findByPk(record.planId);

    const taskRecords = await InventoryRecord.findAll({ where: { taskId: task.taskId } });
    const taskStats = {
      totalDevices: taskRecords.length,
      checkedDevices: taskRecords.filter(r => r.status !== 'pending').length,
      normalDevices: taskRecords.filter(r => r.status === 'normal').length,
      abnormalDevices: taskRecords.filter(r => r.status === 'abnormal').length
    };

    await task.update(taskStats);

    const planRecords = await InventoryRecord.findAll({ where: { planId: plan.planId } });
    const planStats = {
      totalDevices: planRecords.length,
      checkedDevices: planRecords.filter(r => r.status !== 'pending').length,
      normalDevices: planRecords.filter(r => r.status === 'normal').length,
      abnormalDevices: planRecords.filter(r => r.status === 'abnormal').length,
      missedDevices: planRecords.filter(r => r.status === 'pending').length
    };

    await plan.update(planStats);

    res.json({ record, taskStats, planStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/records', async (req, res) => {
  try {
    const { planId, taskId, status, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    const where = {};

    if (planId) where.planId = planId;
    if (taskId) where.taskId = taskId;
    if (status) where.status = status;

    const { count, rows } = await InventoryRecord.findAndCountAll({
      where,
      include: [
        { model: Device, as: 'Device', attributes: ['deviceId', 'name', 'type', 'serialNumber', 'rackId', 'position'] },
        { model: require('../models/User'), as: 'Checker', attributes: ['userId', 'username', 'realName'] }
      ],
      order: [['checkedAt', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset: parseInt(offset)
    });

    res.json({
      records: rows,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/plans/:planId/complete', async (req, res) => {
  try {
    const plan = await InventoryPlan.findByPk(req.params.planId);

    if (!plan) {
      return res.status(404).json({ error: '盘点计划不存在' });
    }

    await InventoryRecord.update(
      { status: 'missed' },
      { where: { planId: plan.planId, status: 'pending' } }
    );

    const finalRecords = await InventoryRecord.findAll({ where: { planId: plan.planId } });

    await plan.update({
      status: 'completed',
      completedDate: new Date(),
      checkedDevices: finalRecords.filter(r => r.status !== 'pending').length,
      normalDevices: finalRecords.filter(r => r.status === 'normal').length,
      abnormalDevices: finalRecords.filter(r => r.status === 'abnormal').length,
      missedDevices: finalRecords.filter(r => r.status === 'missed').length
    });

    await InventoryTask.update(
      { status: 'completed' },
      { where: { planId: plan.planId, status: { [Op.ne]: 'completed' } } }
    );

    res.json({ message: '盘点已完成', plan });
  } catch (error) {
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
        { model: require('../models/User'), as: 'Creator', attributes: ['userId', 'username', 'realName'] }
      ]
    });

    res.json({
      totalPlans,
      completedPlans,
      inProgressPlans,
      totalRecords,
      normalRecords,
      abnormalRecords,
      pendingRecords,
      completionRate: totalRecords > 0 ? ((normalRecords + abnormalRecords) / totalRecords * 100).toFixed(1) : 0,
      abnormalRate: totalRecords > 0 ? (abnormalRecords / totalRecords * 100).toFixed(1) : 0,
      recentPlans
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
