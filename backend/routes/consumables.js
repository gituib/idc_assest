const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../db');
const dayjs = require('dayjs');
const Consumable = require('../models/Consumable');
const ConsumableRecord = require('../models/ConsumableRecord');
const ConsumableLog = require('../models/ConsumableLog');
const ConsumableLogArchive = require('../models/ConsumableLogArchive');
const { PAGINATION, RETRY } = require('../config');

router.get('/', async (req, res) => {
  try {
    const {
      keyword,
      category,
      status,
      page = 1,
      pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
    } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};

    if (keyword) {
      where[Op.or] = [
        { consumableId: { [Op.like]: `%${keyword}%` } },
        { name: { [Op.like]: `%${keyword}%` } },
        { category: { [Op.like]: `%${keyword}%` } },
        { supplier: { [Op.like]: `%${keyword}%` } },
        { location: { [Op.like]: `%${keyword}%` } },
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
      order: [['createdAt', 'DESC']],
    });

    const consumables = rows.map(item => {
      const data = item.toJSON();
      if (!Array.isArray(data.snList)) {
        data.snList = [];
      }
      return data;
    });

    res.json({
      total: count,
      consumables,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const MAX_EXPORT_SIZE = 50000;

router.get('/export', async (req, res) => {
  try {
    const { keyword, category, status } = req.query;

    const where = {};

    if (keyword) {
      where[Op.or] = [
        { consumableId: { [Op.like]: `%${keyword}%` } },
        { name: { [Op.like]: `%${keyword}%` } },
        { category: { [Op.like]: `%${keyword}%` } },
        { supplier: { [Op.like]: `%${keyword}%` } },
        { location: { [Op.like]: `%${keyword}%` } },
      ];
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const consumables = await Consumable.findAll({
      where,
      limit: MAX_EXPORT_SIZE,
      order: [['createdAt', 'DESC']],
    });

    const result = consumables.map(item => {
      const data = item.toJSON();
      if (!Array.isArray(data.snList)) {
        data.snList = [];
      }
      return data;
    });

    res.json({
      consumables: result,
      total: result.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const consumableData = {
      ...req.body,
      consumableId: req.body.consumableId || `CON${Date.now()}`,
    };
    if (Array.isArray(consumableData.snList)) {
      consumableData.currentStock = consumableData.snList.length;
    }
    const consumable = await Consumable.create(consumableData, { transaction });

    await ConsumableLog.create(
      {
        consumableId: consumable.consumableId,
        consumableName: consumable.name,
        operationType: 'create',
        quantity: consumable.currentStock,
        previousStock: 0,
        currentStock: consumable.currentStock,
        operator: req.body.operator || req.body.operatorName || '系统',
        reason: '新建耗材',
        notes: req.body.description || '',
        consumableSnapshot: {
          category: consumable.category,
          unit: consumable.unit,
          unitPrice: consumable.unitPrice,
          supplier: consumable.supplier,
          location: consumable.location,
          minStock: consumable.minStock,
          maxStock: consumable.maxStock,
        },
      },
      { transaction }
    );

    await transaction.commit();
    res.status(201).json(consumable);
  } catch (error) {
    await transaction.rollback();
    console.error('创建耗材错误:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => `${e.path}: ${e.message}`).join(', ');
      res.status(400).json({ error: `Validation error: ${messages}` });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

router.post('/import', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { items, operator = '系统', mode = 'create' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '没有导入数据' });
    }

    const results = {
      success: 0,
      failed: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      details: [],
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowNumber = i + 1;

      try {
        const consumableId = item.耗材ID || item.consumableId;
        const name = item.名称 || item.name;
        const category = item.分类 || item.category;

        if (!name || !category) {
          results.failed++;
          results.errors.push(`第 ${rowNumber} 行: 名称和分类为必填项`);
          results.details.push({ row: rowNumber, status: 'failed', error: '名称和分类为必填项' });
          continue;
        }

        let snList = [];
        if (item.SN序列号 || item.snList) {
          const snStr = item.SN序列号 || item.snList;
          if (typeof snStr === 'string') {
            snList = snStr
              .split(/[,，;；\n]/)
              .map(s => s.trim())
              .filter(Boolean);
          } else if (Array.isArray(snStr)) {
            snList = snStr;
          }
        }

        const consumableData = {
          consumableId: consumableId || `CON${Date.now()}${i}`,
          name,
          category,
          unit: item.单位 || item.unit || '个',
          currentStock:
            snList.length > 0 ? snList.length : parseInt(item.当前库存 || item.currentStock) || 0,
          minStock: parseInt(item.最小库存 || item.minStock) || 10,
          maxStock: parseInt(item.最大库存 || item.maxStock) || 0,
          unitPrice: parseFloat(item.单价 || item.unitPrice) || 0,
          supplier: item.供应商 || item.supplier || '',
          location: item.存放位置 || item.location || '',
          description: item.描述 || item.description || '',
          status: item.状态 || item.status || 'active',
          snList,
        };

        let existingConsumable = null;
        if (consumableId) {
          existingConsumable = await Consumable.findByPk(consumableId, { transaction });
        }

        let consumable;
        let operationType;
        let previousStock = 0;

        if (existingConsumable) {
          if (mode === 'update') {
            previousStock = existingConsumable.currentStock;
            await existingConsumable.update(consumableData, { transaction });
            consumable = existingConsumable;
            operationType = 'import_update';
            results.updated++;
            results.details.push({
              row: rowNumber,
              status: 'updated',
              consumableId: consumable.consumableId,
              name: consumable.name,
            });
          } else {
            results.skipped++;
            results.details.push({
              row: rowNumber,
              status: 'skipped',
              reason: '耗材已存在',
              consumableId: consumableId,
            });
            continue;
          }
        } else {
          consumable = await Consumable.create(consumableData, { transaction });
          operationType = 'import';
          results.success++;
          results.details.push({
            row: rowNumber,
            status: 'created',
            consumableId: consumable.consumableId,
            name: consumable.name,
          });
        }

        await ConsumableLog.create(
          {
            consumableId: consumable.consumableId,
            consumableName: consumable.name,
            operationType,
            quantity: consumable.currentStock,
            previousStock,
            currentStock: consumable.currentStock,
            operator,
            reason: '批量导入',
            notes: existingConsumable ? '更新现有耗材' : '',
            consumableSnapshot: {
              category: consumable.category,
              unit: consumable.unit,
              unitPrice: consumable.unitPrice,
              supplier: consumable.supplier,
              location: consumable.location,
              minStock: consumable.minStock,
              maxStock: consumable.maxStock,
            },
          },
          { transaction }
        );
      } catch (error) {
        results.failed++;
        results.errors.push(`第 ${rowNumber} 行: ${error.message}`);
        results.details.push({ row: rowNumber, status: 'failed', error: error.message });
      }
    }

    await transaction.commit();
    res.json({
      message: `导入完成，成功 ${results.success} 条，更新 ${results.updated} 条，跳过 ${results.skipped} 条，失败 ${results.failed} 条`,
      results,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

router.get('/by-sn/:sn', async (req, res) => {
  try {
    const sn = req.params.sn;
    // 使用数据库 LIKE 查询替代全表扫描
    const consumables = await Consumable.findAll({
      where: {
        snList: {
          [Op.like]: `%${sn}%`,
        },
      },
    });
    // 精确匹配 SN（JSON 数组中的元素）
    const consumable = consumables.find(c => {
      const snList = Array.isArray(c.snList) ? c.snList : [];
      return snList.includes(sn);
    });
    const result = consumable ? consumable.toJSON() : null;
    if (result && !Array.isArray(result.snList)) {
      result.snList = [];
    }
    res.json({
      found: !!consumable,
      consumable: result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Consumable.findAll({
      attributes: ['category'],
      group: ['category'],
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
        status: 'active',
        [Op.and]: [
          sequelize.where(sequelize.col('currentStock'), {
            [Op.lte]: sequelize.col('minStock'),
          }),
          sequelize.where(sequelize.col('minStock'), {
            [Op.gt]: 0,
          }),
        ],
      },
      order: [['currentStock', 'ASC']],
    });
    res.json(consumables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/statistics/summary', async (req, res) => {
  try {
    const consumables = await Consumable.findAll({
      attributes: ['currentStock', 'unitPrice', 'category', 'minStock', 'status'],
    });

    let total = 0;
    let lowStock = 0;
    let totalValue = 0;
    const categoryMap = {};

    consumables.forEach(item => {
      if (item.status === 'inactive') {
        return;
      }

      total++;
      const currentStock = parseFloat(item.currentStock) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const minStockValue = parseFloat(item.minStock) || 0;

      totalValue += currentStock * unitPrice;

      if (minStockValue > 0 && currentStock <= minStockValue) {
        lowStock++;
      }

      if (item.category) {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = { count: 0, totalQuantity: 0 };
        }
        categoryMap[item.category].count++;
        categoryMap[item.category].totalQuantity += currentStock;
      }
    });

    const byCategory = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      count: data.count,
      totalQuantity: data.totalQuantity,
    }));

    res.json({
      total,
      lowStock,
      totalValue: totalValue.toFixed(2),
      byCategory,
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
      include: [
        {
          model: Consumable,
          as: 'consumable',
          attributes: ['consumableId', 'name', 'category'],
        },
      ],
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

router.post('/quick-inout', async (req, res) => {
  let attempt = 0;

  while (attempt < RETRY.MAX_RETRIES) {
    const transaction = await sequelize.transaction();
    try {
      const {
        consumableId,
        type,
        quantity,
        operator,
        reason,
        notes,
        snList,
        deviceId,
      } = req.body;

      const consumable = await Consumable.findByPk(consumableId, { transaction });
      if (!consumable) {
        await transaction.rollback();
        return res.status(404).json({ error: '耗材不存在' });
      }

      let deviceInfo = {};
      if (deviceId && type === 'out') {
        const Device = require('../models/Device');
        const Rack = require('../models/Rack');
        const Room = require('../models/Room');

        const device = await Device.findByPk(deviceId, { transaction });
        if (device) {
          deviceInfo = {
            deviceId: device.deviceId,
            deviceName: device.name,
            rackId: device.rackId,
            rackName: null,
            roomId: null,
            roomName: null,
          };

          if (device.rackId) {
            const rack = await Rack.findByPk(device.rackId, { transaction });
            if (rack) {
              deviceInfo.rackName = rack.name;
              if (rack.roomId) {
                const room = await Room.findByPk(rack.roomId, { transaction });
                if (room) {
                  deviceInfo.roomId = room.roomId;
                  deviceInfo.roomName = room.name;
                }
              }
            }
          }
        }
      }

      const previousStock = parseFloat(consumable.currentStock);
      let newStock;
      const currentSnList = consumable.snList || [];
      let updatedSnList = [...currentSnList];
      const operationSnList = snList || [];

      if (type === 'in') {
        newStock = previousStock + parseFloat(quantity);
        if (operationSnList.length > 0) {
          operationSnList.forEach(sn => {
            if (!updatedSnList.includes(sn)) {
              updatedSnList.push(sn);
            }
          });
        }
      } else if (type === 'out') {
        newStock = previousStock - parseFloat(quantity);
        if (newStock < 0) {
          await transaction.rollback();
          return res.status(400).json({ error: '库存不足' });
        }
        if (operationSnList.length > 0) {
          for (const sn of operationSnList) {
            if (!updatedSnList.includes(sn)) {
              await transaction.rollback();
              return res.status(400).json({ error: `SN "${sn}" 不存在于当前耗材中` });
            }
          }
          updatedSnList = updatedSnList.filter(sn => !operationSnList.includes(sn));
        }
      } else {
        await transaction.rollback();
        return res.status(400).json({ error: '操作类型无效' });
      }

      const [affectedRows] = await Consumable.update(
        {
          currentStock: newStock,
          snList: updatedSnList,
          version: sequelize.literal('version + 1'),
        },
        {
          where: {
            consumableId,
            version: consumable.version,
          },
          transaction,
        }
      );

      if (affectedRows === 0) {
        await transaction.rollback();
        attempt++;
        if (attempt >= RETRY.MAX_RETRIES) {
          return res.status(409).json({ error: '并发冲突，请稍后重试' });
        }
        continue;
      }

      const record = await ConsumableRecord.create(
        {
          consumableId,
          type,
          quantity,
          previousStock,
          currentStock: newStock,
          operator,
          reason,
          notes,
          snList: operationSnList,
        },
        { transaction }
      );

      await ConsumableLog.create(
        {
          consumableId,
          consumableName: consumable.name,
          operationType: type,
          quantity: type === 'in' ? parseFloat(quantity) : -parseFloat(quantity),
          previousStock,
          currentStock: newStock,
          operator,
          reason,
          notes,
          isEditable: false,
          snList: operationSnList,
          deviceId: deviceInfo.deviceId || null,
          deviceName: deviceInfo.deviceName || null,
          rackId: deviceInfo.rackId || null,
          rackName: deviceInfo.rackName || null,
          roomId: deviceInfo.roomId || null,
          roomName: deviceInfo.roomName || null,
          consumableSnapshot: {
            category: consumable.category,
            unit: consumable.unit,
            unitPrice: consumable.unitPrice,
            supplier: consumable.supplier,
            location: consumable.location,
          },
        },
        { transaction }
      );

      await transaction.commit();

      res.json({
        message: '操作成功',
        record,
        consumable: await Consumable.findByPk(consumableId),
        deviceInfo: Object.keys(deviceInfo).length > 0 ? deviceInfo : null,
      });
      return;
    } catch (error) {
      await transaction.rollback();
      if (attempt >= RETRY.MAX_RETRIES - 1) {
        return res.status(500).json({ error: error.message });
      }
      attempt++;
    }
  }
});

router.post('/inout', async (req, res) => {
  let attempt = 0;

  while (attempt < RETRY.MAX_RETRIES) {
    const transaction = await sequelize.transaction();
    try {
      const {
        consumableId,
        type,
        quantity,
        operator,
        reason,
        recipient,
        notes,
        snList,
        deviceId,
        deviceName,
      } = req.body;

      const consumable = await Consumable.findByPk(consumableId, { transaction });
      if (!consumable) {
        await transaction.rollback();
        return res.status(404).json({ error: '耗材不存在' });
      }

      let deviceInfo = {};
      if (deviceId && type === 'out') {
        const Device = require('../models/Device');
        const Rack = require('../models/Rack');
        const Room = require('../models/Room');

        const device = await Device.findByPk(deviceId, { transaction });
        if (device) {
          deviceInfo = {
            deviceId: device.deviceId,
            deviceName: device.name,
            rackId: device.rackId,
            rackName: null,
            roomId: null,
            roomName: null,
          };

          if (device.rackId) {
            const rack = await Rack.findByPk(device.rackId, { transaction });
            if (rack) {
              deviceInfo.rackName = rack.name;
              if (rack.roomId) {
                const room = await Room.findByPk(rack.roomId, { transaction });
                if (room) {
                  deviceInfo.roomId = room.roomId;
                  deviceInfo.roomName = room.name;
                }
              }
            }
          }
        }
      }

      const previousStock = parseFloat(consumable.currentStock);
      let newStock;
      const currentSnList = consumable.snList || [];
      let updatedSnList = [...currentSnList];
      const operationSnList = snList || [];

      if (type === 'in') {
        newStock = previousStock + parseFloat(quantity);
        if (operationSnList.length > 0) {
          operationSnList.forEach(sn => {
            if (!updatedSnList.includes(sn)) {
              updatedSnList.push(sn);
            }
          });
        }
      } else {
        newStock = previousStock - parseFloat(quantity);
        if (newStock < 0) {
          await transaction.rollback();
          return res.status(400).json({ error: '库存不足' });
        }
        if (operationSnList.length > 0) {
          for (const sn of operationSnList) {
            if (!updatedSnList.includes(sn)) {
              await transaction.rollback();
              return res.status(400).json({ error: `SN "${sn}" 不存在于当前耗材中` });
            }
          }
          updatedSnList = updatedSnList.filter(sn => !operationSnList.includes(sn));
        }
      }

      const [affectedRows] = await Consumable.update(
        {
          currentStock: newStock,
          snList: updatedSnList,
          version: sequelize.literal('version + 1'),
        },
        {
          where: {
            consumableId,
            version: consumable.version,
          },
          transaction,
        }
      );

      if (affectedRows === 0) {
        await transaction.rollback();
        attempt++;
        if (attempt >= RETRY.MAX_RETRIES) {
          return res.status(409).json({ error: '并发冲突，请稍后重试' });
        }
        continue;
      }

      const record = await ConsumableRecord.create(
        {
          consumableId,
          type,
          quantity,
          previousStock,
          currentStock: newStock,
          operator,
          reason,
          recipient,
          notes,
          snList: operationSnList,
        },
        { transaction }
      );

      await ConsumableLog.create(
        {
          consumableId,
          consumableName: consumable.name,
          operationType: type,
          quantity: type === 'in' ? parseFloat(quantity) : -parseFloat(quantity),
          previousStock,
          currentStock: newStock,
          operator,
          reason,
          notes,
          isEditable: false,
          snList: operationSnList,
          deviceId: deviceInfo.deviceId || null,
          deviceName: deviceInfo.deviceName || null,
          rackId: deviceInfo.rackId || null,
          rackName: deviceInfo.rackName || null,
          roomId: deviceInfo.roomId || null,
          roomName: deviceInfo.roomName || null,
          consumableSnapshot: {
            category: consumable.category,
            unit: consumable.unit,
            unitPrice: consumable.unitPrice,
            supplier: consumable.supplier,
            location: consumable.location,
          },
        },
        { transaction }
      );

      await transaction.commit();

      res.json({
        message: '操作成功',
        record,
        consumable: await Consumable.findByPk(consumableId),
        deviceInfo: Object.keys(deviceInfo).length > 0 ? deviceInfo : null,
      });
      return;
    } catch (error) {
      await transaction.rollback();
      if (attempt >= RETRY.MAX_RETRIES - 1) {
        return res.status(500).json({ error: error.message });
      }
      attempt++;
    }
  }
});

router.post('/adjust', async (req, res) => {
  let attempt = 0;

  while (attempt < RETRY.MAX_RETRIES) {
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
          version: sequelize.literal('version + 1'),
        },
        {
          where: {
            consumableId,
            version: consumable.version,
          },
          transaction,
        }
      );

      if (affectedRows === 0) {
        await transaction.rollback();
        attempt++;
        if (attempt >= RETRY.MAX_RETRIES) {
          return res.status(409).json({ error: '并发冲突，请稍后重试' });
        }
        continue;
      }

      const changeQuantity = newStock - previousStock;

      await ConsumableLog.create(
        {
          consumableId,
          consumableName: consumable.name,
          operationType: 'adjust',
          quantity: changeQuantity,
          previousStock,
          currentStock: newStock,
          operator,
          reason: reason || (adjustType === 'set' ? '库存调整为 ' + newStock : reason),
          notes: adjustType === 'set' ? `库存从 ${previousStock} 调整为 ${newStock}` : notes,
          isEditable: false,
          consumableSnapshot: {
            category: consumable.category,
            unit: consumable.unit,
            unitPrice: consumable.unitPrice,
            supplier: consumable.supplier,
            location: consumable.location,
          },
        },
        { transaction }
      );

      await transaction.commit();

      res.json({
        message: '调整成功',
        consumable: await Consumable.findByPk(consumableId),
      });
      return;
    } catch (error) {
      await transaction.rollback();
      if (attempt >= RETRY.MAX_RETRIES - 1) {
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

    if (operationType) {
      const types = operationType
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
      if (types.length === 1) {
        where.operationType = types[0];
      } else if (types.length > 1) {
        where.operationType = { [Op.in]: types };
      }
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

    const { count, rows } = await ConsumableLog.findAndCountAll({
      where,
      offset,
      limit: parseInt(pageSize),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: count,
      logs: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
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
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      where.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.createdAt = { [Op.lte]: new Date(endDate) };
    }

    const logs = await ConsumableLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    const csvHeader =
      'ID,耗材ID,耗材名称,操作类型,变动数量,操作前库存,操作后库存,操作人,原因,备注,耗材状态,分类,单位,单价,创建时间,更新时间\n';
    const csvRows = logs
      .map(log => {
        const operationTypeMap = {
          in: '入库',
          out: '出库',
          create: '创建',
          update: '更新',
          delete: '删除',
          adjust: '调整',
          import: '导入',
        };
        const snapshot = log.consumableSnapshot || {};
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
          log.isConsumableDeleted ? '已删除' : '正常',
          snapshot.category || '',
          snapshot.unit || '',
          snapshot.unitPrice || '',
          dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss'),
          dayjs(log.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
        ]
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(',');
      })
      .join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=consumable_logs_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    );
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
      errors: [],
    };

    const operationTypeMap = {
      入库: 'in',
      出库: 'out',
      创建: 'create',
      更新: 'update',
      删除: 'delete',
      调整: 'adjust',
      导入: 'import',
    };

    for (let i = 0; i < logItems.length; i++) {
      const item = logItems[i];
      try {
        const consumableId = item.耗材ID || item.consumableId || item['consumableId'];
        const consumableName = item.耗材名称 || item.consumableName || item['consumableName'];
        const operationType =
          operationTypeMap[item.操作类型 || item.operationType] ||
          item.operationType ||
          item['operationType'];

        if (!consumableId || !operationType) {
          results.failed++;
          results.errors.push(`第 ${i + 1} 行: 缺少耗材ID或操作类型`);
          continue;
        }

        await ConsumableLog.create(
          {
            consumableId,
            consumableName: consumableName || '',
            operationType,
            quantity: parseFloat(item.变动数量 || item.quantity || item['quantity']) || 0,
            previousStock:
              parseFloat(item.操作前库存 || item.previousStock || item['previousStock']) || 0,
            currentStock:
              parseFloat(item.操作后库存 || item.currentStock || item['currentStock']) || 0,
            operator: item.操作人 || item.operator || operator,
            reason: item.原因 || item.reason || '',
            notes: item.备注 || item.notes || '',
          },
          { transaction }
        );

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

// 查询归档记录列表
router.get('/archives', async (req, res) => {
  try {
    const { keyword, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};

    if (keyword) {
      where[Op.or] = [
        { consumableId: { [Op.like]: `%${keyword}%` } },
        { consumableName: { [Op.like]: `%${keyword}%` } },
        { archiveId: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const { count, rows } = await ConsumableLogArchive.findAndCountAll({
      where,
      offset,
      limit: parseInt(pageSize),
      order: [['deletedAt', 'DESC']],
    });

    res.json({
      total: count,
      archives: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 查询单个归档记录详情
router.get('/archives/:archiveId', async (req, res) => {
  try {
    const { archiveId } = req.params;

    const archive = await ConsumableLogArchive.findOne({
      where: { archiveId },
    });

    if (!archive) {
      return res.status(404).json({ error: '归档记录不存在' });
    }

    res.json(archive);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const consumable = await Consumable.findByPk(req.params.id);
    if (!consumable) {
      return res.status(404).json({ error: '耗材不存在' });
    }
    const data = consumable.toJSON();
    if (!Array.isArray(data.snList)) {
      data.snList = [];
    }
    res.json(data);
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
    const updateData = { ...req.body };
    if (Array.isArray(updateData.snList)) {
      updateData.currentStock = updateData.snList.length;
    }
    await consumable.update(updateData, { transaction });

    await ConsumableLog.create(
      {
        consumableId: consumable.consumableId,
        consumableName: consumable.name,
        operationType: 'update',
        quantity: 0,
        previousStock: consumable.currentStock,
        currentStock: consumable.currentStock,
        operator: req.body.operator || req.body.operatorName || '系统',
        reason: '信息更新',
        notes: `更新字段: ${Object.keys(req.body).join(', ')}`,
        consumableSnapshot: {
          category: consumable.category,
          unit: consumable.unit,
          unitPrice: consumable.unitPrice,
          supplier: consumable.supplier,
          location: consumable.location,
        },
      },
      { transaction }
    );

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
    const operator = req.body.operator || req.query.operator || '系统';

    const consumableSnapshot = {
      category: consumable.category,
      unit: consumable.unit,
      unitPrice: consumable.unitPrice,
      supplier: consumable.supplier,
      location: consumable.location,
      description: consumable.description,
      minStock: consumable.minStock,
      maxStock: consumable.maxStock,
      status: consumable.status,
    };

    // 查询该耗材的所有操作日志
    const logs = await ConsumableLog.findAll({
      where: { consumableId },
      order: [['createdAt', 'ASC']],
      transaction,
    });

    // 计算统计数据
    const totalOperations = logs.length;
    const totalInQuantity = logs
      .filter(l => l.operationType === 'in')
      .reduce((sum, l) => sum + (l.quantity || 0), 0);
    const totalOutQuantity = logs
      .filter(l => l.operationType === 'out')
      .reduce((sum, l) => sum + Math.abs(l.quantity || 0), 0);

    // 创建归档记录
    const archiveId = `ARC${Date.now()}`;
    await ConsumableLogArchive.create(
      {
        archiveId,
        consumableId,
        consumableName,
        consumableSnapshot,
        totalOperations,
        firstOperationAt: logs.length > 0 ? logs[0].createdAt : null,
        lastOperationAt: logs.length > 0 ? logs[logs.length - 1].createdAt : null,
        totalInQuantity,
        totalOutQuantity,
        finalStock: currentStock,
        deletedBy: operator,
        deletedAt: new Date(),
        deleteReason: req.body.reason || '删除耗材',
      },
      { transaction }
    );

    // 创建一条汇总日志（用于在日志列表中显示）
    await ConsumableLog.create(
      {
        consumableId,
        consumableName,
        operationType: 'delete',
        quantity: -currentStock,
        previousStock: currentStock,
        currentStock: 0,
        operator,
        reason: '删除耗材',
        notes: `删除耗材：${consumableName}，共${totalOperations}条操作记录已归档（归档ID: ${archiveId}）`,
        isEditable: false,
        isConsumableDeleted: true,
        consumableSnapshot,
        relatedId: archiveId, // 关联归档ID
      },
      { transaction }
    );

    // 删除原日志记录（已归档）
    await ConsumableLog.destroy({
      where: { consumableId },
      transaction,
    });

    await ConsumableRecord.destroy({
      where: { consumableId },
      transaction,
    });

    await consumable.destroy({ transaction });

    await transaction.commit();
    res.json({
      message: '删除成功',
      archiveId,
      archivedLogs: totalOperations,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

// 修改日志记录
router.put('/logs/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reason, notes, operator, modificationReason } = req.body;

    const log = await ConsumableLog.findByPk(id, { transaction });
    if (!log) {
      await transaction.rollback();
      return res.status(404).json({ error: '日志记录不存在' });
    }

    // 检查是否可编辑
    if (!log.isEditable) {
      await transaction.rollback();
      return res.status(403).json({ error: '该记录为系统自动生成，不可修改' });
    }

    // 保存原始日志ID（用于追踪修改历史）
    const originalLogId = log.originalLogId || log.id;

    // 更新当前记录，并标记为已修改
    await log.update(
      {
        reason: reason !== undefined ? reason : log.reason,
        notes: notes !== undefined ? notes : log.notes,
        modifiedBy: operator || '系统',
        modifiedAt: new Date(),
        modificationReason: modificationReason || '用户修改',
      },
      { transaction }
    );

    await transaction.commit();

    res.json({
      message: '日志修改成功',
      log: await ConsumableLog.findByPk(id),
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

// 获取日志修改历史
router.get('/logs/:id/history', async (req, res) => {
  try {
    const { id } = req.params;

    const log = await ConsumableLog.findByPk(id);
    if (!log) {
      return res.status(404).json({ error: '日志记录不存在' });
    }

    // 查询该日志的所有修改历史（包括原始记录）
    const originalLogId = log.originalLogId || log.id;

    const history = await ConsumableLog.findAll({
      where: {
        [Op.or]: [{ id: originalLogId }, { originalLogId: originalLogId }],
      },
      order: [['createdAt', 'ASC']],
    });

    res.json({
      current: log,
      history: history,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/devices/search', async (req, res) => {
  try {
    const { keyword, limit = 20 } = req.query;

    if (!keyword) {
      return res.json({ devices: [] });
    }

    const Device = require('../models/Device');
    const Rack = require('../models/Rack');
    const Room = require('../models/Room');

    const escapedKeyword = keyword.replace(/'/g, "''");

    const devices = await Device.findAll({
      where: {
        [Op.or]: [
          { deviceId: { [Op.like]: `%${escapedKeyword}%` } },
          { name: { [Op.like]: `%${escapedKeyword}%` } },
          { serialNumber: { [Op.like]: `%${escapedKeyword}%` } },
        ],
      },
      include: [
        {
          model: Rack,
          as: 'rack',
          include: [{ model: Room, as: 'room' }],
        },
      ],
      limit: parseInt(limit),
      order: [['name', 'ASC']],
    });

    const result = devices.map(device => ({
      deviceId: device.deviceId,
      name: device.name,
      type: device.type,
      model: device.model,
      serialNumber: device.serialNumber,
      status: device.status,
      location: device.rack
        ? {
            rackId: device.rack.rackId,
            rackName: device.rack.name,
            roomId: device.rack.room ? device.rack.room.roomId : null,
            roomName: device.rack.room ? device.rack.room.name : null,
          }
        : null,
    }));

    res.json({ devices: result });
  } catch (error) {
    console.error('搜索设备失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/devices/by-sn/:sn', async (req, res) => {
  try {
    const { sn } = req.params;
    const Device = require('../models/Device');

    const device = await Device.findOne({
      where: {
        [Op.or]: [
          { deviceId: { [Op.like]: `%${sn}%` } },
          { serialNumber: { [Op.like]: `%${sn}%` } },
          { name: { [Op.like]: `%${sn}%` } },
        ],
      },
    });

    if (!device) {
      return res.json({ found: false, device: null });
    }

    res.json({
      found: true,
      device: {
        deviceId: device.deviceId,
        name: device.name,
        type: device.type,
        model: device.model,
        serialNumber: device.serialNumber,
        status: device.status,
      },
    });
  } catch (error) {
    console.error('查询设备失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
