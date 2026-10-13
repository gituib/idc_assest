const logger = require('../utils/logger').module('IdleDevicesRoute');
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Device = require('../models/Device');
const Rack = require('../models/Rack');
const Room = require('../models/Room');
const requirePermission = require('../middleware/requirePermission');
const { friendlyDbErrorMessage } = require('../utils/errorHandler');
const { authMiddleware } = require('../middleware/auth');
const {
  logDeviceOperation,
  generateDeviceDescription,
  buildDeviceMetadata,
} = require('../utils/operationLogger');

async function generateIdleDeviceId() {
  const devices = await Device.findAll({
    where: {
      deviceId: {
        [Op.like]: 'DEV%',
      },
    },
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

router.get('/', authMiddleware, requirePermission('idle:view'), async (req, res) => {
  try {
    const { keyword, sourceType, idleReason, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const where = { isIdle: true };

    if (keyword) {
      where[Op.or] = [
        { deviceId: { [Op.like]: `%${keyword}%` } },
        { name: { [Op.like]: `%${keyword}%` } },
        { serialNumber: { [Op.like]: `%${keyword}%` } },
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
          include: [
            {
              model: Room,
              attributes: ['roomId', 'name'],
            },
          ],
        },
      ],
      offset: parseInt(offset),
      limit: parseInt(pageSize),
      order: [['idleDate', 'DESC']],
    });

    res.json({
      total: count,
      idleDevices: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    logger.error('获取空闲设备列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

router.get('/:deviceId', authMiddleware, requirePermission('idle:view'), async (req, res) => {
  try {
    const device = await Device.findOne({
      where: { deviceId: req.params.deviceId, isIdle: true },
      include: [
        {
          model: Rack,
          attributes: ['rackId', 'name', 'roomId'],
          include: [
            {
              model: Room,
              attributes: ['roomId', 'name'],
            },
          ],
        },
      ],
    });

    if (!device) {
      return res.status(404).json({ error: '空闲设备不存在' });
    }

    res.json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, requirePermission('idle:shelve'), async (req, res) => {
  try {
    const {
      name,
      type,
      model,
      serialNumber,
      powerConsumption,
      idleReason,
      warehouseId,
      description,
      rackId,
      position,
    } = req.body;

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

    // U 位冲突校验：空闲设备不允许与在位设备占用同一 U 位段
    if (rackId && position) {
      const heightCheck = parseInt(req.body.height, 10) || 1;
      const positionCheck = await checkPositionAvailable(rackId, position, heightCheck, null);
      if (!positionCheck.available) {
        return res.status(400).json({ error: positionCheck.reason });
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
      sourceType: warehouseId ? 'warehouse' : rackId ? 'rack' : 'rack',
      description: description || '',
    });

    await logDeviceOperation(
      'create',
      generateDeviceDescription(
        '新增空闲设备',
        {
          deviceId: device.deviceId,
          name: device.name || deviceId,
          type: device.type,
          model: device.model,
          serialNumber: device.serialNumber,
          ipAddress: device.ipAddress,
        },
        { includeRack: false }
      ),
      {
        targetId: device.deviceId,
        targetName: device.name || deviceId,
        afterState: device.toJSON(),
        req,
        metadata: buildDeviceMetadata(device.toJSON(), {
          sourceType: device.sourceType,
          type: 'idle_device_create',
        }),
      }
    );

    res.status(201).json(device);
  } catch (error) {
    // 记录失败操作日志
    await logDeviceOperation('create', '新增空闲设备失败', {
      targetId: req.body.deviceId,
      targetName: req.body.name,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(400).json({ error: friendlyDbErrorMessage(error) });
  }
});

router.post('/from-device/:deviceId', authMiddleware, requirePermission('idle:shelve'), async (req, res) => {
  const t = await require('../db').sequelize.transaction();
  // 声明在 try 外，catch 块记录日志时可安全访问（try 内 const 存在作用域隔离问题）
  let device = null;
  try {
    const { idleReason } = req.body;
    const { deviceId } = req.params;

    device = await Device.findByPk(deviceId, { transaction: t });
    if (!device) {
      await t.rollback();
      return res.status(404).json({ error: '设备不存在' });
    }

    if (device.isIdle) {
      await t.rollback();
      return res.status(400).json({ error: '设备已经标记为空闲设备' });
    }

    await device.update(
      {
        isIdle: true,
        status: 'idle',
        idleDate: new Date(),
        idleReason: idleReason || `从设备管理转入`,
        sourceType: 'rack',
      },
      { transaction: t }
    );

    // 转入空闲时从原机柜扣除功耗（与 to-idle 语义一致：空闲设备不计机柜功耗）
    if (device.rackId) {
      const powerRack = await Rack.findByPk(device.rackId, { transaction: t });
      if (powerRack) {
        await powerRack.update(
          {
            currentPower: Math.max(0, (Number(powerRack.currentPower) || 0) - (Number(device.powerConsumption) || 0)),
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    const deviceData = device.toJSON();
    const reasonText = idleReason || '从设备管理转入';
    await logDeviceOperation(
      'to_idle',
      generateDeviceDescription('设备转入空闲设备', deviceData) + `，空闲原因：${reasonText}`,
      {
        targetId: device.deviceId,
        targetName: device.name,
        beforeState: { ...deviceData, isIdle: false },
        afterState: { ...deviceData, isIdle: true },
        req,
        metadata: buildDeviceMetadata(deviceData, {
          idleReason: reasonText,
          type: 'device_to_idle',
        }),
      }
    );

    res.json({
      message: '设备已转入空闲设备',
      device: device.toJSON(),
    });
  } catch (error) {
    await t.rollback();
    // 记录失败操作日志
    await logDeviceOperation('to_idle', '设备转入空闲设备失败', {
      targetId: req.params.deviceId,
      targetName: device?.name,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    logger.error('设备转入空闲设备失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch-from-devices', authMiddleware, requirePermission('idle:shelve'), async (req, res) => {
  const t = await require('../db').sequelize.transaction();
  try {
    const { deviceIds, idleReason } = req.body;

    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: '请提供有效的设备ID列表' });
    }

    const devices = await Device.findAll({
      where: { deviceId: { [Op.in]: deviceIds } },
      transaction: t,
    });

    const notIdleDevices = devices.filter(d => !d.isIdle);
    const alreadyIdleDevices = devices.filter(d => d.isIdle);

    if (notIdleDevices.length > 0) {
      await Device.update(
        {
          isIdle: true,
          status: 'idle',
          idleDate: new Date(),
          idleReason: idleReason || `批量转入`,
        },
        {
          where: { deviceId: { [Op.in]: notIdleDevices.map(d => d.deviceId) } },
          transaction: t,
        }
      );

      // 按机柜分组扣减功耗（与单台转空闲语义一致：空闲设备不计机柜功耗）
      const rackPowerMap = new Map();
      notIdleDevices.forEach(d => {
        if (!d.rackId) return;
        rackPowerMap.set(d.rackId, (rackPowerMap.get(d.rackId) || 0) + (Number(d.powerConsumption) || 0));
      });
      for (const [rackId, powerToSubtract] of rackPowerMap) {
        // 用 JS 计算避免方言差异（MySQL UPDATE 中 MAX(x,0) 标量多参写法不被支持）
        const powerRack = await Rack.findByPk(rackId, { transaction: t });
        if (powerRack) {
          await powerRack.update(
            {
              currentPower: Math.max(0, (Number(powerRack.currentPower) || 0) - powerToSubtract),
            },
            { transaction: t }
          );
        }
      }
    }

    await t.commit();

    const deviceDetails = notIdleDevices.map(d => d.toJSON());
    const reasonText = idleReason || '批量转入';
    const deviceSummary = deviceDetails
      .map(
        d =>
          `${d.name}(编号:${d.deviceId}${d.type ? `,类型:${d.type}` : ''}${d.serialNumber ? `,序列号:${d.serialNumber}` : ''})`
      )
      .join('、');

    await logDeviceOperation(
      'batch_to_idle',
      `批量将 ${notIdleDevices.length} 台设备转入空闲设备（空闲原因：${reasonText}）：${deviceSummary}`,
      {
        targetId: deviceIds.join(','),
        targetName: `${notIdleDevices.length}台设备`,
        req,
        metadata: {
          idleReason: reasonText,
          type: 'batch_device_to_idle',
          devices: deviceDetails,
        },
      }
    );

    res.json({
      message: `成功将 ${notIdleDevices.length} 台设备转入空闲设备`,
      total: devices.length,
      updated: notIdleDevices.length,
      skipped: alreadyIdleDevices.length,
    });
  } catch (error) {
    await t.rollback();
    // 记录失败操作日志
    const requestDeviceIds = Array.isArray(req.body.deviceIds) ? req.body.deviceIds : [];
    await logDeviceOperation('batch_to_idle', '批量转入空闲设备失败', {
      targetId: requestDeviceIds.join(','),
      targetName: `${requestDeviceIds.length}台设备`,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    logger.error('批量转入空闲设备失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

router.put('/batch-restore', authMiddleware, requirePermission('idle:restore'), async (req, res) => {
  const t = await require('../db').sequelize.transaction();
  try {
    const { devices } = req.body;

    logger.info('========== batch-restore 开始 ==========');
    logger.info('原始请求 body', { data: JSON.stringify(req.body) });
    logger.info('devices 参数', { data: devices });

    if (!devices || !Array.isArray(devices) || devices.length === 0) {
      await t.rollback();
      logger.info('错误: devices 参数无效');
      return res.status(400).json({ error: '请提供有效的设备列表' });
    }

    const deviceIds = devices.map(d => d.deviceId).filter(Boolean);
    logger.info('提取的 deviceIds', { data: deviceIds });

    if (deviceIds.length === 0) {
      await t.rollback();
      logger.info('错误: deviceIds 为空');
      return res.status(400).json({ error: '设备ID不能为空' });
    }

    logger.info('开始查询设备，条件', { data: { deviceId: { [Op.in]: deviceIds }, isIdle: true } });

    const idleDevices = await Device.findAll({
      where: { deviceId: { [Op.in]: deviceIds }, isIdle: true },
      transaction: t,
    });

    logger.info('查询到的空闲设备数量', { data: idleDevices.length });
    if (idleDevices.length > 0) {
      logger.info('查询到的设备ID', { data: idleDevices.map(d => d.deviceId) });
    }

    if (idleDevices.length === 0) {
      logger.info('没有找到空闲设备，检查设备是否存在:');
      const allDevices = await Device.findAll({
        where: { deviceId: { [Op.in]: deviceIds } },
        transaction: t,
      });
      logger.info('设备表中存在的设备数量', { data: allDevices.length });
      if (allDevices.length > 0) {
        logger.info('存在的设备及其 isIdle 状态', { data: allDevices.map(d => ({ deviceId: d.deviceId, isIdle: d.isIdle })) });
      }

      await t.rollback();
      return res.status(404).json({ error: '没有找到空闲设备' });
    }

    let restoredCount = 0;
    const results = [];

    for (const device of idleDevices) {
      const deviceConfig = devices.find(d => d.deviceId === device.deviceId);
      if (!deviceConfig) {
        continue;
      }

      const targetRackId = deviceConfig.targetRackId;
      const targetPosition = deviceConfig.targetPosition;

      if (!targetRackId) {
        results.push({
          deviceId: device.deviceId,
          name: device.name,
          status: 'skipped',
          reason: '未指定目标机柜',
        });
        continue;
      }

      const targetRack = await Rack.findByPk(targetRackId, { transaction: t });
      if (!targetRack) {
        results.push({
          deviceId: device.deviceId,
          name: device.name,
          status: 'failed',
          reason: '目标机柜不存在',
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
          reason: `U位${position}已被占用`,
        });
        continue;
      }

      // 在 update 前保存原空闲原因（update 会清空 idleReason 字段）
      const previousIdleReason = device.idleReason || '未填写';

      await device.update(
        {
          isIdle: false,
          idleDate: null,
          idleReason: null,
          rackId: targetRackId,
          position: position,
          warehouseId: null,
          sourceType: 'rack',
          status: 'offline',
        },
        { transaction: t }
      );

      await targetRack.update(
        {
          currentPower: targetRack.currentPower + (device.powerConsumption || 0),
        },
        { transaction: t }
      );

      restoredCount++;
      results.push({
        deviceId: device.deviceId,
        name: device.name,
        status: 'success',
        targetRack: targetRack.name,
        targetPosition: position,
        previousIdleReason,
      });
    }

    await t.commit();

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    const successDevices = idleDevices.filter(d =>
      results.some(r => r.deviceId === d.deviceId && r.status === 'success')
    );
    // 通过 deviceId 关联 results，取出更新前保存的原空闲原因
    const reasonMap = new Map(results.map(r => [r.deviceId, r.previousIdleReason || '未填写']));
    const deviceSummary = successDevices
      .map(
        d =>
          `${d.name}(编号:${d.deviceId}${d.type ? `,类型:${d.type}` : ''}${d.ipAddress ? `,IP:${d.ipAddress}` : ''},原空闲原因:${reasonMap.get(d.deviceId) || '未填写'})`
      )
      .join('、');

    await logDeviceOperation(
      'batch_restore',
      `批量上架 ${successCount} 台空闲设备：${deviceSummary}`,
      {
        targetId: deviceIds.join(','),
        targetName: `${successCount}台设备`,
        req,
        metadata: {
          results,
          type: 'batch_idle_device_restore',
          devices: successDevices.map(d => d.toJSON()),
        },
      }
    );

    res.json({
      message: `成功上架 ${successCount} 台设备`,
      total: idleDevices.length,
      restored: successCount,
      failed: failedCount,
      skipped: skippedCount,
      details: results,
    });
  } catch (error) {
    await t.rollback();
    // 记录失败操作日志
    const requestDevices = Array.isArray(req.body.devices) ? req.body.devices : [];
    const requestDeviceIds = requestDevices.map(d => d?.deviceId).filter(Boolean);
    await logDeviceOperation('batch_restore', '批量上架空闲设备失败', {
      targetId: requestDeviceIds.join(','),
      targetName: `${requestDeviceIds.length}台设备`,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    logger.error('批量上架设备失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

router.put('/:deviceId/shelve', authMiddleware, requirePermission('idle:shelve'), async (req, res) => {
  const t = await require('../db').sequelize.transaction();
  // 声明在 try 外，catch 块记录日志时可安全访问
  let device = null;
  try {
    const { deviceId } = req.params;
    const {
      name,
      type,
      model,
      serialNumber,
      height,
      powerConsumption,
      rackId,
      position,
      description,
    } = req.body;

    device = await Device.findOne({
      where: { deviceId, isIdle: true },
      transaction: t,
    });

    if (!device) {
      await t.rollback();
      return res.status(404).json({ error: '空闲设备不存在' });
    }

    if (!rackId) {
      await t.rollback();
      return res.status(400).json({ error: '请选择目标机柜' });
    }

    // U 位为必填项，空值会导致原 U 位信息被覆盖丢失（历史问题：上架时未填位置覆盖 position）
    const parsedPosition = parseInt(position, 10);
    if (!parsedPosition || parsedPosition <= 0) {
      await t.rollback();
      return res.status(400).json({ error: '请选择可用的U位位置' });
    }

    const targetRack = await Rack.findByPk(rackId, { transaction: t });
    if (!targetRack) {
      await t.rollback();
      return res.status(404).json({ error: '目标机柜不存在' });
    }

    const deviceHeight = height || device.height || 1;
    logger.info('上架设备 - 位置检查参数', { data: { rackId, position, deviceHeight, deviceId, existingDeviceId: device.deviceId } });
    const positionCheck = await checkPositionAvailable(rackId, position, deviceHeight, deviceId, t);
    logger.info('上架设备 - 位置检查结果', { data: positionCheck });
    if (!positionCheck.available) {
      await t.rollback();
      return res.status(400).json({ error: positionCheck.reason });
    }

    const beforeState = device.toJSON();

    await device.update(
      {
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
        status: 'running',
      },
      { transaction: t }
    );

    await targetRack.update(
      {
        currentPower: targetRack.currentPower + (powerConsumption || device.powerConsumption || 0),
      },
      { transaction: t }
    );

    await t.commit();

    const updatedDevice = await Device.findByPk(deviceId, {
      include: [{ model: Rack, include: [Room] }],
    });

    const deviceData = {
      ...updatedDevice.toJSON(),
      rackName: targetRack.name,
      roomName: updatedDevice.Rack?.Room?.name,
    };

    // 上架描述需带上原空闲原因（从更新前快照取值，否则已被清空为 null）
    const previousIdleReason = beforeState.idleReason;
    const positionText = position ? `U${position}` : '未指定位置';
    const idleReasonText = previousIdleReason
      ? `，原空闲原因：${previousIdleReason}`
      : '，原空闲原因：未填写';

    await logDeviceOperation(
      'shelve',
      generateDeviceDescription('空闲设备上架', deviceData, { includePosition: false }) +
        `到机柜【${targetRack.name}】${positionText}${idleReasonText}`,
      {
        targetId: device.deviceId,
        targetName: device.name,
        beforeState: { ...beforeState, isIdle: true },
        afterState: deviceData,
        req,
        metadata: buildDeviceMetadata(deviceData, {
          rackId,
          position,
          type: 'idle_device_shelve',
          previousIdleReason,
        }),
      }
    );

    res.json({
      message: '设备上架成功',
      device: updatedDevice,
    });
  } catch (error) {
    await t.rollback();
    // 记录失败操作日志
    await logDeviceOperation('shelve', '空闲设备上架失败', {
      targetId: req.params.deviceId,
      targetName: device?.name,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    logger.error('设备上架失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

router.put('/:deviceId', authMiddleware, requirePermission('idle:edit'), async (req, res) => {
  // 声明在 try 外，catch 块记录日志时可安全访问
  let device = null;
  try {
    device = await Device.findOne({
      where: { deviceId: req.params.deviceId, isIdle: true },
    });

    if (!device) {
      return res.status(404).json({ error: '空闲设备不存在' });
    }

    const beforeState = device.toJSON();
    const allowedFields = [
      'name',
      'type',
      'model',
      'idleReason',
      'description',
      'powerConsumption',
    ];

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

    // U 位冲突校验：仅当本次变更了 position 或 rackId 时校验，防止空闲设备与在位设备重叠
    const positionChanged =
      (req.body.position !== undefined && (req.body.position || null) !== beforeState.position) ||
      (req.body.rackId !== undefined && (req.body.rackId || null) !== beforeState.rackId);
    if (positionChanged && device.rackId && device.position) {
      const positionCheck = await checkPositionAvailable(
        device.rackId,
        device.position,
        device.height,
        req.params.deviceId
      );
      if (!positionCheck.available) {
        return res.status(400).json({ error: positionCheck.reason });
      }
    }

    await device.save();

    await logDeviceOperation(
      'update',
      generateDeviceDescription('更新空闲设备', device.toJSON(), { includeRack: false }),
      {
        targetId: device.deviceId,
        targetName: device.name,
        beforeState,
        afterState: device.toJSON(),
        req,
        metadata: buildDeviceMetadata(device.toJSON(), { type: 'idle_device_update' }),
      }
    );

    res.json(device);
  } catch (error) {
    // 记录失败操作日志
    await logDeviceOperation('update', '更新空闲设备失败', {
      targetId: req.params.deviceId,
      targetName: device?.name,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(400).json({ error: friendlyDbErrorMessage(error) });
  }
});

router.put('/:deviceId/restore', authMiddleware, requirePermission('idle:restore'), async (req, res) => {
  const t = await require('../db').sequelize.transaction();
  // 声明在 try 外，catch 块记录日志时可安全访问
  let device = null;
  try {
    const { targetRackId, targetPosition } = req.body;
    const { deviceId } = req.params;

    device = await Device.findOne({
      where: { deviceId, isIdle: true },
      transaction: t,
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

    const positionCheck = await checkPositionAvailable(
      targetRackId,
      targetPosition,
      device.height || 1,
      deviceId,
      t
    );
    if (!positionCheck.available) {
      await t.rollback();
      return res.status(400).json({ error: positionCheck.reason });
    }

    // 保存更新前快照，用于在描述中体现原空闲原因
    const beforeState = device.toJSON();

    await device.update(
      {
        isIdle: false,
        idleDate: null,
        idleReason: null,
        rackId: targetRackId,
        position: targetPosition,
        warehouseId: null,
        sourceType: 'rack',
        status: 'offline',
      },
      { transaction: t }
    );

    await targetRack.update(
      {
        currentPower: targetRack.currentPower + (device.powerConsumption || 0),
      },
      { transaction: t }
    );

    await t.commit();

    const updatedDevice = await Device.findByPk(deviceId, {
      include: [{ model: Rack, include: [Room] }],
    });

    const deviceData = {
      ...updatedDevice.toJSON(),
      rackName: targetRack.name,
      roomName: updatedDevice.Rack?.Room?.name,
    };

    // 恢复描述需带上原空闲原因（从更新前快照取值，避免被清空为 null）
    const previousIdleReason = beforeState.idleReason;
    const idleReasonText = previousIdleReason
      ? `，原空闲原因：${previousIdleReason}`
      : '，原空闲原因：未填写';

    await logDeviceOperation(
      'restore',
      generateDeviceDescription('空闲设备恢复', deviceData, { includePosition: false }) +
        `到机柜【${targetRack.name}】U${targetPosition}${idleReasonText}`,
      {
        targetId: device.deviceId,
        targetName: device.name,
        beforeState: { ...beforeState, isIdle: true },
        afterState: deviceData,
        req,
        metadata: buildDeviceMetadata(deviceData, {
          targetRackId,
          targetPosition,
          type: 'idle_device_restore',
          previousIdleReason,
        }),
      }
    );

    res.json({
      message: '设备已恢复到设备管理',
      device: updatedDevice,
    });
  } catch (error) {
    await t.rollback();
    // 记录失败操作日志
    await logDeviceOperation('restore', '空闲设备恢复失败', {
      targetId: req.params.deviceId,
      targetName: device?.name,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    logger.error('恢复设备失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:deviceId', authMiddleware, requirePermission('idle:delete'), async (req, res) => {
  const t = await require('../db').sequelize.transaction();
  // 声明在 try 外，catch 块记录日志时可安全访问
  let device = null;
  try {
    device = await Device.findOne({
      where: { deviceId: req.params.deviceId, isIdle: true },
      transaction: t,
    });

    if (!device) {
      await t.rollback();
      return res.status(404).json({ error: '空闲设备不存在' });
    }

    const beforeState = device.toJSON();
    const deviceId = req.params.deviceId;

    // 有接线时拒绝删除——空闲设备应该先清理完接线再删除
    const Cable = require('../models/Cable');
    const relatedCables = await Cable.findAll({
      where: {
        [Op.or]: [{ sourceDeviceId: deviceId }, { targetDeviceId: deviceId }],
      },
      transaction: t,
    });

    if (relatedCables.length > 0) {
      await t.rollback();
      return res.status(400).json({
        error: `该设备存在 ${relatedCables.length} 条关联接线，请先删除接线后再删除设备`,
        relatedCables: relatedCables.map(c => ({
          cableId: c.cableId,
          sourcePort: c.sourcePort,
          targetPort: c.targetPort,
        })),
      });
    }

    // 级联清理关联数据（端口/网卡/工单/盘点记录），否则外键约束会导致设备删除失败
    const DevicePort = require('../models/DevicePort');
    const NetworkCard = require('../models/NetworkCard');
    const Ticket = require('../models/Ticket');
    const InventoryRecord = require('../models/InventoryRecord');

    await DevicePort.destroy({
      where: { deviceId },
      transaction: t,
    });

    await NetworkCard.destroy({
      where: { deviceId },
      transaction: t,
    });

    await Ticket.update(
      { deviceId: null },
      { where: { deviceId }, transaction: t }
    );

    await InventoryRecord.destroy({
      where: { deviceId },
      transaction: t,
    });

    await device.destroy({ transaction: t });

    await t.commit();

    await logDeviceOperation(
      'delete',
      generateDeviceDescription(
        '删除空闲设备',
        {
          ...device.toJSON(),
          name: device.name || device.deviceId,
        },
        { includeRack: false }
      ),
      {
        targetId: device.deviceId,
        targetName: device.name,
        beforeState,
        req,
        metadata: buildDeviceMetadata(device.toJSON(), { type: 'idle_device_delete' }),
      }
    );

    res.json({ message: '空闲设备删除成功' });
  } catch (error) {
    await t.rollback();
    // 记录失败操作日志
    await logDeviceOperation('delete', '删除空闲设备失败', {
      targetId: req.params.deviceId,
      targetName: device?.name,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    logger.error('删除空闲设备失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

async function checkPositionAvailable(
  rackId,
  position,
  height,
  excludeDeviceId = null,
  transaction = null
) {
  const pos = parseInt(position, 10);
  if (!pos || pos <= 0) {
    return { available: true, reason: null };
  }

  const deviceHeight = parseInt(height, 10) || 1;
  const startU = pos;
  const endU = pos + deviceHeight - 1;

  // 校验 U 位不超过机柜物理高度上限（如 42U 机柜不允许 U50）
  const rackForCheck = await Rack.findByPk(rackId, transaction ? { transaction } : undefined);
  if (rackForCheck && rackForCheck.height && endU > rackForCheck.height) {
    return {
      available: false,
      reason: `U位超出机柜范围：机柜高度 ${rackForCheck.height}U，当前位置范围 U${startU}-U${endU} 超出上限`,
    };
  }

  const queryOptions = {
    where: {
      rackId: rackId,
      position: { [Op.ne]: null },
      isIdle: false,
    },
    attributes: ['deviceId', 'position', 'height'],
  };

  if (transaction) {
    queryOptions.transaction = transaction;
    // 使用悲观锁防止竞态条件
    queryOptions.lock = transaction.LOCK ? transaction.LOCK.UPDATE : 'UPDATE';
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
        reason: `U位冲突：机柜中已有设备 ${d.deviceId} 占用 U${existStart}${existEnd !== existStart ? '-' + existEnd : ''}`,
      };
    }
  }

  return { available: true, reason: null };
}

module.exports = router;
