const logger = require('../utils/logger').module('IPAM');
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const cron = require('node-cron');
const { Subnet, IpAddress } = require('../models');
const ipam = require('../utils/ipam');
const ipProbe = require('../services/ipProbe');
const SystemSetting = require('../models/SystemSetting');
const { logOperation } = require('../utils/operationLogger');
const { reloadProbeScheduler, runOnce, isProbeRunning } = require('../utils/ipProbeScheduler');

// ========== 网段工具函数 ==========

/**
 * 后序遍历网段树，把子节点的统计累加回父节点
 * @param {Array} nodes - 网段树节点数组（已包含 children）
 * @returns {Array} 累加后的节点数组（原地修改）
 */
function rollupSubnetStats(nodes) {
  const statKeys = ['freeCount', 'usedCount', 'reservedCount', 'gatewayCount', 'excludedCount', 'totalIps'];

  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      // 递归处理子节点（后序：先子后父）
      rollupSubnetStats(node.children);
      // 把子节点统计累加到当前节点
      for (const child of node.children) {
        for (const key of statKeys) {
          node[key] = (node[key] || 0) + (child[key] || 0);
        }
      }
    }
  }

  // 父节点的 usageRate 需要基于累加后的 usedCount 重新计算
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      rollupUsageRate(node);
    }
  }
  return nodes;
}

/**
 * 递归重算网段树中所有节点的 usageRate
 * @param {Object} node - 网段树节点
 */
function rollupUsageRate(node) {
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      rollupUsageRate(child);
    }
  }
  // 注意：usageRate 语义上是"当前网段的 IP 占用率"，对于有子网段的父节点，
  // usedCount 已累加了子节点，但 usableHosts 仍是父网段自身的可用主机数，
  // 所以这里的 usageRate 反映的是"父网段范围内实际使用占比"，是合理的
  node.usageRate = calcUsageRate(node.usableHosts, node.usedCount);
}

/**
 * 构建网段树（父子嵌套）
 */
function buildSubnetTree(allSubnets, parentId = null) {
  return allSubnets
    .filter(s => (parentId === null ? s.parentId === null : s.parentId === parentId))
    .map(s => {
      const plain = typeof s.toJSON === 'function' ? s.toJSON() : s;
      const children = buildSubnetTree(allSubnets, plain.subnetId);
      return { ...plain, children: children.length > 0 ? children : [] };
    })
    // 先按 ipVersion，再按 startInt 排序（字符串比较 DECIMAL 是对的，因为都是等长数字）
    .sort((a, b) => {
      if (a.ipVersion !== b.ipVersion) return a.ipVersion === 'ipv4' ? -1 : 1;
      return (a.startInt || '0').localeCompare(b.startInt || '0');
    });
}

/**
 * 单个网段的 IP 状态统计（供详情/更新接口使用）
 */
async function getSubnetIpStats(subnetId) {
  const results = await IpAddress.findAll({
    where: { subnetId },
    attributes: [
      'status',
      [IpAddress.sequelize.fn('COUNT', IpAddress.sequelize.col('ipId')), 'count'],
    ],
    group: ['status'],
    raw: true,
  });

  const stats = {
    freeCount: 0, usedCount: 0, reservedCount: 0, gatewayCount: 0, excludedCount: 0, totalIps: 0,
  };

  for (const row of results) {
    const count = parseInt(row.count, 10);
    stats.totalIps += count;
    stats[`${row.status}Count`] = count;
  }
  return stats;
}

/**
 * 批量聚合所有网段的 IP 状态统计（单条 SQL，供网段树接口使用）
 * @param {string[]} subnetIds - 网段 ID 列表（可选，不传则统计全部）
 * @returns {Map<string, Object>} subnetId → stats 映射
 */
async function batchGetSubnetIpStats(subnetIds = null) {
  const where = subnetIds ? { subnetId: subnetIds } : {};
  const results = await IpAddress.findAll({
    where,
    attributes: [
      'subnetId',
      'status',
      [IpAddress.sequelize.fn('COUNT', IpAddress.sequelize.col('ipId')), 'count'],
    ],
    group: ['subnetId', 'status'],
    raw: true,
  });

  const map = new Map();
  for (const row of results) {
    const subnetId = row.subnetId;
    const count = parseInt(row.count, 10);
    if (!map.has(subnetId)) {
      map.set(subnetId, {
        freeCount: 0, usedCount: 0, reservedCount: 0, gatewayCount: 0, excludedCount: 0, totalIps: 0,
      });
    }
    const stats = map.get(subnetId);
    stats.totalIps += count;
    stats[`${row.status}Count`] = count;
  }
  return map;
}

/**
 * 计算 IP 地址的 128 位整数（统一 IPv4/IPv6）
 */
function ipToInt128(ip, ipVersion) {
  if (ipVersion === 'ipv6') {
    const expanded = ipam.expandIPv6(ip);
    let val = 0n;
    for (const seg of expanded) {
      val = (val << 16n) | BigInt(parseInt(seg, 16));
    }
    return val.toString();
  }
  // IPv4
  const parts = ip.split('.').map(Number);
  return String(((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]);
}

/**
 * 计算网段占用率（IPv6 超大网段不计算）
 */
function calcUsageRate(usableHostsStr, usedCount) {
  const usable = parseInt(usableHostsStr, 10) || 0;
  if (usable <= 0) return 0;
  // 超过 JavaScript 安全整数时返回 0（IPv6 /64 起）
  if (usable > Number.MAX_SAFE_INTEGER) return 0;
  return Math.round((usedCount || 0) / usable * 100);
}

/**
 * 自动生成网段的 IP 记录
 * - IPv4：prefix >= 16 自动生成
 * - IPv6：prefix >= 120 自动生成（/120 = 256 地址起）
 * - 硬上限 50000 条（超过则放弃生成）
 */
async function generateSubnetIps(subnet, transaction = null) {
  const ipVersion = subnet.ipVersion || 'ipv4';
  const shouldAuto = ipam.shouldAutoGenerate(subnet.prefixLength, ipVersion);
  if (!shouldAuto) {
    return { generatedCount: 0, autoGenerated: false };
  }

  const ipList = ipam.generateIpRange(subnet.cidr);
  if (ipList.length === 0) {
    return { generatedCount: 0, autoGenerated: false, reason: '网段过大不自动生成' };
  }

  const batchSize = ipam.shouldBatchPaginate(subnet.prefixLength, ipVersion) ? 500 : ipList.length;

  let generated = 0;
  for (let i = 0; i < ipList.length; i += batchSize) {
    const batch = ipList.slice(i, i + batchSize);
    const records = batch.map(item => {
      const status = subnet.gateway && item.ip === subnet.gateway ? 'gateway' : 'free';
      const rec = {
        subnetId: subnet.subnetId,
        ipVersion,
        ipAddress: item.ip,
        status,
      };
      if (ipVersion === 'ipv4') {
        rec.ipInt = item.ipInt;
        rec.ipInt128 = String(item.ipInt);
      } else {
        rec.ipInt = null;
        rec.ipInt128 = item.ipInt128;
      }
      return rec;
    });
    const opts = { ignoreDuplicates: true };
    if (transaction) opts.transaction = transaction;
    await IpAddress.bulkCreate(records, opts);
    generated += records.length;
  }

  const updateOpts = {};
  if (transaction) updateOpts.transaction = transaction;
  await subnet.update({ autoGenerated: true }, updateOpts);
  return { generatedCount: generated, autoGenerated: true };
}

// ========== CIDR 工具接口 ==========

router.post('/parse-cidr', (req, res) => {
  try {
    const { cidr } = req.body;
    if (!cidr) return res.status(400).json({ success: false, message: '缺少 CIDR 参数' });
    const result = ipam.parseCidr(cidr);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/conflicts', async (req, res) => {
  try {
    const subnets = await Subnet.findAll();
    const conflicts = [];

    // 按 ipVersion + startInt 排序后，重叠网段必然相邻，只需向后比较直到 startInt 超出
    const sorted = [...subnets].sort((a, b) => {
      if (a.ipVersion !== b.ipVersion) return a.ipVersion === 'ipv4' ? -1 : 1;
      return BigInt(a.startInt) - BigInt(b.startInt);
    });

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        // 同版本但起始点已超出：后续不可能再重叠，提前终止内层循环
        if (sorted[i].ipVersion === sorted[j].ipVersion &&
            BigInt(sorted[j].startInt) > BigInt(sorted[i].endInt)) {
          break;
        }
        // 不同版本跳过
        if (sorted[i].ipVersion !== sorted[j].ipVersion) continue;

        const result = ipam.subnetsOverlap(sorted[i].cidr, sorted[j].cidr);
        if (result.overlap && result.containment !== 'A_equals_B') {
          conflicts.push({
            subnetA: { id: sorted[i].subnetId, name: sorted[i].name, cidr: sorted[i].cidr },
            subnetB: { id: sorted[j].subnetId, name: sorted[j].name, cidr: sorted[j].cidr },
            type: result.containment,
          });
        }
      }
    }
    res.json({ success: true, data: conflicts });
  } catch (error) {
    logger.error('网段冲突检测失败', error);
    res.status(500).json({ success: false, message: '冲突检测失败' });
  }
});

// ========== 网段接口 ==========

router.get('/subnets', async (req, res) => {
  try {
    const subnets = await Subnet.findAll({ order: [['ipVersion', 'ASC'], ['startInt', 'ASC']] });

    // 单次 SQL 批量聚合所有网段的 IP 状态统计（替代 N+1 查询）
    const subnetIds = subnets.map(s => s.subnetId);
    const statsMap = await batchGetSubnetIpStats(subnetIds);

    const enriched = subnets.map(s => {
      const stats = statsMap.get(s.subnetId) || {};
      const usageRate = calcUsageRate(s.usableHosts, stats.usedCount);
      return {
        ...s.toJSON(),
        freeCount: stats.freeCount || 0,
        usedCount: stats.usedCount || 0,
        reservedCount: stats.reservedCount || 0,
        excludedCount: stats.excludedCount || 0,
        gatewayCount: stats.gatewayCount || 0,
        usageRate,
      };
    });

    const tree = buildSubnetTree(enriched);
    // 后序遍历把子网段统计累加回父网段
    rollupSubnetStats(tree);
    res.json({ success: true, data: tree });
  } catch (error) {
    logger.error('获取网段树失败', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '获取网段树失败', error: error.message });
  }
});

router.post('/subnets', async (req, res) => {
  try {
    const { name, cidr, gateway, dns, vlanId, parentId, description } = req.body;

    if (!name || !cidr) {
      return res.status(400).json({ success: false, message: '缺少必填字段：name 和 cidr' });
    }

    const parsed = ipam.parseCidr(cidr);
    const ipVersion = parsed.ipVersion;

    // ========== 第一阶段：所有校验在事务外完成（乐观锁，不持数据库锁） ==========

    // 拉取所有已有网段（用于冲突检测 + 父网段匹配，只读，不走事务）
    const existingSubnets = await Subnet.findAll();

    // 网段范围冲突检测（跳过不同版本）
    for (const existing of existingSubnets) {
      if (existing.ipVersion !== ipVersion) continue;

      const overlap = ipam.subnetsOverlap(cidr, existing.cidr);
      // 允许：新网段是已有网段的子网段（A_in_B）
      // 拒绝：完全相同、部分重叠、已有网段被新网段覆盖（B_in_A）
      if (overlap.overlap && overlap.containment !== 'A_in_B') {
        return res.status(400).json({
          success: false,
          message: `新网段与已有网段 ${existing.name} (${existing.cidr}) 存在冲突`,
        });
      }
    }

    // 父网段范围校验
    let finalParentId = parentId || null;
    if (parentId) {
      const parent = existingSubnets.find(s => s.subnetId === parentId);
      if (!parent) {
        return res.status(400).json({ success: false, message: '指定的父网段不存在' });
      }
      if (parent.ipVersion !== ipVersion) {
        return res.status(400).json({ success: false, message: '父网段地址族不匹配' });
      }
      if (!ipam.ipInSubnet(parsed.networkAddress, parent.cidr)) {
        return res.status(400).json({ success: false, message: '新网段的网络地址不在父网段范围内' });
      }
    } else {
      // 自动匹配父网段（仅限同版本，选 prefixLength 最大的即最精确的父网段）
      let bestParent = null;
      for (const existing of existingSubnets) {
        if (existing.ipVersion !== ipVersion) continue;
        if (ipam.ipInSubnet(parsed.networkAddress, existing.cidr) &&
            existing.prefixLength < parsed.prefixLength) {
          if (!bestParent || existing.prefixLength > bestParent.prefixLength) {
            bestParent = existing;
          }
        }
      }
      finalParentId = bestParent?.subnetId || null;
    }

    // 网关校验
    if (gateway && !ipam.isGatewayInSubnet(gateway, cidr)) {
      return res.status(400).json({ success: false, message: '网关地址不在网段范围内' });
    }

    // ========== 第二阶段：短事务内只做写入 ==========
    const transaction = await Subnet.sequelize.transaction();
    let subnet;
    let ipGeneratedCount = 0;
    let autoGenerated = false;
    try {
      subnet = await Subnet.create({
        name,
        ipVersion,
        cidr,
        networkAddress: parsed.networkAddress,
        broadcastAddress: parsed.broadcastAddress,
        netmask: parsed.netmask,
        prefixLength: parsed.prefixLength,
        startInt: parsed.startInt.toString(),
        endInt: parsed.endInt.toString(),
        totalHosts: parsed.totalHostsStr || String(parsed.totalHosts),
        usableHosts: parsed.usableHostsStr || String(parsed.usableHosts),
        gateway: gateway || null,
        dns: dns || [],
        vlanId: vlanId || null,
        parentId: finalParentId,
        description: description || null,
        autoGenerated: ipam.shouldAutoGenerate(parsed.prefixLength, ipVersion),
      }, { transaction });

      // 自动生成 IP 也在事务内（避免网段已创建但 IP 生成一半崩溃）
      const genResult = await generateSubnetIps(subnet, transaction);
      ipGeneratedCount = genResult.generatedCount;
      autoGenerated = genResult.autoGenerated;

      await transaction.commit();
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }

    await logOperation({
      module: 'ipam',
      operationType: 'create',
      operationDescription: `创建网段【${name}】(${cidr})`,
      targetId: subnet.subnetId,
      targetName: name,
      req,
    });

    res.status(201).json({
      success: true,
      data: {
        ...subnet.toJSON(),
        ipGeneratedCount,
        autoGenerated,
      },
      message: autoGenerated
        ? `网段创建成功，已自动生成 ${ipGeneratedCount} 个 IP 地址`
        : '网段创建成功，请按需添加 IP 地址',
    });
  } catch (error) {
    logger.error('创建网段失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/subnets/:id', async (req, res) => {
  try {
    const subnet = await Subnet.findByPk(req.params.id);
    if (!subnet) return res.status(404).json({ success: false, message: '网段不存在' });

    // 递归收集所有后代网段 ID
    const collectDescendantIds = async (parentId) => {
      const children = await Subnet.findAll({ where: { parentId }, attributes: ['subnetId'] });
      const ids = children.map(c => c.subnetId);
      for (const child of children) {
        ids.push(...await collectDescendantIds(child.subnetId));
      }
      return ids;
    };
    const descendantIds = await collectDescendantIds(subnet.subnetId);
    const allIds = [subnet.subnetId, ...descendantIds];

    // 批量聚合自身 + 所有后代的 IP 统计
    const statsMap = await batchGetSubnetIpStats(allIds);
    const statKeys = ['freeCount', 'usedCount', 'reservedCount', 'gatewayCount', 'excludedCount', 'totalIps'];
    const stats = {};
    for (const key of statKeys) stats[key] = 0;
    for (const id of allIds) {
      const s = statsMap.get(id);
      if (s) for (const key of statKeys) stats[key] += (s[key] || 0);
    }

    const usageRate = calcUsageRate(subnet.usableHosts, stats.usedCount);
    const children = await Subnet.findAll({ where: { parentId: subnet.subnetId } });

    res.json({
      success: true,
      data: { ...subnet.toJSON(), ...stats, usageRate, childCount: children.length },
    });
  } catch (error) {
    logger.error('获取网段详情失败', error);
    res.status(500).json({ success: false, message: '获取网段详情失败' });
  }
});

router.put('/subnets/:id', async (req, res) => {
  try {
    const subnet = await Subnet.findByPk(req.params.id);
    if (!subnet) return res.status(404).json({ success: false, message: '网段不存在' });

    const { name, gateway, dns, vlanId, description, parentId } = req.body;

    let finalParentId = parentId !== undefined ? parentId : subnet.parentId;
    if (finalParentId && finalParentId !== subnet.parentId) {
      if (finalParentId === subnet.subnetId) {
        return res.status(400).json({ success: false, message: '不能将自己设为父网段' });
      }
      const parent = await Subnet.findByPk(finalParentId);
      if (!parent) return res.status(400).json({ success: false, message: '指定的父网段不存在' });
      if (parent.ipVersion !== subnet.ipVersion) {
        return res.status(400).json({ success: false, message: '父网段地址族不匹配' });
      }
      if (!ipam.ipInSubnet(subnet.networkAddress, parent.cidr)) {
        return res.status(400).json({ success: false, message: '当前网段不在新父网段范围内' });
      }

      // 祖先链循环检测：沿 parentId 往上爬，确保不会遇到自己
      let cursor = parent.parentId;
      while (cursor) {
        if (cursor === subnet.subnetId) {
          return res.status(400).json({ success: false, message: '指定的父网段的祖先链中包含当前网段，会形成循环' });
        }
        const ancestor = await Subnet.findByPk(cursor);
        if (!ancestor) break; // 断链，保守放行
        cursor = ancestor.parentId;
      }
    }

    if (gateway !== undefined && gateway && !ipam.isGatewayInSubnet(gateway, subnet.cidr)) {
      return res.status(400).json({ success: false, message: '网关地址不在网段范围内' });
    }

    const beforeGateway = subnet.gateway;

    await subnet.update({
      name: name !== undefined ? name : subnet.name,
      gateway: gateway !== undefined ? gateway : subnet.gateway,
      dns: dns !== undefined ? dns : subnet.dns,
      vlanId: vlanId !== undefined ? vlanId : subnet.vlanId,
      description: description !== undefined ? description : subnet.description,
      parentId: finalParentId,
    });

    if (gateway !== undefined && gateway !== beforeGateway) {
      if (beforeGateway) {
        await IpAddress.update(
          { status: 'free' },
          { where: { subnetId: subnet.subnetId, ipAddress: beforeGateway, status: 'gateway' } }
        );
      }
      if (gateway && subnet.autoGenerated) {
        await IpAddress.update(
          { status: 'gateway' },
          { where: { subnetId: subnet.subnetId, ipAddress: gateway } }
        );
      }
    }

    await logOperation({
      module: 'ipam',
      operationType: 'update',
      operationDescription: `更新网段【${subnet.name}】`,
      targetId: subnet.subnetId,
      targetName: subnet.name,
      req,
    });

    const stats = await getSubnetIpStats(subnet.subnetId);
    res.json({ success: true, data: { ...subnet.toJSON(), ...stats }, message: '更新成功' });
  } catch (error) {
    logger.error('更新网段失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/subnets/:id', async (req, res) => {
  const transaction = await Subnet.sequelize.transaction();
  try {
    const subnet = await Subnet.findByPk(req.params.id, { transaction });
    if (!subnet) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: '网段不存在' });
    }

    const force = req.query.force === 'true';

    const collectDescendants = async (parentId) => {
      const children = await Subnet.findAll({ where: { parentId }, transaction });
      let result = [...children];
      for (const child of children) {
        result = result.concat(await collectDescendants(child.subnetId));
      }
      return result;
    };

    const descendants = await collectDescendants(subnet.subnetId);
    const allSubnetIds = [subnet.subnetId, ...descendants.map(d => d.subnetId)];
    const allToDelete = [subnet, ...descendants];
    allToDelete.sort((a, b) => b.prefixLength - a.prefixLength);

    // 删除保护：检查是否有绑定设备的 IP
    const usedIpCount = await IpAddress.count({
      where: { subnetId: allSubnetIds, status: 'used', deviceId: { [Op.ne]: null } },
      transaction,
    });

    if (usedIpCount > 0 && !force) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: `网段下有 ${usedIpCount} 个已绑定设备的 IP，拒绝删除。如需强制删除请传 force=true`,
        data: { usedIpCount, hint: '传 ?force=true 可强制删除（将自动解绑设备）' },
      });
    }

    let totalIpDeleted = 0;
    for (const s of allToDelete) {
      const { count } = await IpAddress.destroy({ where: { subnetId: s.subnetId }, transaction });
      totalIpDeleted += count;
    }

    await Subnet.destroy({
      where: { subnetId: allToDelete.map(s => s.subnetId) },
      transaction,
    });

    await transaction.commit();

    await logOperation({
      module: 'ipam',
      operationType: 'delete',
      operationDescription: `删除网段【${subnet.name}】${force ? '(强制)' : ''}，级联删除 ${descendants.length} 个子网段和 ${totalIpDeleted} 个 IP`,
      targetId: subnet.subnetId,
      targetName: subnet.name,
      req,
    });

    res.json({
      success: true,
      data: { deletedSubnets: allToDelete.length, deletedIps: totalIpDeleted },
      message: `已删除 ${allToDelete.length} 个网段和 ${totalIpDeleted} 个 IP`,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('删除网段失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/subnets/:id/stats', async (req, res) => {
  try {
    const subnet = await Subnet.findByPk(req.params.id);
    if (!subnet) return res.status(404).json({ success: false, message: '网段不存在' });

    const stats = await getSubnetIpStats(subnet.subnetId);
    const usageRate = calcUsageRate(subnet.usableHosts, stats.usedCount);

    res.json({
      success: true,
      data: {
        subnetId: subnet.subnetId,
        name: subnet.name,
        cidr: subnet.cidr,
        ipVersion: subnet.ipVersion,
        usableHosts: subnet.usableHosts,
        totalHosts: subnet.totalHosts,
        ...stats,
        usageRate,
      },
    });
  } catch (error) {
    logger.error('获取网段统计失败', error);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// ========== IP 地址接口 ==========

router.get('/subnets/:id/ips', async (req, res) => {
  try {
    const subnet = await Subnet.findByPk(req.params.id);
    if (!subnet) return res.status(404).json({ success: false, message: '网段不存在' });

    const { page = 1, pageSize = 50, status, keyword, sortOrder = 'asc' } = req.query;

    // IPv6 按 ipInt128 排序，IPv4 按 ipInt
    const sortBy = subnet.ipVersion === 'ipv6' ? 'ipInt128' : 'ipInt';
    const order = [[sortBy, sortOrder === 'desc' ? 'DESC' : 'ASC']];

    const where = { subnetId: subnet.subnetId };
    if (status) where.status = status;
    if (keyword) {
      where[Op.or] = [
        { ipAddress: { [Op.like]: `%${keyword}%` } },
        { label: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
      ];
    }

    // 按需生成的网段（过大，未自动预生成 IP）：返回空列表 + onDemand 标记提示前端
    // 用 shouldAutoGenerate 实时判断，不依赖 autoGenerated 字段（历史数据字段值可能不准）
    const shouldAuto = ipam.shouldAutoGenerate(subnet.prefixLength, subnet.ipVersion);
    if (!shouldAuto) {
      // IPv6 不预生成，只返回已手动添加的 IP（如果有）
      const offset = (page - 1) * pageSize;
      const { count, rows } = await IpAddress.findAndCountAll({
        where, order, limit: parseInt(pageSize, 10), offset: parseInt(offset, 10),
        include: [
          { model: require('../models/Device'), attributes: ['deviceId', 'name', 'type'], required: false },
        ],
      });

      res.json({
        success: true,
        data: {
          list: rows,
          pagination: {
            page: parseInt(page, 10), pageSize: parseInt(pageSize, 10),
            total: count, totalPages: Math.ceil(count / pageSize),
          },
          subnetId: subnet.subnetId,
          subnetCidr: subnet.cidr,
          ipVersion: subnet.ipVersion,
          onDemand: true,
        },
      });
      return;
    }

    // IPv4 自动生成的网段：从数据库查
    const offset = (page - 1) * pageSize;
    const { count, rows } = await IpAddress.findAndCountAll({
      where, order, limit: parseInt(pageSize, 10), offset: parseInt(offset, 10),
      include: [
        { model: require('../models/Device'), attributes: ['deviceId', 'name', 'type'], required: false },
      ],
    });

    res.json({
      success: true,
      data: {
        list: rows,
        pagination: {
          page: parseInt(page, 10), pageSize: parseInt(pageSize, 10),
          total: count, totalPages: Math.ceil(count / pageSize),
        },
        subnetId: subnet.subnetId,
        subnetCidr: subnet.cidr,
        ipVersion: subnet.ipVersion,
      },
    });
  } catch (error) {
    logger.error('获取 IP 列表失败', error);
    res.status(500).json({ success: false, message: '获取 IP 列表失败' });
  }
});

router.get('/ips/:id', async (req, res) => {
  try {
    const ip = await IpAddress.findByPk(req.params.id, {
      include: [{ model: Subnet, as: 'subnet', attributes: ['subnetId', 'name', 'cidr', 'ipVersion'] }],
    });
    if (!ip) return res.status(404).json({ success: false, message: 'IP 不存在' });
    res.json({ success: true, data: ip });
  } catch (error) {
    logger.error('获取 IP 详情失败', error);
    res.status(500).json({ success: false, message: '获取 IP 详情失败' });
  }
});

router.put('/ips/:id', async (req, res) => {
  try {
    const ip = await IpAddress.findByPk(req.params.id);
    if (!ip) return res.status(404).json({ success: false, message: 'IP 不存在' });

    const { status, label, description, assignmentType, ipType, customTag, isPrimaryForDevice } = req.body;

    if (status && !['free', 'used', 'reserved', 'gateway', 'excluded'].includes(status)) {
      return res.status(400).json({ success: false, message: '无效的状态值' });
    }

    // 绑定中的 IP 不允许改成 gateway / excluded
    if ((status === 'gateway' || status === 'excluded') && ip.deviceId) {
      return res.status(400).json({ success: false, message: '绑定中的 IP 不能改为网关或排除状态，请先解绑' });
    }

    // 设置主 IP：需要处理同一设备已有的主 IP
    if (isPrimaryForDevice === true && ip.deviceId && !ip.isPrimaryForDevice) {
      await IpAddress.update(
        { isPrimaryForDevice: false },
        { where: { deviceId: ip.deviceId, isPrimaryForDevice: true, ipId: { [Op.ne]: ip.ipId } } }
      );
    }

    const updateData = {
      status: status !== undefined ? status : ip.status,
      label: label !== undefined ? label : ip.label,
      description: description !== undefined ? description : ip.description,
      assignmentType: assignmentType !== undefined ? assignmentType : ip.assignmentType,
      ipType: ipType !== undefined ? ipType : ip.ipType,
      customTag: customTag !== undefined ? customTag : ip.customTag,
      isPrimaryForDevice: isPrimaryForDevice !== undefined ? isPrimaryForDevice : ip.isPrimaryForDevice,
    };

    // status 变更 → 标记用户手动 override，解绑时不会自动回退 free
    if (status !== undefined && status !== ip.status) {
      updateData.statusAutoDriven = false;
    }

    await ip.update(updateData);

    await logOperation({
      module: 'ipam', operationType: 'update',
      operationDescription: `更新 IP 【${ip.ipAddress}】状态为 ${status || ip.status}`,
      targetId: ip.ipId, targetName: ip.ipAddress, req,
    });

    res.json({ success: true, data: ip, message: '更新成功' });
  } catch (error) {
    logger.error('更新 IP 失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== IP-设备绑定/解绑 ==========

const DEVICE_STATUS_FORBIDDEN = ['gateway', 'excluded'];

/**
 * 将 IP 绑定到设备
 * PATCH /api/ipam/ips/:id/bind
 */
router.patch('/ips/:id/bind', async (req, res) => {
  const transaction = await IpAddress.sequelize.transaction();
  try {
    const ip = await IpAddress.findByPk(req.params.id, { transaction });
    if (!ip) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'IP 不存在' });
    }

    const { deviceId, ipType, customTag, setPrimary = false } = req.body;

    if (!deviceId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: '缺少必填字段 deviceId' });
    }

    // 校验 deviceId 对应的设备是否存在
    const Device = require('../models/Device');
    const device = await Device.findByPk(deviceId, { transaction });
    if (!device) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: `设备 ${deviceId} 不存在` });
    }

    // 网关/排除状态不允许绑定
    if (DEVICE_STATUS_FORBIDDEN.includes(ip.status)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: `IP 状态为 ${ip.status}，不允许绑定` });
    }

    // 已被其他设备占用
    if (ip.deviceId && ip.deviceId !== deviceId) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: `该 IP 已被设备 ${ip.deviceId} 占用` });
    }

    // 同一设备已有主 IP → 先取消旧主 IP
    if (setPrimary && !ip.isPrimaryForDevice) {
      await IpAddress.update(
        { isPrimaryForDevice: false },
        { where: { deviceId, isPrimaryForDevice: true }, transaction }
      );
    }

    // 网段 purpose 推荐 ipType
    let finalIpType = ipType;
    if (!finalIpType && ip.subnetId) {
      const Subnet = require('../models/Subnet');
      const subnet = await Subnet.findByPk(ip.subnetId, { attributes: ['purpose'], transaction });
      if (subnet && subnet.purpose) {
        finalIpType = subnet.purpose;
      }
    }
    if (!finalIpType) finalIpType = ip.ipType || 'business';

    const updates = {
      deviceId,
      ipType: finalIpType,
      customTag: customTag !== undefined ? customTag : ip.customTag,
      isPrimaryForDevice: setPrimary || ip.isPrimaryForDevice,
    };

    // free → used 自动驱动
    if (ip.status === 'free') {
      updates.status = 'used';
      updates.statusAutoDriven = true;
    } else if (ip.status === 'reserved') {
      updates.statusAutoDriven = false;  // 预留状态，不是自动驱动的
    }

    await ip.update(updates, { transaction });
    await transaction.commit();

    await logOperation({
      module: 'ipam', operationType: 'bind',
      operationDescription: `绑定 IP 【${ip.ipAddress}】到设备【${device.name || deviceId}】`,
      targetId: ip.ipId, targetName: ip.ipAddress, req,
    });

    res.json({ success: true, data: ip, message: '绑定成功' });
  } catch (error) {
    await transaction.rollback();
    logger.error('绑定 IP 失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 解绑 IP 与设备
 * PATCH /api/ipam/ips/:id/unbind
 */
router.patch('/ips/:id/unbind', async (req, res) => {
  const transaction = await IpAddress.sequelize.transaction();
  try {
    const ip = await IpAddress.findByPk(req.params.id, { transaction });
    if (!ip) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'IP 不存在' });
    }

    if (!ip.deviceId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: '该 IP 未绑定任何设备' });
    }

    const oldDeviceId = ip.deviceId;

    // 自动驱动的 used → 回退 free；用户手动 override 的 → 尊重当前值
    const updates = {
      deviceId: null,
      networkCardId: null,
      isPrimaryForDevice: false,
    };

    if (ip.statusAutoDriven === true && ip.status === 'used') {
      updates.status = 'free';
      updates.statusAutoDriven = false;
    }

    await ip.update(updates, { transaction });
    await transaction.commit();

    await logOperation({
      module: 'ipam', operationType: 'unbind',
      operationDescription: `解绑 IP 【${ip.ipAddress}】与设备【${oldDeviceId}】`,
      targetId: ip.ipId, targetName: ip.ipAddress, req,
    });

    res.json({ success: true, data: ip, message: '解绑成功' });
  } catch (error) {
    await transaction.rollback();
    logger.error('解绑 IP 失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 批量绑定 IP 到设备
 * POST /api/ipam/ips/batch-bind
 */
router.post('/ips/batch-bind', async (req, res) => {
  const transaction = await IpAddress.sequelize.transaction();
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'items 必须是非空数组' });
    }

    const Device = require('../models/Device');

    // 预加载：一次性查出所有涉及的 IP 和设备（替代循环内 findByPk）
    const ipIds = [...new Set(items.map(i => i.ipId).filter(Boolean))];
    const deviceIds = [...new Set(items.map(i => i.deviceId).filter(Boolean))];

    const [ips, devices] = await Promise.all([
      IpAddress.findAll({ where: { ipId: ipIds }, transaction }),
      Device.findAll({ where: { deviceId: deviceIds }, transaction }),
    ]);
    const ipMap = new Map(ips.map(i => [i.ipId, i]));
    const deviceMap = new Map(devices.map(d => [d.deviceId, d]));

    const results = { success: [], errors: [] };

    for (const item of items) {
      try {
        const { ipId, deviceId, ipType, customTag } = item;
        if (!ipId || !deviceId) {
          results.errors.push({ ipId, error: '缺少 ipId 或 deviceId' });
          continue;
        }

        const ip = ipMap.get(ipId);
        if (!ip) {
          results.errors.push({ ipId, error: 'IP 不存在' });
          continue;
        }

        const device = deviceMap.get(deviceId);
        if (!device) {
          results.errors.push({ ipId, error: `设备 ${deviceId} 不存在` });
          continue;
        }

        if (DEVICE_STATUS_FORBIDDEN.includes(ip.status)) {
          results.errors.push({ ipId, error: `IP 状态 ${ip.status} 不允许绑定` });
          continue;
        }

        if (ip.deviceId && ip.deviceId !== deviceId) {
          results.errors.push({ ipId, error: `已被设备 ${ip.deviceId} 占用` });
          continue;
        }

        const updates = {
          deviceId,
          ipType: ipType || ip.ipType || 'business',
          customTag: customTag !== undefined ? customTag : ip.customTag,
        };
        if (ip.status === 'free') {
          updates.status = 'used';
          updates.statusAutoDriven = true;
        }

        await ip.update(updates, { transaction });
        results.success.push({ ipId, ipAddress: ip.ipAddress, deviceId });
      } catch (e) {
        results.errors.push({ ipId: item.ipId, error: e.message });
      }
    }

    await transaction.commit();

    await logOperation({
      module: 'ipam', operationType: 'batch_bind',
      operationDescription: `批量绑定 ${results.success.length} 个 IP 到设备`,
      targetName: `${results.success.length} 个 IP`, req,
    });

    res.json({
      success: true,
      data: results,
      message: `成功绑定 ${results.success.length} 个 IP，失败 ${results.errors.length} 个`,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('批量绑定 IP 失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 全局 IP 列表查询（支持 deviceId / ipType 反向筛选）
 * GET /api/ipam/ips?deviceId=xxx&ipType=management&status=used&keyword=192.168
 */
router.get('/ips', async (req, res) => {
  try {
    const { deviceId, ipType, status, keyword, sortOrder = 'asc', page = 1, pageSize = 50 } = req.query;

    const where = {};
    if (deviceId) where.deviceId = deviceId;
    if (ipType) where.ipType = ipType;
    if (status) where.status = status;

    if (keyword) {
      where[Op.or] = [
        { ipAddress: { [Op.like]: `%${keyword}%` } },
        { label: { [Op.like]: `%${keyword}%` } },
        { customTag: { [Op.like]: `%${keyword}%` } },
      ];
    }

    // 全局查询按 ipInt128 排序（兼容 IPv4 和 IPv6）
    const order = [['ipInt128', sortOrder === 'desc' ? 'DESC' : 'ASC']];
    const offset = (page - 1) * pageSize;

    const { count, rows } = await IpAddress.findAndCountAll({
      where, order, limit: parseInt(pageSize, 10), offset: parseInt(offset, 10),
      include: [
        { model: require('../models/Device'), attributes: ['deviceId', 'name', 'type'], required: false },
      ],
    });

    res.json({
      success: true,
      data: {
        list: rows,
        pagination: {
          page: parseInt(page, 10), pageSize: parseInt(pageSize, 10),
          total: count, totalPages: Math.ceil(count / pageSize),
        },
      },
    });
  } catch (error) {
    logger.error('全局 IP 列表查询失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ips/batch-status', async (req, res) => {
  try {
    const { ipIds, status, label, ipType, customTag } = req.body;
    if (!ipIds || !Array.isArray(ipIds) || ipIds.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要修改的 IP' });
    }
    if (!status && !label && !ipType && customTag === undefined) {
      return res.status(400).json({ success: false, message: '至少需要提供一个修改字段（status / label / ipType / customTag）' });
    }
    const validStatuses = ['free', 'used', 'reserved', 'gateway', 'excluded'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: '无效的状态值' });
    }
    const validIpTypes = ['management', 'business', 'public', 'storage', 'other'];
    if (ipType && !validIpTypes.includes(ipType)) {
      return res.status(400).json({ success: false, message: '无效的 IP 业务类型' });
    }

    // gateway / excluded 状态不能应用到已绑定设备的 IP
    if ((status === 'gateway' || status === 'excluded') && ipIds.length > 0) {
      const forbiddenCount = await IpAddress.count({
        where: { ipId: ipIds, deviceId: { [Op.ne]: null } },
      });
      if (forbiddenCount > 0) {
        return res.status(400).json({
          success: false,
          message: `有 ${forbiddenCount} 个 IP 已绑定设备，不能改为 ${status} 状态`,
        });
      }
    }

    const updates = {};
    if (status) updates.status = status;
    if (label !== undefined) updates.label = label;
    if (ipType) updates.ipType = ipType;
    if (customTag !== undefined) updates.customTag = customTag;

    const { count } = await IpAddress.update(updates, { where: { ipId: ipIds } });

    const fields = [];
    if (status) fields.push(`状态=${status}`);
    if (ipType) fields.push(`IP类型=${ipType}`);
    if (label !== undefined) fields.push('IP别名');
    if (customTag !== undefined) fields.push('分组标签');

    await logOperation({
      module: 'ipam', operationType: 'batch_update',
      operationDescription: `批量修改 ${count} 个 IP（${fields.join('、')}）`,
      targetName: `${count} 个 IP`, req,
    });

    res.json({ success: true, data: { updated: count }, message: `已更新 ${count} 个 IP` });
  } catch (error) {
    logger.error('批量更新 IP 状态失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ips/batch-create', async (req, res) => {
  try {
    const { subnetId, ipList } = req.body;

    if (!subnetId || !ipList || !Array.isArray(ipList) || ipList.length === 0) {
      return res.status(400).json({ success: false, message: '缺少必填参数' });
    }

    const subnet = await Subnet.findByPk(subnetId);
    if (!subnet) return res.status(404).json({ success: false, message: '网段不存在' });

    // 一次性预加载网段内已有的 IP 用于查重（替代循环内 findOne）
    const existingIps = await IpAddress.findAll({
      where: { subnetId, ipAddress: ipList.map(i => i.ip) },
      attributes: ['ipAddress'],
    });
    const existingSet = new Set(existingIps.map(e => e.ipAddress));

    const records = [];
    const errors = [];

    for (const item of ipList) {
      try {
        const { ip, status = 'free', label, description } = item;

        if (!ipam.ipInSubnet(ip, subnet.cidr)) {
          errors.push({ ip, error: 'IP 不在网段范围内' });
          continue;
        }

        if (existingSet.has(ip)) {
          errors.push({ ip, error: 'IP 已存在' });
          continue;
        }

        const ipVersion = ipam.detectIpVersion(ip);
        records.push({
          subnetId,
          ipVersion,
          ipAddress: ip,
          ipInt: ipVersion === 'ipv4' ? ipam.ip4ToInt(ip) : null,
          ipInt128: ipToInt128(ip, ipVersion),
          status,
          label: label || null,
          description: description || null,
        });
      } catch (e) {
        errors.push({ ip: item.ip, error: e.message });
      }
    }

    if (records.length > 0) {
      await IpAddress.bulkCreate(records, { ignoreDuplicates: true });
    }

    res.json({
      success: true,
      data: { created: records.length, errors },
      message: `成功添加 ${records.length} 个 IP`,
    });
  } catch (error) {
    logger.error('批量创建 IP 失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/ips/:id', async (req, res) => {
  try {
    const ip = await IpAddress.findByPk(req.params.id);
    if (!ip) return res.status(404).json({ success: false, message: 'IP 不存在' });

    await ip.destroy();

    await logOperation({
      module: 'ipam', operationType: 'delete',
      operationDescription: `删除 IP 【${ip.ipAddress}】`,
      targetId: ip.ipId, targetName: ip.ipAddress, req,
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    logger.error('删除 IP 失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: '缺少搜索参数 q' });

    const ipResults = await IpAddress.findAll({
      where: {
        [Op.or]: [
          { ipAddress: { [Op.like]: `%${q}%` } },
          { label: { [Op.like]: `%${q}%` } },
        ],
      },
      include: [{ model: Subnet, as: 'subnet', attributes: ['subnetId', 'name', 'cidr', 'ipVersion'] }],
      limit: 50,
    });

    const subnetResults = await Subnet.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { cidr: { [Op.like]: `%${q}%` } },
          { networkAddress: { [Op.like]: `%${q}%` } },
        ],
      },
      limit: 20,
    });

    res.json({ success: true, data: { ips: ipResults, subnets: subnetResults } });
  } catch (error) {
    logger.error('IP 搜索失败', error);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
});

// ========== 在线探测工具 ==========

/**
 * 读取探测全局配置（从 SystemSetting，缺省用 ipProbe.DEFAULT_CONFIG）
 */
async function getProbeConfig() {
  try {
    const setting = await SystemSetting.findOne({ where: { settingKey: 'ipam_probe_config' } });
    if (setting) {
      const saved = JSON.parse(setting.settingValue);
      return { ...ipProbe.DEFAULT_CONFIG, ...saved };
    }
  } catch (e) { /* ignore */ }
  return { ...ipProbe.DEFAULT_CONFIG };
}

/**
 * 将探测结果批量写回 IpAddress
 * 采用分批并发 update，兼容 SQLite（不支持 ON DUPLICATE KEY UPDATE）和 MySQL
 * @param {Array} ipRecords - 预加载的 IpAddress 实例（需包含 ipId 和 ipAddress）
 * @param {Array} results - 探测结果数组 [{ ip, online, method, latencyMs }]
 * @param {object} transaction - Sequelize 事务（可选）
 */
async function bulkSaveProbeResults(ipRecords, results, transaction = null) {
  if (!ipRecords || ipRecords.length === 0 || !results || results.length === 0) return;

  const recordMap = new Map(ipRecords.map(r => [r.ipAddress, r]));
  const now = new Date();

  // 构建更新目标列表
  const updates = [];
  for (const r of results) {
    const rec = recordMap.get(r.ip);
    if (!rec) continue;
    updates.push({
      ipId: rec.ipId,
      probeStatus: r.online ? 'online' : 'offline',
      probeMethod: r.method || null,
      probeLatency: r.latencyMs ?? null,
      probeLastCheckedAt: now,
    });
  }

  if (updates.length === 0) return;

  // 分批并发执行 update（每批 50 个），避免 SQLite 锁冲突
  const BATCH_SIZE = 50;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(u =>
        IpAddress.update(
          {
            probeStatus: u.probeStatus,
            probeMethod: u.probeMethod,
            probeLatency: u.probeLatency,
            probeLastCheckedAt: u.probeLastCheckedAt,
          },
          { where: { ipId: u.ipId }, transaction }
        )
      )
    );
  }
}

// ========== 探测配置 API ==========

/** 读取探测配置 */
router.get('/probe/config', async (req, res) => {
  try {
    const cfg = await getProbeConfig();
    res.json({ success: true, data: cfg });
  } catch (error) {
    logger.error('读取探测配置失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/** 保存探测配置 */
router.put('/probe/config', async (req, res) => {
  try {
    const { enablePing, tcpPorts, timeoutMs, concurrency } = req.body;
    const newConfig = {};
    if (typeof enablePing === 'boolean') newConfig.enablePing = enablePing;
    if (tcpPorts !== undefined) newConfig.tcpPorts = ipProbe.parsePorts(tcpPorts);
    if (typeof timeoutMs === 'number' && timeoutMs >= 200) newConfig.timeoutMs = timeoutMs;
    if (typeof concurrency === 'number' && concurrency >= 1 && concurrency <= 100) newConfig.concurrency = concurrency;

    const full = { ...ipProbe.DEFAULT_CONFIG, ...newConfig };

    await SystemSetting.upsert({
      settingKey: 'ipam_probe_config',
      settingValue: JSON.stringify(full),
      settingType: 'json',
      category: 'ipam',
      description: 'IP 在线探测全局配置',
      isEditable: true,
    });

    res.json({ success: true, data: full });
  } catch (error) {
    logger.error('保存探测配置失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== 定时探测调度配置 API ==========

/** 默认 cron 表达式：每天凌晨 3 点（与 ipProbeScheduler 保持一致） */
const DEFAULT_PROBE_CRON = '0 3 * * *';

/**
 * 读取 cron 表达式（容错解析，兼容未按 JSON 字符串存储的历史脏数据）
 */
async function readCronExpression() {
  const setting = await SystemSetting.findOne({ where: { settingKey: 'ipam_probe_cron_expression' } });
  if (!setting) return DEFAULT_PROBE_CRON;
  try {
    return JSON.parse(setting.settingValue);
  } catch (_) {
    return setting.settingValue;
  }
}

/** 读取定时探测调度配置 */
router.get('/probe/schedule', async (req, res) => {
  try {
    const enabledSetting = await SystemSetting.findOne({ where: { settingKey: 'ipam_probe_cron_enabled' } });
    const expression = await readCronExpression();
    res.json({
      success: true,
      data: {
        enabled: enabledSetting ? enabledSetting.settingValue === 'true' : false,
        expression,
      },
    });
  } catch (error) {
    logger.error('读取定时探测配置失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 保存定时探测调度配置
 * @body { enabled?: boolean, expression?: string }
 * 未传的字段保持原值；保存后热重载调度器立即生效
 */
router.put('/probe/schedule', async (req, res) => {
  try {
    const { enabled, expression } = req.body;

    // 以现有配置为基线，支持只改一项
    const enabledSetting = await SystemSetting.findOne({ where: { settingKey: 'ipam_probe_cron_enabled' } });
    let finalEnabled = enabledSetting ? enabledSetting.settingValue === 'true' : false;
    let finalExpression = await readCronExpression();

    if (typeof enabled === 'boolean') {
      finalEnabled = enabled;
    }
    if (expression !== undefined) {
      if (typeof expression !== 'string' || !cron.validate(expression.trim())) {
        return res.status(400).json({ success: false, message: 'Cron 表达式格式不正确' });
      }
      finalExpression = expression.trim();
    }

    if (finalEnabled && !finalExpression) {
      return res.status(400).json({ success: false, message: '启用定时探测需要有效的 Cron 表达式' });
    }

    await SystemSetting.upsert({
      settingKey: 'ipam_probe_cron_enabled',
      settingValue: finalEnabled ? 'true' : 'false',
      settingType: 'string',
      category: 'ipam',
      description: 'IP 在线探测定时任务开关',
      isEditable: true,
    });
    await SystemSetting.upsert({
      settingKey: 'ipam_probe_cron_expression',
      settingValue: JSON.stringify(finalExpression),
      settingType: 'json',
      category: 'ipam',
      description: 'IP 在线探测定时任务 cron 表达式',
      isEditable: true,
    });

    // 热重载调度器；失败不阻断保存（重启后仍会按新配置注册）
    let warning = null;
    try {
      await reloadProbeScheduler();
    } catch (e) {
      warning = '调度器热重载失败，重启服务后生效';
      logger.error('定时探测调度器重载失败', e);
    }

    res.json({
      success: true,
      data: { enabled: finalEnabled, expression: finalExpression, warning },
    });
  } catch (error) {
    logger.error('保存定时探测配置失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/** 立即执行一次全量探测（异步执行、立即返回；与定时任务共用运行中去重保护） */
router.post('/probe/run-once', async (req, res) => {
  try {
    if (isProbeRunning()) {
      return res.json({
        success: true,
        data: { triggered: false },
        message: '上一次全量探测仍在进行中，已跳过本次触发',
      });
    }
    // 异步执行，不阻塞响应；内部有 running 去重，异常在 Promise 内兜底
    Promise.resolve(runOnce()).catch((e) => logger.error('手动全量探测失败', e));
    res.json({
      success: true,
      data: { triggered: true },
      message: '已触发全量探测，结果将写入各 IP 的探测状态',
    });
  } catch (error) {
    logger.error('触发全量探测失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== 探测执行 API ==========

/** 探测单个 IP */
router.post('/probe/single', async (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ success: false, message: '缺少 ip 参数' });

    const cfg = await getProbeConfig();
    const result = await ipProbe.probeIp(ip, cfg);

    // 如果网段里有这条 IP，顺手写回探测状态
    const ipRecord = await IpAddress.findOne({ where: { ipAddress: ip } });
    if (ipRecord) {
      await ipRecord.update({
        probeStatus: result.online ? 'online' : 'offline',
        probeMethod: result.method || null,
        probeLatency: result.latencyMs ?? null,
        probeLastCheckedAt: new Date(),
      });
    }

    res.json({ success: true, data: { ip, ...result } });
  } catch (error) {
    logger.error('单 IP 探测失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 批量探测指定 IP 列表
 * @body { ips: string[], detail?: boolean }  detail=true 时返回完整 results 数组（适合小批量查看），默认只返回统计
 */
router.post('/probe/batch', async (req, res) => {
  try {
    const { ips, detail = false } = req.body;
    if (!Array.isArray(ips) || ips.length === 0) {
      return res.status(400).json({ success: false, message: 'ips 必须是非空数组' });
    }
    if (ips.length > 500) {
      return res.status(400).json({ success: false, message: '单次探测最多 500 个 IP' });
    }

    const cfg = await getProbeConfig();
    const results = await ipProbe.probeBatch(ips, cfg);

    // 先一次性预加载所有匹配的 IpAddress（替代循环内 findOne）
    const ipRecords = await IpAddress.findAll({
      where: { ipAddress: ips },
      attributes: ['ipId', 'ipAddress'],
    });

    // 批量 upsert 写回探测结果
    const transaction = await IpAddress.sequelize.transaction();
    try {
      await bulkSaveProbeResults(ipRecords, results, transaction);
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      logger.warn('批量探测写回失败（不阻塞返回）', e);
    }

    const online = results.filter(r => r.online).length;
    const responseData = {
      total: results.length,
      online,
      offline: results.length - online,
    };
    if (detail) {
      responseData.results = results;
    }
    res.json({ success: true, data: responseData });
  } catch (error) {
    logger.error('批量探测失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 探测网段下所有 IP
 * GET /probe/subnet/:subnetId  — 同步返回（结果写回数据库）
 */
router.post('/probe/subnet/:subnetId', async (req, res) => {
  try {
    const { subnetId } = req.params;
    const subnet = await Subnet.findByPk(subnetId);
    if (!subnet) return res.status(404).json({ success: false, message: '网段不存在' });

    const ipRecords = await IpAddress.findAll({
      where: { subnetId },
      attributes: ['ipId', 'ipAddress'],
    });

    if (ipRecords.length === 0) {
      return res.json({ success: true, data: { total: 0, online: 0, offline: 0, skipped: true, message: '网段下尚无 IP 记录' } });
    }

    // 数量大时走后台（>200 异步，避免请求超时）
    const SYNC_LIMIT = 200;
    if (ipRecords.length > SYNC_LIMIT) {
      // 异步执行，立即返回
      (async () => {
        try {
          const cfg = await getProbeConfig();
          const results = await ipProbe.probeBatch(
            ipRecords.map(r => r.ipAddress),
            cfg
          );
          const transaction = await IpAddress.sequelize.transaction();
          try {
            await bulkSaveProbeResults(ipRecords, results, transaction);
            await transaction.commit();
          } catch (txErr) {
            await transaction.rollback();
            logger.warn('异步探测写回失败', txErr);
          }
          logger.info(`异步网段探测完成 subnet=${subnetId} total=${results.length}`);
        } catch (err) {
          logger.error(`异步网段探测失败 subnet=${subnetId}`, err);
        }
      })();
      return res.json({
        success: true,
        data: { total: ipRecords.length, message: 'IP 数量较大，已转为后台异步执行' },
      });
    }

    // 同步执行
    const cfg = await getProbeConfig();
    const results = await ipProbe.probeBatch(
      ipRecords.map(r => r.ipAddress),
      cfg
    );

    const transaction = await IpAddress.sequelize.transaction();
    try {
      await bulkSaveProbeResults(ipRecords, results, transaction);
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      logger.warn('探测写回失败', e);
    }

    const online = results.filter(r => r.online).length;
    res.json({
      success: true,
      data: {
        total: results.length,
        online,
        offline: results.length - online,
      },
    });
  } catch (error) {
    logger.error('网段探测失败', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
