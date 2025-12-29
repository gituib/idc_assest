import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Card, Space, InputNumber, Switch, Upload, Progress, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UploadOutlined, DownloadOutlined, SettingOutlined, UndoOutlined, CloudServerOutlined, SwapOutlined, SafetyOutlined, DatabaseOutlined, AppstoreOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

// 工具函数提取到组件外部，避免每次渲染重复创建
const getStatusConfig = (status) => {
  const statusMap = {
    running: { text: '运行中', color: 'green' },
    maintenance: { text: '维护中', color: 'orange' },
    offline: { text: '离线', color: 'gray' },
    fault: { text: '故障', color: 'red' }
  };
  return statusMap[status] || { text: status, color: 'black' };
};

const getTypeLabel = (type) => {
  const typeMap = {
    server: '服务器',
    switch: '交换机',
    router: '路由器',
    storage: '存储设备',
    other: '其他设备'
  };
  return typeMap[type] || type;
};

const getDeviceTypeIcon = (type) => {
  const iconMap = {
    server: <CloudServerOutlined style={{ color: '#1890ff' }} />,
    switch: <SwapOutlined style={{ color: '#52c41a' }} />,
    router: <SafetyOutlined style={{ color: '#faad14' }} />,
    storage: <DatabaseOutlined style={{ color: '#722ed1' }} />,
    other: <AppstoreOutlined style={{ color: '#8c8c8c' }} />
  };
  return iconMap[type] || <AppstoreOutlined style={{ color: '#8c8c8c' }} />;
};

// 格式化日期
const formatDate = (date, fieldName) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('zh-CN');
  
  if (fieldName === 'warrantyExpiry') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);
    
    if (dateObj < today) {
      return <span style={{ color: '#d93025', fontWeight: 'bold' }}>{formattedDate}</span>;
    }
  }
  
  return formattedDate;
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

// 可调整列宽的表头组件
const ResizeableTitle = (props) => {
  const { onResize, width, ...restProps } = props;
  
  if (!width) {
    return <th {...restProps} />;
  }
  
  const handleMouseDown = (e) => {
    if (!onResize) return;
    
    const startX = e.pageX;
    const startWidth = width;
    
    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.pageX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      onResize(newWidth);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  return (
    <th
      {...restProps}
      style={{
        position: 'relative',
        width: width,
        maxWidth: width,
        minWidth: width,
        ...restProps.style,
      }}
    >
      {restProps.children}
      <div
        style={{
          position: 'absolute',
          right: '-3px',
          top: 0,
          bottom: 0,
          width: '6px',
          cursor: 'col-resize',
          backgroundColor: 'transparent',
          zIndex: 10,
        }}
        onMouseDown={handleMouseDown}
        title="拖拽调整列宽"
      />
    </th>
  );
};

function DeviceManagement() {
  const [devices, setDevices] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [racks, setRacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [form] = Form.useForm();
  // 搜索和筛选状态
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [searchForm] = Form.useForm();
  // 分页状态
  const [pagination, setPagination] = useState({ 
    current: 1, 
    pageSize: 10, 
    total: 0,
    pageSizeOptions: ['10', '20', '30', '50', '100'],
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条记录`
  });
  
  // 设备字段配置
  const [deviceFields, setDeviceFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);
  // 导入状态
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // 自定义字段状态
  const [customFieldName, setCustomFieldName] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');

  // 字段配置模态框
  const [fieldConfigModalVisible, setFieldConfigModalVisible] = useState(false);
  
  // 列宽状态
  const [columnWidths, setColumnWidths] = useState({});

  // 获取所有设备数据（不分页，用于本地搜索）
  const fetchAllDevices = async () => {
    try {
      const response = await axios.get('/api/devices', { 
        params: { page: 1, pageSize: 99999 } 
      });
      const { devices } = response.data;
      
      // 将customFields中的字段值映射为设备对象的直接属性
      const processedDevices = devices.map(device => {
        const deviceWithFields = { ...device };
        
        // 如果有自定义字段，将其展开为设备对象的直接属性
        if (device.customFields && typeof device.customFields === 'object') {
          Object.entries(device.customFields).forEach(([fieldName, value]) => {
            deviceWithFields[fieldName] = value;
          });
        }
        
        return deviceWithFields;
      });
      
      return processedDevices;
    } catch (error) {
      console.error('获取所有设备数据失败:', error);
      return [];
    }
  };

  // 获取所有设备（支持搜索、筛选和分页）
  const fetchDevices = async (page = 1, pageSize = 10, searchParams = {}) => {
    try {
      setLoading(true);
      
      // 先获取所有设备数据
      const allData = await fetchAllDevices();
      setAllDevices(allData);
      
      // 应用筛选条件
      let filteredDevices = allData;
      
      // 状态筛选
      const searchStatus = searchParams.status || status;
      if (searchStatus && searchStatus !== 'all') {
        filteredDevices = filteredDevices.filter(device => device.status === searchStatus);
      }
      
      // 类型筛选
      const searchType = searchParams.type || type;
      if (searchType && searchType !== 'all') {
        filteredDevices = filteredDevices.filter(device => device.type === searchType);
      }
      
      // 关键词搜索
      const searchKeyword = searchParams.keyword || keyword;
      if (searchKeyword && searchKeyword.trim()) {
        filteredDevices = searchDevices(filteredDevices, searchKeyword);
      }
      
      setDevices(filteredDevices);
      setPagination(prev => ({ ...prev, current: page, pageSize, total: filteredDevices.length }));
    } catch (error) {
      message.error('获取设备列表失败');
      console.error('获取设备列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 全字段搜索函数
  const searchDevices = (devices, keyword) => {
    if (!keyword || !keyword.trim()) {
      return devices;
    }
    
    const searchTerm = keyword.toLowerCase().trim();
    
    return devices.filter(device => {
      // 搜索设备对象的所有属性值（包括自定义字段）
      const allFieldValues = Object.values(device).filter(value => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'object') return false;
        return true;
      });
      
      // 搜索嵌套对象中的值（Rack、Room等）
      if (device.Rack?.name) allFieldValues.push(device.Rack.name);
      if (device.Rack?.Room?.name) allFieldValues.push(device.Rack.Room.name);
      
      // 搜索自定义字段的值
      if (device.customFields && typeof device.customFields === 'object') {
        Object.values(device.customFields).forEach(value => {
          if (value !== null && value !== undefined && typeof value !== 'object') {
            allFieldValues.push(value);
          }
        });
      }
      
      return allFieldValues.some(value => {
        return String(value).toLowerCase().includes(searchTerm);
      });
    });
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
      // 现在API返回的格式是 { racks: [], total: number }
      setRacks(response.data.racks || []);
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
      
      // 定义设备模型的固定字段
      const fixedFields = [
        'deviceId', 'name', 'type', 'model', 'serialNumber', 'rackId',
        'position', 'height', 'powerConsumption', 'status', 'purchaseDate',
        'warrantyExpiry', 'ipAddress', 'description'
      ];
      
      // 定义需要排除的系统字段
      const systemFields = ['createdAt', 'updatedAt', 'Rack', 'Room', 'customFields'];
      
      // 创建一个干净的设备数据对象
      const cleanDeviceData = {};
      
      // 复制固定字段
      fixedFields.forEach(field => {
        if (deviceData[field] !== undefined) {
          cleanDeviceData[field] = deviceData[field];
        }
      });
      
      // 将自定义字段直接添加到表单数据中（不在customFields对象内）
      Object.entries(deviceData).forEach(([key, value]) => {
        // 排除固定字段、系统字段和非基本类型的值
        if (!fixedFields.includes(key) && 
            !systemFields.includes(key) && 
            key !== 'deviceId' &&
            typeof value !== 'object' &&
            value !== null) {
          cleanDeviceData[key] = value;
        }
      });
      
      // 如果有原始customFields对象，将其字段也添加到表单数据中
      if (deviceData.customFields && typeof deviceData.customFields === 'object') {
        Object.entries(deviceData.customFields).forEach(([key, value]) => {
          cleanDeviceData[key] = value;
        });
      }
      
      form.setFieldsValue(cleanDeviceData);
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
      
      // 构建最终的设备数据，包含固定字段和自定义字段
      const deviceData = {
        ...values,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null,
        warrantyExpiry: values.warrantyExpiry ? values.warrantyExpiry.format('YYYY-MM-DD') : null,
        customFields: {} // 用于存储自定义字段
      };
      
      // 分离固定字段和自定义字段
      Object.keys(deviceData).forEach(key => {
        if (!fixedFields.includes(key) && key !== 'customFields') {
          // 将非固定字段移动到customFields对象中
          deviceData.customFields[key] = deviceData[key];
          delete deviceData[key];
        }
      });

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

  // 搜索处理函数
  const handleSearch = (values) => {
    setKeyword(values.keyword || '');
    setStatus(values.status || 'all');
    setType(values.type || 'all');
    
    // 本地全字段搜索
    const filteredDevices = searchDevices(allDevices, values.keyword || '');
    
    // 状态筛选
    let finalDevices = filteredDevices;
    if (values.status && values.status !== 'all') {
      finalDevices = finalDevices.filter(device => device.status === values.status);
    }
    
    // 类型筛选
    if (values.type && values.type !== 'all') {
      finalDevices = finalDevices.filter(device => device.type === values.type);
    }
    
    setDevices(finalDevices);
    setPagination(prev => ({ ...prev, current: 1, total: finalDevices.length }));
  };

  // 重置筛选条件
  const handleReset = () => {
    setKeyword('');
    setStatus('all');
    setType('all');
    searchForm.resetFields();
    setDevices(allDevices);
    setPagination(prev => ({ ...prev, current: 1, total: allDevices.length }));
  };

  // 表格分页变化处理
  const handleTableChange = (pagination) => {
    setPagination(pagination);
    fetchDevices(pagination.current, pagination.pageSize);
  };

  // 批量下线设备
  const handleBatchOffline = async () => {
    Modal.confirm({
      title: '批量下线确认',
      content: `确定要将选中的 ${selectedDevices.length} 个设备下线吗？`,
      okText: '确认下线',
      okType: 'primary',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await axios.put('/api/devices/batch-offline', {
            deviceIds: selectedDevices
          });
          message.success(response.data.message || '批量下线成功');
          setSelectedDevices([]);
          setSelectAll(false);
          fetchDevices();
        } catch (error) {
          message.error('批量下线失败');
          console.error('批量下线设备失败:', error);
        }
      }
    });
  };

  // 批量删除设备
  const handleBatchDelete = async () => {
    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedDevices.length} 个设备吗？此操作不可恢复！`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await axios.delete('/api/devices/batch-delete', {
            data: { deviceIds: selectedDevices }
          });
          message.success(response.data.message || '批量删除成功');
          setSelectedDevices([]);
          setSelectAll(false);
          fetchDevices();
        } catch (error) {
          message.error('批量删除失败');
          console.error('批量删除设备失败:', error);
        }
      }
    });
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

  // 显示设备详情
  const handleShowDetail = (device) => {
    setSelectedDevice(device);
    setDetailModalVisible(true);
  };

  // 导出设备数据
  const handleExport = async () => {
    try {
      if (selectedDevices.length === 0) {
        message.warning('请先选择要导出的设备');
        return;
      }
      
      const params = new URLSearchParams();
      selectedDevices.forEach(id => params.append('deviceIds', id));
      
      const response = await axios.get(`/api/devices/export?${params.toString()}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv; charset=gbk' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `devices_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
      console.error('导出设备失败:', error);
    }
  };





  // 导入设备数据
  const handleImport = async (file) => {
    try {
      setIsImporting(true);
      setImportProgress(0);
      setImportPhase('正在上传文件...');
      setImportResult(null);
      
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const response = await axios.post('/api/devices/import', formData, {
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
      
      setImportResult(response.data);
      setImportProgress(100);
      setImportPhase('导入完成');
      setIsImporting(false);
      
      const { success, failed } = response.data.statistics;
      if (failed > 0) {
        message.warning(`导入完成，但有 ${failed} 条记录导入失败`);
      } else {
        message.success('所有记录导入成功');
      }
      
      setTimeout(() => {
        fetchDevices();
      }, 1000);
      
    } catch (error) {
      setIsImporting(false);
      setImportProgress(0);
      
      let errorMessage = '导入失败';
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
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setImportResult({
        success: false,
        statistics: {
          total: 0,
          success: 0,
          failed: 0,
          errors: errorDetails,
          message: errorMessage
        }
      });
      
      message.error(errorMessage);
      console.error('导入设备失败:', error);
    }
    
    return false;
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

  // 获取设备类型图标
  const getDeviceTypeIcon = (type) => {
    const iconMap = {
      server: <CloudServerOutlined style={{ color: '#1890ff' }} />,
      switch: <SwapOutlined style={{ color: '#52c41a' }} />,
      router: <SafetyOutlined style={{ color: '#faad14' }} />,
      storage: <DatabaseOutlined style={{ color: '#722ed1' }} />,
      other: <AppstoreOutlined style={{ color: '#8c8c8c' }} />
    };
    return iconMap[type] || <AppstoreOutlined style={{ color: '#8c8c8c' }} />;
  };

  // 处理列宽变化
  const handleColumnResize = (key, width) => {
    setColumnWidths(prev => ({ ...prev, [key]: width }));
  };
  
  // 重置列宽到默认值
  const resetColumnWidths = () => {
    setColumnWidths({});
    message.success('列宽已重置为默认值');
  };
  
  // 处理表头单元格拖拽
  const handleHeaderCellResize = (key) => (column) => ({
    width: column.width,
    onResize: (width) => handleColumnResize(key, width),
  });

  
  // 动态生成表格列配置
  const columns = React.useMemo(() => {
    const generatedColumns = [];
    
    // 根据字段配置动态生成列，只显示visible为true的字段
    deviceFields.forEach(field => {
      // 只处理可见字段
      if (!field.visible) return;
      
      // 特殊处理机柜字段
      if (field.fieldName === 'rackId') {
        // 添加机房信息列
        generatedColumns.push({
          title: '所在机房',
          dataIndex: ['Rack', 'Room', 'name'],
          key: 'roomName',
          width: columnWidths.roomName || 120,
          onHeaderCell: handleHeaderCellResize('roomName'),
        });
        // 添加机柜信息列
        generatedColumns.push({
          title: field.displayName,
          dataIndex: ['Rack', 'name'],
          key: field.fieldName,
          width: columnWidths[field.fieldName] || 120,
          onHeaderCell: handleHeaderCellResize(field.fieldName),
        });
      } 
      // 特殊处理设备类型
      else if (field.fieldName === 'type') {
        generatedColumns.push({
          title: field.displayName,
          dataIndex: field.fieldName,
          key: field.fieldName,
          width: columnWidths[field.fieldName] || 100,
          onHeaderCell: handleHeaderCellResize(field.fieldName),
          render: (type) => {
            return (
              <Space>
                {getDeviceTypeIcon(type)}
                <span>{typeMap[type]}</span>
              </Space>
            );
          },
        });
      }
      // 特殊处理状态字段
      else if (field.fieldName === 'status') {
        generatedColumns.push({
          title: field.displayName,
          dataIndex: field.fieldName,
          key: field.fieldName,
          width: columnWidths[field.fieldName] || 100,
          onHeaderCell: handleHeaderCellResize(field.fieldName),
          render: (status) => {
            if (Array.isArray(status)) {
              return (
                <Space>
                  {status.map(s => (
                    <span key={s} style={{ color: statusMap[s]?.color || 'black' }}>
                      {statusMap[s]?.text || s}
                    </span>
                  ))}
                </Space>
              );
            }
            return (
              <span style={{ color: statusMap[status]?.color || 'black' }}>
                {statusMap[status]?.text || status}
              </span>
            );
          },
        });
      }
      // 特殊处理日期字段
      else if (field.fieldType === 'date') {
        generatedColumns.push({
          title: field.displayName,
          dataIndex: field.fieldName,
          key: field.fieldName,
          width: columnWidths[field.fieldName] || 120,
          onHeaderCell: handleHeaderCellResize(field.fieldName),
          render: (date) => {
            if (!date) return '';
            
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('zh-CN');
            
            // 检查是否是保修到期字段
            if (field.fieldName === 'warrantyExpiry') {
              const today = new Date();
              // 设置时间为同一天的00:00:00，确保只比较日期部分
              today.setHours(0, 0, 0, 0);
              dateObj.setHours(0, 0, 0, 0);
              
              // 如果保修日期已过期，显示为红色
              if (dateObj < today) {
                return <span style={{ color: '#d93025', fontWeight: 'bold' }}>{formattedDate}</span>;
              }
            }
            
            return formattedDate;
          },
        });
      }
      // 普通字段
      else {
        // 为不同类型的字段设置不同的默认宽度
        let defaultWidth = 120;
        if (field.fieldName === 'deviceId' || field.fieldName === 'name') {
          defaultWidth = 150;
        } else if (field.fieldName === 'description') {
          defaultWidth = 200;
        } else if (field.fieldType === 'number') {
          defaultWidth = 80;
        } else if (field.fieldType === 'textarea') {
          defaultWidth = 180;
        }
        
        // 为设备名称和ID列添加点击查看详情功能
        const columnConfig = {
          title: field.displayName,
          dataIndex: field.fieldName,
          key: field.fieldName,
          width: columnWidths[field.fieldName] || defaultWidth,
          onHeaderCell: handleHeaderCellResize(field.fieldName),
        };
        
        // 设备名称和ID列添加点击效果
        if (field.fieldName === 'deviceId' || field.fieldName === 'name') {
          columnConfig.render = (value, record) => (
            <a 
              onClick={() => handleShowDetail(record)}
              style={{ 
                color: '#1890ff', 
                textDecoration: 'none',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              {value || '-'}
            </a>
          );
        }
        
        generatedColumns.push(columnConfig);
      }
    });
    
    // 添加操作列
    generatedColumns.push({
      title: '操作',
      key: 'action',
      width: columnWidths.action || 120,
      onHeaderCell: handleHeaderCellResize('action'),
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
  }, [deviceFields, columnWidths]);

  // 保存字段配置
  const handleSaveFieldConfig = async (values) => {
    try {
      // 更新设备字段配置的可见性
      const updatedFields = deviceFields.map(field => ({
        ...field,
        visible: values[field.fieldName]
      }));
      
      // 保存到后端
      await axios.post('/api/deviceFields/config', updatedFields);
      
      // 更新本地状态
      setDeviceFields(updatedFields);
      message.success('字段配置保存成功');
      setFieldConfigModalVisible(false);
    } catch (error) {
      message.error('字段配置保存失败');
      console.error('保存字段配置失败:', error);
    }
  };

  // 重置字段配置为默认值
  const handleResetFieldConfig = () => {
    const defaultFields = defaultDeviceFields;
    setDeviceFields(defaultFields);
    message.success('字段配置已重置为默认值');
  };

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

  const searchCardStyle = {
    borderRadius: '12px',
    border: '1px solid #f0f0f0',
    background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)',
    marginBottom: '20px'
  };

  const modalHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: '600'
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={pageHeaderStyle}>
        <h1 style={titleStyle}>
          <CloudServerOutlined style={{ marginRight: '12px' }} />
          设备管理
        </h1>
        <Space size={12}>
          <Button
            style={primaryButtonStyle}
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            添加设备
          </Button>
          <Button
            style={secondaryButtonStyle}
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            导出设备
          </Button>
          <Button
            style={secondaryButtonStyle}
            icon={<UploadOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            导入设备
          </Button>
          <Button
            style={secondaryButtonStyle}
            icon={<SettingOutlined />}
            onClick={() => setFieldConfigModalVisible(true)}
          >
            字段配置
          </Button>
          <Button
            style={secondaryButtonStyle}
            icon={<UndoOutlined />}
            onClick={resetColumnWidths}
            title="重置列宽"
          >
            重置列宽
          </Button>
          <Button
            style={{
              ...secondaryButtonStyle,
              color: selectedDevices.length > 0 ? '#1890ff' : undefined,
              borderColor: selectedDevices.length > 0 ? '#1890ff' : undefined
            }}
            icon={<SwapOutlined />}
            disabled={selectedDevices.length === 0}
            onClick={handleBatchOffline}
          >
            一键下线 ({selectedDevices.length})
          </Button>
          <Button
            style={{
              ...secondaryButtonStyle,
              color: selectedDevices.length > 0 ? '#ff4d4f' : undefined,
              borderColor: selectedDevices.length > 0 ? '#ff4d4f' : undefined
            }}
            danger
            icon={<DeleteOutlined />}
            disabled={selectedDevices.length === 0}
            onClick={handleBatchDelete}
          >
            一键删除 ({selectedDevices.length})
          </Button>
        </Space>
      </div>

      <Card size="small" style={searchCardStyle} bodyStyle={{ padding: '16px 20px' }}>
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          style={{ width: '100%' }}
        >
          <Form.Item name="keyword">
            <Input
              placeholder="搜索设备ID、名称、类型、型号、序列号、IP、描述..."
              prefix={<SearchOutlined style={{ color: '#667eea' }} />}
              style={{ 
                width: 320,
                borderRadius: '8px',
                border: '1px solid #d9d9d9'
              }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Form.Item>
          
          <Form.Item name="status">
            <Select
              value={status}
              onChange={setStatus}
              style={{ width: 150, borderRadius: '8px' }}
            >
              <Option value="all">所有状态</Option>
              <Option value="running">运行中</Option>
              <Option value="maintenance">维护中</Option>
              <Option value="offline">离线</Option>
              <Option value="fault">故障</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="type">
            <Select
              value={type}
              onChange={setType}
              style={{ width: 150, borderRadius: '8px' }}
            >
              <Option value="all">所有类型</Option>
              <Option value="server">服务器</Option>
              <Option value="switch">交换机</Option>
              <Option value="router">路由器</Option>
              <Option value="storage">存储设备</Option>
              <Option value="other">其他设备</Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                style={primaryButtonStyle}
              >
                搜索
              </Button>
              <Button
                onClick={handleReset}
                style={secondaryButtonStyle}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card style={cardStyle}>
        <Table
          components={{
            header: {
              cell: ResizeableTitle,
            },
          }}
          columns={columns}
          dataSource={devices}
          rowKey="deviceId"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ y: 600, x: 'max-content' }}
          virtual
          rowSelection={{
            selectedRowKeys: selectedDevices,
            onChange: setSelectedDevices,
          }}
        />
      </Card>

      <Modal
        title={
          <div style={modalHeaderStyle}>
            {editingDevice ? <EditOutlined style={{ color: '#667eea' }} /> : <PlusOutlined style={{ color: '#667eea' }} />}
            {editingDevice ? '编辑设备' : '添加设备'}
          </div>
        }
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={700}
        style={{ borderRadius: '16px' }}
        styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }, body: { padding: '24px' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {deviceFields.map(field => {
            let control = null;
            
            switch (field.fieldType) {
              case 'text':
              case 'string':
                control = <Input placeholder={`请输入${field.displayName}`} style={{ borderRadius: '8px' }} />;
                break;
              case 'number':
                control = <InputNumber placeholder={`请输入${field.displayName}`} min={0} style={{ width: '100%', borderRadius: '8px' }} />;
                break;
              case 'boolean':
                control = <Switch />;
                break;
              case 'date':
                control = <DatePicker style={{ width: '100%', borderRadius: '8px' }} placeholder={`请选择${field.displayName}`} />;
                break;
              case 'textarea':
                control = <Input.TextArea placeholder={`请输入${field.displayName}`} rows={3} style={{ borderRadius: '8px' }} />;
                break;
              case 'select':
                if (field.fieldName === 'rackId') {
                  control = (
                    <Select placeholder={`请选择${field.displayName}`} style={{ borderRadius: '8px' }}>
                      {racks.map(rack => (
                        <Option key={rack.rackId} value={rack.rackId}>
                          {rack.name} ({rack.rackId})
                        </Option>
                      ))}
                    </Select>
                  );
                } else {
                  control = (
                    <Select placeholder={`请选择${field.displayName}`} style={{ borderRadius: '8px' }}>
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
                control = <Input placeholder={`请输入${field.displayName}`} style={{ borderRadius: '8px' }} />;
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

          <Form.Item style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={handleCancel} style={secondaryButtonStyle}>取消</Button>
              <Button type="primary" htmlType="submit" style={primaryButtonStyle}>确定</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={modalHeaderStyle}>
            <SettingOutlined style={{ color: '#667eea' }} />
            字段配置
          </div>
        }
        open={fieldConfigModalVisible}
        onCancel={() => setFieldConfigModalVisible(false)}
        footer={null}
        width={600}
        styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }, body: { padding: '24px' } }}
      >
        <Form
          layout="vertical"
          onFinish={handleSaveFieldConfig}
          initialValues={deviceFields.reduce((acc, field) => ({
            ...acc,
            [field.fieldName]: field.visible
          }), {})}
        >
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {deviceFields.map(field => (
                <Form.Item
                  key={field.fieldName}
                  name={field.fieldName}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox style={{ marginBottom: '8px' }}>
                    {field.displayName}
                  </Checkbox>
                </Form.Item>
              ))}
            </div>
          </div>
          
          <Form.Item style={{ textAlign: 'right', marginTop: '20px' }}>
            <Space>
              <Button onClick={() => setFieldConfigModalVisible(false)} style={secondaryButtonStyle}>取消</Button>
              <Button onClick={handleResetFieldConfig} style={secondaryButtonStyle}>重置默认</Button>
              <Button type="primary" htmlType="submit" style={primaryButtonStyle}>保存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={modalHeaderStyle}>
            <UploadOutlined style={{ color: '#667eea' }} />
            导入设备
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
        destroyOnHidden
        styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }, body: { padding: '24px' } }}
      >
        {!isImporting && !importResult ? (
          <div>
            <p style={{ color: '#666', marginBottom: '8px' }}>请上传CSV格式的设备数据文件</p>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: '20px' }}>支持的编码格式：GBK</p>
            
            <div style={{ marginBottom: '20px', padding: '16px', background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
              <p style={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>CSV文件格式要求：</p>
              <ul style={{ paddingLeft: '20px', marginBottom: '10px', color: '#666', fontSize: '13px' }}>
                <li>必填字段：设备ID、设备名称、设备类型、型号、序列号、所在机柜ID、位置(U)、高度(U)、功率(W)、状态、购买日期、保修到期</li>
                <li>可选字段：IP地址、描述</li>
                <li>设备类型：server(服务器)、switch(交换机)、router(路由器)、storage(存储设备)</li>
                <li>状态值：running(运行中)、maintenance(维护中)、offline(离线)、fault(故障)</li>
                <li>日期格式：YYYY-MM-DD (例如：2023-01-01)</li>
              </ul>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <a href="/api/devices/import-template" download="设备导入模板.csv">
                <Button icon={<DownloadOutlined />} style={secondaryButtonStyle}>
                  下载导入模板
                </Button>
              </a>
              <span style={{ color: '#999', fontSize: '12px', marginLeft: '10px' }}>包含示例数据的CSV模板文件</span>
            </div>
            
            <Upload
              name="csvFile"
              accept=".csv"
              showUploadList={false}
              beforeUpload={handleImport}
              maxCount={1}
            >
              <Button type="primary" icon={<UploadOutlined />} block style={primaryButtonStyle}>
                选择CSV文件
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
                <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#333', fontSize: '16px' }}>正在导入设备数据</p>
                <p style={{ margin: 0, color: '#667eea', fontSize: '14px' }}>{importPhase}</p>
              </div>
            </div>
            <Progress 
              percent={importProgress} 
              status="active" 
              strokeColor={{ '0%': '#667eea', '100%': '#764ba2' }}
              format={() => `${importProgress}%`}
            />
          </div>
        ) : importResult?.statistics ? (
              <div>
                <p style={{ marginBottom: '10px', fontWeight: '600' }}>导入完成：</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', color: '#fff', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>{importResult.statistics.total || 0}</div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>总记录数</div>
                  </div>
                  <div style={{ padding: '12px', background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)', borderRadius: '8px', color: '#fff', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>{importResult.statistics.success || 0}</div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>成功</div>
                  </div>
                  <div style={{ padding: '12px', background: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)', borderRadius: '8px', color: '#fff', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>{importResult.statistics.failed || 0}</div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>失败</div>
                  </div>
                </div>
                {(() => {
                  const errors = importResult.statistics?.errors;
                  const hasErrors = Array.isArray(errors) && errors.length > 0;
                  const hasFailedRecords = importResult.statistics?.failed > 0;
                  
                  return (hasErrors || hasFailedRecords) && (
                    <div style={{ marginTop: '20px', maxHeight: 400, overflowY: 'auto', border: '1px solid #ffcccc', borderRadius: '8px', padding: '12px', backgroundColor: '#fff7f7' }}>
                      <h4 style={{ color: '#d93025', marginBottom: '12px', fontWeight: '600' }}>失败记录详情：</h4>
                      
                      {hasErrors ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#ffeeee' }}>
                              <th style={{ border: '1px solid #ffcccc', padding: '8px', textAlign: 'left', width: '80px' }}>行号</th>
                              <th style={{ border: '1px solid #ffcccc', padding: '8px', textAlign: 'left' }}>失败原因</th>
                            </tr>
                          </thead>
                          <tbody>
                            {errors.map((item, index) => (
                              <tr key={index} style={{ borderBottom: '1px solid #ffcccc' }}>
                                <td style={{ border: '1px solid #ffcccc', padding: '8px', fontWeight: 'bold' }}>{item.row || index + 1}</td>
                                <td style={{ border: '1px solid #ffcccc', padding: '8px', color: '#d93025' }}>{item.error || '未知错误'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div style={{ color: '#d93025', padding: '20px', textAlign: 'center' }}>
                          检测到 {importResult.statistics.failed} 条导入失败记录，但未提供详细错误信息
                        </div>
                      )}
                    </div>
                  );
                })()}
                <Button type="primary" onClick={() => {
                  setImportModalVisible(false);
                  setImportProgress(0);
                  setImportResult(null);
                  setIsImporting(false);
                  fetchDevices();
                }} style={{ marginTop: '20px', ...primaryButtonStyle, height: '40px' }}>
                  确定
                </Button>
              </div>
            ) : null}
      </Modal>

      <Modal
        title={
          <div style={modalHeaderStyle}>
            <AppstoreOutlined style={{ color: '#667eea' }} />
            设备详情
          </div>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedDevice(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false);
            setSelectedDevice(null);
          }} style={secondaryButtonStyle}>
            关闭
          </Button>,
          <Button key="edit" type="primary" onClick={() => {
            setDetailModalVisible(false);
            showModal(selectedDevice);
          }} style={primaryButtonStyle}>
            编辑
          </Button>
        ]}
        width={800}
        destroyOnHidden
        styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }, body: { padding: '24px' } }}
      >
        {selectedDevice && (
          <div>
            <Card 
              size="small" 
              title={
                <span style={{ fontWeight: '600' }}>
                  <CloudServerOutlined style={{ marginRight: '8px', color: '#667eea' }} />
                  基本信息
                </span>
              }
              style={{ borderRadius: '12px', border: '1px solid #f0f0f0' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>设备ID：</label>
                  <span style={{ marginLeft: 8, color: '#333' }}>{selectedDevice.deviceId || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>设备名称：</label>
                  <span style={{ marginLeft: 8, color: '#333' }}>{selectedDevice.name || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>设备类型：</label>
                  <span style={{ marginLeft: 8 }}>
                    {selectedDevice.type ? (
                      <Space>
                        {getDeviceTypeIcon(selectedDevice.type)}
                        <span>{typeMap[selectedDevice.type] || selectedDevice.type}</span>
                      </Space>
                    ) : '-'}
                  </span>
                </div>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>型号：</label>
                  <span style={{ marginLeft: 8, color: '#333' }}>{selectedDevice.model || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>序列号：</label>
                  <span style={{ marginLeft: 8, color: '#333' }}>{selectedDevice.serialNumber || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>IP地址：</label>
                  <span style={{ marginLeft: 8, color: '#333' }}>{selectedDevice.ipAddress || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>所在机房：</label>
                  <span style={{ marginLeft: 8, color: '#333' }}>{selectedDevice.Rack?.Room?.name || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>所在机柜：</label>
                  <span style={{ marginLeft: 8, color: '#333' }}>{selectedDevice.Rack?.name || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>位置：</label>
                  <span style={{ marginLeft: 8, color: '#333' }}>{selectedDevice.position || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>高度(U)：</label>
                  <span style={{ marginLeft: 8, color: '#333' }}>{selectedDevice.height || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>功率(W)：</label>
                  <span style={{ marginLeft: 8, color: '#333' }}>{selectedDevice.power || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>状态：</label>
                  <span style={{ 
                    marginLeft: 8, 
                    color: selectedDevice.status ? statusMap[selectedDevice.status]?.color : '#666',
                    fontWeight: '600'
                  }}>
                    {selectedDevice.status ? statusMap[selectedDevice.status]?.text || selectedDevice.status : '-'}
                  </span>
                </div>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>购买日期：</label>
                  <span style={{ marginLeft: 8, color: '#333' }}>
                    {selectedDevice.purchaseDate ? new Date(selectedDevice.purchaseDate).toLocaleDateString('zh-CN') : '-'}
                  </span>
                </div>
                <div>
                  <label style={{ fontWeight: '500', color: '#666' }}>保修到期：</label>
                  <span style={{ 
                    marginLeft: 8, 
                    color: selectedDevice.warrantyExpiry && new Date(selectedDevice.warrantyExpiry) < new Date() ? '#d93025' : '#333',
                    fontWeight: selectedDevice.warrantyExpiry && new Date(selectedDevice.warrantyExpiry) < new Date() ? '600' : 'normal'
                  }}>
                    {selectedDevice.warrantyExpiry ? new Date(selectedDevice.warrantyExpiry).toLocaleDateString('zh-CN') : '-'}
                  </span>
                </div>
              </div>
              {selectedDevice.description && (
                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontWeight: '500', color: '#666' }}>描述：</label>
                  <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#fafafa', borderRadius: '8px', color: '#333' }}>
                    {selectedDevice.description}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default DeviceManagement;