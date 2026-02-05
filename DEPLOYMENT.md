# IDC设备管理系统 - 安装部署指南

## 快速开始

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
| Node.js | ≥14.0.0 |
| npm | ≥6.0.0 |
| 操作系统 | Windows 10/11、macOS、Linux |
| 内存 | 开发：4GB+ / 生产：8GB+ |

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

### 后端部署

#### 1. 配置环境变量

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

#### 2. 安装生产依赖

```bash
npm install
```

#### 3. 配置数据库

```sql
CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'idc_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON idc_management.* TO 'idc_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 4. 使用PM2管理进程

```bash
npm install -g pm2
pm2 start server.js --name "idc-backend" --env production
pm2 startup
pm2 save
```

### 前端部署

#### 1. 构建生产版本

```bash
cd frontend
npm install
npm run build
```

#### 2. 部署静态文件

```bash
sudo cp -r dist/* /var/www/idc-frontend/
sudo chown -R www-data:www-data /var/www/idc-frontend
sudo chmod -R 755 /var/www/idc-frontend
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
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
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

### PM2命令

```bash
pm2 status              # 查看状态
pm2 logs idc-backend    # 查看日志
pm2 restart idc-backend # 重启服务
pm2 stop idc-backend    # 停止服务
pm2 delete idc-backend  # 删除服务
```

### Nginx命令

```bash
sudo nginx -t           # 测试配置
sudo systemctl restart nginx  # 重启服务
sudo systemctl status nginx   # 查看状态
```

---

## 更新升级

### 1. 备份数据

```bash
mysqldump -u idc_user -p idc_management > backup.sql
```

### 2. 拉取最新代码

**从GitHub拉取**：
```bash
git pull origin master
```

**从Gitee拉取**：
```bash
git pull origin master
```

### 3. 更新依赖

```bash
cd backend && npm install
cd ../frontend && npm install && npm run build
```

### 4. 重启服务

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

**PM2配置**（`ecosystem.config.js`）：
```javascript
module.exports = {
  apps: [{
    name: 'idc-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G'
  }]
};
```

---

**⭐ 如果这个部署指南对您有帮助，请给我们一个Star！**
