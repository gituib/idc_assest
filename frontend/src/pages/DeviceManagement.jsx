import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Card,
  Space,
  Tooltip,
  Tag,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UploadOutlined,
  ExportOutlined,
  SettingOutlined,
  CloudServerOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  ToolOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { designTokens } from '../config/theme';
import {
  PAGINATION_CONFIG,
  DEBOUNCE_DELAY,
  DEFAULT_DEVICE_FIELDS,
  STATUS_MAP,
  TYPE_MAP,
} from '../constants/deviceManagementConstants';
import {
  pageContainerStyle,
  headerStyle,
  titleRowStyle,
  titleSectionStyle,
  titleIconStyle,
  titleTextStyle,
  pageTitleStyle,
  pageSubtitleStyle,
  secondaryActionStyle,
  cardStyle,
  filterCardStyle,
  modalHeaderStyle,
  tableContainerStyle,
  emptyStateStyle,
  emptyStateIconStyle,
  generateGlobalStyles,
} from '../styles/deviceManagementStyles';
import {
  ResizableTitle,
  DeviceDetailModal,
  DeviceFormModal,
  ImportModal,
  ExportModal,
  FieldConfigModal,
  BatchStatusModal,
} from '../components/device';
import { useDebounce } from '../hooks/useDebounce';
import {
  getDeviceTypeIcon,
  getStatusConfig,
  processDeviceData,
} from '../utils/deviceUtils.jsx';

const { Option } = Select;

const DEFAULT_DEVICE_FIELDS_LOCAL = DEFAULT_DEVICE_FIELDS;

function DeviceManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [devices, setDevices] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [racks, setRacks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [roomId, setRoomId] = useState('all');
  const [rackId, setRackId] = useState('all');
  const [searchForm] = Form.useForm();

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: PAGINATION_CONFIG.defaultPageSize,
    total: 0,
    pageSizeOptions: PAGINATION_CONFIG.pageSizeOptions,
    showSizeChanger: PAGINATION_CONFIG.showSizeChanger,
    showTotal: PAGINATION_CONFIG.showTotal,
  });

  const [deviceFields, setDeviceFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);

  const [fieldConfigModalVisible, setFieldConfigModalVisible] = useState(false);

  const [batchStatusModalVisible, setBatchStatusModalVisible] = useState(false);
  const [batchStatusLoading, setBatchStatusLoading] = useState(false);

  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [currentPageDevices, setCurrentPageDevices] = useState([]);

  const [selectedDevices, setSelectedDevices] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [columnWidths, setColumnWidths] = useState({});
  const [advancedSearchVisible, setAdvancedSearchVisible] = useState(false);

  const debouncedKeyword = useDebounce(keyword, DEBOUNCE_DELAY);

  const fetchDevices = useCallback(
    async (page = 1, pageSize = 10, forceRefresh = false) => {
      try {
        setLoading(true);

        const params = {
          page,
          pageSize,
          keyword: debouncedKeyword || undefined,
          status: status !== 'all' ? status : undefined,
          type: type !== 'all' ? type : undefined,
          roomId: roomId !== 'all' ? roomId : undefined,
          rackId: rackId !== 'all' ? rackId : undefined,
        };

        const response = await axios.get('/api/devices', { params });
        const { devices: deviceList, total } = response.data;

        const processedDevices = deviceList.map(processDeviceData);

        setAllDevices(processedDevices);
        setPagination((prev) => ({ ...prev, current: page, pageSize, total }));
      } catch (error) {
        message.error('获取设备列表失败');
        console.error('获取设备列表失败:', error);
      } finally {
        setLoading(false);
      }
    },
    [debouncedKeyword, status, type, roomId, rackId]
  );

  const fetchDeviceFields = async () => {
    try {
      setLoadingFields(true);
      const response = await axios.get('/api/deviceFields');
      let fields = response.data.sort((a, b) => a.order - b.order);
      
      // 补充缺失的 options（状态和设备类型）
      fields = fields.map(field => {
        if (field.fieldName === 'type' && !field.options) {
          const defaultTypeField = DEFAULT_DEVICE_FIELDS_LOCAL.find(f => f.fieldName === 'type');
          return { ...field, options: defaultTypeField?.options || [] };
        }
        if (field.fieldName === 'status' && !field.options) {
          const defaultStatusField = DEFAULT_DEVICE_FIELDS_LOCAL.find(f => f.fieldName === 'status');
          return { ...field, options: defaultStatusField?.options || [] };
        }
        return field;
      });
      
      setDeviceFields(fields);
    } catch (error) {
      message.error('获取字段配置失败');
      console.error('获取字段配置失败:', error);
      setDeviceFields(DEFAULT_DEVICE_FIELDS_LOCAL);
    } finally {
      setLoadingFields(false);
    }
  };

  const fetchRacks = async () => {
    try {
      const response = await axios.get('/api/racks', {
        params: { pageSize: 1000 },
      });
      setRacks(response.data.racks || []);
    } catch (error) {
      message.error('获取机柜列表失败');
      console.error('获取机柜列表失败:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get('/api/rooms');
      setRooms(response.data.rooms || []);
    } catch (error) {
      message.error('获取机房列表失败');
      console.error('获取机房列表失败:', error);
    }
  };

  useEffect(() => {
    fetchDevices(1, pagination.pageSize);
    fetchRacks();
    fetchRooms();
    fetchDeviceFields();
  }, [fetchDevices]);

  useEffect(() => {
    const deviceIdFromUrl = searchParams.get('deviceId');
    if (deviceIdFromUrl) {
      const fetchDeviceDetail = async () => {
        try {
          const response = await axios.get(`/api/devices/${deviceIdFromUrl}`);
          if (response.data) {
            setSelectedDevice(response.data);
            setDetailModalVisible(true);
            setSearchParams({});
          }
        } catch (error) {
          console.error('获取设备详情失败:', error);
          const errorStatus = error.response?.status;
          const errorMessage = error.response?.data?.error;

          if (errorStatus === 404 || errorMessage === '设备不存在') {
            message.warning('该设备已被删除，无法查看详情');
          } else {
            message.error(errorMessage || '获取设备详情失败');
          }
          setSearchParams({});
        }
      };
      fetchDeviceDetail();
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (allDevices.length > 0) {
      const start = (pagination.current - 1) * pagination.pageSize;
      const end = start + pagination.pageSize;
      const currentPageData = allDevices.slice(start, end);
      setCurrentPageDevices(currentPageData);
    } else {
      setCurrentPageDevices([]);
    }
  }, [allDevices, pagination.current, pagination.pageSize]);

  const showModal = (device = null) => {
    setEditingDevice(device);
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingDevice(null);
  };

  const handleSubmit = async (deviceData) => {
    try {
      if (editingDevice) {
        await axios.put(`/api/devices/${editingDevice.deviceId}`, deviceData);
        message.success('设备更新成功');
      } else {
        await axios.post('/api/devices', deviceData);
        message.success('设备创建成功');
      }

      setModalVisible(false);
      fetchDevices();
      setEditingDevice(null);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || '未知错误';
      message.error(editingDevice ? `设备更新失败: ${errorMsg}` : `设备创建失败: ${errorMsg}`);
      console.error(editingDevice ? '设备更新失败:' : '设备创建失败:', error);
    }
  };

  const handleSearch = (values) => {
    setSearching(true);

    setKeyword(values.keyword || '');
    setStatus(values.status || 'all');
    setType(values.type || 'all');
    setRoomId(values.roomId || 'all');
    setRackId(values.rackId || 'all');

    setPagination((prev) => ({ ...prev, current: 1 }));

    setTimeout(() => setSearching(false), 300);
  };

  const handleReset = () => {
    setSearching(true);

    setKeyword('');
    setStatus('all');
    setType('all');
    setRoomId('all');
    setRackId('all');
    searchForm.resetFields();

    setTimeout(() => setSearching(false), 300);
  };

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);

    const start = (newPagination.current - 1) * newPagination.pageSize;
    const end = start + newPagination.pageSize;
    const currentPageData = allDevices.slice(start, end);
    setCurrentPageDevices(currentPageData);

    fetchDevices(newPagination.current, newPagination.pageSize);
  };

  const handleBatchDelete = async () => {
    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedDevices.length} 个设备吗？此操作不可恢复！`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await axios.post('/api/devices/batch-delete', {
            deviceIds: selectedDevices,
          });
          message.success(response.data.message || '批量删除成功');
          setSelectedDevices([]);
          setSelectAll(false);
          fetchDevices(1, 10, true);
        } catch (error) {
          message.error('批量删除失败');
          console.error('批量删除设备失败:', error);
          // 显示更具体的错误信息
          if (error.response?.data?.error) {
            console.error('后端错误详情:', error.response.data.error);
          }
        }
      },
    });
  };

  const handleDeleteAll = async () => {
    Modal.confirm({
      title: '危险操作确认',
      content:
        '确定要删除所有设备吗？此操作将清空所有设备数据，包括相关的接线、网卡、端口等信息，且不可恢复！',
      okText: '确认删除所有',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await axios.delete('/api/devices/delete-all');
          message.success(response.data.message || '成功删除所有设备');
          setSelectedDevices([]);
          setSelectAll(false);
          fetchDevices(1, 10, true);
        } catch (error) {
          message.error('删除所有设备失败');
          console.error('删除所有设备失败:', error);
        }
      },
    });
  };

  const handleBatchToIdle = async () => {
    if (selectedDevices.length === 0) {
      message.warning('请先选择要标记为空闲的设备');
      return;
    }
    Modal.confirm({
      title: '确认标记为空闲',
      content: `确定要将选中的 ${selectedDevices.length} 个设备标记为空闲设备吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await axios.post('/api/idle-devices/batch-from-devices', {
            deviceIds: selectedDevices,
            idleReason: '从设备管理批量转入',
          });
          message.success(response.data.message || '设备已标记为空闲');
          setSelectedDevices([]);
          setSelectAll(false);
          fetchDevices(1, 10, true);
        } catch (error) {
          message.error(error.response?.data?.error || '标记为空闲失败');
          console.error('标记为空闲失败:', error);
        }
      },
    });
  };

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
      },
    });
  };

  const handleShowDetail = (device) => {
    setSelectedDevice(device);
    setDetailModalVisible(true);
  };

  const handleViewDeviceTickets = (device) => {
    navigate(
      `/tickets?deviceId=${device.deviceId}&deviceName=${encodeURIComponent(device.name)}&serialNumber=${encodeURIComponent(device.serialNumber || '')}&view=true`
    );
  };

  const handleCreateTicketForDevice = (device) => {
    navigate(
      `/tickets?deviceId=${device.deviceId}&deviceName=${encodeURIComponent(device.name)}&serialNumber=${encodeURIComponent(device.serialNumber || '')}&create=true`
    );
  };

  const showBatchStatusModal = () => {
    if (selectedDevices.length === 0) {
      message.warning('请先选择要操作的设备');
      return;
    }
    setBatchStatusModalVisible(true);
  };

  const handleBatchStatusChange = async (newStatus) => {
    setBatchStatusLoading(true);
    try {
      const response = await axios.put('/api/devices/batch-status', {
        deviceIds: selectedDevices,
        status: newStatus,
      });

      message.success(response.data.message || '批量状态变更成功');
      setBatchStatusModalVisible(false);
      setSelectedDevices([]);
      setSelectAll(false);
      fetchDevices();
    } catch (error) {
      message.error('批量状态变更失败');
      console.error('批量状态变更失败:', error);
    } finally {
      setBatchStatusLoading(false);
    }
  };

  const showExportModal = () => {
    if (selectedDevices.length === 0) {
      message.warning('请先选择要导出的设备');
      return;
    }
    setExportModalVisible(true);
  };

  const handleEnhancedExport = async ({ format, scope }) => {
    let deviceIds = [];
    if (scope === 'selected') {
      deviceIds = selectedDevices;
    } else if (scope === 'currentPage') {
      deviceIds = allDevices.map((device) => device.deviceId);
    } else if (scope === 'all') {
      deviceIds = allDevices.map((device) => device.deviceId);
    }

    if (deviceIds.length === 0) {
      message.warning('没有可导出的设备');
      return;
    }

    const params = new URLSearchParams();
    deviceIds.forEach((id) => params.append('deviceIds', id));
    params.append('format', format);

    const response = await axios.get(`/api/devices/enhanced-export?${params.toString()}`, {
      responseType: 'blob',
    });

    const contentType = format === 'csv' ? 'text/csv; charset=gbk' : 'application/json';
    const blob = new Blob([response.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `devices_export_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    message.success(`成功导出 ${deviceIds.length} 个设备`);
  };

  const handleImport = async (file, callbacks) => {
    try {
      callbacks.onProgress(0, '正在上传文件...');

      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await axios.post('/api/devices/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 50) / progressEvent.total);
          callbacks.onProgress(Math.min(progress, 50), '正在上传文件...');
        },
      });

      callbacks.onProgress(60, '正在处理数据...');

      setTimeout(() => {
        callbacks.onProgress(80, '正在验证数据...');
      }, 200);

      setTimeout(() => {
        callbacks.onProgress(90, '正在保存数据...');
      }, 400);

      callbacks.onSuccess(response.data);

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
      let errorMessage = '导入失败';
      let errorDetails = [];

      if (error.response) {
        const { data, status } = error.response;

        if (
          status === 500 &&
          data &&
          data.errors &&
          Array.isArray(data.errors) &&
          data.errors.length > 0
        ) {
          errorDetails = data.errors.map((err) => ({
            row: err.row || 0,
            error: err.error || err.message || '服务器内部错误',
          }));
          errorMessage = `导入失败：${errorDetails[0].error}`;
        } else if (data && data.errors && Array.isArray(data.errors)) {
          errorDetails = data.errors.map((err, index) => ({
            row: err.row || index + 1,
            error: err.error || err.message || '未知错误',
          }));
          errorMessage = `导入失败，共发现 ${errorDetails.length} 处数据错误`;
        } else if (data && (data.message || data.error)) {
          errorMessage = data.message || data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      callbacks.onError({
        message: errorMessage,
        errors: errorDetails,
      });

      message.error(errorMessage);
      console.error('导入设备失败:', error);
    }
  };

  const handleSaveFieldConfig = async (updatedFields) => {
    try {
      const response = await axios.post('/api/deviceFields/config', updatedFields);
      setDeviceFields(response.data);
      message.success('字段配置保存成功');
      setFieldConfigModalVisible(false);
    } catch (error) {
      message.error('字段配置保存失败');
      console.error('保存字段配置失败:', error);
    }
  };

  const handleResetFieldConfig = (defaultFields) => {
    setDeviceFields(defaultFields);
  };

  const handleSelectionChange = (selectedRowKeys) => {
    setSelectedDevices(selectedRowKeys);
    setSelectAll(selectedRowKeys.length === allDevices.length && allDevices.length > 0);
  };

  const handleHeaderCellResize = (key) => (column) => ({
    width: column.width,
    onResize: (width) => {
      setColumnWidths((prev) => ({ ...prev, [key]: width }));
    },
  });

  const columns = useMemo(() => {
    const generatedColumns = [];

    deviceFields.forEach((field) => {
      if (!field.visible) return;

      if (field.fieldName === 'rackId') {
        generatedColumns.push({
          title: '所在机房',
          dataIndex: ['Rack', 'Room', 'name'],
          key: 'roomName',
          width: columnWidths.roomName || 120,
          onHeaderCell: handleHeaderCellResize('roomName'),
        });
        generatedColumns.push({
          title: field.displayName,
          dataIndex: ['Rack', 'name'],
          key: field.fieldName,
          width: columnWidths[field.fieldName] || 120,
          onHeaderCell: handleHeaderCellResize(field.fieldName),
        });
      } else if (field.fieldName === 'type') {
        generatedColumns.push({
          title: field.displayName,
          dataIndex: field.fieldName,
          key: field.fieldName,
          width: columnWidths[field.fieldName] || 100,
          onHeaderCell: handleHeaderCellResize(field.fieldName),
          render: (type) => (
            <Space>
              {getDeviceTypeIcon(type)}
              <span>{TYPE_MAP[type]}</span>
            </Space>
          ),
        });
      } else if (field.fieldName === 'status') {
        generatedColumns.push({
          title: field.displayName,
          dataIndex: field.fieldName,
          key: field.fieldName,
          width: columnWidths[field.fieldName] || 90,
          onHeaderCell: handleHeaderCellResize(field.fieldName),
          render: (status) => {
            const config = STATUS_MAP[status] || { text: status, color: 'default' };
            const statusStyles = {
              running: { bg: '#f6ffed', border: '#52c41a', text: '#389e0d' },
              maintenance: { bg: '#fffbE6', border: '#faad14', text: '#d48806' },
              offline: { bg: '#f5f5f5', border: '#8c8c8c', text: '#595959' },
              fault: { bg: '#fff2f0', border: '#ff4d4f', text: '#cf1322' },
              idle: { bg: '#E6FFFA', border: '#36cfc9', text: '#08979d' },
            };
            const style = statusStyles[status] || { bg: '#fafafa', border: '#d9d9d9', text: '#595959' };
            return (
              <Tag
                style={{
                  backgroundColor: style.bg,
                  borderColor: style.border,
                  color: style.text,
                  borderRadius: '4px',
                  fontWeight: 500,
                  boxShadow: `0 1px 2px ${style.border}30`,
                  minWidth: '80px',
                  textAlign: 'center',
                  padding: '2px 8px',
                  display: 'block',
                }}
              >
                {config.text}
              </Tag>
            );
          },
        });
      } else if (field.fieldType === 'date') {
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

            if (field.fieldName === 'warrantyExpiry') {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              dateObj.setHours(0, 0, 0, 0);

              if (dateObj < today) {
                return (
                  <span style={{ color: '#d93025', fontWeight: 'bold' }}>{formattedDate}</span>
                );
              }
            }

            return formattedDate;
          },
        });
      } else {
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
              onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
            >
              {value || '-'}
            </a>
          );
        }

        generatedColumns.push(columnConfig);
      }
    });

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

  return (
    <div style={pageContainerStyle}>
      <style>{generateGlobalStyles(designTokens)}</style>

      <div style={headerStyle}>
        <div style={titleRowStyle}>
          <div style={titleSectionStyle}>
            <div style={titleIconStyle}>
              <CloudServerOutlined style={{ fontSize: '20px', color: '#ffffff' }} />
            </div>
            <div style={titleTextStyle}>
              <h1 style={pageTitleStyle}>设备管理</h1>
              <p style={pageSubtitleStyle}>管理您的IT设备资产</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: designTokens.spacing.sm, flexWrap: 'wrap' }}>
            <Button
              style={{
                ...secondaryActionStyle,
                color: designTokens.colors.primary.main,
                borderColor: designTokens.colors.primary.main,
              }}
              icon={<PlusOutlined />}
              onClick={() => showModal()}
            >
              添加设备
            </Button>
            <Button
              style={{
                ...secondaryActionStyle,
                color: designTokens.colors.primary.main,
                borderColor: designTokens.colors.primary.main,
              }}
              icon={<UploadOutlined />}
              onClick={() => setImportModalVisible(true)}
            >
              导入
            </Button>
            <Button
              style={{
                ...secondaryActionStyle,
                color: designTokens.colors.primary.main,
                borderColor: designTokens.colors.primary.main,
              }}
              icon={<ExportOutlined />}
              onClick={showExportModal}
            >
              导出
            </Button>
            <Button
              style={{
                ...secondaryActionStyle,
                color: designTokens.colors.primary.main,
                borderColor: designTokens.colors.primary.main,
              }}
              icon={<SettingOutlined />}
              onClick={() => setFieldConfigModalVisible(true)}
            >
              字段配置
            </Button>
            <Button
              style={{
                ...secondaryActionStyle,
                color: designTokens.colors.primary.main,
                borderColor: designTokens.colors.primary.main,
              }}
              icon={<ReloadOutlined />}
              disabled={selectedDevices.length === 0}
              onClick={showBatchStatusModal}
            >
              状态变更 ({selectedDevices.length})
            </Button>
            <Button
              style={{
                ...secondaryActionStyle,
                color: '#f59e0b',
                borderColor: '#f59e0b',
              }}
              icon={<CloudServerOutlined />}
              disabled={selectedDevices.length === 0}
              onClick={handleBatchToIdle}
            >
              标记为空闲 ({selectedDevices.length})
            </Button>
            <Button
              style={{
                ...secondaryActionStyle,
                color: designTokens.colors.primary.main,
                borderColor: designTokens.colors.primary.main,
              }}
              icon={<DeleteOutlined />}
              disabled={selectedDevices.length === 0}
              onClick={handleBatchDelete}
            >
              批量删除 ({selectedDevices.length})
            </Button>
            <Button
              type="primary"
              danger
              style={{
                height: '36px',
                borderRadius: designTokens.borderRadius.small,
                fontSize: '13px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              icon={<DeleteOutlined />}
              onClick={handleDeleteAll}
            >
              删除所有
            </Button>
          </div>
        </div>
      </div>

      <Card
        size="small"
        style={filterCardStyle}
        styles={{
          body: {
            padding: `${designTokens.spacing.md}px ${designTokens.spacing.lg}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing.md,
          },
        }}
      >
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          style={{ width: '100%' }}
          className="filter-form"
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: designTokens.spacing.md, alignItems: 'center', width: '100%' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing.sm,
              padding: '0 12px',
              borderRight: `1px solid ${designTokens.colors.border.light}`,
              marginRight: 4,
            }}>
              <FilterOutlined style={{ color: designTokens.colors.primary.main, fontSize: '16px' }} />
              <span style={{ fontSize: '13px', fontWeight: 500, color: designTokens.colors.text.secondary, whiteSpace: 'nowrap' }}>筛选</span>
            </div>

            <Form.Item name="keyword" style={{ margin: 0 }}>
              <Input
                placeholder="搜索设备名称、型号、序列号..."
                prefix={<SearchOutlined style={{ color: designTokens.colors.primary.main }} />}
                style={{
                  width: '280px',
                  borderRadius: designTokens.borderRadius.medium,
                  border: `1px solid ${designTokens.colors.border.light}`,
                  transition: `all ${designTokens.transitions.fast}`,
                }}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                allowClear
              />
            </Form.Item>

            <Form.Item name="status" style={{ margin: 0 }}>
              <Select
                value={status}
                onChange={setStatus}
                style={{ width: '140px', borderRadius: designTokens.borderRadius.medium }}
                suffixIcon={<ToolOutlined style={{ color: '#10b981' }} />}
              >
                <Option value="all">所有状态</Option>
                <Option value="running">运行中</Option>
                <Option value="maintenance">维护中</Option>
                <Option value="offline">离线</Option>
                <Option value="fault">故障</Option>
                <Option value="idle">空闲</Option>
              </Select>
            </Form.Item>

            <Form.Item name="type" style={{ margin: 0 }}>
              <Select
                value={type}
                onChange={setType}
                style={{ width: '140px', borderRadius: designTokens.borderRadius.medium }}
                suffixIcon={<AppstoreOutlined style={{ color: '#8b5cf6' }} />}
              >
                <Option value="all">所有类型</Option>
                <Option value="server">服务器</Option>
                <Option value="switch">交换机</Option>
                <Option value="router">路由器</Option>
                <Option value="storage">存储设备</Option>
                <Option value="other">其他设备</Option>
              </Select>
            </Form.Item>

            <Button
              type="link"
              icon={advancedSearchVisible ? <UnorderedListOutlined /> : <UnorderedListOutlined />}
              onClick={() => setAdvancedSearchVisible(!advancedSearchVisible)}
              style={{
                height: '36px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: advancedSearchVisible ? designTokens.colors.primary.main : designTokens.colors.text.secondary,
                fontWeight: 500,
                borderRadius: designTokens.borderRadius.medium,
                background: advancedSearchVisible ? `${designTokens.colors.primary.main}10` : 'transparent',
                transition: `all ${designTokens.transitions.fast}`,
              }}
            >
              高级筛选 {advancedSearchVisible ? '▲' : '▼'}
            </Button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: designTokens.spacing.sm }}>
              <Space>
                <Button
                  type="primary"
                  style={{
                    height: '36px',
                    borderRadius: designTokens.borderRadius.medium,
                    background: designTokens.colors.primary.gradient,
                    border: 'none',
                    boxShadow: designTokens.shadows.small,
                  }}
                  icon={<SearchOutlined />}
                  htmlType="submit"
                  loading={searching}
                >
                  搜索
                </Button>
                <Button
                  style={{
                    height: '36px',
                    borderRadius: designTokens.borderRadius.medium,
                    border: `1px solid ${designTokens.colors.border.light}`,
                  }}
                  onClick={handleReset}
                >
                  重置
                </Button>
              </Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchDevices(1, pagination.pageSize, true)}
                style={{
                  borderRadius: designTokens.borderRadius.medium,
                  border: `1px solid ${designTokens.colors.border.light}`,
                  height: '36px',
                }}
              >
                刷新
              </Button>
            </div>
          </div>

          {advancedSearchVisible && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: designTokens.spacing.md,
              padding: `${designTokens.spacing.md}px 0`,
              borderTop: `1px dashed ${designTokens.colors.border.light}`,
              marginTop: designTokens.spacing.sm,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: designTokens.spacing.sm,
                padding: '0 12px',
                borderRight: `1px solid ${designTokens.colors.border.light}`,
                marginRight: 4,
              }}>
                <EnvironmentOutlined style={{ color: '#3b82f6', fontSize: '16px' }} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: designTokens.colors.text.secondary, whiteSpace: 'nowrap' }}>位置筛选</span>
              </div>

              <Form.Item name="roomId" style={{ margin: 0 }}>
                <Select
                  value={roomId}
                  onChange={(value) => {
                    setRoomId(value);
                    setRackId('all');
                  }}
                  style={{ width: '160px', borderRadius: designTokens.borderRadius.medium }}
                  placeholder="选择机房"
                  suffixIcon={<EnvironmentOutlined style={{ color: '#3b82f6' }} />}
                >
                  <Option value="all">所有机房</Option>
                  {rooms.map((room) => (
                    <Option key={room.roomId} value={room.roomId}>
                      {room.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="rackId" style={{ margin: 0 }}>
                <Select
                  value={rackId}
                  onChange={setRackId}
                  style={{ width: '160px', borderRadius: designTokens.borderRadius.medium }}
                  placeholder="选择机柜"
                  showSearch
                  optionFilterProp="children"
                  suffixIcon={<EnvironmentOutlined style={{ color: '#f59e0b' }} />}
                >
                  <Option value="all">所有机柜</Option>
                  {racks
                    .filter((rack) => roomId === 'all' || rack.roomId === roomId)
                    .map((rack) => (
                      <Option key={rack.rackId} value={rack.rackId}>
                        {rack.name}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </div>
          )}
        </Form>
      </Card>

      <Card style={cardStyle}>
        {!loading && allDevices.length === 0 && !searching && (
          <div
            style={{
              ...emptyStateStyle,
              color: designTokens.colors.text.secondary,
            }}
          >
            <SearchOutlined
              style={{
                ...emptyStateIconStyle,
                color: designTokens.colors.border.light,
              }}
            />
            <p>暂无设备数据</p>
          </div>
        )}
        {allDevices.length > 0 && (
          <div
            className="device-table-wrapper"
            style={{
              ...tableContainerStyle,
              borderRadius: designTokens.borderRadius.medium,
            }}
          >
            <Table
              columns={columns}
              dataSource={allDevices}
              rowKey="deviceId"
              loading={loading || searching}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '30', '50', '100'],
                showTotal: (total) => `共 ${total} 条记录`,
                style: { marginTop: '16px' },
              }}
              onChange={handleTableChange}
              scroll={{ y: 500, scrollToFirstRowOnChange: true }}
              virtual
              components={{
                header: {
                  cell: ResizableTitle,
                },
              }}
              style={{ width: '100%', maxWidth: '100%' }}
              size="middle"
              showHeader={allDevices.length > 0}
              rowSelection={{
                selectedRowKeys: selectedDevices,
                onChange: handleSelectionChange,
                columnWidth: 48,
                fixed: 'left',
                type: 'checkbox',
                crossPageSelect: true,
                selections: [
                  {
                    key: 'all',
                    text: '全选',
                    onSelect: () => {
                      const allIds = allDevices.map((device) => device.deviceId);
                      setSelectedDevices(allIds);
                      setSelectAll(true);
                    },
                  },
                  {
                    key: 'invert',
                    text: '反选',
                    onSelect: () => {
                      const visibleIds = allDevices.map((device) => device.deviceId);
                      const newSelected = visibleIds.filter((id) => !selectedDevices.includes(id));
                      setSelectedDevices(newSelected);
                      setSelectAll(newSelected.length === allDevices.length);
                    },
                  },
                  {
                    key: 'none',
                    text: '清除选择',
                    onSelect: () => {
                      setSelectedDevices([]);
                      setSelectAll(false);
                    },
                  },
                ],
              }}
              onRow={(record) => ({
                onClick: () =>
                  handleSelectionChange(
                    selectedDevices.includes(record.deviceId)
                      ? selectedDevices.filter((id) => id !== record.deviceId)
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

      <DeviceFormModal
        visible={modalVisible}
        editingDevice={editingDevice}
        deviceFields={deviceFields}
        racks={racks}
        rooms={rooms}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />

      <DeviceDetailModal
        visible={detailModalVisible}
        device={selectedDevice}
        deviceFields={deviceFields}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedDevice(null);
        }}
        onEdit={showModal}
        onViewTickets={handleViewDeviceTickets}
        onCreateTicket={handleCreateTicketForDevice}
      />

      <ImportModal
        visible={importModalVisible}
        deviceFields={deviceFields}
        onImport={handleImport}
        onCancel={() => setImportModalVisible(false)}
      />

      <ExportModal
        visible={exportModalVisible}
        selectedDevices={selectedDevices}
        currentPageDevices={currentPageDevices}
        allDevices={allDevices}
        onExport={handleEnhancedExport}
        onCancel={() => setExportModalVisible(false)}
      />

      <FieldConfigModal
        visible={fieldConfigModalVisible}
        deviceFields={deviceFields}
        defaultDeviceFields={DEFAULT_DEVICE_FIELDS_LOCAL}
        onSave={handleSaveFieldConfig}
        onReset={handleResetFieldConfig}
        onCancel={() => setFieldConfigModalVisible(false)}
      />

      <BatchStatusModal
        visible={batchStatusModalVisible}
        selectedCount={selectedDevices.length}
        loading={batchStatusLoading}
        onSubmit={handleBatchStatusChange}
        onCancel={() => setBatchStatusModalVisible(false)}
      />
    </div>
  );
}

export default DeviceManagement;
