const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const { runCommand } = require('./utils');
const { config } = require('./config');
const { rollbackSteps } = require('./rollback');
const { NPM_MIRRORS } = require('./constants');

function checkRegistryReachable(registry, timeout = 10000) {
  return new Promise((resolve) => {
    const url = new URL(registry);
    const http = url.protocol === 'https:' ? require('https') : require('http');
    const req = http.get(`${registry}/-/ping`, { timeout }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function detectAvailableRegistry() {
  for (const mirror of NPM_MIRRORS) {
    log.subStep(`检测 ${mirror.name} (${mirror.registry})...`);
    const reachable = await checkRegistryReachable(mirror.registry);
    if (reachable) {
      log.success(`${mirror.name} 可用`);
      return mirror.registry;
    }
    log.subStep(`${mirror.name} 不可达`);
  }
  return NPM_MIRRORS[0].registry;
}

async function npmInstallWithRetry(cwd, label) {
  const maxRetries = 3;
  const baseDelay = 3000;

  const availableRegistry = await detectAvailableRegistry();
  const isDefaultRegistry = availableRegistry === NPM_MIRRORS[0].registry;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (attempt > 1) {
      const delay = baseDelay * Math.pow(2, attempt - 2);
      log.subStep(`第 ${attempt}/${maxRetries} 次重试，${delay / 1000}秒后...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    let command = 'npm install';
    if (!isDefaultRegistry) {
      command += ` --registry=${availableRegistry}`;
    }

    log.info(`安装${label}依赖${attempt > 1 ? ` (第${attempt}次尝试)` : ''}...`);
    const result = runCommand(command, { cwd });

    if (result.success) {
      const nodeModulesPath = path.join(cwd, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        return { success: true };
      }
      log.subStep(`${label} node_modules 不存在，安装可能未完成`);
    } else {
      log.subStep(`${label}依赖安装失败: ${result.error || '未知错误'}`);
    }
  }

  return { success: false, error: `${label}依赖安装失败（已重试${maxRetries}次）` };
}

async function installDependencies() {
  log.step('安装依赖');

  const backendDir = path.join(__dirname, '..', 'backend');
  const frontendDir = path.join(__dirname, '..', 'frontend');

  log.info('安装后端依赖...');
  const backendResult = await npmInstallWithRetry(backendDir, '后端');
  if (backendResult.success) {
    log.success('后端依赖安装完成');
    rollbackSteps.push(() => {
      const rmCmd = process.platform === 'win32' ? 'rmdir /s /q node_modules' : 'rm -rf node_modules';
      runCommand(rmCmd, { cwd: backendDir, silent: true });
    });
  } else {
    log.error(backendResult.error);
    throw new Error('Backend install failed');
  }

  log.info('安装前端依赖...');
  const frontendResult = await npmInstallWithRetry(frontendDir, '前端');
  if (frontendResult.success) {
    log.success('前端依赖安装完成');
    rollbackSteps.push(() => {
      const rmCmd = process.platform === 'win32' ? 'rmdir /s /q node_modules' : 'rm -rf node_modules';
      runCommand(rmCmd, { cwd: frontendDir, silent: true });
    });
  } else {
    log.error(frontendResult.error);
    throw new Error('Frontend install failed');
  }
}

async function initDatabase() {
  log.step('数据库初始化');

  const initScript = path.join(__dirname, '..', 'backend', 'scripts', 'init-database.js');

  if (!fs.existsSync(initScript)) {
    log.warning('未找到数据库初始化脚本，跳过');
    return;
  }

  log.info('正在初始化数据库...');
  const result = runCommand('node scripts/init-database.js', {
    cwd: path.join(__dirname, '..', 'backend')
  });

  if (result.success) {
    log.success('数据库初始化完成');
  } else {
    log.error('数据库初始化失败');
    log.info('请检查数据库配置并手动运行: node backend/scripts/init-database.js');
    throw new Error('Database initialization failed');
  }
}

function getAvailableMemoryMB() {
  try {
    const os = require('os');
    return Math.round(os.freemem() / 1024 / 1024);
  } catch {
    return null;
  }
}

async function buildFrontend() {
  log.step('构建前端');

  const frontendDir = path.join(__dirname, '..', 'frontend');

  const freeMemMB = getAvailableMemoryMB();
  let buildCommand = 'npm run build';

  if (freeMemMB !== null) {
    if (freeMemMB < 512) {
      log.warning(`系统可用内存较低 (${freeMemMB}MB)，前端构建可能失败`);
      log.info('建议增加内存或创建 swap 分区后再试');
    } else if (freeMemMB < 1024) {
      log.info(`可用内存 ${freeMemMB}MB，限制 Node 堆栈为 512MB...`);
      buildCommand = 'node --max_old_space_size=512 node_modules/vite/bin/vite.js build';
    }
  }

  log.info('执行前端构建...');
  const result = runCommand(buildCommand, { cwd: frontendDir });

  if (result.success) {
    log.success('前端构建完成');
    rollbackSteps.push(() => {
      const distDir = path.join(frontendDir, 'dist');
      if (fs.existsSync(distDir)) {
        const rmCmd = process.platform === 'win32' ? 'rmdir /s /q dist' : 'rm -rf dist';
        runCommand(rmCmd, { cwd: frontendDir, silent: true });
      }
    });
  } else {
    log.error('前端构建失败');
    throw new Error('Frontend build failed');
  }
}

async function startServices() {
  log.step('启动服务');

  const logDir = path.join(__dirname, '..', 'backend', 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  log.info('停止已有服务...');
  const stopCmd = process.platform === 'win32' 
    ? 'pm2 stop idc-backend idc-frontend 2>nul || exit 0' 
    : 'pm2 stop idc-backend idc-frontend 2>/dev/null || true';
  runCommand(stopCmd, { silent: true });

  log.info('启动后端服务...');
  const backendResult = runCommand(
    `pm2 start server.js --name "idc-backend" --env ${config.nodeEnv}`,
    { cwd: path.join(__dirname, '..', 'backend') }
  );

  if (backendResult.success) {
    log.success(`后端服务已启动 (端口: ${config.backendPort})`);
    rollbackSteps.push(() => {
      runCommand('pm2 stop idc-backend', { silent: true });
      runCommand('pm2 delete idc-backend', { silent: true });
    });
  } else {
    log.error('后端服务启动失败');
    log.info('请检查后端日志: pm2 logs idc-backend');
    throw new Error('Backend service start failed');
  }

  if (config.frontendDeploy === 'pm2') {
    log.info('安装 serve 包...');
    runCommand('npm install -g serve', { silent: true });

    log.info('启动前端服务...');
    const frontendResult = runCommand(
      `pm2 start serve --name "idc-frontend" -- -s dist -l ${config.frontendPort}`,
      { cwd: path.join(__dirname, '..', 'frontend') }
    );

    if (frontendResult.success) {
      log.success(`前端服务已启动 (端口: ${config.frontendPort})`);
      rollbackSteps.push(() => {
        runCommand('pm2 stop idc-frontend', { silent: true });
        runCommand('pm2 delete idc-frontend', { silent: true });
      });
    } else {
      log.error('前端服务启动失败');
      log.info('请检查前端日志: pm2 logs idc-frontend');
      throw new Error('Frontend service start failed');
    }
  }

  runCommand('pm2 save', { silent: true });

  log.divider();
}

module.exports = {
  checkRegistryReachable,
  detectAvailableRegistry,
  npmInstallWithRetry,
  installDependencies,
  initDatabase,
  getAvailableMemoryMB,
  buildFrontend,
  startServices,
};
