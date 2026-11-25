#!/usr/bin/env node
/**
 * IDC 设备管理系统 · 演示数据每日重置脚本
 *
 * 功能：清空全部业务数据（保留 admin 账号与系统内置配置），再重新灌入一套中等规模演示数据。
 * 用法：
 *   node scripts/reset-demo-data.mjs                 # 清理 + 重灌
 *   node scripts/reset-demo-data.mjs --no-clean      # 只灌数，不清空
 *   node scripts/reset-demo-data.mjs --print-cron    # 打印 crontab 配置
 *   node scripts/reset-demo-data.mjs --install-cron  # 写入 crontab（每天 00:00）
 * 环境变量：
 *   IDC_BASE_URL   站点地址（默认线上地址）
 *   IDC_ADMIN_USER 管理员用户名（默认 admin）
 *   IDC_ADMIN_PASS 管理员密码（默认 admin@123）
 */
import { execSync } from 'node:child_process';
import process from 'node:process';

const BASE = (process.env.IDC_BASE_URL || 'https://37lv6ysk5xcajb4li5z.traesite.cn').replace(/\/$/, '');
const USERNAME = process.env.IDC_ADMIN_USER || 'admin';
const PASSWORD = process.env.IDC_ADMIN_PASS || 'admin@123';
const ARGS = new Set(process.argv.slice(2));
const NO_CLEAN = ARGS.has('--no-clean');

const DEMO_ROLES = ['ops_engineer', 'auditor', 'consumable_admin'];
const DEMO_TICKET_CATEGORIES = ['环境故障', '光模块故障', '容量预警'];

const log = (...args) => console.log(`[${new Date().toISOString()}]`, ...args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i + 1));

let token = '';
const stats = [];
const fails = [];

const unwrap = (j) =>
  j && typeof j === 'object' && !Array.isArray(j) && 'data' in j && (j.success === true || j.ok === true) ? j.data : j;

/** 从各种分页/包裹结构里取出数组 */
function listOf(payload, preferred = []) {
  const d = unwrap(payload);
  if (Array.isArray(d)) return d;
  if (!d || typeof d !== 'object') return [];
  for (const k of [...preferred, 'list', 'items', 'rows', 'data']) {
    if (Array.isArray(d[k])) return d[k];
  }
  const found = Object.values(d).find((v) => Array.isArray(v));
  return found || [];
}

/** 原始请求，不抛异常 */
async function req(method, path, body) {
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    return { ok: false, status: 0, json: { message: e.message } };
  }
}

/** 失败即抛错 */
async function api(method, path, body) {
  const r = await req(method, path, body);
  if (!r.ok) {
    const raw = typeof r.json === 'object' ? (r.json.message || r.json.error || JSON.stringify(r.json)) : r.json;
    throw new Error(`${method} ${path} -> ${r.status}: ${String(raw).slice(0, 220)}`);
  }
  return unwrap(r.json);
}

/** 单条带重试，失败只记录不中断 */
async function step(name, fn, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fn();
      return r;
    } catch (e) {
      if (/SQLITE_BUSY|database is locked|ECONNRESET|fetch failed/i.test(e.message) && i < retries) {
        await sleep(600 * (i + 1));
        continue;
      }
      fails.push(`${name} | ${e.message}`);
      log('  x', name, '|', e.message.slice(0, 180));
      return undefined;
    }
  }
}

/** 删除一批记录，404 视为已完成 */
async function delAll(name, pathPrefix, items, idKeys) {
  let n = 0;
  for (const it of items) {
    const id = idKeys.map((k) => it[k]).find((v) => v !== undefined && v !== null);
    if (id === undefined) continue;
    const r = await req('DELETE', `${pathPrefix}/${encodeURIComponent(id)}`);
    if (r.ok || r.status === 404 || r.status === 204) n++;
    else {
      fails.push(`删除 ${name} ${id} | ${r.status} ${JSON.stringify(r.json).slice(0, 160)}`);
      log('  x 删除', name, id, r.status);
    }
  }
  if (n) log('  已删除', name, n);
  return n;
}

// ============ 登录 ============
async function login() {
  log('站点:', BASE);
  const chk = await req('POST', '/api/auth/check-admin', {});
  if (chk.ok && unwrap(chk.json)?.hasAdmin === false) {
    log('无管理员账号，注册中...');
    await req('POST', '/api/auth/register', {
      username: USERNAME, password: PASSWORD, realName: '系统管理员',
      email: 'admin@example.com', phone: '13800000000',
    });
  }
  const r = await req('POST', '/api/auth/login', { username: USERNAME, password: PASSWORD });
  if (!r.ok) throw new Error(`登录失败: ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  const d = unwrap(r.json);
  token = d.token || d.accessToken;
  if (!token) throw new Error('登录响应中没有 token');
  const me = d.user || d.userInfo || {};
  log('登录成功:', me.username || USERNAME, me.userId || '');
  return me;
}

// ============ 清理 ============
async function cleanup() {
  log('== 清理业务数据 ==');

  // 拓扑布局没有列表接口，按设备 ID 推测 layoutKey
  const devices = listOf(await api('GET', '/api/devices?page=1&pageSize=500'), ['devices']);
  for (const d of devices) {
    for (const key of [`switch:${d.deviceId}`, `rack:${d.deviceId}`, `device:${d.deviceId}`]) {
      await req('DELETE', `/api/topology/layout/${encodeURIComponent(key)}`);
    }
  }
  if (devices.length) log('  已清理拓扑布局候选', devices.length * 3);

  await delAll('设备凭据', '/api/device-credentials',
    listOf(await api('GET', '/api/device-credentials'), ['credentials']), ['credentialId', 'id']);

  await delAll('盘点计划', '/api/inventory/plans',
    listOf(await api('GET', '/api/inventory/plans?page=1&pageSize=100'), ['plans']), ['planId', 'id']);

  await delAll('盘点暂存设备', '/api/inventory/pending-devices',
    listOf(await api('GET', '/api/inventory/pending-devices?page=1&pageSize=200'), ['pendingDevices']), ['pendingId', 'id']);

  await delAll('工单', '/api/tickets',
    listOf(await api('GET', '/api/tickets?page=1&pageSize=200'), ['tickets']), ['ticketId', 'id']);

  await delAll('耗材流水', '/api/consumables/logs',
    listOf(await api('GET', '/api/consumables/logs?page=1&pageSize=500'), ['logs']), ['logId', 'id']);

  await delAll('耗材', '/api/consumables',
    listOf(await api('GET', '/api/consumables?page=1&pageSize=300'), ['consumables']), ['consumableId', 'id']);

  await delAll('耗材分类', '/api/consumable-categories',
    listOf(await api('GET', '/api/consumable-categories'), ['categories']), ['categoryId', 'id']);

  // 网段：先取 IP 列表反查 subnetId（/subnets 在旧代码下可能 500）
  const ips = [];
  for (let page = 1; page <= 10; page++) {
    const list = listOf(await api('GET', `/api/ipam/ips?page=${page}&pageSize=1000`), ['ips', 'list']);
    ips.push(...list);
    if (list.length < 1000) break;
  }
  const subnetIds = [...new Set(ips.map((i) => i.subnetId).filter(Boolean))];
  for (const id of subnetIds) {
    const r = await req('DELETE', `/api/ipam/subnets/${encodeURIComponent(id)}?force=true`);
    if (!(r.ok || r.status === 404)) {
      fails.push(`删除网段 ${id} | ${r.status} ${JSON.stringify(r.json).slice(0, 160)}`);
      log('  x 删除网段', id, r.status);
    }
  }
  if (subnetIds.length) log('  已删除网段', subnetIds.length);

  // 设备一键删除（级联端口/网卡/线缆/盘点记录）
  const dr = await req('DELETE', '/api/devices/delete-all');
  if (dr.ok) log('  已删除全部设备:', unwrap(dr.json)?.deletedCount ?? '');
  else {
    fails.push(`删除全部设备 | ${dr.status} ${JSON.stringify(dr.json).slice(0, 160)}`);
    log('  x 删除全部设备失败', dr.status);
  }

  await delAll('仓库', '/api/warehouses',
    listOf(await api('GET', '/api/warehouses?page=1&pageSize=100'), ['warehouses']), ['warehouseId', 'id']);

  await delAll('机柜', '/api/racks',
    listOf(await api('GET', '/api/racks?page=1&pageSize=300'), ['racks']), ['rackId', 'id']);

  await delAll('机房', '/api/rooms',
    listOf(await api('GET', '/api/rooms?page=1&pageSize=200'), ['rooms']), ['roomId', 'id']);

  await delAll('用户', '/api/users',
    listOf(await api('GET', '/api/users?page=1&pageSize=300'), ['users']).filter((u) => u.username !== USERNAME),
    ['userId', 'id']);

  await delAll('角色', '/api/roles',
    listOf(await api('GET', '/api/roles'), ['roles']).filter((r) => DEMO_ROLES.includes(r.roleCode)),
    ['roleId', 'id']);

  await delAll('故障分类', '/api/ticket-categories',
    listOf(await api('GET', '/api/ticket-categories'), ['categories']).filter((c) => DEMO_TICKET_CATEGORIES.includes(c.name)),
    ['categoryId', 'id']);

  log('清理完成，失败', fails.length);
}

// ============ 灌入演示数据 ============
async function seed(me) {
  const count = {};

  // 1. 机房 / 机柜 / 仓库
  log('== 1. 机房 / 机柜 / 仓库 ==');
  const rooms = [];
  for (const r of [
    { name: '北京亦庄 B1 核心机房', location: '北京市大兴区亦庄 B1 层', area: 320.5, capacity: 60, description: '核心网络与计算资源' },
    { name: '上海张江 A3 机房', location: '上海市浦东新区张江 A3 层', area: 210, capacity: 40, description: '华东区域业务机房' },
    { name: '深圳南山区灾备机房', location: '深圳市南山区科技园 B2 层', area: 160.8, capacity: 24, description: '灾备与测试环境' },
  ]) {
    const res = await step('创建机房 ' + r.name, () => api('POST', '/api/rooms', r));
    if (res) rooms.push({ id: res.roomId || res.id, name: r.name });
  }
  const rackPlan = [];
  rooms.forEach((room, ri) => {
    const n = ri === 0 ? 3 : 2;
    range(n, (i) => rackPlan.push({ room, name: `${String.fromCharCode(65 + ri)}-${String(i).padStart(2, '0')}`, height: i === 1 ? 47 : 42 }));
  });
  const racks = [];
  for (const rp of rackPlan) {
    const res = await step('创建机柜 ' + rp.name, () => api('POST', '/api/racks', {
      name: rp.name, roomId: rp.room.id, height: rp.height, maxPower: 8000, status: 'active',
    }));
    if (res) racks.push({ id: res.rackId || res.id, roomId: rp.room.id, name: rp.name, nextPos: 1 });
  }
  for (const w of [
    { name: '备件中心仓', location: '北京 B1 层 C 区', capacity: 500, description: '服务器与网络备件' },
    { name: '耗材周转仓', location: '上海 A3 层入口', capacity: 200, description: '线缆与耗材' },
  ]) {
    await step('创建仓库 ' + w.name, () => api('POST', '/api/warehouses', w));
  }
  count.rooms = rooms.length; count.racks = racks.length; count.warehouses = 2;

  // 2. 角色 / 用户
  log('== 2. 角色 / 用户 ==');
  const roles = [];
  for (const role of [
    { roleName: '运维工程师', roleCode: 'ops_engineer', permissions: ['*'], status: 'active', description: '设备、机房、工单日常运维' },
    { roleName: '只读审计员', roleCode: 'auditor', permissions: ['room:view', 'rack:view', 'device:view', 'ticket:view'], status: 'active', description: '仅查看数据' },
    { roleName: '耗材管理员', roleCode: 'consumable_admin', permissions: ['consumable:view', 'consumable:create', 'consumable:update'], status: 'active', description: '耗材出入库管理' },
  ]) {
    const res = await step('创建角色 ' + role.roleName, () => api('POST', '/api/roles', role));
    if (res) roles.push({ id: res.roleId || res.id, code: role.roleCode });
  }
  const opsRole = roles.find((r) => r.code === 'ops_engineer');
  let userCnt = 0;
  for (const [username, realName, phone] of [
    ['zhangsan', '张三', '13800000101'], ['lisi', '李四', '13800000102'],
    ['wangwu', '王五', '13800000103'], ['zhaoliu', '赵六', '13800000104'],
    ['sunqi', '孙七', '13800000105'], ['zhouba', '周八', '13800000106'],
    ['wujiu', '吴九', '13800000107'], ['zhengshi', '郑十', '13800000108'],
  ]) {
    const res = await step('创建用户 ' + username, () => api('POST', '/api/users', {
      username, password: 'Pass@12345', realName, email: `${username}@example.com`, phone,
      roleIds: opsRole ? [opsRole.id] : [], status: 'active',
    }));
    if (res) userCnt++;
  }
  count.roles = roles.length; count.users = userCnt;

  // 3. 设备
  log('== 3. 设备 ==');
  const fieldRes = await req('GET', '/api/deviceFields');
  const fields = fieldRes.ok ? listOf(fieldRes.json, ['fields']) : [];
  const filler = (field) => {
    const t = String(field.fieldType || '').toLowerCase();
    const opts = Array.isArray(field.options) ? field.options : [];
    const vals = opts.map((o) => (typeof o === 'string' ? o : o && (o.value ?? o.label))).filter((v) => v !== undefined);
    if (['select', 'enum', 'radio'].includes(t) && vals.length) return vals[0];
    if (['number', 'integer', 'int', 'float'].includes(t)) return 8;
    if (['date', 'datetime'].includes(t)) return '2024-06-01';
    if (['boolean', 'bool', 'switch'].includes(t)) return false;
    if (t === 'array' || t === 'multiselect') return vals.slice(0, 2);
    return '演示';
  };
  const fillers = fields
    .filter((f) => f && f.required && !['name', 'serialNumber', 'type', 'status', 'rackId', 'position', 'height'].includes(f.fieldName))
    .map((f) => [f.fieldName, filler(f)]);

  const deviceSpecs = [
    ['core-sw-01', 'switch', 'S5731-H48T4XC', 1],
    ['db-server-02', 'server', 'PowerEdge R750', 2],
    ['web-server-03', 'server', 'ThinkSystem SR650', 2],
    ['storage-node-04', 'storage', 'OceanStor 5310', 2],
    ['agg-sw-05', 'switch', 'S6730-H24X6C', 1],
    ['edge-router-06', 'router', 'NE40E-M2K', 1],
    ['cache-node-07', 'server', 'PowerEdge R650', 2],
    ['tor-sw-08', 'switch', 'S6730-H24X6C', 1],
    ['app-server-09', 'server', 'ThinkSystem SR630', 2],
    ['kvm-10', 'other', 'KVM-1716', 1],
    ['log-server-11', 'server', 'PowerEdge R740', 2],
    ['access-sw-12', 'switch', 'S5735-L24T4X', 1],
  ];
  const statuses = ['running', 'running', 'running', 'running', 'running', 'running', 'running', 'running', 'maintenance', 'offline', 'running', 'fault'];
  const devices = [];
  for (let i = 0; i < deviceSpecs.length; i++) {
    const [name, type, model, height] = deviceSpecs[i];
    const rack = racks[i % racks.length];
    const position = rack ? rack.nextPos : 1;
    if (rack) rack.nextPos += height + 1;
    const body = {
      name, type, model, height, position,
      rackId: rack?.id,
      serialNumber: `SN-2026-${1000 + i}`,
      status: statuses[i],
      powerConsumption: 200 + i * 35,
      ipAddress: `10.20.0.${20 + i}`,
      purchaseDate: '2024-03-15',
      description: '演示设备（每日重置生成）',
    };
    for (const [k, v] of fillers) if (body[k] === undefined && v !== undefined) body[k] = v;
    const res = await step('创建设备 ' + name, () => api('POST', '/api/devices', body));
    if (res) devices.push({ id: res.deviceId || res.id, name, type });
  }
  count.devices = devices.length;

  // 4. 网卡 / 端口 / 线缆
  log('== 4. 网卡 / 端口 / 线缆 ==');
  for (const d of devices.filter((x) => x.type === 'server')) {
    await step('创建网卡 ' + d.name, () => api('POST', '/api/network-cards', {
      deviceId: d.id, name: '网卡1', slotNumber: 1, model: 'Intel I350', manufacturer: 'Intel', status: 'normal',
    }));
  }
  const portMap = new Map();
  let portCnt = 0;
  for (const d of devices) {
    if (!['switch', 'server'].includes(d.type)) continue;
    const defs = d.type === 'switch'
      ? [...range(6, (i) => ({ portName: `Gi0/${i}`, portType: 'RJ45', portSpeed: '1G' })),
        ...range(4, (i) => ({ portName: `Te1/${i}`, portType: 'SFP+', portSpeed: '10G' }))]
      : range(6, (i) => ({ portName: `eth${i}`, portType: 'RJ45', portSpeed: '1G' }));
    const list = [];
    for (const p of defs) {
      const res = await step(`创建端口 ${d.name}/${p.portName}`, () => api('POST', '/api/device-ports', {
        deviceId: d.id, portName: p.portName, portType: p.portType, portSpeed: p.portSpeed,
        status: 'free', description: '演示端口',
      }));
      if (res) { list.push({ portName: p.portName, portType: p.portType, used: false }); portCnt++; }
    }
    portMap.set(d.id, list);
  }
  const switches = devices.filter((d) => d.type === 'switch');
  const servers = devices.filter((d) => d.type === 'server');
  const takePort = (dev, type) => {
    const list = (portMap.get(dev.id) || []).filter((p) => p.portType === type && !p.used);
    if (!list.length) return null;
    list[0].used = true;
    return list[0];
  };
  let cableCnt = 0;
  const addCable = async (a, pa, b, pb, type, label) => {
    const res = await step(`创建线缆 ${label}`, () => api('POST', '/api/cables', {
      sourceDeviceId: a.id, sourcePort: pa.portName, targetDeviceId: b.id, targetPort: pb.portName,
      cableType: type, cableLength: 3 + (cableCnt % 5), status: 'normal',
      cableLabel: label, description: '演示线缆',
    }));
    if (res) cableCnt++;
    await sleep(80);
  };
  // 服务器双上行接入
  for (let i = 0; i < servers.length; i++) {
    for (let k = 0; k < 2; k++) {
      const sw = switches[(i + k) % switches.length];
      const sp = takePort(sw, 'RJ45');
      const vp = takePort(servers[i], 'RJ45');
      if (sp && vp) await addCable(servers[i], vp, sw, sp, 'ethernet', `ACC-${servers[i].name}-${vp.portName}`);
    }
  }
  // 交换机间光纤互联
  for (let i = 0; i < switches.length; i++) {
    const a = switches[i];
    const b = switches[(i + 1) % switches.length];
    const pa = takePort(a, 'SFP+');
    const pb = takePort(b, 'SFP+');
    if (pa && pb) await addCable(a, pa, b, pb, 'fiber', `UPLINK-${a.name}-${b.name}`);
  }
  count.ports = portCnt; count.cables = cableCnt;

  // 5. IPAM（只建 1 个网段，避免旧代码排序报错）
  log('== 5. IPAM ==');
  const sub = await step('创建网段 北京业务网段', () => api('POST', '/api/ipam/subnets', {
    name: '北京业务网段', cidr: '10.20.0.0/24', gateway: '10.20.0.1',
    dns: ['223.5.5.5', '8.8.8.8'], vlanId: '100', description: '核心业务',
  }));
  let subnetCnt = 0, bindCnt = 0;
  if (sub) {
    subnetCnt = 1;
    const subnetId = sub.subnetId || sub.id;
    const ipsRes = await req('GET', `/api/ipam/ips?subnetId=${encodeURIComponent(subnetId)}&page=1&pageSize=300`);
    const ips = ipsRes.ok ? listOf(ipsRes.json, ['ips', 'list']) : [];
    const byIp = new Map(ips.map((i) => [i.ipAddress, i.ipId]));
    const bindItems = devices
      .map((d, idx) => ({ ipId: byIp.get(`10.20.0.${20 + idx}`), deviceId: d.id, ipType: 'business', customTag: idx < 2 ? 'VIP' : '普通' }))
      .filter((x) => x.ipId);
    if (bindItems.length) {
      const r = await step('批量绑定设备 IP', () => api('POST', '/api/ipam/ips/batch-bind', { items: bindItems }));
      if (r !== undefined) bindCnt = bindItems.length;
    }
  }
  count.subnets = subnetCnt; count.ipBinds = bindCnt;

  // 6. 耗材
  log('== 6. 耗材 ==');
  for (const c of [
    { name: '网线', description: '各类跳线与成品线', sortOrder: 1, status: 'active' },
    { name: '光模块', description: '10G/25G/100G 光模块', sortOrder: 2, status: 'active' },
    { name: '电源与配件', description: '电源模块、风扇等', sortOrder: 3, status: 'active' },
  ]) {
    await step('创建耗材分类 ' + c.name, () => api('POST', '/api/consumable-categories', c));
  }
  const consumables = [];
  for (const c of [
    ['六类跳线 2m', '网线', '根', 50, 500, 12.5, '华为供应商', 'A架-3层', 200],
    ['超六类跳线 5m', '网线', '根', 30, 300, 25, '华为供应商', 'A架-3层', 120],
    ['光纤跳线 LC-LC 3m', '网线', '根', 20, 200, 45, '综合供应商', 'A架-5层', 60],
    ['万兆 SFP+ 光模块', '光模块', '个', 20, 200, 168, '华三供应商', 'B架-1层', 80],
    ['25G SFP28 光模块', '光模块', '个', 10, 100, 420, '华三供应商', 'B架-1层', 40],
    ['100G QSFP28 光模块', '光模块', '个', 5, 50, 1980, '思科供应商', 'B架-2层', 20],
    ['千兆电口模块', '光模块', '个', 10, 100, 210, '华为供应商', 'B架-3层', 35],
    ['600W 电源模块', '电源与配件', '个', 10, 60, 880, '戴尔供应商', 'C架-1层', 30],
    ['机箱风扇模块', '电源与配件', '个', 15, 100, 260, '戴尔供应商', 'C架-1层', 45],
    ['理线扎带 30cm', '电源与配件', '包', 40, 400, 8, '综合供应商', 'C架-3层', 150],
  ]) {
    const [name, category, unit, minStock, maxStock, unitPrice, supplier, location, inboundQuantity] = c;
    const res = await step('创建并入库耗材 ' + name, () => api('POST', '/api/consumables/create-with-inbound', {
      name, category, unit, minStock, maxStock, unitPrice, supplier, location,
      inboundQuantity, inboundOperator: '管理员', inboundReason: '期初入库',
    }), 3);
    if (res) consumables.push({ id: res.consumableId || res.id, name });
    await sleep(150);
  }
  let flow = 0;
  for (let i = 0; i < consumables.length; i++) {
    const c = consumables[i];
    const isOut = i % 2 === 1;
    const r = await step(`耗材${isOut ? '出库' : '入库'} ${c.name}`, () => api('POST', '/api/consumables/inout', {
      consumableId: c.id, type: isOut ? 'out' : 'in', quantity: isOut ? 3 : 6,
      operator: '李四', reason: isOut ? '机房更换' : '补充采购入库',
      recipient: isOut ? '网络组' : undefined, notes: '演示流水',
    }), 3);
    if (r !== undefined) flow++;
    await sleep(220);
  }
  count.consumables = consumables.length; count.consumableFlows = flow;

  // 7. 工单
  log('== 7. 工单 ==');
  await step('初始化内置故障分类', () => api('POST', '/api/ticket-categories/init', {}));
  const catRes = await req('GET', '/api/ticket-categories');
  const catList = catRes.ok ? listOf(catRes.json, ['categories']) : [];
  const cats = catList.map((c) => c.name);
  const existCats = new Set(cats);
  for (const c of [
    { name: '环境故障', priority: 4, defaultPriority: 'high', expectedDuration: 6, description: '供电、空调、温湿度', solutions: ['联系物业', '启动备用电源'] },
    { name: '光模块故障', priority: 5, defaultPriority: 'medium', expectedDuration: 3, description: '光衰过大、链路闪断', solutions: ['更换光模块', '清洁端面'] },
    { name: '配置变更', priority: 6, defaultPriority: 'low', expectedDuration: 2, description: '计划内配置调整', solutions: ['走变更流程'] },
    { name: '容量预警', priority: 7, defaultPriority: 'medium', expectedDuration: 24, description: '资源使用率超阈值', solutions: ['扩容', '清理数据'] },
  ].filter((c) => !existCats.has(c.name))) {
    const res = await step('创建故障分类 ' + c.name, () => api('POST', '/api/ticket-categories', c));
    if (res) cats.push(c.name);
  }
  let ticketCnt = 0;
  const tpl = [
    ['核心交换机端口异常告警', '硬件故障', '端口告警', 'high', 'Gi0/12 端口频繁 up/down'],
    ['数据库服务器 RAID 降级', '硬件故障', '硬盘告警', 'urgent', 'RAID5 掉盘一块，需更换硬盘'],
    ['上海机房到北京专线丢包', '网络故障', '链路丢包', 'urgent', '丢包率 12%'],
    ['存储节点风扇转速异常', '硬件故障', '风扇告警', 'medium', '风扇 3 转速偏低'],
    ['应用服务器磁盘空间不足', '系统故障', '磁盘告警', 'high', '/data 使用率 92%'],
    ['机房空调温度偏高', '环境故障', '温度告警', 'high', 'B1 冷通道 29℃'],
    ['边缘路由器 BGP 邻居中断', '网络故障', '路由异常', 'urgent', '与运营商邻居 down'],
    ['监控系统误报告警', '系统故障', '监控异常', 'low', '告警风暴，需优化阈值'],
    ['接入交换机电源模块故障', '硬件故障', '电源告警', 'high', 'PSU2 无输出'],
    ['北京机房 UPS 切换测试失败', '环境故障', '供电异常', 'urgent', '切换时负载跌落'],
  ];
  for (let i = 0; i < tpl.length; i++) {
    const [title, faultCategory, faultSubCategory, priority, description] = tpl[i];
    const d = devices[i % devices.length];
    const res = await step('创建工单 ' + title, () => api('POST', '/api/tickets', {
      title, description, priority,
      faultCategory: cats.includes(faultCategory) ? faultCategory : cats[0],
      faultSubCategory, deviceId: d?.id,
      reporterId: me.userId, reporterName: me.realName || me.username,
      expectedCompletionDate: '2026-01-15',
    }));
    if (res) ticketCnt++;
    await sleep(80);
  }
  count.tickets = ticketCnt;

  // 8. 盘点
  log('== 8. 盘点 ==');
  const plans = [];
  for (const p of [
    { name: '2026 Q1 北京机房全面盘点', type: 'full', description: '季度全量盘点', scheduledDate: '2026-01-10', targetRooms: rooms[0] ? [rooms[0].id] : [] },
    { name: '2026 年 1 月上海机房抽盘', type: 'sample', description: '抽样盘点', scheduledDate: '2026-01-15', targetRooms: rooms[1] ? [rooms[1].id] : [] },
  ]) {
    const res = await step('创建盘点计划 ' + p.name, () => api('POST', '/api/inventory/plans', p));
    if (res) plans.push({ id: res.planId || res.id, name: p.name });
  }
  let checked = 0;
  for (const plan of plans) {
    await step('启动盘点计划 ' + plan.name, () => api('POST', `/api/inventory/plans/${plan.id}/start`, {}));
    const recs = await step('读取盘点记录 ' + plan.name, () => api('GET', `/api/inventory/records?planId=${plan.id}&page=1&pageSize=200`));
    const ids = listOf(recs, ['records'])
      .filter((r) => (r.status || 'pending') === 'pending')
      .map((r) => r.recordId || r.id).filter(Boolean).slice(0, 20);
    if (ids.length) {
      await step('批量登记盘点结果 ' + plan.name, () => api('POST', '/api/inventory/records/batch-check', {
        recordIds: ids, status: 'normal', remark: '演示盘点：位置与资产一致',
      }));
      checked += ids.length;
    }
  }
  // 盘点中发现的暂存设备
  if (plans[0] && rooms[2]) {
    for (let i = 0; i < 2; i++) {
      await step('盘点中新增设备 ' + (i + 1), () => api('POST', '/api/inventory/quick-add-device', {
        planId: plans[0].id, serialNumber: `PEND-SN-${i + 1}`, name: `盘点新发现服务器-${i + 1}`,
        type: 'server', roomId: rooms[2].id, model: '待核实', remark: '演示暂存设备',
      }));
    }
    const pend = await req('GET', '/api/inventory/pending-devices?page=1&pageSize=50');
    const pids = (pend.ok ? listOf(pend.json, ['pendingDevices']) : [])
      .filter((p) => !p.synced).map((p) => p.pendingId || p.id).filter(Boolean);
    if (pids.length) {
      await step('同步暂存设备到正式设备表', () => api('POST', '/api/inventory/pending-devices/batch-sync', { pendingIds: pids }));
    }
  }
  count.plans = plans.length; count.inventoryChecked = checked;

  // 9. 设备凭据
  log('== 9. 设备凭据 ==');
  let credCnt = 0;
  const credDefs = [
    ['snmp', '10.20.0.20', { community: 'public', vendor: 'huawei', isDefault: true }],
    ['snmp', '10.20.0.21', { community: 'public', vendor: 'h3c', isDefault: true }],
    ['ssh', '10.20.0.22', { username: 'ops', password: 'Ops@12345', port: 22, vendor: 'generic', isDefault: true }],
    ['redfish', '10.20.0.23', { username: 'admin', password: 'Bmc@12345', port: 443, vendor: 'generic', isDefault: true }],
    ['ssh', '10.20.0.24', { username: 'ops', password: 'Ops@12345', port: 22, vendor: 'generic', isDefault: false }],
  ];
  for (let i = 0; i < credDefs.length && i < devices.length; i++) {
    const [protocol, host, extra] = credDefs[i];
    const r = await step(`创建设备凭据 ${devices[i].name}/${protocol}`, () => api('POST', '/api/device-credentials', {
      protocol, host, ...extra, deviceId: devices[i].id,
    }));
    if (r !== undefined) credCnt++;
  }
  count.credentials = credCnt;

  // 10. 拓扑布局
  log('== 10. 拓扑布局 ==');
  let topo = 0;
  for (const d of devices.slice(0, 3)) {
    const key = `${d.type === 'switch' ? 'switch' : 'device'}:${d.id}`;
    const r = await step('保存拓扑布局 ' + d.name, () => api('POST', '/api/topology/layout', {
      layoutKey: key,
      nodesData: [{ id: d.id, x: 120, y: 80 }, ...devices.slice(0, 5).filter((x) => x.id !== d.id).map((x, i) => ({ id: x.id, x: 280 + i * 150, y: 80 }))],
      viewport: { x: 0, y: 0, zoom: 1 },
    }));
    if (r !== undefined) topo++;
  }
  count.topology = topo;

  return count;
}

// ============ 汇总 ============
async function report() {
  const probe = [
    ['机房', '/api/rooms?page=1&pageSize=200', ['rooms']],
    ['机柜', '/api/racks?page=1&pageSize=300', ['racks']],
    ['仓库', '/api/warehouses?page=1&pageSize=100', ['warehouses']],
    ['角色', '/api/roles', ['roles']],
    ['用户', '/api/users?page=1&pageSize=300', ['users']],
    ['设备', '/api/devices?page=1&pageSize=300', ['devices']],
    ['设备端口', '/api/device-ports?pageSize=500', ['ports']],
    ['线缆', '/api/cables?page=1&pageSize=300', ['cables']],
    ['耗材', '/api/consumables?page=1&pageSize=300', ['consumables']],
    ['耗材流水', '/api/consumables/inout/records?page=1&pageSize=300', ['records']],
    ['工单', '/api/tickets?page=1&pageSize=300', ['tickets']],
    ['盘点计划', '/api/inventory/plans?page=1&pageSize=100', ['plans']],
    ['设备凭据', '/api/device-credentials', ['credentials']],
  ];
  log('== 线上数据统计 ==');
  for (const [label, path, keys] of probe) {
    const r = await req('GET', path);
    // 用列表长度而非 total：旧版后端 findAndCountAll 的 total 在 join 场景会虚高
    const v = r.ok ? listOf(r.json, keys).length : `ERR ${r.status}`;
    log(`  ${label.padEnd(6, '　')} ${v}`);
  }
}

// ============ crontab ============
function cronLine() {
  const script = new URL(import.meta.url).pathname;
  const node = process.execPath;
  const envs = [process.env.IDC_BASE_URL ? `IDC_BASE_URL=${process.env.IDC_BASE_URL}` : '', process.env.IDC_ADMIN_PASS ? `IDC_ADMIN_PASS=${process.env.IDC_ADMIN_PASS}` : ''].filter(Boolean).join(' ');
  return `0 0 * * * ${envs ? envs + ' ' : ''}${node} ${script} >> /tmp/idc-reset.log 2>&1`;
}

function printCron() {
  console.log('\n# 每天 00:00 重置演示数据，执行 crontab -e 后粘贴下面一行：');
  console.log(cronLine());
}

function installCron() {
  const line = cronLine();
  try {
    let current = '';
    try { current = execSync('crontab -l 2>/dev/null', { encoding: 'utf8' }); } catch { current = ''; }
    const kept = current.split('\n').filter((l) => l && !l.includes('reset-demo-data.mjs'));
    kept.push(line);
    execSync('crontab -', { input: kept.join('\n') + '\n', encoding: 'utf8' });
    log('已写入 crontab：', line);
  } catch (e) {
    log('自动写入 crontab 失败（当前环境可能没有 cron）：', e.message.split('\n')[0]);
    printCron();
  }
}

// ============ main ============
async function main() {
  if (ARGS.has('--print-cron')) return printCron();
  if (ARGS.has('--install-cron')) return installCron();

  const started = Date.now();
  const me = await login();
  if (!NO_CLEAN) await cleanup();
  else log('跳过清理（--no-clean）');

  log('== 开始灌入演示数据 ==');
  const counts = await seed(me);
  log('本次创建:', JSON.stringify(counts));

  await report();
  log(`完成，耗时 ${((Date.now() - started) / 1000).toFixed(1)}s，失败 ${fails.length} 项`);
  if (fails.length) {
    console.log('--- 失败明细（前 20 条）---');
    fails.slice(0, 20).forEach((f) => console.log('  -', f));
  }
  process.exitCode = fails.length ? 1 : 0;
}

main().catch((e) => {
  console.error(`[${new Date().toISOString()}] 执行失败:`, e.message);
  process.exit(1);
});
