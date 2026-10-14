/**
 * IP 在线探测定时调度器
 * 读取 SystemSetting 配置，注册 node-cron 定时任务
 * 关闭 / 重启后自动重注册
 */

const cron = require('node-cron');
const logger = require('./logger').module('probeScheduler');

const { Subnet, IpAddress } = require('../models');
const ipProbe = require('../services/ipProbe');
const SystemSetting = require('../models/SystemSetting');

/** 运行时状态 */
let currentTask = null;
let currentCron = null;

/** 默认配置 */
const DEFAULT_CRON = '0 3 * * *'; // 每天凌晨 3 点

/**
 * 执行一次全量网段探测
 */
async function runOnce() {
  logger.info('定时全量探测开始');
  const subnets = await Subnet.findAll({
    attributes: ['subnetId', 'name', 'cidr', 'ipVersion'],
  });
  logger.info(`待探测网段数: ${subnets.length}`);

  const cfg = await getConfig();
  let totalOnline = 0, totalOffline = 0, totalScanned = 0;

  for (const subnet of subnets) {
    const ipRecords = await IpAddress.findAll({
      where: { subnetId: subnet.subnetId },
      attributes: ['ipId', 'ipAddress'],
    });
    if (ipRecords.length === 0) continue;

    // 每个网段最多探测 500 个（避免超时）
    const toProbe = ipRecords.slice(0, 500).map(r => r.ipAddress);
    const results = await ipProbe.probeBatch(toProbe, cfg);

    // 写回（忽略错误，不阻塞后续网段）
    try {
      const transaction = await IpAddress.sequelize.transaction();
      for (const r of results) {
        const rec = ipRecords.find(x => x.ipAddress === r.ip);
        if (rec) {
          await IpAddress.update(
            {
              probeStatus: r.online ? 'online' : 'offline',
              probeMethod: r.method || null,
              probeLatency: r.latencyMs ?? null,
              probeLastCheckedAt: new Date(),
            },
            { where: { ipId: rec.ipId }, transaction }
          );
        }
      }
      await transaction.commit();
    } catch (e) {
      logger.warn(`网段 ${subnet.name} 探测结果写回跳过: ${e.message}`);
    }

    const online = results.filter(r => r.online).length;
    totalOnline += online;
    totalOffline += results.length - online;
    totalScanned += results.length;
    logger.info(`  ${subnet.name} (${subnet.cidr}): ${online}/${results.length} 在线`);
  }

  logger.info(`定时全量探测完成：共扫 ${totalScanned}，在线 ${totalOnline}，离线 ${totalOffline}`);
}

async function getConfig() {
  try {
    const setting = await SystemSetting.findOne({ where: { settingKey: 'ipam_probe_config' } });
    if (setting) {
      const saved = JSON.parse(setting.settingValue);
      return { ...ipProbe.DEFAULT_CONFIG, ...saved };
    }
  } catch (_) { /* ignore */ }
  return { ...ipProbe.DEFAULT_CONFIG };
}

/** 读取 cron 表达式 + enabled */
async function getScheduleSetting() {
  try {
    const enabled = await SystemSetting.findOne({ where: { settingKey: 'ipam_probe_cron_enabled' } });
    const expr = await SystemSetting.findOne({ where: { settingKey: 'ipam_probe_cron_expression' } });
    return {
      enabled: enabled ? enabled.settingValue === 'true' : false,
      expression: expr ? JSON.parse(expr.settingValue) : DEFAULT_CRON,
    };
  } catch (_) {
    return { enabled: false, expression: DEFAULT_CRON };
  }
}

/** 初始化（server 启动时调用） */
async function initProbeScheduler() {
  const schedule = await getScheduleSetting();
  if (!schedule.enabled) {
    logger.info('定时探测未启用');
    return { enabled: false };
  }

  if (!cron.validate(schedule.expression)) {
    logger.warn(`定时探测 cron 表达式无效: ${schedule.expression}`);
    return { enabled: false };
  }

  // 注册任务
  currentCron = schedule.expression;
  currentTask = cron.schedule(schedule.expression, () => {
    runOnce().catch(e => logger.error('定时探测执行失败', e));
  }, { timezone: 'Asia/Shanghai' });

  logger.info(`定时探测已注册: ${schedule.expression}`);
  return { enabled: true, expression: schedule.expression };
}

/** 更新后重注册（可选：配置变更时调用） */
async function reloadProbeScheduler() {
  if (currentTask) { currentTask.stop(); currentTask = null; }
  return initProbeScheduler();
}

module.exports = {
  initProbeScheduler,
  reloadProbeScheduler,
  runOnce,
};
