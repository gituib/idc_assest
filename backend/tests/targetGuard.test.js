/**
 * targetGuard 目标地址安全校验单测
 *
 * 全部用例不连数据库、不连真实网络：
 * - logger / SystemSetting 用 jest.mock 隔离，避免 winston 写文件与 sqlite3 绑定加载；
 * - 域名解析用例用 jest.spyOn(dns.promises, 'lookup') 提供固定的解析结果；
 * - 需要策略的用例一律显式传入 policy，不触发查库。
 */
jest.mock('../utils/logger', () => ({
  module: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../models/SystemSetting', () => ({
  findByPk: jest.fn(),
}));

const dns = require('dns');
const SystemSetting = require('../models/SystemSetting');
const {
  TargetBlockedError,
  assertTargetAllowed,
  assertTargetAllowedSync,
  isBlockedTarget,
  getTargetPolicy,
  getCachedPolicy,
  clearPolicyCache,
  assertAllowedUrl,
  logTargetDecision,
  ALLOWED_SCHEMES,
  DEFAULT_PORTS,
  DEFAULT_POLICY,
  SETTING_KEYS,
  classifyIp,
  isPrivateIp,
} = require('../utils/targetGuard');

/** 默认放行策略 */
const POLICY_OPEN = { allowIntranet: true, whitelist: [] };
/** 关闭内网采集 */
const POLICY_OFF = { allowIntranet: false, whitelist: [] };
/** 仅放行指定内网网段 */
const POLICY_WL = { allowIntranet: true, whitelist: ['10.0.0.0/8', '192.168.0.0/16'] };

/** 构造 assertTargetAllowed 的 options：始终显式带 policy，避免查库 */
const opts = (extra = {}) => ({ policy: POLICY_OPEN, source: 'test', ...extra });

/** 无条件拒绝的危险地址 */
const DANGER_IPS = [
  '127.0.0.1',
  '127.1.2.3',
  '169.254.169.254',
  '169.254.1.1',
  '0.0.0.0',
  '0.1.2.3',
  '255.255.255.255',
  '224.0.0.1',
  '239.255.255.255',
  '240.0.0.1',
  '100.64.0.1',
  '192.0.0.1',
  '192.0.2.1',
  '198.18.0.1',
  '198.51.100.1',
  '203.0.113.1',
  '::1',
  '::',
  'fe80::1',
  'fd00:ec2::254',
  '::ffff:127.0.0.1',
];

describe('isBlockedTarget 危险段硬拒绝', () => {
  it.each(DANGER_IPS)('%s 命中危险段', ip => {
    expect(isBlockedTarget(ip)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '10.0.0.5',
    '172.16.0.1',
    '192.168.1.1',
    '2001:4860:4860::8888',
    'fc00::1',
    'example.com',
    '999.1.1.1',
    '',
    null,
  ])('%s 不命中危险段（非 IP 交由异步路径复核）', host => {
    expect(isBlockedTarget(host)).toBe(false);
  });
});

describe('classifyIp 分区判定与 isPrivateIp', () => {
  it.each([
    ['10.0.0.5', 'private'],
    ['172.16.5.4', 'private'],
    ['172.31.255.255', 'private'],
    ['192.168.1.1', 'private'],
    ['8.8.8.8', 'public'],
    ['1.1.1.1', 'public'],
    ['2001:4860:4860::8888', 'public'],
    ['fc00::1', 'private'],
    ['127.0.0.1', 'danger'],
    ['169.254.169.254', 'danger'],
  ])('%s 归为 %s', (ip, zone) => {
    expect(classifyIp(ip).zone).toBe(zone);
  });

  it('非法 IP 字面量归为 invalid', () => {
    expect(classifyIp('not-an-ip').zone).toBe('invalid');
  });

  it('IPv4-mapped IPv6 按嵌入的 IPv4 判定', () => {
    expect(classifyIp('::ffff:127.0.0.1').zone).toBe('danger');
    expect(classifyIp('::ffff:10.0.0.5').zone).toBe('private');
  });

  it('isPrivateIp 只认私网', () => {
    expect(isPrivateIp('10.0.0.5')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('127.0.0.1')).toBe(false);
  });
});

describe('assertTargetAllowedSync 同步校验', () => {
  it.each(DANGER_IPS)('%s 抛 TargetBlockedError', ip => {
    expect(() => assertTargetAllowedSync(ip, 443, 'https', POLICY_OPEN)).toThrow(TargetBlockedError);
  });

  it('默认策略放行私网 10.0.0.5 并回传 resolvedIps', () => {
    const result = assertTargetAllowedSync('10.0.0.5', 443, 'https');
    expect(result.zone).toBe('private');
    expect(result.resolvedIps).toEqual(['10.0.0.5']);
    expect(result.port).toBe(443);
    expect(result.protocol).toBe('https');
  });

  it('开关关闭后私网被拒', () => {
    expect(() => assertTargetAllowedSync('10.0.0.5', 443, 'https', POLICY_OFF))
      .toThrow(/内网采集开关已关闭/);
  });

  it('白名单内私网放行', () => {
    expect(() => assertTargetAllowedSync('10.9.8.7', 22, 'ssh', POLICY_WL)).not.toThrow();
    expect(() => assertTargetAllowedSync('192.168.3.4', 22, 'ssh', POLICY_WL)).not.toThrow();
  });

  it('白名单外私网被拒', () => {
    expect(() => assertTargetAllowedSync('172.16.0.1', 22, 'ssh', POLICY_WL))
      .toThrow(/不在网段白名单内/);
  });

  it('公网目标默认放行且不受白名单限制', () => {
    expect(() => assertTargetAllowedSync('8.8.8.8', 443, 'https', POLICY_WL)).not.toThrow();
  });

  it('未传端口时按协议取默认端口', () => {
    expect(assertTargetAllowedSync('8.8.8.8', undefined, 'ssh').port).toBe(22);
    expect(assertTargetAllowedSync('8.8.8.8', undefined, 'https').port).toBe(443);
  });

  it.each(['999.1.1.1', '1.2.3.4.5', '10.0.0', '::gg'])('非法 IP 字符串 %s 被拒', ip => {
    expect(() => assertTargetAllowedSync(ip, 80, 'http', POLICY_OPEN)).toThrow(TargetBlockedError);
  });

  it.each(['gopher', 'file', 'dict', 'ldap', 'redis'])('非法 scheme %s 被拒', scheme => {
    expect(() => assertTargetAllowedSync('8.8.8.8', 80, scheme, POLICY_OPEN)).toThrow(TargetBlockedError);
  });

  it.each([0, -1, 65536, 70000, 1.5, 'abc'])('非法端口 %s 被拒', port => {
    expect(() => assertTargetAllowedSync('8.8.8.8', port, 'http', POLICY_OPEN)).toThrow(TargetBlockedError);
  });

  it.each(['host name', 'a;rm -rf', 'a$b', 'bad\0host'])('非法主机名字符 %s 被拒', host => {
    expect(() => assertTargetAllowedSync(host, 80, 'http', POLICY_OPEN)).toThrow(TargetBlockedError);
  });

  it('空主机名被拒', () => {
    expect(() => assertTargetAllowedSync('', 80, 'http', POLICY_OPEN)).toThrow(TargetBlockedError);
    expect(() => assertTargetAllowedSync(null, 80, 'http', POLICY_OPEN)).toThrow(TargetBlockedError);
  });

  it('域名走 deferred（同步路径不做 DNS 解析）', () => {
    const result = assertTargetAllowedSync('bmc.example.com', 443, 'https', POLICY_OPEN);
    expect(result.zone).toBe('domain');
    expect(result.resolvedIps).toEqual([]);
  });

  it('错误对象携带结构化 code / host / port / protocol / reason', () => {
    let caught = null;
    try {
      assertTargetAllowedSync('169.254.169.254', 80, 'http', POLICY_OPEN);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TargetBlockedError);
    expect(caught.code).toBe('TARGET_DANGER_ZONE');
    expect(caught.host).toBe('169.254.169.254');
    expect(caught.port).toBe(80);
    expect(caught.protocol).toBe('http');
    expect(caught.reason).toBeTruthy();
  });
});

describe('assertTargetAllowed 异步完整校验', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('IP 字面量命中危险段被拒', async () => {
    await expect(assertTargetAllowed('169.254.169.254', 80, 'http', opts()))
      .rejects.toBeInstanceOf(TargetBlockedError);
  });

  it('私网默认放行', async () => {
    const result = await assertTargetAllowed('10.0.0.5', 443, 'https', opts());
    expect(result.zone).toBe('private');
    expect(result.resolvedIps).toEqual(['10.0.0.5']);
  });

  it('开关关闭后私网被拒', async () => {
    await expect(assertTargetAllowed('192.168.1.1', 22, 'ssh', opts({ policy: POLICY_OFF })))
      .rejects.toThrow(/内网采集开关已关闭/);
  });

  it('白名单内私网放行 / 白名单外私网被拒', async () => {
    await expect(assertTargetAllowed('10.2.3.4', 22, 'ssh', opts({ policy: POLICY_WL })))
      .resolves.toHaveProperty('zone', 'private');
    await expect(assertTargetAllowed('172.20.1.1', 22, 'ssh', opts({ policy: POLICY_WL })))
      .rejects.toThrow(/不在网段白名单内/);
  });

  it('域名解析到公网 → 放行并返回 resolvedIps', async () => {
    const lookup = jest.spyOn(dns.promises, 'lookup')
      .mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const result = await assertTargetAllowed('example.com', 443, 'https', opts());
    expect(result.zone).toBe('domain');
    expect(result.resolvedIps).toEqual(['8.8.8.8']);
    expect(lookup).toHaveBeenCalledWith('example.com', { all: true, verbatim: true });
  });

  it('域名解析结果含私网且开关关闭 → 被拒（防多记录绕过）', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ]);
    await expect(assertTargetAllowed('example.com', 443, 'https', opts({ policy: POLICY_OFF })))
      .rejects.toBeInstanceOf(TargetBlockedError);
  });

  it('域名解析到云元数据地址 → 被拒', async () => {
    jest.spyOn(dns.promises, 'lookup')
      .mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);
    await expect(assertTargetAllowed('metadata.internal', 80, 'http', opts()))
      .rejects.toThrow(/链路本地地址段/);
  });

  it('域名解析到白名单外私网 → 被拒', async () => {
    jest.spyOn(dns.promises, 'lookup')
      .mockResolvedValue([{ address: '172.16.9.9', family: 4 }]);
    await expect(assertTargetAllowed('bmc.internal', 22, 'ssh', opts({ policy: POLICY_WL })))
      .rejects.toThrow(/不在网段白名单内/);
  });

  it('域名解析失败 → 被拒', async () => {
    jest.spyOn(dns.promises, 'lookup').mockRejectedValue(new Error('ENOTFOUND'));
    await expect(assertTargetAllowed('nope.invalid', 80, 'http', opts()))
      .rejects.toHaveProperty('code', 'TARGET_DNS_FAILED');
  });

  it('域名未解析出任何 IP → 被拒', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([]);
    await expect(assertTargetAllowed('empty.invalid', 80, 'http', opts()))
      .rejects.toHaveProperty('code', 'TARGET_DNS_EMPTY');
  });
});

describe('assertAllowedUrl URL 校验', () => {
  it.each([
    'file:///etc/passwd',
    'gopher://127.0.0.1/x',
    'dict://127.0.0.1/x',
    'ftp://8.8.8.8/x',
  ])('%s 非 http(s) 协议被拒', async url => {
    await expect(assertAllowedUrl(url, ['http', 'https'], opts()))
      .rejects.toBeInstanceOf(TargetBlockedError);
  });

  it('http://169.254.169.254 云元数据被拒', async () => {
    await expect(assertAllowedUrl('http://169.254.169.254/latest/meta-data/', undefined, opts()))
      .rejects.toThrow(/链路本地地址段/);
  });

  it('http://127.0.0.1:8080 回环被拒', async () => {
    await expect(assertAllowedUrl('http://127.0.0.1:8080/admin', undefined, opts()))
      .rejects.toThrow(/回环地址段/);
  });

  it('IPv6 回环 URL http://[::1]/ 被拒', async () => {
    await expect(assertAllowedUrl('http://[::1]/', undefined, opts()))
      .rejects.toThrow(/回环地址/);
  });

  it('https://8.8.8.8/path 放行并返回结构化信息', async () => {
    const result = await assertAllowedUrl('https://8.8.8.8/backup?id=1', undefined, opts());
    expect(result.scheme).toBe('https');
    expect(result.host).toBe('8.8.8.8');
    expect(result.port).toBe(443);
    expect(result.pathname).toBe('/backup');
    expect(result.resolvedIps).toEqual(['8.8.8.8']);
  });

  it('自定义 allowedSchemes 只允许 https 时 http 被拒', async () => {
    await expect(assertAllowedUrl('http://8.8.8.8/', ['https'], opts()))
      .rejects.toHaveProperty('code', 'TARGET_SCHEME_DENIED');
  });

  it('非法 URL 字符串被拒', async () => {
    await expect(assertAllowedUrl('not a url', undefined, opts()))
      .rejects.toHaveProperty('code', 'TARGET_URL_INVALID');
  });

  it('空 URL 被拒', async () => {
    await expect(assertAllowedUrl('', undefined, opts()))
      .rejects.toHaveProperty('code', 'TARGET_URL_EMPTY');
  });
});

describe('getTargetPolicy 系统设置读取与缓存', () => {
  beforeEach(() => {
    clearPolicyCache();
    SystemSetting.findByPk.mockReset();
  });

  it('设置项缺失时回退默认策略', async () => {
    SystemSetting.findByPk.mockResolvedValue(null);
    await expect(getTargetPolicy()).resolves.toEqual(DEFAULT_POLICY);
  });

  it('读取开关关闭与白名单（非法 CIDR 被过滤）', async () => {
    SystemSetting.findByPk.mockImplementation(key => {
      if (key === SETTING_KEYS.allowIntranet) {
        return Promise.resolve({ settingValue: JSON.stringify(false) });
      }
      if (key === SETTING_KEYS.whitelist) {
        return Promise.resolve({ settingValue: JSON.stringify(['10.0.0.0/8', 'bad-cidr']) });
      }
      return Promise.resolve(null);
    });
    const policy = await getTargetPolicy();
    expect(policy.allowIntranet).toBe(false);
    expect(policy.whitelist).toEqual(['10.0.0.0/8']);
  });

  it('TTL 缓存内不重复查库', async () => {
    SystemSetting.findByPk.mockResolvedValue(null);
    await getTargetPolicy();
    await getTargetPolicy();
    // 每次读取两个 key，缓存命中后总调用次数仍为 2
    expect(SystemSetting.findByPk).toHaveBeenCalledTimes(2);
  });

  it('读取失败回退默认策略', async () => {
    SystemSetting.findByPk.mockRejectedValue(new Error('db down'));
    await expect(getTargetPolicy()).resolves.toEqual(DEFAULT_POLICY);
  });

  it('clearPolicyCache 后重新查库', async () => {
    SystemSetting.findByPk.mockResolvedValue(null);
    await getTargetPolicy();
    clearPolicyCache();
    await getTargetPolicy();
    expect(SystemSetting.findByPk).toHaveBeenCalledTimes(4);
  });

  it('getCachedPolicy 未加载时返回默认策略副本', () => {
    clearPolicyCache();
    expect(getCachedPolicy()).toEqual(DEFAULT_POLICY);
  });
});

describe('导出常量与审计留痕', () => {
  it('协议白名单与默认端口正确', () => {
    expect(ALLOWED_SCHEMES).toContain('https');
    expect(ALLOWED_SCHEMES).toContain('ssh');
    expect(ALLOWED_SCHEMES).not.toContain('gopher');
    expect(DEFAULT_PORTS.https).toBe(443);
    expect(DEFAULT_PORTS.ssh).toBe(22);
  });

  it('系统设置键与默认策略符合约定', () => {
    expect(SETTING_KEYS.allowIntranet).toBe('allow_intranet_collection');
    expect(SETTING_KEYS.whitelist).toBe('target_whitelist');
    expect(DEFAULT_POLICY.allowIntranet).toBe(true);
    expect(DEFAULT_POLICY.whitelist).toEqual([]);
  });

  it('logTargetDecision 在 logger 可用时不抛错', () => {
    expect(() => logTargetDecision('10.0.0.5', 'allowed', '私网目标，默认放行', { source: 'test' }))
      .not.toThrow();
    expect(() => logTargetDecision('127.0.0.1', 'blocked', '回环地址段', { source: 'test' }))
      .not.toThrow();
  });
});
