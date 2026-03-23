import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  message,
  Popconfirm,
  Divider,
  Alert,
  Row,
  Col,
  Typography,
  Tooltip,
  Steps,
  Skeleton,
  Badge,
  Progress,
  Empty,
  Result,
  Collapse,
  Statistic,
} from 'antd';
import {
  CloudOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowLeftOutlined,
  SettingOutlined,
  CloudUploadOutlined,
  GlobalOutlined,
  LockOutlined,
  UserOutlined,
  DatabaseOutlined,
  ApiOutlined,
  SafetyOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  SyncOutlined,
  QuestionCircleOutlined,
  CopyOutlined,
  ReloadOutlined,
  LinkOutlined,
  HddOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

// 设计系统 - 统一视觉风格
const designTokens = {
  colors: {
    primary: {
      main: '#667eea',
      light: '#764ba2',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      gradientHover: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    },
    danger: {
      main: '#ef4444',
      light: '#f87171',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    },
    background: {
      primary: '#f8fafc',
      secondary: '#ffffff',
      accent: '#f1f5f9',
      gradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      muted: '#94a3b8',
    },
    border: {
      light: '#e2e8f0',
      medium: '#cbd5e1',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    glow: '0 0 20px rgba(102, 126, 234, 0.15)',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// 按钮样式系统
const buttonStyles = {
  primary: {
    background: designTokens.colors.primary.gradient,
    border: 'none',
    borderRadius: designTokens.borderRadius.md,
    fontWeight: 600,
    boxShadow: designTokens.shadows.md,
    transition: `all ${designTokens.transitions.normal}`,
  },
  secondary: {
    background: designTokens.colors.background.secondary,
    border: `1px solid ${designTokens.colors.border.light}`,
    borderRadius: designTokens.borderRadius.md,
    fontWeight: 500,
    color: designTokens.colors.text.primary,
    transition: `all ${designTokens.transitions.normal}`,
  },
  danger: {
    background: designTokens.colors.danger.gradient,
    border: 'none',
    borderRadius: designTokens.borderRadius.md,
    fontWeight: 600,
    boxShadow: designTokens.shadows.md,
    transition: `all ${designTokens.transitions.normal}`,
  },
  success: {
    background: designTokens.colors.success.gradient,
    border: 'none',
    borderRadius: designTokens.borderRadius.md,
    fontWeight: 600,
    boxShadow: designTokens.shadows.md,
    transition: `all ${designTokens.transitions.normal}`,
  },
};

const RemoteBackupSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [targets, setTargets] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({
    enabled: false,
    uploadAfterBackup: true,
    deleteLocalAfterUpload: false,
    retryCount: 3,
    retryDelay: 5000,
    timeout: 300000,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [protocols, setProtocols] = useState([]);
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [testStatus, setTestStatus] = useState(null);
  const [testing, setTesting] = useState(false);

  const protocolsList = [
    { value: 'sftp', label: 'SFTP', icon: <LockOutlined />, category: 'server', description: 'SSH 安全文件传输协议' },
    { value: 'ftp', label: 'FTP/FTPS', icon: <GlobalOutlined />, category: 'server', description: '传统文件传输协议（支持 FTPS）' },
    { value: 'webdav', label: 'WebDAV', icon: <ApiOutlined />, category: 'server', description: '基于 HTTP 的文件传输协议' },
    { value: 'smb', label: 'SMB/CIFS', icon: <DatabaseOutlined />, category: 'server', description: 'Windows 网络共享文件夹' },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);
      await Promise.all([
        fetchTargets(),
        fetchGlobalSettings(),
        fetchProtocols(),
      ]);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchTargets = async () => {
    try {
      const response = await api.get('/backup/remote/targets');
      if (response?.success) {
        setTargets(response.data.targets || []);
      }
    } catch (error) {
      console.error('获取远端目标列表失败:', error);
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      const response = await api.get('/backup/remote/settings');
      if (response?.success) {
        setGlobalSettings(response.data.settings || {});
      }
    } catch (error) {
      console.error('获取全局设置失败:', error);
    }
  };

  const fetchProtocols = async () => {
    try {
      const response = await api.get('/backup/remote/protocols');
      if (response?.success) {
        setProtocols(response.data.protocols || []);
      }
    } catch (error) {
      console.error('获取协议列表失败:', error);
    }
  };

  const handleAdd = () => {
    setEditingTarget(null);
    setCurrentStep(0);
    setTestStatus(null);
    form.resetFields();
    form.setFieldsValue({ enabled: true });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingTarget(record);
    setCurrentStep(1);
    setTestStatus(null);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      const response = await api.delete(`/backup/remote/targets/${id}`);
      if (response?.success) {
        message.success('删除成功');
        fetchTargets();
      }
    } catch (error) {
      message.error('删除失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (record) => {
    try {
      setTesting(true);
      const response = await api.post(`/backup/remote/targets/${record.id}/test`);
      if (response?.success) {
        message.success('连接测试成功！');
      } else {
        message.error('连接测试失败：' + (response?.data?.message || '未知错误'));
      }
    } catch (error) {
      message.error('连接测试失败：' + (error.response?.data?.message || error.message));
    } finally {
      setTesting(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestStatus('testing');
      
      const values = await form.validateFields();
      const response = await api.post('/backup/remote/test', values);
      
      if (response?.success) {
        setTestStatus('success');
        message.success('连接测试成功！');
      } else {
        setTestStatus('error');
        message.error('连接测试失败：' + (response?.data?.message || '未知错误'));
      }
    } catch (error) {
      setTestStatus('error');
      if (error.errorFields) {
        message.error('请先完善表单信息');
      } else {
        message.error('连接测试失败：' + (error.response?.data?.message || error.message));
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      if (editingTarget) {
        const response = await api.put(`/backup/remote/targets/${editingTarget.id}`, values);
        if (response?.success) {
          message.success('更新成功');
          setModalVisible(false);
          fetchTargets();
        }
      } else {
        const response = await api.post('/backup/remote/targets', values);
        if (response?.success) {
          message.success('添加成功');
          setModalVisible(false);
          fetchTargets();
        }
      }
    } catch (error) {
      if (!error.errorFields) {
        message.error('保存失败：' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGlobalSettings = async (key, value) => {
    try {
      const newSettings = { ...globalSettings, [key]: value };
      const response = await api.put('/backup/remote/settings', newSettings);
      if (response?.success) {
        setGlobalSettings(newSettings);
        message.success('设置已更新');
      }
    } catch (error) {
      message.error('更新设置失败：' + (error.response?.data?.message || error.message));
    }
  };

  const getProtocolLabel = (protocol) => {
    const proto = protocolsList.find(p => p.value === protocol);
    return proto ? proto.label : protocol;
  };

  const getProtocolIcon = (protocol) => {
    const proto = protocolsList.find(p => p.value === protocol);
    return proto?.icon || <CloudOutlined />;
  };

  const getStatusColor = (enabled) => enabled ? 'success' : 'default';

  const columns = [
    {
      title: (
        <span style={{ fontWeight: 600, color: designTokens.colors.text.primary }}>
          <HddOutlined style={{ marginRight: 4 }} />
          目标名称
        </span>
      ),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => (
        <Space>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: designTokens.borderRadius.sm,
            background: designTokens.colors.primary.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: designTokens.shadows.sm,
          }}>
            {React.cloneElement(getProtocolIcon(record.protocol), { style: { color: '#fff', fontSize: 18 } })}
          </div>
          <div>
            <Text strong style={{ display: 'block' }}>{text}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {getProtocolLabel(record.protocol)}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: (
        <span style={{ fontWeight: 600, color: designTokens.colors.text.primary }}>
          <LinkOutlined style={{ marginRight: 4 }} />
          连接地址
        </span>
      ),
      key: 'host',
      width: 220,
      render: (_, record) => {
        if (record.protocol === 'webdav') {
          return (
            <Tooltip title={record.url}>
              <Text code style={{ 
                fontSize: 12,
                background: designTokens.colors.background.accent,
                padding: '4px 8px',
                borderRadius: designTokens.borderRadius.sm,
              }}>
                {record.url?.length > 30 ? `${record.url.substring(0, 30)}...` : record.url}
              </Text>
            </Tooltip>
          );
        }
        return (
          <Text code style={{ 
            fontSize: 12,
            background: designTokens.colors.background.accent,
            padding: '4px 8px',
            borderRadius: designTokens.borderRadius.sm,
          }}>
            {record.host}:{record.port || (record.protocol === 'ftp' ? 21 : 22)}
          </Text>
        );
      },
    },
    {
      title: (
        <span style={{ fontWeight: 600, color: designTokens.colors.text.primary }}>
          <FolderOutlined style={{ marginRight: 4 }} />
          远程路径
        </span>
      ),
      key: 'path',
      width: 140,
      render: (_, record) => (
        <Tag 
          style={{ 
            borderRadius: designTokens.borderRadius.sm,
            background: designTokens.colors.background.accent,
            border: `1px solid ${designTokens.colors.border.light}`,
          }}
        >
          {record.prefix || record.rootPath || '/'}
        </Tag>
      ),
    },
    {
      title: (
        <span style={{ fontWeight: 600, color: designTokens.colors.text.primary }}>
          状态
        </span>
      ),
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled) => (
        <Tag 
          color={enabled ? 'success' : 'default'}
          style={{ 
            borderRadius: designTokens.borderRadius.sm,
            fontWeight: 500,
          }}
        >
          {enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: (
        <span style={{ fontWeight: 600, color: designTokens.colors.text.primary }}>
          操作
        </span>
      ),
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="测试连接">
            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => handleTest(record)}
              loading={testing}
              style={{
                ...buttonStyles.success,
                color: '#fff',
                padding: '4px 12px',
                height: '32px',
                fontSize: '13px',
              }}
            >
              测试
            </Button>
          </Tooltip>
          <Tooltip title="编辑配置">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{
                ...buttonStyles.secondary,
                padding: '4px 12px',
                height: '32px',
                fontSize: '13px',
              }}
            >
              编辑
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定要删除这个远端备份目标吗？"
            description="删除后无法恢复，请谨慎操作"
            onConfirm={() => handleDelete(record.id)}
            okText="确定删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button
                size="small"
                icon={<DeleteOutlined />}
                style={{
                  background: designTokens.colors.background.accent,
                  border: 'none',
                  borderRadius: designTokens.borderRadius.sm,
                  color: designTokens.colors.danger.main,
                  width: '32px',
                  height: '32px',
                }}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderProtocolFields = (protocol) => {
    if (!protocol) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="请先选择协议类型"
        />
      );
    }

    const fieldsMap = {
      ftp: {
        title: 'FTP/FTPS 配置',
        icon: <GlobalOutlined />,
        fields: (
          <>
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item
                  name="host"
                  label="服务器地址"
                  rules={[
                    { required: true, message: '请输入服务器地址' },
                    { pattern: /^[\w.-]+$/, message: '请输入有效的服务器地址' },
                  ]}
                  tooltip="支持 IP 地址或域名"
                >
                  <Input 
                    prefix={<GlobalOutlined />}
                    placeholder="例如：192.168.1.100 或 ftp.example.com" 
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="port"
                  label="端口"
                  initialValue={21}
                  rules={[{ required: true, message: '请输入端口' }]}
                >
                  <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="username"
                  label="用户名"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="FTP 用户名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="密码"
                  rules={[{ required: !editingTarget, message: '请输入密码' }]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="FTP 密码" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="secure"
              label="使用 FTPS（FTP over SSL/TLS）"
              valuePropName="checked"
              initialValue={false}
              tooltip="启用后使用加密传输，更安全"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item
              name="rootPath"
              label="根路径"
              initialValue="/"
              tooltip="备份文件存储的根目录"
            >
              <Input placeholder="例如：/backups" />
            </Form.Item>
          </>
        ),
      },
      sftp: {
        title: 'SFTP 配置',
        icon: <LockOutlined />,
        fields: (
          <>
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item
                  name="host"
                  label="服务器地址"
                  rules={[
                    { required: true, message: '请输入服务器地址' },
                    { pattern: /^[\w.-]+$/, message: '请输入有效的服务器地址' },
                  ]}
                >
                  <Input prefix={<GlobalOutlined />} placeholder="例如：192.168.1.100" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="port"
                  label="端口"
                  initialValue={22}
                  rules={[{ required: true, message: '请输入端口' }]}
                >
                  <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="username"
                  label="用户名"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="SSH 用户名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="密码"
                  rules={[{ required: !editingTarget, message: '请输入密码' }]}
                  tooltip="或使用密钥认证"
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="SSH 密码" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="rootPath"
              label="根路径"
              initialValue="/"
            >
              <Input placeholder="例如：/backups" />
            </Form.Item>
          </>
        ),
      },
      webdav: {
        title: 'WebDAV 配置',
        icon: <ApiOutlined />,
        fields: (
          <>
            <Form.Item
              name="url"
              label="WebDAV URL"
              rules={[
                { required: true, message: '请输入 WebDAV URL' },
                { type: 'url', message: '请输入有效的 URL' },
              ]}
            >
              <Input prefix={<ApiOutlined />} placeholder="例如：https://dav.jianguoyun.com/dav" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="username"
                  label="用户名"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="WebDAV 用户名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="密码"
                  rules={[{ required: !editingTarget, message: '请输入密码' }]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="WebDAV 密码" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="rootPath"
              label="根路径"
              initialValue="/"
            >
              <Input placeholder="例如：/backups" />
            </Form.Item>
          </>
        ),
      },
      smb: {
        title: 'SMB/CIFS 配置',
        icon: <DatabaseOutlined />,
        fields: (
          <>
            <Form.Item
              name="host"
              label="服务器地址"
              rules={[{ required: true, message: '请输入服务器地址' }]}
            >
              <Input prefix={<GlobalOutlined />} placeholder="例如：192.168.1.100" />
            </Form.Item>
            <Form.Item
              name="share"
              label="共享文件夹名称"
              rules={[{ required: true, message: '请输入共享文件夹名称' }]}
            >
              <Input placeholder="例如：Backups" />
            </Form.Item>
            <Form.Item
              name="domain"
              label="域（可选）"
            >
              <Input placeholder="WORKGROUP 或域名" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="username"
                  label="用户名"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="SMB 用户名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="密码"
                  rules={[{ required: !editingTarget, message: '请输入密码' }]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="SMB 密码" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="rootPath"
              label="根路径"
              initialValue="/"
            >
              <Input placeholder="例如：/backups" />
            </Form.Item>
          </>
        ),
      },
    };

    const config = fieldsMap[protocol];
    if (!config) return null;

    return (
      <Card 
        size="small" 
        title={
          <Space>
            {config.icon}
            <span>{config.title}</span>
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        {config.fields}
      </Card>
    );
  };

  const renderProtocolSelector = () => (
    <div style={{ padding: '16px 0' }}>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        选择适合你的远端存储类型，支持 FTP/SFTP、WebDAV、SMB 等多种协议
      </Paragraph>
      
      <Form.Item
        name="protocol"
        rules={[{ required: true, message: '请选择协议类型' }]}
      >
        <Select
          placeholder="选择协议类型"
          size="large"
          onChange={() => {
            form.setFieldsValue({});
            setTestStatus(null);
          }}
        >
          {protocolsList.map(proto => (
            <Select.Option key={proto.value} value={proto.value}>
              <Space>
                {proto.icon}
                <span>{proto.label}</span>
              </Space>
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item noStyle shouldUpdate>
        {() => {
          const protocol = form.getFieldValue('protocol');
          if (protocol) {
            const proto = protocolsList.find(p => p.value === protocol);
            return (
              <Alert
                message={proto?.description}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            );
          }
          return null;
        }}
      </Form.Item>
    </div>
  );

  const renderSkeleton = () => (
    <div>
      <Skeleton active paragraph={{ rows: 4 }} />
      <Divider />
      <Skeleton active paragraph={{ rows: 8 }} />
    </div>
  );

  // 页面容器样式
  const containerStyle = {
    minHeight: '100vh',
    background: designTokens.colors.background.gradient,
    padding: '24px',
  };

  // 页面头部样式
  const headerCardStyle = {
    borderRadius: designTokens.borderRadius.lg,
    border: 'none',
    boxShadow: designTokens.shadows.lg,
    background: designTokens.colors.background.secondary,
    marginBottom: 24,
    overflow: 'hidden',
  };

  // 卡片样式
  const cardStyle = {
    borderRadius: designTokens.borderRadius.lg,
    border: 'none',
    boxShadow: designTokens.shadows.md,
    background: designTokens.colors.background.secondary,
    transition: `all ${designTokens.transitions.normal}`,
  };

  if (initialLoading) {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {renderSkeleton()}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* 页面头部 */}
        <div style={{ marginBottom: 24 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/backup')}
            style={{
              ...buttonStyles.secondary,
              marginBottom: 16,
              padding: '8px 16px',
              height: '40px',
            }}
          >
            返回备份管理
          </Button>

          <Card style={headerCardStyle} styles={{ body: { padding: '24px 32px' } }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: 16 
            }}>
              <div>
                <Title level={2} style={{
                  margin: '0 0 8px 0',
                  fontSize: 'clamp(24px, 4vw, 32px)',
                  fontWeight: 700,
                  background: designTokens.colors.primary.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <CloudOutlined style={{ 
                    marginRight: 12, 
                    fontSize: 32,
                    background: designTokens.colors.primary.gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }} />
                  远端备份配置
                </Title>
                <Paragraph style={{ margin: 0, fontSize: 14, color: designTokens.colors.text.secondary }}>
                  配置多个远端存储目标，实现备份数据异地容灾
                </Paragraph>
              </div>
              <Space size={12}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadInitialData}
                  loading={initialLoading}
                  style={{
                    ...buttonStyles.secondary,
                    padding: '8px 16px',
                    height: '40px',
                  }}
                >
                  刷新
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                  style={{
                    ...buttonStyles.primary,
                    padding: '8px 24px',
                    height: '40px',
                    color: '#fff',
                  }}
                >
                  添加远端目标
                </Button>
              </Space>
            </div>
          </Card>
        </div>

        {/* 统计概览 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              style={{ 
                borderRadius: designTokens.borderRadius.lg,
                border: 'none',
                background: globalSettings.enabled 
                  ? designTokens.colors.success.gradient
                  : `linear-gradient(135deg, ${designTokens.colors.text.muted} 0%, #9ca3af 100%)`,
                color: '#fff',
                height: '100%',
                minHeight: 130,
                boxShadow: globalSettings.enabled 
                  ? '0 8px 24px rgba(16, 185, 129, 0.25)'
                  : designTokens.shadows.md,
                transition: `all ${designTokens.transitions.normal}`,
              }}
              styles={{ body: { padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>
                    远端备份状态
                  </Text>
                  <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>
                    {globalSettings.enabled ? '已启用' : '已禁用'}
                  </div>
                </div>
                <Switch
                  checked={globalSettings.enabled}
                  onChange={(checked) => handleUpdateGlobalSettings('enabled', checked)}
                  checkedChildren="开"
                  unCheckedChildren="关"
                  style={{ 
                    background: globalSettings.enabled ? 'rgba(255,255,255,0.3)' : undefined 
                  }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              style={{ 
                ...cardStyle, 
                height: '100%', 
                minHeight: 130,
              }}
              styles={{ body: { padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: designTokens.borderRadius.sm,
                    background: designTokens.colors.primary.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <CloudOutlined style={{ color: '#fff', fontSize: 16 }} />
                  </div>
                  <Text type="secondary" style={{ fontSize: 13 }}>远端目标</Text>
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: designTokens.colors.text.primary }}>
                  {targets.length}
                  <span style={{ fontSize: 16, fontWeight: 500, marginLeft: 4, color: designTokens.colors.text.secondary }}>个</span>
                </div>
              </div>
              <div>
                <Progress 
                  percent={(targets.filter(t => t.enabled).length / Math.max(targets.length, 1)) * 100}
                  showInfo={false}
                  strokeColor={designTokens.colors.primary.main}
                  size="small"
                  style={{ marginTop: 8 }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {targets.filter(t => t.enabled).length} 个已启用
                </Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              style={{ 
                ...cardStyle, 
                height: '100%', 
                minHeight: 130,
              }}
              styles={{ body: { padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: designTokens.borderRadius.sm,
                  background: globalSettings.uploadAfterBackup 
                    ? designTokens.colors.success.gradient 
                    : designTokens.colors.background.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CloudUploadOutlined style={{ 
                    color: globalSettings.uploadAfterBackup ? '#fff' : designTokens.colors.text.muted, 
                    fontSize: 16 
                  }} />
                </div>
                <Text type="secondary" style={{ fontSize: 13 }}>自动上传</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ 
                  fontSize: 16,
                  color: globalSettings.uploadAfterBackup 
                    ? designTokens.colors.success.main 
                    : designTokens.colors.text.secondary 
                }}>
                  {globalSettings.uploadAfterBackup ? '已开启' : '已关闭'}
                </Text>
                <Switch
                  checked={globalSettings.uploadAfterBackup}
                  onChange={(checked) => handleUpdateGlobalSettings('uploadAfterBackup', checked)}
                  disabled={!globalSettings.enabled}
                  checkedChildren="开"
                  unCheckedChildren="关"
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              style={{ 
                ...cardStyle, 
                height: '100%', 
                minHeight: 130,
              }}
              styles={{ body: { padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: designTokens.borderRadius.sm,
                  background: globalSettings.deleteLocalAfterUpload 
                    ? designTokens.colors.warning.gradient 
                    : designTokens.colors.background.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <SafetyOutlined style={{ 
                    color: globalSettings.deleteLocalAfterUpload ? '#fff' : designTokens.colors.text.muted, 
                    fontSize: 16 
                  }} />
                </div>
                <Text type="secondary" style={{ fontSize: 13 }}>删除本地文件</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ 
                  fontSize: 16,
                  color: globalSettings.deleteLocalAfterUpload 
                    ? designTokens.colors.warning.main 
                    : designTokens.colors.text.secondary 
                }}>
                  {globalSettings.deleteLocalAfterUpload ? '已开启' : '已关闭'}
                </Text>
                <Switch
                  checked={globalSettings.deleteLocalAfterUpload}
                  onChange={(checked) => handleUpdateGlobalSettings('deleteLocalAfterUpload', checked)}
                  disabled={!globalSettings.enabled}
                  checkedChildren="开"
                  unCheckedChildren="关"
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* 远端目标列表 */}
        <Card 
          style={{ 
            ...cardStyle, 
            marginBottom: 24,
          }}
          styles={{ 
            body: { padding: '24px' },
            header: { 
              padding: '20px 24px',
              borderBottom: `1px solid ${designTokens.colors.border.light}`,
            },
          }}
          title={
            <Space>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: designTokens.borderRadius.sm,
                background: designTokens.colors.primary.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CloudUploadOutlined style={{ color: '#fff', fontSize: 18 }} />
              </div>
              <span style={{ fontWeight: 600, fontSize: 16, color: designTokens.colors.text.primary }}>
                远端备份目标列表
              </span>
            </Space>
          }
          extra={
            <Space>
              <Tag 
                style={{ 
                  borderRadius: designTokens.borderRadius.sm,
                  background: designTokens.colors.background.accent,
                  border: 'none',
                  fontWeight: 500,
                }}
              >
                共 {targets.length} 个目标
              </Tag>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={targets}
            rowKey="id"
            loading={loading}
            pagination={{ 
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个目标`,
            }}
            scroll={{ x: 1100 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Space direction="vertical" size={8}>
                      <div style={{
                        width: 64,
                        height: 64,
                        margin: '0 auto',
                        borderRadius: '50%',
                        background: designTokens.colors.background.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <CloudOutlined style={{ fontSize: 28, color: designTokens.colors.text.muted }} />
                      </div>
                      <Text style={{ fontSize: 15, fontWeight: 500 }}>暂无远端备份目标</Text>
                      <Text type="secondary" style={{ fontSize: 13 }}>点击下方按钮添加您的第一个远端备份目标</Text>
                      <Button 
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                        style={{
                          ...buttonStyles.primary,
                          color: '#fff',
                          marginTop: 8,
                        }}
                      >
                        添加远端目标
                      </Button>
                    </Space>
                  }
                />
              ),
            }}
          />
        </Card>

        {/* 帮助文档 */}
        <Collapse 
          accordion 
          style={{ 
            borderRadius: designTokens.borderRadius.lg, 
            marginBottom: 24,
            border: 'none',
            boxShadow: designTokens.shadows.sm,
          }}
          bordered={false}
        >
          <Panel 
            header={
              <Space>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: designTokens.borderRadius.sm,
                  background: designTokens.colors.info.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <QuestionCircleOutlined style={{ color: '#fff', fontSize: 16 }} />
                </div>
                <span style={{ fontWeight: 600, color: designTokens.colors.text.primary }}>使用帮助与最佳实践</span>
              </Space>
            }
            key="help"
            style={{ 
              border: 'none',
              background: designTokens.colors.background.secondary,
              borderRadius: designTokens.borderRadius.lg,
            }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card 
                  size="small" 
                  title={
                    <Space>
                      <span style={{ fontSize: 16 }}>🎯</span>
                      <span>推荐配置</span>
                    </Space>
                  }
                  style={{ 
                    borderRadius: designTokens.borderRadius.md,
                    border: `1px solid ${designTokens.colors.border.light}`,
                  }}
                >
                  <ul style={{ paddingLeft: 20, margin: 0, color: designTokens.colors.text.secondary }}>
                    <li><strong>多地备份：</strong>配置至少 2 个不同地理位置的目标</li>
                    <li><strong>加密传输：</strong>敏感数据使用 SFTP 或 HTTPS 协议</li>
                    <li><strong>定期测试：</strong>每月至少测试一次连接</li>
                  </ul>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card 
                  size="small" 
                  title={
                    <Space>
                      <span style={{ fontSize: 16 }}>⚠️</span>
                      <span>注意事项</span>
                    </Space>
                  }
                  style={{ 
                    borderRadius: designTokens.borderRadius.md,
                    border: `1px solid ${designTokens.colors.border.light}`,
                  }}
                >
                  <ul style={{ paddingLeft: 20, margin: 0, color: designTokens.colors.text.secondary }}>
                    <li>首次使用前请先测试连接</li>
                    <li>密码等敏感信息已加密存储</li>
                    <li>启用"删除本地文件"前请确保远端上传成功</li>
                    <li>建议定期检查远端备份文件完整性</li>
                  </ul>
                </Card>
              </Col>
            </Row>
          </Panel>
        </Collapse>
      </div>

      {/* 添加/编辑弹窗 */}
      <Modal
        title={null}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
        centered
        styles={{
          body: { padding: '24px 32px' },
        }}
      >
        <div style={{ padding: '8px 0' }}>
          <Title level={4} style={{ 
            marginBottom: 24,
            fontWeight: 600,
            color: designTokens.colors.text.primary,
          }}>
            {editingTarget ? '编辑远端备份目标' : '添加远端备份目标'}
          </Title>

          <Steps
            current={currentStep}
            onChange={setCurrentStep}
            style={{ marginBottom: 24 }}
          >
            <Steps.Step 
              title="基本信息" 
              icon={<SettingOutlined />}
            />
            <Steps.Step 
              title="协议配置" 
              icon={<CloudOutlined />}
            />
            <Steps.Step 
              title="测试保存" 
              icon={<CheckCircleOutlined />}
            />
          </Steps>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            {/* 步骤 1: 基本信息 */}
            {currentStep === 0 && (
              <div>
                <Form.Item
                  name="name"
                  label="目标名称"
                  rules={[
                    { required: true, message: '请输入目标名称' },
                    { max: 50, message: '名称不能超过 50 个字符' },
                  ]}
                >
                  <Input 
                    placeholder="例如：SFTP 备份服务器" 
                    size="large"
                  />
                </Form.Item>

                {renderProtocolSelector()}

                <Form.Item
                  name="enabled"
                  label="启用状态"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch 
                    checkedChildren="启用" 
                    unCheckedChildren="禁用" 
                  />
                </Form.Item>

                <div style={{ marginTop: 24, textAlign: 'right' }}>
                  <Button 
                    type="primary" 
                    onClick={() => {
                      form.validateFields(['name', 'protocol']).then(() => {
                        setCurrentStep(1);
                      });
                    }}
                  >
                    下一步：协议配置
                  </Button>
                </div>
              </div>
            )}

            {/* 步骤 2: 协议配置 */}
            {currentStep === 1 && (
              <div>
                <Form.Item noStyle shouldUpdate>
                  {() => renderProtocolFields(form.getFieldValue('protocol'))}
                </Form.Item>

                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={() => setCurrentStep(0)}>
                    上一步
                  </Button>
                  <Space>
                    <Button 
                      icon={<ThunderboltOutlined />}
                      onClick={handleTestConnection}
                      loading={testing}
                    >
                      测试连接
                    </Button>
                    <Button 
                      type="primary"
                      onClick={() => {
                        form.validateFields().then(() => {
                          setCurrentStep(2);
                        });
                      }}
                    >
                      下一步：保存确认
                    </Button>
                  </Space>
                </div>
              </div>
            )}

            {/* 步骤 3: 测试保存 */}
            {currentStep === 2 && (
              <div>
                <Alert
                  message="配置信息确认"
                  description={
                    <div>
                      <Paragraph>请确认以下配置信息是否正确：</Paragraph>
                      <ul style={{ paddingLeft: 20 }}>
                        <li>目标名称：{form.getFieldValue('name')}</li>
                        <li>协议类型：{getProtocolLabel(form.getFieldValue('protocol'))}</li>
                        <li>启用状态：{form.getFieldValue('enabled') ? '启用' : '禁用'}</li>
                      </ul>
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                {testStatus === 'success' && (
                  <Alert
                    message="连接测试成功"
                    description="远端连接测试通过，可以正常使用"
                    type="success"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}

                {testStatus === 'error' && (
                  <Alert
                    message="连接测试失败"
                    description="建议先返回上一步测试连接，确保配置正确"
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}

                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={() => setCurrentStep(1)}>
                    上一步
                  </Button>
                  <Space>
                    <Button onClick={() => setModalVisible(false)}>
                      取消
                    </Button>
                    <Button 
                      type="primary"
                      onClick={handleSubmit}
                      loading={loading}
                      icon={<CheckCircleOutlined />}
                    >
                      确认保存
                    </Button>
                  </Space>
                </div>
              </div>
            )}
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default RemoteBackupSettings;
