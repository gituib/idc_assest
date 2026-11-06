import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tag,
  Popconfirm,
  Tree,
  InputNumber,
  Row,
  Col,
  Divider,
  Spin,
  Alert,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SafetyOutlined,
  UserOutlined,
  KeyOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  NumberOutlined,
  CheckCircleOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { roleAPI, permissionAPI } from '../api';
import CloseButton from '../components/CloseButton';

const { Option } = Select;

/**
 * 将权限列表转换为树形结构
 * @param {Array} permissions - 权限列表
 * @returns {Array} 树形结构数据
 */
const buildPermissionTree = (permissions) => {
  if (!permissions || permissions.length === 0) return [];
  const map = {};
  const tree = [];
  permissions.forEach((p) => {
    map[p.permissionCode] = {
      key: p.permissionCode,
      title: p.permissionName,
      children: [],
    };
  });
  permissions.forEach((p) => {
    if (p.parentId && map[p.parentId]) {
      map[p.parentId].children.push(map[p.permissionCode]);
    } else if (!p.parentId) {
      tree.push(map[p.permissionCode]);
    }
  });
  // 清理空 children
  const cleanEmpty = (nodes) => {
    nodes.forEach((node) => {
      if (node.children && node.children.length === 0) {
        delete node.children;
      } else if (node.children) {
        cleanEmpty(node.children);
      }
    });
  };
  cleanEmpty(tree);
  return tree;
};

/**
 * 获取树中所有叶子节点的 key
 * @param {Array} tree - 权限树
 * @returns {Array} 所有 key
 */
const getAllKeys = (tree) => {
  const keys = [];
  const traverse = (nodes) => {
    nodes.forEach((node) => {
      keys.push(node.key);
      if (node.children) traverse(node.children);
    });
  };
  traverse(tree);
  return keys;
};

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [form] = Form.useForm();

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.current, pageSize: pagination.pageSize };
      if (searchText) params.roleName = searchText;
      const response = await roleAPI.list(params);
      if (response.success) {
        setRoles(response.data.roles);
        setPagination((prev) => ({ ...prev, total: response.data.total }));
      }
    } catch (error) {
      message.error('获取角色列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText]);

  const fetchPermissions = useCallback(async () => {
    setPermissionsLoading(true);
    setPermissionsError('');
    try {
      const response = await permissionAPI.list();
      if (response.success) {
        setPermissions(Array.isArray(response.data) ? response.data : []);
      } else {
        setPermissionsError(response.message || '获取权限列表失败');
        message.error(response.message || '获取权限列表失败');
      }
    } catch (error) {
      console.error('获取权限列表失败:', error);
      const tip = error.response?.data?.message || '获取权限列表失败，请检查登录状态或后端服务';
      setPermissionsError(tip);
      message.error(tip);
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const permissionTree = useMemo(() => {
    const tree = buildPermissionTree(permissions);
    return tree;
  }, [permissions]);
  const allPermissionKeys = useMemo(() => getAllKeys(permissionTree), [permissionTree]);

  const handleAdd = useCallback(() => {
    setEditingRole(null);
    form.resetFields();
    setCheckedKeys([]);
    form.setFieldsValue({ status: 'active', sort: 0, permissions: [] });
    setModalVisible(true);
  }, []);

  const handleEdit = useCallback(
    (role) => {
      setEditingRole(role);
      const perms = role.permissions || [];
      setCheckedKeys(perms);
      form.setFieldsValue({
        roleName: role.roleName,
        description: role.description,
        status: role.status,
        sort: role.sort,
        permissions: perms,
      });
      setModalVisible(true);
    },
    []
  );

  const handleDelete = useCallback(
    async (roleId) => {
      try {
        const response = await roleAPI.delete(roleId);
        if (response.success) {
          message.success('删除成功');
          fetchRoles();
        } else {
          message.error(response.message || '删除失败');
        }
      } catch (error) {
        message.error('删除失败');
      }
    }, [fetchRoles]);

  const handleSubmit = useCallback(
    async (values) => {
      try {
        let response;
        if (editingRole) {
          response = await roleAPI.update(editingRole.roleId, values);
        } else {
          response = await roleAPI.create(values);
        }
        if (response.success) {
          message.success(editingRole ? '更新成功' : '创建成功');
          setModalVisible(false);
          fetchRoles();
        } else {
          message.error(response.message || '操作失败');
        }
      } catch (error) {
        message.error('操作失败');
      }
    },
    [editingRole, fetchRoles]
  );

  const handleSearch = useCallback(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchRoles();
  }, [fetchRoles]);

  const getStatusColor = (status) => (status === 'active' ? 'green' : 'red');
  const getStatusText = (status) => (status === 'active' ? '启用' : '禁用');

  const tableColumns = useMemo(
    () => [
      {
        title: '角色名称',
        dataIndex: 'roleName',
        key: 'roleName',
        width: 150,
        render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
      },
      {
        title: '角色编码',
        dataIndex: 'roleCode',
        key: 'roleCode',
        width: 120,
        render: (code) => <Tag>{code}</Tag>,
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        width: 250,
        render: (text) => text || '-',
      },
      {
        title: '权限',
        key: 'permissions',
        render: (_, record) => (
          <Space wrap size={[4, 4]}>
            {(record.permissions || []).length > 0 ? (
              record.permissions.map((perm) => (
                <Tag key={perm} color="blue" style={{ fontSize: '11px' }}>
                  {perm === '*' ? '全部权限' : perm}
                </Tag>
              ))
            ) : (
              <span style={{ color: '#999' }}>无权限</span>
            )}
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 80,
        render: (status) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>,
      },
      {
        title: '排序',
        dataIndex: 'sort',
        key: 'sort',
        width: 70,
      },
      {
        title: '操作',
        key: 'action',
        width: 160,
        render: (_, record) => (
          <Space size="small">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
            {record.roleCode !== 'admin' && (
              <Popconfirm
                title="确定要删除此角色吗？"
                onConfirm={() => handleDelete(record.roleId)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="text" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ],
    [handleEdit, handleDelete]
  );

  const titleStyle = {
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  const cardStyle = {
    borderRadius: '16px',
    border: 'none',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  };

  const primaryButtonStyle = {
    height: '40px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.35)',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  };

  const secondaryButtonStyle = {
    height: '40px',
    borderRadius: '8px',
    border: '1px solid #e8e8e8',
    transition: 'all 0.3s ease',
  };

  const modalHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: '600',
  };

  const modalHeaderAccent = {
    width: '4px',
    height: '20px',
    background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '2px',
  };

  return (
    <div style={{ padding: '8px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={titleStyle}>角色管理</h1>
        <Space size="middle">
          <Input.Search
            placeholder="搜索角色名称"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            allowClear
            style={{ width: 220 }}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchRoles} style={secondaryButtonStyle}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={primaryButtonStyle}>
            添加角色
          </Button>
        </Space>
      </div>

      <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }}>
        <Table
          columns={tableColumns}
          dataSource={roles}
          rowKey="roleId"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={(newPagination) => {
            setPagination((prev) => ({ ...prev, ...newPagination }));
          }}
        />
      </Card>

      <Modal
        title={
          <div style={modalHeaderStyle}>
            <span style={modalHeaderAccent}></span>
            {editingRole ? '编辑角色' : '添加角色'}
          </div>
        }
        open={modalVisible}
        closeIcon={<CloseButton />}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={680}
        destroyOnHidden
        styles={{
          body: { padding: '0' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '20px 28px' },
        }}
        style={{ borderRadius: '16px', overflow: 'hidden' }}
        maskStyle={{ backdropFilter: 'blur(4px)', background: 'rgba(0, 0, 0, 0.35)' }}
        transitionName="ant-move-up"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ padding: '28px' }}>
          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                name="roleName"
                label={<span style={{ fontWeight: 500, fontSize: '13px' }}>角色名称</span>}
                rules={[{ required: true, message: '请输入角色名称' }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="请输入角色名称"
                  style={{ borderRadius: '8px', height: '42px' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label={<span style={{ fontWeight: 500, fontSize: '13px' }}>描述</span>}
          >
            <Input.TextArea
                placeholder="请输入角色描述"
                rows={2}
                style={{ borderRadius: '8px' }}
              />
          </Form.Item>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="status"
                label={<span style={{ fontWeight: 500, fontSize: '13px' }}>状态</span>}
              >
                <Select
                  placeholder="请选择状态"
                  style={{ borderRadius: '8px', height: '42px' }}
                  options={[
                    { value: 'active', label: <Space><CheckCircleOutlined style={{ color: '#52c41a' }} />启用</Space> },
                    { value: 'inactive', label: <Space><LockOutlined style={{ color: '#ff4d4f' }} />禁用</Space> },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sort"
                label={<span style={{ fontWeight: 500, fontSize: '13px' }}>排序</span>}
              >
                <InputNumber
                  min={0}
                  max={999}
                  placeholder="数字越小越靠前"
                  style={{ width: '100%', borderRadius: '8px', height: '42px' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0 20px', borderColor: '#f0f0f0' }} />

          <Form.Item
            name="permissions"
            label={<span style={{ fontWeight: 500, fontSize: '13px' }}>权限配置</span>}
            rules={[{ required: true, message: '请选择权限', type: 'array' }]}
          >
            <div style={{
              border: editingRole?.roleCode === 'admin' ? '1px solid #e8e8e8' : '1px solid #d9d9d9',
              borderRadius: '10px',
              padding: '12px 16px',
              background: editingRole?.roleCode === 'admin' ? '#fafafa' : '#fff',
              transition: 'all 0.3s ease',
              maxHeight: 340,
              overflow: 'auto',
            }}>
              {editingRole?.roleCode === 'admin' && (
                <div style={{
                  padding: '8px 12px',
                  marginBottom: 8,
                  background: '#fff7e6',
                  border: '1px solid #ffd591',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#d46b08',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <LockOutlined />
                  <span>系统管理员拥有全部权限，不可修改</span>
                </div>
              )}
              {permissionsLoading ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Spin size="small" />
                  <div style={{ marginTop: 8, fontSize: '12px', color: '#8c8c8c' }}>权限加载中...</div>
                </div>
              ) : permissionsError ? (
                <Alert
                  type="error"
                  showIcon
                  message={permissionsError}
                  action={
                    <Button size="small" type="link" onClick={fetchPermissions}>
                      重试
                    </Button>
                  }
                />
              ) : permissionTree.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      暂无权限数据，请确认后端已初始化权限种子
                    </span>
                  }
                >
                  <Button size="small" onClick={fetchPermissions}>
                    重新加载
                  </Button>
                </Empty>
              ) : (
                <Tree
                  checkable
                  checkedKeys={checkedKeys}
                  onCheck={(keys, info) => {
                    const checked = Array.isArray(keys) ? keys : keys.checked;
                    setCheckedKeys(checked);
                    form.setFieldsValue({ permissions: checked });
                  }}
                  treeData={permissionTree}
                  disabled={editingRole?.roleCode === 'admin'}
                  style={{ fontSize: '13px' }}
                />
              )}
            </div>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space size={12}>
              <Button
                onClick={() => setModalVisible(false)}
                style={{
                  borderRadius: '8px',
                  height: '42px',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  border: '1px solid #e8e8e8',
                  fontWeight: 500,
                }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{
                  height: '42px',
                  borderRadius: '8px',
                  paddingLeft: '28px',
                  paddingRight: '28px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
                  fontWeight: 500,
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                }}
              >
                {editingRole ? '保存修改' : '创建角色'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagement;