# IDC设备管理系统 - 安装部署指南

[![https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)]()

## 📋 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [详细安装步骤](#详细安装步骤)
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

## 🚀 生产部署

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

**🎉 部署完成后，您就可以开始使用IDC设备管理系统了！**

---

**⭐ 如果这个部署指南对您有帮助，请给我们一个Star！**