/**
 * 服务器自动采集路由（Redfish 带外）
 * - POST /discover  执行采集并返回差异预览（不写库）
 * - POST /apply     硬件清单落库到 customFields.hardware + 网卡端口按 diff 落库
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger').module('ServerDiscoveryRoute');
const DeviceCredential = require('../models/DeviceCredential');
const DevicePort = require('../models/DevicePort');
const Device = require('../models/Device');
const NetworkCard = require('../models/NetworkCard');
const { discoverServer } = require('../services/serverDiscovery');
const { logOperation } = require('../utils/operationLogger');
const { authMiddleware } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const { generateId } = require('../utils/idGenerator');
const { sequelize } = require('../db');

/**
 * 同步网卡记录：Redfish NetworkAdapter → NetworkCard（网络适配器）
 *
 * 网卡名固定为「网卡N」（N 从 1 开始），与前端网卡管理习惯一致；
 * 已存在同名记录则更新型号/厂商/端口数，不删除用户手工创建的其它网卡。
 *
 * @param {string} deviceId
 * @param {Array} adapters - hardware.networkAdapters（index 为关联键）
 * @param {Object} transaction
 * @returns {Promise<{refToNicId: Object, created: number, updated: number}>}
 */
async function syncNetworkCards(deviceId, adapters, transaction) {
  const refToNicId = {};
  let created = 0;
  let updated = 0;
  for (const ad of adapters || []) {
    if (!ad || ad.index === undefined || ad.index === null) continue;
    const ref = String(ad.index);
    const name = `网卡${Number(ad.index) + 1}`;
    const values = {
      model: ad.model || null,
      manufacturer: ad.manufacturer || null,
      slotNumber: Number.isFinite(Number(ad.index)) ? Number(ad.index) : null,
      portCount: Array.isArray(ad.ports) ? ad.ports.length : 0,
      description: [
        ad.location ? `位置: ${ad.location}` : null,
        ad.serialNumber ? `SN: ${ad.serialNumber}` : null,
      ].filter(Boolean).join(' / ') || null,
    };

    const existing = await NetworkCard.findOne({ where: { deviceId, name }, transaction });
    if (existing) {
      await existing.update(values, { transaction });
      refToNicId[ref] = existing.nicId;
      updated++;
    } else {
      const createdCard = await NetworkCard.create(
        { nicId: generateId({ prefix: 'NIC', randomLength: 4 }), deviceId, name, ...values },
        { transaction }
      );
      refToNicId[ref] = createdCard.nicId;
      created++;
    }
  }
  return { refToNicId, created, updated };
}

/**
 * 找设备默认 Redfish 凭据（默认 → 任意）
 * @param {string} deviceId
 * @returns {Promise<Object|null>}
 */
async function findRedfishCredential(deviceId) {
  let cred = await DeviceCredential.findOne({
    where: { deviceId, protocol: 'redfish', isDefault: true },
  });
  if (!cred) {
    cred = await DeviceCredential.findOne({ where: { deviceId, protocol: 'redfish' } });
  }
  return cred;
}

/**
 * 执行服务器采集并返回差异预览
 * POST /api/server-discovery/discover
 * body: { deviceId, credentialId? }
 */
router.post('/discover', authMiddleware, requirePermission('port:view'), async (req, res) => {
  try {
    const { deviceId, credentialId } = req.body;
    if (!deviceId) return res.status(400).json({ success: false, message: 'deviceId 必填' });

    const device = await Device.findByPk(deviceId);
    if (!device) return res.status(400).json({ success: false, message: '设备不存在' });

    let cred;
    if (credentialId) {
      cred = await DeviceCredential.findByPk(credentialId);
      if (!cred) return res.status(400).json({ success: false, message: '凭据不存在' });
      if (cred.deviceId !== deviceId) return res.status(400).json({ success: false, message: '凭据不属于该设备' });
    } else {
      cred = await findRedfishCredential(deviceId);
    }
    if (!cred) {
      return res.status(400).json({
        success: false,
        message: '未找到该设备的 Redfish 凭据，请先在凭据管理中添加（协议选择 redfish，host 填 BMC 管理地址）',
      });
    }

    const result = await discoverServer(cred);

    await cred.update({
      lastTestedAt: new Date(),
      testStatus: 'success',
      testMessage: `Redfish 采集成功（vendor=${result.vendor}，内存条 ${result.hardware.memoryModules?.length || 0}，硬盘 ${result.hardware.drives?.length || 0}，网口 ${result.ports.length}）`,
    }).catch(() => {});

    await logOperation({
      module: 'port',
      operationType: 'server_discover',
      operationDescription: `设备【${device.name}】服务器采集预览（vendor=${result.vendor}）`,
      targetId: deviceId,
      targetName: device.name,
      req,
      metadata: {
        portAdded: result.portDiff?.added?.length || 0,
        portChanged: result.portDiff?.changed?.length || 0,
        portRemoved: result.portDiff?.removed?.length || 0,
        hardwareChanged: result.hardwareDiff?.changed || false,
        warnings: result.warnings,
      },
    });

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('服务器 Redfish 采集失败', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 采集结果落库
 * POST /api/server-discovery/apply
 * body: {
 *   deviceId,
 *   hardware,            // discover 返回的 hardware（整体写入 customFields.hardware）
 *   portDiff,            // discover 返回的 portDiff
 *   options: { applyHardware: true, applyAdded: true, applyChanged: true, applyRemoved: false }
 * }
 */
router.post('/apply', authMiddleware, requirePermission('port:create'), async (req, res) => {
  let transaction;
  try {
    const { deviceId, hardware, portDiff, options = {} } = req.body;
    const { applyHardware = true, applyAdded = true, applyChanged = true, applyRemoved = false } = options;

    if (!deviceId || (!hardware && !portDiff)) {
      return res.status(400).json({ success: false, message: 'deviceId 与 hardware/portDiff 至少一项必填' });
    }

    const device = await Device.findByPk(deviceId);
    if (!device) return res.status(400).json({ success: false, message: '设备不存在' });

    transaction = await sequelize.transaction();
    const stats = {
      hardwareApplied: false,
      networkCardsCreated: 0,
      networkCardsUpdated: 0,
      linked: 0,
      added: 0, changed: 0, removed: 0, failed: 0, errors: [],
    };

    // 1. 硬件清单 → customFields.hardware（合并保留其他自定义字段）
    if (applyHardware && hardware) {
      const customFields = { ...(device.customFields || {}), hardware };
      await device.update({ customFields }, { transaction });
      stats.hardwareApplied = true;
    }

    // 2. 网卡落库（NetworkCard）：端口的 nicId 依赖它，需先建好再落端口
    // 即使不更新硬件清单，只要端口要落库且带 nicRef，也必须同步网卡（否则 nicId 悬空）
    const adapters = hardware?.networkAdapters;
    const needNetworkCards = Array.isArray(adapters) && adapters.length > 0
      && (applyHardware || applyAdded || applyChanged);
    let refToNicId = {};
    if (needNetworkCards) {
      const cardResult = await syncNetworkCards(deviceId, adapters, transaction);
      refToNicId = cardResult.refToNicId;
      stats.networkCardsCreated = cardResult.created;
      stats.networkCardsUpdated = cardResult.updated;
    }

    // 3. 网卡端口落库（逻辑与 port-discovery/apply 保持一致）
    if (portDiff) {
      if (applyAdded && Array.isArray(portDiff.added)) {
        for (const p of portDiff.added) {
          try {
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
                nicId: (p.nicRef && refToNicId[p.nicRef]) || null,
                portName: p.portName,
                portType: p.portType || 'RJ45',
                portSpeed: p.portSpeed || '1G',
                status: 'free',
                vlanId: p.vlanId || null,
                description: p.description || null,
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

      if (applyChanged && Array.isArray(portDiff.changed)) {
        for (const p of portDiff.changed) {
          try {
            if (!p.portId) continue;
            const updates = {};
            if (p.fieldChanges) {
              for (const [field, change] of Object.entries(p.fieldChanges)) {
                if (field === 'status') continue; // 端口占用状态由人工管理
                updates[field] = change.to;
              }
            }
            // 网卡归属补链：diff 不含 nicId（库中可能未关联），此处单独补
            if (p.nicRef && refToNicId[p.nicRef]) {
              updates.nicId = refToNicId[p.nicRef];
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

      if (applyRemoved && Array.isArray(portDiff.removed)) {
        for (const p of portDiff.removed) {
          try {
            await DevicePort.destroy({ where: { portId: p.portId }, transaction });
            stats.removed++;
          } catch (err) {
            stats.failed++;
            stats.errors.push({ portName: p.portName, error: err.message });
          }
        }
      }

      // 4. 端口补链（幂等）：为「库中 nicId 为空、但本次采集能确定归属」的端口补上网卡
      // 必要场景：端口首次落库发生在网卡关联功能之前，或端口字段无变化不进 changed 分支，
      // 两者都会导致 nicId 长期为空。条件带 nicId: null —— 只补空值，不覆盖人工关联。
      if (Object.keys(refToNicId).length > 0) {
        const candidates = [
          ...(portDiff.added || []),
          ...(portDiff.changed || []),
          ...(portDiff.unchanged || []),
        ].filter(p => p && p.nicRef && refToNicId[p.nicRef]);
        for (const p of candidates) {
          try {
            const [affected] = await DevicePort.update(
              { nicId: refToNicId[p.nicRef] },
              { where: { deviceId, portName: p.portName, nicId: null }, transaction }
            );
            if (affected > 0) stats.linked++;
          } catch (err) {
            // 补链失败不阻断落库
            stats.errors.push({ portName: p.portName, error: `网卡补链失败: ${err.message}` });
          }
        }
      }
    }

    await transaction.commit();

    await logOperation({
      module: 'port',
      operationType: 'server_discover_apply',
      operationDescription: `设备【${device.name}】服务器采集落库：硬件清单${stats.hardwareApplied ? '已更新' : '未变更'}，网卡新增${stats.networkCardsCreated}/更新${stats.networkCardsUpdated}，端口新增${stats.added}，更新${stats.changed}，移除${stats.removed}，补链${stats.linked}，失败${stats.failed}`,
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
      // 事务已结束可忽略
    }
    logger.error('服务器采集落库失败', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
