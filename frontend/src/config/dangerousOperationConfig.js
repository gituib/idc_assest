export const RISK_LEVEL = {
  EXTREME: 'EXTREME',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

export const RISK_CONFIG = {
  [RISK_LEVEL.EXTREME]: {
    title: '⚠️ 极高危险操作',
    color: '#ff4d4f',
    bgColor: '#fff2f0',
    borderColor: '#ffccc7',
    requireKeyword: true,
    keyword: 'CONFIRM',
    showImpactDetails: true,
    icon: '🔥',
  },
  [RISK_LEVEL.HIGH]: {
    title: '⚠️ 高风险操作',
    color: '#fa8c16',
    bgColor: '#fff7e6',
    borderColor: '#ffd591',
    requireKeyword: false,
    showImpactDetails: true,
    icon: '⚡',
  },
  [RISK_LEVEL.MEDIUM]: {
    title: '⚡ 操作确认',
    color: '#1890ff',
    bgColor: '#e6f7ff',
    borderColor: '#91d5ff',
    requireKeyword: false,
    showImpactDetails: false,
    icon: '💡',
  },
  [RISK_LEVEL.LOW]: {
    title: '确认操作',
    color: '#52c41a',
    bgColor: '#f6ffed',
    borderColor: '#b7eb8f',
    requireKeyword: false,
    showImpactDetails: false,
    icon: '✓',
  },
};

export const OPERATION_TYPES = {
  DELETE_SINGLE: 'DELETE_SINGLE',
  DELETE_BATCH: 'DELETE_BATCH',
  DELETE_ALL: 'DELETE_ALL',
  UPDATE_BATCH: 'UPDATE_BATCH',
  RESTORE: 'RESTORE',
  PURGE: 'PURGE',
};

export const getRiskLevel = (operationType, itemCount = 1, options = {}) => {
  const { hasRelatedData = false, isSystemLevel = false } = options;

  if (operationType === OPERATION_TYPES.DELETE_ALL || isSystemLevel) {
    return RISK_LEVEL.EXTREME;
  }

  if (operationType === OPERATION_TYPES.DELETE_BATCH) {
    if (itemCount > 10) {
      return RISK_LEVEL.EXTREME;
    }
    return itemCount > 3 ? RISK_LEVEL.HIGH : RISK_LEVEL.MEDIUM;
  }

  if (hasRelatedData) {
    return RISK_LEVEL.MEDIUM;
  }

  return RISK_LEVEL.LOW;
};

export const OPERATION_LABELS = {
  [OPERATION_TYPES.DELETE_SINGLE]: '删除',
  [OPERATION_TYPES.DELETE_BATCH]: '批量删除',
  [OPERATION_TYPES.DELETE_ALL]: '删除所有',
  [OPERATION_TYPES.UPDATE_BATCH]: '批量更新',
  [OPERATION_TYPES.RESTORE]: '恢复',
  [OPERATION_TYPES.PURGE]: '清除',
};

export const ENTITY_LABELS = {
  device: '设备',
  devices: '设备',
  rack: '机柜',
  racks: '机柜',
  room: '机房',
  rooms: '机房',
  cable: '接线',
  cables: '接线',
  port: '端口',
  ports: '端口',
  networkCard: '网卡',
  networkCards: '网卡',
  user: '用户',
  users: '用户',
  role: '角色',
  roles: '角色',
  consumable: '耗材',
  consumables: '耗材',
  ticket: '工单',
  tickets: '工单',
  category: '分类',
  categories: '分类',
  idleDevice: '空闲设备',
  idleDevices: '空闲设备',
  pendingDevice: '待同步设备',
  pendingDevices: '待同步设备',
  inventoryPlan: '盘点计划',
  inventoryPlans: '盘点计划',
  backup: '备份',
  backups: '备份',
};
