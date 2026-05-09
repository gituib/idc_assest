#!/usr/bin/env node

/**
 * ============================================================================
 * IDC设备管理系统 - 卸载脚本 v2.0.0
 * ============================================================================
 *
 * 功能说明：
 *   - 停止并删除 PM2 管理的后端和前端服务
 *   - 清理 Nginx 配置文件（可选）
 *   - 删除生成的配置文件（.env、ecosystem.config.js、nginx-idc.conf）
 *   - 可选删除数据库文件（SQLite）
 *   - 可选删除 node_modules 和构建产物
 *
 * 使用方法：
 *   node uninstall.js              # 交互式卸载
 *   node uninstall.js --help       # 查看帮助
 *   node uninstall.js --force      # 强制卸载（无需确认）
 *   node uninstall.js --backup     # 卸载前自动备份
 */

const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPT_VERSION = '2.0.0';
const BACKUP_DIR = path.join(__dirname, 'backup');
const LOG_DIR = path.join(__dirname, 'logs');

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
let uninstallStartTime = null;
let deletedItems = [];
let backedUpItems = [];

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force') || args.includes('-f') || args.includes('--yes') || args.includes('-y'),
    backup: args.includes('--backup') || args.includes('-b'),
    dryRun: args.includes('--dry-run'),
    skipDb: args.includes('--skip-db'),
    skipDeps: args.includes('--skip-deps'),
    skipUploads: args.includes('--skip-uploads'),
    help: args.includes('--help') || args.includes('-h')
  };
}

function showHelp() {
  console.log(`
${colors.bright}IDC设备管理系统 - 卸载脚本 v${SCRIPT_VERSION}${colors.reset}

用法: node uninstall.js [选项]

选项:
  -f, --force       强制卸载（无需确认）
  -y, --yes         强制卸载别名（同 --force）
  -b, --backup      卸载前自动备份数据库
  --dry-run         预览模式：仅显示将要删除的内容，不实际执行
  --skip-db         跳过数据库删除
  --skip-deps       跳过依赖删除
  --skip-uploads    跳过上传文件目录删除
  -h, --help        显示帮助信息

示例:
  node uninstall.js              # 交互式卸载
  node uninstall.js --force      # 强制卸载
  node uninstall.js --backup     # 卸载前备份
  node uninstall.js --dry-run    # 预览将删除的内容
`);
  process.exit(0);
}

function initLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const logFileName = `uninstall_${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
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

// =============================================================================
// 交互式输入函数
// =============================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question, defaultValue = '') {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

// =============================================================================
// 系统命令执行函数
// =============================================================================

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd || process.cwd(),
      shell: true
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function commandExists(command) {
  try {
    execSync(`${command} --version`, { stdio: 'pipe', shell: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * 从 ecosystem.config.js 读取 PM2 服务名
 * 如果配置文件不存在则返回默认值
 *
 * @returns {{ backendName: string, frontendName: string }} PM2 服务名
 */
function getPM2ServiceNames() {
  const defaultNames = { backendName: 'idc-backend', frontendName: 'idc-frontend' };
  const configPath = path.join(__dirname, 'deploy', 'ecosystem.config.js');

  if (!fs.existsSync(configPath)) {
    return defaultNames;
  }

  try {
    const config = require(configPath);
    if (!config || !Array.isArray(config.apps)) {
      return defaultNames;
    }

    const names = { ...defaultNames };
    config.apps.forEach(app => {
      if (app.name && app.name.startsWith('idc-')) {
        if (app.name.includes('backend') || (app.script && app.script.includes('server'))) {
          names.backendName = app.name;
        } else if (app.name.includes('frontend') || app.name === 'idc-frontend') {
          names.frontendName = app.name;
        }
      }
    });
    return names;
  } catch {
    return defaultNames;
  }
}

/**
 * 从 .env 文件读取数据库配置
 * 返回数据库类型和 SQLite 数据库文件路径
 *
 * @returns {{ dbType: string, sqliteDbPath: string }}
 */
function getDatabaseConfig() {
  const defaultConfig = {
    dbType: 'sqlite',
    sqliteDbPath: path.join(__dirname, 'backend', 'idc_management.db')
  };

  const envPath = path.join(__dirname, 'backend', '.env');
  if (!fs.existsSync(envPath)) {
    return defaultConfig;
  }

  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const config = { ...defaultConfig };

    const dbTypeMatch = envContent.match(/^DB_TYPE\s*=\s*(\w+)/m);
    if (dbTypeMatch) {
      config.dbType = dbTypeMatch[1].toLowerCase();
    }

    const dbPathMatch = envContent.match(/^DB_PATH\s*=\s*(.+)$/m);
    if (dbPathMatch && config.dbType === 'sqlite') {
      const rawPath = dbPathMatch[1].trim().replace(/['"]/g, '');
      if (path.isAbsolute(rawPath)) {
        config.sqliteDbPath = rawPath;
      } else {
        config.sqliteDbPath = path.resolve(__dirname, 'backend', rawPath);
      }
    }

    return config;
  } catch {
    return defaultConfig;
  }
}

// =============================================================================
// 检测是否以 root 用户运行
// =============================================================================

function isRootUser() {
  return process.getuid && process.getuid() === 0;
}

// =============================================================================
// 服务停止与删除
// =============================================================================

async function stopAndDeleteServices() {
  log.step('停止并删除服务');

  if (!commandExists('pm2')) {
    log.warning('未检测到 PM2，跳过服务停止步骤');
    return;
  }

  const { backendName, frontendName } = getPM2ServiceNames();
  const isWindows = process.platform === 'win32';
  const nullRedirect = isWindows ? '2>nul' : '2>/dev/null';
  const orTrue = isWindows ? '|| exit 0' : '|| true';

  /**
   * 检查 PM2 中是否存在指定名称的进程
   *
   * @param {string} name - 进程名称
   * @returns {boolean} 进程是否存在
   */
  function pm2ProcessExists(name) {
    const result = runCommand(`pm2 describe ${name} ${nullRedirect}`, { silent: true });
    return result.success;
  }

  const services = [
    { name: backendName, label: '后端服务' },
    { name: frontendName, label: '前端服务' }
  ];

  for (const service of services) {
    if (!pm2ProcessExists(service.name)) {
      log.info(`${service.label} (${service.name}) 不存在于 PM2 中，跳过`);
      continue;
    }

    log.info(`停止 ${service.label} (${service.name})...`);
    const stopResult = runCommand(`pm2 stop ${service.name} ${nullRedirect} ${orTrue}`, { silent: true });
    if (stopResult.success) {
      log.success(`${service.label} 已停止`);
    } else {
      log.warning(`${service.label} 停止失败（可能已停止）`);
    }

    log.info(`删除 ${service.label} (${service.name})...`);
    const deleteResult = runCommand(`pm2 delete ${service.name} ${nullRedirect} ${orTrue}`, { silent: true });
    if (deleteResult.success) {
      log.success(`${service.label} 已删除`);
    } else {
      log.warning(`${service.label} 删除失败`);
    }
  }

  log.info('保存 PM2 配置...');
  runCommand(`pm2 save ${nullRedirect} ${orTrue}`, { silent: true });

  log.info('清理 PM2 开机自启配置...');
  const startupResult = runCommand(`pm2 unstartup ${nullRedirect} ${orTrue}`, { silent: true });
  if (startupResult.success) {
    log.success('PM2 开机自启配置已清理');
  }

  log.info('清理 PM2 日志文件...');
  const pm2LogDir = path.join(os.homedir(), '.pm2', 'logs');
  if (fs.existsSync(pm2LogDir)) {
    const pm2LogFiles = fs.readdirSync(pm2LogDir).filter(f =>
      f.startsWith(backendName) || f.startsWith(frontendName)
    );
    if (pm2LogFiles.length > 0) {
      pm2LogFiles.forEach(f => {
        try {
          fs.unlinkSync(path.join(pm2LogDir, f));
          log.subStep(`PM2 日志已清理: ${f}`);
        } catch (e) {
          log.warning(`PM2 日志清理失败: ${f}`);
        }
      });
    } else {
      log.subStep('未找到 PM2 相关日志文件');
    }
  }

  log.divider();
}

// =============================================================================
// Nginx 配置清理
// =============================================================================

async function cleanupNginxConfig(cmdArgs) {
  log.step('清理 Nginx 配置');

  const isWindows = process.platform === 'win32';
  const isLinux = process.platform === 'linux';

  if (isWindows) {
    // Windows 下提示手动清理
    log.info('Windows 系统请手动清理 Nginx 配置：');
    console.log(`  1. 删除配置文件: ${colors.cyan}C:/nginx/conf/conf.d/idc.conf${colors.reset}`);
    console.log(`  2. 编辑主配置: 从 ${colors.cyan}C:/nginx/conf/nginx.conf${colors.reset} 中移除 include conf.d/*.conf;`);
    console.log(`  3. 停止 Nginx: ${colors.cyan}nginx -s stop${colors.reset}`);

    if (!cmdArgs?.force) {
      const confirm = await ask('是否已手动清理 Nginx 配置? (Y/n)', 'Y');
      if (confirm.toLowerCase() !== 'y') {
        log.warning('请记得手动清理 Nginx 配置');
      }
    } else {
      log.info('强制模式：跳过 Nginx 清理确认');
    }
  } else if (isLinux) {
    // Linux 下自动清理
    const root = isRootUser();
    const sudoPrefix = root ? '' : 'sudo ';

    // 检测配置文件位置
    const sitesAvailablePath = '/etc/nginx/sites-available/idc';
    const sitesEnabledPath = '/etc/nginx/sites-enabled/idc';
    const confDPath = '/etc/nginx/conf.d/idc';
    const confDWithExtPath = '/etc/nginx/conf.d/idc.conf';

    let configExists = false;

    // 删除 sites-available 中的配置
    if (fs.existsSync(sitesAvailablePath)) {
      configExists = true;
      log.info('删除 sites-available 配置...');
      const result = runCommand(`${sudoPrefix}rm -f "${sitesAvailablePath}"`, { silent: true });
      if (result.success) {
        log.success('sites-available/idc 已删除');
      } else {
        log.error('删除失败');
      }
    }

    // 删除 sites-enabled 中的软链接
    if (fs.existsSync(sitesEnabledPath)) {
      configExists = true;
      log.info('删除 sites-enabled 软链接...');
      const result = runCommand(`${sudoPrefix}rm -f "${sitesEnabledPath}"`, { silent: true });
      if (result.success) {
        log.success('sites-enabled/idc 已删除');
      } else {
        log.error('删除失败');
      }
    }

    // 删除 conf.d 中的配置（无扩展名）
    if (fs.existsSync(confDPath)) {
      configExists = true;
      log.info('删除 conf.d 配置...');
      const result = runCommand(`${sudoPrefix}rm -f "${confDPath}"`, { silent: true });
      if (result.success) {
        log.success('conf.d/idc 已删除');
      } else {
        log.error('删除失败');
      }
    }

    // 删除 conf.d 中的配置（带 .conf 扩展名）
    if (fs.existsSync(confDWithExtPath)) {
      configExists = true;
      log.info('删除 conf.d 配置（带扩展名）...');
      const result = runCommand(`${sudoPrefix}rm -f "${confDWithExtPath}"`, { silent: true });
      if (result.success) {
        log.success('conf.d/idc.conf 已删除');
      } else {
        log.error('删除失败');
      }
    }

    if (!configExists) {
      log.info('未找到系统 Nginx 配置文件');
    } else {
      // 测试并重载 Nginx
      log.info('测试 Nginx 配置...');
      const testResult = runCommand(`${sudoPrefix}nginx -t`, { silent: true });
      if (testResult.success) {
        log.success('Nginx 配置测试通过');

        log.info('重载 Nginx 服务...');
        const reloadResult = runCommand(`${sudoPrefix}nginx -s reload`, { silent: true });
        if (reloadResult.success) {
          log.success('Nginx 已重载');
        } else {
          log.warning('Nginx 重载失败，可能需要手动重启');
        }
      } else {
        log.warning('Nginx 配置测试失败，请手动检查');
      }
    }
  } else {
    // macOS 或其他系统
    log.info('请手动清理 Nginx 配置');
    console.log(`  配置文件可能位于: ${colors.cyan}/usr/local/etc/nginx/servers/${colors.reset}`);
    console.log(`  或使用: ${colors.cyan}brew services stop nginx${colors.reset}`);
  }

  log.divider();
}

// =============================================================================
// 配置文件清理
// =============================================================================

async function cleanupConfigFiles() {
  log.step('清理生成的配置文件');

  const filesToDelete = [
    { path: path.join(__dirname, 'backend', '.env'), name: '后端环境变量 (.env)', type: '配置文件' },
    { path: path.join(__dirname, 'deploy', 'ecosystem.config.js'), name: 'PM2 配置 (ecosystem.config.js)', type: '配置文件' },
    { path: path.join(__dirname, 'deploy', 'nginx-idc.conf'), name: 'Nginx 配置 (nginx-idc.conf)', type: '配置文件' }
  ];

  for (const file of filesToDelete) {
    if (fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        log.success(`${file.name} 已删除`);
        deletedItems.push({ type: file.type, name: file.name });
      } catch (error) {
        log.error(`删除 ${file.name} 失败: ${error.message}`);
      }
    } else {
      log.info(`${file.name} 不存在，跳过`);
    }
  }

  const deployDir = path.join(__dirname, 'deploy');
  if (fs.existsSync(deployDir)) {
    try {
      const files = fs.readdirSync(deployDir);
      if (files.length === 0) {
        fs.rmdirSync(deployDir);
        log.success('deploy 目录已删除');
        deletedItems.push({ type: '目录', name: 'deploy/' });
      } else {
        log.info('deploy 目录不为空，保留');
      }
    } catch (error) {
      log.error(`删除 deploy 目录失败: ${error.message}`);
    }
  }

  log.divider();
}

// =============================================================================
// 数据库清理
// =============================================================================

async function cleanupDatabase(cmdArgs) {
  log.step('数据库清理');

  const dbConfig = getDatabaseConfig();
  const sqliteDbPath = dbConfig.sqliteDbPath;
  const sqliteExists = fs.existsSync(sqliteDbPath);

  // 获取数据库文件信息
  let dbSize = 0;
  let dbCreateTime = '';
  if (sqliteExists) {
    const stats = fs.statSync(sqliteDbPath);
    dbSize = (stats.size / 1024 / 1024).toFixed(2); // MB
    dbCreateTime = stats.birthtime.toLocaleString();
  }

  // 检测数据库类型（从 getDatabaseConfig 获取）
  const dbType = dbConfig.dbType;

  console.log(`\n${colors.bright}当前数据库配置：${colors.reset}`);
  console.log(`  数据库类型: ${colors.cyan}${dbType === 'sqlite' ? 'SQLite' : 'MySQL'}${colors.reset}`);

  if (dbType === 'sqlite') {
    // SQLite 数据库处理
    console.log(`\n${colors.bright}SQLite 数据库信息：${colors.reset}`);
    if (sqliteExists) {
      console.log(`  文件路径: ${colors.cyan}${sqliteDbPath}${colors.reset}`);
      console.log(`  文件大小: ${colors.cyan}${dbSize} MB${colors.reset}`);
      console.log(`  创建时间: ${colors.cyan}${dbCreateTime}${colors.reset}`);
      console.log(`\n${colors.yellow}⚠ 警告：删除数据库将永久丢失所有数据！${colors.reset}`);

      console.log(`\n${colors.bright}删除方法：${colors.reset}`);
      console.log(`  方法1 - 脚本自动删除：输入 Y 确认删除`);
      console.log(`  方法2 - 手动删除文件：直接删除 ${colors.cyan}${path.relative(__dirname, sqliteDbPath)}${colors.reset}`);
      console.log(`  方法3 - 命令行删除：`);
      if (process.platform === 'win32') {
        console.log(`    ${colors.cyan}del "${sqliteDbPath}"${colors.reset}`);
      } else {
        console.log(`    ${colors.cyan}rm "${sqliteDbPath}"${colors.reset}`);
      }

      const confirm = await ask('\n是否删除 SQLite 数据库文件? (y/N)', 'N');
      if (confirm.toLowerCase() === 'y') {
        // 先尝试备份（不管是否指定 --backup）
        if (!cmdArgs?.backup && !cmdArgs?.force) {
          const backupConfirm = await ask('是否先备份数据库再删除? (Y/n)', 'Y');
          if (backupConfirm.toLowerCase() === 'y') {
            await backupDatabase();
          }
        } else if (cmdArgs?.backup) {
          await backupDatabase();
        }
        try {
          log.info('正在删除数据库文件...');
          fs.unlinkSync(sqliteDbPath);
          log.success('SQLite 数据库已删除');
          deletedItems.push({ type: '数据库', name: `SQLite (${dbSize} MB)` });
        } catch (error) {
          log.error(`直接删除失败: ${error.message}`);
          if (error.message.includes('EBUSY') || error.message.includes('resource busy') || error.message.includes('used by another process')) {
            log.warning('数据库文件被占用，尝试强制删除...');
            try {
              const isWindows = process.platform === 'win32';
              let forceResult;
              if (isWindows) {
                forceResult = runCommand(`del /f /q "${sqliteDbPath}" 2>nul`, { silent: true });
                if (!forceResult.success) {
                  forceResult = runCommand(`powershell -Command "Remove-Item -Path '${sqliteDbPath}' -Force -ErrorAction SilentlyContinue" 2>nul`, { silent: true });
                }
              } else {
                forceResult = runCommand(`rm -f "${sqliteDbPath}"`, { silent: true });
              }
              if (forceResult.success && !fs.existsSync(sqliteDbPath)) {
                log.success('数据库文件已强制删除');
                deletedItems.push({ type: '数据库', name: `SQLite (${dbSize} MB)` });
              } else {
                log.error('强制删除失败，文件仍被占用');
                log.warning('请手动停止占用数据库文件的进程后再删除');
                console.log(`  手动删除命令：`);
                if (process.platform === 'win32') {
                  console.log(`  ${colors.cyan}del /f "${sqliteDbPath}"${colors.reset}`);
                } else {
                  console.log(`  ${colors.cyan}rm -f "${sqliteDbPath}"${colors.reset}`);
                }
              }
            } catch (forceError) {
              log.error(`强制删除失败: ${forceError.message}`);
            }
          }
        }
      } else {
        log.info('保留 SQLite 数据库文件');
        console.log(`  文件位置: ${colors.cyan}${path.relative(__dirname, sqliteDbPath)}${colors.reset}`);
      }
    } else {
      log.info('未检测到 SQLite 数据库文件');
    }
  } else {
    // MySQL 数据库提示
    console.log(`\n${colors.yellow}⚠ 注意：当前使用 MySQL 数据库${colors.reset}`);
    console.log(`  卸载脚本不会自动删除 MySQL 数据库，请手动清理：`);
    console.log(`\n${colors.bright}MySQL 删除方法：${colors.reset}`);
    console.log(`  方法1 - MySQL 命令行：`);
    console.log(`    ${colors.cyan}mysql -u root -p${colors.reset}`);
    console.log(`    ${colors.cyan}DROP DATABASE idc_management;${colors.reset}`);
    console.log(`  方法2 - 使用数据库管理工具（如 Navicat、DBeaver、phpMyAdmin）`);
    console.log(`  方法3 - 如果不再需要 MySQL 数据，可直接卸载 MySQL 服务`);
  }

  // 备份提示
  console.log(`\n${colors.bright}数据备份建议：${colors.reset}`);
  if (dbType === 'sqlite' && sqliteExists) {
    console.log(`  备份 SQLite：直接复制 ${colors.cyan}${path.relative(__dirname, sqliteDbPath)}${colors.reset} 文件`);
  }
  console.log(`  如需保留数据，请在卸载前手动备份`);

  log.divider();
}

// =============================================================================
// 依赖和构建产物清理
// =============================================================================

async function cleanupDependencies(cmdArgs) {
  log.step('依赖和构建产物清理');

  log.warning('此操作将删除 node_modules 和构建产物，需要重新安装依赖才能再次运行');
  const confirm = cmdArgs?.force ? 'y' : await ask('是否删除依赖和构建产物? (y/N)', 'N');

  if (confirm.toLowerCase() !== 'y') {
    log.info('跳过依赖清理');
    return;
  }

  const dirsToDelete = [
    { path: path.join(__dirname, 'backend', 'node_modules'), name: '后端 node_modules', type: '依赖' },
    { path: path.join(__dirname, 'frontend', 'node_modules'), name: '前端 node_modules', type: '依赖' },
    { path: path.join(__dirname, 'frontend', 'node_modules', '.vite'), name: '前端 Vite 缓存 (.vite)', type: '构建产物' },
    { path: path.join(__dirname, 'frontend', 'dist'), name: '前端构建产物 (dist)', type: '构建产物' },
    { path: path.join(__dirname, 'backend', 'temp'), name: '后端临时文件 (temp)', type: '临时文件' }
  ];

  for (const dir of dirsToDelete) {
    if (fs.existsSync(dir.path)) {
      try {
        fs.rmSync(dir.path, { recursive: true, force: true });
        log.success(`${dir.name} 已删除`);
        deletedItems.push({ type: dir.type, name: dir.name });
      } catch (error) {
        log.error(`删除 ${dir.name} 失败: ${error.message}`);
      }
    } else {
      log.info(`${dir.name} 不存在，跳过`);
    }
  }

  log.divider();
}

// =============================================================================
// 日志清理
// =============================================================================

async function cleanupLogs(cmdArgs) {
  log.step('日志文件清理');

  const logsDir = path.join(__dirname, 'backend', 'logs');
  if (fs.existsSync(logsDir)) {
    if (cmdArgs?.force) {
      log.info('强制模式：跳过日志文件删除');
      return;
    }
    const confirm = await ask('是否删除后端日志文件? (y/N)', 'N');
    if (confirm.toLowerCase() === 'y') {
      try {
        fs.rmSync(logsDir, { recursive: true, force: true });
        log.success('后端日志文件已删除');
      } catch (error) {
        log.error(`删除失败: ${error.message}`);
      }
    } else {
      log.info('保留后端日志文件');
    }
  } else {
    log.info('未找到后端日志目录');
  }

  // 清理脚本自身生成的卸载日志（根目录 logs/）
  const rootLogsDir = path.join(__dirname, 'logs');
  if (fs.existsSync(rootLogsDir)) {
    if (cmdArgs?.force) {
      log.info('强制模式：跳过脚本日志删除');
    } else {
      const rootLogConfirm = await ask('是否删除安装/卸载脚本日志? (y/N)', 'N');
      if (rootLogConfirm.toLowerCase() === 'y') {
        try {
          fs.rmSync(rootLogsDir, { recursive: true, force: true });
          log.success('脚本日志文件已删除');
        } catch (error) {
          log.error(`删除失败: ${error.message}`);
        }
      } else {
        log.info('保留脚本日志文件');
      }
    }
  }

  log.divider();
}

async function cleanupUploads(cmdArgs) {
  log.step('上传文件清理');

  const uploadsDir = path.join(__dirname, 'backend', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    if (cmdArgs?.force) {
      log.info('强制模式：跳过上传文件目录删除');
      return;
    }
    const confirm = await ask('是否删除上传文件目录? (y/N)', 'N');
    if (confirm.toLowerCase() === 'y') {
      try {
        fs.rmSync(uploadsDir, { recursive: true, force: true });
        log.success('上传文件目录已删除');
      } catch (error) {
        log.error(`删除失败: ${error.message}`);
      }
    } else {
      log.info('保留上传文件目录');
    }
  } else {
    log.info('未找到上传文件目录');
  }

  log.divider();
}

// =============================================================================
// 主函数
// =============================================================================

async function backupDatabase() {
  log.step('备份数据库');
  
  const dbConfig = getDatabaseConfig();
  const sqliteDbPath = dbConfig.sqliteDbPath;
  if (!fs.existsSync(sqliteDbPath)) {
    log.info('未找到 SQLite 数据库文件，跳过备份');
    return false;
  }
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const backupPath = path.join(BACKUP_DIR, `database_backup_${Date.now()}.db`);
  
  try {
    fs.copyFileSync(sqliteDbPath, backupPath);
    backedUpItems.push({ type: '数据库', path: backupPath });
    log.success(`数据库已备份: ${path.basename(backupPath)}`);
    return true;
  } catch (error) {
    log.error(`备份失败: ${error.message}`);
    return false;
  }
}

function showDryRunPreview(cmdArgs) {
  const { backendName, frontendName } = getPM2ServiceNames();
  const dbConfig = getDatabaseConfig();

  console.log(`
  ${colors.bright}${colors.cyan}以下是将要执行的操作（预览模式）：${colors.reset}\n`);

  // PM2 服务
  console.log(`  ${colors.bright}1. 停止并删除 PM2 服务${colors.reset}`);
  console.log(`     - ${backendName}`);
  console.log(`     - ${frontendName}`);
  console.log(`     - 清理 PM2 开机自启配置`);
  console.log(`     - 清理 PM2 相关日志文件`);

  // Nginx 配置
  console.log(`\n  ${colors.bright}2. 清理 Nginx 配置${colors.reset}`);
  if (process.platform === 'linux') {
    const paths = ['/etc/nginx/sites-available/idc', '/etc/nginx/sites-enabled/idc',
      '/etc/nginx/conf.d/idc', '/etc/nginx/conf.d/idc.conf'];
    paths.forEach(p => {
      if (fs.existsSync(p)) {
        console.log(`     - 删除: ${p}`);
      }
    });
  } else {
    console.log(`     - 提示手动清理（${process.platform === 'win32' ? 'Windows' : 'macOS'}）`);
  }

  // 配置文件
  console.log(`\n  ${colors.bright}3. 清理生成的配置文件${colors.reset}`);
  const configFiles = [
    { path: path.join(__dirname, 'backend', '.env'), name: '后端环境变量 (.env)' },
    { path: path.join(__dirname, 'deploy', 'ecosystem.config.js'), name: 'PM2 配置' },
    { path: path.join(__dirname, 'deploy', 'nginx-idc.conf'), name: 'Nginx 配置' }
  ];
  configFiles.forEach(f => {
    if (fs.existsSync(f.path)) {
      console.log(`     - 删除: ${f.name}`);
    }
  });

  // 数据库
  console.log(`\n  ${colors.bright}4. 数据库${colors.reset}`);
  if (dbConfig.dbType === 'sqlite' && fs.existsSync(dbConfig.sqliteDbPath)) {
    console.log(`     - 删除 SQLite 数据库: ${path.relative(__dirname, dbConfig.sqliteDbPath)}`);
    if (cmdArgs?.backup) {
      console.log(`     - 备份数据库到: backup/`);
    }
  } else if (dbConfig.dbType === 'mysql') {
    console.log(`     - 提示手动删除 MySQL 数据库`);
  } else {
    console.log(`     - 未检测到数据库文件`);
  }

  // 日志
  console.log(`\n  ${colors.bright}5. 日志文件${colors.reset}`);
  if (fs.existsSync(path.join(__dirname, 'backend', 'logs'))) {
    console.log(`     - 后端日志目录 (backend/logs/)`);
  }
  if (fs.existsSync(path.join(__dirname, 'logs'))) {
    console.log(`     - 脚本日志目录 (logs/)`);
  }

  // 上传文件
  console.log(`\n  ${colors.bright}6. 上传文件${colors.reset}`);
  if (fs.existsSync(path.join(__dirname, 'backend', 'uploads'))) {
    console.log(`     - 上传文件目录 (backend/uploads/)`);
  }

  // 依赖和构建产物
  console.log(`\n  ${colors.bright}7. 依赖和构建产物${colors.reset}`);
  const depDirs = [
    { path: path.join(__dirname, 'backend', 'node_modules'), name: '后端 node_modules' },
    { path: path.join(__dirname, 'frontend', 'node_modules'), name: '前端 node_modules' },
    { path: path.join(__dirname, 'frontend', 'node_modules', '.vite'), name: '前端 Vite 缓存' },
    { path: path.join(__dirname, 'frontend', 'dist'), name: '前端构建产物' },
    { path: path.join(__dirname, 'backend', 'temp'), name: '后端临时文件' }
  ];
  depDirs.forEach(d => {
    if (fs.existsSync(d.path)) {
      console.log(`     - 删除: ${d.name}`);
    }
  });

  console.log(`\n${colors.gray}${'─'.repeat(60)}${colors.reset}`);
  console.log(`  ${colors.yellow}提示: 移除 --dry-run 参数以实际执行卸载${colors.reset}`);
  log.divider();
}

function printSummary() {
  const duration = ((Date.now() - uninstallStartTime) / 1000).toFixed(1);
  
  console.log(`
${colors.bright}${colors.magenta}
╔══════════════════════════════════════════════════════════╗
║                    卸载摘要                               ║
╚══════════════════════════════════════════════════════════╝${colors.reset}`);

  console.log(`\n  ${colors.cyan}卸载耗时:${colors.reset} ${duration} 秒`);
  
  if (deletedItems.length > 0) {
    console.log(`\n  ${colors.cyan}已删除项目:${colors.reset}`);
    deletedItems.forEach(item => {
      console.log(`    - ${item.type}: ${item.name}`);
    });
  }
  
  if (backedUpItems.length > 0) {
    console.log(`\n  ${colors.cyan}已备份项目:${colors.reset}`);
    backedUpItems.forEach(item => {
      console.log(`    - ${item.type}: ${path.basename(item.path)}`);
    });
    console.log(`\n  ${colors.yellow}备份位置:${colors.reset} ${BACKUP_DIR}`);
  }
  
  console.log(`\n  ${colors.cyan}保留的文件:${colors.reset}`);
  console.log(`    - 项目源代码 (backend/, frontend/)`);
  console.log(`    - 上传的文件 (backend/uploads/)`);
  
  console.log(`\n  ${colors.cyan}重新部署:${colors.reset}`);
  console.log(`    node install.js`);
  
  log.divider();
  log.success('卸载完成！');
}

async function main() {
  uninstallStartTime = Date.now();
  const cmdArgs = parseArgs();
  
  if (cmdArgs.help) {
    showHelp();
    return;
  }
  
  initLogFile();

  console.log(`
${colors.bright}${colors.yellow}
╔══════════════════════════════════════════════════════════╗
║     IDC设备管理系统 - 卸载脚本 v${SCRIPT_VERSION}                  ║
║     Uninstallation Script                                 ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

  log.warning('此脚本将卸载 IDC设备管理系统');
  
  if (cmdArgs.force) {
    log.info('运行模式: 强制卸载（无需确认）');
  }
  
  if (cmdArgs.dryRun) {
    log.info('运行模式: 预览模式（不实际执行）');
  }
  
  log.divider();

  if (!cmdArgs.force && !cmdArgs.dryRun) {
    const confirm = await ask('确认要开始卸载? (y/N)', 'N');
    if (confirm.toLowerCase() !== 'y') {
      log.info('已取消卸载');
      rl.close();
      closeLogFile();
      return;
    }
  }

  if (cmdArgs.dryRun) {
    showDryRunPreview(cmdArgs);
    rl.close();
    closeLogFile();
    return;
  }

  try {
    if (cmdArgs.backup) {
      await backupDatabase();
    }
    
    await stopAndDeleteServices();
    await cleanupNginxConfig(cmdArgs);
    await cleanupConfigFiles();
    
    if (!cmdArgs.skipDb) {
      await cleanupDatabase(cmdArgs);
    } else {
      log.info('已跳过数据库删除');
    }
    
    await cleanupLogs(cmdArgs);
    
    if (!cmdArgs.skipUploads) {
      await cleanupUploads(cmdArgs);
    } else {
      log.info('已跳过上传文件目录删除');
    }
    
    if (!cmdArgs.skipDeps) {
      await cleanupDependencies(cmdArgs);
    } else {
      log.info('已跳过依赖删除');
    }

    printSummary();

  } catch (error) {
    log.error(`卸载失败: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
    closeLogFile();
  }
}

main();
