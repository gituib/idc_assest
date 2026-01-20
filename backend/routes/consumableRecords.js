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
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.createdAt = { [Op.lte]: new Date(endDate) };
    }
    
    const { count, rows } = await ConsumableRecord.findAndCountAll({
      where,
      include: [
        { model: Consumable, attributes: ['name', 'category', 'unit'] }
      ],
      offset,
      limit: parseInt(pageSize),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      total: count,
      records: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { consumableId, type, quantity, operator, reason, recipient, notes } = req.body;
    
    const consumable = await Consumable.findByPk(consumableId);
    if (!consumable) {
      await transaction.rollback();
      return res.status(404).json({ error: '耗材不存在' });
    }
    
    const previousStock = consumable.currentStock;
    let newStock;
    
    if (type === 'in') {
      newStock = previousStock + quantity;
    } else if (type === 'out') {
      if (previousStock < quantity) {
        await transaction.rollback();
        return res.status(400).json({ error: '库存不足' });
      }
      newStock = previousStock - quantity;
    } else {
      await transaction.rollback();
      return res.status(400).json({ error: '操作类型无效' });
    }
    
    await consumable.update({ currentStock: newStock }, { transaction });
    
    const record = await ConsumableRecord.create({
      consumableId,
      type,
      quantity,
      previousStock,
      currentStock: newStock,
      operator,
      reason,
      recipient,
      notes
    }, { transaction });

    await ConsumableLog.create({
      consumableId,
      consumableName: consumable.name,
      operationType: type,
      quantity: type === 'in' ? parseFloat(quantity) : -parseFloat(quantity),
      previousStock,
      currentStock: newStock,
      operator,
      reason,
      notes
    }, { transaction });

    await transaction.commit();
    
    res.status(201).json({
      record,
      consumable: {
        previousStock,
        currentStock: newStock
      }
    });
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ error: error.message });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateWhere = {};
    if (startDate && endDate) {
      dateWhere.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const records = await ConsumableRecord.findAll({
      where: dateWhere,
      attributes: ['type', 'quantity']
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
        { model: Consumable, attributes: ['name', 'category'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
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
        count: data.count
      })),
      recentRecords
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
