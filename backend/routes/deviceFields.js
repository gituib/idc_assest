const express = require('express');
const router = express.Router();
const DeviceField = require('../models/DeviceField');

// 获取所有字段配置
router.get('/', async (req, res) => {
  try {
    const fields = await DeviceField.findAll({
      order: [['order', 'ASC']]
    });
    res.json(fields);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个字段配置
router.get('/:fieldId', async (req, res) => {
  try {
    const field = await DeviceField.findByPk(req.params.fieldId);
    if (!field) {
      return res.status(404).json({ error: '字段不存在' });
    }
    res.json(field);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建字段配置
router.post('/', async (req, res) => {
  try {
    const field = await DeviceField.create(req.body);
    res.status(201).json(field);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 更新字段配置
router.put('/:fieldId', async (req, res) => {
  try {
    const [updated] = await DeviceField.update(req.body, {
      where: { fieldId: req.params.fieldId }
    });
    if (updated) {
      const updatedField = await DeviceField.findByPk(req.params.fieldId);
      res.json(updatedField);
    } else {
      res.status(404).json({ error: '字段不存在' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 删除字段配置
router.delete('/:fieldId', async (req, res) => {
  try {
    // 先查询字段信息
    const field = await DeviceField.findByPk(req.params.fieldId);
    
    if (!field) {
      return res.status(404).json({ error: '字段不存在' });
    }
    
    // 检查是否为系统字段
    if (field.isSystem) {
      return res.status(403).json({ error: '系统字段不可删除' });
    }
    
    const deleted = await DeviceField.destroy({
      where: { fieldId: req.params.fieldId }
    });
    
    if (deleted) {
      res.status(204).json();
    } else {
      res.status(404).json({ error: '字段不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量更新字段配置
router.post('/config', async (req, res) => {
  try {
    const fieldConfigs = req.body;
    
    // 验证输入
    if (!Array.isArray(fieldConfigs)) {
      return res.status(400).json({ error: '输入必须是数组' });
    }
    
    // 批量更新字段配置
    const updatedFields = [];
    for (const config of fieldConfigs) {
      // 检查字段是否存在
      const existingField = await DeviceField.findOne({ where: { fieldName: config.fieldName } });
      
      if (existingField) {
        // 更新现有字段
        await existingField.update({ 
            visible: config.visible,
            displayName: config.displayName // 同时更新显示名称，以防变化
        });
        updatedFields.push(existingField);
      } else {
        // 创建新字段
        const newField = await DeviceField.create({
            fieldName: config.fieldName,
            visible: config.visible,
            displayName: config.displayName,
            fieldType: config.fieldType || 'text',
            required: false, // 默认为非必填
            order: 0 // 默认顺序
        });
        updatedFields.push(newField);
      }
    }
    
    res.json(updatedFields);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;