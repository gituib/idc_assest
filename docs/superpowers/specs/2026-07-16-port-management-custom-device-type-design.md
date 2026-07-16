# 端口管理支持自定义设备类型设计文档

## 背景与目标

### 问题现状
端口管理模块当前只识别「交换机、路由器、防火墙、存储设备、负载均衡」5 种固定网络设备类型和服务器，设备字段本身支持自定义类型（如无线控制器、上网行为管理等），但自定义类型设备无法进入端口管理：

1. `getDeviceType` 三分法把自定义类型归为 `other`
2. 过滤逻辑 `if (type !== 'switch' && type !== 'server') return false;` 直接踢掉 `other`
3. Tab 配置硬编码为「交换机/路由器/防火墙/存储设备」4 项，没有给自定义类型留位置

### 目标
保留现有 4 个子类型 Tab 不变，新增「其他」Tab，让自定义类型设备能在端口管理中创建端口（无需关联网卡，走网络设备分支）。

### 非目标
- 不改动 `getDeviceType` 三分法函数本身（已能满足需求）
- 不改动引导入口结构（仍是「网络设备端口 / 服务器端口」两个入口）
- 不改动后端（端口模型不区分设备类型）
- 不改动导入模板逻辑（「其他」类型沿用网络设备导入路径）

## 决策汇总

| 维度 | 方案 |
|------|------|
| 准入范围 | 排除服务器外都算网络设备（含自定义类型），`other` 不再被过滤掉 |
| Tab 结构 | 引导为 switch 时：交换机/路由器/防火墙/存储设备/**其他**（新增）；无引导时：网络设备/服务器（「其他」并入网络设备大类）；引导为 server 时：仅服务器（不变） |
| 网卡关联 | 「其他」类型设备无需网卡，走网络设备分支 |
| 类型识别 | `getDeviceType` 三分法保留：`server` / `switch`（明确匹配）/ `other`（自定义类型） |

## 改动点

集中在前端 [PortManagement.jsx](file:///e:/IDC/idc_assest/frontend/src/pages/PortManagement.jsx)，共 6 处：

### 1. 过滤逻辑放开（2 处）
- L1707-L1709（`paginatedDevices` useMemo 内）
- L3612-L3614（设备选择弹窗内的 `allDevices` 计算）

将：
```js
if (type !== 'switch' && type !== 'server') return false;
```
改为：
```js
if (type === 'unknown') return false;
```

让 `other` 类型设备进入列表。

### 2. Tab 配置新增「其他」（L3621-L3643）
引导为 switch 时，4 个子 Tab 后追加：
```js
{ key: 'other', label: '其他' }
```
无引导模式和 server 引导模式不变。

### 3. 子类型过滤逻辑（L1713-L1724）
- 新增 `deviceFilterType === 'other'` 分支：展示 `getDeviceType(d) === 'other'` 的设备。
- 无引导模式下 `deviceFilterType === 'switch'`（网络设备大类）改为同时包含 `other`：`if (type !== 'switch' && type !== 'other') return false;`，但需用 `guidedDeviceType === null` 区分，避免影响引导模式下「交换机」子 Tab 的语义。

### 4. 网卡关联判断（L1670-L1671）
将：
```js
const isSwitchDevice = device => getDeviceType(device) === 'switch';
```
改为：
```js
const isSwitchDevice = device => {
  const t = getDeviceType(device);
  return t === 'switch' || t === 'other';
};
```
让「其他」类型设备走无需网卡的分支。

### 5. Tab 计数与配色（L3646-L3662）
- `getTabCount` 新增 `key === 'other'` 分支：统计 `getDeviceType(d) === 'other'` 的数量。
- `tabColors` 新增 `other` 配色（灰色系渐变，与现有 5 个 Tab 区分）：
```js
other: { active: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', shadow: 'rgba(100, 116, 139, 0.3)' },
```

### 6. 类型显示文案（L1675-L1683）
`getTypeDisplayName` 对自定义类型直接返回 `device.type` 原值（如"无线控制器"），不再 fallback 成"设备"。

## 附带微调

[PortAddGuideModal.jsx](file:///e:/IDC/idc_assest/frontend/src/components/PortAddGuideModal.jsx)：
- 「网络设备端口」卡片描述和说明文字补充"以及其他自定义网络设备类型"，让用户知道自定义类型也走这个入口。

## 验证方式

1. 在设备字段管理中新增一个自定义类型（如"无线控制器"），创建一台该类型设备。
2. 打开端口管理 → 点击「添加端口」→ 选择「网络设备端口」入口。
3. 验证设备选择弹窗中出现「其他」Tab，且其中能看到自定义类型设备。
4. 选中自定义类型设备，创建端口，验证表单中无网卡字段，端口创建成功。
5. 验证无引导模式下「网络设备」大类 Tab 也能看到自定义类型设备。
6. 验证原有交换机/路由器/防火墙/存储/服务器流程不受影响。

## 风险与影响

- **影响范围**：仅前端端口管理页面，无数据库变更，无后端变更。
- **风险**：极低。改动集中在过滤逻辑和 Tab 配置，逻辑清晰。
- **兼容性**：现有端口数据和流程完全不受影响。
