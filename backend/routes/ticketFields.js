const express = require('express');
const router = express.Router();
const TicketField = require('../models/TicketField');

router.get('/', async (req, res) => {
  try {
    const fields = await TicketField.findAll({
      order: [['order', 'ASC']]
    });
    res.json(fields);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:fieldId', async (req, res) => {
  try {
    const field = await TicketField.findByPk(req.params.fieldId);
    if (!field) {
      return res.status(404).json({ error: '字段不存在' });
    }
    res.json(field);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const field = await TicketField.create(req.body);
    res.status(201).json(field);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:fieldId', async (req, res) => {
  try {
    const [updated] = await TicketField.update(req.body, {
      where: { fieldId: req.params.fieldId }
    });
    if (updated) {
      const updatedField = await TicketField.findByPk(req.params.fieldId);
      res.json(updatedField);
    } else {
      res.status(404).json({ error: '字段不存在' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:fieldId', async (req, res) => {
  try {
    const deleted = await TicketField.destroy({
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

router.post('/config', async (req, res) => {
  try {
    const fieldConfigs = req.body;
    
    if (!Array.isArray(fieldConfigs)) {
      return res.status(400).json({ error: '输入必须是数组' });
    }
    
    const updatedFields = [];
    for (const config of fieldConfigs) {
      const [updated] = await TicketField.update(
        { visible: config.visible },
        { where: { fieldName: config.fieldName } }
      );
      
      if (updated) {
        const updatedField = await TicketField.findOne({ where: { fieldName: config.fieldName } });
        updatedFields.push(updatedField);
      }
    }
    
    res.json(updatedFields);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
