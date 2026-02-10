/**
 * 设备管理页面常量配置
 * 集中管理分页、延迟、字段等配置
 */

// 分页配置
export const PAGINATION_CONFIG = {
  // 默认每页条数
  defaultPageSize: 10,
  // 可选每页条数
  pageSizeOptions: ['10', '20', '30', '50', '100'],
  // 显示快速跳转
  showSizeChanger: true,
  // 显示总数
  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
};

// 搜索防抖延迟（毫秒）
export const DEBOUNCE_DELAY = 300;

// 表格滚动配置
export const TABLE_SCROLL_CONFIG = {
  x: 'max-content',
  y: 'calc(100vh - 400px)'
};

// 默认设备字段配置
export const DEFAULT_DEVICE_FIELDS = [
  {
    fieldName: 'deviceId',
    displayName: '设备ID',
    fieldType: 'text',
    required: true,
    visible: true,
    editable: false
  },
  {
    fieldName: 'name',
    displayName: '设备名称',
    fieldType: 'text',
    required: true,
    visible: true,
    editable: true
  },
  {
    fieldName: 'type',
    displayName: '设备类型',
    fieldType: 'select',
    required: true,
    visible: true,
    editable: true,
    options: [
      { value: 'server', label: '服务器' },
      { value: 'switch', label: '交换机' },
      { value: 'router', label: '路由器' },
      { value: 'storage', label: '存储设备' },
      { value: 'other', label: '其他设备' }
    ]
  },
  {
    fieldName: 'model',
    displayName: '设备型号',
    fieldType: 'text',
    required: false,
    visible: true,
    editable: true
  },
  {
    fieldName: 'serialNumber',
    displayName: '序列号',
    fieldType: 'text',
    required: true,
    visible: true,
    editable: true
  },
  {
    fieldName: 'rackId',
    displayName: '所在机柜',
    fieldType: 'text',
    required: true,
    visible: true,
    editable: true
  },
  {
    fieldName: 'position',
    displayName: '位置(U)',
    fieldType: 'number',
    required: true,
    visible: true,
    editable: true
  },
  {
    fieldName: 'height',
    displayName: '高度(U)',
    fieldType: 'number',
    required: true,
    visible: true,
    editable: true
  },
  {
    fieldName: 'powerConsumption',
    displayName: '功率(W)',
    fieldType: 'number',
    required: false,
    visible: true,
    editable: true
  },
  {
    fieldName: 'ipAddress',
    displayName: 'IP地址',
    fieldType: 'text',
    required: false,
    visible: true,
    editable: true
  },
  {
    fieldName: 'status',
    displayName: '状态',
    fieldType: 'select',
    required: true,
    visible: true,
    editable: true,
    options: [
      { value: 'running', label: '运行中' },
      { value: 'maintenance', label: '维护中' },
      { value: 'offline', label: '离线' },
      { value: 'fault', label: '故障' }
    ]
  },
  {
    fieldName: 'purchaseDate',
    displayName: '购买日期',
    fieldType: 'date',
    required: false,
    visible: true,
    editable: true
  },
  {
    fieldName: 'warrantyExpiry',
    displayName: '保修日期',
    fieldType: 'date',
    required: false,
    visible: true,
    editable: true
  },
  {
    fieldName: 'description',
    displayName: '备注',
    fieldType: 'textarea',
    required: false,
    visible: true,
    editable: true
  }
];

// 基础字段名称列表（用于导入导出时排除自定义字段）
export const BASE_FIELD_NAMES = [
  'deviceId',
  'name',
  'type',
  'model',
  'serialNumber',
  'rackId',
  'position',
  'height',
  'powerConsumption',
  'ipAddress',
  'status',
  'purchaseDate',
  'warrantyExpiry',
  'description'
];

// 系统字段列表（不可编辑）
export const SYSTEM_FIELDS = ['createdAt', 'updatedAt', 'Rack', 'Room', 'customFields'];

// 固定字段列表（表格中必须显示的字段）
export const FIXED_FIELDS = ['name', 'type', 'status', 'rackId'];

// 导入配置
export const IMPORT_CONFIG = {
  // 支持的文件类型
  acceptedFileTypes: '.csv,.xlsx,.xls',
  // 最大文件大小（MB）
  maxFileSize: 10,
  // 单次最大导入条数
  maxImportCount: 5000,
  // 编码格式
  encoding: 'gbk'
};

// 导出配置
export const EXPORT_CONFIG = {
  // 默认文件名前缀
  fileNamePrefix: '设备列表',
  // 日期格式
  dateFormat: 'YYYY-MM-DD_HH-mm-ss',
  // 支持的导出格式
  formats: ['xlsx', 'csv']
};

// 模态框配置
export const MODAL_CONFIG = {
  // 添加设备模态框宽度
  addModalWidth: 900,
  // 编辑设备模态框宽度
  editModalWidth: 900,
  // 详情模态框宽度
  detailModalWidth: 700,
  // 导入模态框宽度
  importModalWidth: 600,
  // 导出模态框宽度
  exportModalWidth: 500
};

// 统计卡片配置
export const STATS_CONFIG = {
  // 显示的运行中设备数量上限（超过显示为 99+）
  maxRunningDisplay: 99,
  // 显示的维护中设备数量上限
  maxMaintenanceDisplay: 99,
  // 显示的故障设备数量上限
  maxFaultDisplay: 99
};

// 设备类型选项（用于筛选）
export const DEVICE_TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'server', label: '服务器' },
  { value: 'switch', label: '交换机' },
  { value: 'router', label: '路由器' },
  { value: 'storage', label: '存储设备' },
  { value: 'other', label: '其他设备' }
];

// 设备状态选项（用于筛选）
export const DEVICE_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'running', label: '运行中' },
  { value: 'maintenance', label: '维护中' },
  { value: 'offline', label: '离线' },
  { value: 'fault', label: '故障' }
];

// 表格列宽配置
export const COLUMN_WIDTH_CONFIG = {
  deviceId: 100,
  name: 150,
  type: 100,
  model: 120,
  serialNumber: 150,
  rackId: 150,
  position: 80,
  height: 80,
  powerConsumption: 100,
  ipAddress: 120,
  status: 100,
  purchaseDate: 110,
  warrantyExpiry: 110,
  description: 200,
  action: 150
};

// 空状态配置
export const EMPTY_STATE_CONFIG = {
  description: '暂无设备数据',
  image: 'https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg'
};

// 操作按钮配置
export const ACTION_BUTTON_CONFIG = {
  // 批量操作阈值（超过此数量显示确认对话框）
  batchConfirmThreshold: 10,
  // 批量删除确认消息
  batchDeleteConfirmMessage: (count) => `确定要删除选中的 ${count} 个设备吗？此操作不可恢复。`,
  // 单个删除确认消息
  singleDeleteConfirmMessage: (name) => `确定要删除设备 "${name}" 吗？此操作不可恢复。`
};
