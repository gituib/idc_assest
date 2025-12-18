import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Card, Space, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

function RackManagement() {
  const [racks, setRacks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRack, setEditingRack] = useState(null);
  const [form] = Form.useForm();

  // 获取所有机柜
  const fetchRacks = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/racks');
      setRacks(response.data);
    } catch (error) {
      message.error('获取机柜列表失败');
      console.error('获取机柜列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取所有机房
  const fetchRooms = async () => {
    try {
      const response = await axios.get('/api/rooms');
      setRooms(response.data);
    } catch (error) {
      message.error('获取机房列表失败');
      console.error('获取机房列表失败:', error);
    }
  };

  useEffect(() => {
    fetchRacks();
    fetchRooms();
  }, []);

  // 打开模态框
  const showModal = (rack = null) => {
    setEditingRack(rack);
    if (rack) {
      form.setFieldsValue(rack);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 关闭模态框
  const handleCancel = () => {
    setModalVisible(false);
    setEditingRack(null);
  };

  // 提交表单
  const handleSubmit = async (values) => {
    try {
      if (editingRack) {
        // 更新机柜
        await axios.put(`/api/racks/${editingRack.rackId}`, values);
        message.success('机柜更新成功');
      } else {
        // 创建机柜
        await axios.post('/api/racks', values);
        message.success('机柜创建成功');
      }

      setModalVisible(false);
      fetchRacks();
      setEditingRack(null);
    } catch (error) {
      message.error(editingRack ? '机柜更新失败' : '机柜创建失败');
      console.error(editingRack ? '机柜更新失败:' : '机柜创建失败:', error);
    }
  };

  // 删除机柜
  const handleDelete = async (rackId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个机柜吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`/api/racks/${rackId}`);
          message.success('机柜删除成功');
          fetchRacks();
        } catch (error) {
          message.error('机柜删除失败');
          console.error('机柜删除失败:', error);
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
      title: '机柜ID',
      dataIndex: 'rackId',
      key: 'rackId',
    },
    {
      title: '机柜名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '所属机房',
      dataIndex: ['Room', 'name'],
      key: 'room',
    },
    {
      title: '高度(U)',
      dataIndex: 'height',
      key: 'height',
    },
    {
      title: '最大功率(W)',
      dataIndex: 'maxPower',
      key: 'maxPower',
    },
    {
      title: '当前功率(W)',
      dataIndex: 'currentPower',
      key: 'currentPower',
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
      title: '设备数量',
      dataIndex: 'Devices',
      key: 'deviceCount',
      render: (devices) => devices ? devices.length : 0,
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
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.rackId)} size="small">
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="机柜管理" extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          添加机柜
        </Button>
      }>
        <Table
          columns={columns}
          dataSource={racks}
          rowKey="rackId"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingRack ? '编辑机柜' : '添加机柜'}
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
            name="rackId"
            label="机柜ID"
            rules={[{ required: true, message: '请输入机柜ID' }]}
          >
            <Input placeholder="请输入机柜ID" />
          </Form.Item>

          <Form.Item
            name="name"
            label="机柜名称"
            rules={[{ required: true, message: '请输入机柜名称' }]}
          >
            <Input placeholder="请输入机柜名称" />
          </Form.Item>

          <Form.Item
            name="roomId"
            label="所属机房"
            rules={[{ required: true, message: '请选择机房' }]}
          >
            <Select placeholder="请选择机房">
              {rooms.map(room => (
                <Option key={room.roomId} value={room.roomId}>
                  {room.name} ({room.roomId})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="height"
            label="高度(U)"
            rules={[{ required: true, message: '请输入机柜高度' }]}
          >
            <InputNumber placeholder="请输入机柜高度" min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="maxPower"
            label="最大功率(W)"
            rules={[{ required: true, message: '请输入最大功率' }]}
          >
            <InputNumber placeholder="请输入最大功率" min={0} style={{ width: '100%' }} />
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

export default RackManagement;