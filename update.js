#!/usr/bin/env node

/**
 * IDC设备管理系统 - 一键更新脚本
 * 功能：拉取最新代码 → 安装依赖 → 重建前端 → 重启服务
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.bright}${colors.cyan}▶ ${msg}${colors.reset}`),
  divider: () => console.log(`${colors.gray}${'─'.repeat(60)}${colors.reset}`)
};

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

async function main() {
  console.log(`
${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════╗
║     IDC设备管理系统 - 一键更新脚本                          ║
║     One-Click Update Script                               ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // 1. 备份数据库
    log.step('1. 备份数据');
    const envPath = path.join(__dirname, 'backend', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const dbTypeMatch = envContent.match(/DB_TYPE=(\w+)/);
      const dbType = dbTypeMatch ? dbTypeMatch[1] : 'sqlite';

      if (dbType === 'sqlite') {
        const dbPath = path.join(__dirname, 'backend', 'idc_management.db');
        const backupDir = path.join(__dirname, 'backup');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        const backupPath = path.join(backupDir, `database_${Date.now()}.db`);
        if (fs.existsSync(dbPath)) {
          fs.copyFileSync(dbPath, backupPath);
          log.success(`数据库已备份: ${backupPath}`);
        }
      } else {
        log.warning('MySQL数据库请手动备份');
        console.log(`  ${colors.gray}mysqldump -u username -p idc_management > backup_${Date.now()}.sql${colors.reset}`);
      }
    }

    // 2. 拉取最新代码
    log.step('2. 拉取最新代码');
    const gitResult = runCommand('git pull');
    if (gitResult.success) {
      log.success('代码更新完成');
    } else {
      log.warning('代码拉取失败或不是git仓库，跳过');
    }

    // 3. 更新后端依赖
    log.step('3. 更新后端依赖');
    const backendResult = runCommand('npm install', { cwd: path.join(__dirname, 'backend') });
    if (backendResult.success) {
      log.success('后端依赖更新完成');
    } else {
      log.error('后端依赖更新失败');
    }

    // 4. 更新前端依赖并构建
    log.step('4. 更新前端依赖并构建');
    const frontendInstall = runCommand('npm install', { cwd: path.join(__dirname, 'frontend') });
    if (frontendInstall.success) {
      log.success('前端依赖更新完成');

      const frontendBuild = runCommand('npm run build', { cwd: path.join(__dirname, 'frontend') });
      if (frontendBuild.success) {
        log.success('前端构建完成');
      } else {
        log.error('前端构建失败');
      }
    } else {
      log.error('前端依赖更新失败');
    }

    // 5. 重启服务
    log.step('5. 重启服务');
    const restartResult = runCommand('pm2 restart idc-backend');
    if (restartResult.success) {
      log.success('后端服务已重启');
    } else {
      log.error('后端服务重启失败，请手动执行: pm2 restart idc-backend');
    }

    // 检查是否有前端PM2服务
    const frontendRestart = runCommand('pm2 restart idc-frontend 2>nul || echo "frontend not found"', { silent: true });
    if (frontendRestart.success && !frontendRestart.output.includes('frontend not found')) {
      log.success('前端服务已重启');
    }

    log.divider();
    log.success('更新完成！');
    console.log(`\n${colors.cyan}访问地址:${colors.reset}`);
    console.log(`  后端API: http://localhost:8000/api`);
    console.log(`  前端页面: http://localhost`);

  } catch (error) {
    log.error(`更新失败: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
