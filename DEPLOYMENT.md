# IDC设备管理系统 - 安装部署指南

[![https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)]()

## 📋 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [详细安装步骤](#详细安装步骤)
  - [开发环境部署](#开发环境部署)
- [生产部署](#生产部署)
- [数据库配置](#数据库配置)
- [监控和维护](#监控和维护)
- [常见问题解决](#常见问题解决)

---

## 🖥️ 环境要求

### 开发环境
- **Node.js**: ≥14.0.0
- **npm**: ≥6.0.0 或 **yarn**: ≥1.22.0
- **操作系统**: Windows 10/11, macOS 10.14+, Linux (Ubuntu 18.04+)
- **内存**: 最小 4GB RAM
- **硬盘**: 最小 2GB 可用空间

### 生产环境
- **Node.js**: ≥14.0.0
- **npm**: ≥6.0.0 或 **yarn**: ≥1.22.0
- **Web服务器**: Nginx (推荐) 或 Apache
- **操作系统**: Linux (Ubuntu 18.04+, CentOS 7+, RHEL 7+)
- **内存**: 最小 8GB RAM (推荐 16GB+)
- **硬盘**: 最小 10GB 可用空间 (SSD 推荐)
- **SSL证书**: Let's Encrypt (推荐) 或其他CA证书

---

## ⚡ 快速开始

### 1. 克隆项目
```bash
git clone https://gitee.com/zhang1106/idc_assest.git
cd idc_assest
```

### 2. 安装后端依赖
```bash
cd backend
npm install
```

### 3. 安装前端依赖
```bash
cd ../frontend
npm install
```

### 4. 启动服务
```bash
# 启动后端服务（端口8000）
cd backend && npm run dev

# 启动前端服务（端口3000）- 新终端
cd frontend && npm run dev
```

**访问地址**：
- 前端应用：http://localhost:3000
- 后端API：http://localhost:8000/api
- 健康检查：http://localhost:8000/health

---

## 📖 详细安装步骤

> **📝 安装说明**：
> 本文档将部署分为两个阶段：
> 1. **开发环境部署**：在本地机器上配置完整的开发和测试环境
> 2. **生产环境部署**：在Linux服务器上配置生产环境，通过域名访问

> **🎯 建议路径**：
> - **开发人员**：只需要阅读"开发环境部署"部分
> - **运维人员**：需要阅读完整文档，包括"生产部署"部分

### 开发环境部署

### 后端配置

#### 1. 进入后端目录
```bash
cd backend
```

#### 2. 安装依赖包
```bash
npm install
```

#### 3. 配置环境变量
项目支持使用 `.env` 文件进行配置。请按以下步骤操作：

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，修改配置
# 可以使用任意文本编辑器，如：
# Windows: notepad .env
# macOS: nano .env
# 或IDE: 在编辑器中打开 .env 文件
```

**重要说明**：
- `.env` 文件包含了所有可配置的选项和详细注释
- 每个配置项都有默认值，默认情况下可以直接使用
- 如需修改配置，请编辑 `.env` 文件中的相应值
- 建议开发时使用 `NODE_ENV=development`，部署时使用 `NODE_ENV=production`

**配置项说明**：

 **服务器配置**：
 - `PORT`：服务器端口（默认8000）
 - `NODE_ENV`：运行环境
   - `development`：开发模式，详细日志便于调试
   - `production`：生产模式，性能优化，减少日志输出

 **数据库配置**：
 - `DB_TYPE`：数据库类型（默认 sqlite，可选 mysql）
   - `sqlite`：零配置嵌入式数据库，适合开发和小规模应用
   - `mysql`：关系型数据库，适合生产环境和大规模应用
 - `DB_PATH`：SQLite数据库文件路径（默认 ./idc_management.db）
 - `MYSQL_HOST`：MySQL服务器地址（默认 localhost）
 - `MYSQL_PORT`：MySQL端口（默认 3306）
 - `MYSQL_USERNAME`：MySQL用户名（默认 root）
 - `MYSQL_PASSWORD`：MySQL密码
 - `MYSQL_DATABASE`：MySQL数据库名（默认 idc_management）

#### 4. 数据库配置

**默认配置（推荐）**：使用SQLite数据库，无需额外配置

**MySQL配置**：如需使用MySQL数据库，请按以下步骤操作：

1. 确保MySQL服务已安装并运行
2. 创建数据库：
```sql
CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
3. 在 `.env` 文件中修改配置：
```env
DB_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=idc_management
```

#### 5. 启动后端服务
```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

**后端服务将在 http://localhost:8000 启动**（或配置的端口号）

### 前端配置

#### 1. 进入前端目录
```bash
cd frontend
```

#### 2. 安装依赖包
```bash
npm install
```

#### 3. 配置API地址
项目使用Vite代理配置，API地址在 `frontend/vite.config.js` 中配置：
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true
  }
}
```
如需修改后端地址，更新 `vite.config.js` 中的 `target` 字段。

#### 4. 启动前端开发服务器
```bash
npm run dev
```

**前端应用将在 http://localhost:3000 启动**

---

> **✅ 开发环境部署完成**
> 
> 至此，开发环境已完全配置完成。您可以：
> - 前端开发：http://localhost:3000
> - 后端API：http://localhost:8000/api
> - 后端健康检查：http://localhost:8000/health
> 
> **接下来**：如果您需要部署到生产环境，请继续阅读下一节"生产部署"。

---

## 🚀 生产部署

> **📋 生产部署说明**：
> - **独立部署**：生产部署在专门的Linux服务器上进行，与开发环境完全分离
> - **部署地址**：将通过域名或IP访问，如 `http://your-domain.com`
> - **安全要求**：生产环境有更严格的安全配置要求
> - **前置条件**：您需要拥有Linux服务器的root权限
> 
> **⚠️ 部署前必读**：生产部署涉及服务器安全，请确保在安全环境下操作，并及时更新安全配置。

#### 部署准备

1. **环境检查**
```bash
# 检查系统环境
node --version  # 确保 Node.js ≥ 14.0
npm --version   # 确保 npm 可用

# 检查服务器端口占用
netstat -tulpn | grep :8000
netstat -tulpn | grep :80
```

2. **创建部署目录**
```bash
# 创建应用目录
mkdir -p /var/www/idc_assest
mkdir -p /var/log/idc_assest
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled
```

#### 后端部署

1. **设置生产环境配置**
```bash
# 进入后端目录
cd backend

# 复制并编辑环境配置文件
cp .env.example .env

# 编辑生产环境配置（重要！）
# 设置生产模式
NODE_ENV=production

# 设置安全端口（可选）
PORT=8000

# 数据库配置（推荐使用MySQL）
DB_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=idc_user        # 创建专用数据库用户
MYSQL_PASSWORD=secure_password # 使用强密码
MYSQL_DATABASE=idc_management
```

2. **安装生产依赖**
```bash
# 安装生产依赖（只安装生产环境需要的包）
npm install --only=production

# 验证关键依赖是否安装成功
ls node_modules | grep -E "(express|sequelize|mysql2)"
```

3. **配置数据库**
```sql
-- 连接MySQL（使用root用户）
mysql -u root -p

-- 创建专用数据库
CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（安全最佳实践）
CREATE USER 'idc_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON idc_management.* TO 'idc_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

4. **安装并配置PM2（进程管理器）**
```bash
# 全局安装PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name "idc-backend" --env production

# 设置开机自启
pm2 startup
pm2 save

# 查看运行状态
pm2 status
pm2 logs idc-backend
```

5. **配置防火墙**
```bash
# Ubuntu/Debian
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### 前端部署

1. **构建生产版本**
```bash
cd frontend

# 安装依赖
npm install

# 构建生产版本（会生成优化的静态文件）
npm run build

# 验证构建结果
ls -la dist/
```

2. **部署到Web服务器**
```bash
# 将构建文件复制到Web目录
sudo cp -r dist/* /var/www/idc-frontend/

# 设置正确的文件权限
sudo chown -R www-data:www-data /var/www/idc-frontend
sudo chmod -R 755 /var/www/idc-frontend
```

#### Nginx配置

1. **创建站点配置文件**
```bash
sudo nano /etc/nginx/sites-available/idc_assest
```

2. **编辑Nginx配置**
```nginx
# 主配置
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # 前端静态文件
    root /var/www/idc-frontend;
    index index.html;
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 前端路由（SPA支持）
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API代理
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 日志配置
    access_log /var/log/nginx/idc_assest-access.log;
    error_log /var/log/nginx/idc_assest-error.log;
}

# HTTPS配置（推荐）
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL证书配置（使用Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # 其他配置同HTTP
    root /var/www/idc-frontend;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTP重定向到HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

3. **启用站点并重启Nginx**
```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/idc_assest /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### SSL证书配置（推荐）

1. **安装Certbot**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

2. **获取SSL证书**
```bash
# 自动配置SSL证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 设置自动续期
sudo crontab -e
# 添加以下行：
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🗄️ 数据库配置

### 数据库选择建议

| 数据库类型 | 适用场景 | 优势 | 劣势 |
|------------|----------|------|------|
| **SQLite** | 开发环境、小规模应用、个人使用 | 零配置、无需安装、数据文件便携 | 并发能力有限、大数据量性能差 |
| **MySQL** | 生产环境、企业级应用、大规模数据 | 高性能、并发处理能力强、数据完整性好 | 需要额外配置和维护 |

### SQLite配置（推荐开发使用）

1. **默认配置**
```env
# .env 文件中保持默认配置
DB_TYPE=sqlite
DB_PATH=./idc_management.db
NODE_ENV=development
```

2. **文件位置管理**
```bash
# 备份SQLite数据库
mkdir -p backup
cp backend/idc_management.db backup/database_$(date +%Y%m%d_%H%M%S).db

# 查看数据库信息
sqlite3 backend/idc_management.db ".schema"
sqlite3 backend/idc_management.db ".tables"
```

### MySQL配置（推荐生产使用）

1. **创建生产数据库**
```sql
-- 创建专用数据库
CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户
CREATE USER 'idc_prod_user'@'localhost' IDENTIFIED BY 'secure_password_123!';
GRANT ALL PRIVILEGES ON idc_management.* TO 'idc_prod_user'@'localhost';
FLUSH PRIVILEGES;
```

2. **配置生产环境变量**
```env
# .env 文件
NODE_ENV=production
DB_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=idc_prod_user
MYSQL_PASSWORD=secure_password_123!
MYSQL_DATABASE=idc_management
```

### 数据备份与恢复

#### 1. 自动备份脚本
```bash
#!/bin/bash
# backup_database.sh - 自动数据库备份脚本

# 设置备份目录
BACKUP_DIR="/var/backups/idc_assest"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/database_$DATE"

# 创建备份目录
mkdir -p $BACKUP_DIR

# SQLite备份
if [ -f "backend/idc_management.db" ]; then
    cp backend/idc_management.db "$BACKUP_FILE.db"
    echo "SQLite备份完成: $BACKUP_FILE.db"
fi

# MySQL备份
mysqldump -u idc_prod_user -pYourPassword123! idc_management > "$BACKUP_FILE.sql"
if [ $? -eq 0 ]; then
    echo "MySQL备份完成: $BACKUP_FILE.sql"
fi

# 压缩备份文件
gzip "$BACKUP_FILE.db"
gzip "$BACKUP_FILE.sql"

# 清理30天前的备份
find $BACKUP_DIR -name "database_*.gz" -mtime +30 -delete

echo "备份任务完成"
```

#### 2. 定时任务配置
```bash
# 添加到crontab
crontab -e

# 每天凌晨2点执行备份
0 2 * * * /path/to/backup_database.sh

# 每周日凌晨3点执行完整备份
0 3 * * 0 /path/to/full_backup.sh
```

#### 3. 数据恢复

**SQLite恢复**：
```bash
# 停止应用
pm2 stop idc-backend

# 恢复数据库
cp backup/database_20240101.db backend/idc_management.db

# 重启应用
pm2 start idc-backend
```

**MySQL恢复**：
```bash
# 停止应用
pm2 stop idc-backend

# 恢复数据库
gunzip backup/database_20240101.sql.gz
mysql -u idc_prod_user -p idc_management < backup/database_20240101.sql

# 重启应用
pm2 start idc-backend
```

### 监控和维护

#### 1. 数据库健康检查
```bash
#!/bin/bash
# health_check.sh - 数据库健康检查

# 检查SQLite
if [ -f "backend/idc_management.db" ]; then
    echo "SQLite数据库文件存在"
    sqlite3 backend/idc_management.db "PRAGMA integrity_check;"
else
    echo "SQLite数据库文件不存在"
fi

# 检查MySQL
mysql -u idc_prod_user -pYourPassword123! -e "SELECT 1;" idc_management > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "MySQL连接正常"
else
    echo "MySQL连接失败"
fi
```

#### 2. 性能监控
```sql
-- MySQL性能监控查询
SHOW PROCESSLIST;
SHOW ENGINE INNODB STATUS;
SELECT * FROM information_schema.innodb_trx;
SELECT * FROM information_schema.innodb_locks;
```

---

## 🔧 常见问题解决

### 1. 端口冲突
```bash
# 检查端口占用
netstat -tulpn | grep :8000
netstat -tulpn | grep :3000

# 修改端口
PORT=8001 npm run dev  # 后端
npm run dev -- --port 3001  # 前端
```

### 2. 权限问题
```bash
# Linux/macOS权限修复
chmod +x backend/server.js
chown -R $USER:$USER backend/
```

### 3. 依赖安装失败
```bash
# 清理缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 4. 数据库连接失败

**SQLite连接问题**：
- 检查数据库文件权限
- 确保有写入权限
- 验证磁盘空间充足

**MySQL连接问题**：
- 检查MySQL服务是否运行：`systemctl status mysql` 或 `netstat -tulpn | grep :3306`
- 验证MySQL连接参数是否正确
- 确保数据库已创建：`CREATE DATABASE idc_management;`
- 检查MySQL用户权限
- 查看MySQL错误日志

---

## 📊 监控和维护

### 服务监控
```bash
# 检查服务状态
curl http://localhost:8000/health

# 查看日志
pm2 logs idc-backend
```

### 数据迁移
```bash
# 导出数据
node scripts/export-data.js

# 导入数据  
node scripts/import-data.js backup/data.json
```

### 性能优化

#### 1. PM2性能配置
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'idc-backend',
    script: 'server.js',
    instances: 'max', // 使用所有CPU核心
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    max_memory_restart: '1G', // 内存超过1G自动重启
    node_args: '--max-old-space-size=1024'
  }]
};
```

#### 2. 数据库优化
```sql
-- MySQL性能优化
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
SET GLOBAL query_cache_size = 67108864; -- 64MB

-- 创建索引优化查询
CREATE INDEX idx_device_rack ON devices(rackId);
CREATE INDEX idx_device_type ON devices(deviceType);
```

---

## 🔒 安全配置

### 1. 防火墙配置
```bash
# Ubuntu/Debian UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL firewalld
sudo firewall-cmd --set-default-zone=public
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. 系统安全加固
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 配置fail2ban防止暴力破解
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 配置SSH密钥登录
ssh-keygen -t rsa -b 4096
ssh-copy-id user@server-ip
```

### 3. 应用程序安全
```env
# .env 生产环境安全配置
NODE_ENV=production
PORT=8000

# 设置强密码
DATABASE_PASSWORD=ComplexPassword123!@#

# 启用HTTPS（使用反向代理）
FORCE_HTTPS=true

# 设置会话密钥
SESSION_SECRET=random_session_secret_key_here
```

---

## 📞 技术支持

如果在安装部署过程中遇到问题，请：

1. **查看日志文件**
   - 后端日志：`pm2 logs idc-backend`
   - Nginx日志：`tail -f /var/log/nginx/idc_assest-error.log`

2. **检查服务状态**
   ```bash
   pm2 status
   sudo systemctl status nginx
   ```

3. **验证配置文件**
   ```bash
   # 测试Nginx配置
   sudo nginx -t
   
   # 测试数据库连接
   mysql -u idc_prod_user -p -e "SELECT 1;" idc_management
   ```

---

##  更新升级流程

### 手动更新步骤

#### 1. 备份当前版本

```bash
# 创建备份目录
mkdir -p /var/backups/idc_assest/$(date +%Y%m%d)
cd /var/backups/idc_assest/$(date +%Y%m%d)

# 备份数据库
mysqldump -u idc_prod_user -p idc_management > database_backup.sql

# 备份配置文件
cp -r /var/www/idc_assest/backend/.env ./
cp -r /var/www/idc_assest/frontend/.env ./

# 备份上传文件
cp -r /var/www/idc_assest/backend/uploads ./
```

#### 2. 下载最新代码

```bash
cd /var/www/idc_assest

# 拉取最新代码
git fetch origin
git checkout main
git pull origin main
```

#### 3. 更新依赖

```bash
# 更新后端依赖
cd backend
npm install
cd ..

# 更新前端依赖并构建
cd frontend
npm install
npm run build
cd ..
```

#### 4. 重启服务

```bash
# 重启后端
pm2 restart idc-backend

# 重启Nginx
sudo systemctl restart nginx

# 验证服务
curl http://localhost:8000/health
```

### Docker环境更新

```bash
cd /var/www/idc_assest/docker

# 拉取最新代码
cd ..
git pull origin main
cd docker

# 重新构建并启动
docker-compose down
docker-compose up -d --build

# 验证服务
curl http://localhost/health
```

### 回滚操作

```bash
# 查看历史版本
cd /var/www/idc_assest
git log --oneline -10

# 回滚到指定版本
git checkout <commit-hash>

# 重新构建
cd frontend && npm run build && cd ..
cd backend && npm install && cd ..

# 重启服务
pm2 restart idc-backend
```

### 版本兼容性检查

```bash
# 检查Node.js版本
node --version

# 检查依赖版本
cd backend && npm list | grep -E "(express|sequelize|mysql2)" && cd ..
cd frontend && npm list | grep -E "(react|antd|vite)" && cd ..
```

---

## 📊 系统架构说明

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户访问层                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   浏览器      │    │   移动端      │    │   API客户端   │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼───────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Web服务层                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     Nginx / Apache                       │    │
│  │   • 静态资源服务    • 反向代理    • SSL终端    • 负载均衡  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   前端应用       │ │   后端API       │ │   静态资源       │
│   (React)       │ │   (Express)     │ │   (Nginx)       │
│   端口: 3000    │ │   端口: 8000    │ │   端口: 80/443  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       数据存储层                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │     MySQL       │  │    SQLite       │  │   文件存储       │  │
│  │   端口: 3306    │  │   嵌入式        │  │   uploads/      │  │
│  │                 │  │                 │  │                 │  │
│  │  • 设备信息     │  │  • 开发环境     │  │  • 设备图片     │  │
│  │  • 用户数据     │  │  • 快速部署     │  │  • 附件         │  │
│  │  • 工单记录     │  │                 │  │  • 备份文件     │  │
│  │  • 耗材库存     │  │                 │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 技术栈版本

| 层级 | 技术 | 版本要求 | 用途 |
|------|------|----------|------|
| 前端 | React | 18.2.0+ | UI框架 |
| 前端 | Ant Design | 5.8.6+ | 组件库 |
| 前端 | Vite | 4.4.9+ | 构建工具 |
| 前端 | Three.js | 0.160.0+ | 3D可视化 |
| 后端 | Node.js | 14.0.0+ | 运行时 |
| 后端 | Express | 4.18.2+ | Web框架 |
| 后端 | Sequelize | 6.32.1+ | ORM框架 |
| 数据库 | MySQL | 8.0+ | 主数据库 |
| 数据库 | SQLite | 5.1.6+ | 嵌入式数据库 |
| 服务器 | Nginx | 1.18+ | 反向代理 |
| 进程管理 | PM2 | 5.0+ | 进程管理 |

### 数据流说明

1. **用户请求流程**
   - 用户通过浏览器访问系统
   - 请求首先到达Nginx
   - Nginx判断请求类型：
     - 静态资源：直接返回
     - API请求：转发到后端服务
     - 前端路由：返回index.html

2. **数据处理流程**
   - 后端接收API请求
   - 验证用户身份和权限
   - 通过Sequelize操作数据库
   - 返回JSON响应

3. **实时通信**
   - WebSocket用于实时告警推送
   - HTTP轮询用于数据刷新

---

## 🔍 故障排查指南

### 常见错误及解决方案

#### 1. 后端服务无法启动

**错误信息**：Error: listen EADDRINUSE: address already in use :::8000

**原因分析**：端口8000已被其他进程占用

**解决方案**：
```bash
# 查看占用端口的进程
netstat -tulpn | grep :8000
lsof -i :8000

# 终止占用进程
kill -9 <PID>

# 或修改为其他端口
PORT=8001 npm run dev
```

#### 2. 数据库连接失败

**错误信息**：SequelizeConnectionError: Access denied for user

**原因分析**：数据库用户名或密码错误

**解决方案**：
```bash
# 检查.env配置
cat backend/.env | grep -E "(MYSQL|USERNAME|PASSWORD)"

# 测试数据库连接
mysql -u idc_user -p -h localhost

# 检查MySQL服务状态
sudo systemctl status mysql
sudo systemctl start mysql
```

#### 3. 前端构建失败

**错误信息**：Error: Cannot find module 'node-sass'

**原因分析**：依赖安装不完整

**解决方案**：
```bash
# 清理并重新安装依赖
cd frontend
rm -rf node_modules package-lock.json
npm install

# 检查Node.js版本兼容性
node --version
```

#### 4. Nginx 502 Bad Gateway

**原因分析**：后端服务未运行或连接超时

**解决方案**：
```bash
# 检查后端服务状态
pm2 status

# 查看后端日志
pm2 logs idc-backend

# 检查Nginx错误日志
tail -f /var/log/nginx/idc_assest-error.log

# 测试后端服务
curl http://127.0.0.1:8000/health
```

#### 5. 文件上传失败

**错误信息**：Error: ENOENT: no such file or directory

**原因分析**：上传目录不存在或权限不足

**解决方案**：
```bash
# 创建上传目录
mkdir -p backend/uploads
chmod 755 backend/uploads

# 检查目录权限
ls -la backend/ | grep uploads
```

#### 6. CORS跨域错误

**错误信息**：Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy

**原因分析**：CORS配置不正确

**解决方案**：
```javascript
// 检查backend/server.js中的CORS配置
const cors = require('cors');
app.use(cors({
  origin: 'http://your-domain.com',
  credentials: true
}));
```

### 诊断命令速查表

```bash
# 检查端口占用
netstat -tulpn | grep -E "(80|443|8000|3306)"

# 检查进程状态
ps aux | grep -E "(node|nginx|mysql)"

# 检查磁盘空间
df -h

# 检查内存使用
free -m

# 检查系统负载
top -bn1 | head -5

# 网络连通性测试
curl -I http://localhost:8000/health
curl -I http://localhost/api/devices

# 查看系统日志
tail -f /var/log/syslog
journalctl -xe

# Docker诊断（Docker部署）
docker-compose ps
docker-compose logs --tail=100
docker stats
```

### 日志文件位置

| 服务 | 日志位置 |
|------|----------|
| 后端（PM2） | `pm2 logs idc-backend` |
| 后端（文件） | `/var/log/idc_assest/backend/` |
| Nginx | `/var/log/nginx/idc_assest-access.log` |
| Nginx | `/var/log/nginx/idc_assest-error.log` |
| MySQL | `/var/log/mysql/error.log` |
| Docker | `docker-compose logs` |

---

## ⚡ 性能优化

### 后端性能优化

#### 1. PM2集群模式

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'idc-backend',
    script: 'server.js',
    instances: 'max',              // 使用所有CPU核心
    exec_mode: 'cluster',          // 集群模式
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    max_memory_restart: '1G',      // 内存超过1G自动重启
    node_args: '--max-old-space-size=1024',
    listen_timeout: 3000,          // 监听超时
    kill_timeout: 5000,            // 终止超时
    max_restarts: 10,              // 最大重启次数
    min_uptime: '10s'              // 最小运行时间
  }]
};
```

#### 2. 数据库连接池优化

```javascript
// backend/db.js
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  username: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  pool: {
    max: 20,                       // 最大连接数
    min: 5,                        // 最小连接数
    acquire: 60000,                // 获取连接最大等待时间
    idle: 10000                    // 连接空闲最大时间
  },
  logging: false,                  // 关闭SQL日志
  dialectOptions: {
    charset: 'utf8mb4'
  }
});
```

#### 3. 缓存策略

```javascript
// 使用内存缓存热点数据
const cache = new Map();

// 设备统计缓存（5分钟过期）
function getDeviceStats() {
  const cacheKey = 'device_stats';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.time < 5 * 60 * 1000) {
    return cached.data;
  }
  
  const stats = calculateDeviceStats();
  cache.set(cacheKey, { data: stats, time: Date.now() });
  return stats;
}
```

### 数据库性能优化

#### 1. 创建索引

```sql
-- 设备表索引
CREATE INDEX idx_device_rack ON devices(rackId);
CREATE INDEX idx_device_type ON devices(deviceType);
CREATE INDEX idx_device_status ON devices(status);
CREATE INDEX idx_device_created ON devices(createdAt);

-- 工单表索引
CREATE INDEX idx_ticket_status ON tickets(status);
CREATE INDEX idx_ticket_priority ON tickets(priority);
CREATE INDEX idx_ticket_device ON tickets(deviceId);
CREATE INDEX idx_ticket_created ON tickets(createdAt);

-- 耗材表索引
CREATE INDEX idx_consumable_category ON consumables(category);
CREATE INDEX idx_consumable_status ON consumables(status);
```

#### 2. MySQL配置优化

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
# 缓冲池大小（建议为物理内存的70%）
innodb_buffer_pool_size = 2G

# 日志文件大小
innodb_log_file_size = 512M

# 刷新策略
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# 连接数
max_connections = 200

# 查询缓存（MySQL 8.0已移除）
# query_cache_type = 0
```

### 前端性能优化

#### 1. 构建优化

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // 开启压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          'antd': ['antd', '@ant-design/icons'],
          'charts': ['recharts'],
          'three': ['three']
        }
      }
    },
    // 资源优化
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000
  },
  // 依赖预构建
  optimizeDeps: {
    include: ['antd', 'axios', 'react-router-dom']
  }
});
```

#### 2. 路由懒加载

```javascript
// App.jsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const DeviceManagement = lazy(() => import('./pages/DeviceManagement'));

// 使用
<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
  </Routes>
</Suspense>
```

### Nginx性能优化

```nginx
# /etc/nginx/nginx.conf

worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    # 打开文件缓存
    open_file_cache max=10000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # 缓冲区优化
    client_body_buffer_size 16K;
    client_max_body_size 100M;
    proxy_buffer_size 128K;
    proxy_buffers 4 256K;
    proxy_busy_buffers_size 256K;
    
    # 连接超时
    keepalive_timeout 65;
    keepalive_requests 100;
    
    # 上游服务器配置
    upstream backend {
        server 127.0.0.1:8000;
        keepalive 32;
    }
}
```

---

## 📝 日志管理

### 日志配置

```javascript
// backend/logger.js
const winston = require('winston');
const path = require('path');

const logDir = process.env.LOG_DIR || './logs';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'idc-backend' },
  transports: [
    // 错误日志
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760,    // 10MB
      maxFiles: 10
    }),
    // 组合日志
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760,
      maxFiles: 10
    }),
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;
```

### 日志轮转配置

#### 1. 使用logrotate（Linux）

```bash
# /etc/logrotate.d/idc_assest
/var/log/idc_assest/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 restart idc-backend > /dev/null 2>&1 || true
    endscript
}
```

#### 2. 使用PM2日志轮转

```bash
# 安装pm2-logrotate
pm2 install pm2-logrotate

# 配置
pm2 set pm2-logrotate:max_size 50M      # 单个文件最大50MB
pm2 set pm2-logrotate:retain 30          # 保留30个文件
pm2 set pm2-logrotate:compress true      # 压缩历史文件
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
```

### 日志分析示例

```bash
# 查看错误日志
tail -f /var/log/idc_assest/error.log

# 统计API响应时间
grep -o '"duration":[0-9]*' /var/log/idc_assest/combined.log | \
  awk -F: '{sum+=$2; count++} END {print "平均响应时间:", sum/count, "ms"}'

# 统计用户登录情况
grep "登录成功" /var/log/idc_assest/combined.log | \
  awk '{print $4}' | sort | uniq -c | sort -rn

# 查找异常请求
grep -E "(ERROR|500|401)" /var/log/idc_assest/error.log
```

---

## 💾 备份与灾难恢复

### 备份策略

| 备份类型 | 频率 | 保留时间 | 说明 |
|----------|------|----------|------|
| 全量备份 | 每周日凌晨3点 | 4周 | 完整数据库备份 |
| 增量备份 | 每天凌晨2点 | 7天 | 每日变更数据 |
| 实时备份 | 持续 | 永久 | 二进制日志 |
| 配置备份 | 每次变更 | 12个月 | 配置文件和代码 |

### 自动化备份脚本

```bash
#!/bin/bash
# backup_full.sh - 完整备份脚本

set -e

# 配置
BACKUP_DIR="/var/backups/idc_assest"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/full_backup_$DATE"
KEEP_DAYS=30

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 1. 备份数据库
echo "正在备份数据库..."
mysqldump -u idc_prod_user -p"$MYSQL_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  idc_management | gzip > "$BACKUP_FILE.sql.gz"

# 2. 备份配置文件
echo "正在备份配置文件..."
tar czf "$BACKUP_DIR/config_$DATE.tar.gz" \
  backend/.env \
  nginx/conf.d/

# 3. 备份上传文件
echo "正在备份上传文件..."
tar czf "$BACKUP_DIR/uploads_$DATE.tar.gz" \
  backend/uploads/

# 4. 备份代码（排除node_modules）
echo "正在备份代码..."
tar czf "$BACKUP_DIR/code_$DATE.tar.gz" \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=uploads \
  .

# 5. 清理旧备份
echo "正在清理旧备份..."
find "$BACKUP_DIR" -name "full_backup_*.sql.gz" -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$KEEP_DAYS -delete

# 6. 验证备份
echo "正在验证备份..."
if [ -f "$BACKUP_FILE.sql.gz" ]; then
  gunzip -t "$BACKUP_FILE.sql.gz" && echo "数据库备份验证成功"
fi

# 7. 生成备份清单
echo "备份完成，文件列表："
ls -lh "$BACKUP_DIR"/*"$DATE"*

# 8. 发送通知（可选）
# curl -X POST "https://hooks.example.com/notify" -d "backup completed"

echo "备份任务完成：$DATE"
```

### 定时任务配置

```bash
# crontab配置
crontab -e

# 每日增量备份（凌晨2点）
0 2 * * * /var/www/idc_assest/scripts/backup_incremental.sh

# 每周完整备份（周日凌晨3点）
0 3 * * 0 /var/www/idc_assest/scripts/backup_full.sh

# 每月清理旧备份（每月1日凌晨4点）
0 4 1 * * /var/www/idc_assest/scripts/cleanup_old_backups.sh
```

### 灾难恢复流程

#### 1. 数据恢复步骤

```bash
# 1. 停止服务
pm2 stop idc-backend

# 2. 恢复数据库
gunzip -c /var/backups/idc_assest/full_backup_20240101_030000.sql.gz | \
  mysql -u idc_prod_user -p idc_management

# 3. 恢复配置文件
tar xzf /var/backups/idc_assest/config_20240101.tar.gz -C /

# 4. 恢复上传文件
tar xzf /var/backups/idc_assest/uploads_20240101.tar.gz -C /

# 5. 重启服务
pm2 restart idc-backend

# 6. 验证恢复
curl http://localhost:8000/health
```

#### 2. 完整系统恢复

```bash
# 1. 创建新服务器
# 2. 安装必要软件
# 3. 从Git克隆代码
# 4. 恢复配置文件
# 5. 恢复数据库
# 6. 恢复上传文件
# 7. 重新安装依赖
# 8. 重启服务
```

### 备份验证

```bash
#!/bin/bash
# verify_backup.sh - 备份验证脚本

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "用法: $0 <备份文件>"
  exit 1
fi

echo "正在验证备份文件：$BACKUP_FILE"

# 检查文件存在
if [ ! -f "$BACKUP_FILE" ]; then
  echo "错误：文件不存在"
  exit 1
fi

# 检查文件大小（至少1KB）
FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
if [ "$FILE_SIZE" -lt 1024 ]; then
  echo "警告：文件大小异常小"
fi

# 对于SQL备份，验证SQL语法
if [[ "$BACKUP_FILE" == *.sql.gz ]]; then
  echo "验证SQL语法..."
  gunzip -c "$BACKUP_FILE" | head -100 | grep -q "INSERT INTO\|CREATE TABLE"
  if [ $? -eq 0 ]; then
    echo "✓ SQL语法验证通过"
  else
    echo "✗ SQL语法验证失败"
    exit 1
  fi
fi

# 对于压缩包，验证完整性
if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
  echo "验证压缩包完整性..."
  tar -tzf "$BACKUP_FILE" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "✓ 压缩包验证通过"
  else
    echo "✗ 压缩包验证失败"
    exit 1
  fi
fi

echo "备份验证完成"
```

---

## 🔐 安全加固清单

### 服务器安全

- [ ] 配置防火墙规则（仅开放必要端口）
- [ ] 启用SSH密钥认证，禁用密码登录
- [ ] 安装配置fail2ban防止暴力破解
- [ ] 定期更新系统安全补丁
- [ ] 配置自动安全更新
- [ ] 启用系统审计日志
- [ ] 限制root用户登录

### 数据库安全

- [ ] 使用强密码策略
- [ ] 创建专用数据库用户，禁用root远程登录
- [ ] 定期备份数据库
- [ ] 启用数据库审计日志
- [ ] 限制数据库用户权限（最小权限原则）
- [ ] 加密数据库连接（SSL/TLS）

### 应用安全

- [ ] 配置HTTPS强制跳转
- [ ] 设置安全的Cookie属性（HttpOnly, Secure）
- [ ] 启用CSRF防护
- [ ] 实现请求速率限制
- [ ] 配置安全的HTTP头
- [ ] 敏感信息加密存储
- [ ] 实现完善的权限控制

### 监控与告警

- [ ] 配置异常登录告警
- [ ] 启用API访问日志
- [ ] 监控服务状态和资源使用
- [ ] 配置磁盘空间告警
- [ ] 设置数据库连接数告警
- [ ] 实现自动化健康检查

---

**🎉 部署完成后，您就可以开始使用IDC设备管理系统了！**

---

**⭐ 如果这个部署指南对您有帮助，请给我们一个Star！**