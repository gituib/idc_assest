# IDC设备管理系统 - 安装部署指南

## 快速开始（推荐）

### 一键部署脚本（交互式）

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

## 传统手动部署

如需手动部署，请参考以下步骤：

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
cd backend && npm install
cd ../frontend && npm install
```

### 3. 启动服务

```bash
# 后端（端口8000）
cd backend && npm run dev

# 前端（端口3000）- 新终端
cd frontend && npm run dev
```

**访问地址**：
- 前端：http://localhost:3000
- 后端API：http://localhost:8000/api

---

## 环境要求

| 项目 | 要求 |
|------|------|
| Node.js | ≥14.0.0（推荐 20.x LTS） |
| npm | ≥6.0.0（随 Node.js 安装） |
| 操作系统 | Windows 10/11、macOS、Linux |
| 内存 | 开发：4GB+ / 生产：8GB+ |

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
brew install node@
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

### 后端配置

#### 1. 环境变量

```bash
cd backend
cp .env.example .env
```

#### 2. 数据库配置

**默认配置（推荐）**：使用SQLite，无需额外配置

**MySQL配置**：
```sql
CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

修改 `.env` 文件：
```env
DB_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=idc_management
```

#### 3. 启动后端

```bash
npm run dev
```

### 前端配置

#### 1. 启动开发服务器

```bash
cd frontend
npm run dev
```

#### 2. 修改API地址（如需要）

编辑 `vite.config.js`：
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true
  }
}
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
```

##### 2. 安装生产依赖

```bash
npm install
```

##### 3. 配置数据库

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
npm install -g pm2
pm2 start server.js --name "idc-backend" --env production
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

##### 2. 部署静态文件

**Nginx 方式：**
```bash
sudo cp -r dist/* /var/www/idc-frontend/
sudo chown -R www-data:www-data /var/www/idc-frontend
sudo chmod -R 755 /var/www/idc-frontend
```

**PM2 serve 方式：**
```bash
npm install -g serve
pm2 start serve --name "idc-frontend" -- -s dist -l 3000
```

### Nginx配置

#### 1. 创建配置文件

```bash
sudo nano /etc/nginx/sites-available/idc_assest
```

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
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
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

```bash
sudo ln -s /etc/nginx/sites-available/idc_assest /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL证书（可选）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 服务管理

### PM2 管理命令

```bash
pm2 status                    # 查看服务状态
pm2 logs idc-backend          # 查看后端日志
pm2 logs idc-frontend         # 查看前端日志（PM2方式）
pm2 restart idc-backend       # 重启后端服务
pm2 stop idc-backend          # 停止后端服务
pm2 delete idc-backend        # 删除后端服务
pm2 save                      # 保存当前进程列表
pm2 startup                   # 配置开机自启
```

### Nginx 管理命令

**Linux:**
```bash
sudo nginx -t                 # 测试配置
sudo systemctl restart nginx  # 重启服务
sudo systemctl status nginx   # 查看状态
```

**Windows:**
```cmd
nginx -t                      # 测试配置
nginx -s reload               # 重载配置
nginx -s stop                 # 停止Nginx
```

---

## 数据库配置

### SQLite（开发环境）

- 默认配置，无需额外设置
- 数据库文件：`backend/idc_management.db`

### MySQL（生产环境）

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

### 数据备份

#### SQLite备份

```bash
cp backend/idc_management.db backup/database_$(date +%Y%m%d).db
```

#### MySQL备份

```bash
mysqldump -u idc_user -p idc_management > backup/database_$(date +%Y%m%d).sql
```

#### 自动备份脚本

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/idc_assest"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# MySQL备份
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
mysqldump -u idc_user -p idc_management > backup.sql
```

#### 2. 拉取最新代码

**从GitHub拉取**：
```bash
git pull origin master
```

**从Gitee拉取**：
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
pm2 logs idc-backend
tail -f /var/log/nginx/idc_assest-error.log
```

### 健康检查

```bash
curl http://localhost:8000/health
```

### 性能优化

**PM2配置**（`deploy/ecosystem.config.js`）：
```javascript
module.exports = {
  apps: [{
    name: 'idc-backend',
    script: './server.js',
    cwd: './backend',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    autorestart: true
  }]
};
```

---

## 常见问题

### 端口冲突

```bash
# 检查端口占用
netstat -tulpn | grep :8000

# 修改端口
PORT=8001 npm run dev
```

### 依赖安装失败

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 数据库连接失败

**SQLite**：
- 检查文件权限
- 确保磁盘空间充足

**MySQL**：
- 检查服务状态：`systemctl status mysql`
- 验证连接参数
- 确认数据库已创建

### 部署脚本问题

**Linux 自动安装 Node.js 失败：**
- 检查 sudo 权限
- 检查网络连接
- 尝试手动安装后重新运行脚本

**Nginx 未安装（选择 Nginx 部署时）：**
- Windows：脚本会询问是否自动下载安装
- Linux/macOS：脚本会显示安装命令，需手动安装

---

## 项目结构

```
idc_assest/
├── backend/              # 后端服务
│   ├── middleware/       # 中间件
│   ├── models/           # 数据模型
│   ├── routes/           # API路由
│   ├── scripts/          # 数据库脚本
│   ├── uploads/          # 文件上传目录
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
├── deploy/               # 部署配置
│   ├── ecosystem.config.js   # PM2配置
│   └── nginx-idc.conf        # Nginx配置
├── install.js            # 交互式安装脚本 ⭐
├── update.js             # 一键更新脚本 ⭐
├── package.json
└── DEPLOYMENT.md         # 本文件
```

---

**⭐ 如果这个部署指南对您有帮助，请给我们一个Star！**
