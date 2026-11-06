/**
 * 前端错误日志上报工具
 *
 * 捕获 window.onerror / unhandledrejection / ErrorBoundary 渲染错误，
 * 批量上报到后端 /api/frontend-logs 统一落盘（winston 日志体系）。
 *
 * 关键设计约束：
 * - 上报统一使用原生 fetch（而非 axios），避免后端不可达时 axios 拦截器
 *   （401 跳转、await 抛错等）再次触发 onerror 形成无限循环。
 * - 批量暂存 + 定时 flush（500ms），防高频错误风暴刷爆日志。
 * - 上报自身失败静默，绝不重抛、绝不影响主流程。
 */

// 上报队列
const queue = [];
let timer = null;
let initialized = false;

/**
 * 将队列中积压的错误一次性上报
 * 上报失败静默（catch 空），绝不再触发错误事件
 */
function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);

  fetch('/api/frontend-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: batch[0]?.type || 'error', ...batch[0] }),
    keepalive: true,
  }).catch(() => {
    // 静默：上报失败不抛错，避免循环上报
  });
}

/**
 * 入队一条错误记录，500ms 合并上报
 */
function enqueue(payload) {
  queue.push(payload);
  // 队列过大时丢弃最旧的，防止内存无限增长
  if (queue.length > 20) {
    queue.shift();
  }
  if (!timer) {
    timer = setTimeout(() => {
      timer = null;
      flush();
    }, 500);
  }
}

/**
 * 上报一条错误
 * @param {string} type - 'error' | 'unhandledrejection' | 'boundary'
 * @param {Object} data - { message, stack, componentStack, ... }
 */
export function report(type, data = {}) {
  try {
    enqueue({
      type,
      message: String(data.message || ''),
      stack: String(data.stack || '').slice(0, 4000),
      componentStack: String(data.componentStack || ''),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    });
  } catch (e) {
    // 静默
  }
}

/**
 * 初始化全局错误捕获（window.onerror + unhandledrejection）
 * 应在 App 渲染前调用一次
 */
export function initGlobalHandlers() {
  if (initialized) return;
  initialized = true;

  window.addEventListener('error', (event) => {
    report('error', {
      message: event.message,
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason instanceof Error) {
      report('unhandledrejection', {
        message: reason.message,
        stack: reason.stack,
      });
    } else {
      report('unhandledrejection', {
        message: typeof reason === 'string' ? reason : String(reason || '未处理的 Promise 拒绝'),
      });
    }
  });
}
