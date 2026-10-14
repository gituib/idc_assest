/**
 * IPAM 核心工具模块 —— IPv4 / IPv6 双栈
 * 提供 CIDR 解析、IP 转换、网段范围计算等纯函数工具
 * 无副作用，无数据库依赖
 */

// =====================================================================
//  IPv4 工具（原有逻辑不变）
// =====================================================================

/**
 * IP 地址字符串 → 32 位整数
 */
function ip4ToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`无效的 IPv4 地址: ${ip}`);
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * 32 位整数 → IPv4 地址字符串
 */
function intToIp4(int) {
  int = int >>> 0;
  return [
    (int >>> 24) & 0xff,
    (int >>> 16) & 0xff,
    (int >>> 8) & 0xff,
    int & 0xff,
  ].join('.');
}

/**
 * 前缀长度 → 子网掩码字符串
 */
function prefixToNetmask4(prefixLength) {
  const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
  return intToIp4(mask);
}

/**
 * 校验 IPv4 CIDR
 */
function validateIPv4Cidr(cidr) {
  if (!cidr || typeof cidr !== 'string') {
    return { valid: false, error: 'CIDR 不能为空' };
  }
  const match = cidr.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
  if (!match) {
    return { valid: false, error: 'CIDR 格式错误' };
  }
  try {
    ip4ToInt(match[1]);
  } catch (e) {
    return { valid: false, error: `IP 地址无效: ${match[1]}` };
  }
  const prefix = parseInt(match[2], 10);
  if (prefix < 8 || prefix > 32) {
    return { valid: false, error: 'IPv4 前缀长度必须在 8~32 之间' };
  }
  return { valid: true };
}

/**
 * 解析 IPv4 CIDR
 */
function parseIPv4Cidr(cidr) {
  const validation = validateIPv4Cidr(cidr);
  if (!validation.valid) throw new Error(validation.error);

  const [ipStr, prefixStr] = cidr.split('/');
  const prefixLength = parseInt(prefixStr, 10);
  const ipInt = ip4ToInt(ipStr);
  const mask = (0xffffffff << (32 - prefixLength)) >>> 0;

  const networkInt = (ipInt & mask) >>> 0;
  const broadcastInt = (networkInt | (~mask >>> 0)) >>> 0;

  const totalHosts = broadcastInt - networkInt + 1;
  const usableHosts = totalHosts >= 2 && prefixLength < 31 ? totalHosts - 2 : totalHosts;

  return {
    ipVersion: 'ipv4',
    cidr,
    networkAddress: intToIp4(networkInt),
    broadcastAddress: intToIp4(broadcastInt),
    netmask: prefixToNetmask4(prefixLength),
    prefixLength,
    totalHosts,
    usableHosts,
    totalHostsStr: String(totalHosts),
    usableHostsStr: String(usableHosts),
    firstUsable: totalHosts >= 2 ? intToIp4(networkInt + 1) : intToIp4(networkInt),
    lastUsable: totalHosts >= 2 ? intToIp4(broadcastInt - 1) : intToIp4(broadcastInt),
    startInt: String(networkInt),
    endInt: String(broadcastInt),
  };
}

// =====================================================================
//  IPv6 工具（新增）
// =====================================================================

/**
 * 判断 IP/CIDR 是 IPv4 还是 IPv6
 * @param {string} input - IP 地址或 CIDR
 * @returns {'ipv4' | 'ipv6'}
 */
function detectIpVersion(input) {
  if (!input) return 'ipv4';
  const stripped = input.split('/')[0]; // 去掉前缀
  // IPv6 特征：包含冒号，且不是 IPv4-mapped
  if (stripped.includes(':') && !stripped.includes('.')) {
    return 'ipv6';
  }
  // IPv4-mapped IPv6 如 ::ffff:192.168.1.1 按 IPv4 处理
  if (stripped.includes(':') && stripped.includes('.')) {
    return 'ipv6'; // 统一按 IPv6 处理
  }
  return 'ipv4';
}

/**
 * 规范化 IPv6 地址：展开为 8 段完整格式
 * 支持压缩格式 ::、混合格式、IPv4-mapped
 */
function expandIPv6(ip) {
  if (!ip) throw new Error('IPv6 地址为空');

  // 处理 ::
  if (ip.includes('::')) {
    const parts = ip.split('::');
    if (parts.length > 2) throw new Error(`无效的 IPv6 地址（多个 ::）: ${ip}`);

    const left = parts[0] ? parts[0].split(':') : [];
    let right = parts[1] ? parts[1].split(':') : [];

    // 处理 IPv4-mapped 后缀 ::ffff:192.168.1.1
    if (right.length > 0 && right[right.length - 1].includes('.')) {
      const v4parts = right.pop().split('.').map(Number);
      if (v4parts.length !== 4 || v4parts.some(p => isNaN(p) || p < 0 || p > 255)) {
        throw new Error(`无效的 IPv4 后缀: ${ip}`);
      }
      right.push(((v4parts[0] << 8) | v4parts[1]).toString(16));
      right.push(((v4parts[2] << 8) | v4parts[3]).toString(16));
    }

    const missing = 8 - left.length - right.length;
    if (missing < 0) throw new Error(`无效的 IPv6 地址（段数过多）: ${ip}`);

    const full = [...left, ...Array(missing).fill('0'), ...right];
    return full.map(h => h.padStart(4, '0'));
  }

  // 无 ::
  let segments = ip.split(':');
  if (segments.length !== 8) {
    // 可能是 IPv4-mapped 完整写法
    if (segments.length === 7 && segments[6].includes('.')) {
      const v4parts = segments.pop().split('.').map(Number);
      if (v4parts.length !== 4) throw new Error(`无效的 IPv4 后缀: ${ip}`);
      segments.push(((v4parts[0] << 8) | v4parts[1]).toString(16));
      segments.push(((v4parts[2] << 8) | v4parts[3]).toString(16));
    }
    if (segments.length !== 8) throw new Error(`无效的 IPv6 地址（需要 8 段）: ${ip}`);
  }

  // 每段 0~ffff
  for (const seg of segments) {
    const v = parseInt(seg, 16);
    if (isNaN(v) || v < 0 || v > 0xffff) {
      throw new Error(`无效的 IPv6 段: ${seg}`);
    }
  }
  return segments.map(h => h.padStart(4, '0'));
}

/**
 * 将完整 8 段 IPv6 压缩为最短格式
 */
function compressIPv6(expanded) {
  if (Array.isArray(expanded)) {
    expanded = expanded.join(':');
  }

  const segments = expanded.split(':').map(s => {
    const n = parseInt(s, 16);
    return n.toString(16); // 去前导零
  });

  // 找出最长连续零段
  let maxRun = 0, startIdx = -1, curRun = 0, curStart = -1;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i] === '0') {
      if (curRun === 0) { curStart = i; }
      curRun++;
      if (curRun > maxRun) {
        maxRun = curRun;
        startIdx = curStart;
      }
    } else {
      curRun = 0;
    }
  }

  if (maxRun >= 2) {
    const before = segments.slice(0, startIdx).join(':');
    const after = segments.slice(startIdx + maxRun).join(':');
    return `${before}::${after}`;
  }
  return segments.join(':');
}

/**
 * IPv6 地址 → BigInt（128 位）
 */
function ipv6ToBigInt(ip) {
  const expanded = expandIPv6(ip);
  let result = 0n;
  for (const seg of expanded) {
    result = (result << 16n) | BigInt(parseInt(seg, 16));
  }
  return result;
}

/**
 * BigInt → 压缩格式 IPv6
 */
function bigIntToIpv6(bigint) {
  let val = BigInt(bigint);
  const segments = [];
  for (let i = 0; i < 8; i++) {
    segments.unshift(val & 0xffffn);
    val = val >> 16n;
  }
  return compressIPv6(segments.map(s => s.toString(16).padStart(4, '0')).join(':'));
}

/**
 * 校验 IPv6 CIDR
 */
function validateIPv6Cidr(cidr) {
  if (!cidr || typeof cidr !== 'string') {
    return { valid: false, error: 'CIDR 不能为空' };
  }
  const parts = cidr.split('/');
  if (parts.length !== 2) {
    return { valid: false, error: 'CIDR 格式错误，应为 address/prefix' };
  }
  const [ipStr, prefixStr] = parts;

  try {
    expandIPv6(ipStr);
  } catch (e) {
    return { valid: false, error: `IPv6 地址无效: ${e.message}` };
  }

  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 128) {
    return { valid: false, error: 'IPv6 前缀长度必须在 0~128 之间' };
  }
  return { valid: true };
}

/**
 * 解析 IPv6 CIDR
 */
function parseIPv6Cidr(cidr) {
  const validation = validateIPv6Cidr(cidr);
  if (!validation.valid) throw new Error(validation.error);

  const [ipStr, prefixStr] = cidr.split('/');
  const prefixLength = parseInt(prefixStr, 10);
  const ipBig = ipv6ToBigInt(ipStr);

  // 掩码
  const allOnes = (1n << 128n) - 1n;
  const mask = prefixLength === 0 ? 0n : allOnes << BigInt(128 - prefixLength);

  const networkBig = ipBig & mask;
  const broadcastBig = prefixLength === 128 ? networkBig : networkBig | (~mask & allOnes);

  // 主机数（用字符串避免精度丢失）
  const totalHostsStr = prefixLength === 0
    ? '340282366920938463463374607431768211456' // 2^128
    : String(1n << BigInt(128 - prefixLength));

  const totalHosts = BigInt(totalHostsStr);
  // IPv6 没有广播/网络地址概念，usable = total
  const usableHosts = totalHosts;

  return {
    ipVersion: 'ipv6',
    cidr,
    networkAddress: bigIntToIpv6(networkBig),
    broadcastAddress: bigIntToIpv6(broadcastBig),
    netmask: null,
    prefixLength,
    totalHosts: 0, // IPv6 超大数不返回 JS number
    usableHosts: 0,
    totalHostsStr,
    usableHostsStr: totalHostsStr,
    firstUsable: bigIntToIpv6(networkBig),
    lastUsable: prefixLength === 128
      ? bigIntToIpv6(networkBig)
      : bigIntToIpv6(broadcastBig),
    startInt: networkBig.toString(),  // DECIMAL 用字符串
    endInt: broadcastBig.toString(),   // DECIMAL 用字符串
  };
}

// =====================================================================
//  统一入口（自动分派 v4/v6）
// =====================================================================

/**
 * 统一解析 CIDR，自动识别 v4/v6
 */
function parseCidr(cidr) {
  const version = detectIpVersion(cidr);
  return version === 'ipv6' ? parseIPv6Cidr(cidr) : parseIPv4Cidr(cidr);
}

/**
 * 校验 CIDR 合法性
 */
function validateCidr(cidr) {
  const version = detectIpVersion(cidr);
  return version === 'ipv6' ? validateIPv6Cidr(cidr) : validateIPv4Cidr(cidr);
}

/**
 * CIDR → 可用主机数（字符串，处理 IPv6 超大数）
 */
function getTotalHosts(cidr) {
  const parsed = parseCidr(cidr);
  return parsed.totalHostsStr || String(parsed.totalHosts);
}

// =====================================================================
//  重叠检测 / 包含判断（v4/v6 统一用 BigInt 范围比较）
// =====================================================================

/**
 * 判断 IP 是否在 CIDR 内（v4/v6 统一）
 */
function ipInSubnet(ip, cidr) {
  const subnet = parseCidr(cidr);
  const version = detectIpVersion(ip);

  if (version !== subnet.ipVersion) return false;

  const ipBig = version === 'ipv6'
    ? ipv6ToBigInt(ip)
    : BigInt(ip4ToInt(ip));

  const start = BigInt(subnet.startInt);
  const end = BigInt(subnet.endInt);
  return ipBig >= start && ipBig <= end;
}

/**
 * 判断两个 CIDR 是否重叠/包含（统一用 BigInt 比较）
 */
function subnetsOverlap(cidrA, cidrB) {
  const a = parseCidr(cidrA);
  const b = parseCidr(cidrB);

  // 不同版本不可能重叠
  if (a.ipVersion !== b.ipVersion) {
    return { overlap: false, containment: 'none' };
  }

  const aStart = BigInt(a.startInt);
  const aEnd = BigInt(a.endInt);
  const bStart = BigInt(b.startInt);
  const bEnd = BigInt(b.endInt);

  if (aStart === bStart && aEnd === bEnd) {
    return { overlap: true, containment: 'A_equals_B' };
  }
  if (aStart >= bStart && aEnd <= bEnd) {
    return { overlap: true, containment: 'A_in_B' };
  }
  if (bStart >= aStart && bEnd <= aEnd) {
    return { overlap: true, containment: 'B_in_A' };
  }
  if (aStart <= bEnd && aEnd >= bStart) {
    return { overlap: true, containment: 'partial' };
  }
  return { overlap: false, containment: 'none' };
}

// =====================================================================
//  IP 范围生成（仅 IPv4，IPv6 不预生成）
// =====================================================================

/**
 * 生成 CIDR 可用 IP 列表
 * - IPv4：排除网络/广播地址（/31 /32 除外）
 * - IPv6：prefix >= 120 才生成（/120 = 256 地址，/128 = 1 地址）
 *   硬上限 MAX_GENERATE_COUNT 防止超大网段爆内存
 */
function generateIpRange(cidr) {
  const parsed = parseCidr(cidr);

  // IPv6 网段大于 /120 不自动生成
  if (parsed.ipVersion === 'ipv6' && parsed.prefixLength < 120) {
    return [];
  }

  // IPv6 硬上限：防止超大 IPv6 网段爆内存（IPv4 /16 起最多 65536，不用限）
  let totalHostsBig;
  if (parsed.ipVersion === 'ipv6') {
    totalHostsBig = BigInt(parsed.totalHostsStr);
    const MAX_IPV6_GENERATE = 4096;
    if (totalHostsBig > BigInt(MAX_IPV6_GENERATE)) {
      return [];
    }
  } else {
    totalHostsBig = BigInt(parsed.totalHosts);
  }

  const result = [];
  const start = BigInt(parsed.startInt);
  const total = Number(totalHostsBig);

  if (parsed.ipVersion === 'ipv6') {
    // IPv6 不排除网络/广播地址（IPv6 无此概念）
    for (let i = 0; i < total; i++) {
      const int = start + BigInt(i);
      result.push({ ip: bigIntToIpv6(int), ipInt128: int.toString() });
    }
  } else {
    // IPv4：/31 /32 不减 2
    const skipEdges = parsed.prefixLength < 31 && total >= 2;
    for (let i = skipEdges ? 1 : 0; i < (skipEdges ? total - 1 : total); i++) {
      const int = start + BigInt(i);
      result.push({ ip: intToIp4(Number(int)), ipInt: Number(int), ipInt128: int.toString() });
    }
  }

  return result;
}

/**
 * 判断网段创建时是否自动生成 IP 记录
 * - IPv4：prefix >= 16（/16 = 65536 地址起）
 * - IPv6：prefix >= 120（/120 = 256 地址起）
 */
function shouldAutoGenerate(prefixLength, ipVersion = 'ipv4') {
  if (ipVersion === 'ipv6') return prefixLength >= 120;
  return prefixLength >= 16;
}

/**
 * 判断是否需要分批生成（IPv4 /16~/19 较大网段）
 * IPv6 不分批（能自动生成的都是小段，最多 256 个）
 */
function shouldBatchPaginate(prefixLength, ipVersion = 'ipv4') {
  if (ipVersion === 'ipv6') return false;
  return prefixLength >= 16 && prefixLength <= 19;
}

function paginateIpList(ipList, batchSize = 500) {
  const batches = [];
  for (let i = 0; i < ipList.length; i += batchSize) {
    batches.push(ipList.slice(i, i + batchSize));
  }
  return batches;
}

// =====================================================================
//  网关
// =====================================================================

function isGatewayInSubnet(gateway, cidr) {
  return ipInSubnet(gateway, cidr);
}

// =====================================================================
//  导出
// =====================================================================

module.exports = {
  // 版本检测
  detectIpVersion,

  // IPv4
  ip4ToInt,
  intToIp4,
  prefixToNetmask4,
  validateIPv4Cidr,
  parseIPv4Cidr,

  // IPv6
  expandIPv6,
  compressIPv6,
  ipv6ToBigInt,
  bigIntToIpv6,
  validateIPv6Cidr,
  parseIPv6Cidr,

  // 统一入口
  parseCidr,
  validateCidr,
  getTotalHosts,

  // 范围/重叠
  ipInSubnet,
  subnetsOverlap,

  // 生成
  generateIpRange,
  shouldAutoGenerate,
  shouldBatchPaginate,
  paginateIpList,

  // 网关
  isGatewayInSubnet,

  // 兼容旧名称
  ipToInt: ip4ToInt,
  intToIp: intToIp4,
  prefixToNetmask: prefixToNetmask4,
};
