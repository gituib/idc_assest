# Docker 化部署方案

> 讨论时间: 2026-06-12

## 一、架构设计

### 3 个容器

| 容器 | 角色 | 说明 |
|------|------|------|
| **Nginx（含前端）** | Web 服务器 + 前端静态文件 | serve 前端构建产物，反向代理 `/api` 到后端 |
| **Backend** | Node.js 后端服务 | Express API 服务 |
| **MySQL** | 数据库 | MySQL 8.0 |

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Nginx 容器   │     │  Backend 容器 │     │  MySQL 容器   │
│              │     │              │     │              │
│  / ──────▶    │     │  Node.js     │     │  数据库       │
│  前端静态文件  │     │  :8000       │     │  :3306       │
│              │────▶│              │────▶│              │
│  /api ────▶   │     │              │     │              │
│  反向代理     │     │              │     │              │
│  :80         │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

> 注意：前端不单独占一个容器。前端代码构建成静态文件后，直接打包进 Nginx 镜像中。

---

## 二、主机需要映射的目录

| 路径 | 说明 | 必要性 |
|------|------|--------|
| `backend/.env` | 核心配置（数据库、JWT、日志等） | **必选** |
| `backend/uploads/` | 用户上传文件持久化 | **必选** |
| `backend/logs/` | 运行日志持久化 | **必选** |
| `backend/backups/` | 数据库备份文件持久化 | **必选** |
| `backend/temp/` | 临时文件 | 可选 |
| `mysql_data/` | MySQL 数据库文件持久化（Docker 数据卷） | **必选** |

---

## 三、构建与部署方案

### 3.1 CI/CD 自动化流程

```
开发 → git push
         │
         ▼
    GitHub Actions
         │
         ├── 构建 idc-backend:latest 镜像
         ├── 构建 idc-frontend:latest 镜像（Nginx + 前端静态文件）
         ├── 推送到镜像仓库（Docker Hub / 阿里云 / GitHub Container Registry）
         │
         ▼
    生产服务器
    docker compose pull      # 拉取最新镜像
    docker compose up -d     # 重启容器
```

### 3.2 环境区分

| 环境 | docker-compose 文件 | 镜像来源 |
|------|--------------------|----------|
| 开发环境 | `docker-compose.dev.yml`（含 `build:` 指令） | 本地构建 |
| 生产环境 | `docker-compose.prod.yml`（用 `image:` 指令） | 从镜像仓库拉取 |

生产环境的 `docker-compose.yml` 不写 `build:`，直接拉取远程镜像：

```yaml
services:
  backend:
    image: yourname/idc-backend:latest
    # 没有 build 指令，直接从仓库拉取

  frontend:
    image: yourname/idc-frontend:latest
    # 同上，服务器不需要装 Node.js

  mysql:
    image: mysql:8.0
```

### 版本回滚

构建时打版本标签，支持快速回滚：

```bash
# 部署新版本
docker compose pull && docker compose up -d

# 回滚到旧版本
BACKEND_VERSION=v1.2.0 FRONTEND_VERSION=v1.2.0 docker compose up -d
```

---

## 四、后端关键配置变化

| 配置项 | 开发环境（远程 MySQL） | Docker 生产环境 |
|--------|----------------------|----------------|
| `MYSQL_HOST` | `1p.debian.zhaoyi520.tk` | `mysql`（Docker 服务名） |
| `MYSQL_PORT` | `33060` | `3306` |
| `JWT_SECRET` | 自动生成 | 部署前必须手动配置 |

### 注意点

1. **JWT_SECRET**：生产环境必须在 `.env` 中预先配置好，因为容器内无法写回只读挂载的 `.env`
2. **数据库初始化**：MySQL 容器首次启动时，后端 `sequelize.sync()` 会自动建表，无需手动初始化
3. **Nginx 反向代理**：Nginx 容器内配置 `proxy_pass http://backend:8000`，用 Docker 服务名通信

### 已创建的文件（2026-06-12）

| 文件 | 说明 |
|------|------|
| `backend/Dockerfile` | 后端镜像构建（Node.js 20 Alpine） |
| `backend/.dockerignore` | 后端构建忽略配置 |
| `frontend/Dockerfile` | 前端镜像构建（多阶段构建：先 npm build，再 Nginx） |
| `frontend/nginx.conf` | Nginx 配置（serve 静态文件 + 反向代理 /api） |
| `frontend/.dockerignore` | 前端构建忽略配置 |
| `docker-compose.dev.yml` | 开发环境 Compose（含 `build:` 指令，本地构建） |
| `docker-compose.prod.yml` | 生产环境 Compose（用 `image:`，从仓库拉取） |

### 待实现

- ~~`.github/workflows/deploy.yml` — CI/CD 自动构建推送~~ ✅ 已完成

## 五、CI/CD 配置

### 5.1 镜像仓库：阿里云容器镜像服务

阿里云控制台开通容器镜像服务后：
1. 创建命名空间（如 `idc-assest`）
2. 创建镜像仓库：`idc-backend`、`idc-frontend`
3. 设置访问凭证（用户名 + 密码）

### 5.2 GitHub Secrets 配置

在 GitHub 仓库 `Settings → Secrets and variables → Actions` 中配置：

| Secret 名称 | 说明 |
|------------|------|
| `ALIYUN_USERNAME` | 阿里云 Docker Registry 用户名 |
| `ALIYUN_PASSWORD` | 阿里云 Docker Registry 密码 |
| `ALIYUN_NAMESPACE` | 阿里云命名空间 |

### 5.3 触发条件

- 推送到 `master` 分支 → 构建 `latest` 镜像
- 创建 `v*` 标签（如 `v1.0.0`）→ 构建对应版本镜像
- 手动触发（Actions 页面 `Run workflow`）

### 5.4 镜像标签策略

每次构建会同时打两个标签：
- `latest`（或 tag 名称）：最新版本
- `<commit-sha>`：精确回溯到某次提交

### 5.5 部署流程

```
开发者：git push origin master
            ↓
   GitHub Actions 自动构建
            ↓
   推送镜像到阿里云仓库
            ↓
   管理员 SSH 到生产服务器
            ↓
   cd /opt/idc_assest
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
```

### 5.6 已创建文件

- `.github/workflows/docker-build.yml` — CI/CD 工作流定义
- `.env.example` — 生产环境 docker-compose 环境变量示例
