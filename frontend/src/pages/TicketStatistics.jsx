import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Select,
  Space,
  Tag,
  message,
  Button,
  Switch,
  Tooltip,
} from 'antd';
import {
  BarChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const REFRESH_INTERVAL = 30000;

const getStatusColor = status => {
  const colors = {
    pending: 'orange',
    assigned: 'blue',
    in_progress: 'processing',
    completed: 'green',
    closed: 'default',
    cancelled: 'volcano',
  };
  return colors[status] || 'default';
};

const getStatusText = status => {
  const texts = {
    pending: '待处理',
    assigned: '已分配',
    in_progress: '处理中',
    completed: '已完成',
    closed: '已关闭',
    cancelled: '已取消',
  };
  return texts[status] || status;
};

const getPriorityColor = priority => {
  const colors = {
    low: 'green',
    medium: 'orange',
    high: 'red',
    critical: 'magenta',
    urgent: 'magenta',
  };
  return colors[priority] || 'default';
};

const getPriorityText = priority => {
  const texts = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '紧急',
    urgent: '紧急',
  };
  return texts[priority] || priority;
};

function TicketStatistics() {
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [trendDateRange, setTrendDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    closed: 0,
    cancelled: 0,
    avgProcessingTime: 0,
    byCategory: [],
    byPriority: [],
    byStatus: [],
    byDevice: [],
    trend: [],
  });

  const timerRef = useRef(null);

  const fetchStatistics = useCallback(
    async (isManual = false) => {
      try {
        if (isManual) {
          setLoading(true);
        }
        const params = {};
        if (dateRange && dateRange[0] && dateRange[1]) {
          params.startDate = dateRange[0].format('YYYY-MM-DD');
          params.endDate = dateRange[1].format('YYYY-MM-DD');
        }

        const response = await axios.get('/api/tickets/stats', { params });
        setStatistics(response.data);
        setLastUpdateTime(new Date());
      } catch (error) {
        message.error('获取统计数据失败');
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    },
    [dateRange]
  );

  const fetchTrend = useCallback(
    async (range = trendDateRange) => {
      try {
        setTrendLoading(true);
        const params = {};
        if (range && range[0] && range[1]) {
          params.startDate = range[0].format('YYYY-MM-DD');
          params.endDate = range[1].format('YYYY-MM-DD');
        }
        const response = await axios.get('/api/tickets/stats', { params });
        setTrendData(response.data.trend || []);
      } catch (error) {
        message.error('获取趋势数据失败');
        console.error('获取趋势数据失败:', error);
      } finally {
        setTrendLoading(false);
      }
    },
    [trendDateRange]
  );

  useEffect(() => {
    fetchStatistics();
    fetchTrend();
  }, [fetchStatistics, fetchTrend]);

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        fetchStatistics();
      }, REFRESH_INTERVAL);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoRefresh, fetchStatistics]);

  const handleDateChange = useCallback(dates => {
    setDateRange(dates);
  }, []);

  const handleTrendDateChange = useCallback(
    dates => {
      setTrendDateRange(dates);
      fetchTrend(dates);
    },
    [fetchTrend]
  );

  const handleManualRefresh = useCallback(() => {
    fetchStatistics(true);
  }, [fetchStatistics]);

  const getStatusColor = status => {
    const colors = {
      pending: 'orange',
      assigned: 'blue',
      in_progress: 'processing',
      completed: 'green',
      closed: 'default',
      cancelled: 'volcano',
    };
    return colors[status] || 'default';
  };

  const getStatusText = status => {
    const texts = {
      pending: '待处理',
      assigned: '已分配',
      in_progress: '处理中',
      completed: '已完成',
      closed: '已关闭',
      cancelled: '已取消',
    };
    return texts[status] || status;
  };

  const getPriorityColor = priority => {
    const colors = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      critical: 'magenta',
      urgent: 'magenta',
    };
    return colors[priority] || 'default';
  };

  const getPriorityText = priority => {
    const texts = {
      low: '低',
      medium: '中',
      high: '高',
      critical: '紧急',
      urgent: '紧急',
    };
    return texts[priority] || priority;
  };

  const statusColumns = useMemo(
    () => [
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: status => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>,
      },
      {
        title: '工单数量',
        dataIndex: 'count',
        key: 'count',
        width: 120,
        render: count => <Statistic value={count} valueStyle={{ fontSize: 16 }} />,
      },
      {
        title: '占比',
        dataIndex: 'percentage',
        key: 'percentage',
        width: 120,
        render: pct => (
          <span style={{ color: pct > 30 ? '#ff4d4f' : '#52c41a' }}>
            {pct !== undefined && pct !== null ? `${pct.toFixed(1)}%` : '-'}
          </span>
        ),
      },
    ],
    []
  );

  const categoryColumns = useMemo(
    () => [
      {
        title: '故障分类',
        dataIndex: 'category',
        key: 'category',
        width: 150,
      },
      {
        title: '工单数量',
        dataIndex: 'count',
        key: 'count',
        width: 120,
        render: count => <Statistic value={count} valueStyle={{ fontSize: 16 }} />,
      },
      {
        title: '占比',
        dataIndex: 'percentage',
        key: 'percentage',
        width: 100,
        render: pct => `${pct !== undefined && pct !== null ? pct.toFixed(1) : 0}%`,
      },
      {
        title: '已完成',
        dataIndex: 'completed',
        key: 'completed',
        width: 100,
        render: count => <Tag color="green">{count}</Tag>,
      },
      {
        title: '平均处理时间(小时)',
        dataIndex: 'avgTime',
        key: 'avgTime',
        width: 150,
        render: time => (time !== undefined && time !== null ? time.toFixed(1) : '-'),
      },
    ],
    []
  );

  const priorityColumns = useMemo(
    () => [
      {
        title: '优先级',
        dataIndex: 'priority',
        key: 'priority',
        width: 100,
        render: priority => (
          <Tag color={getPriorityColor(priority)}>{getPriorityText(priority)}</Tag>
        ),
      },
      {
        title: '工单数量',
        dataIndex: 'count',
        key: 'count',
        width: 120,
        render: count => <Statistic value={count} valueStyle={{ fontSize: 16 }} />,
      },
      {
        title: '已完成',
        dataIndex: 'completed',
        key: 'completed',
        width: 100,
        render: count => <Tag color="green">{count}</Tag>,
      },
      {
        title: '平均处理时间(小时)',
        dataIndex: 'avgTime',
        key: 'avgTime',
        width: 150,
        render: time => (time !== undefined && time !== null ? time.toFixed(1) : '-'),
      },
    ],
    []
  );

  const deviceColumns = useMemo(
    () => [
      {
        title: '设备名称',
        dataIndex: 'deviceName',
        key: 'deviceName',
        width: 180,
      },
      {
        title: '故障次数',
        dataIndex: 'count',
        key: 'count',
        width: 100,
        render: count => <Tag color="red">{count}</Tag>,
      },
      {
        title: '最后故障时间',
        dataIndex: 'lastFaultTime',
        key: 'lastFaultTime',
        width: 160,
        render: text => (text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'),
      },
      {
        title: '设备类型',
        dataIndex: 'deviceType',
        key: 'deviceType',
        width: 100,
      },
    ],
    []
  );

  const simpleBarData = [
    { name: '待处理', value: statistics.pending },
    { name: '处理中', value: statistics.inProgress },
    { name: '已完成', value: statistics.completed },
    { name: '已关闭', value: statistics.closed },
    { name: '已取消', value: statistics.cancelled },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="工单统计报表"
        extra={
          <Space>
            <Tooltip
              title={
                lastUpdateTime
                  ? `最后更新: ${dayjs(lastUpdateTime).format('HH:mm:ss')}`
                  : '尚未更新'
              }
            >
              <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>
                {lastUpdateTime && `更新于 ${dayjs(lastUpdateTime).format('HH:mm:ss')}`}
              </span>
            </Tooltip>
            <Tooltip title="自动刷新（每30秒）">
              <Switch
                checked={autoRefresh}
                onChange={setAutoRefresh}
                checkedChildren={<SyncOutlined spin={autoRefresh} />}
                unCheckedChildren={<SyncOutlined />}
                size="small"
              />
            </Tooltip>
            <Button icon={<ReloadOutlined />} onClick={handleManualRefresh} size="small">
              刷新
            </Button>
            <RangePicker
              value={dateRange}
              onChange={handleDateChange}
              allowClear
              presets={[
                { label: '全部', value: null },
                { label: '最近7天', value: [dayjs().subtract(7, 'days'), dayjs()] },
                { label: '最近30天', value: [dayjs().subtract(30, 'days'), dayjs()] },
                { label: '最近90天', value: [dayjs().subtract(90, 'days'), dayjs()] },
                { label: '最近1年', value: [dayjs().subtract(1, 'year'), dayjs()] },
              ]}
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
                value={
                  statistics.total > 0
                    ? ((statistics.completed / statistics.total) * 100).toFixed(1)
                    : 0
                }
                suffix="%"
                prefix={<PieChartOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ background: '#fff2f0' }}>
              <Statistic
                title="已取消工单"
                value={statistics.cancelled}
                prefix={<FallOutlined style={{ color: '#fa541c' }} />}
                valueStyle={{ color: '#fa541c' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card
            title="工单趋势统计"
            loading={trendLoading}
            extra={
              <RangePicker
                value={trendDateRange}
                onChange={handleTrendDateChange}
                allowClear
                presets={[
                  { label: '最近7天', value: [dayjs().subtract(7, 'days'), dayjs()] },
                  { label: '最近30天', value: [dayjs().subtract(30, 'days'), dayjs()] },
                  { label: '最近90天', value: [dayjs().subtract(90, 'days'), dayjs()] },
                  { label: '最近1年', value: [dayjs().subtract(1, 'year'), dayjs()] },
                ]}
              />
            }
          >
            <TrendChart data={trendData} />
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
    </div>
  );
}

/**
 * 工单趋势折线图组件（纯 SVG，无第三方图表库依赖）
 */
const TREND_SERIES = [
  { key: 'created', label: '新建工单', color: '#1890ff' },
  { key: 'completed', label: '已完成', color: '#52c41a' },
  { key: 'closed', label: '已关闭', color: '#8c8c8c' },
  { key: 'inProgress', label: '处理中', color: '#722ed1' },
  { key: 'pending', label: '待处理', color: '#fa8c16' },
];

function TrendChart({ data }) {
  const [hoverInfo, setHoverInfo] = useState(null);
  const containerRef = useRef(null);

  const chartWidth = 1000;
  const chartHeight = 320;
  const padding = { top: 20, right: 20, bottom: 50, left: 50 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
        暂无趋势数据
      </div>
    );
  }

  const allValues = data.flatMap(d => TREND_SERIES.map(s => d[s.key] || 0));
  const maxValue = Math.max(...allValues, 1);
  const yMax = Math.ceil(maxValue * 1.1);

  const xStep = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth;

  const getX = i => (data.length === 1 ? padding.left + plotWidth / 2 : padding.left + i * xStep);
  const getY = val => padding.top + plotHeight - (val / yMax) * plotHeight;

  // Y 轴刻度（5 等分）
  const yTicks = Array.from({ length: 6 }, (_, i) => Math.round((yMax / 5) * i));

  // X 轴标签（数据多时稀疏显示）
  const labelInterval = data.length > 30 ? Math.ceil(data.length / 10) : 1;

  // 计算 tooltip 在容器中的像素位置（SVG viewBox 缩放到容器宽度）
  const containerWidth = containerRef.current?.clientWidth || 600;
  const scale = containerWidth / chartWidth;
  const tooltipX = hoverInfo ? hoverInfo.x * scale : 0;
  const tooltipWidth = 280;
  const tooltipLeft = tooltipX + tooltipWidth > containerWidth - 20 ? tooltipX - tooltipWidth - 10 : tooltipX + 15;

  return (
    <div ref={containerRef} style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ width: '100%', minWidth: 600, height: 'auto' }}
      >
        {/* 网格线 + Y 轴刻度 */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={`y-${i}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="#f0f0f0"
                strokeWidth={1}
              />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#999">
                {tick}
              </text>
            </g>
          );
        })}

        {/* X 轴标签 */}
        {data.map((d, i) => {
          if (i % labelInterval !== 0 && i !== data.length - 1) return null;
          const x = getX(i);
          const dateStr = d.date ? dayjs(d.date).format('MM-DD') : '';
          return (
            <text
              key={`x-${i}`}
              x={x}
              y={chartHeight - padding.bottom + 20}
              textAnchor="middle"
              fontSize={11}
              fill="#999"
              transform={data.length > 20 ? `rotate(-30 ${x} ${chartHeight - padding.bottom + 20})` : ''}
            >
              {dateStr}
            </text>
          );
        })}

        {/* 折线 */}
        {TREND_SERIES.map(series => {
          const points = data.map((d, i) => `${getX(i)},${getY(d[series.key] || 0)}`).join(' ');
          return (
            <g key={series.key}>
              <polyline
                points={points}
                fill="none"
                stroke={series.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {data.length <= 30 &&
                data.map((d, i) => {
                  const cx = getX(i);
                  const cy = getY(d[series.key] || 0);
                  return (
                    <circle
                      key={`pt-${series.key}-${i}`}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill="#fff"
                      stroke={series.color}
                      strokeWidth={1.5}
                    />
                  );
                })}
            </g>
          );
        })}

        {/* 悬浮交互区域 */}
        {data.map((d, i) => {
          const x = getX(i);
          const values = TREND_SERIES.map(s => d[s.key] || 0);
          const total = values.reduce((a, b) => a + b, 0);
          if (total === 0) return null;
          return (
            <rect
              key={`hover-${i}`}
              x={x - xStep / 2}
              y={padding.top}
              width={xStep}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() =>
                setHoverInfo({
                  x,
                  y: getY(Math.max(...values)),
                  data: d,
                  index: i,
                })
              }
              onMouseLeave={() => setHoverInfo(null)}
            />
          );
        })}

        {/* 悬浮提示线 */}
        {hoverInfo && (
          <line
            x1={hoverInfo.x}
            y1={padding.top}
            x2={hoverInfo.x}
            y2={padding.top + plotHeight}
            stroke="#d9d9d9"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}
      </svg>

      {/* HTML tooltip 浮层 */}
      {hoverInfo && (
        <div
          style={{
            position: 'absolute',
            left: tooltipLeft,
            top: 10,
            width: tooltipWidth,
            maxHeight: 400,
            overflowY: 'auto',
            background: 'rgba(255,255,255,0.97)',
            border: '1px solid #e8e8e8',
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            padding: '10px 12px',
            zIndex: 10,
            pointerEvents: 'none',
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#333' }}>
            {hoverInfo.data.date ? dayjs(hoverInfo.data.date).format('YYYY-MM-DD') : ''}
          </div>
          {TREND_SERIES.map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: s.color }} />
              <span style={{ color: '#666' }}>{s.label}：{hoverInfo.data[s.key] || 0}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
            {hoverInfo.data.devices && hoverInfo.data.devices.length > 0 ? (
              <>
                <div style={{ fontWeight: 600, marginBottom: 4, color: '#333' }}>
                  当日新建工单设备（{hoverInfo.data.devices.length}）
                </div>
                {hoverInfo.data.devices.slice(0, 10).map((dev, di) => (
                  <div
                    key={`dev-${di}`}
                    style={{
                      padding: '3px 0',
                    borderBottom: di < Math.min(hoverInfo.data.devices.length, 10) - 1 ? '1px dashed #f5f5f5' : 'none',
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ color: '#1890ff', fontWeight: 500 }}>{dev.deviceName}</div>
                  <div style={{ color: '#666' }}>{dev.title}</div>
                  <div style={{ color: '#999', fontSize: 11 }}>
                    {[dev.faultCategory, getPriorityText(dev.priority)].filter(Boolean).join(' · ')}
                  </div>
                </div>
              ))}
              {hoverInfo.data.devices.length > 10 && (
                <div style={{ color: '#999', textAlign: 'center', paddingTop: 4 }}>
                  还有 {hoverInfo.data.devices.length - 10} 条...
                </div>
              )}
              </>
            ) : (
              <div style={{ color: '#999', textAlign: 'center', padding: '4px 0' }}>
                当日无新建工单
              </div>
            )}
          </div>
        </div>
      )}

      {/* 图例 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8, flexWrap: 'wrap' }}>
        {TREND_SERIES.map(s => (
          <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ display: 'inline-block', width: 16, height: 3, background: s.color, borderRadius: 2 }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default React.memo(TicketStatistics);
