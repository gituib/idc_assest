/**
 * 设备凭据管理路由
 * 创建/查询/更新/删除/测试设备采集凭据（SSH/SNMP/Telnet）
 * 敏感字段通过 crypto.js 加密存储，API 输出时掩码
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger').module('DeviceCredentialsRoute');
const DeviceCredential = require('../models/DeviceCredential');
const Device = require('../models/Device');
const { encrypt, decrypt, maskSecret } = require('../utils/crypto');
const { logOperation } = require('../utils/operationLogger');
const { authMiddleware } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const { Op } = require('sequelize');

/**
 * 校验凭据必填字段（按 protocol）
 */
function validateCredential(protocol, body) {
  const errors = [];
  if (!body.deviceId) errors.push('deviceId 必填');
  if (protocol === 'ssh' || protocol === 'telnet') {
    if (!body.host) errors.push('host 必填');
    if (!body.username) errors.push('username 必填');
    if (!body.password) errors.push('password 必填');
  } else if (protocol === 'snmp') {
    if (!body.host) errors.push('host 必填');
    if (!body.community) errors.push('community 必填');
  } else if (protocol === 'redfish') {
    if (!body.host) errors.push('host 必填（BMC 管理地址）');
    if (!body.username) errors.push('username 必填');
    if (!body.password) errors.push('password 必填');
  } else if (protocol === 'api') {
    if (!body.apiBaseUrl) errors.push('apiBaseUrl 必填');
  }
  return errors;
}

/**
 * 输出安全凭据（掩码敏感字段）
 */
function maskCredential(c) {
  if (!c) return null;
  const json = c.toJSON ? c.toJSON() : c;
  return {
    ...json,
    password: json.password ? maskSecret('********') : null,
    community: json.community ? maskSecret('********') : null,
    apiToken: json.apiToken ? maskSecret('********') : null,
  };
}

/**
 * 创建凭据
 * POST /api/device-credentials
 */
router.post('/', authMiddleware, requirePermission('port:edit'), async (req, res) => {
  try {
    const { deviceId, protocol = 'ssh', host, port, username, password, community, vendor, apiToken, apiBaseUrl, isDefault = false } = req.body;

    const errors = validateCredential(protocol, req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; ') });
    }

    // 设备存在性校验
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(400).json({ success: false, message: '设备不存在' });
    }

    // 加密敏感字段
    const credData = {
      deviceId,
      protocol,
      host: host || null,
      port: port || ({ ssh: 22, snmp: 161, telnet: 23, redfish: 443 }[protocol] || null),
      username: username || null,
      password: password ? encrypt(password) : null,
      community: community ? encrypt(community) : null,
      vendor: vendor || null,
      apiToken: apiToken ? encrypt(apiToken) : null,
      apiBaseUrl: apiBaseUrl || null,
      isDefault,
    };

    const cred = await DeviceCredential.create(credData);

    await logOperation({
      module: 'port',
      operationType: 'create_credential',
      operationDescription: `创建设备【${device.name}】采集凭据（${protocol}）`,
      targetId: cred.credentialId,
      targetName: `${device.name}-${protocol}`,
      req,
    });

    res.status(201).json({ success: true, data: maskCredential(cred) });
  } catch (error) {
    logger.error('创建设备凭据失败', { error: error.message });
    res.status(500).json({ success: false, message: '创建失败', error: error.message });
  }
});

/**
 * 查询凭据列表（支持按 deviceId / protocol 筛选）
 * GET /api/device-credentials
 */
router.get('/', authMiddleware, requirePermission('port:view'), async (req, res) => {
  try {
    const { deviceId, protocol } = req.query;
    const where = {};
    if (deviceId) where.deviceId = deviceId;
    if (protocol) where.protocol = protocol;

    const creds = await DeviceCredential.findAll({
      where,
      include: [{ model: Device, attributes: ['deviceId', 'name', 'type'] }],
      order: [['deviceId', 'ASC'], ['isDefault', 'DESC']],
    });

    res.json({
      success: true,
      data: creds.map(maskCredential),
    });
  } catch (error) {
    logger.error('查询设备凭据失败', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 查询单条凭据（调试用，返回明文——注意权限）
 * GET /api/device-credentials/:credentialId/raw
 */
router.get('/:credentialId/raw', authMiddleware, requirePermission('port:edit'), async (req, res) => {
  try {
    const cred = await DeviceCredential.findByPk(req.params.credentialId);
    if (!cred) return res.status(404).json({ success: false, message: '凭据不存在' });

    const result = { ...cred.toJSON() };
    try { if (result.password) result.password = decrypt(result.password); } catch (_) { result.password = ''; }
    try { if (result.community) result.community = decrypt(result.community); } catch (_) { result.community = ''; }
    try { if (result.apiToken) result.apiToken = decrypt(result.apiToken); } catch (_) { result.apiToken = ''; }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 更新凭据
 * PUT /api/device-credentials/:credentialId
 */
router.put('/:credentialId', authMiddleware, requirePermission('port:edit'), async (req, res) => {
  try {
    const cred = await DeviceCredential.findByPk(req.params.credentialId);
    if (!cred) return res.status(404).json({ success: false, message: '凭据不存在' });

    const ALLOWED_FIELDS = ['host', 'port', 'username', 'vendor', 'isDefault', 'apiBaseUrl'];
    const updateData = {};
    for (const f of ALLOWED_FIELDS) {
      if (req.body[f] !== undefined) updateData[f] = req.body[f];
    }
    // 敏感字段：只有传了才加密更新，不传保留原值
    if (req.body.password !== undefined && req.body.password !== null) {
      updateData.password = encrypt(req.body.password);
    }
    if (req.body.community !== undefined && req.body.community !== null) {
      updateData.community = encrypt(req.body.community);
    }
    if (req.body.apiToken !== undefined && req.body.apiToken !== null) {
      updateData.apiToken = encrypt(req.body.apiToken);
    }

    await cred.update(updateData);

    await logOperation({
      module: 'port',
      operationType: 'update_credential',
      operationDescription: `更新设备凭据（${cred.protocol}）`,
      targetId: cred.credentialId,
      targetName: cred.deviceId,
      req,
    });

    res.json({ success: true, data: maskCredential(cred) });
  } catch (error) {
    logger.error('更新凭据失败', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 删除凭据
 * DELETE /api/device-credentials/:credentialId
 */
router.delete('/:credentialId', authMiddleware, requirePermission('port:edit'), async (req, res) => {
  try {
    const cred = await DeviceCredential.findByPk(req.params.credentialId);
    if (!cred) return res.status(404).json({ success: false, message: '凭据不存在' });

    await cred.destroy();

    await logOperation({
      module: 'port',
      operationType: 'delete_credential',
      operationDescription: `删除设备凭据（${cred.protocol}）`,
      targetId: cred.credentialId,
      targetName: cred.deviceId,
      req,
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 测试凭据连通性
 * POST /api/device-credentials/:credentialId/test
 */
router.post('/:credentialId/test', authMiddleware, requirePermission('port:view'), async (req, res) => {
  try {
    const cred = await DeviceCredential.findByPk(req.params.credentialId);
    if (!cred) return res.status(404).json({ success: false, message: '凭据不存在' });

    // 解密 + 构造驱动测试
    const { decryptCredential, createDriver } = require('../services/portDiscovery');
    const decrypted = decryptCredential(cred);

    // Redfish：协议级驱动（厂商无关），vendor 由采集时从 BMC 的 Manufacturer 自动识别，
    // 测试连接直接用 RedfishDriver，不走 SSH 厂商探测。
    // （若误走 detectVendor，redfish 凭据会被当作 SSH 逐个尝试厂商驱动后
    //   误报「无法自动识别设备厂商」，而指定 vendor 也不起作用）
    if (decrypted.protocol === 'redfish') {
      const RedfishDriver = require('../services/serverDiscovery/drivers/redfish');
      const driver = new RedfishDriver(decrypted);
      const result = await driver.test();
      await cred.update({
        lastTestedAt: new Date(),
        testStatus: result.ok ? 'success' : 'failed',
        testMessage: result.message,
      });
      return res.json({ success: result.ok, message: result.message });
    }

    // 若 vendor 为空，尝试自动探测
    let vendor = decrypted.vendor;
    if (!vendor) {
      try {
        const { detectVendor } = require('../services/portDiscovery');
        vendor = await detectVendor(decrypted);
      } catch (err) {
        await cred.update({ lastTestedAt: new Date(), testStatus: 'failed', testMessage: err.message });
        return res.json({ success: false, message: err.message });
      }
    }

    const driver = createDriver(vendor, decrypted);
    const result = await driver.test();
    await cred.update({
      lastTestedAt: new Date(),
      testStatus: result.ok ? 'success' : 'failed',
      testMessage: result.message,
      vendor: vendor || cred.vendor,
    });

    res.json({ success: result.ok, message: result.message, vendor });
  } catch (error) {
    logger.error('凭据测试失败', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
