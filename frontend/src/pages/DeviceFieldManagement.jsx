import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Card,
  Space,
  InputNumber,
  Switch,
  Tag,
  Statistic,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  FontSizeOutlined,
  NumberOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  FileTextOutlined,
  LockOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { designTokens } from '../config/theme';
import CloseButton from '../components/CloseButton';

const { Option = Select.Option } = Select;

const OptionsEditor = ({ value = [], onChange }) => {
  const handleAdd = () => {
    onChange([...value, { value: '', label: '' }]);
  };

  const handleRemove = index => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleUpdate = (index, field, fieldValue) => {
    const newOptions = value.map((opt, i) => (i === index ? { ...opt, [field]: fieldValue } : opt));
    onChange(newOptions);
  };

  return (
    <div
      style={{
        border: '1px solid #e8e8e8',
        borderRadius: '12px',
        padding: '20px',
        background: 'linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '4px',
            height: '16px',
            background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '2px',
          }}
        />
        <span style={{ color: '#333', fontSize: '14px', fontWeight: '600' }}>选项配置</span>
        <span style={{ color: '#999', fontSize: '12px' }}>（值用于提交，标签用于显示）</span>
      </div>

      {value.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '24px',
            background: '#fff',
            borderRadius: '8px',
            border: '1px dashed #d9d9d9',
          }}
        >
          <div style={{ color: '#bbb', fontSize: '14px', marginBottom: '12px' }}>暂无选项</div>
          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            onClick={handleAdd}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '6px',
              height: '36px',
            }}
          >
            添加第一个选项
          </Button>
        </div>
      ) : (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}
        >
          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '0 4px',
              marginBottom: '4px',
            }}
          >
            <span style={{ width: '160px', color: '#666', fontSize: '12px', fontWeight: '500' }}>
              值（value）
            </span>
            <span style={{ width: '160px', color: '#666', fontSize: '12px', fontWeight: '500' }}>
              标签（label）
            </span>
          </div>
          {value.map((opt, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: '#fff',
                borderRadius: '8px',
                border: '1px solid #e8e8e8',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#667eea',
                  fontSize: '12px',
                  fontWeight: '600',
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>
              <Input
                placeholder="值"
                value={opt.value}
                onChange={e => handleUpdate(index, 'value', e.target.value)}
                style={{ width: '160px', borderRadius: '6px' }}
              />
              <Input
                placeholder="标签"
                value={opt.label}
                onChange={e => handleUpdate(index, 'label', e.target.value)}
                style={{ width: '160px', borderRadius: '6px' }}
              />
              <Button
                type="text"
                danger
                icon={<MinusCircleOutlined />}
                onClick={() => handleRemove(index)}
                style={{ flexShrink: 0 }}
              >
                删除
              </Button>
            </div>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <Button
          type="dashed"
          icon={<PlusCircleOutlined />}
          onClick={handleAdd}
          style={{
            width: '100%',
            height: '40px',
            borderRadius: '8px',
            borderColor: '#d9d9d9',
            color: '#666',
          }}
        >
          添加选项
        </Button>
      )}
    </div>
  );
};

const pageContainerStyle = {
  minHeight: '100vh',
  background: designTokens.colors.background.secondary,
  padding: designTokens.spacing.lg,
};

const titleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: designTokens.spacing.lg,
};

const titleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: designTokens.spacing.sm,
  fontSize: '20px',
  fontWeight: '600',
  color: designTokens.colors.text.primary,
};

const actionButtonStyle = {
  height: '36px',
  padding: `0 ${designTokens.spacing.md}px`,
  borderRadius: designTokens.borderRadius.small,
  fontSize: '13px',
  display: 'flex',
  alignItems: 'center',
  gap: designTokens.spacing.xs,
};

const primaryActionStyle = {
  ...actionButtonStyle,
  background: designTokens.colors.primary.gradient,
  border: 'none',
  color: '#ffffff',
  boxShadow: designTokens.shadows.small,
};

const tableCardStyle = {
  background: designTokens.colors.background.primary,
  borderRadius: designTokens.borderRadius.large,
  boxShadow: designTokens.shadows.small,
  border: `1px solid ${designTokens.colors.border.light}`,
  overflow: 'hidden',
};

const tableStyle = {
  background: designTokens.colors.background.primary,
};

const titleIconStyle = {
  color: designTokens.colors.primary.main,
};

const modalTitleStyle = {
  fontWeight: '600',
};

const formLabelStyle = {
  fontWeight: '500',
};

const tableCellStyle = {
  fontWeight: '500',
  color: designTokens.colors.text.primary,
};

const typeTagStyle = {
  border: 'none',
  borderRadius: designTokens.borderRadius.small,
  fontWeight: '500',
};

const orderBadgeStyle = {
  background: designTokens.colors.background.tertiary,
  padding: '2px 8px',
  borderRadius: designTokens.borderRadius.small,
  fontSize: '12px',
  fontWeight: '500',
};

const editButtonStyle = {
  color: designTokens.colors.primary.main,
  height: '28px',
  padding: '0 8px',
};

const deleteButtonStyle = {
  height: '28px',
  padding: '0 8px',
};

const formRowStyle = {
  display: 'flex',
  gap: designTokens.spacing.md,
};

const formItemFlexStyle = {
  flex: 1,
};

const textAreaStyle = {
  fontFamily: 'monospace',
};

const modalBodyStyle = {
  padding: designTokens.spacing.lg,
};

const formActionsStyle = {
  marginBottom: 0,
  textAlign: 'right',
};

const modalStyle = {
  borderRadius: designTokens.borderRadius.large,
};

const FIELD_TYPE_MAP = {
  string: { text: '文本', color: designTokens.colors.fieldType.string },
  number: { text: '数字', color: designTokens.colors.fieldType.number },
  boolean: { text: '布尔值', color: designTokens.colors.fieldType.boolean },
  select: { text: '下拉选择', color: designTokens.colors.fieldType.select },
  date: { text: '日期', color: designTokens.colors.fieldType.date },
  textarea: { text: '多行文本', color: designTokens.colors.fieldType.textarea },
};

const FIELD_TYPE_OPTIONS = [
  { value: 'string', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔值' },
  { value: 'select', label: '下拉选择' },
  { value: 'date', label: '日期' },
  { value: 'textarea', label: '多行文本' },
];

function DeviceFieldManagement() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [selectedFieldType, setSelectedFieldType] = useState('string');
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    pageSizeOptions: ['10', '20', '50', '100'],
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`,
  });

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
        options: field.options || [],
      };
      setSelectedFieldType(field.fieldType || 'string');
      form.setFieldsValue(fieldData);
    } else {
      form.resetFields();
      setSelectedFieldType('string');
    }
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingField(null);
    setSelectedFieldType('string');
  };

  const handleFieldTypeChange = value => {
    setSelectedFieldType(value);
    if (value !== 'select') {
      form.setFieldsValue({ options: [] });
    }
  };

  const handleSubmit = async values => {
    try {
      const fieldData = {
        ...values,
        options: values.options && values.options.length > 0 ? values.options : null,
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
      setSelectedFieldType('string');
    } catch (error) {
      message.error(editingField ? '字段更新失败' : '字段创建失败');
      console.error(editingField ? '字段更新失败:' : '字段创建失败:', error);
    }
  };

  const handleDelete = async fieldId => {
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
      },
    });
  };

  const getFieldTypeIcon = type => {
    const iconMap = {
      string: <FontSizeOutlined />,
      number: <NumberOutlined />,
      boolean: <CheckCircleOutlined />,
      select: <AppstoreOutlined />,
      date: <CalendarOutlined />,
      textarea: <FileTextOutlined />,
    };
    return iconMap[type] || <FontSizeOutlined />;
  };

  const columns = useMemo(
    () => [
      {
        title: '字段名称',
        dataIndex: 'fieldName',
        key: 'fieldName',
        width: 150,
        render: (text, record) => (
          <Space>
            <span style={tableCellStyle}>{text}</span>
            {record.isSystem && (
              <Tooltip title="系统字段，不可删除">
                <LockOutlined style={{ color: '#f59e0b', fontSize: '14px' }} />
              </Tooltip>
            )}
          </Space>
        ),
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
        render: type => {
          const config = FIELD_TYPE_MAP[type] || {
            text: type,
            color: designTokens.colors.text.tertiary,
          };
          return (
            <Tag style={{ ...typeTagStyle, background: `${config.color}15`, color: config.color }}>
              {getFieldTypeIcon(type)}
              <span style={{ marginLeft: '4px' }}>{config.text}</span>
            </Tag>
          );
        },
      },
      {
        title: '必填',
        dataIndex: 'required',
        key: 'required',
        width: 80,
        render: required => (
          <span
            style={{
              color: required
                ? designTokens.colors.success.main
                : designTokens.colors.text.tertiary,
              ...tableCellStyle,
            }}
          >
            {required ? '是' : '否'}
          </span>
        ),
      },
      {
        title: '可见',
        dataIndex: 'visible',
        key: 'visible',
        width: 80,
        render: visible => (
          <span
            style={{
              color: visible ? designTokens.colors.primary.main : designTokens.colors.text.tertiary,
              ...tableCellStyle,
            }}
          >
            {visible ? '是' : '否'}
          </span>
        ),
      },
      {
        title: '顺序',
        dataIndex: 'order',
        key: 'order',
        width: 80,
        render: order => <span style={orderBadgeStyle}>{order}</span>,
      },
      {
        title: '操作',
        key: 'action',
        width: 160,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => showModal(record)}
              className="table-action-btn"
            >
              编辑
            </Button>
            {record.isSystem ? (
              <Tooltip title="系统字段不可删除">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled
                  className="table-action-btn-disabled"
                >
                  删除
                </Button>
              </Tooltip>
            ) : (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record.fieldId)}
                className="table-action-btn"
              >
                删除
              </Button>
            )}
          </Space>
        ),
      },
    ],
    []
  );

  return (
    <div style={pageContainerStyle}>
      <div style={titleRowStyle}>
        <div style={titleStyle}>
          <AppstoreOutlined style={titleIconStyle} />
          设备字段管理
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => showModal()}
          className="page-primary-btn"
        >
          添加字段
        </Button>
      </div>

      <div style={tableCardStyle}>
        <Table
          columns={columns}
          dataSource={fields}
          rowKey="fieldId"
          loading={loading}
          pagination={pagination}
          onChange={newPagination => {
            setPagination({
              ...pagination,
              current: newPagination.current,
              pageSize: newPagination.pageSize,
            });
          }}
          scroll={{ x: 900 }}
          style={tableStyle}
        />
      </div>

      <Modal
        title={<span style={modalTitleStyle}>{editingField ? '编辑字段' : '添加字段'}</span>}
        open={modalVisible}
        closeIcon={<CloseButton />}
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
            <Select placeholder="请选择字段类型" onChange={handleFieldTypeChange}>
              {FIELD_TYPE_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
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

          {selectedFieldType === 'select' ? (
            <Form.Item
              name="options"
              label={<span style={formLabelStyle}>选项配置</span>}
              tooltip="为下拉选择类型添加选项，值（value）用于提交数据，标签（label）用于显示"
            >
              <OptionsEditor />
            </Form.Item>
          ) : (
            <Form.Item
              name="options"
              label={<span style={formLabelStyle}>选项配置</span>}
              tooltip="仅下拉选择类型需要配置选项"
            >
              <Input.TextArea
                rows={2}
                placeholder="仅下拉选择类型需要配置，此处不可编辑"
                disabled
                style={{ background: '#f5f5f5' }}
              />
            </Form.Item>
          )}

          <Form.Item style={formActionsStyle}>
            <Space>
              <Button onClick={handleCancel}>取消</Button>
              <Button type="primary" htmlType="submit">
                确定
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DeviceFieldManagement;
