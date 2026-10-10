/**
 * 端口自动采集路由
 * - POST /discover  执行采集并返回差异预览（不写库）
 * - POST /apply     根据差异预览批量落库（调用现有 /device-ports/batch 逻辑）
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger').module('PortDiscoveryRoute');
const DeviceCredential = require('../models/DeviceCredential');
const DevicePort = require('../models/DevicePort');
const Device = require('../models/Device');
const { discover, decryptCredential } = require('../services/portDiscovery');
const { logOperation } = require('../utils/operationLogger');
const { authMiddleware } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const { generateId } = require('../utils/idGenerator');
const { sequelize } = require('../db');

/**
 * 执行端口采集并返回差异预览
 * POST /api/port-discovery/discover
 * body: { deviceId, credentialId? }
 *   credentialId 可选：不传则自动找该设备 protocol=ssh 的默认凭据
 */
router.post('/discover', authMiddleware, requirePermission('port:view'), async (req, res) => {
  try {
    const { deviceId, credentialId } = req.body;
    if (!deviceId) return res.status(400).json({ success: false, message: 'deviceId 必填' });

    // 设备存在性校验
    const device = await Device.findByPk(deviceId);
    if (!device) return res.status(400).json({ success: false, message: '设备不存在' });

    // 获取凭据
    let cred;
    if (credentialId) {
      cred = await DeviceCredential.findByPk(credentialId);
      if (!cred) return res.status(400).json({ success: false, message: '凭据不存在' });
      if (cred.deviceId !== deviceId) return res.status(400).json({ success: false, message: '凭据不属于该设备' });
    } else {
      // 优先 SSH 默认凭据，其次任意 SSH，再退 SNMP（默认 → 任意）、Telnet（默认 → 任意）
      cred = await DeviceCredential.findOne({
        where: { deviceId, protocol: 'ssh', isDefault: true },
      });
      if (!cred) {
        cred = await DeviceCredential.findOne({ where: { deviceId, protocol: 'ssh' } });
      }
      if (!cred) {
        cred = await DeviceCredential.findOne({
          where: { deviceId, protocol: 'snmp', isDefault: true },
        });
      }
      if (!cred) {
        cred = await DeviceCredential.findOne({ where: { deviceId, protocol: 'snmp' } });
      }
      if (!cred) {
        cred = await DeviceCredential.findOne({
          where: { deviceId, protocol: 'telnet', isDefault: true },
        });
      }
      if (!cred) {
        cred = await DeviceCredential.findOne({ where: { deviceId, protocol: 'telnet' } });
      }
    }

    if (!cred) {
      return res.status(400).json({
        success: false,
        message: '未找到该设备的 SSH/SNMP/Telnet 凭据，请先在凭据管理中添加',
      });
    }

    // 执行采集
    const result = await discover(cred, { skipDiff: false });

    // 更新凭据的最近测试状态
    await cred.update({
      lastTestedAt: new Date(),
      testStatus: 'success',
      testMessage: `采集成功，共 ${result.ports.length} 个端口`,
    }).catch(() => {});

    // 审计日志
    await logOperation({
      module: 'port',
      operationType: 'discover',
      operationDescription: `设备【${device.name}】端口自动采集预览（vendor=${result.vendor}）`,
      targetId: deviceId,
      targetName: device.name,
      req,
      metadata: {
        collectedCount: result.ports.length,
        added: result.diff?.added?.length || 0,
        changed: result.diff?.changed?.length || 0,
        removed: result.diff?.removed?.length || 0,
      },
    });

    // 返回差异预览（不含完整 rawOutput 以免前端载荷过大）
    const { rawOutput, ...rest } = result;
    res.json({ success: true, ...rest });
  } catch (error) {
    logger.error('端口自动采集失败', { error: error.message, stack: error.stack });
    const payload = { success: false, message: error.message };
    // 采集失败时透出设备原始输出，便于前端/用户定位解析问题（截断防止载荷过大）
    if (error.rawOutput) {
      payload.rawOutput = String(error.rawOutput).slice(0, 20000);
      payload.vendor = error.vendor;
    }
    res.status(500).json(payload);
  }
});

/**
 * 根据差异预览结果，批量落库
 * POST /api/port-discovery/apply
 * body: {
 *   deviceId,
 *   diff: { added, changed, removed },   // discover 返回的 diff 对象
 *   options: { applyAdded: true, applyChanged: true, applyRemoved: false }
 * }
 *
 * 注意：幂等合并，事务原子性
 */
router.post('/apply', authMiddleware, requirePermission('port:create'), async (req, res) => {
  let transaction;
  try {
    const { deviceId, diff, options = {} } = req.body;
    const { applyAdded = true, applyChanged = true, applyRemoved = false } = options;

    if (!deviceId || !diff) {
      return res.status(400).json({ success: false, message: 'deviceId 和 diff 必填' });
    }

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(400).json({ success: false, message: '设备不存在' });
    }

    // transaction() 放在参数校验之后、try 内部：锁冲突异常能被捕获
    transaction = await sequelize.transaction();

    const stats = { added: 0, changed: 0, removed: 0, failed: 0, errors: [] };

    // 1. 新增端口
    if (applyAdded && Array.isArray(diff.added)) {
      for (const p of diff.added) {
        try {
          // 再检查一次（防止并发）
          const existing = await DevicePort.findOne({
            where: { deviceId, portName: p.portName },
            transaction,
          });
          if (existing) {
            stats.failed++;
            continue;
          }
          await DevicePort.create(
            {
              portId: p.portId || generateId({ prefix: 'PORT', randomLength: 4 }),
              deviceId,
              portName: p.portName,
              portType: p.portType || 'RJ45',
              portSpeed: p.portSpeed || '1G',
              status: 'free', // 自动发现的端口统一默认未使用
              vlanId: p.vlanId,
              description: p.description,
            },
            { transaction }
          );
          stats.added++;
        } catch (err) {
          stats.failed++;
          stats.errors.push({ portName: p.portName, error: err.message });
        }
      }
    }

    // 2. 变更端口（只更新 diff.fieldChanges 涉及的字段）
    if (applyChanged && Array.isArray(diff.changed)) {
      for (const p of diff.changed) {
        try {
          if (!p.portId) continue;
          const updates = {};
          if (p.fieldChanges) {
            // 只更新有差异的字段，跳过 status（使用状态由用户手动管理，采集结果仅作参考）
            for (const [field, change] of Object.entries(p.fieldChanges)) {
              if (field === 'status') continue;
              updates[field] = change.to;
            }
          } else {
            // 没有 fieldChanges 信息时，全量更新关键字段（同样跳过 status）
            for (const f of ['portType', 'portSpeed', 'description', 'vlanId']) {
              if (p[f] !== undefined && p[f] !== null) updates[f] = p[f];
            }
          }
          if (Object.keys(updates).length === 0) continue;
          const [affected] = await DevicePort.update(updates, {
            where: { portId: p.portId },
            transaction,
          });
          if (affected > 0) stats.changed++;
        } catch (err) {
          stats.failed++;
          stats.errors.push({ portName: p.portName, error: err.message });
        }
      }
    }

    // 3. 移除端口（默认关闭）
    if (applyRemoved && Array.isArray(diff.removed)) {
      for (const p of diff.removed) {
        try {
          await DevicePort.destroy({ where: { portId: p.portId }, transaction });
          stats.removed++;
        } catch (err) {
          stats.failed++;
          stats.errors.push({ portName: p.portName, error: err.message });
        }
      }
    }

    await transaction.commit();

    await logOperation({
      module: 'port',
      operationType: 'discover_apply',
      operationDescription: `设备【${device.name}】端口自动采集落库：新增${stats.added}，更新${stats.changed}，移除${stats.removed}，失败${stats.failed}`,
      targetId: deviceId,
      targetName: device.name,
      req,
      metadata: stats,
    });

    res.json({ success: true, stats });
  } catch (error) {
    try {
      if (transaction) await transaction.rollback();
    } catch {
      // 回滚失败（如事务已结束）可忽略，不影响错误响应
    }
    logger.error('端口自动采集落库失败', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
