import React, { useState } from 'react';
import { Layout, Menu, theme, Button, Dropdown, Avatar, message, Space, Divider } from 'antd';
import { BarChartOutlined, DatabaseOutlined, CloudServerOutlined, MenuUnfoldOutlined, MenuFoldOutlined, EyeOutlined, BuildOutlined, HomeOutlined, ShoppingCartOutlined, InboxOutlined, ImportOutlined, FileTextOutlined, UserOutlined, LogoutOutlined, UserOutlined as UserIcon, HistoryOutlined, AuditOutlined, ToolOutlined, ScheduleOutlined } from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import DeviceManagement from './pages/DeviceManagement';
import RackManagement from './pages/RackManagement';
import RoomManagement from './pages/RoomManagement';
import DeviceFieldManagement from './pages/DeviceFieldManagement';
import RackVisualization from './pages/RackVisualization';
import ConsumableManagement from './pages/ConsumableManagement';
import ConsumableStatistics from './pages/ConsumableStatistics';
import ConsumableLogs from './pages/ConsumableLogs';
import CategoryManagement from './pages/CategoryManagement';
import UserManagement from './pages/UserManagement';
import LoginHistory from './pages/LoginHistory';
import OperationLogs from './pages/OperationLogs';
import Login from './pages/Login';
import TicketManagement from './pages/TicketManagement';
import TicketCategoryManagement from './pages/TicketCategoryManagement';
import TicketStatistics from './pages/TicketStatistics';
import { Spin } from 'antd';

const { Header, Content, Sider } = Layout;

const PrivateRoute = ({ children }) => {
  const { token, initialized, loading } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <Spin size="large" tip="正在加载认证状态..." />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const AppLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { 
    token: { colorBgContainer, borderRadiusLG }, 
  } = theme.useToken();

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ];

  return (
    <Layout>
      <Sider 
        width={220} 
        collapsedWidth={80}
        collapsed={collapsed}
        style={{
          backgroundColor: colorBgContainer,
          boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 64,
          padding: '0 12px',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 8
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: 18,
              padding: '8px',
              borderRadius: 4
            }}
          />
        </div>
        
        <Menu
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          style={{
            flex: 1,
            borderRight: 0,
            backgroundColor: 'transparent'
          }}
          items={[
            {
              key: 'dashboard',
              icon: <BarChartOutlined />,
              label: <Link to="/">仪表盘</Link>,
            },
            {
              key: 'room-management',
              icon: <HomeOutlined />,
              label: '机房管理',
              children: [
                {
                  key: 'rooms',
                  icon: <HomeOutlined />,
                  label: <Link to="/rooms">机房管理</Link>,
                },
                {
                  key: 'racks',
                  icon: <DatabaseOutlined />,
                  label: <Link to="/racks">机柜管理</Link>,
                },
                {
                  key: 'visualization',
                  icon: <EyeOutlined />,
                  label: <Link to="/visualization">机柜可视化</Link>,
                },
              ],
            },
            {
              key: 'asset-management',
              icon: <BuildOutlined />,
              label: '资产管理',
              children: [
                {
                  key: 'devices',
                  icon: <CloudServerOutlined />,
                  label: <Link to="/devices">设备管理</Link>,
                },
                {
                  key: 'fields',
                  icon: <DatabaseOutlined />,
                  label: <Link to="/fields">字段管理</Link>,
                },
              ],
            },
            {
              key: 'consumables-management',
              icon: <ShoppingCartOutlined />,
              label: '耗材管理',
              children: [
                {
                  key: 'consumables-stats',
                  icon: <BarChartOutlined />,
                  label: <Link to="/consumables-stats">耗材统计</Link>,
                },
                {
                  key: 'consumables',
                  icon: <DatabaseOutlined />,
                  label: <Link to="/consumables">耗材列表</Link>,
                },
                {
                  key: 'consumables-categories',
                  icon: <ImportOutlined />,
                  label: <Link to="/consumables-categories">分类管理</Link>,
                },
                {
                  key: 'consumables-logs',
                  icon: <FileTextOutlined />,
                  label: <Link to="/consumables-logs">操作日志</Link>,
                },
              ],
            },
            {
              key: 'system-management',
              icon: <UserOutlined />,
              label: '系统管理',
              children: [
                {
                  key: 'users',
                  icon: <UserOutlined />,
                  label: <Link to="/users">用户管理</Link>,
                },
                {
                  key: 'login-history',
                  icon: <HistoryOutlined />,
                  label: <Link to="/login-history">登录历史</Link>,
                },
                {
                  key: 'operation-logs',
                  icon: <AuditOutlined />,
                  label: <Link to="/operation-logs">操作日志</Link>,
                },
              ],
            },
            {
              key: 'ticket-management',
              icon: <ToolOutlined />,
              label: '工单管理',
              children: [
                {
                  key: 'tickets',
                  icon: <ScheduleOutlined />,
                  label: <Link to="/tickets">工单列表</Link>,
                },
                {
                  key: 'ticket-categories',
                  icon: <InboxOutlined />,
                  label: <Link to="/ticket-categories">故障分类</Link>,
                },
                {
                  key: 'ticket-statistics',
                  icon: <BarChartOutlined />,
                  label: <Link to="/ticket-statistics">统计报表</Link>,
                },
              ],
            },
          ]}
        />
      </Sider>
      <Layout style={{ padding: '0 24px 24px' }}>
        <Header style={{
          padding: '0 16px',
          height: 56,
          background: colorBgContainer,
          marginBottom: 24,
          borderRadius: borderRadiusLG,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
        }}>
          {user && (
            <Space size={12}>
              <Avatar 
                style={{ backgroundColor: '#1890ff', cursor: 'pointer' }}
                icon={<UserOutlined />}
              />
              <span style={{ color: '#666', fontSize: 14 }}>{user.username}</span>
              <Divider type="vertical" style={{ margin: 0 }} />
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ padding: '4px 8px' }}
              >
                退出
              </Button>
            </Space>
          )}
        </Header>
        <Content
          style={{
            padding: 24,
            margin: 0,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/devices"
          element={
            <PrivateRoute>
              <AppLayout>
                <DeviceManagement />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/racks"
          element={
            <PrivateRoute>
              <AppLayout>
                <RackManagement />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/rooms"
          element={
            <PrivateRoute>
              <AppLayout>
                <RoomManagement />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/fields"
          element={
            <PrivateRoute>
              <AppLayout>
                <DeviceFieldManagement />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/visualization"
          element={
            <PrivateRoute>
              <AppLayout>
                <RackVisualization />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/consumables"
          element={
            <PrivateRoute>
              <AppLayout>
                <ConsumableManagement />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/consumables-categories"
          element={
            <PrivateRoute>
              <AppLayout>
                <CategoryManagement />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/consumables-stats"
          element={
            <PrivateRoute>
              <AppLayout>
                <ConsumableStatistics />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/consumables-logs"
          element={
            <PrivateRoute>
              <AppLayout>
                <ConsumableLogs />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PrivateRoute>
              <AppLayout>
                <UserManagement />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/login-history"
          element={
            <PrivateRoute>
              <AppLayout>
                <LoginHistory />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/operation-logs"
          element={
            <PrivateRoute>
              <AppLayout>
                <OperationLogs />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <PrivateRoute>
              <AppLayout>
                <TicketManagement />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/ticket-categories"
          element={
            <PrivateRoute>
              <AppLayout>
                <TicketCategoryManagement />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/ticket-statistics"
          element={
            <PrivateRoute>
              <AppLayout>
                <TicketStatistics />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;