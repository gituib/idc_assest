/**
 * IP 在线探测服务
 * 探测策略：先 ICMP ping，ping 不通再 TCP 多端口并发回退
 * - 跨平台（Windows ping -n / Linux ping -c）
 * - 支持 IPv4 / IPv6（IPv6 ping 参数不同）
 * - 批量并发控制（默认并发 20）
 */

const { spawn } = require('child_process');
const net = require('net');
const os = require('os');

const logger = require('../utils/logger').module('ipProbe');

/** 默认配置 */
const DEFAULT_CONFIG = {
  /** 是否启用 ping（ICMP）探测 */
  enablePing: true,
  /** TCP 回退端口列表（全局配置，逗号分隔或数组） */
  tcpPorts: [22, 80, 443, 161, 3389],
  /** 单端口超时（毫秒） */
  timeoutMs: 1500,
  /** 批量探测并发数 */
  concurrency: 20,
};

/**
 * 解析端口列表（兼容字符串 "22,80,443" 或数组）
 */
function parsePorts(ports) {
  if (Array.isArray(ports)) return ports.filter(p => Number.isFinite(p) && p >= 1 && p <= 65535);
  if (typeof ports === 'string') {
    return ports
      .split(/[,\s，]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(p => !isNaN(p) && p >= 1 && p <= 65535);
  }
  return [...DEFAULT_CONFIG.tcpPorts];
}

/**
 * ICMP ping 探测
 * @param {string} ip - IPv4 或 IPv6 地址
 * @param {number} timeoutMs - 超时毫秒
 * @returns {Promise<{ online: boolean, latencyMs: number|null, method: 'ping'|null }>}
 */
function ping(ip, timeoutMs = DEFAULT_CONFIG.timeoutMs) {
  return new Promise((resolve) => {
    const isWin = os.platform() === 'win32';
    const isV6 = ip.includes(':');

    // ping 命令参数：
    // Windows: ping -n 1 -w <ms> [-6] <ip>
    // Linux:   ping -c 1 -W <sec> [-6] <ip>  或 ping6 -c 1 -W <sec> <ip>
    let args;
    let cmd;
    if (isWin) {
      cmd = 'ping';
      args = ['-n', '1', '-w', String(timeoutMs), ip];
      if (isV6) args.push('-6');
    } else {
      if (isV6) {
        cmd = 'ping6';
        args = ['-c', '1', '-W', String(Math.ceil(timeoutMs / 1000)), ip];
      } else {
        cmd = 'ping';
        args = ['-c', '1', '-W', String(Math.ceil(timeoutMs / 1000)), ip];
      }
    }

    const start = Date.now();
    let output = '';
    let errored = false;

    try {
      const proc = spawn(cmd, args, { windowsHide: true, timeout: timeoutMs + 500 });

      proc.stdout.on('data', (d) => { output += d.toString(); });
      proc.stderr.on('data', (d) => { output += d.toString(); });
      proc.on('error', () => { errored = true; });

      proc.on('close', (code) => {
        const latency = Date.now() - start;
        // code === 0 表示通；否则不通
        // ping 在部分 Windows 上即使超时也返回 0，额外检查 output
        const online = code === 0 && !/destination host unreachable|request timed out|无法访问|请求超时/i.test(output);

        if (online) {
          resolve({ online: true, latencyMs: latency, method: 'ping' });
        } else {
          resolve({ online: false, latencyMs: null, method: null });
        }
      });

      proc.on('error', (err) => {
        errored = true;
        resolve({ online: false, latencyMs: null, method: null, error: err.message });
      });
    } catch (err) {
      resolve({ online: false, latencyMs: null, method: null, error: err.message });
    }
  });
}

/**
 * TCP 单端口探测
 */
function tcpConnect(ip, port, timeoutMs) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host: ip, port, family: 0 });
    let settled = false;
    const start = Date.now();

    const done = (online) => {
      if (settled) return;
      settled = true;
      try { sock.destroy(); } catch (_) {}
      const latency = Date.now() - start;
      resolve({ online, port, latencyMs: latency });
    };

    sock.setTimeout(timeoutMs, () => { done(false); });
    sock.on('connect', () => { done(true); });
    sock.on('error', () => { done(false); });
  });
}

/**
 * TCP 多端口并发探测
 * @returns {Promise<{ online: boolean, latencyMs: number|null, method: 'tcp', port: number|null }>}
 */
async function tcpProbe(ip, ports, timeoutMs = DEFAULT_CONFIG.timeoutMs) {
  const results = await Promise.all(
    ports.map(p => tcpConnect(ip, p, timeoutMs))
  );
  const success = results.filter(r => r.online);
  if (success.length === 0) {
    return { online: false, latencyMs: null, method: null, port: null };
  }
  // 返回最快连通的端口
  success.sort((a, b) => a.latencyMs - b.latencyMs);
  const best = success[0];
  return { online: true, latencyMs: best.latencyMs, method: 'tcp', port: best.port };
}

/**
 * 单 IP 探测（ping 优先 + TCP 回退）
 * @param {string} ip
 * @param {object} config - 探测配置
 * @returns {Promise<{ online: boolean, method: string|null, latencyMs: number|null }>}
 */
async function probeIp(ip, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const ports = parsePorts(cfg.tcpPorts);

  // 第一步：ping
  if (cfg.enablePing) {
    const pingResult = await ping(ip, cfg.timeoutMs);
    if (pingResult.online) {
      return { online: true, method: 'ping', latencyMs: pingResult.latencyMs };
    }
  }

  // 第二步：TCP 回退
  if (ports.length > 0) {
    const tcpResult = await tcpProbe(ip, ports, cfg.timeoutMs);
    if (tcpResult.online) {
      return { online: true, method: tcpResult.method, latencyMs: tcpResult.latencyMs, port: tcpResult.port };
    }
  }

  return { online: false, method: null, latencyMs: null };
}

/**
 * 批量并发探测
 * @param {Array<string>} ips - IP 地址数组
 * @param {object} config - 探测配置
 * @param {function} onProgress - 进度回调 (done, total, current) => void
 * @returns {Promise<Array<{ ip: string, online: boolean, method: string|null, latencyMs: number|null }>>}
 */
async function probeBatch(ips, config = {}, onProgress = null) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const concurrency = Math.max(1, Math.min(100, cfg.concurrency));
  const results = new Array(ips.length);
  let cursor = 0;
  const total = ips.length;

  /** worker：从共享 cursor 取任务执行 */
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= total) return;
      const ip = ips[idx];
      try {
        const r = await probeIp(ip, cfg);
        results[idx] = { ip, ...r };
      } catch (err) {
        logger.warn(`探测异常 ${ip}: ${err.message}`);
        results[idx] = { ip, online: false, method: null, latencyMs: null, error: err.message };
      }
      if (onProgress) onProgress(idx + 1, total, results[idx]);
    }
  }

  // 启动 concurrency 个 worker
  const workers = [];
  for (let i = 0; i < concurrency && i < total; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return results;
}

module.exports = {
  DEFAULT_CONFIG,
  probeIp,
  probeBatch,
  ping,
  tcpProbe,
  parsePorts,
};
