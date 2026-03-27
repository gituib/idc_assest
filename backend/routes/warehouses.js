const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Warehouse = require('../models/Warehouse');
const Device = require('../models/Device');
const { logDeviceOperation } = require('../utils/operationLogger');

async function generateWarehouseId() {
  const warehouses = await Warehouse.findAll({
    where: {
      warehouseId: { [Op.like]: 'WH%' },
    },
  });

  let maxNumber = 0;
  warehouses.forEach(wh => {
    const match = wh.warehouseId.match(/^WH(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });

  const newNumber = maxNumber + 1;
  return `WH${String(newNumber).padStart(3, '0')}`;
}

router.get('/', async (req, res) => {
  try {
    const { keyword, status, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};

    if (keyword) {
      where[Op.or] = [
        { warehouseId: { [Op.like]: `%${keyword}%` } },
        { name: { [Op.like]: `%${keyword}%` } },
        { location: { [Op.like]: `%${keyword}%` } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const { count, rows } = await Warehouse.findAndCountAll({
      where,
      offset: parseInt(offset),
      limit: parseInt(pageSize),
      order: [['createdAt', 'DESC']],
    });

    const warehousesWithCount = await Promise.all(
      rows.map(async warehouse => {
        const deviceCount = await Device.count({
          where: { warehouseId: warehouse.warehouseId, isIdle: true },
        });
        return {
          ...warehouse.toJSON(),
          deviceCount,
        };
      })
    );

    res.json({
      total: count,
      warehouses: warehousesWithCount,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    console.error('获取库房列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:warehouseId', async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.warehouseId);
    if (!warehouse) {
      return res.status(404).json({ error: '库房不存在' });
    }

    const deviceCount = await Device.count({
      where: { warehouseId: warehouse.warehouseId, isIdle: true },
    });

    res.json({
      ...warehouse.toJSON(),
      deviceCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:warehouseId/devices', async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const warehouse = await Warehouse.findByPk(req.params.warehouseId);
    if (!warehouse) {
      return res.status(404).json({ error: '库房不存在' });
    }

    const { count, rows } = await Device.findAndCountAll({
      where: { warehouseId: req.params.warehouseId, isIdle: true },
      offset: parseInt(offset),
      limit: parseInt(pageSize),
      order: [['idleDate', 'DESC']],
    });

    res.json({
      total: count,
      devices: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    console.error('获取库房设备失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, location, capacity, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: '库房名称不能为空' });
    }

    const warehouseId = await generateWarehouseId();

    const warehouse = await Warehouse.create({
      warehouseId,
      name,
      location: location || '',
      capacity: capacity || 100,
      status: 'active',
      description: description || '',
    });

    await logDeviceOperation('create', `创建库房【${name}】`, {
      targetId: warehouse.warehouseId,
      targetName: name,
      afterState: warehouse.toJSON(),
      req,
      metadata: { type: 'warehouse_create' },
    });

    res.status(201).json(warehouse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:warehouseId', async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.warehouseId);
    if (!warehouse) {
      return res.status(404).json({ error: '库房不存在' });
    }

    const beforeState = warehouse.toJSON();
    const { name, location, capacity, status, description } = req.body;

    if (name) {
      warehouse.name = name;
    }
    if (location !== undefined) {
      warehouse.location = location;
    }
    if (capacity !== undefined) {
      warehouse.capacity = capacity;
    }
    if (status) {
      warehouse.status = status;
    }
    if (description !== undefined) {
      warehouse.description = description;
    }

    await warehouse.save();

    await logDeviceOperation('update', `更新库房【${warehouse.name}】`, {
      targetId: warehouse.warehouseId,
      targetName: warehouse.name,
      beforeState,
      afterState: warehouse.toJSON(),
      req,
      metadata: { type: 'warehouse_update' },
    });

    res.json(warehouse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:warehouseId', async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.warehouseId);
    if (!warehouse) {
      return res.status(404).json({ error: '库房不存在' });
    }

    const idleDeviceCount = await Device.count({
      where: { warehouseId: req.params.warehouseId, isIdle: true },
    });

    if (idleDeviceCount > 0) {
      return res.status(400).json({
        error: `库房中还有 ${idleDeviceCount} 台空闲设备，请先处理后再删除`,
      });
    }

    const warehouseName = warehouse.name;
    await warehouse.destroy();

    await logDeviceOperation('delete', `删除库房【${warehouseName}】`, {
      targetId: req.params.warehouseId,
      targetName: warehouseName,
      req,
      metadata: { type: 'warehouse_delete' },
    });

    res.json({ message: '库房删除成功' });
  } catch (error) {
    console.error('删除库房失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
