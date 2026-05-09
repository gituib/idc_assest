const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { colors, log } = require('./logger');
const { ask, select } = require('./ui');
const { config } = require('./config');
const { runCommand } = require('./utils');
const { isNginxInstalled, detectLinuxDistro, isRootUser } = require('./env-check');

function showNginxInstallGuideLinux() {
  const distro = detectLinuxDistro();
  const root = isRootUser();
  const sudoPrefix = root ? '' : 'sudo ';

  console.log('\n' + colors.bright + 'Nginx 安装命令：' + colors.reset);
  if (root) {
    console.log(colors.gray + '（当前以 root 用户运行，无需 sudo）' + colors.reset);
  }

  switch (distro) {
    case 'ubuntu':
    case 'debian':
      console.log(`  ${colors.cyan}${sudoPrefix}apt update${colors.reset}`);
      console.log(`  ${colors.cyan}${sudoPrefix}apt install -y nginx${colors.reset}`);
      console.log(`  ${colors.cyan}${sudoPrefix}systemctl start nginx${colors.reset}`);
      console.log(`  ${colors.cyan}${sudoPrefix}systemctl enable nginx${colors.reset}`);
      break;

    case 'centos':
    case 'rhel':
    case 'fedora':
      console.log(`  ${colors.cyan}${sudoPrefix}yum install -y epel-release${colors.reset}`);
      console.log(`  ${colors.cyan}${sudoPrefix}yum install -y nginx${colors.reset}`);
      console.log(`  ${colors.cyan}${sudoPrefix}systemctl start nginx${colors.reset}`);
      console.log(`  ${colors.cyan}${sudoPrefix}systemctl enable nginx${colors.reset}`);
      break;

    case 'arch':
      console.log(`  ${colors.cyan}${sudoPrefix}pacman -S --noconfirm nginx${colors.reset}`);
      console.log(`  ${colors.cyan}${sudoPrefix}systemctl start nginx${colors.reset}`);
      console.log(`  ${colors.cyan}${sudoPrefix}systemctl enable nginx${colors.reset}`);
      break;

    default:
      console.log(`  ${colors.cyan}# Ubuntu/Debian${colors.reset}`);
      console.log(`  ${sudoPrefix}apt update && ${sudoPrefix}apt install -y nginx`);
      console.log(`\n  ${colors.cyan}# CentOS/RHEL/Fedora${colors.reset}`);
      console.log(`  ${sudoPrefix}yum install -y epel-release && ${sudoPrefix}yum install -y nginx`);
      console.log(`\n  ${colors.cyan}# Arch Linux${colors.reset}`);
      console.log(`  ${sudoPrefix}pacman -S nginx`);
  }

  console.log('\n' + colors.gray + '安装完成后，请重新运行此部署脚本。' + colors.reset);
}

async function autoInstallNginxLinux() {
  const distro = detectLinuxDistro();
  const root = isRootUser();
  const sudoPrefix = root ? '' : 'sudo ';

  log.step('自动安装 Nginx');
  log.info(`检测到 Linux 发行版: ${distro}`);
  if (root) {
    log.info('当前以 root 用户运行，无需 sudo');
  }

  try {
    let installCommand = '';
    let startCommand = `${sudoPrefix}systemctl start nginx`;
    let enableCommand = `${sudoPrefix}systemctl enable nginx`;

    switch (distro) {
      case 'ubuntu':
      case 'debian':
        log.info('使用 apt 安装 Nginx...');
        log.info(`执行: ${sudoPrefix}apt update`);
        const updateResult = runCommand(`${sudoPrefix}apt update`);
        if (!updateResult.success) {
          log.warning('apt update 失败，尝试继续安装...');
        }

        log.info(`执行: ${sudoPrefix}apt install -y nginx`);
        installCommand = `${sudoPrefix}apt install -y nginx`;
        break;

      case 'centos':
      case 'rhel':
      case 'fedora':
        log.info('使用 yum 安装 Nginx...');
        log.info(`执行: ${sudoPrefix}yum install -y epel-release`);
        const epelResult = runCommand(`${sudoPrefix}yum install -y epel-release`);
        if (!epelResult.success) {
          log.warning('epel-release 安装失败，尝试继续...');
        }

        log.info(`执行: ${sudoPrefix}yum install -y nginx`);
        installCommand = `${sudoPrefix}yum install -y nginx`;
        break;

      case 'arch':
        log.info('使用 pacman 安装 Nginx...');
        log.info(`执行: ${sudoPrefix}pacman -S --noconfirm nginx`);
        installCommand = `${sudoPrefix}pacman -S --noconfirm nginx`;
        break;

      default:
        log.error('未知的 Linux 发行版，无法自动安装');
        return false;
    }

    const installResult = runCommand(installCommand);
    if (!installResult.success) {
      log.error('Nginx 安装失败');
      return false;
    }

    log.success('Nginx 安装完成');

    log.info('启动 Nginx 服务...');
    const startResult = runCommand(startCommand);
    if (!startResult.success) {
      log.warning('Nginx 启动失败，可能需要手动启动');
    } else {
      log.success('Nginx 服务已启动');
    }

    log.info('设置开机自启...');
    runCommand(enableCommand, { silent: true });

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

async function autoInstallNginx() {
  log.step('自动安装 Nginx');
  log.info('正在下载 Nginx...');

  const https = require('https');

  const nginxUrl = 'https://nginx.org/download/nginx-1.24.0.zip';
  const downloadPath = path.join(__dirname, '..', 'nginx-1.24.0.zip');
  const installPath = 'C:\\nginx';

  try {
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

    log.info('正在解压...');
    execSync(`powershell -Command "Expand-Archive -Path '${downloadPath}' -DestinationPath 'C:\\\\' -Force"`, { stdio: 'inherit' });

    if (fs.existsSync('C:\\nginx-1.24.0')) {
      if (fs.existsSync(installPath)) {
        fs.rmSync(installPath, { recursive: true });
      }
      fs.renameSync('C:\\nginx-1.24.0', installPath);
    }

    fs.unlinkSync(downloadPath);

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

async function autoConfigureNginx() {
  log.step('配置 Nginx');

  if (!isNginxInstalled()) {
    log.warning('Nginx 未安装，尝试自动安装...');
    if (process.platform === 'linux') {
      const installed = await autoInstallNginxLinux();
      if (!installed) {
        log.error('Nginx 自动安装失败');
        log.info('请手动安装 Nginx 后执行:');
        console.log(`  ${colors.cyan}sudo cp deploy/nginx-idc.conf /etc/nginx/sites-available/idc${colors.reset}`);
        console.log(`  ${colors.cyan}sudo ln -sf /etc/nginx/sites-available/idc /etc/nginx/sites-enabled/idc${colors.reset}`);
        console.log(`  ${colors.cyan}sudo nginx -t && sudo systemctl restart nginx${colors.reset}`);
        return;
      }
    } else {
      log.error('当前平台不支持自动安装 Nginx，请手动安装');
      return;
    }
  }

  const root = isRootUser();
  const sudoPrefix = root ? '' : 'sudo ';

  const wwwDir = '/var/www/idc';
  const distDir = path.join(__dirname, '..', 'frontend', 'dist');

  if (fs.existsSync(distDir)) {
    log.info(`复制前端文件到 ${wwwDir}...`);
    runCommand(`${sudoPrefix}mkdir -p ${wwwDir}`, { silent: true });
    const copyResult = runCommand(`${sudoPrefix}cp -r ${distDir}/* ${wwwDir}/`, { silent: true });
    if (copyResult.success) {
      runCommand(`${sudoPrefix}chmod -R 755 ${wwwDir}`, { silent: true });
      log.success('前端文件部署完成');
    } else {
      log.warning('前端文件复制失败，Nginx 可能无法访问前端页面');
    }
  } else {
    log.warning(`前端构建产物不存在: ${distDir}`);
    log.info('请先完成前端构建后再配置 Nginx');
  }

  const configSource = path.join(__dirname, '..', 'deploy', 'nginx-idc.conf');

  if (!fs.existsSync(configSource)) {
    log.error('Nginx 配置文件不存在，请先运行安装脚本');
    return;
  }

  try {
    let configDir = '';
    let useSitesAvailable = false;

    if (fs.existsSync('/etc/nginx/sites-available')) {
      configDir = '/etc/nginx/sites-available';
      useSitesAvailable = true;
    } else if (fs.existsSync('/etc/nginx/conf.d')) {
      configDir = '/etc/nginx/conf.d';
      useSitesAvailable = false;
    } else {
      log.warning('未找到标准 Nginx 配置目录，请手动配置');
      return;
    }

    const configDest = path.join(configDir, 'idc');
    log.info(`复制配置到 ${configDest}...`);

    const copyResult = runCommand(`${sudoPrefix}cp "${configSource}" "${configDest}"`);
    if (!copyResult.success) {
      log.error('配置文件复制失败');
      return;
    }

    if (useSitesAvailable) {
      log.info('创建站点软链接...');
      runCommand(`${sudoPrefix}ln -sf "${configDest}" /etc/nginx/sites-enabled/idc`);

      if (fs.existsSync('/etc/nginx/sites-enabled/default')) {
        log.info('删除默认站点配置...');
        runCommand(`${sudoPrefix}rm -f /etc/nginx/sites-enabled/default`, { silent: true });
      }
    }

    log.info('测试 Nginx 配置...');
    const testResult = runCommand(`${sudoPrefix}nginx -t`);
    if (!testResult.success) {
      log.error('Nginx 配置测试失败');
      log.info('请检查配置文件: ' + configDest);
      return;
    }

    log.info('重启 Nginx 服务...');
    const restartResult = runCommand(`${sudoPrefix}systemctl restart nginx`);
    if (restartResult.success) {
      log.success('Nginx 配置完成并已生效');
    } else {
      log.warning('systemctl 重启失败，尝试直接重载...');
      const reloadResult = runCommand(`${sudoPrefix}nginx -s reload`);
      if (reloadResult.success) {
        log.success('Nginx 配置完成并已生效');
      } else {
        log.warning('Nginx 重载失败，请手动重启: sudo systemctl restart nginx');
      }
    }

  } catch (error) {
    log.error(`自动配置失败: ${error.message}`);
    log.info('请手动配置 Nginx');
  }
}

async function configureServices(cmdArgs) {
  log.step('服务配置');

  if (cmdArgs?.nonInteractive && cmdArgs?.backendPort) {
    config.backendPort = cmdArgs.backendPort;
    log.info(`使用命令行参数: 后端端口 = ${config.backendPort}`);
  } else if (cmdArgs?.nonInteractive) {
    config.backendPort = '8000';
    log.info('使用默认配置: 后端端口 = 8000');
  } else {
    config.backendPort = await ask('后端服务端口', '8000');
  }

  if (cmdArgs?.nonInteractive) {
    config.nodeEnv = 'production';
    log.info('使用默认配置: 运行环境 = production');
  } else {
    config.nodeEnv = await select('选择运行环境：', [
      { label: 'production（生产模式，性能优化，推荐正式部署）', value: 'production' },
      { label: 'development（开发模式，详细日志，便于调试）', value: 'development' }
    ]);
  }

  if (cmdArgs?.nonInteractive || cmdArgs?.skipNginx) {
    config.frontendDeploy = 'pm2';
    config.frontendPort = '3000';
    log.info('使用默认配置: 前端部署 = PM2 serve (端口 3000)');
  } else {
    config.frontendDeploy = await select('前端部署方式：', [
      { label: 'Nginx（性能最优，推荐生产环境）', value: 'nginx' },
      { label: 'PM2 serve（简单快捷，无需额外安装）', value: 'pm2' }
    ]);
  }

  if (config.frontendDeploy === 'nginx') {
    const nginxInstalled = isNginxInstalled();

    if (!nginxInstalled) {
      log.warning('未检测到 Nginx 安装');

      if (process.platform === 'win32') {
        if (!cmdArgs?.nonInteractive) {
          const autoInstall = await ask('是否自动下载并安装 Nginx? (Y/n)', 'Y');
          if (autoInstall.toLowerCase() === 'y') {
            await autoInstallNginx();
          } else {
            log.info('已跳过自动安装，请手动安装 Nginx 后启动服务');
            console.log(`  下载地址: ${colors.cyan}https://nginx.org/en/download.html${colors.reset}`);
            console.log(`  安装路径建议: ${colors.cyan}C:/nginx${colors.reset}`);
          }
        }
      } else if (process.platform === 'linux') {
        if (!cmdArgs?.nonInteractive) {
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
        }
      } else {
        log.info('请使用 Homebrew 安装 Nginx：');
        console.log(`  ${colors.cyan}brew install nginx${colors.reset}`);
      }
    }

    if (!cmdArgs?.nonInteractive) {
      config.frontendPort = await ask('Nginx 监听端口', '80');
      config.domain = await ask('域名（没有则填localhost）', 'localhost');
    } else {
      config.frontendPort = '80';
      config.domain = 'localhost';
    }
  } else {
    if (!cmdArgs?.nonInteractive) {
      config.frontendPort = await ask('前端服务端口', '3000');
    }
  }

  log.divider();
}

module.exports = {
  showNginxInstallGuideLinux,
  autoInstallNginxLinux,
  autoInstallNginx,
  autoConfigureNginx,
  configureServices,
};
