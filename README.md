# IDC设备管理系统

一个基于React+Node.js+MySQL的IDC设备管理系统，用于管理IDC机房中的设备、机柜和机房信息。

## 功能特点

### 后端功能
- 机房管理（增删改查）
- 机柜管理（增删改查）
- 设备管理（增删改查）
- 功率统计与管理
- 设备状态监控

### 前端功能
- 仪表盘：设备、机柜、机房统计信息
- 设备管理：设备列表、搜索、筛选、添加、编辑、删除
- 机柜管理：机柜列表、搜索、筛选、添加、编辑、删除
- 机房管理：机房列表、搜索、筛选、添加、编辑、删除

## 技术栈

### 前端
- React 18
- Ant Design 5
- Vite 4
- React Router 6
- Axios

### 后端
- Node.js
- Express.js
- Sequelize
- MySQL

## 项目结构

```
idc-device-management/
├── backend/              # 后端代码
│   ├── models/           # 数据库模型
│   │   ├── Room.js       # 机房模型
│   │   ├── Rack.js       # 机柜模型
│   │   └── Device.js     # 设备模型
│   ├── routes/           # API路由
│   │   ├── rooms.js      # 机房路由
│   │   ├── racks.js      # 机柜路由
│   │   └── devices.js    # 设备路由
│   ├── server.js         # 服务器主文件
│   └── package.json      # 后端依赖
├── frontend/             # 前端代码
│   ├── src/              # 前端源码
│   │   ├── pages/        # 页面组件
│   │   │   ├── Dashboard.jsx              # 仪表盘
│   │   │   ├── DeviceManagement.jsx       # 设备管理
│   │   │   ├── RackManagement.jsx         # 机柜管理
│   │   │   └── RoomManagement.jsx         # 机房管理
│   │   ├── App.jsx       # 应用主组件
│   │   ├── main.jsx      # 应用入口
│   │   └── index.css     # 全局样式
│   ├── index.html        # HTML模板
│   ├── vite.config.js    # Vite配置
│   └── package.json      # 前端依赖
└── package.json          # 项目依赖
```

## 安装与运行

### 1. 安装依赖

```bash
# 安装所有依赖
npm run install:all
```

### 2. 配置数据库

1. 创建MySQL数据库：
```sql
CREATE DATABASE idc_management;
```

2. 修改后端数据库连接配置（backend/server.js）：
```javascript
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',       // 修改为你的MySQL用户名
  password: 'password',   // 修改为你的MySQL密码
  database: 'idc_management'
});
```

### 3. 启动服务

```bash
# 同时启动前后端服务
npm start

# 或分别启动
npm run start:backend    # 启动后端服务（端口：3001）
npm run start:frontend   # 启动前端服务（端口：3000）
```

### 4. 访问系统

前端地址：http://localhost:3000
后端API地址：http://localhost:3001

## API接口

### 机房管理
- GET /api/rooms - 获取所有机房
- GET /api/rooms/:roomId - 获取单个机房
- POST /api/rooms - 创建机房
- PUT /api/rooms/:roomId - 更新机房
- DELETE /api/rooms/:roomId - 删除机房

### 机柜管理
- GET /api/racks - 获取所有机柜
- GET /api/racks/:rackId - 获取单个机柜
- POST /api/racks - 创建机柜
- PUT /api/racks/:rackId - 更新机柜
- DELETE /api/racks/:rackId - 删除机柜

### 设备管理
- GET /api/devices - 获取所有设备
- GET /api/devices/:deviceId - 获取单个设备
- POST /api/devices - 创建设备
- PUT /api/devices/:deviceId - 更新设备
- DELETE /api/devices/:deviceId - 删除设备

## 开发说明

### 后端开发

1. 进入后端目录：
```bash
cd backend
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

### 前端开发

1. 进入前端目录：
```bash
cd frontend
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

## 注意事项

1. 确保MySQL服务已经启动
2. 首次运行需要创建数据库
3. 设备创建时会自动更新机柜的当前功率
4. 设备更新或删除时会自动调整机柜的当前功率
5. 机柜删除前需要确保没有关联的设备
6. 机房删除前需要确保没有关联的机柜

## License

MIT