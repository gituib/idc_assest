import React from 'react';
import { Layout, Menu, theme } from 'antd';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { BarChartOutlined, DatabaseOutlined, CloudServerOutlined } from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import DeviceManagement from './pages/DeviceManagement';
import RackManagement from './pages/RackManagement';
import RoomManagement from './pages/RoomManagement';
import DeviceFieldManagement from './pages/DeviceFieldManagement';


const { Header, Content, Sider } = Layout;

function App() {
  const { 
    token: { colorBgContainer, borderRadiusLG }, 
  } = theme.useToken();

  return (
    <Router>
      <Layout>
        <Header className="header" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          backgroundColor: '#001529',
          color: '#fff',
          fontSize: '20px',
          fontWeight: 'bold'
        }}>
          IDC设备管理系统
        </Header>
        <Layout>
          <Sider width={200} style={{ backgroundColor: colorBgContainer }}>
            <Menu
              mode="inline"
              defaultSelectedKeys={['1']}
              style={{ height: '100%', borderRight: 0 }}
              items={[
                {
                  key: '1',
                  icon: <BarChartOutlined />,
                  label: <Link to="/">仪表盘</Link>,
                },
                {
                  key: '2',
                  icon: <CloudServerOutlined />,
                  label: <Link to="/devices">设备管理</Link>,
                },
                {
                  key: '3',
                  icon: <DatabaseOutlined />,
                  label: <Link to="/racks">机柜管理</Link>,
                },
                {
                  key: '4',
                  icon: <DatabaseOutlined />,
                  label: <Link to="/rooms">机房管理</Link>,
                },
                {
                  key: '5',
                  icon: <BarChartOutlined />,
                  label: <Link to="/fields">字段管理</Link>,
                },
              ]}
            />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Content
              style={{
                padding: 24,
                margin: 0,
                minHeight: 280,
                background: colorBgContainer,
                borderRadius: borderRadiusLG,
              }}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/devices" element={<DeviceManagement />} />
                <Route path="/racks" element={<RackManagement />} />
                <Route path="/rooms" element={<RoomManagement />} />
                <Route path="/fields" element={<DeviceFieldManagement />} />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </Router>
  );
}

export default App;