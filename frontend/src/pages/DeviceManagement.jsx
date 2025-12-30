import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Card, Space, InputNumber, Switch, Upload, Progress, Checkbox, Spin, Dropdown, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UploadOutlined, DownloadOutlined, SettingOutlined, UndoOutlined, CloudServerOutlined, SafetyOutlined, DatabaseOutlined, AppstoreOutlined, MoreOutlined, ReloadOutlined, ExportOutlined, FileExcelOutlined, SwapOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

// 防抖 Hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

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
  
  // 简单的可调整列宽的表头组件
  const ResizableTitle = (props) => {
    const { children, onResize, width, ...restProps } = props;
    
    const handleMouseDown = (e) => {
      if (!onResize) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const th = e.currentTarget.closest('th');
      if (!th) return;
      
      const startWidth = th.offsetWidth;
      const startX = e.clientX;
      
      const handleMouseMove = (moveEvent) => {
        const diff = moveEvent.clientX - startX;
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
      <th {...restProps} style={{ position: 'relative' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          width: '100%'
        }}>
          <span style={{ 
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>{children}</span>
          {onResize && (
            <div
              onMouseDown={handleMouseDown}
              style={{
                width: '8px',
                height: '20px',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
                cursor: 'col-resize',
                marginLeft: '8px',
                flexShrink: 0
              }}
            />
          )}
        </div>
      </th>
    );
  };

function DeviceManagement() {
  const [devices, setDevices] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [racks, setRacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
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
  
  // 批量状态变更模态框
  const [batchStatusModalVisible, setBatchStatusModalVisible] = useState(false);
  const [batchStatusLoading, setBatchStatusLoading] = useState(false);
  const [batchStatusForm] = Form.useForm();
  
  // 导出选项模态框
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportScope, setExportScope] = useState('selected');
  const [exportFields, setExportFields] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [currentPageDevices, setCurrentPageDevices] = useState([]);
  
  // 全选状态
  const [selectAll, setSelectAll] = useState(false);
  
  // 列宽状态
  const [columnWidths, setColumnWidths] = useState({});

  // 缓存用于搜索的数据（避免重复处理）
  const devicesCacheRef = useRef({
    timestamp: 0,
    data: null,
    TTL: 5 * 60 * 1000 // 缓存5分钟
  });

  // 防抖搜索关键词
  const debouncedKeyword = useDebounce(keyword, 300);

  // 预计算所有设备的搜索索引（提升搜索性能）
  const searchIndexRef = useRef(new Map());

  // 构建设备搜索索引
  const buildSearchIndex = useCallback((devices) => {
    const index = new Map();
    devices.forEach((device, idx) => {
      const searchableValues = [];
      
      // 收集所有基本类型字段值
      Object.entries(device).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        if (typeof value === 'object') {
          // 收集嵌套对象值
          if (device.Rack?.name) searchableValues.push(String(device.Rack.name).toLowerCase());
          if (device.Rack?.Room?.name) searchableValues.push(String(device.Rack.Room.name).toLowerCase());
          // 收集自定义字段值
          if (device.customFields && typeof device.customFields === 'object') {
            Object.values(device.customFields).forEach(cfValue => {
              if (cfValue !== null && cfValue !== undefined && typeof cfValue !== 'object') {
                searchableValues.push(String(cfValue).toLowerCase());
              }
            });
          }
        } else {
          searchableValues.push(String(value).toLowerCase());
        }
      });
      
      index.set(idx, searchableValues);
    });
    return index;
  }, []);

  // 优化的全字段搜索函数
  const searchDevices = useCallback((devices, keyword) => {
    if (!keyword || !keyword.trim()) {
      return devices;
    }
    
    const searchTerm = keyword.toLowerCase().trim();
    
    return devices.filter((device, idx) => {
      // 使用预计算的搜索索引
      let searchableValues = searchIndexRef.current.get(idx);
      
      if (!searchableValues) {
        // 如果没有预计算索引，当场计算并缓存
        searchableValues = [];
        Object.entries(device).forEach(([key, value]) => {
          if (value === null || value === undefined) return;
          if (typeof value === 'object') {
            if (device.Rack?.name) searchableValues.push(String(device.Rack.name).toLowerCase());
            if (device.Rack?.Room?.name) searchableValues.push(String(device.Rack.Room.name).toLowerCase());
            if (device.customFields && typeof device.customFields === 'object') {
              Object.values(device.customFields).forEach(cfValue => {
                if (cfValue !== null && cfValue !== undefined && typeof cfValue !== 'object') {
                  searchableValues.push(String(cfValue).toLowerCase());
                }
              });
            }
          } else {
            searchableValues.push(String(value).toLowerCase());
          }
        });
        searchIndexRef.current.set(idx, searchableValues);
      }
      
      return searchableValues.some(value => value.includes(searchTerm));
    });
  }, []);

  // 获取所有设备数据（不分页，用于本地搜索）- 使用缓存
  const fetchAllDevices = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    const cache = devicesCacheRef.current;
    
    // 检查缓存是否有效
    if (!forceRefresh && cache.data && (now - cache.timestamp) < cache.TTL) {
      return cache.data;
    }
    
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
      
      // 更新缓存
      cache.data = processedDevices;
      cache.timestamp = now;
      
      // 预计算搜索索引
      searchIndexRef.current = buildSearchIndex(processedDevices);
      
      return processedDevices;
    } catch (error) {
      console.error('获取所有设备数据失败:', error);
      return cache.data || [];
    }
  }, [buildSearchIndex]);

  // 使用 useMemo 缓存筛选后的设备数据
  const filteredDevicesMemo = useMemo(() => {
    if (!allDevices.length) return [];
    
    let result = allDevices;
    
    // 状态筛选
    if (status && status !== 'all') {
      result = result.filter(device => device.status === status);
    }
    
    // 类型筛选
    if (type && type !== 'all') {
      result = result.filter(device => device.type === type);
    }
    
    // 关键词搜索（使用防抖后的关键词）
    if (debouncedKeyword && debouncedKeyword.trim()) {
      result = searchDevices(result, debouncedKeyword);
    }
    
    return result;
  }, [allDevices, status, type, debouncedKeyword, searchDevices]);

  // 获取所有设备（支持搜索、筛选和分页）- 使用缓存和useCallback
  const fetchDevices = useCallback(async (page = 1, pageSize = 10, forceRefresh = false) => {
    try {
      setLoading(true);
      
      // 先获取所有设备数据（使用缓存，批量删除后强制刷新）
      const allData = await fetchAllDevices(forceRefresh);
      setAllDevices(allData);
      
      // 更新分页信息（筛选后的数据会通过useMemo自动更新）
      setPagination(prev => ({ ...prev, current: page, pageSize, total: filteredDevicesMemo.length }));
    } catch (error) {
      message.error('获取设备列表失败');
      console.error('获取设备列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchAllDevices, filteredDevicesMemo.length]);

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

  // 同步当前页设备数据
  useEffect(() => {
    if (filteredDevicesMemo.length > 0) {
      const start = (pagination.current - 1) * pagination.pageSize;
      const end = start + pagination.pageSize;
      const currentPageData = filteredDevicesMemo.slice(start, end);
      setCurrentPageDevices(currentPageData);
    } else {
      setCurrentPageDevices([]);
    }
  }, [filteredDevicesMemo, pagination.current, pagination.pageSize]);

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
    setSearching(true);
    
    setKeyword(values.keyword || '');
    setStatus(values.status || 'all');
    setType(values.type || 'all');
    
    // 筛选后的数据会通过useMemo自动更新，这里只需更新分页
    setPagination(prev => ({ ...prev, current: 1 }));
    
    // 短暂延迟后移除搜索状态，提供视觉反馈
    setTimeout(() => setSearching(false), 300);
  };

  // 重置筛选条件
  const handleReset = () => {
    setSearching(true);
    
    setKeyword('');
    setStatus('all');
    setType('all');
    searchForm.resetFields();
    
    // 短暂延迟后移除搜索状态
    setTimeout(() => setSearching(false), 300);
  };

  // 表格分页变化处理
  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
    
    const start = (newPagination.current - 1) * newPagination.pageSize;
    const end = start + newPagination.pageSize;
    const currentPageData = filteredDevicesMemo.slice(start, end);
    setCurrentPageDevices(currentPageData);
    
    fetchDevices(newPagination.current, newPagination.pageSize);
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
          fetchDevices(1, 10, true);
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

  // 打开批量状态变更模态框
  const showBatchStatusModal = () => {
    if (selectedDevices.length === 0) {
      message.warning('请先选择要操作的设备');
      return;
    }
    batchStatusForm.resetFields();
    setBatchStatusModalVisible(true);
  };

  // 执行批量状态变更
  const handleBatchStatusChange = async () => {
    try {
      const values = await batchStatusForm.validateFields();
      setBatchStatusLoading(true);
      
      const response = await axios.put('/api/devices/batch-status', {
        deviceIds: selectedDevices,
        status: values.status
      });
      
      message.success(response.data.message || '批量状态变更成功');
      setBatchStatusModalVisible(false);
      setSelectedDevices([]);
      setSelectAll(false);
      fetchDevices();
    } catch (error) {
      if (error.errorFields) {
        return;
      }
      message.error('批量状态变更失败');
      console.error('批量状态变更失败:', error);
    } finally {
      setBatchStatusLoading(false);
    }
  };

  // 打开导出选项模态框
  const showExportModal = () => {
    if (selectedDevices.length === 0) {
      message.warning('请先选择要导出的设备');
      return;
    }
    setExportFormat('csv');
    setExportFields(deviceFields.filter(f => f.visible && f.fieldName !== 'rackId').map(f => f.fieldName));
    setExportModalVisible(true);
  };

  // 执行增强导出
  const handleEnhancedExport = async () => {
    try {
      setExportLoading(true);
      
      const fieldLabels = {};
      deviceFields.forEach(field => {
        fieldLabels[field.fieldName] = field.displayName;
      });
      
      let deviceIds = [];
      if (exportScope === 'selected') {
        deviceIds = selectedDevices;
      } else if (exportScope === 'currentPage') {
        deviceIds = filteredDevicesMemo.map(device => device.deviceId);
      } else if (exportScope === 'all') {
        deviceIds = allDevices.map(device => device.deviceId);
      }
      
      if (deviceIds.length === 0) {
        message.warning('没有可导出的设备');
        setExportLoading(false);
        return;
      }
      
      const params = new URLSearchParams();
      deviceIds.forEach(id => params.append('deviceIds', id));
      params.append('format', exportFormat);
      params.append('fields', JSON.stringify(exportFields));
      params.append('fieldLabels', JSON.stringify(fieldLabels));
      
      const response = await axios.get(`/api/devices/enhanced-export?${params.toString()}`, { responseType: 'blob' });
      
      const contentType = exportFormat === 'csv' ? 'text/csv; charset=gbk' : 'application/json';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `devices_export_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(`成功导出 ${deviceIds.length} 个设备`);
      setExportModalVisible(false);
    } catch (error) {
      message.error('导出失败');
      console.error('增强导出失败:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // 切换选择全部设备
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDevices([]);
      setSelectAll(false);
    } else {
      const allIds = filteredDevicesMemo.map(device => device.deviceId);
      setSelectedDevices(allIds);
      setSelectAll(true);
    }
  };
  
  // 处理选择变化
  const handleSelectionChange = (selectedRowKeys) => {
    setSelectedDevices(selectedRowKeys);
    setSelectAll(selectedRowKeys.length === filteredDevicesMemo.length && filteredDevicesMemo.length > 0);
  };
  
  // 全选复选框的处理函数
  const handleSelectAllCheckbox = (e) => {
    const checked = e.target.checked;
    if (checked) {
      const allIds = filteredDevicesMemo.map(device => device.deviceId);
      setSelectedDevices(allIds);
      setSelectAll(true);
    } else {
      setSelectedDevices([]);
      setSelectAll(false);
    }
  };
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
  
  // 处理表头单元格拖拽 - 自定义实现
  const handleHeaderCellResize = (key) => (column) => ({
    width: column.width,
    onResize: (width) => {
      setColumnWidths(prev => ({ ...prev, [key]: width }));
    },
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
          minWidth: 80,
          maxWidth: field.fieldType === 'textarea' ? 300 : 200,
          onHeaderCell: handleHeaderCellResize(field.fieldName),
          ellipsis: field.fieldType !== 'textarea',
        };
        
        // 设备名称和ID列添加点击效果
        if (field.fieldName === 'deviceId' || field.fieldName === 'name') {
          columnConfig.render = (value, record) => (
            <a 
              onClick={() => handleShowDetail(record)}
              style={{ 
                color: '#1890ff', 
                textDecoration: 'none',
                cursor: 'pointer',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
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
      width: columnWidths.action || 80,
      minWidth: 60,
      maxWidth: 100,
      onHeaderCell: handleHeaderCellResize('action'),
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => showModal(record)}
              size="small"
              style={{ color: '#1890ff', padding: '4px 8px' }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.deviceId)}
              size="small"
              style={{ padding: '4px 8px' }}
            />
          </Tooltip>
        </div>
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
    gap: '12px'
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
      <style>{`
        /* 表格自适应换行样式 */
        .device-table-wrapper {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        
        .device-table-wrapper .ant-table {
          width: 100% !important;
          max-width: 100% !important;
        }
        
        .device-table-wrapper .ant-table-container {
          width: 100% !important;
          max-width: 100% !important;
          display: flex;
          flex-direction: column;
        }
        
        .device-table-wrapper .ant-table-content {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
        }
        
        .device-table-wrapper .ant-table-thead {
          flex-shrink: 0;
        }
        
        .device-table-wrapper .ant-table-thead > tr > th {
          white-space: normal !important;
          word-break: break-word !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          line-height: 1.4 !important;
          padding: 12px 8px !important;
        }
        
        .device-table-wrapper .ant-table-tbody {
          flex-shrink: 1;
          min-height: 0;
        }
        
        .device-table-wrapper .ant-table-tbody > tr > td {
          white-space: normal !important;
          word-break: break-word !important;
          line-height: 1.6 !important;
          max-width: 250px !important;
          padding: 12px 8px !important;
        }
        
        .device-table-wrapper .ant-table-tbody > tr > td .ant-typography,
        .device-table-wrapper .ant-table-tbody > tr > td .ant-typography-expand,
        .device-table-wrapper .ant-table-tbody > tr > td span {
          white-space: normal !important;
          word-break: break-word !important;
        }
        
        .device-table-wrapper .ant-table-cell {
          word-break: break-word !important;
        }
        
        /* 斑马纹样式 */
        .device-table-wrapper .ant-table-row-even {
          background-color: #fafafa;
        }
        
        .device-table-wrapper .ant-table-row-odd {
          background-color: #ffffff;
        }
        
        .device-table-wrapper .ant-table-row-selected {
          background-color: #e6f7ff !important;
        }
        
        .device-table-wrapper .ant-table-row-selected:hover > td {
          background-color: #bae7ff !important;
        }
        
        /* 表格行悬停效果 */
        .device-table-wrapper .ant-table-tbody > tr:hover > td {
          background-color: #f5f5f5 !important;
        }
        
        /* 复选框列固定 */
        .device-table-wrapper .ant-table-selection-column {
          position: sticky !important;
          left: 0 !important;
          z-index: 2 !important;
          background: inherit !important;
        }
        
        /* 操作列样式 */
        .device-table-wrapper .ant-table-tbody > tr > td:last-child {
          min-width: 120px !important;
          max-width: 150px !important;
        }
        
        /* 分页器样式 */
        .device-table-wrapper .ant-pagination {
          margin: 16px 0 !important;
          flex-wrap: wrap !important;
          justify-content: center !important;
        }
        
        /* 响应式调整 */
        @media screen and (max-width: 768px) {
          .device-table-wrapper .ant-table-tbody > tr > td {
            max-width: 150px !important;
            font-size: 13px !important;
          }
          
          .device-table-wrapper .ant-table-thead > tr > th {
            font-size: 13px !important;
          }
        }
      `}</style>
      
      <div style={pageHeaderStyle}>
        <h1 style={titleStyle}>
          <CloudServerOutlined style={{ marginRight: '12px' }} />
          设备管理
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <Button
            style={primaryButtonStyle}
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            添加设备
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
              color: selectedDevices.length > 0 ? '#52c41a' : undefined,
              borderColor: selectedDevices.length > 0 ? '#52c41a' : undefined
            }}
            icon={<ReloadOutlined />}
            disabled={selectedDevices.length === 0}
            onClick={showBatchStatusModal}
          >
            状态变更 ({selectedDevices.length})
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
            批量删除 ({selectedDevices.length})
          </Button>
        </div>
      </div>

      <Card size="small" style={searchCardStyle} styles={{ body: { padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' } }}>
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          style={{ flex: 1 }}
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
        <Button
          style={{
            ...secondaryButtonStyle,
            color: '#fa8c16',
            borderColor: '#fa8c16',
            whiteSpace: 'nowrap'
          }}
          icon={<ExportOutlined />}
          onClick={showExportModal}
        >
          增强导出
        </Button>
      </Card>

      <Card style={cardStyle}>
        {(!loading && filteredDevicesMemo.length === 0 && !searching) && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px', 
            color: '#999',
            fontSize: '15px'
          }}>
            <SearchOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#d9d9d9' }} />
            <p>暂无设备数据</p>
          </div>
        )}
        {filteredDevicesMemo.length > 0 && (
          <div className="device-table-wrapper">
            <Table
            columns={columns}
            dataSource={filteredDevicesMemo}
            rowKey="deviceId"
            loading={loading || searching}
            pagination={pagination}
            onChange={handleTableChange}
            scroll={{ y: 'calc(100vh - 380px)', scrollToFirstRowOnChange: true }}
            virtual
            components={{
              header: {
                cell: ResizableTitle,
              },
            }}
            style={{ width: '100%', maxWidth: '100%' }}
            size="middle"
            showHeader={filteredDevicesMemo.length > 0}
            rowSelection={{
              selectedRowKeys: selectedDevices,
              onChange: handleSelectionChange,
              columnWidth: 48,
              fixed: 'left',
              type: 'checkbox',
              crossPageSelect: true,
              selections: [
                { key: 'all', text: '全选', onSelect: () => {
                  const allIds = filteredDevicesMemo.map(device => device.deviceId);
                  setSelectedDevices(allIds);
                  setSelectAll(true);
                }},
                { key: 'invert', text: '反选', onSelect: () => {
                  const visibleIds = filteredDevicesMemo.map(device => device.deviceId);
                  const newSelected = visibleIds.filter(id => !selectedDevices.includes(id));
                  setSelectedDevices(newSelected);
                  setSelectAll(newSelected.length === filteredDevicesMemo.length);
                }},
                { key: 'none', text: '清除选择', onSelect: () => {
                  setSelectedDevices([]);
                  setSelectAll(false);
                }},
              ],
            }}
            onRow={(record) => ({
              onClick: () => handleSelectionChange(
                selectedDevices.includes(record.deviceId)
                  ? selectedDevices.filter(id => id !== record.deviceId)
                  : [...selectedDevices, record.deviceId]
              ),
            })}
            rowClassName={(record, index) => {
              if (selectedDevices.includes(record.deviceId)) {
                return 'ant-table-row-selected';
              }
              return index % 2 === 0 ? 'ant-table-row-even' : 'ant-table-row-odd';
            }}
          />
        </div>
        )}
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

      <Modal
        title={
          <div style={modalHeaderStyle}>
            <ReloadOutlined style={{ color: '#52c41a' }} />
            批量状态变更
          </div>
        }
        open={batchStatusModalVisible}
        onCancel={() => setBatchStatusModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setBatchStatusModalVisible(false)} style={secondaryButtonStyle}>
            取消
          </Button>,
          <Button key="submit" type="primary" loading={batchStatusLoading} onClick={handleBatchStatusChange} style={primaryButtonStyle}>
            确定
          </Button>
        ]}
        destroyOnHidden
        styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }, body: { padding: '24px' } }}
      >
        <Form form={batchStatusForm} layout="vertical">
          <Form.Item
            name="status"
            label="选择新状态"
            rules={[{ required: true, message: '请选择设备状态' }]}
          >
            <Select placeholder="请选择设备状态" style={{ width: '100%' }}>
              <Option value="running">运行中</Option>
              <Option value="maintenance">维护中</Option>
              <Option value="offline">离线</Option>
              <Option value="fault">故障</Option>
            </Select>
          </Form.Item>
          <div style={{ color: '#666', fontSize: '13px' }}>
            已选择 <span style={{ color: '#1890ff', fontWeight: 600 }}>{selectedDevices.length}</span> 个设备
          </div>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={modalHeaderStyle}>
            <ExportOutlined style={{ color: '#fa8c16' }} />
            导出设备数据
          </div>
        }
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setExportModalVisible(false)} style={secondaryButtonStyle}>
            取消
          </Button>,
          <Button key="submit" type="primary" loading={exportLoading} onClick={handleEnhancedExport} style={primaryButtonStyle}>
            导出
          </Button>
        ]}
        destroyOnHidden
        styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }, body: { padding: '24px' } }}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="导出格式">
            <Select value={exportFormat} onChange={setExportFormat} style={{ width: '100%' }}>
              <Option value="csv">CSV 格式</Option>
              <Option value="json">JSON 格式</Option>
            </Select>
          </Form.Item>
          <Form.Item label="导出范围">
            <Select value={exportScope} onChange={setExportScope} style={{ width: '100%' }}>
              <Option value="selected">选择的行 ({selectedDevices.length} 个)</Option>
              <Option value="currentPage">当前页 ({currentPageDevices.length} 个)</Option>
              <Option value="all">全部设备 ({allDevices.length} 个)</Option>
            </Select>
          </Form.Item>
          <Form.Item label="选择导出字段">
            <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: '8px', padding: '12px' }}>
              {deviceFields.filter(f => f.visible && f.fieldName !== 'rackId').map(field => (
                <div key={field.fieldName} style={{ marginBottom: '8px' }}>
                  <Checkbox
                    checked={exportFields.includes(field.fieldName)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExportFields([...exportFields, field.fieldName]);
                      } else {
                        setExportFields(exportFields.filter(f => f !== field.fieldName));
                      }
                    }}
                  >
                    {field.displayName}
                  </Checkbox>
                </div>
              ))}
            </div>
          </Form.Item>
          <div style={{ color: '#666', fontSize: '13px' }}>
            已选择 <span style={{ color: '#1890ff', fontWeight: 600 }}>{selectedDevices.length}</span> 个设备，
            将导出 <span style={{ color: '#52c41a', fontWeight: 600 }}>{exportFields.length}</span> 个字段
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default DeviceManagement;