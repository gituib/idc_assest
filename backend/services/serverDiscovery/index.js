/**
 * 服务器自动采集 - 统一入口
 * 流程：Redfish 采集 → 硬件清单 diff + 网卡端口 diff → 返回预览
 * 落库由路由层完成（本文件只负责采集和 diff）
 *
 * 与 portDiscovery 的关系：端口 diff 复用 portDiscovery.diffPorts；
 * 硬件清单写入 devices.customFields.hardware（动态字段体系），diff 做整体对比。
 */
const logger = require('../../utils/logger').module('ServerDiscovery');
const { assertTargetAllowed } = require('../../utils/targetGuard');
const Device = require('../../models/Device');
const { decryptCredential, diffPorts } = require('../portDiscovery');
const RedfishDriver = require('./drivers/redfish');

/**
 * 硬件清单差异对比（与设备 customFields.hardware 整体对比）
 * @param {Object} device - Device 模型实例
 * @param {Object} incoming - 本次采集的硬件清单
 * @returns {{ changed: boolean, current: Object|null, incoming: Object }}
 */
function diffHardware(device, incoming) {
  const customFields = device.customFields || {};
  const current = customFields.hardware || null;
  const changed = JSON.stringify(current) !== JSON.stringify(incoming);
  return { changed, current, incoming };
}

/**
 * 完整采集流程（Redfish）
 * @param {Object} credential - DeviceCredential 模型实例（已加密存储，protocol=redfish）
 * @param {Object} [opts]
 * @param {boolean} [opts.skipDiff=false] - 是否跳过差异对比
 * @returns {Promise<{ vendor: string, hardware: Object, ports: Array,
 *   portDiff: Object|null, hardwareDiff: Object|null, warnings: Array }>}
 */
async function discoverServer(credential, opts = {}) {
  const decrypted = decryptCredential(credential);
  if (decrypted.protocol !== 'redfish') {
    throw new Error(`凭据协议不是 redfish（当前: ${decrypted.protocol}），请使用 Redfish 凭据采集服务器`);
  }
  // SSRF 防护：Redfish 采集目标统一在此收口。
  // 凭据测试接口会直接 new RedfishDriver().test()，因此驱动 connect() 内也再做一次校验。
  await assertTargetAllowed(decrypted.host, decrypted.port, 'https', { source: 'credential' });
  const deviceId = credential.deviceId;

  // 1) 采集
  const driver = new RedfishDriver(decrypted);
  await driver.connect();
  const { vendor, hardware, ports, warnings } = await driver.collect();

  // 2) 安全保护：缺整机序列号 → 抛出（避免后续 diff 写入无意义数据）
  if (!hardware || !hardware.serialNumber) {
    throw new Error('采集结果缺少整机序列号，请检查 BMC/Redfish 配置');
  }

  // 3) 差异对比
  let portDiff = null;
  let hardwareDiff = null;
  if (!opts.skipDiff) {
    if (ports.length > 0) {
      portDiff = await diffPorts(deviceId, ports);
    }
    const device = await Device.findByPk(deviceId);
    if (device) {
      hardwareDiff = diffHardware(device, hardware);
    }
  }

  logger.info('服务器采集完成', {
    deviceId,
    vendor,
    memoryModules: hardware.memoryModules?.length || 0,
    drives: hardware.drives?.length || 0,
    ports: ports.length,
    warnings: warnings.length,
  });

  return { vendor, hardware, ports, portDiff, hardwareDiff, warnings };
}

module.exports = {
  discoverServer,
  diffHardware,
  RedfishDriver,
};
