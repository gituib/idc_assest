import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, DatePicker, Space, Select, Progress, message, Button } from 'antd';
import { InboxOutlined, ExportOutlined, WarningOutlined, DollarOutlined, ShoppingCartOutlined, ExclamationCircleOutlined, PlusOutlined, BarChartOutlined, DownloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const designTokens = {
  colors: {
    primary: {
      main: '#667eea',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      light: '#8b9ff0'
    },
    success: {
      main: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    warning: {
      main: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    },
    error: {
      main: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      tertiary: '#94a3b8',
      inverse: '#ffffff'
    },
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9'
    },
    border: {
      light: '#e2e8f0',
      medium: '#cbd5e1',
      dark: '#94a3b8'
    }
  },
  shadows: {
    small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  },
  borderRadius: {
    small: '6px',
    medium: '10px',
    large: '16px'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  }
};

const pageContainerStyle = {
  minHeight: '100vh',
  background: designTokens.colors.background.secondary,
  padding: designTokens.spacing.lg
};

const headerStyle = {
  marginBottom: designTokens.spacing.lg,
  padding: `${designTokens.spacing.lg}px ${designTokens.spacing.xl}px`,
  background: designTokens.colors.background.primary,
  borderRadius: designTokens.borderRadius.large,
  boxShadow: designTokens.shadows.small,
  border: `1px solid ${designTokens.colors.border.light}`
};

const titleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: designTokens.spacing.md,
  flexWrap: 'wrap',
  gap: designTokens.spacing.md
};

const titleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: designTokens.spacing.sm,
  fontSize: '20px',
  fontWeight: '600',
  color: designTokens.colors.text.primary
};

const statsRowStyle = {
  display: 'flex',
  gap: designTokens.spacing.md,
  flexWrap: 'wrap'
};

const statCardStyle = {
  background: designTokens.colors.background.primary,
  borderRadius: designTokens.borderRadius.medium,
  padding: `${designTokens.spacing.md}px ${designTokens.spacing.lg}px`,
  boxShadow: designTokens.shadows.small,
  border: `1px solid ${designTokens.colors.border.light}`,
  minWidth: '180px',
  flex: 1
};

const statCardTextStyle = {
  fontSize: '13px',
  color: designTokens.colors.text.secondary,
  marginBottom: designTokens.spacing.xs
};

const statCardValueStyle = {
  fontSize: '28px',
  fontWeight: '600',
  color: designTokens.colors.text.primary
};

const statCardIconStyle = (color) => ({
  fontSize: '28px',
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '48px',
  height: '48px',
  borderRadius: designTokens.borderRadius.medium,
  background: `${color}12`
});

const panelStyle = {
  background: designTokens.colors.background.primary,
  borderRadius: designTokens.borderRadius.large,
  boxShadow: designTokens.shadows.small,
  border: `1px solid ${designTokens.colors.border.light}`,
  overflow: 'hidden'
};

const panelHeaderStyle = {
  padding: `${designTokens.spacing.md}px ${designTokens.spacing.lg}px`,
  borderBottom: `1px solid ${designTokens.colors.border.light}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

const panelTitleStyle = {
  fontSize: '15px',
  fontWeight: '600',
  color: designTokens.colors.text.primary,
  display: 'flex',
  alignItems: 'center',
  gap: designTokens.spacing.sm
};

const panelBodyStyle = {
  padding: designTokens.spacing.lg
};

const actionButtonStyle = {
  height: '36px',
  padding: `0 ${designTokens.spacing.md}px`,
  borderRadius: designTokens.borderRadius.small,
  fontSize: '13px',
  display: 'flex',
  alignItems: 'center',
  gap: designTokens.spacing.xs
};

const primaryActionStyle = {
  ...actionButtonStyle,
  background: designTokens.colors.primary.gradient,
  border: 'none',
  color: '#ffffff',
  boxShadow: designTokens.shadows.small
};

function ConsumableStatistics() {
  const [summary, setSummary] = useState({ total: 0, lowStock: 0, totalValue: 0, byCategory: [] });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [stats, setStats] = useState({ inCount: 0, outCount: 0, inQuantity: 0, outQuantity: 0, recentRecords: [] });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState(null);

  const fetchSummary = async () => {
    try {
      const response = await axios.get('/api/consumables/statistics/summary');
      setSummary(response.data);
    } catch (error) {
      message.error('获取统计信息失败');
    }
  };

  const fetchLowStock = async () => {
    try {
      const response = await axios.get('/api/consumables/low-stock');
      setLowStockItems(response.data);
    } catch (error) {
      message.error('获取低库存信息失败');
    }
  };

  const fetchInOutStats = async () => {
    try {
      const params = {};
      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].toISOString();
        params.endDate = dateRange[1].toISOString();
      }
      if (categoryFilter) {
        params.category = categoryFilter;
      }
      const response = await axios.get('/api/consumable-records/statistics', { params });
      setStats(response.data);
    } catch (error) {
      message.error('获取出入库统计失败');
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchLowStock();
    fetchInOutStats();
  }, []);

  useEffect(() => {
    fetchInOutStats();
  }, [dateRange, categoryFilter]);

  const lowStockColumns = [
    {
      title: '耗材名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text) => (
        <span style={{ fontWeight: '500', color: designTokens.colors.text.primary }}>
          {text}
        </span>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category) => (
        <Tag style={{
          border: 'none',
          borderRadius: designTokens.borderRadius.small,
          background: `${designTokens.colors.primary.main}15`,
          color: designTokens.colors.primary.main,
          fontWeight: '500'
        }}>
          {category}
        </Tag>
      )
    },
    {
      title: '当前库存',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: 100,
      render: (value) => (
        <span style={{
          color: designTokens.colors.error.main,
          fontWeight: '600',
          background: `${designTokens.colors.error.main}12`,
          padding: `2px ${designTokens.spacing.sm}`,
          borderRadius: designTokens.borderRadius.small
        }}>
          {value}
        </span>
      )
    },
    {
      title: '最小库存',
      dataIndex: 'minStock',
      key: 'minStock',
      width: 100,
      render: (value) => (
        <span style={{ color: designTokens.colors.text.secondary }}>
          {value}
        </span>
      )
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      render: (value) => (
        <span style={{ color: designTokens.colors.text.tertiary }}>
          {value}
        </span>
      )
    },
    {
      title: '充足率',
      key: 'rate',
      width: 140,
      render: (_, record) => {
        const rate = Math.min(100, Math.round((record.currentStock / (record.maxStock || 100)) * 100));
        const status = rate < 30 ? 'exception' : rate < 60 ? 'active' : 'success';
        return (
          <Progress
            percent={rate}
            size="small"
            status={status}
            strokeColor={status === 'exception' ? designTokens.colors.error.main : status === 'active' ? designTokens.colors.warning.main : designTokens.colors.success.main}
          />
        );
      }
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 120,
      render: (value) => (
        <span style={{ color: designTokens.colors.text.secondary }}>
          {value || '-'}
        </span>
      )
    }
  ];

  const recentColumns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date) => (
        <span style={{ color: designTokens.colors.text.secondary }}>
          {dayjs(date).format('YYYY-MM-DD HH:mm')}
        </span>
      )
    },
    {
      title: '耗材名称',
      dataIndex: ['Consumable', 'name'],
      key: 'consumableName',
      width: 140,
      render: (text) => (
        <span style={{ fontWeight: '500' }}>
          {text}
        </span>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (type) => (
        <Tag
          style={{
            border: 'none',
            borderRadius: designTokens.borderRadius.small,
            background: type === 'in' ? `${designTokens.colors.success.main}15` : `${designTokens.colors.error.main}15`,
            color: type === 'in' ? designTokens.colors.success.main : designTokens.colors.error.main,
            fontWeight: '500'
          }}
        >
          {type === 'in' ? '入库' : '出库'}
        </Tag>
      )
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (value, record) => (
        <span style={{
          color: record.type === 'in' ? designTokens.colors.success.main : designTokens.colors.error.main,
          fontWeight: '600'
        }}>
          {record.type === 'in' ? '+' : '-'}{value}
        </span>
      )
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
      render: (value) => (
        <span style={{ color: designTokens.colors.text.secondary }}>
          {value || '-'}
        </span>
      )
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 150,
      render: (value) => (
        <span style={{ color: designTokens.colors.text.secondary }}>
          {value || '-'}
        </span>
      )
    }
  ];

  const categories = summary.byCategory?.map(item => item.category) || [];

  const netQuantity = stats.inQuantity - stats.outQuantity;

  return (
    <div style={pageContainerStyle}>
      <div style={headerStyle}>
        <div style={titleRowStyle}>
          <div style={titleStyle}>
            <BarChartOutlined style={{ color: designTokens.colors.primary.main }} />
            耗材统计
          </div>
          <Space wrap>
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: 140 }}
              value={categoryFilter}
              onChange={setCategoryFilter}
            >
              {categories.map(cat => (
                <Option key={cat} value={cat}>{cat}</Option>
              ))}
            </Select>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ borderRadius: designTokens.borderRadius.small }}
            />
            <Button icon={<DownloadOutlined />} style={actionButtonStyle}>
              导出报表
            </Button>
          </Space>
        </div>

        <div style={statsRowStyle}>
          <div style={statCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.md }}>
              <div style={statCardIconStyle(designTokens.colors.primary.main)}>
                <ShoppingCartOutlined />
              </div>
              <div>
                <div style={statCardTextStyle}>耗材种类</div>
                <div style={statCardValueStyle}>{summary.total}</div>
              </div>
            </div>
          </div>

          <div style={{ ...statCardStyle, borderLeft: `4px solid ${designTokens.colors.error.main}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.md }}>
              <div style={statCardIconStyle(designTokens.colors.error.main)}>
                <WarningOutlined />
              </div>
              <div>
                <div style={statCardTextStyle}>低库存预警</div>
                <div style={{ ...statCardValueStyle, color: designTokens.colors.error.main }}>
                  {summary.lowStock}
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...statCardStyle, borderLeft: `4px solid ${designTokens.colors.success.main}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.md }}>
              <div style={statCardIconStyle(designTokens.colors.success.main)}>
                <DollarOutlined />
              </div>
              <div>
                <div style={statCardTextStyle}>库存总价值</div>
                <div style={{ ...statCardValueStyle, color: designTokens.colors.success.main }}>
                  ¥{parseFloat(summary.totalValue || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...statCardStyle, borderLeft: `4px solid ${netQuantity >= 0 ? designTokens.colors.success.main : designTokens.colors.error.main}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.md }}>
              <div style={statCardIconStyle(netQuantity >= 0 ? designTokens.colors.success.main : designTokens.colors.error.main)}>
                <InboxOutlined />
              </div>
              <div>
                <div style={statCardTextStyle}>净入库量</div>
                <div style={{ ...statCardValueStyle, color: netQuantity >= 0 ? designTokens.colors.success.main : designTokens.colors.error.main }}>
                  {netQuantity >= 0 ? '+' : ''}{netQuantity}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Row gutter={designTokens.spacing.md} style={{ marginBottom: designTokens.spacing.md }}>
        <Col span={12}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelTitleStyle}>
                <InboxOutlined style={{ color: designTokens.colors.success.main }} />
                入库出库统计
              </div>
              <Tag color={designTokens.colors.success.main}>近30天</Tag>
            </div>
            <div style={{ padding: designTokens.spacing.lg }}>
              <Row gutter={designTokens.spacing.md}>
                <Col span={12}>
                  <div style={{
                    background: `${designTokens.colors.success.main}08`,
                    borderRadius: designTokens.borderRadius.medium,
                    padding: designTokens.spacing.lg,
                    textAlign: 'center',
                    border: `1px solid ${designTokens.colors.success.main}30`
                  }}>
                    <div style={{ fontSize: '13px', color: designTokens.colors.text.secondary, marginBottom: designTokens.spacing.sm }}>
                      入库次数
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '600', color: designTokens.colors.success.main }}>
                      {stats.inCount}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '500', color: designTokens.colors.success.main, marginTop: designTokens.spacing.xs }}>
                      +{stats.inQuantity}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{
                    background: `${designTokens.colors.error.main}08`,
                    borderRadius: designTokens.borderRadius.medium,
                    padding: designTokens.spacing.lg,
                    textAlign: 'center',
                    border: `1px solid ${designTokens.colors.error.main}30`
                  }}>
                    <div style={{ fontSize: '13px', color: designTokens.colors.text.secondary, marginBottom: designTokens.spacing.sm }}>
                      出库次数
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '600', color: designTokens.colors.error.main }}>
                      {stats.outCount}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '500', color: designTokens.colors.error.main, marginTop: designTokens.spacing.xs }}>
                      -{stats.outQuantity}
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </Col>

        <Col span={12}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelTitleStyle}>
                <BarChartOutlined style={{ color: designTokens.colors.primary.main }} />
                分类统计
              </div>
              <Tag color={designTokens.colors.primary.main}>{categories.length}类</Tag>
            </div>
            <div style={{ padding: designTokens.spacing.lg }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: designTokens.spacing.sm }}>
                {summary.byCategory?.map((item, index) => {
                  const colors = [designTokens.colors.primary.main, designTokens.colors.success.main, designTokens.colors.warning.main, '#8b5cf6', '#06b6d4', '#ec4899'];
                  const color = colors[index % colors.length];
                  return (
                    <div
                      key={item.category}
                      style={{
                        background: `${color}10`,
                        borderRadius: designTokens.borderRadius.medium,
                        padding: `${designTokens.spacing.sm}px ${designTokens.spacing.md}px`,
                        border: `1px solid ${color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: designTokens.spacing.sm
                      }}
                    >
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: color
                      }} />
                      <span style={{ color: designTokens.colors.text.secondary, fontSize: '13px' }}>
                        {item.category}
                      </span>
                      <span style={{ color: color, fontWeight: '600', fontSize: '15px' }}>
                        {item.count}
                      </span>
                    </div>
                  );
                })}
                {(!summary.byCategory || summary.byCategory.length === 0) && (
                  <div style={{ color: designTokens.colors.text.tertiary, padding: designTokens.spacing.lg }}>
                    暂无分类数据
                  </div>
                )}
              </div>
            </div>
          </div>
        </Col>
      </Row>

      <Row gutter={designTokens.spacing.md}>
        <Col span={12}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelTitleStyle}>
                <ExclamationCircleOutlined style={{ color: designTokens.colors.error.main }} />
                低库存预警
              </div>
              <Tag style={{
                border: 'none',
                borderRadius: designTokens.borderRadius.small,
                background: `${designTokens.colors.error.main}15`,
                color: designTokens.colors.error.main,
                fontWeight: '500'
              }}>
                {lowStockItems.length}项
              </Tag>
            </div>
            <div style={{ padding: 0 }}>
              <Table
                columns={lowStockColumns}
                dataSource={lowStockItems}
                rowKey="consumableId"
                pagination={false}
                size="small"
                scroll={{ x: 850 }}
                loading={loading}
              />
            </div>
          </div>
        </Col>

        <Col span={12}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelTitleStyle}>
                <InboxOutlined style={{ color: designTokens.colors.text.secondary }} />
                最近出入库记录
              </div>
              <Tag>最近</Tag>
            </div>
            <div style={{ padding: 0 }}>
              <Table
                columns={recentColumns}
                dataSource={stats.recentRecords}
                rowKey="recordId"
                pagination={false}
                size="small"
                scroll={{ x: 850 }}
                loading={loading}
              />
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default ConsumableStatistics;
