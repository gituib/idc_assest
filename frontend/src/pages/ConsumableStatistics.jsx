import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Progress,
  DatePicker,
  Select,
  Button,
  Empty,
  Tooltip,
  Badge,
  Divider,
  Typography,
  Space,
  Avatar,
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
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import dayjs from 'dayjs';
import api from '../api';
import { message } from 'antd';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// 设计令牌 - 与其他页面统一
const designTokens = {
  colors: {
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    },
    secondary: {
      main: '#ec4899',
      light: '#f472b6',
      gradient: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
    },
    background: {
      main: '#f8fafc',
      card: '#ffffff',
      elevated: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      muted: '#94a3b8',
    },
    border: '#e2e8f0',
  },
  shadows: {
    small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    glow: '0 0 20px rgba(99, 102, 241, 0.15)',
  },
  borderRadius: {
    small: '8px',
    medium: '12px',
    large: '16px',
    xl: '20px',
    full: '9999px',
  },
};

// 动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

const cardHoverVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
};

// 样式组件
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
    width: 56px;
    height: 56px;
    background: ${designTokens.colors.primary.gradient};
    border-radius: ${designTokens.borderRadius.large};
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: ${designTokens.shadows.glow};

    .anticon {
      font-size: 28px;
      color: white;
    }
  }

  .title-content {
    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      background: ${designTokens.colors.primary.gradient};
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      color: ${designTokens.colors.text.secondary};
      font-size: 14px;
      margin-top: 4px;
    }
  }
`;

const FilterSection = styled(motion.div)`
  background: ${designTokens.colors.background.card};
  padding: 20px 24px;
  border-radius: ${designTokens.borderRadius.large};
  box-shadow: ${designTokens.shadows.small};
  margin-bottom: 24px;
  border: 1px solid ${designTokens.colors.border};
`;

const StatsCard = styled(motion.div)`
  background: ${designTokens.colors.background.card};
  border-radius: ${designTokens.borderRadius.large};
  padding: 24px;
  box-shadow: ${designTokens.shadows.small};
  border: 1px solid ${designTokens.colors.border};
  transition: all 0.3s ease;
  height: 100%;
  position: relative;
  overflow: hidden;

  &:hover {
    box-shadow: ${designTokens.shadows.large};
    transform: translateY(-2px);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => props.accent || designTokens.colors.primary.gradient};
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;

    .icon-box {
      width: 48px;
      height: 48px;
      border-radius: ${designTokens.borderRadius.medium};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      background: ${props => props.iconBg || 'rgba(99, 102, 241, 0.1)'};
      color: ${props => props.iconColor || designTokens.colors.primary.main};
    }

    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: ${designTokens.colors.text.primary};
    }
  }

  .stat-value {
    font-size: 32px;
    font-weight: 700;
    color: ${designTokens.colors.text.primary};
    margin-bottom: 8px;
    background: ${props => props.valueGradient || 'none'};
    -webkit-background-clip: ${props => props.valueGradient ? 'text' : 'unset'};
    -webkit-text-fill-color: ${props => props.valueGradient ? 'transparent' : 'inherit'};
    background-clip: ${props => props.valueGradient ? 'text' : 'unset'};
  }

  .stat-label {
    font-size: 13px;
    color: ${designTokens.colors.text.secondary};
  }
`;

const ContentCard = styled(motion.div)`
  background: ${designTokens.colors.background.card};
  border-radius: ${designTokens.borderRadius.large};
  box-shadow: ${designTokens.shadows.small};
  border: 1px solid ${designTokens.colors.border};
  overflow: hidden;
  height: 100%;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: ${designTokens.shadows.medium};
  }

  .card-header {
    padding: 20px 24px;
    border-bottom: 1px solid ${designTokens.colors.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .header-icon {
        width: 40px;
        height: 40px;
        border-radius: ${designTokens.borderRadius.medium};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        background: ${props => props.iconBg || designTokens.colors.primary.gradient};
        color: white;
      }

      .header-title {
        font-size: 17px;
        font-weight: 600;
        color: ${designTokens.colors.text.primary};
      }
    }

    .header-extra {
      color: ${designTokens.colors.text.secondary};
      font-size: 13px;
    }
  }

  .card-body {
    padding: 24px;
  }
`;

const StyledTable = styled(Table)`
  .ant-table {
    background: transparent;
  }

  .ant-table-thead > tr > th {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    font-weight: 600;
    color: ${designTokens.colors.text.primary};
    border-bottom: 2px solid ${designTokens.colors.border};
    padding: 16px;
  }

  .ant-table-tbody > tr > td {
    padding: 16px;
    border-bottom: 1px solid ${designTokens.colors.border};
  }

  .ant-table-tbody > tr:hover > td {
    background: rgba(99, 102, 241, 0.04);
  }

  .ant-table-row {
    transition: all 0.2s ease;
  }
`;

const ProgressBar = styled.div`
  .progress-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;

    .ant-progress {
      flex: 1;
      margin: 0;
    }

    .progress-text {
      font-size: 13px;
      font-weight: 600;
      color: ${props => props.color || designTokens.colors.text.primary};
      min-width: 45px;
      text-align: right;
    }
  }
`;

const CategoryTag = styled(Tag)`
  padding: 6px 14px;
  border-radius: ${designTokens.borderRadius.full};
  font-size: 13px;
  font-weight: 500;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }
`;

const StatItem = styled.div`
  text-align: center;
  padding: 16px;
  background: ${props => props.bg || 'transparent'};
  border-radius: ${designTokens.borderRadius.medium};
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${designTokens.shadows.small};
  }

  .stat-icon {
    font-size: 24px;
    margin-bottom: 8px;
    color: ${props => props.iconColor || designTokens.colors.primary.main};
  }

  .stat-number {
    font-size: 24px;
    font-weight: 700;
    color: ${designTokens.colors.text.primary};
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: ${designTokens.colors.text.secondary};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: ${designTokens.colors.text.secondary};

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 16px;
    margin-bottom: 8px;
  }

  .empty-subtext {
    font-size: 13px;
    opacity: 0.7;
  }
`;

const ConsumableStatistics = () => {
  const [loading, setLoading] = useState(true);
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
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // 加载统计数据
  const loadStatistics = async () => {
    try {
      setLoading(true);
      const params = {
        startDate: dateRange[0]?.format('YYYY-MM-DD'),
        endDate: dateRange[1]?.format('YYYY-MM-DD'),
      };

      // 加载记录统计
      const statsResponse = await api.get('/consumable-records/statistics', { params });
      setStats(statsResponse || {
        inCount: 0,
        outCount: 0,
        inQuantity: 0,
        outQuantity: 0,
        recentRecords: [],
      });

      // 加载汇总数据
      const summaryResponse = await api.get('/consumables/statistics/summary');
      setSummary(summaryResponse || {
        total: 0,
        lowStock: 0,
        totalValue: 0,
        byCategory: [],
      });
    } catch (error) {
      const errorMsg = error?.message || error || '未知错误';
      message.error('加载统计数据失败: ' + errorMsg);
      console.error('加载统计数据失败:', error);
      // 使用默认数据
      setStats({
        inCount: 0,
        outCount: 0,
        inQuantity: 0,
        outQuantity: 0,
        recentRecords: [],
      });
      setSummary({
        total: 0,
        lowStock: 0,
        totalValue: 0,
        byCategory: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // 加载低库存预警
  const loadLowStockItems = async () => {
    try {
      const response = await api.get('/consumables/low-stock');
      setLowStockItems(response || []);
    } catch (error) {
      console.error('加载低库存预警失败:', error?.message || error);
      setLowStockItems([]);
    }
  };

  useEffect(() => {
    loadStatistics();
    loadLowStockItems();
  }, []);

  // 低库存表格列
  const lowStockColumns = [
    {
      title: '耗材名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar
            size={36}
            style={{
              background: designTokens.colors.warning.gradient,
              fontSize: '16px',
            }}
          >
            <WarningOutlined />
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, color: designTokens.colors.text.primary }}>
              {text}
            </div>
            <div style={{ fontSize: '12px', color: designTokens.colors.text.secondary }}>
              {record.specification}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '当前库存',
      dataIndex: 'currentStock',
      key: 'currentStock',
      align: 'center',
      render: (currentStock, record) => (
        <Text strong style={{ fontSize: '16px', color: designTokens.colors.error.main }}>
          {currentStock} {record.unit}
        </Text>
      ),
    },
    {
      title: '最小库存',
      dataIndex: 'minStock',
      key: 'minStock',
      align: 'center',
      render: (minStock, record) => (
        <Text type="secondary">
          {minStock} {record.unit}
        </Text>
      ),
    },
    {
      title: '充足率',
      key: 'rate',
      align: 'center',
      render: (_, record) => {
        const rate = Math.min(100, Math.round((record.currentStock / (record.maxStock || 100)) * 100));
        const status = rate < 30 ? 'exception' : rate < 60 ? 'active' : 'success';
        const color = rate < 30 ? designTokens.colors.error.main :
                     rate < 60 ? designTokens.colors.warning.main :
                     designTokens.colors.success.main;

        return (
          <ProgressBar color={color}>
            <div className="progress-wrapper">
              <Progress
                percent={rate}
                size="small"
                status={status}
                strokeColor={color}
                showInfo={false}
              />
              <span className="progress-text" style={{ color }}>
                {rate}%
              </span>
            </div>
          </ProgressBar>
        );
      },
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier',
      render: (value) => (
        <Text type="secondary">{value || '-'}</Text>
      ),
    },
  ];

  // 最近记录表格列
  const recentColumns = [
    {
      title: '操作类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag
          icon={type === 'in' ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
          color={type === 'in' ? 'success' : 'processing'}
          style={{
            padding: '4px 12px',
            borderRadius: designTokens.borderRadius.full,
            fontWeight: 500,
          }}
        >
          {type === 'in' ? '入库' : '出库'}
        </Tag>
      ),
    },
    {
      title: '耗材名称',
      dataIndex: ['Consumable', 'name'],
      key: 'consumableName',
      render: (text) => (
        <Text strong style={{ color: designTokens.colors.text.primary }}>
          {text}
        </Text>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      render: (quantity, record) => (
        <Text
          strong
          style={{
            fontSize: '16px',
            color: record.type === 'in' ? designTokens.colors.success.main : designTokens.colors.primary.main,
          }}
        >
          {record.type === 'in' ? '+' : '-'}{quantity}
        </Text>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      render: (operator) => (
        <Space>
          <Avatar size={28} style={{ background: designTokens.colors.info.main }}>
            {operator?.charAt(0) || '?'}
          </Avatar>
          <Text>{operator}</Text>
        </Space>
      ),
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <Text type="secondary" style={{ fontSize: '13px' }}>
          <CalendarOutlined style={{ marginRight: 6 }} />
          {dayjs(date).format('YYYY-MM-DD HH:mm')}
        </Text>
      ),
    },
  ];

  // 获取类别颜色
  const getCategoryColor = (category) => {
    const colors = {
      '网络设备': '#6366f1',
      '线缆': '#10b981',
      '配件': '#f59e0b',
      '工具': '#ec4899',
      '其他': '#6b7280',
    };
    return colors[category] || '#6366f1';
  };

  // 刷新数据
  const handleRefresh = () => {
    loadStatistics();
    loadLowStockItems();
    message.success('数据已刷新');
  };

  return (
    <PageContainer>
      {/* 页面标题 */}
      <PageHeader variants={containerVariants} initial="hidden" animate="visible">
        <TitleSection>
          <motion.div
            className="icon-wrapper"
            whileHover={{ scale: 1.05, rotate: 5 }}
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
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
            style={{
              height: 40,
              borderRadius: designTokens.borderRadius.medium,
              borderColor: designTokens.colors.border,
            }}
          >
            刷新数据
          </Button>
        </Space>
      </PageHeader>

      {/* 筛选区域 */}
      <FilterSection variants={itemVariants}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Text strong style={{ display: 'block', marginBottom: 8, color: designTokens.colors.text.primary }}>
              <CalendarOutlined style={{ marginRight: 8 }} />
              时间范围
            </Text>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              allowClear={false}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Text strong style={{ display: 'block', marginBottom: 8, color: designTokens.colors.text.primary }}>
              <AppstoreOutlined style={{ marginRight: 8 }} />
              耗材类别
            </Text>
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: '100%' }}
              placeholder="选择类别"
            >
              <Option value="all">全部类别</Option>
              <Option value="网络设备">网络设备</Option>
              <Option value="线缆">线缆</Option>
              <Option value="配件">配件</Option>
              <Option value="工具">工具</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={8} lg={12} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              type="primary"
              onClick={loadStatistics}
              loading={loading}
              style={{
                height: 40,
                borderRadius: designTokens.borderRadius.medium,
                background: designTokens.colors.primary.gradient,
                border: 'none',
              }}
            >
              应用筛选
            </Button>
          </Col>
        </Row>
      </FilterSection>

      {/* 统计卡片 */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <StatsCard
              variants={itemVariants}
              whileHover="hover"
              accent={designTokens.colors.primary.gradient}
              iconBg="rgba(99, 102, 241, 0.1)"
              iconColor={designTokens.colors.primary.main}
              valueGradient={designTokens.colors.primary.gradient}
            >
              <div className="card-header">
                <div className="icon-box">
                  <DatabaseOutlined />
                </div>
                <span className="card-title">耗材总数</span>
              </div>
              <div className="stat-value">
                {summary?.total || 0}
              </div>
              <div className="stat-label">种不同类型耗材</div>
            </StatsCard>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <StatsCard
              variants={itemVariants}
              whileHover="hover"
              accent={designTokens.colors.warning.gradient}
              iconBg="rgba(245, 158, 11, 0.1)"
              iconColor={designTokens.colors.warning.main}
            >
              <div className="card-header">
                <div className="icon-box" style={{ color: designTokens.colors.warning.main, background: 'rgba(245, 158, 11, 0.1)' }}>
                  <WarningOutlined />
                </div>
                <span className="card-title">库存预警</span>
              </div>
              <div className="stat-value" style={{ color: designTokens.colors.warning.main }}>
                {summary?.lowStock || 0}
              </div>
              <div className="stat-label">低于安全库存</div>
            </StatsCard>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <StatsCard
              variants={itemVariants}
              whileHover="hover"
              accent={designTokens.colors.success.gradient}
              iconBg="rgba(16, 185, 129, 0.1)"
              iconColor={designTokens.colors.success.main}
            >
              <div className="card-header">
                <div className="icon-box" style={{ color: designTokens.colors.success.main, background: 'rgba(16, 185, 129, 0.1)' }}>
                  <ArrowDownOutlined />
                </div>
                <span className="card-title">本月入库</span>
              </div>
              <div className="stat-value" style={{ color: designTokens.colors.success.main }}>
                {stats?.inCount || 0}
              </div>
              <div className="stat-label">笔入库记录</div>
            </StatsCard>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <StatsCard
              variants={itemVariants}
              whileHover="hover"
              accent={designTokens.colors.secondary.gradient}
              iconBg="rgba(236, 72, 153, 0.1)"
              iconColor={designTokens.colors.secondary.main}
            >
              <div className="card-header">
                <div className="icon-box" style={{ color: designTokens.colors.secondary.main, background: 'rgba(236, 72, 153, 0.1)' }}>
                  <ArrowUpOutlined />
                </div>
                <span className="card-title">本月出库</span>
              </div>
              <div className="stat-value" style={{ color: designTokens.colors.secondary.main }}>
                {stats?.outCount || 0}
              </div>
              <div className="stat-label">笔出库记录</div>
            </StatsCard>
          </Col>
        </Row>
      </motion.div>

      {/* 入库/出库统计 */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ marginBottom: 24 }}
      >
        <ContentCard variants={itemVariants} iconBg={designTokens.colors.info.gradient}>
          <div className="card-header">
            <div className="header-left">
              <div className="header-icon" style={{ background: designTokens.colors.info.gradient }}>
                <ShoppingCartOutlined />
              </div>
              <span className="header-title">入库/出库统计</span>
            </div>
            <div className="header-extra">
              {dateRange[0]?.format('YYYY-MM-DD')} 至 {dateRange[1]?.format('YYYY-MM-DD')}
            </div>
          </div>
          <div className="card-body">
            <Row gutter={[48, 24]}>
              <Col xs={24} md={12}>
                <StatItem bg="rgba(16, 185, 129, 0.05)" iconColor={designTokens.colors.success.main}>
                  <div className="stat-icon">
                    <ArrowDownOutlined />
                  </div>
                  <div className="stat-number" style={{ color: designTokens.colors.success.main }}>
                {stats?.inCount || 0}
              </div>
              <div className="stat-label">入库次数</div>
                </StatItem>
              </Col>
              <Col xs={24} md={12}>
                <StatItem bg="rgba(99, 102, 241, 0.05)" iconColor={designTokens.colors.primary.main}>
                  <div className="stat-icon">
                    <ArrowUpOutlined />
                  </div>
                  <div className="stat-number" style={{ color: designTokens.colors.primary.main }}>
                {stats?.outCount || 0}
              </div>
              <div className="stat-label">出库次数</div>
                </StatItem>
              </Col>
              <Col xs={24} md={12}>
                <StatItem bg="rgba(16, 185, 129, 0.05)" iconColor={designTokens.colors.success.main}>
                  <div className="stat-icon">
                    <DatabaseOutlined />
                  </div>
                  <div className="stat-number" style={{ color: designTokens.colors.success.main }}>
                {stats?.inQuantity || 0}
              </div>
              <div className="stat-label">入库数量</div>
                </StatItem>
              </Col>
              <Col xs={24} md={12}>
                <StatItem bg="rgba(99, 102, 241, 0.05)" iconColor={designTokens.colors.primary.main}>
                  <div className="stat-icon">
                    <BoxPlotOutlined />
                  </div>
                  <div className="stat-number" style={{ color: designTokens.colors.primary.main }}>
                {stats?.outQuantity || 0}
              </div>
              <div className="stat-label">出库数量</div>
                </StatItem>
              </Col>
            </Row>
          </div>
        </ContentCard>
      </motion.div>

      {/* 类别统计 */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ marginBottom: 24 }}
      >
        <ContentCard variants={itemVariants} iconBg={designTokens.colors.secondary.gradient}>
          <div className="card-header">
            <div className="header-left">
              <div className="header-icon" style={{ background: designTokens.colors.secondary.gradient }}>
                <PieChartOutlined />
              </div>
              <span className="header-title">类别统计</span>
            </div>
          </div>
          <div className="card-body">
            {summary?.byCategory?.length > 0 ? (
              <Row gutter={[24, 24]}>
                {summary.byCategory.map((item, index) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={item.category}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.03 }}
                      style={{
                        padding: 20,
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderRadius: designTokens.borderRadius.medium,
                        border: `1px solid ${designTokens.colors.border}`,
                        textAlign: 'center',
                      }}
                    >
                      <CategoryTag
                        color={getCategoryColor(item.category)}
                        style={{
                          background: `${getCategoryColor(item.category)}15`,
                          marginBottom: 16,
                          fontSize: '14px',
                          padding: '6px 16px',
                        }}
                      >
                        <span
                          className="dot"
                          style={{ background: getCategoryColor(item.category) }}
                        />
                        {item.category}
                      </CategoryTag>
                      <div style={{ fontSize: '28px', fontWeight: 700, color: designTokens.colors.text.primary }}>
                        {item.count}
                      </div>
                      <div style={{ fontSize: '13px', color: designTokens.colors.text.secondary, marginTop: 4 }}>
                        种耗材
                      </div>
                      <Divider style={{ margin: '12px 0' }} />
                      <div style={{ fontSize: '13px', color: designTokens.colors.text.secondary }}>
                        总库存: <Text strong>{item.totalQuantity || 0}</Text>
                      </div>
                    </motion.div>
                  </Col>
                ))}
              </Row>
            ) : (
              <EmptyState>
                <PieChartOutlined className="empty-icon" />
                <div className="empty-text">暂无类别统计数据</div>
                <div className="empty-subtext">添加耗材后将自动统计</div>
              </EmptyState>
            )}
          </div>
        </ContentCard>
      </motion.div>

      {/* 低库存预警和最近记录 */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <ContentCard variants={itemVariants} iconBg={designTokens.colors.warning.gradient}>
              <div className="card-header">
                <div className="header-left">
                  <div className="header-icon" style={{ background: designTokens.colors.warning.gradient }}>
                    <ExclamationCircleOutlined />
                  </div>
                  <span className="header-title">库存预警</span>
                </div>
                <Badge
                  count={lowStockItems.length}
                  style={{ backgroundColor: designTokens.colors.warning.main }}
                />
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <StyledTable
                  columns={lowStockColumns}
                  dataSource={lowStockItems}
                  rowKey="consumableId"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  locale={{
                    emptyText: (
                      <EmptyState>
                        <BoxPlotOutlined className="empty-icon" style={{ color: designTokens.colors.success.main }} />
                        <div className="empty-text">库存充足</div>
                        <div className="empty-subtext">所有耗材库存均在安全范围内</div>
                      </EmptyState>
                    ),
                  }}
                />
              </div>
            </ContentCard>
          </Col>

          <Col xs={24} lg={12}>
            <ContentCard variants={itemVariants} iconBg={designTokens.colors.success.gradient}>
              <div className="card-header">
                <div className="header-left">
                  <div className="header-icon" style={{ background: designTokens.colors.success.gradient }}>
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
                  scroll={{ x: 'max-content' }}
                  locale={{
                    emptyText: (
                      <EmptyState>
                        <HistoryOutlined className="empty-icon" />
                        <div className="empty-text">暂无记录</div>
                        <div className="empty-subtext">出入库操作后将显示在这里</div>
                      </EmptyState>
                    ),
                  }}
                />
              </div>
            </ContentCard>
          </Col>
        </Row>
      </motion.div>
    </PageContainer>
  );
};

export default ConsumableStatistics;
