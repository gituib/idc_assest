# IDC设备资产系统

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://react.dev/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

一个现代化的数据中心（IDC）设备管理系统，提供机房、机柜、设备的全生命周期管理，具备3D可视化展示功能。

## 代码仓库

- **GitHub**: https://github.com/gituib/idc_assest
- **Gitee**: https://gitee.com/zhang96110/idc_assest

---

## 系统概述

### 核心功能

| 功能模块 | 描述 |
|---------|------|
| **机房管理** | 多机房管理，支持位置、面积、负责人等详细信息 |
| **机柜管理** | 机柜增删改查，容量统计，3D可视化展示 |
| **设备管理** | 服务器、网络设备、存储设备全生命周期管理，支持批量导入/导出 |
| **端口管理** | 设备端口配置与管理，支持网卡绑定 |
| **线缆管理** | 机柜间线缆连接管理，可视化追踪 |
| **工单管理** | 故障报修、维护工单全流程管理，支持自定义字段、故障分类 |
| **耗材管理** | 耗材库存、领用记录、统计报表管理，支持SN序列号追踪 |
| **盘点管理** | 盘点计划制定与执行，盘点任务分配与结果记录 |
| **数据看板** | 实时监控数据中心整体运行状态，设备趋势图表 |
| **3D可视化** | 三维机柜可视化展示，支持设备悬停详情、LOD优化、性能模式 |
| **系统配置** | 设备字段、工单字段自定义管理，背景配置，系统设置 |
| **用户权限** | 基于角色的权限控制（RBAC），用户审核机制 |
| **备份管理** | 数据库备份与恢复，自动定时备份，多协议远程备份（FTP/SFTP/WebDAV/SMB） |
| **统计分析** | 设备、工单、耗材等多维度统计报表，用户增长趋势分析 |

### 项目截图

![数据看板](docs/images/dashboard-full.png)
*数据看板 - 实时监控数据中心运行状态*

![3D机柜可视化](docs/images/3d-visualization-full.png)
*3D机柜可视化 - 三维展示机柜设备布局*

![机房管理](docs/images/room-management-full.png)
*机房管理 - 多机房分类管理*

![机柜管理](docs/images/rack-management.png)
*机柜管理 - 机柜容量与设备布局管理*

![设备管理](docs/images/device-management-full.png)
*设备管理 - 设备全生命周期管理*

![耗材管理](docs/images/consumable-management.png)
*耗材管理 - 耗材库存与领用管理*

![工单管理](docs/images/ticket-management.png)
*工单管理 - 故障报修与维护工单处理*

![数据备份](docs/images/backup-management.png)
*数据备份 - 数据库备份与恢复管理*

---

## 技术栈

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2.0 | 前端框架（用户界面开发库） |
| Vite | 4.4.9 | 构建工具（前端项目打包工具） |
| Ant Design | 5.8.6 | UI组件库（企业级设计系统） |
| Three.js | 0.183.2 | 3D渲染引擎 |
| @react-three/fiber | 8.18.0 | React Three.js 集成 |
| @react-three/drei | 9.122.0 | Three.js 辅助组件库 |
| React Router | 6.15.0 | 路由管理 |
| Axios | 1.13.6 | HTTP客户端 |
| Day.js | 1.11.19 | 日期处理库 |
| SheetJS (xlsx) | 0.18.5 | Excel文件处理 |
| PapaParse | 5.5.3 | CSV文件解析 |
| Framer Motion | 12.34.0 | 动画库 |
| Styled Components | 6.3.9 | CSS-in-JS 样式方案 |
| SWR | 2.4.0 | 数据请求与缓存 |
| @ant-design/icons | 6.1.0 | 图标库 |
| Vitest | 4.0.16 | 前端测试框架 |

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥14.0.0（推荐 20.x LTS） | 运行环境 |
| Express | 4.18.2 | Web框架（后端服务框架） |
| Sequelize | 6.37.8 | ORM框架（数据库对象关系映射） |
| SQLite | 5.1.7 | 嵌入式数据库（开发/小规模） |
| MySQL | 8.0+ | 关系型数据库（生产环境） |
| JWT | 9.0.3 | 身份认证 |
| bcryptjs | 3.0.3 | 密码加密 |
| Winston | 3.19.0 | 日志管理 |
| Winston Daily Rotate File | 5.0.0 | 日志文件轮转 |
| Joi | 18.0.2 | 数据验证 |
| Jest | 30.2.0 | 测试框架 |
| Multer | 2.1.1 | 文件上传处理 |
| Express File Upload | 1.5.2 | 文件上传中间件 |
| Node Cron | 4.2.1 | 定时任务调度 |
| Axios | 1.13.6 | HTTP客户端 |
| CSV Parser | 3.2.0 | CSV文件解析 |
| CSV Writer | 1.6.0 | CSV文件生成 |
| SheetJS (xlsx) | 0.18.5 | Excel文件处理 |
| Day.js | 1.11.19 | 日期处理库 |
| Basic FTP | 5.0.3 | FTP协议支持 |
| SSH2 SFTP Client | 9.1.0 | SFTP协议支持 |
| WebDAV | 5.3.1 | WebDAV协议支持 |
| SMB2 | 0.2.2 | SMB/CIFS协议支持 |
| MySQL2 | 3.19.1 | MySQL数据库驱动 |
| Nodemon | 3.0.1 | 开发环境自动重启 |
| Supertest | 7.1.4 | API测试工具 |

---

## 环境要求

### 运行环境

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| **操作系统** | Windows 10/11、macOS 12+、Linux (Ubuntu 20.04+/CentOS 8+) | 同最低要求 |
| **Node.js** | ≥14.0.0 | 20.x LTS |
| **npm** | ≥6.0.0 | 10.x |
| **内存** | 4GB | 8GB+ |
| **磁盘空间** | 2GB | 10GB+ |

### 生产环境额外要求

| 项目 | 要求 |
|------|------|
| **数据库** | MySQL 8.0+ (推荐) 或 SQLite (小型部署) |
| **Web服务器** | Nginx 1.18+ (反向代理/静态文件服务) |
| **进程管理** | PM2 5.x+ |
| **SSL证书** | Let's Encrypt (可选) |

### 开发环境要求

| 项目 | 要求 |
|------|------|
| **代码编辑器** | VS Code (推荐) |
| **浏览器** | Chrome 90+、Firefox 90+、Safari 14+、Edge 90+ |
| **Git** | 2.30+ |

---

## 快速开始

### 方式一：一键部署脚本（推荐）⭐

我们提供了交互式安装脚本，自动完成所有部署步骤。

#### Linux 用户（支持自动安装 Node.js）

```bash
# 克隆项目（选择其一）
# Gitee（国内推荐）
git clone https://gitee.com/zhang96110/idc_assest.git
# GitHub
git clone https://github.com/gituib/idc_assest.git
cd idc_assest

# 方式1：使用 Shell 引导脚本（推荐，无需预装 Node.js）
chmod +x install.sh && ./install.sh

# 方式2：一键安装（从远程）
curl -fsSL https://gitee.com/zhang96110/idc_assest/raw/main/install.sh | bash
```

#### Windows 用户

```powershell
# 克隆项目
git clone https://gitee.com/zhang96110/idc_assest.git
cd idc_assest

# 运行安装脚本（需要先安装 Node.js）
node install.js

# 或使用 npm 命令
npm run deploy
```

#### 非交互式安装（快速部署）

```bash
# 使用默认配置快速安装
node install.js -y                    # 交互式安装

# 指定数据库类型
node install.js -y --db=mysql         # 使用 MySQL
node install.js -y --db=sqlite        # 使用 SQLite（默认）

# 指定端口
node install.js -y --port=3000        # 后端端口 3000

# 跳过前端构建
node install.js -y --skip-build
```

**脚本功能：**
- ✅ 自动检测 Node.js、npm、PM2、Nginx
- ✅ **Linux 自动安装 Node.js**（Ubuntu/Debian/CentOS/Arch）
- ✅ **MySQL 连接测试**（配置后自动验证）
- ✅ **安装后健康检查**（验证服务是否正常）
- ✅ 交互式配置数据库（SQLite/MySQL）
- ✅ 交互式选择运行环境（development/production）
- ✅ 交互式选择前端部署方式（Nginx/PM2 serve）
- ✅ 自动安装项目依赖
- ✅ 自动初始化数据库
- ✅ 自动构建前端项目
- ✅ 使用 PM2 启动和管理服务
- ✅ 日志持久化保存

### 方式二：手动安装

#### 1. 克隆项目

```bash
# 选择其一
# Gitee（国内推荐）
git clone https://gitee.com/zhang96110/idc_assest.git
# GitHub
git clone https://github.com/gituib/idc_assest.git
cd idc_assest
```

#### 2. 安装依赖

```bash
# 一键安装所有依赖（推荐）
npm run install:all

# 或分别安装
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

#### 3. 配置环境变量

```bash
cd ../backend
cp .env.example .env
```

根据需要编辑 `.env` 文件（开发环境使用默认 SQLite 配置即可）：

```env
# 开发环境配置示例
NODE_ENV=development
PORT=8000
DB_TYPE=sqlite
DB_PATH=./idc_management.db
```

#### 4. 初始化数据库

```bash
node scripts/init-database.js
```

#### 5. 数据库迁移

当项目更新后，可能需要执行数据库迁移脚本以更新表结构。迁移脚本支持幂等执行，重复执行不会出错。

**执行迁移脚本：**
```bash
cd backend
node scripts/migrate-all.js
```

**迁移脚本包含以下内容：**
| 迁移名称 | 说明 |
|----------|------|
| v2.0 - 网卡和端口表 | 创建 network_cards 表，为 device_ports 添加 nic_id 字段 |
| 用户表 pending 状态 | 为用户表添加 pending 状态支持 |
| 耗材乐观锁 | 为 consumables 表添加 version 字段 |
| 耗材操作日志表结构 | 添加 isEditable、originalLogId 等修改记录字段 |
| 耗材日志解耦 | 添加 isConsumableDeleted 和 consumableSnapshot 字段 |
| 移除日志外键约束 | 移除 consumable_logs 表的外键约束，防止级联删除 |
| 耗材日志归档表 | 创建 consumable_log_archives 归档表 |
| 耗材SN序列号字段 | 为 consumables、consumable_records、consumable_logs 添加 snList 字段 |

**注意事项：**
- 迁移脚本支持 SQLite 和 MySQL 两种数据库
- 建议在执行迁移前备份数据库
- 迁移脚本会自动检测已执行的迁移，避免重复执行

#### 6. 启动服务

**开发环境（同时启动前后端）：**
```bash
# 在项目根目录运行
npm start
```

**或分别启动：**
```bash
# 启动后端（端口8000）
cd backend
npm run dev

# 启动前端（端口3000）- 新终端
cd ../frontend
npm run dev
```

**访问地址：**
- 前端应用：http://localhost:3000
- 后端API：http://localhost:8000/api
- API文档：http://localhost:8000/api-docs
- 健康检查：http://localhost:8000/health

---

## 基本使用方法

### 首次登录

系统采用**首次注册自动成为管理员**的机制：

- 第一个注册的用户会自动获得「管理员」角色
- 后续注册的用户默认为「访客」角色，需要管理员审核后才能激活
- 首次访问系统时，请通过注册功能创建管理员账号

**注册方式：**
1. 打开系统登录页面
2. 点击「注册账号」链接
3. 填写用户名、密码、邮箱等信息
4. 提交后自动登录，成为系统管理员

> ⚠️ **安全建议**：首次登录后请立即修改默认密码！

### 常用操作指南

#### 1. 机房管理

- 进入「机房管理」页面，点击「新增机房」按钮
- 填写机房名称、位置、面积、负责人等信息
- 支持机房图片上传

#### 2. 机柜管理

- 在机房详情页或「机柜管理」页面管理机柜
- 设置机柜高度（U数）、位置坐标
- 查看机柜容量使用情况

#### 3. 设备管理

- 「设备管理」页面进行设备增删改查
- 支持 Excel/CSV 批量导入设备
- 设备状态：采购中 → 待安装 → 运行中 → 维护中 → 已报废

#### 4. 3D可视化

- 进入「3D可视化」页面查看机房3D模型
- 支持鼠标拖拽旋转、滚轮缩放
- 悬停设备查看详情，点击设备弹出操作面板

#### 5. 工单管理

- 创建故障报修或维护工单
- 分配负责人，设置优先级
- 记录处理过程，更新工单状态

#### 6. 耗材管理

- 管理耗材库存，设置库存预警阈值
- 记录耗材领用，追踪使用去向
- 查看耗材统计报表
- 支持SN序列号追踪
- 耗材操作日志归档

#### 7. 备份管理

- **手动备份**：立即创建数据库备份
- **自动备份**：配置定时自动备份（支持cron表达式）
- **备份恢复**：从备份文件恢复数据库
- **远程备份**：支持多种协议（FTP/SFTP/WebDAV/SMB）上传备份到远程服务器
- **备份列表**：查看和管理所有备份文件

#### 8. 统计分析

- **设备统计**：设备总数、状态分布、趋势图表
- **工单统计**：工单数量、处理时效、分类统计
- **耗材统计**：库存状况、领用趋势、分类统计
- **用户统计**：用户增长趋势、活跃用户分析
- **数据看板**：实时展示关键指标

---

## 项目结构

```
jigui/
├── frontend/                      # 前端项目
│   ├── src/
│   │   ├── api/                   # API接口封装
│   │   │   ├── index.js           # API请求封装
│   │   │   └── cache.js           # 缓存管理
│   │   ├── components/            # 通用组件
│   │   │   ├── 3d/                # 3D可视化组件
│   │   │   │   ├── materials/     # 3D材质组件
│   │   │   │   │   ├── constants.jsx
│   │   │   │   │   ├── devicePanel.jsx
│   │   │   │   │   ├── index.jsx
│   │   │   │   │   ├── rackFrame.jsx
│   │   │   │   │   └── utils.jsx
│   │   │   │   ├── DeviceModel.jsx   # 设备模型
│   │   │   │   ├── RackModel.jsx     # 机柜模型
│   │   │   │   ├── Scene.jsx         # 3D场景
│   │   │   │   └── LODManager.jsx    # LOD管理器
│   │   │   ├── dashboard/           # 数据看板组件
│   │   │   │   ├── AnimatedCounter.jsx
│   │   │   │   ├── CircularProgress.jsx
│   │   │   │   ├── DeviceTrendChart.jsx
│   │   │   │   ├── NavigationGrid.jsx
│   │   │   │   ├── PowerGauge.jsx
│   │   │   │   ├── QuickStats.jsx
│   │   │   │   ├── StatCard.jsx
│   │   │   │   ├── StatusLegend.jsx
│   │   │   │   └── SystemInfo.jsx
│   │   │   ├── device/              # 设备管理组件
│   │   │   │   ├── BatchStatusModal.jsx
│   │   │   │   ├── DeviceDetailModal.jsx
│   │   │   │   ├── DeviceFormModal.jsx
│   │   │   │   ├── ExportModal.jsx
│   │   │   │   ├── FieldConfigModal.jsx
│   │   │   │   ├── ImportModal.jsx
│   │   │   │   └── ResizableTitle.jsx
│   │   │   ├── CableCreateModal.jsx
│   │   │   ├── CloseButton.jsx
│   │   │   ├── DeviceDetailDrawer.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── NetworkCardCreateModal.jsx
│   │   │   ├── NetworkCardPanel.jsx
│   │   │   ├── PortCreateModal.jsx
│   │   │   ├── PortManagementPanel.jsx
│   │   │   ├── PortPanel.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── ServerBackplanePanel.jsx
│   │   │   └── VirtualDeviceList.jsx
│   │   ├── config/                # 配置文件
│   │   │   ├── api.js             # API配置
│   │   │   └── theme.js           # 主题配置
│   │   ├── constants/             # 常量定义
│   │   │   └── deviceManagementConstants.js
│   │   ├── context/               # React Context状态管理
│   │   │   ├── AuthContext.jsx        # 认证上下文
│   │   │   ├── ConfigContext.jsx      # 配置上下文
│   │   │   └── Scene3DContext.jsx     # 3D场景上下文
│   │   ├── hooks/                 # 自定义Hooks
│   │   │   ├── useApi.js          # API请求Hook
│   │   │   ├── useDebounce.js         # 防抖Hook
│   │   │   ├── useDesignTokens.js     # 设计令牌Hook
│   │   │   ├── useIdleTimeout.js      # 空闲超时Hook
│   │   │   └── useSWR.js           # SWR数据请求Hook
│   │   ├── pages/                 # 页面模块
│   │   │   ├── Dashboard.jsx         # 数据看板
│   │   │   ├── Login.jsx             # 登录页面
│   │   │   ├── RoomManagement.jsx     # 机房管理
│   │   │   ├── RackManagement.jsx     # 机柜管理
│   │   │   ├── DeviceManagement.jsx   # 设备管理
│   │   │   ├── DeviceFieldManagement.jsx # 设备字段管理
│   │   │   ├── PendingDeviceManagement.jsx # 待审核设备管理
│   │   │   ├── PortManagement.jsx     # 端口管理
│   │   │   ├── CableManagement.jsx    # 线缆管理
│   │   │   ├── TicketManagement.jsx    # 工单管理
│   │   │   ├── TicketCategoryManagement.jsx # 工单分类管理
│   │   │   ├── TicketFieldManagement.jsx # 工单字段管理
│   │   │   ├── TicketStatistics.jsx    # 工单统计
│   │   │   ├── ConsumableManagement.jsx # 耗材管理
│   │   │   ├── CategoryManagement.jsx   # 耗材分类管理
│   │   │   ├── ConsumableLogs.jsx       # 耗材日志
│   │   │   ├── ConsumableStatistics.jsx # 耗材统计
│   │   │   ├── InventoryManagement.jsx # 盘点管理
│   │   │   ├── InventoryTaskExecution.jsx # 盘点任务执行
│   │   │   ├── UserManagement.jsx      # 用户管理
│   │   │   ├── RolesManagement.jsx      # 角色管理
│   │   │   ├── SystemSettings.jsx     # 系统设置
│   │   │   ├── BackupManagement.jsx    # 备份管理
│   │   │   ├── AutoBackupSettings.jsx  # 自动备份设置
│   │   │   ├── RemoteBackupSettings.jsx # 远程备份设置
│   │   │   ├── Rack3DVisualization.jsx # 3D可视化
│   │   │   └── ErrorBoundaryTest.jsx   # 错误边界测试
│   │   ├── styles/                # 样式文件
│   │   │   └── deviceManagementStyles.js
│   │   ├── utils/                 # 工具函数
│   │   │   ├── common.js
│   │   │   ├── crypto.js
│   │   │   └── deviceUtils.jsx
│   │   ├── App.jsx               # 应用入口
│   │   ├── main.jsx              # 渲染入口
│   │   └── index.css              # 全局样式
│   ├── public/                    # 公共资源
│   │   ├── assets/3d/             # 3D资源
│   │   │   └── env.hdr            # 环境贴图
│   │   └── fonts/                 # 字体文件
│   │       └── Inter-Regular.woff2
│   ├── vite.config.mjs            # Vite配置
│   ├── .env.example               # 环境变量示例
│   └── package.json               # 前端依赖
├── backend/                       # 后端项目
│   ├── config/                    # 配置文件
│   │   ├── index.js              # 配置统一导出
│   │   ├── constants.js          # 常量配置
│   │   ├── security.js           # 安全配置
│   │   ├── auto-backup-settings.json # 自动备份设置
│   │   └── remote-backup-configs.json # 远程备份配置
│   ├── middleware/                # 中间件
│   │   ├── auth.js               # 认证中间件
│   │   └── validation.js         # 验证中间件
│   ├── models/                    # 数据模型（Sequelize）
│   │   ├── Room.js               # 机房模型
│   │   ├── Rack.js               # 机柜模型
│   │   ├── Device.js             # 设备模型
│   │   ├── DeviceField.js        # 设备字段模型
│   │   ├── DevicePort.js         # 设备端口模型
│   │   ├── NetworkCard.js        # 网卡模型
│   │   ├── Cable.js              # 线缆模型
│   │   ├── Ticket.js             # 工单模型
│   │   ├── TicketField.js        # 工单字段模型
│   │   ├── TicketCategory.js     # 工单分类模型
│   │   ├── TicketOperationRecord.js # 工单操作记录模型
│   │   ├── FaultCategory.js      # 故障分类模型
│   │   ├── Consumable.js         # 耗材模型
│   │   ├── ConsumableCategory.js # 耗材分类模型
│   │   ├── ConsumableRecord.js   # 耗材领用记录模型
│   │   ├── ConsumableLog.js      # 耗材日志模型
│   │   ├── ConsumableLogArchive.js # 耗材日志归档模型
│   │   ├── InventoryPlan.js      # 盘点计划模型
│   │   ├── InventoryTask.js      # 盘点任务模型
│   │   ├── InventoryRecord.js    # 盘点记录模型
│   │   ├── User.js               # 用户模型
│   │   ├── Role.js               # 角色模型
│   │   ├── Permission.js         # 权限模型
│   │   ├── UserRole.js           # 用户角色关联模型
│   │   ├── SystemSetting.js      # 系统设置模型
│   │   ├── PendingDevice.js      # 待审核设备模型
│   │   └── ticketIndex.js        # 工单模型初始化
│   ├── routes/                    # API路由
│   │   ├── auth.js               # 认证路由
│   │   ├── rooms.js              # 机房路由
│   │   ├── racks.js              # 机柜路由
│   │   ├── devices.js            # 设备路由
│   │   ├── deviceFields.js       # 设备字段路由
│   │   ├── devicePorts.js        # 设备端口路由
│   │   ├── networkCards.js       # 网卡路由
│   │   ├── cables.js             # 线缆路由
│   │   ├── tickets.js            # 工单路由
│   │   ├── ticketCategories.js   # 工单分类路由
│   │   ├── ticketFields.js       # 工单字段路由
│   │   ├── consumables.js        # 耗材路由
│   │   ├── consumableCategories.js # 耗材分类路由
│   │   ├── consumableRecords.js  # 耗材记录路由
│   │   ├── inventory.js          # 盘点路由
│   │   ├── users.js              # 用户路由
│   │   ├── roles.js              # 角色路由
│   │   ├── systemSettings.js     # 系统设置路由
│   │   ├── background.js         # 背景配置路由
│   │   ├── backup.js             # 备份管理路由
│   │   ├── statistics.js         # 统计分析路由
│   │   └── ticketCategories.js   # 工单分类路由
│   ├── scripts/                   # 数据库脚本
│   │   ├── init-database.js      # 数据库初始化
│   │   ├── migrate-all.js         # 执行所有迁移脚本
│   │   ├── archive/               # 归档迁移脚本
│   │   │   ├── migrate-v2.js
│   │   │   ├── migrate-consumable-logs.js
│   │   │   ├── migrate-consumable-version.js
│   │   │   ├── migrate-consumable-log-decouple.js
│   │   │   ├── migrate-consumable-log-archive.js
│   │   │   ├── remove-consumable-log-fk.js
│   │   │   └── migrate-add-pending-status.js
│   │   ├── backup.js             # 备份脚本
│   │   ├── restore.js            # 恢复脚本
│   │   ├── ensure_nic_schema.js  # 确保网卡表结构
│   │   ├── add-isSystem-column.js
│   │   ├── add-isSystem-mysql.js
│   │   ├── add-isSystem-sqlite.js
│   │   ├── update-system-fields.js
│   │   └── update-system-fields-v2.js
│   ├── utils/                     # 工具函数
│   │   ├── autoBackupScheduler.js # 自动备份调度器
│   │   ├── backup.js             # 备份工具
│   │   ├── remoteBackup.js       # 远程备份工具
│   │   └── remoteBackupConfig.js # 远程备份配置
│   ├── validation/                # 数据验证Schema
│   │   ├── deviceSchema.js
│   │   ├── rackSchema.js
│   │   └── roomSchema.js
│   ├── uploads/                   # 文件上传目录
│   │   └── avatars/              # 用户头像目录
│   ├── .env.example               # 环境变量示例
│   ├── server.js                  # 服务入口
│   ├── db.js                     # 数据库连接
│   ├── initConfig.js              # 初始化配置
│   ├── initDeviceFields.js        # 初始化设备字段
│   ├── initTicketFields.js        # 初始化工单字段
│   ├── create_indexes.js          # 创建数据库索引
│   ├── backgroundSettings.json    # 背景设置
│   ├── unlock_user.js             # 用户解锁脚本
│   └── package.json               # 后端依赖
├── docs/                          # 项目文档
│   ├── api/                      # 接口文档
│   │   └── README.md
│   ├── images/                   # 文档图片
│   │   ├── dashboard.png
│   │   ├── 3d-visualization.png
│   │   ├── device-management.png
│   │   └── room-management.png
│   └── USER_GUIDE.md             # 用户指南
├── scripts/                       # 项目脚本
│   └── frontend-manager.js        # 前端管理脚本
├── install.sh                     # Linux 安装引导脚本（Shell）⭐
├── install.js                     # 交互式安装脚本（Node.js）⭐
├── update.js                      # 一键更新脚本 ⭐
├── uninstall.js                   # 卸载脚本
├── package.json                   # 项目根依赖
├── README.md                      # 项目说明
├── CHANGELOG.md                   # 版本记录
├── DEPLOYMENT.md                  # 部署指南
├── LICENSE                        # 许可证
├── .eslintrc.js                   # ESLint配置
├── .prettierrc                    # Prettier配置
└── .prettierignore                # Prettier忽略文件
```

---

## 更新升级

### 一键更新（推荐）⭐

```bash
# 交互式更新
node update.js

# 查看帮助
node update.js --help

# 模拟运行（不执行实际操作）
node update.js --dry-run

# 跳过某些步骤
node update.js --skip-git        # 跳过 Git 拉取
node update.js --skip-backup     # 跳过数据库备份
node update.js --skip-migrate    # 跳过数据库迁移
node update.js --skip-build      # 跳过前端构建
node update.js --skip-deps       # 跳过依赖安装
node update.js --skip-restart    # 跳过服务重启

# 强制执行（忽略锁文件）
node update.js --force
```

**智能检测功能：**
- ✅ **依赖安装智能跳过** - 检测 package.json 变化，无变化则跳过
- ✅ **前端构建智能跳过** - 检测源码变化，无变化则跳过
- ✅ **数据库自动备份** - 更新前自动备份，支持回滚
- ✅ **健康检查验证** - 更新后验证服务是否正常
- ✅ **日志持久化** - 更新日志保存到 `logs/update_*.log`
- ✅ **锁机制** - 防止多个更新进程同时运行

### 手动更新

```bash
# 1. 拉取最新代码
git pull

# 2. 更新后端依赖
cd backend && npm install

# 3. 更新前端依赖并构建
cd ../frontend && npm install && npm run build

# 4. 重启服务
pm2 restart idc-backend
```

---

## 卸载系统

### 一键卸载（推荐）⭐

```bash
# 交互式卸载
node uninstall.js

# 查看帮助
node uninstall.js --help

# 强制卸载（无需确认）
node uninstall.js --force

# 卸载前自动备份
node uninstall.js --backup

# 跳过某些步骤
node uninstall.js --skip-db     # 跳过数据库删除
node uninstall.js --skip-deps   # 跳过依赖删除
```

**卸载功能：**
- ✅ 停止并删除 PM2 服务
- ✅ 清理 Nginx 配置
- ✅ 删除生成的配置文件
- ✅ 可选删除数据库文件
- ✅ 可选删除 node_modules
- ✅ 卸载前自动备份
- ✅ 日志持久化保存

---

## API接口

完整交互式API文档请访问：**http://localhost:8000/api-docs**

该文档基于Swagger/OpenAPI 3.0标准，提供：
- 📚 可视化API文档界面
- 🔐 在线JWT认证测试
- ⚡ 支持直接在线调试API接口
- 📊 自动同步最新接口信息

---

## 部署

详细部署指南请参考 [DEPLOYMENT.md](DEPLOYMENT.md)。

### 开发环境

默认使用SQLite数据库，无需额外配置即可启动。

### 生产环境

- 推荐使用MySQL数据库
- 使用Nginx作为反向代理
- 配置SSL证书（可选）
- 建议使用PM2管理进程

### 服务管理命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs idc-backend
pm2 logs idc-frontend

# 重启服务
pm2 restart idc-backend
pm2 restart idc-frontend

# 停止服务
pm2 stop idc-backend

# 删除服务
pm2 delete idc-backend
```

---

## 贡献指南

欢迎提交 Issue 或 Pull Request 为项目贡献力量。

### 贡献流程

1. **Fork 本项目**

2. **克隆 Fork 的仓库**

   ```bash
   git clone https://github.com/YOUR_USERNAME/idc_assest.git
   cd idc_assest
   ```

3. **创建功能分支**

   ```bash
   # 功能开发
   git checkout -b feature/your-feature-name
   
   # Bug 修复
   git checkout -b fix/your-fix-name
   ```

4. **进行开发**

   - 保持代码风格一致，遵循 ESLint + Prettier 规范
   - 编写有意义的提交信息
   - 确保代码通过 lint 检查

5. **提交更改**

   ```bash
   git add .
   git commit -m 'feat: 添加新功能描述'
   # 或
   git commit -m 'fix: 修复问题描述'
   ```

   **提交信息规范**：

   | 类型 | 说明 |
   |------|------|
   | feat | 新功能 |
   | fix | Bug 修复 |
   | docs | 文档更新 |
   | style | 代码格式调整 |
   | refactor | 代码重构 |
   | perf | 性能优化 |
   | test | 测试相关 |
   | chore | 构建/工具链变动 |

6. **推送到远程**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **创建 Pull Request**

   - 描述您的改动内容和目的
   - 关联相关 Issue（如果有）
   - 等待代码审查

### 开发规范

- 使用 ES6+ 语法
- 前端遵循 React Hooks 规范
- 后端使用 async/await 处理异步
- 保持函数简洁，单一职责
- 适当添加注释说明复杂逻辑

### 代码审查标准

- ✅ 代码功能正确性
- ✅ 符合项目编码规范
- ✅ 必要的测试覆盖
- ✅ 文档更新（如有必要）
- ✅ 性能影响评估

---

## 许可证

本项目基于 **MIT 许可证** 开源。

```
MIT License

Copyright (c) 2024 IDC Device Management System

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 致谢

感谢以下开源项目：

- [React](https://react.dev/) - 前端框架
- [Ant Design](https://ant.design/) - UI 组件库
- [Three.js](https://threejs.org/) - 3D 渲染引擎
- [Express](https://expressjs.com/) - Node.js Web 框架
- [Sequelize](https://sequelize.org/) - Node.js ORM

---

## 联系与支持

- **Gitee Issues**: https://gitee.com/zhang96110/idc_assest/issues
- **GitHub Issues**: https://github.com/gituib/idc_assest/issues
- 功能建议：提交 Issue 并标注 `feature-request`
- QQ群：1081123775
---

**⭐ 如果这个项目对您有帮助，请给我们一个 Star！**
