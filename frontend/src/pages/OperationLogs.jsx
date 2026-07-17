import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Card,
  Space,
  Select,
  DatePicker,
  Input,
  Tag,
  Button,
  message,
  Modal,
  Row,
  Col,
  Descriptions,
  Typography,
  Drawer,
  Statistic,
  Tooltip,
  Empty,
  Collapse,
} from 'antd';
import {
  HistoryOutlined,
  SearchOutlined,
  EyeOutlined,
  FilterOutlined,
  ClearOutlined,
  UserOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  FileTextOutlined,
  DiffOutlined,
  ProfileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  EditOutlined,
  RightOutlined,
} from '@ant-design/icons';
import api from '../api';
import CloseButton from '../components/CloseButton';
import dayjs from 'dayjs';
import {
  selectStyles,
  filterInputStyles,
  inputPlaceholders,
} from '../styles/deviceManagementStyles';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;

const MODULE_OPTIONS = [
  { value: 'device', label: '设备管理' },
  { value: 'idle_device', label: '空闲设备' },
  { value: 'user', label: '用户管理' },
  { value: 'role', label: '角色管理' },
  { value: 'warehouse', label: '库房管理' },
  { value: 'room', label: '机房管理' },
  { value: 'rack', label: '机柜管理' },
  { value: 'port', label: '端口管理' },
  { value: 'network_card', label: '网卡管理' },
  { value: 'cable', label: '线缆管理' },
  { value: 'consumable', label: '耗材管理' },
  { value: 'inventory', label: '盘点管理' },
  { value: 'ticket', label: '工单管理' },
  { value: 'auth', label: '认证管理' },
  { value: 'backup', label: '备份管理' },
  { value: 'system', label: '系统设置' },
];

/**
 * 字段名中英文映射表，用于状态变更展示
 * 覆盖所有模型可能出现在 beforeState/afterState 中的字段
 */
const FIELD_LABELS = {
  // 通用字段
  id: 'ID',
  name: '名称',
  status: '状态',
  type: '类型',
  description: '描述',
  remark: '备注',
  createdAt: '创建时间',
  updatedAt: '更新时间',
  metadata: '元数据',

  // 设备相关
  deviceId: '设备编号',
  deviceName: '设备名称',
  deviceModel: '设备型号',
  deviceType: '设备类型',
  model: '型号',
  serialNumber: '序列号',
  rackId: '所在机柜ID',
  rackName: '机柜名称',
  roomId: '所属机房ID',
  roomName: '机房名称',
  position: 'U位位置',
  height: '占用U数',
  powerConsumption: '功耗(W)',
  isIdle: '是否空闲',
  idleDate: '空闲日期',
  idleReason: '空闲原因',
  warehouseId: '所在库房ID',
  sourceType: '来源类型',
  purchaseDate: '采购日期',
  warrantyExpiry: '保修到期',
  ipAddress: 'IP地址',
  customFields: '自定义字段',

  // 用户相关
  userId: '用户ID',
  username: '用户名',
  password: '密码',
  email: '邮箱',
  phone: '电话',
  realName: '真实姓名',
  avatar: '头像',
  lastLoginTime: '最后登录时间',
  lastLoginIp: '最后登录IP',
  loginCount: '登录失败次数',
  lockedUntil: '锁定截止时间',
  roleIds: '角色ID列表',
  roleNames: '角色名称',
  roles: '角色',
  isFirstUser: '是否首位用户',

  // 角色相关
  roleId: '角色ID',
  roleName: '角色名称',
  roleCode: '角色代码',
  permissions: '权限列表',
  sort: '排序',

  // 机房相关
  location: '位置',
  area: '面积',
  capacity: '容量',
  gridRows: '网格行数',
  gridCols: '网格列数',
  layoutConfig: '布局配置',

  // 机柜相关
  maxPower: '最大功率',
  currentPower: '当前功率',
  rowPos: '行位置',
  colPos: '列位置',
  facing: '朝向',

  // 线缆相关
  cableId: '线缆ID',
  sourceDeviceId: '源设备ID',
  sourcePort: '源端口',
  targetDeviceId: '目标设备ID',
  targetPort: '目标端口',
  cableType: '线缆类型',
  cableLength: '线缆长度',
  cableLabel: '线缆标签',
  cableColor: '线缆颜色',
  installedBy: '安装人',
  installedAt: '安装时间',
  lastTestedAt: '最后测试时间',

  // 端口相关
  portId: '端口ID',
  portName: '端口名称',
  portType: '端口类型',
  portSpeed: '端口速率',
  vlanId: 'VLAN ID',
  nicId: '所属网卡ID',

  // 网卡相关
  slotNumber: '插槽号',
  portCount: '端口数量',
  manufacturer: '厂商',

  // 耗材相关
  consumableId: '耗材ID',
  category: '分类',
  unit: '单位',
  currentStock: '当前库存',
  minStock: '最小库存',
  maxStock: '最大库存',
  unitPrice: '单价',
  supplier: '供应商',
  snList: 'SN序列号列表',
  version: '版本号',

  // 工单相关
  ticketId: '工单ID',
  title: '标题',
  faultCategory: '故障主分类',
  faultSubCategory: '故障子分类',
  priority: '优先级',
  expectedCompletionDate: '期望完成日期',
  reporterId: '报修人ID',
  reporterName: '报修人',
  assigneeId: '处理人ID',
  assigneeName: '处理人',
  resolution: '解决方案',
  completionDate: '完成日期',
  evaluation: '评价内容',
  evaluationRating: '评价星级',
  attachments: '附件',
  tags: '标签',

  // 盘点相关
  planId: '盘点计划ID',
  scheduledDate: '计划执行日期',
  targetRooms: '目标机房',
  targetRacks: '目标机柜',
  totalDevices: '总设备数',
  checkedDevices: '已盘点数',
  normalDevices: '正常设备数',
  abnormalDevices: '异常设备数',
  missedDevices: '缺失设备数',
  createdBy: '创建人',
  completedDate: '完成日期',
  taskId: '盘点任务ID',
  targetType: '目标类型',
  targetName: '目标名称',
  assignedTo: '指派人',
  assignedAt: '指派时间',
  completedAt: '完成时间',
  recordId: '记录ID',
  actualSerialNumber: '实际序列号',
  actualRackId: '实际机柜ID',
  actualPosition: '实际U位',
  abnormalType: '异常类型',
  checkedBy: '盘点人',
  checkedAt: '盘点时间',
  photoUrl: '照片URL',
  pendingId: '暂存设备ID',
  brand: '品牌',
  syncedAt: '同步时间',
  syncedBy: '同步人',
  syncedDeviceId: '同步后设备ID',

  // 系统设置相关
  settingKey: '设置键',
  settingValue: '设置值',
  settingType: '值类型',
  isEditable: '是否可编辑',
  key: '键',
  value: '值',
  port: '端口号',
  configPath: '配置文件路径',
  pid: '进程ID',

  // 备份相关
  filename: '文件名',
  size: '文件大小',
  timestamp: '时间戳',
  compressed: '是否压缩',
  compress: '是否压缩',
  originalName: '原始文件名',
  tablesRestored: '已恢复表数',
  recordsRestored: '已恢复记录数',
  filesRestored: '已恢复文件数',
  restoredAt: '恢复时间',
  successCount: '成功数',
  failCount: '失败数',
  enabled: '是否启用',
  hour: '小时',
  minute: '分钟',
  cronExpression: 'Cron表达式',
  backupType: '备份类型',
  maxCount: '最大备份数',
  maxAgeDays: '最大保留天数',
  dryRun: '预览模式',
  deletedCount: '已删除数',
  protocol: '协议类型',
  host: '主机地址',

  // 操作日志字段（targetId/targetName 已在盘点相关中定义）
  operationType: '操作类型',
  operationDescription: '操作描述',
  module: '模块',
  result: '结果',
  error: '错误信息',
};

/**
 * 枚举值中文映射表，用于状态变更中的值翻译
 * 仅翻译通用枚举值，避免歧义
 */
const VALUE_LABELS = {
  // 设备状态
  in_use: '在用',
  idle: '空闲',
  maintenance: '维护中',
  scrapped: '已报废',
  pending: '待处理',
  // 用户状态
  active: '启用',
  inactive: '禁用',
  locked: '锁定',
  deleted: '已删除',
  // 设备类型
  server: '服务器',
  switch: '交换机',
  router: '路由器',
  storage: '存储',
  firewall: '防火墙',
  other: '其他',
  // 来源类型
  warehouse: '库房',
  rack: '机柜',
  // 工单状态
  open: '待处理',
  in_progress: '处理中',
  resolved: '已解决',
  closed: '已关闭',
  cancelled: '已取消',
  // 工单优先级
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
  // 布尔值
  true: '是',
  false: '否',
};

/**
 * 获取字段的中文名称，未映射则返回原字段名
 * @param {string} key - 字段名
 * @returns {string} 中文名称
 */
const getFieldLabel = key => FIELD_LABELS[key] || key;

/**
 * 将值翻译为中文（仅翻译通用枚举值）
 * @param {*} value - 原始值
 * @returns {*} 翻译后的值
 */
const translateValue = value => {
  if (value == null) return value;
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value !== 'string') return value;
  return VALUE_LABELS[value] ?? value;
};

const OPERATION_TYPE_OPTIONS = [
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'batch_create', label: '批量创建' },
  { value: 'batch_delete', label: '批量删除' },
  { value: 'batch_update', label: '批量更新' },
  { value: 'batch_warranty_update', label: '批量保修更新' },
  { value: 'batch_to_idle', label: '批量转入空闲' },
  { value: 'batch_restore', label: '批量上架' },
  { value: 'status_change', label: '状态变更' },
  { value: 'move', label: '移动' },
  { value: 'permission_change', label: '权限变更' },
  { value: 'to_idle', label: '转入空闲' },
  { value: 'shelve', label: '上架' },
  { value: 'restore', label: '恢复' },
  { value: 'import', label: '导入' },
  { value: 'import_preview', label: '导入预览' },
  { value: 'import_records', label: '导入记录' },
  { value: 'export', label: '导出' },
  { value: 'update_position', label: '位置调整' },
  { value: 'update_layout', label: '更新布局' },
  { value: 'update_rack_position', label: '调整机柜位置' },
  { value: 'init_layout', label: '初始化布局' },
  { value: 'login', label: '登录' },
  { value: 'logout', label: '登出' },
  { value: 'register', label: '注册' },
  { value: 'unlock', label: '解锁' },
  { value: 'change_password', label: '修改密码' },
  { value: 'update_profile', label: '更新资料' },
  { value: 'upload', label: '上传' },
  { value: 'download', label: '下载' },
  { value: 'clean', label: '清理' },
  { value: 'update_settings', label: '更新设置' },
  { value: 'reset', label: '重置' },
  { value: 'maintenance_mode', label: '维护模式' },
  { value: 'backup', label: '备份' },
  { value: 'restart', label: '重启' },
  { value: 'adjust', label: '库存调整' },
  { value: 'stock_in', label: '入库' },
  { value: 'stock_out', label: '出库' },
  { value: 'start', label: '启动' },
  { value: 'check', label: '盘点检查' },
  { value: 'complete', label: '完成' },
  { value: 'sync', label: '同步' },
  { value: 'evaluate', label: '评价' },
  { value: 'process', label: '流程处理' },
];

const RESULT_OPTIONS = [
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
];

/**
 * 解析操作描述文本为结构化数据
 * 格式：操作人 于 时间 动作 → 结果
 * @param {string} description - 操作描述
 * @returns {Object} { operator, time, action, result }
 */
const parseDescription = (description) => {
  if (!description) return null;

  const timeMatch = description.match(
    / 于 (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) /
  );
  if (!timeMatch) {
    return { operator: null, time: null, action: description, result: null };
  }

  const timeStr = timeMatch[1];
  const operator = description.split(' 于 ')[0] || null;
  const afterTime = description.split(timeStr)[1] || '';

  const resultMatch = afterTime.match(/ → (成功|失败)$/);
  const result = resultMatch ? resultMatch[1] : null;
  const action = afterTime.replace(/ → (成功|失败)$/, '').trim();

  return { operator, time: timeStr, action, result };
};

/**
 * 操作描述渲染组件，结构化展示并支持 Tooltip
 */
const DescriptionCell = ({ text, record }) => {
  const parsed = useMemo(() => parseDescription(text), [text]);

  if (!parsed) return <span style={{ color: '#bfbfbf' }}>-</span>;

  const isSuccess = record.result === 'success';

  return (
    <Tooltip title={text} placement="topLeft" mouseEnterDelay={0.3}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          lineHeight: '22px',
          cursor: 'default',
        }}
      >
        {parsed.operator && (
          <span
            style={{
              color: '#1677ff',
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {parsed.operator}
          </span>
        )}
        {parsed.time && (
          <span
            style={{
              color: '#8c8c8c',
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {parsed.time.split(' ')[1]}
          </span>
        )}
        <span
          style={{
            color: '#262626',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {parsed.action}
        </span>
        {parsed.result && (
          <Tag
            color={isSuccess ? 'success' : 'error'}
            style={{
              flexShrink: 0,
              fontSize: 11,
              lineHeight: '18px',
              paddingInline: 4,
              marginInlineEnd: 0,
            }}
          >
            {parsed.result}
          </Tag>
        )}
      </div>
    </Tooltip>
  );
};

/**
 * 安全地解析 JSON 字符串，解析失败则返回原值
 * @param {*} value - 待解析的值
 * @returns {*} 解析后的值
 */
const safeParseJson = value => {
  if (value == null) return value;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

/**
 * 计算两个状态对象的字段差异
 * @param {Object} before - 变更前状态
 * @param {Object} after - 变更后状态
 * @returns {Array} 差异字段列表，每项含 {key, before, after, type}
 */
const computeDiff = (before, after) => {
  const beforeObj = safeParseJson(before) || {};
  const afterObj = safeParseJson(after) || {};
  const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
  const diffs = [];
  allKeys.forEach(key => {
    const bVal = beforeObj[key];
    const aVal = afterObj[key];
    // 值相同（含均为 undefined/null）则跳过
    if (JSON.stringify(bVal) === JSON.stringify(aVal)) return;
    let type = 'modified';
    if (bVal == null && aVal != null) type = 'added';
    else if (bVal != null && aVal == null) type = 'removed';
    // 存储原始 key 和中文标签
    diffs.push({ key, label: getFieldLabel(key), before: bVal, after: aVal, type });
  });
  return diffs;
};

/**
 * 将任意值格式化为可读字符串，枚举值自动翻译为中文
 * @param {*} value - 任意值
 * @returns {string} 格式化后的字符串
 */
const formatValue = value => {
  if (value == null) return '-';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'object') return JSON.stringify(value);
  // 字符串类型尝试翻译枚举值
  return String(translateValue(value));
};

/**
 * 美化展示 JSON 数据，支持折叠和复制
 * @param {Object} props - 组件属性
 * @param {*} props.data - 待展示的数据
 * @param {string} props.title - 标题
 * @param {string} props.color - 主题色
 * @returns {JSX.Element} JSON 展示组件
 */
const JsonBlock = ({ data, title, color = '#595959' }) => {
  const parsed = useMemo(() => safeParseJson(data), [data]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed);
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (parsed == null || (typeof parsed === 'object' && Object.keys(parsed).length === 0)) {
    return <Empty description={`${title || '数据'}为空`} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const text = typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed);

  return (
    <div
      style={{
        position: 'relative',
        background: '#fafafa',
        border: `1px solid ${color}22`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 4,
        padding: 12,
        margin: '4px 0',
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        fontSize: 12,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        maxHeight: 280,
        overflow: 'auto',
      }}
    >
      <Tooltip title={copied ? '已复制' : '复制'}>
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          onClick={handleCopy}
          style={{ position: 'absolute', top: 4, right: 4, opacity: 0.5 }}
        />
      </Tooltip>
      {text}
    </div>
  );
};

/**
 * 状态变更对比组件，采用代码 diff 风格直观展示字段级变更
 * @param {Object} props - 组件属性
 * @param {Object} props.beforeState - 变更前状态
 * @param {Object} props.afterState - 变更后状态
 * @returns {JSX.Element} 对比组件
 */
const StateDiffView = ({ beforeState, afterState }) => {
  const diffs = useMemo(
    () => computeDiff(beforeState, afterState),
    [beforeState, afterState]
  );

  // 统计信息
  const stats = useMemo(() => {
    const added = diffs.filter(d => d.type === 'added').length;
    const removed = diffs.filter(d => d.type === 'removed').length;
    const modified = diffs.filter(d => d.type === 'modified').length;
    return { added, removed, modified, total: diffs.length };
  }, [diffs]);

  // 无任何差异（可能只有单侧数据）
  if (diffs.length === 0) {
    const single = beforeState || afterState;
    if (single == null) return <Empty description="无状态数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    return <JsonBlock data={single} title="状态数据" color="#1677ff" />;
  }

  const typeConfig = {
    added: {
      label: '新增',
      short: '+',
      color: '#52c41a',
      bg: '#f6ffed',
      border: '#b7eb8f',
      icon: <PlusCircleOutlined />,
    },
    removed: {
      label: '删除',
      short: '-',
      color: '#ff4d4f',
      bg: '#fff2f0',
      border: '#ffccc7',
      icon: <MinusCircleOutlined />,
    },
    modified: {
      label: '修改',
      short: '~',
      color: '#faad14',
      bg: '#fffbe6',
      border: '#ffe58f',
      icon: <EditOutlined />,
    },
  };

  return (
    <div>
      {/* 统计概览条 */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '8px 12px',
          marginBottom: 10,
          background: '#fafafa',
          borderRadius: 6,
          fontSize: 12,
          border: '1px solid #f0f0f0',
        }}
      >
        <Text strong style={{ color: '#262626' }}>
          共 {stats.total} 项变更
        </Text>
        {stats.added > 0 && (
          <Tag color="success" style={{ margin: 0 }}>
            +{stats.added} 新增
          </Tag>
        )}
        {stats.modified > 0 && (
          <Tag color="warning" style={{ margin: 0 }}>
            ~{stats.modified} 修改
          </Tag>
        )}
        {stats.removed > 0 && (
          <Tag color="error" style={{ margin: 0 }}>
            -{stats.removed} 删除
          </Tag>
        )}
      </div>

      {/* 字段变更列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {diffs.map(({ key, label, before, after, type }) => {
          const cfg = typeConfig[type];
          const isModified = type === 'modified';
          const isAdded = type === 'added';
          const isRemoved = type === 'removed';
          const hasLabel = label !== key;

          return (
            <div
              key={key}
              style={{
                border: `1px solid ${cfg.border}`,
                borderRadius: 6,
                overflow: 'hidden',
                transition: 'box-shadow 0.2s',
              }}
            >
              {/* 字段名行 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  background: cfg.bg,
                  borderBottom: `1px solid ${cfg.border}`,
                }}
              >
                <span style={{ color: cfg.color, fontSize: 13 }}>{cfg.icon}</span>
                <Text strong style={{ fontSize: 13, color: '#262626', flex: 1 }}>
                  {hasLabel ? (
                    <Tooltip title={key}>
                      <span>{label}</span>
                    </Tooltip>
                  ) : (
                    label
                  )}
                </Text>
                <Tag
                  color={type}
                  style={{
                    margin: 0,
                    fontSize: 11,
                    lineHeight: '16px',
                    padding: '0 4px',
                    border: 'none',
                  }}
                >
                  {cfg.label}
                </Tag>
              </div>

              {/* 值对比行 */}
              <div style={{ display: 'flex', minHeight: 36 }}>
                {/* 变更前 */}
                <div
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRight: '1px solid #f0f0f0',
                    background: isAdded ? '#fafafa' : '#fff',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: '#bfbfbf',
                      marginBottom: 2,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {isAdded ? '原无' : '变更前'}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      color: before == null ? '#d9d9d9' : '#595959',
                      wordBreak: 'break-all',
                      maxHeight: 80,
                      overflow: 'auto',
                      lineHeight: 1.5,
                      textDecoration: isRemoved ? 'line-through' : 'none',
                    }}
                  >
                    {formatValue(before)}
                  </div>
                </div>

                {/* 箭头指示器（仅修改类型显示） */}
                {isModified && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 8px',
                      background: '#fafafa',
                      color: '#faad14',
                      fontSize: 14,
                    }}
                  >
                    <RightOutlined />
                  </div>
                )}

                {/* 变更后 */}
                <div
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: isRemoved ? '#fafafa' : cfg.bg,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: cfg.color,
                      marginBottom: 2,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontWeight: 600,
                    }}
                  >
                    {isRemoved ? '已删除' : '变更后'}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      color: after == null ? '#d9d9d9' : cfg.color,
                      wordBreak: 'break-all',
                      maxHeight: 80,
                      overflow: 'auto',
                      lineHeight: 1.5,
                      fontWeight: isModified ? 600 : 400,
                    }}
                  >
                    {formatValue(after)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 操作日志信息卡片区块
 * @param {Object} props - 组件属性
 * @param {string} props.title - 区块标题
 * @param {React.ReactNode} props.icon - 标题图标
 * @param {React.ReactNode} props.children - 子内容
 * @param {Object} props.extra - 右侧附加内容
 * @returns {JSX.Element} 卡片区块
 */
const InfoSection = ({ title, icon, children, extra }) => (
  <div style={{ marginBottom: 16 }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingBottom: 6,
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Space size={6}>
        <span style={{ color: '#1677ff' }}>{icon}</span>
        <Text strong style={{ fontSize: 13 }}>
          {title}
        </Text>
      </Space>
      {extra}
    </div>
    {children}
  </div>
);

function OperationLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({
    module: null,
    operationType: null,
    keyword: '',
    dateRange: null,
    result: null,
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentLog, setCurrentLog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchLogs = useCallback(async (page = 1, pageSize = 20, currentFilters = filters) => {
    try {
      setLoading(true);
      const params = { page, pageSize };

      if (currentFilters.module) {
        params.module = currentFilters.module;
      }
      if (currentFilters.operationType) {
        params.operationType = currentFilters.operationType;
      }
      if (currentFilters.keyword) {
        params.keyword = currentFilters.keyword;
      }
      if (currentFilters.result) {
        params.result = currentFilters.result;
      }
      if (currentFilters.dateRange && currentFilters.dateRange.length === 2) {
        params.startDate = currentFilters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = currentFilters.dateRange[1].format('YYYY-MM-DD');
      }

      const response = await api.get('/operation-logs', { params });
      if (response.success) {
        setLogs(response.data.logs);
        setPagination(prev => ({
          ...prev,
          current: page,
          pageSize,
          total: response.data.total,
        }));
      }
    } catch (error) {
      message.error('获取操作日志失败');
      console.error('获取操作日志失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(1, pagination.pageSize, filters);
  }, []);

  const handleTableChange = (newPagination, tableFilters) => {
    fetchLogs(newPagination.current, newPagination.pageSize, filters);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchLogs(1, pagination.pageSize, newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      module: null,
      operationType: null,
      keyword: '',
      dateRange: null,
      result: null,
    };
    setFilters(clearedFilters);
    fetchLogs(1, pagination.pageSize, clearedFilters);
  };

  const handleViewDetail = async record => {
    setDetailLoading(true);
    setDetailVisible(true);
    try {
      const response = await api.get(`/operation-logs/${record.recordId}`);
      if (response.success) {
        setCurrentLog(response.data);
      }
    } catch (error) {
      message.error('获取日志详情失败');
      console.error('获取日志详情失败:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const getModuleTag = module => {
    const colors = {
      device: 'blue',
      idle_device: 'geekblue',
      user: 'green',
      role: 'purple',
      warehouse: 'volcano',
      room: 'magenta',
      rack: 'cyan',
      port: 'blue',
      network_card: 'cyan',
      cable: 'lime',
      consumable: 'orange',
      inventory: 'gold',
      ticket: 'red',
      auth: 'red',
      backup: 'gold',
      system: 'purple',
    };
    const names = {
      device: '设备',
      idle_device: '空闲设备',
      user: '用户',
      role: '角色',
      warehouse: '库房',
      room: '机房',
      rack: '机柜',
      port: '端口',
      network_card: '网卡',
      cable: '线缆',
      consumable: '耗材',
      inventory: '盘点',
      ticket: '工单',
      auth: '认证',
      backup: '备份',
      system: '系统设置',
    };
    return <Tag color={colors[module] || 'default'}>{names[module] || module}</Tag>;
  };

  const getOperationTag = type => {
    const colors = {
      create: 'green',
      update: 'blue',
      delete: 'red',
      batch_create: 'green',
      batch_delete: 'red',
      batch_update: 'orange',
      batch_warranty_update: 'orange',
      batch_to_idle: 'geekblue',
      batch_restore: 'geekblue',
      status_change: 'cyan',
      move: 'purple',
      permission_change: 'gold',
      to_idle: 'geekblue',
      shelve: 'blue',
      restore: 'volcano',
      import: 'lime',
      import_preview: 'lime',
      import_records: 'lime',
      export: 'lime',
      update_position: 'purple',
      update_layout: 'purple',
      update_rack_position: 'purple',
      init_layout: 'magenta',
      login: 'green',
      logout: 'default',
      register: 'green',
      unlock: 'gold',
      change_password: 'gold',
      update_profile: 'blue',
      upload: 'lime',
      download: 'lime',
      clean: 'orange',
      update_settings: 'blue',
      reset: 'orange',
      maintenance_mode: 'red',
      backup: 'gold',
      restart: 'red',
      adjust: 'cyan',
      stock_in: 'green',
      stock_out: 'orange',
      start: 'green',
      check: 'cyan',
      complete: 'green',
      sync: 'blue',
      evaluate: 'purple',
      process: 'cyan',
    };
    const names = {
      create: '创建',
      update: '更新',
      delete: '删除',
      batch_create: '批量创建',
      batch_delete: '批量删除',
      batch_update: '批量更新',
      batch_warranty_update: '批量保修更新',
      batch_to_idle: '批量转入空闲',
      batch_restore: '批量上架',
      status_change: '状态变更',
      move: '移动',
      permission_change: '权限变更',
      to_idle: '转入空闲',
      shelve: '上架',
      restore: '恢复',
      import: '导入',
      import_preview: '导入预览',
      import_records: '导入记录',
      export: '导出',
      update_position: '位置调整',
      update_layout: '更新布局',
      update_rack_position: '调整机柜位置',
      init_layout: '初始化布局',
      login: '登录',
      logout: '登出',
      register: '注册',
      unlock: '解锁',
      change_password: '修改密码',
      update_profile: '更新资料',
      upload: '上传',
      download: '下载',
      clean: '清理',
      update_settings: '更新设置',
      reset: '重置',
      maintenance_mode: '维护模式',
      backup: '备份',
      restart: '重启',
      adjust: '库存调整',
      stock_in: '入库',
      stock_out: '出库',
      start: '启动',
      check: '盘点检查',
      complete: '完成',
      sync: '同步',
      evaluate: '评价',
      process: '流程处理',
    };
    return <Tag color={colors[type] || 'default'}>{names[type] || type}</Tag>;
  };

  const getResultTag = result => {
    return result === 'success' ? <Tag color="success">成功</Tag> : <Tag color="error">失败</Tag>;
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: date => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 100,
      render: module => getModuleTag(module),
    },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 120,
      render: type => getOperationTag(type),
    },
    {
      title: '操作描述',
      dataIndex: 'operationDescription',
      key: 'operationDescription',
      render: (text, record) => <DescriptionCell text={text} record={record} />,
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: ip => ip || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  const hasFilters =
    filters.module ||
    filters.operationType ||
    filters.keyword ||
    filters.dateRange ||
    filters.result;

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>操作日志审计</span>
          </Space>
        }
        extra={
          <Space>
            <Text type="secondary">共 {pagination.total} 条记录</Text>
          </Space>
        }
      >
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col flex="200px">
              <Select
                placeholder="选择模块"
                allowClear
                style={{ width: '100%', ...selectStyles }}
                value={filters.module}
                onChange={value => handleFilterChange('module', value)}
              >
                {MODULE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col flex="200px">
              <Select
                placeholder="选择操作类型"
                allowClear
                style={{ width: '100%', ...selectStyles }}
                value={filters.operationType}
                onChange={value => handleFilterChange('operationType', value)}
              >
                {OPERATION_TYPE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col flex="200px">
              <Select
                placeholder="选择结果"
                allowClear
                style={{ width: '100%', ...selectStyles }}
                value={filters.result}
                onChange={value => handleFilterChange('result', value)}
              >
                {RESULT_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col flex="auto">
              <Input
                placeholder={inputPlaceholders.keyword || '搜索操作描述/对象/操作人'}
                prefix={<SearchOutlined />}
                style={{ ...filterInputStyles }}
                value={filters.keyword}
                onChange={e => handleFilterChange('keyword', e.target.value)}
                allowClear
              />
            </Col>
            <Col flex="280px">
              <RangePicker
                style={{ width: '100%' }}
                value={filters.dateRange}
                onChange={dates => handleFilterChange('dateRange', dates)}
                placeholder={['开始日期', '结束日期']}
              />
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => fetchLogs(1, pagination.pageSize, filters)}
                >
                  筛选
                </Button>
                {hasFilters && (
                  <Button icon={<ClearOutlined />} onClick={handleClearFilters}>
                    清除
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        <Table
          columns={columns}
          dataSource={logs}
          loading={loading}
          rowKey="recordId"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: total => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Drawer
        title="操作日志详情"
        placement="right"
        width={680}
        onClose={() => {
          setDetailVisible(false);
          setCurrentLog(null);
        }}
        open={detailVisible}
        extra={
          currentLog && (
            <Space>
              {getModuleTag(currentLog.module)}
              {getOperationTag(currentLog.operationType)}
              {getResultTag(currentLog.result)}
            </Space>
          )
        }
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : currentLog ? (
          <div>
            {/* 概要区：一句话说清谁在何时做了什么 */}
            <div
              style={{
                background:
                  currentLog.result === 'success'
                    ? 'linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)'
                    : 'linear-gradient(135deg, #fff2f0 0%, #ffffff 100%)',
                border: `1px solid ${
                  currentLog.result === 'success' ? '#b7eb8f' : '#ffccc7'
                }`,
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                {currentLog.result === 'success' ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18, marginTop: 3 }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18, marginTop: 3 }} />
                )}
                <Text strong style={{ fontSize: 14, lineHeight: 1.6, flex: 1 }}>
                  {currentLog.operationDescription ||
                    currentLog.metadata?.rawDescription ||
                    '无操作描述'}
                </Text>
              </div>
              {currentLog.metadata?.rawDescription &&
                currentLog.metadata.rawDescription !== currentLog.operationDescription && (
                  <div style={{ color: '#8c8c8c', fontSize: 12, paddingLeft: 26, marginBottom: 6 }}>
                    动作简述：{currentLog.metadata.rawDescription}
                  </div>
                )}
              <div style={{ color: '#595959', fontSize: 13, paddingLeft: 26 }}>
                <Space split={<span style={{ color: '#d9d9d9' }}>·</span>}>
                  <span>
                    <UserOutlined style={{ marginRight: 4 }} />
                    {currentLog.operatorName || '未知'}
                  </span>
                  <span>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {dayjs(currentLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </span>
                  {currentLog.targetName && <span>对象：{currentLog.targetName}</span>}
                </Space>
              </div>
            </div>

            {/* 操作人信息 */}
            <InfoSection title="操作人" icon={<UserOutlined />}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="姓名">
                  {currentLog.operatorName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="角色">
                  {currentLog.operatorRole || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="ID">
                  <Text code copyable style={{ fontSize: 12 }}>
                    {currentLog.operatorId || '-'}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </InfoSection>

            {/* 操作对象 */}
            <InfoSection title="操作对象" icon={<ProfileOutlined />}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="模块">
                  {getModuleTag(currentLog.module)}
                </Descriptions.Item>
                <Descriptions.Item label="类型">
                  {getOperationTag(currentLog.operationType)}
                </Descriptions.Item>
                <Descriptions.Item label="目标名称">
                  {currentLog.targetName || '-'}
                </Descriptions.Item>
                {currentLog.targetId && (
                  <Descriptions.Item label="目标ID">
                    <Text code copyable style={{ fontSize: 12 }}>
                      {currentLog.targetId}
                    </Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </InfoSection>

            {/* 客户端信息 */}
            <InfoSection title="客户端信息" icon={<DesktopOutlined />}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="IP地址">
                  {currentLog.ipAddress ? (
                    <Text code copyable>
                      {currentLog.ipAddress}
                    </Text>
                  ) : (
                    '-'
                  )}
                </Descriptions.Item>
                {currentLog.userAgent && (
                  <Descriptions.Item label="User-Agent">
                    <Tooltip title={currentLog.userAgent}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#8c8c8c',
                          display: 'inline-block',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          verticalAlign: 'middle',
                        }}
                      >
                        {currentLog.userAgent}
                      </Text>
                    </Tooltip>
                  </Descriptions.Item>
                )}
                {currentLog.requestId && (
                  <Descriptions.Item label="请求ID">
                    <Text code copyable style={{ fontSize: 12 }}>
                      {currentLog.requestId}
                    </Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </InfoSection>

            {/* 状态变更对比 */}
            {currentLog.beforeState != null || currentLog.afterState != null ? (
              <InfoSection
                title="状态变更"
                icon={<DiffOutlined />}
              >
                <StateDiffView
                  beforeState={currentLog.beforeState}
                  afterState={currentLog.afterState}
                />
              </InfoSection>
            ) : null}

            {/* 扩展信息 */}
            {currentLog.metadata != null &&
              typeof currentLog.metadata === 'object' &&
              Object.keys(currentLog.metadata).length > 0 && (
                <InfoSection title="扩展信息" icon={<FileTextOutlined />}>
                  <JsonBlock data={currentLog.metadata} title="扩展信息" color="#722ed1" />
                </InfoSection>
              )}

            {/* 日志元数据 */}
            <div
              style={{
                marginTop: 20,
                paddingTop: 12,
                borderTop: '1px dashed #f0f0f0',
                color: '#bfbfbf',
                fontSize: 11,
                textAlign: 'right',
              }}
            >
              日志ID：{currentLog.recordId}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

export default OperationLogs;
