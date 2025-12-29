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
  const [importPhase, setImportPhase] = useState('');
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
      setImportPhase('正在上传文件...');
      setImportResult(null);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post('/api/racks/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 50) / progressEvent.total);
          setImportProgress(Math.min(progress, 50));
          setImportPhase('正在上传文件...');
        }
      });
      
      setImportProgress(60);
      setImportPhase('正在处理数据...');
      
      setTimeout(() => {
        setImportProgress(80);
        setImportPhase('正在验证数据...');
      }, 200);
      
      setTimeout(() => {
        setImportProgress(90);
        setImportPhase('正在保存数据...');
      }, 400);
      
      setImportProgress(100);
      setImportPhase('导入完成');
      setImportResult(response.data);
      setIsImporting(false);
      
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
      
      return false;
    } catch (error) {
      setIsImporting(false);
      setImportProgress(0);
      
      let errorMessage = '机柜导入失败';
      let errorDetails = [];
      
      if (error.response) {
        const { data } = error.response;
        if (data && data.errors && Array.isArray(data.errors)) {
          errorDetails = data.errors.map((err, index) => ({
            row: err.row || index + 1,
            error: err.error || err.message || '未知错误'
          }));
          errorMessage = `导入失败，共发现 ${errorDetails.length} 处数据错误`;
        } else if (data && data.message) {
          errorMessage = data.message;
        } else if (data && data.details && Array.isArray(data.details)) {
          errorDetails = data.details.map((err, index) => ({
            row: err.row || index + 1,
            error: err.error || err.message || '未知错误'
          }));
          errorMessage = `导入失败，共发现 ${errorDetails.length} 处数据错误`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setImportResult({
        success: false,
        message: errorMessage,
        details: errorDetails
      });
      
      message.error(errorMessage);
      console.error('机柜导入失败:', error);
      
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
  ], [showModal, handleDelete]);

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

  return (
    <div style={{ padding: '8px' }}>
      <div style={pageHeaderStyle}>
        <h1 style={titleStyle}>机柜管理</h1>
        <Space size="middle">
          <Button 
            icon={<UploadOutlined />} 
            onClick={() => setImportModalVisible(true)}
            style={secondaryButtonStyle}
          >
            导入机柜
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => showModal()}
            style={primaryButtonStyle}
          >
            添加机柜
          </Button>
        </Space>
      </div>

      <Card style={cardStyle} headStyle={cardHeadStyle} bodyStyle={{ padding: '20px 24px' }}>
        <Table
          columns={columns}
          dataSource={racks}
          rowKey="rackId"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
          rowClassName={() => 'table-row'}
        />
      </Card>

      <Modal
        title={
          <div style={modalHeaderStyle}>
            <span style={modalHeaderAccent}></span>
            {editingRack ? '编辑机柜' : '添加机柜'}
          </div>
        }
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
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
        >
          <Form.Item
            name="rackId"
            label="机柜ID"
            rules={[{ required: true, message: '请输入机柜ID' }]}
          >
            <Input placeholder="请输入机柜ID" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="name"
            label="机柜名称"
            rules={[{ required: true, message: '请输入机柜名称' }]}
          >
            <Input placeholder="请输入机柜名称" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="roomId"
            label="所属机房"
            rules={[{ required: true, message: '请选择机房' }]}
          >
            <Select placeholder="请选择机房" style={{ borderRadius: '8px' }}>
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
            <InputNumber placeholder="请输入机柜高度" min={1} max={50} style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="maxPower"
            label="最大功率(W)"
            rules={[{ required: true, message: '请输入最大功率' }]}
          >
            <InputNumber placeholder="请输入最大功率" min={0} style={{ width: '100%', borderRadius: '8px' }} />
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

      {/* 导入机柜模态框 */}
      <Modal
        title={
          <div style={modalHeaderStyle}>
            <span style={modalHeaderAccent}></span>
            导入机柜
          </div>
        }
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportProgress(0);
          setImportPhase('');
          setImportResult(null);
          setIsImporting(false);
        }}
        footer={null}
        width={650}
        destroyOnClose
        styles={{
          body: { padding: '24px' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }
        }}
        style={{ borderRadius: '16px', overflow: 'hidden' }}
      >
        {!isImporting && !importResult ? (
          <div>
            <div style={{ 
              padding: '16px', 
              background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)', 
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid #e8e8e8'
            }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: '600', color: '#262626' }}>
                请上传XLSX格式的机柜数据文件
              </p>
              <p style={{ margin: 0, color: '#8c8c8c', fontSize: '12px' }}>
                支持的编码格式：UTF-8
              </p>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: '600', marginBottom: '12px', color: '#262626' }}>
                Excel文件格式要求：
              </p>
              <ul style={{ 
                paddingLeft: '20px', 
                marginBottom: '10px', 
                color: '#595959',
                lineHeight: '1.8'
              }}>
                <li>必填字段：机柜ID、机柜名称、所属机房名称、高度(U)、最大功率(W)、状态</li>
                <li>状态值：active(在用)、maintenance(维护中)、inactive(停用)</li>
                <li>高度和功率必须是数字格式</li>
              </ul>
            </div>
            
            <div style={{ 
              padding: '16px', 
              background: '#f6f6f6', 
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={handleDownloadTemplate}
                style={actionButtonStyle}
              >
                下载导入模板
              </Button>
              <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
                包含示例数据的XLSX模板文件
              </span>
            </div>
            
            <Upload
              name="file"
              accept=".xlsx, .xls"
              showUploadList={false}
              beforeUpload={handleImport}
              maxCount={1}
            >
              <Button 
                type="primary" 
                icon={<UploadOutlined />} 
                block
                style={{
                  ...primaryButtonStyle,
                  height: '48px',
                  fontSize: '16px'
                }}
              >
                选择Excel文件
              </Button>
            </Upload>
          </div>
        ) : isImporting ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginRight: '16px',
                color: '#fff',
                fontSize: '20px'
              }}>
                <UploadOutlined spin />
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#333', fontSize: '16px' }}>正在导入机柜数据</p>
                <p style={{ margin: 0, color: '#667eea', fontSize: '14px' }}>{importPhase}</p>
              </div>
            </div>
            <Progress 
              percent={importProgress} 
              status="active"
              strokeColor={{
                '0%': '#667eea',
                '100%': '#764ba2'
              }}
              format={() => `${importProgress}%`}
            />
          </div>
        ) : importResult && (
              <div style={{ 
                textAlign: 'left', 
                background: '#f6f6f6', 
                padding: '20px', 
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <p style={{ marginBottom: '12px', fontWeight: '600' }}>
                  导入结果：
                </p>
                <p style={{ margin: '8px 0', color: '#52c41a' }}>
                  ✓ 总记录数：{importResult.total || 0}
                </p>
                <p style={{ margin: '8px 0', color: '#52c41a' }}>
                  ✓ 成功：{importResult.imported || 0}
                </p>
                <p style={{ margin: '8px 0', color: importResult.duplicates > 0 ? '#faad14' : '#52c41a' }}>
                  {importResult.duplicates > 0 ? '⚠' : '✓'} 重复：{importResult.duplicates || 0}
                </p>
                {importResult.details && importResult.details.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <p style={{ fontWeight: '600', color: '#ff4d4f', marginBottom: '8px' }}>
                      导入失败记录：
                    </p>
                    <ul style={{ 
                      maxHeight: '200px', 
                      overflowY: 'auto', 
                      textAlign: 'left',
                      paddingLeft: '20px',
                      margin: 0
                    }}>
                      {importResult.details.map((item, index) => (
                        <li key={index} style={{ marginBottom: '8px', color: '#ff4d4f' }}>
                          <strong>第 {item.row} 行</strong>
                          <ul style={{ margin: '4px 0 0 20px' }}>
                            {item.errors.map((err, errIndex) => (
                              <li key={errIndex}>{err}</li>
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
                  style={primaryButtonStyle}
                >
                  确定
                </Button>
              </div>
            )}
      </Modal>

    </div>
  );
}

export default React.memo(RackManagement);