# IDC设备管理系统 - 安装部署指南

本文档详细介绍IDC设备管理系统的多种部署方式，包括开发环境、生产环境的配置方法。

---

## 目录

- [快速开始](#快速开始)
- [环境要求](#环境要求)
- [开发环境部署](#开发环境部署)
- [生产环境部署](#生产环境部署)
- [Docker部署](#docker部署)
- [数据库配置](#数据库配置)
- [更新升级](#更新升级)
- [监控维护](#监控维护)
- [常见问题](#常见问题)

---

## 快速开始

### 一键部署脚本（推荐）⭐

我们提供了交互式安装脚本，自动完成环境检测、依赖安装、数据库初始化和服务启动。

```bash
# 方式一：使用 npm
npm run deploy

# 方式二：直接运行
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

**Linux 自动安装 Node.js：**
- 支持 Ubuntu、Debian、CentOS、RHEL、Fedora、Arch
- 自动检测发行版并使用对应安装方式
- 无需手动下载，一键完成

---

## 环境要求

| 项目 | 要求 | 说明 |
|------|------|------|
| Node.js | ≥14.0.0（推荐 20.x LTS） | 运行环境 |
| npm | ≥6.0.0 | 包管理器（随 Node.js 安装） |
| 操作系统 | Windows 10/11、macOS、Linux | 支持主流操作系统 |
| 内存 | 开发：4GB+ / 生产：8GB+ | 根据数据量调整 |
| 磁盘空间 | ≥2GB | 包含依赖和日志 |

### Node.js 安装

#### Linux（自动安装）

运行 `node install.js`，选择自动安装即可。

#### Linux（手动安装）

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

**Arch Linux:**
```bash
sudo pacman -S nodejs npm
```

**使用 nvm（推荐开发者）:**
```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装 Node.js 20
nvm install 20
nvm use 20
```

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

**方式二：官方安装包**
1. 访问: https://nodejs.org/
2. 下载 macOS 安装包并安装

**方式三：nvm（推荐开发者）**
```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装 Node.js 20
nvm install 20
nvm use 20
```

---

## 开发环境部署

### 1. 克隆项目

**方式一：从GitHub克隆（推荐）**
```bash
git clone https://github.com/gituib/idc_assest.git
cd idc_assest
```

**方式二：从Gitee克隆（国内访问更快）**
```bash
git clone https://gitee.com/zhang96110/idc_assest.git
cd idc_assest
```

### 2. 安装依赖

```bash
# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install
```

### 3. 配置环境变量

```bash
cd ../backend
cp .env.example .env
```

编辑 `.env` 文件（开发环境使用默认SQLite配置即可）：
```env
NODE_ENV=development
PORT=8000
DB_TYPE=sqlite
```

### 4. 启动服务

**启动后端（端口8000）：**
```bash
cd backend
npm run dev
```

**启动前端（端口3000）- 新终端：**
```bash
cd frontend
npm run dev
```

**访问地址：**
- 前端应用：http://localhost:3000
- 后端API：http://localhost:8000/api
- 健康检查：http://localhost:8000/health

### 5. 开发脚本

```bash
# 同时启动前后端（项目根目录）
npm start

# 仅启动后端
npm run start:backend

# 仅启动前端
npm run start:frontend

# 安装所有依赖
npm run install:all
```

---

## 生产环境部署

### 方式一：一键部署脚本（推荐）

```bash
npm run deploy
```

按提示选择：
- 数据库类型：SQLite 或 MySQL
- 前端部署方式：Nginx（推荐）或 PM2 serve
- 是否自动安装 Nginx（Windows）

### 方式二：手动部署

#### 后端部署

##### 1. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：
```env
NODE_ENV=production
PORT=8000
DB_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=idc_user
MYSQL_PASSWORD=secure_password
MYSQL_DATABASE=idc_management
JWT_SECRET=your_jwt_secret_key_here
```

##### 2. 安装生产依赖

```bash
npm install --production
```

##### 3. 配置数据库

**创建数据库：**
```sql
CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'idc_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON idc_management.* TO 'idc_user'@'localhost';
FLUSH PRIVILEGES;
```

##### 4. 初始化数据库

```bash
node scripts/init-database.js
```

##### 5. 使用PM2管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name "idc-backend" --cwd ./backend --env production

# 配置开机自启
pm2 startup
pm2 save
```

#### 前端部署

##### 1. 构建生产版本

```bash
cd frontend
npm install
npm run build
```

构建输出目录：`frontend/dist/`

##### 2. 部署静态文件

**Nginx 方式（推荐）：**
```bash
# 复制构建文件到Nginx目录
sudo cp -r frontend/dist/* /var/www/idc-frontend/
sudo chown -R www-data:www-data /var/www/idc-frontend
sudo chmod -R 755 /var/www/idc-frontend
```

**PM2 serve 方式：**
```bash
npm install -g serve
pm2 start serve --name "idc-frontend" -- -s frontend/dist -l 3000
```

### Nginx配置

#### 1. 创建配置文件

**Linux:**
```bash
sudo nano /etc/nginx/sites-available/idc_assest
```

**Windows:**
编辑 `C:\nginx\conf\nginx.conf` 或在 `conf.d` 目录创建新配置

#### 2. 配置内容

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/idc-frontend;
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
    
    # 前端路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API代理
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 文件上传代理
    location /uploads {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50M;
    }
}
```

#### 3. 启用配置

**Linux:**
```bash
sudo ln -s /etc/nginx/sites-available/idc_assest /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Windows:**
```cmd
nginx -t
nginx -s reload
```

### SSL证书配置（可选）

**使用 Let's Encrypt（Linux）：**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

**手动配置SSL：**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # ... 其他配置
}

# HTTP重定向到HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
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

启动服务：
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

#### 创建用户

```sql
CREATE USER 'idc_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON idc_management.* TO 'idc_user'@'localhost';
FLUSH PRIVILEGES;
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

# 自动备份脚本
#!/bin/bash
BACKUP_DIR="/var/backups/idc_assest"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp backend/idc_management.db "$BACKUP_DIR/database_$DATE.db"
gzip "$BACKUP_DIR/database_$DATE.db"

# 清理30天前的备份
find $BACKUP_DIR -name "database_*.gz" -mtime +30 -delete
```

#### MySQL备份

```bash
# 手动备份
mysqldump -u idc_user -p idc_management > backup/database_$(date +%Y%m%d).sql

# 自动备份脚本
#!/bin/bash
BACKUP_DIR="/var/backups/idc_assest"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mysqldump -u idc_user -pYourPassword idc_management > "$BACKUP_DIR/database_$DATE.sql"
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

## 更新升级

### 方式一：一键更新脚本（推荐）

```bash
npm run update
```

功能：自动备份 → 拉取代码 → 更新依赖 → 重建前端 → 重启服务

### 方式二：手动更新

#### 1. 备份数据

```bash
# MySQL
mysqldump -u idc_user -p idc_management > backup.sql

# SQLite
cp backend/idc_management.db backup.db
```

#### 2. 拉取最新代码

```bash
git pull origin master
```

#### 3. 更新依赖

```bash
cd backend && npm install
cd ../frontend && npm install && npm run build
```

#### 4. 重启服务

```bash
pm2 restart idc-backend
sudo systemctl restart nginx
```

---

## 监控维护

### 查看日志

```bash
# PM2 日志
pm2 logs idc-backend
pm2 logs idc-frontend

# Nginx 日志（Linux）
tail -f /var/log/nginx/idc_assest-error.log
tail -f /var/log/nginx/idc_assest-access.log

# 系统日志（Linux）
journalctl -u idc-backend -f
```

### 健康检查

```bash
# 服务状态
curl http://localhost:8000/health

# 数据库连接检查
curl http://localhost:8000/api/health/db
```

### 性能监控

**PM2配置**（`ecosystem.config.js`）：
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

### 服务管理命令

```bash
# PM2 管理
pm2 status                    # 查看服务状态
pm2 logs idc-backend          # 查看后端日志
pm2 logs idc-frontend         # 查看前端日志（PM2方式）
pm2 restart idc-backend       # 重启后端服务
pm2 stop idc-backend          # 停止后端服务
pm2 delete idc-backend        # 删除后端服务
pm2 save                      # 保存当前进程列表
pm2 startup                   # 配置开机自启
pm2 monit                     # 实时监控

# Nginx 管理（Linux）
sudo nginx -t                 # 测试配置
sudo systemctl restart nginx  # 重启服务
sudo systemctl status nginx   # 查看状态

# Nginx 管理（Windows）
nginx -t                      # 测试配置
nginx -s reload               # 重载配置
nginx -s stop                 # 停止Nginx
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
PORT=8001 npm run dev
```

### 依赖安装失败

```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 数据库连接失败

**SQLite：**
- 检查文件权限
- 确保磁盘空间充足
- 检查文件是否被其他进程占用

**MySQL：**
- 检查服务状态：`systemctl status mysql`（Linux）
- 验证连接参数（主机、端口、用户名、密码）
- 确认数据库已创建
- 检查防火墙设置
- 确认用户权限：`SHOW GRANTS FOR 'idc_user'@'localhost'`

### 部署脚本问题

**Linux 自动安装 Node.js 失败：**
- 检查 sudo 权限
- 检查网络连接
- 尝试手动安装后重新运行脚本

**Nginx 未安装（选择 Nginx 部署时）：**
- Windows：脚本会询问是否自动下载安装
- Linux/macOS：脚本会显示安装命令，需手动安装

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

**Linux:**
```bash
# 修复文件权限
sudo chown -R $(whoami):$(whoami) /path/to/project
sudo chmod -R 755 /path/to/project

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

---

## 项目结构

```
idc_assest/
├── backend/              # 后端服务
│   ├── middleware/       # 中间件（认证、验证）
│   ├── models/           # 数据模型（Sequelize）
│   ├── routes/           # API路由
│   ├── scripts/          # 数据库脚本
│   ├── uploads/          # 文件上传目录
│   ├── validation/       # 数据验证Schema
│   ├── server.js         # 服务入口
│   └── package.json
├── frontend/             # 前端应用
│   ├── src/
│   │   ├── api/          # API接口
│   │   ├── components/   # 组件
│   │   ├── pages/        # 页面
│   │   └── utils/        # 工具函数
│   ├── dist/             # 构建输出
│   └── package.json
├── docs/                 # 项目文档
│   ├── api/              # 接口文档
│   └── images/           # 文档图片
├── install.js            # 交互式安装脚本 ⭐
├── update.js             # 一键更新脚本 ⭐
├── uninstall.js          # 卸载脚本
├── check.js              # 环境检查脚本
├── modify.js             # 配置修改脚本
├── package.json
├── README.md             # 项目说明
├── CHANGELOG.md          # 版本记录
└── DEPLOYMENT.md         # 本文件
```

---

**⭐ 如果这个部署指南对您有帮助，请给我们一个Star！**
