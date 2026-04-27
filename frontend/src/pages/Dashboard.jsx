import React, { useState, useCallback, useMemo } from 'react';
import { Card, Row, Col, Typography } from 'antd';
import {
  DatabaseOutlined,
  CloudServerOutlined,
  WarningOutlined,
  HomeOutlined,
  TeamOutlined,
  BarChartOutlined,
  DashboardOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { designTokens } from '../config/theme';
import { useFetch } from '../hooks/useSWR';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  AnimatedCounter,
  CircularProgress,
  PowerGauge,
  DeviceTrendChart,
  StatusLegend,
  StatCard,
  NavigationGrid,
  QuickStats,
  SystemInfo,
} from '../components/dashboard';

const { Title } = Typography;

const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #f5f7fa 0%, #e8ecf1 100%)',
  padding: 'clamp(12px, 3vw, 20px)',
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '32px',
  padding: 'clamp(20px, 5vw, 32px) clamp(16px, 4vw, 48px)',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: 'clamp(12px, 3vw, 20px)',
  color: '#fff',
  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
  animation: 'fadeInDown 0.6s ease-out',
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
  textAlign: 'center',
};

const subtitleStyle = {
  fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)',
  color: 'rgba(255, 255, 255, 0.85)',
  margin: '0',
  textAlign: 'center',
};

const progressCardStyle = {
  borderRadius: designTokens.borderRadius.large,
  border: 'none',
  boxShadow: designTokens.shadows.medium,
  background: '#fff',
  height: '100%',
  animation: 'fadeInUp 0.6s ease-out 0.3s backwards',
};

const chartContainerStyle = {
  padding: '20px',
  borderRadius: designTokens.borderRadius.medium,
  background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
  border: '1px solid #f0f0f0',
};

const PIE_CHART_COLORS = {
  success: designTokens.colors.success.main,
  warning: designTokens.colors.warning.main,
  error: designTokens.colors.error.main,
  primary: designTokens.colors.primary.main,
};

const pieChartInner = {
  width: '120px',
  height: '120px',
  borderRadius: '50%',
  background: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
};

const overviewCardStyle = {
  borderRadius: designTokens.borderRadius.large,
  border: 'none',
  boxShadow: designTokens.shadows.medium,
  background: '#fff',
  animation: 'fadeInUp 0.6s ease-out 0.2s backwards',
};

function Dashboard() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [animatedKey, setAnimatedKey] = useState(0);

  const { data: statsData, isLoading: loading, mutate: mutateStats } = useFetch('/statistics');

  const isRefreshing = loading && statsData;

  const stats = useMemo(() => {
    if (!statsData) {
      return {
        totalDevices: 0,
        totalRacks: 0,
        totalRooms: 0,
        totalUsers: 0,
        activeTickets: 0,
        faultDevices: 0,
        deviceGrowth: 0,
        faultTrend: 0,
        userGrowth: 0,
        ticketTrend: 0,
        onlineRate: 100,
        powerUsage: 0,
        totalMaxPower: 10000,
        deviceStatus: {
          running: 0,
          maintenance: 0,
          fault: 0,
          offline: 0,
        },
        deviceTrendData: [],
      };
    }

    return {
      totalDevices: statsData.totalDevices || 0,
      totalRacks: statsData.totalRacks || 0,
      totalRooms: statsData.totalRooms || 0,
      totalUsers: statsData.totalUsers || 0,
      activeTickets: statsData.activeTickets || 0,
      faultDevices: statsData.faultDevices || 0,
      deviceGrowth: statsData.deviceGrowth || 0,
      faultTrend: statsData.faultTrend || 0,
      userGrowth: statsData.userGrowth || 0,
      ticketTrend: statsData.ticketTrend || 0,
      onlineRate: statsData.onlineRate || 100,
      powerUsage: statsData.powerUsage || 0,
      totalMaxPower: statsData.totalMaxPower || 10000,
      deviceStatus: statsData.deviceStatus || {
        running: 0,
        maintenance: 0,
        fault: 0,
        offline: 0,
      },
      deviceTrendData: statsData.deviceTrendData || [],
    };
  }, [statsData]);

  const deviceStatusPercentages = useMemo(() => {
    const total = stats.totalDevices;
    if (total === 0) {
      return {
        running: 0,
        maintenance: 0,
        fault: 0,
        offline: 0,
      };
    }

    return {
      running: Math.round((stats.deviceStatus.running / total) * 100),
      maintenance: Math.round((stats.deviceStatus.maintenance / total) * 100),
      fault: Math.round((stats.deviceStatus.fault / total) * 100),
      offline: Math.round((stats.deviceStatus.offline / total) * 100),
    };
  }, [stats.totalDevices, stats.deviceStatus]);

  const pieChartStyle = useMemo(() => {
    const runningDeg = (deviceStatusPercentages.running / 100) * 360;
    const maintenanceDeg = (deviceStatusPercentages.maintenance / 100) * 360;
    const faultDeg = (deviceStatusPercentages.fault / 100) * 360;
    const offlineDeg = (deviceStatusPercentages.offline / 100) * 360;

    let gradientParts = [];
    let currentAngle = 0;

    if (runningDeg > 0) {
      gradientParts.push(
        `${PIE_CHART_COLORS.success} ${currentAngle}deg ${currentAngle + runningDeg}deg`
      );
      currentAngle += runningDeg;
    }
    if (maintenanceDeg > 0) {
      gradientParts.push(
        `${PIE_CHART_COLORS.warning} ${currentAngle}deg ${currentAngle + maintenanceDeg}deg`
      );
      currentAngle += maintenanceDeg;
    }
    if (faultDeg > 0) {
      gradientParts.push(
        `${PIE_CHART_COLORS.error} ${currentAngle}deg ${currentAngle + faultDeg}deg`
      );
      currentAngle += faultDeg;
    }
    if (offlineDeg > 0) {
      gradientParts.push(
        `${PIE_CHART_COLORS.primary} ${currentAngle}deg ${currentAngle + offlineDeg}deg`
      );
    }

    const conicGradient =
      gradientParts.length > 0
        ? `conic-gradient(${gradientParts.join(', ')})`
        : 'conic-gradient(#e5e7eb 0deg 360deg)';

    return {
      width: '180px',
      height: '180px',
      borderRadius: '50%',
      background: conicGradient,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }, [deviceStatusPercentages]);

  const handleRefresh = useCallback(async () => {
    setAnimatedKey(prev => prev + 1);
    await mutateStats();
  }, [mutateStats]);

  const handleHover = useCallback(key => {
    setHoveredCard(key);
  }, []);

  const statCards = useMemo(
    () => [
      {
        key: 'devices',
        xs: 12,
        sm: 12,
        md: 8,
        lg: 6,
        xl: 4,
        icon: CloudServerOutlined,
        color: designTokens.colors.primary.main,
        statKey: 'totalDevices',
        title: '总设备数',
        trend: stats.deviceGrowth,
        tagColor: 'blue',
        hideTrend: true,
        delay: 0,
      },
      {
        key: 'racks',
        xs: 12,
        sm: 12,
        md: 8,
        lg: 6,
        xl: 4,
        icon: DatabaseOutlined,
        color: '#722ed1',
        statKey: 'totalRacks',
        title: '总机柜数',
        trend: 0,
        tagColor: 'green',
        hideTrend: true,
        delay: 1,
      },
      {
        key: 'rooms',
        xs: 12,
        sm: 12,
        md: 8,
        lg: 6,
        xl: 4,
        icon: HomeOutlined,
        color: designTokens.colors.success.main,
        statKey: 'totalRooms',
        title: '总机房数',
        trend: 0,
        tagColor: 'green',
        hideTrend: true,
        delay: 2,
      },
      {
        key: 'faults',
        xs: 12,
        sm: 12,
        md: 8,
        lg: 6,
        xl: 4,
        icon: WarningOutlined,
        color: designTokens.colors.error.main,
        statKey: 'faultDevices',
        title: '故障设备',
        trend: stats.faultTrend,
        tagColor: 'red',
        hideTrend: true,
        delay: 3,
      },
      {
        key: 'users',
        xs: 12,
        sm: 12,
        md: 8,
        lg: 6,
        xl: 4,
        icon: TeamOutlined,
        color: '#13c2c2',
        statKey: 'totalUsers',
        title: '用户总数',
        trend: stats.userGrowth,
        tagColor: 'cyan',
        hideTrend: true,
        delay: 4,
      },
      {
        key: 'tickets',
        xs: 12,
        sm: 12,
        md: 8,
        lg: 6,
        xl: 4,
        icon: BarChartOutlined,
        color: '#fa8c16',
        statKey: 'activeTickets',
        title: '待处理工单',
        trend: stats.ticketTrend,
        tagColor: 'orange',
        hideTrend: true,
        delay: 5,
      },
    ],
    [stats.deviceGrowth, stats.faultTrend, stats.userGrowth, stats.ticketTrend]
  );

  const deviceTrendData = useMemo(() => {
    const rawData = statsData?.deviceTrendData || [];
    return rawData.map(item => ({
      label: item.label,
      value: item.value,
      color: designTokens.colors.primary.main,
    }));
  }, [statsData?.deviceTrendData]);

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

  // 区域标题组件
  const SectionTitle = ({ icon: Icon, title, subtitle, color = designTokens.colors.primary.main }) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px',
      marginBottom: '20px',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '18px',
        boxShadow: `0 4px 12px ${color}30`,
        flexShrink: 0,
      }}>
        <Icon />
      </div>
      <div>
        <h3 style={{
          fontSize: '1.15rem',
          fontWeight: '700',
          color: designTokens.colors.text.primary,
          margin: '0 0 4px 0',
        }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{
            fontSize: '0.85rem',
            color: designTokens.colors.text.secondary,
            margin: '0',
          }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>{styles}</style>
      <div style={containerStyle} className="dashboard-container">
        {/* 1. 欢迎横幅 */}
        <div style={headerStyle} className="dashboard-header">
          <h1 style={titleStyle} className="dashboard-title">
            <DashboardOutlined />
            IDC设备管理系统
          </h1>
          <p style={subtitleStyle} className="dashboard-subtitle">
            实时监控 · 智能管理 · 高效运维
          </p>
        </div>

        {/* 2. 功能导航模块 - 移到原快捷操作位置 */}
        <div style={{ animation: 'fadeInUp 0.6s ease-out 0.1s backwards', marginBottom: '32px' }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={18}>
              <Card style={{
                borderRadius: designTokens.borderRadius.large,
                border: 'none',
                boxShadow: designTokens.shadows.large,
                background: '#fff',
                height: '100%',
                padding: '16px',
              }}>
                {/* 功能导航网格 */}
                <NavigationGrid hoveredCard={hoveredCard} onHover={handleHover} />
              </Card>
            </Col>

            <Col xs={24} lg={6}>
              <Card style={{
                borderRadius: designTokens.borderRadius.large,
                border: 'none',
                boxShadow: designTokens.shadows.large,
                background: '#fff',
                height: '100%',
              }}>
                <SystemInfo onRefresh={handleRefresh} isRefreshing={isRefreshing} />
              </Card>
            </Col>
          </Row>
        </div>

        {/* 3. 核心指标统计卡片 */}
        <div style={{ animation: 'fadeInUp 0.6s ease-out 0.2s backwards', marginBottom: '32px' }}>
          <SectionTitle 
            icon={BarChartOutlined} 
            title="核心指标"
            subtitle="实时监控数据中心关键指标"
          />
          <Row gutter={[24, 24]}>
            {statCards.map(config => (
              <StatCard
                key={config.statKey}
                config={config}
                stats={stats}
                loading={loading}
                animatedKey={animatedKey}
                hoveredCard={hoveredCard}
                onHover={handleHover}
              />
            ))}
          </Row>
        </div>

        {/* 4. 数据图表区域 */}
        <div style={{ animation: 'fadeInUp 0.6s ease-out 0.3s backwards', marginBottom: '32px' }}>
          <SectionTitle 
            icon={DatabaseOutlined} 
            title="数据可视化"
            subtitle="详细的数据分析和趋势展示"
          />
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card style={progressCardStyle}>
                <div style={{ padding: '20px' }}>
                  <Title
                    level={5}
                    style={{ margin: '0 0 20px 0', color: designTokens.colors.text.primary }}
                  >
                    设备状态分布
                  </Title>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={pieChartStyle}>
                      <div style={pieChartInner}>
                        <span
                          style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: designTokens.colors.text.primary,
                          }}
                        >
                          {stats.totalDevices}
                        </span>
                        <span
                          style={{ fontSize: '0.75rem', color: designTokens.colors.text.secondary }}
                        >
                          设备总数
                        </span>
                      </div>
                    </div>
                    <StatusLegend deviceStatusPercentages={deviceStatusPercentages} />
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card style={progressCardStyle}>
                <div style={{ padding: '20px' }}>
                  <Title
                    level={5}
                    style={{ margin: '0 0 20px 0', color: designTokens.colors.text.primary }}
                  >
                    系统健康指标
                  </Title>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '24px',
                    }}
                  >
                    <ErrorBoundary
                      fallback={
                        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                          在线率图表加载失败
                        </div>
                      }
                    >
                      <CircularProgress
                        percentage={parseFloat(stats.onlineRate)}
                        size={140}
                        strokeWidth={12}
                        color={designTokens.colors.success.main}
                        label="在线率"
                      />
                    </ErrorBoundary>
                    <ErrorBoundary
                      fallback={
                        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                          功率仪表加载失败
                        </div>
                      }
                    >
                      <PowerGauge value={stats.powerUsage} maxValue={stats.totalMaxPower} />
                    </ErrorBoundary>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card style={progressCardStyle}>
                <div style={{ padding: '20px' }}>
                  <Title
                    level={5}
                    style={{ margin: '0 0 20px 0', color: designTokens.colors.text.primary }}
                  >
                    周设备趋势
                  </Title>
                  <div style={chartContainerStyle}>
                    <ErrorBoundary
                      fallback={
                        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                          趋势图表加载失败
                        </div>
                      }
                    >
                      <DeviceTrendChart data={deviceTrendData} />
                    </ErrorBoundary>
                  </div>
                  <div
                    style={{
                      marginTop: '16px',
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '16px',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: designTokens.colors.text.tertiary }}>
                      周一 至 周日 设备变化趋势
                    </span>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* 5. 系统状态 */}
        <div style={{ animation: 'fadeInUp 0.6s ease-out 0.4s backwards' }}>
          <SectionTitle 
            icon={SafetyOutlined} 
            title="系统状态"
            subtitle="关键运行指标概览"
          />
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={24}>
              <Card style={{
                borderRadius: designTokens.borderRadius.large,
                border: 'none',
                boxShadow: designTokens.shadows.large,
                background: '#fff',
              }}>
                <QuickStats
                  onlineRate={stats.onlineRate}
                  powerUsage={stats.powerUsage}
                  totalMaxPower={stats.totalMaxPower}
                />
              </Card>
            </Col>
          </Row>
        </div>

        <style>{`
        /* 响应式设计 */
        @media (max-width: 1200px) {
          .nav-grid {
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
          }
        }
        
        @media (max-width: 992px) {
          .nav-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
            gap: 12px !important;
          }
        }
        
        @media (max-width: 768px) {
          .dashboard-container {
            padding: 16px !important;
          }
          .dashboard-header {
            padding: 24px 20px !important;
            border-radius: 16px !important;
          }
          .dashboard-title {
            font-size: 1.5rem !important;
            gap: 10px !important;
          }
          .dashboard-subtitle {
            font-size: 0.9rem !important;
          }
          .nav-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
        }
        
        @media (max-width: 576px) {
          .dashboard-container {
            padding: 12px !important;
          }
          .dashboard-header {
            padding: 20px 16px !important;
            border-radius: 12px !important;
          }
          .dashboard-title {
            font-size: 1.3rem !important;
            gap: 8px !important;
          }
          .dashboard-subtitle {
            font-size: 0.85rem !important;
          }
          .nav-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .nav-button {
            padding: 16px !important;
          }
          .nav-icon {
            width: 48px !important;
            height: 48px !important;
            font-size: 22px !important;
          }
        }
        
        @media (max-width: 375px) {
          .dashboard-container {
            padding: 10px !important;
          }
          .dashboard-header {
            padding: 18px 14px !important;
          }
        }
        
        /* 动画关键帧 */
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
      `}</style>
      </div>
    </>
  );
}

export default React.memo(Dashboard);
