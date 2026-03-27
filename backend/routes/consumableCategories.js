const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const ConsumableCategory = require('../models/ConsumableCategory');

router.get('/', async (req, res) => {
  try {
    const { keyword, status, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};

    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const { count, rows } = await ConsumableCategory.findAndCountAll({
      where,
      order: [
        ['sortOrder', 'ASC'],
        ['id', 'DESC'],
      ],
      offset,
      limit: parseInt(pageSize),
    });

    res.json({
      categories: rows,
      total: count,
      currentPage: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/list', async (req, res) => {
  try {
    const categories = await ConsumableCategory.findAll({
      where: { status: 'active' },
      order: [
        ['sortOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const category = await ConsumableCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, sortOrder, status } = req.body;

    const existing = await ConsumableCategory.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: '分类名称已存在' });
    }

    const category = await ConsumableCategory.create({
      name,
      description,
      sortOrder: sortOrder || 0,
      status: status || 'active',
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, sortOrder, status } = req.body;
    const category = await ConsumableCategory.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    if (name && name !== category.name) {
      const existing = await ConsumableCategory.findOne({ where: { name } });
      if (existing) {
        return res.status(400).json({ error: '分类名称已存在' });
      }
    }

    await category.update({
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      sortOrder: sortOrder !== undefined ? sortOrder : category.sortOrder,
      status: status || category.status,
    });

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const category = await ConsumableCategory.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    await category.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
