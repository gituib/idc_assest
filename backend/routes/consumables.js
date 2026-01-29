const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../db');
const dayjs = require('dayjs');
const Consumable = require('../models/Consumable');
const ConsumableRecord = require('../models/ConsumableRecord');
const ConsumableLog = require('../models/ConsumableLog');

router.get('/', async (req, res) => {
  try {
    const { keyword, category, status, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;
    
    const where = {};
    
    if (keyword) {
      where[Op.or] = [
        { consumableId: { [Op.like]: `%${keyword}%` } },
        { name: { [Op.like]: `%${keyword}%` } },
        { category: { [Op.like]: `%${keyword}%` } },
        { supplier: { [Op.like]: `%${keyword}%` } },
        { location: { [Op.like]: `%${keyword}%` } }
      ];
    }
    
    if (category && category !== 'all') {
      where.category = category;
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    const { count, rows } = await Consumable.findAndCountAll({
      where,
      offset,
      limit: parseInt(pageSize),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      total: count,
      consumables: rows,
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
    const consumable = await Consumable.create(req.body, { transaction });
    
    await ConsumableLog.create({
      consumableId: consumable.consumableId,
      consumableName: consumable.name,
      operationType: 'create',
      quantity: consumable.currentStock,
      previousStock: 0,
      currentStock: consumable.currentStock,
      operator: req.body.operator || req.body.operatorName || '系统',
      reason: '新建耗材',
      notes: req.body.description || ''
    }, { transaction });
    
    await transaction.commit();
    res.status(201).json(consumable);
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ error: error.message });
  }
});

router.post('/import', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { items, operator = '系统' } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '没有导入数据' });
    }
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const consumableData = {
          consumableId: item.耗材ID || item.consumableId || `CON${Date.now()}${i}`,
          name: item.名称 || item.name,
          category: item.分类 || item.category,
          unit: item.单位 || item.unit || '个',
          currentStock: parseInt(item.当前库存 || item.currentStock) || 0,
          minStock: parseInt(item.最小库存 || item.minStock) || 10,
          maxStock: parseInt(item.最大库存 || item.maxStock) || 100,
          unitPrice: parseFloat(item.单价 || item.unitPrice) || 0,
          supplier: item.供应商 || item.supplier || '',
          location: item.存放位置 || item.location || '',
          description: item.描述 || item.description || '',
          status: item.状态 || item.status || 'active'
        };
        
        if (!consumableData.name || !consumableData.category) {
          results.failed++;
          results.errors.push(`第 ${i + 1} 行: 名称和分类为必填项`);
          continue;
        }
        
        const consumable = await Consumable.create(consumableData, { transaction });
        
        await ConsumableLog.create({
          consumableId: consumable.consumableId,
          consumableName: consumable.name,
          operationType: 'import',
          quantity: consumable.currentStock,
          previousStock: 0,
          currentStock: consumable.currentStock,
          operator,
          reason: '批量导入',
          notes: ''
        }, { transaction });
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`第 ${i + 1} 行: ${error.message}`);
      }
    }
    
    await transaction.commit();
    res.json({
      message: `导入完成，成功 ${results.success} 条，失败 ${results.failed} 条`,
      results
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Consumable.findAll({
      attributes: ['category'],
      group: ['category']
    });
    const categoryList = categories.map(item => item.category).filter(Boolean);
    res.json(categoryList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/low-stock', async (req, res) => {
  try {
    const consumables = await Consumable.findAll({
      where: {
        [Op.and]: [
          sequelize.where(sequelize.col('currentStock'), {
            [Op.lte]: sequelize.col('minStock')
          })
        ]
      }
    });
    res.json(consumables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/statistics/summary', async (req, res) => {
  try {
    const consumables = await Consumable.findAll({
      attributes: ['currentStock', 'unitPrice', 'category']
    });

    let total = consumables.length;
    let lowStock = 0;
    let totalValue = 0;
    const categoryMap = {};

    consumables.forEach(item => {
      const currentStock = parseFloat(item.currentStock) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;

      totalValue += currentStock * unitPrice;

      if (currentStock <= (parseFloat(item.minStock) || 0)) {
        lowStock++;
      }

      if (item.category) {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = 0;
        }
        categoryMap[item.category]++;
      }
    });

    const byCategory = Object.entries(categoryMap).map(([category, count]) => ({
      category,
      count
    }));

    res.json({
      total,
      lowStock,
      totalValue: totalValue.toFixed(2),
      byCategory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/inout/records', async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;
    
    const { count, rows } = await ConsumableRecord.findAndCountAll({
      offset,
      limit: parseInt(pageSize),
      order: [['createdAt', 'DESC']],
      include: [{
        model: Consumable,
        as: 'Consumable',
        attributes: ['consumableId', 'name', 'category']
      }]
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

router.post('/quick-inout', async (req, res) => {
  const MAX_RETRIES = 3;
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    const transaction = await sequelize.transaction();
    try {
      const { consumableId, type, quantity, operator, reason, notes } = req.body;
      
      const consumable = await Consumable.findByPk(consumableId, { transaction });
      if (!consumable) {
        await transaction.rollback();
        return res.status(404).json({ error: '耗材不存在' });
      }
      
      const previousStock = parseFloat(consumable.currentStock);
      let newStock;
      
      if (type === 'in') {
        newStock = previousStock + parseFloat(quantity);
      } else if (type === 'out') {
        newStock = previousStock - parseFloat(quantity);
        if (newStock < 0) {
          await transaction.rollback();
          return res.status(400).json({ error: '库存不足' });
        }
      } else {
        await transaction.rollback();
        return res.status(400).json({ error: '操作类型无效' });
      }
      
      const [affectedRows] = await Consumable.update(
        { 
          currentStock: newStock,
          version: sequelize.literal('version + 1')
        },
        { 
          where: { 
            consumableId,
            version: consumable.version
          },
          transaction 
        }
      );
      
      if (affectedRows === 0) {
        await transaction.rollback();
        attempt++;
        if (attempt >= MAX_RETRIES) {
          return res.status(409).json({ error: '并发冲突，请稍后重试' });
        }
        continue;
      }
      
      const record = await ConsumableRecord.create({
        consumableId,
        type,
        quantity,
        previousStock,
        currentStock: newStock,
        operator,
        reason,
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
      
      res.json({
        message: '操作成功',
        record,
        consumable: await Consumable.findByPk(consumableId)
      });
      return;
    } catch (error) {
      await transaction.rollback();
      if (attempt >= MAX_RETRIES - 1) {
        return res.status(500).json({ error: error.message });
      }
      attempt++;
    }
  }
});

router.post('/inout', async (req, res) => {
  const MAX_RETRIES = 3;
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    const transaction = await sequelize.transaction();
    try {
      const { consumableId, type, quantity, operator, reason, recipient, notes } = req.body;
      
      const consumable = await Consumable.findByPk(consumableId, { transaction });
      if (!consumable) {
        await transaction.rollback();
        return res.status(404).json({ error: '耗材不存在' });
      }
      
      const previousStock = parseFloat(consumable.currentStock);
      let newStock;
      
      if (type === 'in') {
        newStock = previousStock + parseFloat(quantity);
      } else {
        newStock = previousStock - parseFloat(quantity);
        if (newStock < 0) {
          await transaction.rollback();
          return res.status(400).json({ error: '库存不足' });
        }
      }
      
      const [affectedRows] = await Consumable.update(
        { 
          currentStock: newStock,
          version: sequelize.literal('version + 1')
        },
        { 
          where: { 
            consumableId,
            version: consumable.version
          },
          transaction 
        }
      );
      
      if (affectedRows === 0) {
        await transaction.rollback();
        attempt++;
        if (attempt >= MAX_RETRIES) {
          return res.status(409).json({ error: '并发冲突，请稍后重试' });
        }
        continue;
      }
      
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
      
      res.json({
        message: '操作成功',
        record,
        consumable: await Consumable.findByPk(consumableId)
      });
      return;
    } catch (error) {
      await transaction.rollback();
      if (attempt >= MAX_RETRIES - 1) {
        return res.status(500).json({ error: error.message });
      }
      attempt++;
    }
  }
});

router.post('/adjust', async (req, res) => {
  const MAX_RETRIES = 3;
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    const transaction = await sequelize.transaction();
    try {
      const { consumableId, adjustType, quantity, operator, reason, notes } = req.body;
      
      const consumable = await Consumable.findByPk(consumableId, { transaction });
      if (!consumable) {
        await transaction.rollback();
        return res.status(404).json({ error: '耗材不存在' });
      }
      
      const previousStock = parseFloat(consumable.currentStock);
      let newStock;
      
      if (adjustType === 'add') {
        newStock = previousStock + parseFloat(quantity);
      } else if (adjustType === 'subtract') {
        newStock = previousStock - parseFloat(quantity);
        if (newStock < 0) {
          await transaction.rollback();
          return res.status(400).json({ error: '调整后库存不能为负' });
        }
      } else if (adjustType === 'set') {
        newStock = parseFloat(quantity);
        if (newStock < 0) {
          await transaction.rollback();
          return res.status(400).json({ error: '库存不能设置为负数' });
        }
      } else {
        await transaction.rollback();
        return res.status(400).json({ error: '调整类型无效' });
      }
      
      const [affectedRows] = await Consumable.update(
        { 
          currentStock: newStock,
          version: sequelize.literal('version + 1')
        },
        { 
          where: { 
            consumableId,
            version: consumable.version
          },
          transaction 
        }
      );
      
      if (affectedRows === 0) {
        await transaction.rollback();
        attempt++;
        if (attempt >= MAX_RETRIES) {
          return res.status(409).json({ error: '并发冲突，请稍后重试' });
        }
        continue;
      }
      
      const changeQuantity = newStock - previousStock;
      
      await ConsumableLog.create({
        consumableId,
        consumableName: consumable.name,
        operationType: 'adjust',
        quantity: changeQuantity,
        previousStock,
        currentStock: newStock,
        operator,
        reason: reason || (adjustType === 'set' ? '库存调整为 ' + newStock : reason),
        notes: adjustType === 'set' ? `库存从 ${previousStock} 调整为 ${newStock}` : notes
      }, { transaction });
      
      await transaction.commit();
      
      res.json({
        message: '调整成功',
        consumable: await Consumable.findByPk(consumableId)
      });
      return;
    } catch (error) {
      await transaction.rollback();
      if (attempt >= MAX_RETRIES - 1) {
        return res.status(500).json({ error: error.message });
      }
      attempt++;
    }
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { consumableId, operationType, startDate, endDate, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    
    const where = {};
    
    if (consumableId) {
      where.consumableId = consumableId;
    }
    
    if (operationType && operationType !== 'all') {
      where.operationType = operationType;
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
    
    const { count, rows } = await ConsumableLog.findAndCountAll({
      where,
      offset,
      limit: parseInt(pageSize),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      total: count,
      logs: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/logs/export', async (req, res) => {
  try {
    const { consumableId, operationType, startDate, endDate } = req.query;
    
    const where = {};
    
    if (consumableId) {
      where.consumableId = consumableId;
    }
    
    if (operationType && operationType !== 'all') {
      where.operationType = operationType;
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
    
    const logs = await ConsumableLog.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    
    const csvHeader = 'ID,耗材ID,耗材名称,操作类型,变动数量,操作前库存,操作后库存,操作人,原因,备注,创建时间,更新时间\n';
    const csvRows = logs.map(log => {
      const operationTypeMap = {
        'in': '入库',
        'out': '出库',
        'create': '创建',
        'update': '更新',
        'delete': '删除',
        'adjust': '调整',
        'import': '导入'
      };
      return [
        log.id,
        log.consumableId,
        log.consumableName,
        operationTypeMap[log.operationType] || log.operationType,
        log.quantity,
        log.previousStock,
        log.currentStock,
        log.operator,
        log.reason || '',
        log.notes || '',
        dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        dayjs(log.updatedAt).format('YYYY-MM-DD HH:mm:ss')
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=consumable_logs_${dayjs().format('YYYYMMDD_HHmmss')}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/logs/import', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { logs: logItems, operator = '系统导入' } = req.body;
    
    if (!logItems || !Array.isArray(logItems) || logItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '没有导入数据' });
    }
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    const operationTypeMap = {
      '入库': 'in',
      '出库': 'out',
      '创建': 'create',
      '更新': 'update',
      '删除': 'delete',
      '调整': 'adjust',
      '导入': 'import'
    };
    
    for (let i = 0; i < logItems.length; i++) {
      const item = logItems[i];
      try {
        const consumableId = item.耗材ID || item.consumableId || item['consumableId'];
        const consumableName = item.耗材名称 || item.consumableName || item['consumableName'];
        const operationType = operationTypeMap[item.操作类型 || item.operationType] || item.operationType || item['operationType'];
        
        if (!consumableId || !operationType) {
          results.failed++;
          results.errors.push(`第 ${i + 1} 行: 缺少耗材ID或操作类型`);
          continue;
        }
        
        await ConsumableLog.create({
          consumableId,
          consumableName: consumableName || '',
          operationType,
          quantity: parseFloat(item.变动数量 || item.quantity || item['quantity']) || 0,
          previousStock: parseFloat(item.操作前库存 || item.previousStock || item['previousStock']) || 0,
          currentStock: parseFloat(item.操作后库存 || item.currentStock || item['currentStock']) || 0,
          operator: item.操作人 || item.operator || operator,
          reason: item.原因 || item.reason || '',
          notes: item.备注 || item.notes || ''
        }, { transaction });
        
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`第 ${i + 1} 行: ${err.message}`);
      }
    }
    
    await transaction.commit();
    res.json(results);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const consumable = await Consumable.findByPk(req.params.id);
    if (!consumable) {
      return res.status(404).json({ error: '耗材不存在' });
    }
    res.json(consumable);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const consumable = await Consumable.findByPk(req.params.id, { transaction });
    if (!consumable) {
      await transaction.rollback();
      return res.status(404).json({ error: '耗材不存在' });
    }
    
    const oldData = consumable.toJSON();
    await consumable.update(req.body, { transaction });
    
    await ConsumableLog.create({
      consumableId: consumable.consumableId,
      consumableName: consumable.name,
      operationType: 'update',
      quantity: 0,
      previousStock: consumable.currentStock,
      currentStock: consumable.currentStock,
      operator: req.body.operator || req.body.operatorName || '系统',
      reason: '信息更新',
      notes: `更新字段: ${Object.keys(req.body).join(', ')}`
    }, { transaction });
    
    await transaction.commit();
    res.json(consumable);
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const consumable = await Consumable.findByPk(req.params.id, { transaction });
    if (!consumable) {
      await transaction.rollback();
      return res.status(404).json({ error: '耗材不存在' });
    }
    
    const consumableId = consumable.consumableId;
    const consumableName = consumable.name;
    const currentStock = consumable.currentStock;
    
    await ConsumableRecord.destroy({
      where: { consumableId },
      transaction
    });
    
    await ConsumableLog.destroy({
      where: { consumableId },
      transaction
    });
    
    await consumable.destroy({ transaction });
    
    await transaction.commit();
    res.json({ message: '删除成功' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
