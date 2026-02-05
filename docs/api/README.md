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
  "success": true,
  "data": [
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
  ],
  "message": "操作成功"
}
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
| keyword | string | 按名称搜索 |

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "rackId": "rack001",
      "name": "机柜A1",
      "height": 42,
      "powerRating": 5000,
      "RoomId": "room001",
      "Room": {
        "roomId": "room001",
        "name": "A区机房"
      },
      "Devices": [],
      "deviceCount": 5,
      "usedHeight": 10,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "操作成功"
}
```

### 创建机柜

```http
POST /api/racks
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| rackId | string | 是 | 机柜ID（唯一标识） |
| name | string | 是 | 机柜名称 |
| height | number | 否 | 高度(U)，默认42 |
| powerRating | number | 否 | 额定功率(W) |
| RoomId | string | 是 | 所属机房ID |
| description | string | 否 | 描述 |

**请求示例：**

```json
{
  "rackId": "rack002",
  "name": "机柜A2",
  "height": 42,
  "powerRating": 5000,
  "RoomId": "room001",
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

### 获取机柜详情

```http
GET /api/racks/:rackId
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "rackId": "rack001",
    "name": "机柜A1",
    "height": 42,
    "powerRating": 5000,
    "RoomId": "room001",
    "Room": {...},
    "Devices": [
      {
        "deviceId": "dev001",
        "name": "Web服务器01",
        "rackPosition": 1,
        "height": 2
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "操作成功"
}
```

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
| deviceType | string | 按设备类型筛选 |
| status | string | 按状态筛选 |
| keyword | string | 按名称/IP搜索 |
| page | number | 页码，默认1 |
| pageSize | number | 每页数量，默认10 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "devices": [
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
        "RackId": "rack001",
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
  },
  "message": "操作成功"
}
```

### 创建设备

```http
POST /api/devices
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID（唯一标识） |
| name | string | 是 | 设备名称 |
| deviceType | string | 是 | 设备类型（服务器/网络设备/存储设备/其他） |
| manufacturer | string | 否 | 厂商 |
| model | string | 否 | 型号 |
| RackId | string | 否 | 所属机柜ID |
| rackPosition | number | 否 | 机柜位置（从1开始） |
| height | number | 否 | 占用高度(U) |
| ipAddress | string | 否 | IP地址 |
| macAddress | string | 否 | MAC地址 |
| status | string | 否 | 状态（运行中/已关机/维护中/故障） |
| purchaseDate | string | 否 | 购买日期（YYYY-MM-DD） |
| warrantyDate | string | 否 | 保修日期（YYYY-MM-DD） |
| description | string | 否 | 描述 |
| customFields | object | 否 | 自定义字段值 |

**请求示例：**

```json
{
  "deviceId": "dev002",
  "name": "数据库服务器",
  "deviceType": "服务器",
  "manufacturer": "HP",
  "model": "DL380",
  "RackId": "rack001",
  "rackPosition": 3,
  "height": 2,
  "ipAddress": "192.168.1.101",
  "status": "运行中",
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

### 批量导入设备

```http
POST /api/devices/batch-import
```

**Content-Type**: `multipart/form-data`

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| file | File | 是 | Excel或CSV格式的设备数据文件 |

**文件格式要求：**
- 支持 .xlsx, .xls, .csv 格式
- 第一行为表头
- 必需字段：deviceId, name, deviceType

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
      "fieldType": "text",
      "isRequired": false,
      "defaultValue": "",
      "options": null,
      "sortOrder": 1,
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
| fieldType | string | 是 | 字段类型（text/number/date/select） |
| isRequired | boolean | 否 | 是否必填，默认false |
| defaultValue | string | 否 | 默认值 |
| options | string | 否 | 选项（逗号分隔，select类型使用） |
| sortOrder | number | 否 | 排序顺序 |

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

### 创建端口

```http
POST /api/device-ports
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| deviceId | string | 是 | 所属设备ID |
| portName | string | 是 | 端口名称 |
| portType | string | 是 | 端口类型（RJ45/SFP/SFP+/QSFP等） |
| speed | string | 否 | 速率（10M/100M/1G/10G/25G/40G/100G） |
| status | string | 否 | 状态（active/inactive） |
| description | string | 否 | 描述 |

### 更新端口

```http
PUT /api/device-ports/:id
```

### 删除端口

```http
DELETE /api/device-ports/:id
```

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

### 创建网卡

```http
POST /api/network-cards
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| deviceId | string | 是 | 所属设备ID |
| name | string | 是 | 网卡名称 |
| macAddress | string | 否 | MAC地址 |
| ipAddress | string | 否 | IP地址 |
| portIds | array | 否 | 绑定的端口ID列表 |
| description | string | 否 | 描述 |

### 更新网卡

```http
PUT /api/network-cards/:id
```

### 删除网卡

```http
DELETE /api/network-cards/:id
```

---

## 线缆接口

### 获取线缆列表

```http
GET /api/cables
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| fromRackId | string | 按源机柜筛选 |
| toRackId | string | 按目标机柜筛选 |
| status | string | 按状态筛选 |

### 创建线缆

```http
POST /api/cables
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| cableId | string | 是 | 线缆ID（唯一标识） |
| name | string | 是 | 线缆名称 |
| cableType | string | 是 | 线缆类型（光纤/网线/电源线等） |
| fromRackId | string | 是 | 源机柜ID |
| toRackId | string | 是 | 目标机柜ID |
| fromPortId | string | 否 | 源端口ID |
| toPortId | string | 否 | 目标端口ID |
| length | number | 否 | 长度(米) |
| status | string | 否 | 状态（active/inactive） |
| description | string | 否 | 描述 |

### 更新线缆

```http
PUT /api/cables/:id
```

### 删除线缆

```http
DELETE /api/cables/:id
```

---

## 工单管理接口

### 获取工单列表

```http
GET /api/tickets
```

**查询参数：**

| 参数名 | 类型 | 描述 |
|--------|------|------|
| status | string | 按状态筛选（待处理/处理中/已完成/已关闭） |
| priority | string | 按优先级筛选（高/中/低） |
| categoryId | string | 按分类筛选 |
| assigneeId | string | 按负责人筛选 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "ticketId": "ticket001",
        "title": "服务器故障",
        "description": "Web服务器无法访问",
        "status": "处理中",
        "priority": "高",
        "categoryId": "cat001",
        "Category": {
          "categoryId": "cat001",
          "name": "硬件故障"
        },
        "assigneeId": "user001",
        "Assignee": {
          "userId": "user001",
          "username": "admin"
        },
        "requesterId": "user002",
        "Requester": {
          "userId": "user002",
          "username": "operator"
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 10
  },
  "message": "操作成功"
}
```

### 创建工单

```http
POST /api/tickets
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| title | string | 是 | 工单标题 |
| description | string | 是 | 工单描述 |
| categoryId | string | 是 | 工单分类ID |
| priority | string | 是 | 优先级（高/中/低） |
| assigneeId | string | 否 | 指派用户ID |
| deviceId | string | 否 | 关联设备ID |
| customFields | object | 否 | 自定义字段值 |

### 更新工单

```http
PUT /api/tickets/:ticketId
```

### 删除工单

```http
DELETE /api/tickets/:ticketId
```

### 获取工单操作记录

```http
GET /api/tickets/:ticketId/operations
```

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
| categoryId | string | 按分类筛选 |
| keyword | string | 按名称搜索 |
| lowStock | boolean | 仅显示库存不足 |

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "consumableId": "cons001",
      "name": "硬盘",
      "categoryId": "cat001",
      "Category": {
        "categoryId": "cat001",
        "name": "存储设备"
      },
      "specification": "1TB SSD",
      "unit": "个",
      "stock": 100,
      "minStock": 10,
      "unitPrice": 500,
      "description": "固态硬盘",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "操作成功"
}
```

### 创建耗材

```http
POST /api/consumables
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| consumableId | string | 是 | 耗材ID（唯一标识） |
| name | string | 是 | 耗材名称 |
| categoryId | string | 是 | 分类ID |
| specification | string | 否 | 规格 |
| unit | string | 否 | 单位 |
| stock | number | 否 | 库存数量，默认0 |
| minStock | number | 否 | 最低库存预警值 |
| unitPrice | number | 否 | 单价 |
| description | string | 否 | 描述 |

### 更新耗材

```http
PUT /api/consumables/:consumableId
```

### 删除耗材

```http
DELETE /api/consumables/:consumableId
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
| keyword | string | 按用户名/邮箱搜索 |
| status | string | 按状态筛选 |

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
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
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "操作成功"
}
```

### 创建用户

```http
POST /api/users
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| userId | string | 是 | 用户ID（唯一标识） |
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |
| email | string | 否 | 邮箱 |
| phone | string | 否 | 电话 |
| roleIds | array | 否 | 角色ID列表 |

### 更新用户

```http
PUT /api/users/:userId
```

### 删除用户

```http
DELETE /api/users/:userId
```

### 修改密码

```http
PUT /api/users/:userId/password
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| oldPassword | string | 是 | 旧密码 |
| newPassword | string | 是 | 新密码 |

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
      "description": "系统管理员，拥有所有权限",
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

## 健康检查接口

### 服务状态检查

```http
GET /health
```

**响应示例：**

```json
{
  "status": "ok",
  "message": "IDC设备管理系统后端服务正常运行",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

### 数据库连接检查

```http
GET /api/health/db
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "status": "connected",
    "type": "mysql",
    "responseTime": "5ms"
  },
  "message": "数据库连接正常"
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
| 409 | CONFLICT | 资源冲突（如重复ID） |
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

---

## 接口汇总

| 接口路径 | 方法 | 描述 |
|----------|------|------|
| /api/auth/login | POST | 用户登录 |
| /api/auth/register | POST | 用户注册 |
| /api/auth/me | GET | 获取当前用户信息 |
| /api/rooms | GET/POST | 机房列表/创建 |
| /api/rooms/:id | PUT/DELETE | 机房更新/删除 |
| /api/racks | GET/POST | 机柜列表/创建 |
| /api/racks/:id | GET/PUT/DELETE | 机柜详情/更新/删除 |
| /api/devices | GET/POST | 设备列表/创建 |
| /api/devices/:id | PUT/DELETE | 设备更新/删除 |
| /api/devices/batch-import | POST | 批量导入设备 |
| /api/deviceFields | GET/POST | 设备字段列表/创建 |
| /api/deviceFields/:id | PUT/DELETE | 设备字段更新/删除 |
| /api/device-ports | GET/POST | 端口列表/创建 |
| /api/device-ports/:id | PUT/DELETE | 端口更新/删除 |
| /api/network-cards | GET/POST | 网卡列表/创建 |
| /api/network-cards/:id | PUT/DELETE | 网卡更新/删除 |
| /api/cables | GET/POST | 线缆列表/创建 |
| /api/cables/:id | PUT/DELETE | 线缆更新/删除 |
| /api/tickets | GET/POST | 工单列表/创建 |
| /api/tickets/:id | PUT/DELETE | 工单更新/删除 |
| /api/tickets/:id/operations | GET | 工单操作记录 |
| /api/ticket-categories | GET/POST | 工单分类列表/创建 |
| /api/ticket-categories/:id | PUT/DELETE | 工单分类更新/删除 |
| /api/ticket-fields | GET/POST | 工单字段列表/创建 |
| /api/ticket-fields/:id | PUT/DELETE | 工单字段更新/删除 |
| /api/consumables | GET/POST | 耗材列表/创建 |
| /api/consumables/:id | PUT/DELETE | 耗材更新/删除 |
| /api/consumable-categories | GET/POST | 耗材分类列表/创建 |
| /api/consumable-categories/:id | PUT/DELETE | 耗材分类更新/删除 |
| /api/consumable-records | GET/POST | 耗材记录列表/创建 |
| /api/users | GET/POST | 用户列表/创建 |
| /api/users/:id | PUT/DELETE | 用户更新/删除 |
| /api/users/:id/password | PUT | 修改密码 |
| /api/roles | GET/POST | 角色列表/创建 |
| /api/roles/:id | PUT/DELETE | 角色更新/删除 |
| /api/system-settings | GET/PUT | 系统设置获取/更新 |
| /api/background | GET/PUT | 背景配置获取/更新 |
| /health | GET | 服务健康检查 |
| /api/health/db | GET | 数据库健康检查 |

---

**文档版本：** 1.2.0  
**最后更新：** 2026-02-05
