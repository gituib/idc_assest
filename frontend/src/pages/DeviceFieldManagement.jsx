import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Card, Space, InputNumber, Switch, Tag, Statistic } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined, FontSizeOutlined, NumberOutlined, CheckCircleOutlined, CalendarOutlined, FileTextOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option = Select.Option } = Select;

const designTokens = {
  colors: {
    primary: {
      main: '#667eea',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      light: '#8b9ff0',
      dark: '#4f5db8'
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
    },
    fieldType: {
      string: '#3b82f6',
      number: '#10b981',
      boolean: '#f59e0b',
      select: '#8b5cf6',
      date: '#06b6d4',
      textarea: '#64748b'
    }
  },
  shadows: {
    small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(102, 126, 234, 0.15)'
  },
  borderRadius: {
    small: '6px',
    medium: '10px',
    large: '16px'
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)'
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

const titleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: designTokens.spacing.lg
};

const titleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: designTokens.spacing.sm,
  fontSize: '20px',
  fontWeight: '600',
  color: designTokens.colors.text.primary
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

const tableCardStyle = {
  background: designTokens.colors.background.primary,
  borderRadius: designTokens.borderRadius.large,
  boxShadow: designTokens.shadows.small,
  border: `1px solid ${designTokens.colors.border.light}`,
  overflow: 'hidden'
};

const tableStyle = {
  background: designTokens.colors.background.primary
};

const titleIconStyle = {
  color: designTokens.colors.primary.main
};

const modalTitleStyle = {
  fontWeight: '600'
};

const formLabelStyle = {
  fontWeight: '500'
};

const tableCellStyle = {
  fontWeight: '500',
  color: designTokens.colors.text.primary
};

const typeTagStyle = {
  border: 'none',
  borderRadius: designTokens.borderRadius.small,
  fontWeight: '500'
};

const orderBadgeStyle = {
  background: designTokens.colors.background.tertiary,
  padding: '2px 8px',
  borderRadius: designTokens.borderRadius.small,
  fontSize: '12px',
  fontWeight: '500'
};

const editButtonStyle = {
  color: designTokens.colors.primary.main,
  height: '28px',
  padding: '0 8px'
};

const deleteButtonStyle = {
  height: '28px',
  padding: '0 8px'
};

const formRowStyle = {
  display: 'flex',
  gap: designTokens.spacing.md
};

const formItemFlexStyle = {
  flex: 1
};

const textAreaStyle = {
  fontFamily: 'monospace'
};

const modalBodyStyle = {
  padding: designTokens.spacing.lg
};

const formActionsStyle = {
  marginBottom: 0,
  textAlign: 'right'
};

const modalStyle = {
  borderRadius: designTokens.borderRadius.large
};

const FIELD_TYPE_MAP = {
  string: { text: '文本', color: designTokens.colors.fieldType.string },
  number: { text: '数字', color: designTokens.colors.fieldType.number },
  boolean: { text: '布尔值', color: designTokens.colors.fieldType.boolean },
  select: { text: '下拉选择', color: designTokens.colors.fieldType.select },
  date: { text: '日期', color: designTokens.colors.fieldType.date },
  textarea: { text: '多行文本', color: designTokens.colors.fieldType.textarea }
};

const FIELD_TYPE_OPTIONS = [
  { value: 'string', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔值' },
  { value: 'select', label: '下拉选择' },
  { value: 'date', label: '日期' },
  { value: 'textarea', label: '多行文本' }
];

function DeviceFieldManagement() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [form] = Form.useForm();

  const fetchFields = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/deviceFields');
      setFields(response.data.sort((a, b) => a.order - b.order));
    } catch (error) {
      message.error('获取字段列表失败');
      console.error('获取字段列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const showModal = (field = null) => {
    setEditingField(field);
    if (field) {
      const fieldData = {
        ...field,
        options: field.options ? JSON.stringify(field.options, null, 2) : ''
      };
      form.setFieldsValue(fieldData);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingField(null);
  };

  const handleSubmit = async (values) => {
    try {
      const fieldData = {
        ...values,
        options: values.options ? JSON.parse(values.options) : null
      };

      if (editingField) {
        await axios.put(`/api/deviceFields/${editingField.fieldId}`, fieldData);
        message.success('字段更新成功');
      } else {
        await axios.post('/api/deviceFields', fieldData);
        message.success('字段创建成功');
      }

      setModalVisible(false);
      fetchFields();
      setEditingField(null);
    } catch (error) {
      message.error(editingField ? '字段更新失败' : '字段创建失败');
      console.error(editingField ? '字段更新失败:' : '字段创建失败:', error);
    }
  };

  const handleDelete = async (fieldId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个字段吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`/api/deviceFields/${fieldId}`);
          message.success('字段删除成功');
          fetchFields();
        } catch (error) {
          message.error('字段删除失败');
          console.error('字段删除失败:', error);
        }
      }
    });
  };

  const getFieldTypeIcon = (type) => {
    const iconMap = {
      string: <FontSizeOutlined />,
      number: <NumberOutlined />,
      boolean: <CheckCircleOutlined />,
      select: <AppstoreOutlined />,
      date: <CalendarOutlined />,
      textarea: <FileTextOutlined />
    };
    return iconMap[type] || <FontSizeOutlined />;
  };

  const columns = useMemo(() => [
    {
      title: '字段名称',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: 150,
      render: (text) => <span style={tableCellStyle}>{text}</span>
    },
    {
      title: '显示名称',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 120,
    },
    {
      title: '字段类型',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: 110,
      render: (type) => {
        const config = FIELD_TYPE_MAP[type] || { text: type, color: designTokens.colors.text.tertiary };
        return (
          <Tag style={{ ...typeTagStyle, background: `${config.color}15`, color: config.color }}>
            {getFieldTypeIcon(type)}
            <span style={{ marginLeft: '4px' }}>{config.text}</span>
          </Tag>
        );
      }
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 80,
      render: (required) => (
        <span style={{
          color: required ? designTokens.colors.success.main : designTokens.colors.text.tertiary,
          ...tableCellStyle
        }}>
          {required ? '是' : '否'}
        </span>
      )
    },
    {
      title: '可见',
      dataIndex: 'visible',
      key: 'visible',
      width: 80,
      render: (visible) => (
        <span style={{
          color: visible ? designTokens.colors.primary.main : designTokens.colors.text.tertiary,
          ...tableCellStyle
        }}>
          {visible ? '是' : '否'}
        </span>
      )
    },
    {
      title: '顺序',
      dataIndex: 'order',
      key: 'order',
      width: 80,
      render: (order) => <span style={orderBadgeStyle}>{order}</span>
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} onClick={() => showModal(record)} style={editButtonStyle}>
            编辑
          </Button>
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.fieldId)} style={deleteButtonStyle}>
            删除
          </Button>
        </Space>
      ),
    },
  ], []);

  return (
    <div style={pageContainerStyle}>
      <div style={titleRowStyle}>
        <div style={titleStyle}>
          <AppstoreOutlined style={titleIconStyle} />
          设备字段管理
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()} style={primaryActionStyle}>
          添加字段
        </Button>
      </div>

      <div style={tableCardStyle}>
        <Table
          columns={columns}
          dataSource={fields}
          rowKey="fieldId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`
          }}
          scroll={{ x: 900 }}
          style={tableStyle}
        />
      </div>

      <Modal
        title={<span style={modalTitleStyle}>{editingField ? '编辑字段' : '添加字段'}</span>}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
        styles={{ body: modalBodyStyle }}
        style={modalStyle}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="fieldName"
            label={<span style={formLabelStyle}>字段名称</span>}
            rules={[{ required: true, message: '请输入字段名称' }]}
          >
            <Input placeholder="请输入字段名称（英文，如：deviceId）" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label={<span style={formLabelStyle}>显示名称</span>}
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="请输入显示名称（中文，如：设备ID）" />
          </Form.Item>

          <Form.Item
            name="fieldType"
            label={<span style={formLabelStyle}>字段类型</span>}
            rules={[{ required: true, message: '请选择字段类型' }]}
          >
            <Select placeholder="请选择字段类型">
              {FIELD_TYPE_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <div style={formRowStyle}>
            <Form.Item
              name="required"
              label={<span style={formLabelStyle}>必填</span>}
              valuePropName="checked"
              style={formItemFlexStyle}
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="visible"
              label={<span style={formLabelStyle}>可见</span>}
              valuePropName="checked"
              style={formItemFlexStyle}
            >
              <Switch defaultChecked />
            </Form.Item>
          </div>

          <Form.Item
            name="order"
            label={<span style={formLabelStyle}>显示顺序</span>}
            rules={[{ required: true, message: '请输入显示顺序' }]}
          >
            <InputNumber placeholder="请输入显示顺序" min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="options"
            label={<span style={formLabelStyle}>选项配置（JSON格式）</span>}
            tooltip="格式示例：[{value: 'option1', label: '选项1'}]，仅下拉选择类型需要配置"
          >
            <Input.TextArea rows={3} placeholder="请输入JSON格式的选项配置，使用单引号" style={textAreaStyle} />
          </Form.Item>

          <Form.Item style={formActionsStyle}>
            <Space>
              <Button onClick={handleCancel}>取消</Button>
              <Button type="primary" htmlType="submit">确定</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DeviceFieldManagement;
