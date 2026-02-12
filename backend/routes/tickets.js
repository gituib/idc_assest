const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { Ticket, TicketOperationRecord } = require('../models/ticketIndex');
const Device = require('../models/Device');
const User = require('../models/User');
const Rack = require('../models/Rack');
const Room = require('../models/Room');
const { dbDialect } = require('../db');

// 获取工单统计 (必须定义在 /:ticketId 之前)
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate + ' 23:59:59');
    }

    const Sequelize = require('sequelize');

    const [total, statusStats, priorityStats, categoryStats, monthlyStats, deviceStats, dailyStats] = await Promise.all([
      Ticket.count({ where }),
      Ticket.findAll({
        where,
        attributes: ['status', [Sequelize.fn('COUNT', '*'), 'count']],
        group: ['status']
      }),
      Ticket.findAll({
        where,
        attributes: ['priority', [Sequelize.fn('COUNT', '*'), 'count']],
        group: ['priority']
      }),
      Ticket.findAll({
        where,
        attributes: ['faultCategory', [Sequelize.fn('COUNT', '*'), 'count']],
        group: ['faultCategory']
      }),
      Ticket.findAll({
        where,
        attributes: [
          [dbDialect === 'mysql' 
            ? Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), '%Y-%m')
            : Sequelize.fn('strftime', '%Y-%m', Sequelize.col('createdAt')), 
            'month'],
          [Sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['month'],
        order: [['month', 'DESC']],
        limit: 12
      }),
      Ticket.findAll({
        where,
        attributes: [
          'deviceId',
          'deviceName',
          [Sequelize.fn('COUNT', '*'), 'count'],
          [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'lastFaultTime']
        ],
        group: ['deviceId', 'deviceName'],
        order: [[Sequelize.fn('COUNT', '*'), 'DESC']],
        limit: 10
      }),
      Ticket.findAll({
        where,
        attributes: [
          [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
          [Sequelize.fn('COUNT', '*'), 'created']
        ],
        group: ['date'],
        order: [['date', 'ASC']]
      })
    ]);

    const statusData = statusStats.map(s => s.dataValues);
    const pending = statusData.find(s => s.status === 'pending')?.count || 0;
    const inProgress = statusData.find(s => s.status === 'in_progress')?.count || 0;
    const completed = statusData.find(s => s.status === 'completed')?.count || 0;
    const closed = statusData.find(s => s.status === 'closed')?.count || 0;

    const byStatus = statusData.map(item => ({
      status: item.status,
      count: item.count,
      percentage: total > 0 ? (item.count / total * 100) : 0
    }));

    const byPriority = priorityStats.map(p => ({
      priority: p.dataValues.priority,
      count: p.dataValues.count,
      completed: 0,
      avgTime: 0
    }));

    const byCategory = categoryStats.map(c => ({
      category: c.dataValues.faultCategory,
      count: c.dataValues.count,
      completed: 0,
      avgTime: 0
    }));

    const byDevice = deviceStats.map(d => ({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      count: d.dataValues.count,
      lastFaultTime: d.dataValues.lastFaultTime,
      deviceType: ''
    }));

    const trend = dailyStats.map(d => ({
      date: d.dataValues.date,
      created: d.dataValues.created,
      completed: 0,
      closed: 0,
      inProgress: 0,
      pending: 0
    }));

    const avgProcessingTime = 0;

    res.json({
      total,
      pending,
      inProgress,
      completed,
      closed,
      avgProcessingTime,
      byStatus,
      byPriority,
      byCategory,
      byDevice,
      trend,
      monthlyStats: monthlyStats.map(m => ({ month: m.dataValues.month, count: m.dataValues.count }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取工单统计 (别名)
router.get('/statistics', async (req, res) => {
  req.url = '/stats';
  router.handle(req, res);
});

// 获取工单列表
router.get('/', async (req, res) => {
  try {
    const {
      keyword,
      status,
      priority,
      faultCategory,
      deviceId,
      reporterId,
      startDate,
      endDate,
      page = 1,
      pageSize = 10
    } = req.query;

    const offset = (page - 1) * pageSize;
    const where = {};

    // 关键词搜索
    if (keyword) {
      where[Op.or] = [
        { ticketId: { [Op.like]: `%${keyword}%` } },
        { title: { [Op.like]: `%${keyword}%` } },
        { deviceName: { [Op.like]: `%${keyword}%` } },
        { serialNumber: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } }
      ];
    }

    // 状态筛选
    if (status && status !== 'all') {
      where.status = status;
    }

    // 优先级筛选
    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    // 故障分类筛选
    if (faultCategory && faultCategory !== 'all') {
      where.faultCategory = faultCategory;
    }

    // 设备筛选
    if (deviceId && deviceId !== 'all') {
      where.deviceId = deviceId;
    }

    // 报修人筛选
    if (reporterId && reporterId !== 'all') {
      where.reporterId = reporterId;
    }

    // 日期范围筛选
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate + ' 23:59:59');
      }
    }

    const { count, rows } = await Ticket.findAndCountAll({
      where,
      include: [
        { model: User, as: 'reporter', attributes: ['userId', 'username'] },
        { model: Device, attributes: ['deviceId', 'name', 'type', 'model'] }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(pageSize)
    });

    res.json({
      total: count,
      tickets: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个工单详情
router.get('/:ticketId', async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.ticketId, {
      include: [
        { model: User, as: 'reporter', attributes: ['userId', 'username', 'email'] },
        {
          model: Device,
          include: [
            {
              model: Rack,
              attributes: ['rackId', 'name', 'roomId'],
              include: [
                {
                  model: Room,
                  attributes: ['roomId', 'name']
                }
              ]
            }
          ]
        },
        { model: TicketOperationRecord, as: 'operationRecords', order: [['createdAt', 'DESC']] }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }

    // 格式化响应数据，添加机房和机柜名称
    const ticketData = ticket.toJSON();
    if (ticketData.Device && ticketData.Device.Rack) {
      ticketData.Device.roomName = ticketData.Device.Rack.Room?.name || '-';
      ticketData.Device.rackName = ticketData.Device.Rack.name || '-';
    }

    res.json(ticketData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建工单
router.post('/', async (req, res) => {
  try {
    const {
      deviceId,
      deviceName,
      serialNumber,
      faultCategory,
      faultSubCategory,
      priority,
      description,
      expectedCompletionDate,
      title,
      attachments,
      tags
    } = req.body;

    let device = null;
    let ticketDeviceName = '';
    let ticketDeviceModel = '';
    let ticketSerialNumber = '';
    let ticketLocation = '';

    // 判断是选择设备还是手动输入
    if (deviceId) {
      // 从设备列表选择
      device = await Device.findByPk(deviceId, {
        include: [{ model: require('../models/Rack') }]
      });
      if (!device) {
        return res.status(404).json({ error: '设备不存在' });
      }
      ticketDeviceName = device.name;
      ticketDeviceModel = device.model;
      ticketSerialNumber = device.serialNumber;
      ticketLocation = device.Rack ? `${device.Rack.name}` : '未知位置';
    } else if (deviceName && serialNumber) {
      // 手动输入设备信息
      ticketDeviceName = deviceName;
      ticketSerialNumber = serialNumber;
      ticketDeviceModel = '';
      ticketLocation = '未知位置';
    } else {
      return res.status(400).json({ error: '请选择设备或手动输入设备信息' });
    }

    const ticketId = `TKT${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const ticket = await Ticket.create({
      ticketId,
      title: title || `${faultCategory} - ${ticketDeviceName}`,
      deviceId: deviceId || null,
      deviceName: ticketDeviceName,
      deviceModel: ticketDeviceModel,
      serialNumber: ticketSerialNumber,
      faultCategory,
      faultSubCategory,
      priority: priority || 'medium',
      description,
      expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : null,
      reporterId: req.body.reporterId || 'USER001',
      reporterName: req.body.reporterName || '系统用户',
      location: ticketLocation,
      attachments: attachments || [],
      tags: tags || [],
      status: 'pending'
    });

    // 创建操作记录
    await TicketOperationRecord.create({
      recordId: uuidv4(),
      ticketId,
      operationType: 'create',
      operationDescription: '创建工单',
      operatorId: ticket.reporterId,
      operatorName: ticket.reporterName,
      operatorRole: 'user',
      afterState: ticket.toJSON()
    });

    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 更新工单
router.put('/:ticketId', async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }

    const beforeState = ticket.toJSON();
    const { operatorId, operatorName, operatorRole } = req.body;

    await ticket.update(req.body);

    await TicketOperationRecord.create({
      recordId: uuidv4(),
      ticketId: ticket.ticketId,
      operationType: 'update',
      operationDescription: '更新工单信息',
      operatorId: operatorId || ticket.reporterId,
      operatorName: operatorName || ticket.reporterName,
      operatorRole: operatorRole || 'user',
      beforeState,
      afterState: ticket.toJSON()
    });

    res.json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 更新工单状态
router.put('/:ticketId/status', async (req, res) => {
  try {
    const { status, operatorId, operatorName, operatorRole, resolution } = req.body;

    const ticket = await Ticket.findByPk(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }

    const beforeState = ticket.toJSON();
    const updateData = { status };

    if (status === 'completed') {
      updateData.completionDate = new Date();
      if (resolution) {
        updateData.resolution = resolution;
      }
    }

    await ticket.update(updateData);

    await TicketOperationRecord.create({
      recordId: uuidv4(),
      ticketId: ticket.ticketId,
      operationType: 'status_change',
      operationDescription: `状态变更为: ${status}`,
      operatorId: operatorId || ticket.reporterId,
      operatorName: operatorName || ticket.reporterName,
      operatorRole: operatorRole || 'user',
      beforeState,
      afterState: ticket.toJSON()
    });

    res.json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 处理工单
router.put('/:ticketId/process', async (req, res) => {
  try {
    const { solution, result, notes, usedParts, operatorId, operatorName, operatorRole } = req.body;

    const ticket = await Ticket.findByPk(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }

    const beforeState = ticket.toJSON();
    const updateData = {
      status: 'in_progress',
      resolution: solution
    };

    if (result === 'resolved') {
      updateData.status = 'completed';
      updateData.completionDate = new Date();
    }

    await ticket.update(updateData);

    await TicketOperationRecord.create({
      recordId: uuidv4(),
      ticketId: ticket.ticketId,
      operationType: 'process',
      operationDescription: `处理工单 - 结果: ${result}`,
      operationSteps: solution ? [solution] : [],
      spareParts: usedParts ? [{ name: usedParts }] : [],
      result,
      notes,
      operatorId: operatorId || ticket.reporterId,
      operatorName: operatorName || ticket.reporterName,
      operatorRole: operatorRole || 'user',
      beforeState,
      afterState: ticket.toJSON()
    });

    res.json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 添加操作记录
router.post('/:ticketId/operations', async (req, res) => {
  try {
    const {
      operationType,
      operationDescription,
      operationSteps,
      spareParts,
      duration,
      result,
      notes,
      operatorId,
      operatorName,
      operatorRole
    } = req.body;

    const ticket = await Ticket.findByPk(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }

    const record = await TicketOperationRecord.create({
      recordId: uuidv4(),
      ticketId: ticket.ticketId,
      operationType,
      operationDescription,
      operationSteps: operationSteps || [],
      spareParts: spareParts || [],
      duration,
      result,
      notes,
      operatorId,
      operatorName,
      operatorRole
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 获取工单操作记录
router.get('/:ticketId/operations', async (req, res) => {
  try {
    const records = await TicketOperationRecord.findAll({
      where: { ticketId: req.params.ticketId },
      order: [['createdAt', 'DESC']]
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除工单
router.delete('/:ticketId', async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }

    await ticket.destroy();
    res.json({ message: '工单已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 评价工单
router.post('/:ticketId/evaluate', async (req, res) => {
  try {
    const { evaluation, evaluationRating, operatorId, operatorName } = req.body;

    const ticket = await Ticket.findByPk(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }

    await ticket.update({ evaluation, evaluationRating });

    await TicketOperationRecord.create({
      recordId: uuidv4(),
      ticketId: ticket.ticketId,
      operationType: 'comment',
      operationDescription: '用户评价',
      operatorId,
      operatorName,
      operatorRole: 'user',
      notes: `评价: ${evaluation}, 星级: ${evaluationRating}`
    });

    res.json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
