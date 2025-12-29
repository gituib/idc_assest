import React, { useState, useEffect } from 'react';
import { Tabs, Form, Input, Switch, Select, Button, Card, Space, message, Modal, Table, Tag, Progress, Divider, Descriptions, Alert } from 'antd';
import { SettingOutlined, GlobalOutlined, BgColorsOutlined, DatabaseOutlined, InfoCircleOutlined, CloudUploadOutlined, DeleteOutlined, ReloadOutlined, DownloadOutlined, SyncOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TabPane } = Tabs;

const SystemSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [activeTab, setActiveTab] = useState('general');
  const [backupList, setBackupList] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSettings();
    fetchBackupList();
    fetchSystemInfo();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/system-settings');
      setSettings(response.data);
      
      const formValues = {};
      Object.entries(response.data).forEach(([key, data]) => {
        formValues[key] = data.value;
      });
      form.setFieldsValue(formValues);
    } catch (error) {
      message.error('获取设置失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupList = async () => {
    setBackupLoading(true);
    try {
      const response = await axios.get('/api/system-settings/backup/list');
      setBackupList(response.data.backups || []);
    } catch (error) {
      console.error('获取备份列表失败');
    } finally {
      setBackupLoading(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const response = await axios.get('/api/system-settings/system/info');
      setSystemInfo(response.data);
    } catch (error) {
      console.error('获取系统信息失败');
    }
  };

  const handleSaveSettings = async (values) => {
    setSaving(true);
    try {
      const updates = {};
      Object.entries(values).forEach(([key, value]) => {
        if (settings[key] && settings[key].isEditable) {
          updates[key] = value;
        }
      });

      await axios.put('/api/system-settings', { settings: updates });
      message.success('设置保存成功');
      fetchSettings();
    } catch (error) {
      message.error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    Modal.confirm({
      title: '确认创建备份',
      icon: <ExclamationCircleOutlined />,
      content: '确定要创建系统备份吗？这将导出所有设备、机柜、机房和耗材数据。',
      onOk: async () => {
        try {
          message.loading('正在创建备份...', 0);
          const response = await axios.post('/api/system-settings/backup');
          message.destroy();
          message.success('备份创建成功');
          fetchBackupList();
        } catch (error) {
          message.destroy();
          message.error('备份创建失败');
        }
      }
    });
  };

  const handleRestoreBackup = (filename) => {
    Modal.confirm({
      title: '确认恢复备份',
      icon: <ExclamationCircleOutlined />,
      content: `确定要恢复备份 "${filename}" 吗？当前数据将被覆盖，且此操作不可撤销。`,
      onOk: async () => {
        try {
          message.loading('正在恢复备份...', 0);
          await axios.post('/api/system-settings/backup/restore', { filename });
          message.destroy();
          message.success('恢复成功，请刷新页面查看最新数据');
        } catch (error) {
          message.destroy();
          message.error('恢复备份失败');
        }
      }
    });
  };

  const handleDeleteBackup = (filename) => {
    Modal.confirm({
      title: '确认删除备份',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除备份 "${filename}" 吗？`,
      onOk: async () => {
        try {
          await axios.delete(`/api/system-settings/backup/${filename}`);
          message.success('删除成功');
          fetchBackupList();
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleDownloadBackup = (filename) => {
    window.open(`/api/system-settings/backup/download/${filename}`, '_blank');
  };

  const handleResetSetting = (key) => {
    Modal.confirm({
      title: '确认重置',
      icon: <ExclamationCircleOutlined />,
      content: `确定要将 "${settings[key]?.description || key}" 重置为默认值吗？`,
      onOk: async () => {
        try {
          await axios.post(`/api/system-settings/reset/${key}`);
          message.success('重置成功');
          fetchSettings();
        } catch (error) {
          message.error('重置失败');
        }
      }
    });
  };

  const renderFormItem = (key, data) => {
    if (!data.isEditable) {
      return (
        <Form.Item
          key={key}
          label={data.description || key}
          name={key}
        >
          <Input disabled suffix={<LockOutlined />} />
        </Form.Item>
      );
    }

    switch (data.type) {
      case 'boolean':
        return (
          <Form.Item
            key={key}
            label={data.description || key}
            name={key}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        );
      case 'number':
        return (
          <Form.Item
            key={key}
            label={data.description || key}
            name={key}
            rules={[{ required: false, message: `请输入${data.description || key}` }]}
          >
            <Input type="number" style={{ width: '100%' }} />
          </Form.Item>
        );
      case 'select':
        const options = getSelectOptions(key);
        return (
          <Form.Item
            key={key}
            label={data.description || key}
            name={key}
          >
            <Select>
              {options.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
        );
      default:
        return (
          <Form.Item
            key={key}
            label={data.description || key}
            name={key}
          >
            <Input />
          </Form.Item>
        );
    }
  };

  const getSelectOptions = (key) => {
    const optionsMap = {
      timezone: [
        { value: 'Asia/Shanghai', label: '亚洲/上海 (UTC+8)' },
        { value: 'Asia/Beijing', label: '亚洲/北京 (UTC+8)' },
        { value: 'America/New_York', label: '美洲/纽约 (UTC-5)' },
        { value: 'Europe/London', label: '欧洲/伦敦 (UTC+0)' },
        { value: 'UTC', label: 'UTC (UTC+0)' }
      ],
      date_format: [
        { value: 'YYYY-MM-DD', label: '2024-01-01' },
        { value: 'YYYY/MM/DD', label: '2024/01/01' },
        { value: 'DD/MM/YYYY', label: '01/01/2024' },
        { value: 'MM/DD/YYYY', label: '01/01/2024' }
      ],
      language: [
        { value: 'zh-CN', label: '简体中文' },
        { value: 'zh-TW', label: '繁體中文' },
        { value: 'en-US', label: 'English' }
      ],
      table_row_height: [
        { value: 'small', label: '紧凑 (Small)' },
        { value: 'default', label: '默认 (Default)' },
        { value: 'middle', label: '中等 (Middle)' },
        { value: 'large', label: '宽松 (Large)' }
      ],
      dark_mode: [
        { value: 'false', label: '关闭' },
        { value: 'true', label: '开启' }
      ],
      compact_mode: [
        { value: 'false', label: '关闭' },
        { value: 'true', label: '开启' }
      ],
      animation_enabled: [
        { value: 'false', label: '关闭' },
        { value: 'true', label: '开启' }
      ],
      sidebar_collapsed: [
        { value: 'false', label: '展开' },
        { value: 'true', label: '折叠' }
      ],
      auto_backup_enabled: [
        { value: 'false', label: '关闭' },
        { value: 'true', label: '开启' }
      ]
    };
    return optionsMap[key] || [];
  };

  const renderGeneralSettings = () => {
    const generalKeys = ['site_name', 'site_logo', 'timezone', 'date_format', 'language', 'session_timeout', 'max_login_attempts', 'maintenance_mode'];
    return (
      <Card title="全局配置" bordered={false}>
        <Form form={form} layout="vertical" onFinish={handleSaveSettings}>
          {generalKeys.map(key => settings[key] && renderFormItem(key, settings[key]))}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving}>保存设置</Button>
              <Button onClick={() => fetchSettings()}>重置表单</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    );
  };

  const renderAppearanceSettings = () => {
    const appearanceKeys = ['primary_color', 'secondary_color', 'dark_mode', 'compact_mode', 'sidebar_collapsed', 'table_row_height', 'animation_enabled'];
    return (
      <Card title="外观设置" bordered={false}>
        <Form form={form} layout="vertical" onFinish={handleSaveSettings}>
          <Alert
            message="主题颜色"
            description="修改主题颜色后需要刷新页面才能生效。深色模式可以减少眼睛疲劳。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          {appearanceKeys.map(key => settings[key] && renderFormItem(key, settings[key]))}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving}>保存设置</Button>
              <Button onClick={() => fetchSettings()}>重置表单</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    );
  };

  const renderBackupSettings = () => {
    const backupInfo = settings.backup_retention ? {
      auto_backup_enabled: settings.auto_backup_enabled,
      backup_interval: settings.backup_interval,
      backup_retention: settings.backup_retention,
      last_backup_time: settings.last_backup_time,
      backup_count: settings.backup_count
    } : null;

    const backupColumns = [
      {
        title: '文件名',
        dataIndex: 'filename',
        key: 'filename',
        render: (text) => <code>{text}</code>
      },
      {
        title: '大小',
        dataIndex: 'size',
        key: 'size',
        render: (size) => {
          const kb = size / 1024;
          return kb < 1024 ? `${kb.toFixed(2)} KB` : `${(kb / 1024).toFixed(2)} MB`;
        }
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date) => new Date(date).toLocaleString('zh-CN')
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <Space size="small">
            <Button size="small" icon={<ReloadOutlined />} onClick={() => handleRestoreBackup(record.filename)}>恢复</Button>
            <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadBackup(record.filename)}>下载</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteBackup(record.filename)}>删除</Button>
          </Space>
        )
      }
    ];

    return (
      <div>
        <Card title="自动备份设置" bordered={false} style={{ marginBottom: 16 }}>
          <Form form={form} layout="vertical" onFinish={handleSaveSettings}>
            {backupInfo && Object.entries(backupInfo).map(([key, data]) => (
              data && typeof data === 'object' ? renderFormItem(key, data) : null
            ))}
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={saving}>保存设置</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <Card title="手动备份管理" bordered={false}>
          <Alert
            message="数据安全提示"
            description="建议定期创建备份，并将备份文件保存到安全的位置。恢复备份前请确保已创建当前数据的备份。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<CloudUploadOutlined />} onClick={handleCreateBackup}>立即备份</Button>
            <Button icon={<SyncOutlined />} onClick={fetchBackupList}>刷新列表</Button>
          </Space>
          <Table
            dataSource={backupList}
            columns={backupColumns}
            rowKey="filename"
            loading={backupLoading}
            pagination={{ pageSize: 5 }}
          />
        </Card>
      </div>
    );
  };

  const renderAboutPage = () => {
    const aboutKeys = ['app_version', 'company_name', 'contact_email', 'contact_phone', 'company_address', 'system_description', 'privacy_policy', 'terms_of_service'];

    return (
      <div>
        <Card title="关于系统" bordered={false} style={{ marginBottom: 16 }}>
          <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
            <Descriptions.Item label="系统名称">机柜管理系统</Descriptions.Item>
            <Descriptions.Item label="版本号">{settings.app_version?.value || '1.0.0'}</Descriptions.Item>
            <Descriptions.Item label="系统状态">
              <Tag color="success">运行正常</Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="公司信息" bordered={false} style={{ marginBottom: 16 }}>
          <Form layout="vertical">
            {aboutKeys.slice(1).map(key => settings[key] && renderFormItem(key, settings[key]))}
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={saving} onClick={() => form.submit()}>保存信息</Button>
                <Button onClick={() => fetchSettings()}>重置</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {systemInfo && (
          <Card title="系统统计信息" bordered={false}>
            <Descriptions column={{ xs: 1, sm: 2, md: 4 }} bordered size="small">
              <Descriptions.Item label="设备总数">{systemInfo.statistics?.devices || 0}</Descriptions.Item>
              <Descriptions.Item label="机柜总数">{systemInfo.statistics?.racks || 0}</Descriptions.Item>
              <Descriptions.Item label="机房总数">{systemInfo.statistics?.rooms || 0}</Descriptions.Item>
              <Descriptions.Item label="用户总数">{systemInfo.statistics?.users || 0}</Descriptions.Item>
            </Descriptions>
            <Divider />
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="Node.js 版本">{systemInfo.system?.nodeVersion}</Descriptions.Item>
              <Descriptions.Item label="运行平台">{systemInfo.system?.platform} ({systemInfo.system?.arch})</Descriptions.Item>
              <Descriptions.Item label="进程 ID">{systemInfo.system?.pid}</Descriptions.Item>
              <Descriptions.Item label="运行时间">
                {systemInfo.system?.uptime ? `${Math.floor(systemInfo.system.uptime / 3600)}小时${Math.floor((systemInfo.system.uptime % 3600) / 60)}分钟` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="内存使用">
                {systemInfo.system?.memoryUsage ? `${(systemInfo.system.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="系统时间">
                {systemInfo.timestamp ? new Date(systemInfo.timestamp).toLocaleString('zh-CN') : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={<span><GlobalOutlined /> 全局配置</span>}
          key="general"
        >
          {renderGeneralSettings()}
        </TabPane>
        <TabPane
          tab={<span><BgColorsOutlined /> 外观设置</span>}
          key="appearance"
        >
          {renderAppearanceSettings()}
        </TabPane>
        <TabPane
          tab={<span><DatabaseOutlined /> 数据备份</span>}
          key="backup"
        >
          {renderBackupSettings()}
        </TabPane>
        <TabPane
          tab={<span><InfoCircleOutlined /> 关于</span>}
          key="about"
        >
          {renderAboutPage()}
        </TabPane>
      </Tabs>
    </div>
  );
};

import { LockOutlined } from '@ant-design/icons';

export default SystemSettings;
