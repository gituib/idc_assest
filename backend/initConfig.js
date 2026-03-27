const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_FILE_PATH = path.join(__dirname, '.env');

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('base64');
}

function parseEnvContent(content) {
  const lines = content.split('\n');
  const result = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmed.substring(0, equalIndex).trim();
      const value = trimmed.substring(equalIndex + 1).trim();
      result[key] = value;
    }
  }

  return result;
}

function stringifyEnvContent(envObj, originalContent) {
  const lines = originalContent.split('\n');
  const updatedLines = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      updatedLines.push(line);
      continue;
    }

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmed.substring(0, equalIndex).trim();

      if (key === 'JWT_SECRET' && envObj.hasOwnProperty('JWT_SECRET')) {
        updatedLines.push(`JWT_SECRET=${envObj.JWT_SECRET}`);
      } else {
        updatedLines.push(line);
      }
    } else {
      updatedLines.push(line);
    }
  }

  return updatedLines.join('\n');
}

function ensureJwtSecret() {
  const currentSecret = process.env.JWT_SECRET;

  if (currentSecret && currentSecret.length >= 32) {
    console.log('✓ JWT_SECRET 已配置');
    return currentSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[致命错误] 生产环境未设置 JWT_SECRET 环境变量！\n' +
        '请在服务器环境变量中设置强密钥（至少32位随机字符）。\n' +
        '生成命令（PowerShell）：-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })'
    );
  }

  const newSecret = generateSecret(64);
  console.log('⚠️  JWT_SECRET 未配置或长度不足，正在自动生成...');

  try {
    if (fs.existsSync(ENV_FILE_PATH)) {
      const originalContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
      const updatedContent = stringifyEnvContent({ JWT_SECRET: newSecret }, originalContent);
      fs.writeFileSync(ENV_FILE_PATH, updatedContent, 'utf-8');
      console.log('✓ JWT_SECRET 已自动生成并保存到 .env 文件');
    } else {
      const defaultContent = `# IDC设备管理系统 - 环境配置
# 自动生成时间: ${new Date().toISOString()}

JWT_SECRET=${newSecret}
`;
      fs.writeFileSync(ENV_FILE_PATH, defaultContent, 'utf-8');
      console.log('✓ JWT_SECRET 已自动生成并创建 .env 文件');
    }

    process.env.JWT_SECRET = newSecret;
    return newSecret;
  } catch (err) {
    console.warn('⚠️  无法保存 JWT_SECRET 到 .env 文件，使用临时密钥（重启后失效）');
    console.warn('   错误信息:', err.message);
    process.env.JWT_SECRET = newSecret;
    return newSecret;
  }
}

module.exports = {
  ensureJwtSecret,
  generateSecret,
};
