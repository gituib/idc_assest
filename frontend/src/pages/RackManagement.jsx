import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Card, Space, InputNumber, Upload, Progress } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import * as XLSX from 'xlsx';

const { Option } = Select;

// 状态映射函数
const statusMap = {
  active: { text: '在用', color: 'green' },
  maintenance: { text: '维护中', color: 'orange' },
  inactive: { text: '停用', color: 'gray' }
};

function RackManagement() {
  const [racks, setRacks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRack, setEditingRack] = useState(null);
  const [form] = Form.useForm();
  // 分页状态
  const [pagination, setPagination] = useState({ 
    current: 1, 
    pageSize: 10, 
    total: 0,
    pageSizeOptions: ['10', '20', '30', '50', '100'],
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条记录`
  });
  // 导入模态框状态
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const fetchRacks = useCallback(async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/racks', {
        params: {
          page,
          pageSize
        }
      });
      // 假设API返回格式为 { racks: [], total: number }
      const { racks: data, total } = response.data;
      setRacks(data);
      // 更新分页状态
      setPagination(prev => ({ ...prev, current: page, pageSize, total }));
    } catch (error) {
      message.error('获取机柜列表失败');
      console.error('获取机柜列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await axios.get('/api/rooms');
      setRooms(response.data);
    } catch (error) {
      message.error('获取机房列表失败');
      console.error('获取机房列表失败:', error);
    }
  }, []);

  const handleTableChange = useCallback((pagination) => {
    fetchRacks(pagination.current, pagination.pageSize);
  }, [fetchRacks]);

  useEffect(() => {
    fetchRacks(pagination.current, pagination.pageSize);
    fetchRooms();
  }, [fetchRacks, fetchRooms]);

  // 打开模态框
  const showModal = useCallback((rack = null) => {
    setEditingRack(rack);
    if (rack) {
      form.setFieldsValue(rack);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  }, []);

  // 关闭模态框
  const handleCancel = useCallback(() => {
    setModalVisible(false);
    setEditingRack(null);
  }, []);

  // 提交表单
  const handleSubmit = useCallback(async (values) => {
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
  }, [editingRack, fetchRacks]);

  // 删除机柜
  const handleDelete = useCallback(async (rackId) => {
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
  }, [fetchRacks]);

  // 下载导入模板
  const handleDownloadTemplate = useCallback(() => {
    // 调用后端API下载模板
    window.open('/api/racks/import-template', '_blank');
    message.success('模板下载成功');
  }, []);

  // 导入机柜数据
  const handleImport = useCallback(async (file) => {
    try {
      setIsImporting(true);
      setImportProgress(0);
      setImportResult(null);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // 模拟进度
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);
      
      // 发送文件到后端处理
      const response = await axios.post('/api/racks/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(response.data);
      setIsImporting(false);
      
      // 根据导入结果显示不同的消息
      if (response.data.success) {
        const { imported, duplicates, total } = response.data;
        if (duplicates > 0) {
          message.warning(`导入完成，但有 ${duplicates} 条重复记录被跳过`);
        } else {
          message.success('所有记录导入成功');
        }
      } else {
        message.error(response.data.message || '导入失败');
      }
      
      // 阻止自动上传
      return false;
    } catch (error) {
      setIsImporting(false);
      
      let errorMessage = '机柜导入失败';
      let errorDetails = null;
      
      if (error.response) {
        // 服务器返回了错误响应
        errorMessage = error.response.data.message || error.response.data.error || errorMessage;
        errorDetails = error.response.data.details;
      } else if (error.request) {
        // 请求已发送但没有收到响应
        errorMessage = '网络错误，服务器没有响应';
      } else {
        // 请求配置错误
        errorMessage = `请求错误: ${error.message}`;
      }
      
      setImportResult({ success: false, message: errorMessage, details: errorDetails });
      message.error(errorMessage);
      console.error('机柜导入失败:', error);
      
      // 阻止自动上传
      return false;
    }
  }, []);

  // 表格列配置
  const columns = useMemo(() => [
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
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            添加机柜
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalVisible(true)}>
            导入机柜
          </Button>
        </Space>
      }>
        <Table
          columns={columns}
          dataSource={racks}
          rowKey="rackId"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
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

      {/* 导入机柜模态框 */}
      <Modal
        title="导入机柜"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportProgress(0);
          setImportResult(null);
          setIsImporting(false);
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        {!isImporting && !importResult ? (
          <div>
            <p>请上传XLSX格式的机柜数据文件</p>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: 20 }}>支持的编码格式：UTF-8</p>
            
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 'bold', marginBottom: 8 }}>Excel文件格式要求：</p>
              <ul style={{ paddingLeft: 20, marginBottom: 10 }}>
                <li>必填字段：机柜ID、机柜名称、所属机房名称、高度(U)、最大功率(W)、状态</li>
                <li>状态值：active(在用)、maintenance(维护中)、inactive(停用)</li>
                <li>高度和功率必须是数字格式</li>
              </ul>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate} style={{ marginRight: 10 }}>
                下载导入模板
              </Button>
              <span style={{ color: '#999', fontSize: '12px' }}>包含示例数据的XLSX模板文件</span>
            </div>
            
            <Upload
              name="file"
              accept=".xlsx, .xls"
              showUploadList={false}
              beforeUpload={handleImport}
              maxCount={1}
            >
              <Button type="primary" icon={<UploadOutlined />} block>
                选择Excel文件
              </Button>
            </Upload>
          </div>
        ) : (
          <div>
            <p>正在导入数据...</p>
            <Progress percent={importProgress} status="active" style={{ marginBottom: 20 }} />
            {importResult && (
              <div>
                <p style={{ marginBottom: 10 }}>导入完成：</p>
                <p>总记录数：{importResult.total || 0}</p>
                <p>成功：{importResult.imported || 0}</p>
                <p>重复：{importResult.duplicates || 0}</p>
                {importResult.details && importResult.details.length > 0 && (
                  <div>
                    <p style={{ marginTop: 20, fontWeight: 'bold' }}>导入失败记录：</p>
                    <ul style={{ maxHeight: '300px', overflowY: 'auto', textAlign: 'left' }}>
                      {importResult.details.map((item, index) => (
                        <li key={index} style={{ marginBottom: '8px' }}>
                          <strong>第 {item.row} 行</strong>
                          <ul style={{ margin: '4px 0 0 20px' }}>
                            {item.errors.map((err, errIndex) => (
                              <li key={errIndex} style={{ color: '#ff4d4f' }}>{err}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button
                  type="primary"
                  onClick={() => {
                    setImportModalVisible(false);
                    setImportProgress(0);
                    setImportResult(null);
                    setIsImporting(false);
                    fetchRacks();
                  }}
                  style={{ marginTop: 20 }}
                >
                  确定
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
}

export default React.memo(RackManagement);