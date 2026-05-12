#!/usr/bin/env node

/**
 * IDC设备管理系统 - 卸载脚本 v2.0.0
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

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { colors, ICONS, log, padCenter, initLogFile, closeLogFile } = require('./install/logger');
const { ask, closeReadline } = require('./install/ui');
const { SCRIPT_VERSION } = require('./install/constants');

const BACKUP_DIR = path.join(__dirname, 'backup');
const LOG_DIR = path.join(__dirname, 'logs');

const UNINSTALL_STEPS = [
  '停止服务',
  '清理 Nginx',
  '清理配置',
  '数据库清理',
  '日志清理',
  '上传清理',
  '依赖清理',
];

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

  ${colors.bright}用法:${colors.reset} node uninstall.js [选项]

  ${colors.bright}选项:${colors.reset}
    ${ICONS.pointer} ${colors.cyan}-f, --force${colors.reset}      强制卸载（无需确认）
    ${ICONS.pointer} ${colors.cyan}-y, --yes${colors.reset}        强制卸载别名（同 --force）
    ${ICONS.pointer} ${colors.cyan}-b, --backup${colors.reset}     卸载前自动备份数据库
    ${colors.dim}--dry-run${colors.reset}        预览模式：仅显示将要删除的内容
    ${colors.dim}--skip-db${colors.reset}        跳过数据库删除
    ${colors.dim}--skip-deps${colors.reset}      跳过依赖删除
    ${colors.dim}--skip-uploads${colors.reset}   跳过上传文件目录删除
    ${colors.dim}-h, --help${colors.reset}       显示帮助信息

  ${colors.bright}示例:${colors.reset}
    ${colors.cyan}node uninstall.js${colors.reset}             # 交互式卸载
    ${colors.cyan}node uninstall.js --force${colors.reset}     # 强制卸载
    ${colors.cyan}node uninstall.js --backup${colors.reset}   # 卸载前备份
    ${colors.cyan}node uninstall.js --dry-run${colors.reset}  # 预览将删除的内容
`);
  process.exit(0);
}

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

function isRootUser() {
  return process.getuid && process.getuid() === 0;
}

async function stopAndDeleteServices() {
  log.step('停止服务');

  if (!commandExists('pm2')) {
    log.warning('未检测到 PM2，跳过服务停止步骤');
    return;
  }

  const { backendName, frontendName } = getPM2ServiceNames();
  const isWindows = process.platform === 'win32';
  const nullRedirect = isWindows ? '2>nul' : '2>/dev/null';
  const orTrue = isWindows ? '|| exit 0' : '|| true';

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

async function cleanupNginxConfig(cmdArgs) {
  log.step('清理 Nginx');

  const isWindows = process.platform === 'win32';
  const isLinux = process.platform === 'linux';
  const isMac = process.platform === 'darwin';

  function nginxInstalled() {
    return commandExists('nginx');
  }

  function nginxRunning() {
    if (isWindows) {
      const result = runCommand('tasklist /FI "IMAGENAME eq nginx.exe" 2>nul', { silent: true });
      return result.success && result.output.includes('nginx.exe');
    }
    const result = runCommand('pgrep -x nginx 2>/dev/null', { silent: true });
    return result.success && result.output.trim().length > 0;
  }

  function stopNginx() {
    if (isLinux) {
      const root = isRootUser();
      const sudoPrefix = root ? '' : 'sudo ';

      if (commandExists('systemctl')) {
        const result = runCommand(`${sudoPrefix}systemctl stop nginx`, { silent: true });
        if (result.success) {
          log.success('Nginx 服务已停止 (systemctl)');
          return true;
        }
      }
      const result = runCommand(`${sudoPrefix}nginx -s stop`, { silent: true });
      if (result.success) {
        log.success('Nginx 服务已停止');
        return true;
      }
      log.warning('Nginx 停止失败，可能需要手动处理');
      return false;
    }

    if (isWindows) {
      if (!nginxRunning()) {
        log.info('Nginx 未在运行');
        return true;
      }
      const result = runCommand('nginx -s stop', { silent: true });
      if (result.success) {
        log.success('Nginx 已停止');
        return true;
      }
      log.warning('Nginx 停止失败，请手动执行: nginx -s stop');
      return false;
    }

    return false;
  }

  function disableNginxStartup() {
    if (!isLinux || !commandExists('systemctl')) return;

    const root = isRootUser();
    const sudoPrefix = root ? '' : 'sudo ';
    const result = runCommand(`${sudoPrefix}systemctl disable nginx`, { silent: true });
    if (result.success) {
      log.success('Nginx 开机自启已禁用');
    }
  }

  function cleanupFrontendDeployDir() {
    if (!isLinux) return;

    const webRoot = '/var/www/idc';
    if (!fs.existsSync(webRoot)) return;

    log.info('清理前端部署目录...');
    const root = isRootUser();
    const sudoPrefix = root ? '' : 'sudo ';
    const result = runCommand(`${sudoPrefix}rm -rf "${webRoot}"`, { silent: true });
    if (result.success) {
      log.success('前端部署目录已删除 (/var/www/idc)');
      deletedItems.push({ type: '目录', name: '/var/www/idc' });
    } else {
      log.warning('前端部署目录删除失败，请手动清理');
    }
  }

  if (isWindows) {
    log.info('Windows Nginx 清理：');

    if (nginxInstalled() && nginxRunning()) {
      log.info('检测到 Nginx 正在运行');
      if (!cmdArgs?.force) {
        const stopConfirm = await ask('是否停止 Nginx 服务? (Y/n)', 'Y');
        if (stopConfirm.toLowerCase() === 'y') {
          stopNginx();
        }
      } else {
        stopNginx();
      }
    }

    console.log(`  ${ICONS.pipe}  请手动完成以下操作：`);
    console.log(`  ${ICONS.pipe}  删除配置文件: ${colors.cyan}C:/nginx/conf/conf.d/idc.conf${colors.reset}`);
    console.log(`  ${ICONS.pipe}  编辑主配置: 从 ${colors.cyan}C:/nginx/conf/nginx.conf${colors.reset} 中移除 include 语句`);
    console.log(`  ${ICONS.pipe}  停止 Nginx: ${colors.cyan}nginx -s stop${colors.reset}`);

    log.info('检测 Nginx 安装方式...');
    const chocoCheck = runCommand('choco list nginx --local-only 2>nul', { silent: true });
    if (chocoCheck.success && chocoCheck.output.includes('nginx')) {
      console.log(`  ${ICONS.pipe}  检测到 Chocolatey 安装的 Nginx，卸载命令：`);
      console.log(`  ${ICONS.pipe}    ${colors.cyan}choco uninstall nginx${colors.reset}`);
    } else {
      const scoopCheck = runCommand('scoop list nginx 2>nul', { silent: true });
      if (scoopCheck.success && scoopCheck.output.includes('nginx')) {
        console.log(`  ${ICONS.pipe}  检测到 Scoop 安装的 Nginx，卸载命令：`);
        console.log(`  ${ICONS.pipe}    ${colors.cyan}scoop uninstall nginx${colors.reset}`);
      } else if (fs.existsSync('C:/nginx')) {
        console.log(`  ${ICONS.pipe}  检测到 Nginx 安装在 ${colors.cyan}C:/nginx${colors.reset}`);
        console.log(`  ${ICONS.pipe}  如需完整卸载，请手动删除该目录`);
      }
    }

    if (!cmdArgs?.force) {
      const confirm = await ask('是否已完成以上清理操作? (Y/n)', 'Y');
      if (confirm.toLowerCase() !== 'y') {
        log.warning('请记得手动清理 Nginx 配置');
      }
    } else {
      log.info('强制模式：跳过 Nginx 清理确认');
    }
  } else if (isLinux) {
    const root = isRootUser();
    const sudoPrefix = root ? '' : 'sudo ';

    if (nginxInstalled()) {
      log.info('停止 Nginx 服务...');
      if (nginxRunning()) {
        stopNginx();
      } else {
        log.info('Nginx 未在运行');
      }
    }

    disableNginxStartup();
    cleanupFrontendDeployDir();

    const sitesAvailablePath = '/etc/nginx/sites-available/idc';
    const sitesEnabledPath = '/etc/nginx/sites-enabled/idc';
    const confDPath = '/etc/nginx/conf.d/idc';
    const confDWithExtPath = '/etc/nginx/conf.d/idc.conf';

    let configExists = false;

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
    } else if (nginxInstalled()) {
      log.info('测试 Nginx 配置...');
      const testResult = runCommand(`${sudoPrefix}nginx -t`, { silent: true });
      if (testResult.success) {
        log.success('Nginx 配置测试通过（已无残留配置）');
      } else {
        log.success('Nginx 配置已清理完成');
      }
    }
  } else if (isMac) {
    log.info('macOS Nginx 清理：');

    if (nginxInstalled() && nginxRunning()) {
      log.info('检测到 Nginx 正在运行');
      if (!cmdArgs?.force) {
        const stopConfirm = await ask('是否停止 Nginx 服务? (Y/n)', 'Y');
        if (stopConfirm.toLowerCase() === 'y') {
          if (commandExists('brew')) {
            const brewResult = runCommand('brew services stop nginx', { silent: true });
            if (brewResult.success) {
              log.success('Nginx 已停止 (brew)');
            } else {
              runCommand('nginx -s stop', { silent: true });
            }
          } else {
            runCommand('nginx -s stop', { silent: true });
          }
        }
      } else {
        if (commandExists('brew')) {
          runCommand('brew services stop nginx', { silent: true });
        } else {
          runCommand('nginx -s stop', { silent: true });
        }
      }
    }

    console.log(`  ${ICONS.pipe}  请手动完成以下操作：`);
    console.log(`  ${ICONS.pipe}  配置文件可能位于: ${colors.cyan}/usr/local/etc/nginx/servers/${colors.reset}`);
    console.log(`  ${ICONS.pipe}  或使用: ${colors.cyan}brew services stop nginx${colors.reset}`);

    if (commandExists('brew')) {
      console.log(`  ${ICONS.pipe}  如需卸载 Nginx：${colors.cyan}brew uninstall nginx${colors.reset}`);
    }

    if (!cmdArgs?.force) {
      const confirm = await ask('是否已完成以上清理操作? (Y/n)', 'Y');
      if (confirm.toLowerCase() !== 'y') {
        log.warning('请记得手动清理 Nginx 配置');
      }
    } else {
      log.info('强制模式：跳过 Nginx 清理确认');
    }
  }

  log.divider();
}

async function cleanupConfigFiles() {
  log.step('清理配置');

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

async function cleanupDatabase(cmdArgs) {
  log.step('数据库清理');

  const dbConfig = getDatabaseConfig();
  const sqliteDbPath = dbConfig.sqliteDbPath;
  const sqliteExists = fs.existsSync(sqliteDbPath);

  let dbSize = 0;
  let dbCreateTime = '';
  if (sqliteExists) {
    const stats = fs.statSync(sqliteDbPath);
    dbSize = (stats.size / 1024 / 1024).toFixed(2);
    dbCreateTime = stats.birthtime.toLocaleString();
  }

  const dbType = dbConfig.dbType;

  log.section('当前数据库配置');
  log.keyValue('数据库类型', dbType === 'sqlite' ? 'SQLite' : 'MySQL');

  if (dbType === 'sqlite') {
    if (sqliteExists) {
      log.keyValue('文件路径', sqliteDbPath);
      log.keyValue('文件大小', `${dbSize} MB`);
      log.keyValue('创建时间', dbCreateTime);

      log.divider();
      log.warning('删除数据库将永久丢失所有数据！');
      log.divider();

      const confirm = await ask('是否删除 SQLite 数据库文件? (y/N)', 'N');
      if (confirm.toLowerCase() === 'y') {
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
                console.log(`  ${ICONS.pipe}  手动删除命令：`);
                if (process.platform === 'win32') {
                  console.log(`  ${ICONS.pipe}    ${colors.cyan}del /f "${sqliteDbPath}"${colors.reset}`);
                } else {
                  console.log(`  ${ICONS.pipe}    ${colors.cyan}rm -f "${sqliteDbPath}"${colors.reset}`);
                }
              }
            } catch (forceError) {
              log.error(`强制删除失败: ${forceError.message}`);
            }
          }
        }
      } else {
        log.info('保留 SQLite 数据库文件');
        log.keyValue('文件位置', path.relative(__dirname, sqliteDbPath));
      }
    } else {
      log.info('未检测到 SQLite 数据库文件');
    }
  } else {
    log.divider();
    log.warning('当前使用 MySQL 数据库');
    log.info('卸载脚本不会自动删除 MySQL 数据库，请手动清理：');

    log.section('MySQL 删除方法');
    console.log(`  ${ICONS.pipe}  方法1 - MySQL 命令行：`);
    console.log(`  ${ICONS.pipe}    ${colors.cyan}mysql -u root -p${colors.reset}`);
    console.log(`  ${ICONS.pipe}    ${colors.cyan}DROP DATABASE idc_management;${colors.reset}`);
    console.log(`  ${ICONS.pipe}  方法2 - 使用数据库管理工具（如 Navicat、DBeaver、phpMyAdmin）`);
    console.log(`  ${ICONS.pipe}  方法3 - 如果不再需要 MySQL 数据，可直接卸载 MySQL 服务`);
  }

  log.divider();
  log.section('数据备份建议');
  if (dbType === 'sqlite' && sqliteExists) {
    console.log(`  ${ICONS.pipe}  备份 SQLite：直接复制 ${colors.cyan}${path.relative(__dirname, sqliteDbPath)}${colors.reset} 文件`);
  }
  console.log(`  ${ICONS.pipe}  如需保留数据，请在卸载前手动备份`);

  log.divider();
}

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

async function cleanupLogs(cmdArgs) {
  log.step('日志清理');

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
  log.step('上传清理');

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

  log.banner('卸载预览', 'Dry Run Mode', null);

  console.log(`  ${colors.bright}${colors.cyan}以下是将要执行的操作（预览模式）：${colors.reset}\n`);

  console.log(`  ${ICONS.pointer} ${colors.bright}1. 停止并删除 PM2 服务${colors.reset}`);
  console.log(`  ${ICONS.pipe}    ${backendName}`);
  console.log(`  ${ICONS.pipe}    ${frontendName}`);
  console.log(`  ${ICONS.pipe}    清理 PM2 开机自启配置`);
  console.log(`  ${ICONS.pipe}    清理 PM2 相关日志文件`);

  console.log(`\n  ${ICONS.pointer} ${colors.bright}2. 清理 Nginx 配置${colors.reset}`);

  if (process.platform === 'linux') {
    console.log(`  ${ICONS.pipe}    禁用 Nginx 开机自启 (systemctl disable nginx)`);
    if (fs.existsSync('/var/www/idc')) {
      console.log(`  ${ICONS.pipe}    删除前端部署目录 (/var/www/idc)`);
    }
    const nginxConfigPaths = ['/etc/nginx/sites-available/idc', '/etc/nginx/sites-enabled/idc',
      '/etc/nginx/conf.d/idc', '/etc/nginx/conf.d/idc.conf'];
    nginxConfigPaths.forEach(p => {
      if (fs.existsSync(p)) {
        console.log(`  ${ICONS.pipe}    删除 Nginx 配置: ${p}`);
      }
    });
  } else if (process.platform === 'win32') {
    console.log(`  ${ICONS.pipe}    删除 Nginx 配置文件 (C:/nginx/conf/conf.d/idc.conf)`);
    console.log(`  ${ICONS.pipe}    提供 Chocolatey/Scoop 卸载指引`);
  } else if (process.platform === 'darwin') {
    if (commandExists('brew')) {
      console.log(`  ${ICONS.pipe}    停止 Nginx (brew services)`);
    }
    console.log(`  ${ICONS.pipe}    删除 Nginx 配置 (/usr/local/etc/nginx/servers/)`);
  }

  console.log(`\n  ${ICONS.pointer} ${colors.bright}3. 清理生成的配置文件${colors.reset}`);
  const configFiles = [
    { path: path.join(__dirname, 'backend', '.env'), name: '后端环境变量 (.env)' },
    { path: path.join(__dirname, 'deploy', 'ecosystem.config.js'), name: 'PM2 配置' },
    { path: path.join(__dirname, 'deploy', 'nginx-idc.conf'), name: 'Nginx 配置' }
  ];
  configFiles.forEach(f => {
    if (fs.existsSync(f.path)) {
      console.log(`  ${ICONS.pipe}    删除: ${f.name}`);
    }
  });

  console.log(`\n  ${ICONS.pointer} ${colors.bright}4. 数据库${colors.reset}`);
  if (cmdArgs?.skipDb) {
    console.log(`  ${ICONS.pipe}    ${colors.dim}[跳过] 数据库清理${colors.reset}`);
  } else if (dbConfig.dbType === 'sqlite' && fs.existsSync(dbConfig.sqliteDbPath)) {
    console.log(`  ${ICONS.pipe}    删除 SQLite 数据库: ${path.relative(__dirname, dbConfig.sqliteDbPath)}`);
    if (cmdArgs?.backup) {
      console.log(`  ${ICONS.pipe}    备份数据库到: backup/`);
    }
  } else if (dbConfig.dbType === 'mysql') {
    console.log(`  ${ICONS.pipe}    提示手动删除 MySQL 数据库`);
  } else {
    console.log(`  ${ICONS.pipe}    未检测到数据库文件`);
  }

  console.log(`\n  ${ICONS.pointer} ${colors.bright}5. 日志文件${colors.reset}`);
  if (fs.existsSync(path.join(__dirname, 'backend', 'logs'))) {
    console.log(`  ${ICONS.pipe}    后端日志目录 (backend/logs/)`);
  }
  if (fs.existsSync(path.join(__dirname, 'logs'))) {
    console.log(`  ${ICONS.pipe}    脚本日志目录 (logs/)`);
  }

  console.log(`\n  ${ICONS.pointer} ${colors.bright}6. 上传文件${colors.reset}`);
  if (cmdArgs?.skipUploads) {
    console.log(`  ${ICONS.pipe}    ${colors.dim}[跳过] 上传文件目录${colors.reset}`);
  } else if (fs.existsSync(path.join(__dirname, 'backend', 'uploads'))) {
    console.log(`  ${ICONS.pipe}    上传文件目录 (backend/uploads/)`);
  } else {
    console.log(`  ${ICONS.pipe}    ${colors.dim}未检测到上传文件目录${colors.reset}`);
  }

  console.log(`\n  ${ICONS.pointer} ${colors.bright}7. 依赖和构建产物${colors.reset}`);
  if (cmdArgs?.skipDeps) {
    console.log(`  ${ICONS.pipe}    ${colors.dim}[跳过] 依赖和构建产物清理${colors.reset}`);
  } else {
    const depDirs = [
      { path: path.join(__dirname, 'backend', 'node_modules'), name: '后端 node_modules' },
      { path: path.join(__dirname, 'frontend', 'node_modules'), name: '前端 node_modules' },
      { path: path.join(__dirname, 'frontend', 'node_modules', '.vite'), name: '前端 Vite 缓存' },
      { path: path.join(__dirname, 'frontend', 'dist'), name: '前端构建产物' },
      { path: path.join(__dirname, 'backend', 'temp'), name: '后端临时文件' }
    ];
    depDirs.forEach(d => {
      if (fs.existsSync(d.path)) {
        console.log(`  ${ICONS.pipe}    删除: ${d.name}`);
      }
    });
  }

  log.divider();
  log.warning('移除 --dry-run 参数以实际执行卸载');
  log.divider();
}

function printSummary() {
  const duration = ((Date.now() - uninstallStartTime) / 1000).toFixed(1);

  log.banner('卸载完成', 'Uninstallation Complete', null);

  log.keyValue('卸载耗时', `${duration} 秒`);

  if (deletedItems.length > 0) {
    log.section('已删除项目');
    deletedItems.forEach(item => {
      console.log(`  ${ICONS.pipe}    ${colors.dim}${item.type}:${colors.reset} ${item.name}`);
    });
  }

  if (backedUpItems.length > 0) {
    log.section('已备份项目');
    backedUpItems.forEach(item => {
      console.log(`  ${ICONS.pipe}    ${colors.dim}${item.type}:${colors.reset} ${path.basename(item.path)}`);
    });
    log.keyValue('备份位置', BACKUP_DIR);
  }

  log.section('保留的文件');
  const backendExists = fs.existsSync(path.join(__dirname, 'backend'));
  const frontendExists = fs.existsSync(path.join(__dirname, 'frontend'));
  const uploadsExist = fs.existsSync(path.join(__dirname, 'backend', 'uploads'));

  if (backendExists || frontendExists) {
    console.log(`  ${ICONS.pipe}    项目源代码 (backend/, frontend/)`);
  }
  if (uploadsExist) {
    console.log(`  ${ICONS.pipe}    上传的文件 (backend/uploads/)`);
  }
  if (!backendExists && !frontendExists && !uploadsExist) {
    console.log(`  ${ICONS.pipe}    无`);
  }

  log.section('重新部署');
  console.log(`  ${ICONS.pipe}    ${colors.cyan}node install.js${colors.reset}`);

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

  initLogFile(LOG_DIR);

  log.banner(
    'IDC 设备管理系统',
    '卸载脚本',
    SCRIPT_VERSION
  );

  log.warning('此脚本将卸载 IDC 设备管理系统');

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
      closeReadline();
      closeLogFile();
      return;
    }
  }

  if (cmdArgs.dryRun) {
    showDryRunPreview(cmdArgs);
    closeReadline();
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
    closeReadline();
    closeLogFile();
  }
}

main();
