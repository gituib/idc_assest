# 端口管理支持自定义设备类型 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让端口管理页面支持自定义设备类型（如无线控制器、上网行为管理等）创建端口，保留现有 4 个子类型 Tab 不变，新增「其他」Tab 承载自定义类型设备。

**Architecture:** 纯前端改动，集中在 [PortManagement.jsx](file:///e:/IDC/idc_assest/frontend/src/pages/PortManagement.jsx)。通过放开准入过滤让 `other` 类型设备进入列表，新增「其他」Tab 展示这些设备，调整网卡关联判断让自定义类型走无需网卡的分支。无后端、无数据库变更。

**Tech Stack:** React + Ant Design + Vite。项目前端无测试脚本（vitest 在 devDeps 但未配置 script），验证方式为 `npm run lint` + 手动浏览器验证。

**Spec:** [docs/superpowers/specs/2026-07-16-port-management-custom-device-type-design.md](file:///e:/IDC/idc_assest/docs/superpowers/specs/2026-07-16-port-management-custom-device-type-design.md)

**关键上下文（供执行者参考）：**
- `getDeviceType(device)` 三分法返回 `'server'` / `'switch'` / `'other'` / `'unknown'`，位于 PortManagement.jsx:1653-1668，本计划不修改此函数。
- `guidedDeviceType` 状态：`null`（无引导）/ `'switch'`（网络设备端口入口）/ `'server'`（服务器端口入口），决定设备选择弹窗的 Tab 配置。
- `deviceFilterType` 状态：当前选中的 Tab key，默认 `'all'`。
- 端口创建表单中，`isSwitchDevice(device)` 为 true 时不展示网卡字段（走网络设备分支）；`isServerDevice(device)` 为 true 时展示网卡字段（走服务器分支）。

---

## 文件结构

| 文件 | 责任 | 改动类型 |
|------|------|----------|
| `frontend/src/pages/PortManagement.jsx` | 端口管理主页面，包含设备列表过滤、Tab 配置、端口创建表单 | 修改 6 处 |
| `frontend/src/components/PortAddGuideModal.jsx` | 端口类型引导弹窗 | 修改文案 |

---

## Task 1: 放开准入过滤，让 `other` 类型设备进入列表

**Files:**
- Modify: `frontend/src/pages/PortManagement.jsx:1707-1709`（`paginatedDevices` useMemo 内的准入过滤）
- Modify: `frontend/src/pages/PortManagement.jsx:3612-3614`（设备选择弹窗内 `allDevices` 的准入过滤）

**目标：** 自定义类型设备（`getDeviceType` 返回 `'other'`）不再被直接踢出端口管理的设备列表，只有真正无类型的设备（`'unknown'`）才被排除。

- [ ] **Step 1: 修改 `paginatedDevices` useMemo 内的准入过滤**

定位到 PortManagement.jsx 第 1707-1709 行，当前代码：

```js
    const filtered = devices.filter(d => {
      const type = getDeviceType(d);
      if (type !== 'switch' && type !== 'server') return false;
```

改为：

```js
    const filtered = devices.filter(d => {
      const type = getDeviceType(d);
      // 仅排除无类型设备，允许自定义类型（other）进入端口管理
      if (type === 'unknown') return false;
```

- [ ] **Step 2: 修改设备选择弹窗内 `allDevices` 的准入过滤**

定位到 PortManagement.jsx 第 3612-3614 行，当前代码：

```js
          const allDevices = devices.filter(d => {
            const type = getDeviceType(d);
            if (type !== 'switch' && type !== 'server') return false;
```

改为：

```js
          const allDevices = devices.filter(d => {
            const type = getDeviceType(d);
            // 仅排除无类型设备，允许自定义类型（other）进入端口管理
            if (type === 'unknown') return false;
```

- [ ] **Step 3: 运行 lint 验证**

Run: `cd frontend && npm run lint`
Expected: 无新增错误（已有 warnings 若导致非零退出，需确认非本次改动引入）

- [ ] **Step 4: 手动验证（可选，可与后续任务合并验证）**

启动前端 `cd frontend && npm run dev`，打开端口管理页面，确认页面不报错（此时 Tab 还未新增「其他」，自定义设备会暂时归入「网络设备」大类或不可见，属正常现象，后续任务会修复 Tab 展示）。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/pages/PortManagement.jsx
git commit -m "feat(PortManagement): 放开准入过滤允许自定义设备类型进入端口管理"
```

---

## Task 2: 调整网卡关联判断与类型标签，让自定义类型走网络设备分支

**Files:**
- Modify: `frontend/src/pages/PortManagement.jsx:1670`（`isSwitchDevice` 函数）
- Modify: `frontend/src/pages/PortManagement.jsx:1683`（`getDeviceTypeLabel` fallback 返回值）

**目标：** 自定义类型设备创建端口时不要求关联网卡（与交换机等一致），且在 UI 上显示设备原始类型名（如"无线控制器"）而非兜底的"设备"。

- [ ] **Step 1: 修改 `isSwitchDevice` 函数**

定位到 PortManagement.jsx 第 1670 行，当前代码：

```js
  const isSwitchDevice = device => getDeviceType(device) === 'switch';
```

改为：

```js
  // 自定义类型（other）与网络设备一致，均无需关联网卡
  const isSwitchDevice = device => {
    const t = getDeviceType(device);
    return t === 'switch' || t === 'other';
  };
```

- [ ] **Step 2: 修改 `getDeviceTypeLabel` 的 fallback**

定位到 PortManagement.jsx 第 1674-1684 行，当前代码：

```js
  const getDeviceTypeLabel = device => {
    if (!device?.type) return '设备';
    const type = device.type.toLowerCase();
    if (type.includes('server')) return '服务器';
    if (type.includes('switch')) return '交换机';
    if (type.includes('router')) return '路由器';
    if (type.includes('firewall')) return '防火墙';
    if (type.includes('storage')) return '存储设备';
    if (type.includes('loadbalancer')) return '负载均衡';
    return '设备';
  };
```

改为（仅修改最后一行 fallback，返回设备原始 type 值）：

```js
  const getDeviceTypeLabel = device => {
    if (!device?.type) return '设备';
    const type = device.type.toLowerCase();
    if (type.includes('server')) return '服务器';
    if (type.includes('switch')) return '交换机';
    if (type.includes('router')) return '路由器';
    if (type.includes('firewall')) return '防火墙';
    if (type.includes('storage')) return '存储设备';
    if (type.includes('loadbalancer')) return '负载均衡';
    // 自定义类型直接展示原始值（如"无线控制器"）
    return device.type;
  };
```

- [ ] **Step 3: 运行 lint 验证**

Run: `cd frontend && npm run lint`
Expected: 无新增错误

- [ ] **Step 4: 提交**

```bash
git add frontend/src/pages/PortManagement.jsx
git commit -m "feat(PortManagement): 自定义类型设备走无需网卡分支并展示原始类型名"
```

---

## Task 3: Tab 配置新增「其他」+ 配色 + 计数

**Files:**
- Modify: `frontend/src/pages/PortManagement.jsx:3621-3643`（`tabConfigs` 数组）
- Modify: `frontend/src/pages/PortManagement.jsx:3646-3653`（`getTabCount` 函数）
- Modify: `frontend/src/pages/PortManagement.jsx:3656-3662`（`tabColors` 对象）

**目标：** 引导为 `switch` 时，设备选择弹窗在「交换机/路由器/防火墙/存储设备」4 个子 Tab 后追加「其他」Tab，并为其配置灰色系配色和独立计数。

- [ ] **Step 1: 在 `tabConfigs` 的 switch 引导分支追加「其他」**

定位到 PortManagement.jsx 第 3621-3643 行，当前代码：

```js
          const tabConfigs = (() => {
            if (guidedDeviceType === 'switch') {
              // 网络设备端口 → 显示网络设备子类型
              return [
                { key: 'switch', label: '交换机' },
                { key: 'router', label: '路由器' },
                { key: 'firewall', label: '防火墙' },
                { key: 'storage', label: '存储设备' },
              ];
            }
            if (guidedDeviceType === 'server') {
              // 服务器端口 → 只显示服务器
              return [
                { key: 'server', label: '服务器' },
              ];
            }
            // 无引导 → 显示大类
            return [
              { key: 'switch', label: '网络设备' },
              { key: 'server', label: '服务器' },
            ];
          })();
```

改为（仅在 switch 引导分支末尾追加 other，其他分支不变）：

```js
          const tabConfigs = (() => {
            if (guidedDeviceType === 'switch') {
              // 网络设备端口 → 显示网络设备子类型 + 其他（自定义类型）
              return [
                { key: 'switch', label: '交换机' },
                { key: 'router', label: '路由器' },
                { key: 'firewall', label: '防火墙' },
                { key: 'storage', label: '存储设备' },
                { key: 'other', label: '其他' },
              ];
            }
            if (guidedDeviceType === 'server') {
              // 服务器端口 → 只显示服务器
              return [
                { key: 'server', label: '服务器' },
              ];
            }
            // 无引导 → 显示大类（自定义类型并入网络设备大类）
            return [
              { key: 'switch', label: '网络设备' },
              { key: 'server', label: '服务器' },
            ];
          })();
```

- [ ] **Step 2: 修改 `getTabCount` 函数新增 `other` 分支**

定位到 PortManagement.jsx 第 3646-3653 行，当前代码：

```js
          const getTabCount = key => {
            if (key === 'server') return allDevices.filter(d => getDeviceType(d) === 'server').length;
            // 子类型按原始 type 匹配
            return allDevices.filter(d => {
              const rawType = (d.type || '').toLowerCase();
              return rawType.includes(key);
            }).length;
          };
```

改为（新增 `other` 分支，按 `getDeviceType` 返回值匹配）：

```js
          const getTabCount = key => {
            if (key === 'server') return allDevices.filter(d => getDeviceType(d) === 'server').length;
            if (key === 'other') return allDevices.filter(d => getDeviceType(d) === 'other').length;
            // 子类型按原始 type 匹配
            return allDevices.filter(d => {
              const rawType = (d.type || '').toLowerCase();
              return rawType.includes(key);
            }).length;
          };
```

- [ ] **Step 3: 在 `tabColors` 新增 `other` 配色**

定位到 PortManagement.jsx 第 3656-3662 行，当前代码：

```js
          const tabColors = {
            switch: { active: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', shadow: 'rgba(17, 153, 142, 0.3)' },
            server: { active: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: 'rgba(102, 126, 234, 0.3)' },
            router: { active: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', shadow: 'rgba(245, 158, 11, 0.3)' },
            firewall: { active: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', shadow: 'rgba(239, 68, 68, 0.3)' },
            storage: { active: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', shadow: 'rgba(139, 92, 246, 0.3)' },
          };
```

改为（末尾追加 `other` 灰色系配色）：

```js
          const tabColors = {
            switch: { active: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', shadow: 'rgba(17, 153, 142, 0.3)' },
            server: { active: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: 'rgba(102, 126, 234, 0.3)' },
            router: { active: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', shadow: 'rgba(245, 158, 11, 0.3)' },
            firewall: { active: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', shadow: 'rgba(239, 68, 68, 0.3)' },
            storage: { active: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', shadow: 'rgba(139, 92, 246, 0.3)' },
            other: { active: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', shadow: 'rgba(100, 116, 139, 0.3)' },
          };
```

- [ ] **Step 4: 运行 lint 验证**

Run: `cd frontend && npm run lint`
Expected: 无新增错误

- [ ] **Step 5: 手动验证**

启动前端，打开端口管理 → 点击「添加端口」→ 选择「网络设备端口」入口，确认设备选择弹窗出现 5 个 Tab：交换机 / 路由器 / 防火墙 / 存储设备 / **其他**，且「其他」Tab 显示灰色渐变。若已有自定义类型设备，确认「其他」Tab 计数正确。

- [ ] **Step 6: 提交**

```bash
git add frontend/src/pages/PortManagement.jsx
git commit -m "feat(PortManagement): 网络设备引导下新增「其他」Tab 展示自定义类型设备"
```

---

## Task 4: 子类型过滤逻辑支持 `other` 及无引导大类包含 `other`

**Files:**
- Modify: `frontend/src/pages/PortManagement.jsx:1713-1724`（`paginatedDevices` useMemo 内的 `deviceFilterType` 子类型过滤分支）

**目标：** 点击「其他」Tab 时正确过滤展示自定义类型设备；无引导模式下点击「网络设备」大类 Tab 时同时包含 `switch` 和 `other` 类型设备；引导模式下「交换机」子 Tab 仍只展示交换机。

**关键逻辑区分：**
- `guidedDeviceType === 'switch'` 时，`deviceFilterType === 'switch'` 表示「交换机」子 Tab，只匹配 `getDeviceType(d) === 'switch'` 且原始 type 含 `switch` 的设备。
- `guidedDeviceType === null` 时，`deviceFilterType === 'switch'` 表示「网络设备」大类 Tab，应包含所有 `switch` 和 `other` 类型设备。

- [ ] **Step 1: 修改 `paginatedDevices` 的子类型过滤分支**

定位到 PortManagement.jsx 第 1713-1724 行，当前代码：

```js
      // 子类型过滤：根据设备原始类型精确匹配
      if (deviceFilterType !== 'all') {
        if (deviceFilterType === 'server') {
          if (type !== 'server') return false;
        } else if (deviceFilterType === 'switch') {
          // 'switch' Tab 在非引导模式下展示所有网络设备
          if (type !== 'switch') return false;
        } else {
          // 子类型过滤：router/firewall/storage 等，检查原始 type 字段
          const rawType = (d.type || '').toLowerCase();
          if (!rawType.includes(deviceFilterType)) return false;
        }
      }
```

改为：

```js
      // 子类型过滤：根据设备原始类型精确匹配
      if (deviceFilterType !== 'all') {
        if (deviceFilterType === 'server') {
          if (type !== 'server') return false;
        } else if (deviceFilterType === 'other') {
          // 「其他」Tab：展示自定义类型设备
          if (type !== 'other') return false;
        } else if (deviceFilterType === 'switch') {
          if (guidedDeviceType === null) {
            // 无引导模式下「网络设备」大类 Tab：包含所有网络设备及自定义类型
            if (type !== 'switch' && type !== 'other') return false;
          } else {
            // 引导模式下「交换机」子 Tab：仅展示交换机
            if (type !== 'switch') return false;
          }
        } else {
          // 子类型过滤：router/firewall/storage 等，检查原始 type 字段
          const rawType = (d.type || '').toLowerCase();
          if (!rawType.includes(deviceFilterType)) return false;
        }
      }
```

- [ ] **Step 2: 确认 `paginatedDevices` 的 useMemo 依赖数组包含 `guidedDeviceType`**

定位到 PortManagement.jsx 第 1736 行，确认依赖数组：

```js
  }, [devices, deviceFilterType, devicePage, rackList, selectedRoomId, selectedRackId]);
```

由于 Step 1 引入了对 `guidedDeviceType` 的引用，需将其加入依赖数组：

```js
  }, [devices, deviceFilterType, devicePage, guidedDeviceType, rackList, selectedRoomId, selectedRackId]);
```

- [ ] **Step 3: 运行 lint 验证**

Run: `cd frontend && npm run lint`
Expected: 无新增错误（注意检查 react-hooks/exhaustive-deps 相关 warning 是否被本次依赖数组补充消除）

- [ ] **Step 4: 手动验证**

启动前端，准备一台自定义类型设备（如"无线控制器"），执行以下验证：

1. **引导模式 - 其他 Tab：** 端口管理 → 添加端口 → 网络设备端口 → 点击「其他」Tab，确认只展示自定义类型设备。
2. **引导模式 - 交换机 Tab：** 点击「交换机」Tab，确认只展示交换机，不包含自定义类型设备。
3. **无引导模式 - 网络设备大类：** 直接打开设备选择弹窗（若有此入口）或引导为 switch 后关闭再重开，点击「网络设备」大类 Tab，确认同时展示交换机和自定义类型设备。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/pages/PortManagement.jsx
git commit -m "feat(PortManagement): 子类型过滤支持「其他」Tab 及无引导大类包含自定义类型"
```

---

## Task 5: 引导弹窗文案补充自定义类型说明

**Files:**
- Modify: `frontend/src/components/PortAddGuideModal.jsx:154`（「网络设备端口」卡片描述）
- Modify: `frontend/src/components/PortAddGuideModal.jsx:296-297`（「网络设备端口」说明文字）

**目标：** 让用户知道自定义类型设备也通过「网络设备端口」入口创建端口。

- [ ] **Step 1: 修改「网络设备端口」卡片描述**

定位到 PortAddGuideModal.jsx 第 154 行，当前代码：

```jsx
                交换机/路由器/防火墙等
```

改为：

```jsx
                交换机/路由器/防火墙及自定义类型
```

- [ ] **Step 2: 修改「网络设备端口」说明文字**

定位到 PortAddGuideModal.jsx 第 296-297 行，当前代码：

```jsx
                  适用于交换机、路由器、防火墙、存储设备等网络设备，可以直接创建端口，无需关联网卡。适用于创建
                  Uplink 端口、Trunk 端口等。
```

改为：

```jsx
                  适用于交换机、路由器、防火墙、存储设备等网络设备，以及其他自定义网络设备类型（如无线控制器、上网行为管理等），可以直接创建端口，无需关联网卡。适用于创建
                  Uplink 端口、Trunk 端口等。
```

- [ ] **Step 3: 运行 lint 验证**

Run: `cd frontend && npm run lint`
Expected: 无新增错误

- [ ] **Step 4: 提交**

```bash
git add frontend/src/components/PortAddGuideModal.jsx
git commit -m "docs(PortAddGuideModal): 引导弹窗文案补充自定义网络设备类型说明"
```

---

## Task 6: 最终整体验证

**Files:** 无代码改动，仅验证

**目标：** 按 spec 的验证方式清单完整测试所有场景，确认无回归。

- [ ] **Step 1: 准备测试数据**

1. 在设备字段管理中新增一个自定义类型（如"无线控制器"）。
2. 创建一台该类型设备（可放入某机柜或作为闲置设备）。
3. 确保系统中也至少有一台交换机、一台服务器用于回归测试。

- [ ] **Step 2: 验证自定义类型创建端口全流程**

1. 打开端口管理 → 点击「添加端口」→ 选择「网络设备端口」入口。
2. 确认设备选择弹窗出现 5 个 Tab：交换机 / 路由器 / 防火墙 / 存储设备 / 其他。
3. 点击「其他」Tab，确认能看到自定义类型设备，计数正确。
4. 选中自定义类型设备，点击下一步。
5. 确认端口创建表单中**无网卡字段**（走网络设备分支）。
6. 填写端口名（如 `eth0/1`），提交，确认端口创建成功。
7. 在端口列表中确认该端口显示，且设备类型标签显示原始值（如"无线控制器"）而非"设备"。

- [ ] **Step 3: 验证无引导模式**

1. 若有直接打开设备选择弹窗的入口（非引导），打开它。
2. 确认大类 Tab 为「网络设备 / 服务器」。
3. 点击「网络设备」大类 Tab，确认同时展示交换机和自定义类型设备。

- [ ] **Step 4: 回归测试原有流程**

1. 引导为「网络设备端口」时，点击「交换机」Tab，确认只展示交换机（不含自定义类型）。
2. 引导为「服务器端口」时，确认仅展示服务器 Tab，端口创建表单仍要求关联网卡。
3. 确认交换机/路由器/防火墙/存储设备的端口创建流程未受影响。

- [ ] **Step 5: 运行全量 lint**

Run: `cd frontend && npm run lint`
Expected: 无新增错误

- [ ] **Step 6: 更新项目说明文档（如需）**

若 `说明文档.md` 存在且记录了端口管理功能，更新其进度记录，标注本次「端口管理支持自定义设备类型」已完成。

---

## Self-Review

**Spec 覆盖检查：**
- 改动点 1（过滤逻辑放开，2 处）→ Task 1 ✓
- 改动点 2（Tab 配置新增「其他」）→ Task 3 Step 1 ✓
- 改动点 3（子类型过滤逻辑）→ Task 4 ✓
- 改动点 4（网卡关联判断）→ Task 2 Step 1 ✓
- 改动点 5（Tab 计数与配色）→ Task 3 Step 2、3 ✓
- 改动点 6（类型显示文案）→ Task 2 Step 2 ✓
- 附带微调（引导弹窗文案）→ Task 5 ✓
- 验证方式清单 → Task 6 ✓

**Placeholder 扫描：** 无 TBD/TODO/「类似 Task N」等占位符，所有代码步骤均给出完整代码。

**类型一致性检查：**
- `getDeviceType` 返回值 `'server'` / `'switch'` / `'other'` / `'unknown'` 在所有任务中一致使用。
- `deviceFilterType` 的 key 值 `'other'` 在 Task 3（tabConfigs）、Task 4（过滤分支）、Task 3（getTabCount）中一致。
- `tabColors.other` 在 Task 3 Step 3 定义，与 Tab 渲染处 `tabColors[tab.key]` 查找逻辑一致。
- `getDeviceTypeLabel` 函数名（spec 误写为 `getTypeDisplayName`）已在计划中用真实名称修正。

**依赖补充检查：** Task 4 引入 `guidedDeviceType` 到 `paginatedDevices` useMemo，已在 Step 2 明确补充依赖数组，避免 stale closure。
