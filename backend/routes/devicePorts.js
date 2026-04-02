const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const DevicePort = require('../models/DevicePort');
const Device = require('../models/Device');
const NetworkCard = require('../models/NetworkCard');
const Cable = require('../models/Cable');

DevicePort.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });
Device.hasMany(DevicePort, { foreignKey: 'deviceId', as: 'ports' });
DevicePort.belongsTo(NetworkCard, { foreignKey: 'nicId', as: 'networkCard' });

router.get('/', async (req, res) => {
  try {
    const { deviceId, status, portType, portSpeed, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};

    if (deviceId) {
      where.deviceId = deviceId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (portType && portType !== 'all') {
      where.portType = portType;
    }

    if (portSpeed && portSpeed !== 'all') {
      where.portSpeed = portSpeed;
    }

    const { count, rows } = await DevicePort.findAndCountAll({
      where,
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['deviceId', 'name', 'type', 'rackId'],
        },
        {
          model: NetworkCard,
          as: 'networkCard',
          attributes: ['nicId', 'name'],
        },
      ],
      offset,
      limit: parseInt(pageSize),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: count,
      ports: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    console.error('获取端口列表失败:', error);
    console.error('Error name:', error.name);
    res.status(500).json({ error: error.message, errorType: error.name });
  }
});

router.get('/device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const ports = await DevicePort.findAll({
      where: { deviceId },
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['deviceId', 'name', 'type', 'rackId'],
        },
        {
          model: NetworkCard,
          as: 'networkCard',
          attributes: ['nicId', 'name'],
        },
      ],
      order: [['portName', 'ASC']],
    });

    res.json(ports);
  } catch (error) {
    console.error('获取设备端口失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { portId, deviceId, nicId, portName, portType, portSpeed, status, vlanId, description } =
      req.body;

    if (!deviceId || !portName) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const existingPort = await DevicePort.findOne({
      where: { deviceId, portName },
    });

    if (existingPort) {
      return res.status(400).json({ error: '该设备的端口名称已存在' });
    }

    const autoPortId = portId || `PORT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const port = await DevicePort.create({
      portId: autoPortId,
      deviceId,
      nicId: nicId || null,
      portName,
      portType: portType || 'RJ45',
      portSpeed: portSpeed || '1G',
      status: status || 'free',
      vlanId,
      description,
    });

    const createdPort = await DevicePort.findByPk(port.portId, {
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['deviceId', 'name', 'type', 'rackId'],
        },
      ],
    });

    res.status(201).json(createdPort);
  } catch (error) {
    console.error('创建端口失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { ports, skipExisting = false, updateExisting = false } = req.body;

    if (!ports || !Array.isArray(ports) || ports.length === 0) {
      return res.status(400).json({ error: '请提供有效的端口数据' });
    }

    const results = {
      total: ports.length,
      success: 0,
      failed: 0,
      skipped: 0,
      updated: 0,
      errors: [],
    };

    const transaction = await DevicePort.sequelize.transaction();

    try {
      for (let i = 0; i < ports.length; i++) {
        const portData = ports[i];

        try {
          if (!portData.portId || !(portData.deviceId || portData.deviceSn) || !portData.portName) {
            throw new Error('缺少必填字段');
          }

          let device;
          if (portData.deviceSn) {
            device = await Device.findOne({
              where: { serialNumber: portData.deviceSn },
              transaction,
            });
            if (!device) {
              throw new Error(`设备SN ${portData.deviceSn} 不存在`);
            }
            portData.deviceId = device.deviceId;
          } else {
            device = await Device.findByPk(portData.deviceId, { transaction });
            if (!device) {
              throw new Error(`设备ID ${portData.deviceId} 不存在`);
            }
          }

          const isServer = device.type && device.type.toLowerCase().includes('server');

          if (isServer) {
            if (!portData.nicId && !portData.网卡名称) {
              throw new Error(
                `服务器 ${portData.deviceId} 的端口必须关联网卡，请先在网卡管理中添加网卡`
              );
            }

            let nicId = portData.nicId;

            if (!nicId && portData.网卡名称) {
              const networkCard = await NetworkCard.findOne({
                where: { deviceId: portData.deviceId, name: portData.网卡名称 },
                transaction,
              });
              if (!networkCard) {
                throw new Error(
                  `服务器 ${portData.deviceId} 的网卡"${portData.网卡名称}"不存在，请先在网卡管理中添加该网卡`
                );
              }
              nicId = networkCard.nicId;
            }

            if (nicId) {
              const networkCard = await NetworkCard.findByPk(nicId, { transaction });
              if (!networkCard) {
                throw new Error(`网卡 ${nicId} 不存在`);
              }
              if (networkCard.deviceId !== portData.deviceId) {
                throw new Error(`网卡 ${nicId} 不属于设备 ${portData.deviceId}`);
              }
            }

            portData.nicId = nicId;
          } else {
            if (portData.nicId || portData.网卡名称) {
              portData.nicId = null;
            }
          }

          const existingPort = await DevicePort.findOne({
            where: { deviceId: portData.deviceId, portName: portData.portName },
            transaction,
          });

          if (existingPort) {
            if (skipExisting) {
              results.skipped++;
              continue;
            }
            if (updateExisting) {
              await DevicePort.update(
                {
                  portType: portData.portType || existingPort.portType,
                  portSpeed: portData.portSpeed || existingPort.portSpeed,
                  status: portData.status || existingPort.status,
                  vlanId: portData.vlanId !== undefined ? portData.vlanId : existingPort.vlanId,
                  description:
                    portData.description !== undefined
                      ? portData.description
                      : existingPort.description,
                  nicId: portData.nicId !== undefined ? portData.nicId : existingPort.nicId,
                },
                {
                  where: { portId: existingPort.portId },
                  transaction,
                }
              );
              results.updated++;
              results.success++;
              continue;
            }
            throw new Error('该设备的端口名称已存在');
          }

          await DevicePort.create(
            {
              portId: portData.portId,
              deviceId: portData.deviceId,
              nicId: portData.nicId || null,
              portName: portData.portName,
              portType: portData.portType || 'RJ45',
              portSpeed: portData.portSpeed || '1G',
              status: portData.status || 'free',
              vlanId: portData.vlanId,
              description: portData.description,
            },
            { transaction }
          );

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            index: i + 1,
            portId: portData.portId,
            deviceId: portData.deviceId,
            portName: portData.portName,
            error: error.message,
          });
        }
      }

      await transaction.commit();
      res.json(results);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('批量创建端口失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:portId', async (req, res) => {
  try {
    const [updated] = await DevicePort.update(req.body, {
      where: { portId: req.params.portId },
    });

    if (updated) {
      const port = await DevicePort.findByPk(req.params.portId, {
        include: [
          {
            model: Device,
            as: 'device',
            attributes: ['deviceId', 'name', 'type', 'rackId'],
          },
        ],
      });
      res.json(port);
    } else {
      res.status(404).json({ error: '端口不存在' });
    }
  } catch (error) {
    console.error('更新端口失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 批量删除端口
router.delete('/batch', async (req, res) => {
  try {
    const { portIds } = req.body;

    if (!portIds || !Array.isArray(portIds) || portIds.length === 0) {
      return res.status(400).json({ error: '请提供有效的端口ID列表' });
    }

    const deletedCount = await DevicePort.destroy({
      where: { portId: { [Op.in]: portIds } },
    });

    res.json({
      message: `批量删除成功，已删除 ${deletedCount} 个端口`,
      deletedCount,
    });
  } catch (error) {
    console.error('批量删除端口失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除单个端口
router.delete('/:portId', async (req, res) => {
  try {
    const port = await DevicePort.findByPk(req.params.portId);
    if (!port) {
      return res.status(404).json({ error: '端口不存在' });
    }

    const relatedCables = await Cable.findAll({
      where: {
        [Op.or]: [
          { sourceDeviceId: port.deviceId, sourcePort: port.portName },
          { targetDeviceId: port.deviceId, targetPort: port.portName },
        ],
      },
    });

    if (relatedCables.length > 0) {
      return res.status(400).json({
        error: '该端口存在关联的接线记录，请先删除关联的接线',
        relatedCables: relatedCables.map(c => ({
          cableId: c.cableId,
          sourceDeviceId: c.sourceDeviceId,
          sourcePort: c.sourcePort,
          targetDeviceId: c.targetDeviceId,
          targetPort: c.targetPort,
        })),
      });
    }

    await DevicePort.destroy({
      where: { portId: req.params.portId },
    });

    res.status(204).json();
  } catch (error) {
    console.error('删除端口失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch-delete', async (req, res) => {
  try {
    const { portIds } = req.body;

    if (!portIds || !Array.isArray(portIds) || portIds.length === 0) {
      return res.status(400).json({ error: '请提供有效的端口ID列表' });
    }

    const deletedCount = await DevicePort.destroy({
      where: { portId: { [Op.in]: portIds } },
    });

    res.json({
      message: `批量删除成功，已删除 ${deletedCount} 个端口`,
      deletedCount,
    });
  } catch (error) {
    console.error('批量删除端口失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 导出所有端口
router.get('/export/all', async (req, res) => {
  try {
    const { keyword, status, portType, portSpeed, deviceId, page = 1, pageSize = 5000 } = req.query;

    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedPageSize = Math.min(10000, Math.max(1, parseInt(pageSize) || 5000));
    const offset = (parsedPage - 1) * parsedPageSize;

    const where = {};

    if (keyword) {
      where[Op.or] = [
        { portName: { [Op.like]: `%${keyword}%` } },
        { deviceId: { [Op.like]: `%${keyword}%` } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (portType && portType !== 'all') {
      where.portType = portType;
    }

    if (portSpeed && portSpeed !== 'all') {
      where.portSpeed = portSpeed;
    }

    if (deviceId && deviceId !== 'all') {
      where.deviceId = deviceId;
    }

    const { count, rows } = await DevicePort.findAndCountAll({
      where,
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['deviceId', 'name', 'type'],
        },
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: parsedPageSize,
    });

    res.json({
      total: count,
      ports: rows,
      page: parsedPage,
      pageSize: parsedPageSize,
    });
  } catch (error) {
    console.error('获取端口列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取单个端口
router.get('/:portId', async (req, res) => {
  try {
    const port = await DevicePort.findByPk(req.params.portId, {
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['deviceId', 'name', 'type', 'rackId'],
        },
      ],
    });

    if (!port) {
      return res.status(404).json({ error: '端口不存在' });
    }

    res.json(port);
  } catch (error) {
    console.error('获取端口详情失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
