const { SCRIPT_VERSION, LOG_DIR } = require('./constants');
const { colors, ICONS, log, padCenter, initLogFile, closeLogFile } = require('./logger');
const { ask, closeReadline } = require('./ui');
const { config, saveConfig, loadSavedConfig, applySavedConfig, parseArgs, showHelp } = require('./config');
const { checkEnvironment } = require('./env-check');
const { configureDatabase } = require('./database');
const { configureServices, autoConfigureNginx } = require('./nginx');
const { generateBackendEnv, generatePM2Config, generateNginxConfig, confirmConfiguration } = require('./generator');
const { installDependencies, initDatabase, buildFrontend, startServices } = require('./installer');
const { healthCheck } = require('./health');
const { rollback } = require('./rollback');

let installStartTime = Date.now();

function printSummary() {
  const duration = ((Date.now() - installStartTime) / 1000).toFixed(1);

  log.banner(
    '安装部署完成',
    'Installation Complete',
    null
  );

  console.log(`  ${ICONS.pipe}  ${colors.dim}安装耗时${colors.reset}    ${colors.cyan}${duration} 秒${colors.reset}`);
  console.log(`  ${ICONS.pipe}  ${colors.dim}数据库类型${colors.reset}    ${colors.cyan}${config.dbType}${colors.reset}`);
  console.log(`  ${ICONS.pipe}  ${colors.dim}后端端口${colors.reset}      ${colors.cyan}${config.backendPort}${colors.reset}`);
  console.log(`  ${ICONS.pipe}  ${colors.dim}前端部署${colors.reset}      ${colors.cyan}${config.frontendDeploy}${colors.reset}`);
  if (config.frontendDeploy === 'nginx') {
    console.log(`  ${ICONS.pipe}  ${colors.dim}前端端口${colors.reset}      ${colors.cyan}${config.frontendPort}${colors.reset}`);
    console.log(`  ${ICONS.pipe}  ${colors.dim}域名${colors.reset}          ${colors.cyan}${config.domain}${colors.reset}`);
  }

  log.divider();

  log.section('服务管理命令');
  console.log(`  ${ICONS.pipe}  ${colors.cyan}pm2 status${colors.reset}                查看服务状态`);
  console.log(`  ${ICONS.pipe}  ${colors.cyan}pm2 logs idc-backend${colors.reset}        查看后端日志`);
  console.log(`  ${ICONS.pipe}  ${colors.cyan}pm2 restart idc-backend${colors.reset}     重启后端`);
  console.log(`  ${ICONS.pipe}  ${colors.cyan}pm2 stop idc-backend${colors.reset}        停止后端`);

  log.divider();

  log.section('访问地址');
  console.log(`  ${ICONS.pipe}  ${colors.dim}后端 API${colors.reset}    ${colors.cyan}http://localhost:${config.backendPort}/api${colors.reset}`);
  if (config.frontendDeploy === 'nginx') {
    console.log(`  ${ICONS.pipe}  ${colors.dim}前端页面${colors.reset}    ${colors.cyan}http://${config.domain}:${config.frontendPort}${colors.reset}`);
  } else {
    console.log(`  ${ICONS.pipe}  ${colors.dim}前端页面${colors.reset}    ${colors.cyan}http://localhost:${config.frontendPort}${colors.reset}`);
  }

  log.divider();

  log.section('更新升级');
  console.log(`  ${ICONS.pipe}  ${colors.cyan}node update.js${colors.reset}              一键更新`);

  log.divider();
  log.success('安装部署完成！');
}

async function main() {
  installStartTime = Date.now();
  const cmdArgs = parseArgs();

  if (cmdArgs.help) {
    showHelp();
    return;
  }

  initLogFile(LOG_DIR);

  log.banner(
    'IDC 设备管理系统',
    '安装部署脚本',
    SCRIPT_VERSION
  );

  if (cmdArgs.nonInteractive) {
    log.info('运行模式: 非交互式（使用默认配置）');
  }

  let useSavedConfig = false;

  const savedConfig = loadSavedConfig();
  if (savedConfig) {
    log.info(`检测到上次安装配置 (${savedConfig.savedAt || '未知时间'})`);
    if (!cmdArgs.nonInteractive) {
      const useSaved = await ask('是否使用上次配置? (Y/n)', 'Y');
      if (useSaved.toLowerCase() === 'y') {
        applySavedConfig(savedConfig);
        log.success('已加载上次配置');
        useSavedConfig = true;
      }
    } else {
      applySavedConfig(savedConfig);
      log.success('已加载上次配置');
      useSavedConfig = true;
    }
  }

  try {
    await checkEnvironment();

    if (useSavedConfig) {
      log.step('数据库配置');
      log.keyValue('数据库类型', config.dbType);
      if (config.dbType === 'mysql') {
        log.keyValue('MySQL 地址', `${config.dbConfig.host}:${config.dbConfig.port}/${config.dbConfig.database}`);
      }
      log.divider();

      log.step('服务配置');
      log.keyValue('后端端口', String(config.backendPort));
      log.keyValue('运行环境', config.nodeEnv);
      log.keyValue('前端部署', config.frontendDeploy);
      log.keyValue('前端端口', String(config.frontendPort));
      if (config.frontendDeploy === 'nginx') {
        log.keyValue('域名', config.domain);
      }
      log.divider();
    } else {
      await configureDatabase(cmdArgs);
      await configureServices(cmdArgs);
    }

    if (!cmdArgs.nonInteractive) {
      await confirmConfiguration();
    }

    saveConfig();

    generateBackendEnv();
    generatePM2Config();
    generateNginxConfig();
    log.step('生成配置文件');
    log.success('所有配置文件已生成');

    await installDependencies();
    await initDatabase();

    if (!cmdArgs.skipBuild) {
      await buildFrontend();
    } else {
      log.info('已跳过前端构建');
    }

    await startServices();

    if (process.platform !== 'win32' && config.frontendDeploy === 'nginx') {
      await autoConfigureNginx();
    }

    await healthCheck();
    printSummary();

  } catch (error) {
    log.error(`部署失败: ${error.message}`);
    console.error(error);
    await rollback();
    process.exit(1);
  } finally {
    closeReadline();
    closeLogFile();
  }
}

main();
