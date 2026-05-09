const { log } = require('./logger');
const { config } = require('./config');

function httpHealthCheck(host, port, path = '/health', timeout = 5000) {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.get({ hostname: host, port, path, timeout }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ success: res.statusCode >= 200 && res.statusCode < 400, statusCode: res.statusCode });
      });
    });
    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });
  });
}

async function healthCheck() {
  log.step('健康检查');
  log.subStep('检查后端服务状态...');

  const maxRetries = 5;
  const retryDelay = 3000;

  for (let i = 1; i <= maxRetries; i++) {
    const result = await httpHealthCheck('localhost', parseInt(config.backendPort));

    if (result.success) {
      log.success('后端服务健康检查通过');
      return { success: true };
    }

    const detail = result.statusCode ? `HTTP ${result.statusCode}` : (result.error || '无响应');
    if (i < maxRetries) {
      log.subStep(`第 ${i} 次检查失败 (${detail})，${retryDelay/1000}秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  log.warning('健康检查未通过，请手动验证服务状态');
  return { success: false };
}

module.exports = {
  httpHealthCheck,
  healthCheck,
};
