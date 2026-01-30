const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Cable = require('../models/Cable');
const Device = require('../models/Device');
const DevicePort = require('../models/DevicePort');

// 辅助函数：更新端口状态
async function updatePortStatus(deviceId, portName, status) {
  try {
    await DevicePort.update(
      { status },
      { where: { deviceId, portName } }
    );
  } catch (error) {
    console.error(`更新端口状态失败: ${deviceId}:${portName} -> ${status}`, error);
  }
}

// 辅助函数：将端口状态设为occupied
async function occupyPort(deviceId, portName) {
  await updatePortStatus(deviceId, portName, 'occupied');
}

// 辅助函数：将端口状态恢复为free
async function freePort(deviceId, portName) {
  await updatePortStatus(deviceId, portName, 'free');
}

router.get('/', async (req, res) => {
  try {
    const { sourceDeviceId, targetDeviceId, status, cableType, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;
    
    const where = {};
    
    if (sourceDeviceId) {
      where.sourceDeviceId = sourceDeviceId;
    }
    
    if (targetDeviceId) {
      where.targetDeviceId = targetDeviceId;
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (cableType && cableType !== 'all') {
      where.cableType = cableType;
    }
    
    const { count, rows } = await Cable.findAndCountAll({
      where,
      include: [
        {
          model: Device,
          as: 'sourceDevice',
          attributes: ['deviceId', 'name', 'type', 'rackId']
        },
        {
          model: Device,
          as: 'targetDevice',
          attributes: ['deviceId', 'name', 'type', 'rackId']
        }
      ],
      offset,
      limit: parseInt(pageSize),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      total: count,
      cables: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取接线列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const cables = await Cable.findAll({
      where: {
        [Op.or]: [
          { sourceDeviceId: deviceId },
          { targetDeviceId: deviceId }
        ]
      },
      include: [
        {
          model: Device,
          as: 'sourceDevice',
          attributes: ['deviceId', 'name', 'type', 'rackId']
        },
        {
          model: Device,
          as: 'targetDevice',
          attributes: ['deviceId', 'name', 'type', 'rackId']
        }
      ]
    });
    
    res.json(cables);
  } catch (error) {
    console.error('获取设备接线失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取指定机柜内所有设备的接线
router.get('/rack/:rackId', async (req, res) => {
  try {
    const { rackId } = req.params;
    
    // 1. 找出该机柜下的所有设备ID
    const devices = await Device.findAll({
      where: { rackId: rackId },
      attributes: ['deviceId']
    });
    
    const deviceIds = devices.map(d => d.deviceId);
    
    if (deviceIds.length === 0) {
      return res.json([]);
    }

    // 2. 查找这些设备参与的所有接线
    const cables = await Cable.findAll({
      where: {
        [Op.or]: [
          { sourceDeviceId: { [Op.in]: deviceIds } },
          { targetDeviceId: { [Op.in]: deviceIds } }
        ]
      },
      include: [
        {
          model: Device,
          as: 'sourceDevice',
          attributes: ['deviceId', 'name', 'type', 'rackId']
        },
        {
          model: Device,
          as: 'targetDevice',
          attributes: ['deviceId', 'name', 'type', 'rackId']
        }
      ]
    });
    
    res.json(cables);
  } catch (error) {
    console.error('获取机柜接线失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 检查接线冲突
router.post('/check-conflict', async (req, res) => {
  try {
    const { sourceDeviceId, sourcePort, targetDeviceId, targetPort, excludeCableId } = req.body;

    if (!sourceDeviceId || !sourcePort || !targetDeviceId || !targetPort) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const conflicts = [];

    // 检查源端口冲突
    const sourceConflict = await Cable.findOne({
      where: {
        [Op.or]: [
          { sourceDeviceId, sourcePort },
          { targetDeviceId: sourceDeviceId, targetPort: sourcePort }
        ],
        ...(excludeCableId && { cableId: { [Op.ne]: excludeCableId } })
      },
      include: [
        {
          model: Device,
          as: 'sourceDevice',
          attributes: ['deviceId', 'name', 'type']
        },
        {
          model: Device,
          as: 'targetDevice',
          attributes: ['deviceId', 'name', 'type']
        }
      ]
    });

    if (sourceConflict) {
      conflicts.push({
        type: 'source',
        port: sourcePort,
        deviceId: sourceDeviceId,
        existingCable: sourceConflict
      });
    }

    // 检查目标端口冲突
    const targetConflict = await Cable.findOne({
      where: {
        [Op.or]: [
          { sourceDeviceId: targetDeviceId, sourcePort: targetPort },
          { targetDeviceId, targetPort }
        ],
        ...(excludeCableId && { cableId: { [Op.ne]: excludeCableId } })
      },
      include: [
        {
          model: Device,
          as: 'sourceDevice',
          attributes: ['deviceId', 'name', 'type']
        },
        {
          model: Device,
          as: 'targetDevice',
          attributes: ['deviceId', 'name', 'type']
        }
      ]
    });

    if (targetConflict) {
      conflicts.push({
        type: 'target',
        port: targetPort,
        deviceId: targetDeviceId,
        existingCable: targetConflict
      });
    }

    res.json({
      hasConflict: conflicts.length > 0,
      conflicts
    });
  } catch (error) {
    console.error('检查接线冲突失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { cableId, sourceDeviceId, sourcePort, targetDeviceId, targetPort, cableType, cableLength, status, description, force } = req.body;

    if (!sourceDeviceId || !sourcePort || !targetDeviceId || !targetPort) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    if (sourceDeviceId === targetDeviceId) {
      return res.status(400).json({ error: '源设备和目标设备不能相同' });
    }

    // 如果不是强制模式，检查冲突
    if (!force) {
      const existingCable = await Cable.findOne({
        where: {
          [Op.or]: [
            { sourceDeviceId, sourcePort },
            { targetDeviceId, targetPort }
          ]
        }
      });

      if (existingCable) {
        return res.status(409).json({
          error: '端口已被占用',
          conflict: true,
          existingCable
        });
      }
    }

    // 如果是强制模式，先断开原有连接
    if (force) {
      const existingCables = await Cable.findAll({
        where: {
          [Op.or]: [
            { sourceDeviceId, sourcePort },
            { targetDeviceId: sourceDeviceId, targetPort: sourcePort },
            { sourceDeviceId: targetDeviceId, sourcePort: targetPort },
            { targetDeviceId, targetPort }
          ]
        }
      });

      for (const cable of existingCables) {
        await cable.destroy();
        // 释放原有端口
        await freePort(cable.sourceDeviceId, cable.sourcePort);
        await freePort(cable.targetDeviceId, cable.targetPort);
      }
    }

    const autoCableId = cableId || `CABLE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const cable = await Cable.create({
      cableId: autoCableId,
      sourceDeviceId,
      sourcePort,
      targetDeviceId,
      targetPort,
      cableType: cableType || 'ethernet',
      cableLength,
      status: status || 'normal',
      description
    });

    const createdCable = await Cable.findByPk(cable.cableId, {
      include: [
        {
          model: Device,
          as: 'sourceDevice',
          attributes: ['deviceId', 'name', 'type', 'rackId']
        },
        {
          model: Device,
          as: 'targetDevice',
          attributes: ['deviceId', 'name', 'type', 'rackId']
        }
      ]
    });

    // 自动将源端口和目标端口状态设为occupied
    await occupyPort(sourceDeviceId, sourcePort);
    await occupyPort(targetDeviceId, targetPort);

    res.status(201).json(createdCable);
  } catch (error) {
    console.error('创建接线失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { cables } = req.body;
    
    if (!cables || !Array.isArray(cables) || cables.length === 0) {
      return res.status(400).json({ error: '请提供有效的接线数据' });
    }
    
    const results = {
      total: cables.length,
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (let i = 0; i < cables.length; i++) {
      const cableData = cables[i];
      
      try {
        if (!cableData.cableId || !cableData.sourceDeviceId || !cableData.sourcePort || 
            !cableData.targetDeviceId || !cableData.targetPort) {
          throw new Error('缺少必填字段');
        }
        
        if (cableData.sourceDeviceId === cableData.targetDeviceId) {
          throw new Error('源设备和目标设备不能相同');
        }
        
        const existingCable = await Cable.findOne({
          where: {
            [Op.or]: [
              { sourceDeviceId: cableData.sourceDeviceId, sourcePort: cableData.sourcePort },
              { targetDeviceId: cableData.targetDeviceId, targetPort: cableData.targetPort }
            ]
          }
        });
        
        if (existingCable) {
          throw new Error('端口已被占用');
        }
        
        await Cable.create({
          cableId: cableData.cableId,
          sourceDeviceId: cableData.sourceDeviceId,
          sourcePort: cableData.sourcePort,
          targetDeviceId: cableData.targetDeviceId,
          targetPort: cableData.targetPort,
          cableType: cableData.cableType || 'ethernet',
          cableLength: cableData.cableLength,
          status: cableData.status || 'normal',
          description: cableData.description
        });
        
        // 自动将源端口和目标端口状态设为occupied
        await occupyPort(cableData.sourceDeviceId, cableData.sourcePort);
        await occupyPort(cableData.targetDeviceId, cableData.targetPort);
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          index: i + 1,
          cableId: cableData.cableId,
          error: error.message
        });
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('批量创建接线失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:cableId', async (req, res) => {
  try {
    // 获取更新前的接线信息
    const oldCable = await Cable.findByPk(req.params.cableId);
    
    if (!oldCable) {
      return res.status(404).json({ error: '接线不存在' });
    }
    
    const { sourceDeviceId: oldSourceDeviceId, sourcePort: oldSourcePort, targetDeviceId: oldTargetDeviceId, targetPort: oldTargetPort } = oldCable;
    
    const [updated] = await Cable.update(req.body, {
      where: { cableId: req.params.cableId }
    });
    
    if (updated) {
      const cable = await Cable.findByPk(req.params.cableId, {
        include: [
          {
            model: Device,
            as: 'sourceDevice',
            attributes: ['deviceId', 'name', 'type', 'rackId']
          },
          {
            model: Device,
            as: 'targetDevice',
            attributes: ['deviceId', 'name', 'type', 'rackId']
          }
        ]
      });
      
      const { sourceDeviceId, sourcePort, targetDeviceId, targetPort } = cable;
      
      // 同步更新端口状态
      // 源端口变更：释放旧端口，占用新端口
      if (oldSourceDeviceId !== sourceDeviceId || oldSourcePort !== sourcePort) {
        await freePort(oldSourceDeviceId, oldSourcePort);
        await occupyPort(sourceDeviceId, sourcePort);
      }
      
      // 目标端口变更：释放旧端口，占用新端口
      if (oldTargetDeviceId !== targetDeviceId || oldTargetPort !== targetPort) {
        await freePort(oldTargetDeviceId, oldTargetPort);
        await occupyPort(targetDeviceId, targetPort);
      }
      
      res.json(cable);
    } else {
      res.status(404).json({ error: '接线不存在' });
    }
  } catch (error) {
    console.error('更新接线失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:cableId', async (req, res) => {
  try {
    // 先获取接线信息，用于后续恢复端口状态
    const cable = await Cable.findByPk(req.params.cableId);
    
    if (!cable) {
      return res.status(404).json({ error: '接线不存在' });
    }
    
    const { sourceDeviceId, sourcePort, targetDeviceId, targetPort } = cable;
    
    const deleted = await Cable.destroy({
      where: { cableId: req.params.cableId }
    });
    
    if (deleted) {
      // 自动将源端口和目标端口状态恢复为free
      await freePort(sourceDeviceId, sourcePort);
      await freePort(targetDeviceId, targetPort);
      
      res.status(204).json();
    } else {
      res.status(404).json({ error: '接线不存在' });
    }
  } catch (error) {
    console.error('删除接线失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/batch', async (req, res) => {
  try {
    const { cableIds } = req.body;
    
    if (!cableIds || !Array.isArray(cableIds) || cableIds.length === 0) {
      return res.status(400).json({ error: '请提供有效的接线ID列表' });
    }
    
    // 先获取所有要删除的接线信息，用于后续恢复端口状态
    const cables = await Cable.findAll({
      where: { cableId: { [Op.in]: cableIds } }
    });
    
    const deletedCount = await Cable.destroy({
      where: { cableId: { [Op.in]: cableIds } }
    });
    
    // 自动将所有相关端口状态恢复为free
    for (const cable of cables) {
      await freePort(cable.sourceDeviceId, cable.sourcePort);
      await freePort(cable.targetDeviceId, cable.targetPort);
    }
    
    res.json({
      message: `批量删除成功，已删除 ${deletedCount} 条接线`,
      deletedCount
    });
  } catch (error) {
    console.error('批量删除接线失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:cableId', async (req, res) => {
  try {
    const cable = await Cable.findByPk(req.params.cableId, {
      include: [
        {
          model: Device,
          as: 'sourceDevice',
          attributes: ['deviceId', 'name', 'type', 'rackId']
        },
        {
          model: Device,
          as: 'targetDevice',
          attributes: ['deviceId', 'name', 'type', 'rackId']
        }
      ]
    });
    
    if (!cable) {
      return res.status(404).json({ error: '接线不存在' });
    }
    
    res.json(cable);
  } catch (error) {
    console.error('获取接线详情失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
