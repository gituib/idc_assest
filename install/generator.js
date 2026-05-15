const fs = require('fs');
const path = require('path');
const { colors, ICONS, log } = require('./logger');
const { generateSecretKey } = require('./utils');
const { config } = require('./config');
const { ask } = require('./ui');

function generateBackendEnv() {
  const envPath = path.join(__dirname, '..', 'backend', '.env');

  try {
    const jwtSecret = generateSecretKey(64);

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
# 安全配置
# ==============================================

# JWT 密钥（自动生成，请妥善保管）
JWT_SECRET=${jwtSecret}

# ==============================================
# 数据库配置
# ==============================================

# 数据库类型: sqlite 或 mysql
DB_TYPE=${config.dbType}
`;

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

  fs.writeFileSync(envPath, envContent);

  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(envPath, 0o600);
      log.success('.env 文件权限已设为 600（仅所有者可读写）');
    } catch {
      log.warning('.env 文件权限设置失败，建议手动执行: chmod 600 backend/.env');
    }
  }

  log.success('后端环境变量文件已生成 (.env)');
  log.info(`JWT_SECRET 已自动生成 (${jwtSecret.length}位)`);
  log.warning('请妥善保管 .env 文件，切勿提交到版本控制系统');
  } catch (error) {
    log.error(`后端环境变量文件生成失败: ${error.message}`);
    throw new Error('Backend env generation failed');
  }
}

function generatePM2Config() {
  const deployDir = path.join(__dirname, '..', 'deploy');

  try {
    if (!fs.existsSync(deployDir)) {
      fs.mkdirSync(deployDir, { recursive: true });
    }

  const pm2Config = {
    apps: [{
      name: 'idc-backend',
      script: './server.js',
      cwd: path.join(__dirname, '..', 'backend'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: config.backendPort
      },
      max_memory_restart: '1G',
      log_file: path.join(__dirname, '..', 'backend', 'logs', 'combined.log'),
      out_file: path.join(__dirname, '..', 'backend', 'logs', 'out.log'),
      error_file: path.join(__dirname, '..', 'backend', 'logs', 'error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true
    }]
  };

  if (config.frontendDeploy === 'pm2') {
    pm2Config.apps.push({
      name: 'idc-frontend',
      script: 'serve',
      cwd: path.join(__dirname, '..', 'frontend'),
      args: `-s dist -l ${config.frontendPort}`,
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '500M',
      autorestart: true
    });
  }

  fs.writeFileSync(
    path.join(deployDir, 'ecosystem.config.js'),
    `module.exports = ${JSON.stringify(pm2Config, null, 2)};`
  );
  log.success('PM2 配置文件已生成 (deploy/ecosystem.config.js)');
  } catch (error) {
    log.error(`PM2 配置文件生成失败: ${error.message}`);
    throw new Error('PM2 config generation failed');
  }
}

function generateNginxConfig() {
  if (config.frontendDeploy !== 'nginx') return;

  const deployDir = path.join(__dirname, '..', 'deploy');

  try {
    if (!fs.existsSync(deployDir)) {
      fs.mkdirSync(deployDir, { recursive: true });
    }

  const isWindows = process.platform === 'win32';

  let frontendPath;
  if (isWindows) {
    frontendPath = path.join(__dirname, '..', 'frontend', 'dist').replace(/\\/g, '/');
  } else {
    frontendPath = '/var/www/idc';
  }

  config.nginxRoot = frontendPath;

  const nginxConfig = `# IDC设备管理系统 - Nginx配置
# 生成时间: ${new Date().toISOString()}

server {
    listen ${config.frontendPort};
    server_name ${config.domain};

    client_max_body_size 100M;

    # 前端静态文件目录
    root "${frontendPath}";
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json application/x-javascript image/svg+xml;

    # 静态资源缓存（1年）
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|hdr)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # API代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:${config.backendPort}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
        proxy_buffering off;
    }

    # 文件上传代理
    location /uploads/ {
        proxy_pass http://127.0.0.1:${config.backendPort}/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 100M;
    }

    # 前端路由支持（SPA单页应用，必须放在最后）
    location / {
        try_files $uri $uri/ /index.html =404;
    }
}
`;

  fs.writeFileSync(path.join(deployDir, 'nginx-idc.conf'), nginxConfig);
  log.success('Nginx 配置文件已生成 (deploy/nginx-idc.conf)');

  if (isWindows) {
    log.info('Windows Nginx 配置路径示例:');
    console.log(`  ${ICONS.pipe}  将配置文件复制到: ${colors.cyan}C:/nginx/conf/conf.d/idc.conf${colors.reset}`);
    console.log(`  ${ICONS.pipe}  或修改主配置 include: ${colors.cyan}C:/nginx/conf/nginx.conf${colors.reset}`);
  }
  } catch (error) {
    log.error(`Nginx 配置文件生成失败: ${error.message}`);
    throw new Error('Nginx config generation failed');
  }
}

async function confirmConfiguration() {
  log.step('配置确认');

  console.log(`  ${colors.bright}部署配置摘要${colors.reset}`);
  log.thickDivider();

  log.keyValue('数据库类型', config.dbType);
  if (config.dbType === 'mysql') {
    log.keyValue('MySQL 主机', `${config.dbConfig.host}:${config.dbConfig.port}`);
    log.keyValue('数据库名', config.dbConfig.database);
    log.keyValue('用户名', config.dbConfig.username);
  }
  log.keyValue('后端端口', String(config.backendPort));
  log.keyValue('运行环境', config.nodeEnv);
  log.keyValue('前端部署', config.frontendDeploy);
  log.keyValue('前端端口', String(config.frontendPort));
  if (config.frontendDeploy === 'nginx') {
    log.keyValue('域名', config.domain);
  }

  log.thickDivider();

  const confirm = await ask('确认以上配置并开始部署? (Y/n)', 'Y');
  if (confirm.toLowerCase() !== 'y') {
    log.info('已取消部署');
    process.exit(0);
  }

  log.divider();
}

module.exports = {
  generateBackendEnv,
  generatePM2Config,
  generateNginxConfig,
  confirmConfiguration,
};
