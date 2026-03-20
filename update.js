#!/usr/bin/env node

/**
 * IDC设备管理系统 - 一键更新脚本
 * 功能：拉取最新代码 → 安装依赖 → 数据库迁移 → 重建前端 → 重启服务 → 健康检查
 * 版本：2.0.0
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPT_VERSION = '2.0.0';
const MIN_NODE_VERSION = 16;
const LOCK_FILE = path.join(__dirname, '.update.lock');
const LOG_DIR = path.join(__dirname, 'logs');
const BACKUP_DIR = path.join(__dirname, 'backup');
const MAX_BACKUP_FILES = 10;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.bright}${colors.cyan}▶ ${msg}${colors.reset}`),
  divider: () => console.log(`${colors.gray}${'─'.repeat(60)}${colors.reset}`),
  subStep: (msg) => console.log(`  ${colors.gray}└${colors.reset} ${msg}`)
};

let logFileStream = null;
let updateStartTime = null;
let rollbackInfo = {
  backupDbPath: null,
  previousVersion: null
};

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    skipGit: args.includes('--skip-git'),
    skipBackup: args.includes('--skip-backup'),
    skipMigrate: args.includes('--skip-migrate'),
    skipBuild: args.includes('--skip-build'),
    skipRestart: args.includes('--skip-restart'),
    skipDeps: args.includes('--skip-deps'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    help: args.includes('--help') || args.includes('-h')
  };
}

function showHelp() {
  console.log(`
${colors.bright}IDC设备管理系统 - 一键更新脚本 v${SCRIPT_VERSION}${colors.reset}

用法: node update.js [选项]

选项:
  --skip-git      跳过 Git 拉取
  --skip-backup   跳过数据库备份
  --skip-deps     跳过依赖安装
  --skip-migrate  跳过数据库迁移
  --skip-build    跳过前端构建
  --skip-restart  跳过服务重启
  --dry-run       模拟运行，不执行实际操作
  --force         强制执行，忽略锁文件
  -h, --help      显示帮助信息

示例:
  node update.js                  # 完整更新流程
  node update.js --skip-deps      # 跳过依赖安装
  node update.js --dry-run        # 模拟运行
`);
  process.exit(0);
}

function initLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const logFileName = `update_${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
  const logFilePath = path.join(LOG_DIR, logFileName);
  logFileStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
      typeof arg === 'string' ? arg.replace(/\x1b\[[0-9;]*m/g, '') : String(arg)
    ).join(' ');
    logFileStream.write(`[${timestamp}] ${message}\n`);
    originalConsoleLog.apply(console, args);
  };
}

function closeLogFile() {
  if (logFileStream) {
    logFileStream.end();
  }
}

function checkLock(options) {
  if (options.force) {
    if (fs.existsSync(LOCK_FILE)) {
      log.warning('检测到锁文件，已通过 --force 强制执行');
      fs.unlinkSync(LOCK_FILE);
    }
    return true;
  }

  if (fs.existsSync(LOCK_FILE)) {
    const lockContent = fs.readFileSync(LOCK_FILE, 'utf8');
    log.error('另一个更新进程正在运行');
    log.info(`锁文件信息: ${lockContent}`);
    log.info('如需强制执行，请使用 --force 参数');
    return false;
  }

  const lockContent = JSON.stringify({
    pid: process.pid,
    startTime: new Date().toISOString()
  });
  fs.writeFileSync(LOCK_FILE, lockContent);
  return true;
}

function releaseLock() {
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
  }
}

function checkNodeVersion() {
  const nodeVersion = process.versions.node;
  const majorVersion = parseInt(nodeVersion.split('.')[0], 10);
  
  log.info(`Node.js 版本: ${nodeVersion}`);
  
  if (majorVersion < MIN_NODE_VERSION) {
    log.error(`Node.js 版本过低，需要 v${MIN_NODE_VERSION} 或更高版本`);
    return false;
  }
  return true;
}

function runCommand(command, options = {}) {
  if (options.dryRun) {
    log.subStep(`[模拟] 执行: ${command}`);
    return { success: true, output: '', dryRun: true };
  }

  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd || process.cwd(),
      shell: true,
      timeout: options.timeout || 300000
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

function getGitInfo() {
  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'pipe'] 
    }).trim();
    
    const currentCommit = execSync('git rev-parse HEAD', { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'pipe'] 
    }).trim().substring(0, 7);
    
    return { branch: currentBranch, commit: currentCommit };
  } catch {
    return { branch: 'unknown', commit: 'unknown' };
  }
}

function findBackendServiceName() {
  try {
    const jlistResult = execSync('pm2 jlist', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const processes = JSON.parse(jlistResult);

    for (const proc of processes) {
      const scriptPath = proc.pm2_env?.pm_out_log_path || proc.pm2_env?.pm_err_log_path || '';
      const script = proc.pm2_env?.script || '';

      if (scriptPath.includes('server.js') || script.includes('server.js')) {
        return proc.name;
      }
    }

    for (const proc of processes) {
      if (proc.name === 'server' || proc.name === 'idc-backend' || proc.name === 'backend') {
        return proc.name;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function findFrontendServiceName() {
  try {
    const jlistResult = execSync('pm2 jlist', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const processes = JSON.parse(jlistResult);

    for (const proc of processes) {
      const script = proc.pm2_env?.script || '';
      const scriptPath = proc.pm2_env?.pm_out_log_path || '';

      if (script.includes('vite') || scriptPath.includes('vite') ||
          script.includes('react') || script.includes('nginx') ||
          proc.name === 'frontend' || proc.name === 'idc-frontend') {
        return proc.name;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function backupDatabase(options) {
  if (options.skipBackup || options.dryRun) {
    if (options.skipBackup) log.info('已跳过数据库备份');
    return { success: true, skipped: true };
  }

  const envPath = path.join(__dirname, 'backend', '.env');
  if (!fs.existsSync(envPath)) {
    log.warning('未找到 .env 文件，跳过数据库备份');
    return { success: true, skipped: true };
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbTypeMatch = envContent.match(/DB_TYPE=(\w+)/);
  const dbType = dbTypeMatch ? dbTypeMatch[1].toLowerCase() : 'sqlite';

  if (dbType === 'sqlite') {
    const dbPath = path.join(__dirname, 'backend', 'idc_management.db');
    if (!fs.existsSync(dbPath)) {
      log.warning('SQLite 数据库文件不存在，跳过备份');
      return { success: true, skipped: true };
    }

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const backupPath = path.join(BACKUP_DIR, `database_${Date.now()}.db`);
    fs.copyFileSync(dbPath, backupPath);
    rollbackInfo.backupDbPath = backupPath;
    log.success(`数据库已备份: ${path.basename(backupPath)}`);

    cleanOldBackups('database_*.db');
    return { success: true, backupPath };
  } else if (dbType === 'mysql') {
    log.warning('MySQL 数据库请手动备份');
    log.subStep(`mysqldump -u [username] -p [database] > backup_${Date.now()}.sql`);
    return { success: true, skipped: true };
  }

  return { success: true, skipped: true };
}

function cleanOldBackups(pattern) {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.match(new RegExp(pattern.replace('*', '.*'))))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_BACKUP_FILES) {
      files.slice(MAX_BACKUP_FILES).forEach(f => {
        fs.unlinkSync(f.path);
        log.subStep(`清理旧备份: ${f.name}`);
      });
    }
  } catch (error) {
    log.warning(`清理旧备份失败: ${error.message}`);
  }
}

function pullCode(options) {
  if (options.skipGit) {
    log.info('已跳过 Git 拉取');
    return { success: true, skipped: true };
  }

  const gitInfo = getGitInfo();
  rollbackInfo.previousVersion = gitInfo.commit;
  log.info(`当前分支: ${gitInfo.branch}, 提交: ${gitInfo.commit}`);

  if (options.dryRun) {
    log.subStep('[模拟] 执行: git pull');
    return { success: true, dryRun: true };
  }

  const gitStatus = runCommand('git status --porcelain', { silent: true });
  if (gitStatus.output && gitStatus.output.trim()) {
    log.warning('工作区有未提交的更改');
    log.subStep(gitStatus.output.trim().split('\n').slice(0, 5).join('\n  '));
    
    const stashResult = runCommand('git stash');
    if (!stashResult.success) {
      log.error('暂存更改失败，请手动处理');
      return { success: false };
    }
    log.success('已暂存本地更改');
  }

  const pullResult = runCommand('git pull');
  if (pullResult.success) {
    const newGitInfo = getGitInfo();
    if (gitInfo.commit !== newGitInfo.commit) {
      log.success(`代码已更新: ${gitInfo.commit} → ${newGitInfo.commit}`);
    } else {
      log.info('代码已是最新版本');
    }
    return { success: true };
  }

  log.error('代码拉取失败');
  return { success: false };
}

function checkDepsNeedInstall(dirPath, dirName) {
  const nodeModulesPath = path.join(dirPath, 'node_modules');
  const packageJsonPath = path.join(dirPath, 'package.json');
  const packageLockPath = path.join(dirPath, 'package-lock.json');

  if (!fs.existsSync(packageJsonPath)) {
    return { needInstall: false, reason: '未找到 package.json' };
  }

  if (!fs.existsSync(nodeModulesPath)) {
    return { needInstall: true, reason: 'node_modules 不存在' };
  }

  try {
    const gitDiff = execSync(`git diff HEAD~1 --name-only -- "${dirName}/package.json" "${dirName}/package-lock.json" 2>nul`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    }).trim();

    if (gitDiff) {
      return { needInstall: true, reason: 'package.json 或 package-lock.json 有更新' };
    }
  } catch {
    // Git 检查失败，继续其他检测
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const depsCount = Object.keys(packageJson.dependencies || {}).length + 
                      Object.keys(packageJson.devDependencies || {}).length;
    
    const installedCount = fs.readdirSync(nodeModulesPath).filter(f => 
      !f.startsWith('.') && fs.statSync(path.join(nodeModulesPath, f)).isDirectory()
    ).length;

    if (depsCount > 0 && installedCount < depsCount * 0.5) {
      return { needInstall: true, reason: `已安装依赖数量不足 (${installedCount}/${depsCount})` };
    }
  } catch {
    // 检测失败，保守起见执行安装
    return { needInstall: true, reason: '依赖状态检测失败' };
  }

  return { needInstall: false, reason: '依赖已是最新' };
}

function installDependencies(options) {
  if (options.skipDeps) {
    log.info('已跳过依赖安装');
    return { success: true, skipped: true };
  }

  const backendPath = path.join(__dirname, 'backend');
  const frontendPath = path.join(__dirname, 'frontend');

  if (options.dryRun) {
    log.subStep('[模拟] 检测后端依赖');
    log.subStep('[模拟] 检测前端依赖');
    return { success: true, dryRun: true };
  }

  let backendSkipped = false;
  let frontendSkipped = false;

  log.subStep('检测后端依赖状态...');
  const backendCheck = checkDepsNeedInstall(backendPath, 'backend');
  if (backendCheck.needInstall) {
    log.info(`后端依赖需要更新: ${backendCheck.reason}`);
    const backendResult = runCommand('npm install --production=false', { cwd: backendPath });
    if (!backendResult.success) {
      log.error('后端依赖安装失败');
      return { success: false, step: 'backend' };
    }
    log.success('后端依赖安装完成');
  } else {
    log.success(`后端依赖已是最新 (${backendCheck.reason})`);
    backendSkipped = true;
  }

  log.subStep('检测前端依赖状态...');
  const frontendCheck = checkDepsNeedInstall(frontendPath, 'frontend');
  if (frontendCheck.needInstall) {
    log.info(`前端依赖需要更新: ${frontendCheck.reason}`);
    const frontendResult = runCommand('npm install', { cwd: frontendPath });
    if (!frontendResult.success) {
      log.error('前端依赖安装失败');
      return { success: false, step: 'frontend' };
    }
    log.success('前端依赖安装完成');
  } else {
    log.success(`前端依赖已是最新 (${frontendCheck.reason})`);
    frontendSkipped = true;
  }

  return { success: true, skipped: backendSkipped && frontendSkipped };
}

function runMigrations(options) {
  if (options.skipMigrate) {
    log.info('已跳过数据库迁移');
    return { success: true, skipped: true };
  }

  const migratePath = path.join(__dirname, 'backend', 'scripts', 'migrate-all.js');
  if (!fs.existsSync(migratePath)) {
    log.info('未找到迁移脚本，跳过');
    return { success: true, skipped: true };
  }

  if (options.dryRun) {
    log.subStep('[模拟] 执行数据库迁移');
    return { success: true, dryRun: true };
  }

  log.subStep('执行数据库迁移...');
  const migrateResult = runCommand('node scripts/migrate-all.js', { 
    cwd: path.join(__dirname, 'backend')
  });
  
  if (migrateResult.success) {
    log.success('数据库迁移完成');
    return { success: true };
  }

  log.warning('数据库迁移可能存在问题，请检查日志');
  return { success: true, warning: true };
}

function checkFrontendNeedsBuild() {
  const frontendPath = path.join(__dirname, 'frontend');
  const distPath = path.join(frontendPath, 'dist');
  const srcPath = path.join(frontendPath, 'src');

  if (!fs.existsSync(distPath)) {
    return { needBuild: true, reason: 'dist 目录不存在' };
  }

  try {
    const gitDiff = execSync('git diff HEAD~1 --name-only -- "frontend/src" "frontend/package.json" "frontend/vite.config.*" "frontend/index.html" 2>nul', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    }).trim();

    if (gitDiff) {
      const changedFiles = gitDiff.split('\n').filter(f => f).slice(0, 3);
      return { 
        needBuild: true, 
        reason: `源码或配置有更新: ${changedFiles.join(', ')}${gitDiff.split('\n').length > 3 ? '...' : ''}`
      };
    }
  } catch {
    // Git 检查失败，继续其他检测
  }

  try {
    let latestSrcTime = 0;
    let latestDistTime = 0;

    const getLatestTime = (dir) => {
      let latest = 0;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          latest = Math.max(latest, getLatestTime(filePath));
        } else {
          latest = Math.max(latest, stat.mtimeMs);
        }
      }
      return latest;
    };

    if (fs.existsSync(srcPath)) {
      latestSrcTime = getLatestTime(srcPath);
    }
    if (fs.existsSync(distPath)) {
      latestDistTime = getLatestTime(distPath);
    }

    if (latestSrcTime > latestDistTime) {
      return { needBuild: true, reason: '源码修改时间晚于构建产物' };
    }
  } catch {
    // 时间检测失败，保守起见执行构建
    return { needBuild: true, reason: '构建状态检测失败' };
  }

  return { needBuild: false, reason: '构建产物已是最新' };
}

function buildFrontend(options) {
  if (options.skipBuild) {
    log.info('已跳过前端构建');
    return { success: true, skipped: true };
  }

  const frontendPath = path.join(__dirname, 'frontend');

  if (options.dryRun) {
    log.subStep('[模拟] 检测前端构建状态');
    return { success: true, dryRun: true };
  }

  log.subStep('检测前端构建状态...');
  const buildCheck = checkFrontendNeedsBuild();
  
  if (buildCheck.needBuild) {
    log.info(`前端需要构建: ${buildCheck.reason}`);
    const buildResult = runCommand('npm run build', { cwd: frontendPath });
    
    if (buildResult.success) {
      log.success('前端构建完成');
      return { success: true };
    }

    log.error('前端构建失败');
    return { success: false };
  }

  log.success(`前端构建产物已是最新 (${buildCheck.reason})`);
  return { success: true, skipped: true };
}

function restartServices(options) {
  if (options.skipRestart) {
    log.info('已跳过服务重启');
    return { success: true, skipped: true };
  }

  if (options.dryRun) {
    log.subStep('[模拟] 重启后端服务');
    log.subStep('[模拟] 重启前端服务');
    return { success: true, dryRun: true };
  }

  log.subStep('检查 PM2 服务状态...');
  const listResult = runCommand('pm2 list', { silent: true });
  
  if (!listResult.success) {
    log.warning('PM2 未安装或未运行，尝试直接启动');
    return startDirectly();
  }

  const backendServiceName = findBackendServiceName();
  if (!backendServiceName) {
    log.warning('未找到后端服务，创建新服务...');
    const startResult = runCommand('pm2 start backend/server.js --name server');
    if (startResult.success) {
      log.success('后端服务已创建');
    }
    return { success: startResult.success };
  }

  log.subStep(`重启后端服务 (${backendServiceName})...`);
  const backendRestart = runCommand(`pm2 restart ${backendServiceName}`);
  
  if (backendRestart.success) {
    log.success('后端服务已重启');
  } else {
    log.error('后端服务重启失败');
    return { success: false };
  }

  const frontendServiceName = findFrontendServiceName();
  if (frontendServiceName) {
    log.subStep(`重启前端服务 (${frontendServiceName})...`);
    const frontendRestart = runCommand(`pm2 restart ${frontendServiceName}`);
    if (frontendRestart.success) {
      log.success('前端服务已重启');
    }
  }

  runCommand('pm2 save');
  return { success: true };
}

function startDirectly() {
  log.subStep('尝试直接启动后端服务...');
  
  const backendPath = path.join(__dirname, 'backend');
  const serverPath = path.join(backendPath, 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    log.error('未找到 server.js');
    return { success: false };
  }

  try {
    const child = spawn('node', ['server.js'], {
      cwd: backendPath,
      detached: true,
      stdio: 'ignore',
      shell: true
    });
    child.unref();
    log.success('后端服务已启动 (PID: ' + child.pid + ')');
    return { success: true };
  } catch (error) {
    log.error(`启动失败: ${error.message}`);
    return { success: false };
  }
}

async function healthCheck() {
  log.subStep('检查服务健康状态...');
  
  const maxRetries = 5;
  const retryDelay = 3000;
  
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const result = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>nul || echo "000"', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000
      }).trim();
      
      if (result === '200') {
        log.success('服务健康检查通过');
        return { success: true };
      }
      
      if (i < maxRetries) {
        log.subStep(`第 ${i} 次检查失败 (HTTP ${result})，${retryDelay/1000}秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      if (i < maxRetries) {
        log.subStep(`第 ${i} 次检查失败，${retryDelay/1000}秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  log.warning('健康检查未通过，请手动验证服务状态');
  return { success: false, warning: true };
}

function rollback(reason) {
  log.divider();
  log.error(`更新失败: ${reason}`);
  log.step('执行回滚...');

  if (rollbackInfo.backupDbPath && fs.existsSync(rollbackInfo.backupDbPath)) {
    const dbPath = path.join(__dirname, 'backend', 'idc_management.db');
    fs.copyFileSync(rollbackInfo.backupDbPath, dbPath);
    log.success('数据库已回滚');
  }

  if (rollbackInfo.previousVersion) {
    log.subStep(`如需回滚代码，执行: git reset --hard ${rollbackInfo.previousVersion}`);
  }

  log.divider();
}

function printSummary(options, results) {
  const duration = ((Date.now() - updateStartTime) / 1000).toFixed(1);
  
  console.log(`\n${colors.bright}${colors.magenta}
╔══════════════════════════════════════════════════════════╗
║                    更新摘要                               ║
╚══════════════════════════════════════════════════════════╝${colors.reset}`);

  console.log(`\n  ${colors.cyan}执行模式:${colors.reset} ${options.dryRun ? '模拟运行' : '实际执行'}`);
  console.log(`  ${colors.cyan}耗时:${colors.reset} ${duration} 秒`);
  
  console.log(`\n  ${colors.cyan}步骤状态:${colors.reset}`);
  console.log(`    数据库备份: ${results.backup?.skipped ? '已跳过' : results.backup?.success ? '成功' : '失败'}`);
  console.log(`    代码更新:   ${results.git?.skipped ? '已跳过' : results.git?.success ? '成功' : '失败'}`);
  console.log(`    依赖安装:   ${results.deps?.skipped ? '已跳过' : results.deps?.success ? '成功' : '失败'}`);
  console.log(`    数据库迁移: ${results.migrate?.skipped ? '已跳过' : results.migrate?.success ? '成功' : '失败'}`);
  console.log(`    前端构建:   ${results.build?.skipped ? '已跳过' : results.build?.success ? '成功' : '失败'}`);
  console.log(`    服务重启:   ${results.restart?.skipped ? '已跳过' : results.restart?.success ? '成功' : '失败'}`);
  console.log(`    健康检查:   ${results.health?.success ? '通过' : '未通过'}`);

  console.log(`\n  ${colors.cyan}访问地址:${colors.reset}`);
  console.log(`    后端API: http://localhost:8000/api`);
  console.log(`    前端页面: http://localhost`);
  
  console.log(`\n  ${colors.cyan}日志文件:${colors.reset}`);
  console.log(`    ${path.join(LOG_DIR, `update_*.log`)}`);
  
  console.log('');
}

async function main() {
  updateStartTime = Date.now();
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  initLogFile();

  console.log(`
${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════╗
║     IDC设备管理系统 - 一键更新脚本 v${SCRIPT_VERSION}                  ║
║     One-Click Update Script                               ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

  if (options.dryRun) {
    log.info('运行模式: 模拟运行 (不会执行实际操作)');
  }

  const results = {};

  try {
    if (!checkNodeVersion()) {
      process.exit(1);
    }

    if (!checkLock(options)) {
      process.exit(1);
    }

    process.on('SIGINT', () => {
      log.warning('收到中断信号，正在清理...');
      releaseLock();
      closeLogFile();
      process.exit(130);
    });

    log.step('1. 备份数据');
    results.backup = backupDatabase(options);
    if (!results.backup.success && !options.dryRun) {
      throw new Error('数据库备份失败');
    }

    log.step('2. 拉取最新代码');
    results.git = pullCode(options);

    log.step('3. 安装依赖');
    results.deps = installDependencies(options);
    if (!results.deps.success && !options.dryRun) {
      throw new Error('依赖安装失败');
    }

    log.step('4. 数据库迁移');
    results.migrate = runMigrations(options);

    log.step('5. 构建前端');
    results.build = buildFrontend(options);
    if (!results.build.success && !options.dryRun) {
      throw new Error('前端构建失败');
    }

    log.step('6. 重启服务');
    results.restart = restartServices(options);
    if (!results.restart.success && !options.dryRun) {
      throw new Error('服务重启失败');
    }

    log.step('7. 健康检查');
    results.health = await healthCheck();

    log.divider();
    
    if (!options.dryRun && results.health.success) {
      log.success('更新完成！系统已成功更新并正常运行');
    } else if (options.dryRun) {
      log.success('模拟运行完成！使用不带 --dry-run 参数执行实际更新');
    } else {
      log.warning('更新完成，但健康检查未通过，请手动验证服务状态');
    }

  } catch (error) {
    if (!options.dryRun) {
      rollback(error.message);
    } else {
      log.error(`[模拟] 更新失败: ${error.message}`);
    }
    results.error = error.message;
  } finally {
    releaseLock();
    printSummary(options, results);
    closeLogFile();
  }
}

main();
