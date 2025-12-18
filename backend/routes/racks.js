const express = require('express');
const router = express.Router();
const Rack = require('../models/Rack');
const Device = require('../models/Device');
const Room = require('../models/Room');

// 获取所有机柜
router.get('/', async (req, res) => {
  try {
    const racks = await Rack.findAll({
      include: [
        { model: Room },
        { model: Device }
      ]
    });
    res.json(racks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个机柜
router.get('/:rackId', async (req, res) => {
  try {
    const rack = await Rack.findByPk(req.params.rackId, {
      include: [
        { model: Room },
        { model: Device }
      ]
    });
    if (!rack) {
      return res.status(404).json({ error: '机柜不存在' });
    }
    res.json(rack);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建机柜
router.post('/', async (req, res) => {
  try {
    const rack = await Rack.create(req.body);
    res.status(201).json(rack);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 更新机柜
router.put('/:rackId', async (req, res) => {
  try {
    const [updated] = await Rack.update(req.body, {
      where: { rackId: req.params.rackId }
    });
    if (updated) {
      const updatedRack = await Rack.findByPk(req.params.rackId, {
        include: [
          { model: Room },
          { model: Device }
        ]
      });
      res.json(updatedRack);
    } else {
      res.status(404).json({ error: '机柜不存在' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 删除机柜
router.delete('/:rackId', async (req, res) => {
  try {
    // 检查是否有设备关联
    const devices = await Device.findAll({ where: { rackId: req.params.rackId } });
    if (devices.length > 0) {
      return res.status(400).json({ error: '该机柜下有设备，无法删除' });
    }
    
    const deleted = await Rack.destroy({
      where: { rackId: req.params.rackId }
    });
    if (deleted) {
      res.status(204).json();
    } else {
      res.status(404).json({ error: '机柜不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;