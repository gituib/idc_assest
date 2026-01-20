import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Tag, Space, Button, DatePicker, Select, message, Popconfirm, Typography, Descriptions } from 'antd';
import { ReloadOutlined, DeleteOutlined, EyeOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { loginHistoryAPI } from '../api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const LoginHistory = () => {
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({});

  useEffect(() => {
    fetchHistories();
  }, [pagination.current, filters]);

  const fetchHistories = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters
      };
      const response = await loginHistoryAPI.list(params);
      if (response.success) {
        setHistories(response.data.histories);
        setPagination(prev => ({ ...prev, total: response.data.total }));
      }
    } catch (error) {
      message.error('获取登录历史失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleDateChange = useCallback((dates) => {
    if (dates) {
      setFilters(prev => ({
        ...prev,
        startDate: dates[0].toISOString(),
        endDate: dates[1].toISOString()
      }));
    } else {
      setFilters(prev => ({ ...prev, startDate: undefined, endDate: undefined }));
    }
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleClear = useCallback(async () => {
    try {
      const response = await loginHistoryAPI.clear({ days: 30 });
      if (response.success) {
        message.success('已清理30天前的登录记录');
        fetchHistories();
      }
    } catch (error) {
      message.error('清理失败');
    }
  }, [fetchHistories]);

  const tableColumns = useMemo(() => [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120
    },
    {
      title: '真实姓名',
      dataIndex: 'realName',
      key: 'realName',
      width: 100,
      render: (name) => name || '-'
    },
    {
      title: '登录时间',
      dataIndex: 'loginTime',
      key: 'loginTime',
      width: 180,
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: 'IP地址',
      dataIndex: 'loginIp',
      key: 'loginIp',
      width: 140,
      render: (ip) => ip || '-'
    },
    {
      title: '登录状态',
      dataIndex: 'loginType',
      key: 'loginType',
      width: 100,
      render: (type) => (
        <Tag color={type === 'success' ? 'green' : 'red'}>
          {type === 'success' ? '成功' : '失败'}
        </Tag>
      )
    },
    {
      title: '失败原因',
      dataIndex: 'failReason',
      key: 'failReason',
      width: 150,
      render: (reason) => reason || '-'
    },
    {
      title: '浏览器',
      dataIndex: 'userAgent',
      key: 'userAgent',
      ellipsis: true,
      render: (ua) => {
        if (!ua) return '-';
        let browser = 'Unknown';
        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';
        return browser;
      }
    }
  ], []);

  const pageHeaderStyle = {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const titleStyle = {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0
  };

  return (
    <div>
      <div style={pageHeaderStyle}>
        <h1 style={titleStyle}>登录历史</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchHistories}>刷新</Button>
          <Popconfirm title="确定清理30天前的登录记录？" onConfirm={handleClear}>
            <Button danger>清理旧记录</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Select
            placeholder="登录状态"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => handleFilterChange('loginType', value)}
          >
            <Select.Option value="success">成功</Select.Option>
            <Select.Option value="failed">失败</Select.Option>
          </Select>
          <RangePicker onChange={handleDateChange} showTime />
        </Space>
      </Card>

      <Card>
        <Table
          columns={tableColumns}
          dataSource={histories}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          onChange={(newPagination) => {
            setPagination(prev => ({ ...prev, ...newPagination }));
          }}
        />
      </Card>
    </div>
  );
};

export default LoginHistory;
