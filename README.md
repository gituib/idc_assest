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
| **工单管理** | 故障报修、维护工单全流程管理，支持自定义字段 |
| **耗材管理** | 耗材库存、领用记录、统计报表管理 |
| **盘点管理** | 盘点计划制定与执行，盘点任务分配与结果记录 |
| **数据看板** | 实时监控数据中心整体运行状态 |
| **3D可视化** | 三维机柜可视化展示，支持设备悬停详情、LOD优化 |
| **系统配置** | 设备字段、工单字段自定义管理，背景配置 |
| **用户权限** | 基于角色的权限控制（RBAC） |

### 项目截图

![数据看板](docs/images/dashboard.png)
*数据看板 - 实时监控数据中心运行状态*

![3D机柜可视化](docs/images/3d-visualization.png)
*3D机柜可视化 - 三维展示机柜设备布局*

![设备管理](docs/images/device-management.png)
*设备管理 - 设备全生命周期管理*

![机房管理](docs/images/room-management.png)
*机房管理 - 多机房分类管理*

---

## 技术栈

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2.0 | 前端框架（用户界面开发库） |
| Vite | 4.4.9 | 构建工具（前端项目打包工具） |
| Ant Design | 5.8.6 | UI组件库（企业级设计系统） |
| Three.js | 0.160.0 | 3D渲染引擎 |
| @react-three/fiber | 8.18.0 | React Three.js 集成 |
| @react-three/drei | 9.122.0 | Three.js 辅助组件库 |
| React Router | 6.15.0 | 路由管理 |
| Axios | 1.5.0 | HTTP客户端 |
| Day.js | 1.11.19 | 日期处理库 |
| SheetJS (xlsx) | 0.18.5 | Excel文件处理 |
| PapaParse | 5.5.3 | CSV文件解析 |
| Framer Motion | 12.34.0 | 动画库 |
| Styled Components | 6.3.9 | CSS-in-JS 样式方案 |
| SWR | 2.4.0 | 数据请求与缓存 |

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥14.0.0（推荐 20.x LTS） | 运行环境 |
| Express | 4.18.2 | Web框架（后端服务框架） |
| Sequelize | 6.32.1 | ORM框架（数据库对象关系映射） |
| SQLite | 5.1.6 | 嵌入式数据库（开发/小规模） |
| MySQL | 8.0+ | 关系型数据库（生产环境） |
| JWT | 9.0.3 | 身份认证 |
| bcryptjs | 3.0.3 | 密码加密 |
| Winston | 3.19.0 | 日志管理 |
| Joi | 18.0.2 | 数据验证 |
| Jest | 30.2.0 | 测试框架 |

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

我们提供了交互式安装脚本，自动完成所有部署步骤：

```bash
# 克隆项目（选择其一）
# Gitee（国内推荐）
git clone https://gitee.com/zhang96110/idc_assest.git
# GitHub
git clone https://github.com/gituib/idc_assest.git
cd idc_assest

# 运行交互式安装脚本
npm run deploy
# 或
node install.js
```

**脚本功能：**
- ✅ 自动检测 Node.js、npm、PM2、Nginx
- ✅ **Linux 支持自动安装 Node.js**（交互式）
- ✅ 交互式配置数据库（SQLite/MySQL）
- ✅ 交互式选择运行环境（development/production）
- ✅ 交互式选择前端部署方式（Nginx/PM2 serve）
- ✅ 自动安装项目依赖
- ✅ 自动初始化数据库
- ✅ 自动构建前端项目
- ✅ 使用 PM2 启动和管理服务

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

```bash
# 启动后端（端口8000）
npm run dev

# 启动前端（端口3000）- 新终端
cd ../frontend
npm run dev
```

**访问地址：**
- 前端应用：http://localhost:3000
- 后端API：http://localhost:8000/api
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

---

## 项目结构

```
jigui/
├── frontend/                      # 前端项目
│   ├── src/
│   │   ├── api/                   # API接口封装
│   │   ├── assets/                # 静态资源（字体、3D环境贴图）
│   │   ├── components/            # 通用组件
│   │   │   ├── 3d/                # 3D可视化组件
│   │   │   │   ├── materials/     # 3D材质组件
│   │   │   │   ├── DeviceModel.jsx   # 设备模型
│   │   │   │   ├── RackModel.jsx     # 机柜模型
│   │   │   │   ├── Scene.jsx         # 3D场景
│   │   │   │   ├── LODManager.jsx    # LOD管理器
│   │   │   │   └── utils.jsx         # 3D工具函数
│   │   │   ├── DeviceDetailDrawer.jsx    # 设备详情抽屉
│   │   │   ├── PortManagementPanel.jsx   # 端口管理面板
│   │   │   └── ...
│   │   ├── context/               # React Context状态管理
│   │   │   ├── AuthContext.jsx        # 认证上下文
│   │   │   ├── ConfigContext.jsx      # 配置上下文
│   │   │   └── Scene3DContext.jsx     # 3D场景上下文
│   │   ├── hooks/                 # 自定义Hooks
│   │   │   ├── useDebounce.js         # 防抖Hook
│   │   │   ├── useDesignTokens.js     # 设计令牌Hook
│   │   │   └── useIdleTimeout.js      # 空闲超时Hook
│   │   ├── pages/                 # 页面模块
│   │   │   ├── Dashboard.jsx         # 数据看板
│   │   │   ├── RoomManagement.jsx     # 机房管理
│   │   │   ├── RackManagement.jsx     # 机柜管理
│   │   │   ├── DeviceManagement.jsx   # 设备管理
│   │   │   ├── PortManagement.jsx     # 端口管理
│   │   │   ├── CableManagement.jsx    # 线缆管理
│   │   │   ├── TicketManagement.jsx    # 工单管理
│   │   │   ├── ConsumableManagement.jsx # 耗材管理
│   │   │   ├── InventoryManagement.jsx # 盘点管理
│   │   │   ├── UserManagement.jsx      # 用户管理
│   │   │   ├── SystemSettings.jsx     # 系统设置
│   │   │   └── Rack3DVisualization.jsx # 3D可视化
│   │   ├── styles/                # 样式文件
│   │   ├── utils/                 # 工具函数
│   │   ├── config/                # 配置文件
│   │   ├── constants/             # 常量定义
│   │   ├── App.jsx               # 应用入口
│   │   ├── main.jsx              # 渲染入口
│   │   └── index.css              # 全局样式
│   ├── public/                    # 公共资源
│   ├── vite.config.mjs            # Vite配置
│   └── package.json               # 前端依赖
├── backend/                       # 后端项目
│   ├── middleware/                # 中间件
│   │   ├── auth.js               # 认证中间件
│   │   └── validation.js         # 验证中间件
│   ├── models/                    # 数据模型（Sequelize）
│   │   ├── Room.js               # 机房模型
│   │   ├── Rack.js               # 机柜模型
│   │   ├── Device.js             # 设备模型
│   │   ├── DeviceField.js        # 设备字段模型
│   │   ├── DevicePort.js         # 设备端口模型
│   │   ├── NetworkCard.js         # 网卡模型
│   │   ├── Cable.js              # 线缆模型
│   │   ├── Ticket.js             # 工单模型
│   │   ├── TicketField.js        # 工单字段模型
│   │   ├── TicketCategory.js     # 工单分类模型
│   │   ├── Consumable.js          # 耗材模型
│   │   ├── ConsumableCategory.js  # 耗材分类模型
│   │   ├── InventoryPlan.js       # 盘点计划模型
│   │   ├── InventoryTask.js       # 盘点任务模型
│   │   ├── InventoryRecord.js     # 盘点记录模型
│   │   ├── User.js                # 用户模型
│   │   ├── Role.js                # 角色模型
│   │   ├── Permission.js          # 权限模型
│   │   └── SystemSetting.js       # 系统设置模型
│   ├── routes/                    # API路由
│   │   ├── auth.js               # 认证路由
│   │   ├── rooms.js              # 机房路由
│   │   ├── racks.js              # 机柜路由
│   │   ├── devices.js            # 设备路由
│   │   ├── tickets.js            # 工单路由
│   │   ├── consumables.js         # 耗材路由
│   │   ├── users.js              # 用户路由
│   │   └── ...
│   ├── scripts/                   # 数据库脚本
│   │   ├── init-database.js      # 数据库初始化
│   │   ├── migrate-*.js           # 数据迁移脚本
│   │   └── archive/              # 归档脚本
│   ├── uploads/                   # 文件上传目录
│   ├── validation/                # 数据验证Schema
│   ├── server.js                  # 服务入口
│   ├── db.js                     # 数据库连接
│   └── package.json               # 后端依赖
├── docs/                          # 项目文档
│   ├── api/                      # 接口文档
│   └── images/                   # 文档图片
├── scripts/                       # 项目脚本
│   └── frontend-manager.js        # 前端管理脚本
├── install.js                     # 交互式安装脚本 ⭐
├── update.js                      # 一键更新脚本 ⭐
├── uninstall.js                   # 卸载脚本
├── check.js                       # 环境检查脚本
├── modify.js                      # 配置修改脚本
├── package.json                   # 项目根依赖
├── README.md                      # 项目说明
├── CHANGELOG.md                   # 版本记录
├── DEPLOYMENT.md                  # 部署指南
└── LICENSE                        # 许可证
```

---

## 更新升级

### 一键更新（推荐）⭐

```bash
npm run update
```

功能：自动备份 → 拉取代码 → 更新依赖 → 重建前端 → 重启服务

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

## API接口

完整接口文档请参考 [docs/api/README.md](docs/api/README.md)。

### 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `http://localhost:8000/api` |
| Content-Type | `application/json` |
| 认证方式 | Bearer Token (JWT) |

### 通用响应格式

**成功响应：**
```json
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}
```

**错误响应：**
```json
{
  "success": false,
  "error": "错误信息",
  "message": "详细描述"
}
```

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
