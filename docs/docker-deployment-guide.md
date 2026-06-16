# IDC 设备管理系统 - Docker 部署教程

> 适用场景：新服务器上首次部署
>
> 架构：3 个容器（Nginx + 前端静态文件 | Backend | MySQL）

***

## 目录

- [一、前置要求](#一前置要求)
- [二、服务器准备](#二服务器准备)
- [三、创建部署目录与配置](#三创建部署目录与配置)
- [四、生产环境配置](#四生产环境配置)
- [五、启动容器](#五启动容器)
- [六、验证部署](#六验证部署)
- [七、日常运维](#七日常运维)
- [八、版本升级](#八版本升级)
- [九、常见问题](#九常见问题)

***

## 一、前置要求

### 1.1 所需条件

| 条件                 | 说明                                                  |
| ------------------ | --------------------------------------------------- |
| **服务器**            | Linux 系统（推荐 Ubuntu 20.04+ / Debian 11+ / CentOS 7+） |
| **Docker**         | 20.10 及以上版本                                         |
| **Docker Compose** | v2 及以上                                              |
| **网络**             | 服务器能访问镜像仓库                                          |

### 1.2 镜像仓库说明

本项目使用 GitHub Container Registry 托管镜像，所有镜像均为公开（public）镜像，无需登录即可拉取。

镜像地址格式：`ghcr.io/gituib/镜像名:tag`

### 1.3 架构说明

用户访问 `http://服务器IP` 时，请求流程如下：

```
用户浏览器 → Nginx 容器 :80
                ├── / 路径 → 返回前端静态页面（HTML/JS/CSS）
                └── /api 路径 → 反向代理 → Backend 容器 :8000 → MySQL 容器 :3306（或远程 MySQL）
```

***

## 二、服务器准备

### 2.1 安装 Docker

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | bash -s docker
sudo systemctl enable docker
sudo systemctl start docker

# 验证
docker --version
docker compose version
```

### 2.2 验证 Docker 安装

```bash
docker --version
docker compose version
```

***

## 三、创建部署目录与配置

> 本部署方式**不需要 git clone** 整个项目仓库。只需在服务器上手动创建需要的配置文件和持久化目录即可。
>
> 需要创建的内容只有 3 个部分：
>
> 1. **配置文件**：`docker-compose.yml` + 项目根目录 `.env` + `backend/.env`
> 2. **持久化目录**：`backend/uploads/`、`backend/logs/`、`backend/backups/`、`backend/temp/`

### 3.1 创建部署目录结构

```bash
# 创建部署根目录和所有持久化目录
mkdir -p /opt/idc_assest/backend/{uploads,logs,backups,temp}
cd /opt/idc_assest

# 查看目录结构
tree /opt/idc_assest -L 2
```

预期输出：

```
/opt/idc_assest
└── backend
    ├── uploads/
    ├── logs/
    ├── backups/
    └── temp/
```

### 3.2 创建 docker-compose.yml

```bash
cat > /opt/idc_assest/docker-compose.yml << 'YAMLEOF'
# ============================================
# IDC 设备管理系统 - 生产环境配置
# 从镜像仓库拉取预构建镜像，无 build 指令
# 默认从 ghcr.io 拉取，可通过 BACKEND/FRONTEND_IMAGE 环境变量切换
# ============================================

services:
  # ---------- 后端服务 ----------
  backend:
    image: ${BACKEND_IMAGE:-ghcr.io/gituib/idc-backend:latest}
    container_name: idc-backend
    volumes:
      - ./backend/.env:/app/.env
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
      - ./backend/backups:/app/backups
      - ./backend/temp:/app/temp
    env_file:
      - ./backend/.env
    environment:
      - NODE_ENV=production
    networks:
      - idc-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # ---------- 前端（Nginx）服务 ----------
  frontend:
    image: ${FRONTEND_IMAGE:-ghcr.io/gituib/idc-frontend:latest}
    pull_policy: always
    container_name: idc-frontend
    ports:
      - "80:80"
    networks:
      - idc-network
    depends_on:
      - backend
    restart: unless-stopped

  # ---------- MySQL 数据库 ----------
  mysql:
    image: mysql:8.0
    container_name: idc-mysql
    volumes:
      - mysql_data:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-idc_management}
      MYSQL_USER: ${MYSQL_USER:-idc_user}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    networks:
      - idc-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  idc-network:
    driver: bridge

volumes:
  mysql_data:
YAMLEOF
```

> **注意**：请将 `你的GitHub用户名` 替换为实际的 GitHub 用户名（此处已替换为 gituib）。如果使用远程 MySQL（已有数据库），请在创建后编辑此文件，注释掉 `mysql` 服务部分。

### 3.3 创建项目根目录 .env 文件

> 这个文件是给 Docker Compose 读取的，用于配置 MySQL 容器本身的账号密码。

```bash
cd /opt/idc_assest
cat > .env << 'EOF'
MYSQL_ROOT_PASSWORD=这里填MySQL root密码
MYSQL_USER=idc_user
MYSQL_PASSWORD=这里填MySQL用户密码（与 backend/.env 中 MYSQL_PASSWORD 一致）
MYSQL_DATABASE=idc_management
EOF
```

### 3.4 创建 backend/.env 文件

> **重要**：这个文件是后端 Node.js 应用读取的，配置数据库连接、JWT 等业务参数。不要与项目根目录的 `.env` 混淆。

```bash
cd /opt/idc_assest

# 先生成 JWT 密钥（确保已执行 4.1 节的命令）
# JWT_SECRET=$(openssl rand -base64 64)

# 创建 backend/.env（注意：使用 << EOF 而非 << 'EOF'，使变量可以被展开）
cat > backend/.env << EOF
# ==============================================
# 服务器配置
# ==============================================
PORT=8000
NODE_ENV=production

# ==============================================
# 数据库配置
# ==============================================
# 方式一：使用 Docker 本地 MySQL 容器（推荐新部署）
DB_TYPE=mysql
MYSQL_HOST=mysql                      # Docker 服务名，不是 localhost
MYSQL_PORT=3306
MYSQL_USERNAME=idc_user
MYSQL_PASSWORD=这里改成MySQL用户密码
MYSQL_DATABASE=idc_management

# 方式二：使用远程 MySQL（已有数据库的情况）
# DB_TYPE=mysql
# MYSQL_HOST=远程MySQL地址
# MYSQL_PORT=3306
# MYSQL_USERNAME=数据库用户名
# MYSQL_PASSWORD=数据库密码
# MYSQL_DATABASE=数据库名

# ==============================================
# JWT 密钥（重要！通过变量自动注入，无需手动填写）
# ==============================================
JWT_SECRET=${JWT_SECRET}

# ==============================================
# 其他配置（保持默认即可）
# ==============================================
TOKEN_EXPIRY=24h
SALT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=3
LOCK_TIME_MINUTES=15
PASSWORD_MIN_LENGTH=8
USERNAME_MIN_LENGTH=4
USERNAME_MAX_LENGTH=30
API_TIMEOUT=20000
DB_QUERY_TIMEOUT=15000
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=500
MAX_FILE_SIZE_MB=30
MAX_AVATAR_SIZE_MB=2
MAX_RETRIES=5
RETRY_DELAY=2000
LOG_LEVEL=info
LOG_DIR=./logs
LOG_MAX_FILE_SIZE=20m
LOG_MAX_FILES=30d
EOF
```

### 3.5 验证文件结构

创建完成后，部署目录的文件结构应为：

```
/opt/idc_assest/
├── docker-compose.yml    # Docker Compose 配置
├── .env                       # Docker Compose 环境变量（MySQL 账号密码）
└── backend/
    ├── .env                   # 后端应用配置（数据库连接、JWT 等）
    ├── uploads/               # 上传文件持久化目录
    ├── logs/                  # 运行日志持久化目录
    ├── backups/               # 数据库备份持久化目录
    └── temp/                  # 临时文件目录
```

***

## 四、生产环境配置

### 4.1 生成并配置 JWT\_SECRET

直接在创建 `backend/.env` 时用变量注入，避免手动复制粘贴：

```bash
# 生成 JWT 密钥并保存到变量
JWT_SECRET=$(openssl rand -base64 64)

# 后续创建 backend/.env 时引用该变量即可
# 见下方 3.4 节示例中的 JWT_SECRET=${JWT_SECRET}
```

> 如果服务器没有 `openssl`，也可以用 `node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"` 生成。

### 4.2 确认账号密码一致性

> MySQL 容器的账号密码**必须**在两个 `.env` 文件中保持一致：

| 配置项                       | 文件位置                           | 说明                |
| ------------------------- | ------------------------------ | ----------------- |
| `MYSQL_USER=idc_user`     | `/opt/idc_assest/.env`         | 指定 MySQL 容器创建的用户名 |
| `MYSQL_USERNAME=idc_user` | `/opt/idc_assest/backend/.env` | 后端连接数据库用的用户名      |
| `MYSQL_PASSWORD=xxx`      | 两个文件各有一处                       | 密码必须相同            |

可以用以下命令快速对比两个文件中的用户和密码是否一致：

```bash
cd /opt/idc_assest
echo "=== 根目录 .env ===" && grep -E "MYSQL_USER|MYSQL_PASSWORD" .env
echo ""
echo "=== backend/.env ===" && grep -E "MYSQL_USERNAME|MYSQL_PASSWORD" backend/.env
```

预期输出（用户名为 `idc_user`，密码两处相同即表示一致）：

```
=== 根目录 .env ===
MYSQL_USER=idc_user
MYSQL_PASSWORD=MyPassw0rd!

=== backend/.env ===
MYSQL_USERNAME=idc_user
MYSQL_PASSWORD=MyPassw0rd!
```

### 4.3 方式B：使用远程 MySQL（可选）

> 如果已有远程 MySQL 实例，不想在 Docker 中运行 MySQL 容器，请执行以下操作：

**步骤 1**：编辑 `/opt/idc_assest/docker-compose.yml`，注释掉 `mysql` 服务部分：

```bash
# 用 sed 注释 mysql 服务（从 services: 末尾到文件末尾）
# 或者手动编辑，将 mysql: 到文件末尾的内容用 # 注释掉
```

**步骤 2**：修改 `/opt/idc_assest/backend/.env`，配置远程数据库地址：

```ini
DB_TYPE=mysql
MYSQL_HOST=远程MySQL的IP或域名
MYSQL_PORT=3306
MYSQL_USERNAME=数据库用户名
MYSQL_PASSWORD=数据库密码
MYSQL_DATABASE=数据库名
```

***

## 五、启动容器

### 5.1 首次拉取镜像

```bash
cd /opt/idc_assest
docker compose -f docker-compose.yml pull
```

### 5.2 启动服务

```bash
docker compose -f docker-compose.yml up -d
```

### 5.3 查看启动状态

```bash
# 查看所有容器状态
docker compose -f docker-compose.yml ps

# 实时查看日志
docker compose -f docker-compose.yml logs -f

# 单独查看某个容器的日志
docker logs idc-backend
docker logs idc-frontend
docker logs idc-mysql
```

### 5.4 等待初始化完成

首次启动后，后端会自动执行以下操作（约 10-30 秒）：

1. 连接数据库
2. 自动创建所有数据库表（`sequelize.sync()`）
3. 初始化默认数据（设备字段、工单字段、故障分类、系统设置等）

可以通过日志查看初始化进度：

```bash
docker logs -f idc-backend
```

当日志出现以下内容时，说明启动完成：

```
所有初始化完成，服务器准备就绪
服务器运行在 http://localhost:8000
```

***

## 六、验证部署

### 6.1 检查容器状态

```bash
docker compose -f docker-compose.yml ps
```

所有容器都应该是 `Up` 状态：

```
NAME            IMAGE                                          STATUS          PORTS
idc-frontend    ghcr.io/.../idc-frontend:latest                Up              :80->80/tcp
idc-backend     ghcr.io/.../idc-backend:latest                 Up (healthy)    8000/tcp
idc-mysql       mysql:8.0                                      Up              3306/tcp
```

### 6.2 访问系统

在浏览器中访问：

```
http://服务器IP
```

应该能看到登录页面。

### 6.3 测试 API

```bash
curl http://服务器IP/api
```

返回 JSON 格式的 API 信息。

### 6.4 健康检查

```bash
curl http://服务器IP/health
```

***

## 七、日常运维

### 7.1 常用命令

```bash
# 查看状态
docker compose -f docker-compose.yml ps

# 查看日志
docker compose -f docker-compose.yml logs -f

# 重启服务
docker compose -f docker-compose.yml restart

# 停止服务
docker compose -f docker-compose.yml down

# 停止并删除数据卷（数据会丢失！慎用）
docker compose -f docker-compose.yml down -v
```

### 7.2 备份数据库

```bash
# MySQL 本地容器方式
docker exec idc-mysql mysqldump -u root -p idc_management > backup_$(date +%Y%m%d).sql

# 如果开启了自动备份，后端自身也会定期备份到 backend/backups/ 目录
```

### 7.3 查看容器资源占用

```bash
docker stats idc-backend idc-frontend idc-mysql
```

### 7.4 更新服务配置

修改 `backend/.env` 后，需要重启后端容器才能生效：

```bash
docker compose -f docker-compose.yml restart backend
```

***

## 八、版本升级

### 场景：代码有更新，需要部署新版本

```bash
# 1. 拉取最新镜像
docker compose -f docker-compose.yml pull

# 2. 重新创建容器
docker compose -f docker-compose.yml up -d

# 3. 清理旧镜像（可选）
docker image prune -a
```

### 回滚到指定版本（ghcr.io）

```bash
BACKEND_IMAGE=ghcr.io/gituib/idc-backend:v2.1.0 \
FRONTEND_IMAGE=ghcr.io/gituib/idc-frontend:v2.1.0 \
docker compose -f docker-compose.yml up -d
```

***



## 九、常见问题

### 9.1 容器启动后立即退出

**原因：** 配置错误或数据库连接失败。

**排查：**

```bash
# 查看退出容器的日志
docker logs idc-backend

# 常见错误：
# - JWT_SECRET 未配置 → 在 backend/.env 中设置 JWT_SECRET
# - MySQL 连接被拒 → 检查 MYSQL_HOST / MYSQL_PASSWORD
# - 端口被占用 → 检查 80 端口是否已被其他程序占用
```

### 9.2 端口被占用

如果 80 端口被其他服务占用，可以修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "8080:80"   # 改为 8080 端口，访问 http://ip:8080
```

### 9.3 拉取镜像失败

**原因：** 网络问题或镜像仓库无法访问。

**排查：**

```bash
ping ghcr.io
```

### 9.4 初始化后没有默认管理员账号

系统**不内置默认管理员账号**，采用"首个注册用户自动成为管理员"机制。

首次访问系统时，转到注册页面创建第一个账号，该账号会自动被授予管理员权限。

> **注意**：项目根目录 `docker-compose.yml` 中的 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 等环境变量仅用于特定部署脚本，实际后端代码不依赖这些变量创建用户。

### 9.5 上传文件后访问 404

检查 `backend/uploads/` 目录是否存在且权限正确：

```bash
ls -la /opt/idc_assest/backend/uploads/
chmod 755 /opt/idc_assest/backend/uploads/
```

### 9.6 后端连不上 MySQL 容器

**排查步骤：**

```bash
# 1. 检查 MySQL 容器状态
docker ps | grep idc-mysql

# 2. 检查 backend/.env 中 MYSQL_HOST 是否是 mysql（服务名），不是 localhost
grep MYSQL_HOST /opt/idc_assest/backend/.env

# 3. 验证 MySQL 用户密码是否一致
#    backend/.env 中 MYSQL_USERNAME / MYSQL_PASSWORD
#    .env（项目根）中 MYSQL_USER / MYSQL_PASSWORD
#    两者必须匹配

# 4. 进入 MySQL 容器验证
docker exec -it idc-mysql mysql -u idc_user -p
```

### 9.7 如何在已有部署基础上添加新配置

如果已经在运行中，需要补充某个配置项：

```bash
# 1. 编辑 backend/.env 补充配置
vim /opt/idc_assest/backend/.env

# 2. 重启后端容器
docker compose -f docker-compose.yml restart backend
```

