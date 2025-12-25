const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const FaultCategory = require('../models/FaultCategory');

router.get('/', async (req, res) => {
  try {
    const { isActive } = req.query;
    const where = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const categories = await FaultCategory.findAll({
      where,
      order: [['priority', 'ASC'], ['name', 'ASC']]
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const Ticket = require('../models/Ticket');
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate + ' 23:59:59');
    }

    const stats = await Ticket.findAll({
      where,
      attributes: [
        'faultCategory',
        [require('sequelize').fn('COUNT', '*'), 'totalCount'],
        [require('sequelize').sum(require('sequelize').case({
          when: { status: 'completed' },
          then: 1
        }, 0)), 'completedCount'],
        [require('sequelize').sum(require('sequelize').case({
          when: { status: { [Op.ne]: 'completed' } },
          then: 1
        }, 0)), 'pendingCount']
      ],
      group: ['faultCategory']
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:categoryId', async (req, res) => {
  try {
    const category = await FaultCategory.findByPk(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      priority,
      defaultPriority,
      expectedDuration,
      solutions,
      isActive
    } = req.body;

    const existing = await FaultCategory.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: '分类名称已存在' });
    }

    const categoryId = `CAT${Date.now().toString(36).toUpperCase()}`;

    const category = await FaultCategory.create({
      categoryId,
      name,
      description,
      priority: priority || 99,
      defaultPriority: defaultPriority || 'medium',
      expectedDuration: expectedDuration ? parseInt(expectedDuration) : null,
      solutions: solutions || [],
      isSystem: false,
      isActive: isActive !== false
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/init', async (req, res) => {
  try {
    const defaultCategories = [
      { name: '系统故障', description: '操作系统、应用程序等系统软件的故障问题', priority: 1, defaultPriority: 'high' },
      { name: '硬件故障', description: '物理设备、服务器、存储等硬件设备的故障问题', priority: 2, defaultPriority: 'high' },
      { name: '网络故障', description: '网络连接、交换机、路由器等网络相关故障', priority: 3, defaultPriority: 'high' },
      { name: '软件故障', description: '应用程序错误、软件兼容性等问题', priority: 4, defaultPriority: 'medium' },
      { name: '安全事件', description: '安全漏洞、入侵检测、权限异常等安全问题', priority: 5, defaultPriority: 'urgent' },
      { name: '性能问题', description: '系统响应慢、资源利用率高等性能问题', priority: 6, defaultPriority: 'medium' },
      { name: '配置变更', description: '系统配置、软件配置等变更需求', priority: 7, defaultPriority: 'low' },
      { name: '例行维护', description: '定期维护、巡检、更新等计划性工作', priority: 8, defaultPriority: 'low' },
      { name: '数据问题', description: '数据错误、数据丢失、数据同步等数据相关问题', priority: 9, defaultPriority: 'high' },
      { name: '其他问题', description: '无法归类的其他问题', priority: 99, defaultPriority: 'medium' }
    ];

    for (const cat of defaultCategories) {
      const existing = await FaultCategory.findOne({ where: { name: cat.name } });
      if (!existing) {
        const categoryId = `CAT${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        await FaultCategory.create({
          categoryId,
          ...cat,
          expectedDuration: 120,
          solutions: [],
          isSystem: true,
          isActive: true
        });
      }
    }

    res.json({ message: '分类初始化成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:categoryId', async (req, res) => {
  try {
    const category = await FaultCategory.findByPk(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    await category.update(req.body);
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:categoryId', async (req, res) => {
  try {
    const category = await FaultCategory.findByPk(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    const Ticket = require('../models/Ticket');
    const ticketCount = await Ticket.count({ where: { faultCategory: category.name } });
    if (ticketCount > 0) {
      return res.status(400).json({ error: `该分类下有 ${ticketCount} 个工单，无法删除` });
    }

    await category.destroy();
    res.json({ message: '分类已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:categoryId/toggle', async (req, res) => {
  try {
    const category = await FaultCategory.findByPk(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    await category.update({ isActive: !category.isActive });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
