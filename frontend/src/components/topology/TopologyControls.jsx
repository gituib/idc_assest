import React from 'react';
import { Card, Select, Space, Button, Row, Col, Statistic, Tag, Typography } from 'antd';
import {
  ReloadOutlined,
  AppstoreOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

function TopologyControls({
  switchDevices,
  selectedSwitchId,
  onSwitchChange,
  loading,
  onRefresh,
  statistics
}) {
  return (
    <Card
      size="small"
      title={
        <Space>
          <AppstoreOutlined />
          <span>选择交换机</span>
        </Space>
      }
      extra={
        <Button
          type="text"
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
          size="small"
        />
      }
      style={{ marginBottom: 16, borderRadius: 8 }}
      bodyStyle={{ padding: 16 }}
    >
      <Select
        placeholder="搜索并选择交换机..."
        value={selectedSwitchId || undefined}
        onChange={onSwitchChange}
        style={{ width: '100%', marginBottom: 16 }}
        allowClear
        showSearch
        filterOption={(input, option) =>
          option.label?.toLowerCase().includes(input.toLowerCase()) ?? true
        }
      >
        {switchDevices.map(device => (
          <Option key={device.deviceId} value={device.deviceId} label={device.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{device.name}</span>
              <Text type="secondary" style={{ fontSize: 11 }}>{device.deviceId}</Text>
            </div>
          </Option>
        ))}
      </Select>

      {statistics && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Row gutter={[8, 8]}>
            <Col span={12}>
              <Statistic
                title="设备数"
                value={statistics.totalDevices || 0}
                valueStyle={{ fontSize: 18 }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="连接数"
                value={statistics.totalCables || 0}
                valueStyle={{ fontSize: 18 }}
              />
            </Col>
          </Row>
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>连接状态：</Text>
            <Space size={4} style={{ marginTop: 4 }}>
              <Tag color="success" style={{ fontSize: 11 }}>{statistics.normalCables || 0} 正常</Tag>
              <Tag color="error" style={{ fontSize: 11 }}>{statistics.faultCables || 0} 故障</Tag>
              <Tag style={{ fontSize: 11 }}>{statistics.disconnectedCables || 0} 未连接</Tag>
            </Space>
          </div>
        </div>
      )}
    </Card>
  );
}

export default TopologyControls;
