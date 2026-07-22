const logger = require('../utils/logger').module('TicketsRoute');
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { generateId } = require('../utils/idGenerator');
const { Ticket, TicketOperationRecord } = require('../models/ticketIndex');
const Device = require('../models/Device');
const User = require('../models/User');
const Rack = require('../models/Rack');
const Room = require('../models/Room');
const { dbDialect } = require('../db');
const { createObjectCsvWriter } = require('csv-writer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { logOperation } = require('../utils/operationLogger');

/**
 * 记录工单操作日志
 * @param {string} operationType - 操作类型
 * @param {string} operationDescription - 操作描述
 * @param {Object} params - 参数
 * @returns {Promise<Object|null>}
 */
const logTicketOperation = (operationType, operationDescription, params) =>
  logOperation({ module: 'ticket', operationType, operationDescription, ...params });

// 获取工单统计 (必须定义在 /:ticketId 之前)
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate + ' 23:59:59');
      }
    }

    const Sequelize = require('sequelize');

    const avgTimeExpr =
      dbDialect === 'mysql'
        ? Sequelize.literal('AVG(TIMESTAMPDIFF(HOUR, Ticket.createdAt, Ticket.updatedAt))')
        : Sequelize.literal('AVG((julianday(Ticket.updatedAt) - julianday(Ticket.createdAt)) * 24)');

    const [
      total,
      statusStats,
      priorityStats,
      categoryStats,
      monthlyStats,
      deviceStats,
      dailyCreatedStats,
      dailyCompletedStats,
      dailyClosedStats,
      dailyInProgressStats,
      dailyPendingStats,
      priorityCompletedStats,
      categoryCompletedStats,
      dailyCreatedDevices,
    ] = await Promise.all([
      Ticket.count({ where }),
      Ticket.findAll({
        where,
        attributes: ['status', [Sequelize.fn('COUNT', '*'), 'count']],
        group: [Sequelize.col('Ticket.status')],
      }),
      Ticket.findAll({
        where,
        attributes: ['priority', [Sequelize.fn('COUNT', '*'), 'count']],
        group: [Sequelize.col('Ticket.priority')],
      }),
      Ticket.findAll({
        where,
        attributes: ['faultCategory', [Sequelize.fn('COUNT', '*'), 'count']],
        group: [Sequelize.col('Ticket.faultCategory')],
      }),
      Ticket.findAll({
        where,
        attributes: [
          [
            dbDialect === 'mysql'
              ? Sequelize.fn('DATE_FORMAT', Sequelize.col('Ticket.createdAt'), '%Y-%m')
              : Sequelize.fn('strftime', '%Y-%m', Sequelize.col('Ticket.createdAt')),
            'month',
          ],
          [Sequelize.fn('COUNT', '*'), 'count'],
        ],
        group: ['month'],
        order: [['month', 'DESC']],
        limit: 12,
      }),
      Ticket.findAll({
        where,
        attributes: [
          'deviceId',
          'deviceName',
          'deviceModel',
          [Sequelize.fn('COUNT', '*'), 'count'],
          [Sequelize.fn('MAX', Sequelize.col('Ticket.createdAt')), 'lastFaultTime'],
        ],
        group: [Sequelize.col('Ticket.deviceId'), 'deviceName', 'deviceModel'],
        order: [[Sequelize.fn('COUNT', '*'), 'DESC']],
        limit: 10,
        include: [{ model: Device, attributes: ['type'] }],
      }),
      Ticket.findAll({
        where,
        attributes: [
          [
            dbDialect === 'mysql'
              ? Sequelize.fn('DATE_FORMAT', Sequelize.col('Ticket.createdAt'), '%Y-%m-%d')
              : Sequelize.fn('date', Sequelize.col('Ticket.createdAt')),
            'date',
          ],
          [Sequelize.fn('COUNT', '*'), 'created'],
        ],
        group: ['date'],
        order: [['date', 'ASC']],
      }),
      Ticket.findAll({
        where: {
          ...where,
          status: 'completed',
        },
        attributes: [
          [
            dbDialect === 'mysql'
              ? Sequelize.fn('DATE_FORMAT', Sequelize.col('Ticket.updatedAt'), '%Y-%m-%d')
              : Sequelize.fn('date', Sequelize.col('Ticket.updatedAt')),
            'date',
          ],
          [Sequelize.fn('COUNT', '*'), 'completed'],
        ],
        group: ['date'],
        order: [['date', 'ASC']],
      }),
      Ticket.findAll({
        where: {
          ...where,
          status: 'closed',
        },
        attributes: [
          [
            dbDialect === 'mysql'
              ? Sequelize.fn('DATE_FORMAT', Sequelize.col('Ticket.updatedAt'), '%Y-%m-%d')
              : Sequelize.fn('date', Sequelize.col('Ticket.updatedAt')),
            'date',
          ],
          [Sequelize.fn('COUNT', '*'), 'closed'],
        ],
        group: ['date'],
        order: [['date', 'ASC']],
      }),
      Ticket.findAll({
        where: {
          ...where,
          status: 'in_progress',
        },
        attributes: [
          [
            dbDialect === 'mysql'
              ? Sequelize.fn('DATE_FORMAT', Sequelize.col('Ticket.updatedAt'), '%Y-%m-%d')
              : Sequelize.fn('date', Sequelize.col('Ticket.updatedAt')),
            'date',
          ],
          [Sequelize.fn('COUNT', '*'), 'inProgress'],
        ],
        group: ['date'],
        order: [['date', 'ASC']],
      }),
      Ticket.findAll({
        where: {
          ...where,
          status: 'pending',
        },
        attributes: [
          [
            dbDialect === 'mysql'
              ? Sequelize.fn('DATE_FORMAT', Sequelize.col('Ticket.createdAt'), '%Y-%m-%d')
              : Sequelize.fn('date', Sequelize.col('Ticket.createdAt')),
            'date',
          ],
          [Sequelize.fn('COUNT', '*'), 'pending'],
        ],
        group: ['date'],
        order: [['date', 'ASC']],
      }),
      Ticket.findAll({
        where: {
          ...where,
          status: 'completed',
        },
        attributes: [
          'priority',
          [Sequelize.fn('COUNT', '*'), 'completed'],
          [avgTimeExpr, 'avgTime'],
        ],
        group: [Sequelize.col('Ticket.priority')],
      }),
      Ticket.findAll({
        where: {
          ...where,
          status: 'completed',
        },
        attributes: [
          'faultCategory',
          [Sequelize.fn('COUNT', '*'), 'completed'],
          [avgTimeExpr, 'avgTime'],
        ],
        group: [Sequelize.col('Ticket.faultCategory')],
      }),
      // 每天新建工单的设备明细（用于趋势图 tooltip 展示）
      Ticket.findAll({
        where,
        attributes: [
          [
            dbDialect === 'mysql'
              ? Sequelize.fn('DATE_FORMAT', Sequelize.col('Ticket.createdAt'), '%Y-%m-%d')
              : Sequelize.fn('date', Sequelize.col('Ticket.createdAt')),
            'date',
          ],
          'deviceName',
          'title',
          'faultCategory',
          'priority',
          [Sequelize.fn('COUNT', '*'), 'count'],
        ],
        group: ['date', 'Ticket.deviceName', 'Ticket.title', 'Ticket.faultCategory', 'Ticket.priority'],
        order: [['date', 'ASC']],
      }),
    ]);

    const statusData = statusStats.map(s => s.dataValues);
    const pending = statusData.find(s => s.status === 'pending')?.count || 0;
    const inProgress = statusData.find(s => s.status === 'in_progress')?.count || 0;
    const completed = statusData.find(s => s.status === 'completed')?.count || 0;
    const closed = statusData.find(s => s.status === 'closed')?.count || 0;
    const cancelled = statusData.find(s => s.status === 'cancelled')?.count || 0;

    const byStatus = statusData.map(item => ({
      status: item.status,
      count: item.count,
      percentage: total > 0 ? (item.count / total) * 100 : 0,
    }));

    const byPriority = priorityStats.map(p => {
      const priority = p.dataValues.priority;
      const completedData = priorityCompletedStats.find(
        pc => pc.dataValues.priority === priority
      );
      return {
        priority,
        count: p.dataValues.count,
        completed: completedData?.dataValues?.completed || 0,
        avgTime: completedData?.dataValues?.avgTime
          ? parseFloat(completedData.dataValues.avgTime)
          : 0,
      };
    });

    const byCategory = categoryStats.map(c => {
      const category = c.dataValues.faultCategory;
      const completedData = categoryCompletedStats.find(
        cc => cc.dataValues.faultCategory === category
      );
      return {
        category,
        count: c.dataValues.count,
        completed: completedData?.dataValues?.completed || 0,
        avgTime: completedData?.dataValues?.avgTime
          ? parseFloat(completedData.dataValues.avgTime)
          : 0,
      };
    });

    const byDevice = deviceStats.map(d => ({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      count: d.dataValues.count,
      lastFaultTime: d.dataValues.lastFaultTime,
      deviceType: d.Device?.type || d.deviceModel || '',
    }));

    const createdMap = {};
    dailyCreatedStats.forEach(d => {
      createdMap[d.dataValues.date] = d.dataValues.created;
    });
    const completedMap = {};
    dailyCompletedStats.forEach(d => {
      completedMap[d.dataValues.date] = d.dataValues.completed;
    });
    const closedMap = {};
    dailyClosedStats.forEach(d => {
      closedMap[d.dataValues.date] = d.dataValues.closed;
    });
    const inProgressMap = {};
    dailyInProgressStats.forEach(d => {
      inProgressMap[d.dataValues.date] = d.dataValues.inProgress;
    });
    const pendingMap = {};
    dailyPendingStats.forEach(d => {
      pendingMap[d.dataValues.date] = d.dataValues.pending;
    });

    // 按日期分组设备明细（用于趋势图 tooltip）
    const createdDevicesMap = {};
    dailyCreatedDevices.forEach(d => {
      const dv = d.dataValues;
      if (!createdDevicesMap[dv.date]) {
        createdDevicesMap[dv.date] = [];
      }
      createdDevicesMap[dv.date].push({
        deviceName: dv.deviceName || '未知设备',
        title: dv.title || '',
        faultCategory: dv.faultCategory || '',
        priority: dv.priority || '',
        count: dv.count,
      });
    });

    const allDates = [
      ...new Set([
        ...Object.keys(createdMap),
        ...Object.keys(completedMap),
        ...Object.keys(closedMap),
        ...Object.keys(inProgressMap),
        ...Object.keys(pendingMap),
      ]),
    ].sort();
    const trend = allDates.map(date => ({
      date,
      created: createdMap[date] || 0,
      completed: completedMap[date] || 0,
      closed: closedMap[date] || 0,
      inProgress: inProgressMap[date] || 0,
      pending: pendingMap[date] || 0,
      devices: createdDevicesMap[date] || [],
    }));

    const completedTickets = await Ticket.findAll({
      where: {
        ...where,
        status: 'completed',
      },
      attributes: ['createdAt', 'updatedAt'],
    });

    let avgProcessingTime = 0;
    if (completedTickets.length > 0) {
      const totalProcessingTime = completedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.createdAt);
        const updated = new Date(ticket.updatedAt);
        return sum + (updated - created);
      }, 0);
      avgProcessingTime = (
        totalProcessingTime /
        completedTickets.length /
        (1000 * 60 * 60)
      ).toFixed(1);
    }

    res.json({
      total,
      pending,
      inProgress,
      completed,
      closed,
      cancelled,
      avgProcessingTime: parseFloat(avgProcessingTime),
      byStatus,
      byPriority,
      byCategory,
      byDevice,
      trend,
      monthlyStats: monthlyStats.map(m => ({
        month: m.dataValues.month,
        count: m.dataValues.count,
      })),
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
      pageSize = 10,
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
        { description: { [Op.like]: `%${keyword}%` } },
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
        { model: Device, attributes: ['deviceId', 'name', 'type', 'model'] },
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(pageSize),
    });

    res.json({
      total: count,
      tickets: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 导出工单
const TICKET_EXPORT_FIELDS = [
  { fieldName: 'ticketId', displayName: '工单编号' },
  { fieldName: 'title', displayName: '标题' },
  { fieldName: 'deviceName', displayName: '设备名称' },
  { fieldName: 'deviceModel', displayName: '设备型号' },
  { fieldName: 'serialNumber', displayName: '设备序列号' },
  { fieldName: 'faultCategory', displayName: '故障分类' },
  { fieldName: 'faultSubCategory', displayName: '故障子分类' },
  { fieldName: 'priority', displayName: '优先级' },
  { fieldName: 'status', displayName: '状态' },
  { fieldName: 'description', displayName: '故障描述' },
  { fieldName: 'expectedCompletionDate', displayName: '期望完成时间' },
  { fieldName: 'reporterId', displayName: '报告人ID' },
  { fieldName: 'reporterName', displayName: '报告人' },
  { fieldName: 'assigneeId', displayName: '处理人ID' },
  { fieldName: 'assigneeName', displayName: '处理人' },
  { fieldName: 'location', displayName: '设备位置' },
  { fieldName: 'resolution', displayName: '解决方案' },
  { fieldName: 'completionDate', displayName: '完成时间' },
  { fieldName: 'evaluation', displayName: '评价' },
  { fieldName: 'evaluationRating', displayName: '评价星级' },
  { fieldName: 'createdAt', displayName: '创建时间' },
  { fieldName: 'updatedAt', displayName: '更新时间' },
];

router.get('/export', async (req, res) => {
  try {
    const {
      keyword,
      status,
      priority,
      faultCategory,
      deviceId,
      format = 'csv',
      ticketIds,
    } = req.query;

    const where = {};

    if (ticketIds) {
      const ids = Array.isArray(ticketIds) ? ticketIds : [ticketIds];
      where.ticketId = { [Op.in]: ids };
    } else {
      if (keyword) {
        where[Op.or] = [
          { ticketId: { [Op.like]: `%${keyword}%` } },
          { title: { [Op.like]: `%${keyword}%` } },
          { deviceName: { [Op.like]: `%${keyword}%` } },
          { serialNumber: { [Op.like]: `%${keyword}%` } },
          { description: { [Op.like]: `%${keyword}%` } },
        ];
      }

      if (status && status !== 'all') {
        where.status = status;
      }

      if (priority && priority !== 'all') {
        where.priority = priority;
      }

      if (faultCategory && faultCategory !== 'all') {
        where.faultCategory = faultCategory;
      }

      if (deviceId && deviceId !== 'all') {
        where.deviceId = deviceId;
      }
    }

    const tickets = await Ticket.findAll({
      where,
      include: [
        { model: User, as: 'reporter', attributes: ['userId', 'username'] },
        { model: Device, attributes: ['deviceId', 'name', 'type', 'model', 'serialNumber'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // 收集所有工单的自定义字段 key，确保导出列完整
    const allCustomKeys = new Set();
    tickets.forEach(ticket => {
      if (ticket.metadata && typeof ticket.metadata === 'object') {
        Object.keys(ticket.metadata).forEach(key => allCustomKeys.add(key));
      }
    });

    const exportData = tickets.map(ticket => {
      const item = {};
      TICKET_EXPORT_FIELDS.forEach(({ fieldName, displayName }) => {
        let value = ticket[fieldName];

        if (fieldName === 'priority') {
          const priorityMap = { low: '低', medium: '中', high: '高', urgent: '紧急' };
          value = priorityMap[value] || value;
        } else if (fieldName === 'status') {
          const statusMap = {
            pending: '待处理',
            in_progress: '处理中',
            completed: '已完成',
            closed: '已关闭',
          };
          value = statusMap[value] || value;
        } else if (
          fieldName === 'expectedCompletionDate' ||
          fieldName === 'completionDate' ||
          fieldName === 'createdAt' ||
          fieldName === 'updatedAt'
        ) {
          value = value ? new Date(value).toLocaleString('zh-CN') : '';
        }

        item[displayName] = value !== null && value !== undefined ? String(value) : '';
      });

      // 填充所有自定义字段（缺失的填空字符串，保证每行列数一致）
      allCustomKeys.forEach(key => {
        const val = ticket.metadata && ticket.metadata[key];
        item[key] = val !== null && val !== undefined ? String(val) : '';
      });

      return item;
    });

    if (format === 'json') {
      return res
        .setHeader('Content-Type', 'application/json; charset=utf-8')
        .setHeader('Content-Disposition', `attachment; filename=tickets_${Date.now()}.json`)
        .json({ success: true, data: exportData, total: exportData.length });
    }

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '工单数据');
      const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename=tickets_${Date.now()}.xlsx`);
      return res.send(xlsxBuffer);
    }

    const headers = [
      ...TICKET_EXPORT_FIELDS.map(f => ({ id: f.displayName, title: f.displayName })),
    ];

    if (tickets.length > 0 && tickets[0].metadata && typeof tickets[0].metadata === 'object') {
      Object.keys(tickets[0].metadata).forEach(key => {
        headers.push({ id: key, title: key });
      });
    }

    if (!fs.existsSync(path.join(__dirname, '../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../temp'));
    }

    const tempFilePath = path.join(__dirname, `../temp/tickets_export_${Date.now()}.csv`);

    const csvWriter = createObjectCsvWriter({
      path: tempFilePath,
      header: headers,
      encoding: 'utf8',
    });

    await csvWriter.writeRecords(exportData);

    const csvContent = fs.readFileSync(tempFilePath, 'utf8');
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    fs.unlinkSync(tempFilePath);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=tickets_${Date.now()}.csv`);
    return res.send(csvWithBom);
  } catch (error) {
    logger.error('导出工单失败', { error: error.message, stack: error.stack });
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
                  attributes: ['roomId', 'name'],
                },
              ],
            },
          ],
        },
        { model: TicketOperationRecord, as: 'operationRecords', order: [['createdAt', 'DESC']] },
      ],
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
      tags,
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
        include: [{ model: require('../models/Rack') }],
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

    const ticketId = generateId({ prefix: 'TKT' });

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
      status: 'pending',
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
      afterState: ticket.toJSON(),
    });

    // 记录创建工单成功日志
    await logTicketOperation('create', `创建工单【${ticket.title}】`, {
      targetId: ticket.ticketId,
      targetName: ticket.title,
      afterState: ticket.toJSON(),
      req,
      metadata: {
        deviceId: ticket.deviceId,
        deviceName: ticket.deviceName,
        priority: ticket.priority,
        faultCategory: ticket.faultCategory,
      },
    });

    res.status(201).json(ticket);
  } catch (error) {
    // 记录创建工单失败日志
    await logTicketOperation('create', '创建工单失败', {
      targetName: req.body.title || req.body.deviceName,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
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

    // 白名单过滤：只允许更新安全字段，防止覆盖 ticketId/createdAt 等关键字段
    const ALLOWED_UPDATE_FIELDS = [
      'title',
      'description',
      'category',
      'priority',
      'location',
      'contactPerson',
      'contactPhone',
      'contactEmail',
      'expectedDate',
      'attachments',
      'customFields',
    ];
    const updateData = {};
    ALLOWED_UPDATE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: '没有可更新的字段' });
    }

    await ticket.update(updateData);

    await TicketOperationRecord.create({
      recordId: uuidv4(),
      ticketId: ticket.ticketId,
      operationType: 'update',
      operationDescription: '更新工单信息',
      operatorId: operatorId || ticket.reporterId,
      operatorName: operatorName || ticket.reporterName,
      operatorRole: operatorRole || 'user',
      beforeState,
      afterState: ticket.toJSON(),
    });

    // 记录更新工单成功日志
    await logTicketOperation('update', `更新工单【${ticket.title}】`, {
      targetId: ticket.ticketId,
      targetName: ticket.title,
      beforeState,
      afterState: ticket.toJSON(),
      req,
      metadata: { updatedFields: Object.keys(updateData) },
    });

    res.json(ticket);
  } catch (error) {
    // 记录更新工单失败日志
    await logTicketOperation('update', '更新工单失败', {
      targetId: req.params.ticketId,
      targetName: req.body.title,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(400).json({ error: error.message });
  }
});

// 更新工单状态
router.put('/:ticketId/status', async (req, res) => {
  try {
    const { status, operatorId, operatorName, operatorRole, resolution } = req.body;

    if (!status) {
      return res.status(400).json({ error: '请提供目标状态' });
    }

    const ticket = await Ticket.findByPk(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }

    // 状态机校验：定义合法的状态流转
    const STATUS_TRANSITIONS = {
      pending: ['in_progress', 'closed'],
      in_progress: ['completed', 'closed'],
      completed: ['closed'],
      closed: [],
    };

    const allowedTransitions = STATUS_TRANSITIONS[ticket.status] || [];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        error: `不允许从 "${ticket.status}" 变更为 "${status}"，合法目标状态: ${allowedTransitions.join(', ') || '无'}`,
      });
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
      afterState: ticket.toJSON(),
    });

    // 记录工单状态变更成功日志
    await logTicketOperation('status_change', `工单【${ticket.title}】状态变更为: ${status}`, {
      targetId: ticket.ticketId,
      targetName: ticket.title,
      beforeState,
      afterState: ticket.toJSON(),
      req,
      metadata: { oldStatus: beforeState.status, newStatus: status, resolution: resolution || null },
    });

    res.json(ticket);
  } catch (error) {
    // 记录工单状态变更失败日志
    await logTicketOperation('status_change', '工单状态变更失败', {
      targetId: req.params.ticketId,
      targetName: req.body.status,
      result: 'failed',
      req,
      metadata: { error: error.message, newStatus: req.body.status },
    });
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
      resolution: solution,
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
      afterState: ticket.toJSON(),
    });

    // 记录处理工单成功日志
    await logTicketOperation('process', `处理工单【${ticket.title}】 - 结果: ${result}`, {
      targetId: ticket.ticketId,
      targetName: ticket.title,
      beforeState,
      afterState: ticket.toJSON(),
      req,
      metadata: {
        oldStatus: beforeState.status,
        newStatus: updateData.status,
        result,
        usedParts: usedParts || null,
      },
    });

    res.json(ticket);
  } catch (error) {
    // 记录处理工单失败日志
    await logTicketOperation('process', '处理工单失败', {
      targetId: req.params.ticketId,
      targetName: req.body.solution,
      result: 'failed',
      req,
      metadata: { error: error.message, result: req.body.result },
    });
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
      operatorRole,
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
      operatorRole,
    });

    // 记录添加工单操作记录成功日志
    await logTicketOperation('create', `添加工单操作记录【${operationDescription || operationType}】`, {
      targetId: ticket.ticketId,
      targetName: ticket.title,
      afterState: record.toJSON(),
      req,
      metadata: {
        recordId: record.recordId,
        operationType,
        duration: duration || null,
        result,
      },
    });

    res.status(201).json(record);
  } catch (error) {
    // 记录添加工单操作记录失败日志
    await logTicketOperation('create', '添加工单操作记录失败', {
      targetId: req.params.ticketId,
      targetName: req.body.operationDescription,
      result: 'failed',
      req,
      metadata: { error: error.message, operationType: req.body.operationType },
    });
    res.status(400).json({ error: error.message });
  }
});

// 获取工单操作记录
router.get('/:ticketId/operations', async (req, res) => {
  try {
    const records = await TicketOperationRecord.findAll({
      where: { ticketId: req.params.ticketId },
      order: [['createdAt', 'DESC']],
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

    const beforeState = ticket.toJSON();

    await ticket.destroy();

    // 记录删除工单成功日志
    await logTicketOperation('delete', `删除工单【${ticket.title}】`, {
      targetId: ticket.ticketId,
      targetName: ticket.title,
      beforeState,
      req,
      metadata: {
        deviceId: ticket.deviceId,
        deviceName: ticket.deviceName,
        status: ticket.status,
      },
    });

    res.json({ message: '工单已删除' });
  } catch (error) {
    // 记录删除工单失败日志
    await logTicketOperation('delete', '删除工单失败', {
      targetId: req.params.ticketId,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
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

    if (ticket.status !== 'completed') {
      return res.status(400).json({ error: '只有已完成的工单才能评价' });
    }

    const beforeState = ticket.toJSON();

    await ticket.update({ evaluation, evaluationRating });

    await TicketOperationRecord.create({
      recordId: uuidv4(),
      ticketId: ticket.ticketId,
      operationType: 'comment',
      operationDescription: '用户评价',
      operatorId,
      operatorName,
      operatorRole: 'user',
      notes: `评价: ${evaluation}, 星级: ${evaluationRating}`,
    });

    // 记录评价工单成功日志
    await logTicketOperation('evaluate', `评价工单【${ticket.title}】 - 星级: ${evaluationRating}`, {
      targetId: ticket.ticketId,
      targetName: ticket.title,
      beforeState,
      afterState: ticket.toJSON(),
      req,
      metadata: {
        evaluation,
        evaluationRating,
      },
    });

    res.json(ticket);
  } catch (error) {
    // 记录评价工单失败日志
    await logTicketOperation('evaluate', '评价工单失败', {
      targetId: req.params.ticketId,
      result: 'failed',
      req,
      metadata: {
        error: error.message,
        evaluation: req.body.evaluation,
        evaluationRating: req.body.evaluationRating,
      },
    });
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
