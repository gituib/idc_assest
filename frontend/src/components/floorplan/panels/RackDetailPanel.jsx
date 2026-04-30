import React from 'react';
import { Drawer, Descriptions, Tag, Progress, Button, Space } from 'antd';
import {
  CloudServerOutlined,
  ThunderboltOutlined,
  RightOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { RACK_STATUS_COLORS } from '../canvas/CanvasConstants';

const statusMap = {
  active: { text: '在用', color: 'blue' },
  maintenance: { text: '维护中', color: 'orange' },
  inactive: { text: '停用', color: 'default' },
};

const RackDetailPanel = ({ rack, visible, onClose }) => {
  const navigate = useNavigate();

  if (!rack) return null;

  const statusInfo = statusMap[rack.status] || { text: rack.status, color: 'default' };
  const utilization = rack.utilization != null ? Math.round(rack.utilization * 100) : 0;
  const powerPercent = rack.maxPower > 0
    ? Math.round(((rack.currentPower || 0) / rack.maxPower) * 100)
    : 0;

  const handleView3D = () => {
    navigate('/visualization-3d', { state: { rackId: rack.rackId } });
  };

  const handleViewDevices = () => {
    navigate('/devices', { state: { rackId: rack.rackId } });
  };

  return (
    <Drawer
      title={
        <Space>
          <CloudServerOutlined style={{ color: RACK_STATUS_COLORS[rack.status] || '#1677ff' }} />
          {rack.name}
        </Space>
      }
      placement="right"
      width={360}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={handleView3D}
          >
            3D视图
          </Button>
          <Button
            size="small"
            icon={<RightOutlined />}
            onClick={handleViewDevices}
          >
            设备
          </Button>
        </Space>
      }
    >
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="机柜ID">{rack.rackId}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="位置">
          {rack.rowPos != null && rack.colPos != null
            ? `第${rack.rowPos + 1}排 第${rack.colPos + 1}列`
            : '未分配'}
        </Descriptions.Item>
        <Descriptions.Item label="朝向">{rack.facing || 'front'}</Descriptions.Item>
        <Descriptions.Item label="高度">{rack.height}U</Descriptions.Item>
        <Descriptions.Item label="设备数量">{rack.deviceCount || 0} 台</Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>U位使用率</div>
        <Progress
          percent={utilization}
          strokeColor={
            utilization < 30 ? '#52c41a' :
            utilization < 70 ? '#faad14' : '#ff4d4f'
          }
          format={() => `${rack.usedU || 0}/${rack.totalU || rack.height || 0}U`}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>
          <ThunderboltOutlined /> 功率
        </div>
        <Progress
          percent={powerPercent}
          strokeColor={
            powerPercent < 50 ? '#52c41a' :
            powerPercent < 80 ? '#faad14' : '#ff4d4f'
          }
          format={() => `${rack.currentPower || 0}/${rack.maxPower || 0}W`}
        />
      </div>
    </Drawer>
  );
};

export default RackDetailPanel;
