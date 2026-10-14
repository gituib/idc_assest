import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import {
  Layout,
  Menu,
  theme,
  Button,
  Dropdown,
  Avatar,
  message,
  Space,
  Divider,
  ConfigProvider as AntdConfigProvider,
} from 'antd';
import {
  BarChartOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  EyeOutlined,
  BuildOutlined,
  HomeOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  ImportOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  HistoryOutlined,
  AuditOutlined,
  SwapOutlined,
  ApartmentOutlined,
  ToolOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ApiOutlined,
  PartitionOutlined,
  CodepenOutlined,
  CloudUploadOutlined,
  LayoutOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useConfig } from './hooks/useConfig';
import { useSiteLogo } from './stores/configStore';
import { useDesignTokens } from './hooks/useDesignTokens';
import useIdleTimeout from './hooks/useIdleTimeout';
import { SWRConfig, swrConfig } from './hooks/useSWR';
import axios from 'axios';
import { Spin } from 'antd';
import ErrorBoundary from './components/ErrorBoundary';
import MaintenanceBanner from './components/MaintenanceBanner';
import EmailVerifyBanner from './components/EmailVerifyBanner';

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
const RoleManagement = lazy(() => import('./pages/RoleManagement'));
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const TicketManagement = lazy(() => import('./pages/TicketManagement'));
const TicketCategoryManagement = lazy(() => import('./pages/TicketCategoryManagement'));
const TicketStatistics = lazy(() => import('./pages/TicketStatistics'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const CableManagement = lazy(() => import('./pages/CableManagement'));
const PortManagement = lazy(() => import('./pages/PortManagement'));
const InventoryManagement = lazy(() => import('./pages/InventoryManagement'));
const InventoryTaskExecution = lazy(() => import('./pages/InventoryTaskExecution'));
const PendingDeviceManagement = lazy(() => import('./pages/PendingDeviceManagement'));
const BackupManagement = lazy(() => import('./pages/BackupManagement'));
const AutoBackupSettings = lazy(() => import('./pages/AutoBackupSettings'));
const RemoteBackupSettings = lazy(() => import('./pages/RemoteBackupSettings'));
const OperationLogs = lazy(() => import('./pages/OperationLogs'));
const ErrorBoundaryTest = lazy(() => import('./pages/ErrorBoundaryTest'));
const IdleDeviceManagement = lazy(() => import('./pages/IdleDeviceManagement'));
const RoomFloorPlan = lazy(() => import('./pages/RoomFloorPlan'));
const IpamManagement = lazy(() => import('./pages/IpamManagement'));

const { Header, Content, Sider } = Layout;

const PageLoading = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#f5f5f5',
      gap: '16px',
    }}
  >
    <Spin size="large" />
    <span style={{ color: '#8c8c8c', fontSize: '14px' }}>正在加载页面...</span>
  </div>
);

const AuthLoading = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#f5f5f5',
      gap: '16px',
    }}
  >
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

const DEFAULT_IDLE_CONFIG = {
  timeout: 30 * 60 * 1000,
  warningTime: 60 * 1000,
};

const AppLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState('dashboard');
  const [idleConfig, setIdleConfig] = useState(DEFAULT_IDLE_CONFIG);
  const { user, logout, hasPermission } = useAuth();
  const { config } = useConfig();
  const siteLogo = useSiteLogo();
  const navigate = useNavigate();
  const location = useLocation();
  const designTokens = useDesignTokens();

  useEffect(() => {
    const fetchIdleConfig = async () => {
      try {
        const response = await axios.get('/api/system-settings/idle-timeout');
        setIdleConfig({
          timeout: response.data.timeout,
          warningTime: response.data.warningTime,
        });
      } catch (error) {
        console.warn('获取空闲超时配置失败，使用默认配置:', error);
      }
    };

    fetchIdleConfig();
  }, []);

  useIdleTimeout({
    timeout: idleConfig.timeout,
    warningTime: idleConfig.warningTime,
    onLogout: logout,
    enabled: true,
  });

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
    if (path.startsWith('/cables') || path.startsWith('/ports')) return 'line-management';
    if (path.startsWith('/ipam')) return 'ipam-management';
    if (
      path.startsWith('/devices') ||
      path.startsWith('/fields') ||
      path.startsWith('/idle-devices')
    )
      return 'asset-management';
    if (path.startsWith('/consumables')) return 'consumables-management';
    if (
      path.startsWith('/users') ||
      path.startsWith('/login-history') ||
      path.startsWith('/operation-logs') ||
      path.startsWith('/settings') ||
      path.startsWith('/account-settings') ||
      path.startsWith('/backup')
    )
      return 'system-management';
    if (path.startsWith('/tickets')) return 'ticket-management';
    if (path.startsWith('/inventory') || path.startsWith('/pending-devices'))
      return 'inventory-management';
    return 'dashboard';
  };

  const menuItems = useMemo(() => [
    {
      key: 'dashboard',
      icon: <BarChartOutlined style={{ fontSize: '18px' }} />,
      label: <Link to="/">仪表盘</Link>,
    },
    ...(hasPermission('room:view') || hasPermission('rack:view') || hasPermission('rack:3d') || hasPermission('floorplan') ? [{
      key: 'room-management',
      icon: <HomeOutlined style={{ fontSize: '18px' }} />,
      label: '机房管理',
      children: [
        ...(hasPermission('room:view') ? [{ key: 'rooms', icon: <HomeOutlined style={{ fontSize: '16px' }} />, label: <Link to="/rooms">机房管理</Link> }] : []),
        ...(hasPermission('rack:view') ? [{ key: 'racks', icon: <DatabaseOutlined style={{ fontSize: '16px' }} />, label: <Link to="/racks">机柜管理</Link> }] : []),
        ...(hasPermission('rack:3d') ? [{ key: 'visualization-3d', icon: <CodepenOutlined style={{ fontSize: '16px' }} />, label: <Link to="/visualization-3d">3D机柜可视化</Link> }] : []),
        ...(hasPermission('floorplan') ? [{ key: 'floor-plan', icon: <LayoutOutlined style={{ fontSize: '16px' }} />, label: <Link to="/floor-plan">机房平面图</Link> }] : []),
      ].filter(Boolean),
    }] : []),
    ...(hasPermission('device:view') || hasPermission('idle:view') || hasPermission('field:page') ? [{
      key: 'asset-management',
      icon: <BuildOutlined style={{ fontSize: '18px' }} />,
      label: '资产管理',
      children: [
        ...(hasPermission('device:view') ? [{ key: 'devices', icon: <CloudServerOutlined style={{ fontSize: '16px' }} />, label: <Link to="/devices">设备管理</Link> }] : []),
        ...(hasPermission('idle:view') ? [{ key: 'idle-devices', icon: <CloudServerOutlined style={{ fontSize: '16px' }} />, label: <Link to="/idle-devices">空闲设备</Link> }] : []),
        ...(hasPermission('field:page') ? [{ key: 'fields', icon: <DatabaseOutlined style={{ fontSize: '16px' }} />, label: <Link to="/fields">字段管理</Link> }] : []),
      ].filter(Boolean),
    }] : []),
    ...(hasPermission('port:view') || hasPermission('cable:view') ? [{
      key: 'line-management',
      icon: <ApartmentOutlined style={{ fontSize: '18px' }} />,
      label: '线路管理',
      children: [
        ...(hasPermission('port:view') ? [{ key: 'ports', icon: <PartitionOutlined style={{ fontSize: '16px' }} />, label: <Link to="/ports">端口管理</Link> }] : []),
        ...(hasPermission('cable:view') ? [{ key: 'cables', icon: <SwapOutlined style={{ fontSize: '16px' }} />, label: <Link to="/cables">接线管理</Link> }] : []),
      ].filter(Boolean),
    }] : []),
    ...(hasPermission('ipam:view') ? [{
      key: 'ipam-management',
      icon: <ApiOutlined style={{ fontSize: '18px' }} />,
      label: 'IP地址管理',
      children: [
        ...(hasPermission('ipam:view') ? [{ key: 'ipam', icon: <ApiOutlined style={{ fontSize: '16px' }} />, label: <Link to="/ipam">网段与IP</Link> }] : []),
      ].filter(Boolean),
    }] : []),
    ...(hasPermission('consumable:view') || hasPermission('consumable:stats') || hasPermission('consumable:category') || hasPermission('consumable:log') ? [{
      key: 'consumables-management',
      icon: <ShoppingCartOutlined style={{ fontSize: '18px' }} />,
      label: '耗材管理',
      children: [
        ...(hasPermission('consumable:stats') ? [{ key: 'consumables-stats', icon: <BarChartOutlined style={{ fontSize: '16px' }} />, label: <Link to="/consumables-stats">耗材统计</Link> }] : []),
        ...(hasPermission('consumable:view') ? [{ key: 'consumables', icon: <DatabaseOutlined style={{ fontSize: '16px' }} />, label: <Link to="/consumables">耗材列表</Link> }] : []),
        ...(hasPermission('consumable:category') ? [{ key: 'consumables-categories', icon: <ImportOutlined style={{ fontSize: '16px' }} />, label: <Link to="/consumables-categories">分类管理</Link> }] : []),
        ...(hasPermission('consumable:log') ? [{ key: 'consumables-logs', icon: <FileTextOutlined style={{ fontSize: '16px' }} />, label: <Link to="/consumables-logs">操作日志</Link> }] : []),
      ].filter(Boolean),
    }] : []),
    ...(hasPermission('ticket:view') || hasPermission('ticket:category') || hasPermission('ticket:stats') ? [{
      key: 'ticket-management',
      icon: <ToolOutlined style={{ fontSize: '18px' }} />,
      label: '工单管理',
      children: [
        ...(hasPermission('ticket:stats') ? [{ key: 'ticket-statistics', icon: <BarChartOutlined style={{ fontSize: '16px' }} />, label: <Link to="/ticket-statistics">统计报表</Link> }] : []),
        ...(hasPermission('ticket:view') ? [{ key: 'tickets', icon: <ScheduleOutlined style={{ fontSize: '16px' }} />, label: <Link to="/tickets">故障工单</Link> }] : []),
        ...(hasPermission('ticket:category') ? [{ key: 'ticket-categories', icon: <InboxOutlined style={{ fontSize: '16px' }} />, label: <Link to="/ticket-categories">故障分类</Link> }] : []),
      ].filter(Boolean),
    }] : []),
    ...(hasPermission('inventory:plan') || hasPermission('inventory:pending') ? [{
      key: 'inventory-management',
      icon: <InboxOutlined style={{ fontSize: '18px' }} />,
      label: '资产盘点',
      children: [
        ...(hasPermission('inventory:plan') ? [{ key: 'inventory', icon: <InboxOutlined style={{ fontSize: '16px' }} />, label: <Link to="/inventory">盘点计划</Link> }] : []),
        ...(hasPermission('inventory:pending') ? [{ key: 'pending-devices', icon: <CloudUploadOutlined style={{ fontSize: '16px' }} />, label: <Link to="/pending-devices">盘盈设备</Link> }] : []),
      ].filter(Boolean),
    }] : []),
    // 网络拓扑菜单项已移除（功能合并到接线管理中的拓扑弹窗）
    ...(hasPermission('user:view') || hasPermission('role:view') || hasPermission('settings:view') || hasPermission('backup:view') || hasPermission('log:view') ? [{
      key: 'system-management',
      icon: <UserOutlined style={{ fontSize: '18px' }} />,
      label: '系统管理',
      children: [
        ...(hasPermission('user:view') ? [{ key: 'users', icon: <UserOutlined style={{ fontSize: '16px' }} />, label: <Link to="/users">用户管理</Link> }] : []),
        ...(hasPermission('role:view') ? [{ key: 'roles', icon: <SafetyOutlined style={{ fontSize: '16px' }} />, label: <Link to="/roles">角色管理</Link> }] : []),
        ...(hasPermission('backup:view') ? [{ key: 'backup', icon: <DatabaseOutlined style={{ fontSize: '16px' }} />, label: <Link to="/backup">数据备份</Link> }] : []),
        ...(hasPermission('log:view') ? [{ key: 'operation-logs', icon: <AuditOutlined style={{ fontSize: '16px' }} />, label: <Link to="/operation-logs">操作日志</Link> }] : []),
        ...(hasPermission('settings:view') ? [{ key: 'system-settings', icon: <SettingOutlined style={{ fontSize: '16px' }} />, label: <Link to="/settings">系统设置</Link> }] : []),
      ].filter(Boolean),
    }] : []),
  ].filter(Boolean), [hasPermission]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <style>{`
        /* 让侧边栏的子容器变为纵向 flex，保证菜单区滚动、收起按钮固定在底部不消失 */
        .app-sider .ant-layout-sider-children {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
      `}</style>
      <Sider
        width={216}
        collapsedWidth={72}
        collapsed={collapsed}
        className="app-sider"
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
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '18px 0' : '20px 14px',
            borderBottom: `1px solid ${designTokens.colors.sidebar.border}`,
            minHeight: '76px',
            flexShrink: 0,
            background: designTokens.colors.sidebar.bg,
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 12,
              background: siteLogo ? 'transparent' : designTokens.colors.primary.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
              boxShadow: siteLogo
                ? 'none'
                : `0 4px 12px ${designTokens.colors.primary.gradientShadow || 'rgba(102,126,234,0.4)'}`,
            }}
          >
            {siteLogo ? (
              <img
                src={siteLogo}
                alt="Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                {/* 服务器机柜三层挡板 */}
                <rect x="4" y="5" width="16" height="5" rx="1.4" fill="#ffffff" />
                <rect x="4" y="11.5" width="16" height="5" rx="1.4" fill="#ffffff" opacity="0.82" />
                <rect x="4" y="18" width="16" height="5" rx="1.4" fill="#ffffff" opacity="0.62" />
                {/* 状态指示灯：运行/正常/待机 */}
                <circle cx="17.5" cy="7.5" r="1.5" fill="#FFD54F" />
                <circle cx="17.5" cy="14" r="1.5" fill="#69F0AE" />
                <circle cx="17.5" cy="20.5" r="1.5" fill="#40C4FF" />
              </svg>
            )}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <div
                title={config.site_name || 'IDC管理'}
                style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: designTokens.colors.primary.main,
                  lineHeight: 1.3,
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {config.site_name || 'IDC管理'}
              </div>
              <div
                title="数据中心管理平台"
                style={{
                  fontSize: '11px',
                  color: designTokens.colors.sidebar.text,
                  marginTop: '3px',
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                数据中心管理平台
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: collapsed ? '16px 0' : '18px 12px 24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            defaultOpenKeys={[]}
            style={{
              background: 'transparent',
              borderRight: 0,
              fontSize: '14px',
            }}
            items={menuItems}
          />
        </div>

        <div
          style={{
            padding: '14px 12px',
            borderTop: `1px solid ${designTokens.colors.sidebar.border}`,
            flexShrink: 0,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: '100%',
              height: '46px',
              color: designTokens.colors.text.secondary,
              fontSize: '17px',
              borderRadius: designTokens.borderRadius.small,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '10px',
            }}
          >
            {!collapsed && (
              <span style={{ fontSize: '14px', fontWeight: 500, color: designTokens.colors.text.secondary }}>
                收起菜单
              </span>
            )}
          </Button>
        </div>
      </Sider>

      <Layout
        style={{
          marginLeft: collapsed ? 72 : 216,
          transition: 'margin-left 0.2s ease',
        }}
      >
        <Header
          style={{
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
            overflow: 'visible',
          }}
        >
          {user && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                height: '100%',
              }}
            >
              <Dropdown
                overlayStyle={{ minWidth: 160 }}
                menu={{
                  items: [
                    {
                      key: 'account-settings',
                      icon: <UserOutlined />,
                      label: '账号设置',
                      onClick: () => navigate('/account-settings'),
                    },
                    { type: 'divider' },
                    {
                      key: 'logout',
                      icon: <LogoutOutlined />,
                      label: '退出登录',
                      danger: true,
                      onClick: handleLogout,
                    },
                  ],
                }}
                placement="bottomRight"
                trigger={['click']}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 12px',
                    background: designTokens.colors.background.secondary,
                    borderRadius: designTokens.borderRadius.medium,
                    height: '40px',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = designTokens.colors.sidebar.bgHover;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = designTokens.colors.background.secondary;
                  }}
                >
                  <Avatar
                    style={{
                      backgroundColor: designTokens.colors.primary.main,
                      cursor: 'pointer',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    icon={<UserOutlined style={{ fontSize: '14px' }} />}
                  />
                  <span
                    style={{
                      color: designTokens.colors.text.primary,
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {user.username}
                  </span>
                </div>
              </Dropdown>
            </div>
          )}
        </Header>
        {/* 邮箱未验证提示横幅：仅登录态显示，引导用户验证邮箱 */}
        <EmailVerifyBanner />
        <Content
          style={{
            padding: 24,
            margin: 0,
            minHeight: 'calc(100vh - 64px)',
            background: designTokens.colors.background.secondary,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

const routeConfig = [
  { path: '/', component: Dashboard },
  { path: '/devices', component: DeviceManagement },
  { path: '/racks', component: RackManagement },
  { path: '/rooms', component: RoomManagement },
  { path: '/fields', component: DeviceFieldManagement },
  { path: '/consumables', component: ConsumableManagement },
  { path: '/consumables-categories', component: CategoryManagement },
  { path: '/consumables-stats', component: ConsumableStatistics },
  { path: '/consumables-logs', component: ConsumableLogs },
  { path: '/users', component: UserManagement },
  { path: '/roles', component: RoleManagement },
  { path: '/tickets', component: TicketManagement },
  { path: '/ticket-categories', component: TicketCategoryManagement },
  { path: '/ticket-statistics', component: TicketStatistics },
  { path: '/settings', component: SystemSettings },
  { path: '/account-settings', component: AccountSettings },
  { path: '/cables', component: CableManagement },
  { path: '/inventory', component: InventoryManagement },
  { path: '/inventory/execution', component: InventoryTaskExecution },
  { path: '/pending-devices', component: PendingDeviceManagement },
  { path: '/ports', component: PortManagement },
  { path: '/backup', component: BackupManagement },
  { path: '/auto-backup-settings', component: AutoBackupSettings },
  { path: '/remote-backup-settings', component: RemoteBackupSettings },
  { path: '/operation-logs', component: OperationLogs },
  { path: '/error-boundary-test', component: ErrorBoundaryTest },
  { path: '/idle-devices', component: IdleDeviceManagement },
  { path: '/floor-plan', component: RoomFloorPlan },
  { path: '/ipam', component: IpamManagement },
];

const ThemeConfig = () => {
  const designTokens = useDesignTokens();

  const renderRoute = (path, Component, needsErrorBoundary = true) => {
    const element = (
      <PrivateRoute>
        <Component />
      </PrivateRoute>
    );

    if (needsErrorBoundary) {
      return (
        <Route
          key={path}
          path={path}
          element={
            <ErrorBoundary
              fullPage={false}
              title="页面加载失败"
              subTitle="该页面在加载过程中遇到了错误，请尝试重新加载"
            >
              {element}
            </ErrorBoundary>
          }
        />
      );
    }

    return <Route key={path} path={path} element={element} />;
  };

  return (
    <AntdConfigProvider
      theme={{
        token: designTokens,
        components: {
          Menu: {
            itemHeight: 46,
            itemMarginBlock: 4,
            itemBorderRadius: 8,
            iconMarginInlineEnd: 12,
          },
        },
      }}
    >
      <SWRConfig value={swrConfig}>
        <Router>
          <MaintenanceBanner />
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route
                path="/login"
                element={
                  <ErrorBoundary fullPage>
                    <Login />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <ErrorBoundary fullPage>
                    <ForgotPassword />
                  </ErrorBoundary>
                }
              />
              {routeConfig.map(({ path, component: Component }) => renderRoute(path, Component))}
              <Route
                path="/visualization-3d"
                element={
                  <PrivateRoute>
                    <ErrorBoundary
                      fullPage={false}
                      title="3D 可视化加载失败"
                      subTitle="3D 场景在加载过程中遇到错误，可能是浏览器不支持 WebGL 或模型文件加载失败"
                    >
                      <Rack3DVisualization />
                    </ErrorBoundary>
                  </PrivateRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </SWRConfig>
    </AntdConfigProvider>
  );
};

function App() {
  return <ThemeConfig />;
}

export default App;