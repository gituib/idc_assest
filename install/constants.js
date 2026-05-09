const path = require('path');

const SCRIPT_VERSION = '2.0.0';
const MIN_NODE_VERSION = 16;
const LOG_DIR = path.join(__dirname, '..', 'logs');

const INSTALL_STEPS = [
  '环境检测',
  '数据库配置',
  '服务配置',
  '生成配置文件',
  '安装依赖',
  '数据库初始化',
  '构建前端',
  '启动服务',
  '配置 Nginx',
  '健康检查',
];

const NPM_MIRRORS = [
  { name: 'npm 官方', registry: 'https://registry.npmjs.org' },
  { name: '淘宝镜像', registry: 'https://registry.npmmirror.com' },
  { name: '腾讯镜像', registry: 'https://mirrors.tencent.com/npm' },
];

const SAVED_CONFIG_PATH = path.join(__dirname, '..', 'deploy', 'install-config.json');

module.exports = {
  SCRIPT_VERSION,
  MIN_NODE_VERSION,
  LOG_DIR,
  INSTALL_STEPS,
  NPM_MIRRORS,
  SAVED_CONFIG_PATH,
};
