import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Card, Space, InputNumber, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

function DeviceFieldManagement() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [form] = Form.useForm();

  // 获取所有字段配置
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

  // 打开模态框
  const showModal = (field = null) => {
    setEditingField(field);
    if (field) {
      // 将options对象转换为JSON字符串以便在TextArea中显示
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

  // 关闭模态框
  const handleCancel = () => {
    setModalVisible(false);
    setEditingField(null);
  };

  // 提交表单
  const handleSubmit = async (values) => {
    try {
      // 处理选项配置，将JSON字符串转换为对象
      const fieldData = {
        ...values,
        options: values.options ? JSON.parse(values.options) : null
      };

      if (editingField) {
        // 更新字段
        await axios.put(`/api/deviceFields/${editingField.fieldId}`, fieldData);
        message.success('字段更新成功');
      } else {
        // 创建字段
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

  // 删除字段
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

  // 表格列配置
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
      render: (type) => {
        const typeMap = {
          string: '文本',
          number: '数字',
          boolean: '布尔值',
          select: '下拉选择',
          date: '日期',
          textarea: '多行文本'
        };
        return typeMap[type] || type;
      }
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      render: (required) => (
        <Switch checked={required} disabled />
      )
    },
    {
      title: '可见',
      dataIndex: 'visible',
      key: 'visible',
      render: (visible) => (
        <Switch checked={visible} disabled />
      )
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
          <Button type="primary" icon={<EditOutlined />} onClick={() => showModal(record)} size="small">
            编辑
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.fieldId)} size="small">
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="设备字段管理" extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          添加字段
        </Button>
      }>
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
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="fieldName"
            label="字段名称"
            rules={[{ required: true, message: '请输入字段名称' }]}
          >
            <Input placeholder="请输入字段名称（英文，如：deviceId）" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="请输入显示名称（中文，如：设备ID）" />
          </Form.Item>

          <Form.Item
            name="fieldType"
            label="字段类型"
            rules={[{ required: true, message: '请选择字段类型' }]}
          >
            <Select placeholder="请选择字段类型">
              <Option value="string">文本</Option>
              <Option value="number">数字</Option>
              <Option value="boolean">布尔值</Option>
              <Option value="select">下拉选择</Option>
              <Option value="date">日期</Option>
              <Option value="textarea">多行文本</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="required"
            label="必填"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="visible"
            label="可见"
          >
            <Switch defaultChecked />
          </Form.Item>

          <Form.Item
            name="order"
            label="显示顺序"
            rules={[{ required: true, message: '请输入显示顺序' }]}
          >
            <InputNumber placeholder="请输入显示顺序" min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="options"
            label="选项配置（仅下拉选择类型，JSON格式）"
            tooltip="格式示例：[{value: 'option1', label: '选项1'}]，使用单引号"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="请输入JSON格式的选项配置，使用单引号"
            />
          </Form.Item>

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

export default DeviceFieldManagement;