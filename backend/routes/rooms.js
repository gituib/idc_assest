const express = require('express');
const router = express.Router();
const { Room, Rack, Device } = require('../models');
const { sequelize } = require('../db');
const { validateBody } = require('../middleware/validation');
const { createRoomSchema, updateRoomSchema } = require('../validation/roomSchema');
const { logOperation } = require('../utils/operationLogger');

/**
 * 记录机房操作日志
 * @param {string} operationType - 操作类型
 * @param {string} operationDescription - 操作描述
 * @param {Object} params - 参数
 * @returns {Promise<Object|null>}
 */
const logRoomOperation = (operationType, operationDescription, params) =>
  logOperation({ module: 'room', operationType, operationDescription, ...params });

// 获取所有机房
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 100;
    const offset = (page - 1) * pageSize;

    const { count, rows } = await Room.findAndCountAll({
      include: [{ model: Rack, attributes: ['rackId', 'name'] }],
      offset: offset,
      limit: pageSize,
    });

    res.json({
      rooms: rows,
      total: count,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个机房
router.get('/:roomId', async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.roomId, {
      include: Rack,
    });
    if (!room) {
      return res.status(404).json({ error: '机房不存在' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建机房
router.post('/', async (req, res) => {
  try {
    const room = await Room.create(req.body);
    // 记录创建机房成功日志
    await logRoomOperation('create', `创建机房【${room.name}】`, {
      targetId: room.roomId,
      targetName: room.name,
      afterState: room.toJSON(),
      req,
      metadata: { type: 'room_create' },
    });
    res.status(201).json(room);
  } catch (error) {
    // 记录创建机房失败日志
    await logRoomOperation('create', '创建机房失败', {
      targetName: req.body?.name,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(400).json({ error: error.message });
  }
});

// 更新机房
router.put('/:roomId', validateBody(updateRoomSchema), async (req, res) => {
  try {
    const beforeRoom = await Room.findByPk(req.params.roomId);
    if (!beforeRoom) {
      return res.status(404).json({ error: '机房不存在' });
    }
    const beforeState = beforeRoom.toJSON();
    const [updated] = await Room.update(req.body, {
      where: { roomId: req.params.roomId },
    });
    if (updated) {
      const updatedRoom = await Room.findByPk(req.params.roomId);
      // 记录更新机房成功日志
      await logRoomOperation('update', `更新机房【${updatedRoom.name}】`, {
        targetId: req.params.roomId,
        targetName: updatedRoom.name,
        beforeState,
        afterState: updatedRoom.toJSON(),
        req,
        metadata: { type: 'room_update' },
      });
      res.json(updatedRoom);
    } else {
      res.status(404).json({ error: '机房不存在' });
    }
  } catch (error) {
    // 记录更新机房失败日志
    await logRoomOperation('update', '更新机房失败', {
      targetId: req.params.roomId,
      targetName: req.body?.name,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(400).json({ error: error.message });
  }
});

// 删除机房
router.delete('/:roomId', async (req, res) => {
  try {
    const beforeRoom = await Room.findByPk(req.params.roomId);
    if (!beforeRoom) {
      return res.status(404).json({ error: '机房不存在' });
    }
    const beforeState = beforeRoom.toJSON();
    const racks = await Rack.findAll({ where: { roomId: req.params.roomId } });
    if (racks.length > 0) {
      return res.status(400).json({ error: '该机房下有机柜，无法删除' });
    }

    const deleted = await Room.destroy({
      where: { roomId: req.params.roomId },
    });
    if (deleted) {
      // 记录删除机房成功日志
      await logRoomOperation('delete', `删除机房【${beforeRoom.name}】`, {
        targetId: req.params.roomId,
        targetName: beforeRoom.name,
        beforeState,
        req,
        metadata: { type: 'room_delete' },
      });
      res.status(204).json();
    } else {
      res.status(404).json({ error: '机房不存在' });
    }
  } catch (error) {
    // 记录删除机房失败日志
    await logRoomOperation('delete', '删除机房失败', {
      targetId: req.params.roomId,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

// 获取机房平面图布局数据
router.get('/:roomId/layout', async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: '机房不存在' });
    }

    const racks = await Rack.findAll({
      where: { roomId: req.params.roomId },
      include: [{
        model: Device,
        as: 'Devices',
        attributes: ['deviceId', 'name', 'type', 'status', 'position', 'height', 'powerConsumption', 'ipAddress', 'model'],
      }],
    });

    const rackData = racks.map(rack => {
      const rackJson = rack.toJSON();
      const devices = rackJson.Devices || [];
      const usedU = devices.reduce((sum, d) => sum + (d.height || 1), 0);
      const totalPower = devices.reduce((sum, d) => sum + (d.powerConsumption || 0), 0);
      return {
        rackId: rackJson.rackId,
        name: rackJson.name,
        rowPos: rackJson.rowPos,
        colPos: rackJson.colPos,
        facing: rackJson.facing,
        status: rackJson.status,
        height: rackJson.height,
        maxPower: rackJson.maxPower,
        currentPower: rackJson.currentPower,
        deviceCount: devices.length,
        usedU,
        totalU: rackJson.height,
        utilization: rackJson.height > 0 ? usedU / rackJson.height : 0,
        totalPower,
        Devices: devices,
      };
    });

    const activeRacks = rackData.filter(r => r.status === 'active').length;
    const maintenanceRacks = rackData.filter(r => r.status === 'maintenance').length;
    const inactiveRacks = rackData.filter(r => r.status === 'inactive').length;
    const totalMaxPower = rackData.reduce((sum, r) => sum + (r.maxPower || 0), 0);
    const totalCurrentPower = rackData.reduce((sum, r) => sum + (r.currentPower || 0), 0);
    const avgUtilization = rackData.length > 0
      ? rackData.reduce((sum, r) => sum + r.utilization, 0) / rackData.length
      : 0;

    res.json({
      room: {
        roomId: room.roomId,
        name: room.name,
        location: room.location,
        area: room.area,
        capacity: room.capacity,
        gridRows: room.gridRows,
        gridCols: room.gridCols,
        layoutConfig: room.layoutConfig,
      },
      racks: rackData,
      stats: {
        totalRacks: rackData.length,
        activeRacks,
        maintenanceRacks,
        inactiveRacks,
        avgUtilization: Math.round(avgUtilization * 100) / 100,
        totalCurrentPower,
        totalMaxPower,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新机房布局参数
router.put('/:roomId/layout', async (req, res) => {
  try {
    const { gridRows, gridCols, layoutConfig } = req.body;
    const beforeRoom = await Room.findByPk(req.params.roomId);
    if (!beforeRoom) {
      return res.status(404).json({ error: '机房不存在' });
    }
    const beforeState = beforeRoom.toJSON();

    const updateData = {};
    if (gridRows !== undefined) updateData.gridRows = gridRows;
    if (gridCols !== undefined) updateData.gridCols = gridCols;
    if (layoutConfig !== undefined) updateData.layoutConfig = layoutConfig;

    await Room.update(updateData, { where: { roomId: req.params.roomId } });
    const updatedRoom = await Room.findByPk(req.params.roomId);
    // 记录更新机房布局参数成功日志
    await logRoomOperation('update_layout', `更新机房【${updatedRoom.name}】布局参数`, {
      targetId: req.params.roomId,
      targetName: updatedRoom.name,
      beforeState,
      afterState: updatedRoom.toJSON(),
      req,
      metadata: { type: 'room_layout_update', updatedFields: Object.keys(updateData) },
    });
    res.json(updatedRoom);
  } catch (error) {
    // 记录更新机房布局参数失败日志
    await logRoomOperation('update_layout', '更新机房布局参数失败', {
      targetId: req.params.roomId,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(400).json({ error: error.message });
  }
});

// 批量更新机房内机柜位置
router.put('/:roomId/racks-positions', async (req, res) => {
  try {
    const { positions } = req.body;
    if (!Array.isArray(positions)) {
      return res.status(400).json({ error: 'positions 必须是数组' });
    }

    const results = [];
    for (const pos of positions) {
      const { rackId, rowPos, colPos, facing } = pos;
      if (!rackId) continue;

      const rack = await Rack.findByPk(rackId);
      if (!rack || rack.roomId !== req.params.roomId) continue;

      await Rack.update(
        { rowPos, colPos, facing },
        { where: { rackId } }
      );
      results.push(rackId);
    }

    // 记录批量调整机柜位置成功日志
    await logRoomOperation('update_rack_position', '批量调整机房机柜位置', {
      targetId: req.params.roomId,
      targetName: results.length > 0 ? `${results.length}个机柜` : null,
      req,
      metadata: { type: 'rack_position_update', updatedRackIds: results, count: results.length },
    });
    res.json({ success: true, updated: results.length });
  } catch (error) {
    // 记录批量调整机柜位置失败日志
    await logRoomOperation('update_rack_position', '批量调整机房机柜位置失败', {
      targetId: req.params.roomId,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

// 初始化机房布局（自动分配所有机柜位置）
router.post('/:roomId/init-layout', async (req, res) => {
  try {
    const { gridRows, gridCols } = req.body;
    const rows = gridRows || 10;
    const cols = gridCols || 10;

    const racks = await Rack.findAll({
      where: { roomId: req.params.roomId },
      order: [['name', 'ASC']],
    });

    const positions = [];
    let index = 0;
    for (let row = 0; row < rows && index < racks.length; row++) {
      for (let col = 0; col < cols && index < racks.length; col++) {
        positions.push({
          rackId: racks[index].rackId,
          rowPos: row,
          colPos: col,
          facing: 'front',
        });
        index++;
      }
    }

    for (const pos of positions) {
      await Rack.update(
        { rowPos: pos.rowPos, colPos: pos.colPos, facing: pos.facing },
        { where: { rackId: pos.rackId } }
      );
    }

    // 记录初始化机房布局成功日志
    await logRoomOperation('init_layout', '初始化机房布局', {
      targetId: req.params.roomId,
      targetName: positions.length > 0 ? `${positions.length}个机柜` : null,
      req,
      metadata: { type: 'room_layout_init', gridRows: rows, gridCols: cols, assignedCount: positions.length },
    });
    res.json({ success: true, assigned: positions.length });
  } catch (error) {
    // 记录初始化机房布局失败日志
    await logRoomOperation('init_layout', '初始化机房布局失败', {
      targetId: req.params.roomId,
      result: 'failed',
      req,
      metadata: { error: error.message, gridRows: req.body?.gridRows, gridCols: req.body?.gridCols },
    });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
