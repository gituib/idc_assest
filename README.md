# IDC设备资产管理系统

[![License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://react.dev/)

现代化数据中心（IDC）设备管理系统，提供机房、机柜、设备的全生命周期管理，具备 3D 可视化展示功能。

**GitHub**: <https://github.com/gituib/idc_assest>

---

<div align="center">
  <a href="https://gituib.github.io/idc_assest-docs" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; font-size: 20px; font-weight: bold; text-decoration: none; border-radius: 8px; margin: 16px 0;">
    📖 查看完整文档教程 →
  </a>
  <br>
  <span style="color: #666; font-size: 14px;">包含安装部署、配置说明、使用指南等全部教程</span>
</div>

---

## 目录

- [IDC设备资产管理系统](#idc设备资产管理系统)
  - [快速开始](#快速开始)
    - [Linux 一键部署](#linux-一键部署)
    - [Windows 部署](#windows-部署)
  - [环境要求](#环境要求)
  - [脚本命令参考](#脚本命令参考)
    - [install.js - 安装脚本](#installjs---安装脚本)
    - [update.js - 更新脚本](#updatejs---更新脚本)
    - [uninstall.js - 卸载脚本](#uninstalljs---卸载脚本)
  - [首次访问与管理员账号](#首次访问与管理员账号)
  - [生产环境安全配置](#生产环境安全配置)
  - [系统维护](#系统维护)
    - [服务管理](#服务管理)
    - [日志查看](#日志查看)
    - [数据备份](#数据备份)
    - [事故诊断](#事故诊断)
  - [常见问题](#常见问题)
  - [项目结构](#项目结构)
  - [API 文档](#api-文档)
  - [贡献指南](#贡献指南)
  - [支持项目](#支持项目)
  - [许可证](#许可证)

***

## 快速开始

### Docker 部署（推荐）

> 适用于新服务器上快速部署，无需安装 Node.js 等运行时环境，只需 Docker 即可。

📖 **详细教程请查看文档站**：[Docker 部署指南](https://gituib.github.io/idc_assest-docs/deploy/docker-deploy.html)

### Linux 一键部署

```bash
# 克隆项目（GitHub 主仓库）
git clone https://github.com/gituib/idc_assest.git
cd idc_assest

# 运行安装脚本（自动安装 Node.js）
chmod +x install.sh
./install.sh
```

> `install.sh` 需要与仓库内的 `install.js` 配合运行，**必须先克隆仓库**。请勿使用 `curl ... | bash` 管道方式——管道执行时脚本无法定位自身所在目录，会因找不到 `install.js` 而退出。

**install.sh 自动完成**：

- 自动检测 Linux 发行版并安装 Node.js 20.x
  - Ubuntu / Debian
  - CentOS / RHEL / Fedora / Rocky Linux / AlmaLinux
  - Arch / Manjaro
  - 其他发行版回退至 nvm
- 自动安装系统依赖（git、curl）
- 调用 install.js 完成后续安装

### Windows 部署

```powershell
# 克隆项目
git clone https://github.com/gituib/idc_assest.git
cd idc_assest

# 运行安装脚本（需要先安装 Node.js）
node install.js

# 或使用 npm
npm run deploy
```

***

## 环境要求

| 项目          | 最低要求   | 推荐配置     |
| ----------- | ------ | -------- |
| **Node.js** | ≥16.0.0 | 20.x LTS |
| **内存**      | 4GB    | 8GB+     |
| **磁盘**      | 2GB    | 10GB+    |
| **数据库**     | SQLite（内置，默认） | MySQL 8.0+ |

> **npm、Nginx、PM2 无需提前准备**：`install.sh` / `install.js` 会自动检测并安装。Node.js 版本低于 16 时安装脚本会中止并提示升级。

> **操作系统**：Linux 为完整支持（自动安装 Node.js、自动配置 Nginx）。Windows 可正常使用，但 Nginx 需手动放置配置文件。macOS 建议仅用于开发调试。

***

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

# 仅重新生成并同步 Nginx 配置（端口跟随 backend/.env）
node install.js --regen-nginx

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

***

## 首次访问与管理员账号

系统**不内置默认管理员账号**，管理员通过「首个注册用户」机制产生。首次部署完成后：

1. 打开前端页面，进入**注册**页创建第一个账号。
2. 该账号在满足下方规则时自动获得管理员权限。

### 首管理员分配规则

| `.env` 中 `BOOTSTRAP_ADMIN_USERNAME` | 首个注册用户的行为 |
| --- | --- |
| **未配置**（默认） | 首用户直接成为管理员，后端启动时输出风险警告日志 |
| **已配置** | 仅当注册用户名与该值**完全一致**时分配管理员；其他用户名注册后状态为 `pending`（待审核），无任何权限 |

> ⚠️ **生产环境强烈建议配置此项。** 从服务启动到管理员注册完成之间存在一个窗口期，若未配置且端口已对外可达，任何先访问到注册页的人都会直接拿到超级管理员权限。

配置方式（`backend/.env`）：

```ini
# 预设首管理员用户名，仅该用户名的首次注册可获得管理员权限
BOOTSTRAP_ADMIN_USERNAME=your_admin_name
```

修改后需重启后端生效（`pm2 restart idc-backend`）。该配置**只在数据库无任何用户时起作用**，一旦已有用户则不再参与判定。

### 账号找回与补充创建

**场景一：空库阶段离线创建初始管理员**（不想通过注册页抢注，直接指定账号）：

```bash
cd backend

# 推荐：口令通过环境变量传入，不进入 shell 历史
ADMIN_PASSWORD='YourStrongPassword' node scripts/create-admin.js --username admin
```

> `--password` 参数同样可用，但口令会留在 shell 历史中，不推荐。

**行为说明**：该脚本是**幂等**的——用户已存在且已是管理员时直接退出；用户存在但非管理员时补齐 `admin` 角色，但**不修改已有口令**。因此它适用于空库初始化与补授角色，**不能用于重置已遗忘的密码**。

**场景二：管理员口令遗失**——走系统内置的「忘记密码」流程（`POST /api/auth/forgot-password/send-code`），通过邮箱验证码重置口令，重置成功后会自动激活被锁定的账户。

> 该流程有两个**前置条件**，缺一不可：① 已在「系统设置」中配置可用的 SMTP 邮件服务；② 账号已绑定邮箱且**完成邮箱验证**（`emailVerified`）。
>
> 若条件不满足，忘记密码页会始终提示「验证码已发送」但实际收不到邮件——这是防止账户枚举的刻意设计，不代表功能异常。
>
> 因此**建议在首次部署时即为管理员账号绑定并验证邮箱**，并优先确保 SMTP 可用。否则一旦口令遗失且无邮件通道，只能通过数据库层面人工介入恢复，风险较高。操作前请务必备份数据库。

***

## 生产环境安全配置

`install.js` 生成的 `backend/.env` 只包含端口、`NODE_ENV`、`JWT_SECRET` 与数据库连接。以下三项**不在自动生成范围内**，但对生产部署有实际安全影响，需人工补充。

配置位置统一为 `backend/.env`，修改后执行 `pm2 restart idc-backend` 生效。

### 1. `BOOTSTRAP_ADMIN_USERNAME`（强烈建议）

作用与风险见上一节。这是三项中优先级最高的一项，直接决定「谁能成为管理员」。

### 2. `CORS_ORIGINS`（建议）

跨域来源白名单，逗号分隔。用于限制哪些前端来源可以调用 `/api`。

```ini
# 单域名
CORS_ORIGINS=https://idc.example.com

# 多来源（如同时保留内网 IP 访问）
CORS_ORIGINS=https://idc.example.com,http://192.168.1.10
```

| 状态 | 实际行为 |
| --- | --- |
| 未配置 | 保持宽松策略，允许多源跨域，兼容开发环境与多入口访问 |
| 已配置 | 仅放行清单内的来源，其余来源的跨域请求会被拒绝 |

> 前后端同域部署（Nginx 同时提供静态页与 `/api` 代理）时，浏览器请求不构成跨域，即使不配置也能正常工作。此项主要针对分离部署或需要显式收紧的场景。

### 3. `REMOTE_BACKUP_KEY`（按需）

用于加密远程备份目标（FTP/SFTP/SMB/WebDAV）中的口令、私钥等敏感字段，算法为 AES-256-GCM（带完整性认证）。

```ini
# 生成命令（Node.js）
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
REMOTE_BACKUP_KEY=
```

| 状态 | 实际行为 |
| --- | --- |
| 未配置 | 自动复用 `JWT_SECRET` 派生密钥，只需维护一个密钥 |
| 已配置 | 与 `JWT_SECRET` 职责分离，单项泄露的影响范围更小 |

> ⚠️ **轮换 `JWT_SECRET` 前务必注意**：若 `REMOTE_BACKUP_KEY` 未配置（即复用 `JWT_SECRET`），直接更换 `JWT_SECRET` 会使所有已保存的远程备份凭据**无法解密**。轮换前须先用旧密钥执行 `node scripts/migrate-remote-backup-cipher.js` 完成重新加密，否则凭据将永久失效。

### 配置检查

补充完成后可用以下命令确认关键变量是否就位（值会脱敏显示，只判断是否存在）：

```bash
cd backend
grep -E "^(JWT_SECRET|BOOTSTRAP_ADMIN_USERNAME|CORS_ORIGINS|REMOTE_BACKUP_KEY)=" .env | sed 's/=.*/=<已设置>/'
```

> 上述四个变量中，`JWT_SECRET` 由 `install.js` 自动生成，其余三项需人工补充。未出现的行说明该项未配置——`CORS_ORIGINS`、`REMOTE_BACKUP_KEY` 属可选项；`BOOTSTRAP_ADMIN_USERNAME` 生产环境强烈建议配置。

***

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

### 事故诊断

线上出现异常（5xx 突增、接口不可达、疑似发布引入故障）时，使用内置的只读诊断脚本快速定位，无需登录系统。

```bash
# 在项目根目录执行
npm run doctor

# 等价于
node scripts/incident-doctor.js
```

**脚本特性**：

- **纯只读**：不重启服务、不修改配置、不写业务文件，所有修复动作仅以命令文本打印，可安全在生产环境直接运行
- **无需安装依赖**：只 `require` Node 内置模块（`fs`/`path`/`os`/`net`/`http`/`child_process`），不依赖项目 `node_modules`，无需 `npm install` 即可运行
- **单文件可移植**：将 `scripts/incident-doctor.js` 单独 `scp` 到目标服务器即可执行，无需同步整个仓库
- **优雅降级**：按需调用 `ps`/`ss`/`netstat`/`docker`/`git` 采集运行时信息（通过 `execFile` 直接执行，不经 shell 以规避注入）；缺少这些命令，或缺少日志目录、`.env`、`/proc` 时不中断，对应项标注「不可用」

**常用参数**：

| 参数 | 说明 |
| --- | --- |
| `--json` | 输出机器可读 JSON（默认输出中文事故卡） |
| `--out <dir>` | 事故卡 Markdown 落盘目录，默认 `./incidents` |
| `--root <dir>` | 项目根目录，默认自动探测含 `backend/server.js` 或 `backend/.env` 的目录 |
| `--port <n>` | 后端期望端口，默认读 `backend/.env` 的 `PORT`，回退 8000 |
| `--container <name>` | 后端容器名，默认自动探测 `idc-backend` 或名称含 `backend` 的容器 |
| `--window <min>` | 故障与最近部署的关联时间窗口，默认 10 分钟 |
| `--sample-minutes <min>` | HTTP 统计时间窗口，默认 60 分钟 |
| `-h, --help` | 显示帮助 |

**输出内容**：

- **终端**：中文事故卡，含判定结论 / 置信度 / HTTP 观测 / 故障开始时间 / 最近部署 / 核心证据 / 影响面 / 分级处置动作
- **文件**：`<out>/incident-<YYYYMMDD-HHMM>.md`，两种模式下均会落盘

**判定口径要点**：

- 4xx（401/403/404）默认**不计入**故障，仅作辅助证据；401/403 需相对基线显著突增且来源 IP 高度集中等条件才升级为故障候选
- 故障候选仅包括：5xx、超时或连接失败、进程/容器不可用、资源耗尽、伴随 5xx 的代码异常
- 窗口内响应样本少于 100 条时标注「样本不足，不下结论」，不输出百分比结论
- 当最近部署/配置变更与故障起点相差 ≤ `--window` 分钟时，优先判定为疑似发布引入，建议回滚

**典型用法**：

```bash
# 生产机应急排查（单文件拷贝，不依赖项目其余文件）
scp scripts/incident-doctor.js root@prod:/opt/idc/
ssh root@prod "cd /opt/idc && node incident-doctor.js"

# 放宽部署关联窗口到 30 分钟，并输出 JSON 供后续处理
npm run doctor -- --window 30 --json

# 指定事故卡落盘位置
npm run doctor -- --out /tmp/incidents
```

> 通过 `npm run doctor` 传参时需加 `--` 分隔符，否则参数会被 npm 自身消费。

***

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

> 若近期改过 `backend/.env` 的 `PORT`，Nginx 仍可能代理旧端口。执行 `node install.js --regen-nginx` 重新生成并同步配置，再 `pm2 restart idc-backend`。

</details>

<details>
<summary>3. 前端构建失败</summary>

```bash
# 检查 Node.js 版本
node -v  # 需要 ≥16.x，推荐 20.x LTS

# 清理并重试
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

</details>

<details>
<summary>4. 数据库连接失败</summary>

先确认 `backend/.env` 中的 `DB_TYPE` 与实际部署一致（`sqlite` 或 `mysql`）。

**MySQL**：

- 检查服务状态：`sudo systemctl status mysql`
- 验证连接参数（`DB_HOST`、`DB_PORT`、`DB_USERNAME`、`DB_PASSWORD`、`DB_NAME`）
- 确认数据库已创建：`SHOW DATABASES;`
- 检查用户权限（将占位符换成 `.env` 中的 `DB_USERNAME`）：

```sql
SHOW GRANTS FOR '<DB_USERNAME>'@'<DB_HOST>';
```

**SQLite**（默认）：

- 确认 `backend/.env` 中 `DB_STORAGE` 指向的文件可写，且 `backend/` 目录对运行用户有写权限
- 查看后端日志 `backend/logs/error-*.log` 中的 `SQLITE_*` 错误码

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

通过 PM2 为 Node 进程追加 V8 堆上限参数（`idc-backend` 为安装脚本创建的服务名）：

```bash
# 临时生效，重启后恢复
pm2 restart idc-backend --node-args="--max-old-space-size=4096"

# 永久生效：删除后带参数重建
pm2 delete idc-backend
cd backend && pm2 start server.js --name idc-backend \
  --node-args="--max-old-space-size=4096" --env production
pm2 save
```

> `--update-env` 只刷新环境变量，**不会**应用 `--node-args`，不要用它来调整内存上限。
> 另注意 `deploy/ecosystem.config.js` 中含 `max_memory_restart: '1G'`，进程占用超过该值时 PM2 会重启服务——排查内存问题时应一并确认此值是否过小。

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
# 重新启动（与安装脚本的启动方式保持一致）
cd backend && pm2 start server.js --name idc-backend --env production
pm2 save
pm2 startup
```

> 若你希望改用生成的 PM2 配置文件（含日志路径、`max_memory_restart` 等完整参数），路径是 `deploy/ecosystem.config.js`，**不在项目根目录**：
>
> ```bash
> pm2 start deploy/ecosystem.config.js
> ```
>
> 注意安装脚本本身并不使用该文件启动服务，两种方式择一即可，不要混用导致同名进程重复。

</details>

<details>
<summary>9. 打不开注册页 / 注册后没有管理员权限</summary>

系统不内置默认账号，管理员由「首个注册用户」产生。若注册后拿不到权限，最常见原因是 `backend/.env` 配置了 `BOOTSTRAP_ADMIN_USERNAME` 但注册用户名与其不一致——此时账号状态为 `pending`（待审核），需由管理员在用户管理中审核，或使用该预设用户名重新注册。

详见 [首次访问与管理员账号](#首次访问与管理员账号)。

</details>

<details>
<summary>10. 怀疑线上故障，需要快速定位</summary>

优先运行内置只读诊断脚本，而非逐个翻日志：

```bash
npm run doctor                  # 在项目根目录执行
npm run doctor -- --json        # 机器可读输出
npm run doctor -- --window 30   # 放宽部署关联窗口
```

脚本不会修改任何配置或重启服务，可安全在生产环境运行。详见 [事故诊断](#事故诊断)。

</details>

***

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
│   ├── nginx-troubleshooting.md  # Nginx 404 排查教程
│   ├── ecosystem.config.js       # PM2 配置（install.js 生成，不入库）
│   └── nginx-idc.conf            # Nginx 配置（install.js 生成，不入库）
├── install/              # 安装脚本模块
├── docs/                # 项目文档
├── install.sh           # Linux 安装引导脚本
├── install.js           # 安装脚本入口
├── update.js            # 更新脚本
├── uninstall.js         # 卸载脚本
└── README.md            # 本文件
```

***

## API 文档

**仅开发环境可用**。以开发模式启动后端后，访问：**<http://localhost:8000/api-docs>**

基于 Swagger/OpenAPI 3.0 标准，支持在线认证测试和 API 调试。

> **生产环境不提供此页面**。当 `NODE_ENV=production` 时，后端不会挂载 Swagger UI 与完整 OpenAPI 规格（含全部端点与参数，属信息泄露风险），访问该地址返回 404。如需查阅接口规格，请在开发环境启动或阅读源码中的路由定义。

***

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

| 类型       | 说明     |
| -------- | ------ |
| feat     | 新功能    |
| fix      | Bug 修复 |
| docs     | 文档更新   |
| style    | 代码格式   |
| refactor | 重构     |
| perf     | 性能优化   |
| test     | 测试     |
| chore    | 构建/工具  |

**开发规范**：

- 使用 ES6+ 语法
- 遵循 React Hooks 规范
- 使用 async/await 处理异步
- 遵循 ESLint + Prettier 代码规范

***

## 支持项目

如果这个项目对你有帮助，欢迎给仓库点一个 **Star**、分享项目，或通过以下方式支持维护工作。

### 赞赏作者

如果你觉得这个项目对你有帮助，可以请作者喝杯咖啡 ☕

<p align="center"><img src="wechat-donate.png" alt="微信赞赏二维码" width="80" /></p>

**微信赞赏**

> 如需联系作者确认赞赏，可加入 **QQ 群：1081123775**。

***

## 许可证

本项目采用**双授权（Dual Licensing）**模式：

### 开源通道（GPL-3.0）

- 遵循 [GNU GPL v3.0](LICENSE) 许可协议：任何个人或组织可免费使用、修改、二次开发、分发。
- **条件**：衍生作品必须以 GPL-3.0 协议开源并公开源代码。

### 商业通道（商业授权）

- 凡**不符合 GPL-3.0 要求**的商业使用或闭源二次开发，**必须**获得授权方 gituib 的[商业授权](LICENSE-COMMERCIAL.md)。
- 适用场景包括：闭源分发/销售、封装进闭源商业产品、对外提供商业化部署服务、企业内部闭源商业化运营等。
- 商业授权为非独占许可，付费后可使用、修改、分发并闭源集成本软件，详见 [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md)。

> 版权 © 2026 gituib（<https://github.com/gituib>）
>
> 如需商业授权，请联系：849185023@qq.com 或 <https://github.com/gituib>

***

**⭐ 如果这个项目对您有帮助，请给我们一个 Star！**

- GitHub Issues: <https://github.com/gituib/idc_assest/issues>
- QQ 群：1081123775

