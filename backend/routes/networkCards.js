const logger = require('../utils/logger').module('NetworkCardsRoute');
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const NetworkCard = require('../models/NetworkCard');
const Device = require('../models/Device');
const DevicePort = require('../models/DevicePort');
const { logOperation } = require('../utils/operationLogger');

/**
 * 记录网卡操作日志
 * @param {string} operationType - 操作类型
 * @param {string} operationDescription - 操作描述
 * @param {Object} params - 参数
 * @returns {Promise<Object|null>}
 */
const logNetworkCardOperation = (operationType, operationDescription, params) =>
  logOperation({ module: 'network_card', operationType, operationDescription, ...params });

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
          attributes: ['deviceId', 'name', 'type'],
        },
      ],
      order: [
        ['slotNumber', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    res.json(networkCards);
  } catch (error) {
    logger.error('获取网卡列表失败', { error: error.message, stack: error.stack });
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
          attributes: ['deviceId', 'name', 'type'],
        },
      ],
      order: [
        ['slotNumber', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    res.json(networkCards);
  } catch (error) {
    logger.error('获取设备网卡失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

router.get('/device/:deviceId/with-ports', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const networkCards = await NetworkCard.findAll({
      where: { deviceId },
      order: [
        ['slotNumber', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    const cardsWithPorts = await Promise.all(
      networkCards.map(async card => {
        const ports = await DevicePort.findAll({
          where: { nicId: card.nicId },
          order: [['portName', 'ASC']],
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
            fault: faultCount,
          },
        };
      })
    );

    const ungroupedPorts = await DevicePort.findAll({
      where: { deviceId, nicId: null },
      order: [['portName', 'ASC']],
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
          fault: ungroupedPorts.filter(p => p.status === 'fault').length,
        },
      });
    }

    res.json(cardsWithPorts);
  } catch (error) {
    logger.error('获取网卡及端口失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

// 查询网卡
router.get('/find', async (req, res) => {
  try {
    const { deviceId, deviceSn, name } = req.query;

    if ((!deviceId && !deviceSn) || !name) {
      return res.status(400).json({ error: '缺少设备ID/SN或网卡名称' });
    }

    let device;
    if (deviceSn) {
      device = await Device.findOne({ where: { serialNumber: deviceSn } });
      if (!device) {
        return res.json({ nicId: null });
      }
    }

    const networkCard = await NetworkCard.findOne({
      where: { deviceId: device ? device.deviceId : deviceId, name },
    });

    if (!networkCard) {
      return res.json({ nicId: null });
    }

    res.json(networkCard);
  } catch (error) {
    logger.error('查找网卡失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

// 获取单个网卡
router.get('/:nicId', async (req, res) => {
  try {
    const networkCard = await NetworkCard.findByPk(req.params.nicId, {
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['deviceId', 'name', 'type'],
        },
      ],
    });

    if (!networkCard) {
      return res.status(404).json({ error: '网卡不存在' });
    }

    res.json(networkCard);
  } catch (error) {
    logger.error('获取网卡详情失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

router.get('/:nicId/ports', async (req, res) => {
  try {
    const { nicId } = req.params;

    const ports = await DevicePort.findAll({
      where: { nicId },
      order: [['portName', 'ASC']],
    });

    res.json(ports);
  } catch (error) {
    logger.error('获取网卡端口失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nicId, deviceId, name, description, slotNumber, model, manufacturer, status } =
      req.body;

    if (!deviceId || !name) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const existingCard = await NetworkCard.findOne({
      where: { deviceId, name },
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
      portCount: 0,
    });

    const createdCard = await NetworkCard.findByPk(networkCard.nicId, {
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['deviceId', 'name', 'type'],
        },
      ],
    });

    // 记录创建网卡成功日志
    await logNetworkCardOperation('create', `创建网卡【${name}】`, {
      targetId: networkCard.nicId,
      targetName: name,
      afterState: createdCard ? createdCard.toJSON() : null,
      req,
      metadata: { deviceId },
    });

    res.status(201).json(createdCard);
  } catch (error) {
    logger.error('创建网卡失败', { error: error.message, stack: error.stack });
    // 记录创建网卡失败日志
    await logNetworkCardOperation('create', '创建网卡失败', {
      targetId: req.body.nicId,
      targetName: req.body.name,
      result: 'failed',
      req,
      metadata: { deviceId: req.body.deviceId, error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { networkCards, skipExisting = false, updateExisting = false } = req.body;

    if (!networkCards || !Array.isArray(networkCards) || networkCards.length === 0) {
      return res.status(400).json({ error: '请提供有效的网卡数据' });
    }

    const results = {
      total: networkCards.length,
      success: 0,
      failed: 0,
      skipped: 0,
      updated: 0,
      errors: [],
    };

    const transaction = await NetworkCard.sequelize.transaction();

    try {
      for (let i = 0; i < networkCards.length; i++) {
        const cardData = networkCards[i];

        try {
          if (!(cardData.deviceId || cardData.deviceSn) || !cardData.name) {
            throw new Error('缺少必填字段：设备ID/SN和网卡名称');
          }

          let device;
          if (cardData.deviceSn) {
            device = await Device.findOne({
              where: { serialNumber: cardData.deviceSn },
              transaction,
            });
            if (!device) {
              throw new Error(`设备SN ${cardData.deviceSn} 不存在`);
            }
            cardData.deviceId = device.deviceId;
          } else {
            device = await Device.findByPk(cardData.deviceId, { transaction });
            if (!device) {
              throw new Error(`设备ID ${cardData.deviceId} 不存在`);
            }
          }

          const isServer = device.type && device.type.toLowerCase().includes('server');
          const isSwitch = device.type && device.type.toLowerCase().includes('switch');
          if (!isServer && !isSwitch) {
            throw new Error(`设备类型 ${device.type} 不支持网卡管理`);
          }

          const existingCard = await NetworkCard.findOne({
            where: { deviceId: cardData.deviceId, name: cardData.name },
            transaction,
          });

          if (existingCard) {
            if (skipExisting) {
              results.skipped++;
              continue;
            }
            if (updateExisting) {
              await NetworkCard.update(
                {
                  slotNumber:
                    cardData.slotNumber !== undefined
                      ? cardData.slotNumber
                      : existingCard.slotNumber,
                  model: cardData.model !== undefined ? cardData.model : existingCard.model,
                  manufacturer:
                    cardData.manufacturer !== undefined
                      ? cardData.manufacturer
                      : existingCard.manufacturer,
                  description:
                    cardData.description !== undefined
                      ? cardData.description
                      : existingCard.description,
                  status: cardData.status || existingCard.status,
                },
                {
                  where: { nicId: existingCard.nicId },
                  transaction,
                }
              );
              results.updated++;
              results.success++;
              continue;
            }
            throw new Error('该设备已存在同名网卡');
          }

          const autoNicId =
            cardData.nicId || `NIC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

          await NetworkCard.create(
            {
              nicId: autoNicId,
              deviceId: cardData.deviceId,
              name: cardData.name,
              slotNumber: cardData.slotNumber,
              model: cardData.model,
              manufacturer: cardData.manufacturer,
              description: cardData.description,
              status: cardData.status || 'normal',
              portCount: 0,
            },
            { transaction }
          );

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            index: i + 1,
            deviceId: cardData.deviceId,
            name: cardData.name,
            error: error.message,
          });
        }
      }

      await transaction.commit();

      // 记录批量创建网卡成功日志
      await logNetworkCardOperation(
        'batch_create',
        `批量创建网卡：成功${results.success}个，失败${results.failed}个，跳过${results.skipped}个，更新${results.updated}个`,
        {
          targetName: `${results.success}个网卡`,
          afterState: {
            success: results.success,
            failed: results.failed,
            skipped: results.skipped,
            updated: results.updated,
          },
          req,
          metadata: {
            total: results.total,
            success: results.success,
            failed: results.failed,
            skipped: results.skipped,
            updated: results.updated,
          },
        }
      );

      res.json(results);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('批量创建网卡失败', { error: error.message, stack: error.stack });
    // 记录批量创建网卡失败日志
    await logNetworkCardOperation('batch_create', '批量创建网卡失败', {
      targetName: `${(req.body.networkCards || []).length}个网卡`,
      result: 'failed',
      req,
      metadata: {
        total: (req.body.networkCards || []).length,
        error: error.message,
      },
    });
    res.status(500).json({ error: error.message });
  }
});

router.put('/:nicId', async (req, res) => {
  try {
    // 获取更新前的网卡状态，用于记录操作日志
    const beforeCard = await NetworkCard.findByPk(req.params.nicId);

    const [updated] = await NetworkCard.update(req.body, {
      where: { nicId: req.params.nicId },
    });

    if (updated) {
      const networkCard = await NetworkCard.findByPk(req.params.nicId, {
        include: [
          {
            model: Device,
            as: 'device',
            attributes: ['deviceId', 'name', 'type'],
          },
        ],
      });

      // 记录更新网卡成功日志
      await logNetworkCardOperation(
        'update',
        `更新网卡【${beforeCard ? beforeCard.name : req.params.nicId}】`,
        {
          targetId: req.params.nicId,
          targetName: beforeCard ? beforeCard.name : req.params.nicId,
          beforeState: beforeCard ? beforeCard.toJSON() : null,
          afterState: networkCard ? networkCard.toJSON() : null,
          req,
          metadata: {
            deviceId: beforeCard ? beforeCard.deviceId : null,
            updateFields: Object.keys(req.body || {}),
          },
        }
      );

      res.json(networkCard);
    } else {
      res.status(404).json({ error: '网卡不存在' });
    }
  } catch (error) {
    logger.error('更新网卡失败', { error: error.message, stack: error.stack });
    // 记录更新网卡失败日志
    await logNetworkCardOperation('update', '更新网卡失败', {
      targetId: req.params.nicId,
      targetName: req.body.name,
      result: 'failed',
      req,
      metadata: { error: error.message, updateFields: Object.keys(req.body || {}) },
    });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:nicId', async (req, res) => {
  try {
    const { nicId } = req.params;

    // 获取删除前的网卡状态，用于记录操作日志
    const beforeCard = await NetworkCard.findByPk(nicId);

    const portCount = await DevicePort.count({ where: { nicId } });
    if (portCount > 0) {
      return res.status(400).json({
        error: `该网卡下还有 ${portCount} 个端口，请先删除或转移端口后再删除网卡`,
      });
    }

    const deleted = await NetworkCard.destroy({
      where: { nicId },
    });

    if (deleted) {
      // 记录删除网卡成功日志
      await logNetworkCardOperation('delete', `删除网卡【${beforeCard ? beforeCard.name : nicId}】`, {
        targetId: nicId,
        targetName: beforeCard ? beforeCard.name : nicId,
        beforeState: beforeCard ? beforeCard.toJSON() : null,
        req,
        metadata: { deviceId: beforeCard ? beforeCard.deviceId : null },
      });

      res.status(204).json();
    } else {
      res.status(404).json({ error: '网卡不存在' });
    }
  } catch (error) {
    logger.error('删除网卡失败', { error: error.message, stack: error.stack });
    // 记录删除网卡失败日志
    await logNetworkCardOperation('delete', '删除网卡失败', {
      targetId: req.params.nicId,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
