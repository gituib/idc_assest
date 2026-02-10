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
  padding: spacing.lg
};

// 头部样式
export const headerStyle = {
  marginBottom: spacing.lg
};

// 标题行样式
export const titleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: spacing.lg,
  flexWrap: 'wrap',
  gap: spacing.md
};

// 标题区域样式
export const titleSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md
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
  boxShadow: shadows.medium
};

// 标题文本样式
export const titleTextStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px'
};

// 页面标题样式
export const pageTitleStyle = {
  fontSize: '22px',
  fontWeight: '700',
  margin: 0,
  color: colors.text.primary,
  lineHeight: 1.2
};

// 页面副标题样式
export const pageSubtitleStyle = {
  fontSize: '13px',
  color: colors.text.secondary,
  margin: 0
};

// 操作按钮基础样式
export const actionButtonStyle = {
  height: '36px',
  borderRadius: borderRadius.small,
  fontSize: '13px',
  fontWeight: '500',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px'
};

// 主要操作按钮样式
export const primaryActionStyle = {
  ...actionButtonStyle,
  background: colors.primary.gradient,
  border: 'none',
  color: '#ffffff !important',
  boxShadow: shadows.small
};

// 次要操作按钮样式
export const secondaryActionStyle = {
  ...actionButtonStyle,
  background: colors.background.primary,
  border: `1px solid ${colors.border.light}`,
  color: colors.text.primary
};

// 危险操作按钮样式
export const dangerActionStyle = {
  ...actionButtonStyle,
  background: colors.error.main,
  border: 'none',
  color: '#ffffff'
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
  justifyContent: 'center'
};

// 统计卡片行样式
export const statsRowStyle = {
  display: 'flex',
  gap: spacing.md,
  marginBottom: spacing.lg,
  flexWrap: 'wrap'
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
  transition: `all ${transitions.fast}`
};

// 统计数值样式
export const statValueStyle = {
  fontSize: '24px',
  fontWeight: '700',
  color: colors.text.primary,
  lineHeight: 1.2
};

// 统计标签样式
export const statLabelStyle = {
  fontSize: '12px',
  color: colors.text.secondary,
  marginTop: '4px'
};

// 运行中状态统计卡片样式
export const statCardRunningStyle = {
  ...statCardStyle,
  borderLeft: `3px solid ${colors.success.main}`,
  background: `${colors.success.main}08`
};

// 维护中状态统计卡片样式
export const statCardMaintenanceStyle = {
  ...statCardStyle,
  borderLeft: `3px solid ${colors.warning.main}`,
  background: `${colors.warning.main}08`
};

// 故障状态统计卡片样式
export const statCardFaultStyle = {
  ...statCardStyle,
  borderLeft: `3px solid ${colors.error.main}`,
  background: `${colors.error.main}08`
};

// 卡片基础样式
export const cardStyle = {
  borderRadius: borderRadius.large,
  border: 'none',
  boxShadow: shadows.medium,
  overflow: 'hidden',
  background: colors.background.primary
};

// 筛选卡片样式
export const filterCardStyle = {
  borderRadius: borderRadius.medium,
  border: 'none',
  boxShadow: shadows.small,
  background: colors.background.primary,
  marginBottom: spacing.lg
};

// 模态框头部样式
export const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  fontSize: '18px',
  fontWeight: '600'
};

// 表格样式常量
export const tableStyles = {
  // 表格容器样式
  wrapper: {
    borderRadius: borderRadius.medium,
    overflow: 'hidden'
  },
  
  // 空状态样式
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: colors.text.secondary,
    fontSize: '15px'
  },
  
  // 空状态图标样式
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    color: colors.border.light
  }
};

// 搜索输入框样式
export const searchInputStyle = {
  width: '280px',
  borderRadius: borderRadius.medium,
  border: `1px solid ${colors.border.light}`,
  transition: `all ${transitions.fast}`
};

// 选择器样式
export const selectStyle = {
  borderRadius: borderRadius.medium
};

// 下拉菜单样式
export const dropdownStyle = {
  borderRadius: borderRadius.medium
};

// 刷新按钮样式
export const refreshButtonStyle = {
  borderRadius: borderRadius.medium,
  border: `1px solid ${colors.border.light}`,
  height: '36px'
};

// 搜索按钮样式
export const searchButtonStyle = {
  height: '36px',
  borderRadius: borderRadius.medium,
  background: colors.primary.gradient,
  border: 'none',
  boxShadow: shadows.small
};

// 重置按钮样式
export const resetButtonStyle = {
  height: '36px',
  borderRadius: borderRadius.medium,
  border: `1px solid ${colors.border.light}`
};

// 导入模态框样式
export const importModalStyles = {
  // 说明区域样式
  description: {
    marginBottom: '20px',
    padding: '16px',
    background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)',
    borderRadius: '12px',
    border: '1px solid #f0f0f0'
  },
  
  // 标题样式
  title: {
    fontWeight: '600',
    marginBottom: '8px',
    color: '#333'
  },
  
  // 列表样式
  list: {
    paddingLeft: '20px',
    marginBottom: '10px',
    color: '#666',
    fontSize: '13px',
    marginTop: '12px'
  },
  
  // 进度容器样式
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px'
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
    fontSize: '20px'
  },
  
  // 进度信息样式
  progressInfo: {
    title: {
      margin: '0 0 4px 0',
      fontWeight: '600',
      color: '#333',
      fontSize: '16px'
    },
    phase: {
      margin: 0,
      color: colors.primary.main,
      fontSize: '14px'
    }
  },
  
  // 结果卡片样式
  resultCard: (type) => ({
    padding: '12px',
    background: type === 'total' ? colors.primary.gradient :
                type === 'success' ? 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' :
                'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
    borderRadius: '8px',
    color: '#fff',
    textAlign: 'center'
  }),
  
  // 结果数值样式
  resultValue: {
    fontSize: '24px',
    fontWeight: '700'
  },
  
  // 结果标签样式
  resultLabel: {
    fontSize: '12px',
    opacity: 0.9
  }
};

// 详情模态框样式
export const detailModalStyles = {
  // 信息项样式
  infoItem: {
    label: {
      fontWeight: '500',
      color: '#666'
    },
    value: {
      marginLeft: 8,
      color: '#333'
    }
  },
  
  // 描述区域样式
  description: {
    marginTop: '16px'
  },
  
  // 描述内容样式
  descriptionContent: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#fafafa',
    borderRadius: '8px',
    color: '#333'
  }
};

// 导出模态框样式
export const exportModalStyles = {
  // 字段选择区域样式
  fieldSelector: {
    maxHeight: '300px',
    overflow: 'auto',
    border: '1px solid #f0f0f0',
    borderRadius: '8px',
    padding: '12px'
  },
  
  // 字段项样式
  fieldItem: {
    marginBottom: '8px'
  }
};

// CSS-in-JS 样式字符串生成函数
export const generateGlobalStyles = (tokens) => `
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
