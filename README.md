# IDC设备管理系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)]()

一个现代化的数据中心(IDC)设备管理系统，提供机房、机柜、设备的全生命周期管理，具备3D可视化展示功能。

## 📋 目录

- [系统概述](#系统概述)
- [项目架构](#项目架构)
- [技术栈说明](#技术栈说明)
- [API接口文档](#api接口文档)
- [安装部署指南](#安装部署指南)
- [功能特性](#功能特性)
- [开发团队](#开发团队)
- [许可证](#许可证)

---

## 🎯 系统概述

### 核心功能

IDC设备管理系统是一个专为数据中心设计的综合性管理平台，提供以下核心功能：

- **🏢 机房管理**：管理多个机房的详细信息、容量和使用状态
- **🗄️ 机柜管理**：机柜的增删改查，支持按机房分类管理
- **💻 设备管理**：服务器、网络设备、存储设备的全生命周期管理
- **📊 数据看板**：实时监控数据中心整体运行状态
- **🎮 3D可视化**：三维机柜可视化展示，支持设备悬停详情查看
- **🔧 设备字段管理**：可配置的设备属性字段管理系统

### 主要特点

- **现代化UI**：基于Ant Design的专业企业级界面
- **响应式设计**：支持桌面和移动端访问
- **实时交互**：悬停显示设备详细信息
- **数据可视化**：直观的图表和统计信息
- **级联选择**：机房→机柜的智能选择机制
- **3D渲染**：Three.js实现的三维可视化效果

### 应用场景

- 数据中心运营管理
- IT资产盘点与跟踪
- 机房容量规划
- 设备维护管理
- 故障快速定位
- 合规性审计

---

## 🏗️ 项目架构

### 整体架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用       │    │   后端API       │    │   数据库层      │
│                │    │                │    │                │
│ React + Vite   │◄──►│ Express +      │◄──►│ SQLite/MySQL + │
│ Ant Design     │    │ Sequelize      │    │ Sequelize ORM  │
│ Three.js       │    │ RESTful API    │    │                │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 系统模块划分

#### 前端模块 (`frontend/src/pages/`)
- **Dashboard.jsx** - 数据看板和统计图表
- **RoomManagement.jsx** - 机房管理界面
- **RackManagement.jsx** - 机柜管理界面  
- **DeviceManagement.jsx** - 设备管理界面
- **DeviceFieldManagement.jsx** - 设备字段管理
- **RackVisualization.jsx** - 3D机柜可视化界面

#### 后端模块 (`backend/`)
- **models/** - 数据模型定义
  - `Room.js` - 机房模型
  - `Rack.js` - 机柜模型
  - `Device.js` - 设备模型
  - `DeviceField.js` - 设备字段模型
- **routes/** - API路由处理
  - `rooms.js` - 机房相关API
  - `racks.js` - 机柜相关API
  - `devices.js` - 设备相关API
  - `deviceFields.js` - 设备字段API

### 数据流图

```
用户操作 ──► 前端组件 ──► HTTP请求 ──► Express路由 ──► Sequelize ORM ──► SQLite数据库
    ▲                                                                       │
    │                                                                       ▼
    └─────────────────── 响应数据流向 ←────────────────────────────────────────┘
```

### 组件关系图

```
App.jsx (根组件)
├── Layout (布局组件)
│   ├── Sider (侧边导航)
│   └── Content (主内容区)
└── Routes (路由组件)
    ├── Dashboard
    ├── RoomManagement  
    ├── RackManagement
    ├── DeviceManagement
    ├── DeviceFieldManagement
    └── RackVisualization
```

---

## 🛠️ 技术栈说明

### 前端技术栈

| 技术 | 版本 | 用途 | 选择原因 |
|------|------|------|----------|
| **React** | 18.2.0 | 前端框架 | 现代化、组件化、生态丰富 |
| **Vite** | 4.4.9 | 构建工具 | 快速开发服务器、HMR支持 |
| **Ant Design** | 5.8.6 | UI组件库 | 企业级组件、主题定制 |
| **Axios** | 1.5.0 | HTTP客户端 | Promise-based、拦截器支持 |
| **React Router** | 6.15.0 | 路由管理 | 声明式路由、代码分割 |
| **Three.js** | 0.160.0 | 3D渲染 | 强大的3D图形库 |
| **@ant-design/icons** | 6.1.0 | 图标库 | 统一的视觉语言 |

### 后端技术栈

| 技术 | 版本 | 用途 | 选择原因 |
|------|------|------|----------|
| **Node.js** | ≥14.0.0 | 运行时环境 | JavaScript全栈、高性能 |
| **Express** | 4.18.2 | Web框架 | 简洁灵活、中间件丰富 |
| **Sequelize** | 6.32.1 | ORM框架 | 数据库抽象、多数据库支持 |
| **SQLite/MySQL** | 5.1.6/8.0+ | 数据库 | SQLite零配置、MySQL高性能 |
| **CORS** | 2.8.5 | 跨域处理 | 前后端分离架构必需 |
| **CSV-Parser** | 3.2.0 | CSV处理 | 数据导入导出功能 |
| **Nodemon** | 3.0.1 | 开发工具 | 自动重启、开发效率 |

### 开发工具

- **Git** - 版本控制
- **ESLint/Prettier** - 代码规范
- **Postman** - API测试
- **VSCode** - 开发IDE

---

## 📡 API接口文档

### 基础信息

- **Base URL**: `http://localhost:8000/api`
- **Content-Type**: `application/json`
- **响应格式**: JSON

### 通用响应格式

#### 成功响应
```json
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": "错误信息",
  "message": "详细描述"
}
```

### 机房管理API

#### 1. 获取所有机房
```http
GET /api/rooms
```

**响应示例**:
```json
[
  {
    "roomId": "room001",
    "name": "A区机房",
    "location": "一楼东侧",
    "area": 500,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### 2. 创建机房
```http
POST /api/rooms
```

**请求参数**:
```json
{
  "roomId": "room002",
  "name": "B区机房", 
  "location": "二楼西侧",
  "area": 600
}
```

**响应示例**:
```json
{
  "roomId": "room002",
  "name": "B区机房",
  "location": "二楼西侧", 
  "area": 600,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 3. 更新机房
```http
PUT /api/rooms/:roomId
```

#### 4. 删除机房
```http
DELETE /api/rooms/:roomId
```

### 机柜管理API

#### 1. 获取所有机柜
```http
GET /api/racks
```

**查询参数**:
- `roomId`: 按机房ID筛选

**响应示例**:
```json
[
  {
    "rackId": "rack001",
    "name": "机柜A1",
    "height": 42,
    "powerRating": 5000,
    "Room": {
      "roomId": "room001",
      "name": "A区机房"
    },
    "Devices": []
  }
]
```

#### 2. 创建机柜
```http
POST /api/racks
```

**请求参数**:
```json
{
  "rackId": "rack002",
  "name": "机柜A2",
  "height": 42,
  "powerRating": 5000,
  "RoomId": "room001"
}
```

#### 3. 更新机柜
```http
PUT /api/racks/:rackId
```

#### 4. 删除机柜
```http
DELETE /api/racks/:rackId
```

#### 5. 获取单个机柜详情
```http
GET /api/racks/:rackId
```

### 设备管理API

#### 1. 获取所有设备
```http
GET /api/devices
```

**查询参数**:
- `rackId`: 按机柜ID筛选
- `deviceType`: 按设备类型筛选

**响应示例**:
```json
[
  {
    "deviceId": "dev001",
    "name": "Web服务器01",
    "deviceType": "服务器",
    "manufacturer": "Dell",
    "model": "R740",
    "rackPosition": 1,
    "height": 2,
    "ipAddress": "192.168.1.100",
    "macAddress": "00:1B:44:11:3A:B7",
    "status": "运行中",
    "purchaseDate": "2023-01-01",
    "warrantyDate": "2026-01-01",
    "description": "主要Web应用服务器",
    "Rack": {
      "rackId": "rack001",
      "name": "机柜A1"
    }
  }
]
```

#### 2. 创建设备
```http
POST /api/devices
```

**请求参数**:
```json
{
  "deviceId": "dev002",
  "name": "数据库服务器",
  "deviceType": "服务器",
  "manufacturer": "HP",
  "model": "DL380",
  "rackId": "rack001",
  "rackPosition": 3,
  "height": 2,
  "ipAddress": "192.168.1.101",
  "status": "运行中"
}
```

#### 3. 更新设备
```http
PUT /api/devices/:deviceId
```

#### 4. 删除设备
```http
DELETE /api/devices/:deviceId
```

#### 5. 批量导入设备
```http
POST /api/devices/batch-import
```

**Content-Type**: `multipart/form-data`

**请求参数**:
- `file`: CSV格式的设备数据文件

### 设备字段管理API

#### 1. 获取所有设备字段
```http
GET /api/deviceFields
```

#### 2. 创建设备字段
```http
POST /api/deviceFields
```

**请求参数**:
```json
{
  "fieldName": "cpuModel",
  "displayName": "CPU型号",
  "fieldType": "text",
  "isRequired": false,
  "defaultValue": ""
}
```

#### 3. 更新设备字段
```http
PUT /api/deviceFields/:id
```

#### 4. 删除设备字段
```http
DELETE /api/deviceFields/:id
```

### 健康检查API

#### 服务状态检查
```http
GET /health
```

**响应示例**:
```json
{
  "status": "ok",
  "message": "IDC设备管理系统后端服务正常运行"
}
```

---

## 🚀 安装部署指南

### 环境要求

#### 开发环境
- **Node.js**: ≥14.0.0
- **npm**: ≥6.0.0 或 **yarn**: ≥1.22.0
- **操作系统**: Windows 10/11, macOS 10.14+, Linux (Ubuntu 18.04+)
- **内存**: 最小 4GB RAM
- **硬盘**: 最小 2GB 可用空间

#### 生产环境
- **Node.js**: ≥14.0.0
- **npm**: ≥6.0.0 或 **yarn**: ≥1.22.0
- **Web服务器**: Nginx (推荐) 或 Apache
- **操作系统**: Linux (Ubuntu 18.04+, CentOS 7+, RHEL 7+)
- **内存**: 最小 8GB RAM (推荐 16GB+)
- **硬盘**: 最小 10GB 可用空间 (SSD 推荐)
- **SSL证书**: Let's Encrypt (推荐) 或其他CA证书

### 快速开始

#### 1. 克隆项目
```bash
git clone https://gitee.com/zhang1106/idc_assest.git
cd idc_assest
```

#### 2. 安装后端依赖
```bash
cd backend
npm install
```

#### 3. 安装前端依赖
```bash
cd ../frontend
npm install
```

#### 4. 配置环境变量
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，根据需要修改配置
# 默认配置可直接使用 SQLite 数据库
```

#### 5. 启动服务
```bash
# 启动后端服务（端口8000）
cd backend && npm run dev

# 启动前端服务（端口3000）- 新终端
cd frontend && npm run dev
```

**访问地址**：
- 前端应用：http://localhost:3000
- 后端API：http://localhost:8000/api
- 健康检查：http://localhost:8000/health

### 详细安装和部署指南

📚 **完整安装部署文档**：请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

该文档包含：
- 🖥️ 开发环境详细配置
- 🚀 生产环境完整部署流程
- 🗄️ 数据库配置和管理
- 🔒 安全配置和优化
- 📊 监控和维护指南
- 🛠️ 常见问题解决方案

### 数据库选择

| 数据库类型 | 适用场景 | 优势 | 劣势 |
|------------|----------|------|------|
| **SQLite** | 开发环境、小规模应用 | 零配置、无需安装、数据文件便携 | 并发能力有限 |
| **MySQL** | 生产环境、企业级应用 | 高性能、并发处理能力强 | 需要额外配置 |

**默认配置使用 SQLite，无需额外配置即可开始使用。**

---

## ✨ 功能特性

### 🏢 机房管理
- 多机房支持
- 机房详细信息记录
- 按机房分类管理机柜

### 🗄️ 机柜管理  
- 机柜的增删改查
- 机柜容量统计
- 可视化机柜状态

### 💻 设备管理
- 设备全生命周期管理
- 批量导入/导出功能
- 设备状态跟踪
- 自定义设备字段

### 📊 数据看板
- 实时统计图表
- 设备状态分布
- 容量使用率分析
- 关键指标监控

### 🎮 3D可视化
- 三维机柜展示
- 设备悬停详情
- 实时交互体验
- 视角控制功能

### 🔧 系统特性
- 响应式设计
- 现代化UI界面
- 级联选择机制
- 数据实时刷新

---

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

```
MIT License

Copyright (c) 2024 IDC Management System

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

## 🤝 贡献指南

我们欢迎所有形式的贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

### 贡献方式
- 🐛 报告Bug
- 💡 提出新功能建议  
- 📝 改进文档
- 🔧 提交代码补丁

### 开发流程
1. Fork本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request



**⭐ 如果这个项目对您有帮助，请给我们一个Star！**