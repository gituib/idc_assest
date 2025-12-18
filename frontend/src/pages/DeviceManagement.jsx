import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Card, Space, InputNumber, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

function DeviceManagement() {
  const [devices, setDevices] = useState([]);
  const [racks, setRacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [form] = Form.useForm();
  // 自定义字段状态
  const [customFieldName, setCustomFieldName] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');
  // 设备字段配置
  const [deviceFields, setDeviceFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);

  // 获取所有设备
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/devices');
      
      // 将customFields中的字段值映射为设备对象的直接属性
      const processedDevices = response.data.map(device => {
        const deviceWithFields = { ...device };
        
        // 如果有自定义字段，将其展开为设备对象的直接属性
        if (device.customFields && typeof device.customFields === 'object') {
          Object.entries(device.customFields).forEach(([fieldName, value]) => {
            deviceWithFields[fieldName] = value;
          });
        }
        
        return deviceWithFields;
      });
      
      setDevices(processedDevices);
    } catch (error) {
      message.error('获取设备列表失败');
      console.error('获取设备列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取设备字段配置
  const fetchDeviceFields = async () => {
    try {
      setLoadingFields(true);
      const response = await axios.get('/api/deviceFields');
      // 按顺序排序字段
      const sortedFields = response.data.sort((a, b) => a.order - b.order);
      setDeviceFields(sortedFields);
    } catch (error) {
      message.error('获取字段配置失败');
      console.error('获取字段配置失败:', error);
      // 如果获取失败，使用默认字段配置
      setDeviceFields(defaultDeviceFields);
    } finally {
      setLoadingFields(false);
    }
  };

  // 默认设备字段配置
  const defaultDeviceFields = [
    { fieldName: 'deviceId', displayName: '设备ID', fieldType: 'string', required: true, order: 1, visible: true },
    { fieldName: 'name', displayName: '设备名称', fieldType: 'string', required: true, order: 2, visible: true },
    { fieldName: 'type', displayName: '设备类型', fieldType: 'select', required: true, order: 3, visible: true, 
      options: [{ value: 'server', label: '服务器' }, { value: 'switch', label: '交换机' }, { value: 'router', label: '路由器' }, { value: 'storage', label: '存储设备' }, { value: 'other', label: '其他设备' }] },
    { fieldName: 'model', displayName: '型号', fieldType: 'string', required: true, order: 4, visible: true },
    { fieldName: 'serialNumber', displayName: '序列号', fieldType: 'string', required: true, order: 5, visible: true },
    { fieldName: 'rackId', displayName: '所在机柜', fieldType: 'select', required: true, order: 6, visible: true },
    { fieldName: 'position', displayName: '位置(U)', fieldType: 'number', required: true, order: 7, visible: true },
    { fieldName: 'height', displayName: '高度(U)', fieldType: 'number', required: true, order: 8, visible: true },
    { fieldName: 'powerConsumption', displayName: '功率(W)', fieldType: 'number', required: true, order: 9, visible: true },
    { fieldName: 'status', displayName: '状态', fieldType: 'select', required: true, order: 10, visible: true, 
      options: [{ value: 'running', label: '运行中' }, { value: 'maintenance', label: '维护中' }, { value: 'offline', label: '离线' }, { value: 'fault', label: '故障' }] },
    { fieldName: 'purchaseDate', displayName: '购买日期', fieldType: 'date', required: true, order: 11, visible: true },
    { fieldName: 'warrantyExpiry', displayName: '保修到期', fieldType: 'date', required: true, order: 12, visible: true },
    { fieldName: 'ipAddress', displayName: 'IP地址', fieldType: 'string', required: false, order: 13, visible: true },
    { fieldName: 'description', displayName: '描述', fieldType: 'textarea', required: false, order: 14, visible: true }
  ];


  // 获取所有机柜
  const fetchRacks = async () => {
    try {
      const response = await axios.get('/api/racks');
      setRacks(response.data);
    } catch (error) {
      message.error('获取机柜列表失败');
      console.error('获取机柜列表失败:', error);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchRacks();
    fetchDeviceFields();
  }, []);

  // 打开模态框
  const showModal = (device = null) => {
    setEditingDevice(device);
    if (device) {
      // 转换日期字段为dayjs格式
      const deviceData = { ...device };
      if (deviceData.purchaseDate) deviceData.purchaseDate = dayjs(deviceData.purchaseDate);
      if (deviceData.warrantyExpiry) deviceData.warrantyExpiry = dayjs(deviceData.warrantyExpiry);
      if (!deviceData.customFields) deviceData.customFields = {};
      
      // 将customFields中的字段值合并到deviceData中，以便动态表单控件能正确显示
      Object.entries(deviceData.customFields).forEach(([fieldName, value]) => {
        deviceData[fieldName] = value;
      });
      
      form.setFieldsValue(deviceData);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 关闭模态框
  const handleCancel = () => {
    setModalVisible(false);
    setEditingDevice(null);
  };

  // 提交表单
  const handleSubmit = async (values) => {
    try {
      // 定义设备模型的固定字段
      const fixedFields = [
        'deviceId', 'name', 'type', 'model', 'serialNumber', 'rackId',
        'position', 'height', 'powerConsumption', 'status', 'purchaseDate',
        'warrantyExpiry', 'ipAddress', 'description'
      ];
      
      // 分离固定字段和动态字段
      const fixedFieldValues = {};
      const dynamicFieldValues = {};
      
      Object.entries(values).forEach(([key, value]) => {
        if (fixedFields.includes(key)) {
          fixedFieldValues[key] = value;
        } else if (key !== 'customFields') {
          dynamicFieldValues[key] = value;
        }
      });
      
      // 合并原有的自定义字段和新的动态字段
      const allCustomFields = {
        ...(values.customFields || {}),
        ...dynamicFieldValues
      };
      
      // 构建最终的设备数据
      const deviceData = {
        ...fixedFieldValues,
        purchaseDate: fixedFieldValues.purchaseDate ? fixedFieldValues.purchaseDate.format('YYYY-MM-DD') : null,
        warrantyExpiry: fixedFieldValues.warrantyExpiry ? fixedFieldValues.warrantyExpiry.format('YYYY-MM-DD') : null,
        customFields: allCustomFields
      };

      if (editingDevice) {
        // 更新设备
        await axios.put(`/api/devices/${editingDevice.deviceId}`, deviceData);
        message.success('设备更新成功');
      } else {
        // 创建设备
        await axios.post('/api/devices', deviceData);
        message.success('设备创建成功');
      }

      setModalVisible(false);
      fetchDevices();
      setEditingDevice(null);
    } catch (error) {
      message.error(editingDevice ? '设备更新失败' : '设备创建失败');
      console.error(editingDevice ? '设备更新失败:' : '设备创建失败:', error);
    }
  };

  // 删除设备
  const handleDelete = async (deviceId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个设备吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`/api/devices/${deviceId}`);
          message.success('设备删除成功');
          fetchDevices();
        } catch (error) {
          message.error('设备删除失败');
          console.error('设备删除失败:', error);
        }
      }
    });
  };

  // 状态标签映射
  const statusMap = {
    running: { text: '运行中', color: 'green' },
    maintenance: { text: '维护中', color: 'orange' },
    offline: { text: '离线', color: 'gray' },
    fault: { text: '故障', color: 'red' }
  };

  // 设备类型映射
  const typeMap = {
    server: '服务器',
    switch: '交换机',
    router: '路由器',
    storage: '存储设备',
    other: '其他设备'
  };

  // 动态生成表格列配置
  const columns = React.useMemo(() => {
    const generatedColumns = [];
    
    // 根据字段配置动态生成列
    deviceFields.forEach(field => {
      // 特殊处理机柜字段
      if (field.fieldName === 'rackId') {
        generatedColumns.push({
          title: field.displayName,
          dataIndex: ['Rack', 'name'],
          key: field.fieldName,
        });
      } 
      // 特殊处理设备类型
      else if (field.fieldName === 'type') {
        generatedColumns.push({
          title: field.displayName,
          dataIndex: field.fieldName,
          key: field.fieldName,
          render: (type) => typeMap[type],
        });
      }
      // 特殊处理状态字段
      else if (field.fieldName === 'status') {
        generatedColumns.push({
          title: field.displayName,
          dataIndex: field.fieldName,
          key: field.fieldName,
          render: (status) => (
            <span style={{ color: statusMap[status]?.color || 'black' }}>
              {statusMap[status]?.text || status}
            </span>
          ),
        });
      }
      // 特殊处理日期字段
      else if (field.fieldType === 'date') {
        generatedColumns.push({
          title: field.displayName,
          dataIndex: field.fieldName,
          key: field.fieldName,
          render: (date) => date ? new Date(date).toLocaleDateString('zh-CN') : '',
        });
      }
      // 普通字段
      else {
        generatedColumns.push({
          title: field.displayName,
          dataIndex: field.fieldName,
          key: field.fieldName,
        });
      }
    });
    
    // 添加操作列
    generatedColumns.push({
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="primary" icon={<EditOutlined />} onClick={() => showModal(record)} size="small">
            编辑
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.deviceId)} size="small">
            删除
          </Button>
        </Space>
      ),
    });
    
    return generatedColumns;
  }, [deviceFields]);

  return (
    <div>
      <Card title="设备管理" extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          添加设备
        </Button>
      }>
        <Table
          columns={columns}
          dataSource={devices}
          rowKey="deviceId"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingDevice ? '编辑设备' : '添加设备'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {/* 动态生成表单字段 */}
          {deviceFields.map(field => {
            // 根据字段类型生成表单控件
            let control = null;
            
            switch (field.fieldType) {
              case 'text':
              case 'string':
                control = <Input placeholder={`请输入${field.displayName}`} />;
                break;
              case 'number':
                control = <InputNumber placeholder={`请输入${field.displayName}`} min={0} style={{ width: '100%' }} />;
                break;
              case 'boolean':
                control = <Switch />;
                break;
              case 'date':
                control = <DatePicker style={{ width: '100%' }} placeholder={`请选择${field.displayName}`} />;
                break;
              case 'textarea':
                control = <Input.TextArea placeholder={`请输入${field.displayName}`} rows={3} />;
                break;
              case 'select':
                // 特殊处理机柜选择
                if (field.fieldName === 'rackId') {
                  control = (
                    <Select placeholder={`请选择${field.displayName}`}>
                      {racks.map(rack => (
                        <Option key={rack.rackId} value={rack.rackId}>
                          {rack.name} ({rack.rackId})
                        </Option>
                      ))}
                    </Select>
                  );
                } else {
                  control = (
                    <Select placeholder={`请选择${field.displayName}`}>
                      {field.options && field.options.map(option => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  );
                }
                break;
              default:
                control = <Input placeholder={`请输入${field.displayName}`} />;
            }

            return (
              <Form.Item
                key={field.fieldName}
                name={field.fieldName}
                label={field.displayName}
                rules={field.required ? [{ required: true, message: `请输入${field.displayName}` }] : []}
              >
                {control}
              </Form.Item>
            );
          })}

          {/* 自定义字段区域 */}
          <Form.Item label="自定义字段">
            <div>
              {/* 添加自定义字段 */}
              <Space style={{ marginBottom: 16 }}>
                <Input 
                  placeholder="字段名称" 
                  value={customFieldName}
                  onChange={(e) => setCustomFieldName(e.target.value)}
                  style={{ width: 150 }}
                />
                <Input 
                  placeholder="字段值" 
                  value={customFieldValue}
                  onChange={(e) => setCustomFieldValue(e.target.value)}
                  style={{ width: 150 }}
                />
                <Button 
                  type="primary"
                  onClick={() => {
                    if (customFieldName && customFieldValue) {
                      const currentCustomFields = form.getFieldValue('customFields') || {};
                      form.setFieldValue('customFields', {
                        ...currentCustomFields,
                        [customFieldName]: customFieldValue
                      });
                      setCustomFieldName('');
                      setCustomFieldValue('');
                    }
                  }}
                >
                  添加字段
                </Button>
              </Space>
              
              {/* 显示自定义字段 */}
              <div>
                {Object.entries(form.getFieldValue('customFields') || {}).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: 8, fontWeight: 'bold' }}>{key}:</span>
                    <span style={{ marginRight: 16 }}>{value}</span>
                    <Button 
                      danger 
                      size="small"
                      onClick={() => {
                        const currentCustomFields = { ...form.getFieldValue('customFields') };
                        delete currentCustomFields[key];
                        form.setFieldValue('customFields', currentCustomFields);
                      }}
                    >
                      删除
                    </Button>
                  </div>
                ))}
              </div>
            </div>
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

export default DeviceManagement;