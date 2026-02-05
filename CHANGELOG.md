# CHANGELOG

所有版本变更记录按时间倒序排列。

---

## [1.2.0] - 2026-02-05

### 新增功能

#### 端口与线缆管理
- 新增设备端口管理模块，支持端口类型、速率、状态配置
- 新增网卡管理功能，支持网卡与端口绑定
- 新增线缆管理模块，支持机柜间线缆连接追踪
- 端口面板可视化展示

#### 系统功能增强
- 新增系统设置管理，支持站点名称、Logo等配置
- 新增背景配置管理，支持自定义系统背景
- 完善用户权限管理，支持角色权限分配

### 优化

#### 3D可视化性能优化
- 优化 Scene.jsx 渲染配置，降低设备像素比至 [1, 1.2]
- 减小阴影贴图尺寸至 [1024, 1024]
- 移除 ContactShadows 组件以减少阴影计算
- 简化光源配置，移除冗余 pointLight
- 优化环境光分辨率配置

#### 设备模型优化
- 实现性能模式（PERFORMANCE_MODE）以简化设备细节
- 添加设备滑轨动画控制开关
- 设备弹出动画默认关闭，可通过界面开关启用
- 优化设备状态指示灯渲染性能

#### LOD（多级细节）系统
- 实现 LOD 管理器，根据相机距离自动切换设备细节级别
- 高细节模式：完整设备模型，包含所有端口和细节
- 中等细节模式：简化设备模型，使用 InstancedMesh 渲染端口
- 低细节模式：极简设备模型，仅保留基本轮廓和状态灯
- 修复 LOD 切换时设备位置偏移问题

#### 交互体验改进
- 添加设备弹出动画开关控制
- 优化设备悬停和点击交互响应
- 改进视角控制流畅度

### 修复

- 修复 AnimationManager 导入错误，移除对不存在文件的引用
- 修复设备在缩放时位置偏移的问题
- 修复 LOD 模型中状态灯位置计算错误
- 修复 LODManager 中的几何体参数错误

---

## [1.1.0] - 2026-01-26

### 优化

#### 3D可视化性能优化
- 优化 Scene.jsx 渲染配置，降低设备像素比至 [1, 1.2]
- 减小阴影贴图尺寸至 [1024, 1024]
- 移除 ContactShadows 组件以减少阴影计算
- 简化光源配置，移除冗余 pointLight
- 优化环境光分辨率配置

#### 设备模型优化
- 实现性能模式（PERFORMANCE_MODE）以简化设备细节
- 添加设备滑轨动画控制开关
- 设备弹出动画默认关闭，可通过界面开关启用
- 优化设备状态指示灯渲染性能

#### LOD（多级细节）系统
- 实现 LOD 管理器，根据相机距离自动切换设备细节级别
- 高细节模式：完整设备模型，包含所有端口和细节
- 中等细节模式：简化设备模型，使用 InstancedMesh 渲染端口
- 低细节模式：极简设备模型，仅保留基本轮廓和状态灯
- 修复 LOD 切换时设备位置偏移问题

#### 交互体验改进
- 添加设备弹出动画开关控制
- 优化设备悬停和点击交互响应
- 改进视角控制流畅度

### 修复

- 修复 AnimationManager 导入错误，移除对不存在文件的引用
- 修复设备在缩放时位置偏移的问题
- 修复 LOD 模型中状态灯位置计算错误
- 修复 LODManager 中的几何体参数错误

---

## [1.0.0] - 2026-01-21

### 新增功能

#### 机房管理模块
- 机房列表查询与展示
- 机房创建、编辑、删除功能
- 机房位置、面积等详细信息管理

#### 机柜管理模块
- 机柜增删改查操作
- 按机房分类管理机柜
- 机柜容量统计与状态展示
- 3D机柜可视化展示

#### 设备管理模块
- 设备全生命周期管理
- 设备批量导入/导出功能
- 自定义设备字段配置
- 设备状态跟踪与筛选

#### 工单管理模块
- 工单创建与处理流程
- 工单分类管理
- 工单自定义字段
- 工单操作记录审计

#### 耗材管理模块
- 耗材分类管理
- 耗材库存管理
- 耗材领用记录
- 耗材使用统计报表

#### 用户权限模块
- 用户管理
- 角色管理
- 权限控制
- 认证授权

#### 系统配置模块
- 系统设置管理
- 背景配置管理
- 设备字段初始化
- 工单字段初始化

### 技术架构

#### 前端技术栈
- React 18.2.0
- Vite 4.4.9
- Ant Design 5.8.6
- Three.js 0.160.0
- React Router 6.15.0
- Axios 1.5.0
- Day.js 1.11.19
- SheetJS (xlsx) 0.18.5
- PapaParse 5.5.3

#### 后端技术栈
- Node.js ≥14.0.0
- Express 4.18.2
- Sequelize 6.32.1
- SQLite/MySQL 支持
- JWT 9.0.3
- bcryptjs 3.0.3
- Winston 3.19.0
- Jest 30.2.0

### 数据库模型

- Room（机房）
- Rack（机柜）
- Device（设备）
- DeviceField（设备字段）
- DevicePort（设备端口）
- NetworkCard（网卡）
- Cable（线缆）
- Ticket（工单）
- TicketField（工单字段）
- TicketCategory（工单分类）
- TicketOperationRecord（工单操作记录）
- Consumable（耗材）
- ConsumableCategory（耗材分类）
- ConsumableRecord（耗材领用记录）
- ConsumableLog（耗材日志）
- User（用户）
- Role（角色）
- Permission（权限）
- UserRole（用户角色关联）
- SystemSetting（系统设置）

### API接口

#### 基础接口
- 健康检查：`GET /health`

#### 认证接口
- 用户登录：`POST /api/auth/login`
- 用户注册：`POST /api/auth/register`

#### 机房接口
- 获取机房列表：`GET /api/rooms`
- 创建机房：`POST /api/rooms`
- 更新机房：`PUT /api/rooms/:roomId`
- 删除机房：`DELETE /api/rooms/:roomId`

#### 机柜接口
- 获取机柜列表：`GET /api/racks`
- 创建机柜：`POST /api/racks`
- 更新机柜：`PUT /api/racks/:rackId`
- 删除机柜：`DELETE /api/racks/:rackId`
- 获取机柜详情：`GET /api/racks/:rackId`

#### 设备接口
- 获取设备列表：`GET /api/devices`
- 创建设备：`POST /api/devices`
- 更新设备：`PUT /api/devices/:deviceId`
- 删除设备：`DELETE /api/devices/:deviceId`
- 批量导入设备：`POST /api/devices/batch-import`

#### 设备字段接口
- 获取设备字段：`GET /api/deviceFields`
- 创建设备字段：`POST /api/deviceFields`
- 更新设备字段：`PUT /api/deviceFields/:id`
- 删除设备字段：`DELETE /api/deviceFields/:id`

#### 设备端口接口
- 获取端口列表：`GET /api/device-ports`
- 创建端口：`POST /api/device-ports`
- 更新端口：`PUT /api/device-ports/:id`
- 删除端口：`DELETE /api/device-ports/:id`

#### 网卡接口
- 获取网卡列表：`GET /api/network-cards`
- 创建网卡：`POST /api/network-cards`
- 更新网卡：`PUT /api/network-cards/:id`
- 删除网卡：`DELETE /api/network-cards/:id`

#### 线缆接口
- 获取线缆列表：`GET /api/cables`
- 创建线缆：`POST /api/cables`
- 更新线缆：`PUT /api/cables/:id`
- 删除线缆：`DELETE /api/cables/:id`

#### 工单接口
- 获取工单列表：`GET /api/tickets`
- 创建工单：`POST /api/tickets`
- 更新工单：`PUT /api/tickets/:ticketId`
- 删除工单：`DELETE /api/tickets/:ticketId`

#### 工单分类接口
- 获取分类列表：`GET /api/ticket-categories`
- 创建分类：`POST /api/ticket-categories`
- 更新分类：`PUT /api/ticket-categories/:id`
- 删除分类：`DELETE /api/ticket-categories/:id`

#### 工单字段接口
- 获取字段列表：`GET /api/ticket-fields`
- 创建字段：`POST /api/ticket-fields`
- 更新字段：`PUT /api/ticket-fields/:id`
- 删除字段：`DELETE /api/ticket-fields/:id`

#### 耗材接口
- 获取耗材列表：`GET /api/consumables`
- 创建耗材：`POST /api/consumables`
- 更新耗材：`PUT /api/consumables/:consumableId`
- 删除耗材：`DELETE /api/consumables/:consumableId`

#### 耗材分类接口
- 获取分类列表：`GET /api/consumable-categories`
- 创建分类：`POST /api/consumable-categories`
- 更新分类：`PUT /api/consumable-categories/:id`
- 删除分类：`DELETE /api/consumable-categories/:id`

#### 耗材记录接口
- 获取记录列表：`GET /api/consumable-records`
- 创建记录：`POST /api/consumable-records`
- 更新记录：`PUT /api/consumable-records/:id`
- 删除记录：`DELETE /api/consumable-records/:id`

#### 用户接口
- 获取用户列表：`GET /api/users`
- 创建用户：`POST /api/users`
- 更新用户：`PUT /api/users/:userId`
- 删除用户：`DELETE /api/users/:userId`

#### 角色接口
- 获取角色列表：`GET /api/roles`
- 创建角色：`POST /api/roles`
- 更新角色：`PUT /api/roles/:roleId`
- 删除角色：`DELETE /api/roles/:roleId`

#### 系统设置接口
- 获取系统设置：`GET /api/system-settings`
- 更新系统设置：`PUT /api/system-settings`

#### 背景配置接口
- 获取背景配置：`GET /api/background`
- 更新背景配置：`PUT /api/background`

---

## 格式说明

本CHANGELOG遵循 [Keep a Changelog](https://keepachangelog.com/) 规范：

- **新增**：新功能添加
- **优化**：功能改进和性能优化
- **修复**：bug修复
- **废弃**：即将移除的功能
- **移除**：已移除的功能
- **安全**：安全相关的修复

## 版本号规范

使用语义化版本号（Semantic Versioning）：

- **主版本号 (MAJOR)**：不兼容的API变更
- **次版本号 (MINOR)**：向后兼容的新功能
- **修订号 (PATCH)**：向后兼容的bug修复
