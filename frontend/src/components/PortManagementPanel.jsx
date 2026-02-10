import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Tag, Tooltip, Popconfirm, Empty, Spin, Badge } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import PortCreateModal from './PortCreateModal';

const designTokens = {
  colors: {
    primary: {
      main: '#667eea',
    },
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
  },
};

function PortManagementPanel({ deviceId, deviceName, onRefresh }) {
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const fetchPorts = useCallback(async () => {
    if (!deviceId) return;

    try {
      setLoading(true);
      const response = await axios.get(`/api/device-ports/device/${deviceId}`);
      setPorts(response.data || []);
    } catch (error) {
      console.error('获取端口列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchPorts();
  }, [fetchPorts]);

  const handleDelete = useCallback(
    async port => {
      try {
        await axios.delete(`/api/device-ports/${port.portId}`);
        import('antd').then(({ message }) => message.success('端口删除成功'));
        fetchPorts();
        onRefresh?.();
      } catch (error) {
        import('antd').then(({ message }) => message.error('端口删除失败'));
      }
    },
    [fetchPorts, onRefresh]
  );

  const handleCreateSuccess = useCallback(() => {
    fetchPorts();
    onRefresh?.();
  }, [fetchPorts, onRefresh]);

  const getStatusTag = status => {
    const config = {
      free: { color: 'success', text: '空闲' },
      occupied: { color: 'processing', text: '占用' },
      fault: { color: 'error', text: '故障' },
    };
    const { color, text } = config[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  const getTypeTag = type => {
    const config = {
      RJ45: { color: 'blue', text: 'RJ45' },
      SFP: { color: 'green', text: 'SFP' },
      'SFP+': { color: 'cyan', text: 'SFP+' },
      SFP28: { color: 'purple', text: 'SFP28' },
      QSFP: { color: 'orange', text: 'QSFP' },
      QSFP28: { color: 'red', text: 'QSFP28' },
    };
    const { color, text } = config[type] || { color: 'default', text: type };
    return <Tag color={color}>{text}</Tag>;
  };

  const columns = [
    {
      title: '端口名称',
      dataIndex: 'portName',
      key: 'portName',
      width: 120,
      render: text => (
        <Tooltip title={text}>
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '类型',
      dataIndex: 'portType',
      key: 'portType',
      width: 90,
      render: type => getTypeTag(type),
    },
    {
      title: '速率',
      dataIndex: 'portSpeed',
      key: 'portSpeed',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: status => getStatusTag(status),
    },
    {
      title: 'VLAN',
      dataIndex: 'vlanId',
      key: 'vlanId',
      width: 70,
      render: vlanId => vlanId || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Popconfirm
            title="确定要删除此端口吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const freeCount = ports.filter(p => p.status === 'free').length;
  const occupiedCount = ports.filter(p => p.status === 'occupied').length;
  const faultCount = ports.filter(p => p.status === 'fault').length;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" tip="加载端口数据中..." />
      </div>
    );
  }

  return (
    <div className="port-management-panel">
      <div className="port-panel-header">
        <div className="port-stats">
          <Space size={16}>
            <Badge count={freeCount} style={{ backgroundColor: designTokens.colors.success }} />
            <span className="stat-label">空闲</span>
            <Badge count={occupiedCount} style={{ backgroundColor: '#1677ff' }} />
            <span className="stat-label">占用</span>
            <Badge count={faultCount} style={{ backgroundColor: designTokens.colors.error }} />
            <span className="stat-label">故障</span>
          </Space>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchPorts} size="small">
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
            style={{
              background: designTokens.colors.primary.gradient,
              border: 'none',
            }}
          >
            新增端口
          </Button>
        </Space>
      </div>

      {ports.length === 0 ? (
        <div className="port-empty">
          <Empty
            description={
              <span>
                该设备暂无端口
                <br />
                <Button
                  type="link"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                  style={{ padding: 0, marginTop: 8 }}
                >
                  立即添加端口
                </Button>
              </span>
            }
          >
            <ApiOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          </Empty>
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={ports}
          rowKey="portId"
          pagination={false}
          size="small"
          scroll={{ x: 600 }}
        />
      )}

      <PortCreateModal
        device={{ deviceId, name: deviceName }}
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

export default React.memo(PortManagementPanel);
