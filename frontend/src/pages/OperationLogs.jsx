import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Space,
  Select,
  DatePicker,
  Input,
  Tag,
  Button,
  message,
  Modal,
  Row,
  Col,
  Descriptions,
  Typography,
  Drawer,
  Statistic,
} from 'antd';
import {
  HistoryOutlined,
  SearchOutlined,
  EyeOutlined,
  FilterOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import api from '../api';
import CloseButton from '../components/CloseButton';
import dayjs from 'dayjs';
import {
  selectStyles,
  filterInputStyles,
  inputPlaceholders,
} from '../styles/deviceManagementStyles';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;

const MODULE_OPTIONS = [
  { value: 'device', label: '设备管理' },
  { value: 'user', label: '用户管理' },
  { value: 'role', label: '角色管理' },
];

const OPERATION_TYPE_OPTIONS = [
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'batch_delete', label: '批量删除' },
  { value: 'status_change', label: '状态变更' },
  { value: 'move', label: '移动' },
  { value: 'permission_change', label: '权限变更' },
];

const RESULT_OPTIONS = [
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
];

function OperationLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({
    module: null,
    operationType: null,
    keyword: '',
    dateRange: null,
    result: null,
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentLog, setCurrentLog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchLogs = useCallback(async (page = 1, pageSize = 20, currentFilters = filters) => {
    try {
      setLoading(true);
      const params = { page, pageSize };

      if (currentFilters.module) {
        params.module = currentFilters.module;
      }
      if (currentFilters.operationType) {
        params.operationType = currentFilters.operationType;
      }
      if (currentFilters.keyword) {
        params.keyword = currentFilters.keyword;
      }
      if (currentFilters.result) {
        params.result = currentFilters.result;
      }
      if (currentFilters.dateRange && currentFilters.dateRange.length === 2) {
        params.startDate = currentFilters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = currentFilters.dateRange[1].format('YYYY-MM-DD');
      }

      const response = await api.get('/operation-logs', { params });
      if (response.success) {
        setLogs(response.data.logs);
        setPagination(prev => ({
          ...prev,
          current: page,
          pageSize,
          total: response.data.total,
        }));
      }
    } catch (error) {
      message.error('获取操作日志失败');
      console.error('获取操作日志失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(1, pagination.pageSize, filters);
  }, []);

  const handleTableChange = (newPagination, tableFilters) => {
    fetchLogs(newPagination.current, newPagination.pageSize, filters);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchLogs(1, pagination.pageSize, newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      module: null,
      operationType: null,
      keyword: '',
      dateRange: null,
      result: null,
    };
    setFilters(clearedFilters);
    fetchLogs(1, pagination.pageSize, clearedFilters);
  };

  const handleViewDetail = async record => {
    setDetailLoading(true);
    setDetailVisible(true);
    try {
      const response = await api.get(`/operation-logs/${record.recordId}`);
      if (response.success) {
        setCurrentLog(response.data);
      }
    } catch (error) {
      message.error('获取日志详情失败');
      console.error('获取日志详情失败:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const getModuleTag = module => {
    const colors = {
      device: 'blue',
      user: 'green',
      role: 'purple',
      consumable: 'orange',
      rack: 'cyan',
      room: 'magenta',
      ticket: 'red',
      backup: 'gold',
    };
    const names = {
      device: '设备',
      user: '用户',
      role: '角色',
      consumable: '耗材',
      rack: '机柜',
      room: '机房',
      ticket: '工单',
      backup: '备份',
    };
    return <Tag color={colors[module] || 'default'}>{names[module] || module}</Tag>;
  };

  const getOperationTag = type => {
    const colors = {
      create: 'green',
      update: 'blue',
      delete: 'red',
      batch_delete: 'red',
      batch_update: 'orange',
      status_change: 'cyan',
      move: 'purple',
      permission_change: 'gold',
      import: 'lime',
      export: 'lime',
    };
    const names = {
      create: '创建',
      update: '更新',
      delete: '删除',
      batch_delete: '批量删除',
      batch_update: '批量更新',
      status_change: '状态变更',
      move: '移动',
      permission_change: '权限变更',
      import: '导入',
      export: '导出',
    };
    return <Tag color={colors[type] || 'default'}>{names[type] || type}</Tag>;
  };

  const getResultTag = result => {
    return result === 'success' ? <Tag color="success">成功</Tag> : <Tag color="error">失败</Tag>;
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: date => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 100,
      render: module => getModuleTag(module),
    },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 120,
      render: type => getOperationTag(type),
    },
    {
      title: '操作描述',
      dataIndex: 'operationDescription',
      key: 'operationDescription',
      ellipsis: true,
    },
    {
      title: '操作对象',
      dataIndex: 'targetName',
      key: 'targetName',
      width: 150,
      ellipsis: true,
      render: (text, record) => text || record.targetId,
    },
    {
      title: '操作人',
      dataIndex: 'operatorName',
      key: 'operatorName',
      width: 120,
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      width: 80,
      render: result => getResultTag(result),
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: ip => ip || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  const hasFilters =
    filters.module ||
    filters.operationType ||
    filters.keyword ||
    filters.dateRange ||
    filters.result;

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>操作日志审计</span>
          </Space>
        }
        extra={
          <Space>
            <Text type="secondary">共 {pagination.total} 条记录</Text>
          </Space>
        }
      >
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col flex="200px">
              <Select
                placeholder="选择模块"
                allowClear
                style={{ width: '100%', ...selectStyles }}
                value={filters.module}
                onChange={value => handleFilterChange('module', value)}
              >
                {MODULE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col flex="200px">
              <Select
                placeholder="选择操作类型"
                allowClear
                style={{ width: '100%', ...selectStyles }}
                value={filters.operationType}
                onChange={value => handleFilterChange('operationType', value)}
              >
                {OPERATION_TYPE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col flex="200px">
              <Select
                placeholder="选择结果"
                allowClear
                style={{ width: '100%', ...selectStyles }}
                value={filters.result}
                onChange={value => handleFilterChange('result', value)}
              >
                {RESULT_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col flex="auto">
              <Input
                placeholder={inputPlaceholders.keyword || '搜索操作描述/对象/操作人'}
                prefix={<SearchOutlined />}
                style={{ ...filterInputStyles }}
                value={filters.keyword}
                onChange={e => handleFilterChange('keyword', e.target.value)}
                allowClear
              />
            </Col>
            <Col flex="280px">
              <RangePicker
                style={{ width: '100%' }}
                value={filters.dateRange}
                onChange={dates => handleFilterChange('dateRange', dates)}
                placeholder={['开始日期', '结束日期']}
              />
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => fetchLogs(1, pagination.pageSize, filters)}
                >
                  筛选
                </Button>
                {hasFilters && (
                  <Button icon={<ClearOutlined />} onClick={handleClearFilters}>
                    清除
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        <Table
          columns={columns}
          dataSource={logs}
          loading={loading}
          rowKey="recordId"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: total => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Drawer
        title="操作日志详情"
        placement="right"
        width={600}
        onClose={() => {
          setDetailVisible(false);
          setCurrentLog(null);
        }}
        open={detailVisible}
        extra={
          currentLog && (
            <Space>
              {getModuleTag(currentLog.module)}
              {getOperationTag(currentLog.operationType)}
              {getResultTag(currentLog.result)}
            </Space>
          )
        }
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : currentLog ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="日志ID">{currentLog.recordId}</Descriptions.Item>
            <Descriptions.Item label="操作时间">
              {dayjs(currentLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="模块">{currentLog.module}</Descriptions.Item>
            <Descriptions.Item label="操作类型">{currentLog.operationType}</Descriptions.Item>
            <Descriptions.Item label="操作描述">
              {currentLog.operationDescription}
            </Descriptions.Item>
            <Descriptions.Item label="目标ID">{currentLog.targetId || '-'}</Descriptions.Item>
            <Descriptions.Item label="目标名称">{currentLog.targetName || '-'}</Descriptions.Item>
            <Descriptions.Item label="操作人ID">{currentLog.operatorId}</Descriptions.Item>
            <Descriptions.Item label="操作人">{currentLog.operatorName}</Descriptions.Item>
            {currentLog.operatorRole && (
              <Descriptions.Item label="操作人角色">{currentLog.operatorRole}</Descriptions.Item>
            )}
            <Descriptions.Item label="IP地址">{currentLog.ipAddress || '-'}</Descriptions.Item>
            <Descriptions.Item label="用户代理">{currentLog.userAgent || '-'}</Descriptions.Item>
            <Descriptions.Item label="结果">
              {currentLog.result === 'success' ? '成功' : '失败'}
            </Descriptions.Item>
          </Descriptions>
        ) : null}

        {currentLog && (currentLog.beforeState || currentLog.afterState) && (
          <>
            <h4 style={{ marginTop: 16 }}>状态变更</h4>
            {currentLog.beforeState && (
              <>
                <Text strong>变更前：</Text>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 4,
                    overflow: 'auto',
                    maxHeight: 200,
                  }}
                >
                  {JSON.stringify(currentLog.beforeState, null, 2)}
                </pre>
              </>
            )}
            {currentLog.afterState && (
              <>
                <Text strong>变更后：</Text>
                <pre
                  style={{
                    background: '#f0f0f0',
                    padding: 12,
                    borderRadius: 4,
                    overflow: 'auto',
                    maxHeight: 200,
                  }}
                >
                  {JSON.stringify(currentLog.afterState, null, 2)}
                </pre>
              </>
            )}
          </>
        )}

        {currentLog && currentLog.metadata && Object.keys(currentLog.metadata).length > 0 && (
          <>
            <h4 style={{ marginTop: 16 }}>扩展信息</h4>
            <pre
              style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 4,
                overflow: 'auto',
                maxHeight: 200,
              }}
            >
              {JSON.stringify(currentLog.metadata, null, 2)}
            </pre>
          </>
        )}
      </Drawer>
    </div>
  );
}

export default OperationLogs;
