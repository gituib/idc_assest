import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Card, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

function TicketCategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form] = Form.useForm();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/ticket-categories');
      setCategories(response.data || []);
    } catch (error) {
      message.error('获取故障分类列表失败');
      console.error('获取故障分类列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const initCategories = async () => {
    try {
      await axios.post('/api/ticket-categories/init');
      message.success('初始化分类成功');
      fetchCategories();
    } catch (error) {
      message.error('初始化分类失败');
      console.error('初始化分类失败:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const showModal = (category = null) => {
    setEditingCategory(category);
    if (category) {
      form.setFieldsValue({
        name: category.name,
        description: category.description,
        priority: category.priority,
        defaultPriority: category.defaultPriority,
        expectedDuration: category.expectedDuration,
        isActive: category.isActive
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingCategory) {
        await axios.put(`/api/ticket-categories/${editingCategory.categoryId}`, values);
        message.success('分类更新成功');
      } else {
        await axios.post('/api/ticket-categories', values);
        message.success('分类创建成功');
      }

      setModalVisible(false);
      fetchCategories();
      setEditingCategory(null);
    } catch (error) {
      message.error(editingCategory ? '分类更新失败' : '分类创建失败');
      console.error(error);
    }
  };

  const handleDelete = async (categoryId) => {
    try {
      await axios.delete(`/api/ticket-categories/${categoryId}`);
      message.success('分类删除成功');
      fetchCategories();
    } catch (error) {
      message.error('分类删除失败');
      console.error(error);
    }
  };

  const columns = [
    {
      title: '分类ID',
      dataIndex: 'categoryId',
      key: 'categoryId',
      width: 150
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      width: 180
    },
    {
      title: '分类说明',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      ellipsis: true
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80
    },
    {
      title: '默认优先级',
      dataIndex: 'defaultPriority',
      key: 'defaultPriority',
      width: 100
    },
    {
      title: '预计时长(分钟)',
      dataIndex: 'expectedDuration',
      key: 'expectedDuration',
      width: 120
    },
    {
      title: '启用状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (text) => (
        <span style={{ color: text ? 'green' : 'red' }}>
          {text ? '启用' : '禁用'}
        </span>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个分类吗？"
            onConfirm={() => handleDelete(record.categoryId)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="故障分类管理" extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={initCategories}>
            初始化分类
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            添加分类
          </Button>
        </Space>
      }>
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="categoryId"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingCategory ? '编辑分类' : '添加分类'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="分类名称" rules={[{ required: true }]}>
            <Input placeholder="请输入分类名称（如：系统故障、硬件故障等）" />
          </Form.Item>

          <Form.Item name="description" label="分类说明">
            <Input.TextArea rows={3} placeholder="请输入分类说明，说明此类故障代表什么问题" />
          </Form.Item>

          <Form.Item name="priority" label="排序优先级">
            <Input type="number" placeholder="数字越小排序越靠前" />
          </Form.Item>

          <Form.Item name="defaultPriority" label="默认优先级">
            <Select placeholder="选择默认优先级">
              <Option value="low">低</Option>
              <Option value="medium">中</Option>
              <Option value="high">高</Option>
              <Option value="urgent">紧急</Option>
            </Select>
          </Form.Item>

          <Form.Item name="expectedDuration" label="预计处理时长(分钟)">
            <Input type="number" placeholder="请输入预计处理时长" />
          </Form.Item>

          <Form.Item name="isActive" label="启用状态" initialValue={true}>
            <Select>
              <Option value={true}>启用</Option>
              <Option value={false}>禁用</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingCategory ? '更新' : '创建'}
              </Button>
              <Button onClick={handleCancel}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default TicketCategoryManagement;
