import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Statistic, message, Button, Tag } from 'antd';
import { 
  DatabaseOutlined, 
  CloudServerOutlined, 
  WarningOutlined, 
  PoweroffOutlined, 
  HomeOutlined, 
  SettingOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DashboardOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import axios from 'axios';

const theme = {
  primary: '#1890ff',
  primaryDark: '#096dd9',
  secondary: '#722ed1',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  cardBg: 'rgba(255, 255, 255, 0.95)',
  textPrimary: '#262626',
  textSecondary: '#8c8c8c'
};

const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
  padding: '24px'
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '32px'
};

const titleStyle = {
  fontSize: '2.5rem',
  fontWeight: '700',
  background: theme.background,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  margin: '0 0 8px 0'
};

const subtitleStyle = {
  fontSize: '1.1rem',
  color: theme.textSecondary,
  margin: '0'
};

const statCardStyle = {
  borderRadius: '16px',
  border: 'none',
  boxShadow: '0 4px 16px rgba(24, 144, 255, 0.1)',
  background: theme.cardBg,
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  cursor: 'pointer'
};

const systemOverviewStyle = {
  marginTop: '32px'
};

const overviewCardStyle = {
  borderRadius: '20px',
  border: 'none',
  boxShadow: '0 8px 32px rgba(24, 144, 255, 0.15)',
  background: theme.cardBg,
  backdropFilter: 'blur(10px)'
};

const welcomeSectionStyle = {
  background: theme.background,
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center',
  color: 'white',
  marginBottom: '24px'
};

const navigationGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '16px',
  marginBottom: '24px'
};

const navButtonStyle = {
  height: 'auto',
  padding: '20px 16px',
  borderRadius: '12px',
  border: '2px solid rgba(24, 144, 255, 0.1)',
  background: 'rgba(24, 144, 255, 0.02)',
  transition: 'all 0.3s ease',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px'
};

const navIconStyle = {
  fontSize: '2rem',
  color: theme.primary
};

const navTextStyle = {
  fontSize: '0.95rem',
  fontWeight: '600',
  color: theme.textPrimary
};

const systemInfoStyle = {
  background: 'linear-gradient(135deg, #e8f4fd 0%, #f0f9ff 100%)',
  borderRadius: '12px',
  padding: '16px',
  border: '1px solid rgba(24, 144, 255, 0.1)'
};

const navButtonsData = [
  { key: 'devices', icon: CloudServerOutlined, text: '设备管理', path: '/devices' },
  { key: 'racks', icon: DatabaseOutlined, text: '资源规划', path: '/racks' },
  { key: 'faults', icon: WarningOutlined, text: '故障监控', path: '/faults' },
  { key: 'settings', icon: SettingOutlined, text: '系统配置', path: '/settings' }
];

const createTrendStyle = (trend) => ({
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: trend > 0 ? theme.success : theme.error,
  marginTop: '8px'
});

const createStatCardBg = (color) => ({
  position: 'absolute', 
  top: '0', 
  right: '0', 
  width: '60px', 
  height: '60px', 
  background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
  borderRadius: '50%',
  opacity: '0.1'
});

function Dashboard() {
  const [stats, setStats] = useState({
    totalDevices: 0,
    totalRacks: 0,
    totalRooms: 0,
    faultDevices: 0,
    deviceGrowth: 2.5,
    faultTrend: -12.3
  });
  const [loading, setLoading] = useState(true);

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
        faultTrend: -12.3
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

  const handleNavHover = useCallback((e, isEnter) => {
    if (isEnter) {
      e.currentTarget.style.borderColor = theme.primary;
      e.currentTarget.style.background = 'rgba(24, 144, 255, 0.1)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    } else {
      e.currentTarget.style.borderColor = 'rgba(24, 144, 255, 0.1)';
      e.currentTarget.style.background = 'rgba(24, 144, 255, 0.02)';
      e.currentTarget.style.transform = 'translateY(0)';
    }
  }, []);

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
    
    return (
      <Col key={statKey} {...colProps}>
        <Card style={statCardStyle}>
          <div style={{ position: 'relative' }}>
            <div style={createStatCardBg(color)} />
            <Statistic
              title={
                <span style={{ fontSize: '0.95rem', fontWeight: '600', color: theme.textSecondary }}>
                  {title}
                </span>
              }
              value={stats[statKey]}
              prefix={<Icon style={{ color, fontSize: '1.2rem' }} />}
              valueStyle={{ 
                fontSize: '2rem', 
                fontWeight: '700', 
                color: theme.textPrimary,
                marginBottom: '8px'
              }}
              loading={loading}
            />
            {customStatus ? (
              statKey === 'totalRacks' ? (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: theme.success }}>
                  <PoweroffOutlined style={{ marginRight: '4px' }} />
                  <span>正常运行</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: theme.success }}>
                  <span style={{ width: '8px', height: '8px', background: theme.success, borderRadius: '50%', marginRight: '8px' }} />
                  <span>全部在线</span>
                </div>
              )
            ) : (
              <div style={createTrendStyle(trend)}>
                {trend > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                <span style={{ marginLeft: '4px' }}>{Math.abs(trend)}%</span>
                <Tag color={tagColor} style={{ marginLeft: '8px', fontSize: '0.75rem' }}>本月</Tag>
              </div>
            )}
          </div>
        </Card>
      </Col>
    );
  }, [stats, loading]);

  const navButtons = useMemo(() => navButtonsData.map(({ key, icon: Icon, text }) => (
    <Button 
      key={key}
      type="text" 
      style={navButtonStyle}
      onMouseEnter={(e) => handleNavHover(e, true)}
      onMouseLeave={(e) => handleNavHover(e, false)}
    >
      <Icon style={navIconStyle} />
      <span style={navTextStyle}>{text}</span>
    </Button>
  )), [handleNavHover]);

  const systemInfo = useMemo(() => (
    <div style={systemInfoStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: '0', fontSize: '0.95rem', color: theme.textPrimary, fontWeight: '500' }}>
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
          style={{ background: theme.primary, borderColor: theme.primary }}
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
          <DashboardOutlined style={{ marginRight: '12px' }} />
          IDC设备管理系统
        </h1>
        <p style={subtitleStyle}>实时监控 • 智能管理 • 高效运维</p>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        {statCards.map(renderStatCard)}
      </Row>

      <div style={systemOverviewStyle}>
        <Card style={overviewCardStyle}>
          <div style={{ padding: '24px' }}>
            <div style={welcomeSectionStyle}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '600', 
                margin: '0 0 8px 0',
                color: 'white'
              }}>
                欢迎使用IDC设备管理系统
              </h2>
              <p style={{ 
                fontSize: '1rem', 
                margin: '0',
                opacity: '0.9',
                color: 'white'
              }}>
                专业的机房设备管理解决方案
              </p>
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
