#!/usr/bin/env node
/**
 * ============================================================================
 * 线上事故应急诊断脚本 v0.2（incident-doctor）
 * ============================================================================
 *
 * 定位：线上出问题后，SSH 到生产服务器直接运行，快速产出「事故卡」。
 * 约束：纯只读、零外部依赖（仅 Node 内置模块 + 系统命令）、单文件可 scp。
 * 本脚本不会重启服务、不会修改配置、不会写业务文件，所有修复动作只以命令文本打印。
 *
 * 用法
 * ----------------------------------------------------------------------------
 *   # 1) 单文件拷贝到服务器（项目根目录，或任意目录配合 --root）
 *   scp scripts/incident-doctor.js root@prod:/opt/idc/
 *   ssh root@prod
 *   cd /opt/idc && node incident-doctor.js
 *
 *   # 2) 机器可读模式（stdout 仅输出 JSON）
 *   node incident-doctor.js --json
 *
 * 参数
 * ----------------------------------------------------------------------------
 *   --json                 输出机器可读 JSON（默认输出中文事故卡）
 *   --out <dir>            事故卡 Markdown 落盘目录（默认 ./incidents）
 *   --root <dir>           项目根目录（默认自动探测含 backend/server.js 或 backend/.env 的目录）
 *   --port <n>             后端期望端口（默认读取 backend/.env 的 PORT，回退 8000）
 *   --container <name>     后端容器名（默认自动探测 idc-backend / 名称含 backend 的容器）
 *   --window <min>         故障与部署时间关联窗口，单位分钟（默认 10）
 *   --sample-minutes <min> HTTP 统计时间窗口，单位分钟（默认 60）
 *   --help                 显示帮助
 *
 * 输出
 * ----------------------------------------------------------------------------
 *   - 终端：中文事故卡（判定 / 置信度 / HTTP 观测 / 故障开始 / 最近部署 / 核心证据 / 影响面 / 分级动作）
 *   - 文件：<out>/incident-<YYYYMMDD-HHMM>.md（两种模式都会落盘）
 *
 * 优雅降级
 * ----------------------------------------------------------------------------
 *   缺少 docker、git、日志目录、.env、/proc 等时不会中断，对应项标注「不可用」。
 *
 * 判定口径（v0.2 修订）
 * ----------------------------------------------------------------------------
 *   - 4xx（401/403/404）属于协议层「请求被拒绝」，默认不计入故障；仅作辅助证据。
 *   - 401/403 升级为故障候选必须同时满足「相对基线显著突增」，且至少满足以下之一：
 *     来源 IP 高度集中 / 命中本应公开访问的接口 / 登录成功率同步骤降。
 *   - 故障候选只包括：5xx、超时或连接失败、进程/容器不可用、资源耗尽、代码异常（需伴随 5xx）。
 *   - 所有率类指标必须给出基线（前一日同时段 / 上周同时段 / 紧邻前一窗口）与变化倍数。
 *   - 窗口内响应样本 <100 条时标注「样本不足，不下结论」，不输出百分比结论。
 *   - 故障开始时间取「指标首次越过基线的时刻」，与证据中的首次出现时间保持一致。
 *   - 所有采集项均在阈值内时输出「未发现故障」，不强行给出故障判定。
 *   - request 日志是 debug 复合日志，仅统计 module=HTTP 且带 statusCode 的响应行；
 *     若有效日志级别不是 debug（成功响应未落盘）或存在采样，则占比类指标标注不可用，
 *     改用失败请求绝对计数与基线对比。
 *
 * 判定优先级
 * ----------------------------------------------------------------------------
 *   1) 故障起点与最近部署/配置变更相差 ≤ --window 分钟 -> 疑似发布引入（建议回滚）
 *   2) 资源耗尽（磁盘/内存/swap 超阈值）
 *   3) 外部依赖不可达（DB 端口 / ECONNREFUSED / ETIMEDOUT / ENOTFOUND 等）
 *   4) 后端探活不可达
 *   5) 代码异常（错误日志聚类中包含 5xx）
 *   6) 5xx 响应突增（相对基线）
 *   7) 认证异常（401/403 同时满足多项升级条件）
 *   8) 样本不足 -> 不下结论
 *   9) 未发现故障
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const http = require('http');
const { execFile } = require('child_process');

const TOOL = { name: 'incident-doctor', version: '0.2.0' };
const LOG_LINES = 200;
const THRESHOLDS = {
  diskWarn: 85,
  diskCritical: 95,
  memWarn: 90,
  memCritical: 95,
  swapWarn: 80,
  swapCritical: 90,
  httpSampleMinutes: 60,
  httpSampleMinResponses: 100,
  baselineMinResponses: 100,
  http5xxMinCount: 3,
  http5xxSurgeFactor: 3,
  authMinCount: 5,
  authSurgeFactor: 3,
  authIpShare: 0.5,
  authIpMaxDistinct: 3,
  loginDropPp: 0.1,
  codeBurstCount: 3,
  codeBurstHigh: 10,
};

// ----------------------------------------------------------------------------
// 基础工具
// ----------------------------------------------------------------------------

/**
 * 执行系统命令（不经过 shell，避免注入；带超时与输出上限）
 * @param {string} command 命令
 * @param {string[]} args 参数
 * @param {Object} [options] 选项
 * @returns {Promise<{ok:boolean,code:number,stdout:string,stderr:string,error:string|null}>}
 */
function run(command, args = [], options = {}) {
  return new Promise(resolve => {
    execFile(
      command,
      args,
      {
        timeout: options.timeout || 8000,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
        cwd: options.cwd,
        env: process.env,
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error ? error.code || -1 : 0,
          stdout: stdout || '',
          stderr: stderr || '',
          error: error ? error.message : null,
        });
      }
    );
  });
}

function safeRead(file) {
  try {
    return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  } catch {
    return null;
  }
}

function safeStat(file) {
  try {
    return fs.statSync(file);
  } catch {
    return null;
  }
}

function isDirectory(dir) {
  const st = safeStat(dir);
  return Boolean(st && st.isDirectory());
}

function safeReaddir(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function readJson(file) {
  const text = safeRead(file);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * 本地时间格式化 YYYY-MM-DD HH:mm:ss
 * @param {Date|string|number|null} value 时间
 * @returns {string}
 */
function fmtDateTime(value) {
  if (!value) return '未知';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '未知';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function fmtMinute(value) {
  if (!value) return '未知';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '未知';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
}

function fmtFileStamp(value) {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(
    d.getHours()
  )}${pad2(d.getMinutes())}`;
}

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 解析日志中的本地时间戳（服务端 TZ=Asia/Shanghai，脚本与服务器同机）
 * @param {string} text 文本
 * @returns {Date|null}
 */
function parseLogTime(text) {
  const m = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:[.,](\d{1,3}))?/.exec(
    text || ''
  );
  if (!m) return null;
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6]),
    Number(m[7] || 0)
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtBytes(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '未知';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)}${units[i]}`;
}

function fmtDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}天${h}小时`;
  if (h > 0) return `${h}小时${m}分钟`;
  return `${m}分钟`;
}

/**
 * 脱敏：避免事故卡与 JSON 中带出密码/token 等敏感值
 * @param {string} text 文本
 * @returns {string}
 */
function redact(text) {
  if (!text) return '';
  return String(text)
    .replace(
      /((?:password|passwd|pwd|secret|token|authorization|api[-_ ]?key)\s*[=:]\s*)([^\s,;"']+)/gi,
      '$1***'
    )
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***')
    .replace(/mysql:\/\/[^@\s]+@/gi, 'mysql://***@')
    .replace(/\b[A-Fa-f0-9]{40,}\b/g, '***');
}

function excerpt(text, max = 140) {
  const clean = redact(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function relPath(root, file) {
  if (!file) return '';
  const rel = path.relative(root, file);
  return rel && !rel.startsWith('..') ? rel : file;
}

function ratioText(part, total) {
  if (!total) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

function escapeMdCell(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

// ----------------------------------------------------------------------------
// 参数与上下文
// ----------------------------------------------------------------------------

function parseArgs(argv) {
  const parsed = {
    json: false,
    help: false,
    out: null,
    root: null,
    port: null,
    container: null,
    window: 10,
    sampleMinutes: THRESHOLDS.httpSampleMinutes,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--json') parsed.json = true;
    else if (item === '--help' || item === '-h') parsed.help = true;
    else if (item === '--out') parsed.out = argv[++i] || null;
    else if (item === '--root') parsed.root = argv[++i] || null;
    else if (item === '--port') parsed.port = Number(argv[++i]) || null;
    else if (item === '--container') parsed.container = argv[++i] || null;
    else if (item === '--window') parsed.window = Number(argv[++i]) || 10;
    else if (item === '--sample-minutes') {
      parsed.sampleMinutes = Math.max(1, Number(argv[++i]) || THRESHOLDS.httpSampleMinutes);
    }
  }

  return parsed;
}

function printHelp() {
  process.stdout.write(
    [
      '线上事故应急诊断脚本 v0.2（只读，不会执行任何变更）',
      '',
      '用法：node incident-doctor.js [--json] [--out <dir>] [--root <dir>] [--port <n>] [--container <name>] [--window <min>] [--sample-minutes <min>]',
      '',
      '  --json               输出机器可读 JSON（默认输出中文事故卡）',
      '  --out <dir>          事故卡 Markdown 落盘目录（默认 ./incidents）',
      '  --root <dir>         项目根目录（默认自动探测 backend/server.js 或 backend/.env）',
      '  --port <n>           后端期望端口（默认读取 backend/.env 的 PORT，回退 8000）',
      '  --container <name>   后端容器名（默认自动探测 idc-backend / 名称含 backend 的容器）',
      '  --window <min>       故障与部署时间关联窗口（默认 10 分钟）',
      '  --sample-minutes <min> HTTP 统计时间窗口（默认 60 分钟）',
      '',
      '示例：',
      '  node incident-doctor.js',
      '  node incident-doctor.js --json --out /tmp/incidents',
      '',
    ].join('\n')
  );
}

/**
 * 解析 .env（仅用于读取端口/DB 连接信息，值不会进入输出）
 * @param {string|null} file .env 路径
 * @returns {{keys:Set<string>, values:Map<string,string>}}
 */
function parseEnv(file) {
  const keys = new Set();
  const values = new Map();
  const text = file ? safeRead(file) : null;
  if (!text) return { keys, values };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (!m) continue;
    keys.add(m[1]);
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(m[1], value);
  }

  return { keys, values };
}

function resolveContext(args) {
  const scriptDir = __dirname;
  const cwd = process.cwd();
  const candidates = [cwd, path.resolve(scriptDir, '..')];

  let root = args.root ? path.resolve(args.root) : null;
  if (!root) {
    root =
      candidates.find(
        dir =>
          fs.existsSync(path.join(dir, 'backend', 'server.js')) ||
          fs.existsSync(path.join(dir, 'backend', '.env'))
      ) || cwd;
  }

  const backendDir = fs.existsSync(path.join(root, 'backend', 'server.js'))
    ? path.join(root, 'backend')
    : fs.existsSync(path.join(root, 'server.js'))
      ? root
      : null;

  const envCandidates = [
    backendDir ? path.join(backendDir, '.env') : null,
    path.join(root, '.env'),
  ].filter(Boolean);
  const envFile = envCandidates.find(file => fs.existsSync(file)) || null;

  const exampleCandidates = [
    envFile ? path.join(path.dirname(envFile), '.env.example') : null,
    path.join(root, '.env.example'),
  ].filter(Boolean);
  const exampleFile = exampleCandidates.find(file => fs.existsSync(file)) || null;

  const logCandidates = [
    backendDir ? path.join(backendDir, 'logs') : null,
    path.join(root, 'logs'),
    path.join(scriptDir, 'logs'),
  ].filter(Boolean);
  const logDir = logCandidates.find(isDirectory) || null;

  const packageFile =
    backendDir && fs.existsSync(path.join(backendDir, 'package.json'))
      ? path.join(backendDir, 'package.json')
      : fs.existsSync(path.join(root, 'package.json'))
        ? path.join(root, 'package.json')
        : null;

  const composeFile =
    [
      path.join(root, 'docker-compose.prod.yml'),
      path.join(root, 'docker-compose.dev.yml'),
      path.join(cwd, 'docker-compose.prod.yml'),
      path.join(cwd, 'docker-compose.dev.yml'),
    ].find(file => fs.existsSync(file)) || null;

  const env = parseEnv(envFile);
  const expectedPort = Number(args.port) || Number(env.values.get('PORT')) || 8000;

  return {
    root,
    backendDir,
    envFile,
    exampleFile,
    logDir,
    packageFile,
    composeFile,
    env,
    expectedPort,
    outDir: args.out ? path.resolve(args.out) : path.join(cwd, 'incidents'),
    windowMinutes: Math.max(1, Number(args.window) || 10),
    containerHint: args.container || null,
    json: args.json,
  };
}

// ----------------------------------------------------------------------------
// 采集：系统资源
// ----------------------------------------------------------------------------

function readLinuxMemInfo() {
  const text = safeRead('/proc/meminfo');
  if (!text) return null;
  const pick = key => {
    const m = new RegExp(`${key}\\s*:\\s*(\\d+)\\s*kB`).exec(text);
    return m ? Number(m[1]) * 1024 : null;
  };
  return {
    total: pick('MemTotal'),
    available: pick('MemAvailable'),
    swapTotal: pick('SwapTotal'),
    swapFree: pick('SwapFree'),
  };
}

function collectResources(root) {
  const result = {
    available: true,
    memory: null,
    swap: null,
    disk: null,
    load: null,
    cpuCores: os.cpus().length,
    uptimeSeconds: Math.round(os.uptime()),
    uptimeText: fmtDuration(os.uptime()),
  };

  const memInfo = readLinuxMemInfo();
  let memTotal;
  let memAvailable;
  if (memInfo && memInfo.total) {
    memTotal = memInfo.total;
    memAvailable = memInfo.available !== null ? memInfo.available : os.freemem();
  } else {
    memTotal = os.totalmem();
    memAvailable = os.freemem();
  }

  if (memTotal) {
    const used = Math.max(0, memTotal - memAvailable);
    result.memory = {
      total: memTotal,
      available: memAvailable,
      used,
      usedPercent: (used / memTotal) * 100,
      totalText: fmtBytes(memTotal),
      usedText: fmtBytes(used),
    };
  }

  if (memInfo && memInfo.swapTotal !== null) {
    if (memInfo.swapTotal > 0) {
      const used = Math.max(0, memInfo.swapTotal - (memInfo.swapFree || 0));
      result.swap = {
        total: memInfo.swapTotal,
        used,
        usedPercent: (used / memInfo.swapTotal) * 100,
        totalText: fmtBytes(memInfo.swapTotal),
        usedText: fmtBytes(used),
      };
    } else {
      result.swap = { total: 0, used: 0, usedPercent: 0, note: '未启用 swap' };
    }
  }

  try {
    const stat = fs.statfsSync(root);
    const total = Number(stat.blocks) * Number(stat.bsize);
    const free = Number(stat.bavail) * Number(stat.bsize);
    if (total > 0) {
      const used = total - free;
      result.disk = {
        path: root,
        total,
        free,
        used,
        usedPercent: (used / total) * 100,
        totalText: fmtBytes(total),
        freeText: fmtBytes(free),
      };
    }
  } catch {
    result.disk = null;
  }

  if (process.platform !== 'win32') {
    const load = os.loadavg();
    if (load && load.length) {
      result.load = {
        one: load[0],
        five: load[1],
        fifteen: load[2],
        perCore: result.cpuCores ? load[0] / result.cpuCores : null,
      };
    }
  }

  return result;
}

// ----------------------------------------------------------------------------
// 采集：进程与监听端口
// ----------------------------------------------------------------------------

async function collectProcesses() {
  if (process.platform === 'win32') {
    const r = await run('tasklist', ['/FI', 'IMAGENAME eq node.exe', '/FO', 'CSV', '/NH']);
    if (!r.ok) {
      return { available: false, reason: 'tasklist 不可用', total: 0, samples: [] };
    }
    const lines = r.stdout
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.startsWith('"'));
    const samples = lines.slice(0, 5).map(line => {
      const parts = line.split('","').map(part => part.replace(/^"|"$/g, ''));
      return { pid: parts[1] || '?', mem: parts[4] || '?', args: 'node.exe' };
    });
    return {
      available: true,
      total: lines.length,
      samples,
      note: 'Windows tasklist 无 CPU/启动时间',
    };
  }

  const r = await run('ps', ['-eo', 'pid,pcpu,pmem,etime,args']);
  if (!r.ok) {
    return { available: false, reason: 'ps 不可用', total: 0, samples: [] };
  }

  const rows = r.stdout.split(/\r?\n/).filter(Boolean);
  const samples = [];
  let total = 0;
  for (const row of rows.slice(1)) {
    const parts = row.trim().split(/\s+/);
    if (parts.length < 5) continue;
    const [pid, cpu, mem, etime] = parts;
    const command = parts.slice(4).join(' ');
    if (!/(^|\/)node(\s|$)/.test(command) && !/\bnode\b/.test(command)) continue;
    if (/node incident-doctor\.js/.test(command)) continue;
    total += 1;
    if (samples.length < 5) {
      samples.push({ pid, cpu, mem, uptime: etime, args: excerpt(command, 90) });
    }
  }

  return { available: true, total, samples };
}

function parsePortLine(line, source) {
  if (process.platform === 'win32') {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5 || parts[3] !== 'LISTENING') return null;
    const local = parts[1];
    const m = /:(\d+)$/.exec(local);
    if (!m) return null;
    return { port: Number(m[1]), pid: parts[4], process: null };
  }

  if (source === 'ss') {
    if (!/^LISTEN/.test(line.trim())) return null;
    const parts = line.trim().split(/\s+/);
    const local = parts[3] || '';
    const m = /:(\d+)$/.exec(local);
    if (!m) return null;
    const userPart = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
    return {
      port: Number(m[1]),
      pid: userPart ? userPart[2] : null,
      process: userPart ? userPart[1] : null,
    };
  }

  const parts = line.trim().split(/\s+/);
  if (parts.length < 6) return null;
  const stateIndex = parts.findIndex(part => part === 'LISTEN');
  if (stateIndex < 0) return null;
  const local = parts[3];
  const m = /:(\d+)$/.exec(local);
  if (!m) return null;
  const last = parts[parts.length - 1];
  const pm = /^(\d+)\/(.+)$/.exec(last);
  return {
    port: Number(m[1]),
    pid: pm ? pm[1] : null,
    process: pm ? pm[2] : null,
  };
}

async function collectPorts(expectedPort) {
  let stdout = '';
  let source = '';

  if (process.platform === 'win32') {
    const r = await run('netstat', ['-ano', '-p', 'tcp']);
    if (!r.ok) {
      return { available: false, reason: 'netstat 不可用', ports: [], listening: null };
    }
    stdout = r.stdout;
    source = 'netstat';
  } else {
    const ss = await run('ss', ['-lntp']);
    if (ss.ok && ss.stdout) {
      stdout = ss.stdout;
      source = 'ss';
    } else {
      const ns = await run('netstat', ['-lntp']);
      if (ns.ok && ns.stdout) {
        stdout = ns.stdout;
        source = 'netstat';
      } else {
        const ns2 = await run('netstat', ['-lnt']);
        if (!ns2.ok || !ns2.stdout) {
          return { available: false, reason: 'ss/netstat 不可用', ports: [], listening: null };
        }
        stdout = ns2.stdout;
        source = 'netstat';
      }
    }
  }

  const seen = new Map();
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const item = parsePortLine(line, source);
    if (!item) continue;
    const key = `${item.port}|${item.pid || ''}|${item.process || ''}`;
    if (!seen.has(key)) seen.set(key, item);
  }

  const ports = Array.from(seen.values()).sort((a, b) => a.port - b.port);
  const listening = ports.some(item => item.port === expectedPort);

  return {
    available: true,
    source,
    ports: ports.slice(0, 40),
    listening,
    expectedPort,
    note: ports.length > 40 ? `仅展示前 40 个监听端口（共 ${ports.length} 个）` : '',
  };
}

// ----------------------------------------------------------------------------
// 采集：Docker
// ----------------------------------------------------------------------------

function parseDockerTime(value) {
  const d = toDate(value);
  if (!d || d.getFullYear() < 2000) return null;
  return d;
}

async function collectDocker(containerHint) {
  const cli = await run('docker', ['--version'], { timeout: 5000 });
  if (!cli.ok) {
    return { available: false, reason: 'docker CLI 不可用', container: null, imageCreatedAt: null };
  }

  const ps = await run('docker', ['ps', '-a', '--format', '{{.Names}}'], { timeout: 8000 });
  if (!ps.ok) {
    return {
      available: false,
      reason: 'docker daemon 不可达或当前用户无权限',
      container: null,
      imageCreatedAt: null,
      daemonError: excerpt(ps.stderr || ps.error, 120),
    };
  }

  const names = ps.stdout
    .split(/\r?\n/)
    .map(name => name.trim())
    .filter(Boolean);

  let containerName = containerHint;
  if (!containerName) {
    containerName =
      names.find(name => /backend/i.test(name) && !/frontend/i.test(name)) ||
      names.find(name => /^idc/i.test(name)) ||
      null;
  }

  if (!containerName) {
    return {
      available: true,
      daemon: true,
      container: null,
      imageCreatedAt: null,
      containers: names,
      reason: '未找到后端容器',
    };
  }

  const inspect = await run('docker', ['inspect', containerName], { timeout: 10000 });
  if (!inspect.ok) {
    return {
      available: true,
      daemon: true,
      container: null,
      imageCreatedAt: null,
      containers: names,
      reason: `docker inspect ${containerName} 失败`,
    };
  }

  let info = null;
  try {
    const parsed = JSON.parse(inspect.stdout);
    info = parsed && parsed[0];
  } catch {
    info = null;
  }

  if (!info) {
    return {
      available: true,
      daemon: true,
      container: null,
      imageCreatedAt: null,
      containers: names,
      reason: 'docker inspect 输出无法解析',
    };
  }

  const image = (info.Config && info.Config.Image) || null;
  let imageCreatedAt = null;
  if (image) {
    const ir = await run('docker', ['inspect', '--format', '{{.Created}}', image], {
      timeout: 8000,
    });
    if (ir.ok) imageCreatedAt = parseDockerTime(ir.stdout.trim());
  }

  return {
    available: true,
    daemon: true,
    containers: names,
    container: {
      name: info.Name ? info.Name.replace(/^\//, '') : containerName,
      status: info.State ? info.State.Status : null,
      running: info.State ? Boolean(info.State.Running) : null,
      startedAt: info.State ? parseDockerTime(info.State.StartedAt) : null,
      finishedAt: info.State ? parseDockerTime(info.State.FinishedAt) : null,
      restartCount: info.RestartCount || 0,
      image,
      health: info.State && info.State.Health ? info.State.Health.Status : null,
      created: parseDockerTime(info.Created),
    },
    imageCreatedAt,
  };
}

// ----------------------------------------------------------------------------
// 采集：Git
// ----------------------------------------------------------------------------

async function collectGit(root) {
  const inside = await run('git', ['-C', root, 'rev-parse', '--is-inside-work-tree'], {
    timeout: 5000,
  });
  if (!inside.ok || !inside.stdout.trim().startsWith('true')) {
    return {
      available: false,
      reason: 'git 不可用或当前目录不是 Git 仓库',
      head: null,
      tags: [],
      latestTag: null,
      previousTag: null,
    };
  }

  const headRun = await run('git', ['-C', root, 'log', '-1', '--format=%cI%x1f%h%x1f%s'], {
    timeout: 6000,
  });
  let head = null;
  if (headRun.ok) {
    const [committedAt, shortHash, subject] = headRun.stdout.trim().split('\x1f');
    head = {
      committedAt: toDate(committedAt),
      shortHash: shortHash || null,
      subject: excerpt(subject || '', 100),
    };
  }

  const tagsRun = await run(
    'git',
    [
      '-C',
      root,
      'for-each-ref',
      '--sort=-creatordate',
      '--format=%(creatordate:iso-strict)%1f%(refname:short)',
      'refs/tags',
    ],
    { timeout: 8000 }
  );

  const tags = [];
  if (tagsRun.ok) {
    for (const line of tagsRun.stdout.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const [dateText, name] = line.split('\x1f');
      const date = toDate(dateText);
      if (name) tags.push({ name, date });
      if (tags.length >= 10) break;
    }
  }

  return {
    available: true,
    head,
    tags,
    latestTag: tags[0] || null,
    previousTag: tags[1] || null,
  };
}

// ----------------------------------------------------------------------------
// 采集：探活 / DB / 配置漂移
// ----------------------------------------------------------------------------

function httpProbe(port, pathname, timeout = 5000) {
  return new Promise(resolve => {
    const started = Date.now();
    let settled = false;
    const finish = payload => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };

    const req = http.get(
      {
        host: '127.0.0.1',
        port,
        path: pathname,
        timeout,
        headers: { 'User-Agent': `${TOOL.name}/${TOOL.version}` },
      },
      res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          body += chunk;
          if (body.length > 1024 * 1024) body = body.slice(0, 1024 * 1024);
        });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch {
            json = null;
          }
          finish({
            ok: true,
            statusCode: res.statusCode,
            responseMs: Date.now() - started,
            json,
            body: body.slice(0, 600),
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('ETIMEDOUT'));
    });

    req.on('error', error => {
      finish({
        ok: false,
        error: error.code || error.message,
        errorMessage: error.message,
        responseMs: Date.now() - started,
      });
    });
  });
}

async function collectHealth(port) {
  let result = await httpProbe(port, '/health');
  let pathUsed = '/health';
  let fallbackNote = '';

  if (result.ok && result.statusCode === 404) {
    const fallback = await httpProbe(port, '/api');
    if (fallback.ok && fallback.statusCode < 500) {
      result = fallback;
      pathUsed = '/api';
      fallbackNote = '/health 返回 404，已回退探测 /api';
    }
  } else if (!result.ok) {
    const fallback = await httpProbe(port, '/api');
    if (fallback.ok && fallback.statusCode < 500) {
      result = fallback;
      pathUsed = '/api';
      fallbackNote = '/health 不可达，已回退探测 /api';
    }
  }

  const json = result.json || null;
  const dbCheck = json && Array.isArray(json.checks)
    ? json.checks.find(item => item.name === 'database') || null
    : null;
  const configCheck = json && Array.isArray(json.checks)
    ? json.checks.find(item => item.name === 'config') || null
    : null;

  return {
    available: true,
    path: pathUsed,
    fallbackNote,
    reachable: Boolean(result.ok),
    statusCode: result.ok ? result.statusCode : null,
    responseMs: result.responseMs || null,
    error: result.ok ? null : result.error || 'UNKNOWN',
    bodyStatus: json && json.status ? json.status : null,
    dbCheck: dbCheck
      ? { status: dbCheck.status || null, message: excerpt(dbCheck.message || '', 120) }
      : null,
    configCheck: configCheck
      ? { status: configCheck.status || null }
      : null,
  };
}

function tcpProbe(host, port, timeout = 3000) {
  return new Promise(resolve => {
    const started = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = payload => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ...payload, responseMs: Date.now() - started });
    };

    socket.setTimeout(timeout);
    socket.once('connect', () => finish({ ok: true }));
    socket.once('timeout', () => finish({ ok: false, error: 'ETIMEDOUT' }));
    socket.once('error', error => finish({ ok: false, error: error.code || error.message }));
    socket.connect(port, host);
  });
}

async function collectDb(context, health) {
  const type = (context.env.values.get('DB_TYPE') || 'sqlite').toLowerCase();

  if (type === 'mysql') {
    const host = context.env.values.get('MYSQL_HOST') || 'localhost';
    const port = Number(context.env.values.get('MYSQL_PORT')) || 3306;
    const probe = await tcpProbe(host, port, 3000);
    const healthDbOk = health.dbCheck && health.dbCheck.status === 'ok';
    return {
      available: true,
      type: 'mysql',
      host,
      port,
      reachable: probe.ok,
      error: probe.ok ? null : probe.error,
      responseMs: probe.responseMs,
      note:
        !probe.ok && healthDbOk
          ? '宿主侧 TCP 不可达，但应用健康检查显示 DB 正常（可能为容器网络内部主机名）'
          : !probe.ok && /ENOTFOUND/i.test(probe.error || '')
            ? '主机名无法解析：若为 docker 网络内服务名，请在容器内验证'
            : '',
    };
  }

  const rawPath = context.env.values.get('DB_PATH') || './idc_management.db';
  const candidates = [
    path.resolve(context.root, rawPath),
    path.resolve(context.root, 'backend', rawPath),
    context.backendDir ? path.resolve(context.backendDir, rawPath) : null,
  ].filter(Boolean);
  const found = candidates.find(file => {
    const stat = safeStat(file);
    return stat && stat.isFile();
  });

  const stat = found ? safeStat(found) : null;

  return {
    available: true,
    type: 'sqlite',
    path: found || candidates[0],
    exists: Boolean(found),
    size: stat ? stat.size : null,
    sizeText: stat ? fmtBytes(stat.size) : null,
    modifiedAt: stat ? stat.mtime : null,
    note: found ? '' : 'SQLite 数据库文件不存在或路径不可读',
  };
}

function collectConfigDrift(context) {
  if (!context.envFile) {
    return { available: false, reason: '找不到 .env 文件' };
  }
  if (!context.exampleFile) {
    return { available: false, reason: '找不到 .env.example（生产环境可能未携带）' };
  }

  const envText = safeRead(context.envFile);
  const exampleText = safeRead(context.exampleFile);
  if (envText === null || exampleText === null) {
    return { available: false, reason: '.env / .env.example 读取失败' };
  }

  const env = parseEnv(context.envFile).keys;
  const example = parseEnv(context.exampleFile).keys;
  const missing = Array.from(example).filter(key => !env.has(key)).sort();
  const extra = Array.from(env).filter(key => !example.has(key)).sort();

  return {
    available: true,
    envPath: context.envFile,
    examplePath: context.exampleFile,
    missing,
    extra,
    same: missing.length === 0 && extra.length === 0,
  };
}

// ----------------------------------------------------------------------------
// 采集：错误日志聚类 & 请求认证错误
// ----------------------------------------------------------------------------

function normalizeMessage(message) {
  const text = String(message || '')
    .replace(/\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?\b/g, '<ts>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<uuid>')
    .replace(/\b[0-9a-f]{16,}\b/gi, '<hex>')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '<ip>')
    .replace(/\b\d+(?:\.\d+)?\b/g, '#')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 120) || '(空消息)';
}

function pickStackFrame(stack) {
  if (!stack) return null;
  const lines = String(stack).split('\n').slice(0, 20);
  for (const line of lines) {
    const m = /([^()\s]+):(\d+):(\d+)\)?\s*$/.exec(line.trim());
    if (!m) continue;
    const file = m[1];
    if (/node_modules|internal\/|^node:/.test(file)) continue;
    return {
      file,
      line: Number(m[2]),
      col: Number(m[3]),
      raw: excerpt(line.trim(), 110),
    };
  }
  return null;
}

function parseLogLine(record) {
  let obj = null;
  try {
    obj = JSON.parse(record.text);
  } catch {
    obj = null;
  }

  if (obj && typeof obj === 'object') {
    const meta = obj.metadata && typeof obj.metadata === 'object' ? obj.metadata : {};
    return {
      timestamp: toDate(obj.timestamp) || parseLogTime(record.text),
      message: String(obj.message === undefined ? '' : obj.message),
      module: obj.module || meta.module || '',
      stack: String(meta.stack || obj.stack || ''),
      statusCode: Number(meta.statusCode || obj.statusCode) || null,
      url: meta.url || '',
      level: obj.level || '',
    };
  }

  return {
    timestamp: parseLogTime(record.text),
    message: record.text,
    module: '',
    stack: '',
    statusCode: null,
    url: '',
    level: '',
  };
}

function collectErrorClusters(logDir, maxLines = LOG_LINES) {
  if (!logDir) {
    return {
      available: false,
      reason: '未找到日志目录（backend/logs、logs 均不存在）',
      clusters: [],
      totalScanned: 0,
      files: [],
      latestFile: null,
    };
  }

  const errorDir = path.join(logDir, 'error');
  const dir = isDirectory(errorDir) ? errorDir : logDir;
  const files = safeReaddir(dir)
    .filter(name => /^error-\d{4}-\d{2}-\d{2}\.log$/.test(name))
    .sort()
    .reverse();

  if (!files.length) {
    return {
      available: false,
      reason: `未找到 ${path.join(dir, 'error-YYYY-MM-DD.log')}`,
      clusters: [],
      totalScanned: 0,
      files: [],
      latestFile: null,
    };
  }

  const records = [];
  let remaining = maxLines;
  const usedFiles = [];

  for (const name of files) {
    if (remaining <= 0) break;
    const full = path.join(dir, name);
    const stat = safeStat(full);
    if (!stat || !stat.isFile()) continue;

    const text = safeRead(full);
    if (text === null) continue;

    const lines = text.split(/\r?\n/);
    if (lines.length && lines[lines.length - 1] === '') lines.pop();

    const start = Math.max(0, lines.length - remaining);
    const slice = lines.slice(start);
    slice.forEach((lineText, index) => {
      records.push({ file: name, line: start + index + 1, text: lineText });
    });
    remaining -= slice.length;
    usedFiles.push(name);
  }

  const clusters = new Map();
  let scanned = 0;

  for (const record of records) {
    if (!record.text.trim()) continue;
    const parsed = parseLogLine(record);
    if (!parsed.message && !parsed.stack) continue;

    scanned += 1;

    const frame = pickStackFrame(parsed.stack);
    const frameKey = frame ? path.basename(frame.file) : '';
    const fingerprint = `${normalizeMessage(parsed.message)}${parsed.module ? ` @${parsed.module}` : ''}${
      frameKey ? ` #${frameKey}` : ''
    }`;

    if (!clusters.has(fingerprint)) {
      clusters.set(fingerprint, {
        fingerprint,
        count: 0,
        firstAt: null,
        lastAt: null,
        module: parsed.module,
        sample: record,
        message: parsed.message,
        frames: new Map(),
        statusCodes: new Map(),
        urls: new Map(),
      });
    }

    const cluster = clusters.get(fingerprint);
    cluster.count += 1;

    if (parsed.timestamp) {
      if (!cluster.firstAt || parsed.timestamp < cluster.firstAt) cluster.firstAt = parsed.timestamp;
      if (!cluster.lastAt || parsed.timestamp > cluster.lastAt) cluster.lastAt = parsed.timestamp;
    }

    if (frame) {
      const key = `${frame.file}:${frame.line}`;
      const entry = cluster.frames.get(key) || { count: 0, frame };
      entry.count += 1;
      cluster.frames.set(key, entry);
    }

    if (parsed.statusCode) {
      cluster.statusCodes.set(
        parsed.statusCode,
        (cluster.statusCodes.get(parsed.statusCode) || 0) + 1
      );
    }

    if (parsed.url) {
      cluster.urls.set(parsed.url, (cluster.urls.get(parsed.url) || 0) + 1);
    }
  }

  const list = Array.from(clusters.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(cluster => {
      let bestFrame = null;
      for (const entry of cluster.frames.values()) {
        if (!bestFrame || entry.count > bestFrame.count) bestFrame = entry;
      }

      const statusCodes = Array.from(cluster.statusCodes.keys());
      const urls = Array.from(cluster.urls.keys()).slice(0, 5);

      return {
        fingerprint: cluster.fingerprint,
        count: cluster.count,
        firstAt: cluster.firstAt,
        firstAtText: fmtDateTime(cluster.firstAt),
        lastAt: cluster.lastAt,
        lastAtText: fmtDateTime(cluster.lastAt),
        module: cluster.module,
        file: cluster.sample.file,
        line: cluster.sample.line,
        message: excerpt(cluster.message, 150),
        frame: bestFrame ? bestFrame.frame : null,
        statusCodes,
        urls,
      };
    });

  return {
    available: true,
    clusters: list,
    totalScanned: scanned,
    files: usedFiles,
    latestFile: usedFiles[0] ? path.join(dir, usedFiles[0]) : null,
    logDir: dir,
    note: usedFiles.length
      ? `读取 ${usedFiles.length} 个文件共 ${records.length} 行（上限 ${maxLines} 行）`
      : '',
  };
}

// ----------------------------------------------------------------------------
// 采集：HTTP 响应统计（时间窗口 + 基线对比）
// ----------------------------------------------------------------------------

/**
 * 本应可匿名访问的接口（这些接口返回 401/403 才可能是异常）。
 * 注意：/api/auth/login 输错密码同样返回 401，属于正常业务拒绝，不列入。
 */
const PUBLIC_ENDPOINTS = [
  '/api/auth/register',
  '/api/auth/forgot-password/send-code',
  '/api/auth/forgot-password/reset',
  '/api/auth/check-admin',
  '/api/health',
  '/health',
  '/api/maintenance',
  '/api/system-settings/system/info',
  '/api/port-options',
  '/api-docs',
  '/api/docs',
];

/**
 * 判断 URL 是否属于本应公开访问的接口
 * @param {string} url 请求路径
 * @returns {boolean}
 */
function isPublicEndpoint(url) {
  const clean = String(url || '').split('?')[0];
  return PUBLIC_ENDPOINTS.some(item => clean === item || clean.startsWith(`${item}/`));
}

/**
 * 日期键（本地时区）YYYY-MM-DD，用于匹配 request 日志文件名
 * @param {number} ms 时间戳
 * @returns {string}
 */
function dateKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * 读取并缓存 request 日志文件行
 * @param {string} dir 日志目录
 * @param {string} name 文件名
 * @param {Map} cache 行缓存（多个窗口复用，避免重复读取）
 * @returns {string[]}
 */
function loadRequestLines(dir, name, cache) {
  if (cache && cache.has(name)) return cache.get(name);
  const text = safeRead(path.join(dir, name));
  const lines = text === null ? [] : text.split(/\r?\n/);
  if (cache) cache.set(name, lines);
  return lines;
}

/**
 * 单个时间窗口的 HTTP 聚合结构
 * @returns {Object}
 */
function emptyHttpAggregate() {
  return {
    filesFound: 0,
    linesScanned: 0,
    totalResponses: 0,
    count2xx: 0,
    count3xx: 0,
    count4xx: 0,
    count401: 0,
    count403: 0,
    count404: 0,
    count5xx: 0,
    countOther: 0,
    firstAt: null,
    lastAt: null,
    first5xxAt: null,
    last5xxAt: null,
    firstAuthAt: null,
    lastAuthAt: null,
    ipsAuth: new Map(),
    pathsAuth: new Map(),
    paths5xx: new Map(),
    publicAuth: new Map(),
    login: { attempts: 0, success: 0, failed: 0 },
  };
}

/**
 * Map 计数转为排序后的 top 列表
 * @param {Map<string, number>} map 计数
 * @param {number} limit 返回条数
 * @returns {Array<{name: string, hits: number}>}
 */
function topEntries(map, limit = 5) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, hits]) => ({ name, hits }));
}

/**
 * 扫描指定时间窗口内的 HTTP 响应行。
 * request 日志是 debug 复合日志（含 Sequelize/probeScheduler 等），
 * 只统计 module=HTTP 且 metadata.statusCode 存在的响应行。
 * @param {string} logDir 日志根目录
 * @param {number} startMs 窗口开始（含）
 * @param {number} endMs 窗口结束（不含）
 * @param {Map} cache 文件行缓存
 * @returns {Object} HTTP 聚合
 */
function scanHttpWindow(logDir, startMs, endMs, cache) {
  const agg = emptyHttpAggregate();
  if (!logDir) return agg;

  const requestDir = path.join(logDir, 'request');
  const dir = isDirectory(requestDir) ? requestDir : logDir;
  const startDate = dateKey(startMs);
  const endDate = dateKey(endMs);
  const names = safeReaddir(dir)
    .filter(name => /^request-\d{4}-\d{2}-\d{2}\.log(\.\d+)?$/.test(name))
    .filter(name => {
      const fileDate = name.slice(8, 18);
      return fileDate >= startDate && fileDate <= endDate;
    })
    .sort();

  for (const name of names) {
    const lines = loadRequestLines(dir, name, cache);
    if (!lines.length) continue;
    agg.filesFound += 1;

    for (const text of lines) {
      if (!text || !text.trim()) continue;
      agg.linesScanned += 1;
      // 廉价过滤：HTTP 响应行才包含 statusCode，避免对全部 debug 行 JSON.parse
      if (text.indexOf('"statusCode"') === -1) continue;

      let obj = null;
      try {
        obj = JSON.parse(text);
      } catch {
        obj = null;
      }
      if (!obj) continue;
      if (obj.module && obj.module !== 'HTTP') continue;

      const meta = obj.metadata || {};
      const status = Number(meta.statusCode);
      if (!status) continue;

      const time = parseLogTime(obj.timestamp || text);
      if (!time) continue;
      const at = time.getTime();
      if (at < startMs || at >= endMs) continue;

      agg.totalResponses += 1;
      if (!agg.firstAt || time < agg.firstAt) agg.firstAt = time;
      if (!agg.lastAt || time > agg.lastAt) agg.lastAt = time;

      const url = String(meta.url || '');
      const pathOnly = url.split('?')[0];

      if (status >= 200 && status < 300) agg.count2xx += 1;
      else if (status >= 300 && status < 400) agg.count3xx += 1;
      else if (status >= 400 && status < 500) {
        agg.count4xx += 1;
        if (status === 401) agg.count401 += 1;
        else if (status === 403) agg.count403 += 1;
        else if (status === 404) agg.count404 += 1;
      } else if (status >= 500) {
        agg.count5xx += 1;
        agg.paths5xx.set(pathOnly, (agg.paths5xx.get(pathOnly) || 0) + 1);
        if (!agg.first5xxAt || time < agg.first5xxAt) agg.first5xxAt = time;
        if (!agg.last5xxAt || time > agg.last5xxAt) agg.last5xxAt = time;
      } else {
        agg.countOther += 1;
      }

      if (status === 401 || status === 403) {
        agg.pathsAuth.set(pathOnly, (agg.pathsAuth.get(pathOnly) || 0) + 1);
        const ip = String(meta.ip || '未知');
        agg.ipsAuth.set(ip, (agg.ipsAuth.get(ip) || 0) + 1);
        if (isPublicEndpoint(pathOnly)) {
          agg.publicAuth.set(pathOnly, (agg.publicAuth.get(pathOnly) || 0) + 1);
        }
        if (!agg.firstAuthAt || time < agg.firstAuthAt) agg.firstAuthAt = time;
        if (!agg.lastAuthAt || time > agg.lastAuthAt) agg.lastAuthAt = time;
      }

      if (pathOnly === '/api/auth/login') {
        agg.login.attempts += 1;
        if (status < 400) agg.login.success += 1;
        else agg.login.failed += 1;
      }
    }
  }

  return agg;
}

/**
 * 推断 HTTP 日志的记录完整度。
 * - debug：记录全部响应（2xx/3xx/4xx/5xx）
 * - info/warn：仅记录 4xx/5xx（成功响应未落盘）
 * - error：仅记录 5xx
 * 存在 LOG_SAMPLING.HTTP 时成功响应会被采样，占比不可用。
 * @param {Object} context 上下文
 * @returns {Object}
 */
function httpLogProfile(context) {
  const values = (context.env && context.env.values) || new Map();
  let moduleLevels = {};
  let sampling = {};
  try {
    moduleLevels = JSON.parse(values.get('MODULE_LOG_LEVELS') || '{}');
  } catch {
    moduleLevels = {};
  }
  try {
    sampling = JSON.parse(values.get('LOG_SAMPLING') || '{}');
  } catch {
    sampling = {};
  }

  if (!context.envFile) {
    return {
      known: false,
      level: null,
      samplingRate: 1,
      completeness: 'unknown',
      rateUsable: false,
      note: '未找到 backend/.env，无法确认 request 日志记录级别，不输出占比结论',
    };
  }

  const nodeEnv = values.get('NODE_ENV') || process.env.NODE_ENV || 'development';
  const baseLevel = values.get('LOG_LEVEL') || (nodeEnv === 'production' ? 'info' : 'debug');
  const level = String(moduleLevels.HTTP || baseLevel).toLowerCase();
  const rawRate = sampling.HTTP && typeof sampling.HTTP.rate === 'number' ? sampling.HTTP.rate : 1;
  const samplingRate = Math.max(0, Math.min(1, rawRate));

  let completeness = 'unknown';
  let note = '';

  if (level === 'debug') {
    completeness = 'full';
    note =
      samplingRate < 1
        ? `request 日志为 debug 复合日志；HTTP 采样率 ${samplingRate}，成功响应被采样，占比不可用`
        : 'request 日志为 debug 复合日志，仅统计 module=HTTP 且带 statusCode 的响应行；成功响应完整，可计算占比';
  } else if (level === 'info' || level === 'warn') {
    completeness = 'errors-only';
    note = `request 日志为 debug 复合日志；HTTP 有效级别为 ${level}，仅记录 4xx/5xx（成功响应未落盘），不输出响应占比`;
  } else if (level === 'error') {
    completeness = 'server-errors-only';
    note = 'request 日志为 debug 复合日志；HTTP 有效级别为 error，仅记录 5xx（4xx 未落盘），无法统计 401/403';
  }

  return {
    known: true,
    level,
    samplingRate,
    completeness,
    rateUsable: completeness === 'full' && samplingRate >= 1,
    note,
  };
}

/**
 * 占比；样本不可用时返回 null
 */
function ratio(part, total, usable) {
  if (!usable || !total) return null;
  return part / total;
}

/**
 * 变化倍数文本
 * @param {number} current 当前计数
 * @param {number|null} base 基线计数
 * @returns {string}
 */
function factorText(current, base) {
  if (base === null || base === undefined) return '无基线';
  if (base === 0) return current > 0 ? '基线为 0（新增）' : '持平';
  return `${(current / base).toFixed(1)} 倍`;
}

/**
 * 百分比文本
 */
function pctText(value) {
  if (value === null || value === undefined) return '不可用';
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * 时间窗口的时钟文本 HH:mm
 */
function clockText(ms) {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * 采集 HTTP 响应统计并给出基线对比与 401/403 升级判定。
 * 所有率类指标都带基线；样本不足或日志不完整时不输出占比。
 * @param {Object} context 上下文
 * @param {number} minutes 统计窗口（分钟）
 * @param {Date} now 当前时间
 * @returns {Object}
 */
function collectHttpStats(context, minutes, now = new Date()) {
  const profile = httpLogProfile(context);
  const windowMinutes = Math.max(1, Number(minutes) || THRESHOLDS.httpSampleMinutes);
  const windowMs = windowMinutes * 60000;
  const endMs = now.getTime();
  const startMs = endMs - windowMs;
  const cache = new Map();

  if (!context.logDir) {
    return {
      available: false,
      reason: '无日志目录',
      profile,
      rateUsable: false,
      baseline: { available: false, reason: '无日志目录' },
      auth: null,
      sampleInsufficient: false,
    };
  }

  const current = scanHttpWindow(context.logDir, startMs, endMs, cache);
  if (!current.filesFound) {
    return {
      available: false,
      reason: `最近 ${windowMinutes} 分钟未找到 request 日志`,
      profile,
      rateUsable: false,
      baseline: { available: false, reason: `最近 ${windowMinutes} 分钟未找到 request 日志` },
      auth: null,
      sampleInsufficient: false,
    };
  }

  // ---- 基线：前一日同时段 -> 上周同时段 -> 紧邻前一窗口 ----
  const dayMs = 24 * 60 * 60 * 1000;
  const candidates = [
    {
      source: 'yesterday',
      label: '前一日同时段',
      startMs: startMs - dayMs,
      endMs: endMs - dayMs,
    },
    {
      source: 'week_ago',
      label: '上周同时段',
      startMs: startMs - 7 * dayMs,
      endMs: endMs - 7 * dayMs,
    },
    {
      source: 'previous',
      label: '紧邻前一窗口',
      startMs: startMs - windowMs,
      endMs: startMs,
    },
  ];

  let baseline = null;
  let fallback = null;
  for (const candidate of candidates) {
    const agg = scanHttpWindow(context.logDir, candidate.startMs, candidate.endMs, cache);
    if (!agg.filesFound) continue;
    const coverage =
      agg.firstAt && agg.lastAt ? (agg.lastAt.getTime() - agg.firstAt.getTime()) / 60000 : 0;
    const sufficient = profile.rateUsable
      ? agg.totalResponses >= THRESHOLDS.baselineMinResponses && coverage >= 5
      : true;
    const entry = {
      ...agg,
      source: candidate.source,
      label: candidate.label,
      coverageMinutes: Math.round(coverage * 10) / 10,
      windowText: `${clockText(candidate.startMs)}–${clockText(candidate.endMs - 1)}`,
      sufficient,
    };
    if (!fallback) fallback = entry;
    if (sufficient) {
      baseline = entry;
      break;
    }
  }

  if (!baseline && fallback) {
    baseline = { ...fallback, sufficient: false };
  }

  const countAuth = current.count401 + current.count403;
  const rate5xx = ratio(current.count5xx, current.totalResponses, profile.rateUsable);
  const rate4xx = ratio(current.count4xx, current.totalResponses, profile.rateUsable);
  const rateAuth = ratio(countAuth, current.totalResponses, profile.rateUsable);

  const baselineAuth = baseline ? baseline.count401 + baseline.count403 : null;
  const baselineRate5xx = baseline
    ? ratio(baseline.count5xx, baseline.totalResponses, profile.rateUsable)
    : null;
  const baselineRateAuth = baseline
    ? ratio(baselineAuth, baseline.totalResponses, profile.rateUsable)
    : null;

  const factor5xx = baseline ? factorText(current.count5xx, baseline.count5xx) : '无基线';
  const authFactor = baseline ? factorText(countAuth, baselineAuth) : '无基线';

  // ---- 5xx 突增判定（只依赖失败请求绝对计数，基线存在时要求显著倍数）----
  const surge5xx =
    current.count5xx >= THRESHOLDS.http5xxMinCount &&
    (!baseline ||
      baseline.count5xx === 0 ||
      current.count5xx / baseline.count5xx >= THRESHOLDS.http5xxSurgeFactor);

  // ---- 401/403 升级判定：突增 + 至少一项辅助条件 ----
  const topIp = topEntries(current.ipsAuth, 1)[0] || null;
  const ipConcentrated = Boolean(
    topIp &&
      countAuth >= 8 &&
      current.ipsAuth.size <= THRESHOLDS.authIpMaxDistinct &&
      topIp.hits / countAuth >= THRESHOLDS.authIpShare
  );
  const publicHit = current.publicAuth.size > 0;
  const loginDrop = Boolean(
    baseline &&
      current.login.attempts >= 10 &&
      baseline.login.attempts >= 10 &&
      current.login.success / current.login.attempts <=
        baseline.login.success / baseline.login.attempts - THRESHOLDS.loginDropPp
  );
  const surgeAuth = Boolean(
    baseline &&
      countAuth >= THRESHOLDS.authMinCount &&
      (baselineAuth === 0 || countAuth / baselineAuth >= THRESHOLDS.authSurgeFactor)
  );
  const authFault = surgeAuth && (ipConcentrated || publicHit || loginDrop);

  const authConditions = [
    baseline
      ? `相对基线${surgeAuth ? '显著突增' : '未显著突增'}（${countAuth} 次 vs 基线 ${baselineAuth} 次，${authFactor}）`
      : `无可用基线，无法判断是否突增（当前 ${countAuth} 次）`,
    `来源 IP ${ipConcentrated ? '高度集中' : '分散'}（${current.ipsAuth.size} 个）`,
    publicHit ? '命中本应公开接口' : '未命中本应公开接口',
    loginDrop ? '登录成功率同步骤降' : '登录成功率无异常',
  ];

  let authLabel = '无';
  if (authFault) authLabel = '异常 401/403 突增（满足多项条件）';
  else if (countAuth > 0) authLabel = '正常未登录/凭证拒绝流量';

  const notes = [];
  if (profile.note) notes.push(profile.note);
  if (profile.rateUsable && current.totalResponses < THRESHOLDS.httpSampleMinResponses) {
    notes.push(
      `统计窗口内仅 ${current.totalResponses} 条响应（< ${THRESHOLDS.httpSampleMinResponses}），率类结论样本不足`
    );
  }
  if (!baseline) {
    notes.push('未取得可比基线（前一日/上周同时段日志缺失），只能使用绝对计数');
  } else if (!baseline.sufficient) {
    notes.push(
      `基线样本不足（${baseline.totalResponses} 条响应 < ${THRESHOLDS.baselineMinResponses}），倍数仅作参考`
    );
  }
  if (current.count5xx === 0 && current.count4xx > 0) {
    notes.push('窗口内 4xx 均为协议层请求拒绝（401/403/404），不作为故障判定依据');
  }

  const coverageMinutes =
    current.firstAt && current.lastAt
      ? Math.round(((current.lastAt.getTime() - current.firstAt.getTime()) / 60000) * 10) / 10
      : 0;

  const scopeText = `最近 ${windowMinutes} 分钟（${clockText(startMs)}–${clockText(
    endMs - 1
  )}）共 ${current.totalResponses} 条 HTTP 响应（扫描 ${current.filesFound} 个文件 / ${current.linesScanned} 行）`;

  const baselineLabel = baseline ? baseline.label : null;
  const baselineSummary = baseline
    ? `基线 ${baselineLabel}：5xx ${baseline.count5xx} 次、4xx ${baseline.count4xx} 次（401/403 ${baselineAuth} 次）`
    : '无可用基线';

  const observationText = `最近 ${windowMinutes} 分钟 ${current.totalResponses} 条响应：5xx ${
    current.count5xx
  }${baseline ? `（${factor5xx}）` : ''}、4xx ${current.count4xx}（401/403 ${countAuth}${
    baseline ? `，${authFactor}` : ''
  }）；${
    baseline ? `基线 ${baselineLabel} 5xx ${baseline.count5xx}、401/403 ${baselineAuth}` : '无基线'
  }`;

  const signalText = `最近 ${windowMinutes} 分钟 5xx ${current.count5xx} 次${
    baseline ? `（${baselineLabel}基线 ${baseline.count5xx} 次，${factor5xx}）` : '（无可用基线）'
  }`;

  return {
    available: true,
    reason: null,
    sampleMinutes: windowMinutes,
    windowStartText: clockText(startMs),
    windowEndText: clockText(endMs - 1),
    scopeText,
    observationText,
    signalText,
    baselineSummary,
    filesFound: current.filesFound,
    linesScanned: current.linesScanned,
    totalResponses: current.totalResponses,
    count2xx: current.count2xx,
    count3xx: current.count3xx,
    count4xx: current.count4xx,
    count401: current.count401,
    count403: current.count403,
    count404: current.count404,
    count5xx: current.count5xx,
    countOther: current.countOther,
    rate4xx,
    rateAuth,
    rate5xx,
    rateUsable: profile.rateUsable,
    coverageMinutes,
    firstAt: current.firstAt,
    lastAt: current.lastAt,
    firstAtText: fmtDateTime(current.firstAt),
    lastAtText: fmtDateTime(current.lastAt),
    first5xxAt: current.first5xxAt,
    last5xxAt: current.last5xxAt,
    first5xxAtText: fmtDateTime(current.first5xxAt),
    last5xxAtText: fmtDateTime(current.last5xxAt),
    firstAuthAt: current.firstAuthAt,
    lastAuthAt: current.lastAuthAt,
    firstAuthAtText: fmtDateTime(current.firstAuthAt),
    lastAuthAtText: fmtDateTime(current.lastAuthAt),
    topPaths5xx: topEntries(current.paths5xx),
    topPathsAuth: topEntries(current.pathsAuth),
    topIpsAuth: topEntries(current.ipsAuth),
    publicAuth: topEntries(current.publicAuth),
    login: {
      ...current.login,
      successRate: current.login.attempts
        ? current.login.success / current.login.attempts
        : null,
    },
    completeness: profile.completeness,
    httpLevel: profile.level,
    samplingRate: profile.samplingRate,
    profileNote: profile.note,
    notes,
    sampleInsufficient:
      profile.rateUsable && current.totalResponses < THRESHOLDS.httpSampleMinResponses,
    surge5xx,
    auth: {
      count: countAuth,
      count401: current.count401,
      count403: current.count403,
      baselineCount: baselineAuth,
      factor: authFactor,
      surge: surgeAuth,
      ipConcentrated,
      publicHit,
      loginDrop,
      isFault: authFault,
      label: authLabel,
      note: authConditions.join('；'),
      shortNote: authFault
        ? `401/403 ${countAuth} 次，满足多项升级条件，判定为异常`
        : `401/403 ${countAuth} 次，未同时满足升级条件，归为正常未登录流量`,
      firstAtText: fmtDateTime(current.firstAuthAt),
      lastAtText: fmtDateTime(current.lastAuthAt),
    },
    baseline: baseline
      ? {
          available: true,
          source: baseline.source,
          label: baseline.label,
          windowText: baseline.windowText,
          sufficient: baseline.sufficient,
          totalResponses: baseline.totalResponses,
          count2xx: baseline.count2xx,
          count3xx: baseline.count3xx,
          count4xx: baseline.count4xx,
          count401: baseline.count401,
          count403: baseline.count403,
          count404: baseline.count404,
          count5xx: baseline.count5xx,
          countAuth: baselineAuth,
          rate4xx: ratio(baseline.count4xx, baseline.totalResponses, profile.rateUsable),
          rateAuth: baselineRateAuth,
          rate5xx: baselineRate5xx,
          login: {
            ...baseline.login,
            successRate: baseline.login.attempts
              ? baseline.login.success / baseline.login.attempts
              : null,
          },
          coverageMinutes: baseline.coverageMinutes,
        }
      : {
          available: false,
          reason: fallback ? '基线样本不足' : '前一日/上周同时段无 request 日志',
        },
    comparison: {
      baselineLabel,
      factor5xx,
      factorAuth: authFactor,
      factor5xxValue: baseline ? (baseline.count5xx === 0 ? null : current.count5xx / baseline.count5xx) : null,
      surge5xx,
      surgeAuth,
    },
  };
}


// ----------------------------------------------------------------------------
// 分析与判定
// ----------------------------------------------------------------------------

function buildDeployment(context, git, docker) {
  const packageInfo = context.packageFile ? readJson(context.packageFile) : null;
  const envStat = context.envFile ? safeStat(context.envFile) : null;

  const events = [];

  if (docker && docker.container && docker.container.startedAt) {
    events.push({
      source: 'container_start',
      label: '容器启动',
      at: docker.container.startedAt,
    });
  }
  if (docker && docker.imageCreatedAt) {
    events.push({
      source: 'image_created',
      label: '镜像创建',
      at: docker.imageCreatedAt,
    });
  }
  if (git && git.latestTag && git.latestTag.date) {
    events.push({
      source: 'git_tag',
      label: `Git tag ${git.latestTag.name}`,
      at: git.latestTag.date,
    });
  }
  if (git && git.head && git.head.committedAt) {
    events.push({
      source: 'git_commit',
      label: 'Git 提交',
      at: git.head.committedAt,
    });
  }
  if (envStat) {
    events.push({
      source: 'env_mtime',
      label: '.env 修改',
      at: envStat.mtime,
    });
  }

  for (const event of events) event.at = toDate(event.at);
  events.sort((a, b) => (b.at ? b.at.getTime() : 0) - (a.at ? a.at.getTime() : 0));

  const version = {
    packageVersion: packageInfo && packageInfo.version ? packageInfo.version : null,
    latestTag: git && git.latestTag ? git.latestTag.name : null,
    image: docker && docker.container ? docker.container.image : null,
  };

  return {
    primary: events[0] || null,
    events,
    version,
    versionLabel:
      version.latestTag || version.packageVersion || (version.image ? version.image.split('/').pop() : '未知'),
    git: git
      ? {
          available: git.available,
          reason: git.reason || null,
          head: git.head,
          tags: git.tags,
          latestTag: git.latestTag,
          previousTag: git.previousTag,
        }
      : { available: false, reason: '未采集', head: null, tags: [], latestTag: null, previousTag: null },
    env: context.envFile
      ? {
          path: context.envFile,
          modifiedAt: envStat ? envStat.mtime : null,
          size: envStat ? envStat.size : null,
        }
      : { path: null, modifiedAt: null },
    container: docker && docker.container ? docker.container : null,
    image: docker
      ? {
          createdAt: docker.imageCreatedAt,
          name: docker.container ? docker.container.image : null,
        }
      : { createdAt: null, name: null },
  };
}

function clusterEvidenceText(cluster) {
  const parts = [
    `[${cluster.file}:${cluster.line}] 出现 ${cluster.count} 次（首次 ${cluster.firstAtText}）`,
  ];
  if (cluster.message) parts.push(`“${cluster.message}”`);
  if (cluster.frame) parts.push(`栈 ${cluster.frame.file}:${cluster.frame.line}`);
  return redact(parts.join(' '));
}

function buildAnalysis(context, collected) {
  const { health, db, resources, httpStats, errorLogs } = collected;
  const clusters = errorLogs.clusters || [];
  const topCluster = clusters[0] || null;
  const windowMs = context.windowMinutes * 60000;
  const now = new Date();

  const httpAvailable = Boolean(httpStats && httpStats.available);
  const auth = httpAvailable && httpStats.auth ? httpStats.auth : null;
  const authFault = Boolean(auth && auth.isFault);
  const count5xx = httpAvailable ? httpStats.count5xx : 0;
  const first5xxAt = httpAvailable ? httpStats.first5xxAt : null;
  const sampleInsufficient = Boolean(httpStats && httpStats.sampleInsufficient);

  const deployEvents = collected.deployment.events.filter(event => event.at);

  let matched = null;
  for (const cluster of clusters) {
    if (!cluster.firstAt || cluster.count < 2) continue;
    const firstAt = toDate(cluster.firstAt);
    if (!firstAt) continue;
    for (const event of deployEvents) {
      const diff = Math.abs(firstAt.getTime() - event.at.getTime());
      if (diff <= windowMs && (!matched || diff < matched.diff)) {
        matched = { cluster, event, diff, kind: 'cluster' };
      }
    }
  }

  // 5xx 首次出现时间与部署重合，同样按发布引入处理（需达到最小 5xx 次数）
  if (!matched && count5xx >= THRESHOLDS.http5xxMinCount && first5xxAt) {
    const firstAt = toDate(first5xxAt);
    if (firstAt) {
      for (const event of deployEvents) {
        const diff = Math.abs(firstAt.getTime() - event.at.getTime());
        if (diff <= windowMs && (!matched || diff < matched.diff)) {
          matched = { cluster: null, event, diff, kind: 'http5xx' };
        }
      }
    }
  }

  const healthFailing =
    health.available &&
    (!health.reachable || (health.statusCode && health.statusCode >= 500) || health.bodyStatus === 'error');

  if (!matched && healthFailing && deployEvents.length) {
    const nowMs = Date.now();
    for (const event of deployEvents) {
      const diff = Math.abs(nowMs - event.at.getTime());
      if (diff <= windowMs && (!matched || diff < matched.diff)) {
        matched = { cluster: null, event, diff, kind: 'health' };
      }
    }
  }

  const diffMinutes = matched ? Math.round((matched.diff / 60000) * 10) / 10 : null;

  const externalClusters = clusters.filter(cluster =>
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ENETUNREACH|EHOSTUNREACH|ECONNRESET|socket hang up/i.test(
      `${cluster.message}`
    )
  );
  const dbDown =
    db.available &&
    ((db.type === 'mysql' && !db.reachable && !(health.dbCheck && health.dbCheck.status === 'ok')) ||
      (db.type === 'sqlite' && !db.exists));

  const diskPct = resources.disk ? resources.disk.usedPercent : null;
  const memPct = resources.memory ? resources.memory.usedPercent : null;
  const swapPct = resources.swap ? resources.swap.usedPercent : null;

  const diskTrigger = diskPct !== null && diskPct >= THRESHOLDS.diskWarn;
  const memTrigger = memPct !== null && memPct >= THRESHOLDS.memWarn;
  const swapTrigger = swapPct !== null && swapPct >= THRESHOLDS.swapWarn;
  const resourceTrigger = diskTrigger || memTrigger || swapTrigger;
  const resourceHigh =
    (diskPct !== null && diskPct >= THRESHOLDS.diskCritical) ||
    (memPct !== null && memPct >= THRESHOLDS.memCritical) ||
    (swapPct !== null && swapPct >= THRESHOLDS.swapCritical);

  // 代码异常必须伴随 5xx；仅有栈但没有 5xx 的聚类不足以定性为故障
  const codeCluster = clusters.find(
    cluster =>
      cluster.count >= THRESHOLDS.codeBurstCount &&
      cluster.statusCodes.some(code => code >= 500)
  );
  const codeHigh = Boolean(codeCluster && codeCluster.count >= THRESHOLDS.codeBurstHigh);
  const exceptionCluster = clusters.find(
    cluster => cluster.count >= THRESHOLDS.codeBurstCount && (cluster.frame || cluster.statusCodes.length)
  );
  const serverErrorTrigger = Boolean(httpAvailable && count5xx >= THRESHOLDS.http5xxMinCount);
  const httpBase = httpAvailable ? httpStats.signalText : null;

  let verdict;

  if (matched) {
    let faultStart;
    let faultStartNote = '';
    let signalText = null;

    if (matched.kind === 'cluster') {
      faultStart = toDate(matched.cluster.firstAt) || now;
      signalText = clusterEvidenceText(matched.cluster);
    } else if (matched.kind === 'http5xx') {
      faultStart = toDate(first5xxAt) || now;
      signalText = httpBase;
    } else {
      faultStart = now;
      faultStartNote = '依据当前探活失败时间（日志证据不足）';
    }

    const evidence = [
      `故障首次出现 ${fmtDateTime(faultStart)}，与「${matched.event.label}」（${fmtDateTime(
        matched.event.at
      )}）相差 ${diffMinutes} 分钟（阈值 ±${context.windowMinutes} 分钟）`,
      signalText,
      `当前版本 ${collected.deployment.versionLabel}；回滚目标 ${
        collected.deployment.git.previousTag ? collected.deployment.git.previousTag.name : '需人工确认上一版本'
      }`,
    ].filter(Boolean);

    verdict = {
      code: 'release_suspect',
      label: '疑似发布引入',
      confidence: matched.kind === 'health' ? '中' : '高',
      score: matched.kind === 'health' ? 0.65 : 0.85,
      reason:
        matched.kind === 'health'
          ? '当前探活失败与最近部署时间重合，但日志证据不足，按发布引入优先排查'
          : '故障起始时间与最近一次部署/变更高度重合，优先怀疑本次发布引入的缺陷',
      evidence,
      faultStartedAt: faultStart,
      faultStartedAtText: fmtDateTime(faultStart),
      faultStartNote,
      deployAt: matched.event.at,
      deployAtText: fmtDateTime(matched.event.at),
      deploySource: matched.event.label,
      diffMinutes,
      windowMinutes: context.windowMinutes,
      matchKind: matched.kind,
    };
  } else if (resourceTrigger) {
    const items = [];
    if (diskTrigger) items.push(`磁盘使用率 ${diskPct.toFixed(1)}%`);
    if (memTrigger) items.push(`内存使用率 ${memPct.toFixed(1)}%`);
    if (swapTrigger) items.push(`Swap 使用率 ${swapPct.toFixed(1)}%`);

    const evidence = [
      `${items.join('，')}（阈值：磁盘 ${THRESHOLDS.diskWarn}% / 内存 ${THRESHOLDS.memWarn}% / swap ${THRESHOLDS.swapWarn}%）`,
    ];
    if (resources.disk) {
      evidence.push(
        `磁盘剩余 ${resources.disk.freeText} / 总计 ${resources.disk.totalText}（${resources.disk.path}）`
      );
    }
    if (topCluster) evidence.push(clusterEvidenceText(topCluster));
    if (resources.load) {
      evidence.push(
        `Load ${resources.load.one.toFixed(2)} / ${resources.load.five.toFixed(
          2
        )} / ${resources.load.fifteen.toFixed(2)}（${resources.cpuCores} 核）`
      );
    }

    verdict = {
      code: 'resource_exhaustion',
      label: '资源耗尽',
      confidence: resourceHigh ? '高' : '中',
      score: resourceHigh ? 0.85 : 0.6,
      reason: '系统资源超过安全阈值，可能导致写入失败、请求超时或进程被 OOM 终止',
      evidence: evidence.slice(0, 3),
      faultStartedAt: now,
      faultStartedAtText: fmtDateTime(now),
      faultStartNote: '依据当前资源快照（日志未提供精确起点）',
      deployAt: null,
      deployAtText: null,
      deploySource: null,
      diffMinutes: null,
      windowMinutes: context.windowMinutes,
    };
  } else if (dbDown || externalClusters.length >= 1) {
    const evidence = [];
    if (db.type === 'mysql') {
      evidence.push(
        `数据库 ${db.host}:${db.port} ${db.reachable ? '可达' : `不可达（${db.error || '未知错误'}）`}`
      );
    } else {
      evidence.push(
        `SQLite 文件 ${db.exists ? '存在' : '缺失'}：${db.path}${db.exists ? `（${db.sizeText}）` : ''}`
      );
    }
    if (externalClusters.length) {
      const externalCluster = externalClusters[0];
      evidence.push(clusterEvidenceText(externalCluster));
    }
    if (health.dbCheck) {
      evidence.push(`健康检查 DB：${health.dbCheck.status} ${health.dbCheck.message}`);
    } else if (db.note) {
      evidence.push(db.note);
    }

    verdict = {
      code: 'external_dependency',
      label: '外部依赖不可达',
      confidence: dbDown || externalClusters.some(cluster => cluster.count >= 5) ? '高' : '中',
      score: dbDown ? 0.85 : 0.65,
      reason: '数据库/外部服务连接失败，依赖该能力的接口会整体不可用',
      evidence: evidence.filter(Boolean).slice(0, 3),
      faultStartedAt: (externalClusters.length && toDate(externalClusters[0].firstAt)) || now,
      faultStartedAtText: fmtDateTime(
        (externalClusters.length && toDate(externalClusters[0].firstAt)) || now
      ),
      faultStartNote: externalClusters.length && toDate(externalClusters[0].firstAt)
        ? ''
        : '依据当前依赖探测结果（日志未提供精确起点）',
      deployAt: null,
      deployAtText: null,
      deploySource: null,
      diffMinutes: null,
      windowMinutes: context.windowMinutes,
    };
  } else if (healthFailing) {
    const evidence = [
      health.reachable
        ? `GET ${health.path} 返回 ${health.statusCode}（${health.responseMs}ms，业务状态 ${
            health.bodyStatus || '未知'
          }）`
        : `GET ${health.path} 探活失败：${health.error}（${health.responseMs}ms）`,
      `期望端口 ${context.expectedPort} ${
        collected.ports.available
          ? collected.ports.listening
            ? '处于监听'
            : '未监听'
          : '（端口信息不可用）'
      }`,
    ];
    if (topCluster) evidence.push(clusterEvidenceText(topCluster));

    verdict = {
      code: 'service_down',
      label: '后端服务不可达',
      confidence: !health.reachable && collected.ports.available && !collected.ports.listening ? '高' : '中',
      score: 0.8,
      reason: '后端 HTTP 探活失败，站点核心接口不可用',
      evidence,
      faultStartedAt: (topCluster && toDate(topCluster.firstAt)) || now,
      faultStartedAtText: fmtDateTime((topCluster && toDate(topCluster.firstAt)) || now),
      faultStartNote: topCluster ? '' : '依据当前探活失败时间（日志未提供精确起点）',
      deployAt: null,
      deployAtText: null,
      deploySource: null,
      diffMinutes: null,
      windowMinutes: context.windowMinutes,
    };
  } else if (codeCluster) {
    const evidence = [clusterEvidenceText(codeCluster)];
    if (codeCluster.statusCodes.length) {
      evidence.push(`HTTP 状态码：${codeCluster.statusCodes.join('、')}`);
    }
    if (codeCluster.urls.length) {
      evidence.push(`涉及路径：${codeCluster.urls.join('、')}`);
    }
    if (health.bodyStatus) {
      evidence.push(`健康检查业务状态：${health.bodyStatus}`);
    }

    verdict = {
      code: 'code_exception',
      label: '代码异常',
      confidence: codeHigh ? '高' : '中',
      score: codeHigh ? 0.8 : 0.55,
      reason: '错误日志中出现带业务栈且伴随 5xx 的异常聚类，相关接口可能持续不可用',
      evidence: evidence.slice(0, 3),
      faultStartedAt: toDate(codeCluster.firstAt) || now,
      faultStartedAtText: toDate(codeCluster.firstAt) ? fmtDateTime(codeCluster.firstAt) : '未知',
      faultStartNote: '',
      deployAt: null,
      deployAtText: null,
      deploySource: null,
      diffMinutes: null,
      windowMinutes: context.windowMinutes,
    };
  } else if (serverErrorTrigger) {
    const paths = httpStats.topPaths5xx.map(item => `${item.name}（${item.hits}）`).join('、');
    const evidence = [
      httpStats.signalText,
      `首次 5xx ${httpStats.first5xxAtText}，最近 ${httpStats.last5xxAtText}${
        paths ? `；主要路径：${paths}` : ''
      }`,
      `统计口径：${httpStats.scopeText}${httpStats.profileNote ? `（${httpStats.profileNote}）` : ''}`,
    ];
    const high = count5xx >= THRESHOLDS.codeBurstHigh || Boolean(httpStats.comparison.factor5xxValue >= 5);
    const surging = httpStats.surge5xx;

    verdict = {
      code: 'server_error',
      label: surging ? '5xx 响应突增' : '5xx 响应异常',
      confidence: high ? '高' : '中',
      score: high ? 0.8 : 0.6,
      reason: surging
        ? '窗口内 5xx 相对基线显著突增，存在服务端异常或依赖故障；4xx 不计入该判定'
        : '窗口内 5xx 绝对计数偏高，但未显著高于基线，可能是长期问题或基线本身异常；4xx 不计入该判定',
      evidence,
      faultStartedAt: toDate(first5xxAt) || now,
      faultStartedAtText: httpStats.first5xxAtText,
      faultStartNote: '',
      deployAt: null,
      deployAtText: null,
      deploySource: null,
      diffMinutes: null,
      windowMinutes: context.windowMinutes,
    };
  } else if (authFault) {
    const paths = httpStats.topPathsAuth.map(item => `${item.name}（${item.hits}）`).join('、');
    const ips = httpStats.topIpsAuth.map(item => `${item.name}（${item.hits}）`).join('、');
    const evidence = [
      `401/403 ${auth.count} 次 vs 基线 ${auth.baselineCount} 次（${auth.factor}），${httpStats.scopeText}`,
      `首次 ${auth.firstAtText}；来源 IP ${ips || '未知'}${
        auth.ipConcentrated ? '（高度集中）' : ''
      }；路径 ${paths || '未知'}`,
      `升级条件：${auth.note}`,
    ];

    verdict = {
      code: 'auth_burst',
      label: '认证异常（401/403 满足多项条件）',
      confidence: '中',
      score: 0.65,
      reason: '401/403 相对基线显著突增，且同时满足来源集中/公开接口被拒/登录成功率骤降之一',
      evidence,
      faultStartedAt: toDate(httpStats.firstAuthAt) || now,
      faultStartedAtText: httpStats.firstAuthAtText,
      faultStartNote: '',
      deployAt: null,
      deployAtText: null,
      deploySource: null,
      diffMinutes: null,
      windowMinutes: context.windowMinutes,
    };
  } else if (exceptionCluster) {
    verdict = {
      code: 'unknown',
      label: '证据不足（存在异常日志，未见 5xx）',
      confidence: '低',
      score: 0.35,
      reason: '错误日志有聚类但缺少 5xx 证据，未达到故障判定条件，建议持续观察',
      evidence: [clusterEvidenceText(exceptionCluster)],
      faultStartedAt: toDate(exceptionCluster.firstAt) || now,
      faultStartedAtText: toDate(exceptionCluster.firstAt)
        ? fmtDateTime(exceptionCluster.firstAt)
        : '未知',
      faultStartNote: '',
      deployAt: null,
      deployAtText: null,
      deploySource: null,
      diffMinutes: null,
      windowMinutes: context.windowMinutes,
    };
  } else if (sampleInsufficient) {
    const evidence = [
      httpStats.scopeText,
      `窗口内仅 ${httpStats.totalResponses} 条响应（< ${THRESHOLDS.httpSampleMinResponses}），率类指标不可靠`,
      '4xx 属正常请求拒绝；未发现 5xx、依赖不可达或资源超阈值',
    ];

    verdict = {
      code: 'inconclusive',
      label: '样本不足，不下结论',
      confidence: '低',
      score: 0.25,
      reason: 'HTTP 响应样本量过小，无法可靠判断是否存在故障；4xx 属协议层拒绝，不单独构成故障',
      evidence: evidence.filter(Boolean).slice(0, 3),
      faultStartedAt: null,
      faultStartedAtText: '不适用',
      faultStartNote: '样本不足',
      deployAt: null,
      deployAtText: null,
      deploySource: null,
      diffMinutes: null,
      windowMinutes: context.windowMinutes,
    };
  } else {
    const evidence = [];
    if (httpAvailable) {
      evidence.push(httpStats.observationText);
      if (auth && auth.count > 0) {
        evidence.push(`401/403 判定：${auth.shortNote}`);
      }
    }
    if (health.available && health.reachable) {
      evidence.push(
        `健康检查 GET ${health.path} 返回 ${health.statusCode}（${health.responseMs}ms，业务状态 ${
          health.bodyStatus || '未知'
        }）`
      );
    } else if (collected.ports.available) {
      evidence.push(`期望端口 ${context.expectedPort} ${collected.ports.listening ? '处于监听' : '未监听'}`);
    }
    if (db.available) {
      evidence.push(
        db.type === 'mysql'
          ? `数据库 ${db.host}:${db.port} ${db.reachable ? '可达' : `不可达（${db.error}）`}`
          : `SQLite 文件 ${db.exists ? '存在' : '缺失'}`
      );
    }
    if (!httpAvailable && httpStats) {
      evidence.push(`HTTP 日志不可用：${httpStats.reason}`);
    }
    evidence.push(
      errorLogs.available ? '最近错误日志未形成聚类' : `错误日志不可用：${errorLogs.reason}`
    );

    const httpClean = !httpAvailable || httpStats.count5xx === 0;
    verdict = {
      code: 'healthy',
      label: '未发现故障',
      confidence: '中',
      score: 0.7,
      reason: httpClean
        ? 'HTTP 观测未发现 5xx；4xx 属正常协议拒绝（未登录/权限不足）；探活、数据库与资源均未触发阈值'
        : '所有已采集指标均在阈值内，暂未发现故障证据',
      evidence: evidence.filter(Boolean).slice(0, 3),
      faultStartedAt: null,
      faultStartedAtText: '不适用',
      faultStartNote: '未发现故障',
      deployAt: null,
      deployAtText: null,
      deploySource: null,
      diffMinutes: null,
      windowMinutes: context.windowMinutes,
    };
  }

  return {
    verdict,
    details: {
      dbDown,
      externalClusters: externalClusters.slice(0, 3).map(cluster => ({
        file: cluster.file,
        line: cluster.line,
        count: cluster.count,
        message: cluster.message,
      })),
      diskPct,
      memPct,
      swapPct,
      httpSummary: httpAvailable
        ? {
            scopeText: httpStats.scopeText,
            totalResponses: httpStats.totalResponses,
            count4xx: httpStats.count4xx,
            count5xx: httpStats.count5xx,
            auth: auth
              ? {
                  count: auth.count,
                  baselineCount: auth.baselineCount,
                  isFault: auth.isFault,
                  label: auth.label,
                  note: auth.note,
                }
              : null,
            baseline: httpStats.baseline,
            surge5xx: httpStats.surge5xx,
            sampleInsufficient,
          }
        : null,
      codeCluster: codeCluster
        ? {
            file: codeCluster.file,
            line: codeCluster.line,
            count: codeCluster.count,
            message: codeCluster.message,
          }
        : null,
    },
  };
}

function buildImpact(verdict, collected) {
  const urls = [];
  for (const cluster of (collected.errorLogs.clusters || []).slice(0, 3)) {
    for (const url of cluster.urls) {
      if (!urls.includes(url)) urls.push(url);
    }
  }

  const impact = [];
  const urlText = urls.length ? `；涉及 ${urls.slice(0, 3).join('、')}` : '';

  switch (verdict.code) {
    case 'release_suspect':
      impact.push(
        `本次发布${
          collected.deployment.versionLabel === '未知'
            ? ''
            : ` ${collected.deployment.versionLabel}`
        } 引入的缺陷可能影响相关接口${urlText}`
      );
      if (
        collected.health.available &&
        (!collected.health.reachable || collected.health.bodyStatus === 'error')
      ) {
        impact.push('健康检查当前失败，若依赖 DB 的初始化逻辑受影响，可能扩至全站不可用');
      }
      break;
    case 'resource_exhaustion':
      impact.push('磁盘/内存耗尽会导致写入失败、请求超时、进程被 OOM 终止，影响全站稳定性');
      break;
    case 'external_dependency':
      impact.push('数据库/外部依赖不可达 → 登录、设备、机柜、工单等所有依赖 DB 的接口不可用');
      break;
    case 'service_down':
      impact.push(`后端服务不可达 → 站点核心接口全部不可用${urlText}`);
      break;
    case 'auth_burst':
      impact.push('401/403 突增且满足多项升级条件 → 可能存在凭证失效、暴力破解或权限配置变更；需检查登录链路与来源');
      break;
    case 'server_error':
      impact.push(`服务端 5xx 持续返回 → 相关接口不可用；对应用户操作会失败${urlText}`);
      break;
    case 'code_exception':
      impact.push(`相关接口持续返回 5xx，对应功能不可用；其他功能可能正常${urlText}`);
      break;
    case 'unknown':
      impact.push('影响面暂不明确，建议结合用户报障范围继续观察');
      break;
    case 'inconclusive':
      impact.push('样本不足，暂无法判断影响面；4xx 属正常请求拒绝，不代表故障');
      break;
    default:
      impact.push('未发现故障影响面；401/403 属未登录或权限不足的正常协议拒绝，建议持续观察');
      break;
  }

  return impact;
}

function tagImage(image, tag) {
  if (!image || !tag) return null;
  const slash = image.lastIndexOf('/');
  const colon = image.lastIndexOf(':');
  if (colon > slash) return `${image.slice(0, colon)}:${tag}`;
  return `${image}:${tag}`;
}

function buildActions(context, collected, verdict) {
  const container = (collected.docker && collected.docker.container
    ? collected.docker.container.name
    : null) || context.containerHint || 'idc-backend';
  const compose = context.composeFile ? relPath(context.root, context.composeFile) : null;
  const composeArg = compose ? ` -f ${compose}` : '';
  const healthCmd = `curl -sS -o /dev/null -w 'HTTP %{http_code} / %{time_total}s\\n' http://127.0.0.1:${context.expectedPort}/health`;
  const logFile = collected.errorLogs.latestFile
    ? relPath(process.cwd(), collected.errorLogs.latestFile)
    : '<最新的 backend/logs/error/error-*.log>';
  const logCmd = `tail -n 80 ${logFile}`;
  const psCmd = collected.docker.available && collected.docker.daemon
    ? `docker${composeArg} ps`
    : `ss -lntp | grep ':${context.expectedPort}'`;
  const restartCmd = collected.docker.available && collected.docker.daemon
    ? `docker restart ${container}`
    : 'systemctl restart <你的后端服务名>';
  const restartTitle =
    collected.docker.available && collected.docker.daemon ? '重启后端容器' : '重启后端服务';
  const prevTag = collected.deployment.git.previousTag
    ? collected.deployment.git.previousTag.name
    : null;
  const currentImage = collected.docker && collected.docker.container
    ? collected.docker.container.image
    : null;
  const rollbackImage = prevTag && currentImage ? tagImage(currentImage, prevTag) : null;
  const rollbackCmd =
    rollbackImage && collected.docker.available && collected.docker.daemon
      ? `BACKEND_IMAGE=${rollbackImage} docker${composeArg} pull backend && BACKEND_IMAGE=${rollbackImage} docker${composeArg} up -d backend`
      : prevTag && collected.deployment.git.available
        ? `git -C ${context.root} checkout ${prevTag} && <重新安装依赖并重启后端>`
        : null;

  const greenBase = { level: 'green', label: '绿', title: '只读复核' };

  switch (verdict.code) {
    case 'release_suspect':
      return [
        {
          ...greenBase,
          command: `${healthCmd} && ${psCmd}`,
          note: '先确认当前故障仍存在',
        },
        {
          level: 'yellow',
          label: '黄',
          title: restartTitle,
          command: restartCmd,
          note: '需确认；会造成秒级中断，若为发布缺陷可能再次失败',
        },
        {
          level: 'red',
          label: '红',
          title: prevTag ? `回滚到 ${prevTag}` : '回滚到上一版本',
          command: rollbackCmd || '按部署文档回滚到上一镜像/上一 tag',
          note: '仅提示不执行；回滚前建议先备份数据并确认 DB 迁移可逆',
        },
      ];
    case 'resource_exhaustion':
      return [
        {
          ...greenBase,
          command: `df -h && ${collected.disk ? `du -sh ${relPath(
            process.cwd(),
            collected.errorLogs.logDir || context.root
          )}/* | sort -h | tail -n 5` : 'free -m'}`,
          note: '定位占用最大的目录（只读）',
        },
        {
          level: 'yellow',
          label: '黄',
          title: restartTitle,
          command: restartCmd,
          note: '需确认；只能短暂缓解，清理磁盘/扩容才是根治',
        },
        {
          level: 'red',
          label: '红',
          title: '清理磁盘或扩容',
          command: null,
          note: '仅提示不执行；删除日志/转储文件或扩容前必须人工评估',
        },
      ];
    case 'external_dependency': {
      const dbGreen =
        collected.db.type === 'mysql'
          ? `nc -zv ${collected.db.host} ${collected.db.port}`
          : `ls -l ${collected.db.path}`;
      return [
        {
          ...greenBase,
          command: dbGreen,
          note: '复核依赖可达性（只读）',
        },
        {
          level: 'yellow',
          label: '黄',
          title: restartTitle,
          command: restartCmd,
          note: '需确认；若依赖仍在恢复中，重启后仍会失败',
        },
        {
          level: 'red',
          label: '红',
          title: '数据库/外部服务恢复',
          command: null,
          note: '仅提示不执行；需 DBA 介入或切换实例，确认恢复后再重启应用',
        },
      ];
    }
    case 'service_down':
      return [
        {
          ...greenBase,
          command: `${healthCmd}; ${psCmd}`,
          note: '复核端口与进程状态（只读）',
        },
        {
          level: 'yellow',
          label: '黄',
          title: restartTitle,
          command: restartCmd,
          note: '需确认；会造成秒级中断',
        },
        {
          level: 'red',
          label: '红',
          title: '回滚或检查启动日志',
          command: rollbackCmd || `journalctl -u <服务名> -n 100 --no-pager`,
          note: '仅提示不执行；先确认启动失败原因（DB 初始化/配置缺失）',
        },
      ];
    case 'server_error':
      return [
        {
          ...greenBase,
          command: `tail -n 500 <最新的 backend/logs/request/request-*.log> | grep -E '"statusCode":5' | tail -n 30`,
          note: '确认 5xx 路径、来源与首次出现时间（只读）',
        },
        {
          level: 'yellow',
          label: '黄',
          title: restartTitle,
          command: restartCmd,
          note: '需确认；可临时恢复，若为依赖故障则重启无效',
        },
        {
          level: 'red',
          label: '红',
          title: prevTag ? `回滚到 ${prevTag}` : '回滚到上一版本',
          command: rollbackCmd || '按部署文档回滚到上一镜像/上一 tag',
          note: '仅提示不执行；若 5xx 在发布后突增，优先回滚',
        },
      ];
    case 'auth_burst':
      return [
        {
          ...greenBase,
          command: `tail -n 500 <最新的 backend/logs/request/request-*.log> | grep -E '"statusCode":40[13]' | tail -n 30`,
          note: '确认来源 IP、路径与登录成功率（只读）',
        },
        {
          level: 'yellow',
          label: '黄',
          title: '调整限流/封禁策略',
          command: null,
          note: '需确认；可能影响正常用户，建议先观察来源',
        },
        {
          level: 'red',
          label: '红',
          title: '检查 WAF 与账号锁定',
          command: null,
          note: '仅提示不执行；如为攻击需安全同事介入',
        },
      ];
    case 'code_exception':
      return [
        {
          ...greenBase,
          command: logCmd,
          note: '查看完整堆栈与上下文（只读）',
        },
        {
          level: 'yellow',
          label: '黄',
          title: restartTitle,
          command: restartCmd,
          note: '需确认；可临时恢复，不能修复缺陷',
        },
        {
          level: 'red',
          label: '红',
          title: prevTag ? `回滚到 ${prevTag}` : '回滚到上一版本',
          command: rollbackCmd || '按部署文档回滚到上一镜像/上一 tag',
          note: '仅提示不执行；若异常在发布后出现，优先回滚',
        },
      ];
    case 'unknown':
    case 'healthy':
    default:
      return [
        {
          ...greenBase,
          command: `${healthCmd}; ${logCmd}`,
          note: '继续观察（只读）',
        },
        {
          level: 'yellow',
          label: '黄',
          title: restartTitle,
          command: restartCmd,
          note: '仅当用户报障持续时，需人工确认',
        },
        {
          level: 'red',
          label: '红',
          title: '暂无建议的变更',
          command: null,
          note: '当前证据不足，不建议变更生产环境',
        },
      ];
  }
}

// ----------------------------------------------------------------------------
// 渲染：显示宽度 / 终端事故卡
// ----------------------------------------------------------------------------

function charWidth(ch) {
  const code = ch.codePointAt(0);
  if (
    code >= 0x1100 &&
    (code <= 0x115f ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1f64f) ||
      (code >= 0x20000 && code <= 0x3fffd))
  ) {
    return 2;
  }
  return 1;
}

function displayWidth(text) {
  let width = 0;
  for (const ch of Array.from(String(text))) width += charWidth(ch);
  return width;
}

function padRight(text, width) {
  const diff = width - displayWidth(text);
  return diff > 0 ? text + ' '.repeat(diff) : text;
}

function truncateDisplay(text, width) {
  let out = '';
  let w = 0;
  for (const ch of Array.from(String(text))) {
    const cw = charWidth(ch);
    if (w + cw > width) return `${out}…`;
    out += ch;
    w += cw;
  }
  return out;
}

/**
 * 生成带前缀/悬挂缩进的换行块
 * @param {string} prefix 首行前缀
 * @param {string} text 文本
 * @param {number} width 总宽度
 * @param {string} hang 后续行前缀
 * @returns {string[]}
 */
function layoutBlock(prefix, text, width, hang = '') {
  const lines = [];
  let currentPrefix = prefix;
  let available = width - displayWidth(currentPrefix);
  let line = '';
  let lineWidth = 0;

  const flush = () => {
    lines.push(currentPrefix + line);
    currentPrefix = hang;
    available = width - displayWidth(hang);
    line = '';
    lineWidth = 0;
  };

  for (const ch of Array.from(String(text))) {
    if (ch === '\n') {
      flush();
      continue;
    }
    const cw = charWidth(ch);
    if (lineWidth + cw > available && line) {
      const spaceIndex = line.lastIndexOf(' ');
      if (spaceIndex > 0 && spaceIndex > line.length - 16) {
        const carry = line.slice(spaceIndex + 1);
        line = line.slice(0, spaceIndex);
        flush();
        line = carry;
        lineWidth = displayWidth(carry);
      } else {
        flush();
      }
    }
    line += ch;
    lineWidth += cw;
  }

  if (line) flush();
  if (!lines.length) lines.push(prefix);
  return lines;
}

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function colorize(text, colorCode, enabled) {
  return enabled ? `${colorCode}${text}${ANSI.reset}` : text;
}

function buildCard(context, collected, verdict, impact, actions, unavailable) {
  const W = 74;
  const lines = [];
  const add = text => lines.push({ text, kind: 'normal' });
  const divider = () => lines.push({ text: '', kind: 'divider' });

  lines.push({
    text: `线上事故诊断卡 ${TOOL.version}`,
    kind: 'header',
    right: `${fmtDateTime(new Date())}  ${os.hostname()}`,
  });
  divider();

  const confidenceText = `${verdict.confidence} (${Math.round(verdict.score * 100)}%)`;
  lines.push({
    text: `判定  ${verdict.label}`,
    kind: 'verdict',
    right: `置信度  ${confidenceText}`,
  });

  const faultText = verdict.faultStartedAt
    ? verdict.faultStartedAtText + (verdict.faultStartNote ? `（${verdict.faultStartNote}）` : '')
    : verdict.faultStartNote === '未发现故障'
      ? '不适用（未发现故障）'
      : verdict.faultStartNote === '样本不足'
        ? '不适用（样本不足）'
        : verdict.faultStartNote || '未知';
  const deployText = verdict.deployAt
    ? `${verdict.deployAtText}（${verdict.deploySource}）`
    : collected.deployment.primary
      ? `${fmtDateTime(collected.deployment.primary.at)}（${collected.deployment.primary.label}）`
      : '未获取到';
  const diffText = verdict.diffMinutes !== null ? `${verdict.diffMinutes} 分钟` : '不适用';
  const timeLine = `故障开始 ${faultText}   最近部署 ${deployText}   版本 ${collected.deployment.versionLabel}   相差 ${diffText}`;
  for (const line of layoutBlock('', timeLine, W)) add(line);

  const httpLine =
    collected.httpStats && collected.httpStats.available
      ? collected.httpStats.observationText
      : collected.httpStats
        ? `不可用：${collected.httpStats.reason}`
        : null;
  if (httpLine) {
    for (const line of layoutBlock('观测  ', httpLine, W, '      ').slice(0, 2)) add(line);
  }
  divider();

  add('核心证据');
  const evidences = (verdict.evidence || []).slice(0, 3);
  if (!evidences.length) add('  （无）');
  evidences.forEach((text, index) => {
    const block = layoutBlock(`  ${index + 1}. `, text, W, '     ');
    block.slice(0, 3).forEach(line => add(line));
  });
  divider();

  add('影响面');
  for (const line of layoutBlock('  ', impact.join('；'), W, '  ')) add(line);
  divider();

  add('推荐动作');
  const order = { green: 0, yellow: 1, red: 2 };
  const picked = Object.keys(order)
    .map(level => actions.find(action => action.level === level))
    .filter(Boolean);

  for (const action of picked) {
    const head = `[${action.label}] ${action.title}`;
    lines.push({ text: head, kind: `action-${action.level}` });
    if (action.command) {
      const block = layoutBlock('      $ ', action.command, W, '        ');
      block.slice(0, 2).forEach(line => add(line));
    }
    if (action.note) {
      const block = layoutBlock('      ', action.note, W, '      ');
      block.slice(0, 2).forEach(line => add(line));
    }
  }

  if (unavailable.length) {
    divider();
    const block = layoutBlock('不可用  ', unavailable.join('；'), W, '        ');
    block.slice(0, 2).forEach(line => add(line));
  }

  // 组装带边框的卡片
  const top = `╭${'─'.repeat(W + 2)}╮`;
  const bottom = `╰${'─'.repeat(W + 2)}╯`;
  const sep = `├${'─'.repeat(W + 2)}┤`;
  const rendered = [];

  for (const item of lines) {
    if (item.kind === 'divider') {
      rendered.push({ text: sep, kind: 'border' });
      continue;
    }

    if (item.kind === 'header') {
      const right = truncateDisplay(item.right || '', Math.floor((W - displayWidth(item.text)) * 0.7));
      const gap = Math.max(1, W - displayWidth(item.text) - displayWidth(right));
      rendered.push({
        text: `│ ${padRight(item.text + ' '.repeat(gap) + right, W)} │`,
        kind: 'header',
      });
      continue;
    }

    if (item.kind === 'verdict') {
      const right = item.right || '';
      const gap = Math.max(1, W - displayWidth(item.text) - displayWidth(right));
      rendered.push({
        text: `│ ${padRight(item.text + ' '.repeat(gap) + right, W)} │`,
        kind: 'verdict',
      });
      continue;
    }

    rendered.push({ text: `│ ${padRight(item.text, W)} │`, kind: item.kind });
  }

  return { top, bottom, lines: rendered };
}

function printCard(card, verdict, useColor) {
  const verdictColor =
    verdict.code === 'healthy'
      ? ANSI.green
      : verdict.confidence === '高'
        ? ANSI.red
        : ANSI.yellow;

  const actionColors = { 'action-green': ANSI.green, 'action-yellow': ANSI.yellow, 'action-red': ANSI.red };

  process.stdout.write(`${colorize(card.top, ANSI.dim, useColor)}\n`);
  for (const line of card.lines) {
    let output = line.text;
    if (useColor && line.kind === 'border') output = colorize(output, ANSI.dim, true);
    else if (useColor && line.kind === 'header') output = colorize(output, ANSI.bold, true);
    else if (useColor && line.kind === 'verdict') output = colorize(output, verdictColor, true);
    else if (useColor && actionColors[line.kind]) output = colorize(output, actionColors[line.kind], true);
    else if (useColor && /^不可用/.test(line.text.slice(2).trim())) output = colorize(output, ANSI.dim, true);
    process.stdout.write(`${output}\n`);
  }
  process.stdout.write(`${colorize(card.bottom, ANSI.dim, useColor)}\n`);
}

// ----------------------------------------------------------------------------
// 渲染：Markdown
// ----------------------------------------------------------------------------

function renderMarkdown(context, collected, analysis, impact, actions, unavailable, cardText) {
  const { verdict } = analysis;
  const md = [];
  const cell = escapeMdCell;

  md.push('# 线上事故诊断卡');
  md.push('');
  md.push(
    `> 生成时间：${fmtDateTime(new Date())}　主机：${os.hostname()}　工具：${TOOL.name} v${TOOL.version}`
  );
  md.push(`> 项目根目录：${context.root}　期望端口：${context.expectedPort}`);
  md.push('');
  md.push('## 判定');
  md.push('');
  md.push('| 项目 | 结论 |');
  md.push('| --- | --- |');
  md.push(`| 判定结论 | **${cell(verdict.label)}** |`);
  md.push(`| 置信度 | ${cell(verdict.confidence)}（${Math.round(verdict.score * 100)}%） |`);
  md.push(
    `| 故障开始时间 | ${cell(
      verdict.faultStartedAtText + (verdict.faultStartNote ? `（${verdict.faultStartNote}）` : '')
    )} |`
  );
  md.push(
    `| 最近部署时间 | ${cell(
      verdict.deployAtText
        ? `${verdict.deployAtText}（${verdict.deploySource}）`
        : collected.deployment.primary
          ? `${fmtDateTime(collected.deployment.primary.at)}（${collected.deployment.primary.label}）`
          : '未获取到'
    )} |`
  );
  md.push(`| 发布版本 | ${cell(collected.deployment.versionLabel)} |`);
  md.push(`| 时间差 | ${verdict.diffMinutes !== null ? `${verdict.diffMinutes} 分钟` : '不适用'} |`);
  md.push(`| 判定依据 | ${cell(verdict.reason)} |`);
  md.push('');
  md.push('### 核心证据');
  md.push('');
  (verdict.evidence || []).forEach((text, index) => {
    md.push(`${index + 1}. ${text}`);
  });
  md.push('');
  md.push('### 影响面');
  md.push('');
  impact.forEach(text => md.push(`- ${text}`));
  md.push('');
  md.push('### 推荐动作');
  md.push('');
  md.push('| 级别 | 动作 | 命令 | 说明 |');
  md.push('| --- | --- | --- | --- |');
  for (const action of actions) {
    md.push(
      `| ${action.label} | ${cell(action.title)} | ${
        action.command ? `\`${cell(action.command)}\`` : '—'
      } | ${cell(action.note || '')} |`
    );
  }
  md.push('');
  md.push('## 采集详情');
  md.push('');
  md.push('### 部署时间三件套');
  md.push('');
  md.push('| 事件 | 时间 |');
  md.push('| --- | --- |');
  if (collected.deployment.events.length) {
    for (const event of collected.deployment.events) {
      md.push(`| ${cell(event.label)} | ${cell(fmtDateTime(event.at))} |`);
    }
  } else {
    md.push('| 未获取 | Git/Docker/.env 均不可用 |');
  }
  md.push('');
  md.push(`- Git：${collected.deployment.git.available ? '可用' : `不可用（${collected.deployment.git.reason}）`}`);
  if (collected.deployment.git.head) {
    md.push(
      `- 最新提交：${collected.deployment.git.head.shortHash} ${collected.deployment.git.head.subject}（${fmtDateTime(
        collected.deployment.git.head.committedAt
      )}）`
    );
  }
  if (collected.deployment.git.latestTag) {
    md.push(
      `- 最近 tag：${collected.deployment.git.latestTag.name}（${fmtDateTime(
        collected.deployment.git.latestTag.date
      )}）`
    );
  }
  if (collected.deployment.git.previousTag) {
    md.push(`- 上一 tag：${collected.deployment.git.previousTag.name}`);
  }
  md.push(
    `- 镜像：${
      collected.docker.available && collected.docker.container
        ? `${collected.docker.container.image}（创建于 ${fmtDateTime(collected.docker.imageCreatedAt)}）`
        : `不可用（${collected.docker.reason || '未采集'}）`
    }`
  );
  md.push(
    `- .env：${
      collected.deployment.env.path
        ? `${collected.deployment.env.path}（修改于 ${fmtDateTime(collected.deployment.env.modifiedAt)}）`
        : '未找到'
    }`
  );
  md.push('');

  md.push('### 系统资源');
  md.push('');
  md.push('| 项目 | 数值 |');
  md.push('| --- | --- |');
  if (collected.resources.memory) {
    md.push(
      `| 内存 | ${collected.resources.memory.usedPercent.toFixed(1)}%（已用 ${collected.resources.memory.usedText} / 共 ${collected.resources.memory.totalText}） |`
    );
  }
  if (collected.resources.swap) {
    md.push(
      collected.resources.swap.total
        ? `| Swap | ${collected.resources.swap.usedPercent.toFixed(1)}%（${collected.resources.swap.usedText} / ${collected.resources.swap.totalText}） |`
        : '| Swap | 未启用 |'
    );
  } else {
    md.push('| Swap | 不可用（无 /proc/meminfo） |');
  }
  if (collected.resources.disk) {
    md.push(
      `| 磁盘 | ${collected.resources.disk.usedPercent.toFixed(1)}%（剩余 ${collected.resources.disk.freeText} / 共 ${collected.resources.disk.totalText}） |`
    );
  } else {
    md.push('| 磁盘 | 不可用（statfs 失败） |');
  }
  if (collected.resources.load) {
    md.push(
      `| Load | ${collected.resources.load.one.toFixed(2)} / ${collected.resources.load.five.toFixed(2)} / ${collected.resources.load.fifteen.toFixed(2)}（${collected.resources.cpuCores} 核） |`
    );
  } else {
    md.push('| Load | 不可用（Windows 无 loadavg） |');
  }
  md.push(`| 运行时长 | ${collected.resources.uptimeText} |`);
  md.push('');

  md.push('### 进程与端口');
  md.push('');
  md.push(
    `- Node 进程：${
      collected.processes.available ? `${collected.processes.total} 个` : `不可用（${collected.processes.reason}）`
    }`
  );
  if (collected.processes.samples && collected.processes.samples.length) {
    for (const sample of collected.processes.samples) {
      md.push(
        `  - pid ${sample.pid}　CPU ${sample.cpu || '?'}　MEM ${sample.mem || '?'}　${
          sample.uptime || ''
        }　${sample.args}`
      );
    }
  }
  md.push(
    `- 期望端口 ${context.expectedPort}：${
      collected.ports.available
        ? collected.ports.listening
          ? '监听中'
          : '未监听'
        : `不可用（${collected.ports.reason}）`
    }`
  );
  if (collected.ports.available && collected.ports.ports.length) {
    const shown = collected.ports.ports.slice(0, 12);
    md.push(
      `- 监听端口（前 ${shown.length} 个）：${shown
        .map(item => `${item.port}${item.process ? `/${item.process}` : ''}${item.pid ? `(pid ${item.pid})` : ''}`)
        .join('、')}`
    );
  }
  md.push('');

  md.push('### 容器');
  md.push('');
  if (collected.docker.available && collected.docker.container) {
    const container = collected.docker.container;
    md.push(`- 名称：${container.name}`);
    md.push(`- 状态：${container.status || '未知'}`);
    md.push(`- 启动时间：${fmtDateTime(container.startedAt)}`);
    md.push(`- 重启次数：${container.restartCount}`);
    md.push(`- 镜像：${container.image || '未知'}（创建于 ${fmtDateTime(collected.docker.imageCreatedAt)}）`);
    if (container.health) md.push(`- Docker 健康状态：${container.health}`);
  } else {
    md.push(`- 不可用：${collected.docker.reason || '未找到后端容器'}`);
  }
  md.push('');

  md.push('### 探活');
  md.push('');
  if (collected.health.reachable) {
    md.push(
      `- GET ${collected.health.path} → HTTP ${collected.health.statusCode}，${collected.health.responseMs}ms，业务状态 ${
        collected.health.bodyStatus || '未知'
      }`
    );
    if (collected.health.dbCheck) {
      md.push(`  - DB：${collected.health.dbCheck.status} ${collected.health.dbCheck.message}`);
    }
  } else {
    md.push(`- GET ${collected.health.path} 失败：${collected.health.error}`);
  }
  if (collected.health.fallbackNote) md.push(`- 备注：${collected.health.fallbackNote}`);
  md.push('');

  md.push('### 数据库');
  md.push('');
  if (collected.db.type === 'mysql') {
    md.push(
      `- MySQL ${collected.db.host}:${collected.db.port}：${
        collected.db.reachable ? '可达' : `不可达（${collected.db.error}）`
      }（${collected.db.responseMs}ms）`
    );
  } else {
    md.push(
      `- SQLite：${collected.db.exists ? '文件存在' : '文件缺失'} ${collected.db.path}${
        collected.db.sizeText ? `（${collected.db.sizeText}）` : ''
      }`
    );
  }
  if (collected.db.note) md.push(`- 备注：${collected.db.note}`);
  md.push('');

  md.push('### 配置漂移（仅比较 key，不输出值）');
  md.push('');
  if (collected.configDrift.available) {
    md.push(`- 缺失（.env.example 有、.env 无）：${collected.configDrift.missing.join('、') || '无'}`);
    md.push(`- 多余（.env 有、.env.example 无）：${collected.configDrift.extra.join('、') || '无'}`);
  } else {
    md.push(`- 不可用：${collected.configDrift.reason}`);
  }
  md.push('');

  md.push(`### 错误日志聚类（最近 ${LOG_LINES} 行）`);
  md.push('');
  if (collected.errorLogs.available) {
    md.push(`- 来源：${collected.errorLogs.note}`);
    md.push('');
    md.push('| # | 次数 | 首次出现 | 最后出现 | 指纹 | 证据（file:line） |');
    md.push('| --- | --- | --- | --- | --- | --- |');
    collected.errorLogs.clusters.forEach((cluster, index) => {
      md.push(
        `| ${index + 1} | ${cluster.count} | ${cell(cluster.firstAtText)} | ${cell(
          cluster.lastAtText
        )} | ${cell(cluster.fingerprint)} | ${cell(`${cluster.file}:${cluster.line}`)} |`
      );
    });
  } else {
    md.push(`- 不可用：${collected.errorLogs.reason}`);
  }
  md.push('');

  const http = collected.httpStats;
  const httpMinutes = http && http.sampleMinutes ? http.sampleMinutes : THRESHOLDS.httpSampleMinutes;
  md.push(`### HTTP 响应统计（最近 ${httpMinutes} 分钟）`);
  md.push('');
  if (http && http.available) {
    const baseline = http.baseline && http.baseline.available ? http.baseline : null;
    md.push(`- 统计口径：${http.scopeText}`);
    md.push(
      `- 日志记录：HTTP 有效级别 ${http.httpLevel || '未知'}（完整度 ${http.completeness}）；${
        http.rateUsable
          ? '成功响应完整，可用于占比计算'
          : '成功响应未完整落盘，不输出占比结论，仅用失败请求绝对计数对比基线'
      }`
    );
    if (http.profileNote) md.push(`- ${http.profileNote}`);
    md.push('');
    md.push('| 状态 | 次数 | 占比 | 基线次数 | 基线占比 | 变化倍数 |');
    md.push('| --- | --- | --- | --- | --- | --- |');
    const rateRow = (label, count, rate, baseCount, baseRate, factor) =>
      `| ${label} | ${count} | ${pctText(rate)} | ${baseCount === null ? '—' : baseCount} | ${pctText(
        baseRate
      )} | ${factor || '—'} |`;
    md.push(
      rateRow(
        '2xx',
        http.count2xx,
        ratio(http.count2xx, http.totalResponses, http.rateUsable),
        baseline ? baseline.count2xx : null,
        baseline ? ratio(baseline.count2xx, baseline.totalResponses, http.rateUsable) : null,
        null
      )
    );
    md.push(
      rateRow(
        '3xx',
        http.count3xx,
        ratio(http.count3xx, http.totalResponses, http.rateUsable),
        baseline ? baseline.count3xx : null,
        baseline ? ratio(baseline.count3xx, baseline.totalResponses, http.rateUsable) : null,
        null
      )
    );
    md.push(
      rateRow(
        '4xx',
        http.count4xx,
        http.rate4xx,
        baseline ? baseline.count4xx : null,
        baseline ? baseline.rate4xx : null,
        null
      )
    );
    md.push(
      rateRow(
        '401/403',
        http.auth.count,
        http.rateAuth,
        baseline ? baseline.countAuth : null,
        baseline ? baseline.rateAuth : null,
        http.auth.factor
      )
    );
    md.push(
      rateRow(
        '404',
        http.count404,
        ratio(http.count404, http.totalResponses, http.rateUsable),
        baseline ? baseline.count404 : null,
        baseline ? ratio(baseline.count404, baseline.totalResponses, http.rateUsable) : null,
        null
      )
    );
    md.push(
      rateRow(
        '5xx',
        http.count5xx,
        http.rate5xx,
        baseline ? baseline.count5xx : null,
        baseline ? baseline.rate5xx : null,
        http.comparison.factor5xx
      )
    );
    md.push('');
    md.push(`- 401/403 判定：**${http.auth.label}**`);
    md.push(`- 判定条件：${http.auth.note}`);
    md.push(`- 首次 ${http.auth.firstAtText}，最近 ${http.auth.lastAtText}`);
    if (http.topIpsAuth.length) {
      md.push(
        `- 来源 IP：${http.topIpsAuth.map(item => `${item.name}（${item.hits}）`).join('、')}`
      );
    }
    if (http.topPathsAuth.length) {
      md.push(
        `- 主要路径：${http.topPathsAuth.map(item => `${item.name}（${item.hits}）`).join('、')}`
      );
    }
    if (http.login.attempts) {
      md.push(
        `- 登录尝试 ${http.login.attempts} 次，成功 ${http.login.success} 次，成功率 ${pctText(
          http.login.successRate
        )}${
          baseline && baseline.login.attempts
            ? `（基线 ${pctText(baseline.login.successRate)}）`
            : ''
        }`
      );
    }
    if (baseline) {
      md.push(
        `- 基线：${baseline.label}（${baseline.windowText}）总响应 ${baseline.totalResponses} 条，5xx ${baseline.count5xx} 次，401/403 ${baseline.countAuth} 次${
          baseline.sufficient ? '' : '（样本不足，倍数仅供参考）'
        }`
      );
    } else {
      md.push(`- 基线不可用：${http.baseline ? http.baseline.reason : '未采集'}`);
    }
    if (http.notes.length) md.push(`- 说明：${http.notes.join('；')}`);
  } else {
    md.push(`- 不可用：${http ? http.reason : '未采集'}`);
  }
  md.push('');

  md.push('### 不可用项');
  md.push('');
  if (unavailable.length) unavailable.forEach(item => md.push(`- ${item}`));
  else md.push('- 无');
  md.push('');

  md.push('## 终端事故卡');
  md.push('');
  md.push('```text');
  md.push(cardText.trimEnd());
  md.push('```');
  md.push('');
  md.push('> 本脚本为只读诊断，未执行任何变更动作。命令均由人工复核后执行。');
  md.push('');

  return md.join('\n');
}

// ----------------------------------------------------------------------------
// 主流程
// ----------------------------------------------------------------------------

function collectUnavailable(context, collected) {
  const unavailable = [];

  if (!collected.docker.available) {
    unavailable.push(`容器信息（${collected.docker.reason || 'docker 不可用'}）`);
  } else if (!collected.docker.container) {
    unavailable.push(`容器信息（${collected.docker.reason || '未找到后端容器'}）`);
  }

  if (!collected.git.available) {
    unavailable.push(`Git 部署信息（${collected.git.reason || '不可用'}）`);
  }

  if (!collected.errorLogs.available) {
    unavailable.push(`错误日志（${collected.errorLogs.reason || '不可用'}）`);
  }

  if (!collected.httpStats || !collected.httpStats.available) {
    unavailable.push(
      `请求日志（${(collected.httpStats && collected.httpStats.reason) || '不可用'}）`
    );
  }

  if (!context.envFile) {
    unavailable.push('配置文件（未找到 .env）');
  }

  if (!context.exampleFile) {
    unavailable.push('配置漂移（未找到 .env.example）');
  }

  if (!context.composeFile) {
    unavailable.push('docker-compose 文件（建议命令将使用通用形式）');
  }

  if (!collected.swapAvailable) {
    // 仅提示，避免把 Windows 本地环境误判为异常
    if (process.platform !== 'win32') {
      unavailable.push('Swap 信息（无 /proc/meminfo）');
    }
  }

  return unavailable;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const startedAt = Date.now();
  const context = resolveContext(args);

  const [gitRaw, dockerRaw, processesRaw, portsRaw, resourcesRaw, healthRaw] = await Promise.all([
    collectGit(context.root).catch(error => ({
      available: false,
      reason: `git 采集失败：${error.message}`,
      head: null,
      tags: [],
      latestTag: null,
      previousTag: null,
    })),
    collectDocker(context.containerHint).catch(error => ({
      available: false,
      reason: `docker 采集失败：${error.message}`,
      container: null,
      imageCreatedAt: null,
    })),
    collectProcesses().catch(error => ({
      available: false,
      reason: `进程采集失败：${error.message}`,
      total: 0,
      samples: [],
    })),
    collectPorts(context.expectedPort).catch(error => ({
      available: false,
      reason: `端口采集失败：${error.message}`,
      ports: [],
      listening: null,
    })),
    Promise.resolve(collectResources(context.root)),
    collectHealth(context.expectedPort).catch(error => ({
      available: true,
      reachable: false,
      error: error.code || error.message,
      statusCode: null,
      responseMs: null,
      bodyStatus: null,
      dbCheck: null,
    })),
  ]);

  const db = await collectDb(context, healthRaw).catch(error => ({
    available: false,
    type: 'unknown',
    reachable: false,
    exists: false,
    reason: `DB 探测失败：${error.message}`,
  }));

  const configDrift = collectConfigDrift(context);
  const errorLogs = collectErrorClusters(context.logDir, LOG_LINES);
  const httpStats = collectHttpStats(context, args.sampleMinutes);
  const deployment = buildDeployment(context, gitRaw, dockerRaw);

  const resources = resourcesRaw;
  const swapAvailable = Boolean(resources.swap);

  const collected = {
    git: gitRaw,
    docker: dockerRaw,
    processes: processesRaw,
    ports: portsRaw,
    resources,
    swapAvailable,
    health: healthRaw,
    db,
    configDrift,
    errorLogs,
    httpStats,
    deployment,
  };

  const analysis = buildAnalysis(context, collected);
  const impact = buildImpact(analysis.verdict, collected);
  const actions = buildActions(context, collected, analysis.verdict);
  const unavailable = collectUnavailable(context, collected);

  const card = buildCard(context, collected, analysis.verdict, impact, actions, unavailable);
  const cardText = [card.top, ...card.lines.map(line => line.text), card.bottom].join('\n');
  const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && !context.json;

  const markdown = renderMarkdown(
    context,
    collected,
    analysis,
    impact,
    actions,
    unavailable,
    cardText
  );

  let markdownPath = null;
  let markdownError = null;
  try {
    fs.mkdirSync(context.outDir, { recursive: true });
    const stamp = fmtFileStamp(new Date());
    markdownPath = path.join(context.outDir, `incident-${stamp}.md`);
    fs.writeFileSync(markdownPath, markdown, 'utf8');
  } catch (error) {
    markdownError = error.message;
  }

  const report = {
    tool: TOOL,
    generatedAt: new Date().toISOString(),
    generatedAtText: fmtDateTime(new Date()),
    durationMs: Date.now() - startedAt,
    host: {
      hostname: os.hostname(),
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      kernel: os.release(),
      cwd: process.cwd(),
      root: context.root,
    },
    options: {
      expectedPort: context.expectedPort,
      windowMinutes: context.windowMinutes,
      outDir: context.outDir,
      container: context.containerHint,
    },
    verdict: {
      code: analysis.verdict.code,
      label: analysis.verdict.label,
      confidence: analysis.verdict.confidence,
      score: analysis.verdict.score,
      reason: analysis.verdict.reason,
      evidence: analysis.verdict.evidence,
      faultStartedAt: analysis.verdict.faultStartedAt
        ? toDate(analysis.verdict.faultStartedAt).toISOString()
        : null,
      faultStartedAtText: analysis.verdict.faultStartedAtText,
      faultStartNote: analysis.verdict.faultStartNote,
      deployAt: analysis.verdict.deployAt ? toDate(analysis.verdict.deployAt).toISOString() : null,
      deployAtText: analysis.verdict.deployAtText,
      deploySource: analysis.verdict.deploySource,
      diffMinutes: analysis.verdict.diffMinutes,
      windowMinutes: analysis.verdict.windowMinutes,
    },
    deployment: {
      primary: deployment.primary
        ? {
            source: deployment.primary.source,
            label: deployment.primary.label,
            at: toDate(deployment.primary.at).toISOString(),
            atText: fmtDateTime(deployment.primary.at),
          }
        : null,
      events: deployment.events.map(event => ({
        source: event.source,
        label: event.label,
        at: toDate(event.at).toISOString(),
        atText: fmtDateTime(event.at),
      })),
      version: deployment.version,
      versionLabel: deployment.versionLabel,
      git: {
        available: deployment.git.available,
        reason: deployment.git.reason,
        head: deployment.git.head
          ? {
              shortHash: deployment.git.head.shortHash,
              subject: deployment.git.head.subject,
              committedAt: deployment.git.head.committedAt
                ? toDate(deployment.git.head.committedAt).toISOString()
                : null,
              committedAtText: fmtDateTime(deployment.git.head.committedAt),
            }
          : null,
        latestTag: deployment.git.latestTag
          ? {
              name: deployment.git.latestTag.name,
              date: toDate(deployment.git.latestTag.date).toISOString(),
              dateText: fmtDateTime(deployment.git.latestTag.date),
            }
          : null,
        previousTag: deployment.git.previousTag
          ? {
              name: deployment.git.previousTag.name,
              date: toDate(deployment.git.previousTag.date).toISOString(),
              dateText: fmtDateTime(deployment.git.previousTag.date),
            }
          : null,
      },
      env: {
        path: deployment.env.path,
        modifiedAt: deployment.env.modifiedAt
          ? toDate(deployment.env.modifiedAt).toISOString()
          : null,
        modifiedAtText: fmtDateTime(deployment.env.modifiedAt),
      },
      container: deployment.container
        ? {
            name: deployment.container.name,
            status: deployment.container.status,
            running: deployment.container.running,
            startedAt: deployment.container.startedAt
              ? toDate(deployment.container.startedAt).toISOString()
              : null,
            startedAtText: fmtDateTime(deployment.container.startedAt),
            restartCount: deployment.container.restartCount,
            image: deployment.container.image,
            health: deployment.container.health,
          }
        : null,
      image: {
        name: deployment.image.name,
        createdAt: deployment.image.createdAt
          ? toDate(deployment.image.createdAt).toISOString()
          : null,
        createdAtText: fmtDateTime(deployment.image.createdAt),
      },
    },
    resources: {
      cpuCores: resources.cpuCores,
      memory: resources.memory,
      swap: resources.swap,
      disk: resources.disk,
      load: resources.load,
      uptimeSeconds: resources.uptimeSeconds,
      uptimeText: resources.uptimeText,
    },
    processes: {
      available: processesRaw.available,
      reason: processesRaw.reason || null,
      total: processesRaw.total,
      samples: processesRaw.samples,
      note: processesRaw.note || '',
    },
    ports: {
      available: portsRaw.available,
      reason: portsRaw.reason || null,
      expectedPort: portsRaw.expectedPort,
      listening: portsRaw.listening,
      ports: portsRaw.ports,
      source: portsRaw.source || null,
    },
    docker: {
      available: dockerRaw.available,
      daemon: Boolean(dockerRaw.daemon),
      reason: dockerRaw.reason || null,
      container: dockerRaw.container
        ? {
            name: dockerRaw.container.name,
            status: dockerRaw.container.status,
            running: dockerRaw.container.running,
            startedAt: dockerRaw.container.startedAt
              ? toDate(dockerRaw.container.startedAt).toISOString()
              : null,
            restartCount: dockerRaw.container.restartCount,
            image: dockerRaw.container.image,
            health: dockerRaw.container.health,
          }
        : null,
      imageCreatedAt: dockerRaw.imageCreatedAt
        ? toDate(dockerRaw.imageCreatedAt).toISOString()
        : null,
      containers: dockerRaw.containers || [],
    },
    health: healthRaw,
    db,
    configDrift,
    errorLogs: {
      available: errorLogs.available,
      reason: errorLogs.reason || null,
      totalScanned: errorLogs.totalScanned,
      files: errorLogs.files,
      latestFile: errorLogs.latestFile,
      note: errorLogs.note || '',
      clusters: errorLogs.clusters.map(cluster => ({
        fingerprint: cluster.fingerprint,
        count: cluster.count,
        firstAt: cluster.firstAt ? toDate(cluster.firstAt).toISOString() : null,
        firstAtText: cluster.firstAtText,
        lastAt: cluster.lastAt ? toDate(cluster.lastAt).toISOString() : null,
        lastAtText: cluster.lastAtText,
        module: cluster.module,
        file: cluster.file,
        line: cluster.line,
        message: cluster.message,
        frame: cluster.frame,
        statusCodes: cluster.statusCodes,
        urls: cluster.urls,
      })),
    },
    httpStats: httpStats.available
      ? {
          available: true,
          sampleMinutes: httpStats.sampleMinutes,
          windowStartText: httpStats.windowStartText,
          windowEndText: httpStats.windowEndText,
          scopeText: httpStats.scopeText,
          filesFound: httpStats.filesFound,
          linesScanned: httpStats.linesScanned,
          totalResponses: httpStats.totalResponses,
          count2xx: httpStats.count2xx,
          count3xx: httpStats.count3xx,
          count4xx: httpStats.count4xx,
          count401: httpStats.count401,
          count403: httpStats.count403,
          count404: httpStats.count404,
          count5xx: httpStats.count5xx,
          rate4xx: httpStats.rate4xx,
          rateAuth: httpStats.rateAuth,
          rate5xx: httpStats.rate5xx,
          rateUsable: httpStats.rateUsable,
          coverageMinutes: httpStats.coverageMinutes,
          httpLevel: httpStats.httpLevel,
          completeness: httpStats.completeness,
          samplingRate: httpStats.samplingRate,
          firstAt: httpStats.firstAt ? toDate(httpStats.firstAt).toISOString() : null,
          lastAt: httpStats.lastAt ? toDate(httpStats.lastAt).toISOString() : null,
          first5xxAt: httpStats.first5xxAt ? toDate(httpStats.first5xxAt).toISOString() : null,
          firstAuthAt: httpStats.firstAuthAt ? toDate(httpStats.firstAuthAt).toISOString() : null,
          topPaths5xx: httpStats.topPaths5xx,
          topPathsAuth: httpStats.topPathsAuth,
          topIpsAuth: httpStats.topIpsAuth,
          publicAuth: httpStats.publicAuth,
          login: httpStats.login,
          surge5xx: httpStats.surge5xx,
          sampleInsufficient: httpStats.sampleInsufficient,
          auth: httpStats.auth,
          baseline: httpStats.baseline,
          comparison: httpStats.comparison,
          notes: httpStats.notes,
        }
      : {
          available: false,
          reason: httpStats ? httpStats.reason : '未采集',
          sampleMinutes: args.sampleMinutes,
          profile: httpStats ? httpStats.profile : null,
          baseline: httpStats ? httpStats.baseline : null,
        },
    impact,
    actions,
    unavailable,
    output: {
      markdownPath,
      markdownError,
    },
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printCard(card, analysis.verdict, useColor);
    process.stdout.write('\n');
    if (markdownPath) {
      process.stdout.write(`事故卡已写入：${markdownPath}\n`);
    } else {
      process.stdout.write(`事故卡写入失败：${markdownError || '未知错误'}\n`);
    }
  }
}

main().catch(error => {
  process.stderr.write(`诊断脚本执行失败：${error && error.stack ? error.stack : error}\n`);
  process.exitCode = 1;
});
