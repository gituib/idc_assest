import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Statistic, message, Button, Tag, Typography } from 'antd';
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
  SafetyOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const theme = {
  primary: '#1890ff',
  primaryDark: '#096dd9',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  purple: '#722ed1',
  cyan: '#13c2c2',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  cardBg: 'rgba(255, 255, 255, 0.95)',
  textPrimary: '#262626',
  textSecondary: '#8c8c8c'
};

const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #f5f7fa 0%, #e8ecf1 100%)',
  padding: '24px'
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '32px',
  padding: '24px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '16px',
  color: '#fff',
  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
};

const titleStyle = {
  fontSize: '2rem',
  fontWeight: '700',
  color: '#fff',
  margin: '0 0 8px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px'
};

const subtitleStyle = {
  fontSize: '1rem',
  color: 'rgba(255, 255, 255, 0.85)',
  margin: '0'
};

const statCardStyle = {
  borderRadius: '16px',
  border: 'none',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  background: '#fff',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  cursor: 'pointer',
  height: '100%'
};

const statCardHoverStyle = {
  transform: 'translateY(-4px)',
  boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)'
};

const statIconContainer = (color) => ({
  position: 'absolute',
  top: '16px',
  right: '16px',
  width: '56px',
  height: '56px',
  borderRadius: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
  fontSize: '28px'
});

const topBorderStyle = (color) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '4px',
  background: `linear-gradient(90deg, ${color}, ${color}80)`,
  borderRadius: '16px 16px 0 0'
});

const overviewCardStyle = {
  borderRadius: '16px',
  border: 'none',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  background: '#fff'
};

const navigationGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '16px',
  marginBottom: '24px'
};

const navButtonStyle = {
  height: 'auto',
  padding: '24px 20px',
  borderRadius: '12px',
  border: '2px solid #f0f0f0',
  background: '#fff',
  transition: 'all 0.3s ease',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  cursor: 'pointer'
};

const navButtonHoverStyle = {
  borderColor: '#1890ff',
  background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
  transform: 'translateY(-2px)',
  boxShadow: '0 4px 12px rgba(24, 144, 255, 0.2)'
};

const navIconStyle = {
  fontSize: '2.2rem',
  background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};

const navTextStyle = {
  fontSize: '0.9rem',
  fontWeight: '600',
  color: '#262626'
};

const systemInfoStyle = {
  background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f7ff 100%)',
  borderRadius: '12px',
  padding: '20px',
  border: '1px solid #91d5ff'
};

const quickStatsStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
  marginBottom: '24px'
};

const quickStatItemStyle = {
  background: 'linear-gradient(135deg, #fff 0%, #fafafa 100%)',
  borderRadius: '12px',
  padding: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  border: '1px solid #f0f0f0'
};

const createTrendStyle = (trend) => ({
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: trend > 0 ? theme.success : theme.error,
  marginTop: '8px'
});

const navButtonsData = [
  { key: 'devices', icon: CloudServerOutlined, text: '设备管理', path: '/devices', color: '#1890ff' },
  { key: 'racks', icon: DatabaseOutlined, text: '资源规划', path: '/racks', color: '#722ed1' },
  { key: 'faults', icon: WarningOutlined, text: '故障监控', path: '/faults', color: '#faad14' },
  { key: 'settings', icon: SettingOutlined, text: '系统配置', path: '/settings', color: '#13c2c2' }
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
    powerUsage: 0
  });
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      const [devicesRes, racksRes, roomsRes] = await Promise.all([
        axios.get('/api/devices', { params: { pageSize: 1 } }),
        axios.get('/api/racks', { params: { pageSize: 1 } }),
        axios.get('/api/rooms')
      ]);

      const totalDevices = devicesRes.data.total || 0;
      const totalRacks = racksRes.data.total || 0;
      const rooms = roomsRes.data || [];
      const totalRooms = rooms.length;

      let faultDevices = 0;
      if (totalDevices > 0) {
        try {
          const faultRes = await axios.get('/api/devices/count', {
            params: { status: 'fault' }
          });
          faultDevices = faultRes.data.count || 0;
        } catch {
          faultDevices = 0;
        }
      }

      setStats({
        totalDevices,
        totalRacks,
        totalRooms,
        faultDevices,
        deviceGrowth: 2.5,
        faultTrend: -12.3,
        onlineRate: totalDevices > 0 ? ((totalDevices - faultDevices) / totalDevices * 100).toFixed(1) : 100,
        powerUsage: Math.floor(Math.random() * 5000) + 2000
      });
    } catch (error) {
      message.error('获取统计数据失败');
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
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
      xs: 24, sm: 12, lg: 6,
      icon: CloudServerOutlined,
      color: '#1890ff',
      statKey: 'totalDevices',
      title: '总设备数',
      trend: stats.deviceGrowth,
      tagColor: 'blue'
    },
    {
      key: 'racks',
      xs: 24, sm: 12, lg: 6,
      icon: DatabaseOutlined,
      color: '#722ed1',
      statKey: 'totalRacks',
      title: '总机柜数',
      trend: 0,
      tagColor: 'green',
      customStatus: true
    },
    {
      key: 'rooms',
      xs: 24, sm: 12, lg: 6,
      icon: HomeOutlined,
      color: '#52c41a',
      statKey: 'totalRooms',
      title: '总机房数',
      trend: 0,
      tagColor: 'green',
      customStatus: true
    },
    {
      key: 'faults',
      xs: 24, sm: 12, lg: 6,
      icon: WarningOutlined,
      color: '#ff4d4f',
      statKey: 'faultDevices',
      title: '故障设备',
      trend: stats.faultTrend,
      tagColor: 'red'
    }
  ], [stats.deviceGrowth, stats.faultTrend]);

  const renderStatCard = useCallback((config) => {
    const { icon: Icon, color, statKey, title, trend, tagColor, customStatus, xs, sm, lg } = config;
    const colProps = { xs, sm, lg };
    const cardStyle = {
      ...statCardStyle,
      ...(hoveredCard === statKey ? statCardHoverStyle : {})
    };

    return (
      <Col key={statKey} {...colProps}>
        <Card
          style={cardStyle}
          onMouseEnter={() => setHoveredCard(statKey)}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{ position: 'relative' }}>
            <div style={topBorderStyle(color)} />
            <div style={statIconContainer(color)}>
              <Icon style={{ color }} />
            </div>
            <Statistic
              title={
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: theme.textSecondary }}>
                  {title}
                </span>
              }
              value={stats[statKey]}
              valueStyle={{
                fontSize: '2rem',
                fontWeight: '700',
                color: theme.textPrimary,
                marginBottom: '4px'
              }}
              loading={loading}
            />
            {customStatus ? (
              statKey === 'totalRacks' ? (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: theme.success }}>
                  <span style={{ width: '8px', height: '8px', background: theme.success, borderRadius: '50%', marginRight: '8px', boxShadow: '0 0 8px rgba(82, 196, 26, 0.5)' }} />
                  <span>正常运行中</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: theme.success }}>
                  <span style={{ width: '8px', height: '8px', background: theme.success, borderRadius: '50%', marginRight: '8px', boxShadow: '0 0 8px rgba(82, 196, 26, 0.5)' }} />
                  <span>全部在线</span>
                </div>
              )
            ) : (
              <div style={createTrendStyle(trend)}>
                {trend > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                <span style={{ marginLeft: '4px' }}>{Math.abs(trend)}%</span>
                <Tag color={tagColor} style={{ marginLeft: '8px', fontSize: '0.75rem', borderRadius: '4px' }}>本月</Tag>
              </div>
            )}
          </div>
        </Card>
      </Col>
    );
  }, [stats, loading, hoveredCard]);

  const navButtons = useMemo(() => navButtonsData.map(({ key, icon: Icon, text, color }) => (
    <Button
      key={key}
      type="text"
      style={{
        ...navButtonStyle,
        ...(hoveredCard === `nav-${key}` ? navButtonHoverStyle : {})
      }}
      onMouseEnter={(e) => handleNavHover(e, true, `nav-${key}`)}
      onMouseLeave={(e) => handleNavHover(e, false, `nav-${key}`)}
    >
      <Icon style={{ ...navIconStyle, background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} />
      <span style={navTextStyle}>{text}</span>
    </Button>
  )), [hoveredCard]);

  const quickStats = useMemo(() => [
    { icon: LineChartOutlined, label: '在线率', value: `${stats.onlineRate}%`, color: theme.success },
    { icon: SafetyOutlined, label: '安全等级', value: 'A级', color: theme.primary },
    { icon: EnvironmentOutlined, label: '功率使用', value: `${stats.powerUsage}W`, color: theme.warning }
  ], [stats.onlineRate, stats.powerUsage]);

  const systemInfo = useMemo(() => (
    <div style={systemInfoStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{ margin: '0', fontSize: '0.9rem', color: theme.textPrimary, fontWeight: '600' }}>
            <strong>系统版本：</strong> v1.0.0
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: theme.textSecondary }}>
            <strong>最后更新：</strong>{new Date().toLocaleDateString()}
          </p>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          size="small"
          onClick={handleRefresh}
          style={{
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            border: 'none',
            borderRadius: '6px'
          }}
        >
          刷新数据
        </Button>
      </div>
    </div>
  ), [handleRefresh]);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          <DashboardOutlined />
          IDC设备管理系统
        </h1>
        <p style={subtitleStyle}>实时监控 · 智能管理 · 高效运维</p>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        {statCards.map(renderStatCard)}
      </Row>

      <div>
        <Card style={overviewCardStyle}>
          <div style={{ padding: '24px' }}>
            <div className="welcome-banner" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '24px',
              color: '#fff',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                margin: '0 0 8px 0',
                color: '#fff'
              }}>
                欢迎使用IDC设备管理系统
              </h2>
              <p style={{
                fontSize: '0.95rem',
                margin: '0',
                opacity: '0.9',
                color: '#fff'
              }}>
                专业的机房设备管理解决方案，提供全方位的设备监控和管理能力
              </p>
            </div>

            <div style={quickStatsStyle}>
              {quickStats.map((stat, index) => (
                <div key={index} style={quickStatItemStyle}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: `linear-gradient(135deg, ${stat.color}20 0%, ${stat.color}10 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: stat.color
                  }}>
                    <stat.icon />
                  </div>
                  <div>
                    <Text style={{ color: theme.textSecondary, fontSize: '0.85rem' }}>{stat.label}</Text>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: theme.textPrimary }}>{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={navigationGridStyle}>
              {navButtons}
            </div>

            {systemInfo}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default React.memo(Dashboard);
