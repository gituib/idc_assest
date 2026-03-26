const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Device = require('../models/Device');
const Rack = require('../models/Rack');
const Room = require('../models/Room');
const { logDeviceOperation, generateDeviceDescription, buildDeviceMetadata } = require('../utils/operationLogger');

async function generateIdleDeviceId() {
  const devices = await Device.findAll({
    where: {
      deviceId: {
        [Op.like]: 'DEV%'
      }
    }
  });

  let maxNumber = 0;
  devices.forEach(device => {
    const match = device.deviceId.match(/^DEV(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });

  const newNumber = maxNumber + 1;
  return `DEV${String(newNumber).padStart(4, '0')}`;
}

router.get('/', async (req, res) => {
  try {
    const { keyword, sourceType, idleReason, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const where = { isIdle: true };

    if (keyword) {
      where[Op.or] = [
        { deviceId: { [Op.like]: `%${keyword}%` } },
        { name: { [Op.like]: `%${keyword}%` } },
        { serialNumber: { [Op.like]: `%${keyword}%` } }
      ];
    }

    if (sourceType && sourceType !== 'all') {
      where.sourceType = sourceType;
    }

    if (idleReason) {
      where.idleReason = { [Op.like]: `%${idleReason}%` };
    }

    const { count, rows } = await Device.findAndCountAll({
      where,
      include: [
        {
          model: Rack,
          attributes: ['rackId', 'name', 'roomId'],
          include: [{
            model: Room,
            attributes: ['roomId', 'name']
          }]
        }
      ],
      offset: parseInt(offset),
      limit: parseInt(pageSize),
      order: [['idleDate', 'DESC']]
    });

    res.json({
      total: count,
      idleDevices: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取空闲设备列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:deviceId', async (req, res) => {
  try {
    const device = await Device.findOne({
      where: { deviceId: req.params.deviceId, isIdle: true },
      include: [
        {
          model: Rack,
          attributes: ['rackId', 'name', 'roomId'],
          include: [{
            model: Room,
            attributes: ['roomId', 'name']
          }]
        }
      ]
    });

    if (!device) {
      return res.status(404).json({ error: '空闲设备不存在' });
    }

    res.json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, model, serialNumber, powerConsumption, idleReason, warehouseId, description, rackId, position } = req.body;

    let { deviceId } = req.body;

    if (!deviceId || deviceId.trim() === '') {
      deviceId = await generateIdleDeviceId();
    }

    const existingDevice = await Device.findByPk(deviceId);
    if (existingDevice) {
      return res.status(400).json({ error: '设备ID已存在' });
    }

    if (rackId) {
      const rack = await Rack.findByPk(rackId);
      if (!rack) {
        return res.status(404).json({ error: '机柜不存在' });
      }
    }

    const device = await Device.create({
      deviceId,
      name: name || '',
      type: type || 'other',
      model: model || '',
      serialNumber: serialNumber || '',
      powerConsumption: powerConsumption || 0,
      status: 'offline',
      isIdle: true,
      idleDate: new Date(),
      idleReason: idleReason || '',
      warehouseId: warehouseId || null,
      rackId: rackId || null,
      position: position || null,
      sourceType: warehouseId ? 'warehouse' : (rackId ? 'rack' : 'rack'),
      description: description || ''
    });

    await logDeviceOperation('create', generateDeviceDescription('新增空闲设备', {
      deviceId: device.deviceId,
      name: device.name || deviceId,
      type: device.type,
      model: device.model,
      serialNumber: device.serialNumber,
      ipAddress: device.ipAddress
    }, { includeRack: false }), {
      targetId: device.deviceId,
      targetName: device.name || deviceId,
      afterState: device.toJSON(),
      req,
      metadata: buildDeviceMetadata(device.toJSON(), { sourceType: device.sourceType, type: 'idle_device_create' })
    });

    res.status(201).json(device);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/from-device/:deviceId', async (req, res) => {
  const t = await require('../db').sequelize.transaction();
  try {
    const { idleReason } = req.body;
    const { deviceId } = req.params;

    const device = await Device.findByPk(deviceId, { transaction: t });
    if (!device) {
      await t.rollback();
      return res.status(404).json({ error: '设备不存在' });
    }

    if (device.isIdle) {
      await t.rollback();
      return res.status(400).json({ error: '设备已经标记为空闲设备' });
    }

    await device.update({
      isIdle: true,
      status: 'idle',
      idleDate: new Date(),
      idleReason: idleReason || `从设备管理转入`,
      sourceType: 'rack'
    }, { transaction: t });

    await t.commit();

    const deviceData = device.toJSON();
    await logDeviceOperation('to_idle', generateDeviceDescription('设备转入空闲设备', deviceData), {
      targetId: device.deviceId,
      targetName: device.name,
      beforeState: { ...deviceData, isIdle: false },
      afterState: { ...deviceData, isIdle: true },
      req,
      metadata: buildDeviceMetadata(deviceData, { idleReason, type: 'device_to_idle' })
    });

    res.json({
      message: '设备已转入空闲设备',
      device: device.toJSON()
    });
  } catch (error) {
    await t.rollback();
    console.error('设备转入空闲设备失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch-from-devices', async (req, res) => {
  const t = await require('../db').sequelize.transaction();
  try {
    const { deviceIds, idleReason } = req.body;

    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: '请提供有效的设备ID列表' });
    }

    const devices = await Device.findAll({
      where: { deviceId: { [Op.in]: deviceIds } },
      transaction: t
    });

    const notIdleDevices = devices.filter(d => !d.isIdle);
    const alreadyIdleDevices = devices.filter(d => d.isIdle);

    if (notIdleDevices.length > 0) {
      await Device.update(
        {
          isIdle: true,
          status: 'idle',
          idleDate: new Date(),
          idleReason: idleReason || `批量转入`
        },
        {
          where: { deviceId: { [Op.in]: notIdleDevices.map(d => d.deviceId) } },
          transaction: t
        }
      );
    }

    await t.commit();

    const deviceDetails = notIdleDevices.map(d => d.toJSON());
    const deviceSummary = deviceDetails.map(d =>
      `${d.name}(编号:${d.deviceId}${d.type ? `,类型:${d.type}` : ''}${d.serialNumber ? `,序列号:${d.serialNumber}` : ''})`
    ).join('、');

    await logDeviceOperation('batch_to_idle', `批量将 ${notIdleDevices.length} 台设备转入空闲设备：${deviceSummary}`, {
      targetId: deviceIds.join(','),
      targetName: `${notIdleDevices.length}台设备`,
      req,
      metadata: { idleReason, type: 'batch_device_to_idle', devices: deviceDetails }
    });

    res.json({
      message: `成功将 ${notIdleDevices.length} 台设备转入空闲设备`,
      total: devices.length,
      updated: notIdleDevices.length,
      skipped: alreadyIdleDevices.length
    });
  } catch (error) {
    await t.rollback();
    console.error('批量转入空闲设备失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/batch-restore', async (req, res) => {
  const t = await require('../db').sequelize.transaction();
  try {
    const { devices } = req.body;

    console.log('========== batch-restore 开始 ==========');
    console.log('原始请求 body:', JSON.stringify(req.body));
    console.log('devices 参数:', devices);

    if (!devices || !Array.isArray(devices) || devices.length === 0) {
      await t.rollback();
      console.log('错误: devices 参数无效');
      return res.status(400).json({ error: '请提供有效的设备列表' });
    }

    const deviceIds = devices.map(d => d.deviceId).filter(Boolean);
    console.log('提取的 deviceIds:', deviceIds);

    if (deviceIds.length === 0) {
      await t.rollback();
      console.log('错误: deviceIds 为空');
      return res.status(400).json({ error: '设备ID不能为空' });
    }

    console.log('开始查询设备，条件:', { deviceId: { [Op.in]: deviceIds }, isIdle: true });

    const idleDevices = await Device.findAll({
      where: { deviceId: { [Op.in]: deviceIds }, isIdle: true },
      transaction: t
    });

    console.log('查询到的空闲设备数量:', idleDevices.length);
    if (idleDevices.length > 0) {
      console.log('查询到的设备ID:', idleDevices.map(d => d.deviceId));
    }

    if (idleDevices.length === 0) {
      console.log('没有找到空闲设备，检查设备是否存在:');
      const allDevices = await Device.findAll({
        where: { deviceId: { [Op.in]: deviceIds } },
        transaction: t
      });
      console.log('设备表中存在的设备数量:', allDevices.length);
      if (allDevices.length > 0) {
        console.log('存在的设备及其 isIdle 状态:', allDevices.map(d => ({ deviceId: d.deviceId, isIdle: d.isIdle })));
      }

      await t.rollback();
      return res.status(404).json({ error: '没有找到空闲设备' });
    }

    let restoredCount = 0;
    const results = [];

    for (const device of idleDevices) {
      const deviceConfig = devices.find(d => d.deviceId === device.deviceId);
      if (!deviceConfig) continue;

      const targetRackId = deviceConfig.targetRackId;
      const targetPosition = deviceConfig.targetPosition;

      if (!targetRackId) {
        results.push({
          deviceId: device.deviceId,
          name: device.name,
          status: 'skipped',
          reason: '未指定目标机柜'
        });
        continue;
      }

      const targetRack = await Rack.findByPk(targetRackId, { transaction: t });
      if (!targetRack) {
        results.push({
          deviceId: device.deviceId,
          name: device.name,
          status: 'failed',
          reason: '目标机柜不存在'
        });
        continue;
      }

      const height = device.height || 1;
      const position = targetPosition || 1;

      const checkResult = await checkPositionAvailable(targetRackId, position, height, null, t);
      if (!checkResult.available) {
        results.push({
          deviceId: device.deviceId,
          name: device.name,
          status: 'failed',
          reason: `U位${position}已被占用`
        });
        continue;
      }

      await device.update({
        isIdle: false,
        idleDate: null,
        idleReason: null,
        rackId: targetRackId,
        position: position,
        warehouseId: null,
        sourceType: 'rack',
        status: 'offline'
      }, { transaction: t });

      await targetRack.update({
        currentPower: targetRack.currentPower + (device.powerConsumption || 0)
      }, { transaction: t });

      restoredCount++;
      results.push({
        deviceId: device.deviceId,
        name: device.name,
        status: 'success',
        targetRack: targetRack.name,
        targetPosition: position
      });
    }

    await t.commit();

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    const successDevices = idleDevices.filter(d => results.some(r => r.deviceId === d.deviceId && r.status === 'success'));
    const deviceSummary = successDevices.map(d =>
      `${d.name}(编号:${d.deviceId}${d.type ? `,类型:${d.type}` : ''}${d.ipAddress ? `,IP:${d.ipAddress}` : ''})`
    ).join('、');

    await logDeviceOperation('batch_restore', `批量上架 ${successCount} 台空闲设备：${deviceSummary}`, {
      targetId: deviceIds.join(','),
      targetName: `${successCount}台设备`,
      req,
      metadata: { results, type: 'batch_idle_device_restore', devices: successDevices.map(d => d.toJSON()) }
    });

    res.json({
      message: `成功上架 ${successCount} 台设备`,
      total: idleDevices.length,
      restored: successCount,
      failed: failedCount,
      skipped: skippedCount,
      details: results
    });
  } catch (error) {
    await t.rollback();
    console.error('批量上架设备失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:deviceId/shelve', async (req, res) => {
  const t = await require('../db').sequelize.transaction();
  try {
    const { deviceId } = req.params;
    const { name, type, model, serialNumber, height, powerConsumption, rackId, position, description } = req.body;

    const device = await Device.findOne({
      where: { deviceId, isIdle: true },
      transaction: t
    });

    if (!device) {
      await t.rollback();
      return res.status(404).json({ error: '空闲设备不存在' });
    }

    if (!rackId) {
      await t.rollback();
      return res.status(400).json({ error: '请选择目标机柜' });
    }

    const targetRack = await Rack.findByPk(rackId, { transaction: t });
    if (!targetRack) {
      await t.rollback();
      return res.status(404).json({ error: '目标机柜不存在' });
    }

    const deviceHeight = height || device.height || 1;
    const positionCheck = await checkPositionAvailable(rackId, position, deviceHeight, deviceId, t);
    if (!positionCheck.available) {
      await t.rollback();
      return res.status(400).json({ error: positionCheck.reason });
    }

    const beforeState = device.toJSON();

    await device.update({
      name: name || device.name,
      type: type || device.type,
      model: model || device.model,
      serialNumber: serialNumber || device.serialNumber,
      height: deviceHeight,
      powerConsumption: powerConsumption || device.powerConsumption || 0,
      rackId: rackId,
      position: position,
      description: description || device.description,
      isIdle: false,
      idleDate: null,
      idleReason: null,
      warehouseId: null,
      sourceType: 'rack',
      status: 'running'
    }, { transaction: t });

    await targetRack.update({
      currentPower: targetRack.currentPower + (powerConsumption || device.powerConsumption || 0)
    }, { transaction: t });

    await t.commit();

    const updatedDevice = await Device.findByPk(deviceId, {
      include: [
        { model: Rack, include: [Room] }
      ]
    });

    const deviceData = {
      ...updatedDevice.toJSON(),
      rackName: targetRack.name,
      roomName: updatedDevice.Rack?.Room?.name
    };

    await logDeviceOperation('shelve', generateDeviceDescription('空闲设备上架', deviceData, { includePosition: false }) + `到机柜【${targetRack.name}】U${position}`, {
      targetId: device.deviceId,
      targetName: device.name,
      beforeState: { ...beforeState, isIdle: true },
      afterState: deviceData,
      req,
      metadata: buildDeviceMetadata(deviceData, { rackId, position, type: 'idle_device_shelve' })
    });

    res.json({
      message: '设备上架成功',
      device: updatedDevice
    });
  } catch (error) {
    await t.rollback();
    console.error('设备上架失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:deviceId', async (req, res) => {
  try {
    const device = await Device.findOne({
      where: { deviceId: req.params.deviceId, isIdle: true }
    });

    if (!device) {
      return res.status(404).json({ error: '空闲设备不存在' });
    }

    const beforeState = device.toJSON();
    const allowedFields = ['name', 'type', 'model', 'idleReason', 'description', 'powerConsumption'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        device[field] = req.body[field];
      }
    });

    if (req.body.warehouseId !== undefined) {
      device.warehouseId = req.body.warehouseId || null;
      device.sourceType = req.body.warehouseId ? 'warehouse' : 'rack';
    }

    if (req.body.rackId !== undefined) {
      if (req.body.rackId) {
        const rack = await Rack.findByPk(req.body.rackId);
        if (!rack) {
          return res.status(404).json({ error: '机柜不存在' });
        }
      }
      device.rackId = req.body.rackId || null;
      if (!req.body.warehouseId) {
        device.sourceType = 'rack';
      }
    }

    if (req.body.position !== undefined) {
      device.position = req.body.position || null;
    }

    await device.save();

    await logDeviceOperation('update', generateDeviceDescription('更新空闲设备', device.toJSON(), { includeRack: false }), {
      targetId: device.deviceId,
      targetName: device.name,
      beforeState,
      afterState: device.toJSON(),
      req,
      metadata: buildDeviceMetadata(device.toJSON(), { type: 'idle_device_update' })
    });

    res.json(device);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:deviceId/restore', async (req, res) => {
  const t = await require('../db').sequelize.transaction();
  try {
    const { targetRackId, targetPosition } = req.body;
    const { deviceId } = req.params;

    const device = await Device.findOne({
      where: { deviceId, isIdle: true },
      transaction: t
    });

    if (!device) {
      await t.rollback();
      return res.status(404).json({ error: '空闲设备不存在' });
    }

    if (!targetRackId || !targetPosition) {
      await t.rollback();
      return res.status(400).json({ error: '恢复设备需要指定目标机柜和位置' });
    }

    const targetRack = await Rack.findByPk(targetRackId, { transaction: t });
    if (!targetRack) {
      await t.rollback();
      return res.status(404).json({ error: '目标机柜不存在' });
    }

    const positionCheck = await checkPositionAvailable(targetRackId, targetPosition, device.height || 1, deviceId, t);
    if (!positionCheck.available) {
      await t.rollback();
      return res.status(400).json({ error: positionCheck.reason });
    }

    await device.update({
      isIdle: false,
      idleDate: null,
      idleReason: null,
      rackId: targetRackId,
      position: targetPosition,
      warehouseId: null,
      sourceType: 'rack',
      status: 'offline'
    }, { transaction: t });

    await targetRack.update({
      currentPower: targetRack.currentPower + (device.powerConsumption || 0)
    }, { transaction: t });

    await t.commit();

    const updatedDevice = await Device.findByPk(deviceId, {
      include: [
        { model: Rack, include: [Room] }
      ]
    });

    const deviceData = {
      ...updatedDevice.toJSON(),
      rackName: targetRack.name,
      roomName: updatedDevice.Rack?.Room?.name
    };

    await logDeviceOperation('restore', generateDeviceDescription('空闲设备恢复', deviceData, { includePosition: false }) + `到机柜【${targetRack.name}】U${targetPosition}`, {
      targetId: device.deviceId,
      targetName: device.name,
      beforeState: { ...device.toJSON(), isIdle: true },
      afterState: deviceData,
      req,
      metadata: buildDeviceMetadata(deviceData, { targetRackId, targetPosition, type: 'idle_device_restore' })
    });

    res.json({
      message: '设备已恢复到设备管理',
      device: updatedDevice
    });
  } catch (error) {
    await t.rollback();
    console.error('恢复设备失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/batch-restore', async (req, res) => {
  const t = await require('../db').sequelize.transaction();
  try {
    const { devices } = req.body;

    console.log('========== batch-restore 开始 ==========');
    console.log('原始请求 body:', JSON.stringify(req.body));
    console.log('devices 参数:', devices);

    if (!devices || !Array.isArray(devices) || devices.length === 0) {
      await t.rollback();
      console.log('错误: devices 参数无效');
      return res.status(400).json({ error: '请提供有效的设备列表' });
    }

    const deviceIds = devices.map(d => d.deviceId).filter(Boolean);
    console.log('提取的 deviceIds:', deviceIds);
    console.log('deviceIds 类型:', typeof deviceIds, Array.isArray(deviceIds));

    if (deviceIds.length === 0) {
      await t.rollback();
      console.log('错误: deviceIds 为空');
      return res.status(400).json({ error: '设备ID不能为空' });
    }

    console.log('开始查询设备，条件:', { deviceId: { [Op.in]: deviceIds }, isIdle: true });

    const idleDevices = await Device.findAll({
      where: { deviceId: { [Op.in]: deviceIds }, isIdle: true },
      transaction: t
    });

    console.log('查询到的空闲设备数量:', idleDevices.length);
    if (idleDevices.length > 0) {
      console.log('查询到的设备ID:', idleDevices.map(d => d.deviceId));
    }

    if (idleDevices.length === 0) {
      console.log('没有找到空闲设备，检查设备是否存在:');
      const allDevices = await Device.findAll({
        where: { deviceId: { [Op.in]: deviceIds } },
        transaction: t
      });
      console.log('设备表中存在的设备数量:', allDevices.length);
      if (allDevices.length > 0) {
        console.log('存在的设备及其 isIdle 状态:', allDevices.map(d => ({ deviceId: d.deviceId, isIdle: d.isIdle })));
      }

      await t.rollback();
      return res.status(404).json({ error: '没有找到空闲设备' });
    }

    let restoredCount = 0;
    const results = [];

    for (const device of idleDevices) {
      const deviceConfig = devices.find(d => d.deviceId === device.deviceId);
      if (!deviceConfig) continue;

      const targetRackId = deviceConfig.targetRackId;
      const targetPosition = deviceConfig.targetPosition;

      if (!targetRackId) {
        results.push({
          deviceId: device.deviceId,
          name: device.name,
          status: 'skipped',
          reason: '未指定目标机柜'
        });
        continue;
      }

      const targetRack = await Rack.findByPk(targetRackId, { transaction: t });
      if (!targetRack) {
        results.push({
          deviceId: device.deviceId,
          name: device.name,
          status: 'failed',
          reason: '目标机柜不存在'
        });
        continue;
      }

      const height = device.height || 1;
      const position = targetPosition || 1;

      const checkResult = await checkPositionAvailable(targetRackId, position, height, null, t);
      if (!checkResult.available) {
        results.push({
          deviceId: device.deviceId,
          name: device.name,
          status: 'failed',
          reason: `U位${position}已被占用`
        });
        continue;
      }

      await device.update({
        isIdle: false,
        idleDate: null,
        idleReason: null,
        rackId: targetRackId,
        position: position,
        warehouseId: null,
        sourceType: 'rack',
        status: 'offline'
      }, { transaction: t });

      await targetRack.update({
        currentPower: targetRack.currentPower + (device.powerConsumption || 0)
      }, { transaction: t });

      restoredCount++;
      results.push({
        deviceId: device.deviceId,
        name: device.name,
        status: 'success',
        targetRack: targetRack.name,
        targetPosition: position
      });
    }

    await t.commit();

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    const successDevices = idleDevices.filter(d => results.some(r => r.deviceId === d.deviceId && r.status === 'success'));
    const deviceSummary = successDevices.map(d =>
      `${d.name}(编号:${d.deviceId}${d.type ? `,类型:${d.type}` : ''}${d.ipAddress ? `,IP:${d.ipAddress}` : ''})`
    ).join('、');

    await logDeviceOperation('batch_restore', `批量上架 ${successCount} 台空闲设备：${deviceSummary}`, {
      targetId: deviceIds.join(','),
      targetName: `${successCount}台设备`,
      req,
      metadata: { results, type: 'batch_idle_device_restore', devices: successDevices.map(d => d.toJSON()) }
    });

    res.json({
      message: `成功上架 ${successCount} 台设备`,
      total: idleDevices.length,
      restored: successCount,
      failed: failedCount,
      skipped: skippedCount,
      details: results
    });
  } catch (error) {
    await t.rollback();
    console.error('批量上架设备失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:deviceId', async (req, res) => {
  const t = await require('../db').sequelize.transaction();
  try {
    const device = await Device.findOne({
      where: { deviceId: req.params.deviceId, isIdle: true },
      transaction: t
    });

    if (!device) {
      await t.rollback();
      return res.status(404).json({ error: '空闲设备不存在' });
    }

    const beforeState = device.toJSON();

    await device.destroy({ transaction: t });

    await t.commit();

    await logDeviceOperation('delete', generateDeviceDescription('删除空闲设备', {
      ...device.toJSON(),
      name: device.name || device.deviceId
    }, { includeRack: false }), {
      targetId: device.deviceId,
      targetName: device.name,
      beforeState,
      req,
      metadata: buildDeviceMetadata(device.toJSON(), { type: 'idle_device_delete' })
    });

    res.json({ message: '空闲设备删除成功' });
  } catch (error) {
    await t.rollback();
    console.error('删除空闲设备失败:', error);
    res.status(500).json({ error: error.message });
  }
});

async function checkPositionAvailable(rackId, position, height, excludeDeviceId = null, transaction = null) {
  if (!position || position <= 0) {
    return { available: true, reason: null };
  }

  const deviceHeight = height || 1;
  const startU = position;
  const endU = position + deviceHeight - 1;

  const queryOptions = {
    where: {
      rackId: rackId,
      position: { [Op.ne]: null },
      isIdle: false
    },
    attributes: ['deviceId', 'position', 'height']
  };

  if (transaction) {
    queryOptions.transaction = transaction;
  }

  const existingDevices = await Device.findAll(queryOptions);

  for (const d of existingDevices) {
    if (excludeDeviceId && d.deviceId === excludeDeviceId) {
      continue;
    }

    const existStart = d.position;
    const existEnd = d.position + (d.height || 1) - 1;

    if (!(endU < existStart || startU > existEnd)) {
      return {
        available: false,
        reason: `U位冲突：机柜中已有设备 ${d.deviceId} 占用 U${existStart}${existEnd !== existStart ? '-' + existEnd : ''}`
      };
    }
  }

  return { available: true, reason: null };
}

module.exports = router;
