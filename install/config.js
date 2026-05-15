const fs = require('fs');
const path = require('path');
const { SAVED_CONFIG_PATH, SCRIPT_VERSION } = require('./constants');
const { colors, log } = require('./logger');

const config = {
  dbType: 'sqlite',
  dbConfig: {},
  backendPort: 8000,
  nodeEnv: 'production',
  frontendDeploy: 'nginx',
  frontendPort: 80,
  domain: 'localhost'
};

function saveConfig() {
  const deployDir = path.dirname(SAVED_CONFIG_PATH);
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  const savedConfig = {
    dbType: config.dbType,
    dbConfig: {
      host: config.dbConfig.host,
      port: config.dbConfig.port,
      username: config.dbConfig.username,
      database: config.dbConfig.database,
    },
    backendPort: config.backendPort,
    nodeEnv: config.nodeEnv,
    frontendDeploy: config.frontendDeploy,
    frontendPort: config.frontendPort,
    domain: config.domain,
    nginxRoot: config.nginxRoot || null,
    savedAt: new Date().toISOString(),
  };

  fs.writeFileSync(SAVED_CONFIG_PATH, JSON.stringify(savedConfig, null, 2));
  log.subStep('配置已保存到 deploy/install-config.json');
}

function loadSavedConfig() {
  try {
    if (!fs.existsSync(SAVED_CONFIG_PATH)) {
      return null;
    }
    const content = fs.readFileSync(SAVED_CONFIG_PATH, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function applySavedConfig(saved) {
  if (!saved) return;

  if (saved.dbType) config.dbType = saved.dbType;
  if (saved.dbConfig) {
    config.dbConfig = { ...config.dbConfig, ...saved.dbConfig };
  }
  if (saved.backendPort) config.backendPort = saved.backendPort;
  if (saved.nodeEnv) config.nodeEnv = saved.nodeEnv;
  if (saved.frontendDeploy) config.frontendDeploy = saved.frontendDeploy;
  if (saved.frontendPort) config.frontendPort = saved.frontendPort;
  if (saved.domain) config.domain = saved.domain;
  if (saved.nginxRoot) config.nginxRoot = saved.nginxRoot;
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    nonInteractive: args.includes('--non-interactive') || args.includes('-y'),
    skipNginx: args.includes('--skip-nginx'),
    skipBuild: args.includes('--skip-build'),
    dbType: args.find(a => a.startsWith('--db='))?.split('=')[1],
    backendPort: args.find(a => a.startsWith('--port='))?.split('=')[1],
    help: args.includes('--help') || args.includes('-h')
  };
}

function showHelp() {
  console.log(`
${colors.bright}IDC设备管理系统 - 安装部署脚本 v${SCRIPT_VERSION}${colors.reset}

用法: node install.js [选项]

选项:
  -y, --non-interactive  非交互式安装（使用默认配置）
  --skip-nginx           跳过 Nginx 配置
  --skip-build           跳过前端构建
  --db=<type>            数据库类型 (sqlite/mysql)
  --port=<port>          后端端口
  -h, --help             显示帮助信息

示例:
  node install.js                        # 交互式安装
  node install.js -y                     # 使用默认配置快速安装
  node install.js -y --db=mysql          # 使用 MySQL 数据库
  node install.js -y --port=3000         # 指定后端端口
`);
  process.exit(0);
}

module.exports = {
  config,
  saveConfig,
  loadSavedConfig,
  applySavedConfig,
  parseArgs,
  showHelp,
};
