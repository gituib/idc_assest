/**
 * Redfish 探针脚本（独立诊断工具，不依赖数据库/应用）
 *
 * 用途：直接连 BMC，逐个打印关键子资源的 HTTP 状态码 + 响应体（截断），
 * 用来判断"为什么 Memory/Storage/NetworkAdapters 采不到"。
 * 比完整采集快（无重试/超时/落库），且能看到 400 的真实拒绝原因。
 *
 * 用法：
 *   node scripts/probe-redfish.js --host 10.1.2.3 --user root --pass 'calvin'
 *   node scripts/probe-redfish.js --host 10.1.2.3 --port 443 --user admin --pass xxx
 *
 * 参数：
 *   --host    BMC 管理地址（必填）
 *   --port    HTTPS 端口，默认 443
 *   --user    用户名（必填）
 *   --pass    密码（必填）
 */
const axios = require('axios');
const https = require('https');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const SNIP = 1200;

async function get(client, url) {
  try {
    const resp = await client.get(url);
    let body = '';
    try {
      body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data, null, 2);
    } catch (_) { body = String(resp.data); }
    return { status: resp.status, body: body.slice(0, SNIP) };
  } catch (err) {
    return { status: 'ERR', body: err.message };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const host = args.host;
  const port = args.port || 443;
  const username = args.user;
  const password = args.pass;
  if (!host || !username || !password) {
    console.error('缺少必填参数：--host / --user / --pass');
    process.exit(1);
  }

  const client = axios.create({
    baseURL: `https://${host}:${port}`,
    timeout: 15000,
    auth: { username, password },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: { Accept: 'application/json' },
    validateStatus: null,
  });

  console.log(`\n=== 连接 BMC ${host}:${port} ===\n`);

  // 服务根
  const root = await get(client, '/redfish/v1');
  console.log(`[服务根] /redfish/v1 → HTTP ${root.status}`);
  console.log(root.body);

  const systemsLink = root.body && (() => {
    try { return JSON.parse(root.body).Systems['@odata.id']; } catch (_) { return null; }
  })();
  if (!systemsLink) {
    console.error('\n服务根响应中未找到 Systems 链接，BMC 可能不支持 Redfish。');
    process.exit(1);
  }

  // Systems 集合 → 第一个 System
  const systems = await get(client, systemsLink);
  const sysLink = systems.body && (() => {
    try { return JSON.parse(systems.body).Members[0]['@odata.id']; } catch (_) { return null; }
  })();
  console.log(`\n[Systems 集合] ${systemsLink} → HTTP ${systems.status}`);
  console.log(`[选定 System] ${sysLink}`);

  // System 摘要
  const sys = await get(client, sysLink);
  console.log(`\n[System 摘要] ${sysLink} → HTTP ${sys.status}`);
  try {
    const s = JSON.parse(sys.body);
    console.log(JSON.stringify({
      Manufacturer: s.Manufacturer,
      Model: s.Model,
      SerialNumber: s.SerialNumber,
      PowerState: s.PowerState,
      ProcessorSummary: s.ProcessorSummary,
      MemorySummary: s.MemorySummary,
      Links_Chassis: (s.Links && s.Links.Chassis) || null,
      Oem: s.Oem ? Object.keys(s.Oem) : null,
    }, null, 2));
  } catch (_) { console.log(sys.body); }

  // Chassis 链接
  let chassisLinks = [];
  try {
    const s = JSON.parse(sys.body);
    for (const c of (s.Links && s.Links.Chassis) || []) {
      const u = typeof c === 'string' ? c : c['@odata.id'];
      if (u && !chassisLinks.includes(u)) chassisLinks.push(u);
    }
  } catch (_) { /* 解析 System 失败时不阻断，继续走兜底 */ }
  if (chassisLinks.length === 0) {
    const ch = await get(client, '/redfish/v1/Chassis');
    try {
      for (const m of (JSON.parse(ch.body).Members || [])) {
        const u = m['@odata.id'];
        if (u && !chassisLinks.includes(u)) chassisLinks.push(u);
      }
    } catch (_) { /* 解析 Chassis 集合失败时不阻断 */ }
  }
  console.log(`\n[Chassis 链接] ${JSON.stringify(chassisLinks)}`);

  // 逐资源探测：System 优先，再各 Chassis
  const resources = [
    'Memory', 'Storage', 'NetworkAdapters', 'NetworkInterfaces',
    'EthernetInterfaces', 'Processors', 'SimpleStorage', 'DriveStores',
    'PCIeDevices', 'StorageControllers',
  ];
  console.log('\n=== 子资源探测（System → 各 Chassis）===\n');
  const candidates = (name) => {
    const list = [`${sysLink}/${name}`];
    for (const c of chassisLinks) {
      const u = `${c}/${name}`;
      if (!list.includes(u)) list.push(u);
    }
    return list;
  };
  for (const name of resources) {
    for (const url of candidates(name)) {
      const r = await get(client, url);
      const tag = url === `${sysLink}/${name}` ? '[System]' : '[Chassis]';
      console.log(`${tag} ${url} → HTTP ${r.status}`);
      if (r.status >= 400 || r.status === 'ERR') {
        console.log(`    ${r.body.replace(/\n/g, '\n    ')}`);
      } else {
        // 200：只打印 Members 数量或关键字段，避免刷屏
        try {
          const d = JSON.parse(r.body);
          const cnt = Array.isArray(d.Members) ? d.Members.length : (d['@odata.id'] ? '单资源' : Object.keys(d).length + ' 字段');
          console.log(`    OK · Members=${cnt} · keys=${Object.keys(d).slice(0, 8).join(',')}`);
        } catch (_) { console.log('    OK'); }
      }
    }
    console.log('');
  }

  console.log('=== 探测结束 ===');
  console.log('提示：若 Memory/Storage/NetworkAdapters 在 System 下返回 400/404，');
  console.log('      看上面打印的 body 中的 error.message，通常是固件未实现该 Redfish 资源（iDRAC8 常见）。');
}

main().catch((e) => {
  console.error('探针异常：', e.message);
  process.exit(1);
});
