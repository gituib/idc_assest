# IDC设备管理系统

一个现代化的数据中心（IDC）设备管理系统，提供机房、机柜、设备的全生命周期管理，具备3D可视化展示功能。

## 代码仓库

- **GitHub**: https://github.com/gituib/idc_assest
- **Gitee**: https://gitee.com/zhang96110/idc_assest

## 系统概述

### 核心功能

| 功能模块 | 描述 |
|---------|------|
| **机房管理** | 多机房管理，支持位置、面积等详细信息 |
| **机柜管理** | 机柜增删改查，容量统计，3D可视化展示 |
| **设备管理** | 服务器、网络设备、存储设备全生命周期管理，支持批量导入/导出 |
| **端口管理** | 设备端口配置与管理，支持网卡绑定 |
| **线缆管理** | 机柜间线缆连接管理，可视化追踪 |
| **工单管理** | 故障报修、维护工单全流程管理，支持自定义字段 |
| **耗材管理** | 耗材库存、领用记录、统计报表管理 |
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

### 技术栈

#### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2.0 | 前端框架（用户界面开发库） |
| Vite | 4.4.9 | 构建工具（前端项目打包工具） |
| Ant Design | 5.8.6 | UI组件库（企业级设计系统） |
| Three.js | 0.160.0 | 3D渲染引擎 |
| React Router | 6.15.0 | 路由管理 |
| Axios | 1.5.0 | HTTP客户端 |
| Day.js | 1.11.19 | 日期处理库 |
| SheetJS (xlsx) | 0.18.5 | Excel文件处理 |
| PapaParse | 5.5.3 | CSV文件解析 |

#### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥14.0.0 | 运行环境 |
| Express | 4.18.2 | Web框架（后端服务框架） |
| Sequelize | 6.32.1 | ORM框架（数据库对象关系映射） |
| SQLite/MySQL | 5.1.6/8.0+ | 数据库 |
| JWT | 9.0.3 | 身份认证 |
| bcryptjs | 3.0.3 | 密码加密 |
| Winston | 3.19.0 | 日志管理 |
| Jest | 30.2.0 | 测试框架 |

## 项目结构

```
jigui/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── api/             # API接口封装
│   │   ├── assets/          # 静态资源（字体、3D环境贴图）
│   │   ├── components/      # 通用组件
│   │   │   ├── 3d/          # 3D可视化组件
│   │   │   │   ├── materials/   # 3D材质组件
│   │   │   │   ├── DeviceModel.jsx  # 设备模型
│   │   │   │   ├── RackModel.jsx    # 机柜模型
│   │   │   │   ├── Scene.jsx        # 3D场景
│   │   │   │   └── LODManager.jsx   # LOD管理器
│   │   │   └── *.jsx        # 业务组件
│   │   ├── context/         # React Context状态管理
│   │   ├── hooks/           # 自定义Hooks
│   │   ├── pages/           # 页面模块
│   │   └── utils/           # 工具函数
│   ├── public/              # 公共资源
│   └── vite.config.js       # Vite配置
├── backend/                  # 后端项目
│   ├── middleware/          # 中间件（认证、验证）
│   ├── models/              # 数据模型（Sequelize）
│   ├── routes/              # API路由
│   ├── scripts/             # 数据库脚本
│   ├── uploads/             # 文件上传目录
│   ├── validation/          # 数据验证Schema
│   └── server.js            # 服务入口
├── docs/                     # 项目文档
│   ├── api/                 # 接口文档
│   └── images/              # 文档图片
├── install.js                # 交互式安装脚本 ⭐
├── update.js                 # 一键更新脚本 ⭐
├── uninstall.js              # 卸载脚本
├── check.js                  # 环境检查脚本
├── modify.js                 # 配置修改脚本
├── README.md                 # 项目说明
├── CHANGELOG.md              # 版本记录
└── DEPLOYMENT.md             # 部署指南
```

## 快速开始

### 方式一：一键部署脚本（推荐）⭐

我们提供了交互式安装脚本，自动完成所有部署步骤：

```bash
# 克隆项目
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

**交互配置示例：**
```
▶ 环境检测
✓ Node.js v20.11.0
✓ npm 10.2.4
✓ PM2 已安装

▶ 数据库配置
选择数据库类型：
  1. SQLite（零配置，适合开发/小规模）
  2. MySQL（生产环境推荐）
请选择 (1): 1

▶ 服务配置
后端服务端口 (8000): 
选择运行环境：
  1. production（生产模式，性能优化，推荐正式部署）
  2. development（开发模式，详细日志，便于调试）
请选择 (1): 1
前端部署方式：
  1. Nginx（性能最优，推荐生产环境）
  2. PM2 serve（简单快捷，无需额外安装）
请选择 (1): 1

▶ 配置确认
部署配置摘要：
  数据库类型: sqlite
  后端端口: 8000
  运行环境: production
  前端部署: nginx
  前端端口: 80
确认以上配置并开始部署? (Y/n): Y

✓ 后端环境变量文件已生成 (.env)
✓ PM2 配置文件已生成 (ecosystem.config.js)
✓ Nginx 配置文件已生成 (nginx-idc.conf)
✓ 安装部署完成！
```

### 方式二：手动安装

#### 环境要求

| 项目 | 要求 |
|------|------|
| Node.js | ≥14.0.0（推荐 20.x LTS） |
| npm | ≥6.0.0 |
| 操作系统 | Windows 10/11、macOS、Linux |

#### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/gituib/idc_assest.git
cd idc_assest

# 2. 安装后端依赖
cd backend
npm install

# 3. 安装前端依赖
cd ../frontend
npm install

# 4. 配置环境变量
cd ../backend
cp .env.example .env

# 5. 启动服务
# 启动后端（端口8000）
npm run dev

# 启动前端（端口3000）- 新终端
cd ../frontend
npm run dev
```

**访问地址**：
- 前端应用：http://localhost:3000
- 后端API：http://localhost:8000/api
- 健康检查：http://localhost:8000/health

## 安装部署脚本

项目提供多个实用脚本，简化安装、更新、卸载等操作：

### 脚本列表

| 脚本 | 命令 | 功能说明 |
|------|------|----------|
| **install.js** | `npm run deploy` / `node install.js` | 交互式安装部署脚本 |
| **update.js** | `npm run update` / `node update.js` | 一键更新脚本 |
| **uninstall.js** | `node uninstall.js` | 卸载清理脚本 |
| **check.js** | `node check.js` | 环境检查脚本 |
| **modify.js** | `node modify.js` | 配置修改脚本 |

### install.js - 交互式安装部署

**功能特性：**
- ✅ 自动检测 Node.js、npm、PM2、Nginx 环境
- ✅ **Linux 支持自动安装 Node.js**（交互式）
- ✅ 交互式配置数据库（SQLite/MySQL）
- ✅ 交互式选择运行环境（development/production）
- ✅ 交互式选择前端部署方式（Nginx/PM2 serve）
- ✅ 自动安装项目依赖
- ✅ 自动初始化数据库
- ✅ 自动构建前端项目
- ✅ 使用 PM2 启动和管理服务

**使用方式：**
```bash
# 方式一：使用 npm 命令
npm run deploy

# 方式二：直接运行脚本
node install.js
```

### update.js - 一键更新

**功能特性：**
- ✅ 自动备份数据
- ✅ 拉取最新代码
- ✅ 更新前后端依赖
- ✅ 重建前端项目
- ✅ 重启服务

**使用方式：**
```bash
# 方式一：使用 npm 命令
npm run update

# 方式二：直接运行脚本
node update.js
```

### uninstall.js - 卸载清理

**功能特性：**
- ✅ 停止 PM2 服务
- ✅ 删除 PM2 进程配置
- ✅ 清理 Nginx 配置（可选）
- ✅ 备份数据（可选）
- ✅ 清理日志文件（可选）

**使用方式：**
```bash
node uninstall.js
```

**卸载流程：**
```
▶ 停止服务
✓ 已停止 idc-backend
✓ 已停止 idc-frontend

▶ 删除 PM2 配置
✓ 已删除 PM2 进程

▶ 清理 Nginx 配置
是否删除 Nginx 配置? (y/N): n

▶ 数据备份
是否备份数据库? (Y/n): y
✓ 数据库已备份到 backup/database_20240205_143022.sql

▶ 清理完成
✓ 卸载完成，感谢使用！
```

**注意事项：**
- 卸载前建议备份数据
- 默认保留数据库文件，可手动删除
- 上传的文件（avatars、uploads）需手动清理

### check.js - 环境检查

**功能特性：**
- ✅ 检查 Node.js 版本
- ✅ 检查 npm 版本
- ✅ 检查 PM2 安装状态
- ✅ 检查 Nginx 安装状态
- ✅ 检查端口占用情况
- ✅ 检查磁盘空间

**使用方式：**
```bash
node check.js
```

### modify.js - 配置修改

**功能特性：**
- ✅ 修改数据库配置
- ✅ 修改服务端口
- ✅ 修改运行环境
- ✅ 修改前端部署方式

**使用方式：**
```bash
node modify.js
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
# 拉取最新代码
git pull

# 更新后端
cd backend && npm install

# 更新前端并构建
cd ../frontend && npm install && npm run build

# 重启服务
pm2 restart idc-backend
```

## 主要功能详解

### 机房管理

- 多机房支持，机房详细信息记录
- 按机房分类管理机柜
- 机房容量统计与状态展示

### 机柜管理

- 机柜增删改查，支持自定义高度（U数）
- 机柜容量统计，功率管理
- 3D可视化展示，支持视角控制

### 设备管理

- 设备全生命周期管理（采购→上线→维护→报废）
- 批量导入/导出（支持Excel/CSV）
- 设备状态跟踪与筛选
- 自定义设备字段，灵活扩展
- 网卡管理与端口配置

### 端口与线缆管理

- 设备端口配置（类型、速率、状态）
- 网卡管理与绑定
- 线缆连接管理，可视化追踪
- 支持批量配置

### 工单管理

- 故障报修流程，支持附件上传
- 维护工单创建与处理
- 工单状态追踪，操作记录审计
- 自定义工单字段和分类

### 耗材管理

- 耗材分类管理，规格定义
- 库存监控，预警提醒
- 领用记录，使用追踪
- 耗材使用统计报表

### 数据看板

- 实时统计图表（设备状态、容量使用）
- 关键指标监控
- 趋势分析

### 3D可视化

- 三维机柜展示，真实比例渲染
- 设备悬停详情查看
- LOD（多级细节）优化，流畅渲染
- 设备弹出动画（可开关）
- 视角控制（旋转、缩放、平移）

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

## 部署

详细部署指南请参考 [DEPLOYMENT.md](DEPLOYMENT.md)。

### 开发环境

默认使用SQLite数据库，无需额外配置即可启动。

### 生产环境

- 推荐使用MySQL数据库
- 使用Nginx作为反向代理
- 配置SSL证书
- 建议使用PM2管理进程

### 服务管理命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs idc-backend

# 重启服务
pm2 restart idc-backend

# 停止服务
pm2 stop idc-backend
```

## 版本历史

完整版本记录请参考 [CHANGELOG.md](CHANGELOG.md)。

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE)。

## 贡献指南

欢迎提交Issue或Pull Request。

1. Fork本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

---

**⭐ 如果这个项目对您有帮助，请给我们一个Star！**
