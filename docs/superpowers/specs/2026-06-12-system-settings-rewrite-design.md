# 系统设置页面重写设计

## 概述

重写系统设置主页面（`SystemSettings.jsx`），遵循务实原则：每个设置项都必须有实际效果。移除所有"只写不读"的设置项，新增 maintenance_mode 和 max_login_attempts 的后端执行逻辑。

**范围**：仅重写系统设置主页面，备份相关 3 个页面（数据备份管理、自动备份设置、远端备份配置）保持不变。

## 设计决策

- **方案 A**：保持 3 Tab 结构（基本设置、外观设置、关于系统）
- **务实派**：移除所有无实际效果的设置项，保留的每个设置项都必须有前后端闭环
- **精简优先**：不新增功能，先做精简

## 设置项清单

### Tab 1：基本设置

| 设置项 | Key | 类型 | 实际效果 |
|--------|-----|------|----------|
| 网站名称 | `site_name` | 文本输入 | 侧边栏顶部显示的系统名称 |
| 网站 Logo | `site_logo` | URL 输入 + 预览 | 侧边栏顶部显示的 Logo 图片 |
| 空闲超时 | `idle_timeout` | 数字(分钟) | 前端空闲检测倒计时，超时后自动登出 |
| 最大登录尝试 | `max_login_attempts` | 数字 | 后端登录接口校验，超限后锁定账户 |
| 维护模式 | `maintenance_mode` | 开关 | 后端中间件拦截，普通用户无法登录 |

### Tab 2：外观设置

| 设置项 | Key | 类型 | 实际效果 |
|--------|-----|------|----------|
| 主色调 | `primary_color` | 颜色选择器 | 全局 CSS 变量，影响按钮/链接/渐变等 |
| 辅助色调 | `secondary_color` | 颜色选择器 | 全局 CSS 变量，影响渐变/悬停效果 |

### Tab 3：关于系统

| 内容 | 类型 | 说明 |
|------|------|------|
| 系统版本、Node 版本、平台、运行时间、内存 | 只读展示 | 从后端 `/system/info` 获取 |
| 设备/机柜/机房/用户统计 | 只读展示 | 从后端统计获取 |
| 公司名称、联系邮箱、联系电话、公司地址、系统描述 | 可编辑表单 | 保存到 system_settings |

### 移除的设置项

以下设置项从前端页面和后端 `initDefaultSettings` 中移除（数据库已有记录不主动删除）：

- `timezone` — 时区设置（无效果）
- `date_format` — 日期格式（无效果）
- `compact_mode` — 紧凑模式（无效果）
- `sidebar_collapsed` — 侧边栏折叠（无效果）
- `table_row_height` — 表格行高（无效果）
- `animation_enabled` — 动画效果（无效果）
- `session_timeout` — 登录有效期（与 idle_timeout 重复）
- `idle_warning_time` — 空闲警告时间（前端未使用）
- `privacy_policy` — 隐私政策 URL（前端未使用）
- `terms_of_service` — 服务条款 URL（前端未使用）

## 后端实现

### maintenance_mode 实现

1. 在 `backend/middleware/auth.js` 的 `authMiddleware` 中增加维护模式检查
2. 从 `SystemSetting` 表读取 `maintenance_mode` 值（可缓存，避免每次查询）
3. 登录接口：`maintenance_mode === true` 时，只允许管理员角色登录，其他用户返回 503 + 提示信息
4. 已登录用户：普通用户的 API 请求返回 503，管理员不受影响
5. 缓存策略：内存缓存 maintenance_mode 值，设置保存时清除缓存

### max_login_attempts 实现

现有 User 模型中已有 `loginCount`（记录失败次数）和 `lockedUntil`（锁定截止时间）字段，无需新增。改动如下：

1. 登录接口逻辑：
   - 从 system_settings 动态读取 `max_login_attempts` 值（替代原来的硬编码 `MAX_LOGIN_ATTEMPTS`）
   - 使用现有 `user.loginCount` 记录失败次数
   - 使用现有 `user.lockedUntil` 记录锁定截止时间
   - 锁定时间改为 30 分钟（原来的 3 分钟偏短）
2. 登录成功时重置 `loginCount = 0`、`lockedUntil = null`（已有逻辑不变）

### 移除设置项的后端处理

1. `initDefaultSettings` 数组中移除上述 10 个设置项
2. `reset/:key` 路由的 `defaultValues` 对象同步清理
3. 已有数据库记录不主动删除（避免数据迁移问题），前端不再展示即可

### site_logo 后端

- 无需额外后端改动，已有 `site_logo` 设置项在 `initDefaultSettings` 中
- 前端通过 `/api/system-settings` 接口获取

## 前端实现

### 页面结构

保持当前 `SystemSettings.jsx` 的整体布局（顶部导航栏 + Tab 切换），重写内容区：

**Tab 1 - 基本设置：**
- 站点信息卡片：网站名称 + 网站 Logo URL（带预览按钮，点击弹窗显示 Logo 图片）
- 安全设置卡片：空闲超时 + 最大登录尝试 + 维护模式（维护模式开关带醒目 Alert 警告提示）

**Tab 2 - 外观设置：**
- 主题色卡片：主色调 + 辅色调（保留当前 ColorPicker + 实时预览）
- 移除界面布局卡片和动画效果卡片

**Tab 3 - 关于系统：**
- 保持当前设计不变（系统信息展示 + 公司信息编辑表单）

### 清理死代码

1. 移除 `handleSaveSettings` 中 `frontend_port` 相关逻辑（第 118-203 行）
2. 移除 `renderFormItem` 中 `frontend_port` 特殊处理（第 252 行）
3. 移除 `getSelectOptions` 中 timezone、date_format、compact_mode、animation_enabled、sidebar_collapsed、dark_mode 的选项映射
4. 移除 `settingGroups` 中时间设置分组
5. configStore 的 `defaultConfig` 中移除 `timezone`、`date_format`、`compact_mode`、`sidebar_collapsed`、`animation_enabled`
6. configStore 的 `defaultConfig` 中增加 `site_logo: ''`

### site_logo 显示

1. 侧边栏组件读取 `config.site_logo`，有值时用 `<img>` 显示，无值时用默认图标
2. Logo 预览按钮：点击后弹窗显示 Logo 图片，无效 URL 显示错误提示

### 维护模式前端提示

1. 维护模式开关开启时，显示醒目的 Alert 提示"开启后普通用户将无法登录"
2. 前端 axios 拦截器：如果 API 返回 503（维护模式），跳转到维护提示页面或显示全局提示

## 涉及的文件

### 后端
- `backend/models/User.js` — 新增 loginFailCount、loginLockedUntil 字段
- `backend/routes/auth.js` — 登录接口增加尝试次数限制逻辑
- `backend/middleware/auth.js` — 增加维护模式检查
- `backend/routes/systemSettings.js` — 清理 initDefaultSettings、reset/:key 的 defaultValues

### 前端
- `frontend/src/pages/SystemSettings.jsx` — 重写页面内容
- `frontend/src/stores/configStore.js` — 清理 defaultConfig，增加 site_logo
- `frontend/src/App.jsx` — 侧边栏 Logo 显示、503 拦截
- `frontend/src/api/index.js` — 可能需要调整（检查是否有清理项）
