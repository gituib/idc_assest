const fs = require('fs');
const { execSync } = require('child_process');
const { colors, log } = require('./logger');
const { ask, askPassword, select } = require('./ui');
const { config } = require('./config');
const { detectLinuxDistro } = require('./env-check');

async function configureDatabase(cmdArgs) {
  log.step('数据库配置');

  if (cmdArgs?.nonInteractive && cmdArgs?.dbType) {
    config.dbType = cmdArgs.dbType;
    log.info(`使用命令行参数: 数据库类型 = ${config.dbType}`);
  } else if (cmdArgs?.nonInteractive) {
    config.dbType = 'sqlite';
    log.info('使用默认配置: 数据库类型 = sqlite');
  } else {
    const defaultDbType = config.dbType || 'sqlite';
    const defaultIndex = defaultDbType === 'mysql' ? 2 : 1;
    config.dbType = await select('选择数据库类型：', [
      { label: 'SQLite（零配置，适合开发/小规模）', value: 'sqlite' },
      { label: 'MySQL（生产环境推荐）', value: 'mysql' }
    ], defaultIndex);
  }

  if (config.dbType === 'mysql') {
    if (cmdArgs?.nonInteractive) {
      config.dbConfig.host = process.env.MYSQL_HOST || 'localhost';
      config.dbConfig.port = process.env.MYSQL_PORT || '3306';
      config.dbConfig.username = process.env.MYSQL_USER || 'root';
      config.dbConfig.password = process.env.MYSQL_PASSWORD || '';
      config.dbConfig.database = process.env.MYSQL_DATABASE || 'idc_management';
      log.info(`MySQL 配置: ${config.dbConfig.host}:${config.dbConfig.port}/${config.dbConfig.database}`);
    } else {
      const mysqlOption = await select('MySQL 配置方式：', [
        { label: '已有数据库（填写现有 MySQL 连接信息）', value: 'existing' },
        { label: '自动安装 MySQL（Linux 系统支持自动安装配置）', value: 'install' }
      ]);

      if (mysqlOption === 'install') {
        const installResult = await installMySQL();
        if (installResult.success) {
          config.dbConfig = { ...installResult.config };
        } else {
          log.error('MySQL 自动安装失败');
          const fallback = await ask('是否改为手动配置现有 MySQL? (Y/n)', 'Y');
          if (fallback.toLowerCase() === 'y') {
            await configureExistingMySQL();
          } else {
            log.info('已取消 MySQL 配置，将使用 SQLite');
            config.dbType = 'sqlite';
          }
        }
      } else {
        await configureExistingMySQL();
      }
    }

    if (config.dbType === 'mysql') {
      const testResult = await testMySQLConnection();
      if (!testResult.success) {
        log.error(`MySQL 连接测试失败: ${testResult.error}`);
        const retry = cmdArgs?.nonInteractive ? false : await ask('是否重新配置? (Y/n)', 'Y');
        if (retry.toLowerCase() === 'y') {
          return await configureDatabase(cmdArgs);
        }
        log.warning('将继续部署，但数据库可能无法正常工作');
      }
    }
  }

  log.divider();
}

async function configureExistingMySQL() {
  console.log('\n' + colors.yellow + '请确保 MySQL 服务已启动并创建了数据库' + colors.reset);
  console.log(colors.gray + '创建数据库命令: CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;' + colors.reset + '\n');

  config.dbConfig.host = await ask('MySQL 主机地址', config.dbConfig.host || 'localhost');
  config.dbConfig.port = await ask('MySQL 端口', config.dbConfig.port || '3306');
  config.dbConfig.username = await ask('MySQL 用户名', config.dbConfig.username || 'root');
  config.dbConfig.password = await askPassword('MySQL 密码');
  config.dbConfig.database = await ask('数据库名称', config.dbConfig.database || 'idc_management');
}

async function installMySQL() {
  log.subStep('检测系统环境...');

  const platform = process.platform;

  if (platform === 'win32') {
    log.warning('Windows 系统暂不支持自动安装 MySQL');
    console.log('\n' + colors.cyan + '请手动安装 MySQL：' + colors.reset);
    console.log('  1. 下载 MySQL: https://dev.mysql.com/downloads/mysql/');
    console.log('  2. 或使用 XAMPP/WAMP 等集成环境');
    console.log('  3. 安装后创建数据库:');
    console.log(colors.gray + '     CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;' + colors.reset);
    return { success: false };
  }

  if (platform !== 'linux') {
    log.warning('当前系统暂不支持自动安装 MySQL');
    return { success: false };
  }

  const distro = detectLinuxDistro();
  log.info(`检测到 Linux 发行版: ${distro}`);

  const mysqlRootPassword = await askPassword('设置 MySQL root 密码（用于新安装的 MySQL）');
  if (!mysqlRootPassword) {
    log.error('密码不能为空');
    return { success: false };
  }

  log.subStep('开始安装 MySQL...');

  try {
    switch (distro) {
      case 'ubuntu':
      case 'debian':
        await installMySQLDebian(mysqlRootPassword);
        break;
      case 'centos':
      case 'rhel':
      case 'rocky':
      case 'almalinux':
        await installMySQLRHEL(mysqlRootPassword);
        break;
      default:
        log.warning(`暂不支持 ${distro} 自动安装 MySQL`);
        return { success: false };
    }

    config.dbConfig.host = 'localhost';
    config.dbConfig.port = '3306';
    config.dbConfig.username = 'root';
    config.dbConfig.password = mysqlRootPassword;
    config.dbConfig.database = 'idc_management';

    log.subStep('创建数据库...');
    await createMySQLDatabase(mysqlRootPassword);

    log.success('MySQL 安装配置完成');
    return {
      success: true,
      config: {
        host: 'localhost',
        port: '3306',
        username: 'root',
        password: mysqlRootPassword,
        database: 'idc_management'
      }
    };
  } catch (error) {
    log.error(`MySQL 安装失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function installMySQLDebian(rootPassword) {
  log.info('安装 MySQL (Ubuntu/Debian)...');

  execSync('export DEBIAN_FRONTEND=noninteractive', { shell: '/bin/bash' });
  execSync('apt-get update -qq', { shell: '/bin/bash', stdio: 'inherit' });
  execSync(`debconf-set-selections <<< "mysql-server mysql-server/root_password password ${rootPassword}"`, { shell: '/bin/bash' });
  execSync(`debconf-set-selections <<< "mysql-server mysql-server/root_password_again password ${rootPassword}"`, { shell: '/bin/bash' });
  execSync('apt-get install -y -qq mysql-server', { shell: '/bin/bash', stdio: 'inherit' });
  execSync('systemctl start mysql', { shell: '/bin/bash' });
  execSync('systemctl enable mysql', { shell: '/bin/bash' });

  log.success('MySQL 安装完成');
}

async function installMySQLRHEL(rootPassword) {
  log.info('安装 MySQL (CentOS/RHEL)...');

  execSync('yum install -y -q epel-release', { shell: '/bin/bash', stdio: 'inherit' });
  execSync('yum install -y -q mysql-server', { shell: '/bin/bash', stdio: 'inherit' });
  execSync('systemctl start mysqld', { shell: '/bin/bash' });
  execSync('systemctl enable mysqld', { shell: '/bin/bash' });

  try {
    execSync(`mysqladmin -u root password "${rootPassword}"`, { shell: '/bin/bash' });
  } catch {
    log.info('root 密码可能已设置，跳过');
  }

  log.success('MySQL 安装完成');
}

async function createMySQLDatabase(rootPassword) {
  log.subStep('创建数据库...');

  const createDbSql = 'CREATE DATABASE IF NOT EXISTS idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;';

  try {
    execSync(`mysql -u root -p'${rootPassword}' -e "${createDbSql}"`, {
      shell: '/bin/bash',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    log.success('数据库 idc_management 创建成功');
    return;
  } catch (error) {
    const errorMsg = error.stderr ? error.stderr.toString() : error.message;

    if (errorMsg.includes('Access denied') || errorMsg.includes('ERROR 1045')) {
      log.warning('MySQL root 密码验证失败，尝试无密码连接...');
      try {
        execSync(`mysql -u root -e "${createDbSql}"`, {
          shell: '/bin/bash',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        log.success('数据库 idc_management 创建成功');
        return;
      } catch (e2) {
        log.warning(`无密码连接也失败: ${e2.message}`);
      }
    }

    log.warning(`数据库自动创建失败: ${errorMsg.trim()}`);
    log.info('请手动创建数据库:');
    console.log(colors.cyan + '  mysql -u root -p' + colors.reset);
    console.log(colors.cyan + '  CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;' + colors.reset);
  }
}

async function testMySQLConnection() {
  log.subStep('测试 MySQL 连接...');

  try {
    execSync(`mysql -h ${config.dbConfig.host} -P ${config.dbConfig.port} -u ${config.dbConfig.username} -p'${config.dbConfig.password}' -e "SELECT 1" ${config.dbConfig.database}`, {
      shell: '/bin/bash',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });
    log.success('MySQL 连接测试成功');
    return { success: true };
  } catch (error) {
    const errorMsg = error.stderr ? error.stderr.toString() : error.message;

    if (errorMsg.includes('Access denied') || errorMsg.includes('ERROR 1045')) {
      return { success: false, error: '用户名或密码错误' };
    }
    if (errorMsg.includes('Unknown database')) {
      return { success: false, error: `数据库 ${config.dbConfig.database} 不存在` };
    }
    if (errorMsg.includes('Connection refused') || errorMsg.includes("Can't connect")) {
      return { success: false, error: `无法连接到 ${config.dbConfig.host}:${config.dbConfig.port}` };
    }

    return { success: false, error: errorMsg.trim() || '连接失败' };
  }
}

module.exports = {
  configureDatabase,
  configureExistingMySQL,
  installMySQL,
  installMySQLDebian,
  installMySQLRHEL,
  createMySQLDatabase,
  testMySQLConnection,
};
