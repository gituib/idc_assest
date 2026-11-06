'use strict';

/**
 * 初始化系统权限种子数据
 *
 * 权限体系说明：
 * - type='module' 表示模块级节点（第一层，对应侧边栏主菜单）
 * - type='menu' 表示页面级节点（第二层，对应侧边栏子菜单）
 * - type='button' 表示操作级节点（第三层，对应页面内的按钮/操作）
 *
 * 父子关系通过 parentId 关联，对应 permissionCode。
 */
const Permission = require('../models/Permission');
const logger = require('../utils/logger');

const permissionsData = [
  // ==============================
  // 1. 仪表盘模块
  // ==============================
  { permissionId: 'perm_dashboard', permissionName: '仪表盘', permissionCode: 'dashboard', parentId: null, type: 'module', sort: 10, status: 'active' },
  { permissionId: 'perm_dashboard_view', permissionName: '查看仪表盘', permissionCode: 'dashboard:view', parentId: 'dashboard', type: 'menu', sort: 11, status: 'active' },
  { permissionId: 'perm_dashboard_export', permissionName: '导出数据', permissionCode: 'dashboard:export', parentId: 'dashboard:view', type: 'button', sort: 12, status: 'active' },

  // ==============================
  // 2. 机房管理模块
  // ==============================
  { permissionId: 'perm_room', permissionName: '机房管理', permissionCode: 'room', parentId: null, type: 'module', sort: 20, status: 'active' },
  // 机房管理页面
  { permissionId: 'perm_room_page', permissionName: '机房列表', permissionCode: 'room:page', parentId: 'room', type: 'menu', sort: 21, status: 'active' },
  { permissionId: 'perm_room_view', permissionName: '查看机房', permissionCode: 'room:view', parentId: 'room:page', type: 'button', sort: 22, status: 'active' },
  { permissionId: 'perm_room_create', permissionName: '新增机房', permissionCode: 'room:create', parentId: 'room:page', type: 'button', sort: 23, status: 'active' },
  { permissionId: 'perm_room_edit', permissionName: '编辑机房', permissionCode: 'room:edit', parentId: 'room:page', type: 'button', sort: 24, status: 'active' },
  { permissionId: 'perm_room_delete', permissionName: '删除机房', permissionCode: 'room:delete', parentId: 'room:page', type: 'button', sort: 25, status: 'active' },
  // 机柜管理页面
  { permissionId: 'perm_rack_page', permissionName: '机柜列表', permissionCode: 'rack:page', parentId: 'room', type: 'menu', sort: 26, status: 'active' },
  { permissionId: 'perm_rack_view', permissionName: '查看机柜', permissionCode: 'rack:view', parentId: 'rack:page', type: 'button', sort: 27, status: 'active' },
  { permissionId: 'perm_rack_create', permissionName: '新增机柜', permissionCode: 'rack:create', parentId: 'rack:page', type: 'button', sort: 28, status: 'active' },
  { permissionId: 'perm_rack_edit', permissionName: '编辑机柜', permissionCode: 'rack:edit', parentId: 'rack:page', type: 'button', sort: 29, status: 'active' },
  { permissionId: 'perm_rack_delete', permissionName: '删除机柜', permissionCode: 'rack:delete', parentId: 'rack:page', type: 'button', sort: 30, status: 'active' },
  // 3D 可视化页面
  { permissionId: 'perm_rack_3d', permissionName: '3D机柜可视化', permissionCode: 'rack:3d', parentId: 'room', type: 'menu', sort: 31, status: 'active' },
  // 机房平面图页面
  { permissionId: 'perm_floorplan', permissionName: '机房平面图', permissionCode: 'floorplan', parentId: 'room', type: 'menu', sort: 32, status: 'active' },
  { permissionId: 'perm_floorplan_edit', permissionName: '编辑平面图', permissionCode: 'floorplan:edit', parentId: 'floorplan', type: 'button', sort: 33, status: 'active' },

  // ==============================
  // 3. 资产管理模块
  // ==============================
  { permissionId: 'perm_asset', permissionName: '资产管理', permissionCode: 'asset', parentId: null, type: 'module', sort: 40, status: 'active' },
  // 设备管理
  { permissionId: 'perm_device_page', permissionName: '设备管理', permissionCode: 'device:page', parentId: 'asset', type: 'menu', sort: 41, status: 'active' },
  { permissionId: 'perm_device_view', permissionName: '查看设备', permissionCode: 'device:view', parentId: 'device:page', type: 'button', sort: 42, status: 'active' },
  { permissionId: 'perm_device_create', permissionName: '新增设备', permissionCode: 'device:create', parentId: 'device:page', type: 'button', sort: 43, status: 'active' },
  { permissionId: 'perm_device_edit', permissionName: '编辑设备', permissionCode: 'device:edit', parentId: 'device:page', type: 'button', sort: 44, status: 'active' },
  { permissionId: 'perm_device_delete', permissionName: '删除设备', permissionCode: 'device:delete', parentId: 'device:page', type: 'button', sort: 45, status: 'active' },
  { permissionId: 'perm_device_import', permissionName: '导入设备', permissionCode: 'device:import', parentId: 'device:page', type: 'button', sort: 46, status: 'active' },
  { permissionId: 'perm_device_export', permissionName: '导出设备', permissionCode: 'device:export', parentId: 'device:page', type: 'button', sort: 47, status: 'active' },
  // 空闲设备
  { permissionId: 'perm_idle_page', permissionName: '空闲设备', permissionCode: 'idle:page', parentId: 'asset', type: 'menu', sort: 48, status: 'active' },
  { permissionId: 'perm_idle_shelve', permissionName: '上架设备', permissionCode: 'idle:shelve', parentId: 'idle:page', type: 'button', sort: 49, status: 'active' },
  { permissionId: 'perm_idle_edit', permissionName: '编辑空闲设备', permissionCode: 'idle:edit', parentId: 'idle:page', type: 'button', sort: 50, status: 'active' },
  { permissionId: 'perm_idle_restore', permissionName: '恢复设备', permissionCode: 'idle:restore', parentId: 'idle:page', type: 'button', sort: 51, status: 'active' },
  { permissionId: 'perm_idle_delete', permissionName: '删除空闲设备', permissionCode: 'idle:delete', parentId: 'idle:page', type: 'button', sort: 52, status: 'active' },
  // 字段管理
  { permissionId: 'perm_field_page', permissionName: '字段管理', permissionCode: 'field:page', parentId: 'asset', type: 'menu', sort: 53, status: 'active' },
  // 端口管理
  { permissionId: 'perm_port_page', permissionName: '端口管理', permissionCode: 'port:page', parentId: 'asset', type: 'menu', sort: 54, status: 'active' },
  { permissionId: 'perm_port_create', permissionName: '新增端口', permissionCode: 'port:create', parentId: 'port:page', type: 'button', sort: 55, status: 'active' },
  { permissionId: 'perm_port_edit', permissionName: '编辑端口', permissionCode: 'port:edit', parentId: 'port:page', type: 'button', sort: 56, status: 'active' },
  { permissionId: 'perm_port_delete', permissionName: '删除端口', permissionCode: 'port:delete', parentId: 'port:page', type: 'button', sort: 57, status: 'active' },
  // 接线管理
  { permissionId: 'perm_cable_page', permissionName: '接线管理', permissionCode: 'cable:page', parentId: 'asset', type: 'menu', sort: 58, status: 'active' },
  { permissionId: 'perm_cable_create', permissionName: '新增接线', permissionCode: 'cable:create', parentId: 'cable:page', type: 'button', sort: 59, status: 'active' },
  { permissionId: 'perm_cable_edit', permissionName: '编辑接线', permissionCode: 'cable:edit', parentId: 'cable:page', type: 'button', sort: 60, status: 'active' },
  { permissionId: 'perm_cable_delete', permissionName: '删除接线', permissionCode: 'cable:delete', parentId: 'cable:page', type: 'button', sort: 61, status: 'active' },

  // ==============================
  // 4. 耗材管理模块
  // ==============================
  { permissionId: 'perm_consumable', permissionName: '耗材管理', permissionCode: 'consumable', parentId: null, type: 'module', sort: 60, status: 'active' },
  // 耗材统计
  { permissionId: 'perm_consumable_stats', permissionName: '耗材统计', permissionCode: 'consumable:stats', parentId: 'consumable', type: 'menu', sort: 61, status: 'active' },
  // 耗材列表
  { permissionId: 'perm_consumable_list', permissionName: '耗材列表', permissionCode: 'consumable:list', parentId: 'consumable', type: 'menu', sort: 62, status: 'active' },
  { permissionId: 'perm_consumable_view', permissionName: '查看耗材', permissionCode: 'consumable:view', parentId: 'consumable:list', type: 'button', sort: 63, status: 'active' },
  { permissionId: 'perm_consumable_create', permissionName: '新增耗材', permissionCode: 'consumable:create', parentId: 'consumable:list', type: 'button', sort: 64, status: 'active' },
  { permissionId: 'perm_consumable_edit', permissionName: '编辑耗材', permissionCode: 'consumable:edit', parentId: 'consumable:list', type: 'button', sort: 65, status: 'active' },
  { permissionId: 'perm_consumable_delete', permissionName: '删除耗材', permissionCode: 'consumable:delete', parentId: 'consumable:list', type: 'button', sort: 66, status: 'active' },
  { permissionId: 'perm_consumable_inout', permissionName: '出入库操作', permissionCode: 'consumable:inout', parentId: 'consumable:list', type: 'button', sort: 67, status: 'active' },
  { permissionId: 'perm_consumable_import', permissionName: '导入耗材', permissionCode: 'consumable:import', parentId: 'consumable:list', type: 'button', sort: 68, status: 'active' },
  { permissionId: 'perm_consumable_export', permissionName: '导出耗材', permissionCode: 'consumable:export', parentId: 'consumable:list', type: 'button', sort: 69, status: 'active' },
  // 分类管理
  { permissionId: 'perm_consumable_category', permissionName: '分类管理', permissionCode: 'consumable:category', parentId: 'consumable', type: 'menu', sort: 70, status: 'active' },
  { permissionId: 'perm_consumable_category_create', permissionName: '新增分类', permissionCode: 'consumable:category:create', parentId: 'consumable:category', type: 'button', sort: 71, status: 'active' },
  { permissionId: 'perm_consumable_category_edit', permissionName: '编辑分类', permissionCode: 'consumable:category:edit', parentId: 'consumable:category', type: 'button', sort: 72, status: 'active' },
  { permissionId: 'perm_consumable_category_delete', permissionName: '删除分类', permissionCode: 'consumable:category:delete', parentId: 'consumable:category', type: 'button', sort: 73, status: 'active' },
  // 操作日志
  { permissionId: 'perm_consumable_log', permissionName: '操作日志', permissionCode: 'consumable:log', parentId: 'consumable', type: 'menu', sort: 74, status: 'active' },

  // ==============================
  // 5. 工单管理模块
  // ==============================
  { permissionId: 'perm_ticket', permissionName: '工单管理', permissionCode: 'ticket', parentId: null, type: 'module', sort: 80, status: 'active' },
  // 工单列表
  { permissionId: 'perm_ticket_list', permissionName: '工单列表', permissionCode: 'ticket:list', parentId: 'ticket', type: 'menu', sort: 81, status: 'active' },
  { permissionId: 'perm_ticket_view', permissionName: '查看工单', permissionCode: 'ticket:view', parentId: 'ticket:list', type: 'button', sort: 82, status: 'active' },
  { permissionId: 'perm_ticket_create', permissionName: '创建工单', permissionCode: 'ticket:create', parentId: 'ticket:list', type: 'button', sort: 83, status: 'active' },
  { permissionId: 'perm_ticket_edit', permissionName: '编辑工单', permissionCode: 'ticket:edit', parentId: 'ticket:list', type: 'button', sort: 84, status: 'active' },
  { permissionId: 'perm_ticket_delete', permissionName: '删除工单', permissionCode: 'ticket:delete', parentId: 'ticket:list', type: 'button', sort: 85, status: 'active' },
  { permissionId: 'perm_ticket_assign', permissionName: '分配工单', permissionCode: 'ticket:assign', parentId: 'ticket:list', type: 'button', sort: 86, status: 'active' },
  { permissionId: 'perm_ticket_close', permissionName: '关闭工单', permissionCode: 'ticket:close', parentId: 'ticket:list', type: 'button', sort: 87, status: 'active' },
  // 故障分类
  { permissionId: 'perm_ticket_category', permissionName: '故障分类', permissionCode: 'ticket:category', parentId: 'ticket', type: 'menu', sort: 88, status: 'active' },
  { permissionId: 'perm_ticket_category_create', permissionName: '新增故障分类', permissionCode: 'ticket:category:create', parentId: 'ticket:category', type: 'button', sort: 89, status: 'active' },
  { permissionId: 'perm_ticket_category_edit', permissionName: '编辑故障分类', permissionCode: 'ticket:category:edit', parentId: 'ticket:category', type: 'button', sort: 90, status: 'active' },
  { permissionId: 'perm_ticket_category_delete', permissionName: '删除故障分类', permissionCode: 'ticket:category:delete', parentId: 'ticket:category', type: 'button', sort: 91, status: 'active' },
  // 统计报表
  { permissionId: 'perm_ticket_stats', permissionName: '统计报表', permissionCode: 'ticket:stats', parentId: 'ticket', type: 'menu', sort: 92, status: 'active' },

  // ==============================
  // 6. 资产盘点模块
  // ==============================
  { permissionId: 'perm_inventory', permissionName: '资产盘点', permissionCode: 'inventory', parentId: null, type: 'module', sort: 100, status: 'active' },
  // 盘点计划
  { permissionId: 'perm_inventory_plan', permissionName: '盘点计划', permissionCode: 'inventory:plan', parentId: 'inventory', type: 'menu', sort: 101, status: 'active' },
  { permissionId: 'perm_inventory_plan_create', permissionName: '新增计划', permissionCode: 'inventory:plan:create', parentId: 'inventory:plan', type: 'button', sort: 102, status: 'active' },
  { permissionId: 'perm_inventory_plan_edit', permissionName: '编辑计划', permissionCode: 'inventory:plan:edit', parentId: 'inventory:plan', type: 'button', sort: 103, status: 'active' },
  { permissionId: 'perm_inventory_plan_delete', permissionName: '删除计划', permissionCode: 'inventory:plan:delete', parentId: 'inventory:plan', type: 'button', sort: 104, status: 'active' },
  { permissionId: 'perm_inventory_plan_start', permissionName: '启动盘点', permissionCode: 'inventory:plan:start', parentId: 'inventory:plan', type: 'button', sort: 105, status: 'active' },
  // 执行盘点
  { permissionId: 'perm_inventory_task', permissionName: '执行盘点', permissionCode: 'inventory:task', parentId: 'inventory', type: 'menu', sort: 106, status: 'active' },
  { permissionId: 'perm_inventory_task_check', permissionName: '盘点操作', permissionCode: 'inventory:task:check', parentId: 'inventory:task', type: 'button', sort: 107, status: 'active' },
  // 盘盈设备
  { permissionId: 'perm_inventory_pending', permissionName: '盘盈设备', permissionCode: 'inventory:pending', parentId: 'inventory', type: 'menu', sort: 108, status: 'active' },
  { permissionId: 'perm_inventory_pending_sync', permissionName: '同步到正式库', permissionCode: 'inventory:pending:sync', parentId: 'inventory:pending', type: 'button', sort: 109, status: 'active' },
  { permissionId: 'perm_inventory_stats', permissionName: '盘点统计', permissionCode: 'inventory:stats', parentId: 'inventory', type: 'menu', sort: 110, status: 'active' },

  // ==============================
  // 7. 网络拓扑模块
  // ==============================
  { permissionId: 'perm_topology', permissionName: '网络拓扑', permissionCode: 'topology', parentId: null, type: 'module', sort: 120, status: 'active' },
  { permissionId: 'perm_topology_view', permissionName: '查看拓扑', permissionCode: 'topology:view', parentId: 'topology', type: 'menu', sort: 121, status: 'active' },
  { permissionId: 'perm_topology_edit', permissionName: '编辑拓扑', permissionCode: 'topology:edit', parentId: 'topology:view', type: 'button', sort: 122, status: 'active' },
  { permissionId: 'perm_topology_export', permissionName: '导出拓扑', permissionCode: 'topology:export', parentId: 'topology:view', type: 'button', sort: 123, status: 'active' },

  // ==============================
  // 8. 系统管理模块
  // ==============================
  { permissionId: 'perm_system', permissionName: '系统管理', permissionCode: 'system', parentId: null, type: 'module', sort: 200, status: 'active' },
  // 用户管理
  { permissionId: 'perm_user_page', permissionName: '用户管理', permissionCode: 'user:page', parentId: 'system', type: 'menu', sort: 201, status: 'active' },
  { permissionId: 'perm_user_view', permissionName: '查看用户', permissionCode: 'user:view', parentId: 'user:page', type: 'button', sort: 202, status: 'active' },
  { permissionId: 'perm_user_create', permissionName: '新增用户', permissionCode: 'user:create', parentId: 'user:page', type: 'button', sort: 203, status: 'active' },
  { permissionId: 'perm_user_edit', permissionName: '编辑用户', permissionCode: 'user:edit', parentId: 'user:page', type: 'button', sort: 204, status: 'active' },
  { permissionId: 'perm_user_delete', permissionName: '删除用户', permissionCode: 'user:delete', parentId: 'user:page', type: 'button', sort: 205, status: 'active' },
  { permissionId: 'perm_user_password', permissionName: '重置密码', permissionCode: 'user:password', parentId: 'user:page', type: 'button', sort: 206, status: 'active' },
  { permissionId: 'perm_user_lock', permissionName: '锁定/解锁用户', permissionCode: 'user:lock', parentId: 'user:page', type: 'button', sort: 207, status: 'active' },
  { permissionId: 'perm_user_approve', permissionName: '审核注册', permissionCode: 'user:approve', parentId: 'user:page', type: 'button', sort: 208, status: 'active' },
  // 角色管理
  { permissionId: 'perm_role_page', permissionName: '角色管理', permissionCode: 'role:page', parentId: 'system', type: 'menu', sort: 209, status: 'active' },
  { permissionId: 'perm_role_view', permissionName: '查看角色', permissionCode: 'role:view', parentId: 'role:page', type: 'button', sort: 210, status: 'active' },
  { permissionId: 'perm_role_create', permissionName: '新增角色', permissionCode: 'role:create', parentId: 'role:page', type: 'button', sort: 211, status: 'active' },
  { permissionId: 'perm_role_edit', permissionName: '编辑角色', permissionCode: 'role:edit', parentId: 'role:page', type: 'button', sort: 212, status: 'active' },
  { permissionId: 'perm_role_delete', permissionName: '删除角色', permissionCode: 'role:delete', parentId: 'role:page', type: 'button', sort: 213, status: 'active' },
  // 系统设置
  { permissionId: 'perm_settings_page', permissionName: '系统设置', permissionCode: 'settings:page', parentId: 'system', type: 'menu', sort: 214, status: 'active' },
  { permissionId: 'perm_settings_view', permissionName: '查看设置', permissionCode: 'settings:view', parentId: 'settings:page', type: 'button', sort: 215, status: 'active' },
  { permissionId: 'perm_settings_edit', permissionName: '编辑设置', permissionCode: 'settings:edit', parentId: 'settings:page', type: 'button', sort: 216, status: 'active' },
  { permissionId: 'perm_settings_mail', permissionName: '邮箱配置', permissionCode: 'settings:mail', parentId: 'settings:page', type: 'button', sort: 217, status: 'active' },
  { permissionId: 'perm_settings_maintenance', permissionName: '维护模式', permissionCode: 'settings:maintenance', parentId: 'settings:page', type: 'button', sort: 218, status: 'active' },
  // 数据备份
  { permissionId: 'perm_backup_page', permissionName: '数据备份', permissionCode: 'backup:page', parentId: 'system', type: 'menu', sort: 219, status: 'active' },
  { permissionId: 'perm_backup_view', permissionName: '查看备份', permissionCode: 'backup:view', parentId: 'backup:page', type: 'button', sort: 220, status: 'active' },
  { permissionId: 'perm_backup_create', permissionName: '创建备份', permissionCode: 'backup:create', parentId: 'backup:page', type: 'button', sort: 221, status: 'active' },
  { permissionId: 'perm_backup_restore', permissionName: '恢复备份', permissionCode: 'backup:restore', parentId: 'backup:page', type: 'button', sort: 222, status: 'active' },
  { permissionId: 'perm_backup_delete', permissionName: '删除备份', permissionCode: 'backup:delete', parentId: 'backup:page', type: 'button', sort: 223, status: 'active' },
  { permissionId: 'perm_backup_auto', permissionName: '自动备份设置', permissionCode: 'backup:auto', parentId: 'backup:page', type: 'button', sort: 224, status: 'active' },
  { permissionId: 'perm_backup_remote', permissionName: '远程备份设置', permissionCode: 'backup:remote', parentId: 'backup:page', type: 'button', sort: 225, status: 'active' },
  // 操作日志
  { permissionId: 'perm_log_page', permissionName: '操作日志', permissionCode: 'log:page', parentId: 'system', type: 'menu', sort: 226, status: 'active' },
  { permissionId: 'perm_log_export', permissionName: '导出日志', permissionCode: 'log:export', parentId: 'log:page', type: 'button', sort: 227, status: 'active' },

  // ==============================
  // 9. 库房管理模块
  // ==============================
  { permissionId: 'perm_warehouse', permissionName: '库房管理', permissionCode: 'warehouse', parentId: null, type: 'module', sort: 130, status: 'active' },
  { permissionId: 'perm_warehouse_view', permissionName: '查看库房', permissionCode: 'warehouse:view', parentId: 'warehouse', type: 'menu', sort: 131, status: 'active' },
  { permissionId: 'perm_warehouse_create', permissionName: '新增库房', permissionCode: 'warehouse:create', parentId: 'warehouse:view', type: 'button', sort: 132, status: 'active' },
  { permissionId: 'perm_warehouse_edit', permissionName: '编辑库房', permissionCode: 'warehouse:edit', parentId: 'warehouse:view', type: 'button', sort: 133, status: 'active' },
  { permissionId: 'perm_warehouse_delete', permissionName: '删除库房', permissionCode: 'warehouse:delete', parentId: 'warehouse:view', type: 'button', sort: 134, status: 'active' },
];

/**
 * 执行权限种子数据初始化
 * 使用 upsert 确保幂等，可多次安全执行
 * @returns {Promise<void>}
 */
async function initPermissions() {
  logger.info('开始初始化权限数据...');
  let count = 0;
  for (const perm of permissionsData) {
    try {
      await Permission.upsert(perm);
      count++;
    } catch (error) {
      logger.error(`初始化权限 ${perm.permissionCode} 失败: ${error.message}`);
    }
  }
  logger.info(`权限数据初始化完成，共处理 ${count} 条记录`);
  return count;
}

// 命令行直接执行
if (require.main === module) {
  (async () => {
    try {
      await initPermissions();
      process.exit(0);
    } catch (error) {
      console.error('权限初始化失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { initPermissions, permissionsData };
