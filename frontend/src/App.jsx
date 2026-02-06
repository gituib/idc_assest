import React, { useState, Suspense, lazy } from 'react';
import { Layout, Menu, theme, Button, Dropdown, Avatar, message, Space, Divider, ConfigProvider as AntdConfigProvider } from 'antd';
import { BarChartOutlined, DatabaseOutlined, CloudServerOutlined, MenuUnfoldOutlined, MenuFoldOutlined, EyeOutlined, BuildOutlined, HomeOutlined, ShoppingCartOutlined, InboxOutlined, ImportOutlined, FileTextOutlined, UserOutlined, LogoutOutlined, HistoryOutlined, AuditOutlined, ToolOutlined, ScheduleOutlined, SettingOutlined, ApiOutlined, PartitionOutlined, CodepenOutlined } from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import { Scene3DProvider } from './context/Scene3DContext';
import { useDesignTokens } from './hooks/useDesignTokens';
import { Spin } from 'antd';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const DeviceManagement = lazy(() => import('./pages/DeviceManagement'));
const RackManagement = lazy(() => import('./pages/RackManagement'));
const RoomManagement = lazy(() => import('./pages/RoomManagement'));
const DeviceFieldManagement = lazy(() => import('./pages/DeviceFieldManagement'));
const Rack3DVisualization = lazy(() => import('./pages/Rack3DVisualization'));
const ConsumableManagement = lazy(() => import('./pages/ConsumableManagement'));
const ConsumableStatistics = lazy(() => import('./pages/ConsumableStatistics'));
const ConsumableLogs = lazy(() => import('./pages/ConsumableLogs'));
const CategoryManagement = lazy(() => import('./pages/CategoryManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Login = lazy(() => import('./pages/Login'));
const TicketManagement = lazy(() => import('./pages/TicketManagement'));
const TicketCategoryManagement = lazy(() => import('./pages/TicketCategoryManagement'));
const TicketStatistics = lazy(() => import('./pages/TicketStatistics'));
const TicketFieldManagement = lazy(() => import('./pages/TicketFieldManagement'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const CableManagement = lazy(() => import('./pages/CableManagement'));
const PortManagement = lazy(() => import('./pages/PortManagement'));

const { Header, Content, Sider } = Layout;

const PageLoading = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: '#f5f5f5',
    gap: '16px'
  }}>
    <Spin size="large" />
    <span style={{ color: '#8c8c8c', fontSize: '14px' }}>正在加载页面...</span>
  </div>
);

const AuthLoading = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: '#f5f5f5',
    gap: '16px'
  }}>
    <Spin size="large" />
    <span style={{ color: '#8c8c8c', fontSize: '14px' }}>正在加载认证状态...</span>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { token, initialized, loading } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return <AuthLoading />;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

const ProtectedRoute = ({ component: Component }) => (
  <PrivateRoute>
    <Component />
  </PrivateRoute>
);

const AppLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState('dashboard');
  const { user, logout } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const designTokens = useDesignTokens();
  
  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login');
  };

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/visualization-3d')) return 'visualization-3d';
    if (path.startsWith('/rooms') || path.startsWith('/racks')) return 'room-management';
    if (path.startsWith('/devices') || path.startsWith('/fields') || path.startsWith('/cables') || path.startsWith('/ports')) return 'asset-management';
    if (path.startsWith('/consumables')) return 'consumables-management';
    if (path.startsWith('/users') || path.startsWith('/login-history') || path.startsWith('/operation-logs') || path.startsWith('/settings')) return 'system-management';
    if (path.startsWith('/tickets')) return 'ticket-management';
    return 'dashboard';
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <BarChartOutlined style={{ fontSize: '18px' }} />,
      label: <Link to="/">仪表盘</Link>,
    },
    {
      key: 'room-management',
      icon: <HomeOutlined style={{ fontSize: '18px' }} />,
      label: '机房管理',
      children: [
        {
          key: 'rooms',
          icon: <HomeOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/rooms">机房管理</Link>,
        },
        {
          key: 'racks',
          icon: <DatabaseOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/racks">机柜管理</Link>,
        },
        {
          key: 'visualization-3d',
          icon: <CodepenOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/visualization-3d">3D机柜可视化</Link>,
        },
      ],
    },
    {
      key: 'asset-management',
      icon: <BuildOutlined style={{ fontSize: '18px' }} />,
      label: '资产管理',
      children: [
        {
          key: 'devices',
          icon: <CloudServerOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/devices">设备管理</Link>,
        },
        {
          key: 'fields',
          icon: <DatabaseOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/fields">字段管理</Link>,
        },
        {
          key: 'cables',
          icon: <ApiOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/cables">接线管理</Link>,
        },
        {
          key: 'ports',
          icon: <PartitionOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/ports">端口管理</Link>,
        },
      ],
    },
    {
      key: 'consumables-management',
      icon: <ShoppingCartOutlined style={{ fontSize: '18px' }} />,
      label: '耗材管理',
      children: [
        {
          key: 'consumables-stats',
          icon: <BarChartOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/consumables-stats">耗材统计</Link>,
        },
        {
          key: 'consumables',
          icon: <DatabaseOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/consumables">耗材列表</Link>,
        },
        {
          key: 'consumables-categories',
          icon: <ImportOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/consumables-categories">分类管理</Link>,
        },
        {
          key: 'consumables-logs',
          icon: <FileTextOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/consumables-logs">操作日志</Link>,
        },
      ],
    },
    {
      key: 'ticket-management',
      icon: <ToolOutlined style={{ fontSize: '18px' }} />,
      label: '工单管理',
      children: [
        {
          key: 'tickets',
          icon: <ScheduleOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/tickets">工单列表</Link>,
        },
        {
          key: 'ticket-categories',
          icon: <InboxOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/ticket-categories">故障分类</Link>,
        },
        {
          key: 'ticket-statistics',
          icon: <BarChartOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/ticket-statistics">统计报表</Link>,
        },
        {
          key: 'ticket-fields',
          icon: <DatabaseOutlined style={{ fontSize: '16px' }} />,
          label: <Link to="/ticket-fields">字段管理</Link>,
        },
      ],
    },
    {
        key: 'system-management',
        icon: <UserOutlined style={{ fontSize: '18px' }} />,
        label: '系统管理',
        children: [
          {
            key: 'users',
            icon: <UserOutlined style={{ fontSize: '16px' }} />,
            label: <Link to="/users">用户管理</Link>,
          },
          {
            key: 'system-settings',
            icon: <SettingOutlined style={{ fontSize: '16px' }} />,
            label: <Link to="/settings">系统设置</Link>,
          },
        ],
      },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        width={240} 
        collapsedWidth={72}
        collapsed={collapsed}
        style={{
          background: designTokens.colors.sidebar.bg,
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.06)',
          borderRight: `1px solid ${designTokens.colors.sidebar.border}`,
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '16px 0' : '16px 20px',
          borderBottom: `1px solid ${designTokens.colors.sidebar.border}`,
          minHeight: '64px',
          background: designTokens.colors.sidebar.bg
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: designTokens.borderRadius.small,
            background: designTokens.colors.primary.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CloudServerOutlined style={{ fontSize: '18px', color: '#ffffff' }} />
          </div>
          {!collapsed && (
            <div>
              <div style={{
                fontSize: '15px',
                fontWeight: '600',
                color: designTokens.colors.primary.main,
                lineHeight: 1.2
              }}>
                {config.site_name || 'IDC管理'}
              </div>
              <div style={{
                fontSize: '11px',
                color: designTokens.colors.sidebar.text,
                marginTop: '2px'
              }}>
                数据中心管理平台
              </div>
            </div>
          )}
        </div>
        
        <div style={{ 
          padding: collapsed ? '12px 0' : '12px 8px',
          overflowY: 'auto',
          flex: 1
        }}>
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            defaultOpenKeys={[]}
            style={{
              background: 'transparent',
              borderRight: 0,
              fontSize: '14px'
            }}
            items={menuItems}
          />
        </div>
        
        <div style={{
          padding: '12px',
          borderTop: `1px solid ${designTokens.colors.sidebar.border}`
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: '100%',
              height: '40px',
              color: designTokens.colors.text.secondary,
              fontSize: '16px',
              borderRadius: designTokens.borderRadius.small,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '8px'
            }}
          >
            {!collapsed && <span style={{ fontSize: '13px', color: designTokens.colors.text.secondary }}>收起菜单</span>}
          </Button>
        </div>
      </Sider>
      
      <Layout style={{ 
        marginLeft: collapsed ? 72 : 240,
        transition: 'margin-left 0.2s ease'
      }}>
        <Header style={{
          padding: '0 24px',
          height: 64,
          background: designTokens.colors.background.primary,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          boxShadow: designTokens.shadows.small,
          position: 'sticky',
          top: 0,
          zIndex: 99,
          overflow: 'visible'
        }}>
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              height: '100%'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                background: designTokens.colors.background.secondary,
                borderRadius: designTokens.borderRadius.medium,
                height: '40px',
                boxSizing: 'border-box'
              }}>
                <Avatar 
                  style={{ 
                    backgroundColor: designTokens.colors.primary.main,
                    cursor: 'pointer',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  icon={<UserOutlined style={{ fontSize: '14px' }} />}
                />
                <span style={{ 
                  color: designTokens.colors.text.primary, 
                  fontSize: 14,
                  fontWeight: 500
                }}>{user.username}</span>
              </div>
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ 
                  padding: '8px 12px',
                  height: 'auto',
                  borderRadius: designTokens.borderRadius.small,
                  fontSize: 13
                }}
              >
                退出
              </Button>
            </div>
          )}
        </Header>
        <Content
          style={{
            padding: 24,
            margin: 0,
            minHeight: 'calc(100vh - 64px)',
            background: designTokens.colors.background.secondary
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

const ThemeConfig = () => {
  const designTokens = useDesignTokens();

  return (
    <AntdConfigProvider theme={{ token: designTokens }}>
      <Router>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/devices" element={<PrivateRoute><DeviceManagement /></PrivateRoute>} />
            <Route path="/racks" element={<PrivateRoute><RackManagement /></PrivateRoute>} />
            <Route path="/rooms" element={<PrivateRoute><RoomManagement /></PrivateRoute>} />
            <Route path="/fields" element={<PrivateRoute><DeviceFieldManagement /></PrivateRoute>} />
            <Route path="/visualization-3d" element={<PrivateRoute><Scene3DProvider><Rack3DVisualization /></Scene3DProvider></PrivateRoute>} />
            <Route path="/consumables" element={<PrivateRoute><ConsumableManagement /></PrivateRoute>} />
            <Route path="/consumables-categories" element={<PrivateRoute><CategoryManagement /></PrivateRoute>} />
            <Route path="/consumables-stats" element={<PrivateRoute><ConsumableStatistics /></PrivateRoute>} />
            <Route path="/consumables-logs" element={<PrivateRoute><ConsumableLogs /></PrivateRoute>} />
            <Route path="/users" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
            <Route path="/tickets" element={<PrivateRoute><TicketManagement /></PrivateRoute>} />
            <Route path="/ticket-categories" element={<PrivateRoute><TicketCategoryManagement /></PrivateRoute>} />
            <Route path="/ticket-statistics" element={<PrivateRoute><TicketStatistics /></PrivateRoute>} />
            <Route path="/ticket-fields" element={<PrivateRoute><TicketFieldManagement /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><SystemSettings /></PrivateRoute>} />
            <Route path="/cables" element={<PrivateRoute><CableManagement /></PrivateRoute>} />
            <Route path="/ports" element={<PrivateRoute><PortManagement /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AntdConfigProvider>
  );
};

function App() {
  return (
    <ConfigProvider>
      <ThemeConfig />
    </ConfigProvider>
  );
}

export default App;