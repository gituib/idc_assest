const fs = require('fs');
const { execSync } = require('child_process');
const { MIN_NODE_VERSION } = require('./constants');
const { colors, ICONS, log } = require('./logger');
const { runCommand, commandExists } = require('./utils');
const { ask } = require('./ui');

function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  return major >= MIN_NODE_VERSION;
}

function isNginxInstalled() {
  try {
    execSync('nginx -v', { stdio: 'pipe', shell: true });
    return true;
  } catch {
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

function checkNodeAndNpm() {
  let nodeInstalled = false;
  let npmInstalled = false;
  let version = '';

  try {
    version = process.version;
    nodeInstalled = true;
  } catch {
    nodeInstalled = false;
  }

  npmInstalled = commandExists('npm');

  return { nodeInstalled, npmInstalled, version };
}

function detectLinuxDistro() {
  try {
    if (fs.existsSync('/etc/os-release')) {
      const content = fs.readFileSync('/etc/os-release', 'utf8');
      const idMatch = content.match(/^ID=(.*)$/m);
      if (idMatch) {
        const id = idMatch[1].replace(/"/g, '').toLowerCase();
        if (['ubuntu', 'debian'].includes(id)) return 'ubuntu';
        if (['centos', 'rhel', 'rocky', 'almalinux', 'fedora'].includes(id)) return 'centos';
        return id;
      }
    }
    if (fs.existsSync('/etc/redhat-release')) return 'centos';
    if (fs.existsSync('/etc/debian_version')) return 'ubuntu';
  } catch {}
  return 'unknown';
}

function isRootUser() {
  return process.getuid && process.getuid() === 0;
}

function showNodeInstallGuide() {
  const platform = process.platform;
  const isWindows = platform === 'win32';
  const isMac = platform === 'darwin';
  const isLinux = platform === 'linux';

  log.section('Node.js 安装指引');

  if (isLinux) {
    const distro = detectLinuxDistro();

    console.log('\n' + colors.green + '【Linux 推荐安装方式】' + colors.reset);

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

    console.log('\n' + colors.yellow + '【Docker 方式】' + colors.reset);
    console.log(`  ${colors.cyan}# 使用官方 Node 镜像${colors.reset}`);
    console.log(`  docker run -it --rm node:20-alpine node -v`);

  } else if (isWindows) {
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

  console.log('\n' + colors.green + '【验证安装】' + colors.reset);
  console.log(`  安装完成后，运行以下命令验证：`);
  console.log(`  ${colors.cyan}node -v${colors.reset}  # 应显示 v20.x.x 或更高版本`);
  console.log(`  ${colors.cyan}npm -v${colors.reset}   # 应显示 10.x.x 或更高版本`);

  console.log('\n' + colors.gray + '安装完成后，请重新运行此部署脚本。' + colors.reset);
}

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
        log.info('未知发行版，尝试使用 nvm 安装...');
        return await installNodeViaNvm();
    }

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

async function installNodeViaNvm() {
  log.info('使用 nvm 安装 Node.js...');

  try {
    const nvmCheck = runCommand('source ~/.nvm/nvm.sh && nvm --version', { silent: true });

    if (!nvmCheck.success) {
      log.info('安装 nvm...');
      const nvmInstall = runCommand('curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash');
      if (!nvmInstall.success) {
        log.error('nvm 安装失败');
        return false;
      }
    }

    log.info('使用 nvm 安装 Node.js 20...');
    const nodeInstall = runCommand('export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm install 20');
    if (!nodeInstall.success) {
      log.error('Node.js 安装失败');
      return false;
    }

    log.info('设置 Node.js 20 为默认版本...');
    runCommand('export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm alias default 20', { silent: true });

    log.success('Node.js 安装成功');
    return true;

  } catch (error) {
    log.error(`nvm 安装失败: ${error.message}`);
    return false;
  }
}

async function handleNodeNotInstalledLinux() {
  log.error('未检测到 Node.js');

  console.log(`  ${ICONS.pointer} ${colors.cyan}1.${colors.reset} 自动安装 Node.js 20.x（推荐，需要 sudo 权限）`);
  console.log(`    ${colors.dim}2.${colors.reset} 显示手动安装指引，退出脚本`);

  const choice = await ask('请选择', '1');

  if (choice === '1') {
    const installed = await autoInstallNodeLinux();
    if (installed) {
      log.success('Node.js 和 npm 安装完成！');
      log.info('请重新运行此脚本以继续部署');
      console.log(colors.cyan + '  node install.js' + colors.reset);

      const rerun = await ask('\n是否立即重新运行部署脚本? (Y/n)', 'Y');
      if (rerun.toLowerCase() === 'y') {
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

async function checkEnvironment() {
  log.step('环境检测');

  const { nodeInstalled, npmInstalled, version } = checkNodeAndNpm();
  const isLinux = process.platform === 'linux';

  if (!nodeInstalled) {
    if (isLinux) {
      const shouldContinue = await handleNodeNotInstalledLinux();
      if (shouldContinue) {
        return await checkEnvironment();
      }
    } else {
      log.error('未检测到 Node.js，请先安装');
      showNodeInstallGuide();
      process.exit(1);
    }
  }

  if (!npmInstalled) {
    if (isLinux && nodeInstalled) {
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

  if (checkNodeVersion()) {
    log.success(`Node.js ${version}`);
  } else {
    log.error(`Node.js 版本过低 (${version})，需要 >= 14.0.0`);

    if (isLinux) {
      console.log(`  ${ICONS.pointer} ${colors.cyan}1.${colors.reset} 自动升级到 Node.js 20.x`);
      console.log(`    ${colors.dim}2.${colors.reset} 显示手动升级指引，退出脚本`);

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

  const npmResult = runCommand('npm --version', { silent: true });
  if (npmResult.success) {
    log.success(`npm ${npmResult.output.trim()}`);
  }

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

  if (isNginxInstalled()) {
    log.success('Nginx 已安装');
  } else {
    log.warning('未检测到 Nginx（可选，仅在使用Nginx部署时需要）');
  }

  log.divider();
}

module.exports = {
  checkNodeVersion,
  isNginxInstalled,
  checkNodeAndNpm,
  detectLinuxDistro,
  isRootUser,
  showNodeInstallGuide,
  autoInstallNodeLinux,
  installNodeViaNvm,
  handleNodeNotInstalledLinux,
  checkEnvironment,
};
