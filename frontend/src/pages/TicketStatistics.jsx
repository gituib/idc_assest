import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Statistic, Table, DatePicker, Select, Space, Tag, message } from 'antd';
import { BarChartOutlined, PieChartOutlined, RiseOutlined, FallOutlined, ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const getStatusColor = (status) => {
  const colors = {
    pending: 'orange',
    assigned: 'blue',
    in_progress: 'processing',
    completed: 'green',
    closed: 'default'
  };
  return colors[status] || 'default';
};

const getStatusText = (status) => {
  const texts = {
    pending: '待处理',
    assigned: '已分配',
    in_progress: '处理中',
    completed: '已完成',
    closed: '已关闭'
  };
  return texts[status] || status;
};

const getPriorityColor = (priority) => {
  const colors = {
    low: 'green',
    medium: 'orange',
    high: 'red',
    urgent: 'magenta'
  };
  return colors[priority] || 'default';
};

const getPriorityText = (priority) => {
  const texts = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急'
  };
  return texts[priority] || priority;
};

function TicketStatistics() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    closed: 0,
    avgProcessingTime: 0,
    byCategory: [],
    byPriority: [],
    byStatus: [],
    byDevice: [],
    trend: []
  });

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };

      const response = await axios.get('/api/tickets/statistics', { params });
      setStatistics(response.data);
    } catch (error) {
      message.error('获取统计数据失败');
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const handleDateChange = useCallback((dates) => {
    if (dates) {
      setDateRange(dates);
    }
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      assigned: 'blue',
      in_progress: 'processing',
      completed: 'green',
      closed: 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: '待处理',
      assigned: '已分配',
      in_progress: '处理中',
      completed: '已完成',
      closed: '已关闭'
    };
    return texts[status] || status;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      urgent: 'magenta'
    };
    return colors[priority] || 'default';
  };

  const getPriorityText = (priority) => {
    const texts = {
      low: '低',
      medium: '中',
      high: '高',
      urgent: '紧急'
    };
    return texts[priority] || priority;
  };

  const statusColumns = useMemo(() => [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: '工单数量',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      render: (count) => <Statistic value={count} valueStyle={{ fontSize: 16 }} />
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 120,
      render: (pct) => (
        <span style={{ color: pct > 30 ? '#ff4d4f' : '#52c41a' }}>
          {pct !== undefined && pct !== null ? `${pct.toFixed(1)}%` : '-'}
        </span>
      )
    }
  ], []);

  const categoryColumns = useMemo(() => [
    {
      title: '故障分类',
      dataIndex: 'category',
      key: 'category',
      width: 150
    },
    {
      title: '工单数量',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      render: (count) => <Statistic value={count} valueStyle={{ fontSize: 16 }} />
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 100,
      render: (pct) => `${pct !== undefined && pct !== null ? pct.toFixed(1) : 0}%`
    },
    {
      title: '已完成',
      dataIndex: 'completed',
      key: 'completed',
      width: 100,
      render: (count) => <Tag color="green">{count}</Tag>
    },
    {
      title: '平均处理时间(小时)',
      dataIndex: 'avgTime',
      key: 'avgTime',
      width: 150,
      render: (time) => time !== undefined && time !== null ? time.toFixed(1) : '-'
    }
  ], []);

  const priorityColumns = useMemo(() => [
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>
          {getPriorityText(priority)}
        </Tag>
      )
    },
    {
      title: '工单数量',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      render: (count) => <Statistic value={count} valueStyle={{ fontSize: 16 }} />
    },
    {
      title: '已完成',
      dataIndex: 'completed',
      key: 'completed',
      width: 100,
      render: (count) => <Tag color="green">{count}</Tag>
    },
    {
      title: '平均处理时间(小时)',
      dataIndex: 'avgTime',
      key: 'avgTime',
      width: 150,
      render: (time) => time !== undefined && time !== null ? time.toFixed(1) : '-'
    }
  ], []);

  const deviceColumns = useMemo(() => [
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
      width: 180
    },
    {
      title: '故障次数',
      dataIndex: 'count',
      key: 'count',
      width: 100,
      render: (count) => <Tag color="red">{count}</Tag>
    },
    {
      title: '最后故障时间',
      dataIndex: 'lastFaultTime',
      key: 'lastFaultTime',
      width: 160,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '设备类型',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 100
    }
  ], []);

  const simpleBarData = [
    { name: '待处理', value: statistics.pending },
    { name: '处理中', value: statistics.inProgress },
    { name: '已完成', value: statistics.completed },
    { name: '已关闭', value: statistics.closed }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="工单统计报表"
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={handleDateChange}
              allowClear={false}
            />
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ background: '#f0f5ff' }}>
              <Statistic
                title="工单总数"
                value={statistics.total}
                prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ background: '#fff7e6' }}>
              <Statistic
                title="待处理工单"
                value={statistics.pending}
                prefix={<ExclamationCircleOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ background: '#e6f7ff' }}>
              <Statistic
                title="已完成工单"
                value={statistics.completed}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ background: '#f9f0ff' }}>
              <Statistic
                title="平均处理时长(小时)"
                value={statistics.avgProcessingTime || 0}
                prefix={<ClockCircleOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1' }}
                precision={1}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ background: '#fff0f6' }}>
              <Statistic
                title="处理中工单"
                value={statistics.inProgress}
                prefix={<RiseOutlined style={{ color: '#eb2f96' }} />}
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ background: '#f5f5f5' }}>
              <Statistic
                title="已关闭工单"
                value={statistics.closed}
                prefix={<FallOutlined style={{ color: '#8c8c8c' }} />}
                valueStyle={{ color: '#8c8c8c' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ background: '#fff1f0' }}>
              <Statistic
                title="完成率"
                value={statistics.total > 0 ? ((statistics.completed / statistics.total) * 100).toFixed(1) : 0}
                suffix="%"
                prefix={<PieChartOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ background: '#f6ffed' }}>
              <Statistic
                title="处理中占比"
                value={statistics.total > 0 ? ((statistics.inProgress / statistics.total) * 100).toFixed(1) : 0}
                suffix="%"
                prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="按状态分布" loading={loading}>
            <Table
              columns={statusColumns}
              dataSource={statistics.byStatus}
              rowKey="status"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="按优先级分布" loading={loading}>
            <Table
              columns={priorityColumns}
              dataSource={statistics.byPriority}
              rowKey="priority"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="按故障分类统计" loading={loading}>
            <Table
              columns={categoryColumns}
              dataSource={statistics.byCategory}
              rowKey="category"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="故障频发设备排行" loading={loading}>
            <Table
              columns={deviceColumns}
              dataSource={statistics.byDevice}
              rowKey="deviceId"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="工单趋势统计" loading={loading}>
            <Table
              columns={[
                {
                  title: '日期',
                  dataIndex: 'date',
                  key: 'date',
                  width: 120,
                  render: (text) => text ? dayjs(text).format('YYYY-MM-DD') : '-'
                },
                {
                  title: '新建工单',
                  dataIndex: 'created',
                  key: 'created',
                  width: 100,
                  render: (count) => <Tag color="blue">{count}</Tag>
                },
                {
                  title: '已完成',
                  dataIndex: 'completed',
                  key: 'completed',
                  width: 100,
                  render: (count) => <Tag color="green">{count}</Tag>
                },
                {
                  title: '关闭工单',
                  dataIndex: 'closed',
                  key: 'closed',
                  width: 100,
                  render: (count) => <Tag color="default">{count}</Tag>
                },
                {
                  title: '当日处理中',
                  dataIndex: 'inProgress',
                  key: 'inProgress',
                  width: 120,
                  render: (count) => <Tag color="processing">{count}</Tag>
                },
                {
                  title: '新增待处理',
                  dataIndex: 'pending',
                  key: 'pending',
                  width: 120,
                  render: (count) => <Tag color="orange">{count}</Tag>
                }
              ]}
              dataSource={statistics.trend}
              rowKey="date"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default React.memo(TicketStatistics);
