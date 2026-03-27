#!/usr/bin/env node

/**
 * 命令行恢复脚本
 * 用于独立执行数据恢复，支持跨环境迁移
 *
 * 使用方法:
 *   node scripts/restore.js <backup-file> [options]
 *
 * 选项:
 *   --skip-users     跳过用户数据恢复
 *   --skip-files     跳过文件恢复
 *   --no-overwrite   不覆盖现有数据（追加模式）
 *   --help, -h       显示帮助信息
 */

const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const options = {
  file: null,
  skipUsers: false,
  skipFiles: false,
  overwrite: true,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--skip-users':
      options.skipUsers = true;
      break;
    case '--skip-files':
      options.skipFiles = true;
      break;
    case '--no-overwrite':
      options.overwrite = false;
      break;
    case '--help':
    case '-h':
      console.log(`
数据恢复脚本

使用方法:
  node scripts/restore.js <backup-file> [options]

选项:
  --skip-users     跳过用户数据恢复
  --skip-files     跳过文件恢复
  --no-overwrite   不覆盖现有数据（追加模式）
  --help, -h       显示帮助信息

示例:
  node scripts/restore.js backup_2024-01-15.json
  node scripts/restore.js ./backups/backup_xxx.json --skip-users
  node scripts/restore.js /path/to/backup.json --no-overwrite
      `);
      process.exit(0);
    default:
      if (!arg.startsWith('-') && !options.file) {
        options.file = arg;
      }
  }
}

if (!options.file) {
  console.error('错误: 请指定备份文件路径');
  console.error('使用 --help 查看帮助信息');
  process.exit(1);
}

async function runRestore() {
  console.log('========================================');
  console.log('  IDC设备管理系统 - 数据恢复工具');
  console.log('========================================\n');

  const backupFile = path.resolve(options.file);

  if (!fs.existsSync(backupFile)) {
    console.error(`错误: 备份文件不存在: ${backupFile}`);
    process.exit(1);
  }

  try {
    process.chdir(path.join(__dirname, '..'));

    const { restoreBackup, validateBackupFile } = require('../utils/backup');
    const { sequelize } = require('../db');

    console.log('连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功\n');

    console.log('验证备份文件...');
    const validation = await validateBackupFile(backupFile);

    if (!validation.valid) {
      console.error(`错误: 备份文件验证失败: ${validation.error}`);
      process.exit(1);
    }

    console.log('\n备份文件信息:');
    console.log(`  版本: ${validation.version}`);
    console.log(`  类型: ${validation.backupType || 'full'}`);
    console.log(`  时间: ${validation.timestamp}`);
    console.log(`  表数: ${validation.metadata.tableCount}`);
    console.log(`  记录数: ${validation.metadata.totalRecords}`);
    console.log(`  文件数: ${validation.metadata.fileCount || 0}`);

    if (validation.description) {
      console.log(`  描述: ${validation.description}`);
    }

    console.log('\n恢复配置:');
    console.log(`  覆盖模式: ${options.overwrite ? '覆盖现有数据' : '追加模式'}`);
    console.log(`  恢复用户: ${options.skipUsers ? '否' : '是'}`);
    console.log(`  恢复文件: ${options.skipFiles ? '否' : '是'}`);
    console.log('');

    const skipTables = [];
    if (options.skipUsers) {
      skipTables.push('User', 'UserRole', 'Permission');
    }

    console.log('开始恢复数据...\n');

    const result = await restoreBackup(backupFile, {
      overwriteExisting: options.overwrite,
      skipTables,
      skipFiles: options.skipFiles,
      onProgress: (tableName, status, count) => {
        const statusMap = {
          restored: '✓ 已恢复',
          skipped: '○ 已跳过',
          empty: '- 无数据',
          error: '✗ 错误',
        };
        const statusText = statusMap[status] || status;
        const countText = count ? ` (${count} 条)` : '';
        console.log(`  ${tableName.padEnd(25)} ${statusText}${countText}`);
      },
    });

    console.log('\n========================================');
    console.log('  恢复完成!');
    console.log('========================================');
    console.log(`\n恢复统计:`);
    console.log(`  恢复表数: ${result.tablesRestored} 个`);
    console.log(`  恢复记录: ${result.recordsRestored} 条`);
    console.log(`  恢复文件: ${result.filesRestored} 个`);
    console.log(`  完成时间: ${result.restoredAt}`);

    if (result.errors && result.errors.length > 0) {
      console.log(`\n警告: 有 ${result.errors.length} 个错误`);
      result.errors.slice(0, 10).forEach(err => {
        console.log(`  - ${err.table}: ${err.error}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... 还有 ${result.errors.length - 10} 个错误`);
      }
    }

    console.log('\n提示: 请重启后端服务以确保所有数据生效');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n恢复失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runRestore();
