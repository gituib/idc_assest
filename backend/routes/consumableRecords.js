const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../db');
const Consumable = require('../models/Consumable');
const ConsumableRecord = require('../models/ConsumableRecord');
const ConsumableLog = require('../models/ConsumableLog');

router.get('/', async (req, res) => {
  try {
    const { consumableId, type, startDate, endDate, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};

    if (consumableId) {
      where.consumableId = consumableId;
    }

    if (type && type !== 'all') {
      where.type = type;
    }

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      where.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.createdAt = { [Op.lte]: new Date(endDate) };
    }

    const { count, rows } = await ConsumableRecord.findAndCountAll({
      where,
      include: [{ model: Consumable, as: 'consumable', attributes: ['name', 'category', 'unit'] }],
      offset,
      limit: parseInt(pageSize),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: count,
      records: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { consumableId, type, quantity, operator, reason, recipient, notes } = req.body;

    // 确保 quantity 为数值
    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '数量必须为正数' });
    }

    // 使用 SELECT ... FOR UPDATE 行级锁，防止并发修改
    const consumable = await Consumable.findByPk(consumableId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!consumable) {
      await transaction.rollback();
      return res.status(404).json({ error: '耗材不存在' });
    }

    const previousStock = consumable.currentStock;
    let newStock;

    if (type === 'in') {
      newStock = previousStock + numQuantity;
    } else if (type === 'out') {
      if (previousStock < numQuantity) {
        await transaction.rollback();
        return res.status(400).json({ error: '库存不足' });
      }
      newStock = previousStock - numQuantity;
    } else {
      await transaction.rollback();
      return res.status(400).json({ error: '操作类型无效' });
    }

    await consumable.update({ currentStock: newStock }, { transaction });

    const record = await ConsumableRecord.create(
      {
        consumableId,
        type,
        quantity: numQuantity,
        previousStock,
        currentStock: newStock,
        operator,
        reason,
        recipient,
        notes,
      },
      { transaction }
    );

    await ConsumableLog.create(
      {
        consumableId,
        consumableName: consumable.name,
        operationType: type,
        quantity: type === 'in' ? numQuantity : -numQuantity,
        previousStock,
        currentStock: newStock,
        operator,
        reason,
        notes,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(201).json({
      record,
      consumable: {
        previousStock,
        currentStock: newStock,
      },
    });
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ error: error.message });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;

    const dateWhere = {};
    if (startDate && endDate) {
      // 修复日期范围查询：startDate 从 00:00:00 开始，endDate 到 23:59:59 结束
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999); // 设置 endDate 为当天最后一刻

      dateWhere.createdAt = {
        [Op.gte]: startDateTime,
        [Op.lte]: endDateTime,
      };
    }

    const consumableWhere = {};
    if (category) {
      consumableWhere.category = category;
    }

    const records = await ConsumableRecord.findAll({
      where: dateWhere,
      include: [
        {
          model: Consumable,
          as: 'consumable',
          attributes: ['name', 'category'],
          where: Object.keys(consumableWhere).length > 0 ? consumableWhere : undefined,
        },
      ],
      attributes: ['type', 'quantity'],
    });

    let inCount = 0;
    let outCount = 0;
    let inQuantity = 0;
    let outQuantity = 0;
    const typeMap = {};

    records.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      if (item.type === 'in') {
        inCount++;
        inQuantity += qty;
      } else if (item.type === 'out') {
        outCount++;
        outQuantity += qty;
      }

      if (!typeMap[item.type]) {
        typeMap[item.type] = { count: 0, totalQuantity: 0 };
      }
      typeMap[item.type].count++;
      typeMap[item.type].totalQuantity += qty;
    });

    const recentRecords = await ConsumableRecord.findAll({
      where: dateWhere,
      include: [
        {
          model: Consumable,
          as: 'consumable',
          attributes: ['name', 'category'],
          where: Object.keys(consumableWhere).length > 0 ? consumableWhere : undefined,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    res.json({
      inCount,
      outCount,
      inQuantity,
      outQuantity,
      netQuantity: inQuantity - outQuantity,
      byType: Object.entries(typeMap).map(([type, data]) => ({
        type,
        totalQuantity: data.totalQuantity,
        count: data.count,
      })),
      recentRecords: recentRecords.map(record => ({
        recordId: record.recordId,
        type: record.type,
        quantity: record.quantity,
        operator: record.operator,
        createdAt: record.createdAt,
        consumableId: record.consumableId,
        consumableName: record.consumable?.name || '未知耗材',
        category: record.consumable?.category || null,
        unit: record.consumable?.unit || '个',
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
