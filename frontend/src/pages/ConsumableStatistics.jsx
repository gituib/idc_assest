import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Row,
  Col,
  Table,
  Tag,
  Progress,
  DatePicker,
  Select,
  Button,
  Empty,
  Tooltip,
  Badge,
  Typography,
  Space,
  Avatar,
  Spin,
  Dropdown,
  Menu,
  Statistic,
  Switch,
} from 'antd';
import {
  PieChartOutlined,
  BarChartOutlined,
  WarningOutlined,
  HistoryOutlined,
  ReloadOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BoxPlotOutlined,
  ExclamationCircleOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  ExportOutlined,
  FallOutlined,
  RiseOutlined,
  MinusOutlined,
  ThunderboltOutlined,
  FileExcelOutlined,
  MoreOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import dayjs from 'dayjs';
import api from '../api';
import { consumableRecordAPI, consumableCategoryAPI, consumableAPI } from '../api/cache';
import { message } from 'antd';
import { selectStyles, datePickerStyles } from '../styles/deviceManagementStyles';
import { designTokens } from '../config/theme';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 120, damping: 18 },
  },
};

const PageContainer = styled.div`
  padding: 24px;
  background: ${designTokens.colors.background.main};
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const PageHeader = styled(motion.div)`
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  .icon-wrapper {
    width: 52px;
    height: 52px;
    background: ${designTokens.colors.primary.gradient};
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25);

    .anticon {
      font-size: 26px;
      color: white;
    }
  }

  .title-content {
    h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
      color: ${designTokens.colors.text.primary};
    }

    .subtitle {
      color: ${designTokens.colors.text.secondary};
      font-size: 14px;
      margin-top: 2px;
    }
  }
`;

const QuickFilterBar = styled(motion.div)`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const QuickFilterBtn = styled(Button)`
  border-radius: 20px;
  height: 32px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid
    ${props => (props.$active ? designTokens.colors.primary.main : designTokens.colors.border)};
  background: ${props => (props.$active ? designTokens.colors.primary.main : 'transparent')};
  color: ${props => (props.$active ? 'white' : designTokens.colors.text.secondary)};

  &:hover {
    border-color: ${designTokens.colors.primary.main};
    color: ${props => (props.$active ? 'white' : designTokens.colors.primary.main)};
    background: ${props =>
      props.$active ? designTokens.colors.primary.main : 'rgba(99, 102, 241, 0.05)'};
  }
`;

const FilterCard = styled(motion.div)`
  background: ${designTokens.colors.background.card};
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-bottom: 24px;
  border: 1px solid ${designTokens.colors.border};

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const FilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
`;

const FilterItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  .filter-label {
    font-size: 13px;
    font-weight: 600;
    color: ${designTokens.colors.text.primary};
    display: flex;
    align-items: center;
    gap: 6px;

    &::before {
      content: '';
      width: 3px;
      height: 12px;
      background: ${designTokens.colors.primary.main};
      border-radius: 2px;
    }
  }
`;

const FilterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;

  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
  }
`;

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const StatsCard = styled(motion.div)`
  background: ${designTokens.colors.background.card};
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid ${designTokens.colors.border};
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
    border-color: ${props => props.$borderColor || designTokens.colors.primary.main}40;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => props.$accent || designTokens.colors.primary.gradient};
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .card-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    background: ${props => props.$iconBg || 'rgba(99, 102, 241, 0.1)'};
    color: ${props => props.$iconColor || designTokens.colors.primary.main};
    box-shadow: 0 4px 12px ${props => props.$iconShadow || 'rgba(99, 102, 241, 0.2)'};
  }

  .card-trend {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 20px;

    &.up {
      color: ${designTokens.colors.success.main};
      background: rgba(16, 185, 129, 0.1);
    }

    &.down {
      color: ${designTokens.colors.error.main};
      background: rgba(239, 68, 68, 0.1);
    }

    &.neutral {
      color: ${designTokens.colors.text.secondary};
      background: rgba(107, 114, 128, 0.1);
    }
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card-value {
    font-size: 32px;
    font-weight: 700;
    color: ${designTokens.colors.text.primary};
    line-height: 1;
  }

  .card-label {
    font-size: 13px;
    color: ${designTokens.colors.text.secondary};
    font-weight: 500;
  }
`;

const BentoGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto;
  gap: 20px;
  margin-bottom: 24px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(6, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const BentoCard = styled(motion.div)`
  background: ${designTokens.colors.background.card};
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid ${designTokens.colors.border};
  overflow: hidden;
  grid-column: ${props => props.$col || 'span 6'};
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  }

  .card-header {
    padding: 18px 24px;
    border-bottom: 1px solid ${designTokens.colors.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: ${designTokens.colors.background.main};

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .header-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        background: ${props => props.$iconBg || designTokens.colors.primary.gradient};
        color: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .header-title {
        font-size: 15px;
        font-weight: 600;
        color: ${designTokens.colors.text.primary};
      }
    }

    .header-extra {
      color: ${designTokens.colors.text.secondary};
      font-size: 12px;
      font-weight: 500;
      padding: 4px 10px;
      background: ${designTokens.colors.background.card};
      border-radius: 8px;
      border: 1px solid ${designTokens.colors.border};
    }
  }

  .card-body {
    padding: 0;
  }
`;

const InOutComparison = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const ComparisonItem = styled.div`
  padding: 20px;
  border-radius: 14px;
  background: ${props => props.$bg || 'transparent'};
  text-align: center;
  transition: all 0.3s ease;
  border: 1px solid ${props => props.$color}20;

  &:hover {
    background: ${props => props.$bg || 'transparent'};
    border-color: ${props => props.$color}40;
    transform: translateY(-2px);
  }

  .item-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 14px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    background: ${props => props.$color}15;
    color: ${props => props.$color};
  }

  .item-value {
    font-size: 34px;
    font-weight: 700;
    color: ${props => props.$color};
    margin-bottom: 4px;
    line-height: 1;
  }

  .item-label {
    font-size: 14px;
    color: ${designTokens.colors.text.secondary};
    margin-bottom: 10px;
    font-weight: 500;
  }

  .item-sub {
    font-size: 13px;
    color: ${designTokens.colors.text.secondary};
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;

    strong {
      color: ${props => props.$color};
      font-weight: 600;
    }
  }
`;

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
`;

const CategoryCard = styled(motion.div)`
  padding: 16px;
  border-radius: 12px;
  background: ${designTokens.colors.background.card};
  border: 1px solid ${designTokens.colors.border};
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$color};
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px ${props => props.$color}20;
    border-color: ${props => props.$color}40;

    &::before {
      opacity: 1;
    }
  }

  .category-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 12px;
    background: ${props => props.$color}15;
    color: ${props => props.$color};
    text-transform: uppercase;
    letter-spacing: 0.5px;

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
  }

  .category-count {
    font-size: 32px;
    font-weight: 700;
    color: ${designTokens.colors.text.primary};
    margin-bottom: 4px;
    line-height: 1;
  }

  .category-label {
    font-size: 12px;
    color: ${designTokens.colors.text.secondary};
    margin-bottom: 10px;
    font-weight: 500;
  }

  .category-stock {
    font-size: 12px;
    color: ${designTokens.colors.text.secondary};
    padding-top: 8px;
    border-top: 1px solid ${designTokens.colors.border}40;

    strong {
      color: ${designTokens.colors.text.primary};
      font-weight: 600;
    }
  }
`;

const StyledTable = styled(Table)`
  .ant-table {
    background: transparent;
    font-size: 12px;
  }

  .ant-table-thead > tr > th {
    background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
    font-weight: 600;
    font-size: 11px;
    color: ${designTokens.colors.text.secondary};
    border-bottom: 1px solid ${designTokens.colors.border};
    padding: 10px 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .ant-table-tbody > tr > td {
    padding: 8px 12px;
    border-bottom: 1px solid ${designTokens.colors.border}40;
  }

  .ant-table-tbody > tr {
    height: 48px;
  }

  .ant-table-tbody > tr:hover > td {
    background: rgba(99, 102, 241, 0.03);
  }

  .ant-table-wrapper {
    border-radius: 0 0 16px 16px;
  }

  .ant-pagination {
    padding: 12px 16px;
    margin: 0;
    background: ${designTokens.colors.background.main};
    border-top: 1px solid ${designTokens.colors.border};
  }
`;

const ProgressBar = styled.div`
  .progress-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;

    .ant-progress {
      flex: 1;
      margin: 0;
    }

    .progress-text {
      font-size: 13px;
      font-weight: 600;
      min-width: 42px;
      text-align: right;
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: ${designTokens.colors.text.secondary};

  .empty-icon {
    font-size: 56px;
    margin-bottom: 16px;
    opacity: 0.4;
  }

  .empty-text {
    font-size: 15px;
    margin-bottom: 6px;
    font-weight: 500;
  }

  .empty-subtext {
    font-size: 13px;
    opacity: 0.7;
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  z-index: 10;
`;

const ConsumableStatistics = () => {
  const [loading, setLoading] = useState(true);
  const [realTimeRefresh, setRealTimeRefresh] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const refreshIntervalRef = useRef(null);
  const [stats, setStats] = useState({
    inCount: 0,
    outCount: 0,
    inQuantity: 0,
    outQuantity: 0,
    recentRecords: [],
  });
  const [summary, setSummary] = useState({
    total: 0,
    lowStock: 0,
    totalValue: 0,
    byCategory: [],
  });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [lowStockPagination, setLowStockPagination] = useState({ current: 1, pageSize: 5 });
  const [categories, setCategories] = useState([]);
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('30days');

  const quickFilters = [
    { key: 'today', label: '今日', days: 0 },
    { key: '7days', label: '近7天', days: 7 },
    { key: '30days', label: '近30天', days: 30 },
    { key: '90days', label: '近90天', days: 90 },
  ];

  const loadCategories = async () => {
    try {
      const response = await consumableCategoryAPI.getList();
      console.log('[分类] 返回数据:', response);
      setCategories(response || []);
    } catch (error) {
      console.error('加载分类列表失败:', error);
    }
  };

  const loadStatistics = async (isAuto = false) => {
    try {
      if (!isAuto) {
        setLoading(true);
      }
      const params = {
        startDate: dateRange[0]?.format('YYYY-MM-DD'),
        endDate: dateRange[1]?.format('YYYY-MM-DD'),
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      };

      const statsResponse = await consumableRecordAPI.statistics(params);
      console.log('[统计] 返回:', statsResponse);
      console.log('[统计] 最近记录:', statsResponse?.recentRecords);

      setStats({
        inCount: statsResponse?.inCount || 0,
        outCount: statsResponse?.outCount || 0,
        inQuantity: statsResponse?.inQuantity || 0,
        outQuantity: statsResponse?.outQuantity || 0,
        recentRecords: statsResponse?.recentRecords || [],
      });

      const summaryResponse = await consumableAPI.getStatistics();
      console.log('[汇总] 返回:', summaryResponse);

      setSummary({
        total: summaryResponse?.total || 0,
        lowStock: summaryResponse?.lowStock || 0,
        totalValue: summaryResponse?.totalValue || 0,
        byCategory: summaryResponse?.byCategory || [],
      });

      if (isAuto) {
        setLastUpdateTime(new Date());
        setIsAutoRefreshing(false);
      }
    } catch (error) {
      const errorMsg = error?.message || error || '未知错误';
      if (!isAuto) {
        message.error('加载统计数据失败: ' + errorMsg);
      }
      console.error('加载统计数据失败:', error);
      setStats({ inCount: 0, outCount: 0, inQuantity: 0, outQuantity: 0, recentRecords: [] });
      setSummary({ total: 0, lowStock: 0, totalValue: 0, byCategory: [] });
    } finally {
      if (!isAuto) {
        setLoading(false);
      }
    }
  };

  const loadLowStockItems = async (isAuto = false) => {
    try {
      const response = await consumableAPI.getLowStock();
      console.log('[低库存] 返回:', response);
      setLowStockItems(response || []);
    } catch (error) {
      console.error('加载低库存预警失败:', error?.message || error);
      setLowStockItems([]);
    }
  };

  useEffect(() => {
    loadCategories();
    loadStatistics();
    loadLowStockItems();
  }, []);

  useEffect(() => {
    if (realTimeRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        setIsAutoRefreshing(true);
        loadStatistics(true);
        loadLowStockItems(true);
        setLastUpdateTime(new Date());
      }, 30000);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [realTimeRefresh]);

  const handleQuickFilter = key => {
    setQuickFilter(key);
    const filter = quickFilters.find(f => f.key === key);
    if (filter) {
      if (filter.days === 0) {
        setDateRange([dayjs().startOf('day'), dayjs()]);
      } else {
        setDateRange([dayjs().subtract(filter.days, 'days'), dayjs()]);
      }
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    setIsAutoRefreshing(false);
    Promise.all([loadStatistics(false), loadLowStockItems(false)]).finally(() => {
      setLoading(false);
      if (!realTimeRefresh) {
        message.success('数据已手动刷新');
      }
    });
  };

  const handleExport = () => {
    message.info('导出功能开发中...');
  };

  const getCategoryColor = category => {
    const predefinedColors = [
      '#6366f1',
      '#10b981',
      '#f59e0b',
      '#ec4899',
      '#8b5cf6',
      '#06b6d4',
      '#f97316',
      '#14b8a6',
      '#ef4444',
      '#3b82f6',
    ];

    const colorMap = {
      网络设备: '#6366f1',
      线缆: '#10b981',
      配件: '#f59e0b',
      工具: '#ec4899',
      其他: '#6b7280',
    };

    if (colorMap[category]) return colorMap[category];

    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    return predefinedColors[Math.abs(hash) % predefinedColors.length];
  };

  const lowStockColumns = [
    {
      title: '耗材名称',
      dataIndex: 'name',
      key: 'name',
      width: '35%',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={28}
            style={{
              background: `linear-gradient(135deg, ${designTokens.colors.warning.main}, #fb923c)`,
              fontSize: '12px',
              flexShrink: 0,
            }}
          >
            <WarningOutlined />
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                color: designTokens.colors.text.primary,
                fontSize: '13px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {text}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: designTokens.colors.text.secondary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {record.specification || record.category || '-'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '库存状态',
      key: 'stockStatus',
      width: '40%',
      align: 'center',
      render: (_, record) => {
        const current = record.currentStock || 0;
        const min = record.minStock || 0;
        const isLow = current < min;
        return (
          <div
            style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: '14px',
                color: isLow ? designTokens.colors.error.main : designTokens.colors.text.primary,
              }}
            >
              {current}
            </span>
            <span style={{ color: designTokens.colors.text.secondary, fontSize: '11px' }}>/</span>
            <span style={{ color: designTokens.colors.text.secondary, fontSize: '12px' }}>
              {min}
            </span>
            <span style={{ color: designTokens.colors.text.secondary, fontSize: '11px' }}>
              {record.unit || '个'}
            </span>
          </div>
        );
      },
    },
    {
      title: '充足率',
      key: 'rate',
      width: '25%',
      align: 'center',
      render: (_, record) => {
        const minStock = record.minStock || 0;
        const currentStock = record.currentStock || 0;

        if (minStock <= 0) {
          return (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              未设置
            </Text>
          );
        }

        const rate = Math.min(100, Math.round((currentStock / minStock) * 100));
        const color =
          rate < 30
            ? designTokens.colors.error.main
            : rate < 60
              ? designTokens.colors.warning.main
              : designTokens.colors.success.main;

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Progress
              percent={rate}
              size="small"
              strokeColor={color}
              showInfo={false}
              style={{ width: 60 }}
            />
            <span
              style={{
                fontWeight: 600,
                fontSize: '12px',
                color,
                minWidth: 32,
                textAlign: 'right',
              }}
            >
              {rate}%
            </span>
          </div>
        );
      },
    },
  ];

  const recentColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: type => (
        <Tag
          icon={type === 'in' ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
          color={type === 'in' ? 'success' : 'processing'}
          style={{ borderRadius: 12, fontWeight: 500, border: 'none' }}
        >
          {type === 'in' ? '入库' : '出库'}
        </Tag>
      ),
    },
    {
      title: '耗材',
      dataIndex: 'consumableName',
      key: 'consumableName',
      width: 200,
      render: (text, record) => (
        <Space>
          <Avatar
            size={30}
            style={{
              background: record.category
                ? getCategoryColor(record.category)
                : designTokens.colors.info.main,
              fontSize: '12px',
            }}
          >
            {record.category?.charAt(0) || '耗'}
          </Avatar>
          <div>
            <div
              style={{ fontWeight: 600, fontSize: '14px', color: designTokens.colors.text.primary }}
            >
              {text || '-'}
            </div>
            {record.category && (
              <div style={{ fontSize: '12px', color: designTokens.colors.text.secondary }}>
                {record.category}
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      width: 90,
      render: (quantity, record) => (
        <Text
          strong
          style={{
            fontSize: '15px',
            color:
              record.type === 'in'
                ? designTokens.colors.success.main
                : designTokens.colors.error.main,
          }}
        >
          {record.type === 'in' ? '+' : '-'}
          {quantity} {record.unit || '个'}
        </Text>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
      render: operator => (
        <Space size={6}>
          <Avatar size={24} style={{ background: designTokens.colors.info.main, fontSize: '12px' }}>
            {operator?.charAt(0) || '?'}
          </Avatar>
          <Text style={{ fontSize: '13px' }}>{operator || '-'}</Text>
        </Space>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: date => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {dayjs(date).format('MM-DD HH:mm')}
        </Text>
      ),
    },
  ];

  const netQuantity = useMemo(() => {
    return (stats?.inQuantity || 0) - (stats?.outQuantity || 0);
  }, [stats]);

  return (
    <PageContainer>
      <PageHeader variants={itemVariants} initial="hidden" animate="visible">
        <TitleSection>
          <motion.div
            className="icon-wrapper"
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <BarChartOutlined />
          </motion.div>
          <div className="title-content">
            <h1>耗材统计</h1>
            <div className="subtitle">实时监控耗材库存状态与流转情况</div>
          </div>
        </TitleSection>
        <Space>
          {lastUpdateTime && (
            <div
              style={{
                fontSize: 12,
                color: designTokens.colors.text.secondary,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {isAutoRefreshing ? <Spin size="small" /> : <span style={{ fontSize: 10 }}>●</span>}
              {isAutoRefreshing
                ? '刷新中...'
                : `更新于 ${dayjs(lastUpdateTime).format('HH:mm:ss')}`}
            </div>
          )}
          <Tooltip title={realTimeRefresh ? '已开启30秒自动刷新' : '已关闭自动刷新'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: designTokens.colors.text.secondary }}>实时</span>
              <Switch
                size="small"
                checked={realTimeRefresh}
                onChange={setRealTimeRefresh}
                checkedChildren="开"
                unCheckedChildren="关"
              />
            </div>
          </Tooltip>
          <Button
            icon={<ExportOutlined />}
            onClick={handleExport}
            style={{
              height: 38,
              borderRadius: 10,
              borderColor: designTokens.colors.border,
            }}
          >
            导出报表
          </Button>
          <Button
            type="primary"
            icon={<ReloadOutlined spin={isAutoRefreshing} />}
            onClick={handleRefresh}
            loading={loading && !isAutoRefreshing}
            style={{
              height: 38,
              borderRadius: 10,
              background: designTokens.colors.primary.gradient,
              border: 'none',
            }}
          >
            刷新
          </Button>
        </Space>
      </PageHeader>

      <QuickFilterBar variants={containerVariants} initial="hidden" animate="visible">
        {quickFilters.map(filter => (
          <QuickFilterBtn
            key={filter.key}
            $active={quickFilter === filter.key}
            onClick={() => handleQuickFilter(filter.key)}
          >
            {filter.label}
          </QuickFilterBtn>
        ))}
      </QuickFilterBar>

      <FilterCard variants={itemVariants}>
        <FilterRow>
          <FilterGroup>
            <FilterItem>
              <span className="filter-label">时间范围</span>
              <RangePicker
                value={dateRange}
                onChange={dates => {
                  setDateRange(dates);
                  setQuickFilter(null);
                }}
                style={{ ...datePickerStyles.range, width: 320 }}
                allowClear={false}
              />
            </FilterItem>
            <FilterItem>
              <span className="filter-label">耗材类别</span>
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ ...selectStyles.base, width: 180 }}
                showSearch
                placeholder="选择类别"
                optionFilterProp="children"
              >
                <Option value="all">全部类别</Option>
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.name}>
                    {cat.name}
                  </Option>
                ))}
              </Select>
            </FilterItem>
          </FilterGroup>
          <FilterActions>
            <Button
              type="primary"
              onClick={loadStatistics}
              loading={loading}
              icon={<ThunderboltOutlined />}
              style={{
                height: 40,
                borderRadius: 10,
                background: designTokens.colors.primary.gradient,
                border: 'none',
                padding: '0 24px',
                fontWeight: 500,
              }}
            >
              应用筛选
            </Button>
            <Button
              onClick={() => {
                setQuickFilter('30days');
                setDateRange([dayjs().subtract(30, 'days'), dayjs()]);
                setCategoryFilter('all');
              }}
              icon={<ReloadOutlined />}
              style={{
                height: 40,
                borderRadius: 10,
                borderColor: designTokens.colors.border,
              }}
            >
              重置
            </Button>
          </FilterActions>
        </FilterRow>
      </FilterCard>

      <StatsGrid variants={containerVariants} initial="hidden" animate="visible">
        <StatsCard
          variants={itemVariants}
          $accent={designTokens.colors.primary.gradient}
          $iconBg="rgba(99, 102, 241, 0.1)"
          $iconColor={designTokens.colors.primary.main}
          $iconShadow="rgba(99, 102, 241, 0.2)"
          $borderColor={designTokens.colors.primary.main}
          whileHover={{ y: -6 }}
        >
          <div className="card-content">
            <div className="card-header">
              <div className="card-icon">
                <DatabaseOutlined />
              </div>
              <div className="card-trend neutral">
                <AppstoreOutlined /> 总览
              </div>
            </div>
            <div className="card-body">
              <div className="card-value">{summary?.total || 0}</div>
              <div className="card-label">耗材种类</div>
            </div>
          </div>
        </StatsCard>

        <StatsCard
          variants={itemVariants}
          $accent={designTokens.colors.warning.gradient}
          $iconBg="rgba(245, 158, 11, 0.1)"
          $iconColor={designTokens.colors.warning.main}
          $iconShadow="rgba(245, 158, 11, 0.2)"
          $borderColor={designTokens.colors.warning.main}
          whileHover={{ y: -6 }}
        >
          <div className="card-content">
            <div className="card-header">
              <div className="card-icon">
                <WarningOutlined />
              </div>
              {summary?.lowStock > 0 && (
                <div className="card-trend down">
                  <ExclamationCircleOutlined /> 需关注
                </div>
              )}
            </div>
            <div className="card-body">
              <div className="card-value" style={{ color: designTokens.colors.warning.main }}>
                {summary?.lowStock || 0}
              </div>
              <div className="card-label">库存预警</div>
            </div>
          </div>
        </StatsCard>

        <StatsCard
          variants={itemVariants}
          $accent={designTokens.colors.success.gradient}
          $iconBg="rgba(16, 185, 129, 0.1)"
          $iconColor={designTokens.colors.success.main}
          $iconShadow="rgba(16, 185, 129, 0.2)"
          $borderColor={designTokens.colors.success.main}
          whileHover={{ y: -6 }}
        >
          <div className="card-content">
            <div className="card-header">
              <div className="card-icon">
                <ArrowDownOutlined />
              </div>
              <div className="card-trend up">
                <RiseOutlined /> 入库
              </div>
            </div>
            <div className="card-body">
              <div className="card-value" style={{ color: designTokens.colors.success.main }}>
                {stats?.inQuantity || 0}
              </div>
              <div className="card-label">期间入库</div>
            </div>
          </div>
        </StatsCard>

        <StatsCard
          variants={itemVariants}
          $accent={designTokens.colors.secondary.gradient}
          $iconBg="rgba(236, 72, 153, 0.1)"
          $iconColor={designTokens.colors.secondary.main}
          $iconShadow="rgba(236, 72, 153, 0.2)"
          $borderColor={designTokens.colors.secondary.main}
          whileHover={{ y: -6 }}
        >
          <div className="card-content">
            <div className="card-header">
              <div className="card-icon">
                <ArrowUpOutlined />
              </div>
              <div className="card-trend neutral">
                <FallOutlined /> 出库
              </div>
            </div>
            <div className="card-body">
              <div className="card-value" style={{ color: designTokens.colors.secondary.main }}>
                {stats?.outQuantity || 0}
              </div>
              <div className="card-label">期间出库</div>
            </div>
          </div>
        </StatsCard>
      </StatsGrid>

      <BentoGrid variants={containerVariants} initial="hidden" animate="visible">
        <BentoCard
          variants={itemVariants}
          $col="span 6"
          $iconBg={designTokens.colors.info.gradient}
        >
          <div className="card-header">
            <div className="header-left">
              <div className="header-icon">
                <ShoppingCartOutlined />
              </div>
              <span className="header-title">出入库统计</span>
            </div>
            <div className="header-extra">
              {dateRange[0]?.format('MM/DD')} - {dateRange[1]?.format('MM/DD')}
            </div>
          </div>
          <div className="card-body">
            <InOutComparison>
              <ComparisonItem
                $bg="rgba(16, 185, 129, 0.04)"
                $color={designTokens.colors.success.main}
              >
                <div className="item-icon">
                  <ArrowDownOutlined />
                </div>
                <div className="item-value">{stats?.inCount || 0}</div>
                <div className="item-label">入库次数</div>
                <div className="item-sub">
                  共 <strong>{stats?.inQuantity || 0}</strong> 件
                </div>
              </ComparisonItem>
              <ComparisonItem
                $bg="rgba(99, 102, 241, 0.04)"
                $color={designTokens.colors.primary.main}
              >
                <div className="item-icon">
                  <ArrowUpOutlined />
                </div>
                <div className="item-value">{stats?.outCount || 0}</div>
                <div className="item-label">出库次数</div>
                <div className="item-sub">
                  共 <strong>{stats?.outQuantity || 0}</strong> 件
                </div>
              </ComparisonItem>
            </InOutComparison>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                marginTop: 20,
                padding: '18px 24px',
                background: `linear-gradient(135deg, ${netQuantity >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'} 0%, ${netQuantity >= 0 ? 'rgba(5, 150, 105, 0.04)' : 'rgba(185, 28, 28, 0.04)'} 100%)`,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                border: `1px solid ${netQuantity >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              }}
            >
              {netQuantity >= 0 ? (
                <>
                  <RiseOutlined style={{ color: designTokens.colors.success.main, fontSize: 20 }} />
                  <Text
                    style={{
                      color: designTokens.colors.success.main,
                      fontWeight: 600,
                      fontSize: 15,
                    }}
                  >
                    净入库 +{netQuantity} 件
                  </Text>
                </>
              ) : (
                <>
                  <FallOutlined style={{ color: designTokens.colors.error.main, fontSize: 20 }} />
                  <Text
                    style={{ color: designTokens.colors.error.main, fontWeight: 600, fontSize: 15 }}
                  >
                    净出库 {Math.abs(netQuantity)} 件
                  </Text>
                </>
              )}
            </motion.div>
          </div>
        </BentoCard>

        <BentoCard
          variants={itemVariants}
          $col="span 6"
          $iconBg={designTokens.colors.secondary.gradient}
        >
          <div className="card-header">
            <div className="header-left">
              <div className="header-icon">
                <PieChartOutlined />
              </div>
              <span className="header-title">类别分布</span>
            </div>
          </div>
          <div className="card-body">
            {summary?.byCategory?.length > 0 ? (
              <CategoryGrid>
                {summary.byCategory.slice(0, 8).map((item, index) => (
                  <CategoryCard
                    key={item.category}
                    $color={getCategoryColor(item.category)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="category-badge">
                      <span className="dot" />
                      {item.category}
                    </div>
                    <div className="category-count">{item.count}</div>
                    <div className="category-label">种耗材</div>
                    <div className="category-stock">
                      库存: <strong>{item.totalQuantity || 0}</strong>
                    </div>
                  </CategoryCard>
                ))}
              </CategoryGrid>
            ) : (
              <EmptyState>
                <PieChartOutlined className="empty-icon" />
                <div className="empty-text">暂无类别数据</div>
                <div className="empty-subtext">添加耗材后将自动统计</div>
              </EmptyState>
            )}
          </div>
        </BentoCard>
      </BentoGrid>

      <BentoGrid variants={containerVariants} initial="hidden" animate="visible">
        <BentoCard
          variants={itemVariants}
          $col="span 6"
          $iconBg={designTokens.colors.warning.gradient}
        >
          <div className="card-header">
            <div className="header-left">
              <div className="header-icon">
                <ExclamationCircleOutlined />
              </div>
              <span className="header-title">库存预警</span>
            </div>
            {lowStockItems.length > 0 ? (
              <Badge
                count={lowStockItems.length}
                style={{ backgroundColor: designTokens.colors.warning.main }}
              />
            ) : (
              <span
                style={{
                  fontSize: 12,
                  color: designTokens.colors.success.main,
                  fontWeight: 500,
                  padding: '4px 10px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: 8,
                }}
              >
                全部充足
              </span>
            )}
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <StyledTable
              columns={lowStockColumns}
              dataSource={lowStockItems}
              rowKey="consumableId"
              pagination={{
                current: lowStockPagination.current,
                pageSize: lowStockPagination.pageSize,
                total: lowStockItems.length,
                showSizeChanger: false,
                showQuickJumper: false,
                showTotal: total => `共 ${total} 条`,
                onChange: page => setLowStockPagination(prev => ({ ...prev, current: page })),
              }}
              size="small"
              scroll={{ x: 'max-content', y: 300 }}
              locale={{
                emptyText: (
                  <EmptyState>
                    <BoxPlotOutlined
                      className="empty-icon"
                      style={{ color: designTokens.colors.success.main }}
                    />
                    <div className="empty-text">库存充足</div>
                    <div className="empty-subtext">所有耗材均在安全范围内</div>
                  </EmptyState>
                ),
              }}
            />
          </div>
        </BentoCard>

        <BentoCard
          variants={itemVariants}
          $col="span 6"
          $iconBg={designTokens.colors.success.gradient}
        >
          <div className="card-header">
            <div className="header-left">
              <div className="header-icon">
                <HistoryOutlined />
              </div>
              <span className="header-title">最近记录</span>
            </div>
            <div className="header-extra">最近10条</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <StyledTable
              columns={recentColumns}
              dataSource={stats?.recentRecords || []}
              rowKey="recordId"
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
              locale={{
                emptyText: (
                  <EmptyState>
                    <HistoryOutlined className="empty-icon" />
                    <div className="empty-text">暂无记录</div>
                    <div className="empty-subtext">出入库操作后将显示</div>
                  </EmptyState>
                ),
              }}
            />
          </div>
        </BentoCard>
      </BentoGrid>
    </PageContainer>
  );
};

export default ConsumableStatistics;
