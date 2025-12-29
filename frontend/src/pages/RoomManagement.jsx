import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Card, Space, InputNumber, Upload, Progress, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
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

  const pageHeaderStyle = {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  };

  const cardStyle = {
    borderRadius: '16px',
    border: 'none',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden'
  };

  const cardHeadStyle = {
    borderBottom: '1px solid #f0f0f0',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)'
  };

  const tableStyle = {
    borderRadius: '12px',
    overflow: 'hidden'
  };

  const statusTagStyle = (color) => ({
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    border: 'none',
    background: color === 'green' ? '#f6ffed' : color === 'orange' ? '#fff7e6' : '#f5f5f5',
    color: color === 'green' ? '#52c41a' : color === 'orange' ? '#faad14' : '#8c8c8c'
  });

  const primaryButtonStyle = {
    height: '40px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.35)',
    fontWeight: '500',
    transition: 'all 0.3s ease'
  };

  const actionButtonStyle = {
    height: '32px',
    borderRadius: '6px',
    border: '1px solid #e8e8e8',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={{ padding: '8px' }}>
      <div style={pageHeaderStyle}>
        <h1 style={titleStyle}>机房管理</h1>
        <Space size="middle">
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchRooms}
            style={actionButtonStyle}
          >
            刷新
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => showModal()}
            style={primaryButtonStyle}
          >
            添加机房
          </Button>
        </Space>
      </div>

      <Card style={cardStyle} headStyle={cardHeadStyle} bodyStyle={{ padding: '20px 24px' }}>
        <Table
          columns={columns}
          dataSource={rooms}
          rowKey="roomId"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          style={tableStyle}
          rowClassName={() => 'table-row'}
        />

      <Modal
        title={
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              width: '4px',
              height: '20px',
              background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '2px'
            }}></span>
            {editingRoom ? '编辑机房' : '添加机房'}
          </div>
        }
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
        destroyOnClose
        styles={{
          body: { padding: '24px' },
          header: {
            borderBottom: '1px solid #f0f0f0',
            padding: '16px 24px',
            marginBottom: '0'
          }
        }}
        style={{
          borderRadius: '16px',
          overflow: 'hidden'
        }}
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
            <Input placeholder="请输入机房ID" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="name"
            label="机房名称"
            rules={[{ required: true, message: '请输入机房名称' }]}
          >
            <Input placeholder="请输入机房名称" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="location"
            label="位置"
            rules={[{ required: true, message: '请输入机房位置' }]}
          >
            <Input placeholder="请输入机房位置" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="area"
            label="面积(㎡)"
            rules={[{ required: true, message: '请输入机房面积' }]}
          >
            <InputNumber placeholder="请输入机房面积" min={0} step={0.1} style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="capacity"
            label="容量(机柜数)"
            rules={[{ required: true, message: '请输入机柜容量' }]}
          >
            <InputNumber placeholder="请输入机柜容量" min={0} style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态" style={{ borderRadius: '8px' }}>
              <Option value="active">在用</Option>
              <Option value="maintenance">维护中</Option>
              <Option value="inactive">停用</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="请输入机房描述" rows={3} style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button 
                onClick={handleCancel}
                style={{ borderRadius: '8px', height: '40px' }}
              >
                取消
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                style={{
                  ...primaryButtonStyle,
                  width: 'auto',
                  paddingLeft: '24px',
                  paddingRight: '24px'
                }}
              >
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