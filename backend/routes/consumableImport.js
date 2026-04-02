const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const Consumable = require('../models/Consumable');
const ConsumableLog = require('../models/ConsumableLog');
const { importJobManager } = require('../utils/importJobManager');
const { generateId } = require('../utils/idGenerator');

// 注意：此路由挂载在 /api 根路径，不能使用 router.use(authMiddleware)，
// 否则会拦截所有 /api 下的请求。认证由 server.js 全局中间件处理。
// 各路由单独添加 authMiddleware。

const SUPPORTED_FIELDS = [
  'consumableId',
  'name',
  'category',
  'unit',
  'currentStock',
  'minStock',
  'maxStock',
  'unitPrice',
  'supplier',
  'location',
  'description',
  'snList',
  'status',
];

const FIELD_ALIASES = {
  耗材ID: 'consumableId',
  名称: 'name',
  分类: 'category',
  单位: 'unit',
  当前库存: 'currentStock',
  最小库存: 'minStock',
  最大库存: 'maxStock',
  单价: 'unitPrice',
  供应商: 'supplier',
  存放位置: 'location',
  描述: 'description',
  SN序列号: 'snList',
  状态: 'status',
};

const normalizeFieldName = fieldName => {
  if (!fieldName) return null;
  const trimmed = String(fieldName).trim();
  if (FIELD_ALIASES[trimmed]) {
    return FIELD_ALIASES[trimmed];
  }
  if (SUPPORTED_FIELDS.includes(trimmed)) {
    return trimmed;
  }
  return null;
};

const parseSnList = snStr => {
  if (!snStr) return [];
  if (Array.isArray(snStr)) return snStr;
  if (typeof snStr === 'string') {
    return snStr
      .split(/[,，;；\n]/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
};

router.post('/consumables/background', authMiddleware, async (req, res) => {
  const { items, operator = '系统', mode = 'create', fieldMapping = {} } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '没有导入数据' });
  }

  const jobId = `IMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const job = importJobManager.createJob(jobId, 'consumable_import', items.length);

  importJobManager.startJob(jobId);

  setImmediate(async () => {
    const transaction = await sequelize.transaction();
    try {
      const results = {
        success: 0,
        failed: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        details: [],
      };

      for (let i = 0; i < items.length; i++) {
        const currentJob = importJobManager.getJob(jobId);
        if (currentJob && currentJob.status === 'cancelled') {
          await transaction.rollback();
          return;
        }

        const item = items[i];
        const rowNumber = i + 1;

        try {
          const mappedItem = {};
          for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
            if (sourceField && targetField && item[sourceField] !== undefined) {
              mappedItem[targetField] = item[sourceField];
            }
          }

          for (const [key, value] of Object.entries(item)) {
            const normalizedField = normalizeFieldName(key);
            if (normalizedField && mappedItem[normalizedField] === undefined) {
              mappedItem[normalizedField] = value;
            }
          }

          const consumableId = mappedItem.consumableId || generateId({ prefix: 'CON' });
          const name = mappedItem.name;
          const category = mappedItem.category;

          if (!name || !category) {
            throw new Error('名称和分类为必填项');
          }

          let snList = [];
          if (mappedItem.snList) {
            snList = parseSnList(mappedItem.snList);
          }

          const consumableData = {
            consumableId: consumableId || `CON${Date.now()}${i}`,
            name,
            category,
            unit: mappedItem.unit || '个',
            currentStock:
              snList.length > 0 ? snList.length : parseInt(mappedItem.currentStock) || 0,
            minStock: parseInt(mappedItem.minStock) || 10,
            maxStock: parseInt(mappedItem.maxStock) || 0,
            unitPrice: parseFloat(mappedItem.unitPrice) || 0,
            supplier: mappedItem.supplier || '',
            location: mappedItem.location || '',
            description: mappedItem.description || '',
            status: mappedItem.status || 'active',
            snList,
          };

          let existingConsumable = null;
          if (consumableData.consumableId) {
            existingConsumable = await Consumable.findByPk(consumableData.consumableId, {
              transaction,
            });
          }

          let operationType;
          let previousStock = 0;

          if (existingConsumable) {
            if (mode === 'update') {
              previousStock = existingConsumable.currentStock;
              await existingConsumable.update(consumableData, { transaction });
              operationType = 'import_update';
              results.updated++;
              results.details.push({
                row: rowNumber,
                status: 'updated',
                consumableId: existingConsumable.consumableId,
                name: existingConsumable.name,
              });
            } else {
              results.skipped++;
              results.details.push({
                row: rowNumber,
                status: 'skipped',
                reason: '耗材已存在',
                consumableId: consumableData.consumableId,
              });
              importJobManager.incrementProgress(jobId, 0, 0, 1, 0);
              continue;
            }
          } else {
            await Consumable.create(consumableData, { transaction });
            operationType = 'import';
            results.success++;
            results.details.push({
              row: rowNumber,
              status: 'created',
              consumableId: consumableData.consumableId,
              name: consumableData.name,
            });
          }

          await ConsumableLog.create(
            {
              consumableId: consumableData.consumableId,
              consumableName: consumableData.name,
              operationType,
              quantity: consumableData.currentStock,
              previousStock,
              currentStock: consumableData.currentStock,
              operator,
              reason: '后台批量导入',
              notes: existingConsumable ? '更新现有耗材' : '',
              consumableSnapshot: {
                category: consumableData.category,
                unit: consumableData.unit,
                unitPrice: consumableData.unitPrice,
                supplier: consumableData.supplier,
                location: consumableData.location,
                minStock: consumableData.minStock,
                maxStock: consumableData.maxStock,
              },
            },
            { transaction }
          );

          importJobManager.incrementProgress(
            jobId,
            existingConsumable && mode === 'update' ? 0 : 1,
            0,
            0,
            existingConsumable ? 1 : 0
          );
        } catch (error) {
          results.failed++;
          results.errors.push(`第 ${rowNumber} 行: ${error.message}`);
          results.details.push({
            row: rowNumber,
            status: 'failed',
            error: error.message,
          });
          importJobManager.incrementProgress(jobId, 0, 1, 0, 0);
        }
      }

      await transaction.commit();
      importJobManager.completeJob(jobId, results);
    } catch (error) {
      await transaction.rollback();
      importJobManager.failJob(jobId, error.message);
    }
  });

  res.json({
    jobId,
    message: '导入任务已创建，正在后台执行',
    totalItems: items.length,
  });
});

router.get('/consumables/progress/:jobId', authMiddleware, async (req, res) => {
  const { jobId } = req.params;

  const progress = importJobManager.getJobProgress(jobId);
  if (!progress) {
    return res.status(404).json({ error: '任务不存在' });
  }

  res.json(progress);
});

router.post('/consumables/cancel/:jobId', authMiddleware, async (req, res) => {
  const { jobId } = req.params;

  const job = importJobManager.getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: '任务不存在' });
  }

  if (!job.canCancel) {
    return res.status(400).json({ error: '该任务无法取消' });
  }

  importJobManager.cancelJob(jobId);
  res.json({ message: '任务已取消' });
});

router.get('/consumables/result/:jobId', authMiddleware, async (req, res) => {
  const { jobId } = req.params;

  const job = importJobManager.getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: '任务不存在' });
  }

  if (job.status !== 'completed' && job.status !== 'failed') {
    return res.status(400).json({ error: '任务尚未完成' });
  }

  res.json({
    jobId: job.jobId,
    status: job.status,
    result: job.result,
    error: job.error,
    completedAt: job.endTime,
  });
});

router.get('/consumables/field-mappings', authMiddleware, async (req, res) => {
  const mappings = [
    { source: '耗材ID', target: 'consumableId', required: false, description: '耗材唯一标识符' },
    { source: '名称', target: 'name', required: true, description: '耗材名称' },
    { source: '分类', target: 'category', required: true, description: '耗材分类' },
    { source: '单位', target: 'unit', required: false, description: '计量单位，默认"个"' },
    { source: '当前库存', target: 'currentStock', required: false, description: '当前库存数量' },
    { source: '最小库存', target: 'minStock', required: false, description: '安全库存预警值' },
    {
      source: '最大库存',
      target: 'maxStock',
      required: false,
      description: '最大库存限制，0表示无限制',
    },
    { source: '单价', target: 'unitPrice', required: false, description: '耗材单价' },
    { source: '供应商', target: 'supplier', required: false, description: '供应商名称' },
    { source: '存放位置', target: 'location', required: false, description: '仓库内存放位置' },
    { source: '描述', target: 'description', required: false, description: '耗材详细描述' },
    {
      source: 'SN序列号',
      target: 'snList',
      required: false,
      description: '序列号列表，用逗号分隔',
    },
    {
      source: '状态',
      target: 'status',
      required: false,
      description: '状态：active启用，inactive停用',
    },
  ];

  const systemFields = [
    { name: 'consumableId', type: 'string', description: '耗材唯一标识符' },
    { name: 'name', type: 'string', description: '耗材名称' },
    { name: 'category', type: 'string', description: '耗材分类' },
    { name: 'unit', type: 'string', description: '计量单位' },
    { name: 'currentStock', type: 'number', description: '当前库存数量' },
    { name: 'minStock', type: 'number', description: '最小库存（预警线）' },
    { name: 'maxStock', type: 'number', description: '最大库存限制' },
    { name: 'unitPrice', type: 'number', description: '单价' },
    { name: 'supplier', type: 'string', description: '供应商' },
    { name: 'location', type: 'string', description: '存放位置' },
    { name: 'description', type: 'text', description: '描述' },
    { name: 'snList', type: 'array', description: 'SN序列号数组' },
    { name: 'status', type: 'string', description: '状态' },
  ];

  res.json({
    aliases: mappings,
    systemFields,
  });
});

module.exports = router;
