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
} from '@ant-design/icons';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

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
  });
  const [modified, setModified] = useState(false);
  const isInitialMount = useRef(true);
  const isFetching = useRef(false);

  useEffect(() => {
    if (isInitialMount.current) {
      fetchStatus();
      isInitialMount.current = false;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (isFetching.current) return;
    
    try {
      setLoading(true);
      isFetching.current = true;
      const response = await api.get('/backup/auto/status');
      if (response?.success) {
        const data = response.data;
        setStatus(data);
        
        // 解析 Cron 表达式获取小时和分钟
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

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await api.post('/backup/auto/settings', {
        enabled: settings.enabled,
        hour: settings.hour,
        minute: settings.minute,
        includeFiles: settings.includeFiles,
        compress: settings.compress,
        maxCount: settings.maxCount,
        maxAgeDays: settings.maxAgeDays,
      });

      if (response?.success) {
        message.success('自动备份设置已保存');
        setModified(false);
        // 不需要立即刷新，因为保存成功后状态已经是最新的
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
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
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
          const response = await api.post('/backup/auto/execute', {
            description: `手动触发 - ${new Date().toLocaleString('zh-CN')}`,
            includeFiles: settings.includeFiles,
            compress: settings.compress,
          });

          if (response?.success) {
            message.success('备份执行成功！');
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

  const formatNextRun = (nextRun) => {
    if (!nextRun) return '未知';
    return new Date(nextRun).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  // 状态卡片组件
  const StatusCard = ({ icon, title, value, subtitle, gradient }) => (
    <div style={{
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
    }}>
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

  // 设置项组件
  const SettingItem = ({ title, description, children, bordered = true }) => (
    <div style={{
      padding: '16px 0',
      borderBottom: bordered ? '1px solid #f0f0f0' : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 14, color: '#1f2937', marginBottom: 4 }}>
            {title}
          </div>
          {description && (
            <Paragraph style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
              {description}
            </Paragraph>
          )}
        </div>
        <div style={{ flexShrink: 0 }}>{children}</div>
      </div>
    </div>
  );

  if (loading && !status) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      }}>
        <Spin size="large" tip="加载设置中..." />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      padding: '24px',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* 页面头部 */}
        <div style={{ marginBottom: 32 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/backup')}
            style={{ marginBottom: 16 }}
          >
            返回备份管理
          </Button>
          
          <div style={{
            background: '#fff',
            padding: '24px 32px',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <Title level={2} style={{
                  margin: '0 0 8px 0',
                  fontSize: '28px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
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

        {/* 状态概览 */}
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
                gradient={status?.enabled && status.isActive ? 
                  'linear-gradient(135deg, #10b981 0%, #34d399 100%)' : 
                  'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)'}
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

        {/* 设置卡片 */}
        <Row gutter={[24, 24]}>
          {/* 基本设置 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
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
                  onChange={(checked) => {
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
                <Space>
                  <InputNumber
                    min={0}
                    max={23}
                    value={settings.hour}
                    onChange={(value) => {
                      setSettings({ ...settings, hour: value });
                      setModified(true);
                    }}
                    addonAfter="时"
                    disabled={!settings.enabled}
                    style={{ width: 100 }}
                  />
                  <InputNumber
                    min={0}
                    max={59}
                    value={settings.minute}
                    onChange={(value) => {
                      setSettings({ ...settings, minute: value });
                      setModified(true);
                    }}
                    addonAfter="分"
                    disabled={!settings.enabled}
                    style={{ width: 100 }}
                  />
                </Space>
              </SettingItem>
            </Card>
          </Col>

          {/* 高级设置 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
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
                title="包含文件"
                description="备份时包含上传的文件（如用户头像等）"
              >
                <Switch
                  checked={settings.includeFiles}
                  onChange={(checked) => {
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
                  onChange={(checked) => {
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
                  onChange={(value) => {
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
                  onChange={(value) => {
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

        {/* 提示信息 */}
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
                    <CheckCircleOutlined style={{ color: '#10b981', marginTop: 2, flexShrink: 0 }} />
                    <Text style={{ color: '#4b5563' }}>
                      <strong>备份时间：</strong>建议设置在凌晨 2-4 点业务低峰期，避免影响正常使用
                    </Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: '#10b981', marginTop: 2, flexShrink: 0 }} />
                    <Text style={{ color: '#4b5563' }}>
                      <strong>保留策略：</strong>开发环境建议 7 个/7 天，生产环境建议 30 个/90 天
                    </Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: '#10b981', marginTop: 2, flexShrink: 0 }} />
                    <Text style={{ color: '#4b5563' }}>
                      <strong>压缩备份：</strong>强烈建议开启，可显著减少磁盘空间占用
                    </Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: '#10b981', marginTop: 2, flexShrink: 0 }} />
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

        {/* 安全提示 */}
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
    </div>
  );
};

export default AutoBackupSettings;
