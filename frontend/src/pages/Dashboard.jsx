import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, message } from 'antd';
import { DatabaseOutlined, CloudServerOutlined, WarningOutlined, PoweroffOutlined } from '@ant-design/icons';
import axios from 'axios';

function Dashboard() {
  const [stats, setStats] = useState({
    totalDevices: 0,
    totalRacks: 0,
    totalRooms: 0,
    faultDevices: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取统计数据
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // 获取所有设备
        const devicesRes = await axios.get('/api/devices');
        const totalDevices = devicesRes.data.length;
        const faultDevices = devicesRes.data.filter(device => device.status === 'fault').length;
        
        // 获取所有机柜
        const racksRes = await axios.get('/api/racks');
        const totalRacks = racksRes.data.length;
        
        // 获取所有机房
        const roomsRes = await axios.get('/api/rooms');
        const totalRooms = roomsRes.data.length;
        
        setStats({
          totalDevices,
          totalRacks,
          totalRooms,
          faultDevices
        });
      } catch (error) {
        message.error('获取统计数据失败');
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <h1>仪表盘</h1>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card variant="outlined">
            <Statistic
              title="总设备数"
              value={stats.totalDevices}
              prefix={<CloudServerOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="outlined">
            <Statistic
              title="总机柜数"
              value={stats.totalRacks}
              prefix={<DatabaseOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="outlined">
            <Statistic
              title="总机房数"
              value={stats.totalRooms}
              prefix={<DatabaseOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="outlined">
            <Statistic
              title="故障设备"
              value={stats.faultDevices}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#cf1322' }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>
      <Card title="系统概览" style={{ marginTop: 16 }}>
        <p>欢迎使用IDC设备管理系统！</p>
        <p>本系统用于管理IDC机房中的设备、机柜和机房信息，提供设备状态监控、资源分配等功能。</p>
      </Card>
    </div>
  );
}

export default Dashboard;