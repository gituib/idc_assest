# API接口文档

本文档描述IDC设备管理系统的后端API接口，遵循RESTful设计规范。

---

## 目录

- [基础信息](#基础信息)
- [认证接口](#认证接口)
- [机房管理接口](#机房管理接口)
- [机柜管理接口](#机柜管理接口)
- [设备管理接口](#设备管理接口)
- [设备字段接口](#设备字段接口)
- [设备端口接口](#设备端口接口)
- [网卡接口](#网卡接口)
- [线缆接口](#线缆接口)
- [工单管理接口](#工单管理接口)
- [工单分类接口](#工单分类接口)
- [工单字段接口](#工单字段接口)
- [耗材管理接口](#耗材管理接口)
- [耗材分类接口](#耗材分类接口)
- [耗材记录接口](#耗材记录接口)
- [盘点管理接口](#盘点管理接口)
- [空闲设备接口](#空闲设备接口)
- [操作日志接口](#操作日志接口)
- [备份管理接口](#备份管理接口)
- [仓库管理接口](#仓库管理接口)
- [拓扑管理接口](#拓扑管理接口)
- [用户管理接口](#用户管理接口)
- [角色管理接口](#角色管理接口)
- [系统设置接口](#系统设置接口)
- [背景配置接口](#背景配置接口)
- [健康检查接口](#健康检查接口)
- [错误码说明](#错误码说明)

---

## 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `http://localhost:8000/api` |
| Content-Type | `application/json` |
| 认证方式 | Bearer Token (JWT) |

### 通用请求头

```http
Content-Type: application/json
Authorization: Bearer <token>
```

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

### 分页参数

列表接口支持以下分页参数：

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 10 | 每页数量 |

**分页响应示例：**
```json
{
  "success": true,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  },
  "message": "操作成功"
}
```

---

## 认证接口

### 用户登录

```http
POST /api/auth/login
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**请求示例：**

```json
{
  "username": "admin",
  "password": "password123"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "user001",
      "username": "admin",
      "email": "admin@example.com",
      "phone": "13800138000",
      "status": "active",
      "Roles": [
        {
          "roleId": "role001",
          "roleName": "管理员"
        }
      ]
    }
  },
  "message": "登录成功"
}
```

### 用户注册

```http
POST /api/auth/register
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| username | string | 是 | 用户名（3-20字符） |
| password | string | 是 | 密码（6-20字符） |
| email | string | 否 | 邮箱 |
| phone | string | 否 | 电话 |

**请求示例：**

```json
{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com",
  "phone": "13800138000"
}
```

### 获取当前用户信息

```http
GET /api/auth/me
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "userId": "user001",
    "username": "admin",
    "email": "admin@example.com",
    "Roles": [...]
  },
  "message": "操作成功"
}
```

---

## 机房管理接口

### 获取机房列表

```http
GET /api/rooms
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| keyword | string | 按名称搜索 |
| status | string | 按状态筛选 |

**响应示例：**

```json
{
  "roomId": "room001",
  "name": "A区机房",
  "location": "一楼东侧",
  "area": 500,
  "description": "主要服务器机房",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 获取单个机房

```http
GET /api/rooms/:roomId
```

### 创建机房

```http
POST /api/rooms
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| roomId | string | 是 | 机房ID（唯一标识） |
| name | string | 是 | 机房名称 |
| location | string | 否 | 机房位置 |
| area | number | 否 | 面积(平方米) |
| description | string | 否 | 描述 |
| status | string | 否 | 状态（active/inactive） |

**请求示例：**

```json
{
  "roomId": "room002",
  "name": "B区机房",
  "location": "二楼西侧",
  "area": 600,
  "description": "网络设备机房",
  "status": "active"
}
```

### 更新机房

```http
PUT /api/rooms/:roomId
```

**请求参数：** 同创建机房（roomId除外）

### 删除机房

```http
DELETE /api/rooms/:roomId
```

**说明：** 删除机房前需确保机房下无机柜

---

## 机柜管理接口

### 获取机柜列表

```http
GET /api/racks
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| roomId | string | 按机房ID筛选 |
| status | string | 按状态筛选 |
| keyword | string | 按名称搜索 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应示例：**

```json
{
  "racks": [
    {
      "rackId": "rack001",
      "name": "机柜A1",
      "height": 42,
      "maxPower": 5000,
      "currentPower": 1200,
      "roomId": "room001",
      "Room": {
        "roomId": "room001",
        "name": "A区机房"
      },
      "Devices": [],
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100
}
```

### 获取单个机柜

```http
GET /api/racks/:rackId
```

### 创建机柜

```http
POST /api/racks
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| rackId | string | 否 | 机柜ID（留空自动生成） |
| name | string | 是 | 机柜名称 |
| height | number | 否 | 高度(U)，默认42 |
| maxPower | number | 否 | 额定功率(W) |
| roomId | string | 是 | 所属机房ID |
| status | string | 否 | 状态（active/maintenance/inactive） |
| description | string | 否 | 描述 |

**请求示例：**

```json
{
  "name": "机柜A2",
  "height": 42,
  "maxPower": 5000,
  "roomId": "room001",
  "status": "active",
  "description": "核心交换机机柜"
}
```

### 更新机柜

```http
PUT /api/racks/:rackId
```

### 删除机柜

```http
DELETE /api/racks/:rackId
```

**说明：** 删除机柜前需确保机柜下无设备

### 获取机柜导入模板

```http
GET /api/racks/import-template
```

**响应：** 返回Excel模板文件

### 导出机柜数据

```http
GET /api/racks/export
```

**响应：** 返回Excel文件

### 导入机柜数据

```http
POST /api/racks/import
```

**Content-Type**: `multipart/form-data`

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| file | File | 是 | Excel格式的机柜数据文件 |

---

## 设备管理接口

### 获取设备列表

```http
GET /api/devices
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| rackId | string | 按机柜ID筛选 |
| type | string | 按设备类型筛选 |
| status | string | 按状态筛选 |
| keyword | string | 按名称/IP/序列号搜索 |
| page | number | 页码，默认1 |
| pageSize | number | 每页数量，默认10 |

**响应示例：**

```json
{
  "devices": [
    {
      "deviceId": "dev001",
      "name": "Web服务器01",
      "type": "server",
      "model": "R740",
      "serialNumber": "SN123456",
      "rackId": "rack001",
      "position": 1,
      "height": 2,
      "powerConsumption": 500,
      "ipAddress": "192.168.1.100",
      "status": "running",
      "purchaseDate": "2023-01-01",
      "warrantyExpiry": "2026-01-01",
      "description": "主要Web应用服务器",
      "Rack": {
        "rackId": "rack001",
        "name": "机柜A1",
        "Room": {
          "roomId": "room001",
          "name": "A区机房"
        }
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 10
}
```

### 获取单个设备

```http
GET /api/devices/:deviceId
```

### 创建设备

```http
POST /api/devices
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| deviceId | string | 否 | 设备ID（留空自动生成） |
| name | string | 是 | 设备名称 |
| type | string | 是 | 设备类型（server/switch/router/storage/other） |
| model | string | 否 | 型号 |
| serialNumber | string | 是 | 序列号 |
| rackId | string | 否 | 所属机柜ID |
| position | number | 否 | 机柜位置（从1开始） |
| height | number | 否 | 占用高度(U) |
| powerConsumption | number | 否 | 功耗(W) |
| ipAddress | string | 否 | IP地址 |
| status | string | 否 | 状态（running/maintenance/offline/fault） |
| purchaseDate | string | 否 | 购买日期（YYYY-MM-DD） |
| warrantyExpiry | string | 否 | 保修到期日期（YYYY-MM-DD） |
| description | string | 否 | 描述 |
| customFields | object | 否 | 自定义字段值 |

**请求示例：**

```json
{
  "name": "数据库服务器",
  "type": "server",
  "model": "DL380",
  "serialNumber": "SN789012",
  "rackId": "rack001",
  "position": 3,
  "height": 2,
  "powerConsumption": 600,
  "ipAddress": "192.168.1.101",
  "status": "running",
  "customFields": {
    "cpuModel": "Intel Xeon E5-2680",
    "memorySize": "64GB"
  }
}
```

### 更新设备

```http
PUT /api/devices/:deviceId
```

### 删除设备

```http
DELETE /api/devices/:deviceId
```

### 批量删除设备

```http
DELETE /api/devices/batch-delete
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| deviceIds | array | 是 | 设备ID列表 |

**请求示例：**

```json
{
  "deviceIds": ["dev001", "dev002", "dev003"]
}
```

### 删除所有设备

```http
DELETE /api/devices/delete-all
```

### 批量上线设备

```http
PUT /api/devices/batch-online
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| deviceIds | array | 是 | 设备ID列表 |

### 批量下线设备

```http
PUT /api/devices/batch-offline
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| deviceIds | array | 是 | 设备ID列表 |

### 批量变更设备状态

```http
PUT /api/devices/batch-status
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| deviceIds | array | 是 | 设备ID列表 |
| status | string | 是 | 目标状态（running/maintenance/offline/fault） |

### 批量移动设备

```http
PUT /api/devices/batch-move
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| deviceIds | array | 是 | 设备ID列表 |
| targetRackId | string | 是 | 目标机柜ID |
| startPosition | number | 否 | 起始位置 |

### 获取设备导入模板

```http
GET /api/devices/import-template
```

**响应：** 返回CSV模板文件

### 导出设备数据

```http
GET /api/devices/export
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| deviceIds | string/array | 指定导出的设备ID |

**响应：** 返回CSV文件

### 导入设备数据

```http
POST /api/devices/import
```

**Content-Type**: `multipart/form-data`

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| csvFile | File | 是 | CSV格式的设备数据文件 |

### 增强导出设备数据

```http
GET /api/devices/enhanced-export
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| deviceIds | string/array | 指定导出的设备ID |
| format | string | 导出格式（csv/json） |
| fields | string | JSON格式的字段列表 |
| fieldLabels | string | JSON格式的字段标签映射 |

### 获取设备的工单列表

```http
GET /api/devices/:deviceId/tickets
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| status | string | 按状态筛选 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

---

## 设备字段接口

### 获取设备字段列表

```http
GET /api/deviceFields
```

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "fieldName": "cpuModel",
      "displayName": "CPU型号",
      "fieldType": "string",
      "required": false,
      "defaultValue": "",
      "options": null,
      "order": 1,
      "isSystem": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "操作成功"
}
```

### 创建设备字段

```http
POST /api/deviceFields
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| fieldName | string | 是 | 字段名（英文，唯一） |
| displayName | string | 是 | 显示名称（中文） |
| fieldType | string | 是 | 字段类型（string/number/date/select/boolean/textarea） |
| required | boolean | 否 | 是否必填，默认false |
| defaultValue | string | 否 | 默认值 |
| options | array | 否 | 选项（select类型使用） |
| order | number | 否 | 排序顺序 |
| visible | boolean | 否 | 是否可见，默认true |

### 更新设备字段

```http
PUT /api/deviceFields/:id
```

### 删除设备字段

```http
DELETE /api/deviceFields/:id
```

**说明：** 系统字段（isSystem=true）不可删除

---

## 设备端口接口

### 获取端口列表

```http
GET /api/device-ports
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| deviceId | string | 按设备ID筛选 |
| status | string | 按状态筛选（free/occupied/fault） |
| portType | string | 按端口类型筛选 |
| portSpeed | string | 按端口速率筛选 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

### 获取设备的所有端口

```http
GET /api/device-ports/device/:deviceId
```

### 获取单个端口详情

```http
GET /api/device-ports/:portId
```

### 创建端口

```http
POST /api/device-ports
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| portId | string | 否 | 端口ID（留空自动生成） |
| deviceId | string | 是 | 所属设备ID |
| nicId | string | 否 | 所属网卡ID |
| portName | string | 是 | 端口名称 |
| portType | string | 否 | 端口类型（RJ45/SFP/SFP+/QSFP等），默认RJ45 |
| portSpeed | string | 否 | 速率（10M/100M/1G/10G/25G/40G/100G），默认1G |
| status | string | 否 | 状态（free/occupied/fault），默认free |
| vlanId | string | 否 | VLAN ID |
| description | string | 否 | 描述 |

### 批量创建端口

```http
POST /api/device-ports/batch
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| ports | array | 是 | 端口数据列表 |

### 更新端口

```http
PUT /api/device-ports/:portId
```

### 删除端口

```http
DELETE /api/device-ports/:portId
```

### 批量删除端口

```http
DELETE /api/device-ports/batch
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| portIds | array | 是 | 端口ID列表 |

---

## 网卡接口

### 获取网卡列表

```http
GET /api/network-cards
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| deviceId | string | 按设备ID筛选 |

### 获取设备的所有网卡

```http
GET /api/network-cards/device/:deviceId
```

### 获取设备的网卡及端口信息

```http
GET /api/network-cards/device/:deviceId/with-ports
```

### 获取单个网卡详情

```http
GET /api/network-cards/:nicId
```

### 获取网卡的端口列表

```http
GET /api/network-cards/:nicId/ports
```

### 创建网卡

```http
POST /api/network-cards
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| nicId | string | 否 | 网卡ID（留空自动生成） |
| deviceId | string | 是 | 所属设备ID |
| name | string | 是 | 网卡名称 |
| description | string | 否 | 描述 |
| slotNumber | number | 否 | 插槽号 |
| model | string | 否 | 型号 |
| manufacturer | string | 否 | 厂商 |
| status | string | 否 | 状态（normal/fault），默认normal |

### 更新网卡

```http
PUT /api/network-cards/:nicId
```

### 删除网卡

```http
DELETE /api/network-cards/:nicId
```

**说明：** 删除网卡前需确保网卡下无端口

---

## 线缆接口

### 获取线缆列表

```http
GET /api/cables
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| sourceDeviceId | string | 按源设备筛选 |
| targetDeviceId | string | 按目标设备筛选 |
| status | string | 按状态筛选 |
| cableType | string | 按线缆类型筛选 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

### 获取设备的所有接线

```http
GET /api/cables/device/:deviceId
```

### 获取机柜内所有设备的接线

```http
GET /api/cables/rack/:rackId
```

### 检查接线冲突

```http
POST /api/cables/check-conflict
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| sourceDeviceId | string | 是 | 源设备ID |
| sourcePort | string | 是 | 源端口名称 |
| targetDeviceId | string | 是 | 目标设备ID |
| targetPort | string | 是 | 目标端口名称 |
| excludeCableId | string | 否 | 排除的线缆ID（用于编辑时） |

### 获取单个线缆详情

```http
GET /api/cables/:cableId
```

### 创建线缆

```http
POST /api/cables
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| cableId | string | 否 | 线缆ID（留空自动生成） |
| sourceDeviceId | string | 是 | 源设备ID |
| sourcePort | string | 是 | 源端口名称 |
| targetDeviceId | string | 是 | 目标设备ID |
| targetPort | string | 是 | 目标端口名称 |
| cableType | string | 否 | 线缆类型（ethernet/fiber/optical等），默认ethernet |
| cableLength | number | 否 | 长度(米) |
| status | string | 否 | 状态（normal/fault），默认normal |
| description | string | 否 | 描述 |
| force | boolean | 否 | 是否强制创建（覆盖已有连接） |

### 批量创建线缆

```http
POST /api/cables/batch
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| cables | array | 是 | 线缆数据列表 |

### 更新线缆

```http
PUT /api/cables/:cableId
```

### 删除线缆

```http
DELETE /api/cables/:cableId
```

### 批量删除线缆

```http
DELETE /api/cables/batch
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| cableIds | array | 是 | 线缆ID列表 |

---

## 工单管理接口

### 获取工单列表

```http
GET /api/tickets
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| status | string | 按状态筛选（pending/in_progress/completed/closed） |
| priority | string | 按优先级筛选（urgent/high/medium/low） |
| faultCategory | string | 按故障分类筛选 |
| deviceId | string | 按设备筛选 |
| reporterId | string | 按报修人筛选 |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |
| keyword | string | 关键词搜索 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应示例：**

```json
{
  "total": 50,
  "tickets": [
    {
      "ticketId": "TKT001",
      "title": "服务器故障",
      "description": "Web服务器无法访问",
      "status": "in_progress",
      "priority": "high",
      "faultCategory": "硬件故障",
      "deviceId": "dev001",
      "deviceName": "Web服务器01",
      "serialNumber": "SN123456",
      "reporterId": "user001",
      "reporterName": "张三",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 10
}
```

### 获取工单统计

```http
GET /api/tickets/stats
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

### 获取单个工单详情

```http
GET /api/tickets/:ticketId
```

### 创建工单

```http
POST /api/tickets
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| deviceId | string | 否 | 关联设备ID（与deviceName+serialNumber二选一） |
| deviceName | string | 否 | 设备名称（手动输入时） |
| serialNumber | string | 否 | 序列号（手动输入时） |
| title | string | 否 | 工单标题 |
| faultCategory | string | 是 | 故障分类 |
| faultSubCategory | string | 否 | 故障子分类 |
| priority | string | 否 | 优先级（urgent/high/medium/low），默认medium |
| description | string | 是 | 问题描述 |
| expectedCompletionDate | string | 否 | 期望完成日期 |
| reporterId | string | 否 | 报修人ID |
| reporterName | string | 否 | 报修人姓名 |
| attachments | array | 否 | 附件列表 |
| tags | array | 否 | 标签列表 |

### 更新工单

```http
PUT /api/tickets/:ticketId
```

### 更新工单状态

```http
PUT /api/tickets/:ticketId/status
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| status | string | 是 | 目标状态 |
| resolution | string | 否 | 解决方案（完成时填写） |
| operatorId | string | 否 | 操作人ID |
| operatorName | string | 否 | 操作人姓名 |
| operatorRole | string | 否 | 操作人角色 |

### 处理工单

```http
PUT /api/tickets/:ticketId/process
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| solution | string | 否 | 解决方案 |
| result | string | 否 | 处理结果（resolved/unresolved） |
| notes | string | 否 | 备注 |
| usedParts | string | 否 | 使用配件 |
| operatorId | string | 否 | 操作人ID |
| operatorName | string | 否 | 操作人姓名 |

### 添加工单操作记录

```http
POST /api/tickets/:ticketId/operations
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| operationType | string | 是 | 操作类型 |
| operationDescription | string | 是 | 操作描述 |
| operationSteps | array | 否 | 操作步骤 |
| spareParts | array | 否 | 使用配件 |
| duration | number | 否 | 耗时(分钟) |
| result | string | 否 | 结果 |
| notes | string | 否 | 备注 |
| operatorId | string | 否 | 操作人ID |
| operatorName | string | 否 | 操作人姓名 |
| operatorRole | string | 否 | 操作人角色 |

### 获取工单操作记录

```http
GET /api/tickets/:ticketId/operations
```

### 删除工单

```http
DELETE /api/tickets/:ticketId
```

### 评价工单

```http
POST /api/tickets/:ticketId/evaluate
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| evaluation | string | 是 | 评价内容 |
| evaluationRating | number | 是 | 评分(1-5) |
| operatorId | string | 否 | 操作人ID |
| operatorName | string | 否 | 操作人姓名 |

---

## 工单分类接口

### 获取分类列表

```http
GET /api/ticket-categories
```

### 创建分类

```http
POST /api/ticket-categories
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| categoryId | string | 是 | 分类ID（唯一标识） |
| name | string | 是 | 分类名称 |
| description | string | 否 | 描述 |
| sortOrder | number | 否 | 排序顺序 |

### 更新分类

```http
PUT /api/ticket-categories/:id
```

### 删除分类

```http
DELETE /api/ticket-categories/:id
```

---

## 工单字段接口

### 获取字段列表

```http
GET /api/ticket-fields
```

### 创建字段

```http
POST /api/ticket-fields
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| fieldName | string | 是 | 字段名（英文，唯一） |
| displayName | string | 是 | 显示名称（中文） |
| fieldType | string | 是 | 字段类型（text/number/date/select/textarea） |
| isRequired | boolean | 否 | 是否必填 |
| defaultValue | string | 否 | 默认值 |
| options | string | 否 | 选项（逗号分隔） |
| sortOrder | number | 否 | 排序顺序 |

### 更新字段

```http
PUT /api/ticket-fields/:id
```

### 删除字段

```http
DELETE /api/ticket-fields/:id
```

---

## 耗材管理接口

### 获取耗材列表

```http
GET /api/consumables
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| category | string | 按分类筛选 |
| status | string | 按状态筛选 |
| keyword | string | 按名称搜索 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应示例：**

```json
{
  "total": 100,
  "consumables": [
    {
      "consumableId": "cons001",
      "name": "硬盘",
      "category": "存储设备",
      "specification": "1TB SSD",
      "unit": "个",
      "currentStock": 100,
      "minStock": 10,
      "maxStock": 200,
      "unitPrice": 500,
      "supplier": "供应商A",
      "location": "仓库1",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 10
}
```

### 获取单个耗材

```http
GET /api/consumables/:id
```

### 创建耗材

```http
POST /api/consumables
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| consumableId | string | 否 | 耗材ID（留空自动生成） |
| name | string | 是 | 耗材名称 |
| category | string | 是 | 分类 |
| specification | string | 否 | 规格 |
| unit | string | 否 | 单位 |
| currentStock | number | 否 | 当前库存，默认0 |
| minStock | number | 否 | 最低库存预警值 |
| maxStock | number | 否 | 最高库存值 |
| unitPrice | number | 否 | 单价 |
| supplier | string | 否 | 供应商 |
| location | string | 否 | 存放位置 |
| status | string | 否 | 状态（active/inactive），默认active |
| description | string | 否 | 描述 |

### 更新耗材

```http
PUT /api/consumables/:id
```

### 删除耗材

```http
DELETE /api/consumables/:id
```

### 导入耗材

```http
POST /api/consumables/import
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| items | array | 是 | 耗材数据列表 |
| operator | string | 否 | 操作人 |

### 获取耗材分类列表

```http
GET /api/consumables/categories/list
```

### 获取低库存耗材

```http
GET /api/consumables/low-stock
```

### 获取耗材统计汇总

```http
GET /api/consumables/statistics/summary
```

### 获取出入库记录

```http
GET /api/consumables/inout/records
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| page | number | 页码 |
| pageSize | number | 每页数量 |

### 快速出入库

```http
POST /api/consumables/quick-inout
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| consumableId | string | 是 | 耗材ID |
| type | string | 是 | 类型（in/out） |
| quantity | number | 是 | 数量 |
| operator | string | 否 | 操作人 |
| reason | string | 否 | 原因 |
| notes | string | 否 | 备注 |
| snList | array | 否 | SN列表 |

### 出入库操作

```http
POST /api/consumables/inout
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| consumableId | string | 是 | 耗材ID |
| type | string | 是 | 类型（in/out） |
| quantity | number | 是 | 数量 |
| operator | string | 否 | 操作人 |
| reason | string | 否 | 原因 |
| recipient | string | 否 | 领用人 |
| notes | string | 否 | 备注 |
| snList | array | 否 | SN列表 |

### 库存调整

```http
POST /api/consumables/adjust
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| consumableId | string | 是 | 耗材ID |
| adjustType | string | 是 | 调整类型（add/subtract/set） |
| quantity | number | 是 | 数量 |
| operator | string | 否 | 操作人 |
| reason | string | 否 | 原因 |
| notes | string | 否 | 备注 |

### 获取耗材操作日志

```http
GET /api/consumables/logs
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| consumableId | string | 按耗材筛选 |
| operationType | string | 按操作类型筛选（多个用逗号分隔） |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

### 导出耗材日志

```http
GET /api/consumables/logs/export
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| consumableId | string | 按耗材筛选 |
| operationType | string | 按操作类型筛选 |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

### 导入耗材日志

```http
POST /api/consumables/logs/import
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| logs | array | 是 | 日志数据列表 |
| operator | string | 否 | 操作人 |

### 修改日志记录

```http
PUT /api/consumables/logs/:id
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| reason | string | 否 | 原因 |
| notes | string | 否 | 备注 |
| operator | string | 否 | 操作人 |
| modificationReason | string | 否 | 修改原因 |

### 获取日志修改历史

```http
GET /api/consumables/logs/:id/history
```

### 获取归档记录列表

```http
GET /api/consumables/archives
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| keyword | string | 关键词搜索 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

### 获取归档记录详情

```http
GET /api/consumables/archives/:archiveId
```

### 根据SN查询耗材

```http
GET /api/consumables/by-sn/:sn
```

---

## 耗材分类接口

### 获取分类列表

```http
GET /api/consumable-categories
```

### 创建分类

```http
POST /api/consumable-categories
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| categoryId | string | 是 | 分类ID（唯一标识） |
| name | string | 是 | 分类名称 |
| description | string | 否 | 描述 |

### 更新分类

```http
PUT /api/consumable-categories/:id
```

### 删除分类

```http
DELETE /api/consumable-categories/:id
```

---

## 耗材记录接口

### 获取领用记录列表

```http
GET /api/consumable-records
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| consumableId | string | 按耗材筛选 |
| userId | string | 按用户筛选 |
| type | string | 按类型筛选（领用/归还/报废） |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

### 创建领用记录

```http
POST /api/consumable-records
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| consumableId | string | 是 | 耗材ID |
| quantity | number | 是 | 数量 |
| type | string | 是 | 类型（领用/归还/报废） |
| userId | string | 是 | 用户ID |
| deviceId | string | 否 | 关联设备ID |
| description | string | 否 | 说明 |

---

## 用户管理接口

### 获取用户列表

```http
GET /api/users
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| username | string | 按用户名搜索 |
| realName | string | 按姓名搜索 |
| status | string | 按状态筛选 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "total": 50,
    "page": 1,
    "pageSize": 10,
    "users": [
      {
        "userId": "user001",
        "username": "admin",
        "email": "admin@example.com",
        "phone": "13800138000",
        "realName": "管理员",
        "status": "active",
        "roles": [
          {
            "roleId": "role001",
            "roleName": "管理员",
            "roleCode": "admin"
          }
        ],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 获取所有用户（简要信息）

```http
GET /api/users/all
```

### 获取单个用户

```http
GET /api/users/:userId
```

### 创建用户

```http
POST /api/users
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |
| email | string | 否 | 邮箱 |
| phone | string | 否 | 电话 |
| realName | string | 否 | 真实姓名 |
| status | string | 否 | 状态（active/inactive/pending），默认active |
| roleIds | array | 否 | 角色ID列表 |
| remark | string | 否 | 备注 |

### 更新用户

```http
PUT /api/users/:userId
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| username | string | 否 | 用户名 |
| email | string | 否 | 邮箱 |
| phone | string | 否 | 电话 |
| realName | string | 否 | 真实姓名 |
| status | string | 否 | 状态 |
| roleIds | array | 否 | 角色ID列表 |
| remark | string | 否 | 备注 |
| newPassword | string | 否 | 新密码 |

### 删除用户

```http
DELETE /api/users/:userId
```

### 重置密码

```http
PUT /api/users/:userId/password
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| newPassword | string | 是 | 新密码 |

### 上传头像

```http
POST /api/users/:userId/avatar
```

**Content-Type**: `multipart/form-data`

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| avatar | File | 是 | 头像图片文件（JPG/PNG/GIF/WebP） |

### 删除头像

```http
DELETE /api/users/:userId/avatar
```

### 审核通过用户

```http
PUT /api/users/:userId/approve
```

### 拒绝用户注册

```http
PUT /api/users/:userId/reject
```

---

## 角色管理接口

### 获取角色列表

```http
GET /api/roles
```

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "roleId": "role001",
      "roleName": "管理员",
      "roleCode": "admin",
      "description": "系统管理员，拥有所有权限",
      "status": "active",
      "Permissions": [
        {
          "permissionId": "perm001",
          "permissionName": "设备管理"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "操作成功"
}
```

### 创建角色

```http
POST /api/roles
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| roleId | string | 是 | 角色ID（唯一标识） |
| roleName | string | 是 | 角色名称 |
| roleCode | string | 否 | 角色代码 |
| description | string | 否 | 描述 |
| permissionIds | array | 否 | 权限ID列表 |

### 更新角色

```http
PUT /api/roles/:roleId
```

### 删除角色

```http
DELETE /api/roles/:roleId
```

---

## 系统设置接口

### 获取系统设置

```http
GET /api/system-settings
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "siteName": "IDC设备管理系统",
    "siteLogo": "/uploads/logo.png",
    "siteDescription": "专业的数据中心设备管理平台",
    "copyright": "© 2024 IDC Management",
    "version": "1.0.0"
  },
  "message": "操作成功"
}
```

### 更新系统设置

```http
PUT /api/system-settings
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| siteName | string | 否 | 站点名称 |
| siteLogo | string | 否 | 站点Logo路径 |
| siteDescription | string | 否 | 站点描述 |
| copyright | string | 否 | 版权信息 |

---

## 背景配置接口

### 获取背景配置

```http
GET /api/background
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "loginBackground": "/uploads/bg/login.jpg",
    "dashboardBackground": "/uploads/bg/dashboard.jpg",
    "primaryColor": "#1890ff"
  },
  "message": "操作成功"
}
```

### 更新背景配置

```http
PUT /api/background
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| loginBackground | string | 否 | 登录页背景图 |
| dashboardBackground | string | 否 | 仪表盘背景图 |
| primaryColor | string | 否 | 主题主色 |

---

## 盘点管理接口

### 获取盘点计划列表

```http
GET /api/inventory/plans
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| status | string | 按状态筛选（draft/pending/in_progress/completed） |
| keyword | string | 关键词搜索 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

### 获取单个盘点计划

```http
GET /api/inventory/plans/:planId
```

### 创建盘点计划

```http
POST /api/inventory/plans
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| name | string | 是 | 计划名称 |
| type | string | 否 | 盘点类型（full/partial），默认full |
| description | string | 否 | 描述 |
| scheduledDate | string | 否 | 计划执行日期 |
| targetRooms | array | 否 | 目标机房ID列表 |
| targetRacks | array | 否 | 目标机柜ID列表 |

### 更新盘点计划

```http
PUT /api/inventory/plans/:planId
```

### 删除盘点计划

```http
DELETE /api/inventory/plans/:planId
```

### 启动盘点计划

```http
POST /api/inventory/plans/:planId/start
```

### 完成盘点计划

```http
POST /api/inventory/plans/:planId/complete
```

### 获取盘点任务详情

```http
GET /api/inventory/tasks/:taskId
```

### 更新盘点任务

```http
PUT /api/inventory/tasks/:taskId
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| assignedTo | string | 否 | 指派人员ID |
| status | string | 否 | 任务状态 |

### 盘点记录核查

```http
POST /api/inventory/records/:recordId/check
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| actualSerialNumber | string | 否 | 实际序列号 |
| actualRackId | string | 否 | 实际机柜ID |
| actualPosition | number | 否 | 实际位置 |
| status | string | 是 | 核查状态（normal/abnormal/not_found） |
| remark | string | 否 | 备注 |
| photoUrl | string | 否 | 照片URL |

### 获取盘点记录列表

```http
GET /api/inventory/records
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| planId | string | 按计划筛选 |
| taskId | string | 按任务筛选 |
| status | string | 按状态筛选 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

### 获取盘点统计

```http
GET /api/inventory/stats/dashboard
```

### 快速添加设备（盘点时）

```http
POST /api/inventory/quick-add-device
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| planId | string | 是 | 盘点计划ID |
| taskId | string | 否 | 盘点任务ID |
| serialNumber | string | 是 | 序列号 |
| name | string | 否 | 设备名称 |
| type | string | 否 | 设备类型 |
| roomId | string | 否 | 机房ID |
| rackId | string | 否 | 机柜ID |
| position | number | 否 | 位置 |
| model | string | 否 | 型号 |
| brand | string | 否 | 品牌 |
| height | number | 否 | 高度(U) |
| powerConsumption | number | 否 | 功耗(W) |
| ipAddress | string | 否 | IP地址 |
| purchaseDate | string | 否 | 购买日期 |
| warrantyExpiry | string | 否 | 保修到期日期 |
| description | string | 否 | 描述 |
| remark | string | 否 | 备注 |

### 获取暂存设备列表

```http
GET /api/inventory/pending-devices
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| status | string | 按状态筛选（pending/synced） |
| planId | string | 按盘点计划筛选 |
| roomId | string | 按机房筛选 |
| keyword | string | 关键词搜索 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

### 获取暂存设备统计

```http
GET /api/inventory/pending-devices/stats
```

### 获取暂存设备详情

```http
GET /api/inventory/pending-devices/:pendingId
```

### 更新暂存设备

```http
PUT /api/inventory/pending-devices/:pendingId
```

### 删除暂存设备

```http
DELETE /api/inventory/pending-devices/:pendingId
```

### 同步暂存设备到设备管理

```http
POST /api/inventory/pending-devices/:pendingId/sync
```

### 批量同步暂存设备

```http
POST /api/inventory/pending-devices/batch-sync
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| pendingIds | array | 是 | 暂存设备ID列表 |

---

## 健康检查接口

### 服务状态检查

```http
GET /health
```

**响应示例：**

```json
{
  "status": "ok",
  "message": "IDC设备管理系统后端服务正常运行"
}
```

---

## 错误码说明

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | BAD_REQUEST | 请求参数错误 |
| 401 | UNAUTHORIZED | 未授权访问，Token无效或过期 |
| 403 | FORBIDDEN | 禁止访问，权限不足 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突（如重复ID、端口占用） |
| 422 | VALIDATION_ERROR | 数据验证失败 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |
| 503 | SERVICE_UNAVAILABLE | 服务暂不可用 |

### 常见错误示例

**认证失败：**
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Token已过期，请重新登录"
}
```

**参数错误：**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "设备ID不能为空"
}
```

**资源不存在：**
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "设备不存在"
}
```

**权限不足：**
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "您没有权限执行此操作"
}
```

**资源冲突：**
```json
{
  "error": "端口已被占用",
  "conflict": true,
  "existingCable": {...}
}
```

---

## 接口汇总

| 接口路径 | 方法 | 描述 |
|----------|------|------|
| /api/auth/login | POST | 用户登录 |
| /api/auth/register | POST | 用户注册 |
| /api/auth/me | GET | 获取当前用户信息 |
| /api/rooms | GET/POST | 机房列表/创建 |
| /api/rooms/:roomId | GET/PUT/DELETE | 机房详情/更新/删除 |
| /api/racks | GET/POST | 机柜列表/创建 |
| /api/racks/:rackId | GET/PUT/DELETE | 机柜详情/更新/删除 |
| /api/racks/import-template | GET | 获取机柜导入模板 |
| /api/racks/export | GET | 导出机柜数据 |
| /api/racks/import | POST | 导入机柜数据 |
| /api/devices | GET/POST | 设备列表/创建 |
| /api/devices/:deviceId | GET/PUT/DELETE | 设备详情/更新/删除 |
| /api/devices/batch-delete | DELETE | 批量删除设备 |
| /api/devices/delete-all | DELETE | 删除所有设备 |
| /api/devices/batch-online | PUT | 批量上线设备 |
| /api/devices/batch-offline | PUT | 批量下线设备 |
| /api/devices/batch-status | PUT | 批量变更设备状态 |
| /api/devices/batch-move | PUT | 批量移动设备 |
| /api/devices/import-template | GET | 获取设备导入模板 |
| /api/devices/export | GET | 导出设备数据 |
| /api/devices/import | POST | 导入设备数据 |
| /api/devices/enhanced-export | GET | 增强导出设备数据 |
| /api/devices/:deviceId/tickets | GET | 获取设备的工单列表 |
| /api/deviceFields | GET/POST | 设备字段列表/创建 |
| /api/deviceFields/:id | PUT/DELETE | 设备字段更新/删除 |
| /api/device-ports | GET/POST | 端口列表/创建 |
| /api/device-ports/device/:deviceId | GET | 获取设备的所有端口 |
| /api/device-ports/:portId | GET/PUT/DELETE | 端口详情/更新/删除 |
| /api/device-ports/batch | POST/DELETE | 批量创建/删除端口 |
| /api/network-cards | GET/POST | 网卡列表/创建 |
| /api/network-cards/device/:deviceId | GET | 获取设备的所有网卡 |
| /api/network-cards/device/:deviceId/with-ports | GET | 获取设备的网卡及端口信息 |
| /api/network-cards/:nicId | GET/PUT/DELETE | 网卡详情/更新/删除 |
| /api/network-cards/:nicId/ports | GET | 获取网卡的端口列表 |
| /api/cables | GET/POST | 线缆列表/创建 |
| /api/cables/device/:deviceId | GET | 获取设备的所有接线 |
| /api/cables/rack/:rackId | GET | 获取机柜内所有设备的接线 |
| /api/cables/check-conflict | POST | 检查接线冲突 |
| /api/cables/:cableId | GET/PUT/DELETE | 线缆详情/更新/删除 |
| /api/cables/batch | POST/DELETE | 批量创建/删除线缆 |
| /api/tickets | GET/POST | 工单列表/创建 |
| /api/tickets/stats | GET | 工单统计 |
| /api/tickets/:ticketId | GET/PUT/DELETE | 工单详情/更新/删除 |
| /api/tickets/:ticketId/status | PUT | 更新工单状态 |
| /api/tickets/:ticketId/process | PUT | 处理工单 |
| /api/tickets/:ticketId/operations | GET/POST | 工单操作记录/添加操作记录 |
| /api/tickets/:ticketId/evaluate | POST | 评价工单 |
| /api/ticket-categories | GET/POST | 工单分类列表/创建 |
| /api/ticket-categories/:id | PUT/DELETE | 工单分类更新/删除 |
| /api/ticket-fields | GET/POST | 工单字段列表/创建 |
| /api/ticket-fields/:id | PUT/DELETE | 工单字段更新/删除 |
| /api/consumables | GET/POST | 耗材列表/创建 |
| /api/consumables/:id | GET/PUT/DELETE | 耗材详情/更新/删除 |
| /api/consumables/import | POST | 导入耗材 |
| /api/consumables/categories/list | GET | 获取耗材分类列表 |
| /api/consumables/low-stock | GET | 获取低库存耗材 |
| /api/consumables/statistics/summary | GET | 获取耗材统计汇总 |
| /api/consumables/inout/records | GET | 获取出入库记录 |
| /api/consumables/quick-inout | POST | 快速出入库 |
| /api/consumables/inout | POST | 出入库操作 |
| /api/consumables/adjust | POST | 库存调整 |
| /api/consumables/logs | GET | 获取耗材操作日志 |
| /api/consumables/logs/export | GET | 导出耗材日志 |
| /api/consumables/logs/import | POST | 导入耗材日志 |
| /api/consumables/logs/:id | PUT | 修改日志记录 |
| /api/consumables/logs/:id/history | GET | 获取日志修改历史 |
| /api/consumables/archives | GET | 获取归档记录列表 |
| /api/consumables/archives/:archiveId | GET | 获取归档记录详情 |
| /api/consumables/by-sn/:sn | GET | 根据SN查询耗材 |
| /api/consumable-categories | GET/POST | 耗材分类列表/创建 |
| /api/consumable-categories/:id | PUT/DELETE | 耗材分类更新/删除 |
| /api/consumable-records | GET/POST | 耗材记录列表/创建 |
| /api/users | GET/POST | 用户列表/创建 |
| /api/users/all | GET | 获取所有用户（简要信息） |
| /api/users/:userId | GET/PUT/DELETE | 用户详情/更新/删除 |
| /api/users/:userId/password | PUT | 重置密码 |
| /api/users/:userId/avatar | POST/DELETE | 上传/删除头像 |
| /api/users/:userId/approve | PUT | 审核通过用户 |
| /api/users/:userId/reject | PUT | 拒绝用户注册 |
| /api/roles | GET/POST | 角色列表/创建 |
| /api/roles/:roleId | PUT/DELETE | 角色更新/删除 |
| /api/system-settings | GET/PUT | 系统设置获取/更新 |
| /api/background | GET/PUT | 背景配置获取/更新 |
| /api/inventory/plans | GET/POST | 盘点计划列表/创建 |
| /api/inventory/plans/:planId | GET/PUT/DELETE | 盘点计划详情/更新/删除 |
| /api/inventory/plans/:planId/start | POST | 启动盘点计划 |
| /api/inventory/plans/:planId/complete | POST | 完成盘点计划 |
| /api/inventory/tasks/:taskId | GET/PUT | 盘点任务详情/更新 |
| /api/inventory/records | GET | 盘点记录列表 |
| /api/inventory/records/:recordId/check | POST | 盘点记录核查 |
| /api/inventory/stats/dashboard | GET | 盘点统计 |
| /api/inventory/quick-add-device | POST | 快速添加设备 |
| /api/inventory/pending-devices | GET | 暂存设备列表 |
| /api/inventory/pending-devices/stats | GET | 暂存设备统计 |
| /api/inventory/pending-devices/:pendingId | GET/PUT/DELETE | 暂存设备详情/更新/删除 |
| /api/inventory/pending-devices/:pendingId/sync | POST | 同步暂存设备 |
| /api/inventory/pending-devices/batch-sync | POST | 批量同步暂存设备 |

---

## 空闲设备接口

### 获取空闲设备列表

```http
GET /api/idle-devices
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| keyword | string | 关键词搜索 |
| roomId | string | 按机房筛选 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

### 添加空闲设备

```http
POST /api/idle-devices
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

### 激活空闲设备

```http
PUT /api/idle-devices/:deviceId/activate
```

### 删除空闲设备

```http
DELETE /api/idle-devices/:deviceId
```

---

## 操作日志接口

### 获取操作日志列表

```http
GET /api/operation-logs
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| module | string | 按模块筛选 |
| operationType | string | 按操作类型筛选 |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |
| operator | string | 按操作人筛选 |
| keyword | string | 关键词搜索 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

### 获取模块列表

```http
GET /api/operation-logs/modules
```

### 获取操作类型列表

```http
GET /api/operation-logs/types
```

### 获取操作日志统计

```http
GET /api/operation-logs/statistics
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

### 获取操作日志详情

```http
GET /api/operation-logs/:recordId
```

---

## 备份管理接口

### 创建备份

```http
POST /api/backup
```

### 获取备份列表

```http
GET /api/backup/list
```

### 验证备份文件

```http
GET /api/backup/validate/:filename
```

### 获取恢复进度（SSE）

```http
GET /api/backup/restore-progress/:filename
```

**说明：** 返回 Server-Sent Events 流，实时推送恢复进度

### 恢复备份

```http
POST /api/backup/restore
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| filename | string | 是 | 备份文件名 |

### 上传备份文件

```http
POST /api/backup/upload
```

**Content-Type**: `multipart/form-data`

### 下载备份文件

```http
GET /api/backup/download/:filename
```

### 删除备份文件

```http
DELETE /api/backup/:filename
```

### 获取备份信息

```http
GET /api/backup/info
```

### 清理旧备份

```http
POST /api/backup/clean
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| keepCount | number | 否 | 保留的备份数量 |

### 获取自动备份状态

```http
GET /api/backup/auto/status
```

### 更新自动备份设置

```http
POST /api/backup/auto/settings
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| enabled | boolean | 是 | 是否启用 |
| cronExpression | string | 否 | Cron 表达式 |
| keepCount | number | 否 | 保留数量 |

### 立即执行自动备份

```http
POST /api/backup/auto/execute
```

### 测试 Cron 表达式

```http
POST /api/backup/auto/test-cron
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| cronExpression | string | 是 | Cron 表达式 |

### 获取远端备份目标列表

```http
GET /api/backup/remote/targets
```

### 获取单个远端备份目标

```http
GET /api/backup/remote/targets/:id
```

### 添加远端备份目标

```http
POST /api/backup/remote/targets
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| name | string | 是 | 目标名称 |
| protocol | string | 是 | 协议（ftp/sftp/webdav/smb） |
| host | string | 是 | 主机地址 |
| port | number | 否 | 端口号 |
| username | string | 否 | 用户名 |
| password | string | 否 | 密码 |
| remotePath | string | 否 | 远程目录 |

### 更新远端备份目标

```http
PUT /api/backup/remote/targets/:id
```

### 删除远端备份目标

```http
DELETE /api/backup/remote/targets/:id
```

### 测试远端连接

```http
POST /api/backup/remote/test
```

### 测试指定远端连接

```http
POST /api/backup/remote/targets/:id/test
```

### 获取远端备份设置

```http
GET /api/backup/remote/settings
```

### 更新远端备份设置

```http
PUT /api/backup/remote/settings
```

### 获取支持的协议列表

```http
GET /api/backup/remote/protocols
```

### 手动上传备份到远端

```http
POST /api/backup/remote/upload
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| filename | string | 是 | 备份文件名 |
| targetId | string | 是 | 远端目标ID |

### 获取备份日志列表

```http
GET /api/backup/logs
```

### 获取备份日志详情

```http
GET /api/backup/logs/:id
```

### 清理旧备份日志

```http
DELETE /api/backup/logs/clean
```

---

## 仓库管理接口

### 获取仓库列表

```http
GET /api/warehouses
```

### 创建仓库

```http
POST /api/warehouses
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| name | string | 是 | 仓库名称 |
| location | string | 否 | 仓库位置 |
| description | string | 否 | 描述 |
| manager | string | 否 | 负责人 |
| contact | string | 否 | 联系方式 |

### 获取单个仓库

```http
GET /api/warehouses/:warehouseId
```

### 更新仓库

```http
PUT /api/warehouses/:warehouseId
```

### 删除仓库

```http
DELETE /api/warehouses/:warehouseId
```

---

## 拓扑管理接口

### 获取交换机拓扑

```http
GET /api/topology/switch/:switchId
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "switch": {
      "deviceId": "dev001",
      "name": "核心交换机",
      "type": "switch"
    },
    "connections": [
      {
        "deviceId": "dev002",
        "name": "服务器01",
        "type": "server",
        "port": "eth0",
        "cableId": "cable001"
      }
    ]
  }
}
```

### 获取设备拓扑

```http
GET /api/topology/device/:deviceId
```

---

## 健康检查接口

| 端点 | 方法 | 说明 |
|------|------|------|
| /health | GET | 服务健康检查 |

---

**文档版本：** 2.0.0  
**最后更新：** 2026年5月
