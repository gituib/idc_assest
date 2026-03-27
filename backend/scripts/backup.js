#!/usr/bin/env node

/**
 * 命令行备份脚本
 * 用于独立执行数据备份，支持环境迁移
 *
 * 使用方法:
 *   node scripts/backup.js [options]
 *
 * 选项:
 *   --output, -o    指定备份文件输出路径
 *   --description   备份描述
 *   --no-files      不包含上传文件
 *   --help, -h      显示帮助信息
 */

const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const options = {
  output: null,
  description: '',
  includeFiles: true,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--output':
    case '-o':
      options.output = args[++i];
      break;
    case '--description':
      options.description = args[++i];
      break;
    case '--no-files':
      options.includeFiles = false;
      break;
    case '--help':
    case '-h':
      console.log(`
数据备份脚本

使用方法:
  node scripts/backup.js [options]

选项:
  --output, -o <path>    指定备份文件输出路径
  --description <text>   备份描述
  --no-files             不包含上传文件
  --help, -h             显示帮助信息

示例:
  node scripts/backup.js
  node scripts/backup.js -o /path/to/backup.json
  node scripts/backup.js --description "迁移前备份" --no-files
      `);
      process.exit(0);
  }
}

async function runBackup() {
  console.log('========================================');
  console.log('  IDC设备管理系统 - 数据备份工具');
  console.log('========================================\n');

  try {
    process.chdir(path.join(__dirname, '..'));

    const { createBackup, getBackupPath } = require('../utils/backup');
    const { sequelize } = require('../db');

    console.log('连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功\n');

    const backupPath = options.output ? path.dirname(options.output) : getBackupPath();

    console.log('备份配置:');
    console.log(`  输出路径: ${backupPath}`);
    console.log(`  包含文件: ${options.includeFiles ? '是' : '否'}`);
    if (options.description) {
      console.log(`  备份描述: ${options.description}`);
    }
    console.log('');

    const result = await createBackup({
      description: options.description,
      includeFiles: options.includeFiles,
      backupPath: options.output ? path.dirname(options.output) : null,
    });

    if (options.output) {
      const targetPath = options.output;
      const sourcePath = result.path;
      if (sourcePath !== targetPath) {
        fs.copyFileSync(sourcePath, targetPath);
        result.path = targetPath;
        result.filename = path.basename(targetPath);
      }
    }

    console.log('\n========================================');
    console.log('  备份完成!');
    console.log('========================================');
    console.log(`\n备份文件: ${result.filename}`);
    console.log(`完整路径: ${result.path}`);
    console.log(`文件大小: ${(result.size / 1024).toFixed(2)} KB`);
    console.log(`数据记录: ${result.recordCount} 条`);
    console.log(`文件数量: ${result.fileCount} 个`);
    console.log(`创建时间: ${result.createdAt}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n备份失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runBackup();
