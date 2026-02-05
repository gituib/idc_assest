#!/usr/bin/env node

/**
 * ============================================================================
 * IDC设备管理系统 - 交互式安装部署脚本
 * ============================================================================
 * 
 * 功能说明：
 *   - 交互式配置数据库（SQLite/MySQL）
 *   - 交互式选择前端部署方式（Nginx/PM2 serve）
 *   - 自动检测并可选安装 Nginx（Windows）
 *   - 自动安装项目依赖
 *   - 自动初始化数据库
 *   - 自动构建前端项目
 *   - 使用 PM2 启动和管理后端服务
 * 
 * 使用方法：
 *   node install.js
 *   或
 *   npm run deploy
 * 
 * 系统要求：
 *   - Node.js >= 14.0.0
 *   - npm >= 6.0.0
 *   - Windows/Linux/macOS
 * 
 * 作者：自动生成
 * 日期：2026-02-05
 * ============================================================================
 */

// Node.js 内置模块引入
const readline = require('readline');      // 读取命令行输入
const { execSync } = require('child_process'); // 执行系统命令
const fs = require('fs');                  // 文件系统操作
const path = require('path');              // 路径处理

// =============================================================================
// 工具函数：颜色输出和日志
// =============================================================================

/**
 * ANSI 颜色代码配置
 * 用于在终端输出彩色文字，提升可读性
 */
const colors = {
  reset: '\x1b[0m',       // 重置颜色
  bright: '\x1b[1m',      // 高亮
  green: '\x1b[32m',      // 绿色（成功）
  yellow: '\x1b[33m',     // 黄色（警告）
  red: '\x1b[31m',        // 红色（错误）
  cyan: '\x1b[36m',       // 青色（信息）
  gray: '\x1b[90m'        // 灰色（分隔线）
};

/**
 * 日志输出工具对象
 * 提供统一格式的日志输出方法
 */
const log = {
  /** 信息日志 - 青色 */
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  
  /** 成功日志 - 绿色带勾选 */
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  
  /** 警告日志 - 黄色带警告符号 */
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  
  /** 错误日志 - 红色带叉号 */
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  
  /** 步骤日志 - 高亮青色带箭头 */
  step: (msg) => console.log(`\n${colors.bright}${colors.cyan}▶ ${msg}${colors.reset}`),
  
  /** 分隔线 - 灰色横线 */
  divider: () => console.log(`${colors.gray}${'─'.repeat(60)}${colors.reset}`)
};

// =============================================================================
// 配置存储对象
// =============================================================================

/**
 * 部署配置对象
 * 存储用户交互过程中设置的所有配置参数
 * 
 * @property {string} dbType - 数据库类型：'sqlite' 或 'mysql'
 * @property {Object} dbConfig - MySQL 配置参数（当 dbType='mysql' 时使用）
 * @property {number} backendPort - 后端服务监听端口
 * @property {string} frontendDeploy - 前端部署方式：'nginx' 或 'pm2'
 * @property {number} frontendPort - 前端服务监听端口
 * @property {string} domain - 域名配置（Nginx 使用）
 */
/**
 * 部署配置对象
 * 存储用户交互过程中设置的所有配置参数
 *
 * @property {string} dbType - 数据库类型：'sqlite' 或 'mysql'
 * @property {Object} dbConfig - MySQL 配置参数（当 dbType='mysql' 时使用）
 * @property {number} backendPort - 后端服务监听端口
 * @property {string} nodeEnv - 运行环境：'development' 或 'production'
 * @property {string} frontendDeploy - 前端部署方式：'nginx' 或 'pm2'
 * @property {number} frontendPort - 前端服务监听端口
 * @property {string} domain - 域名配置（Nginx 使用）
 */
const config = {
  dbType: 'sqlite',           // 默认使用 SQLite
  dbConfig: {},               // MySQL 配置初始为空
  backendPort: 8000,          // 默认后端端口
  nodeEnv: 'production',      // 默认运行环境
  frontendDeploy: 'nginx',    // 默认使用 Nginx
  frontendPort: 80,           // 默认 Nginx 端口
  domain: 'localhost'         // 默认域名
};

// =============================================================================
// 交互式输入函数
// =============================================================================

/**
 * 创建 readline 接口实例
 * 用于在命令行中读取用户输入
 */
const rl = readline.createInterface({
  input: process.stdin,   // 标准输入（键盘）
  output: process.stdout  // 标准输出（屏幕）
});

/**
 * 提问函数 - 获取用户输入
 * 
 * @param {string} question - 提示问题文本
 * @param {string} defaultValue - 默认值（用户直接回车时使用）
 * @returns {Promise<string>} 用户输入的内容
 * 
 * 使用示例：
 *   const port = await ask('请输入端口', '8000');
 */
function ask(question, defaultValue = '') {
  return new Promise((resolve) => {
    // 如果有默认值，在提示中显示
    const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(prompt, (answer) => {
      // 如果用户未输入，使用默认值
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * 选择函数 - 显示选项列表并获取用户选择
 * 
 * @param {string} question - 提示问题文本
 * @param {Array<{label: string, value: any}>} options - 选项数组
 * @returns {Promise<any>} 用户选择的值
 * 
 * 使用示例：
 *   const dbType = await select('选择数据库：', [
 *     { label: 'SQLite', value: 'sqlite' },
 *     { label: 'MySQL', value: 'mysql' }
 *   ]);
 */
async function select(question, options) {
  // 显示问题和选项列表
  console.log(`\n${question}`);
  options.forEach((opt, idx) => {
    console.log(`  ${colors.cyan}${idx + 1}.${colors.reset} ${opt.label}`);
  });

  // 获取用户输入并转换为索引
  const answer = await ask('请选择', '1');
  const index = parseInt(answer) - 1;
  
  // 返回选中的值，如果无效则返回第一个选项
  return options[index]?.value || options[0].value;
}

// =============================================================================
// 系统命令执行函数
// =============================================================================

/**
 * 执行系统命令
 * 
 * @param {string} command - 要执行的命令
 * @param {Object} options - 执行选项
 * @param {boolean} options.silent - 是否静默执行（不显示输出）
 * @param {string} options.cwd - 工作目录
 * @returns {Object} 执行结果 { success: boolean, output?: string, error?: string }
 * 
 * 使用示例：
 *   const result = runCommand('npm install', { cwd: './backend' });
 *   if (result.success) console.log('安装成功');
 */
function runCommand(command, options = {}) {
  try {
    // 使用 execSync 同步执行命令
    const result = execSync(command, {
      encoding: 'utf8',                    // 输出编码为 UTF-8
      stdio: options.silent ? 'pipe' : 'inherit',  // 是否显示命令输出
      cwd: options.cwd || process.cwd(),   // 设置工作目录
      shell: true                          // 使用系统 shell 执行
    });
    return { success: true, output: result };
  } catch (error) {
    // 命令执行失败时返回错误信息
    return { success: false, error: error.message };
  }
}

/**
 * 检查命令是否存在于系统中
 * 
 * @param {string} command - 命令名称
 * @returns {boolean} 是否存在
 * 
 * 使用示例：
 *   if (commandExists('pm2')) console.log('PM2 已安装');
 */
function commandExists(command) {
  try {
    // 尝试执行命令的 --version 参数
    execSync(`${command} --version`, { stdio: 'pipe', shell: true });
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// 环境检测函数
// =============================================================================

/**
 * 检查 Node.js 版本是否满足要求
 * 
 * @returns {boolean} 版本是否 >= 14.0.0
 */
function checkNodeVersion() {
  const version = process.version;  // 获取当前 Node 版本，如 "v20.10.0"
  const major = parseInt(version.slice(1).split('.')[0]);  // 提取主版本号
  return major >= 14;
}

/**
 * 检测 Nginx 是否已安装
 * 
 * 检测逻辑：
 *   1. 尝试执行 nginx -v 命令
 *   2. Windows 系统额外检查常见安装路径
 * 
 * @returns {boolean} 是否已安装
 */
function isNginxInstalled() {
  try {
    // 方法1：尝试执行 nginx 命令
    execSync('nginx -v', { stdio: 'pipe', shell: true });
    return true;
  } catch {
    // 方法2：Windows 下检查常见安装路径
    if (process.platform === 'win32') {
      const commonPaths = [
        'C:\\nginx\\nginx.exe',
        'C:\\Program Files\\nginx\\nginx.exe',
        'C:\\Program Files (x86)\\nginx\\nginx.exe'
      ];
      for (const p of commonPaths) {
        if (fs.existsSync(p)) return true;
      }
    }
    return false;
  }
}

/**
 * 检查 Node.js 和 npm 是否已安装
 * 
 * @returns {Object} 检查结果 { nodeInstalled: boolean, npmInstalled: boolean, version?: string }
 */
function checkNodeAndNpm() {
  let nodeInstalled = false;
  let npmInstalled = false;
  let version = '';

  try {
    // 检查 Node.js
    version = process.version;
    nodeInstalled = true;
  } catch {
    nodeInstalled = false;
  }

  // 检查 npm
  npmInstalled = commandExists('npm');

  return { nodeInstalled, npmInstalled, version };
}

/**
 * 检测 Linux 发行版类型
 * 
 * @returns {string} 发行版类型：'ubuntu' | 'debian' | 'centos' | 'rhel' | 'fedora' | 'arch' | 'unknown'
 */
function detectLinuxDistro() {
  try {
    // 尝试读取 /etc/os-release 文件
    const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
    
    if (osRelease.includes('Ubuntu')) return 'ubuntu';
    if (osRelease.includes('Debian')) return 'debian';
    if (osRelease.includes('CentOS')) return 'centos';
    if (osRelease.includes('Red Hat')) return 'rhel';
    if (osRelease.includes('Fedora')) return 'fedora';
    if (osRelease.includes('Arch')) return 'arch';
    
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * 显示 Node.js 安装指引
 * 
 * 以 Linux 为主，同时支持 Windows 和 macOS
 * 根据操作系统显示对应的安装方式和下载链接
 */
function showNodeInstallGuide() {
  const platform = process.platform;
  const isWindows = platform === 'win32';
  const isMac = platform === 'darwin';
  const isLinux = platform === 'linux';

  console.log('\n' + colors.bright + 'Node.js 安装指引：' + colors.reset);

  if (isLinux) {
    // Linux 为主，优先显示
    const distro = detectLinuxDistro();
    
    console.log('\n' + colors.green + '【Linux 推荐安装方式】' + colors.reset);
    
    // 根据检测到的发行版显示对应命令
    switch (distro) {
      case 'ubuntu':
      case 'debian':
        console.log('\n' + colors.yellow + `Ubuntu/Debian (${distro}):` + colors.reset);
        console.log(`  ${colors.cyan}# 使用 NodeSource 源安装 Node.js 20.x` + colors.reset);
        console.log(`  ${colors.cyan}curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -${colors.reset}`);
        console.log(`  ${colors.cyan}sudo apt-get install -y nodejs${colors.reset}`);
        break;
        
      case 'centos':
      case 'rhel':
      case 'fedora':
        console.log('\n' + colors.yellow + `CentOS/RHEL/Fedora (${distro}):` + colors.reset);
        console.log(`  ${colors.cyan}# 使用 NodeSource 源安装 Node.js 20.x` + colors.reset);
        console.log(`  ${colors.cyan}curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -${colors.reset}`);
        console.log(`  ${colors.cyan}sudo yum install -y nodejs${colors.reset}`);
        break;
        
      case 'arch':
        console.log('\n' + colors.yellow + 'Arch Linux:' + colors.reset);
        console.log(`  ${colors.cyan}sudo pacman -S nodejs npm${colors.reset}`);
        break;
        
      default:
        console.log('\n' + colors.yellow + '通用 Linux 安装方式：' + colors.reset);
        console.log(`  ${colors.cyan}# Ubuntu/Debian${colors.reset}`);
        console.log(`  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -`);
        console.log(`  sudo apt-get install -y nodejs`);
        console.log(`\n  ${colors.cyan}# CentOS/RHEL/Fedora${colors.reset}`);
        console.log(`  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -`);
        console.log(`  sudo yum install -y nodejs`);
    }

    // 所有 Linux 都显示 nvm 方式
    console.log('\n' + colors.yellow + '【开发者推荐】使用 nvm（Node Version Manager）:' + colors.reset);
    console.log(`  ${colors.cyan}# 1. 安装 nvm${colors.reset}`);
    console.log(`  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash`);
    console.log(`  ${colors.cyan}# 2. 加载 nvm（或重新打开终端）${colors.reset}`);
    console.log(`  export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"`);
    console.log(`  ${colors.cyan}# 3. 安装并使用 Node.js 20${colors.reset}`);
    console.log(`  nvm install 20`);
    console.log(`  nvm use 20`);
    console.log(`  ${colors.cyan}# 4. 验证安装${colors.reset}`);
    console.log(`  node -v && npm -v`);

    // Docker 方式
    console.log('\n' + colors.yellow + '【Docker 方式】' + colors.reset);
    console.log(`  ${colors.cyan}# 使用官方 Node 镜像${colors.reset}`);
    console.log(`  docker run -it --rm node:20-alpine node -v`);

  } else if (isWindows) {
    // Windows
    console.log('\n' + colors.green + '【Windows 安装方式】' + colors.reset);
    
    console.log('\n' + colors.yellow + '方式一：使用官方安装包（推荐新手）' + colors.reset);
    console.log(`  1. 访问: ${colors.cyan}https://nodejs.org/${colors.reset}`);
    console.log(`  2. 下载 LTS 版本（推荐 ${colors.cyan}v20.x${colors.reset}）`);
    console.log(`  3. 运行安装包，按向导完成安装`);
    console.log(`  4. 安装完成后，${colors.yellow}重新打开终端${colors.reset}并再次运行此脚本`);

    console.log('\n' + colors.yellow + '方式二：使用 nvm-windows（推荐开发者）' + colors.reset);
    console.log(`  1. 下载安装 nvm-windows: ${colors.cyan}https://github.com/coreybutler/nvm-windows/releases${colors.reset}`);
    console.log(`  2. 打开新的 PowerShell 或 CMD 窗口`);
    console.log(`  3. 执行: ${colors.cyan}nvm install 20${colors.reset}`);
    console.log(`  4. 执行: ${colors.cyan}nvm use 20${colors.reset}`);
    console.log(`  5. 验证: ${colors.cyan}node -v${colors.reset}`);

    console.log('\n' + colors.yellow + '方式三：使用 Winget（Windows 10/11 自带）' + colors.reset);
    console.log(`  ${colors.cyan}winget install OpenJS.NodeJS.LTS${colors.reset}`);

  } else if (isMac) {
    // macOS
    console.log('\n' + colors.green + '【macOS 安装方式】' + colors.reset);
    
    console.log('\n' + colors.yellow + '方式一：使用 Homebrew（推荐）' + colors.reset);
    console.log(`  ${colors.cyan}brew install node@${colors.reset}`);

    console.log('\n' + colors.yellow + '方式二：使用官方安装包' + colors.reset);
    console.log(`  1. 访问: ${colors.cyan}https://nodejs.org/${colors.reset}`);
    console.log(`  2. 下载 macOS 安装包（.pkg）`);
    console.log(`  3. 双击安装包按向导完成安装`);

    console.log('\n' + colors.yellow + '方式三：使用 nvm（推荐开发者）' + colors.reset);
    console.log(`  ${colors.cyan}# 1. 安装 nvm${colors.reset}`);
    console.log(`  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash`);
    console.log(`  ${colors.cyan}# 2. 重新加载 shell 配置${colors.reset}`);
    console.log(`  source ~/.bashrc  # 或 source ~/.zshrc`);
    console.log(`  ${colors.cyan}# 3. 安装 Node.js 20${colors.reset}`);
    console.log(`  nvm install 20`);
    console.log(`  nvm use 20`);
  }

  // 通用验证命令
  console.log('\n' + colors.green + '【验证安装】' + colors.reset);
  console.log(`  安装完成后，运行以下命令验证：`);
  console.log(`  ${colors.cyan}node -v${colors.reset}  # 应显示 v20.x.x 或更高版本`);
  console.log(`  ${colors.cyan}npm -v${colors.reset}   # 应显示 10.x.x 或更高版本`);

  console.log('\n' + colors.gray + '安装完成后，请重新运行此部署脚本。' + colors.reset);
}

/**
 * Linux 系统自动安装 Node.js
 * 
 * 根据检测到的发行版，使用对应的方式自动安装 Node.js 20.x
 * 
 * @returns {Promise<boolean>} 安装是否成功
 */
async function autoInstallNodeLinux() {
  const distro = detectLinuxDistro();
  
  log.step('自动安装 Node.js');
  log.info(`检测到 Linux 发行版: ${distro}`);
  
  try {
    switch (distro) {
      case 'ubuntu':
      case 'debian':
        log.info('使用 NodeSource 源安装 Node.js 20.x...');
        log.info('执行: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -');
        const debianSetup = runCommand('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -');
        if (!debianSetup.success) {
          log.error('NodeSource 源配置失败');
          return false;
        }
        
        log.info('执行: sudo apt-get install -y nodejs');
        const debianInstall = runCommand('sudo apt-get install -y nodejs');
        if (!debianInstall.success) {
          log.error('Node.js 安装失败');
          return false;
        }
        break;
        
      case 'centos':
      case 'rhel':
      case 'fedora':
        log.info('使用 NodeSource 源安装 Node.js 20.x...');
        log.info('执行: curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -');
        const rpmSetup = runCommand('curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -');
        if (!rpmSetup.success) {
          log.error('NodeSource 源配置失败');
          return false;
        }
        
        log.info('执行: sudo yum install -y nodejs');
        const rpmInstall = runCommand('sudo yum install -y nodejs');
        if (!rpmInstall.success) {
          log.error('Node.js 安装失败');
          return false;
        }
        break;
        
      case 'arch':
        log.info('执行: sudo pacman -S nodejs npm');
        const archInstall = runCommand('sudo pacman -S --noconfirm nodejs npm');
        if (!archInstall.success) {
          log.error('Node.js 安装失败');
          return false;
        }
        break;
        
      default:
        // 未知发行版，尝试使用 nvm 安装
        log.info('未知发行版，尝试使用 nvm 安装...');
        return await installNodeViaNvm();
    }
    
    // 验证安装
    const checkResult = runCommand('node -v', { silent: true });
    if (checkResult.success) {
      log.success(`Node.js 安装成功: ${checkResult.output.trim()}`);
      const npmCheck = runCommand('npm -v', { silent: true });
      if (npmCheck.success) {
        log.success(`npm 安装成功: ${npmCheck.output.trim()}`);
      }
      return true;
    } else {
      log.error('Node.js 安装后验证失败');
      return false;
    }
    
  } catch (error) {
    log.error(`自动安装失败: ${error.message}`);
    return false;
  }
}

/**
 * 使用 nvm 安装 Node.js
 * 
 * 适用于所有 Linux 发行版，作为通用安装方式
 * 
 * @returns {Promise<boolean>} 安装是否成功
 */
async function installNodeViaNvm() {
  log.info('使用 nvm 安装 Node.js...');
  
  try {
    // 1. 检查 nvm 是否已安装
    const nvmCheck = runCommand('source ~/.nvm/nvm.sh && nvm --version', { silent: true });
    
    if (!nvmCheck.success) {
      // 安装 nvm
      log.info('安装 nvm...');
      const nvmInstall = runCommand('curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash');
      if (!nvmInstall.success) {
        log.error('nvm 安装失败');
        return false;
      }
    }
    
    // 2. 使用 nvm 安装 Node.js 20
    log.info('使用 nvm 安装 Node.js 20...');
    const nodeInstall = runCommand('export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm install 20');
    if (!nodeInstall.success) {
      log.error('Node.js 安装失败');
      return false;
    }
    
    // 3. 设置默认版本
    log.info('设置 Node.js 20 为默认版本...');
    runCommand('export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm alias default 20', { silent: true });
    
    log.success('Node.js 安装成功');
    return true;
    
  } catch (error) {
    log.error(`nvm 安装失败: ${error.message}`);
    return false;
  }
}

/**
 * 处理 Node.js 未安装的情况（Linux 交互式）
 * 
 * @returns {Promise<boolean>} 是否继续部署
 */
async function handleNodeNotInstalledLinux() {
  log.error('未检测到 Node.js');
  
  console.log('\n' + colors.yellow + '您可以选择：' + colors.reset);
  console.log(`  ${colors.cyan}1.${colors.reset} 自动安装 Node.js 20.x（推荐，需要 sudo 权限）`);
  console.log(`  ${colors.cyan}2.${colors.reset} 显示手动安装指引，退出脚本`);
  
  const choice = await ask('请选择', '1');
  
  if (choice === '1') {
    const installed = await autoInstallNodeLinux();
    if (installed) {
      log.success('Node.js 和 npm 安装完成！');
      log.info('请重新运行此脚本以继续部署');
      console.log(colors.cyan + '  node install.js' + colors.reset);
      
      // 询问是否立即重新运行
      const rerun = await ask('\n是否立即重新运行部署脚本? (Y/n)', 'Y');
      if (rerun.toLowerCase() === 'y') {
        // 重新检查环境
        return true;
      }
    } else {
      log.error('自动安装失败，请尝试手动安装');
      showNodeInstallGuide();
    }
    process.exit(1);
  } else {
    showNodeInstallGuide();
    process.exit(1);
  }
}

/**
 * 环境检测主函数
 * 
 * 检测内容：
 *   - Node.js 是否安装及版本（要求 >= 14.0.0）
 *   - npm 是否安装
 *   - PM2 是否安装（未安装则自动安装）
 *   - Nginx 是否安装（可选）
 * 
 * Linux 系统支持自动安装 Node.js
 */
async function checkEnvironment() {
  log.step('环境检测');

  // 1. 检测 Node.js 和 npm
  const { nodeInstalled, npmInstalled, version } = checkNodeAndNpm();
  const isLinux = process.platform === 'linux';

  if (!nodeInstalled) {
    if (isLinux) {
      // Linux 系统：交互式询问是否自动安装
      const shouldContinue = await handleNodeNotInstalledLinux();
      if (shouldContinue) {
        // 重新检测
        return await checkEnvironment();
      }
    } else {
      // 非 Linux 系统：显示安装指引
      log.error('未检测到 Node.js，请先安装');
      showNodeInstallGuide();
      process.exit(1);
    }
  }

  if (!npmInstalled) {
    if (isLinux && nodeInstalled) {
      // Linux 下 npm 未安装但 node 已安装，尝试重新安装 node
      log.warning('未检测到 npm，尝试修复...');
      const fixed = await autoInstallNodeLinux();
      if (!fixed) {
        log.error('npm 修复失败，请手动安装');
        showNodeInstallGuide();
        process.exit(1);
      }
    } else {
      log.error('未检测到 npm，请重新安装 Node.js（npm 会随 Node.js 一起安装）');
      showNodeInstallGuide();
      process.exit(1);
    }
  }

  // 2. 检查 Node.js 版本
  if (checkNodeVersion()) {
    log.success(`Node.js ${version}`);
  } else {
    log.error(`Node.js 版本过低 (${version})，需要 >= 14.0.0`);
    
    if (isLinux) {
      console.log('\n' + colors.yellow + '您可以选择：' + colors.reset);
      console.log(`  ${colors.cyan}1.${colors.reset} 自动升级到 Node.js 20.x`);
      console.log(`  ${colors.cyan}2.${colors.reset} 显示手动升级指引，退出脚本`);
      
      const upgradeChoice = await ask('请选择', '1');
      if (upgradeChoice === '1') {
        const upgraded = await autoInstallNodeLinux();
        if (upgraded) {
          log.success('Node.js 升级完成！请重新运行此脚本');
        } else {
          log.error('自动升级失败');
          showNodeInstallGuide();
        }
      } else {
        console.log('\n' + colors.yellow + '建议升级到 Node.js 20 LTS 版本:' + colors.reset);
        showNodeInstallGuide();
      }
    } else {
      console.log('\n' + colors.yellow + '建议升级到 Node.js 20 LTS 版本:' + colors.reset);
      showNodeInstallGuide();
    }
    process.exit(1);
  }

  // 3. 检测 npm 版本
  const npmResult = runCommand('npm --version', { silent: true });
  if (npmResult.success) {
    log.success(`npm ${npmResult.output.trim()}`);
  }

  // 4. 检测 PM2（进程管理器）
  if (commandExists('pm2')) {
    log.success('PM2 已安装');
  } else {
    log.warning('未检测到 PM2，将自动安装');
    const result = runCommand('npm install -g pm2');
    if (result.success) {
      log.success('PM2 安装完成');
    } else {
      log.error('PM2 安装失败，请手动执行: npm install -g pm2');
    }
  }

  // 5. 检测 Nginx（可选，仅在使用 Nginx 部署时需要）
  if (commandExists('nginx') || commandExists('nginx.exe')) {
    log.success('Nginx 已安装');
  } else {
    log.warning('未检测到 Nginx（可选，仅在使用Nginx部署时需要）');
  }

  log.divider();
}

// =============================================================================
// 配置函数
// =============================================================================

/**
 * 数据库配置函数
 * 
 * 交互流程：
 *   1. 选择数据库类型（SQLite / MySQL）
 *   2. 如选择 MySQL，提示输入连接参数
 */
async function configureDatabase() {
  log.step('数据库配置');

  // 选择数据库类型
  config.dbType = await select('选择数据库类型：', [
    { label: 'SQLite（零配置，适合开发/小规模）', value: 'sqlite' },
    { label: 'MySQL（生产环境推荐）', value: 'mysql' }
  ]);

  // MySQL 配置
  if (config.dbType === 'mysql') {
    console.log('\n' + colors.yellow + '请确保MySQL服务已启动并创建了数据库' + colors.reset);
    console.log(colors.gray + '创建数据库命令: CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;' + colors.reset + '\n');

    // 依次询问 MySQL 连接参数
    config.dbConfig.host = await ask('MySQL 主机地址', 'localhost');
    config.dbConfig.port = await ask('MySQL 端口', '3306');
    config.dbConfig.username = await ask('MySQL 用户名', 'root');
    config.dbConfig.password = await ask('MySQL 密码', '');
    config.dbConfig.database = await ask('数据库名称', 'idc_management');
  }

  log.divider();
}

/**
 * 服务配置函数
 * 
 * 交互流程：
 *   1. 配置后端端口
 *   2. 选择运行环境（development / production）
 *   3. 选择前端部署方式（Nginx / PM2 serve）
 *   4. 如选择 Nginx 但未安装，提供安装选项
 *   5. 配置前端端口和域名
 */
async function configureServices() {
  log.step('服务配置');

  // 1. 后端端口配置
  config.backendPort = await ask('后端服务端口', '8000');

  // 2. 运行环境选择
  config.nodeEnv = await select('选择运行环境：', [
    { label: 'production（生产模式，性能优化，推荐正式部署）', value: 'production' },
    { label: 'development（开发模式，详细日志，便于调试）', value: 'development' }
  ]);

  // 3. 前端部署方式选择
  config.frontendDeploy = await select('前端部署方式：', [
    { label: 'Nginx（性能最优，推荐生产环境）', value: 'nginx' },
    { label: 'PM2 serve（简单快捷，无需额外安装）', value: 'pm2' }
  ]);

  // 3. 如果选择 Nginx，检查是否已安装
  if (config.frontendDeploy === 'nginx') {
    const nginxInstalled = isNginxInstalled();

    if (!nginxInstalled) {
      log.warning('未检测到 Nginx 安装');

      if (process.platform === 'win32') {
        // Windows 下询问是否自动安装
        const autoInstall = await ask('是否自动下载并安装 Nginx? (Y/n)', 'Y');
        if (autoInstall.toLowerCase() === 'y') {
          await autoInstallNginx();
        } else {
          log.info('已跳过自动安装，请手动安装 Nginx 后启动服务');
          console.log(`  下载地址: ${colors.cyan}https://nginx.org/en/download.html${colors.reset}`);
          console.log(`  安装路径建议: ${colors.cyan}C:/nginx${colors.reset}`);
        }
      } else if (process.platform === 'linux') {
        // Linux 下询问是否自动安装
        const autoInstall = await ask('是否自动安装 Nginx? (Y/n)', 'Y');
        if (autoInstall.toLowerCase() === 'y') {
          const installed = await autoInstallNginxLinux();
          if (!installed) {
            log.error('Nginx 自动安装失败');
            log.info('请手动安装后重新运行脚本');
            showNginxInstallGuideLinux();
            process.exit(1);
          }
        } else {
          log.info('已跳过自动安装');
          showNginxInstallGuideLinux();
          const continueDeploy = await ask('是否继续部署（后端将启动，前端需手动配置 Nginx）? (Y/n)', 'Y');
          if (continueDeploy.toLowerCase() !== 'y') {
            log.info('已取消部署，请安装 Nginx 后重新运行');
            process.exit(0);
          }
        }
      } else {
        // macOS 下提供安装命令
        log.info('请使用 Homebrew 安装 Nginx：');
        console.log(`  ${colors.cyan}brew install nginx${colors.reset}`);
        console.log(`\n安装完成后，请重新运行此脚本继续部署。\n`);

        const continueDeploy = await ask('是否继续部署（后端将启动，前端需手动配置 Nginx）? (Y/n)', 'Y');
        if (continueDeploy.toLowerCase() !== 'y') {
          log.info('已取消部署，请安装 Nginx 后重新运行');
          process.exit(0);
        }
      }
    }

    // Nginx 端口和域名配置
    config.frontendPort = await ask('Nginx 监听端口', '80');
    config.domain = await ask('域名（没有则填localhost）', 'localhost');
  } else {
    // PM2 serve 端口配置
    config.frontendPort = await ask('前端服务端口', '3000');
  }

  log.divider();
}

/**
 * 配置确认函数
 * 
 * 显示所有配置参数，等待用户确认后开始部署
 */
async function confirmConfiguration() {
  log.step('配置确认');

  // 显示配置摘要
  console.log('\n' + colors.bright + '部署配置摘要：' + colors.reset);
  console.log(`  数据库类型: ${colors.cyan}${config.dbType}${colors.reset}`);
  if (config.dbType === 'mysql') {
    console.log(`  MySQL主机: ${colors.cyan}${config.dbConfig.host}:${config.dbConfig.port}${colors.reset}`);
    console.log(`  数据库名: ${colors.cyan}${config.dbConfig.database}${colors.reset}`);
    console.log(`  用户名: ${colors.cyan}${config.dbConfig.username}${colors.reset}`);
  }
  console.log(`  后端端口: ${colors.cyan}${config.backendPort}${colors.reset}`);
  console.log(`  运行环境: ${colors.cyan}${config.nodeEnv}${colors.reset}`);
  console.log(`  前端部署: ${colors.cyan}${config.frontendDeploy}${colors.reset}`);
  console.log(`  前端端口: ${colors.cyan}${config.frontendPort}${colors.reset}`);
  if (config.frontendDeploy === 'nginx') {
    console.log(`  域名: ${colors.cyan}${config.domain}${colors.reset}`);
  }

  // 等待用户确认
  const confirm = await ask('\n确认以上配置并开始部署? (Y/n)', 'Y');
  if (confirm.toLowerCase() !== 'y') {
    log.info('已取消部署');
    process.exit(0);
  }

  log.divider();
}

// =============================================================================
// Nginx 安装指引函数（Linux）
// =============================================================================

/**
 * 显示 Linux Nginx 安装指引
 */
function showNginxInstallGuideLinux() {
  const distro = detectLinuxDistro();
  
  console.log('\n' + colors.bright + 'Nginx 安装命令：' + colors.reset);
  
  switch (distro) {
    case 'ubuntu':
    case 'debian':
      console.log(`  ${colors.cyan}sudo apt update${colors.reset}`);
      console.log(`  ${colors.cyan}sudo apt install -y nginx${colors.reset}`);
      console.log(`  ${colors.cyan}sudo systemctl start nginx${colors.reset}`);
      console.log(`  ${colors.cyan}sudo systemctl enable nginx${colors.reset}`);
      break;
      
    case 'centos':
    case 'rhel':
    case 'fedora':
      console.log(`  ${colors.cyan}sudo yum install -y epel-release${colors.reset}`);
      console.log(`  ${colors.cyan}sudo yum install -y nginx${colors.reset}`);
      console.log(`  ${colors.cyan}sudo systemctl start nginx${colors.reset}`);
      console.log(`  ${colors.cyan}sudo systemctl enable nginx${colors.reset}`);
      break;
      
    case 'arch':
      console.log(`  ${colors.cyan}sudo pacman -S --noconfirm nginx${colors.reset}`);
      console.log(`  ${colors.cyan}sudo systemctl start nginx${colors.reset}`);
      console.log(`  ${colors.cyan}sudo systemctl enable nginx${colors.reset}`);
      break;
      
    default:
      console.log(`  ${colors.cyan}# Ubuntu/Debian${colors.reset}`);
      console.log(`  sudo apt update && sudo apt install -y nginx`);
      console.log(`\n  ${colors.cyan}# CentOS/RHEL/Fedora${colors.reset}`);
      console.log(`  sudo yum install -y epel-release && sudo yum install -y nginx`);
      console.log(`\n  ${colors.cyan}# Arch Linux${colors.reset}`);
      console.log(`  sudo pacman -S nginx`);
  }
  
  console.log('\n' + colors.gray + '安装完成后，请重新运行此部署脚本。' + colors.reset);
}

/**
 * Linux 系统自动安装 Nginx
 * 
 * 根据检测到的发行版，使用包管理器自动安装 Nginx
 * 
 * @returns {Promise<boolean>} 安装是否成功
 */
async function autoInstallNginxLinux() {
  const distro = detectLinuxDistro();
  
  log.step('自动安装 Nginx');
  log.info(`检测到 Linux 发行版: ${distro}`);
  
  try {
    let installCommand = '';
    let startCommand = 'sudo systemctl start nginx';
    let enableCommand = 'sudo systemctl enable nginx';
    
    switch (distro) {
      case 'ubuntu':
      case 'debian':
        log.info('使用 apt 安装 Nginx...');
        log.info('执行: sudo apt update');
        const updateResult = runCommand('sudo apt update');
        if (!updateResult.success) {
          log.warning('apt update 失败，尝试继续安装...');
        }
        
        log.info('执行: sudo apt install -y nginx');
        installCommand = 'sudo apt install -y nginx';
        break;
        
      case 'centos':
      case 'rhel':
      case 'fedora':
        log.info('使用 yum 安装 Nginx...');
        log.info('执行: sudo yum install -y epel-release');
        const epelResult = runCommand('sudo yum install -y epel-release');
        if (!epelResult.success) {
          log.warning('epel-release 安装失败，尝试继续...');
        }
        
        log.info('执行: sudo yum install -y nginx');
        installCommand = 'sudo yum install -y nginx';
        break;
        
      case 'arch':
        log.info('使用 pacman 安装 Nginx...');
        log.info('执行: sudo pacman -S --noconfirm nginx');
        installCommand = 'sudo pacman -S --noconfirm nginx';
        break;
        
      default:
        log.error('未知的 Linux 发行版，无法自动安装');
        return false;
    }
    
    // 执行安装
    const installResult = runCommand(installCommand);
    if (!installResult.success) {
      log.error('Nginx 安装失败');
      return false;
    }
    
    log.success('Nginx 安装完成');
    
    // 启动 Nginx
    log.info('启动 Nginx 服务...');
    const startResult = runCommand(startCommand);
    if (!startResult.success) {
      log.warning('Nginx 启动失败，可能需要手动启动');
    } else {
      log.success('Nginx 服务已启动');
    }
    
    // 设置开机自启
    log.info('设置开机自启...');
    runCommand(enableCommand, { silent: true });
    
    // 验证安装
    const checkResult = runCommand('nginx -v', { silent: true });
    if (checkResult.success) {
      log.success(`Nginx 安装成功: ${checkResult.output.trim()}`);
      return true;
    } else {
      log.error('Nginx 安装验证失败');
      return false;
    }
    
  } catch (error) {
    log.error(`自动安装失败: ${error.message}`);
    return false;
  }
}

// =============================================================================
// Nginx 自动安装函数（Windows）
// =============================================================================

/**
 * Windows 系统自动下载并安装 Nginx
 * 
 * 安装流程：
 *   1. 从 nginx.org 下载稳定版压缩包
 *   2. 解压到 C:\nginx
 *   3. 输出后续配置指引
 */
async function autoInstallNginx() {
  log.step('自动安装 Nginx');
  log.info('正在下载 Nginx...');

  // 引入所需模块
  const https = require('https');

  // 配置参数
  const nginxUrl = 'https://nginx.org/download/nginx-1.24.0.zip';  // Nginx 稳定版下载地址
  const downloadPath = path.join(__dirname, 'nginx-1.24.0.zip');    // 临时下载路径
  const installPath = 'C:\\nginx';                                   // 安装路径

  try {
    // 1. 下载 Nginx 压缩包
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(downloadPath);
      https.get(nginxUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', reject);
    });
    log.success('Nginx 下载完成');

    // 2. 解压到 C:\
    log.info('正在解压...');
    execSync(`powershell -Command "Expand-Archive -Path '${downloadPath}' -DestinationPath 'C:\\\\' -Force"`, { stdio: 'inherit' });

    // 3. 重命名文件夹为 nginx
    if (fs.existsSync('C:\\nginx-1.24.0')) {
      if (fs.existsSync(installPath)) {
        fs.rmSync(installPath, { recursive: true });  // 删除旧版本
      }
      fs.renameSync('C:\\nginx-1.24.0', installPath);
    }

    // 4. 清理临时文件
    fs.unlinkSync(downloadPath);

    // 5. 输出安装成功信息和后续步骤
    log.success(`Nginx 已安装到 ${installPath}`);
    log.info('安装后操作：');
    console.log(`  1. 将配置文件复制到: ${colors.cyan}C:/nginx/conf/conf.d/idc.conf${colors.reset}`);
    console.log(`  2. 修改主配置: 在 C:/nginx/conf/nginx.conf 的 http 段添加: ${colors.cyan}include conf.d/*.conf;${colors.reset}`);
    console.log(`  3. 启动 Nginx: ${colors.cyan}C:/nginx/nginx.exe${colors.reset}`);

  } catch (error) {
    log.error('Nginx 自动安装失败: ' + error.message);
    log.info('请手动下载安装: https://nginx.org/en/download.html');
    throw error;
  }
}

// =============================================================================
// 配置文件生成函数
// =============================================================================

/**
 * 生成后端环境变量文件 (.env)
 * 
 * 根据用户选择的配置生成后端所需的 .env 文件
 */
function generateBackendEnv() {
  const envPath = path.join(__dirname, 'backend', '.env');

  // 构建环境变量内容
  let envContent = `# IDC设备管理系统 - 环境配置
# 生成时间: ${new Date().toISOString()}

# ==============================================
# 服务器配置
# ==============================================

# 服务器端口
PORT=${config.backendPort}

# 运行环境: development 或 production
NODE_ENV=${config.nodeEnv}

# ==============================================
# 数据库配置
# ==============================================

# 数据库类型: sqlite 或 mysql
DB_TYPE=${config.dbType}
`;

  // 根据数据库类型添加相应配置
  if (config.dbType === 'sqlite') {
    envContent += `
# SQLite 配置
DB_PATH=./idc_management.db
`;
  } else {
    envContent += `
# MySQL 配置
MYSQL_HOST=${config.dbConfig.host}
MYSQL_PORT=${config.dbConfig.port}
MYSQL_USERNAME=${config.dbConfig.username}
MYSQL_PASSWORD=${config.dbConfig.password}
MYSQL_DATABASE=${config.dbConfig.database}
`;
  }

  // 写入文件
  fs.writeFileSync(envPath, envContent);
  log.success('后端环境变量文件已生成 (.env)');
}

/**
 * 生成 PM2 配置文件
 * 
 * 生成 ecosystem.config.js 用于 PM2 进程管理
 */
function generatePM2Config() {
  // 创建 deploy 目录
  const deployDir = path.join(__dirname, 'deploy');
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  // 构建 PM2 配置对象
  const pm2Config = {
    apps: [{
      name: 'idc-backend',                                    // 应用名称
      script: './server.js',                                  // 启动脚本
      cwd: path.join(__dirname, 'backend'),                   // 工作目录
      instances: 1,                                           // 实例数
      exec_mode: 'fork',                                      // 执行模式
      env: {
        NODE_ENV: 'production',
        PORT: config.backendPort
      },
      max_memory_restart: '1G',                               // 内存限制
      log_file: path.join(__dirname, 'backend', 'logs', 'combined.log'),
      out_file: path.join(__dirname, 'backend', 'logs', 'out.log'),
      error_file: path.join(__dirname, 'backend', 'logs', 'error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true                                       // 自动重启
    }]
  };

  // 如果使用 PM2 serve 部署前端，添加前端应用配置
  if (config.frontendDeploy === 'pm2') {
    pm2Config.apps.push({
      name: 'idc-frontend',
      script: 'serve',
      cwd: path.join(__dirname, 'frontend'),
      args: `-s dist -l ${config.frontendPort}`,  // -s: 静态文件目录, -l: 监听端口
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '500M',
      autorestart: true
    });
  }

  // 写入配置文件
  fs.writeFileSync(
    path.join(deployDir, 'ecosystem.config.js'),
    `module.exports = ${JSON.stringify(pm2Config, null, 2)};`
  );
  log.success('PM2 配置文件已生成 (deploy/ecosystem.config.js)');
}

/**
 * 生成 Nginx 配置文件
 * 
 * 生成 nginx-idc.conf 用于 Nginx 反向代理和静态文件服务
 */
function generateNginxConfig() {
  if (config.frontendDeploy !== 'nginx') return;

  // 创建 deploy 目录
  const deployDir = path.join(__dirname, 'deploy');
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  const isWindows = process.platform === 'win32';
  // 转换路径分隔符（Windows 反斜杠转斜杠）
  const frontendPath = path.join(__dirname, 'frontend', 'dist').replace(/\\/g, '/');

  // 构建 Nginx 配置内容
  const nginxConfig = `# IDC设备管理系统 - Nginx配置
# 生成时间: ${new Date().toISOString()}

server {
    listen ${config.frontendPort};
    server_name ${config.domain};
    
    # 前端静态文件目录
    root "${frontendPath}";
    index index.html;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 静态资源缓存（1年）
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 前端路由支持（SPA单页应用）
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API代理到后端
    location /api {
        proxy_pass http://127.0.0.1:${config.backendPort};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 文件上传代理
    location /uploads {
        proxy_pass http://127.0.0.1:${config.backendPort};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50M;  # 最大上传文件大小
    }
}
`;

  // 写入配置文件
  fs.writeFileSync(path.join(deployDir, 'nginx-idc.conf'), nginxConfig);
  log.success('Nginx 配置文件已生成 (deploy/nginx-idc.conf)');

  // 输出平台特定的配置指引
  if (isWindows) {
    log.info('Windows Nginx 配置路径示例:');
    console.log(`  将配置文件复制到: ${colors.cyan}C:/nginx/conf/conf.d/idc.conf${colors.reset}`);
    console.log(`  或修改主配置 include: ${colors.cyan}C:/nginx/conf/nginx.conf${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}Nginx 配置启用命令:${colors.reset}`);
    console.log(`  sudo cp deploy/nginx-idc.conf /etc/nginx/sites-available/idc`);
    console.log(`  sudo ln -s /etc/nginx/sites-available/idc /etc/nginx/sites-enabled/`);
    console.log(`  sudo nginx -t`);
    console.log(`  sudo systemctl restart nginx`);
  }
}

// =============================================================================
// 部署执行函数
// =============================================================================

/**
 * 安装项目依赖
 * 
 * 依次安装后端和前端的 npm 依赖
 */
async function installDependencies() {
  log.step('安装依赖');

  // 安装后端依赖
  log.info('安装后端依赖...');
  const backendResult = runCommand('npm install', { cwd: path.join(__dirname, 'backend') });
  if (backendResult.success) {
    log.success('后端依赖安装完成');
  } else {
    log.error('后端依赖安装失败');
    throw new Error('Backend install failed');
  }

  // 安装前端依赖
  log.info('安装前端依赖...');
  const frontendResult = runCommand('npm install', { cwd: path.join(__dirname, 'frontend') });
  if (frontendResult.success) {
    log.success('前端依赖安装完成');
  } else {
    log.error('前端依赖安装失败');
    throw new Error('Frontend install failed');
  }
}

/**
 * 初始化数据库
 * 
 * 执行 backend/scripts/init-database.js 创建数据库表结构
 */
async function initDatabase() {
  log.step('数据库初始化');

  const initScript = path.join(__dirname, 'backend', 'scripts', 'init-database.js');

  // 检查初始化脚本是否存在
  if (!fs.existsSync(initScript)) {
    log.warning('未找到数据库初始化脚本，跳过');
    return;
  }

  log.info('正在初始化数据库...');
  const result = runCommand('node scripts/init-database.js', {
    cwd: path.join(__dirname, 'backend')
  });

  if (result.success) {
    log.success('数据库初始化完成');
  } else {
    log.error('数据库初始化失败');
    log.info('请检查数据库配置并手动运行: node backend/scripts/init-database.js');
  }
}

/**
 * 构建前端项目
 * 
 * 执行 npm run build 生成生产环境静态文件
 */
async function buildFrontend() {
  log.step('构建前端');

  log.info('执行 npm run build...');
  const result = runCommand('npm run build', { cwd: path.join(__dirname, 'frontend') });

  if (result.success) {
    log.success('前端构建完成');
  } else {
    log.error('前端构建失败');
    throw new Error('Frontend build failed');
  }
}

/**
 * 启动服务
 * 
 * 使用 PM2 启动后端和前端（PM2方式）服务
 */
async function startServices() {
  log.step('启动服务');

  // 确保日志目录存在
  const logDir = path.join(__dirname, 'backend', 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // 停止已有服务（避免冲突）
  log.info('停止已有服务...');
  runCommand('pm2 stop idc-backend idc-frontend 2>nul || true', { silent: true });

  // 启动后端服务
  log.info('启动后端服务...');
  const backendResult = runCommand(
    `pm2 start server.js --name "idc-backend" --env ${config.nodeEnv}`,
    { cwd: path.join(__dirname, 'backend') }
  );

  if (backendResult.success) {
    log.success(`后端服务已启动 (端口: ${config.backendPort})`);
  } else {
    log.error('后端服务启动失败');
  }

  // 如果使用 PM2 serve，启动前端服务
  if (config.frontendDeploy === 'pm2') {
    log.info('安装 serve 包...');
    runCommand('npm install -g serve', { silent: true });

    log.info('启动前端服务...');
    const frontendResult = runCommand(
      `pm2 start serve --name "idc-frontend" -- -s dist -l ${config.frontendPort}`,
      { cwd: path.join(__dirname, 'frontend') }
    );

    if (frontendResult.success) {
      log.success(`前端服务已启动 (端口: ${config.frontendPort})`);
    } else {
      log.error('前端服务启动失败');
    }
  }

  // 保存 PM2 配置（开机自启）
  runCommand('pm2 save', { silent: true });

  log.divider();
}

// =============================================================================
// 输出函数
// =============================================================================

/**
 * 输出部署完成后的管理命令和访问地址
 */
function printManagementCommands() {
  log.step('部署完成！管理命令：');

  // PM2 管理命令
  console.log('\n' + colors.bright + '服务管理：' + colors.reset);
  console.log(`  ${colors.cyan}pm2 status${colors.reset}              查看服务状态`);
  console.log(`  ${colors.cyan}pm2 logs idc-backend${colors.reset}      查看后端日志`);
  console.log(`  ${colors.cyan}pm2 logs idc-frontend${colors.reset}     查看前端日志（PM2方式）`);
  console.log(`  ${colors.cyan}pm2 restart idc-backend${colors.reset}   重启后端`);
  console.log(`  ${colors.cyan}pm2 stop idc-backend${colors.reset}      停止后端`);
  console.log(`  ${colors.cyan}pm2 delete idc-backend${colors.reset}    删除后端服务`);

  // Nginx 管理命令（如适用）
  if (config.frontendDeploy === 'nginx') {
    console.log('\n' + colors.bright + 'Nginx 管理：' + colors.reset);
    if (process.platform === 'win32') {
      console.log(`  ${colors.cyan}nginx -t${colors.reset}                  测试配置`);
      console.log(`  ${colors.cyan}nginx -s reload${colors.reset}           重载配置`);
      console.log(`  ${colors.cyan}nginx -s stop${colors.reset}             停止Nginx`);
    } else {
      console.log(`  ${colors.cyan}sudo nginx -t${colors.reset}             测试配置`);
      console.log(`  ${colors.cyan}sudo systemctl restart nginx${colors.reset}  重启Nginx`);
    }
  }

  // 访问地址
  console.log('\n' + colors.bright + '访问地址：' + colors.reset);
  console.log(`  后端API: ${colors.cyan}http://localhost:${config.backendPort}/api${colors.reset}`);
  if (config.frontendDeploy === 'nginx') {
    console.log(`  前端页面: ${colors.cyan}http://${config.domain}:${config.frontendPort}${colors.reset}`);
  } else {
    console.log(`  前端页面: ${colors.cyan}http://localhost:${config.frontendPort}${colors.reset}`);
  }

  // 更新升级命令
  console.log('\n' + colors.bright + '更新升级：' + colors.reset);
  console.log(`  ${colors.cyan}npm run update${colors.reset}            一键更新（拉取代码+重建+重启）`);

  log.divider();
  log.success('安装部署完成！');
}

// =============================================================================
// 主函数
// =============================================================================

/**
 * 主函数 - 脚本入口
 * 
 * 执行流程：
 *   1. 显示欢迎信息
 *   2. 环境检测
 *   3. 交互式配置（数据库、服务）
 *   4. 配置确认
 *   5. 生成配置文件
 *   6. 安装依赖
 *   7. 初始化数据库
 *   8. 构建前端
 *   9. 启动服务
 *   10. 输出管理命令
 */
async function main() {
  // 显示欢迎信息
  console.log(`
${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════╗
║     IDC设备管理系统 - 交互式安装部署脚本                    ║
║     Interactive Installation & Deployment Script          ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // 步骤1：环境检测
    await checkEnvironment();

    // 步骤2：交互式配置
    await configureDatabase();
    await configureServices();
    await confirmConfiguration();

    // 步骤3：生成配置文件
    generateBackendEnv();
    generatePM2Config();
    generateNginxConfig();

    // 步骤4：安装和部署
    await installDependencies();
    await initDatabase();
    await buildFrontend();
    await startServices();

    // 步骤5：输出管理命令
    printManagementCommands();

  } catch (error) {
    log.error(`部署失败: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    // 关闭 readline 接口
    rl.close();
  }
}

// 运行主函数
main();
