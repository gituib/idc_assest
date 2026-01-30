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
├── docs/                     # 项目文档
│   └── api/                 # 接口文档
├── README.md                 # 项目说明
├── CHANGELOG.md              # 版本记录
└── DEPLOYMENT.md             # 部署指南
```

## 快速开始

### 环境要求

- Node.js ≥14.0.0
- npm ≥6.0.0 或 pnpm ≥8.0.0
- 操作系统：Windows 10/11、macOS、Linux

### 安装步骤

```bash
# 1. 安装后端依赖
cd backend
npm install

# 2. 安装前端依赖
cd ../frontend
npm install

# 3. 配置环境变量
cd ../backend
cp .env.example .env

# 4. 启动服务
# 启动后端（端口8000）
npm run dev

# 启动前端（端口3000）- 新终端
cd ../frontend
npm run dev
```

**访问地址**：
- 前端应用：http://localhost:3000
- 后端API：http://localhost:8000/api

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
