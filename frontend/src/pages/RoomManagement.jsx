import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Card, Space, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

function RoomManagement() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [form] = Form.useForm();

  // 获取所有机房
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/rooms');
      setRooms(response.data);
    } catch (error) {
      message.error('获取机房列表失败');
      console.error('获取机房列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // 打开模态框
  const showModal = (room = null) => {
    setEditingRoom(room);
    if (room) {
      form.setFieldsValue(room);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 关闭模态框
  const handleCancel = () => {
    setModalVisible(false);
    setEditingRoom(null);
  };

  // 提交表单
  const handleSubmit = async (values) => {
    try {
      if (editingRoom) {
        // 更新机房
        await axios.put(`/api/rooms/${editingRoom.roomId}`, values);
        message.success('机房更新成功');
      } else {
        // 创建机房
        await axios.post('/api/rooms', values);
        message.success('机房创建成功');
      }

      setModalVisible(false);
      fetchRooms();
      setEditingRoom(null);
    } catch (error) {
      message.error(editingRoom ? '机房更新失败' : '机房创建失败');
      console.error(editingRoom ? '机房更新失败:' : '机房创建失败:', error);
    }
  };

  // 删除机房
  const handleDelete = async (roomId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个机房吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`/api/rooms/${roomId}`);
          message.success('机房删除成功');
          fetchRooms();
        } catch (error) {
          message.error('机房删除失败');
          console.error('机房删除失败:', error);
        }
      }
    });
  };

  // 状态标签映射
  const statusMap = {
    active: { text: '在用', color: 'green' },
    maintenance: { text: '维护中', color: 'orange' },
    inactive: { text: '停用', color: 'gray' }
  };

  // 表格列配置
  const columns = [
    {
      title: '机房ID',
      dataIndex: 'roomId',
      key: 'roomId',
    },
    {
      title: '机房名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '面积(㎡)',
      dataIndex: 'area',
      key: 'area',
    },
    {
      title: '容量(机柜数)',
      dataIndex: 'capacity',
      key: 'capacity',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <span style={{ color: statusMap[status].color }}>
          {statusMap[status].text}
        </span>
      ),
    },
    {
      title: '机柜数量',
      dataIndex: 'Racks',
      key: 'rackCount',
      render: (racks) => racks ? racks.length : 0,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => date ? new Date(date).toLocaleString() : '',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="primary" icon={<EditOutlined />} onClick={() => showModal(record)} size="small">
            编辑
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.roomId)} size="small">
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="机房管理" extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          添加机房
        </Button>
      }>
        <Table
          columns={columns}
          dataSource={rooms}
          rowKey="roomId"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingRoom ? '编辑机房' : '添加机房'}
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
            name="roomId"
            label="机房ID"
            rules={[{ required: true, message: '请输入机房ID' }]}
          >
            <Input placeholder="请输入机房ID" />
          </Form.Item>

          <Form.Item
            name="name"
            label="机房名称"
            rules={[{ required: true, message: '请输入机房名称' }]}
          >
            <Input placeholder="请输入机房名称" />
          </Form.Item>

          <Form.Item
            name="location"
            label="位置"
            rules={[{ required: true, message: '请输入机房位置' }]}
          >
            <Input placeholder="请输入机房位置" />
          </Form.Item>

          <Form.Item
            name="area"
            label="面积(㎡)"
            rules={[{ required: true, message: '请输入机房面积' }]}
          >
            <InputNumber placeholder="请输入机房面积" min={0} step={0.1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="capacity"
            label="容量(机柜数)"
            rules={[{ required: true, message: '请输入机柜容量' }]}
          >
            <InputNumber placeholder="请输入机柜容量" min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value="active">在用</Option>
              <Option value="maintenance">维护中</Option>
              <Option value="inactive">停用</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="请输入机房描述" rows={3} />
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

export default RoomManagement;