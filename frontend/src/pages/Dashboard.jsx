import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, Row, Col, Statistic, message, Button, Tag, Typography, Progress, Spin } from 'antd';
import {
  DatabaseOutlined,
  CloudServerOutlined,
  WarningOutlined,
  HomeOutlined,
  SettingOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DashboardOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
  LineChartOutlined,
  SafetyOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;

const designTokens = {
  colors: {
    primary: {
      main: '#1890ff',
      light: '#40a9ff',
      dark: '#096dd9',
      gradient: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
      bgGradient: 'linear-gradient(135deg, #1890ff15 0%, #096dd908 100%)'
    },
    success: {
      main: '#52c41a',
      light: '#73d13d',
      dark: '#389e0d',
      gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
      bgGradient: 'linear-gradient(135deg, #52c41a15 0%, #389e0d08 100%)'
    },
    warning: {
      main: '#faad14',
      light: '#ffc53d',
      dark: '#d48806',
      gradient: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)',
      bgGradient: 'linear-gradient(135deg, #faad1415 0%, #d4880608 100%)'
    },
    error: {
      main: '#ff4d4f',
      light: '#ff7875',
      dark: '#cf1322',
      gradient: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
      bgGradient: 'linear-gradient(135deg, #ff4d4f15 0%, #cf132208 100%)'
    },
    purple: {
      main: '#722ed1',
      light: '#9254de',
      dark: '#531dab',
      gradient: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
      bgGradient: 'linear-gradient(135deg, #722ed115 0%, #531dab08 100%)'
    },
    cyan: {
      main: '#13c2c2',
      light: '#36cfc9',
      dark: '#08979c',
      gradient: 'linear-gradient(135deg, #13c2c2 0%, #08979c 100%)',
      bgGradient: 'linear-gradient(135deg, #13c2c215 0%, #08979c08 100%)'
    },
    text: {
      primary: '#262626',
      secondary: '#8c8c8c',
      tertiary: '#bfbfbf'
    }
  },
  shadows: {
    small: '0 2px 8px rgba(0, 0, 0, 0.06)',
    medium: '0 4px 16px rgba(0, 0, 0, 0.08)',
    large: '0 8px 24px rgba(0, 0, 0, 0.12)',
    hover: '0 12px 32px rgba(0, 0, 0, 0.15)'
  },
  borderRadius: {
    small: '8px',
    medium: '12px',
    large: '16px',
    xl: '20px'
  },
  transitions: {
    fast: '0.15s ease',
    normal: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '0.5s cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

const responsiveConfig = {
  xs: { span: 24 },
  sm: { span: 12 },
  md: { span: 8 },
  lg: { span: 6 },
  xl: { span: 5 },
  xxl: { span: 4 }
};

const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #f5f7fa 0%, #e8ecf1 100%)',
  padding: 'clamp(12px, 3vw, 20px)'
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '32px',
  padding: 'clamp(20px, 5vw, 32px) clamp(16px, 4vw, 48px)',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: 'clamp(12px, 3vw, 20px)',
  color: '#fff',
  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
  animation: 'fadeInDown 0.6s ease-out'
};

const titleStyle = {
  fontSize: 'clamp(1.4rem, 4vw, 2.2rem)',
  fontWeight: '700',
  color: '#fff',
  margin: '0 0 8px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'clamp(8px, 2vw, 16px)',
  flexWrap: 'wrap',
  textAlign: 'center'
};

const subtitleStyle = {
  fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)',
  color: 'rgba(255, 255, 255, 0.85)',
  margin: '0',
  textAlign: 'center'
};

const progressCardStyle = {
  borderRadius: designTokens.borderRadius.large,
  border: 'none',
  boxShadow: designTokens.shadows.medium,
  background: '#fff',
  height: '100%',
  animation: 'fadeInUp 0.6s ease-out 0.3s backwards'
};

const chartContainerStyle = {
  padding: '20px',
  borderRadius: designTokens.borderRadius.medium,
  background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
  border: '1px solid #f0f0f0'
};

const PIE_CHART_COLORS = {
  success: designTokens.colors.success.main,
  warning: designTokens.colors.warning.main,
  error: designTokens.colors.error.main,
  primary: designTokens.colors.primary.main
};

const pieChartStyle = {
  width: '180px',
  height: '180px',
  borderRadius: '50%',
  background: `conic-gradient(
    ${PIE_CHART_COLORS.success} 0deg 216deg,
    ${PIE_CHART_COLORS.warning} 216deg 288deg,
    ${PIE_CHART_COLORS.error} 288deg 324deg,
    ${PIE_CHART_COLORS.primary} 324deg 360deg
  )`,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const pieChartInner = {
  width: '120px',
  height: '120px',
  borderRadius: '50%',
  background: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column'
};

const trendItemStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 0',
  borderBottom: '1px solid #f0f0f0'
};

const STAT_CARD_BASE_STYLE = {
  borderRadius: designTokens.borderRadius.large,
  border: 'none',
  boxShadow: designTokens.shadows.medium,
  background: '#fff',
  transition: `all ${designTokens.transitions.normal}`,
  overflow: 'hidden',
  cursor: 'pointer',
  height: '100%',
  animation: 'fadeInUp 0.6s ease-out backwards',
  borderLeft: '4px solid transparent'
};

const STAT_ICON_CONTAINER_BASE = {
  width: 'clamp(40px, 8vw, 64px)',
  height: 'clamp(40px, 8vw, 64px)',
  borderRadius: designTokens.borderRadius.medium,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'clamp(20px, 4vw, 32px)',
  transition: `all ${designTokens.transitions.normal}`,
  flexShrink: 0
};

const NAV_BUTTON_BASE = {
  height: 'auto',
  padding: 'clamp(16px, 4vw, 24px) clamp(12px, 3vw, 20px)',
  borderRadius: designTokens.borderRadius.medium,
  border: '2px solid #f0f0f0',
  background: '#fff',
  transition: `all ${designTokens.transitions.normal}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'clamp(8px, 2vw, 12px)',
  cursor: 'pointer',
  boxShadow: designTokens.shadows.small,
  minWidth: '0'
};

const NAV_ICON_CONTAINER_BASE = {
  width: 'clamp(44px, 10vw, 60px)',
  height: 'clamp(44px, 10vw, 60px)',
  borderRadius: designTokens.borderRadius.medium,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'clamp(20px, 5vw, 28px)',
  transition: `all ${designTokens.transitions.normal}`,
  flexShrink: 0
};

const createStatCardStyle = (color) => ({
  ...STAT_CARD_BASE_STYLE,
  borderLeftColor: color
});

const createStatIconContainer = (color) => ({
  ...STAT_ICON_CONTAINER_BASE,
  background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`
});

const createNavButtonStyle = (color) => ({
  ...NAV_BUTTON_BASE,
  borderColor: color
});

const createNavIconContainer = (color) => ({
  ...NAV_ICON_CONTAINER_BASE,
  background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`
});

const overviewCardStyle = {
  borderRadius: designTokens.borderRadius.large,
  border: 'none',
  boxShadow: designTokens.shadows.medium,
  background: '#fff',
  animation: 'fadeInUp 0.6s ease-out 0.2s backwards'
};

const navigationGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
  gap: 'clamp(8px, 2vw, 16px)',
  marginBottom: '24px'
};

const navButtonStyle = (color) => ({
  height: 'auto',
  padding: '24px 20px',
  borderRadius: designTokens.borderRadius.medium,
  border: '2px solid #f0f0f0',
  background: '#fff',
  transition: `all ${designTokens.transitions.normal}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  cursor: 'pointer',
  boxShadow: designTokens.shadows.small
});

const navIconContainer = (color) => ({
  width: '60px',
  height: '60px',
  borderRadius: designTokens.borderRadius.medium,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
  fontSize: '28px',
  transition: `all ${designTokens.transitions.normal}`
});

const navTextStyle = {
  fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
  fontWeight: '600',
  color: designTokens.colors.text.primary,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%'
};

const systemInfoStyle = {
  background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f7ff 100%)',
  borderRadius: designTokens.borderRadius.medium,
  padding: '20px',
  border: '1px solid #91d5ff'
};

const quickStatsStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
  marginBottom: '24px'
};

const quickStatItemStyle = {
  background: 'linear-gradient(135deg, #fff 0%, #fafafa 100%)',
  borderRadius: designTokens.borderRadius.medium,
  padding: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  border: '1px solid #f0f0f0',
  boxShadow: designTokens.shadows.small
};

const AnimatedCounter = ({ value, duration = 1500 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const animate = (currentTime) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(easeOutQuart * value);

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return <span>{displayValue}</span>;
};

const CircularProgress = ({ percentage, size = 120, strokeWidth = 10, color, label }) => {
  const circumference = 2 * Math.PI * ((size - strokeWidth) / 2);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          fill="none"
          stroke="#f0f0f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s ease-out',
            filter: `drop-shadow(0 0 6px ${color}40)`
          }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: designTokens.colors.text.primary }}>
          {percentage}%
        </div>
        <div style={{ fontSize: '0.75rem', color: designTokens.colors.text.secondary }}>
          {label}
        </div>
      </div>
    </div>
  );
};

const PowerGauge = ({ value, maxValue }) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const getColor = () => {
    if (percentage >= 80) return designTokens.colors.error.main;
    if (percentage >= 60) return designTokens.colors.warning.main;
    return designTokens.colors.success.main;
  };

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <Text style={{ fontSize: '0.85rem', color: designTokens.colors.text.secondary }}>
          功率使用率
        </Text>
        <Text style={{ fontSize: '0.85rem', fontWeight: '600', color: getColor() }}>
          {percentage.toFixed(1)}%
        </Text>
      </div>
      <div style={{
        height: '8px',
        borderRadius: '4px',
        background: '#f0f0f0',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          borderRadius: '4px',
          background: `linear-gradient(90deg, ${getColor()}, ${getColor()}80)`,
          width: `${percentage}%`,
          transition: 'width 0.8s ease-out',
          boxShadow: `0 0 8px ${getColor()}40`
        }} />
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '4px',
        fontSize: '0.75rem',
        color: designTokens.colors.text.tertiary
      }}>
        <span>{value}W</span>
        <span>{maxValue}W</span>
      </div>
    </div>
  );
};

const DeviceTrendChart = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const chartHeight = 120;

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: chartHeight,
        gap: '8px',
        padding: '0 8px'
      }}>
        {data.map((item, index) => (
          <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '100%',
              maxWidth: '40px',
              height: `${(item.value / maxValue) * chartHeight}px`,
              borderRadius: '4px 4px 0 0',
              background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}80 100%)`,
              transition: `height ${designTokens.transitions.slow}`,
              boxShadow: `0 -2px 8px ${item.color}30`
            }} />
            <span style={{
              fontSize: '0.7rem',
              color: designTokens.colors.text.tertiary,
              marginTop: '4px',
              whiteSpace: 'nowrap'
            }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatusLegend = () => {
  const legends = [
    { color: designTokens.colors.success.main, label: '运行中', percent: 60 },
    { color: designTokens.colors.warning.main, label: '维护中', percent: 20 },
    { color: designTokens.colors.error.main, label: '故障', percent: 10 },
    { color: designTokens.colors.primary.main, label: '离线', percent: 10 }
  ];

  return (
    <div style={{ marginTop: '16px' }}>
      {legends.map((item, index) => (
        <div key={index} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 0',
          borderBottom: index < legends.length - 1 ? '1px solid #f5f5f5' : 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: item.color,
              boxShadow: `0 0 6px ${item.color}40`
            }} />
            <Text style={{ fontSize: '0.85rem', color: designTokens.colors.text.secondary }}>
              {item.label}
            </Text>
          </div>
          <Text style={{ fontSize: '0.85rem', fontWeight: '600', color: designTokens.colors.text.primary }}>
            {item.percent}%
          </Text>
        </div>
      ))}
    </div>
  );
};

const navButtonsData = [
  { key: 'devices', icon: CloudServerOutlined, text: '设备管理', path: '/devices', color: designTokens.colors.primary.main },
  { key: 'racks', icon: DatabaseOutlined, text: '资源规划', path: '/racks', color: designTokens.colors.purple.main },
  { key: 'faults', icon: WarningOutlined, text: '故障监控', path: '/faults', color: designTokens.colors.warning.main },
  { key: 'tickets', icon: BarChartOutlined, text: '工单管理', path: '/tickets', color: designTokens.colors.cyan.main },
  { key: 'consumables', icon: AppstoreOutlined, text: '耗材管理', path: '/consumables', color: '#fa8c16' },
  { key: 'settings', icon: SettingOutlined, text: '系统配置', path: '/settings', color: designTokens.colors.success.main }
];

function Dashboard() {
  const [stats, setStats] = useState({
    totalDevices: 0,
    totalRacks: 0,
    totalRooms: 0,
    faultDevices: 0,
    deviceGrowth: 2.5,
    faultTrend: -12.3,
    onlineRate: 98.5,
    powerUsage: 0,
    totalUsers: 0,
    activeTickets: 0
  });
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [animatedKey, setAnimatedKey] = useState(0);

  const fetchStats = useCallback(async () => {
    try {
      setIsRefreshing(true);

      const [devicesRes, racksRes, roomsRes, usersRes, ticketsRes] = await Promise.all([
        api.get('/devices', { params: { pageSize: 1 } }),
        api.get('/racks', { params: { pageSize: 1 } }),
        api.get('/rooms'),
        api.get('/users', { params: { pageSize: 1 } }),
        api.get('/tickets', { params: { pageSize: 1, status: 'open' } })
      ]);

      const totalDevices = devicesRes.total || 0;
      const totalRacks = racksRes.total || 0;
      const rooms = roomsRes || [];
      const totalRooms = rooms.length;
      const totalUsers = usersRes.total || 0;
      const activeTickets = ticketsRes.total || 0;

      let faultDevices = 0;
      if (totalDevices > 0) {
        try {
          const faultRes = await api.get('/devices', {
            params: { status: 'fault', pageSize: 1 }
          });
          faultDevices = faultRes.total || 0;
        } catch (error) {
          message.warning('获取故障设备数失败，使用默认值');
          console.error('获取故障设备数失败:', error);
          faultDevices = 0;
        }
      }

      setStats({
        totalDevices,
        totalRacks,
        totalRooms,
        totalUsers,
        activeTickets,
        faultDevices,
        deviceGrowth: 2.5,
        faultTrend: -12.3,
        onlineRate: totalDevices > 0 ? ((totalDevices - faultDevices) / totalDevices * 100).toFixed(1) : 100,
        powerUsage: Math.floor(Math.random() * 5000) + 2000
      });

      setAnimatedKey(prev => prev + 1);
    } catch (error) {
      message.error(`获取统计数据失败: ${error}`);
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleNavHover = (e, isEnter, buttonKey) => {
    if (isEnter) {
      setHoveredCard(buttonKey);
    } else {
      setHoveredCard(null);
    }
  };

  const handleRefresh = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  const statCards = useMemo(() => [
    {
      key: 'devices',
      xs: 12, sm: 12, md: 8, lg: 6, xl: 4,
      icon: CloudServerOutlined,
      color: designTokens.colors.primary.main,
      statKey: 'totalDevices',
      title: '总设备数',
      trend: stats.deviceGrowth,
      tagColor: 'blue',
      delay: 0
    },
    {
      key: 'racks',
      xs: 12, sm: 12, md: 8, lg: 6, xl: 4,
      icon: DatabaseOutlined,
      color: designTokens.colors.purple.main,
      statKey: 'totalRacks',
      title: '总机柜数',
      trend: 0,
      tagColor: 'green',
      customStatus: true,
      delay: 1
    },
    {
      key: 'rooms',
      xs: 12, sm: 12, md: 8, lg: 6, xl: 4,
      icon: HomeOutlined,
      color: designTokens.colors.success.main,
      statKey: 'totalRooms',
      title: '总机房数',
      trend: 0,
      tagColor: 'green',
      customStatus: true,
      delay: 2
    },
    {
      key: 'faults',
      xs: 12, sm: 12, md: 8, lg: 6, xl: 4,
      icon: WarningOutlined,
      color: designTokens.colors.error.main,
      statKey: 'faultDevices',
      title: '故障设备',
      trend: stats.faultTrend,
      tagColor: 'red',
      delay: 3
    },
    {
      key: 'users',
      xs: 12, sm: 12, md: 8, lg: 6, xl: 4,
      icon: TeamOutlined,
      color: designTokens.colors.cyan.main,
      statKey: 'totalUsers',
      title: '用户总数',
      trend: 5.2,
      tagColor: 'cyan',
      delay: 4
    },
    {
      key: 'tickets',
      xs: 12, sm: 12, md: 8, lg: 6, xl: 4,
      icon: BarChartOutlined,
      color: '#fa8c16',
      statKey: 'activeTickets',
      title: '待处理工单',
      trend: -8.5,
      tagColor: 'orange',
      delay: 5
    }
  ], [stats.deviceGrowth, stats.faultTrend]);

  const renderStatCard = useCallback((config) => {
    const { icon: Icon, color, statKey, title, trend, tagColor, customStatus, xs, sm, lg, xl, delay } = config;
    const colProps = { xs, sm, lg, xl };
    const cardStyle = {
      ...createStatCardStyle(color),
      ...(hoveredCard === statKey ? { transform: 'translateY(-6px)', boxShadow: designTokens.shadows.hover } : {}),
      animationDelay: `${delay * 0.1}s`
    };

    return (
      <Col key={statKey} {...colProps}>
        <Card
          style={cardStyle}
          onMouseEnter={() => setHoveredCard(statKey)}
          onMouseLeave={() => setHoveredCard(null)}
          bodyStyle={{ padding: 'clamp(16px, 3vw, 24px)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{
                fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
                fontWeight: '600',
                color: designTokens.colors.text.secondary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1
              }}>
                {title}
              </span>
              <div style={createStatIconContainer(color)}>
                <Icon style={{ color }} />
              </div>
            </div>
            <div className="stat-value" style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
              fontWeight: '700',
              color: color,
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}>
              {loading ? (
                <Spin size="small" />
              ) : (
                <AnimatedCounter key={`${animatedKey}-${statKey}`} value={stats[statKey]} />
              )}
            </div>
            {customStatus ? (
              statKey === 'totalRacks' ? (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)', color: designTokens.colors.success.main, whiteSpace: 'nowrap' }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    background: designTokens.colors.success.main,
                    borderRadius: '50%',
                    marginRight: '6px',
                    boxShadow: '0 0 6px rgba(82, 196, 26, 0.5)',
                    flexShrink: 0
                  }} />
                  <span>正常运行中</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)', color: designTokens.colors.success.main, whiteSpace: 'nowrap' }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    background: designTokens.colors.success.main,
                    borderRadius: '50%',
                    marginRight: '6px',
                    boxShadow: '0 0 6px rgba(82, 196, 26, 0.5)',
                    flexShrink: 0
                  }} />
                  <span>全部在线</span>
                </div>
              )
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 'clamp(0.7rem, 1.8vw, 0.875rem)',
                fontWeight: '500',
                color: trend > 0 ? designTokens.colors.success.main : designTokens.colors.error.main,
                flexWrap: 'wrap',
                gap: '4px'
              }}>
                {trend > 0 ? <ArrowUpOutlined style={{ fontSize: '0.75rem' }} /> : <ArrowDownOutlined style={{ fontSize: '0.75rem' }} />}
                <span>{Math.abs(trend)}%</span>
                <Tag color={tagColor} style={{ fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)', borderRadius: '4px', margin: 0, padding: '0 4px', lineHeight: '1.4' }}>环比</Tag>
              </div>
            )}
          </div>
        </Card>
      </Col>
    );
  }, [stats, loading, hoveredCard, animatedKey]);

  const navButtons = useMemo(() => navButtonsData.map(({ key, icon: Icon, text, color }) => (
    <div
      key={key}
      className="nav-button"
      style={{
        ...createNavButtonStyle(color),
        ...(hoveredCard === `nav-${key}` ? {
          transform: 'translateY(-4px)',
          boxShadow: designTokens.shadows.large,
          borderColor: color
        } : {}),
        animationDelay: `${navButtonsData.findIndex(b => b.key === key) * 0.1}s`
      }}
      onMouseEnter={(e) => handleNavHover(e, true, `nav-${key}`)}
      onMouseLeave={(e) => handleNavHover(e, false, `nav-${key}`)}
    >
      <div className="nav-icon" style={createNavIconContainer(color)}>
        <Icon style={{ color, fontSize: 'clamp(20px, 5vw, 28px)' }} />
      </div>
      <span className="nav-text" style={navTextStyle}>{text}</span>
    </div>
  )), [hoveredCard]);

  const quickStats = useMemo(() => [
    { icon: LineChartOutlined, label: '在线率', value: `${stats.onlineRate}%`, color: designTokens.colors.success.main },
    { icon: SafetyOutlined, label: '安全等级', value: 'A级', color: designTokens.colors.primary.main },
    { icon: ThunderboltOutlined, label: '功率使用', value: `${stats.powerUsage}W`, color: designTokens.colors.warning.main }
  ], [stats.onlineRate, stats.powerUsage]);

  const deviceTrendData = useMemo(() => [
    { label: '周一', value: 45, color: designTokens.colors.primary.main },
    { label: '周二', value: 52, color: designTokens.colors.primary.main },
    { label: '周三', value: 48, color: designTokens.colors.primary.main },
    { label: '周四', value: 60, color: designTokens.colors.success.main },
    { label: '周五', value: 55, color: designTokens.colors.success.main },
    { label: '周六', value: 42, color: designTokens.colors.warning.main },
    { label: '周日', value: 58, color: designTokens.colors.primary.main }
  ], []);

  const systemInfo = useMemo(() => (
    <div style={systemInfoStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{ margin: '0', fontSize: '0.9rem', color: designTokens.colors.text.primary, fontWeight: '600' }}>
            <strong>系统版本：</strong> v1.0.0
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: designTokens.colors.text.secondary }}>
            <strong>最后更新：</strong>{new Date().toLocaleDateString()}
          </p>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined spin={isRefreshing} />}
          size="small"
          onClick={handleRefresh}
          loading={isRefreshing}
          style={{
            background: designTokens.colors.primary.gradient,
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
          }}
        >
          刷新数据
        </Button>
      </div>
    </div>
  ), [handleRefresh, isRefreshing]);

  const styles = `
    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div style={containerStyle} className="dashboard-container">
        <div style={headerStyle} className="dashboard-header">
          <h1 style={titleStyle} className="dashboard-title">
            <DashboardOutlined />
            IDC设备管理系统
          </h1>
          <p style={subtitleStyle} className="dashboard-subtitle">实时监控 · 智能管理 · 高效运维</p>
        </div>

        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          {statCards.map(renderStatCard)}
        </Row>

        <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
          <Col xs={24} md={8}>
            <Card style={progressCardStyle}>
              <div style={{ padding: '20px' }}>
                <Title level={5} style={{ margin: '0 0 20px 0', color: designTokens.colors.text.primary }}>
                  设备状态分布
                </Title>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={pieChartStyle}>
                    <div style={pieChartInner}>
                      <span style={{ fontSize: '1.5rem', fontWeight: '700', color: designTokens.colors.text.primary }}>
                        {stats.totalDevices}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: designTokens.colors.text.secondary }}>
                        设备总数
                      </span>
                    </div>
                  </div>
                  <StatusLegend />
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card style={progressCardStyle}>
              <div style={{ padding: '20px' }}>
                <Title level={5} style={{ margin: '0 0 20px 0', color: designTokens.colors.text.primary }}>
                  系统健康指标
                </Title>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                  <CircularProgress
                    percentage={parseFloat(stats.onlineRate)}
                    size={140}
                    strokeWidth={12}
                    color={designTokens.colors.success.main}
                    label="在线率"
                  />
                  <PowerGauge value={stats.powerUsage} maxValue={10000} />
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card style={progressCardStyle}>
              <div style={{ padding: '20px' }}>
                <Title level={5} style={{ margin: '0 0 20px 0', color: designTokens.colors.text.primary }}>
                  周设备趋势
                </Title>
                <div style={chartContainerStyle}>
                  <DeviceTrendChart data={deviceTrendData} />
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
                  <Text style={{ fontSize: '0.75rem', color: designTokens.colors.text.tertiary }}>
                    周一 至 周日 设备变化趋势
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <div>
          <Card style={overviewCardStyle}>
            <div style={{ padding: '24px' }}>
              <Row gutter={[24, 24]}>
                <Col xs={24} md={16}>
                  <div className="welcome-banner" style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: designTokens.borderRadius.medium,
                    padding: '28px',
                    color: '#fff',
                    marginBottom: '24px',
                    animation: 'fadeInUp 0.6s ease-out 0.4s backwards'
                  }}>
                    <h2 style={{
                      fontSize: '1.4rem',
                      fontWeight: '600',
                      margin: '0 0 8px 0',
                      color: '#fff'
                    }}>
                      欢迎使用IDC设备管理系统
                    </h2>
                    <p style={{
                      fontSize: '1rem',
                      margin: '0',
                      opacity: '0.9',
                      color: '#fff'
                    }}>
                      专业的机房设备管理解决方案，提供全方位的设备监控和管理能力
                    </p>
                  </div>

                  <div style={{ ...quickStatsStyle, marginBottom: '0', animation: 'fadeInUp 0.6s ease-out 0.5s backwards' }}>
                    {quickStats.map((stat, index) => (
                      <div key={index} style={quickStatItemStyle}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: designTokens.borderRadius.medium,
                          background: `linear-gradient(135deg, ${stat.color}20 0%, ${stat.color}10 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          color: stat.color,
                          boxShadow: `0 4px 12px ${stat.color}20`
                        }}>
                          <stat.icon />
                        </div>
                        <div>
                          <Text style={{ color: designTokens.colors.text.secondary, fontSize: '0.85rem' }}>{stat.label}</Text>
                          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: designTokens.colors.text.primary }}>{stat.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Col>

                <Col xs={24} md={8}>
                  <div style={{ animation: 'fadeInUp 0.6s ease-out 0.5s backwards' }}>
                    {systemInfo}
                  </div>
                </Col>
              </Row>

              <div className="nav-grid" style={{ ...navigationGridStyle, animation: 'fadeInUp 0.6s ease-out 0.6s backwards' }}>
                {navButtons}
              </div>
            </div>
          </Card>
        </div>

        <style>{`
          @media (max-width: 576px) {
            .dashboard-container {
              padding: 12px !important;
            }
            .dashboard-header {
              padding: 20px 16px !important;
              border-radius: 12px !important;
            }
            .dashboard-title {
              font-size: 1.4rem !important;
              gap: 8px !important;
            }
            .dashboard-subtitle {
              font-size: 0.85rem !important;
            }
            .stat-value {
              font-size: 1.6rem !important;
            }
            .nav-grid {
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 8px !important;
            }
            .nav-button {
              padding: 12px 8px !important;
            }
            .nav-icon {
              width: 40px !important;
              height: 40px !important;
              font-size: 20px !important;
            }
            .nav-text {
              font-size: 0.7rem !important;
            }
          }
          @media (max-width: 375px) {
            .nav-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
        `}</style>
      </div>
    </>
  );
}

export default React.memo(Dashboard);
