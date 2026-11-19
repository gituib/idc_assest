/**
 * 服务器自动采集 - Redfish 驱动（协议级，厂商无关）
 *
 * 走 BMC 管理口的 Redfish REST API（HTTPS + Basic Auth），不依赖操作系统。
 * 采集内容：
 * - 硬件清单：厂商/型号/整机序列号/CPU/内存摘要/内存条列表/硬盘列表
 * - 网卡端口：EthernetInterfaces → 统一端口格式（对齐 DevicePort 字段）
 *
 * 兼容性说明：
 * - Dell iDRAC / HPE iLO / 华为 iBMC / 浪潮 / 超微现代 BMC 均支持；
 * - BMC 均为自签证书，统一关闭证书校验（rejectUnauthorized: false）；
 * - 子资源（Memory/Storage/EthernetInterfaces）读取失败不致命，逐项降级；
 * - 内存容量字段各厂商不一（SizeMiB / CapacityMiB），逐字段回退取值。
 */
const axios = require('axios');
const https = require('https');
const logger = require('../../../utils/logger').module('ServerDiscovery.Redfish');
const { assertTargetAllowed, TargetBlockedError } = require('../../../utils/targetGuard');
const { mapSpeed } = require('../../portDiscovery/mapper');

/** 厂商名（Redfish Manufacturer）→ 系统 vendor key，用于展示与记录 */
const MANUFACTURER_MAP = [
  { pattern: /dell|dell inc/i, vendor: 'dell' },
  { pattern: /hpe|hewlett/i, vendor: 'hpe' },
  { pattern: /huawei/i, vendor: 'huawei' },
  { pattern: /inspur|浪潮/i, vendor: 'inspur' },
  { pattern: /supermicro|super micro/i, vendor: 'supermicro' },
  { pattern: /lenovo/i, vendor: 'lenovo' },
  { pattern: /sugon|sugon/i, vendor: 'sugon' },
];

/**
 * 从 Manufacturer 字符串识别厂商 key
 * @param {string} manufacturer
 * @returns {string} vendor key（未识别返回 generic）
 */
function detectVendorFromManufacturer(manufacturer) {
  if (!manufacturer) return 'generic';
  for (const { pattern, vendor } of MANUFACTURER_MAP) {
    if (pattern.test(manufacturer)) return vendor;
  }
  return 'generic';
}

/**
 * 从多个候选字段中取第一个非空值
 * @param {Object} obj - Redfish 资源对象
 * @param {string[]} keys - 候选字段名（按优先级）
 * @returns {*} 第一个非 null/undefined 值
 */
function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

/**
 * 子资源采集失败时的错误增强：识别「BMC 未实现该 Redfish 资源」这类可诊断错误，
 * 给出面向用户的明确引导，避免只看到一串看不懂的 HTTP 400。
 *
 * 典型来源：戴尔 iDRAC8 等旧固件对 Memory/Storage/NetworkAdapters 等集合返回
 *   "failed: Request URI: /redfish/v1/.../Memory is invalid"（HTTP 400），
 *   表示此固件的 Redfish schema 根本没实现该资源——不是 URL 拼错，是 BMC 能力缺失。
 *
 * @param {string} label - 资源标签（Memory / Storage/DriveStores/SimpleStorage / NetworkAdapters）
 * @param {string|string[]} raw - 原始错误（可能含响应体）
 * @returns {string} 增强后的错误文案
 */
function enrichResourceError(label, raw) {
  const joined = Array.isArray(raw) ? raw.join('；') : String(raw || '');
  const isUnimplemented = /is invalid|not (found|supported|implemented)|unknown resource|does not (exist|support)|no such/i.test(joined);
  if (isUnimplemented) {
    return `${label}: 该 BMC 的 Redfish 未实现此资源（典型为 iDRAC8 等旧固件，固件版本过低）——${joined}。建议：① 升级 BMC 固件至支持完整 Redfish 的版本后重试；② 或在资产系统中手动录入该项。`;
  }
  return `${label}: ${joined}`;
}

/**
 * 硬盘标称容量吸附（GB）：Redfish CapacityBytes 是实际字节数（如 1.92TB），
 * 资产管理更贴近厂商标称容量（2TB），按最接近的标准档位吸附
 */
const DRIVE_CAPACITY_STEPS = [
  36, 72, 120, 146, 160, 180, 200, 240, 256, 300, 320, 400, 480, 500, 512,
  600, 800, 960, 1000, 2000, 4000, 6000, 8000, 12000, 14000, 16000, 20000, 24000, 30000, 32000,
];

/**
 * 容量字节数 → 标称容量（GB/TB，按 DRIVE_CAPACITY_STEPS 吸附）
 * @param {number} bytes
 * @returns {string|null}
 */
function formatCapacity(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return null;
  const gb = n / 1e9;
  let best = null;
  let bestDiff = Infinity;
  for (const step of DRIVE_CAPACITY_STEPS) {
    const diff = Math.abs(gb - step);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = step;
    }
  }
  if (best === null) return null;
  return best >= 1000 ? `${best / 1000}TB` : `${best}GB`;
}

/**
 * 解析 ComputerSystem 资源 → 硬件摘要
 * @param {Object} sys - Redfish ComputerSystem
 * @returns {Object}
 */
function parseSystem(sys) {
  return {
    manufacturer: pick(sys, ['Manufacturer']) || null,
    model: pick(sys, ['Model']) || null,
    serialNumber: pick(sys, ['SerialNumber']) || null,
    powerState: pick(sys, ['PowerState']) || null,
    cpu: {
      // pick 只支持同层取值，ProcessorSummary 是嵌套对象需显式取
      model: pick(sys?.ProcessorSummary, ['Model']) || null,
      count: pick(sys?.ProcessorSummary, ['Count']) || null,
    },
    memorySummary: {
      totalGiB: pick(sys?.MemorySummary, ['TotalSystemMemoryGiB']) || null,
    },
  };
}

/**
 * 解析内存条列表
 * @param {Array} members - Memory 集合的 Members（已展开为资源对象）
 * @returns {Array<{slot, size, manufacturer, partNumber, serialNumber}>}
 */
function parseMemoryModules(members) {
  const result = [];
  for (const m of members || []) {
    const sizeMiB = pick(m, ['SizeMiB', 'CapacityMiB']);
    const sizeGiB = sizeMiB ? Math.round(Number(sizeMiB) / 1024) : null;
    result.push({
      slot: pick(m, ['DeviceLocator', 'SocketLocator', 'Name']) || null,
      size: sizeGiB ? `${sizeGiB}GB` : null,
      manufacturer: pick(m, ['Manufacturer']) || null,
      partNumber: pick(m, ['PartNumber']) || null,
      serialNumber: pick(m, ['SerialNumber']) || null,
    });
  }
  return result;
}

/**
 * 解析硬盘列表（Storage 集合 → 各 Storage 的 Drives）
 * @param {Array} drives - 已展开的 Drive 资源对象
 * @returns {Array<{slot, model, size, mediaType, serialNumber}>}
 */
function parseDrives(drives) {
  const result = [];
  for (const d of drives || []) {
    result.push({
      slot: pick(d, ['Location', '1', 'Info']) || pick(d, ['Name', 'Id']) || null,
      model: pick(d, ['Model']) || null,
      size: formatCapacity(pick(d, ['CapacityBytes', 'CapacityLogicalBytes'])),
      mediaType: pick(d, ['MediaType']) || null,
      serialNumber: pick(d, ['SerialNumber']) || null,
    });
  }
  return result;
}

/**
 * 解析网卡接口 → 统一端口格式（对齐 DevicePort 字段）
 *
 * 说明：
 * - 部分 BMC（如浪潮 iBMC）的 EthernetInterfaces 不返回 SpeedMbps，
 *   此时端口速率无法从这里得知，只能兜底 1G —— 真实规格需由关联网卡的型号推导
 *   （见 applyAdapterSpec），故保留 bmcSpeedMbps 原始值便于诊断与来源判定；
 * - LinkStatus 各厂商实现不一，状态统一记 free，由人工确认实际占用
 *   （apply 时不会覆盖人工标注）。
 *
 * @param {Array} members - EthernetInterfaces 集合 Members（已展开）
 * @returns {Array<{portName, portType, portSpeed, bmcSpeedMbps, speedSource, status, description, macAddress}>}
 */
function parseEthernetPorts(members) {
  const result = [];
  for (const m of members || []) {
    // Id 比 Name 更稳定唯一（Name 常为 "Port 1" 通用名），端口名优先取 Id
    const portName = pick(m, ['Id', 'Name']) || null;
    if (!portName) continue;
    const speedMbps = Number(pick(m, ['SpeedMbps']));
    const hasSpeed = Number.isFinite(speedMbps) && speedMbps > 0;
    const gbps = hasSpeed ? speedMbps / 1000 : 1;
    const speed = hasSpeed ? mapSpeed(`${speedMbps}M`) : null;
    result.push({
      portName,
      portType: gbps >= 10 ? 'SFP+' : 'RJ45',
      portSpeed: speed || '1G',
      bmcSpeedMbps: hasSpeed ? speedMbps : null, // BMC 原始速率（无则 null）
      speedSource: hasSpeed ? 'bmc' : 'unknown', // unknown = BMC 未提供，待网卡推导
      status: 'free',
      description: null,
      macAddress: pick(m, ['MACAddress', 'PermanentMACAddress']) || null,
    });
  }
  return result;
}

/**
 * 端口速率档位排序值（用于比较协商速率与硬件标称速率）
 */
const SPEED_RANK = {
  '100M': 0.1, '1G': 1, '10G': 10, '25G': 25,
  '40G': 40, '50G': 50, '100G': 100, '200G': 200, '400G': 400, '800G': 800,
};

/**
 * 从网卡型号推导端口硬件规格（标称能力）
 *
 * 背景：部分 BMC 的 EthernetInterfaces 不提供 SpeedMbps（或协商未上时为空），
 * 此时端口会被兜底成 RJ45/1G，导致「X722 10GbE SFP+ 端口被标成电口千兆」这类错误。
 * 网卡型号是硬件标称能力最可靠的来源（BMC 网页「系统网络适配器」同样按型号标注）。
 *
 * @param {Object} adapter - parseNetworkAdapters 产出的网卡条目
 * @returns {{portType: string, portSpeed: string}|null} 推导不出时返回 null
 */
function inferAdapterSpec(adapter) {
  const model = String(adapter?.model || '').toLowerCase().trim();
  if (!model) return null;

  // 速率判定：必须从高到低匹配，避免 "100GbE/10GbE" 这类复合型号被 10GbE 规则截断。
// 注意 GbE 小写为 "gbe"，正则需同时兼容 gE / GbE / GBASE 三种写法
  let portSpeed = null;
  if (/100\s?g(b)?(e|ase)/.test(model)) portSpeed = '100G';
  else if (/50\s?g(b)?(e|ase)/.test(model)) portSpeed = '50G';
  else if (/40\s?g(b)?(e|ase)/.test(model)) portSpeed = '40G';
  else if (/25\s?g(b)?(e|ase)/.test(model)) portSpeed = '25G';
  else if (/10\s?g(b)?(e|ase)|\bsfp\+/.test(model)) portSpeed = '10G';
  else if (/gigabit|\bgb\b|1000base|\b1g\b/.test(model)) portSpeed = '1G';
  if (!portSpeed) return null;

  // 光电口判定：千兆一律电口；万兆及以上看是否铜口关键字（10GBASE-T / Cat 等）
  let portType;
  if (portSpeed === '1G') {
    portType = 'RJ45';
  } else {
    const isCopper = /base-?t\b|\bcopper\b|\bcat\s?[67]|\btwisted\b|\brj45\b/.test(model);
    if (portSpeed === '100G') portType = 'QSFP28';
    else if (portSpeed === '50G' || portSpeed === '40G') portType = 'QSFP+';
    else portType = isCopper ? 'RJ45' : 'SFP+';
  }
  return { portType, portSpeed };
}

/**
 * 用关联网卡的标称能力校正端口规格
 *
 * 规则（面向资产台账：应记录硬件能力，而非瞬时协商速率）：
 * - BMC 未报速率（speedSource=unknown，必然是兜底值）→ 用网卡标称
 * - BMC 报的协商速率低于网卡标称（未插模块/未协商上）→ 用网卡标称
 * - BMC 报的速率 ≥ 标称（如型号不含速度信息时的实际情况）→ 保留 BMC 值
 * - 无关联网卡或型号推不出规格 → 保持原值
 *
 * @param {Array} ports - mapPortsToAdapters 的输出（含 nicRef）
 * @param {Array} adapters - parseNetworkAdapters 的输出
 * @returns {Array} 校正后的端口列表
 */
function applyAdapterSpec(ports, adapters) {
  return (ports || []).map(p => {
    if (p.nicRef === null || p.nicRef === undefined) return p;
    const spec = inferAdapterSpec(adapters?.[Number(p.nicRef)]);
    if (!spec) return { ...p, speedSource: p.speedSource || 'bmc' };
    const nominal = SPEED_RANK[spec.portSpeed];
    const current = SPEED_RANK[p.portSpeed];
    if (p.bmcSpeedMbps === null || p.bmcSpeedMbps === undefined || current < nominal) {
      return {
        ...p,
        portType: spec.portType,
        portSpeed: spec.portSpeed,
        speedSource: 'adapter', // 来源：网卡型号标称
      };
    }
    return { ...p, speedSource: 'bmc' };
  });
}

/**
 * 解析网卡物理端口（NetworkAdapter.PhysicalPorts）
 * PhysicalPorts 通常为内联数组；仅给链接的已在采集阶段展开为数组
 * @param {Array} ports - 物理端口数组
 * @returns {Array<{name, macAddress, linkStatus}>}
 */
function parsePhysicalPorts(ports) {
  const result = [];
  for (const p of Array.isArray(ports) ? ports : []) {
    result.push({
      name: pick(p, ['Name', 'Id']) || null,
      macAddress: pick(p, ['MACAddress', 'PermanentMACAddress']) || null,
      linkStatus: pick(p, ['LinkStatus']) || null,
    });
  }
  return result;
}

/**
 * 解析网卡硬件列表（NetworkAdapter 资源）
 *
 * @param {Array} adapters - NetworkAdapters 集合 Members（已展开）
 *   其中 `__fns` 为采集阶段已展开的 NetworkDeviceFunctions（携带 MAC，用于端口关联）
 * @returns {Array<{index, id, manufacturer, model, serialNumber, partNumber, location, macs, ports}>}
 */
function parseNetworkAdapters(adapters) {
  const result = [];
  (adapters || []).forEach((a, i) => {
    const macs = (a?.__fns || [])
      .map(fn => fn?.MACAddress)
      .filter(Boolean);
    result.push({
      index: i, // 数组顺序作为网卡的稳定关联键（落库时映射为 NetworkCard）
      id: pick(a, ['Id']) || null,
      manufacturer: pick(a, ['Manufacturer']) || null,
      model: pick(a, ['Model']) || null,
      serialNumber: pick(a, ['SerialNumber']) || null,
      partNumber: pick(a, ['PartNumber']) || null,
      location: pick(a, ['Location', 'Socket']) || null,
      macs,
      ports: parsePhysicalPorts(a?.PhysicalPorts),
    });
  });
  return result;
}

/**
 * MAC 归一化：去掉分隔符并大写
 * 各厂商 MAC 格式不一（如浪潮返回末尾带冒号 "B4:05:5D:C3:D7:42:"），归一化后才能比较
 * @param {string} mac
 * @returns {string}
 */
function normalizeMac(mac) {
  return String(mac || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
}

/**
 * 从端口名解析网卡序号（仅认明确的网卡索引格式，避免误配）
 * 支持：OutboardNIC0Port0 / NIC0 / NIC_1
 * 不支持：NIC.Embedded.1-1-1（Embedded 后的数字是功能号非网卡号）、eth0、enp0s3
 * @param {string} portName
 * @returns {number|null}
 */
function extractNicIndex(portName) {
  if (!portName) return null;
  const m = /^(?:Outboard)?NIC[._]?(\d+)/i.exec(String(portName).trim());
  return m ? Number(m[1]) : null;
}

/**
 * 建立「端口 → 所属网卡」映射（资产落库需要 nicId 对应关系）
 *
 * 策略 1（优先）：MAC 精确匹配 —— 网卡的 NetworkDeviceFunctions MAC 与端口 MACAddress 相同，
 *                  这是最可靠的关联键（实测浪潮 BMC 网卡端口 MAC 与 EthernetInterfaces 完全一致）
 * 策略 2（回退）：端口名网卡序号匹配 —— `OutboardNIC0Port0` → 网卡 index 0（BMC 命名惯例）
 * 策略 3：都不中则 nicRef 为 null —— 不硬猜，避免落库错误关联
 *
 * @param {Array} ports - 统一端口列表（parseEthernetPorts / parseAdapterPort 产出）
 * @param {Array} adapters - parseNetworkAdapters 产出的网卡列表
 * @returns {Array} 附加 nicRef / nicModel / nicManufacturer / nicLocation / nicPortIndex 的端口
 */
function mapPortsToAdapters(ports, adapters) {
  const macToIndex = new Map();
  for (const ad of adapters || []) {
    for (const mac of ad.macs || []) {
      const key = normalizeMac(mac);
      if (key) macToIndex.set(key, ad.index);
    }
  }

  return (ports || []).map(p => {
    const byMac = p.macAddress ? macToIndex.get(normalizeMac(p.macAddress)) : undefined;
    const nameIdx = extractNicIndex(p.portName);
    const byName = nameIdx !== null && adapters && nameIdx < adapters.length ? nameIdx : undefined;
    const index = byMac !== undefined ? byMac : byName;
    const ad = index !== undefined && adapters ? adapters[index] : null;
    return {
      ...p,
      nicRef: ad ? String(ad.index) : null,
      nicModel: ad?.model || null,
      nicManufacturer: ad?.manufacturer || null,
      nicLocation: ad?.location || null,
    };
  });
}

/**
 * 生成子资源候选 URL 列表：System 优先，Chassis 回退
 * 部分厂商（如浪潮 iBMC）的 Storage / NetworkAdapters 不挂在 System 下，
 * 而挂在其 Links.Chassis 指向的 Chassis 资源下（Redfish 标准允许的关联方式）
 *
 * 注意：Memory / EthernetInterfaces 在 Redfish 标准中永远隶属于 ComputerSystem，
 * 绝不会出现在 Chassis 下。对它们探测 Chassis 只会得到恒为 400 的无效路径，
 * 既浪费请求又污染日志（与真正的 System 路径 400 混在一起，干扰根因判断），
 * 故由调用方显式关闭 Chassis 回退；Storage / NetworkAdapters 保留回退（兼顾浪潮）。
 *
 * @param {string} resourceName - 资源名（Memory / Storage / NetworkAdapters / EthernetInterfaces）
 * @param {string} sysLink - ComputerSystem 资源链接
 * @param {string[]} chassisLinks - Chassis 资源链接列表
 * @param {boolean} [probeChassis=true] - 是否追加 Chassis 候选（Memory/EthernetInterfaces 应传 false）
 * @returns {string[]} 候选 URL（按优先级）
 */
function buildResourceCandidates(resourceName, sysLink, chassisLinks, probeChassis = true) {
  const candidates = [`${sysLink}/${resourceName}`];
  if (!probeChassis) return candidates;
  for (const link of chassisLinks || []) {
    if (link && !candidates.includes(link + `/${resourceName}`)) {
      candidates.push(`${link}/${resourceName}`);
    }
  }
  return candidates;
}

/**
 * 解析 PCIe 网卡端口（NetworkAdapter / NetworkPort 资源）→ 统一端口格式
 *
 * 背景：PCIe 插卡网卡不在 EthernetInterfaces 里（那里主要是板载 LOM/OS 视角接口），
 * 而在 {system}/NetworkAdapters → NetworkPorts 资源树上，这是服务器网口的主要来源。
 *
 * 字段说明：
 * - 端口名优先 port.Id（Dell/华为的 Id 自带槽位信息如 "NIC.Slot.6-1-1"，全局唯一），
 *   回退 adapterId + PortId 拼接，保证跨网卡不重名（DevicePort 按 portName diff）
 * - 速率：CurrentLinkSpeedMbps（协商值，DOWN 时可能为空）→ SupportedLinkCapabilities 兜底，
 *   均无时记 '1G' 由人工修正（仅影响展示，落库默认 free）
 * - 状态：LinkUp → occupied（链路通），LinkDown/NoLink/未知 → free
 *   （apply 落库时仍强制 free 且跳过 status，不会覆盖人工标注，仅用于预览参考）
 *
 * @param {Object} port - Redfish NetworkPort 资源
 * @param {string} adapterId - 所属网卡适配器 Id（拼接兜底名用）
 * @param {string} [mac] - 关联 NetworkDeviceFunction 的 MAC（无则 null）
 * @returns {Object|null}
 */
function parseAdapterPort(port, adapterId, mac) {
  const portName = pick(port, ['Id'])
    || (adapterId && port?.PortId ? `${adapterId}-${port.PortId}` : null)
    || pick(port, ['PortId']);
  if (!portName) return null;
  const speedCandidates = [
    Number(port?.CurrentLinkSpeedMbps),
    Number(port?.SupportedLinkCapabilities?.[0]?.LinkSpeedMbps),
  ];
  const speedMbps = speedCandidates.find(v => Number.isFinite(v) && v > 0);
  const linkStatus = String(port?.LinkStatus || '').trim().toLowerCase();
  return {
    portName,
    portType: speedMbps >= 10000 ? 'SFP+' : 'RJ45',
    portSpeed: speedMbps ? (mapSpeed(`${speedMbps}M`) || '1G') : '1G',
    status: linkStatus === 'linkup' ? 'occupied' : 'free',
    description: null,
    macAddress: mac || pick(port, ['MACAddress', 'PermanentMACAddress']) || null,
  };
}

class RedfishDriver {
  constructor(credential) {
    this.credential = credential;
    this.vendor = 'redfish';
    this.client = null;
    this.systemUrl = null;
    this.baseURL = null;
    this.lastRawOutput = '';
  }

  /**
   * 创建 HTTP 客户端并验证可达性（GET /redfish/v1 服务根）
   * @throws {Error} 缺少 host / 认证失败 / 不可达 / 目标被安全策略拒绝
   */
  async connect() {
    const c = this.credential;
    if (!c.host) throw new Error('Redfish 凭据缺少 host（BMC 管理地址），请检查凭据配置');
    if (!c.username || !c.password) throw new Error('Redfish 凭据缺少用户名/密码，请检查凭据配置');
    const port = c.port || 443;
    // SSRF 防护：连接前统一校验 BMC 目标（凭据测试接口会直接 new RedfishDriver().test()）
    await assertTargetAllowed(c.host, port, 'https', { source: 'credential' });
    const baseURL = `https://${c.host}:${port}`;

    // BMC 多为自签证书：默认跳过证书校验（保证既有采集业务可用），
    // 但允许通过凭据配置项 rejectUnauthorized=true 收紧为严格校验。
    const rejectUnauthorized = c.rejectUnauthorized !== true;

    this.client = axios.create({
      baseURL,
      timeout: 15000,
      auth: { username: c.username, password: c.password },
      httpsAgent: new https.Agent({ rejectUnauthorized }),
      headers: { Accept: 'application/json' },
      validateStatus: null, // 逐请求检查状态码
    });
    this.baseURL = baseURL;

    // 服务根：确认 Redfish 服务可用，并取 Systems 集合入口
    const root = await this._get('/redfish/v1');
    const systemsLink = root?.Systems?.['@odata.id'];
    if (!systemsLink) {
      throw new Error('Redfish 服务根响应中缺少 Systems 链接，请确认 BMC 支持 Redfish');
    }
    // 远端返回的链接必须仍指向同一 BMC，防止 @odata.id 造成二次 SSRF
    this._assertSafeResourceUrl(systemsLink);
    this.systemsUrl = systemsLink;
    logger.info('Redfish 连接成功', { host: c.host, systemsUrl: systemsLink });
  }

  /**
   * 校验 Redfish 子资源链接，防止 BMC 返回的 @odata.id 指向外部主机造成二次 SSRF。
   * 仅允许：① 相对路径（以 / 开头，拼在 baseURL 下，拒绝 // 协议相对形式）；
   *         ② 与 baseURL 同协议 / 同主机 / 同端口的绝对 URL。
   * @param {string} url
   * @throws {TargetBlockedError}
   */
  _assertSafeResourceUrl(url) {
    if (typeof url !== 'string' || !url) {
      throw new TargetBlockedError('Redfish 子资源链接为空', {
        code: 'REDFISH_LINK_INVALID', reason: '链接为空',
      });
    }
    if (url.startsWith('/') && !url.startsWith('//')) return; // 相对路径，安全
    let parsed;
    let base;
    try {
      parsed = new URL(url);
      base = new URL(this.baseURL);
    } catch (_) {
      throw new TargetBlockedError('Redfish 子资源链接或 baseURL 无法解析', {
        code: 'REDFISH_LINK_INVALID', reason: '链接无法解析',
      });
    }
    const samePort = (parsed.port || '') === (base.port || '');
    if (parsed.protocol !== base.protocol || parsed.hostname !== base.hostname || !samePort) {
      throw new TargetBlockedError('Redfish 子资源链接指向外部主机，已拒绝', {
        code: 'REDFISH_LINK_CROSS_HOST', reason: '跨主机链接',
      });
    }
  }

  /**
   * GET 请求并校验状态码
   * @param {string} url
   * @returns {Promise<Object>} JSON 响应体
   */
  async _get(url) {
    // 所有子资源请求统一校验链接，堵住 @odata.id 拼接造成的二次 SSRF
    this._assertSafeResourceUrl(url);
    const resp = await this.client.get(url);
    if (resp.status >= 400) {
      // 仅保留状态码与路径（去掉 query，避免凭据泄露），不回显远端响应体原文，
      // 防止 SSRF 变成带外数据读取通道
      const safePath = String(url).split('?')[0];
      throw new Error(`Redfish 请求失败: ${safePath} → HTTP ${resp.status}`);
    }
    return resp.data;
  }

  /**
   * GET 请求，失败不致命（子资源降级）
   *
   * 重试策略：仅对网络错误（socket hang up/ECONNRESET）与 5xx 重试，
   * 4xx（资源不存在等业务错误）直接判定失败——否则每个缺失路径都要白等一轮，
   * 是采集耗时被拉长的主因。
   *
   * @param {string} url
   * @param {string} label - 日志标签
   * @param {number} [retries=2]
   * @returns {Promise<Object|null>}
   */
  async _getSafe(url, label, retries = 2) {
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this._get(url);
      } catch (err) {
        lastErr = err;
        const status = Number(/HTTP (\d{3})/.exec(err.message || '')?.[1]);
        const isClientError = status >= 400 && status < 500 && status !== 408 && status !== 429;
        if (isClientError || attempt === retries) break;
        // 指数退避后重试（网络抖动 / BMC 连接保护）
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    logger.warn('Redfish 子资源读取失败（降级跳过）', { label, url, error: lastErr?.message });
    this._errors.push(`${label}: ${lastErr?.message}`);
    return null;
  }

  /**
   * 展开集合资源（取 Members 并逐个 GET，限制数量防失控）
   *
   * 性能：改为分批并发（默认每批 4 个）。BMC 单请求常需数百毫秒，
   * 成员多时串行会累积到 30s+（实测浪潮 BMC 串行采集耗时 36s，导致前端超时）。
   * 并发度不宜过高：部分 BMC 有连接数限制，过高会触发 socket hang up。
   * 降级语义不变：单个成员失败只记 warning，不影响其他成员。
   *
   * @param {Object|null} collection - 集合响应（含 Members/@odata.id）
   * @param {number} [max=64]
   * @param {number} [batchSize=4] - 并发批大小
   * @returns {Promise<Array<Object>>}
   */
  async _expandMembers(collection, max = 64, batchSize = 4) {
    const links = (collection?.Members || [])
      .map(l => l?.['@odata.id'])
      .filter(Boolean)
      .slice(0, max);
    const result = [];
    for (let i = 0; i < links.length; i += batchSize) {
      const batch = links.slice(i, i + batchSize);
      const items = await Promise.all(
        batch.map(url => this._getSafe(url, `member ${url}`))
      );
      for (const item of items) {
        if (item) result.push(item);
      }
    }
    return result;
  }

  /**
   * 发现 System 关联的 Chassis 资源链接
   * 优先取 System.Links.Chassis（标准字段）；缺失时兜底遍历 /redfish/v1/Chassis 集合
   * @param {Object} sys - ComputerSystem 资源
   * @returns {Promise<string[]>} Chassis 资源链接列表
   */
  async _discoverChassis(sys) {
    const links = [];
    for (const c of sys?.Links?.Chassis || []) {
      const url = typeof c === 'string' ? c : c?.['@odata.id'];
      if (url && !links.includes(url)) links.push(url);
    }
    if (links.length > 0) return links;

    // 兜底：System 未声明 Chassis 关联时遍历 Chassis 集合
    try {
      const col = await this._get('/redfish/v1/Chassis');
      for (const m of col?.Members || []) {
        const url = m?.['@odata.id'];
        if (url && !links.includes(url)) links.push(url);
      }
    } catch (err) {
      logger.warn('Chassis 集合读取失败（Storage/NetworkAdapters 将无回退路径）', { error: err.message });
    }
    return links;
  }

  /**
   * 尝试从候选路径收集子资源集合（System → 各 Chassis），失败信息由调用方汇总
   * 不直接记 warning，便于「多资源名备选」（如 Storage → DriveStores → SimpleStorage）
   * 场景下只输出最终一条汇总提示
   * @param {string} name - 资源名
   * @param {string} sysLink - ComputerSystem 资源链接
   * @param {string[]} chassisLinks - Chassis 资源链接列表
   * @param {string[]} errorsOut - 错误信息收集数组（原地追加）
   * @returns {Promise<Object|null>}
   */
  async _tryCollection(name, sysLink, chassisLinks, errorsOut, probeChassis = true) {
    for (const url of buildResourceCandidates(name, sysLink, chassisLinks, probeChassis)) {
      try {
        const col = await this._get(url);
        if (col && (Array.isArray(col.Members) || col['@odata.id'] || Object.keys(col).length > 0)) {
          return col;
        }
        errorsOut.push(`${url} → 响应为空`);
      } catch (err) {
        errorsOut.push(err.message);
      }
    }
    return null;
  }

  /**
   * 收集子资源集合：按候选顺序（System → 各 Chassis）尝试，全部失败才记 warning
   * @param {string} name - 资源名（warning 标签）
   * @param {string} sysLink - ComputerSystem 资源链接
   * @param {string[]} chassisLinks - Chassis 资源链接列表
   * @returns {Promise<Object|null>} 集合响应（无 Members 字段时也可能返回单资源）
   */
  async _collectCollection(name, sysLink, chassisLinks, probeChassis = true) {
    const errors = [];
    const col = await this._tryCollection(name, sysLink, chassisLinks, errors, probeChassis);
    if (col) return col;
    // 所有候选均失败：汇总为一条 warning（降级跳过，不阻断采集），并识别固件未实现等情况
    this._errors.push(enrichResourceError(name, errors));
    return null;
  }

  /**
   * 从链接列表/集合引用中提取 @odata.id
   * 兼容三种形态：字符串 URL、{@odata.id}、[{@odata.id}...]
   * @param {*} value
   * @returns {string[]}
   */
  _extractOdataIds(value) {
    if (!value) return [];
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) {
      return value.map(v => (typeof v === 'string' ? v : v?.['@odata.id'])).filter(Boolean);
    }
    return value['@odata.id'] ? [value['@odata.id']] : [];
  }

  /**
   * 采集 PCIe 网卡端口（NetworkAdapters 资源树）
   *
   * 各厂商实现差异大，逐层降级尝试：
   * - 端口集合入口：adapter.NetworkPorts（@odata.id 集合 / 数组）→ Controllers[].NetworkPorts
   * - MAC：NetworkPort 本身常无 MAC（Dell 等），从 NetworkDeviceFunction 按 Port 链接反查
   * - 兜底：adapter 资源直接内嵌 Ports 数组的非标实现
   *
   * @param {Array<Object>} adapters - 已展开的 NetworkAdapter 资源列表
   * @returns {Promise<Array<Object>>} 统一端口列表
   */
  async _collectAdapterPorts(adapters) {
    const result = [];
    for (const adapter of adapters || []) {
      const adapterId = pick(adapter, ['Id', 'Name']) || null;

      // 先收集该网卡的 DeviceFunction（MAC 反查表：portUrl → mac）
      // 并发读取：BMC 响应慢时串行会显著拉长整体采集耗时
      const macByPortUrl = {};
      const fnUrls = this._extractOdataIds(adapter?.NetworkDeviceFunctions);
      for (const ctrl of adapter?.Controllers || []) {
        fnUrls.push(...this._extractOdataIds(ctrl?.NetworkDeviceFunctions));
      }
      const fns = await Promise.all(
        fnUrls.map(url => this._getSafe(url, `NetworkDeviceFunction ${url}`))
      );
      // 缓存到 adapter 上供 parseNetworkAdapters 取 MAC（网卡↔端口关联键），避免重复请求
      adapter.__fns = fns.filter(Boolean);
      for (const fn of adapter.__fns) {
        const portUrl = fn?.Links?.Ports?.[0]?.['@odata.id'] || fn?.Port?.['@odata.id'];
        if (fn.MACAddress && portUrl) macByPortUrl[portUrl] = fn.MACAddress;
      }

      // 端口集合入口（多来源去重）
      const portUrls = this._extractOdataIds(adapter?.NetworkPorts);
      for (const ctrl of adapter?.Controllers || []) {
        portUrls.push(...this._extractOdataIds(ctrl?.NetworkPorts));
      }

      let found = false;
      for (const url of [...new Set(portUrls)]) {
        const col = await this._getSafe(url, `NetworkPorts ${url}`);
        if (!col) continue;
        const portObjs = await this._expandMembers(col);
        for (const p of portObjs) {
          const parsed = parseAdapterPort(p, adapterId, macByPortUrl[url]);
          if (parsed) result.push(parsed);
          found = true;
        }
      }

      // 兜底：adapter 资源内嵌 Ports 数组（部分非标实现）
      if (!found && Array.isArray(adapter?.Ports)) {
        for (const p of adapter.Ports) {
          const parsed = parseAdapterPort(p, adapterId);
          if (parsed) result.push(parsed);
        }
      }
    }
    return result;
  }

  /**
   * 完整采集：硬件清单 + 网卡端口
   * @returns {Promise<{ vendor: string, hardware: Object, ports: Array, warnings: Array }>}
   */
  async collect() {
    this._errors = [];
    // 分阶段耗时（BMC 单请求常需数百毫秒，定位慢路径靠日志而非猜测）
    const stageStart = Date.now();
    let stageLast = stageStart;
    const stage = {};
    const markStage = (name) => {
      const now = Date.now();
      stage[name] = `${now - stageLast}ms`;
      stageLast = now;
    };

    // 入口集合
    const systems = await this._get(this.systemsUrl);
    const sysLink = systems?.Members?.[0]?.['@odata.id'];
    if (!sysLink) throw new Error('Redfish Systems 集合为空，未找到可采集的服务器');

    const sys = await this._get(sysLink);
    markStage('system');
    const hardware = parseSystem(sys);
    const vendor = detectVendorFromManufacturer(hardware.manufacturer);
    hardware.vendor = vendor;

    // Chassis 链接：Storage / NetworkAdapters 在部分厂商（如浪潮 iBMC）挂在 Chassis 下而非 System 下
    const chassisLinks = await this._discoverChassis(sys);
    markStage('chassis');

    // 子资源：内存 / 硬盘 / 网卡 / 网口（逐项降级，失败不阻断；System 下缺失时回退 Chassis）
    // Memory 在 Redfish 标准中只隶属 ComputerSystem，关闭 Chassis 回退以避免无效 400 噪音
    const memoryCol = await this._collectCollection('Memory', sysLink, chassisLinks, false);
    hardware.memoryModules = memoryCol ? parseMemoryModules(await this._expandMembers(memoryCol)) : [];
    markStage('memory');

    // 硬盘：Storage → DriveStores → SimpleStorage
    // 部分厂商（含浪潮 iBMC）不实现 Storage 资源，硬盘挂在 DriveStores 或 SimpleStorage 下
    const storageErrors = [];
    const storageCol = await this._tryCollection('Storage', sysLink, chassisLinks, storageErrors)
      || await this._tryCollection('DriveStores', sysLink, chassisLinks, storageErrors)
      || await this._tryCollection('SimpleStorage', sysLink, chassisLinks, storageErrors);
    if (!storageCol) {
      this._errors.push(enrichResourceError('Storage/DriveStores/SimpleStorage', storageErrors));
    }
    let drives = [];
    if (storageCol) {
      const storages = await this._expandMembers(storageCol);
      for (const st of storages) {
        const driveLinks = st?.Drives || st?.Drives?.['@odata.id'] ? st.Drives : (st?.Drives || []);
        // Drives 可能是数组（多链接）或 @odata.id 单链接
        let driveObjs = [];
        if (Array.isArray(driveLinks)) {
          driveObjs = await this._expandMembers({ Members: driveLinks });
        } else if (driveLinks?.['@odata.id']) {
          const driveCol = await this._getSafe(driveLinks['@odata.id'], 'Drives');
          driveObjs = driveCol ? await this._expandMembers(driveCol) : [];
        }
        drives = drives.concat(driveObjs);
      }
    }
    hardware.drives = parseDrives(drives);
    markStage('storage');

    // EthernetInterfaces 同样只隶属 ComputerSystem，关闭 Chassis 回退
    const ethCol = await this._collectCollection('EthernetInterfaces', sysLink, chassisLinks, false);
    const ethPorts = ethCol ? parseEthernetPorts(await this._expandMembers(ethCol)) : [];
    markStage('ethernet');

    // PCIe 网卡（NetworkAdapters）：插卡网口的主要来源，与板载口合并去重
    const netAdapterCol = await this._collectCollection('NetworkAdapters', sysLink, chassisLinks);
    const adapters = netAdapterCol ? await this._expandMembers(netAdapterCol) : [];
    const pciePorts = await this._collectAdapterPorts(adapters);
    markStage('networkAdapters');

    // 网卡硬件清单（型号/序列号/位置 + MAC）：与端口采集复用同一份 adapters，不额外请求
    const adaptersParsed = parseNetworkAdapters(adapters);

    const seen = new Set();
    const rawPorts = [];
    for (const p of [...ethPorts, ...pciePorts]) {
      if (p && p.portName && !seen.has(p.portName)) {
        seen.add(p.portName);
        rawPorts.push(p);
      }
    }

    // 建立「端口 → 所属网卡」对应关系（落库时写入 DevicePort.nicId）
    const linkedPorts = mapPortsToAdapters(rawPorts, adaptersParsed);
    // 用网卡标称能力校正端口类型/速率（BMC 未报速率时兜底值会错标为 RJ45/1G）
    const ports = applyAdapterSpec(linkedPorts, adaptersParsed);

    // 把关联到的端口明细回填到各网卡条目（前端按「网卡 → 端口」展示）
    for (const ad of adaptersParsed) {
      ad.ports = ports
        .filter(p => p.nicRef === String(ad.index))
        .map(p => ({
          name: p.portName,
          macAddress: p.macAddress || null,
          linkStatus: p.status === 'occupied' ? 'LinkUp' : 'LinkDown',
        }));
    }

    this.lastRawOutput = JSON.stringify({ hardware: { ...hardware, networkAdapters: adaptersParsed }, ports }, null, 2);

    logger.info('Redfish 采集完成', {
      host: this.credential.host,
      vendor,
      durationMs: Date.now() - stageStart,
      stage,
      memoryModules: hardware.memoryModules.length,
      drives: hardware.drives.length,
      networkAdapters: adaptersParsed.length,
      ports: ports.length,
      linkedPorts: ports.filter(p => p.nicRef !== null).length,
      specFromAdapter: ports.filter(p => p.speedSource === 'adapter').length,
      warnings: this._errors.length,
    });

    return { vendor, hardware: { ...hardware, networkAdapters: adaptersParsed }, ports, warnings: this._errors };
  }

  /**
   * 测试连通性（用于凭据测试）
   * @returns {Promise<{ ok: boolean, message: string }>}
   */
  async test() {
    try {
      await this.connect();
      const root = await this._get('/redfish/v1');
      const name = root?.Name || 'BMC';
      return { ok: true, message: `Redfish 连通成功（${name}）` };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }
}

module.exports = RedfishDriver;
module.exports._internal = {
  detectVendorFromManufacturer,
  parseSystem,
  parseMemoryModules,
  parseDrives,
  parseEthernetPorts,
  parsePhysicalPorts,
  parseNetworkAdapters,
  parseAdapterPort,
  buildResourceCandidates,
  mapPortsToAdapters,
  inferAdapterSpec,
  applyAdapterSpec,
  normalizeMac,
  extractNicIndex,
  formatCapacity,
  enrichResourceError,
};
