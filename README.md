# IDC设备管理系统

一个现代化的数据中心（IDC）设备管理系统，提供机房、机柜、设备的全生命周期管理，具备3D可视化展示功能。

## 代码仓库

- **GitHub**: https://github.com/gituib/idc_assest
- **Gitee**: https://gitee.com/zhang96110/idc_assest

## 系统概述

### 核心功能

- **机房管理**：管理多个机房的详细信息、容量和使用状态
- **机柜管理**：机柜的增删改查，支持按机房分类管理
- **设备管理**：服务器、网络设备、存储设备的全生命周期管理
- **工单管理**：设备故障报修、维护工单全流程管理
- **耗材管理**：耗材库存、领用记录、统计报表管理
- **数据看板**：实时监控数据中心整体运行状态
- **3D可视化**：三维机柜可视化展示，支持设备悬停详情查看
- **系统配置**：设备字段、工单字段自定义管理

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

| 类别 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 18.2.0 |
| 构建工具 | Vite | 4.4.9 |
| UI组件库 | Ant Design | 5.8.6 |
| 3D渲染 | Three.js | 0.160.0 |
| 后端框架 | Express | 4.18.2 |
| ORM框架 | Sequelize | 6.32.1 |
| 数据库 | SQLite/MySQL | 5.1.6/8.0+ |

## 项目结构

```
jigui/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── api/             # API接口封装
│   │   ├── components/      # 通用组件
│   │   ├── context/         # 状态管理
│   │   └── pages/           # 页面模块
│   └── vite.config.js       # Vite配置
├── backend/                  # 后端项目
│   ├── models/              # 数据模型
│   ├── routes/              # API路由
│   ├── middleware/          # 中间件
│   └── server.js            # 服务入口
├── deploy/                   # 部署配置 ⭐ NEW
│   ├── ecosystem.config.js  # PM2配置
│   └── nginx-idc.conf       # Nginx配置
├── docs/                     # 项目文档
│   └── api/                 # 接口文档
├── install.js                # 交互式安装脚本 ⭐ NEW
├── update.js                 # 一键更新脚本 ⭐ NEW
├── README.md                 # 项目说明
├── CHANGELOG.md              # 版本记录
└── DEPLOYMENT.md             # 部署指南
```

## 快速开始

### 方式一：一键部署脚本（推荐）⭐ NEW

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
✓ PM2 配置文件已生成 (deploy/ecosystem.config.js)
✓ Nginx 配置文件已生成 (deploy/nginx-idc.conf)
✓ 安装部署完成！
```

### 方式二：手动安装

#### 环境要求

- Node.js ≥14.0.0（推荐 20.x LTS）
- npm ≥6.0.0
- 操作系统：Windows 10/11、macOS、Linux

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

## 更新升级

### 一键更新（推荐）⭐ NEW

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

## 主要功能

### 机房管理

多机房支持，机房详细信息记录，按机房分类管理机柜。

### 机柜管理

机柜增删改查，机柜容量统计，可视化机柜状态展示。

### 设备管理

设备全生命周期管理，批量导入/导出，设备状态跟踪，自定义设备字段。

### 工单管理

故障报修流程，维护工单创建与处理，工单状态追踪，操作记录审计。

### 耗材管理

耗材分类管理，库存监控，领用记录，耗材使用统计报表。

### 数据看板

实时统计图表，设备状态分布，容量使用率分析，关键指标监控。

### 3D可视化

三维机柜展示，设备悬停详情，实时交互体验，视角控制功能，支持设备弹出动画开关。

## API接口

完整接口文档请参考 [docs/api/README.md](docs/api/README.md)。

### 基础信息

- Base URL: `http://localhost:8000/api`
- Content-Type: `application/json`

### 通用响应格式

```json
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}
```

### 错误响应

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
