# IDC 设备管理系统 - Docker 部署教程

> 适用场景：新服务器上首次部署
>
> 架构：3 个容器（Nginx + 前端静态文件 | Backend | MySQL）

---

## 目录

- [一、前置要求](#一前置要求)
- [二、服务器准备](#二服务器准备)
- [三、拉取项目与配置](#三拉取项目与配置)
- [四、生产环境配置](#四生产环境配置)
- [五、启动容器](#五启动容器)
- [六、验证部署](#六验证部署)
- [七、日常运维](#七日常运维)
- [八、版本升级](#八版本升级)
- [九、常见问题](#九常见问题)

---

## 一、前置要求

### 1.1 所需条件

| 条件 | 说明 |
|------|------|
| **服务器** | Linux 系统（推荐 Ubuntu 20.04+ / Debian 11+ / CentOS 7+） |
| **Docker** | 20.10 及以上版本 |
| **Docker Compose** | v2 及以上 |
| **Git** | 用于拉取项目代码 |
| **网络** | 服务器能访问阿里云容器镜像服务 |

### 1.2 架构说明

用户访问 `http://服务器IP` 时，请求流程如下：

```
用户浏览器 → Nginx 容器 :80
                ├── / 路径 → 返回前端静态页面（HTML/JS/CSS）
                └── /api 路径 → 反向代理 → Backend 容器 :8000 → MySQL 容器 :3306（或远程 MySQL）
```

---

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

### 2.2 创建目录结构

```bash
# 在服务器上创建项目根目录
mkdir -p /opt/idc_assest
cd /opt/idc_assest
```

---

## 三、拉取项目与配置

### 3.1 克隆项目代码

> 注意：克隆代码是为了获取 `docker-compose.prod.yml` 和 `.env` 配置模板，**不是用来构建镜像的**（镜像已由CI/CD自动构建好）。

```bash
git clone https://github.com/gituib/idc_assest.git .
```

### 3.2 创建数据持久化目录

```bash
mkdir -p backend/uploads backend/logs backend/backups backend/temp
```

### 3.3 配置 .env 文件

复制后端配置模板，填入实际参数：

```bash
cp backend/.env.example backend/.env   # 如果有示例文件则用，否则手动创建
# 或直接编辑
nano backend/.env
```

完整的 `.env` 配置内容如下：

```ini
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
MYSQL_PASSWORD=这里改成MySQL容器密码
MYSQL_DATABASE=idc_management

# 方式二：使用远程 MySQL（已有数据库的情况）
# DB_TYPE=mysql
# MYSQL_HOST=远程MySQL地址
# MYSQL_PORT=3306
# MYSQL_USERNAME=数据库用户名
# MYSQL_PASSWORD=数据库密码
# MYSQL_DATABASE=数据库名

# ==============================================
# JWT 密钥（重要！必须手动设置）
# 生产环境不能留空，生成命令：
#   node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
# ==============================================
JWT_SECRET=这里填入生成的密钥，至少32位

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
```

---

## 四、生产环境配置

部署方式分两种，选择其中一种：

### 方式A：使用 Docker 本地 MySQL（推荐新部署）

> MySQL 作为容器运行在 Docker 内部，数据卷持久化到主机。

**步骤 1：编辑 `.env`，确认 MySQL 配置如下：**

```ini
DB_TYPE=mysql
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USERNAME=idc_user
MYSQL_PASSWORD=你的密码
MYSQL_DATABASE=idc_management
```

**步骤 2：修改 `docker-compose.prod.yml`，取消 MySQL 容器的注释：**

使用以下命令编辑，把文件中 MySQL 相关部分（`# mysql:` 到 `# retries: 5`）的注释去掉：

```bash
nano docker-compose.prod.yml
```

去掉注释后，MySQL 部分应该是这样的（且 `volumes:` 和 `mysql_data:` 也要取消注释）：

```yaml
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
```

**步骤 3：创建 `.env` 文件（项目根目录，非 backend 目录），写入 MySQL 密码：**

```bash
# 在 /opt/idc_assest/ 下创建 .env 文件（与 docker-compose.prod.yml 同目录）
cat > .env << 'EOF'
MYSQL_ROOT_PASSWORD=root密码
MYSQL_USER=idc_user
MYSQL_PASSWORD=用户密码
MYSQL_DATABASE=idc_management
EOF
```

### 方式B：使用远程 MySQL（已有数据库）

> 保持现有的远程 MySQL 实例，不需要本地 MySQL 容器。

`docker-compose.prod.yml` 保持原样（MySQL 部分保持注释），`.env` 中配置远程数据库地址即可：

```ini
DB_TYPE=mysql
MYSQL_HOST=远程MySQL的IP或域名
MYSQL_PORT=3306
MYSQL_USERNAME=数据库用户名
MYSQL_PASSWORD=数据库密码
MYSQL_DATABASE=数据库名
```

---

## 五、启动容器

### 5.1 首次拉取镜像

```bash
cd /opt/idc_assest

# 方式A（本地 MySQL）
docker compose -f docker-compose.prod.yml pull

# 方式B（远程 MySQL）
docker compose -f docker-compose.prod.yml pull
```

### 5.2 启动服务

```bash
# 方式A（本地 MySQL）
docker compose -f docker-compose.prod.yml up -d

# 方式B（远程 MySQL）
docker compose -f docker-compose.prod.yml up -d
```

### 5.3 查看启动状态

```bash
# 查看所有容器状态
docker compose -f docker-compose.prod.yml ps

# 实时查看日志
docker compose -f docker-compose.prod.yml logs -f

# 单独查看某个容器的日志
docker logs idc-backend
docker logs idc-frontend
docker logs idc-mysql   # 仅方式A
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

---

## 六、验证部署

### 6.1 检查容器状态

```bash
docker compose -f docker-compose.prod.yml ps
```

所有容器都应该是 `Up` 状态：

```
NAME            IMAGE                                          STATUS          PORTS
idc-frontend    .../idc-frontend:latest                        Up              :80->80/tcp
idc-backend     .../idc-backend:latest                         Up (healthy)    8000/tcp
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

---

## 七、日常运维

### 7.1 常用命令

```bash
# 查看状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 重启服务
docker compose -f docker-compose.prod.yml restart

# 停止服务
docker compose -f docker-compose.prod.yml down

# 停止并删除数据卷（数据会丢失！慎用）
docker compose -f docker-compose.prod.yml down -v
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

修改 `.env` 后，需要重启后端容器才能生效：

```bash
docker compose -f docker-compose.prod.yml restart backend
```

---

## 八、版本升级

### 场景：代码有更新，需要部署新版本

```bash
# 1. 拉取最新镜像
docker compose -f docker-compose.prod.yml pull

# 2. 重新创建容器
docker compose -f docker-compose.prod.yml up -d

# 3. 清理旧镜像（可选）
docker image prune -a
```

### 回滚到指定版本

```bash
# 用 v2.1.0 版本的镜像启动
BACKEND_IMAGE=crpi-c807itn6exy37e7d.cn-hangzhou.personal.cr.aliyuncs.com/idc-assest/idc-backend:v2.1.0 \
FRONTEND_IMAGE=crpi-c807itn6exy37e7d.cn-hangzhou.personal.cr.aliyuncs.com/idc-assest/idc-frontend:v2.1.0 \
docker compose -f docker-compose.prod.yml up -d
```

---

## 九、常见问题

### 9.1 容器启动后立即退出

**原因：** 配置错误或数据库连接失败。

**排查：**

```bash
# 查看退出容器的日志
docker logs idc-backend

# 常见错误：
# - JWT_SECRET 未配置 → 在 .env 中设置 JWT_SECRET
# - MySQL 连接被拒 → 检查 MYSQL_HOST / MYSQL_PASSWORD
# - 端口被占用 → 检查 80 端口是否已被其他程序占用
```

### 9.2 端口被占用

如果 80 端口被其他服务占用，可以修改 `docker-compose.prod.yml` 中的端口映射：

```yaml
ports:
  - "8080:80"   # 改为 8080 端口，访问 http://ip:8080
```

### 9.3 拉取镜像失败

**原因：** 阿里云登录凭证问题或网络不通。

**排查：**

```bash
# 手动登录阿里云 Registry 测试
docker login crpi-c807itn6exy37e7d.cn-hangzhou.personal.cr.aliyuncs.com

# 检查网络
ping crpi-c807itn6exy37e7d.cn-hangzhou.personal.cr.aliyuncs.com
```

### 9.4 初始化后没有默认管理员账号

后端首次启动会自动创建默认管理员账号：

| 账号 | 说明 |
|------|------|
| `admin` | 管理员 |
| `admin` | 管理员密码 |

如果登录失败，检查后端日志是否有初始化相关的错误信息。

### 9.5 上传文件后访问 404

检查 `backend/uploads/` 目录是否存在且权限正确：

```bash
ls -la /opt/idc_assest/backend/uploads/
chmod 755 /opt/idc_assest/backend/uploads/
```
