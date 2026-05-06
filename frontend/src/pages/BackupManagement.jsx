import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Progress,
  Descriptions,
  Alert,
  Divider,
  Typography,
  Upload,
  Statistic,
  Row,
  Col,
  Dropdown,
  Checkbox,
} from 'antd';
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  CloudOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  ReloadOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  MoreOutlined,
  SafetyOutlined,
  PlusOutlined,
  ClearOutlined,
  EyeOutlined,
  TableOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import api, { backupAPI } from '../api';
import CloseButton from '../components/CloseButton';
import { useNavigate } from 'react-router-dom';
import secureStorage, { TOKEN_KEY } from '../utils/secureStorage';

const { Title, Text } = Typography;

const TABLE_NAME_MAPPING = {
  User: '用户',
  Role: '角色',
  UserRole: '用户角色关联',
  Permission: '权限',
  Room: '机房',
  Rack: '机柜',
  Device: '设备',
  DeviceField: '设备自定义字段',
  DevicePort: '设备端口',
  NetworkCard: '网卡',
  Cable: '线缆',
  PendingDevice: '待入库设备',
  FaultCategory: '故障分类',
  Ticket: '工单',
  TicketField: '工单自定义字段',
  TicketOperationRecord: '工单操作记录',
  ConsumableCategory: '耗材分类',
  Consumable: '耗材',
  ConsumableRecord: '耗材记录',
  ConsumableLog: '耗材操作日志',
  ConsumableLogArchive: '耗材操作日志归档',
  InventoryPlan: '盘点计划',
  InventoryTask: '盘点任务',
  InventoryRecord: '盘点记录',
  SystemSetting: '系统设置',
};

const formatBytes = bytes => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDateTime = dateStr => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

// 现代化设计系统
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
    background: {
      primary: '#f8fafc',
      secondary: '#ffffff',
      accent: '#f1f5f9',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      muted: '#94a3b8',
    },
    border: {
      light: '#e2e8f0',
      medium: '#cbd5e1',
      dark: '#94a3b8',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    glow: '0 0 20px rgba(102, 126, 234, 0.3)',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },
  spacing: {
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '40px',
  },
};

const BackupManagement = () => {
  const navigate = useNavigate();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [restoreVisible, setRestoreVisible] = useState(false);
  const [backupInfo, setBackupInfo] = useState(null);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStatus, setRestoreStatus] = useState('');
  const [skipUserData, setSkipUserData] = useState(false);
  const [eventSourceRef, setEventSourceRef] = useState(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/backup/list');
      if (response?.success) {
        setBackups(response.data?.backups || []);
      }
    } catch (error) {
      message.error('获取备份列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBackupInfo = useCallback(async () => {
    try {
      const response = await api.get('/backup/info');
      if (response?.success) {
        setBackupInfo(response.data);
      }
    } catch (error) {
      console.error('获取备份信息失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
    fetchBackupInfo();
  }, [fetchBackups, fetchBackupInfo]);

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await api.post('/backup', {
        description: '手动备份',
        includeFiles: true,
      });
      if (response?.success) {
        message.success('备份创建成功');
        fetchBackups();
        fetchBackupInfo();
      } else {
        message.error(response.data?.message || '备份创建失败');
      }
    } catch (error) {
      message.error(
        '备份创建失败: ' + (error.response?.data?.message || error.message || '未知错误')
      );
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownload = async filename => {
    try {
      const response = await backupAPI.download(filename);
      // 创建临时链接并触发下载
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('备份文件下载已开始');
    } catch (error) {
      message.error('下载失败: ' + (error.message || '未知错误'));
    }
  };

  const handleValidate = async filename => {
    try {
      const response = await api.get(`/backup/validate/${filename}`);
      if (response?.success && response.data?.valid) {
        const data = response.data;
        Modal.info({
          title: (
            <Space>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircleOutlined style={{ color: '#fff', fontSize: 24 }} />
              </div>
              <span style={{ fontSize: '20px', fontWeight: 700 }}>备份文件验证通过</span>
            </Space>
          ),
          width: 700,
          content: (
            <div style={{ marginTop: 16 }}>
              {/* 基本信息 */}
              <div
                style={{
                  padding: '16px',
                  background: designTokens.colors.background.accent,
                  borderRadius: designTokens.borderRadius.md,
                  marginBottom: 16,
                }}
              >
                <Descriptions
                  column={2}
                  size="small"
                  colon={false}
                  labelStyle={{ fontWeight: 600, color: designTokens.colors.text.muted }}
                  contentStyle={{ fontWeight: 500, color: designTokens.colors.text.primary }}
                >
                  <Descriptions.Item label="版本">{data.version}</Descriptions.Item>
                  <Descriptions.Item label="类型">
                    <Tag color="blue">{data.backupType === 'full' ? '完整备份' : '部分备份'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {formatDateTime(data.timestamp)}
                  </Descriptions.Item>
                  <Descriptions.Item label="压缩">
                    {data.compressed ? <Tag color="green">是</Tag> : <Tag>否</Tag>}
                  </Descriptions.Item>
                  {data.description && (
                    <Descriptions.Item label="描述" span={2}>
                      {data.description}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </div>

              {/* 系统信息 */}
              {data.systemInfo && (
                <div
                  style={{
                    padding: '16px',
                    background: designTokens.colors.background.accent,
                    borderRadius: designTokens.borderRadius.md,
                    marginBottom: 16,
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 12px 0',
                      fontWeight: 600,
                      color: designTokens.colors.text.primary,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <DatabaseOutlined style={{ marginRight: 8 }} />
                    系统环境信息
                  </p>
                  <Descriptions
                    column={2}
                    size="small"
                    colon={false}
                    labelStyle={{
                      fontWeight: 500,
                      color: designTokens.colors.text.muted,
                      fontSize: 12,
                    }}
                    contentStyle={{
                      fontWeight: 500,
                      color: designTokens.colors.text.secondary,
                      fontSize: 13,
                    }}
                  >
                    <Descriptions.Item label="Node.js 版本">
                      {data.systemInfo.nodeVersion}
                    </Descriptions.Item>
                    <Descriptions.Item label="操作系统">
                      {data.systemInfo.platform}
                    </Descriptions.Item>
                    <Descriptions.Item label="系统架构">{data.systemInfo.arch}</Descriptions.Item>
                    <Descriptions.Item label="数据库类型">
                      {data.systemInfo.dbType}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              )}

              {/* 数据表统计 */}
              <div
                style={{
                  padding: '16px',
                  background: designTokens.colors.background.accent,
                  borderRadius: designTokens.borderRadius.md,
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    margin: '0 0 12px 0',
                    fontWeight: 600,
                    color: designTokens.colors.text.primary,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <DatabaseOutlined style={{ marginRight: 8 }} />
                  数据表详情（共 {data.metadata?.tableCount} 个表，{data.metadata?.totalRecords}{' '}
                  条记录）
                </p>
                {data.details?.tables && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      padding: '8px',
                      background: designTokens.colors.background.secondary,
                      borderRadius: designTokens.borderRadius.sm,
                    }}
                  >
                    {Object.entries(data.details.tables).map(([tableName, tableInfo]) => (
                      <div
                        key={tableName}
                        style={{
                          padding: '10px 12px',
                          background: designTokens.colors.background.secondary,
                          borderRadius: designTokens.borderRadius.sm,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: `1px solid ${designTokens.colors.text.muted}10`,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: designTokens.colors.text.primary,
                              fontSize: 14,
                            }}
                          >
                            {tableInfo.displayName || tableName}
                          </span>
                          {tableInfo.displayName !== tableName && (
                            <span
                              style={{
                                fontSize: 11,
                                color: designTokens.colors.text.muted,
                              }}
                            >
                              {tableName}
                            </span>
                          )}
                        </div>
                        <Tag
                          color={tableInfo.hasData ? 'green' : 'default'}
                          style={{ borderRadius: '4px' }}
                        >
                          {tableInfo.recordCount} 条
                        </Tag>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 文件备份详情 */}
              {data.details?.files && data.details.files.total > 0 && (
                <div
                  style={{
                    padding: '16px',
                    background: designTokens.colors.background.accent,
                    borderRadius: designTokens.borderRadius.md,
                    marginBottom: 16,
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 12px 0',
                      fontWeight: 600,
                      color: designTokens.colors.text.primary,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <FileTextOutlined style={{ marginRight: 8 }} />
                    备份文件详情（共 {data.details.files.total} 个文件）
                  </p>

                  {data.details.files.avatars > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: 13,
                          fontWeight: 500,
                          color: designTokens.colors.text.secondary,
                        }}
                      >
                        头像文件 ({data.details.files.avatars} 个):
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          padding: '8px',
                          background: designTokens.colors.background.secondary,
                          borderRadius: designTokens.borderRadius.sm,
                        }}
                      >
                        {data.details.files.avatarList.map((file, index) => (
                          <Tag key={index} color="blue" style={{ borderRadius: '4px', margin: 0 }}>
                            <FileTextOutlined style={{ marginRight: 4 }} />
                            {file.filename} ({formatBytes(file.size)})
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.details.files.others > 0 && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: 13,
                          fontWeight: 500,
                          color: designTokens.colors.text.secondary,
                        }}
                      >
                        其他文件 ({data.details.files.others} 个):
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          padding: '8px',
                          background: designTokens.colors.background.secondary,
                          borderRadius: designTokens.borderRadius.sm,
                        }}
                      >
                        {data.details.files.otherList.map((file, index) => (
                          <Tag
                            key={index}
                            color="purple"
                            style={{ borderRadius: '4px', margin: 0 }}
                          >
                            <FileTextOutlined style={{ marginRight: 4 }} />
                            {file.filename} ({formatBytes(file.size)})
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 汇总信息 */}
              <div
                style={{
                  padding: '16px',
                  background: designTokens.colors.primary.main + '08',
                  borderRadius: designTokens.borderRadius.md,
                  border: `1px solid ${designTokens.colors.primary.main}20`,
                }}
              >
                <p
                  style={{
                    margin: '0 0 12px 0',
                    fontWeight: 600,
                    color: designTokens.colors.text.primary,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <InfoCircleOutlined style={{ marginRight: 8 }} />
                  备份汇总
                </p>
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '24px',
                          fontWeight: 700,
                          background: designTokens.colors.primary.gradient,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {data.metadata?.tableCount}
                      </p>
                      <p
                        style={{
                          margin: '4px 0 0 0',
                          fontSize: 12,
                          color: designTokens.colors.text.muted,
                        }}
                      >
                        数据表
                      </p>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '24px',
                          fontWeight: 700,
                          background: designTokens.colors.success.gradient,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {data.metadata?.totalRecords}
                      </p>
                      <p
                        style={{
                          margin: '4px 0 0 0',
                          fontSize: 12,
                          color: designTokens.colors.text.muted,
                        }}
                      >
                        记录数
                      </p>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '24px',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {data.metadata?.fileCount}
                      </p>
                      <p
                        style={{
                          margin: '4px 0 0 0',
                          fontSize: 12,
                          color: designTokens.colors.text.muted,
                        }}
                      >
                        文件数
                      </p>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          ),
          maskClosable: false,
          okText: '关闭',
          okButtonProps: {
            style: primaryButtonStyle,
          },
        });
      } else {
        Modal.error({
          title: '备份文件验证失败',
          content: response.data?.data?.error || '文件可能已损坏',
        });
      }
    } catch (error) {
      message.error('验证失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    }
  };

  const handleRestore = async filename => {
    setRestoreLoading(true);
    setRestoreProgress(0);
    setRestoreStatus('正在初始化...');

    const token = secureStorage.get(TOKEN_KEY);
    const options = {
      overwriteExisting: true,
      skipFiles: false,
      skipUserData: skipUserData,
    };

    const eventSource = new EventSource(
      `/api/backup/restore-progress/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}&options=${encodeURIComponent(JSON.stringify(options))}`
    );

    setEventSourceRef(eventSource);
    let resultData = null;

    eventSource.onmessage = event => {
      try {
        const data = JSON.parse(event.data);

        setRestoreProgress(data.progress);
        setRestoreStatus(data.message);

        if (data.stage === 'complete') {
          resultData = data.result;
          eventSource.close();
          setEventSourceRef(null);

          setTimeout(() => {
            setRestoreVisible(false);
            setRestoreLoading(false);

            const successIconStyle = {
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
              animation: 'successPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            };

            const statCardStyle = (gradient, shadowColor) => ({
              background: gradient,
              borderRadius: '16px',
              padding: '20px 16px',
              textAlign: 'center',
              boxShadow: `0 4px 16px ${shadowColor}`,
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              cursor: 'default',
              position: 'relative',
              overflow: 'hidden',
            });

            const statValueStyle = {
              margin: 0,
              fontSize: '32px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.2,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            };

            const statLabelStyle = {
              margin: '8px 0 0 0',
              fontSize: '13px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.5px',
            };

            const tableCardStyle = {
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid #e2e8f0',
              transition: 'all 0.25s ease',
              cursor: 'default',
            };

            Modal.success({
              icon: null,
              title: null,
              width: 720,
              content: (
                <div style={{ marginTop: 8 }}>
                  <style>{`
                    @keyframes successPop {
                      0% { transform: scale(0); opacity: 0; }
                      50% { transform: scale(1.1); }
                      100% { transform: scale(1); opacity: 1; }
                    }
                    @keyframes slideUp {
                      from { transform: translateY(20px); opacity: 0; }
                      to { transform: translateY(0); opacity: 1; }
                    }
                    @keyframes shimmer {
                      0% { background-position: -200% 0; }
                      100% { background-position: 200% 0; }
                    }
                    .stat-card:hover {
                      transform: translateY(-4px) scale(1.02);
                    }
                    .table-card:hover {
                      border-color: #6366f1;
                      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
                      transform: translateX(4px);
                    }
                    .success-badge {
                      background: linear-gradient(90deg, #10b981, #059669, #10b981);
                      background-size: 200% 100%;
                      animation: shimmer 2s infinite linear;
                    }
                  `}</style>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      marginBottom: 24,
                      animation: 'slideUp 0.5s ease forwards',
                    }}
                  >
                    <div style={successIconStyle}>
                      <CheckCircleOutlined style={{ color: '#fff', fontSize: 28 }} />
                    </div>
                    <h2
                      style={{
                        margin: '16px 0 4px 0',
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#1e293b',
                      }}
                    >
                      数据恢复成功
                    </h2>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: '20px',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#10b981',
                        }}
                      />
                      <span style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>
                        所有数据已安全恢复
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 12,
                      marginBottom: 20,
                      animation: 'slideUp 0.5s ease 0.1s forwards',
                      opacity: 0,
                    }}
                  >
                    <div
                      className="stat-card"
                      style={statCardStyle(
                        'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        'rgba(99, 102, 241, 0.25)'
                      )}
                    >
                      <DatabaseOutlined
                        style={{ fontSize: 20, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}
                      />
                      <p style={statValueStyle}>{resultData?.tablesRestored || 0}</p>
                      <p style={statLabelStyle}>恢复表数</p>
                    </div>

                    <div
                      className="stat-card"
                      style={statCardStyle(
                        'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        'rgba(16, 185, 129, 0.25)'
                      )}
                    >
                      <TableOutlined
                        style={{ fontSize: 20, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}
                      />
                      <p style={statValueStyle}>{resultData?.recordsRestored || 0}</p>
                      <p style={statLabelStyle}>恢复记录</p>
                    </div>

                    <div
                      className="stat-card"
                      style={statCardStyle(
                        'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        'rgba(245, 158, 11, 0.25)'
                      )}
                    >
                      <FileTextOutlined
                        style={{ fontSize: 20, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}
                      />
                      <p style={statValueStyle}>{resultData?.filesRestored || 0}</p>
                      <p style={statLabelStyle}>恢复文件</p>
                    </div>

                    <div
                      className="stat-card"
                      style={statCardStyle(
                        'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        'rgba(139, 92, 246, 0.25)'
                      )}
                    >
                      <ClockCircleOutlined
                        style={{ fontSize: 20, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}
                      />
                      <p style={{ ...statValueStyle, fontSize: '18px' }}>
                        {formatDateTime(resultData?.restoredAt)}
                      </p>
                      <p style={statLabelStyle}>恢复时间</p>
                    </div>
                  </div>

                  {resultData?.skipped && resultData.skipped.length > 0 && (
                    <div
                      style={{
                        padding: '16px',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        borderRadius: '16px',
                        border: '1px solid #f59e0b30',
                        marginBottom: 16,
                        animation: 'slideUp 0.5s ease 0.15s forwards',
                        opacity: 0,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <SafetyOutlined style={{ color: '#fff', fontSize: 16 }} />
                          </div>
                          <span style={{ fontWeight: 600, color: '#92400e', fontSize: 15 }}>
                            已跳过的数据表
                          </span>
                        </div>
                        <Tag
                          style={{
                            background: '#fff7ed',
                            border: '1px solid #fed7aa',
                            color: '#c2410c',
                            borderRadius: '6px',
                            padding: '2px 8px',
                          }}
                        >
                          共 {resultData.skipped.length} 个表
                        </Tag>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: 8,
                          padding: '4px',
                        }}
                      >
                        {resultData.skipped.map((tableName, index) => (
                          <div
                            key={tableName}
                            className="table-card"
                            style={{
                              padding: '12px 16px',
                              background: '#ffffff',
                              borderRadius: '12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              border: '1px solid #fcd34d',
                              transition: 'all 0.25s ease',
                              cursor: 'default',
                              animationDelay: `${index * 0.03}s`,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: '#f59e0b',
                                  boxShadow: '0 0 8px rgba(245, 158, 11, 0.5)',
                                }}
                              />
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: '#78350f',
                                  fontSize: 13,
                                }}
                              >
                                {TABLE_NAME_MAPPING[tableName] || tableName}
                              </span>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: '#fef3c7',
                                border: '1px solid #fcd34d',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#b45309',
                                }}
                              >
                                已跳过
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {resultData?.tableDetails && Object.keys(resultData.tableDetails).length > 0 && (
                    <div
                      style={{
                        padding: '16px',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        marginBottom: 16,
                        animation: 'slideUp 0.5s ease 0.2s forwards',
                        opacity: 0,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <DatabaseOutlined style={{ color: '#fff', fontSize: 16 }} />
                          </div>
                          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 15 }}>
                            数据表恢复详情
                          </span>
                        </div>
                        <Tag
                          style={{
                            background: '#eef2ff',
                            border: '1px solid #c7d2fe',
                            color: '#4f46e5',
                            borderRadius: '6px',
                            padding: '2px 8px',
                          }}
                        >
                          共 {Object.keys(resultData.tableDetails).length} 个表
                        </Tag>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: 8,
                          maxHeight: '240px',
                          overflowY: 'auto',
                          padding: '4px',
                        }}
                      >
                        {Object.entries(resultData.tableDetails).map(
                          ([tableName, tableInfo], index) => (
                            <div
                              key={tableName}
                              className="table-card"
                              style={{
                                ...tableCardStyle,
                                animationDelay: `${index * 0.03}s`,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: tableInfo.success ? '#10b981' : '#94a3b8',
                                    boxShadow: tableInfo.success
                                      ? '0 0 8px rgba(16, 185, 129, 0.5)'
                                      : 'none',
                                  }}
                                />
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: '#334155',
                                    fontSize: 13,
                                  }}
                                >
                                  {tableInfo.displayName || tableName}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  background: tableInfo.success ? '#ecfdf5' : '#f1f5f9',
                                  border: `1px solid ${tableInfo.success ? '#a7f3d0' : '#e2e8f0'}`,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: tableInfo.success ? '#059669' : '#64748b',
                                  }}
                                >
                                  {tableInfo.recordCount}
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: tableInfo.success ? '#10b981' : '#94a3b8',
                                  }}
                                >
                                  条
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      borderRadius: '12px',
                      border: '1px solid #bfdbfe',
                      animation: 'slideUp 0.5s ease 0.3s forwards',
                      opacity: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <InfoCircleOutlined style={{ color: '#fff', fontSize: 18 }} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, color: '#1e40af', fontSize: 14 }}>
                        建议刷新页面以确保所有数据生效
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#3b82f6' }}>
                        刷新后可查看最新恢复的数据内容
                      </p>
                    </div>
                  </div>
                </div>
              ),
              centered: true,
              maskClosable: false,
              okText: '完成',
              cancelButtonProps: { style: { display: 'none' } },
              okButtonProps: {
                style: {
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  height: '44px',
                  padding: '0 32px',
                  fontSize: '15px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                },
              },
            });
          }, 500);
        }

        if (data.stage === 'stopped') {
          resultData = data.result;
          eventSource.close();
          setEventSourceRef(null);
          setRestoreLoading(false);
          setRestoreVisible(false);

          const isRolledBack = data.result?.rolledBack;
          Modal.info({
            title: isRolledBack ? '恢复已停止并回滚' : '恢复已停止',
            content: (
              <div style={{ marginTop: 16 }}>
                <p>数据恢复已被用户停止。</p>
                {isRolledBack ? (
                  <p style={{ color: '#52c41a', marginTop: 8 }}>
                    数据已成功回滚到恢复前的状态，无需担心数据完整性。
                  </p>
                ) : (
                  <>
                    <p style={{ marginTop: 8, color: '#666' }}>
                      已恢复 {data.result?.tablesRestored || 0} 个表，
                      {data.result?.recordsRestored || 0} 条记录。
                    </p>
                    <p style={{ color: '#f59e0b', marginTop: 8 }}>
                      警告：数据回滚失败，数据可能处于不一致状态，建议检查数据完整性。
                    </p>
                  </>
                )}
              </div>
            ),
            okText: '知道了',
          });
        }

        if (data.stage === 'error') {
          eventSource.close();
          setEventSourceRef(null);
          setRestoreLoading(false);
          Modal.error({
            title: '数据恢复失败',
            content: data.message,
          });
        }
      } catch (e) {
        console.error('解析 SSE 数据失败:', e);
      }
    };

    eventSource.onerror = error => {
      console.error('SSE 连接错误:', error);
      eventSource.close();
      setEventSourceRef(null);
      setRestoreLoading(false);
      Modal.error({
        title: '数据恢复失败',
        content: '连接中断，请重试',
      });
    };
  };

  const handleStopRestore = () => {
    if (eventSourceRef) {
      console.log('用户请求停止恢复');
      setRestoreStatus('正在停止恢复...');
      eventSourceRef.close();
      setEventSourceRef(null);

      // 设置超时：如果5秒内没有收到 stopped 事件，强制重置状态
      setTimeout(() => {
        setRestoreLoading(prev => {
          if (prev) {
            console.log('停止恢复超时，强制重置状态');
            setRestoreVisible(false);
            Modal.warning({
              title: '停止恢复',
              content: '恢复操作已停止，请刷新页面查看最新数据状态。',
              okText: '知道了',
            });
            return false;
          }
          return prev;
        });
      }, 5000);
    }
  };

  const handleDelete = async filename => {
    try {
      const response = await api.delete(`/backup/${filename}`);
      if (response?.success) {
        message.success('删除成功');
        fetchBackups();
        fetchBackupInfo();
      } else {
        message.error(response?.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    }
  };

  const handleUpload = async options => {
    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append('backup', file);

    try {
      const response = await api.post('/backup/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response?.success) {
        message.success('备份文件上传成功');
        fetchBackups();
        fetchBackupInfo();
        onSuccess(response.data);
      } else {
        message.error(response?.message || '上传失败');
        onError(new Error(response?.message));
      }
    } catch (error) {
      message.error('上传失败: ' + (error.response?.data?.message || error.message || '未知错误'));
      onError(error);
    }
  };

  const handleCleanBackups = async (maxCount = 30, maxAgeDays = 90, dryRun = false) => {
    try {
      const response = await api.post('/backup/clean', {
        maxCount,
        maxAgeDays,
        dryRun,
      });

      if (response?.success) {
        const data = response.data;
        if (dryRun) {
          Modal.info({
            title: '清理预览',
            width: 500,
            content: (
              <div style={{ marginTop: 16 }}>
                <p>
                  将删除 <strong>{data.deletedCount}</strong> 个旧备份文件
                </p>
                <p>
                  将保留 <strong>{data.keptCount}</strong> 个备份文件
                </p>
                <p>
                  预计释放空间: <strong>{data.freedSizeFormatted}</strong>
                </p>
                {data.deleted.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">待删除文件:</Text>
                    <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                      {data.deleted.slice(0, 5).map(f => (
                        <li key={f}>{f}</li>
                      ))}
                      {data.deleted.length > 5 && <li>... 还有 {data.deleted.length - 5} 个</li>}
                    </ul>
                  </div>
                )}
              </div>
            ),
          });
        } else {
          message.success(`已清理 ${data.deletedCount} 个旧备份，释放 ${data.freedSizeFormatted}`);
          fetchBackups();
          fetchBackupInfo();
        }
        return data;
      }
    } catch (error) {
      message.error('清理失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    }
  };

  const showRestoreConfirm = record => {
    setSelectedBackup(record);
    setSkipUserData(false);
    setRestoreVisible(true);
  };

  const columns = [
    {
      title: (
        <span style={{ fontWeight: 600, color: designTokens.colors.text.primary }}>
          <FileTextOutlined style={{ marginRight: 4 }} />
          文件名
        </span>
      ),
      dataIndex: 'filename',
      key: 'filename',
      width: 280,
      render: (text, record) => (
        <Space>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: record.compressed
                ? designTokens.colors.success.gradient
                : designTokens.colors.primary.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileTextOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text copyable={{ text }} style={{ fontWeight: 500, display: 'block' }}>
              {text}
            </Text>
            {record.description && (
              <div
                style={{
                  fontSize: 12,
                  color: designTokens.colors.text.muted,
                  marginTop: 4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {record.description}
              </div>
            )}
            {record.isUploaded && (
              <Tag color="blue" style={{ marginTop: 4, borderRadius: '4px' }}>
                上传文件
              </Tag>
            )}
            {record.invalid && (
              <Tag color="red" style={{ marginTop: 4, borderRadius: '4px' }}>
                无法识别
              </Tag>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: (
        <span style={{ fontWeight: 600, color: designTokens.colors.text.primary }}>文件大小</span>
      ),
      dataIndex: 'size',
      key: 'size',
      width: 140,
      render: size => (
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: 500,
            color: designTokens.colors.text.secondary,
          }}
        >
          {formatBytes(size)}
        </span>
      ),
    },
    {
      title: (
        <span style={{ fontWeight: 600, color: designTokens.colors.text.primary }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          创建时间
        </span>
      ),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 200,
      render: (time, record) => {
        // 优先使用备份文件中的 timestamp，如果没有则使用文件创建时间
        const displayTime = record.timestamp ? new Date(record.timestamp) : new Date(time);
        return (
          <span style={{ color: designTokens.colors.text.secondary }}>
            {formatDateTime(displayTime.toISOString())}
          </span>
        );
      },
      sorter: (a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp) : new Date(a.createdAt);
        const timeB = b.timestamp ? new Date(b.timestamp) : new Date(b.createdAt);
        return timeA - timeB;
      },
    },
    {
      title: <span style={{ fontWeight: 600, color: designTokens.colors.text.primary }}>操作</span>,
      key: 'action',
      width: 280,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="验证备份完整性">
            <Button
              size="small"
              icon={<SafetyOutlined />}
              onClick={() => handleValidate(record.filename)}
              style={{
                ...buttonStyles.success.base,
                padding: '4px 12px',
                height: '32px',
                fontSize: '13px',
                background: record.invalid
                  ? designTokens.colors.text.muted
                  : designTokens.colors.success.gradient,
              }}
              disabled={record.invalid}
            >
              验证
            </Button>
          </Tooltip>
          <Tooltip title="下载备份文件">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record.filename)}
              style={{
                ...buttonStyles.secondary.base,
                padding: '4px 12px',
                height: '32px',
                fontSize: '13px',
              }}
              disabled={record.invalid}
            >
              下载
            </Button>
          </Tooltip>
          <Tooltip title="恢复备份数据">
            <Button
              size="small"
              icon={<CloudUploadOutlined />}
              onClick={() => showRestoreConfirm(record)}
              style={{
                ...buttonStyles.warning.base,
                padding: '4px 12px',
                height: '32px',
                fontSize: '13px',
                background: record.invalid
                  ? designTokens.colors.text.muted
                  : designTokens.colors.warning.gradient,
              }}
              disabled={record.invalid}
            >
              恢复
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定要删除此备份文件吗？"
            description="此操作不可撤销"
            onConfirm={() => handleDelete(record.filename)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除备份文件">
              <Button
                size="small"
                icon={<DeleteOutlined />}
                style={{
                  ...buttonStyles.icon.base,
                  background: designTokens.colors.background.accent,
                  color: designTokens.colors.danger.main,
                }}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 页面容器样式
  const containerStyle = {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${designTokens.colors.background.primary} 0%, ${designTokens.colors.background.accent} 100%)`,
    padding: `${designTokens.spacing.lg} ${designTokens.spacing.lg}`,
  };

  // 页面标题样式 - 响应式适配
  const pageHeaderStyle = {
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '20px',
    padding: `${designTokens.spacing.md} ${designTokens.spacing.lg}`,
    background: designTokens.colors.background.secondary,
    borderRadius: designTokens.borderRadius.xl,
    boxShadow: designTokens.shadows.lg,
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  };

  const titleStyle = {
    fontSize: 'clamp(20px, 4vw, 28px)',
    fontWeight: '800',
    margin: 0,
    background: designTokens.colors.primary.gradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '0.5px',
  };

  // 卡片通用样式
  const cardStyle = {
    borderRadius: designTokens.borderRadius.lg,
    border: 'none',
    boxShadow: designTokens.shadows.lg,
    overflow: 'hidden',
    background: designTokens.colors.background.secondary,
    transition: 'all 0.3s ease',
  };

  // 统计卡片样式
  const statCardStyle = {
    ...cardStyle,
    background: designTokens.colors.background.secondary,
    position: 'relative',
    overflow: 'hidden',
  };

  // 按钮组样式
  const buttonGroupStyle = {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
  };

  // 按钮设计系统 - 统一风格
  const buttonStyles = {
    primary: {
      base: {
        background: designTokens.colors.primary.gradient,
        border: 'none',
        borderRadius: designTokens.borderRadius.md,
        padding: '8px 20px',
        fontWeight: 600,
        boxShadow: designTokens.shadows.md,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        color: '#fff',
        height: '40px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
      },
      hover: {
        transform: 'translateY(-1px)',
        boxShadow: designTokens.shadows.lg,
      },
    },
    secondary: {
      base: {
        background: designTokens.colors.background.secondary,
        border: `1px solid ${designTokens.colors.border.light}`,
        borderRadius: designTokens.borderRadius.md,
        padding: '8px 16px',
        fontWeight: 500,
        color: designTokens.colors.text.primary,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '40px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
      },
      hover: {
        borderColor: designTokens.colors.primary.main,
        color: designTokens.colors.primary.main,
        background: `${designTokens.colors.primary.main}08`,
      },
    },
    danger: {
      base: {
        background: designTokens.colors.danger.gradient,
        border: 'none',
        borderRadius: designTokens.borderRadius.md,
        padding: '8px 20px',
        fontWeight: 600,
        boxShadow: designTokens.shadows.md,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        color: '#fff',
        height: '40px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
      },
      hover: {
        transform: 'translateY(-1px)',
        boxShadow: '0 8px 16px rgba(239, 68, 68, 0.3)',
      },
    },
    success: {
      base: {
        background: designTokens.colors.success.gradient,
        border: 'none',
        borderRadius: designTokens.borderRadius.md,
        padding: '8px 20px',
        fontWeight: 600,
        boxShadow: designTokens.shadows.md,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        color: '#fff',
        height: '40px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
      },
      hover: {
        transform: 'translateY(-1px)',
        boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
      },
    },
    warning: {
      base: {
        background: designTokens.colors.warning.gradient,
        border: 'none',
        borderRadius: designTokens.borderRadius.md,
        padding: '8px 20px',
        fontWeight: 600,
        boxShadow: designTokens.shadows.md,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        color: '#fff',
        height: '40px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
      },
      hover: {
        transform: 'translateY(-1px)',
        boxShadow: '0 8px 16px rgba(245, 158, 11, 0.3)',
      },
    },
    icon: {
      base: {
        border: 'none',
        borderRadius: designTokens.borderRadius.md,
        width: '36px',
        height: '36px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
      },
    },
  };

  const primaryButtonStyle = buttonStyles.primary.base;
  const secondaryButtonStyle = buttonStyles.secondary.base;
  const dangerButtonStyle = buttonStyles.danger.base;

  return (
    <div style={containerStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>
            <DatabaseOutlined style={{ marginRight: 12, verticalAlign: 'middle' }} />
            数据备份管理
          </h1>
          <p
            style={{
              margin: '8px 0 0 0',
              color: designTokens.colors.text.secondary,
              fontSize: '14px',
            }}
          >
            管理系统备份，确保数据安全与可恢复性
          </p>
        </div>

        <div style={buttonGroupStyle}>
          <Space size="middle" wrap>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'auto',
                    icon: <SettingOutlined />,
                    label: '自动备份设置',
                    onClick: () => navigate('/auto-backup-settings'),
                  },
                  {
                    key: 'remote',
                    icon: <CloudOutlined />,
                    label: '远端备份配置',
                    onClick: () => navigate('/remote-backup-settings'),
                  },
                ],
              }}
              placement="bottomRight"
            >
              <Button icon={<SettingOutlined />} style={secondaryButtonStyle}>
                设置
              </Button>
            </Dropdown>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchBackups();
                fetchBackupInfo();
              }}
              style={secondaryButtonStyle}
            >
              刷新
            </Button>

            <Dropdown
              menu={{
                items: [
                  {
                    key: 'preview',
                    icon: <EyeOutlined />,
                    label: '预览清理',
                    onClick: () => handleCleanBackups(30, 90, true),
                  },
                  {
                    key: 'clean',
                    icon: <ClearOutlined />,
                    label: '清理旧备份',
                    danger: true,
                    onClick: () => {
                      Modal.confirm({
                        title: '确认清理旧备份',
                        content: '将删除超过 30 个或超过 90 天的旧备份文件，此操作不可撤销',
                        okText: '确认清理',
                        cancelText: '取消',
                        okButtonProps: { style: dangerButtonStyle },
                        onOk: () => handleCleanBackups(30, 90, false),
                      });
                    },
                  },
                ],
              }}
              placement="bottomRight"
            >
              <Button icon={<ClearOutlined />} style={secondaryButtonStyle}>
                清理
              </Button>
            </Dropdown>

            <Upload customRequest={handleUpload} showUploadList={false} accept=".json,.gz,.json.gz">
              <Button icon={<UploadOutlined />} style={secondaryButtonStyle}>
                上传备份
              </Button>
            </Upload>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={backupLoading}
              onClick={handleCreateBackup}
              style={primaryButtonStyle}
            >
              创建备份
            </Button>
          </Space>
        </div>
      </div>

      {backupInfo && (
        <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
          <Col xs={24} sm={8}>
            <Card style={statCardStyle}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '120px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      color: designTokens.colors.text.muted,
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    备份文件数量
                  </p>
                  <p
                    style={{
                      margin: '8px 0 0 0',
                      fontSize: '32px',
                      fontWeight: '700',
                      background: designTokens.colors.primary.gradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      lineHeight: 1.2,
                    }}
                  >
                    {backupInfo.backupCount}
                    <span style={{ fontSize: '16px', marginLeft: 4 }}>个</span>
                  </p>
                </div>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '16px',
                    background: designTokens.colors.primary.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: designTokens.shadows.lg,
                    flexShrink: 0,
                  }}
                >
                  <DatabaseOutlined style={{ color: '#fff', fontSize: 32 }} />
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={statCardStyle}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '120px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      color: designTokens.colors.text.muted,
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    备份总大小
                  </p>
                  <p
                    style={{
                      margin: '8px 0 0 0',
                      fontSize: '32px',
                      fontWeight: '700',
                      background: designTokens.colors.success.gradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      lineHeight: 1.2,
                    }}
                  >
                    {backupInfo.totalSizeFormatted}
                  </p>
                </div>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '16px',
                    background: designTokens.colors.success.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: designTokens.shadows.lg,
                    flexShrink: 0,
                  }}
                >
                  <FileTextOutlined style={{ color: '#fff', fontSize: 32 }} />
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={statCardStyle}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '120px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      color: designTokens.colors.text.muted,
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    备份存储路径
                  </p>
                  <p
                    style={{
                      margin: '8px 0 0 0',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: designTokens.colors.text.secondary,
                      wordBreak: 'break-all',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.4,
                    }}
                  >
                    {backupInfo.backupPath}
                  </p>
                </div>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: designTokens.shadows.lg,
                    flexShrink: 0,
                  }}
                >
                  <InfoCircleOutlined style={{ color: '#fff', fontSize: 32 }} />
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      <Card style={cardStyle} styles={{ body: { padding: '24px' } }}>
        <Alert
          message={
            <span style={{ fontWeight: 600 }}>
              <InfoCircleOutlined style={{ marginRight: 8 }} />
              备份说明
            </span>
          }
          description={
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: '8px 0', color: designTokens.colors.text.secondary }}>
                ✓ 备份包含所有数据库表数据（设备、机柜、用户、工单、耗材等）
              </p>
              <p style={{ margin: '8px 0', color: designTokens.colors.text.secondary }}>
                ✓ 备份包含上传的文件（用户头像等）
              </p>
              <p style={{ margin: '8px 0', color: designTokens.colors.text.secondary }}>
                ✓ 可通过下载备份文件在新环境中恢复所有数据
              </p>
              <p style={{ margin: '8px 0', color: designTokens.colors.text.secondary }}>
                ✓ 建议定期备份以确保数据安全
              </p>
            </div>
          }
          type="info"
          showIcon
          style={{
            marginBottom: 24,
            borderRadius: designTokens.borderRadius.md,
            border: `1px solid ${designTokens.colors.text.muted}20`,
            background: `${designTokens.colors.primary.main}08`,
          }}
        />

        <Table
          columns={columns}
          dataSource={backups}
          rowKey="filename"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: total => `共 ${total} 个备份文件`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          locale={{
            emptyText: (
              <div
                style={{
                  padding: '60px 0',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    margin: '0 auto 16px',
                    borderRadius: '50%',
                    background: designTokens.colors.background.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DatabaseOutlined
                    style={{ fontSize: 40, color: designTokens.colors.text.muted }}
                  />
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 500,
                    color: designTokens.colors.text.primary,
                  }}
                >
                  暂无备份文件
                </p>
                <p
                  style={{
                    margin: '8px 0 0 0',
                    fontSize: 14,
                    color: designTokens.colors.text.muted,
                  }}
                >
                  点击"创建备份"按钮开始备份
                </p>
              </div>
            ),
          }}
          rowClassName={(record, index) => (index % 2 === 0 ? 'table-row-light' : 'table-row-dark')}
          style={{
            borderRadius: designTokens.borderRadius.md,
            overflow: 'hidden',
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ExclamationCircleOutlined style={{ color: '#fff', fontSize: 24 }} />
            </div>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: designTokens.colors.text.primary,
              }}
            >
              确认恢复数据
            </span>
          </Space>
        }
        open={restoreVisible}
        closeIcon={<CloseButton />}
        onCancel={() => {
          if (!restoreLoading) {
            setRestoreVisible(false);
          }
        }}
        footer={null}
        width={560}
        maskClosable={false}
        styles={{
          body: { padding: '24px' },
          header: {
            padding: '20px 24px',
            borderBottom: `1px solid ${designTokens.colors.text.muted}20`,
          },
        }}
      >
        <div style={{ marginTop: 8 }}>
          {restoreLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  margin: '0 auto 24px',
                  borderRadius: '50%',
                  background: designTokens.colors.background.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CloudUploadOutlined
                  style={{ fontSize: 40, color: designTokens.colors.primary.main }}
                />
              </div>
              <Progress
                percent={restoreProgress}
                status="active"
                strokeColor={{
                  '0%': '#667eea',
                  '100%': '#764ba2',
                }}
                trailColor={designTokens.colors.background.accent}
              />
              <Text
                style={{
                  marginTop: 16,
                  display: 'block',
                  fontSize: 14,
                  color: designTokens.colors.text.secondary,
                }}
              >
                {restoreStatus}
              </Text>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={handleStopRestore}
                style={{
                  marginTop: 24,
                  ...buttonStyles.danger.base,
                  padding: '8px 24px',
                }}
              >
                停止恢复
              </Button>
            </div>
          ) : (
            <>
              <Alert
                message={
                  <span style={{ fontWeight: 600 }}>
                    <ExclamationCircleOutlined style={{ marginRight: 8 }} />
                    警告：恢复操作将覆盖当前所有数据
                  </span>
                }
                description="此操作不可撤销，建议先创建当前数据的备份"
                type="warning"
                showIcon
                style={{
                  marginBottom: 20,
                  borderRadius: designTokens.borderRadius.md,
                  border: `1px solid ${designTokens.colors.warning.main}30`,
                  background: `${designTokens.colors.warning.main}08`,
                }}
              />

              {selectedBackup && (
                <div
                  style={{
                    background: designTokens.colors.background.accent,
                    borderRadius: designTokens.borderRadius.md,
                    padding: '16px',
                    marginBottom: 20,
                  }}
                >
                  <Descriptions
                    column={1}
                    size="small"
                    colon={false}
                    labelStyle={{
                      fontWeight: 600,
                      color: designTokens.colors.text.muted,
                      marginBottom: 8,
                    }}
                    contentStyle={{
                      fontWeight: 500,
                      color: designTokens.colors.text.primary,
                    }}
                  >
                    <Descriptions.Item label="备份文件">
                      <Space>
                        <FileTextOutlined style={{ color: designTokens.colors.primary.main }} />
                        {selectedBackup.filename}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="文件大小">
                      <span
                        style={{ fontFamily: 'monospace', color: designTokens.colors.success.main }}
                      >
                        {formatBytes(selectedBackup.size)}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      <Space>
                        <ClockCircleOutlined style={{ color: designTokens.colors.text.muted }} />
                        {formatDateTime(selectedBackup.createdAt)}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              )}

              <div
                style={{
                  background: `${designTokens.colors.primary.main}05`,
                  border: `1px solid ${designTokens.colors.primary.main}20`,
                  borderRadius: designTokens.borderRadius.md,
                  padding: '16px',
                  marginBottom: 20,
                }}
              >
                <Checkbox
                  checked={skipUserData}
                  onChange={e => setSkipUserData(e.target.checked)}
                  style={{ fontWeight: 600, color: designTokens.colors.text.primary }}
                >
                  跳过用户数据（保留当前系统用户账户）
                </Checkbox>
                <div
                  style={{
                    fontSize: '13px',
                    color: designTokens.colors.text.secondary,
                    marginTop: 8,
                    paddingLeft: 24,
                  }}
                >
                  选择此项后，将不会恢复备份中的用户和用户角色数据，保留当前系统已有的用户账户
                </div>
              </div>

              <Divider style={{ margin: '20px 0' }} />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '8px',
                }}
              >
                <Button
                  onClick={() => setRestoreVisible(false)}
                  style={secondaryButtonStyle}
                  disabled={restoreLoading}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  danger
                  icon={<CloudUploadOutlined />}
                  onClick={() => handleRestore(selectedBackup?.filename)}
                  style={{
                    ...buttonStyles.danger.base,
                    padding: '8px 24px',
                  }}
                >
                  确认恢复
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default BackupManagement;
