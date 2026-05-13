# IDC设备资产管理系统

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://react.dev/)

现代化数据中心（IDC）设备管理系统，提供机房、机柜、设备的全生命周期管理，具备 3D 可视化展示功能。

**GitHub**: https://github.com/gituib/idc_assest
**Gitee**: https://gitee.com/zhang96110/idc_assest

---

## 目录

[TOC]

---

## 功能特性

| 模块 | 描述 |
|------|------|
| 机房管理 | 多机房管理，平面图可视化 |
| 机柜管理 | 机柜增删改查，3D 可视化，批量导入导出 |
| 设备管理 | 全生命周期管理，自定义字段，批量导入导出 |
| 端口管理 | 设备端口配置，网卡绑定，批量管理 |
| 线缆管理 | 线缆连接管理，可视化追踪 |
| 网络拓扑 | 拓扑可视化展示（ReactFlow） |
| 工单管理 | 故障报修，维护工单全流程 |
| 耗材管理 | 库存管理，SN 序列号追踪，日志归档 |
| 盘点管理 | 盘点计划与执行，待审核设备 |
| 空闲设备 | 空闲设备转入/激活 |
| 数据看板 | 实时监控，功率监控，趋势图表 |
| 3D 可视化 | 三维机柜展示，LOD 优化 |
| 机房平面图 | Canvas 渲染，拖拽编辑 |
| 操作日志 | 审计追踪，统计分析 |
| 备份管理 | 本地/远程备份，自动定时 |
| 系统配置 | 自定义字段，背景配置 |
| 用户权限 | RBAC 角色控制 |
| API 文档 | Swagger 交互式文档 |

### 项目截图

<details>
<summary>点击展开查看截图</summary>

![数据看板](docs/images/dashboard-full.png)
*数据看板 - 实时监控数据中心运行状态*

![3D 机柜可视化](docs/images/3d-visualization-full.png)
*3D 机柜可视化 - 三维展示机柜设备布局*

![机房管理](docs/images/room-management-full.png)
*机房管理 - 多机房分类管理*

![设备管理](docs/images/device-management-full.png)
*设备管理 - 设备全生命周期管理*

![工单管理](docs/images/ticket-management.png)
*工单管理 - 故障报修与维护工单处理*

![数据备份](docs/images/backup-management.png)
*数据备份 - 数据库备份与恢复管理*

</details>

---

## 快速开始

### Linux 一键部署

```bash
# 克隆项目
git clone https://gitee.com/zhang96110/idc_assest.git
cd idc_assest

# 运行安装脚本（自动安装 Node.js）
./install.sh

# 或一键安装（无需克隆）
curl -fsSL https://gitee.com/zhang96110/idc_assest/raw/main/install.sh | bash
```

**install.sh 自动完成**：
- 自动检测 Linux 发行版（Ubuntu/Debian/CentOS/Arch）
- 自动安装 Node.js 20.x
- 自动安装系统依赖（git、curl）
- 调用 install.js 完成后续安装

### Windows 部署

```powershell
# 克隆项目
git clone https://gitee.com/zhang96110/idc_assest.git
cd idc_assest

# 运行安装脚本（需要先安装 Node.js）
node install.js

# 或使用 npm
npm run deploy
```

### 手动安装

```bash
# 1. 克隆项目
git clone https://gitee.com/zhang96110/idc_assest.git
cd idc_assest

# 2. 安装依赖
npm run install:all

# 3. 配置环境变量
cp backend/.env.example backend/.env

# 4. 配置 JWT 密钥（必填）
# 编辑 backend/.env，设置 JWT_SECRET 为强随机字符串
# 生成命令：openssl rand -hex 64（Linux/macOS）
# 或：node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 5. 初始化数据库
cd backend && node scripts/init-database.js

# 6. 启动服务
cd .. && npm start
```

**访问地址**：http://localhost:3000
**默认账号**：首次注册自动成为管理员

---

## 环境要求

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| **操作系统** | Windows 10+、macOS 12+、Linux | 同最低 |
| **Node.js** | ≥14.0.0 | 20.x LTS |
| **npm** | ≥6.0.0 | 10.x |
| **内存** | 4GB | 8GB+ |
| **磁盘** | 2GB | 10GB+ |

**生产环境额外要求**：

| 项目 | 要求 |
|------|------|
| 数据库 | MySQL 8.0+（推荐）或 SQLite |
| Web 服务器 | Nginx 1.18+ |
| 进程管理 | PM2 5.x+ |

---

## 脚本命令参考

### install.js - 安装脚本

```bash
# 交互式安装
node install.js

# 非交互式安装
node install.js -y

# 指定数据库类型
node install.js -y --db=mysql    # 使用 MySQL
node install.js -y --db=sqlite    # 使用 SQLite（默认）

# 指定端口
node install.js -y --port=8000   # 后端端口

# 跳过前端构建
node install.js -y --skip-build

# 跳过 Nginx 配置
node install.js -y --skip-nginx

# 查看帮助
node install.js --help
```

### update.js - 更新脚本

```bash
# 交互式更新
node update.js

# 模拟运行（不执行实际操作）
node update.js --dry-run

# 跳过某些步骤
node update.js --skip-git        # 跳过 Git 拉取
node update.js --skip-backup     # 跳过数据库备份
node update.js --skip-migrate    # 跳过数据库迁移
node update.js --skip-build       # 跳过前端构建
node update.js --skip-deps       # 跳过依赖安装
node update.js --skip-restart    # 跳过服务重启

# 强制执行（忽略锁文件）
node update.js --force

# 查看帮助
node update.js --help
```

**智能检测功能**：
- 依赖安装智能跳过（检测 package.json 变化）
- 前端构建智能跳过（检测源码变化）
- 数据库自动备份（支持回滚）
- 健康检查验证
- 日志持久化保存到 `logs/update_*.log`
- 锁机制防止重复运行

### uninstall.js - 卸载脚本

```bash
# 交互式卸载
node uninstall.js

# 强制卸载（无需确认）
node uninstall.js --force

# 卸载前自动备份数据库
node uninstall.js --backup

# 跳过某些步骤
node uninstall.js --skip-db       # 跳过数据库删除
node uninstall.js --skip-deps     # 跳过依赖删除
node uninstall.js --skip-uploads  # 跳过上传文件删除

# 预览模式（不实际执行）
node uninstall.js --dry-run

# 查看帮助
node uninstall.js --help
```

---

## 部署指南

### 生产环境

生产环境部署只需运行 `./install.sh` 或 `node install.js`，脚本会自动完成所有配置。

**仅需提前准备 MySQL 数据库**（如使用 MySQL）：

```sql
-- 创建数据库
CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'idc_user'@'localhost' IDENTIFIED BY 'YourStrongPassword';
GRANT ALL PRIVILEGES ON idc_management.* TO 'idc_user'@'localhost';
FLUSH PRIVILEGES;
```

**服务器要求参考**：

| 规模 | CPU | 内存 | 磁盘 |
|------|-----|------|------|
| 小型（<100 设备） | 2 核心 | 4GB | 40GB |
| 中型（100-500 设备） | 4 核心 | 8GB | 80GB |
| 大型（>500 设备） | 8 核心+ | 16GB+ | 100GB+ |



### Nginx 配置

`install.js` 会自动配置 Nginx。配置文件位于 `deploy/nginx-idc.conf`，核心配置如下：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;

    root "/var/www/idc";
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json application/x-javascript image/svg+xml;

    # 静态资源缓存（1年）
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|hdr)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
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
        proxy_pass http://127.0.0.1:8000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 100M;
    }

    # 前端路由（SPA）
    location / {
        try_files $uri $uri/ /index.html =404;
    }
}
```

**启用配置**：

```bash
# Ubuntu/Debian
sudo cp deploy/nginx-idc.conf /etc/nginx/sites-available/idc
sudo ln -sf /etc/nginx/sites-available/idc /etc/nginx/sites-enabled/idc
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo nginx -s reload
```

---

## 系统维护

### 服务管理

```bash
# PM2 服务
pm2 status                    # 查看状态
pm2 logs idc-backend          # 查看日志
pm2 restart idc-backend         # 重启服务
pm2 stop idc-backend           # 停止服务
pm2 delete idc-backend         # 删除服务
pm2 save                       # 保存配置
pm2 startup                    # 开机自启

# Nginx
sudo nginx -t                 # 测试配置
sudo nginx -s reload          # 重载配置
sudo systemctl restart nginx   # 重启服务
```

### 日志查看

```bash
# PM2 日志
pm2 logs idc-backend
pm2 logs idc-backend --err    # 仅错误日志

# Nginx 日志
sudo tail -f /var/log/nginx/error.log

# 应用日志
tail -f backend/logs/*.log
```

### 数据备份

```bash
# 内置备份
# 系统管理 → 备份管理 → 创建备份

# 命令行备份
cd backend && node scripts/backup.js

# 还原
cd backend && node scripts/restore.js <backup-file>
```

---

## 常见问题

<details>
<summary>1. 端口冲突（8000、3000、80）</summary>

```bash
# 检查端口占用（Linux）
netstat -tulpn | grep :8000

# Windows
netstat -ano | findstr :8000

# 方案1：修改端口（编辑 backend/.env）
PORT=8001

# 方案2：停止占用进程
sudo kill $(lsof -t -i:8000)
```
</details>

<details>
<summary>2. 502 Bad Gateway</summary>

1. 检查后端服务：`pm2 status`
2. 检查端口监听：`netstat -tulpn | grep 8000`
3. 检查 Nginx 配置：`nginx -t`
4. 查看错误日志：`tail /var/log/nginx/error.log`
</details>

<details>
<summary>3. 前端构建失败</summary>

```bash
# 检查 Node.js 版本
node -v  # 需要 ≥18.x

# 清理并重试
cd frontend
rm -rf node_modules dist
npm install
npm run build
```
</details>

<details>
<summary>4. 数据库连接失败</summary>

**MySQL**：
- 检查服务状态：`sudo systemctl status mysql`
- 验证连接参数（主机、端口、用户名、密码）
- 确认数据库已创建：`SHOW DATABASES;`
- 检查用户权限：`SHOW GRANTS FOR 'idc_user'@'localhost';`
</details>

<details>
<summary>5. 权限问题</summary>

```bash
# 修复文件权限
sudo chown -R $(whoami):$(whoami) /path/to/idc_assest

# 上传目录权限
sudo chmod -R 777 backend/uploads
```
</details>

<details>
<summary>6. 内存不足</summary>

```bash
# 增加内存限制（编辑 ecosystem.config.js）
node_args: "--max-old-space-size=4096"

# 或命令行
pm2 restart idc-backend --update-env
```
</details>

<details>
<summary>7. npm 安装失败</summary>

```bash
# 清理缓存
npm cache clean --force

# 删除后重装
rm -rf node_modules package-lock.json
npm install
```
</details>

<details>
<summary>8. PM2 服务消失</summary>

```bash
# 重新启动
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```
</details>

</details>

---

## 项目结构

```
idc_assest/
├── frontend/               # 前端项目
│   ├── src/
│   │   ├── api/          # API 接口
│   │   ├── components/   # 组件（3d/、dashboard/、device/、floorplan/）
│   │   ├── pages/       # 页面
│   │   ├── hooks/       # 自定义 Hooks
│   │   ├── stores/      # 状态管理
│   │   └── utils/       # 工具函数
│   └── package.json
├── backend/               # 后端项目
│   ├── models/          # Sequelize 数据模型
│   ├── routes/          # API 路由
│   ├── middleware/      # 中间件
│   ├── scripts/         # 数据库脚本（init-database.js、migrate-all.js）
│   ├── utils/          # 工具函数
│   ├── uploads/        # 上传文件目录
│   ├── server.js       # 服务入口
│   └── package.json
├── deploy/               # 部署配置
│   ├── ecosystem.config.js   # PM2 配置
│   └── nginx-idc.conf        # Nginx 配置
├── install/              # 安装脚本模块
├── docs/                # 项目文档
├── install.sh           # Linux 安装引导脚本
├── install.js           # 安装脚本入口
├── update.js            # 更新脚本
├── uninstall.js         # 卸载脚本
└── README.md            # 本文件
```

---

## API 文档

完整交互式 API 文档访问：**http://localhost:8000/api-docs**

基于 Swagger/OpenAPI 3.0 标准，支持在线认证测试和 API 调试。

---

## 贡献指南

欢迎提交 Issue 或 Pull Request！

```bash
# 1. Fork 本项目

# 2. 克隆你的 Fork
git clone https://github.com/YOUR_USERNAME/idc_assest.git
cd idc_assest

# 3. 创建分支
git checkout -b feature/your-feature   # 功能开发
git checkout -b fix/your-fix          # Bug 修复

# 4. 开发并提交
git commit -m 'feat: 添加新功能'
git commit -m 'fix: 修复问题'

# 5. 推送并创建 PR
git push origin feature/your-feature
```

**提交信息规范**：

| 类型 | 说明 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档更新 |
| style | 代码格式 |
| refactor | 重构 |
| perf | 性能优化 |
| test | 测试 |
| chore | 构建/工具 |

**开发规范**：
- 使用 ES6+ 语法
- 遵循 React Hooks 规范
- 使用 async/await 处理异步
- 遵循 ESLint + Prettier 代码规范

---

## 许可证

本项目基于 **MIT 许可证**开源。

---

**⭐ 如果这个项目对您有帮助，请给我们一个 Star！**

- Gitee Issues: https://gitee.com/zhang96110/idc_assest/issues
- GitHub Issues: https://github.com/gituib/idc_assest/issues
- QQ 群：1081123775
