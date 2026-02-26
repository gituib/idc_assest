# IDC设备管理系统 - 部署指南

本文档详细介绍IDC设备管理系统的多种部署方式，包括开发环境、测试环境、生产环境的配置方法。

---

## 目录

- [快速开始](#快速开始)
- [环境要求](#环境要求)
- [开发环境部署](#开发环境部署)
- [测试环境部署](#测试环境部署)
- [生产环境部署](#生产环境部署)
- [Docker部署](#docker部署)
- [数据库配置](#数据库配置)
- [部署验证](#部署验证)
- [更新升级](#更新升级)
- [监控维护](#监控维护)
- [常见问题](#常见问题)

---

## 快速开始

### 一键部署脚本（推荐）⭐

我们提供了交互式安装脚本，自动完成环境检测、依赖安装、数据库初始化和服务启动。

```bash
# 克隆项目
git clone https://gitee.com/zhang96110/idc_assest.git
cd idc_assest

# 运行部署脚本
npm run deploy
# 或
node install.js
```

**脚本功能：**
- ✅ 自动检测 Node.js、npm、PM2、Nginx
- ✅ Linux 系统支持自动安装 Node.js（交互式）
- ✅ 交互式配置数据库（SQLite/MySQL）
- ✅ 交互式选择前端部署方式（Nginx/PM2 serve）
- ✅ 自动安装项目依赖
- ✅ 自动初始化数据库
- ✅ 自动构建前端项目
- ✅ 使用 PM2 启动和管理服务

---

## 环境要求

### 基础运行环境

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| **操作系统** | Windows 10/11、macOS 12+、Linux (Ubuntu 20.04+/CentOS 8+) | 同最低要求 |
| **Node.js** | ≥14.0.0 | 20.x LTS |
| **npm** | ≥6.0.0 | 10.x |
| **内存** | 4GB | 8GB+ |
| **磁盘空间** | 2GB | 10GB+ |

### 生产环境服务器要求

#### 最低配置

| 资源 | 要求 |
|------|------|
| **CPU** | 2 核心 |
| **内存** | 4GB |
| **磁盘** | 40GB SSD |
| **带宽** | 5Mbps |

#### 推荐配置

| 资源 | 要求 |
|------|------|
| **CPU** | 4 核心+ |
| **内存** | 8GB+ |
| **磁盘** | 100GB SSD |
| **带宽** | 10Mbps+ |

### 软件依赖

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| **Node.js** | ≥14.0.0 (推荐 20.x LTS) | 运行时环境 |
| **npm** | ≥6.0.0 | 包管理器 |
| **PM2** | 5.x+ | 进程管理器（生产环境） |
| **Nginx** | 1.18+ | Web服务器/反向代理 |
| **MySQL** | 8.0+ | 数据库（生产环境，推荐） |
| **SQLite** | -（开发/小型 | 数据库部署） |

### 端口要求

| 端口 | 用途 | 协议 |
|------|------|------|
| 8000 | 后端API服务 | HTTP |
| 3000 | 前端开发服务 | HTTP |
| 80 | Nginx HTTP | HTTP |
| 443 | Nginx HTTPS | HTTPS |

---

## 开发环境部署

### 1. 环境准备

#### Windows

**方式一：官方安装包（推荐）**
1. 访问: https://nodejs.org/
2. 下载 LTS 版本（推荐 v20.x）
3. 运行安装包，按向导完成安装

**方式二：nvm-windows（推荐开发者）**
1. 下载安装 nvm-windows: https://github.com/coreybutler/nvm-windows/releases
2. 执行: `nvm install 20`
3. 执行: `nvm use 20`

**方式三：Winget（Windows 10/11）**
```powershell
winget install OpenJS.NodeJS.LTS
```

#### macOS

**方式一：Homebrew（推荐）**
```bash
brew install node@20
```

**方式二：nvm（推荐开发者）**
```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装 Node.js 20
nvm install 20
nvm use 20
```

#### Linux

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**CentOS/RHEL/Fedora:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

**使用 nvm（推荐开发者）:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

### 2. 克隆项目

```bash
# 从Gitee克隆（国内访问更快）
git clone https://gitee.com/zhang96110/idc_assest.git

# 或从GitHub克隆
git clone https://github.com/gituib/idc_assest.git

cd idc_assest
```

### 3. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖（新终端）
cd ../frontend
npm install
```

### 4. 配置环境变量

```bash
cd ../backend
cp .env.example .env
```

编辑 `.env` 文件（开发环境使用默认SQLite配置即可）：

```env
# 开发环境配置
NODE_ENV=development
PORT=8000
DB_TYPE=sqlite
DB_PATH=./idc_management.db

# JWT配置（开发环境可使用简单密钥）
JWT_SECRET=dev_secret_key_change_in_production
JWT_EXPIRES_IN=7d
```

### 5. 初始化数据库

```bash
node scripts/init-database.js
```

### 6. 启动服务

**同时启动前后端（推荐）：**
```bash
# 项目根目录
npm start
```

**分别启动：**
```bash
# 终端1 - 启动后端（端口8000）
cd backend
npm run dev

# 终端2 - 启动前端（端口3000）
cd frontend
npm run dev
```

### 7. 访问开发环境

| 服务 | 地址 |
|------|------|
| 前端应用 | http://localhost:3000 |
| 后端API | http://localhost:8000/api |
| 健康检查 | http://localhost:8000/health |

### 8. 开发命令

```bash
# 项目根目录命令
npm start                 # 同时启动前后端
npm run start:backend    # 仅启动后端
npm run start:frontend  # 仅启动前端
npm run install:all     # 安装所有依赖

# 后端命令
cd backend
npm run dev             # 开发模式启动（热重载）
npm start               # 生产模式启动

# 前端命令
cd frontend
npm run dev             # 开发模式启动
npm run build           # 构建生产版本
npm run preview         # 预览生产版本
```

---

## 测试环境部署

### 1. 服务器准备

测试环境配置要求：

| 项目 | 配置 |
|------|------|
| **操作系统** | Ubuntu 20.04 LTS / CentOS 8 |
| **Node.js** | 20.x LTS |
| **内存** | 4GB |
| **磁盘** | 20GB SSD |
| **数据库** | MySQL 8.0（与生产一致） |

### 2. 配置数据库

```bash
# 安装MySQL
sudo apt update
sudo apt install -y mysql-server

# 启动MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 创建数据库和用户
sudo mysql
```

```sql
CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'idc_test'@'localhost' IDENTIFIED BY 'test_password';
GRANT ALL PRIVILEGES ON idc_management.* TO 'idc_test'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：

```env
NODE_ENV=test
PORT=8000
DB_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=idc_test
MYSQL_PASSWORD=test_password
MYSQL_DATABASE=idc_management
JWT_SECRET=test_jwt_secret_key
JWT_EXPIRES_IN=24h
```

### 4. 安装依赖并初始化

```bash
# 安装后端依赖
cd backend
npm install

# 初始化数据库
node scripts/init-database.js

# 安装前端依赖并构建
cd ../frontend
npm install
npm run build
```

### 5. 使用PM2启动服务

```bash
# 安装PM2
npm install -g pm2

# 启动后端服务
cd ../backend
pm2 start server.js --name "idc-test-backend" --env test

# 启动前端静态服务
cd ../frontend
pm2 serve --name "idc-test-frontend" -s dist -l 3000

# 保存PM2配置
pm2 save

# 配置开机自启
pm2 startup
```

### 6. 测试验证

```bash
# 测试后端API
curl http://localhost:8000/health

# 测试前端
curl http://localhost:3000
```

---

## 生产环境部署

### 1. 服务器要求

#### 硬件要求

| 规模 | CPU | 内存 | 磁盘 |
|------|-----|------|------|
| 小型（<100设备） | 2核心 | 4GB | 40GB |
| 中型（100-500设备） | 4核心 | 8GB | 80GB |
| 大型（>500设备） | 8核心+ | 16GB+ | 100GB+ |

#### 软件要求

| 软件 | 版本 | 说明 |
|------|------|------|
| 操作系统 | Ubuntu 20.04+ / CentOS 8+ | 推荐 Ubuntu 22.04 LTS |
| Node.js | 20.x LTS | 运行时环境 |
| MySQL | 8.0+ | 数据库 |
| Nginx | 1.18+ | 反向代理/静态文件 |
| PM2 | 5.x+ | 进程管理 |

### 2. 系统配置

#### 创建部署用户（非root）

```bash
# 创建用户
sudo adduser idcadmin

# 赋予sudo权限
sudo usermod -aG sudo idcadmin

# 切换到部署用户
sudo su - idcadmin
```

#### 配置防火墙

```bash
# Ubuntu
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# CentOS
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 3. 安装软件

#### 安装Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2
sudo npm install -g pm2
```

#### 安装MySQL

```bash
# Ubuntu
sudo apt install -y mysql-server

sudo apt update
# 启动并配置
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### 安装Nginx

```bash
# Ubuntu
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. 配置数据库

```bash
sudo mysql
```

```sql
-- 创建数据库
CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（生产环境使用强密码）
CREATE USER 'idc_prod'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON idc_management.* TO 'idc_prod'@'localhost';
FLUSH PRIVILEGES;

EXIT;
```

### 5. 部署项目

#### 克隆项目

```bash
cd /var/www
sudo git clone https://gitee.com/zhang96110/idc_assest.git
sudo chown -R idcadmin:idcadmin idc_assest
```

#### 配置环境变量

```bash
cd /var/www/idc_assest/backend
cp .env.example .env
nano .env
```

编辑 `.env` 文件：

```env
# 生产环境配置
NODE_ENV=production
PORT=8000
DB_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=idc_prod
MYSQL_PASSWORD=YOUR_STRONG_PASSWORD_HERE
MYSQL_DATABASE=idc_management

# JWT配置（使用强随机密钥）
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=24h

# 日志配置
LOG_LEVEL=info
```

### 6. 安装依赖

```bash
# 安装后端依赖
cd /var/www/idc_assest/backend
npm install --production

# 安装前端依赖并构建
cd ../frontend
npm install
npm run build
```

### 7. 初始化数据库

```bash
cd ../backend
node scripts/init-database.js
```

### 8. 配置PM2

```bash
# 创建PM2配置文件
nano /var/www/idc_assest/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'idc-backend',
      script: './server.js',
      cwd: '/var/www/idc_assest/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      max_memory_restart: '1G',
      log_file: '/var/log/idc/combined.log',
      out_file: '/var/log/idc/out.log',
      error_file: '/var/log/idc/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false
    }
  ]
};
```

```bash
# 创建日志目录
sudo mkdir -p /var/log/idc
sudo chown -R idcadmin:idcadmin /var/log/idc

# 启动服务
cd /var/www/idc_assest
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 9. 配置Nginx

```bash
sudo nano /etc/nginx/sites-available/idc
```

```nginx
upstream idc_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name your-domain.com;  # 替换为实际域名

    # 前端静态文件
    root /var/www/idc_assest/frontend/dist;
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 前端路由支持（SPA）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://idc_backend;
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
        proxy_pass http://idc_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50M;
    }

    # 健康检查
    location /health {
        proxy_pass http://idc_backend/health;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/idc /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 10. 配置SSL证书（可选）

使用 Let's Encrypt 免费证书：

```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

---

## Docker部署

### 使用 Docker Compose（推荐）

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - DB_TYPE=mysql
      - MYSQL_HOST=mysql
      - MYSQL_PORT=3306
      - MYSQL_USERNAME=idc_user
      - MYSQL_PASSWORD=idc_password
      - MYSQL_DATABASE=idc_management
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
    depends_on:
      - mysql
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=idc_management
      - MYSQL_USER=idc_user
      - MYSQL_PASSWORD=idc_password
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

### 启动服务

```bash
docker-compose up -d
```

---

## 数据库配置

### SQLite（开发环境/小规模）

- 默认配置，无需额外设置
- 数据库文件：`backend/idc_management.db`
- 优点：零配置，便携
- 缺点：不适合高并发，单文件限制

### MySQL（生产环境推荐）

#### 创建数据库

```sql
CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 配置优化

```ini
# my.cnf 或 my.ini
[mysqld]
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
max_connections=200
innodb_buffer_pool_size=1G
```

### 数据备份

#### SQLite备份

```bash
# 手动备份
cp backend/idc_management.db backup/database_$(date +%Y%m%d).db
```

#### MySQL备份

```bash
# 手动备份
mysqldump -u idc_prod -p idc_management > backup/database_$(date +%Y%m%d).sql

# 自动备份脚本
#!/bin/bash
BACKUP_DIR="/var/backups/idc"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u idc_prod -pYourPassword idc_management > "$BACKUP_DIR/database_$DATE.sql"
gzip "$BACKUP_DIR/database_$DATE.sql"

# 清理30天前的备份
find $BACKUP_DIR -name "database_*.gz" -mtime +30 -delete
```

添加到crontab：
```bash
crontab -e
# 每天凌晨2点执行
0 2 * * * /path/to/backup_script.sh
```

---

## 部署验证

### 1. 服务状态检查

```bash
# PM2服务状态
pm2 status

# Nginx状态
sudo systemctl status nginx

# MySQL状态
sudo systemctl status mysql
```

### 2. 接口验证

```bash
# 健康检查
curl http://localhost:8000/health

# API测试
curl http://localhost:8000/api/rooms

# 上传接口测试
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 3. 日志检查

```bash
# PM2日志
pm2 logs idc-backend

# 错误日志
pm2 logs idc-backend --err

# Nginx错误日志
sudo tail -f /var/log/nginx/error.log
```

### 4. 性能测试

```bash
# 使用curl测试响应时间
time curl -o /dev/null -s -w "%{http_code}\n" http://localhost:8000/health
```

---

## 更新升级

### 方式一：一键更新脚本（推荐）

```bash
npm run update
```

功能：自动备份 → 拉取代码 → 更新依赖 → 重建前端 → 重启服务

### 方式二：手动更新

#### 1. 备份数据

```bash
# 备份数据库
mysqldump -u idc_prod -p idc_management > /var/backups/idc/database_backup_$(date +%Y%m%d).sql

# 或备份SQLite
cp backend/idc_management.db /var/backups/idc/
```

#### 2. 拉取最新代码

```bash
cd /var/www/idc_assest
git pull origin main
```

#### 3. 更新依赖

```bash
# 更新后端依赖
cd backend
npm install

# 更新前端依赖并构建
cd ../frontend
npm install
npm run build
```

#### 4. 运行数据库迁移（如有）

```bash
cd ../backend
node scripts/migrate-all.js
```

#### 5. 重启服务

```bash
pm2 restart idc-backend
sudo nginx -t && sudo nginx -s reload
```

---

## 监控维护

### 服务管理命令

```bash
# PM2 管理
pm2 status                    # 查看服务状态
pm2 logs idc-backend          # 查看后端日志
pm2 logs idc-backend --err    # 查看错误日志
pm2 restart idc-backend       # 重启后端服务
pm2 stop idc-backend          # 停止后端服务
pm2 delete idc-backend        # 删除后端服务
pm2 save                      # 保存当前进程列表
pm2 startup                   # 配置开机自启
pm2 monit                     # 实时监控

# Nginx 管理
sudo nginx -t                 # 测试配置
sudo systemctl restart nginx  # 重启服务
sudo systemctl status nginx   # 查看状态
```

### 性能监控

#### PM2配置（`ecosystem.config.js`）

```javascript
module.exports = {
  apps: [{
    name: 'idc-backend',
    script: './server.js',
    cwd: './backend',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    autorestart: true,
    env: {
      NODE_ENV: 'production'
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

---

## 常见问题

### 端口冲突

```bash
# 检查端口占用
# Linux
netstat -tulpn | grep :8000

# Windows
netstat -ano | findstr :8000

# 修改端口
# 编辑 backend/.env 文件
PORT=8001
```

### 依赖安装失败

```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 数据库连接失败

**MySQL：**
- 检查服务状态：`sudo systemctl status mysql`
- 验证连接参数（主机、端口、用户名、密码）
- 确认数据库已创建
- 检查防火墙设置
- 确认用户权限：`SHOW GRANTS FOR 'idc_prod'@'localhost'`

### 前端构建失败

```bash
# 检查 Node.js 版本
node -v

# 清理并重新构建
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

### 权限问题

```bash
# 修复文件权限
sudo chown -R $(whoami):$(whoami) /var/www/idc_assest

# 上传目录权限
sudo chmod -R 777 backend/uploads
```

### 内存不足

```bash
# 增加 Node.js 内存限制
node --max-old-space-size=4096 server.js

# PM2 配置
pm2 start server.js --name "idc-backend" --node-args="--max-old-space-size=4096"
```

### Nginx 502 Bad Gateway

1. 检查后端服务是否运行：`pm2 status`
2. 检查后端端口是否监听：`netstat -tulpn | grep 8000`
3. 检查Nginx配置：`nginx -t`
4. 查看错误日志：`tail -f /var/log/nginx/error.log`

### SSL证书问题

```bash
# 检查证书是否过期
sudo certbot certificates

# 手动续期
sudo certbot renew

# 查看证书详情
sudo certbot certificates
```

---

## 项目结构

```
idc_assest/
├── backend/              # 后端服务
│   ├── middleware/       # 中间件（认证、验证）
│   ├── models/          # 数据模型（Sequelize）
│   ├── routes/          # API路由
│   ├── scripts/         # 数据库脚本
│   ├── uploads/        # 文件上传目录
│   ├── validation/     # 数据验证Schema
│   ├── server.js       # 服务入口
│   └── package.json
├── frontend/            # 前端应用
│   ├── src/
│   │   ├── api/        # API接口
│   │   ├── components/ # 组件
│   │   ├── pages/      # 页面
│   │   └── utils/      # 工具函数
│   ├── dist/           # 构建输出
│   └── package.json
├── docs/                # 项目文档
│   ├── api/             # 接口文档
│   └── images/          # 文档图片
├── install.js           # 交互式安装脚本 ⭐
├── update.js            # 一键更新脚本 ⭐
├── uninstall.js         # 卸载脚本
├── check.js             # 环境检查脚本
├── modify.js            # 配置修改脚本
├── package.json
├── README.md            # 项目说明
├── CHANGELOG.md         # 版本记录
└── DEPLOYMENT.md       # 本文件
```

---

**⭐ 如果这个部署指南对您有帮助，请给我们一个Star！**
