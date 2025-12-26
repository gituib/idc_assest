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
  // 导入导出状态
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
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

  // 获取所有设备（支持搜索、筛选和分页）
  const fetchDevices = async (page = 1, pageSize = 10, searchParams = {}) => {
    try {
      setLoading(true);
      
      // 构建查询参数
      const params = {
        page,
        pageSize,
        keyword: searchParams.keyword || keyword,
        status: searchParams.status || status,
        type: searchParams.type || type
      };
      
      const response = await axios.get('/api/devices', { params });
      const { devices, total } = response.data;
      
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
      
      setDevices(processedDevices);
      setPagination(prev => ({ ...prev, current: page, pageSize, total }));
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
    fetchDevices(1, 10, values);
  };

  // 重置筛选条件
  const handleReset = () => {
    setKeyword('');
    setStatus('all');
    setType('all');
    searchForm.resetFields();
    fetchDevices(1, pagination.pageSize, { keyword: '', status: 'all', type: 'all' });
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
      setImportResult(null);
      
      const formData = new FormData();
      formData.append('csvFile', file);
      
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
      
      const response = await axios.post('/api/devices/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(response.data);
      setIsImporting(false);
      
      // 根据导入结果显示不同的消息
      const { success, failed } = response.data.statistics;
      if (failed > 0) {
        message.warning(`导入完成，但有 ${failed} 条记录导入失败`);
      } else {
        message.success('所有记录导入成功');
      }
      
      // 重新加载设备列表
      setTimeout(() => {
        fetchDevices();
      }, 1000);
      
    } catch (error) {
      setIsImporting(false);
      message.error('导入失败');
      console.error('导入设备失败:', error);
    }
    
    // 阻止默认上传行为
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

  return (
    <div>
      <Card title="设备管理" extra={
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>添加设备</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出设备</Button>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalVisible(true)}>导入设备</Button>
          <Button icon={<SettingOutlined />} onClick={() => setFieldConfigModalVisible(true)}>字段配置</Button>
          <Button 
            icon={<UndoOutlined />} 
            onClick={resetColumnWidths}
            title="重置列宽"
          >
            重置列宽
          </Button>
          <Button 
            type="primary" 
            danger={false} 
            disabled={selectedDevices.length === 0} 
            onClick={handleBatchOffline}
          >
            一键下线 ({selectedDevices.length})
          </Button>
          <Button 
            type="primary" 
            danger 
            disabled={selectedDevices.length === 0} 
            onClick={handleBatchDelete}
          >
            一键删除 ({selectedDevices.length})
          </Button>
        </Space>
      }>

        {/* 搜索和筛选区域 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Form
            form={searchForm}
            layout="inline"
            onFinish={handleSearch}
            style={{ width: '100%' }}
          >
            <Form.Item name="keyword">
              <Input
                placeholder="搜索设备ID、名称、类型、型号、序列号、IP、描述..."
                prefix={<SearchOutlined />}
                style={{ width: 300 }}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </Form.Item>
            
            <Form.Item name="status">
              <Select
                value={status}
                onChange={setStatus}
                style={{ width: 150 }}
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
                style={{ width: 150 }}
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
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                  搜索
                </Button>
                <Button onClick={handleReset}>
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
        


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
                // 特殊处理机柜选择（仍然使用单选）
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
                  // 设备类型等使用单选select
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

      {/* 导入设备模态框 */}
      {/* 字段配置模态框 */}
      <Modal
        title="字段配置"
        open={fieldConfigModalVisible}
        onCancel={() => setFieldConfigModalVisible(false)}
        footer={null}
        width={600}
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
            {/* 将字段分为多列显示 */}
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
              <Button onClick={() => setFieldConfigModalVisible(false)}>取消</Button>
              <Button onClick={handleResetFieldConfig}>重置默认</Button>
              <Button type="primary" htmlType="submit">保存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="导入设备"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportProgress(0);
          setImportResult(null);
          setIsImporting(false);
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        {!isImporting && !importResult ? (
          <div>
            <p>请上传CSV格式的设备数据文件</p>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: 20 }}>支持的编码格式：GBK</p>
            
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 'bold', marginBottom: 8 }}>CSV文件格式要求：</p>
              <ul style={{ paddingLeft: 20, marginBottom: 10 }}>
                <li>必填字段：设备ID、设备名称、设备类型、型号、序列号、所在机柜ID、位置(U)、高度(U)、功率(W)、状态、购买日期、保修到期</li>
                <li>可选字段：IP地址、描述</li>
                <li>设备类型：server(服务器)、switch(交换机)、router(路由器)、storage(存储设备)</li>
                <li>状态值：running(运行中)、maintenance(维护中)、offline(离线)、fault(故障)</li>
                <li>日期格式：YYYY-MM-DD (例如：2023-01-01)</li>
              </ul>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <a href="/api/devices/import-template" download="设备导入模板.csv">
                <Button icon={<DownloadOutlined />} style={{ marginRight: 10 }}>
                  下载导入模板
                </Button>
              </a>
              <span style={{ color: '#999', fontSize: '12px' }}>包含示例数据的CSV模板文件</span>
            </div>
            
            <Upload
              name="csvFile"
              accept=".csv"
              showUploadList={false}
              beforeUpload={handleImport}
              maxCount={1}
            >
              <Button type="primary" icon={<UploadOutlined />} block>
                选择CSV文件
              </Button>
            </Upload>
          </div>
        ) : (
          <div>
            <p>正在导入数据...</p>
            <Progress percent={importProgress} status="active" style={{ marginBottom: 20 }} />
            {importResult && importResult.statistics && (
              <div>
                <p style={{ marginBottom: 10 }}>导入完成：</p>
                <p>总记录数：{importResult.statistics.total || 0}</p>
                <p>成功：{importResult.statistics.success || 0}</p>
                <p>失败：{importResult.statistics.failed || 0}</p>
                {/* 显示导入失败记录详情表格 */}
                {(() => {
                  // 检查是否有错误记录
                  const errors = importResult.statistics?.errors;
                  const hasErrors = Array.isArray(errors) && errors.length > 0;
                  
                  // 即使没有errors字段，如果failed数量大于0，也应该提示用户
                  const hasFailedRecords = importResult.statistics?.failed > 0;
                  
                  return (hasErrors || hasFailedRecords) && (
                    <div style={{ marginTop: 20, maxHeight: 400, overflowY: 'auto', border: '1px solid #ffcccc', borderRadius: '4px', padding: '12px', backgroundColor: '#fff7f7' }}>
                      <h4 style={{ color: '#d93025', marginBottom: '12px' }}>失败记录详情：</h4>
                      
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
                }} style={{ marginTop: 20 }}>
                  确定
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 设备详情模态框 */}
      <Modal
        title="设备详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedDevice(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false);
            setSelectedDevice(null);
          }}>
            关闭
          </Button>,
          <Button key="edit" type="primary" onClick={() => {
            setDetailModalVisible(false);
            showModal(selectedDevice);
          }}>
            编辑
          </Button>
        ]}
        width={800}
        destroyOnHidden
      >
        {selectedDevice && (
          <div>
            {/* 基本信息区域 */}
            <Card size="small" title="基本信息">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>设备ID：</label>
                  <span style={{ marginLeft: 8 }}>{selectedDevice.deviceId || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>设备名称：</label>
                  <span style={{ marginLeft: 8 }}>{selectedDevice.name || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>设备类型：</label>
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
                  <label style={{ fontWeight: 'bold', color: '#666' }}>型号：</label>
                  <span style={{ marginLeft: 8 }}>{selectedDevice.model || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>序列号：</label>
                  <span style={{ marginLeft: 8 }}>{selectedDevice.serialNumber || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>IP地址：</label>
                  <span style={{ marginLeft: 8 }}>{selectedDevice.ipAddress || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>所在机房：</label>
                  <span style={{ marginLeft: 8 }}>{selectedDevice.Rack?.Room?.name || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>所在机柜：</label>
                  <span style={{ marginLeft: 8 }}>{selectedDevice.Rack?.name || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>位置：</label>
                  <span style={{ marginLeft: 8 }}>{selectedDevice.position || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>高度(U)：</label>
                  <span style={{ marginLeft: 8 }}>{selectedDevice.height || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>功率(W)：</label>
                  <span style={{ marginLeft: 8 }}>{selectedDevice.power || '-'}</span>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>状态：</label>
                  <span style={{ 
                    marginLeft: 8, 
                    color: selectedDevice.status ? statusMap[selectedDevice.status]?.color : '#666',
                    fontWeight: 'bold'
                  }}>
                    {selectedDevice.status ? statusMap[selectedDevice.status]?.text || selectedDevice.status : '-'}
                  </span>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>购买日期：</label>
                  <span style={{ marginLeft: 8 }}>
                    {selectedDevice.purchaseDate ? new Date(selectedDevice.purchaseDate).toLocaleDateString('zh-CN') : '-'}
                  </span>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>保修到期：</label>
                  <span style={{ 
                    marginLeft: 8, 
                    color: selectedDevice.warrantyExpiry && new Date(selectedDevice.warrantyExpiry) < new Date() ? '#d93025' : '#666',
                    fontWeight: selectedDevice.warrantyExpiry && new Date(selectedDevice.warrantyExpiry) < new Date() ? 'bold' : 'normal'
                  }}>
                    {selectedDevice.warrantyExpiry ? new Date(selectedDevice.warrantyExpiry).toLocaleDateString('zh-CN') : '-'}
                  </span>
                </div>
              </div>
              {selectedDevice.description && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontWeight: 'bold', color: '#666' }}>描述：</label>
                  <div style={{ marginTop: 8, padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
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