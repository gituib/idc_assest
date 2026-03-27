import React, { useState, useEffect } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import CloseButton from '../components/CloseButton';

const { Option } = Select;

const OptionsEditor = ({ value, onChange }) => {
  const options = Array.isArray(value) ? value : [];

  const handleAdd = () => {
    onChange([...options, { value: '', label: '' }]);
  };

  const handleRemove = index => {
    onChange(options.filter((_, i) => i !== index));
  };

  const handleUpdate = (index, field, fieldValue) => {
    const newOptions = options.map((opt, i) =>
      i === index ? { ...opt, [field]: fieldValue } : opt
    );
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

      {options.length === 0 ? (
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

      {options.length > 0 && (
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

function TicketFieldManagement() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [selectedFieldType, setSelectedFieldType] = useState('string');
  const [form] = Form.useForm();

  const fetchFields = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/ticket-fields');
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
        await axios.put(`/api/ticket-fields/${editingField.fieldId}`, fieldData);
        message.success('字段更新成功');
      } else {
        await axios.post('/api/ticket-fields', fieldData);
        message.success('字段创建成功');
      }

      setModalVisible(false);
      fetchFields();
      setEditingField(null);
      setSelectedFieldType('string');
    } catch (error) {
      message.error(editingField ? '字段更新失败' : '字段创建失败');
      console.error(error);
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
          await axios.delete(`/api/ticket-fields/${fieldId}`);
          message.success('字段删除成功');
          fetchFields();
        } catch (error) {
          message.error('字段删除失败');
          console.error('字段删除失败:', error);
        }
      },
    });
  };

  const columns = [
    {
      title: '字段名称',
      dataIndex: 'fieldName',
      key: 'fieldName',
    },
    {
      title: '显示名称',
      dataIndex: 'displayName',
      key: 'displayName',
    },
    {
      title: '字段类型',
      dataIndex: 'fieldType',
      key: 'fieldType',
      render: type => {
        const typeMap = {
          string: '文本',
          number: '数字',
          boolean: '布尔值',
          select: '下拉选择',
          date: '日期',
          datetime: '日期时间',
          textarea: '多行文本',
          device: '设备选择',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      render: required => <Switch checked={required} disabled />,
    },
    {
      title: '可见',
      dataIndex: 'visible',
      key: 'visible',
      render: visible => <Switch checked={visible} disabled />,
    },
    {
      title: '顺序',
      dataIndex: 'order',
      key: 'order',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            size="small"
          >
            编辑
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.fieldId)}
            size="small"
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="工单字段管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            添加字段
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={fields}
          rowKey="fieldId"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingField ? '编辑字段' : '添加字段'}
        open={modalVisible}
        closeIcon={<CloseButton />}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="fieldName"
            label="字段名称"
            rules={[{ required: true, message: '请输入字段名称' }]}
          >
            <Input placeholder="请输入字段名称（英文，如：customField）" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="请输入显示名称（中文，如：自定义字段）" />
          </Form.Item>

          <Form.Item
            name="fieldType"
            label="字段类型"
            rules={[{ required: true, message: '请选择字段类型' }]}
          >
            <Select placeholder="请选择字段类型" onChange={handleFieldTypeChange}>
              <Option value="string">文本</Option>
              <Option value="number">数字</Option>
              <Option value="boolean">布尔值</Option>
              <Option value="select">下拉选择</Option>
              <Option value="date">日期</Option>
              <Option value="datetime">日期时间</Option>
              <Option value="textarea">多行文本</Option>
              <Option value="device">设备选择</Option>
            </Select>
          </Form.Item>

          <Form.Item name="required" label="必填">
            <Switch />
          </Form.Item>

          <Form.Item name="visible" label="可见">
            <Switch defaultChecked />
          </Form.Item>

          <Form.Item
            name="order"
            label="显示顺序"
            rules={[{ required: true, message: '请输入显示顺序' }]}
          >
            <InputNumber placeholder="请输入显示顺序" min={0} style={{ width: '100%' }} />
          </Form.Item>

          {selectedFieldType === 'select' ? (
            <Form.Item
              name="options"
              label="选项配置"
              tooltip="为下拉选择类型添加选项，值（value）用于提交数据，标签（label）用于显示"
            >
              <OptionsEditor />
            </Form.Item>
          ) : (
            <Form.Item name="options" label="选项配置" tooltip="仅下拉选择类型需要配置选项">
              <Input.TextArea
                rows={2}
                placeholder="仅下拉选择类型需要配置，此处不可编辑"
                disabled
                style={{ background: '#f5f5f5' }}
              />
            </Form.Item>
          )}

          <Form.Item style={{ textAlign: 'right' }}>
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

export default TicketFieldManagement;
