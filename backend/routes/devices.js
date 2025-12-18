const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const Rack = require('../models/Rack');

// 获取所有设备
router.get('/', async (req, res) => {
  try {
    const devices = await Device.findAll({
      include: [
        { model: Rack }
      ]
    });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个设备
router.get('/:deviceId', async (req, res) => {
  try {
    const device = await Device.findByPk(req.params.deviceId, {
      include: [
        { model: Rack }
      ]
    });
    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建设备
router.post('/', async (req, res) => {
  try {
    const device = await Device.create(req.body);
    
    // 更新机柜当前功率
    const rack = await Rack.findByPk(req.body.rackId);
    if (rack) {
      await rack.update({
        currentPower: rack.currentPower + req.body.powerConsumption
      });
    }
    
    res.status(201).json(device);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 更新设备
router.put('/:deviceId', async (req, res) => {
  try {
    // 获取旧设备信息以更新功率
    const oldDevice = await Device.findByPk(req.params.deviceId);
    if (!oldDevice) {
      return res.status(404).json({ error: '设备不存在' });
    }
    
    const [updated] = await Device.update(req.body, {
      where: { deviceId: req.params.deviceId }
    });
    
    if (updated) {
      // 更新机柜当前功率
      const rack = await Rack.findByPk(oldDevice.rackId);
      if (rack) {
        const powerDiff = req.body.powerConsumption - oldDevice.powerConsumption;
        await rack.update({
          currentPower: rack.currentPower + powerDiff
        });
      }
      
      const updatedDevice = await Device.findByPk(req.params.deviceId, {
        include: [
          { model: Rack }
        ]
      });
      res.json(updatedDevice);
    } else {
      res.status(404).json({ error: '设备不存在' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 删除设备
router.delete('/:deviceId', async (req, res) => {
  try {
    // 获取设备信息以更新功率
    const device = await Device.findByPk(req.params.deviceId);
    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }
    
    const deleted = await Device.destroy({
      where: { deviceId: req.params.deviceId }
    });
    
    if (deleted) {
      // 更新机柜当前功率
      const rack = await Rack.findByPk(device.rackId);
      if (rack) {
        await rack.update({
          currentPower: Math.max(0, rack.currentPower - device.powerConsumption)
        });
      }
      
      res.status(204).json();
    } else {
      res.status(404).json({ error: '设备不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;