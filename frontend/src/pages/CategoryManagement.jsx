import React, { useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Card,
  Space,
  Popconfirm,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showTotal: total => `共 ${total} 条记录`,
  });
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 300);
  const [status, setStatus] = useState('all');

  const fetchCategories = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/consumable-categories', {
        params: { page, pageSize, keyword: debouncedKeyword, status },
      });
      setCategories(response.data.categories);
      setPagination(prev => ({ ...prev, current: page, pageSize, total: response.data.total }));
    } catch (error) {
      message.error('获取分类列表失败');
      console.error('获取分类列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [debouncedKeyword, status]);

  const showModal = (category = null) => {
    setEditingCategory(category);
    if (category) {
      form.setFieldsValue(category);
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 'active', sortOrder: 0 });
    }
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingCategory(null);
  };

  const handleSubmit = async values => {
    try {
      if (editingCategory) {
        await axios.put(`/api/consumable-categories/${editingCategory.id}`, values);
        message.success('分类更新成功');
      } else {
        await axios.post('/api/consumable-categories', values);
        message.success('分类创建成功');
      }
      setModalVisible(false);
      fetchCategories();
      setEditingCategory(null);
    } catch (error) {
      message.error(
        error.response?.data?.error || (editingCategory ? '分类更新失败' : '分类创建失败')
      );
      console.error('提交失败:', error);
    }
  };

  const handleDelete = async id => {
    try {
      await axios.delete(`/api/consumable-categories/${id}`);
      message.success('删除成功');
      fetchCategories();
    } catch (error) {
      message.error(error.response?.data?.error || '删除失败');
      console.error('删除失败:', error);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: value => value || '-',
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: value => (
        <Tag color={value === 'active' ? 'green' : 'red'}>
          {value === 'active' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: value => (value ? new Date(value).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => showModal(record)}
          >
            编辑
          </Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="耗材分类管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            添加分类
          </Button>
        }
      >
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space>
            <Input.Search
              placeholder="搜索分类名称、描述"
              style={{ width: 300 }}
              onSearch={value => setKeyword(value)}
              allowClear
            />
            <Select value={status} onChange={setStatus} style={{ width: 120 }}>
              <Option value="all">所有状态</Option>
              <Option value="active">启用</Option>
              <Option value="inactive">停用</Option>
            </Select>
            <Button onClick={() => fetchCategories()}>刷新</Button>
          </Space>
        </Card>

        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={pagination => fetchCategories(pagination.current, pagination.pageSize)}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingCategory ? '编辑分类' : '添加分类'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="分类名称"
            rules={[
              { required: true, message: '请输入分类名称' },
              { max: 50, message: '分类名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入分类描述" maxLength={200} showCount />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} placeholder="数值越小越靠前" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select>
              <Option value="active">启用</Option>
              <Option value="inactive">停用</Option>
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

export default CategoryManagement;
