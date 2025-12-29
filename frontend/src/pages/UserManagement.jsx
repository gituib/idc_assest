import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Tag, Popconfirm, Avatar, Tooltip, Badge } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, ReloadOutlined, LockOutlined, CameraOutlined } from '@ant-design/icons';
import { userAPI, roleAPI } from '../api';

const { Option } = Select;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [avatarUser, setAvatarUser] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [pagination.current]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userAPI.list({
        page: pagination.current,
        pageSize: pagination.pageSize
      });
      if (response.success) {
        setUsers(response.data.users);
        setPagination(prev => ({ ...prev, total: response.data.total }));
      }
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await roleAPI.all();
      if (response.success) {
        setRoles(response.data);
      } else {
        message.error('获取角色列表失败: ' + (response.message || '未知错误'));
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
      message.error('获取角色列表失败，请检查网络连接');
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      phone: user.phone,
      realName: user.realName,
      status: user.status,
      roleIds: user.roles?.map(r => r.roleId) || []
    });
    setModalVisible(true);
  };

  const handleResetPassword = (user) => {
    setPasswordUser(user);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  const handleAvatarClick = (user) => {
    setAvatarUser(user);
    setAvatarModalVisible(true);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|png|gif|webp)/)) {
      message.error('只支持 JPG、PNG、GIF 和 WebP 格式的图片');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      message.error('图片大小不能超过 5MB');
      return;
    }

    setUploadLoading(true);
    try {
      const response = await userAPI.uploadAvatar(avatarUser.userId, file);
      if (response.success) {
        message.success('头像上传成功');
        fetchUsers();
        setAvatarModalVisible(false);
      } else {
        message.error(response.message || '上传失败');
      }
    } catch (error) {
      message.error('上传失败');
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarDelete = async () => {
    try {
      const response = await userAPI.deleteAvatar(avatarUser.userId);
      if (response.success) {
        message.success('头像已删除');
        fetchUsers();
        setAvatarModalVisible(false);
      } else {
        message.error(response.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleDelete = async (userId) => {
    try {
      const response = await userAPI.delete(userId);
      if (response.success) {
        message.success('删除成功');
        fetchUsers();
      } else {
        message.error(response.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      let response;
      if (editingUser) {
        response = await userAPI.update(editingUser.userId, values);
      } else {
        response = await userAPI.create(values);
      }

      if (response.success) {
        message.success(editingUser ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchUsers();
      } else {
        message.error(response.message || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleResetPasswordSubmit = async (values) => {
    try {
      const response = await userAPI.resetPassword(passwordUser.userId, values);
      if (response.success) {
        message.success('密码重置成功');
        setPasswordModalVisible(false);
      } else {
        message.error(response.message || '重置失败');
      }
    } catch (error) {
      message.error('重置失败');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'green',
      inactive: 'red',
      locked: 'orange'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      active: '正常',
      inactive: '禁用',
      locked: '锁定'
    };
    return texts[status] || status;
  };

  const getAvatarUrl = (user) => {
    if (!user?.avatar) return null;
    return user.avatar;
  };

  const columns = [
    {
      title: '头像',
      key: 'avatar',
      width: 80,
      render: (_, record) => (
        <Badge dot={!!record.avatar} color="green" offset={[-5, 35]}>
          <Avatar
            size={48}
            icon={!record.avatar && <UserOutlined />}
            src={getAvatarUrl(record)}
            style={{ 
              backgroundColor: record.avatar ? 'transparent' : '#1890ff',
              cursor: 'pointer'
            }}
            onClick={() => handleAvatarClick(record)}
          />
        </Badge>
      )
    },
    {
      title: '用户名',
      key: 'username',
      width: 150,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.realName || record.username}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>@{record.username}</div>
        </div>
      )
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (email) => email || '-'
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (phone) => phone || '-'
    },
    {
      title: '角色',
      key: 'roles',
      render: (_, record) => (
        <Space wrap>
          {record.roles?.map(role => (
            <Tag key={role.roleId} color={role.roleCode === 'admin' ? 'blue' : 'green'}>
              {role.roleName}
            </Tag>
          )) || '-'}
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      )
    },
    {
      title: '最后登录',
      key: 'lastLogin',
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          <div>{record.lastLoginTime ? new Date(record.lastLoginTime).toLocaleString() : '从未登录'}</div>
          <div style={{ color: '#999' }}>{record.lastLoginIp || '-'}</div>
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="重置密码">
            <Button 
              type="text" 
              icon={<LockOutlined />}
              onClick={() => handleResetPassword(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除此用户吗？"
            onConfirm={() => handleDelete(record.userId)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
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

  const primaryButtonStyle = {
    height: '40px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.35)',
    fontWeight: '500',
    transition: 'all 0.3s ease'
  };

  const secondaryButtonStyle = {
    height: '40px',
    borderRadius: '8px',
    border: '1px solid #e8e8e8',
    transition: 'all 0.3s ease'
  };

  const actionButtonStyle = {
    height: '32px',
    borderRadius: '6px',
    border: '1px solid #e8e8e8',
    transition: 'all 0.3s ease'
  };

  const modalHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: '600'
  };

  const modalHeaderAccent = {
    width: '4px',
    height: '20px',
    background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '2px'
  };

  const avatarModalStyle = {
    textAlign: 'center',
    padding: '20px 0'
  };

  const avatarWrapperStyle = {
    marginBottom: '24px',
    position: 'relative',
    display: 'inline-block'
  };

  return (
    <div style={{ padding: '8px' }}>
      <div style={pageHeaderStyle}>
        <h1 style={titleStyle}>用户管理</h1>
        <Space size="middle">
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchUsers}
            style={secondaryButtonStyle}
          >
            刷新
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            style={primaryButtonStyle}
          >
            添加用户
          </Button>
        </Space>
      </div>

      <Card style={cardStyle} headStyle={cardHeadStyle} bodyStyle={{ padding: '20px 24px' }}>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="userId"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          onChange={(newPagination) => {
            setPagination(prev => ({ ...prev, ...newPagination }));
          }}
          rowClassName={() => 'table-row'}
        />
      </Card>

      <Modal
        title={
          <div style={modalHeaderStyle}>
            <span style={modalHeaderAccent}></span>
            {editingUser ? '编辑用户' : '添加用户'}
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
        destroyOnClose
        styles={{
          body: { padding: '24px' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }
        }}
        style={{ borderRadius: '16px', overflow: 'hidden' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: '20px' }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度必须在3-20个字符之间' }
            ]}
          >
            <Input placeholder="请输入用户名" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="realName"
            label="真实姓名"
            rules={[{ required: true, message: '请输入真实姓名' }]}
          >
            <Input placeholder="请输入真实姓名" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="roleIds"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select mode="multiple" placeholder="请选择角色" style={{ borderRadius: '8px' }}>
              {roles.map(role => (
                <Option key={role.roleId} value={role.roleId}>
                  {role.roleName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="初始密码"
              rules={[
                { required: true, message: '请输入初始密码' },
                { min: 6, message: '密码长度不能少于6个字符' }
              ]}
            >
              <Input.Password placeholder="请输入初始密码" style={{ borderRadius: '8px' }} />
            </Form.Item>
          )}

          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态" style={{ borderRadius: '8px' }}>
              <Option value="active">正常</Option>
              <Option value="inactive">禁用</Option>
              <Option value="locked">锁定</Option>
            </Select>
          </Form.Item>

          {editingUser && (
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { min: 6, message: '密码长度不能少于6个字符' }
              ]}
            >
              <Input.Password placeholder="留空则不修改密码" style={{ borderRadius: '8px' }} />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button 
                onClick={() => setModalVisible(false)}
                style={{ borderRadius: '8px', height: '40px' }}
              >
                取消
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                style={{
                  ...primaryButtonStyle,
                  width: 'auto',
                  paddingLeft: '24px',
                  paddingRight: '24px'
                }}
              >
                {editingUser ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={modalHeaderStyle}>
            <span style={modalHeaderAccent}></span>
            {`重置密码 - ${passwordUser?.username}`}
          </div>
        }
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        footer={null}
        width={400}
        destroyOnClose
        styles={{
          body: { padding: '24px' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }
        }}
        style={{ borderRadius: '16px', overflow: 'hidden' }}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleResetPasswordSubmit}
          style={{ marginTop: '20px' }}
        >
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于6个字符' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button 
                onClick={() => setPasswordModalVisible(false)}
                style={{ borderRadius: '8px', height: '40px' }}
              >
                取消
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                style={{
                  ...primaryButtonStyle,
                  width: 'auto',
                  paddingLeft: '24px',
                  paddingRight: '24px'
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={modalHeaderStyle}>
            <span style={modalHeaderAccent}></span>
            {`设置头像 - ${avatarUser?.username}`}
          </div>
        }
        open={avatarModalVisible}
        onCancel={() => setAvatarModalVisible(false)}
        footer={null}
        width={400}
        destroyOnClose
        styles={{
          body: { padding: '24px' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }
        }}
        style={{ borderRadius: '16px', overflow: 'hidden' }}
      >
        <div style={avatarModalStyle}>
          <div style={avatarWrapperStyle}>
            <Badge dot={!!avatarUser?.avatar} color="green" offset={[-5, 35]}>
              <Avatar
                size={120}
                icon={!avatarUser?.avatar && <UserOutlined />}
                src={getAvatarUrl(avatarUser)}
                style={{ 
                  backgroundColor: avatarUser?.avatar ? 'transparent' : '#1890ff',
                  border: '1px solid #f0f0f0',
                  cursor: 'pointer'
                }}
              />
            </Badge>
          </div>

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleAvatarUpload}
            />

            <Button 
              type="primary" 
              icon={<CameraOutlined />}
              onClick={() => fileInputRef.current?.click()}
              loading={uploadLoading}
              block
              style={{
                ...primaryButtonStyle,
                height: '44px'
              }}
            >
              {avatarUser?.avatar ? '更换头像' : '上传头像'}
            </Button>

            {avatarUser?.avatar && (
              <Button 
                danger 
                icon={<DeleteOutlined />}
                onClick={handleAvatarDelete}
                block
                style={{ borderRadius: '8px', height: '44px' }}
              >
                删除头像
              </Button>
            )}
          </Space>

          <div style={{ marginTop: '16px', color: '#8c8c8c', fontSize: '12px' }}>
            支持 JPG、PNG、GIF、WebP 格式，大小不超过 5MB
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
