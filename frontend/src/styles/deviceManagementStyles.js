/**
 * 设备管理页面样式配置
 * 集中管理所有内联样式对象
 */

import { designTokens } from '../config/theme';

const { colors, shadows, borderRadius, transitions, spacing } = designTokens;

// 页面容器样式
export const pageContainerStyle = {
  minHeight: '100vh',
  background: colors.background.secondary,
  padding: spacing.lg,
};

// 头部样式
export const headerStyle = {
  marginBottom: spacing.lg,
};

// 标题行样式
export const titleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: spacing.lg,
  flexWrap: 'wrap',
  gap: spacing.md,
};

// 标题区域样式
export const titleSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
};

// 标题图标样式
export const titleIconStyle = {
  width: '44px',
  height: '44px',
  borderRadius: borderRadius.medium,
  background: colors.primary.gradient,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: shadows.medium,
};

// 标题文本样式
export const titleTextStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

// 页面标题样式
export const pageTitleStyle = {
  fontSize: '22px',
  fontWeight: '700',
  margin: 0,
  color: colors.text.primary,
  lineHeight: 1.2,
};

// 页面副标题样式
export const pageSubtitleStyle = {
  fontSize: '13px',
  color: colors.text.secondary,
  margin: 0,
};

// 操作按钮基础样式
export const actionButtonStyle = {
  height: '36px',
  borderRadius: borderRadius.small,
  fontSize: '13px',
  fontWeight: '500',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};

// 主要操作按钮样式
export const primaryActionStyle = {
  ...actionButtonStyle,
  background: colors.primary.gradient,
  border: 'none',
  color: '#ffffff !important',
  boxShadow: shadows.small,
};

// 次要操作按钮样式
export const secondaryActionStyle = {
  ...actionButtonStyle,
  background: colors.background.primary,
  border: `1px solid ${colors.border.light}`,
  color: colors.text.primary,
};

// 危险操作按钮样式
export const dangerActionStyle = {
  ...actionButtonStyle,
  background: colors.error.main,
  border: 'none',
  color: '#ffffff',
};

// 主要按钮样式（大）
export const primaryButtonStyle = {
  height: '40px',
  borderRadius: borderRadius.small,
  background: colors.primary.gradient,
  border: 'none',
  color: '#ffffff',
  boxShadow: shadows.small,
  fontWeight: '500',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// 统计卡片行样式
export const statsRowStyle = {
  display: 'flex',
  gap: spacing.md,
  marginBottom: spacing.lg,
  flexWrap: 'wrap',
};

// 统计卡片基础样式
export const statCardStyle = {
  flex: 1,
  minWidth: '140px',
  maxWidth: '200px',
  padding: `${spacing.md} ${spacing.lg}`,
  background: colors.background.primary,
  borderRadius: borderRadius.medium,
  border: `1px solid ${colors.border.light}`,
  boxShadow: shadows.small,
  transition: `all ${transitions.fast}`,
};

// 统计数值样式
export const statValueStyle = {
  fontSize: '24px',
  fontWeight: '700',
  color: colors.text.primary,
  lineHeight: 1.2,
};

// 统计标签样式
export const statLabelStyle = {
  fontSize: '12px',
  color: colors.text.secondary,
  marginTop: '4px',
};

// 运行中状态统计卡片样式
export const statCardRunningStyle = {
  ...statCardStyle,
  borderLeft: `3px solid ${colors.success.main}`,
  background: `${colors.success.main}08`,
};

// 维护中状态统计卡片样式
export const statCardMaintenanceStyle = {
  ...statCardStyle,
  borderLeft: `3px solid ${colors.warning.main}`,
  background: `${colors.warning.main}08`,
};

// 故障状态统计卡片样式
export const statCardFaultStyle = {
  ...statCardStyle,
  borderLeft: `3px solid ${colors.error.main}`,
  background: `${colors.error.main}08`,
};

// 卡片基础样式
export const cardStyle = {
  borderRadius: borderRadius.large,
  border: 'none',
  boxShadow: shadows.medium,
  overflow: 'hidden',
  background: colors.background.primary,
};

// 筛选卡片样式
export const filterCardStyle = {
  borderRadius: borderRadius.medium,
  border: 'none',
  boxShadow: shadows.small,
  background: colors.background.primary,
  marginBottom: spacing.lg,
};

// 模态框头部样式
export const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  fontSize: '18px',
  fontWeight: '600',
};

// 表格样式常量
export const tableStyles = {
  // 表格容器样式
  wrapper: {
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
  },

  // 空状态样式
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: colors.text.secondary,
    fontSize: '15px',
  },

  // 空状态图标样式
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    color: colors.border.light,
  },
};

// 搜索输入框样式
export const searchInputStyle = {
  width: '280px',
  borderRadius: borderRadius.medium,
  border: `1px solid ${colors.border.light}`,
  transition: `all ${transitions.fast}`,
};

// 选择器样式
export const selectStyle = {
  borderRadius: borderRadius.medium,
};

// 下拉菜单样式
export const dropdownStyle = {
  borderRadius: borderRadius.medium,
};

// 刷新按钮样式
export const refreshButtonStyle = {
  borderRadius: borderRadius.medium,
  border: `1px solid ${colors.border.light}`,
  height: '36px',
};

// 搜索按钮样式
export const searchButtonStyle = {
  height: '36px',
  borderRadius: borderRadius.medium,
  background: colors.primary.gradient,
  border: 'none',
  boxShadow: shadows.small,
};

// 重置按钮样式
export const resetButtonStyle = {
  height: '36px',
  borderRadius: borderRadius.medium,
  border: `1px solid ${colors.border.light}`,
};

// 导入模态框样式
export const importModalStyles = {
  // 说明区域样式
  description: {
    marginBottom: '20px',
    padding: '16px',
    background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)',
    borderRadius: '12px',
    border: '1px solid #f0f0f0',
  },

  // 标题样式
  title: {
    fontWeight: '600',
    marginBottom: '8px',
    color: '#333',
  },

  // 列表样式
  list: {
    paddingLeft: '20px',
    marginBottom: '10px',
    color: '#666',
    fontSize: '13px',
    marginTop: '12px',
  },

  // 进度容器样式
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
  },

  // 进度图标样式
  progressIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: colors.primary.gradient,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px',
    color: '#fff',
    fontSize: '20px',
  },

  // 进度信息样式
  progressInfo: {
    title: {
      margin: '0 0 4px 0',
      fontWeight: '600',
      color: '#333',
      fontSize: '16px',
    },
    phase: {
      margin: 0,
      color: colors.primary.main,
      fontSize: '14px',
    },
  },

  // 结果卡片样式
  resultCard: type => ({
    padding: '12px',
    background:
      type === 'total'
        ? colors.primary.gradient
        : type === 'success'
          ? 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)'
          : 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
    borderRadius: '8px',
    color: '#fff',
    textAlign: 'center',
  }),

  // 结果数值样式
  resultValue: {
    fontSize: '24px',
    fontWeight: '700',
  },

  // 结果标签样式
  resultLabel: {
    fontSize: '12px',
    opacity: 0.9,
  },
};

// 详情模态框样式
export const detailModalStyles = {
  // 信息项样式
  infoItem: {
    label: {
      fontWeight: '500',
      color: '#666',
    },
    value: {
      marginLeft: 8,
      color: '#333',
    },
  },

  // 描述区域样式
  description: {
    marginTop: '16px',
  },

  // 描述内容样式
  descriptionContent: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#fafafa',
    borderRadius: '8px',
    color: '#333',
  },
};

// 导出模态框样式
export const exportModalStyles = {
  // 字段选择区域样式
  fieldSelector: {
    maxHeight: '300px',
    overflow: 'auto',
    border: '1px solid #f0f0f0',
    borderRadius: '8px',
    padding: '12px',
  },

  // 字段项样式
  fieldItem: {
    marginBottom: '8px',
  },
};

// 空状态样式
export const emptyStateStyle = {
  textAlign: 'center',
  padding: '60px 20px',
  fontSize: '15px',
};

// 空状态图标样式
export const emptyStateIconStyle = {
  fontSize: '48px',
  marginBottom: '16px',
};

// 表格容器样式
export const tableContainerStyle = {
  borderRadius: borderRadius.medium,
  overflow: 'hidden',
};

// ResizableTitle 组件样式
export const resizableTitleStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  text: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resizeHandle: {
    width: '8px',
    height: '20px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    cursor: 'col-resize',
    marginLeft: '8px',
    flexShrink: 0,
  },
};

// ============================================
// 输入框统一样式配置
// ============================================

// 输入框基础样式
export const inputStyles = {
  // 基础输入框样式
  base: {
    height: '40px',
    borderRadius: borderRadius.medium,
    border: `1px solid ${colors.border.light}`,
    fontSize: '14px',
    transition: `all ${transitions.fast}`,
  },

  // 搜索输入框样式
  search: {
    height: '40px',
    borderRadius: borderRadius.medium,
    border: `1px solid ${colors.border.light}`,
    fontSize: '14px',
    transition: `all ${transitions.fast}`,
    backgroundColor: colors.background.primary,
  },

  // 表单输入框样式
  form: {
    height: '40px',
    borderRadius: borderRadius.medium,
    border: `1px solid ${colors.border.light}`,
    fontSize: '14px',
    transition: `all ${transitions.fast}`,
  },

  // 小尺寸输入框
  small: {
    height: '32px',
    borderRadius: borderRadius.small,
    fontSize: '13px',
  },

  // 大尺寸输入框
  large: {
    height: '48px',
    borderRadius: borderRadius.medium,
    fontSize: '16px',
  },

  // 禁用状态
  disabled: {
    backgroundColor: colors.background.tertiary,
    color: colors.text.tertiary,
    cursor: 'not-allowed',
  },

  // 错误状态
  error: {
    borderColor: colors.error.main,
    boxShadow: `0 0 0 2px ${colors.error.main}20`,
  },

  // 焦点状态
  focus: {
    borderColor: colors.primary.main,
    boxShadow: `0 0 0 3px ${colors.primary.main}15`,
  },
};

// Select 选择器样式
export const selectStyles = {
  // 基础选择器样式
  base: {
    height: '40px',
    borderRadius: borderRadius.medium,
    fontSize: '14px',
  },

  // 小尺寸选择器
  small: {
    height: '32px',
    borderRadius: borderRadius.small,
    fontSize: '13px',
  },

  // 大尺寸选择器
  large: {
    height: '48px',
    borderRadius: borderRadius.medium,
    fontSize: '16px',
  },

  // 下拉菜单样式
  dropdown: {
    borderRadius: borderRadius.medium,
    boxShadow: shadows.large,
    border: `1px solid ${colors.border.light}`,
  },

  // 选项样式
  option: {
    padding: '8px 12px',
    fontSize: '14px',
    transition: `background-color ${transitions.fast}`,
  },
};

// InputNumber 数字输入框样式
export const inputNumberStyles = {
  // 基础样式
  base: {
    width: '100%',
    height: '40px',
    borderRadius: borderRadius.medium,
    border: `1px solid ${colors.border.light}`,
    fontSize: '14px',
  },

  // 小尺寸
  small: {
    height: '32px',
    borderRadius: borderRadius.small,
    fontSize: '13px',
  },

  // 大尺寸
  large: {
    height: '48px',
    borderRadius: borderRadius.medium,
    fontSize: '16px',
  },
};

// TextArea 文本域样式
export const textAreaStyles = {
  // 基础样式
  base: {
    borderRadius: borderRadius.medium,
    border: `1px solid ${colors.border.light}`,
    fontSize: '14px',
    padding: '10px 12px',
    transition: `all ${transitions.fast}`,
    resize: 'vertical',
    minHeight: '80px',
  },

  // 小尺寸
  small: {
    fontSize: '13px',
    padding: '8px 10px',
    minHeight: '60px',
  },

  // 大尺寸
  large: {
    fontSize: '16px',
    padding: '12px 14px',
    minHeight: '100px',
  },
};

// DatePicker 日期选择器样式
export const datePickerStyles = {
  // 基础样式
  base: {
    height: '40px',
    borderRadius: borderRadius.medium,
    border: `1px solid ${colors.border.light}`,
    fontSize: '14px',
    width: '100%',
  },

  // 小尺寸
  small: {
    height: '32px',
    borderRadius: borderRadius.small,
    fontSize: '13px',
  },

  // 大尺寸
  large: {
    height: '48px',
    borderRadius: borderRadius.medium,
    fontSize: '16px',
  },

  // 范围选择器
  range: {
    height: '40px',
    borderRadius: borderRadius.medium,
    border: `1px solid ${colors.border.light}`,
    fontSize: '14px',
  },
};

// 表单标签样式
export const formLabelStyles = {
  // 基础标签样式
  base: {
    fontSize: '14px',
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: '6px',
    display: 'block',
  },

  // 必填标签样式
  required: {
    fontSize: '14px',
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: '6px',
  },

  // 小标签
  small: {
    fontSize: '13px',
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: '4px',
  },
};

// 表单项样式
export const formItemStyles = {
  // 基础表单项
  base: {
    marginBottom: '20px',
  },

  // 紧凑表单项
  compact: {
    marginBottom: '12px',
  },

  // 错误状态
  error: {
    marginBottom: '20px',
  },

  // 错误提示文字
  errorText: {
    color: colors.error.main,
    fontSize: '12px',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
};

// 过滤器区域输入框样式
export const filterInputStyles = {
  // 过滤器输入框容器
  container: {
    marginBottom: '6px',
    fontSize: '13px',
    color: colors.text.secondary,
    fontWeight: '500',
  },

  // 过滤器输入框
  input: {
    height: '40px',
    borderRadius: borderRadius.medium,
    border: `1px solid ${colors.border.light}`,
    fontSize: '14px',
    width: '100%',
  },

  // 过滤器选择器
  select: {
    height: '40px',
    borderRadius: borderRadius.medium,
    fontSize: '14px',
    width: '100%',
  },
};

// 输入框验证规则配置
export const inputValidationRules = {
  // 必填规则
  required: (message = '此字段为必填项') => ({
    required: true,
    message,
  }),

  // 最大长度规则
  maxLength: (max, message) => ({
    max,
    message: message || `不能超过${max}个字符`,
  }),

  // 最小长度规则
  minLength: (min, message) => ({
    min,
    message: message || `不能少于${min}个字符`,
  }),

  // 数字范围规则
  numberRange: (min, max, message) => ({
    type: 'number',
    min,
    max,
    message: message || `数值应在${min}到${max}之间`,
  }),

  // 正整数规则
  positiveInteger: () => ({
    pattern: /^\d+$/,
    message: '请输入正整数',
  }),

  // 价格规则（两位小数）
  price: () => ({
    pattern: /^\d+(\.\d{1,2})?$/,
    message: '请输入有效的价格（最多两位小数）',
  }),

  // 邮箱规则
  email: () => ({
    type: 'email',
    message: '请输入有效的邮箱地址',
  }),

  // 手机号规则
  phone: () => ({
    pattern: /^1[3-9]\d{9}$/,
    message: '请输入有效的手机号码',
  }),
};

// 输入框占位符文本配置
export const inputPlaceholders = {
  // 耗材相关
  consumableName: '请输入耗材名称',
  consumableId: '请输入耗材ID',
  category: '请选择分类',
  unit: '如: 个、盒、卷、箱',
  stock: '请输入库存数量',
  minStock: '请输入最小库存',
  maxStock: '请输入最大库存',
  unitPrice: '请输入单价',
  supplier: '请输入供应商名称',
  location: '如: A柜-01层、B区货架3',
  description: '请输入描述信息',
  operator: '请输入操作人姓名',
  reason: '请输入原因',
  notes: '请输入备注信息',
  snList: '输入SN后按回车添加',

  // 搜索相关
  search: '搜索...',
  searchConsumable: '搜索耗材ID、名称、分类、供应商',
  searchCategory: '搜索分类名称、描述',

  // 日期相关
  dateRange: ['开始日期', '结束日期'],

  // 通用
  select: '请选择',
  input: '请输入',
};

// CSS-in-JS 样式字符串生成函数
export const generateGlobalStyles = tokens => `
  /* Modal 关闭按钮通用修复 */
  .ant-modal-close {
    top: 16px !important;
    right: 16px !important;
    width: 32px !important;
    height: 32px !important;
    line-height: 32px !important;
  }
  
  .ant-modal-close-x {
    width: 32px !important;
    height: 32px !important;
    line-height: 32px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  
  .device-modal .ant-modal-close {
    top: 16px;
    right: 24px;
    width: 32px;
    height: 32px;
    display: flex;
    alignItems: center;
    justifyContent: center;
  }
  
  .device-modal .ant-modal-close-x {
    font-size: 16px;
    line-height: 1;
    display: flex;
    alignItems: center;
    justifyContent: center;
  }
  
  .device-table-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  
  .device-table-wrapper .ant-table {
    width: 100% !important;
    max-width: 100% !important;
  }
  
  .device-table-wrapper .ant-table-container {
    width: 100% !important;
    max-width: 100% !important;
    display: flex;
    flex-direction: column;
  }
  
  .device-table-wrapper .ant-table-content {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }
  
  .device-table-wrapper .ant-table-thead {
    flex-shrink: 0;
  }
  
  .device-table-wrapper .ant-table-thead > tr > th {
    white-space: normal !important;
    word-break: break-word !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    line-height: 1.4 !important;
    padding: 14px 12px !important;
    background: ${tokens.colors.background.tertiary} !important;
    color: ${tokens.colors.text.primary} !important;
    border-bottom: 1px solid ${tokens.colors.border.light} !important;
  }
  
  .device-table-wrapper .ant-table-tbody {
    flex-shrink: 1;
    min-height: 0;
  }
  
  .device-table-wrapper .ant-table-tbody > tr > td {
    white-space: normal !important;
    word-break: break-word !important;
    line-height: 1.6 !important;
    max-width: 250px !important;
    padding: 12px !important;
    border-bottom: 1px solid ${tokens.colors.border.light} !important;
  }
  
  .device-table-wrapper .ant-table-tbody > tr > td .ant-typography,
  .device-table-wrapper .ant-table-tbody > tr > td .ant-typography-expand,
  .device-table-wrapper .ant-table-tbody > tr > td span {
    white-space: normal !important;
    word-break: break-word !important;
  }
  
  .device-table-wrapper .ant-table-cell {
    word-break: break-word !important;
  }
  
  .device-table-wrapper .ant-table-row-even {
    background-color: ${tokens.colors.background.primary};
  }
  
  .device-table-wrapper .ant-table-row-odd {
    background-color: ${tokens.colors.background.secondary};
  }
  
  .device-table-wrapper .ant-table-row-selected {
    background-color: ${tokens.colors.primary.main}15 !important;
  }
  
  .device-table-wrapper .ant-table-row-selected:hover > td {
    background-color: ${tokens.colors.primary.main}25 !important;
  }
  
  .device-table-wrapper .ant-table-tbody > tr:hover > td {
    background-color: ${tokens.colors.background.tertiary} !important;
  }
  
  .device-table-wrapper .ant-table-selection-column {
    position: sticky !important;
    left: 0 !important;
    z-index: 2 !important;
    background: inherit !important;
  }
  
  .device-table-wrapper .ant-table-tbody > tr > td:last-child {
    min-width: 120px !important;
    max-width: 150px !important;
  }
  
  .device-table-wrapper .ant-pagination {
    margin: 16px 0 !important;
    flex-wrap: wrap !important;
    justify-content: center !important;
    padding: 12px 16px !important;
    background: ${tokens.colors.background.primary};
    border-radius: ${tokens.borderRadius.medium};
    margin-top: 16px !important;
  }
  
  .device-table-wrapper .ant-pagination-item-active {
    background: ${tokens.colors.primary.gradient} !important;
    border: none !important;
  }
  
  .device-table-wrapper .ant-pagination-item-active a {
    color: #ffffff !important;
  }
  
  .device-table-wrapper .ant-table-cell-fix-left,
  .device-table-wrapper .ant-table-cell-fix-right {
    background: inherit !important;
  }
  
  /* 表单输入框增强样式 */
  .form-input-enhanced:hover {
    border-color: ${tokens.colors.primary.main} !important;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1) !important;
  }
  
  .form-input-enhanced:focus,
  .form-input-enhanced.ant-input-focused,
  .form-input-enhanced.ant-select-focused .ant-select-selector,
  .form-input-enhanced.ant-input-number-focused {
    border-color: ${tokens.colors.primary.main} !important;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
  }
  
  /* 表单项标签增强 */
  .device-modal .ant-form-item-label > label {
    font-weight: 500;
    color: ${tokens.colors.text.primary};
    font-size: 14px;
  }
  
  /* 表单项间距优化 */
  .device-modal .ant-form-item {
    margin-bottom: 20px;
  }
  
  /* 必填项标识动画 */
  .device-modal .ant-form-item-label > label::after {
    content: '';
  }
  
  @media screen and (max-width: 768px) {
    .device-table-wrapper .ant-table-tbody > tr > td {
      max-width: 150px !important;
      font-size: 13px !important;
    }
    
    .device-table-wrapper .ant-table-thead > tr > th {
      font-size: 13px !important;
    }
  }
  
  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: flex-start !important;
      gap: 16px !important;
    }
    
    .stat-cards {
      flex-wrap: wrap;
    }
    
    .stat-card {
      min-width: calc(50% - 8px) !important;
    }
  }
  
  @media (max-width: 480px) {
    .stat-card {
      min-width: 100% !important;
    }
    
    .filter-form .ant-form-item {
      margin-bottom: 12px !important;
    }
  }
`;
