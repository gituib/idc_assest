/**
 * 目标地址安全校验工具（SSRF / 内网探测防护）
 *
 * 策略（已拍板）：危险保留地址段无条件拒绝；RFC1918 私网与交换机 / 服务器 BMC
 * 管理地址默认放行 —— 本系统核心业务即访问内网设备，默认禁私网会直接中断采集。
 * 私网准入再由系统设置进一步收紧：
 *   - allow_intranet_collection（bool，默认 true）：关闭后拒绝所有私网目标
 *   - target_whitelist（CIDR 数组，为空表示不限）：非空时私网目标必须落在白名单内
 * 公网目标默认放行且不受白名单限制（避免中断公网备份等业务），危险段始终优先拒绝。
 *
 * 复用 utils/ipam.js 的 IP↔整数转换、CIDR 解析与网段包含判断，不另造实现；
 * 仅依赖 Node 内置 net / dns 与项目既有模块，零新增依赖。
 *
 * 同步收口点（如 createDriver）使用 assertTargetAllowedSync；
 * 异步收口点（需 DNS 解析 + 读系统设置）使用 assertTargetAllowed；
 * WebDAV / HTTP 类完整 URL 使用 assertAllowedUrl。
 */
const net = require('net');
const dnsPromises = require('dns').promises;
const ipam = require('./ipam');

/** 允许的目标协议白名单（scheme / protocol 一律小写比较） */
const ALLOWED_SCHEMES = Object.freeze([
  'http', 'https', 'ftp', 'ftps', 'sftp', 'ssh', 'snmp', 'telnet', 'smb', 'webdav',
]);

/** 协议默认端口：仅在未显式给出端口时用于审计记录，不强制绑定协议与端口 */
const DEFAULT_PORTS = Object.freeze({
  http: 80, https: 443, ftp: 21, ftps: 990, sftp: 22, ssh: 22,
  snmp: 161, telnet: 23, smb: 445, webdav: 80,
});

/** 默认策略：允许内网采集，白名单为空表示不限 */
const DEFAULT_POLICY = Object.freeze({ allowIntranet: true, whitelist: [] });

/** 系统设置键（沿用 SystemSetting findByPk → JSON.parse(settingValue) 模式） */
const SETTING_KEYS = Object.freeze({
  allowIntranet: 'allow_intranet_collection',
  whitelist: 'target_whitelist',
});

/** 策略缓存 TTL（毫秒）：避免批量探测时逐目标查库 */
const POLICY_CACHE_TTL_MS = 30 * 1000;

/**
 * 无条件拒绝的 IPv4 危险段（CIDR + 中文原因）
 * 224.0.0.0/4（组播）与 240.0.0.0/4 及以上保留段用「首字节 >= 224」统一覆盖，
 * 因为 ipam.validateIPv4Cidr 要求前缀长度 >= 8，/4 无法作为 CIDR 传入。
 */
const DANGER_IPV4_CIDRS = Object.freeze([
  ['0.0.0.0/8', '未指定 / 本机地址段'],
  ['127.0.0.0/8', '回环地址段'],
  ['169.254.0.0/16', '链路本地地址段（含 169.254.169.254 云元数据）'],
  ['100.64.0.0/10', '运营商级 NAT 保留段'],
  ['192.0.0.0/24', 'IANA 特殊用途段'],
  ['192.0.2.0/24', '文档示例保留段 TEST-NET-1'],
  ['198.18.0.0/15', '基准测试保留段'],
  ['198.51.100.0/24', '文档示例保留段 TEST-NET-2'],
  ['203.0.113.0/24', '文档示例保留段 TEST-NET-3'],
  ['255.255.255.255/32', '受限广播地址'],
]);

/** 无条件拒绝的 IPv6 危险段 */
const DANGER_IPV6_CIDRS = Object.freeze([
  ['::/128', '未指定地址'],
  ['::1/128', '回环地址'],
  ['fe80::/10', '链路本地地址段（IPv6 等价 169.254）'],
  ['fd00:ec2::254/128', '云元数据 IPv6 端点'],
]);

/** 主机名合法字符（字母、数字、点、连字符、冒号、IPv6 方括号） */
const HOST_SHAPE_RE = /^[A-Za-z0-9._:\[\]-]+$/;

/** 策略缓存（模块级） */
let cachedPolicy = null;
let cachedPolicyAt = 0;

/**
 * 目标校验失败专用错误，携带结构化 code 便于上层统一转 400
 */
class TargetBlockedError extends Error {
  /**
   * @param {string} message - 面向用户的中文提示（已脱敏，不含远端响应体）
   * @param {Object} [details]
   * @param {string} [details.code] - 机器可读错误码
   * @param {string} [details.host]
   * @param {number|null} [details.port]
   * @param {string|null} [details.protocol]
   * @param {string} [details.reason]
   */
  constructor(message, details = {}) {
    super(message);
    this.name = 'TargetBlockedError';
    this.code = details.code || 'TARGET_BLOCKED';
    this.host = details.host || null;
    this.port = details.port ?? null;
    this.protocol = details.protocol || null;
    this.reason = details.reason || '';
  }
}

/**
 * 全量审计留痕：记录目标校验决策
 * 延迟加载 logger，保证日志模块不可用或单测隔离环境下不影响校验结论。
 * @param {string} target - 目标 host 或 URL 标识（不要传含凭据的完整 URL）
 * @param {'allowed'|'blocked'|'deferred'|'fallback'} decision - 决策
 * @param {string} reason - 中文原因
 * @param {Object} [context] - 附加上下文（source / protocol / port / userId 等）
 */
function logTargetDecision(target, decision, reason, context = {}) {
  try {
    const logger = require('./logger').module('TargetGuard');
    const meta = { target, decision, reason, ...context };
    if (decision === 'blocked') {
      logger.warn('目标地址被拒绝', meta);
    } else if (decision === 'allowed') {
      logger.info('目标地址校验通过', meta);
    } else {
      logger.debug('目标地址校验决策', meta);
    }
  } catch (_) {
    // 日志不可用不应影响校验结论
  }
}

/**
 * 规范化协议名并校验白名单；空值返回 null（由调用方自行指定）
 * @param {string} [protocol]
 * @returns {string|null}
 * @throws {TargetBlockedError} 协议不在允许列表内
 */
function normalizeProtocol(protocol) {
  if (protocol === undefined || protocol === null || protocol === '') return null;
  const p = String(protocol).toLowerCase().replace(/:$/, '');
  if (!ALLOWED_SCHEMES.includes(p)) {
    throw new TargetBlockedError(`不支持的目标协议: ${protocol}`, {
      code: 'TARGET_SCHEME_DENIED', protocol: p, reason: `仅允许 ${ALLOWED_SCHEMES.join('/')}`,
    });
  }
  return p;
}

/**
 * 校验端口范围（1~65535）；未给出时返回协议默认端口或 null
 * @param {number|string} [port]
 * @param {string|null} [protocol]
 * @returns {number|null}
 * @throws {TargetBlockedError} 端口非法
 */
function normalizePort(port, protocol) {
  if (port === undefined || port === null || port === '') {
    return DEFAULT_PORTS[protocol] ?? null;
  }
  const n = Number(port);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new TargetBlockedError(`目标端口非法: ${port}`, {
      code: 'TARGET_PORT_INVALID', port, protocol, reason: '端口必须是 1~65535 的整数',
    });
  }
  return n;
}

/**
 * 提取 IPv4-mapped IPv6（::ffff:a.b.c.d / ::ffff:hhhh:hhhh）中的 IPv4
 * @param {string} ip
 * @returns {string|null}
 */
function extractMappedIpv4(ip) {
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (dotted && net.isIP(dotted[1]) === 4) return dotted[1];
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(ip);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return null;
}

/**
 * 判定单个 IP 字面量的安全分区
 * @param {string} ip
 * @returns {{zone:'danger'|'private'|'public'|'invalid', reason:string}}
 */
function classifyIp(ip) {
  const version = net.isIP(ip);
  if (version === 0) return { zone: 'invalid', reason: '不是合法 IP 字面量' };

  if (version === 4) {
    const firstOctet = Number(ip.split('.')[0]);
    if (firstOctet >= 224) {
      return { zone: 'danger', reason: 'IPv4 组播 / 保留地址段（224.0.0.0/4 及以上）' };
    }
    for (const [cidr, reason] of DANGER_IPV4_CIDRS) {
      if (ipam.ipInSubnet(ip, cidr)) return { zone: 'danger', reason };
    }
    if (ipam.ipInSubnet(ip, '10.0.0.0/8')
      || ipam.ipInSubnet(ip, '172.16.0.0/12')
      || ipam.ipInSubnet(ip, '192.168.0.0/16')) {
      return { zone: 'private', reason: 'RFC1918 私网地址' };
    }
    return { zone: 'public', reason: '公网地址' };
  }

  const mapped = extractMappedIpv4(ip);
  if (mapped) return classifyIp(mapped);
  for (const [cidr, reason] of DANGER_IPV6_CIDRS) {
    if (ipam.ipInSubnet(ip, cidr)) return { zone: 'danger', reason };
  }
  if (ipam.ipInSubnet(ip, 'fc00::/7')) {
    return { zone: 'private', reason: 'IPv6 唯一本地地址（ULA）' };
  }
  if (ipam.ipInSubnet(ip, '2000::/3')) {
    return { zone: 'public', reason: 'IPv6 全球单播地址' };
  }
  // 其余非公网 IPv6 段按私网管理（受开关约束，默认放行）
  return { zone: 'private', reason: '其他非公网 IPv6 地址' };
}

/**
 * 纯函数：IP 是否属于私网 / 内网
 * @param {string} ip
 * @returns {boolean}
 */
function isPrivateIp(ip) {
  return classifyIp(ip).zone === 'private';
}

/**
 * 纯函数：IP 字面量是否命中「无条件拒绝」的危险段
 * 非 IP 字面量（域名 / 非法字符串）返回 false，由 assertTargetAllowed 异步解析后判定。
 * @param {string} host
 * @returns {boolean}
 */
function isBlockedTarget(host) {
  if (typeof host !== 'string') return false;
  const ip = host.trim();
  if (net.isIP(ip) === 0) return false;
  return classifyIp(ip).zone === 'danger';
}

/**
 * 判断 IP 是否落在白名单内；白名单为空表示不限
 * @param {string} ip
 * @param {string[]} whitelist - CIDR 数组
 * @returns {boolean}
 */
function isInWhitelist(ip, whitelist) {
  if (!Array.isArray(whitelist) || whitelist.length === 0) return true;
  for (const cidr of whitelist) {
    if (typeof cidr !== 'string' || !ipam.validateCidr(cidr).valid) continue;
    try {
      if (ipam.ipInSubnet(ip, cidr)) return true;
    } catch (_) {
      // 单个非法网段跳过，不影响其余判断
    }
  }
  return false;
}

/**
 * 对单个 IP 应用策略，返回是否允许及原因
 * @param {string} ip
 * @param {{allowIntranet:boolean, whitelist:string[]}} policy
 * @returns {{allowed:boolean, zone:string, code?:string, reason:string}}
 */
function judgeIp(ip, policy) {
  const cls = classifyIp(ip);
  if (cls.zone === 'danger' || cls.zone === 'invalid') {
    return {
      allowed: false, zone: cls.zone,
      code: cls.zone === 'danger' ? 'TARGET_DANGER_ZONE' : 'TARGET_IP_INVALID',
      reason: cls.reason,
    };
  }
  if (cls.zone === 'private') {
    if (policy.allowIntranet === false) {
      return { allowed: false, zone: cls.zone, code: 'INTRANET_DISABLED', reason: '内网采集开关已关闭' };
    }
    if (!isInWhitelist(ip, policy.whitelist)) {
      return { allowed: false, zone: cls.zone, code: 'NOT_IN_WHITELIST', reason: '目标不在网段白名单内' };
    }
    return { allowed: true, zone: cls.zone, reason: '私网目标，默认放行' };
  }
  return { allowed: true, zone: cls.zone, reason: '公网目标，默认放行' };
}

/**
 * 读取缓存策略（同步，不触碰数据库）；未加载过时返回默认策略
 * @returns {{allowIntranet:boolean, whitelist:string[]}}
 */
function getCachedPolicy() {
  return cachedPolicy
    ? { allowIntranet: cachedPolicy.allowIntranet, whitelist: [...cachedPolicy.whitelist] }
    : { allowIntranet: DEFAULT_POLICY.allowIntranet, whitelist: [] };
}

/**
 * 异步读取系统设置中的目标策略，沿用 SystemSetting.findByPk → JSON.parse(settingValue)
 * 模式，读取侧做 { ...DEFAULT, ...saved } 兜底（参考 ipam.js getProbeConfig）。
 * 带 TTL 缓存；设置项未注册 / 数据库不可用时回退默认策略，不阻断业务。
 * @returns {Promise<{allowIntranet:boolean, whitelist:string[]}>}
 */
async function getTargetPolicy() {
  const now = Date.now();
  if (cachedPolicy && now - cachedPolicyAt < POLICY_CACHE_TTL_MS) {
    return getCachedPolicy();
  }
  let allowIntranet = DEFAULT_POLICY.allowIntranet;
  let whitelist = [];
  try {
    // 延迟加载：调用方显式传入 policy 或数据库不可用时不会触碰数据库模块
    const SystemSetting = require('../models/SystemSetting');
    const [allowSetting, whitelistSetting] = await Promise.all([
      SystemSetting.findByPk(SETTING_KEYS.allowIntranet),
      SystemSetting.findByPk(SETTING_KEYS.whitelist),
    ]);
    if (allowSetting && allowSetting.settingValue != null) {
      const parsed = JSON.parse(allowSetting.settingValue);
      if (typeof parsed === 'boolean') allowIntranet = parsed;
    }
    if (whitelistSetting && whitelistSetting.settingValue != null) {
      const parsed = JSON.parse(whitelistSetting.settingValue);
      if (Array.isArray(parsed)) {
        whitelist = parsed.filter(c => typeof c === 'string' && ipam.validateCidr(c).valid);
      }
    }
  } catch (err) {
    logTargetDecision('(policy)', 'fallback', `读取目标策略失败，回退默认值：${err.message}`, {});
    allowIntranet = DEFAULT_POLICY.allowIntranet;
    whitelist = [];
  }
  cachedPolicy = { allowIntranet, whitelist };
  cachedPolicyAt = now;
  return getCachedPolicy();
}

/**
 * 清空策略缓存（系统设置变更后即时生效 / 单测使用）
 */
function clearPolicyCache() {
  cachedPolicy = null;
  cachedPolicyAt = 0;
}

/**
 * host 形状校验（同步 / 异步入口共用）：拒绝空值、非法字符、形似 IP 但非法的字符串
 * @param {string} rawHost
 * @param {number|null} port
 * @param {string|null} protocol
 * @param {Object} context - 审计上下文
 * @throws {TargetBlockedError}
 */
function assertHostShape(rawHost, port, protocol, context) {
  if (!rawHost) {
    logTargetDecision('(empty)', 'blocked', '目标主机为空', { ...context, protocol, port });
    throw new TargetBlockedError('目标主机不能为空', { code: 'TARGET_HOST_EMPTY', port, protocol, reason: '未提供目标主机' });
  }
  if (!HOST_SHAPE_RE.test(rawHost) || rawHost.length > 253) {
    logTargetDecision(rawHost, 'blocked', '主机名含非法字符或过长', { ...context, protocol, port });
    throw new TargetBlockedError(`目标主机格式非法: ${rawHost}`, {
      code: 'TARGET_HOST_INVALID', host: rawHost, port, protocol, reason: '主机名含非法字符或过长',
    });
  }
  if (net.isIP(rawHost) === 0) {
    // 纯数字点分串却不是合法 IPv4：拒绝，避免被当作域名蒙混过关
    if (/^[\d.]+$/.test(rawHost)) {
      logTargetDecision(rawHost, 'blocked', '形似 IP 但格式非法', { ...context, protocol, port });
      throw new TargetBlockedError(`目标 IP 格式非法: ${rawHost}`, {
        code: 'TARGET_IP_INVALID', host: rawHost, port, protocol, reason: 'IP 地址格式非法',
      });
    }
    // 含冒号却不是合法 IPv6（域名不会含冒号）：拒绝
    if (rawHost.includes(':') && !/^\[.+\]$/.test(rawHost)) {
      logTargetDecision(rawHost, 'blocked', '形似 IPv6 但格式非法', { ...context, protocol, port });
      throw new TargetBlockedError(`目标 IPv6 格式非法: ${rawHost}`, {
        code: 'TARGET_IP_INVALID', host: rawHost, port, protocol, reason: 'IPv6 地址格式非法',
      });
    }
  }
}

/**
 * 汇总 IP 字面量的判定结果：记录审计并按结论放行 / 抛错
 * @param {string} rawHost
 * @param {number|null} port
 * @param {string|null} protocol
 * @param {{allowed:boolean, zone:string, code?:string, reason:string}} decision
 * @param {Object} context
 * @returns {{host:string, port:number|null, protocol:string|null, resolvedIps:string[], zone:string}}
 * @throws {TargetBlockedError}
 */
function finishIpDecision(rawHost, port, protocol, decision, context) {
  if (!decision.allowed) {
    logTargetDecision(rawHost, 'blocked', decision.reason, {
      ...context, protocol, port, code: decision.code,
    });
    throw new TargetBlockedError(`目标地址被拒绝：${decision.reason}（${rawHost}）`, {
      code: decision.code, host: rawHost, port, protocol, reason: decision.reason,
    });
  }
  logTargetDecision(rawHost, 'allowed', decision.reason, {
    ...context, protocol, port, zone: decision.zone,
  });
  return { host: rawHost, port, protocol, resolvedIps: [rawHost], zone: decision.zone };
}

/**
 * 同步校验目标（供 createDriver 等同步收口点使用）
 * - IP 字面量：完整判定危险段 + 策略（开关 / 白名单）
 * - 域名：仅做形状校验，IP 判定留待异步 assertTargetAllowed 复核（记录 deferred）
 * @param {string} host
 * @param {number|string} [port]
 * @param {string} [protocol]
 * @param {Object} [options] - 可直接传 policy（{allowIntranet, whitelist}），
 *                            也可传 { policy, source, userId }
 * @param {{allowIntranet:boolean, whitelist:string[]}} [options.policy] - 不传则使用缓存策略
 * @param {string} [options.source] - 目标来源标记（request / config / scheduler / sync）
 * @param {*} [options.userId] - 审计用操作者
 * @returns {{host:string, port:number|null, protocol:string|null, resolvedIps:string[], zone:string}}
 * @throws {TargetBlockedError}
 */
function assertTargetAllowedSync(host, port, protocol, options = {}) {
  // 兼容「直接传 policy」与「传 options 对象」两种调用形式
  const isPolicyShape = typeof options.allowIntranet === 'boolean' || Array.isArray(options.whitelist);
  const normalized = isPolicyShape ? { policy: options } : options;
  const effectivePolicy = normalized.policy || getCachedPolicy();
  const ctx = { source: normalized.source || 'sync', userId: normalized.userId ?? null };
  const proto = normalizeProtocol(protocol);
  const normalizedPort = normalizePort(port, proto);
  const rawHost = typeof host === 'string' ? host.trim() : '';
  assertHostShape(rawHost, normalizedPort, proto, ctx);

  if (net.isIP(rawHost) === 0) {
    logTargetDecision(rawHost, 'deferred', '域名目标需异步解析后复核', {
      ...ctx, protocol: proto, port: normalizedPort,
    });
    return { host: rawHost, port: normalizedPort, protocol: proto, resolvedIps: [], zone: 'domain' };
  }
  return finishIpDecision(rawHost, normalizedPort, proto, judgeIp(rawHost, effectivePolicy), ctx);
}

/**
 * 异步完整校验目标（推荐主入口）
 * - IP 字面量：同步判定危险段 + 策略
 * - 域名：dns.lookup(host, {all:true, verbatim:true}) 解析所有 A/AAAA 记录逐一判定，
 *   任一命中危险段 / 策略拒绝即整体拒绝（防 DNS rebinding 多记录绕过）；
 *   返回 resolvedIps 供调用方在连接层固定 IP 使用。
 * @param {string} host
 * @param {number|string} [port]
 * @param {string} [protocol]
 * @param {Object} [options]
 * @param {{allowIntranet:boolean, whitelist:string[]}} [options.policy] - 显式策略（单测 / 批量场景绕过查库）
 * @param {string} [options.source] - 目标来源标记（request / config / scheduler）
 * @param {*} [options.userId] - 审计用操作者
 * @returns {Promise<{host:string, port:number|null, protocol:string|null, resolvedIps:string[], zone:string}>}
 * @throws {TargetBlockedError}
 */
async function assertTargetAllowed(host, port, protocol, options = {}) {
  const policy = options.policy || await getTargetPolicy();
  const ctx = { source: options.source || 'internal', userId: options.userId ?? null };
  const proto = normalizeProtocol(protocol);
  const normalizedPort = normalizePort(port, proto);
  const rawHost = typeof host === 'string' ? host.trim() : '';
  assertHostShape(rawHost, normalizedPort, proto, ctx);

  if (net.isIP(rawHost) !== 0) {
    return finishIpDecision(rawHost, normalizedPort, proto, judgeIp(rawHost, policy), ctx);
  }

  // 域名：解析所有 A/AAAA 记录，逐一判定
  let addresses = [];
  try {
    const records = await dnsPromises.lookup(rawHost, { all: true, verbatim: true });
    addresses = (Array.isArray(records) ? records : [records])
      .map(r => (typeof r === 'string' ? r : r.address))
      .filter(a => typeof a === 'string' && net.isIP(a) !== 0);
  } catch (err) {
    logTargetDecision(rawHost, 'blocked', `域名解析失败：${err.message}`, {
      ...ctx, protocol: proto, port: normalizedPort,
    });
    throw new TargetBlockedError(`目标域名解析失败：${rawHost}`, {
      code: 'TARGET_DNS_FAILED', host: rawHost, port: normalizedPort, protocol: proto,
      reason: `域名解析失败：${err.message}`,
    });
  }
  addresses = [...new Set(addresses)];
  if (addresses.length === 0) {
    logTargetDecision(rawHost, 'blocked', '域名未解析出任何 IP', {
      ...ctx, protocol: proto, port: normalizedPort,
    });
    throw new TargetBlockedError(`目标域名未解析出任何 IP：${rawHost}`, {
      code: 'TARGET_DNS_EMPTY', host: rawHost, port: normalizedPort, protocol: proto,
      reason: '域名未解析出任何 IP',
    });
  }
  for (const ip of addresses) {
    const decision = judgeIp(ip, policy);
    if (!decision.allowed) {
      logTargetDecision(rawHost, 'blocked', `解析到受限地址 ${ip}：${decision.reason}`, {
        ...ctx, protocol: proto, port: normalizedPort, code: decision.code,
      });
      throw new TargetBlockedError(`目标域名 ${rawHost} 解析到受限地址，已拒绝：${decision.reason}`, {
        code: decision.code, host: rawHost, port: normalizedPort, protocol: proto, reason: decision.reason,
      });
    }
  }
  logTargetDecision(rawHost, 'allowed', `域名解析到 ${addresses.length} 个地址，全部通过校验`, {
    ...ctx, protocol: proto, port: normalizedPort,
  });
  return { host: rawHost, port: normalizedPort, protocol: proto, resolvedIps: addresses, zone: 'domain' };
}

/**
 * 校验完整 URL（WebDAV / HTTP 类目标）
 * 先 new URL() 解析，拒绝 file:/gopher:/dict: 等危险 scheme，再走 assertTargetAllowed。
 * @param {string} url
 * @param {string[]} [allowedSchemes] - 允许的 URL scheme，默认 ['http','https']
 * @param {Object} [options] - 透传给 assertTargetAllowed（policy / source / userId）
 * @returns {Promise<Object>} GuardResult 附加 { url, scheme, origin, pathname }
 * @throws {TargetBlockedError}
 */
async function assertAllowedUrl(url, allowedSchemes = ['http', 'https'], options = {}) {
  const rawUrl = typeof url === 'string' ? url.trim() : '';
  const source = options.source || 'internal';
  if (!rawUrl) {
    logTargetDecision('(empty)', 'blocked', '目标 URL 为空', { source });
    throw new TargetBlockedError('目标 URL 不能为空', { code: 'TARGET_URL_EMPTY', reason: '未提供目标 URL' });
  }
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    logTargetDecision('(invalid)', 'blocked', `目标 URL 格式非法：${err.message}`, { source });
    throw new TargetBlockedError(`目标 URL 格式非法：${rawUrl}`, {
      code: 'TARGET_URL_INVALID', reason: 'URL 解析失败',
    });
  }
  const scheme = parsed.protocol.replace(/:$/, '').toLowerCase();
  const allowList = (Array.isArray(allowedSchemes) && allowedSchemes.length > 0
    ? allowedSchemes : ['http', 'https']).map(s => String(s).toLowerCase().replace(/:$/, ''));
  if (!allowList.includes(scheme)) {
    logTargetDecision(parsed.origin || rawUrl, 'blocked', `URL 协议不被允许：${scheme}`, { source });
    throw new TargetBlockedError(`目标 URL 协议不被允许：${scheme}`, {
      code: 'TARGET_SCHEME_DENIED', protocol: scheme, reason: `仅允许 ${allowList.join('/')}`,
    });
  }
  // URL.hostname 对 IPv6 会带方括号，去掉后再交给 IP 判定
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  const port = parsed.port ? Number(parsed.port) : (DEFAULT_PORTS[scheme] ?? null);
  const result = await assertTargetAllowed(hostname, port, scheme, options);
  // 不把含 query / 凭据的完整 URL 写进审计日志，仅返回结构化信息供调用方按需使用
  return { ...result, url: rawUrl, scheme, origin: parsed.origin, pathname: parsed.pathname };
}

module.exports = {
  TargetBlockedError,
  assertTargetAllowed,
  assertTargetAllowedSync,
  isBlockedTarget,
  getTargetPolicy,
  getCachedPolicy,
  clearPolicyCache,
  assertAllowedUrl,
  logTargetDecision,
  // 常量与纯函数（供单测、审计及批次 C 的 backup.js 接入参考）
  ALLOWED_SCHEMES,
  DEFAULT_PORTS,
  DEFAULT_POLICY,
  SETTING_KEYS,
  DANGER_IPV4_CIDRS,
  DANGER_IPV6_CIDRS,
  classifyIp,
  isPrivateIp,
};
