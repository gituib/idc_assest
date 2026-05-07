# IDC设备资产系统 - Code Wiki

> 版本：2.0.0 | 更新日期：2026-05-07 | 项目地址：[GitHub](https://github.com/gituib/idc_assest)

---

## 目录

1. [系统概述](#1-系统概述)
2. [整体架构](#2-整体架构)
3. [前端模块结构](#3-前端模块结构)
4. [后端模块结构](#4-后端模块结构)
5. [数据模型关系](#5-数据模型关系)
6. [API接口规范](#6-api接口规范)
7. [关键模块详解](#7-关键模块详解)
8. [依赖关系](#8-依赖关系)
9. [运行环境与配置](#9-运行环境与配置)
10. [部署指南](#10-部署指南)
11. [系统关系图](#11-系统关系图)

---

## 1. 系统概述

### 1.1 项目简介

IDC设备资产系统（IDC Device Management System）是一个现代化的数据中心设备全生命周期管理平台，提供机房、机柜、设备的完整管理能力，并具备3D可视化展示功能。

### 1.2 技术栈概览

| 层级 | 技术选型 | 版本 |
|------|----------|------|
| **前端框架** | React + Vite | 18.2.0 / 4.4.9 |
| **UI组件库** | Ant Design | 5.8.6 |
| **3D渲染** | Three.js + @react-three/fiber | 0.183.2 / 8.18.0 |
| **后端框架** | Express | 4.18.2 |
| **ORM框架** | Sequelize | 6.37.8 |
| **数据库** | SQLite / MySQL | 5.1.7 / 8.0+ |
| **认证** | JWT | 9.0.3 |

### 1.3 核心功能模块

| 模块 | 功能描述 | 页面入口 |
|------|----------|----------|
| **机房管理** | 多机房分类、平面图可视化 | /rooms |
| **机柜管理** | 机柜CRUD、容量统计、3D可视化 | /racks |
| **设备管理** | 设备全生命周期、批量导入导出 | /devices |
| **端口管理** | 设备端口配置、网卡绑定 | /ports |
| **线缆管理** | 机柜间线缆连接可视化追踪 | /cables |
| **网络拓扑** | ReactFlow拓扑可视化 | - |
| **工单管理** | 故障报修、维护工单全流程 | /tickets |
| **耗材管理** | 库存、领用、SN序列号追踪 | /consumables |
| **盘点管理** | 盘点计划、任务分配、盘盈设备 | /inventory |
| **数据看板** | 实时监控、趋势图表、功率监控 | / |
| **3D可视化** | Three.js机柜可视化、LOD优化 | /visualization-3d |
| **备份管理** | 本地/远程备份、定时任务 | /backup |
| **操作日志** | 审计日志、统计分析 | /operation-logs |
| **用户权限** | RBAC角色控制 | /users |

---

## 2. 整体架构

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              客户端层 (Client)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   浏览器     │  │   移动端     │  │  Web App    │  │   PWA       │   │
│  │  (Chrome)   │  │  (响应式)    │  │  (SPA)      │  │  (可选)     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            前端层 (Frontend)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    React 18 + Vite                              │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │ 页面组件  │  │ 3D组件   │  │ 通用组件  │  │ Hooks   │            │   │
│  │  │ /pages  │  │ /3d     │  │/components│  │ /hooks │            │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │ Context │  │  API    │  │ Utils   │  │ Config  │            │   │
│  │  │状态管理  │  │封装     │  │工具函数  │  │配置中心  │            │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │         RESTful API           │
                    │         /api/*                │
                    └───────────────┬───────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                            后端层 (Backend)                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   Express.js Server                             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │中间件层  │  │路由层    │  │业务逻辑  │  │数据访问  │            │   │
│  │  │/middleware│  │/routes  │  │/routes  │  │/models  │            │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │验证层   │  │认证授权  │  │日志审计  │  │备份恢复  │            │   │
│  │  │/validation│ │/middleware│ │/utils  │  │/utils   │            │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            数据层 (Data Layer)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐                    ┌─────────────────┐             │
│  │     SQLite      │                    │     MySQL       │             │
│  │  (开发环境)      │◄────────────────►│   (生产环境)     │             │
│  │  idc_management.db│                  │   MySQL 8.0+   │             │
│  └─────────────────┘                    └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 前端项目结构

```
frontend/
├── public/                          # 静态公共资源
│   ├── assets/
│   │   └── 3d/
│   │       └── env.hdr              # 3D环境贴图
│   └── png/                          # 设备图标资源
│       ├── 服务器.png
│       ├── 交换机.png
│       ├── 路由器.png
│       └── 防火墙.png
├── src/                             # 源代码目录
│   ├── api/                          # API接口封装
│   │   ├── index.js                 # Axios实例、API方法
│   │   └── cache.js                 # 请求缓存管理
│   ├── components/                   # React组件库
│   │   ├── 3d/                       # 3D可视化组件
│   │   │   ├── materials/            # 3D材质组件
│   │   │   │   ├── TextureCache.js  # 纹理缓存管理
│   │   │   │   ├── constants.jsx    # 3D常量定义
│   │   │   │   ├── devicePanel.jsx  # 设备信息面板
│   │   │   │   ├── index.jsx        # 材质导出
│   │   │   │   ├── rackFrame.jsx    # 机柜框架材质
│   │   │   │   └── utils.jsx        # 3D工具函数
│   │   │   ├── CascadingRackPanel.jsx  # 级联机柜面板
│   │   │   ├── DeviceModel.jsx      # 设备3D模型
│   │   │   ├── LODManager.jsx       # LOD细节层次管理
│   │   │   ├── RackModel.jsx        # 机柜3D模型
│   │   │   ├── RackSelectorHeader.jsx  # 机柜选择器
│   │   │   └── Scene.jsx            # 3D主场景
│   │   ├── dashboard/               # 数据看板组件
│   │   │   ├── AnimatedCounter.jsx  # 数字动画
│   │   │   ├── CircularProgress.jsx # 环形进度
│   │   │   ├── DeviceTrendChart.jsx # 设备趋势图
│   │   │   ├── NavigationGrid.jsx   # 导航网格
│   │   │   ├── PowerGauge.jsx       # 功率仪表
│   │   │   ├── QuickStats.jsx       # 快速统计
│   │   │   ├── StatCard.jsx         # 统计卡片
│   │   │   ├── StatusLegend.jsx     # 状态图例
│   │   │   └── SystemInfo.jsx       # 系统信息
│   │   ├── device/                  # 设备管理组件
│   │   │   ├── BatchStatusModal.jsx # 批量状态修改
│   │   │   ├── DeviceDetailModal.jsx # 设备详情
│   │   │   ├── DeviceFormModal.jsx  # 设备表单
│   │   │   ├── ExportModal.jsx      # 导出弹窗
│   │   │   ├── FieldConfigModal.jsx # 字段配置
│   │   │   ├── ImportModal.jsx      # 导入弹窗
│   │   │   └── ResizableTitle.jsx   # 可调整标题
│   │   ├── floorplan/               # 机房平面图组件
│   │   │   ├── canvas/              # Canvas渲染
│   │   │   │   ├── CanvasConstants.js
│   │   │   │   ├── CanvasInteraction.js
│   │   │   │   ├── CanvasRenderer.js
│   │   │   │   ├── FloorPlanCanvas.jsx
│   │   │   │   └── index.js
│   │   │   ├── panels/              # 侧边面板
│   │   │   ├── toolbar/             # 工具栏
│   │   │   ├── index.js
│   │   │   └── styles.js
│   │   ├── rack/                    # 机柜组件
│   │   ├── topology/                # 网络拓扑组件
│   │   │   ├── hooks/               # 拓扑Hooks
│   │   │   │   ├── useTopologyData.js
│   │   │   │   └── useTopologyLayout.js
│   │   │   └── nodes/               # 拓扑节点
│   │   ├── CableCreateModal.jsx     # 线缆创建
│   │   ├── CableWizardModal.jsx     # 线缆向导
│   │   ├── DeviceDetailDrawer.jsx   # 设备详情抽屉
│   │   ├── ErrorBoundary.jsx        # 错误边界
│   │   ├── NetworkCardPanel.jsx     # 网卡面板
│   │   ├── PortManagementPanel.jsx   # 端口管理面板
│   │   ├── ProtectedRoute.jsx        # 路由保护
│   │   └── VirtualDeviceList.jsx     # 虚拟设备列表
│   ├── config/                      # 配置文件
│   │   ├── api.js                   # API基础配置
│   │   ├── dangerousOperationConfig.js  # 危险操作配置
│   │   └── theme.js                 # 主题配置
│   ├── constants/                   # 常量定义
│   │   └── deviceManagementConstants.js
│   ├── context/                     # React Context
│   │   ├── AuthContext.jsx          # 认证上下文
│   │   ├── ConfigContext.jsx         # 配置上下文
│   │   ├── FloorPlanContext.jsx     # 平面图上下文
│   │   └── Scene3DContext.jsx       # 3D场景上下文
│   ├── hooks/                       # 自定义Hooks
│   │   ├── floorplan/               # 平面图Hooks
│   │   │   ├── useFloorPlanContext.js
│   │   │   └── useFloorPlanData.js
│   │   ├── useApi.js                # API请求Hook
│   │   ├── useDangerousOperation.js  # 危险操作Hook
│   │   ├── useDebounce.js           # 防抖Hook
│   │   ├── useDesignTokens.js       # 设计令牌Hook
│   │   ├── useIdleTimeout.js        # 空闲超时Hook
│   │   ├── useResponsiveLayout.js   # 响应式布局Hook
│   │   ├── useSWR.js                # SWR数据请求Hook
│   │   └── useSortedRacks.js        # 机柜排序Hook
│   ├── pages/                       # 页面组件
│   │   ├── Dashboard.jsx            # 数据看板主页
│   │   ├── Login.jsx                # 登录页
│   │   ├── RoomManagement.jsx       # 机房管理
│   │   ├── RoomFloorPlan.jsx        # 机房平面图
│   │   ├── RackManagement.jsx        # 机柜管理
│   │   ├── DeviceManagement.jsx      # 设备管理
│   │   ├── DeviceFieldManagement.jsx # 设备字段管理
│   │   ├── IdleDeviceManagement.jsx  # 空闲设备管理
│   │   ├── PendingDeviceManagement.jsx # 待审核设备
│   │   ├── PortManagement.jsx        # 端口管理
│   │   ├── CableManagement.jsx       # 线缆管理
│   │   ├── TicketManagement.jsx      # 工单管理
│   │   ├── TicketCategoryManagement.jsx # 工单分类
│   │   ├── TicketFieldManagement.jsx # 工单字段
│   │   ├── TicketStatistics.jsx      # 工单统计
│   │   ├── ConsumableManagement.jsx  # 耗材管理
│   │   ├── CategoryManagement.jsx   # 耗材分类
│   │   ├── ConsumableLogs.jsx       # 耗材日志
│   │   ├── ConsumableStatistics.jsx  # 耗材统计
│   │   ├── InventoryManagement.jsx   # 盘点管理
│   │   ├── InventoryTaskExecution.jsx # 盘点任务执行
│   │   ├── OperationLogs.jsx        # 操作日志
│   │   ├── UserManagement.jsx        # 用户管理
│   │   ├── SystemSettings.jsx        # 系统设置
│   │   ├── BackupManagement.jsx      # 备份管理
│   │   ├── AutoBackupSettings.jsx   # 自动备份设置
│   │   ├── RemoteBackupSettings.jsx  # 远程备份设置
│   │   ├── Rack3DVisualization.jsx  # 3D可视化
│   │   └── ErrorBoundaryTest.jsx     # 错误边界测试
│   ├── styles/                      # 样式文件
│   │   └── deviceManagementStyles.js
│   ├── utils/                       # 工具函数
│   │   ├── common.js                # 通用工具
│   │   ├── crypto.js                # 加密工具
│   │   ├── deviceUtils.jsx          # 设备相关工具
│   │   ├── logger.js                # 日志工具
│   │   └── secureStorage.js         # 安全存储
│   ├── App.jsx                      # 应用入口
│   ├── main.jsx                    # 渲染入口
│   └── index.css                    # 全局样式
├── vite.config.mjs                 # Vite配置
├── package.json                     # 前端依赖
└── .env.example                     # 环境变量示例
```

### 2.3 后端项目结构

```
backend/
├── config/                          # 配置模块
│   ├── index.js                     # 配置统一导出
│   ├── constants.js                 # 常量配置
│   ├── routes.js                    # 路由注册配置
│   ├── security.js                  # 安全配置
│   ├── auto-backup-settings.json    # 自动备份设置
│   └── remote-backup-configs.json   # 远程备份配置
├── middleware/                       # 中间件
│   ├── auth.js                      # JWT认证中间件
│   ├── maintenance.js              # 维护模式中间件
│   ├── requestLogger.js             # 请求日志中间件
│   └── validation.js                # 验证中间件
├── models/                          # Sequelize数据模型
│   ├── index.js                     # 模型关联定义
│   ├── Room.js                      # 机房模型
│   ├── Rack.js                      # 机柜模型
│   ├── Device.js                    # 设备模型
│   ├── DeviceField.js               # 设备字段模型
│   ├── DevicePort.js                # 设备端口模型
│   ├── NetworkCard.js               # 网卡模型
│   ├── Cable.js                     # 线缆模型
│   ├── Ticket.js                    # 工单模型
│   ├── TicketField.js               # 工单字段模型
│   ├── TicketCategory.js           # 工单分类模型
│   ├── TicketOperationRecord.js     # 工单操作记录
│   ├── FaultCategory.js             # 故障分类模型
│   ├── Consumable.js                # 耗材模型
│   ├── ConsumableCategory.js        # 耗材分类模型
│   ├── ConsumableRecord.js          # 耗材领用记录
│   ├── ConsumableLog.js             # 耗材日志模型
│   ├── ConsumableLogArchive.js      # 耗材日志归档
│   ├── InventoryPlan.js             # 盘点计划模型
│   ├── InventoryTask.js             # 盘点任务模型
│   ├── InventoryRecord.js           # 盘点记录模型
│   ├── User.js                      # 用户模型
│   ├── Role.js                      # 角色模型
│   ├── Permission.js                # 权限模型
│   ├── UserRole.js                  # 用户角色关联
│   ├── SystemSetting.js             # 系统设置模型
│   ├── PendingDevice.js             # 待审核设备模型
│   ├── OperationLog.js              # 操作日志模型
│   ├── BackupLog.js                 # 备份日志模型
│   ├── Warehouse.js                 # 仓库模型
│   ├── Business.js                  # 业务模型
│   ├── DeviceBusiness.js            # 设备业务关联
│   └── ticketIndex.js               # 工单索引模型
├── routes/                           # API路由
│   ├── auth.js                      # 认证路由
│   ├── rooms.js                    # 机房路由
│   ├── racks.js                    # 机柜路由
│   ├── devices.js                  # 设备路由
│   ├── deviceFields.js             # 设备字段路由
│   ├── devicePorts.js              # 设备端口路由
│   ├── networkCards.js             # 网卡路由
│   ├── cables.js                   # 线缆路由
│   ├── tickets.js                  # 工单路由
│   ├── ticketCategories.js         # 工单分类路由
│   ├── ticketFields.js             # 工单字段路由
│   ├── consumables.js              # 耗材路由
│   ├── consumableCategories.js     # 耗材分类路由
│   ├── consumableRecords.js         # 耗材记录路由
│   ├── consumableImport.js         # 耗材导入路由
│   ├── inventory.js                # 盘点路由
│   ├── users.js                    # 用户路由
│   ├── roles.js                    # 角色路由
│   ├── systemSettings.js           # 系统设置路由
│   ├── background.js               # 背景配置路由
│   ├── backup.js                   # 备份管理路由
│   ├── statistics.js               # 统计分析路由
│   ├── operationLogs.js            # 操作日志路由
│   ├── idleDevices.js              # 空闲设备路由
│   ├── warehouses.js               # 仓库路由
│   ├── dangerousOperations.js       # 危险操作路由
│   └── topology.js                 # 拓扑路由
├── scripts/                          # 数据库脚本
│   ├── init-database.js            # 数据库初始化
│   ├── migrate-all.js              # 执行所有迁移
│   ├── fix-foreign-keys.js         # 外键修复
│   ├── backup.js                   # 备份脚本
│   ├── restore.js                  # 恢复脚本
│   ├── create_indexes.js           # 创建索引
│   ├── generate-rack-import-template.js  # 生成导入模板
│   └── archive/                     # 归档迁移脚本
│       ├── migrate-v2.js
│       ├── migrate-consumable-logs.js
│       ├── migrate-consumable-version.js
│       ├── migrate-consumable-log-decouple.js
│       ├── migrate-consumable-log-archive.js
│       ├── remove-consumable-log-fk.js
│       └── migrate-add-pending-status.js
├── utils/                            # 工具函数
│   ├── autoBackupScheduler.js       # 自动备份调度器
│   ├── backup.js                   # 备份工具
│   ├── remoteBackup.js             # 远程备份
│   ├── remoteBackupConfig.js       # 远程备份配置
│   ├── backupLog.js                # 备份日志
│   ├── dangerousOperationLogger.js  # 危险操作日志
│   ├── errorHandler.js             # 错误处理器
│   ├── healthCheck.js              # 健康检查
│   ├── idGenerator.js              # ID生成器
│   ├── importJobManager.js        # 导入任务管理
│   ├── logger.js                   # Winston日志
│   ├── maintenanceMode.js          # 维护模式
│   ├── operationLogger.js          # 操作日志
│   └── routeLoader.js              # 路由加载器
├── validation/                       # Joi验证Schema
│   ├── deviceSchema.js
│   ├── rackSchema.js
│   └── roomSchema.js
├── uploads/                         # 文件上传目录
│   └── avatars/                    # 用户头像
├── tests/                           # 测试文件
├── temp/                           # 临时文件目录
├── server.js                       # 服务入口
├── db.js                           # 数据库连接
├── initConfig.js                   # 初始化配置
├── initDeviceFields.js             # 初始化设备字段
├── initTicketFields.js             # 初始化工单字段
├── swagger.js                      # Swagger配置
├── swagger_docs.yaml               # Swagger文档
├── swagger_index.html             # Swagger页面
├── package.json                    # 后端依赖
├── .env.example                    # 环境变量示例
└── jest.config.js                  # Jest配置
```

---

## 3. 前端模块结构

### 3.1 组件架构

前端采用**组件化架构**，核心组件分类如下：

#### 3.1.1 页面组件 (pages/)

| 页面组件 | 文件路径 | 功能描述 |
|----------|----------|----------|
| Dashboard | pages/Dashboard.jsx | 数据看板主页，展示统计卡片、趋势图、功率仪表 |
| Login | pages/Login.jsx | 用户登录/注册页面 |
| RoomManagement | pages/RoomManagement.jsx | 机房增删改查，支持图片上传 |
| RackManagement | pages/RackManagement.jsx | 机柜管理，支持批量导入导出 |
| DeviceManagement | pages/DeviceManagement.jsx | 设备全生命周期管理 |
| PortManagement | pages/PortManagement.jsx | 设备端口配置管理 |
| CableManagement | pages/CableManagement.jsx | 线缆连接管理 |
| TicketManagement | pages/TicketManagement.jsx | 工单全流程管理 |
| ConsumableManagement | pages/ConsumableManagement.jsx | 耗材库存管理 |
| InventoryManagement | pages/InventoryManagement.jsx | 盘点计划与执行 |
| Rack3DVisualization | pages/Rack3DVisualization.jsx | Three.js 3D可视化 |
| RoomFloorPlan | pages/RoomFloorPlan.jsx | Canvas机房平面图 |
| BackupManagement | pages/BackupManagement.jsx | 数据库备份恢复 |
| UserManagement | pages/UserManagement.jsx | 用户与权限管理 |

#### 3.1.2 3D可视化组件 (components/3d/)

| 组件 | 文件 | 功能描述 |
|------|------|----------|
| Scene | Scene.jsx | Three.js主场景，管理相机、灯光、渲染器 |
| RackModel | RackModel.jsx | 机柜3D模型，支持LOD |
| DeviceModel | DeviceModel.jsx | 设备3D模型，根据类型渲染 |
| LODManager | LODManager.jsx | 细节层次管理，优化性能 |
| CascadingRackPanel | CascadingRackPanel.jsx | 级联机柜信息面板 |
| TextureCache | materials/TextureCache.js | 纹理缓存，减少加载时间 |
| devicePanel | materials/devicePanel.jsx | 设备悬停信息面板 |

#### 3.1.3 数据看板组件 (components/dashboard/)

| 组件 | 功能描述 |
|------|----------|
| StatCard | 统计卡片，展示单个指标 |
| AnimatedCounter | 数字动画组件 |
| CircularProgress | 环形进度指示器 |
| DeviceTrendChart | 设备趋势图表(ECharts) |
| PowerGauge | 功率监控仪表盘 |
| StatusLegend | 设备状态图例 |
| NavigationGrid | 快捷导航网格 |
| SystemInfo | 系统运行信息 |

### 3.2 Context状态管理

```javascript
// AuthContext - 认证状态管理
AuthContext {
  user: Object,           // 当前用户信息
  token: String,          // JWT令牌
  loading: Boolean,       // 加载状态
  initialized: Boolean,    // 初始化完成
  login(),                // 登录方法
  register(),             // 注册方法
  logout(),               // 登出方法
  hasPermission(),         // 权限检查
}

// ConfigContext - 全局配置管理
ConfigContext {
  config: Object,          // 系统配置
  updateConfig(),          // 更新配置
}

// Scene3DContext - 3D场景状态
Scene3DContext {
  scene: Object,            // Three.js场景
  camera: Object,          // 相机
  selectedRack: Object,     // 选中机柜
  setSelectedRack(),        // 设置选中
}

// FloorPlanContext - 平面图状态
FloorPlanContext {
  canvas: Object,           // Canvas对象
  roomData: Object,         // 机房数据
  racks: Array,             // 机柜列表
}
```

### 3.3 关键Hooks

| Hook | 文件 | 功能描述 |
|------|------|----------|
| useApi | hooks/useApi.js | 封装API请求，支持 loading/error 状态 |
| useSWR | hooks/useSWR.js | SWR数据获取与缓存 |
| useDebounce | hooks/useDebounce.js | 防抖处理 |
| useIdleTimeout | hooks/useIdleTimeout.js | 空闲超时检测 |
| useDangerousOperation | hooks/useDangerousOperation.js | 危险操作二次确认 |
| useDesignTokens | hooks/useDesignTokens.js | Ant Design主题令牌 |
| useResponsiveLayout | hooks/useResponsiveLayout.js | 响应式布局 |
| useSortedRacks | hooks/useSortedRacks.js | 机柜排序 |

### 3.4 API封装 (api/index.js)

```javascript
// Axios实例配置
const api = axios.create({
  baseURL: '/api',           // API基础URL
  timeout: 30000,            // 超时30秒
  headers: { 'Content-Type': 'application/json' }
});

// 请求拦截器 - 自动添加Token
api.interceptors.request.use(config => {
  const token = secureStorage.get(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      // Token过期，跳转登录
    }
    return Promise.reject(error);
  }
);

// API模块导出
export const authAPI = { login, register, getProfile, ... };
export const deviceAPI = { list, get, create, update, delete, ... };
export const ticketAPI = { list, get, create, assign, process, ... };
export const backupAPI = { list, create, restore, download, ... };
// ... 更多API模块
```

---

## 4. 后端模块结构

### 4.1 服务入口 (server.js)

```javascript
// server.js - 应用入口流程
async function initializeApp() {
  // 1. 数据库同步
  await syncDatabase();           // 连接并同步表结构

  // 2. 初始化设备字段
  await initDeviceFields();

  // 3. 初始化工单字段
  await initTicketFields();

  // 4. 初始化工单模型关联
  await initTicketModels();

  // 5. 同步耗材模型
  await syncConsumableModels();

  // 6. 同步盘点模型
  await syncInventoryModels();

  // 7. 初始化系统设置
  await initDefaultSystemSettings();

  // 8. 初始化故障分类
  await initFaultCategories();

  // 9. 初始化自动备份调度器
  await initAutoBackupScheduler();
}
```

### 4.2 数据库连接 (db.js)

```javascript
// 支持 SQLite 和 MySQL 双数据库
const DB_TYPE = process.env.DB_TYPE || 'sqlite';

if (DB_TYPE === 'mysql') {
  sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    database: process.env.MYSQL_DATABASE,
    username: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    pool: { max: 10, min: 2, acquire: 30000, idle: 10000 }
  });
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_PATH || './idc_management.db'
  });
}
```

### 4.3 中间件层

| 中间件 | 文件 | 功能描述 |
|--------|------|----------|
| authMiddleware | middleware/auth.js | JWT令牌验证、用户认证 |
| maintenanceMiddleware | middleware/maintenance.js | 维护模式拦截 |
| requestLogger | middleware/requestLogger.js | HTTP请求日志记录 |
| validationMiddleware | middleware/validation.js | Joi数据验证 |

### 4.4 路由模块 (routes/)

| 路由模块 | 基础路径 | 功能描述 |
|----------|----------|----------|
| auth | /api/auth | 登录、注册、Token管理 |
| rooms | /api/rooms | 机房CRUD |
| racks | /api/racks | 机柜CRUD |
| devices | /api/devices | 设备CRUD、批量操作 |
| deviceFields | /api/deviceFields | 设备自定义字段 |
| devicePorts | /api/device-ports | 设备端口管理 |
| networkCards | /api/network-cards | 网卡管理 |
| cables | /api/cables | 线缆连接管理 |
| tickets | /api/tickets | 工单全流程 |
| consumables | /api/consumables | 耗材管理 |
| inventory | /api/inventory | 盘点管理 |
| users | /api/users | 用户管理 |
| roles | /api/roles | 角色权限 |
| systemSettings | /api/system-settings | 系统配置 |
| backup | /api/backup | 备份恢复 |
| statistics | /api/statistics | 统计分析 |
| operationLogs | /api/operation-logs | 操作审计 |
| topology | /api/topology | 网络拓扑 |

---

## 5. 数据模型关系

### 5.1 核心模型关系图

```
┌─────────────┐
│    Room     │  ──1:N──►  ┌─────────┐
│   (机房)    │            │  Rack   │
└─────────────┘            │ (机柜)  │
       │                  └────┬────┘
       │                       │
       │                       │ 1:N
       │                       ▼
       │                  ┌─────────┐
       │                  │ Device  │
       │                  │ (设备)  │
       │                  └────┬────┘
       │                       │
       │           ┌───────────┼───────────┐
       │           │           │           │
       │           ▼           ▼           ▼
       │     ┌──────────┐ ┌──────────┐ ┌──────────┐
       │     │NetworkCard│ │DevicePort│ │DeviceField│
       │     │  (网卡)  │ │ (端口)  │ │ (字段)  │
       │     └────┬─────┘ └────┬─────┘ └──────────┘
       │          │           │
       │          │           │ N:1
       │          │           ▼
       │          │      ┌──────────┐
       └──────────┼─────►│  Cable   │
                 │      │ (线缆)   │
                 │      └──────────┘
                 │
                 ▼
          ┌──────────────┐
          │   Ticket     │
          │   (工单)     │
          └──────────────┘

┌──────────────┐         ┌──────────────┐
│    User      │  ─N:M─► │    Role      │
│   (用户)     │         │   (角色)     │
└──────────────┘         └──────────────┘

┌──────────────┐         ┌──────────────┐
│ Consumable   │  ─N:M─► │ConsumableCat │
│   (耗材)     │         │   (分类)     │
└──────┬───────┘         └──────────────┘
       │
       ▼
┌──────────────┐
│ConsumableLog │
│   (日志)     │
└──────────────┘

┌──────────────┐
│InventoryPlan │  ─1:N──►  ┌──────────────┐
│  (盘点计划)   │           │InventoryTask │
└──────────────┘           │  (盘点任务)  │
                           └──────┬───────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │InventoryRecord│
                          │  (盘点记录)  │
                          └──────────────┘
```

### 5.2 主要数据模型

#### 5.2.1 机房模型 (Room)

```javascript
// backend/models/Room.js
Room.init({
  roomId: { type: DataTypes.STRING, primaryKey: true },  // 机房ID
  name: { type: DataTypes.STRING, allowNull: false },     // 机房名称
  location: DataTypes.STRING,                              // 地理位置
  area: DataTypes.FLOAT,                                  // 面积(平方米)
  manager: DataTypes.STRING,                               // 负责人
  contact: DataTypes.STRING,                              // 联系方式
  status: DataTypes.ENUM('active', 'inactive'),           // 状态
  description: DataTypes.TEXT,                            // 描述
  imageUrl: DataTypes.STRING,                             // 机房图片
  floorPlanData: DataTypes.JSON,                         // 平面图数据
}, {
  tableName: 'rooms',
  timestamps: true,
});

// 关联关系
Room.hasMany(Rack, { foreignKey: 'roomId', as: 'Racks' });
```

#### 5.2.2 机柜模型 (Rack)

```javascript
// backend/models/Rack.js
Rack.init({
  rackId: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  roomId: { type: DataTypes.STRING, references: { model: 'rooms' } },
  totalU: { type: DataTypes.INTEGER, defaultValue: 42 },  // 总U数
  usedU: { type: DataTypes.INTEGER, defaultValue: 0 },    // 已用U数
  powerCapacity: { type: DataTypes.FLOAT },               // 功率容量
  currentPower: { type: DataTypes.FLOAT },                // 当前功率
  status: DataTypes.ENUM('active', 'maintenance', 'offline'),
  positionX: DataTypes.FLOAT,                              // 平面图X坐标
  positionY: DataTypes.FLOAT,                              // 平面图Y坐标
}, {
  tableName: 'racks',
  timestamps: true,
});

// 关联
Rack.belongsTo(Room, { foreignKey: 'roomId' });
Rack.hasMany(Device, { foreignKey: 'rackId', as: 'Devices' });
```

#### 5.2.3 设备模型 (Device)

```javascript
// backend/models/Device.js
Device.init({
  deviceId: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  type: DataTypes.ENUM('server', 'switch', 'router', 'storage', 'firewall', 'other'),
  brand: DataTypes.STRING,                                  // 品牌
  model: DataTypes.STRING,                                  // 型号
  serialNumber: DataTypes.STRING,                           // 序列号
  rackId: { type: DataTypes.STRING, references: { model: 'racks' } },
  position: DataTypes.INTEGER,                              // U位
  height: { type: DataTypes.INTEGER, defaultValue: 1 },     // 设备高度(U)
  status: DataTypes.ENUM('purchasing', 'pending', 'running', 'maintenance', 'scrapped'),
  ipAddress: DataTypes.STRING,                              // IP地址
  macAddress: DataTypes.STRING,                             // MAC地址
  powerConsumption: DataTypes.FLOAT,                       // 功率(W)
  purchaseDate: DataTypes.DATE,                            // 采购日期
  warrantyExpiry: DataTypes.DATE,                          // 保修到期
  customFields: DataTypes.JSON,                            // 自定义字段
}, {
  tableName: 'devices',
  timestamps: true,
});

// 关联
Device.belongsTo(Rack, { foreignKey: 'rackId' });
Device.hasMany(DevicePort, { foreignKey: 'deviceId' });
Device.hasMany(NetworkCard, { foreignKey: 'deviceId' });
Device.hasMany(Cable, { foreignKey: 'sourceDeviceId' });
Device.hasMany(Cable, { foreignKey: 'targetDeviceId' });
```

#### 5.2.4 工单模型 (Ticket)

```javascript
// backend/models/Ticket.js
Ticket.init({
  ticketId: { type: DataTypes.STRING, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  type: DataTypes.ENUM('fault', 'maintenance', 'change', 'other'),
  priority: DataTypes.ENUM('urgent', 'high', 'medium', 'low'),
  status: DataTypes.ENUM('open', 'assigned', 'processing', 'resolved', 'closed', 'reopened'),
  categoryId: DataTypes.STRING,                            // 故障分类ID
  reporterId: { type: DataTypes.STRING, references: { model: 'users' } },
  assigneeId: { type: DataTypes.STRING, references: { model: 'users' } },
  deviceId: { type: DataTypes.STRING, references: { model: 'devices' } },
  customFields: DataTypes.JSON,                            // 自定义字段
  rating: DataTypes.INTEGER,                                // 评价(1-5)
  resolution: DataTypes.TEXT,                              // 解决方案
  resolvedAt: DataTypes.DATE,
  closedAt: DataTypes.DATE,
}, {
  tableName: 'tickets',
  timestamps: true,
});
```

#### 5.2.5 耗材模型 (Consumable)

```javascript
// backend/models/Consumable.js
Consumable.init({
  consumableId: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  categoryId: { type: DataTypes.STRING, references: { model: 'consumable_categories' } },
  sku: DataTypes.STRING,                                     // SKU编码
  unit: DataTypes.STRING,                                   // 单位
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },     // 库存
  minStock: { type: DataTypes.INTEGER, defaultValue: 0 },  // 最低库存
  location: DataTypes.STRING,                               // 存放位置
  warehouseId: { type: DataTypes.STRING, references: { model: 'warehouses' } },
  price: DataTypes.FLOAT,                                   // 单价
  snList: DataTypes.JSON,                                   // SN序列号列表
  version: { type: DataTypes.INTEGER, defaultValue: 0 },  // 乐观锁版本
}, {
  tableName: 'consumables',
  timestamps: true,
});
```

### 5.3 模型关联初始化 (models/index.js)

```javascript
// backend/models/index.js
const Room = require('./Room');
const Rack = require('./Rack');
const Device = require('./Device');
const DevicePort = require('./DevicePort');
const NetworkCard = require('./NetworkCard');
const Cable = require('./Cable');
const Ticket = require('./Ticket');
const InventoryRecord = require('./InventoryRecord');
const Warehouse = require('./Warehouse');

// 建立核心关联
Room.hasMany(Rack, { foreignKey: 'roomId', as: 'Racks' });
Rack.belongsTo(Room, { foreignKey: 'roomId' });

Rack.hasMany(Device, { foreignKey: 'rackId', as: 'Devices' });
Device.belongsTo(Rack, { foreignKey: 'rackId' });

// 设备关联端口和网卡
Device.hasMany(DevicePort, { foreignKey: 'deviceId', as: 'Ports' });
Device.hasMany(NetworkCard, { foreignKey: 'deviceId', as: 'NetworkCards' });

// 线缆关联
Device.hasMany(Cable, { foreignKey: 'sourceDeviceId', as: 'SourceCables' });
Device.hasMany(Cable, { foreignKey: 'targetDeviceId', as: 'TargetCables' });

module.exports = {
  Room, Rack, Device, DevicePort, NetworkCard, Cable, Ticket,
  InventoryRecord, Warehouse
};
```

---

## 6. API接口规范

### 6.1 接口基础规范

| 项目 | 规范 |
|------|------|
| 基础URL | `http://localhost:8000/api` |
| 认证方式 | JWT Bearer Token |
| Content-Type | `application/json` |
| 编码 | UTF-8 |

### 6.2 主要API模块

#### 6.2.1 设备管理API (/devices)

```javascript
// GET /api/devices - 获取设备列表
// Query: keyword, status, type, rackId, roomId, page, pageSize
// Response: { success, data: { list, total, page, pageSize } }

// GET /api/devices/all - 获取所有设备(不分页,最大50000条)
GET /api/devices/all?keyword=&status=&type=&rackId=&roomId=

// GET /api/devices/:deviceId - 获取设备详情
// Response: { success, data: device }

// POST /api/devices - 创建设备
// Body: { name, type, rackId, position, height, ... }

// PUT /api/devices/:deviceId - 更新设备

// DELETE /api/devices/:deviceId - 删除设备

// POST /api/devices/check-position - 检查U位可用性
// Body: { rackId, position, height, excludeDeviceId? }

// POST /api/devices/import-preview - 导入预览
// Body: FormData (csvFile)

// POST /api/devices/import - 执行导入

// GET /api/devices/import-template - 下载导入模板

// GET /api/devices/export - 导出设备
// Query: format(csv|xlsx), keyword, status, type, rackId, roomId
```

#### 6.2.2 工单管理API (/tickets)

```javascript
// GET /api/tickets - 获取工单列表
// Query: status, priority, categoryId, assigneeId, page, pageSize

// GET /api/tickets/:ticketId - 获取工单详情

// POST /api/tickets - 创建工单
// Body: { title, description, type, priority, categoryId, deviceId }

// PUT /api/tickets/:ticketId - 更新工单

// PUT /api/tickets/:ticketId/assign - 分配工单
// Body: { assigneeId }

// PUT /api/tickets/:ticketId/process - 处理工单
// Body: { resolution, nextStep? }

// PUT /api/tickets/:ticketId/close - 关闭工单

// PUT /api/tickets/:ticketId/reopen - 重开工单

// GET /api/tickets/:ticketId/operations - 获取操作记录
```

#### 6.2.3 备份管理API (/backup)

```javascript
// GET /api/backup/list - 获取备份列表

// POST /api/backup - 创建备份
// Body: { name?, description? }

// GET /api/backup/validate/:filename - 验证备份文件

// POST /api/backup/restore - 恢复备份
// Body: { filename, options? }

// GET /api/backup/download/:filename - 下载备份

// DELETE /api/backup/:filename - 删除备份

// POST /api/backup/upload - 上传备份文件
// Body: FormData (backup)

// GET /api/backup/info - 获取备份信息

// 自动备份
// GET /api/backup/auto/status - 获取自动备份状态
// POST /api/backup/auto/settings - 更新自动备份设置
// POST /api/backup/auto/execute - 立即执行备份
```

#### 6.2.4 统计分析API (/statistics)

```javascript
// GET /api/statistics/overview - 获取概览统计
// Response: { deviceCount, roomCount, rackCount, ticketStats }

// GET /api/statistics/devices - 设备统计
// Query: roomId?, rackId?, type?, period?

// GET /api/statistics/tickets - 工单统计
// Query: period?, categoryId?

// GET /api/statistics/consumables - 耗材统计
```

### 6.3 响应格式

```javascript
// 成功响应
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}

// 失败响应
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE"
}

// 分页响应
{
  "success": true,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 7. 关键模块详解

### 7.1 认证模块

#### 7.1.1 后端认证 (middleware/auth.js)

```javascript
// JWT认证中间件
const authMiddleware = async (req, res, next) => {
  // 1. 从请求头获取Token
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未提供认证令牌'
    });
  }

  // 2. 验证Token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. 获取用户信息
    const User = require('../models/User');
    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Role, as: 'roles' }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 4. 挂载用户到请求对象
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '令牌已过期'
      });
    }
    return res.status(401).json({
      success: false,
      message: '无效的认证令牌'
    });
  }
};
```

#### 7.1.2 前端认证 (context/AuthContext.jsx)

```javascript
// 认证Provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // 初始化 - 从本地存储恢复认证状态
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = await secureStorage.loadFromStorage(TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
        // 验证Token有效性
        const response = await authAPI.getProfile();
        if (response.success) {
          setUser(response.data.user);
        }
      }
    };
    initializeAuth();
  }, []);

  const login = async (username, password) => {
    const response = await authAPI.login({ username, password });
    if (response.success) {
      await secureStorage.set(TOKEN_KEY, response.data.token);
      setToken(response.data.token);
      setUser(response.data.user);
    }
    return response;
  };

  const logout = () => {
    secureStorage.remove(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    const roles = user.roles || [];
    if (roles.some(r => r.roleCode === 'admin')) return true;
    return roles.some(r => r.roleCode === permission);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 7.2 3D可视化模块

#### 7.2.1 Three.js场景 (components/3d/Scene.jsx)

```javascript
// 3D主场景组件
const Scene = () => {
  const { selectedRack, setSelectedRack } = useContext(Scene3DContext);

  return (
    <Canvas
      camera={{ position: [0, 10, 20], fov: 50 }}
      gl={{ antialias: true }}
    >
      {/* 灯光 */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* 机柜模型 */}
      {racks.map(rack => (
        <RackModel
          key={rack.rackId}
          rack={rack}
          isSelected={selectedRack?.rackId === rack.rackId}
          onSelect={() => setSelectedRack(rack)}
        />
      ))}

      {/* OrbitControls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={50}
      />
    </Canvas>
  );
};
```

#### 7.2.2 机柜模型 (components/3d/RackModel.jsx)

```javascript
// 机柜3D模型
const RackModel = ({ rack, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={[rack.positionX, 0, rack.positionY]}>
      {/* 机柜框架 */}
      <mesh
        onClick={onSelect}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1, rack.totalU * 0.2, 1]} />
        <meshStandardMaterial
          color={isSelected ? '#1677ff' : hovered ? '#69c0ff' : '#d9d9d9'}
        />
      </mesh>

      {/* 设备模型 */}
      {rack.devices?.map(device => (
        <DeviceModel
          key={device.deviceId}
          device={device}
          position={device.position}
        />
      ))}

      {/* LOD优化 - 远处隐藏细节 */}
      <LOD distances={[0, 10, 20]}>
        <HighDetail />
        <MediumDetail />
        <LowDetail />
      </LOD>
    </group>
  );
};
```

### 7.3 备份模块

#### 7.3.1 本地备份 (utils/backup.js)

```javascript
// 备份工具
const backupDatabase = async (options = {}) => {
  const { DB_TYPE, dbDialect } = require('../db');

  if (dbDialect === 'mysql') {
    // MySQL备份
    const { MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USERNAME, MYSQL_PASSWORD } = process.env;

    const filename = `backup_${dayjs().format('YYYYMMDD_HHmmss')}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    // mysqldump命令
    const command = `mysqldump -h${MYSQL_HOST} -P${MYSQL_PORT} -u${MYSQL_USERNAME}${MYSQL_PASSWORD ? `-p${MYSQL_PASSWORD}` : ''} ${MYSQL_DATABASE} > ${filepath}`;

    await exec(command);
    return { filename, filepath };
  } else {
    // SQLite备份 - 复制数据库文件
    const filename = `backup_${dayjs().format('YYYYMMDD_HHmmss')}.db`;
    const filepath = path.join(BACKUP_DIR, filename);

    await fs.copy(
      process.env.DB_PATH || './idc_management.db',
      filepath
    );

    return { filename, filepath };
  }
};
```

#### 7.3.2 远程备份 (utils/remoteBackup.js)

```javascript
// 支持多种协议的远程备份
const uploadToRemote = async (localFile, config) => {
  const { protocol, host, port, username, password, path: remotePath } = config;

  switch (protocol) {
    case 'ftp':
      const ftpClient = require('basic-ftp');
      const ftp = new ftpClient();
      await ftp.access({ host, port, user: username, password });
      await ftp.uploadFrom(localFile, `${remotePath}/${path.basename(localFile)}`);
      await ftp.close();
      break;

    case 'sftp':
      const sftpClient = require('ssh2-sftp-client');
      const sftp = new sftpClient();
      await sftp.connect({ host, port, username, password });
      await sftp.put(localFile, `${remotePath}/${path.basename(localFile)}`);
      await sftp.end();
      break;

    case 'webdav':
      const { WebDAVClient } = require('webdav');
      const webdav = new WebDAVClient(`http://${host}:${port}`);
      await webdav.putFileContents(
        `${remotePath}/${path.basename(localFile)}`,
        fs.createReadStream(localFile)
      );
      break;

    case 'smb':
      const SMB2 = require('smb2');
      const smb = new SMB2({ share: `\\\\${host}\\${remotePath}` });
      await smb.writeFile(path.basename(localFile), fs.readFileSync(localFile));
      break;
  }
};
```

### 7.4 操作日志模块

#### 7.4.1 后端操作日志 (utils/operationLogger.js)

```javascript
// 操作日志记录
const logDeviceOperation = async (req, action, deviceData, userId) => {
  const OperationLog = require('../models/OperationLog');

  await OperationLog.create({
    logId: generateId({ prefix: 'LOG' }),
    userId,
    module: 'device',
    action,
    targetId: deviceData.deviceId,
    targetName: deviceData.name,
    details: {
      before: deviceData.before,
      after: deviceData.after,
      ip: req.ip,
      userAgent: req.get('user-agent')
    },
    result: 'success'
  });
};

// 生成设备变更描述
const generateDeviceDescription = (action, deviceData) => {
  const descriptions = {
    create: `创建设备「${deviceData.name}」`,
    update: `更新设备「${deviceData.name}」信息`,
    delete: `删除设备「${deviceData.name}」`,
    move: `移动设备「${deviceData.name}」到新位置`,
    status: `修改设备「${deviceData.name}」状态为${deviceData.status}`
  };
  return descriptions[action] || `${action}设备「${deviceData.name}」`;
};
```

### 7.5 设备导入模块

#### 7.5.1 导入预览验证 (routes/devices.js)

```javascript
// POST /api/devices/import-preview
router.post('/import-preview', upload.single('csvFile'), async (req, res) => {
  const results = [];
  const errors = [];
  const warnings = [];

  // 1. 解析CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  // 2. 逐行验证
  for (let i = 0; i < results.length; i++) {
    const row = results[i];
    const rowNum = i + 2; // 跳过表头

    // 必填字段检查
    if (!row.name) {
      errors.push({ row: rowNum, field: 'name', message: '设备名称不能为空' });
    }

    // 格式验证
    if (row.position && !/^\d+$/.test(row.position)) {
      errors.push({ row: rowNum, field: 'position', message: 'U位必须是数字' });
    }

    // 冲突检查
    if (row.rackId && row.position) {
      const { available, reason } = await checkPositionAvailable(
        row.rackId, row.position, row.height || 1
      );
      if (!available) {
        warnings.push({ row: rowNum, message: reason });
      }
    }
  }

  // 3. 返回预览结果
  res.json({
    success: true,
    data: {
      total: results.length,
      errors: errors.slice(0, 20),    // 最多返回20条错误
      warnings: warnings.slice(0, 20),
      preview: results.slice(0, PREVIEW_COUNT)
    }
  });
});
```

---

## 8. 依赖关系

### 8.1 前端依赖 (frontend/package.json)

| 依赖 | 版本 | 用途 |
|------|------|------|
| react | ^18.2.0 | 前端框架 |
| react-dom | ^18.2.0 | DOM渲染 |
| react-router-dom | ^6.15.0 | 路由管理 |
| antd | ^5.8.6 | UI组件库 |
| @ant-design/icons | ^6.1.0 | 图标库 |
| axios | ^1.13.6 | HTTP客户端 |
| three | ^0.183.2 | 3D渲染引擎 |
| @react-three/fiber | ^8.18.0 | React Three.js集成 |
| @react-three/drei | ^9.122.0 | Three.js工具库 |
| reactflow | ^11.11.4 | 流程图/拓扑图 |
| swr | ^2.4.0 | 数据请求与缓存 |
| styled-components | ^6.3.9 | CSS-in-JS |
| framer-motion | ^12.34.0 | 动画库 |
| dayjs | ^1.11.19 | 日期处理 |
| xlsx | ^0.18.5 | Excel处理 |
| papaparse | ^5.5.3 | CSV解析 |
| dagre | ^0.8.5 | 图形布局算法 |

### 8.2 后端依赖 (backend/package.json)

| 依赖 | 版本 | 用途 |
|------|------|------|
| express | ^4.18.2 | Web框架 |
| sequelize | ^6.37.8 | ORM框架 |
| sqlite3 | ^5.1.7 | SQLite驱动 |
| mysql2 | ^3.19.1 | MySQL驱动 |
| jsonwebtoken | ^9.0.3 | JWT认证 |
| bcryptjs | ^3.0.3 | 密码加密 |
| winston | ^3.19.0 | 日志管理 |
| winston-daily-rotate-file | ^5.0.0 | 日志轮转 |
| joi | ^18.0.2 | 数据验证 |
| multer | ^2.1.1 | 文件上传 |
| express-fileupload | ^1.5.2 | 文件上传中间件 |
| cors | ^2.8.5 | 跨域资源共享 |
| node-cron | ^4.2.1 | 定时任务 |
| swagger-jsdoc | ^6.2.8 | Swagger文档生成 |
| swagger-ui-express | ^5.0.1 | Swagger UI |
| xlsx | ^0.18.5 | Excel处理 |
| csv-parser | ^3.2.0 | CSV解析 |
| csv-writer | ^1.6.0 | CSV生成 |
| basic-ftp | ^5.0.3 | FTP客户端 |
| ssh2-sftp-client | ^9.1.0 | SFTP客户端 |
| webdav | ^5.3.1 | WebDAV客户端 |
| smb2 | ^0.2.2 | SMB客户端 |
| dayjs | ^1.11.19 | 日期处理 |
| dotenv | ^17.2.3 | 环境变量 |

### 8.3 依赖关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                         项目根目录                               │
│                    (concurrently ^9.2.1)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
          ┌─────────────────┴─────────────────┐
          │                                   │
          ▼                                   ▼
┌─────────────────────┐             ┌─────────────────────┐
│   frontend/         │             │   backend/          │
│   ^2.0.0            │             │   ^2.0.0           │
├─────────────────────┤             ├─────────────────────┤
│ React 18.2.0        │             │ Express 4.18.2     │
│ ├─ react-router-dom │             │ ├─ sequelize 6.37   │
│ ├─ antd 5.8.6       │             │ │  ├─ sqlite3       │
│ │  └─ @ant-design   │             │ │  └─ mysql2        │
│ ├─ three.js 0.183   │             │ ├─ jsonwebtoken     │
│ │  ├─ @react-three  │             │ ├─ bcryptjs         │
│ │  └─ @react-three  │             │ ├─ winston          │
│ ├─ axios 1.13       │─────────────│ ├─ axios            │
│ ├─ swr 2.4          │   共享HTTP │ ├─ dayjs            │
│ └─ styled-components│             │ └─ xlsx             │
│                     │             │                     │
│ 开发依赖:            │             │ 开发依赖:            │
│ ├─ vite 4.4         │             │ ├─ nodemon          │
│ ├─ eslint           │             │ ├─ jest             │
│ └─ vitest 4.0       │             │ └─ supertest        │
└─────────────────────┘             └─────────────────────┘
```

---

## 9. 运行环境与配置

### 9.1 环境要求

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| 操作系统 | Windows 10, macOS 12, Ubuntu 20.04 | 同最低 |
| Node.js | ≥14.0.0 | 20.x LTS |
| npm | ≥6.0.0 | 10.x |
| 内存 | 4GB | 8GB+ |
| 磁盘空间 | 2GB | 10GB+ |

### 9.2 环境变量配置

#### 9.2.1 前端环境变量 (frontend/.env)

```bash
# 前端环境配置
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_TITLE=IDC设备管理系统
VITE_APP_VERSION=2.0.0
```

#### 9.2.2 后端环境变量 (backend/.env)

```bash
# 服务配置
NODE_ENV=development
PORT=8000

# 数据库配置
DB_TYPE=sqlite                           # sqlite 或 mysql
DB_PATH=./idc_management.db              # SQLite数据库路径

# MySQL配置 (当DB_TYPE=mysql时)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=idc_management
MYSQL_USERNAME=root
MYSQL_PASSWORD=your_password

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# 文件上传
FILE_UPLOAD_MAX_SIZE=10485760            # 10MB

# 备份配置
BACKUP_DIR=./backups
AUTO_BACKUP_ENABLED=false
AUTO_BACKUP_CRON=0 2 * * *               # 每天凌晨2点

# 远程备份 (可选)
REMOTE_BACKUP_ENABLED=false
REMOTE_BACKUP_PROTOCOL=ftp
REMOTE_BACKUP_HOST=
REMOTE_BACKUP_PORT=21
REMOTE_BACKUP_USERNAME=
REMOTE_BACKUP_PASSWORD=
REMOTE_BACKUP_PATH=/backups
```

### 9.3 启动方式

#### 9.3.1 一键启动 (开发环境)

```bash
# 在项目根目录
npm start

# 效果等同于同时运行:
# - 后端: cd backend && npm run dev (端口8000)
# - 前端: cd frontend && npm run dev (端口3000)
```

#### 9.3.2 分别启动

```bash
# 终端1: 启动后端
cd backend
npm run dev
# 监听端口: http://localhost:8000

# 终端2: 启动前端
cd frontend
npm run dev
# 监听端口: http://localhost:3000
```

#### 9.3.3 生产环境部署

```bash
# 1. 构建前端
cd frontend
npm run build

# 2. 使用PM2启动后端
cd ../backend
pm2 start server.js --name idc-backend

# 3. 使用Nginx反向代理
# 或使用PM2 serve提供静态文件
pm2 serve ./frontend/dist 3000 --name idc-frontend
```

---

## 10. 部署指南

### 10.1 生产环境部署流程

#### 10.1.1 数据库配置

```bash
# 1. 安装MySQL 8.0+
# Ubuntu
sudo apt update
sudo apt install mysql-server

# 2. 创建数据库
mysql -u root -p
CREATE DATABASE idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'idc_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON idc_management.* TO 'idc_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 10.1.2 Nginx配置

```nginx
# /etc/nginx/sites-available/idc

server {
    listen 80;
    server_name your_domain.com;

    # 前端静态文件
    root /var/www/idc/frontend/dist;
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件
    location /uploads {
        alias /var/www/idc/backend/uploads;
        autoindex on;
    }

    # Swagger文档
    location /api-docs {
        proxy_pass http://127.0.0.1:8000;
    }
}

# HTTPS配置 (推荐)
server {
    listen 443 ssl http2;
    server_name your_domain.com;

    ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;

    # ... 同上配置
}
```

#### 10.1.3 PM2进程管理

```bash
# 安装PM2
npm install -g pm2

# 启动后端服务
cd backend
pm2 start server.js --name idc-backend \
  --env production \
  --max-memory-restart 1G

# 配置负载均衡 (多核CPU)
pm2 start server.js -i max --name idc-backend

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
pm2 install ubuntu-upstart  # Ubuntu
```

### 10.2 Docker部署 (可选)

```dockerfile
# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 8000

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - DB_TYPE=mysql
      - MYSQL_HOST=db
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: idc_management
      MYSQL_ROOT_PASSWORD: root_password
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

---

## 11. 系统关系图

### 11.1 整体架构关系图

```
                        ┌────────────────────────────────────────────────────┐
                        │                    用户交互层                      │
                        │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
                        │  │ 浏览器    │  │ 管理员    │  │ 运维人员   │         │
                        │  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
                        └───────┼────────────┼────────────┼────────────────┘
                                │            │            │
                                ▼            ▼            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          前端应用层 (React + Vite)                            │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                           页面组件 (Pages)                                │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │   │
│  │  │Dashboard│ │Devices │ │ Racks  │ │Tickets │ │Backup  │            │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘            │   │
│  └───────┼──────────┼──────────┼──────────┼──────────┼────────────────────┘   │
│          │          │          │          │          │                        │
│          ▼          ▼          ▼          ▼          ▼                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         通用组件 (Components)                            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │   │
│  │  │ 3D组件   │ │看板组件 │ │设备组件 │ │拓扑组件 │ │表单组件 │            │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘            │   │
│  └───────┼──────────┼──────────┼──────────┼──────────┼────────────────────┘   │
│          │          │          │          │          │                        │
│          ▼          ▼          ▼          ▼          ▼                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       状态管理与Hooks                                    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                    │   │
│  │  │AuthContext│ │ConfigCtx │ │ useApi   │ │ useSWR   │                    │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/REST API
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          后端服务层 (Express.js)                            │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            中间件层 (Middleware)                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │
│  │  │  认证    │ │  授权    │ │  验证    │ │  日志    │ │  维护    │        │   │
│  │  │  Middle  │ │  Middle  │ │  Middle  │ │  Middle  │ │  Middle  │        │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                        │
│                                      ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            路由层 (Routes)                               │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │   │
│  │  │ /auth  │ │/devices│ │ /racks │ │/tickets│ │ /backup│ │/stats │        │   │
│  │  └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘        │   │
│  └───────┼─────────┼─────────┼─────────┼─────────┼─────────┼────────────────┘   │
│          │         │         │         │         │         │                  │
│          ▼         ▼         ▼         ▼         ▼         ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                           业务逻辑层 (Services)                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │ 设备服务  │ │ 工单服务  │ │ 备份服务  │ │ 统计服务  │ │ 导入服务  │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                        │
│                                      ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          数据访问层 (Sequelize ORM)                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │ Device   │ │  Ticket  │ │Consumable│ │  User    │ │  Rack    │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            数据存储层 (Database)                             │
│                                                                                │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐          │
│  │         SQLite              │    │          MySQL              │          │
│  │     (开发环境)              │◄──►│        (生产环境)            │          │
│  │  idc_management.db          │    │    MySQL 8.0+                │          │
│  └─────────────────────────────┘    └─────────────────────────────┘          │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         数据备份层                                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                    │  │
│  │  │ 本地备份  │ │ FTP备份  │ │ SFTP备份  │ │WebDAV备份│                    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 数据模型ER图

```
┌──────────────────┐       ┌──────────────────┐
│       Room       │       │       Rack       │
├──────────────────┤       ├──────────────────┤
│ PK roomId        │──1:N──│ FK roomId        │
│    name          │       │ PK rackId        │
│    location      │       │    name          │
│    area          │       │    totalU        │
│    manager       │       │    usedU         │
│    status        │       │    powerCapacity │
│    floorPlanData │       │    status        │
└──────────────────┘       │    positionX     │
         │                 │    positionY     │
         │                 └────────┬─────────┘
         │                          │
         │                          │ 1:N
         │                          ▼
         │                 ┌──────────────────┐
         │                 │     Device       │
         │                 ├──────────────────┤
         │                 │ PK deviceId      │
         │                 │ FK rackId        │
         │                 │    name          │
         │                 │    type          │
         │                 │    status        │
         │                 │    position      │
         │                 │    height        │
         │                 │    serialNumber   │
         │                 │    customFields   │
         │                 └────────┬─────────┘
         │                          │
         │          ┌──────────────┼──────────────┐
         │          │              │              │
         │          ▼              ▼              ▼
         │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │  │ NetworkCard  │ │  DevicePort  │ │ DeviceField  │
         │  ├──────────────┤ ├──────────────┤ ├──────────────┤
         │  │ PK nicId     │ │ PK portId    │ │ PK fieldId   │
         │  │ FK deviceId  │ │ FK deviceId  │ │ FK deviceId  │
         │  │    name      │ │ FK nicId     │ │    name      │
         │  │    type      │ │    name      │ │    type      │
         │  │    speed     │ │    status    │ │    value     │
         │  └──────────────┘ └──────────────┘ └──────────────┘
         │          │              │
         │          │              │ N:1
         │          │              ▼
         │          │     ┌──────────────┐
         │          └────►│    Cable     │
         │                ├──────────────┤
         │                │ PK cableId   │
         │                │ FK sourceId  │
         │                │ FK targetId  │
         │                │    type      │
         │                │    length    │
         │                │    status    │
         │                └──────────────┘

┌──────────────────┐       ┌──────────────────┐
│       User        │       │       Role       │
├──────────────────┤       ├──────────────────┤
│ PK userId         │──N:M──│ PK roleId        │
│    username       │       │    name          │
│    password       │       │    code          │
│    email          │       │    description  │
│    status         │       └──────────────────┘
│    isSystem       │              │
└──────────────────┘              │
         │                         │
         │                         ▼
         │                ┌──────────────────┐
         │                │    Permission    │
         │                ├──────────────────┤
         │                │ PK permissionId │
         │                │ FK roleId       │
         │                │    resource      │
         │                │    action        │
         │                └──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│      Ticket      │       │  TicketCategory  │
├──────────────────┤       ├──────────────────┤
│ PK ticketId      │──N:1──│ PK categoryId    │
│    title         │       │    name          │
│    description   │       │    priority      │
│    type          │       └──────────────────┘
│    priority      │
│    status        │       ┌──────────────────┐
│ FK reporterId    │       │ FaultCategory   │
│ FK assigneeId    │       ├──────────────────┤
│ FK deviceId      │       │ PK categoryId    │
│ FK categoryId    │       │    name          │
│    rating        │       │    priority      │
│    resolution    │       │    solutions     │
└──────────────────┘       └──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│   Consumable     │       │ConsumableCategory│
├──────────────────┤       ├──────────────────┤
│ PK consumableId  │──N:1──│ PK categoryId    │
│    name          │       │    name          │
│ FK categoryId    │       │    parentId      │
│    sku           │       │    description   │
│    unit          │       └──────────────────┘
│    stock         │
│    minStock      │       ┌──────────────────┐
│    price         │       │ ConsumableLog   │
│    snList        │       ├──────────────────┤
│    version       │       │ PK logId        │
└──────────────────┘──1:N───│ FK consumableId │
                           │    action       │
                           │    quantity     │
                           │    operatorId   │
                           │    createdAt    │
                           └──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│  InventoryPlan   │       │  InventoryTask  │
├──────────────────┤       ├──────────────────┤
│ PK planId        │──1:N──│ PK taskId       │
│    name          │       │ FK planId       │
│    startDate     │       │ FK assigneeId   │
│    endDate       │       │ FK rackId       │
│    status        │       │    status       │
│    description   │       │    progress     │
└──────────────────┘       └──────────────────┘
```

### 11.3 API调用流程图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         前端组件 (React)                                 │
│                                                                         │
│  const DeviceList = () => {                                             │
│    const { data, error, isLoading } = useSWR('/api/devices', fetcher);  │
│    // ...                                                              │
│  };                                                                     │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ useSWR('/api/devices')
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       API层 (axios + interceptor)                       │
│                                                                         │
│  api.get('/devices')                                                    │
│    │                                                                    │
│    ├──► 请求拦截器                                                       │
│    │      ├─ 添加 Authorization: Bearer {token}                         │
│    │      └─ 添加 Content-Type: application/json                       │
│    │                                                                    │
│    ▼                                                                    │
│    └──► 发送HTTP请求到 /api/devices                                     │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Express路由 (routes/devices.js)                  │
│                                                                         │
│  router.get('/devices', async (req, res) => {                           │
│    │                                                                    │
│    ▼                                                                    │
│    ├─► 中间件链: auth → validation → logging                             │
│    │                                                                    │
│    ▼                                                                    │
│    └─► 控制器函数: getDevices(req, res)                                 │
│           │                                                             │
│           ▼                                                             │
│           ├─► 参数验证 (Joi schema)                                     │
│           │                                                             │
│           ▼                                                             │
│           ├─► 调用Service层                                             │
│           │                                                             │
│           ▼                                                             │
│           └─► 返回JSON响应                                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Service层 (业务逻辑)                               │
│                                                                         │
│  async function getDevices(params) {                                    │
│    │                                                                    │
│    ▼                                                                    │
│    ├─► 构建查询条件 (Sequelize Op)                                      │
│    │     { where: { status, type, ... } }                               │
│    │                                                                    │
│    ▼                                                                    │
│    ├─► 分页处理                                                         │
│    │     { limit, offset }                                              │
│    │                                                                    │
│    ▼                                                                    │
│    └─► 调用DAO层                                                        │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       DAO层 (Sequelize ORM)                             │
│                                                                         │
│  Device.findAndCountAll({                                               │
│    where: conditions,                                                   │
│    include: [Room, Rack, NetworkCard, ...],                              │
│    limit,                                                               │
│    offset,                                                              │
│    order: [['createdAt', 'DESC']]                                       │
│  })                                                                     │
│    │                                                                    │
│    ▼                                                                    │
│    └─► 执行SQL查询                                                       │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       数据库 (SQLite / MySQL)                            │
│                                                                         │
│  SELECT * FROM devices                                                  │
│    JOIN racks ON devices.rackId = racks.rackId                         │
│    JOIN rooms ON racks.roomId = rooms.roomId                           │
│    WHERE ...                                                            │
│    ORDER BY createdAt DESC                                              │
│    LIMIT 20 OFFSET 0                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.4 用户权限控制流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          用户权限控制流程                                │
│                                                                         │
│  ┌─────────────┐                                                        │
│  │   用户登录   │                                                        │
│  └──────┬──────┘                                                        │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        JWT Token 生成                              │  │
│  │  jwt.sign({ userId, roles: [...] }, secret, { expiresIn: '7d' })  │  │
│  └──────┬────────────────────────────────────────────────────────────┘  │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │ 请求API资源  │                                                        │
│  └──────┬──────┘                                                        │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Auth Middleware                              │  │
│  │  1. 提取 Authorization Header                                       │  │
│  │  2. 验证 JWT Token                                                  │  │
│  │  3. 从数据库加载用户信息和角色                                       │  │
│  │  4. 挂载 req.user                                                   │  │
│  └──────┬────────────────────────────────────────────────────────────┘  │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      权限检查 (hasPermission)                      │  │
│  │                                                                    │  │
│  │  User.roles = [Role{code: 'admin'}, Role{code: 'device_manager'}]│  │
│  │                                                                    │  │
│  │  hasPermission('admin')      → true (拥有admin角色)                │  │
│  │  hasPermission('device_mgr') → true (拥有device_manager角色)     │  │
│  │  hasPermission('system')     → false (无此角色)                   │  │
│  │                                                                    │  │
│  │  // 权限层级                                                        │  │
│  │  admin > device_manager > operator > viewer                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │   允许访问   │  │   拒绝访问   │  │   404 Not   │                     │
│  │  返回数据   │  │  403 Forbidden│ │  Found      │                     │
│  └─────────────┘  └─────────────┘  └─────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.5 备份恢复流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          备份恢复系统架构                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                       备份触发机制                                 │   │
│  │                                                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │   │
│  │  │ 手动触发      │  │ 定时触发      │  │ 远程同步触发  │           │   │
│  │  │ /backup      │  │ node-cron    │  │ webhook      │           │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │   │
│  │         │                 │                 │                    │   │
│  └─────────┼─────────────────┼─────────────────┼────────────────────┘   │
│            │                 │                 │                        │
│            ▼                 ▼                 ▼                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      备份管理器 (BackupManager)                    │   │
│  │                                                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │   │
│  │  │ 本地备份      │  │ 远程备份      │  │ 备份日志      │           │   │
│  │  │ backup.js    │  │ remoteBackup.js│ │ backupLog.js │           │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │   │
│  │                                                                   │   │
│  │  ┌──────────────────────────────────────────────────────────────┐│   │
│  │  │                    支持的远程协议                              ││   │
│  │  │  FTP │ SFTP │ WebDAV │ SMB/CIFS │ Amazon S3 │ 阿里云OSS │    ││   │
│  │  └──────────────────────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                      │                                  │
│                                      ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                       备份存储层                                   │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  │                         备份文件                              │ │   │
│  │  │  backup_YYYYMMDD_HHmmss.sql (MySQL)                         │ │   │
│  │  │  backup_YYYYMMDD_HHmmss.db   (SQLite)                       │ │   │
│  │  │                                                              │ │   │
│  │  │  存储位置:                                                    │ │   │
│  │  │  ├── 本地: ./backups/                                       │ │   │
│  │  │  ├── FTP:   /remote/backups/                                │ │   │
│  │  │  ├── SFTP:  /var/backups/                                   │ │   │
│  │  │  └── OSS:   oss://idc-backup/                               │ │   │
│  │  └─────────────────────────────────────────────────────────────┘ │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  │                       备份元数据                            │ │   │
│  │  │  {                                                       │ │   │
│  │  │    filename: "backup_20260507_120000.sql",              │ │   │
│  │  │    size: 1048576,                                        │ │   │
│  │  │    createdAt: "2026-05-07T12:00:00Z",                    │ │   │
│  │  │    database: "idc_management",                          │ │   │
│  │  │    tables: ["devices", "racks", "tickets", ...],        │ │   │
│  │  │    status: "completed"                                  │ │   │
│  │  │  }                                                       │ │   │
│  │  └─────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          恢复执行流程                                   │
│                                                                         │
│  POST /api/backup/restore                                               │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 1. 验证备份文件                                                   │   │
│  │    GET /api/backup/validate/:filename                           │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 2. 创建临时恢复点 (可选)                                           │   │
│  │    - 备份当前数据库状态                                           │   │
│  │    - 确保可回滚                                                   │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 3. 关闭现有连接                                                   │   │
│  │    - await sequelize.close()                                    │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 4. 执行恢复                                                       │   │
│  │                                                                   │   │
│  │    MySQL:                                                         │   │
│  │    mysql -u user -p dbname < backup_xxx.sql                      │   │
│  │                                                                   │   │
│  │    SQLite:                                                        │   │
│  │    cp backup_xxx.db idc_management.db                            │   │
│  │                                                                   │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 5. 重建连接                                                       │   │
│  │    sequelize = new Sequelize(...)                                 │   │
│  │    await sequelize.authenticate()                                │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 6. 验证数据完整性                                                 │   │
│  │    - 检查关键表是否存在                                           │   │
│  │    - 验证记录数                                                   │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 7. 返回恢复结果                                                   │   │
│  │    { success: true, message: "恢复成功", backupId: "xxx" }       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 附录

### A. 常用命令

```bash
# 安装依赖
npm run install:all

# 启动开发环境
npm start

# 后端测试
cd backend && npm test

# 前端构建
cd frontend && npm run build

# 代码检查
cd backend && npm run lint
cd frontend && npm run lint

# 数据库迁移
cd backend && node scripts/migrate-all.js
```

### B. 目录约定

| 目录 | 说明 |
|------|------|
| frontend/src/components | React组件 |
| frontend/src/pages | 页面组件 |
| frontend/src/hooks | 自定义Hooks |
| frontend/src/context | Context状态管理 |
| backend/models | Sequelize模型 |
| backend/routes | Express路由 |
| backend/middleware | Express中间件 |
| backend/utils | 工具函数 |
| backend/scripts | 数据库脚本 |

### C. 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 组件文件 | PascalCase.jsx | DeviceManagement.jsx |
| 工具文件 | camelCase.js | secureStorage.js |
| 数据模型 | PascalCase | Device.js |
| 数据库表 | snake_case | device_ports |
| API路径 | camelCase | /api/devices |
| Context | PascalCase | AuthContext.jsx |
| Hooks | use{camelCase}.js | useApi.js |

---

**文档维护说明：**
- 本文档由Code Wiki自动生成工具维护
- 更新日期：2026-05-07
- 版本：2.0.0
- 如有更新建议，请提交Issue
