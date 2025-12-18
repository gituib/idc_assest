const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Rack = require('../models/Rack');

// 获取所有机房
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.findAll({
      include: Rack
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个机房
router.get('/:roomId', async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.roomId, {
      include: Rack
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
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 更新机房
router.put('/:roomId', async (req, res) => {
  try {
    const [updated] = await Room.update(req.body, {
      where: { roomId: req.params.roomId }
    });
    if (updated) {
      const updatedRoom = await Room.findByPk(req.params.roomId);
      res.json(updatedRoom);
    } else {
      res.status(404).json({ error: '机房不存在' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 删除机房
router.delete('/:roomId', async (req, res) => {
  try {
    // 检查是否有机柜关联
    const racks = await Rack.findAll({ where: { roomId: req.params.roomId } });
    if (racks.length > 0) {
      return res.status(400).json({ error: '该机房下有机柜，无法删除' });
    }
    
    const deleted = await Room.destroy({
      where: { roomId: req.params.roomId }
    });
    if (deleted) {
      res.status(204).json();
    } else {
      res.status(404).json({ error: '机房不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;