const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const NetworkCard = require('../models/NetworkCard');
const Device = require('../models/Device');
const DevicePort = require('../models/DevicePort');

NetworkCard.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });
Device.hasMany(NetworkCard, { foreignKey: 'deviceId', as: 'networkCards' });
NetworkCard.hasMany(DevicePort, { foreignKey: 'nicId', as: 'ports' });

router.get('/', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const where = {};
    
    if (deviceId) {
      where.deviceId = deviceId;
    }

    const networkCards = await NetworkCard.findAll({
      where,
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['deviceId', 'name', 'type']
        }
      ],
      order: [['slotNumber', 'ASC'], ['name', 'ASC']]
    });

    res.json(networkCards);
  } catch (error) {
    console.error('获取网卡列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const networkCards = await NetworkCard.findAll({
      where: { deviceId },
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['deviceId', 'name', 'type']
        }
      ],
      order: [['slotNumber', 'ASC'], ['name', 'ASC']]
    });

    res.json(networkCards);
  } catch (error) {
    console.error('获取设备网卡失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/device/:deviceId/with-ports', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const networkCards = await NetworkCard.findAll({
      where: { deviceId },
      order: [['slotNumber', 'ASC'], ['name', 'ASC']]
    });

    const cardsWithPorts = await Promise.all(
      networkCards.map(async (card) => {
        const ports = await DevicePort.findAll({
          where: { nicId: card.nicId },
          order: [['portName', 'ASC']]
        });

        const freeCount = ports.filter(p => p.status === 'free').length;
        const occupiedCount = ports.filter(p => p.status === 'occupied').length;
        const faultCount = ports.filter(p => p.status === 'fault').length;

        return {
          ...card.toJSON(),
          ports,
          stats: {
            total: ports.length,
            free: freeCount,
            occupied: occupiedCount,
            fault: faultCount
          }
        };
      })
    );

    const ungroupedPorts = await DevicePort.findAll({
      where: { deviceId, nicId: null },
      order: [['portName', 'ASC']]
    });

    if (ungroupedPorts.length > 0) {
      cardsWithPorts.push({
        nicId: '_ungrouped',
        name: '未分组端口',
        description: '未分配到网卡的端口',
        portCount: ungroupedPorts.length,
        isUngrouped: true,
        ports: ungroupedPorts,
        stats: {
          total: ungroupedPorts.length,
          free: ungroupedPorts.filter(p => p.status === 'free').length,
          occupied: ungroupedPorts.filter(p => p.status === 'occupied').length,
          fault: ungroupedPorts.filter(p => p.status === 'fault').length
        }
      });
    }

    res.json(cardsWithPorts);
  } catch (error) {
    console.error('获取网卡及端口失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:nicId', async (req, res) => {
  try {
    const networkCard = await NetworkCard.findByPk(req.params.nicId, {
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['deviceId', 'name', 'type']
        }
      ]
    });

    if (!networkCard) {
      return res.status(404).json({ error: '网卡不存在' });
    }

    res.json(networkCard);
  } catch (error) {
    console.error('获取网卡详情失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:nicId/ports', async (req, res) => {
  try {
    const { nicId } = req.params;

    const ports = await DevicePort.findAll({
      where: { nicId },
      order: [['portName', 'ASC']]
    });

    res.json(ports);
  } catch (error) {
    console.error('获取网卡端口失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/find', async (req, res) => {
  try {
    const { deviceId, name } = req.query;

    if (!deviceId || !name) {
      return res.status(400).json({ error: '缺少设备ID或网卡名称' });
    }

    const networkCard = await NetworkCard.findOne({
      where: { deviceId, name }
    });

    if (!networkCard) {
      return res.json({ nicId: null });
    }

    res.json(networkCard);
  } catch (error) {
    console.error('查找网卡失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nicId, deviceId, name, description, slotNumber, model, manufacturer, status } = req.body;

    if (!deviceId || !name) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const existingCard = await NetworkCard.findOne({
      where: { deviceId, name }
    });

    if (existingCard) {
      return res.status(400).json({ error: '该设备已存在同名网卡' });
    }

    const autoNicId = nicId || `NIC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const networkCard = await NetworkCard.create({
      nicId: autoNicId,
      deviceId,
      name,
      description,
      slotNumber,
      model,
      manufacturer,
      status: status || 'normal',
      portCount: 0
    });

    const createdCard = await NetworkCard.findByPk(networkCard.nicId, {
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['deviceId', 'name', 'type']
        }
      ]
    });

    res.status(201).json(createdCard);
  } catch (error) {
    console.error('创建网卡失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:nicId', async (req, res) => {
  try {
    const [updated] = await NetworkCard.update(req.body, {
      where: { nicId: req.params.nicId }
    });

    if (updated) {
      const networkCard = await NetworkCard.findByPk(req.params.nicId, {
        include: [
          {
            model: Device,
            as: 'device',
            attributes: ['deviceId', 'name', 'type']
          }
        ]
      });
      res.json(networkCard);
    } else {
      res.status(404).json({ error: '网卡不存在' });
    }
  } catch (error) {
    console.error('更新网卡失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:nicId', async (req, res) => {
  try {
    const { nicId } = req.params;

    const portCount = await DevicePort.count({ where: { nicId } });
    if (portCount > 0) {
      return res.status(400).json({ 
        error: `该网卡下还有 ${portCount} 个端口，请先删除或转移端口后再删除网卡` 
      });
    }

    const deleted = await NetworkCard.destroy({
      where: { nicId }
    });

    if (deleted) {
      res.status(204).json();
    } else {
      res.status(404).json({ error: '网卡不存在' });
    }
  } catch (error) {
    console.error('删除网卡失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
