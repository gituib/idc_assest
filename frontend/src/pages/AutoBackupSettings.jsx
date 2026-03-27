import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Switch,
  InputNumber,
  Input,
  Space,
  Tag,
  Alert,
  Modal,
  message,
  Descriptions,
  Divider,
  Typography,
  Spin,
  Radio,
  Table,
  Select,
  Pagination,
  Empty,
  Tooltip,
} from 'antd';
import {
  ClockCircleOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  CloudDownloadOutlined,
  FileProtectOutlined,
  HistoryOutlined,
  EyeOutlined,
  ReloadOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { backupAPI } from '../api';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const TimePicker = ({ hour, minute, onChange, disabled }) => {
  const [hourInput, setHourInput] = useState(hour.toString());
  const [minuteInput, setMinuteInput] = useState(minute.toString());

  useEffect(() => {
    setHourInput(hour.toString());
    setMinuteInput(minute.toString());
  }, [hour, minute]);

  const handleHourChange = newHour => {
    const validHour = Math.max(0, Math.min(23, newHour));
    onChange(validHour, minute);
  };

  const handleMinuteChange = newMinute => {
    const validMinute = Math.max(0, Math.min(59, newMinute));
    onChange(hour, validMinute);
  };

  const handleHourInputBlur = () => {
    const value = parseInt(hourInput);
    if (!isNaN(value)) {
      handleHourChange(value);
    } else {
      setHourInput(hour.toString());
    }
  };

  const handleMinuteInputBlur = () => {
    const value = parseInt(minuteInput);
    if (!isNaN(value)) {
      handleMinuteChange(value);
    } else {
      setMinuteInput(minute.toString());
    }
  };

  const handleHourKeyPress = e => {
    if (e.key === 'Enter') {
      handleHourInputBlur();
    }
  };

  const handleMinuteKeyPress = e => {
    if (e.key === 'Enter') {
      handleMinuteInputBlur();
    }
  };

  const incrementHour = () => handleHourChange(hour + 1);
  const decrementHour = () => handleHourChange(hour - 1);
  const incrementMinute = () => handleMinuteChange(minute + 1);
  const decrementMinute = () => handleMinuteChange(minute - 1);

  const timePeriods = [
    { start: 0, end: 5, label: '深夜', icon: '🌙' },
    { start: 6, end: 8, label: '清晨', icon: '🌅' },
    { start: 9, end: 11, label: '上午', icon: '☀️' },
    { start: 12, end: 13, label: '中午', icon: '🌞' },
    { start: 14, end: 17, label: '下午', icon: '🌤️' },
    { start: 18, end: 21, label: '傍晚', icon: '🌇' },
    { start: 22, end: 23, label: '夜晚', icon: '🌙' },
  ];

  const currentPeriod = timePeriods.find(p => hour >= p.start && hour <= p.end);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: '18px 24px',
          background: disabled ? '#f5f5f5' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '14px',
          transition: 'all 0.3s ease',
          minWidth: 280,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Button
            type="text"
            icon={<UpOutlined />}
            onClick={incrementHour}
            disabled={disabled}
            style={{
              color: disabled ? '#bfbfbf' : '#fff',
              fontSize: 15,
              height: 30,
              width: 56,
              padding: 0,
            }}
          />
          <Input
            value={hourInput}
            onChange={e => setHourInput(e.target.value)}
            onBlur={handleHourInputBlur}
            onPressEnter={handleHourKeyPress}
            disabled={disabled}
            maxLength={2}
            style={{
              width: 66,
              height: 48,
              fontSize: 30,
              fontWeight: 700,
              textAlign: 'center',
              color: disabled ? '#bfbfbf' : '#fff',
              background: disabled ? 'transparent' : 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              borderRadius: '10px',
              fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
              outline: 'none',
              boxShadow: 'none',
            }}
          />
          <Button
            type="text"
            icon={<DownOutlined />}
            onClick={decrementHour}
            disabled={disabled}
            style={{
              color: disabled ? '#bfbfbf' : '#fff',
              fontSize: 15,
              height: 30,
              width: 56,
              padding: 0,
            }}
          />
          <Text
            style={{
              fontSize: 12,
              color: disabled ? '#bfbfbf' : 'rgba(255, 255, 255, 0.85)',
              marginTop: 3,
            }}
          >
            小时
          </Text>
        </div>

        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: disabled ? '#bfbfbf' : '#fff',
            fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
            marginTop: -12,
          }}
        >
          :
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Button
            type="text"
            icon={<UpOutlined />}
            onClick={incrementMinute}
            disabled={disabled}
            style={{
              color: disabled ? '#bfbfbf' : '#fff',
              fontSize: 15,
              height: 30,
              width: 56,
              padding: 0,
            }}
          />
          <Input
            value={minuteInput}
            onChange={e => setMinuteInput(e.target.value)}
            onBlur={handleMinuteInputBlur}
            onPressEnter={handleMinuteKeyPress}
            disabled={disabled}
            maxLength={2}
            style={{
              width: 66,
              height: 48,
              fontSize: 30,
              fontWeight: 700,
              textAlign: 'center',
              color: disabled ? '#bfbfbf' : '#fff',
              background: disabled ? 'transparent' : 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              borderRadius: '10px',
              fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
              outline: 'none',
              boxShadow: 'none',
            }}
          />
          <Button
            type="text"
            icon={<DownOutlined />}
            onClick={decrementMinute}
            disabled={disabled}
            style={{
              color: disabled ? '#bfbfbf' : '#fff',
              fontSize: 15,
              height: 30,
              width: 56,
              padding: 0,
            }}
          />
          <Text
            style={{
              fontSize: 12,
              color: disabled ? '#bfbfbf' : 'rgba(255, 255, 255, 0.85)',
              marginTop: 3,
            }}
          >
            分钟
          </Text>
        </div>
      </div>

      {currentPeriod && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 20px',
            background: disabled ? '#f5f5f5' : '#eff6ff',
            borderRadius: '12px',
            border: disabled ? '1px solid #f0f0f0' : '1px solid #dbeafe',
          }}
        >
          <span style={{ fontSize: 22 }}>{currentPeriod.icon}</span>
          <Text
            style={{
              fontSize: 14,
              color: disabled ? '#bfbfbf' : '#3b82f6',
              fontWeight: 500,
            }}
          >
            {currentPeriod.label}
          </Text>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {[
          { hour: 2, minute: 0, label: '凌晨 2:00', recommended: true },
          { hour: 3, minute: 0, label: '凌晨 3:00' },
          { hour: 4, minute: 0, label: '凌晨 4:00', recommended: true },
          { hour: 20, minute: 0, label: '晚上 8:00' },
          { hour: 22, minute: 0, label: '晚上 10:00' },
        ].map((preset, index) => (
          <Button
            key={index}
            size="small"
            onClick={() => !disabled && onChange(preset.hour, preset.minute)}
            disabled={disabled}
            style={{
              borderRadius: '8px',
              border:
                hour === preset.hour && minute === preset.minute
                  ? '1px solid #667eea'
                  : disabled
                    ? '1px solid #f0f0f0'
                    : '1px solid #e5e7eb',
              background:
                hour === preset.hour && minute === preset.minute
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#fff',
              color:
                hour === preset.hour && minute === preset.minute
                  ? '#fff'
                  : disabled
                    ? '#bfbfbf'
                    : '#374151',
              fontWeight: preset.recommended ? 600 : 400,
              fontSize: 13,
              height: 32,
              padding: '0 12px',
            }}
          >
            {preset.label}
            {preset.recommended && <span style={{ marginLeft: 4, fontSize: 11 }}>⭐</span>}
          </Button>
        ))}
      </div>
    </div>
  );
};

const AutoBackupSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState({
    enabled: false,
    hour: 2,
    minute: 0,
    includeFiles: true,
    compress: true,
    maxCount: 30,
    maxAgeDays: 90,
    backupType: 'full',
  });
  const [modified, setModified] = useState(false);
  const isInitialMount = useRef(true);
  const isFetching = useRef(false);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [logFilter, setLogFilter] = useState({
    logType: '',
    status: '',
  });
  const [logDetailModal, setLogDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    if (isInitialMount.current) {
      fetchStatus();
      fetchLogs();
      isInitialMount.current = false;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (isFetching.current) return;

    try {
      setLoading(true);
      isFetching.current = true;
      const response = await backupAPI.getAutoStatus();
      if (response?.success) {
        const data = response.data;
        setStatus(data);

        if (data.cronExpression) {
          const parts = data.cronExpression.split(' ');
          const minute = parseInt(parts[0]);
          const hour = parseInt(parts[1]);

          setSettings(prev => ({
            ...prev,
            enabled: data.enabled || false,
            hour: isNaN(hour) ? 2 : hour,
            minute: isNaN(minute) ? 0 : minute,
            includeFiles: data.includeFiles !== undefined ? data.includeFiles : true,
            compress: data.compress !== undefined ? data.compress : true,
            maxCount: data.maxCount || 30,
            maxAgeDays: data.maxAgeDays || 90,
            backupType: data.backupType || 'full',
          }));
        }
      }
    } catch (error) {
      console.error('获取自动备份状态失败:', error);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  const fetchLogs = useCallback(
    async (page = 1, pageSize = 10) => {
      try {
        setLogsLoading(true);
        const params = { page, pageSize };
        if (logFilter.logType) params.logType = logFilter.logType;
        if (logFilter.status) params.status = logFilter.status;

        const response = await backupAPI.getLogs(params);
        if (response?.success) {
          setLogs(response.data.logs || []);
          setLogsPagination({
            current: response.data.page || 1,
            pageSize: response.data.pageSize || 10,
            total: response.data.total || 0,
          });
        }
      } catch (error) {
        console.error('获取备份日志失败:', error);
        message.error('获取备份日志失败');
      } finally {
        setLogsLoading(false);
      }
    },
    [logFilter]
  );

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await backupAPI.updateAutoSettings({
        enabled: settings.enabled,
        hour: settings.hour,
        minute: settings.minute,
        includeFiles: settings.includeFiles,
        compress: settings.compress,
        maxCount: settings.maxCount,
        maxAgeDays: settings.maxAgeDays,
        backupType: settings.backupType,
      });

      if (response?.success) {
        message.success('自动备份设置已保存');
        setModified(false);
        fetchStatus();
      }
    } catch (error) {
      message.error('保存失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteNow = async () => {
    Modal.confirm({
      title: (
        <Space>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlayCircleOutlined style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <span>立即执行备份</span>
        </Space>
      ),
      content: '确定要立即执行一次备份吗？这将在后台创建一个新的备份文件。',
      okText: '立即备份',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          const response = await backupAPI.executeNow({
            description: `手动触发 - ${new Date().toLocaleString('zh-CN')}`,
            includeFiles: settings.includeFiles,
            compress: settings.compress,
            backupType: settings.backupType,
          });

          if (response?.success) {
            message.success('备份执行成功！');
            fetchLogs(logsPagination.current, logsPagination.pageSize);
          }
        } catch (error) {
          message.error('执行失败：' + (error.response?.data?.message || error.message));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const formatTime = (hour, minute) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const formatNextRun = nextRun => {
    if (!nextRun) return '未知';
    return new Date(nextRun).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = dateTime => {
    if (!dateTime) return '-';
    return new Date(dateTime).toLocaleString('zh-CN');
  };

  const formatDuration = ms => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  };

  const formatFileSize = bytes => {
    if (!bytes) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const getStatusColor = () => {
    if (!status) return 'default';
    if (status.enabled && status.isActive) return 'success';
    if (status.enabled && !status.isActive) return 'warning';
    return 'default';
  };

  const getStatusText = () => {
    if (!status) return '加载中...';
    if (status.enabled && status.isActive) return '自动备份运行中';
    if (status.enabled && !status.isActive) return '自动备份已启用但未运行';
    return '自动备份已禁用';
  };

  const getLogStatusTag = status => {
    const statusMap = {
      pending: { color: 'default', text: '待执行' },
      running: { color: 'processing', text: '执行中' },
      success: { color: 'success', text: '成功' },
      failed: { color: 'error', text: '失败' },
    };
    const info = statusMap[status] || { color: 'default', text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const getLogTypeTag = type => {
    const typeMap = {
      auto: { color: 'blue', text: '自动备份' },
      manual: { color: 'green', text: '手动备份' },
    };
    const info = typeMap[type] || { color: 'default', text: type };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const handleLogPageChange = (page, pageSize) => {
    fetchLogs(page, pageSize);
  };

  const handleLogFilterChange = (key, value) => {
    setLogFilter(prev => ({ ...prev, [key]: value }));
  };

  const handleViewLogDetail = log => {
    setSelectedLog(log);
    setLogDetailModal(true);
  };

  const handleRefreshLogs = () => {
    fetchLogs(logsPagination.current, logsPagination.pageSize);
  };

  const StatusCard = ({ icon, title, value, subtitle, gradient }) => (
    <div
      style={{
        padding: '20px',
        borderRadius: '16px',
        background: gradient,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1 }}>
        {React.cloneElement(icon, { style: { fontSize: 120 } })}
      </div>
      <div>
        <Text style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>{title}</Text>
        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{value}</div>
      </div>
      {subtitle && <Text style={{ fontSize: 12, opacity: 0.8 }}>{subtitle}</Text>}
    </div>
  );

  const SettingItem = ({ title, description, children, bordered = true }) => (
    <div
      style={{
        padding: '20px 0',
        borderBottom: bordered ? '1px solid #f5f5f5' : 'none',
      }}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#1f2937', marginBottom: 6 }}>
            {title}
          </div>
          {description && (
            <Paragraph
              style={{
                margin: 0,
                fontSize: 13,
                color: '#6b7280',
                lineHeight: 1.6,
                maxWidth: 400,
              }}
            >
              {description}
            </Paragraph>
          )}
        </div>
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  const logColumns = [
    {
      title: '类型',
      dataIndex: 'logType',
      key: 'logType',
      width: 120,
      render: type => getLogTypeTag(type),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: status => getLogStatusTag(status),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 120,
      render: size => formatFileSize(size),
    },
    {
      title: '执行时间',
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
      render: duration => formatDuration(duration),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: date => formatDateTime(date),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Tooltip title="查看详情">
          <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewLogDetail(record)} />
        </Tooltip>
      ),
    },
  ];

  if (loading && !status) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        }}
      >
        <Spin size="large" tip="加载设置中..." />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/backup')}
            style={{ marginBottom: 16 }}
          >
            返回备份管理
          </Button>

          <div
            style={{
              background: '#fff',
              padding: '24px 32px',
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div>
                <Title
                  level={2}
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '28px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  <SettingOutlined style={{ marginRight: 12, verticalAlign: 'middle' }} />
                  自动备份设置
                </Title>
                <Paragraph style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                  配置定时自动备份，确保数据安全无忧
                </Paragraph>
              </div>
              <Space size="middle">
                <Button
                  icon={<PlayCircleOutlined />}
                  onClick={handleExecuteNow}
                  loading={loading}
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 500,
                    borderRadius: '12px',
                    padding: '8px 24px',
                  }}
                >
                  立即备份
                </Button>
                <Button
                  icon={<SaveOutlined />}
                  type="primary"
                  onClick={handleSave}
                  disabled={!modified || loading}
                  loading={loading}
                  size="large"
                  style={{
                    borderRadius: '12px',
                    padding: '8px 24px',
                    fontWeight: 500,
                  }}
                >
                  保存设置
                </Button>
              </Space>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <Title level={4} style={{ margin: '0 0 16px 0', color: '#1f2937', fontWeight: 600 }}>
            <ThunderboltOutlined style={{ marginRight: 8 }} />
            状态概览
          </Title>
          <Row gutter={[20, 20]}>
            <Col xs={24} sm={12} lg={6}>
              <StatusCard
                icon={<CheckCircleOutlined />}
                title="当前状态"
                value={getStatusText()}
                gradient={
                  status?.enabled && status.isActive
                    ? 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
                    : 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)'
                }
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatusCard
                icon={<ClockCircleOutlined />}
                title="下次执行时间"
                value={formatNextRun(status?.nextRun)}
                gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatusCard
                icon={<CloudDownloadOutlined />}
                title="备份时间"
                value={formatTime(settings.hour, settings.minute)}
                gradient="linear-gradient(135deg, #10b981 0%, #34d399 100%)"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatusCard
                icon={<FileProtectOutlined />}
                title="保留策略"
                value={`${settings.maxCount}个 / ${settings.maxAgeDays}天`}
                gradient="linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
              />
            </Col>
          </Row>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SettingOutlined style={{ color: '#fff', fontSize: 18 }} />
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>基本设置</span>
                </Space>
              }
              style={{
                borderRadius: '20px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                height: '100%',
              }}
            >
              <SettingItem
                title="启用自动备份"
                description="开启后系统会按照设定时间自动执行备份任务"
              >
                <Switch
                  checked={settings.enabled}
                  onChange={checked => {
                    setSettings({ ...settings, enabled: checked });
                    setModified(true);
                  }}
                  size="default"
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                />
              </SettingItem>

              <SettingItem
                title="备份时间"
                description="每天自动执行备份的时间，建议设置在业务低峰期"
              >
                <TimePicker
                  hour={settings.hour}
                  minute={settings.minute}
                  onChange={(newHour, newMinute) => {
                    setSettings(prev => ({
                      ...prev,
                      hour: newHour,
                      minute: newMinute,
                    }));
                    setModified(true);
                  }}
                  disabled={!settings.enabled}
                />
              </SettingItem>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ThunderboltOutlined style={{ color: '#fff', fontSize: 18 }} />
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>高级设置</span>
                </Space>
              }
              style={{
                borderRadius: '20px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                height: '100%',
              }}
            >
              <SettingItem
                title="备份类型"
                description="选择全量备份或增量备份。全量备份每次备份完整数据；增量备份仅备份变化数据，节省空间"
              >
                <Radio.Group
                  value={settings.backupType}
                  onChange={e => {
                    setSettings({ ...settings, backupType: e.target.value });
                    setModified(true);
                  }}
                  disabled={!settings.enabled}
                >
                  <Radio value="full">全量备份</Radio>
                  <Radio value="incremental">增量备份</Radio>
                </Radio.Group>
              </SettingItem>

              <SettingItem title="包含文件" description="备份时包含上传的文件（如用户头像等）">
                <Switch
                  checked={settings.includeFiles}
                  onChange={checked => {
                    setSettings({ ...settings, includeFiles: checked });
                    setModified(true);
                  }}
                  disabled={!settings.enabled}
                  checkedChildren="包含"
                  unCheckedChildren="不包含"
                />
              </SettingItem>

              <SettingItem
                title="压缩备份"
                description="使用 gzip 压缩备份文件，可节省约 60-80% 磁盘空间"
              >
                <Switch
                  checked={settings.compress}
                  onChange={checked => {
                    setSettings({ ...settings, compress: checked });
                    setModified(true);
                  }}
                  disabled={!settings.enabled}
                  checkedChildren="压缩"
                  unCheckedChildren="不压缩"
                />
              </SettingItem>

              <SettingItem
                title="最大备份数量"
                description="保留最近的备份数量，超过后会自动删除旧备份"
              >
                <InputNumber
                  min={1}
                  max={100}
                  value={settings.maxCount}
                  onChange={value => {
                    setSettings({ ...settings, maxCount: value });
                    setModified(true);
                  }}
                  addonAfter="个"
                  disabled={!settings.enabled}
                  style={{ width: 120 }}
                />
              </SettingItem>

              <SettingItem
                title="最长保存天数"
                description="备份文件的最长保存天数，超过后会自动删除"
                bordered={false}
              >
                <InputNumber
                  min={1}
                  max={365}
                  value={settings.maxAgeDays}
                  onChange={value => {
                    setSettings({ ...settings, maxAgeDays: value });
                    setModified(true);
                  }}
                  addonAfter="天"
                  disabled={!settings.enabled}
                  style={{ width: 120 }}
                />
              </SettingItem>
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HistoryOutlined style={{ color: '#fff', fontSize: 18 }} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 600 }}>备份日志</span>
            </Space>
          }
          style={{
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            marginTop: 24,
          }}
          extra={
            <Button icon={<ReloadOutlined />} onClick={handleRefreshLogs} loading={logsLoading}>
              刷新
            </Button>
          }
        >
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Text>类型：</Text>
              <Select
                placeholder="全部类型"
                style={{ width: 150 }}
                allowClear
                value={logFilter.logType || undefined}
                onChange={value => handleLogFilterChange('logType', value)}
              >
                <Option value="auto">自动备份</Option>
                <Option value="manual">手动备份</Option>
              </Select>
              <Text>状态：</Text>
              <Select
                placeholder="全部状态"
                style={{ width: 150 }}
                allowClear
                value={logFilter.status || undefined}
                onChange={value => handleLogFilterChange('status', value)}
              >
                <Option value="pending">待执行</Option>
                <Option value="running">执行中</Option>
                <Option value="success">成功</Option>
                <Option value="failed">失败</Option>
              </Select>
              <Button type="primary" onClick={() => fetchLogs(1, logsPagination.pageSize)}>
                筛选
              </Button>
            </Space>
          </div>

          <Table
            columns={logColumns}
            dataSource={logs}
            rowKey="id"
            loading={logsLoading}
            pagination={false}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无备份日志" />,
            }}
          />

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Pagination
              current={logsPagination.current}
              pageSize={logsPagination.pageSize}
              total={logsPagination.total}
              onChange={handleLogPageChange}
              showSizeChanger
              showTotal={total => `共 ${total} 条`}
            />
          </div>
        </Card>

        <div style={{ marginTop: 24 }}>
          <Alert
            message={
              <Space>
                <InfoCircleOutlined style={{ color: '#3b82f6' }} />
                <span style={{ fontWeight: 500 }}>最佳实践建议</span>
              </Space>
            }
            description={
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircleOutlined
                      style={{ color: '#10b981', marginTop: 2, flexShrink: 0 }}
                    />
                    <Text style={{ color: '#4b5563' }}>
                      <strong>备份时间：</strong>建议设置在凌晨 2-4 点业务低峰期，避免影响正常使用
                    </Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircleOutlined
                      style={{ color: '#10b981', marginTop: 2, flexShrink: 0 }}
                    />
                    <Text style={{ color: '#4b5563' }}>
                      <strong>保留策略：</strong>开发环境建议 7 个/7 天，生产环境建议 30 个/90 天
                    </Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircleOutlined
                      style={{ color: '#10b981', marginTop: 2, flexShrink: 0 }}
                    />
                    <Text style={{ color: '#4b5563' }}>
                      <strong>压缩备份：</strong>强烈建议开启，可显著减少磁盘空间占用
                    </Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircleOutlined
                      style={{ color: '#10b981', marginTop: 2, flexShrink: 0 }}
                    />
                    <Text style={{ color: '#4b5563' }}>
                      <strong>定期测试：</strong>每月至少手动执行一次备份，验证功能正常
                    </Text>
                  </div>
                </div>
              </div>
            }
            type="info"
            showIcon={false}
            style={{
              borderRadius: '16px',
              border: '1px solid #dbeafe',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            }}
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <Alert
            message={
              <Space>
                <SafetyOutlined style={{ color: '#f59e0b' }} />
                <span style={{ fontWeight: 500 }}>安全提示</span>
              </Space>
            }
            description="自动备份功能需要服务器持续运行。如果服务器重启，自动备份任务会自动恢复。请确保服务器时间设置正确。"
            type="warning"
            showIcon={false}
            style={{
              borderRadius: '16px',
              border: '1px solid #fef3c7',
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            }}
          />
        </div>
      </div>

      <Modal
        title="备份日志详情"
        open={logDetailModal}
        onCancel={() => setLogDetailModal(false)}
        footer={[
          <Button key="close" onClick={() => setLogDetailModal(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedLog && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="类型">{getLogTypeTag(selectedLog.logType)}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {getLogStatusTag(selectedLog.status)}
            </Descriptions.Item>
            <Descriptions.Item label="描述">{selectedLog.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="备份类型">
              {selectedLog.backupType === 'full' ? '全量备份' : '增量备份'}
            </Descriptions.Item>
            <Descriptions.Item label="文件名">{selectedLog.filename || '-'}</Descriptions.Item>
            <Descriptions.Item label="文件大小">
              {formatFileSize(selectedLog.fileSize)}
            </Descriptions.Item>
            <Descriptions.Item label="包含文件">
              {selectedLog.includeFiles ? '是' : '否'}
            </Descriptions.Item>
            <Descriptions.Item label="压缩">
              {selectedLog.compressed ? '是' : '否'}
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {formatDateTime(selectedLog.startTime)}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {formatDateTime(selectedLog.endTime)}
            </Descriptions.Item>
            <Descriptions.Item label="执行时长">
              {formatDuration(selectedLog.duration)}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {formatDateTime(selectedLog.createdAt)}
            </Descriptions.Item>
            {selectedLog.errorMessage && (
              <Descriptions.Item label="错误信息">
                <Text type="danger">{selectedLog.errorMessage}</Text>
              </Descriptions.Item>
            )}
            {selectedLog.remoteUploads && selectedLog.remoteUploads.length > 0 && (
              <Descriptions.Item label="远端上传">
                <div>
                  {selectedLog.remoteUploads.map((upload, index) => (
                    <div key={index} style={{ marginBottom: 8 }}>
                      <Tag color={upload.success ? 'success' : 'error'}>{upload.targetName}</Tag>
                      <Text style={{ marginLeft: 8 }}>
                        {upload.success ? '上传成功' : `失败: ${upload.error}`}
                      </Text>
                    </div>
                  ))}
                </div>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AutoBackupSettings;
