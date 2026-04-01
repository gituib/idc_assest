import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce, useDebouncedCallback } from '../hooks/useDebounce';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Card,
  Space,
  Popconfirm,
  Popover,
  Upload,
  Progress,
  Checkbox,
  Radio,
  Row,
  Col,
  Badge,
  Tag,
  Tooltip,
  Empty,
  Skeleton,
  Alert,
  Typography,
  Divider,
  AutoComplete,
  Avatar,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ExportOutlined,
  ImportOutlined,
  UploadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  FilterOutlined,
  ClearOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ScanOutlined,
  BarcodeOutlined,
  DownloadOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  QrcodeOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '../config/theme';
import CloseButton from '../components/CloseButton';
import {
  inputStyles,
  selectStyles,
  inputNumberStyles,
  textAreaStyles,
  filterInputStyles,
  inputPlaceholders,
  inputValidationRules,
} from '../styles/deviceManagementStyles';

const { Option } = Select;
const { Text, Title } = Typography;
const { TextArea } = Input;

// 动画配置
const animations = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  },
};

function ConsumableManagement() {
  const [consumables, setConsumables] = useState([]);
  const [allConsumablesForScan, setAllConsumablesForScan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState(null);
  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showTotal: total => `共 ${total} 条记录`,
  });
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 300);
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importMode, setImportMode] = useState('create');
  const [importValidationErrors, setImportValidationErrors] = useState([]);
  const [importStep, setImportStep] = useState('upload');
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [stockRecord, setStockRecord] = useState(null);
  const [stockType, setStockType] = useState('in');
  const [stockForm] = Form.useForm();
  const [maxStockUnlimited, setMaxStockUnlimited] = useState(false);
  const [snList, setSnList] = useState([]);
  const [snInputVisible, setSnInputVisible] = useState(false);
  const [snInputValue, setSnInputValue] = useState('');
  const [selectedSnList, setSelectedSnList] = useState([]);
  const [snSearchKeyword, setSnSearchKeyword] = useState('');
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [scanMode, setScanMode] = useState('add');
  const [scanValue, setScanValue] = useState('');
  const [scanChecking, setScanChecking] = useState(false);
  const [scannedSnList, setScannedSnList] = useState([]);
  const [selectedScanInConsumable, setSelectedScanInConsumable] = useState(null);
  const scanInputRef = React.useRef(null);
  const [quickOutModalVisible, setQuickOutModalVisible] = useState(false);
  const [quickOutConsumable, setQuickOutConsumable] = useState(null);
  const [quickOutDevice, setQuickOutDevice] = useState(null);
  const [quickOutDeviceSearch, setQuickOutDeviceSearch] = useState('');
  const [quickOutDeviceList, setQuickOutDeviceList] = useState([]);
  const [quickOutDeviceLoading, setQuickOutDeviceLoading] = useState(false);
  const [quickOutQuantity, setQuickOutQuantity] = useState(1);
  const [quickOutReason, setQuickOutReason] = useState('');
  const [quickOutSnList, setQuickOutSnList] = useState([]);
  const [quickOutSubmitting, setQuickOutSubmitting] = useState(false);
  const [pendingOutItems, setPendingOutItems] = useState([]);
  const [batchOutModalVisible, setBatchOutModalVisible] = useState(false);
  const [batchOutDevice, setBatchOutDevice] = useState(null);
  const [batchOutDeviceSearch, setBatchOutDeviceSearch] = useState('');
  const [batchOutDeviceList, setBatchOutDeviceList] = useState([]);
  const [batchOutDeviceLoading, setBatchOutDeviceLoading] = useState(false);
  const [batchOutReason, setBatchOutReason] = useState('');
  const [batchOutSubmitting, setBatchOutSubmitting] = useState(false);
  const [importJobId, setImportJobId] = useState(null);
  const [importJobStatus, setImportJobStatus] = useState(null);
  const [fieldMappings, setFieldMappings] = useState({});
  const [availableFields, setAvailableFields] = useState([]);
  const [detectedHeaders, setDetectedHeaders] = useState([]);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const importProgressRef = React.useRef(null);

  // 获取全部耗材（用于扫码入库下拉框，不受分页限制）
  const fetchAllConsumablesForScan = useCallback(async () => {
    try {
      const response = await axios.get('/api/consumables', {
        params: { page: 1, pageSize: 9999 },
      });
      setAllConsumablesForScan(response.data.consumables || []);
    } catch (error) {
      console.error('获取全部耗材失败:', error);
    }
  }, []);

  const fetchConsumables = useCallback(
    async (page = 1, pageSize = 10) => {
      try {
        setLoading(true);
        const response = await axios.get('/api/consumables', {
          params: { page, pageSize, keyword: debouncedKeyword, category, status },
        });
        const data = response.data.consumables || [];
        setConsumables(data);
        setPagination(prev => ({ ...prev, current: page, pageSize, total: response.data.total }));
        // 同步刷新扫码入库用的全量列表
        fetchAllConsumablesForScan();
      } catch (error) {
        message.error('获取耗材列表失败');
        console.error('获取耗材列表失败:', error);
      } finally {
        setLoading(false);
      }
    },
    [debouncedKeyword, category, status, fetchAllConsumablesForScan]
  );

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get('/api/consumable-categories/list');
      setCategories(response.data || []);
    } catch (error) {
      console.error('获取分类列表失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchConsumables();
    fetchCategories();
  }, [fetchConsumables, fetchCategories]);

  const showModal = useCallback(
    (consumable = null) => {
      setEditingConsumable(consumable);
      if (consumable) {
        const isUnlimited =
          consumable.maxStock === 0 ||
          consumable.maxStock === null ||
          consumable.maxStock === undefined;
        setMaxStockUnlimited(isUnlimited);
        setSnList(consumable.snList || []);
        form.setFieldsValue({
          ...consumable,
          maxStock: isUnlimited ? undefined : consumable.maxStock,
        });
      } else {
        setMaxStockUnlimited(true);
        setSnList([]);
        form.resetFields();
        form.setFieldsValue({
          unit: '个',
          currentStock: 0,
          minStock: 0,
          status: 'active',
          unitPrice: 0,
        });
      }
      setModalVisible(true);
    },
    [form]
  );

  const handleCancel = useCallback(() => {
    setModalVisible(false);
    setEditingConsumable(null);
    setSnList([]);
    setSnInputVisible(false);
    setSnInputValue('');
  }, []);

  const handleSubmit = useCallback(
    async values => {
      try {
        const submitData = {
          ...values,
          maxStock: maxStockUnlimited ? 0 : values.maxStock,
          unitPrice: values.unitPrice || 0,
          snList: snList,
        };
        if (editingConsumable) {
          await axios.put(`/api/consumables/${editingConsumable.consumableId}`, submitData);
          message.success({
            content: '耗材更新成功',
            icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
          });
        } else {
          await axios.post('/api/consumables', {
            ...submitData,
            consumableId: `CON${Date.now()}`,
          });
          message.success({
            content: '耗材创建成功',
            icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
          });
        }
        setModalVisible(false);
        fetchConsumables();
        setEditingConsumable(null);
        setSnList([]);
      } catch (error) {
        message.error(editingConsumable ? '耗材更新失败' : '耗材创建失败');
        console.error('提交失败:', error);
      }
    },
    [editingConsumable, fetchConsumables, maxStockUnlimited, snList]
  );

  const handleDelete = useCallback(
    async consumableId => {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除这个耗材吗？此操作不可恢复！',
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          try {
            await axios.delete(`/api/consumables/${consumableId}`);
            message.success({
              content: '删除成功',
              icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
            });
            fetchConsumables();
          } catch (error) {
            message.error('删除失败');
            console.error('删除失败:', error);
          }
        },
      });
    },
    [fetchConsumables]
  );

  const handleSearch = useCallback(value => {
    setKeyword(value);
  }, []);

  const handleReset = () => {
    setKeyword('');
    setCategory('all');
    setStatus('all');
  };

  const exportToCSV = (data, filename) => {
    const headers = [
      '耗材ID',
      '名称',
      '分类',
      '单位',
      '当前库存',
      '最小库存',
      '最大库存',
      '单价',
      '供应商',
      '存放位置',
      '状态',
    ];
    const keys = [
      'consumableId',
      'name',
      'category',
      'unit',
      'currentStock',
      'minStock',
      'maxStock',
      'unitPrice',
      'supplier',
      'location',
      'status',
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        keys
          .map(key => {
            let value = row[key];
            if (key === 'unitPrice') value = `¥${parseFloat(value || 0).toFixed(2)}`;
            if (key === 'status') value = value === 'active' ? '启用' : '停用';
            if (value === null || value === undefined) value = '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      const response = await axios.get('/api/consumables/export', {
        params: { keyword, category, status },
      });
      const consumables = response.data.consumables;
      exportToCSV(consumables, `consumables_${new Date().toISOString().split('T')[0]}.csv`);
      message.success({
        content: '导出成功',
        icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
      });
    } catch (error) {
      message.error('导出失败');
      console.error('导出失败:', error);
    }
  };

  const parseFile = file => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          if (jsonData.length < 2) {
            resolve({ data: [], headers: [] });
            return;
          }

          const headers = jsonData[0].map(h => String(h || '').trim());
          const result = [];

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const obj = {};
            headers.forEach((header, idx) => {
              obj[header] = row[idx] !== undefined ? String(row[idx] || '').trim() : '';
            });
            if (Object.values(obj).some(v => v)) {
              result.push(obj);
            }
          }

          resolve({ data: result, headers });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  const detectFieldMappings = (headers, availableFields) => {
    const mappings = {};
    const normalizedAvailableFields = availableFields.map(f => ({
      source: f.source,
      target: f.target,
      normalizedSource: f.source.toLowerCase(),
      normalizedTarget: f.target.toLowerCase(),
    }));

    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().replace(/[_\s]/g, '');
      const match = normalizedAvailableFields.find(
        f =>
          f.normalizedSource.replace(/[_\s]/g, '') === normalizedHeader ||
          f.normalizedTarget.replace(/[_\s]/g, '') === normalizedHeader ||
          f.source === header
      );
      if (match) {
        mappings[header] = match.target;
      }
    });

    return mappings;
  };

  const validateImportData = (data, validCategories) => {
    const errors = [];
    const validCategoryNames = validCategories.map(c => c.name);
    data.forEach((item, index) => {
      const rowNum = index + 1;
      const name = item['名称'] || item.name;
      const category = item['分类'] || item.category;

      if (!name) {
        errors.push({ row: rowNum, field: '名称', message: '名称为必填项' });
      }
      if (!category) {
        errors.push({ row: rowNum, field: '分类', message: '分类为必填项' });
      } else if (validCategoryNames.length > 0 && !validCategoryNames.includes(category)) {
        errors.push({
          row: rowNum,
          field: '分类',
          message: `分类"${category}"不存在，请使用系统已有的分类`,
        });
      }
    });
    return errors;
  };

  const fetchFieldMappings = async () => {
    try {
      const response = await axios.get('/api/consumables/field-mappings');
      if (response.data && response.data.aliases) {
        setAvailableFields(response.data.aliases);
      }
    } catch (error) {
      console.error('获取字段映射信息失败:', error);
    }
  };

  const pollImportProgress = async jobId => {
    try {
      const response = await axios.get(`/api/consumables/progress/${jobId}`);
      const progress = response.data;
      setImportJobStatus(progress);
      setImportProgress(progress.progressPercent || 0);

      if (progress.status === 'completed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setImportPhase('导入完成');
        fetchImportResult(jobId);
      } else if (progress.status === 'failed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setImportPhase('导入失败');
        setImporting(false);
        message.error(progress.error || '导入失败');
      } else if (progress.status === 'cancelled') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setImportPhase('导入已取消');
        setImporting(false);
      }
    } catch (error) {
      console.error('获取导入进度失败:', error);
    }
  };

  const fetchImportResult = async jobId => {
    try {
      const response = await axios.get(`/api/consumables/result/${jobId}`);
      if (response.data && response.data.result) {
        setImportResult(response.data.result);
        setImportStep('result');
      }
      setImporting(false);
      fetchConsumables();
    } catch (error) {
      console.error('获取导入结果失败:', error);
      setImporting(false);
    }
  };

  const handleCancelImport = async () => {
    if (!importJobId) return;
    try {
      await axios.post(`/api/consumables/cancel/${importJobId}`);
      message.info('正在取消导入任务...');
    } catch (error) {
      console.error('取消导入失败:', error);
      message.error('取消导入失败');
    }
  };

  const handleFileChange = async info => {
    const file = info.fileList[info.fileList.length - 1];
    if (file && file.originFileObj) {
      try {
        setImporting(true);
        setImportPhase('正在解析文件...');

        const { data: parsedData, headers: detectedHeadersList } = await parseFile(file.originFileObj);

        if (parsedData.length === 0) {
          message.warning('文件中没有有效数据');
          setImporting(false);
          return;
        }

        setDetectedHeaders(detectedHeadersList || []);

        if (availableFields.length > 0 && detectedHeadersList.length > 0) {
          const autoMappings = detectFieldMappings(detectedHeadersList, availableFields);
          setFieldMappings(autoMappings);
        }

        const validationErrors = validateImportData(parsedData, categories);
        setImportValidationErrors(validationErrors);
        setImportPreview(parsedData);
        setImportFile(file.originFileObj);
        setImportStep('preview');

        if (validationErrors.length > 0) {
          message.warning(`数据校验发现 ${validationErrors.length} 个问题，请检查预览`);
        } else {
          message.success(`成功解析 ${parsedData.length} 条数据`);
        }
      } catch (error) {
        message.error('文件解析失败，请确保文件格式正确');
        console.error('文件解析失败:', error);
      } finally {
        setImporting(false);
        setImportPhase('');
      }
    }
  };

  const showImportModal = () => {
    setImportPreview([]);
    setImportFile(null);
    setImportModalVisible(true);
    setImportStep('upload');
    setImportMode('create');
    setImportValidationErrors([]);
    setImportResult(null);
    setFieldMappings({});
    setDetectedHeaders([]);
    setImportJobId(null);
    setImportJobStatus(null);
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    if (availableFields.length === 0) {
      fetchFieldMappings();
    }
  };

  const handleImportCancel = () => {
    setImportModalVisible(false);
    setImportPreview([]);
    setImportFile(null);
    setImportProgress(0);
    setImportPhase('');
    setImportResult(null);
    setImportStep('upload');
    setImportValidationErrors([]);
    setFieldMappings({});
    setDetectedHeaders([]);
    setImportJobId(null);
    setImportJobStatus(null);
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const handleImport = async () => {
    if (!importFile || importPreview.length === 0) {
      message.warning('请先选择并解析文件');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportPhase('准备导入数据...');
    setImportResult(null);
    setImportStep('importing');

    const useBackgroundMode = importPreview.length > 500;

    try {
      if (useBackgroundMode) {
        setImportPhase('正在创建后台任务...');

        const response = await axios.post('/api/consumables/background', {
          items: importPreview,
          mode: importMode,
          fieldMapping: fieldMappings,
        });

        const { jobId } = response.data;
        setImportJobId(jobId);
        setImportProgress(5);
        setImportPhase('后台任务已创建，正在导入...');

        const interval = setInterval(() => {
          pollImportProgress(jobId);
        }, 1000);
        setPollingInterval(interval);
      } else {
        setImportProgress(30);
        setImportPhase('正在提交到服务器...');

        const response = await axios.post('/api/consumables/import', {
          items: importPreview,
          mode: importMode,
        });

        setImportProgress(70);
        setImportPhase('处理导入结果...');

        const results = response.data.results;
        setImportResult(results);
        setImportStep('result');
        setImportProgress(100);
        setImportPhase('导入完成');

        if (results.failed > 0) {
          message.warning(response.data.message);
        } else {
          message.success({
            content: response.data.message,
            icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
          });
        }

        fetchConsumables();
        setImporting(false);
      }
    } catch (error) {
      message.error('导入失败，请检查网络连接或服务器状态');
      console.error('导入耗材失败:', error);
      setImporting(false);
      setImportStep('preview');
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        耗材ID: 'CON001',
        名称: '示例耗材-网络模块',
        分类: '光模块',
        单位: '个',
        当前库存: 100,
        最小库存: 10,
        最大库存: 500,
        单价: 5.0,
        供应商: 'XX公司',
        存放位置: 'A柜-01层',
        描述: '测试数据',
        SN序列号: 'SN001,SN002,SN003',
        状态: 'active',
      },
    ];

    const fieldDescription = [
      {
        字段名: '耗材ID',
        系统字段: 'consumableId',
        必填: '否',
        说明: '耗材唯一标识符，留空自动生成；填写后可识别并更新现有耗材',
        示例: 'CON001',
      },
      {
        字段名: '名称',
        系统字段: 'name',
        必填: '是',
        说明: '耗材名称',
        示例: '光纤跳线',
      },
      {
        字段名: '分类',
        系统字段: 'category',
        必填: '是',
        说明: '耗材分类，如"光模块"或"光纤跳线"，需先在系统中创建该分类',
        示例: '光模块',
      },
      {
        字段名: '单位',
        系统字段: 'unit',
        必填: '否',
        说明: '计量单位，如"个"、"根"、"箱"，默认"个"',
        示例: '个',
      },
      {
        字段名: '当前库存',
        系统字段: 'currentStock',
        必填: '否',
        说明: '当前库存数量，数字类型',
        示例: '100',
      },
      {
        字段名: '最小库存',
        系统字段: 'minStock',
        必填: '否',
        说明: '安全库存阈值，低于此值会触发预警',
        示例: '10',
      },
      {
        字段名: '最大库存',
        系统字段: 'maxStock',
        必填: '否',
        说明: '最大库存限制，0表示无限制',
        示例: '500',
      },
      {
        字段名: '单价',
        系统字段: 'unitPrice',
        必填: '否',
        说明: '耗材单价，数字类型',
        示例: '5.00',
      },
      {
        字段名: '供应商',
        系统字段: 'supplier',
        必填: '否',
        说明: '耗材供应商名称',
        示例: 'XX科技有限公司',
      },
      {
        字段名: '存放位置',
        系统字段: 'location',
        必填: '否',
        说明: '仓库内存放位置，如"A柜-01层"',
        示例: 'A柜-01层',
      },
      {
        字段名: '描述',
        系统字段: 'description',
        必填: '否',
        说明: '耗材的详细描述或备注',
        示例: '这是一条测试数据',
      },
      {
        字段名: 'SN序列号',
        系统字段: 'snList',
        必填: '否',
        说明: '多个SN用逗号、分号或换行分隔，如"SN001,SN002"或"SN001\\nSN002"',
        示例: 'SN001,SN002,SN003',
      },
      {
        字段名: '状态',
        系统字段: 'status',
        必填: '否',
        说明: '"active"启用，"inactive"停用，默认启用',
        示例: 'active',
      },
    ];

    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws1, '耗材导入模板');

    const ws2 = XLSX.utils.json_to_sheet(fieldDescription);
    XLSX.utils.book_append_sheet(wb, ws2, '字段说明');

    const ws3 = XLSX.utils.json_to_sheet([{ 注意: '请删除示例数据后填写您的实际数据' }]);
    XLSX.utils.book_append_sheet(wb, ws3, '使用说明');

    XLSX.writeFile(wb, '耗材导入模板.xlsx');

    message.success({
      content: '模板下载成功（包含3个工作表）',
      icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
    });
  };

  const downloadFailedRecords = () => {
    if (!importResult || !importResult.details) return;

    const failedRecords = importResult.details
      .filter(d => d.status === 'failed')
      .map(d => {
        const original = importPreview[d.row - 1] || {};
        return {
          行号: d.row,
          错误原因: d.error,
          ...original,
        };
      });

    if (failedRecords.length === 0) {
      message.info('没有失败记录');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(failedRecords);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '失败记录');
    XLSX.writeFile(wb, '耗材导入失败记录.xlsx');
    message.success('失败记录下载成功');
  };

  const showStockModal = useCallback(
    (record, type) => {
      setStockRecord(record);
      setStockType(type);
      setSelectedSnList([]);
      setSnSearchKeyword('');
      stockForm.setFieldsValue({
        consumableId: record.consumableId,
        consumableName: record.name,
        quantity: 1,
        reason: '',
        notes: '',
      });
      setStockModalVisible(true);
    },
    [stockForm]
  );

  const handleStockCancel = useCallback(() => {
    setStockModalVisible(false);
    setStockRecord(null);
    setSelectedSnList([]);
    setSnSearchKeyword('');
  }, []);

  const handleStockSubmit = useCallback(
    async values => {
      try {
        await axios.post('/api/consumables/quick-inout', {
          consumableId: stockRecord.consumableId,
          type: stockType,
          quantity: values.quantity,
          operator: values.operator || '系统管理员',
          reason: values.reason,
          notes: values.notes,
          snList: stockType === 'out' ? selectedSnList : values.snList || [],
        });
        message.success({
          content: `${stockType === 'in' ? '入库' : '出库'}操作成功`,
          icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
        });
        setStockModalVisible(false);
        setSelectedSnList([]);
        fetchConsumables();
      } catch (error) {
        message.error(
          error.response?.data?.error || `${stockType === 'in' ? '入库' : '出库'}操作失败`
        );
        console.error('操作失败:', error);
      }
    },
    [stockRecord, stockType, fetchConsumables, selectedSnList]
  );

  const showScanModal = useCallback(mode => {
    setScanMode(mode);
    setScanValue('');
    setScannedSnList([]);
    setSelectedScanInConsumable(null);
    setScanModalVisible(true);
    setTimeout(() => {
      scanInputRef.current?.focus();
    }, 100);
  }, []);

  const handleScanCancel = useCallback(() => {
    setScanModalVisible(false);
    setScanValue('');
    setScannedSnList([]);
    setSelectedScanInConsumable(null);
    setScanChecking(false);
  }, []);

  const addToPendingOut = (consumable, snList = []) => {
    const existingIndex = pendingOutItems.findIndex(
      item => item.consumable.consumableId === consumable.consumableId
    );

    if (existingIndex >= 0) {
      const updated = [...pendingOutItems];
      const existing = updated[existingIndex];
      const newSnList = [...new Set([...existing.snList, ...snList])];
      updated[existingIndex] = {
        ...existing,
        quantity: newSnList.length > 0 ? newSnList.length : existing.quantity + 1,
        snList: newSnList,
      };
      setPendingOutItems(updated);
    } else {
      setPendingOutItems([
        ...pendingOutItems,
        {
          consumable,
          quantity: snList.length > 0 ? snList.length : 1,
          snList,
        },
      ]);
    }
  };

  const removeFromPendingOut = consumableId => {
    setPendingOutItems(pendingOutItems.filter(item => item.consumable.consumableId !== consumableId));
  };

  const handleScanKeyDown = useCallback(
    async e => {
      if (e.key === 'Enter' && scanValue.trim()) {
        e.preventDefault();
        const code = scanValue.trim();

        if (scanMode === 'add') {
          setScanChecking(true);
          try {
            const res = await axios.get(`/api/consumables/by-sn/${encodeURIComponent(code)}`);
            if (res.data.found) {
              const existingConsumable = res.data.consumable;
              Modal.confirm({
                title: 'SN已存在',
                content: (
                  <div>
                    <p>
                      该SN已关联耗材：<strong>{existingConsumable.name}</strong>
                    </p>
                    <p>分类：{existingConsumable.category}</p>
                    <p>
                      当前库存：{existingConsumable.currentStock} {existingConsumable.unit}
                    </p>
                    <p style={{ marginTop: 12, color: '#1890ff' }}>是否为该耗材入库？</p>
                  </div>
                ),
                okText: '入库',
                cancelText: '关闭',
                onOk: () => {
                  handleScanCancel();
                  setModalVisible(false);
                  showStockModal(existingConsumable, 'in');
                  setSelectedSnList([code]);
                  stockForm.setFieldsValue({ quantity: 1 });
                },
                onCancel: () => {
                  setScanValue('');
                  scanInputRef.current?.focus();
                },
              });
            } else {
              if (!snList.includes(code)) {
                setSnList(prev => [...prev, code]);
                const currentStock = form.getFieldValue('currentStock') || 0;
                form.setFieldsValue({ currentStock: currentStock + 1 });
                message.success(`已添加SN: ${code}`);
              } else {
                message.warning(`SN已在列表中: ${code}`);
              }
              setScanValue('');
              scanInputRef.current?.focus();
            }
          } catch (error) {
            message.error('查询SN失败');
            console.error('查询SN失败:', error);
          } finally {
            setScanChecking(false);
          }
        } else if (scanMode === 'in') {
          if (!scannedSnList.includes(code)) {
            setScannedSnList(prev => [...prev, code]);
            message.success(`已添加SN: ${code}`);
          } else {
            message.warning(`SN已存在: ${code}`);
          }
          setScanValue('');
          scanInputRef.current?.focus();
        } else if (scanMode === 'out') {
          setScanChecking(true);
          try {
            const res = await axios.get(`/api/consumables/by-sn/${encodeURIComponent(code)}`);
            if (res.data.found) {
              const consumable = res.data.consumable;
              const existingItem = pendingOutItems.find(
                item => item.consumable.consumableId === consumable.consumableId
              );
              if (existingItem) {
                if (!existingItem.snList.includes(code)) {
                  const updated = [...pendingOutItems];
                  const index = updated.findIndex(
                    item => item.consumable.consumableId === consumable.consumableId
                  );
                  updated[index] = {
                    ...updated[index],
                    quantity: updated[index].quantity + 1,
                    snList: [...updated[index].snList, code],
                  };
                  setPendingOutItems(updated);
                  message.success({
                    content: `已添加 ${consumable.name} (SN: ${code}) 到出库列表`,
                    icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
                  });
                } else {
                  message.warning(`SN已在列表中: ${code}`);
                }
              } else {
                addToPendingOut(consumable, [code]);
                message.success({
                  content: `已添加 ${consumable.name} (SN: ${code}) 到出库列表`,
                  icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
                });
              }
              setScanValue('');
              scanInputRef.current?.focus();
            } else {
              message.warning('未找到该SN对应的耗材');
              setScanValue('');
              scanInputRef.current?.focus();
            }
          } catch (error) {
            message.error('查询SN失败');
            console.error('查询SN失败:', error);
          } finally {
            setScanChecking(false);
          }
        }
      }
    },
    [
      scanMode,
      scanValue,
      scannedSnList,
      handleScanCancel,
      showModal,
      form,
      showStockModal,
      stockForm,
      pendingOutItems,
      addToPendingOut,
    ]
  );

  const handleScanInSubmit = useCallback(
    async consumableId => {
      if (scannedSnList.length === 0) {
        message.warning('请先扫描SN序列号');
        return;
      }
      try {
        await axios.post('/api/consumables/quick-inout', {
          consumableId,
          type: 'in',
          quantity: scannedSnList.length,
          operator: '系统管理员',
          reason: '扫码入库',
          snList: scannedSnList,
        });
        message.success({
          content: `成功入库 ${scannedSnList.length} 个SN`,
          icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
        });
        handleScanCancel();
        fetchConsumables();
      } catch (error) {
        message.error(error.response?.data?.error || '入库操作失败');
        console.error('入库失败:', error);
      }
    },
    [scannedSnList, handleScanCancel, fetchConsumables]
  );

  const searchDevices = useCallback(async keyword => {
    if (!keyword || keyword.length < 1) {
      setQuickOutDeviceList([]);
      return;
    }
    setQuickOutDeviceLoading(true);
    try {
      const response = await axios.get('/api/consumables/devices/search', {
        params: { keyword, limit: 20 },
      });
      setQuickOutDeviceList(response.data.devices || []);
    } catch (error) {
      console.error('搜索设备失败:', error);
      setQuickOutDeviceList([]);
    } finally {
      setQuickOutDeviceLoading(false);
    }
  }, []);

  const debouncedDeviceSearch = useDebouncedCallback(searchDevices, 300);

  const handleQuickOutDeviceSearch = value => {
    setQuickOutDeviceSearch(value);
    debouncedDeviceSearch(value);
  };

  const searchBatchDevices = useCallback(async keyword => {
    if (!keyword || keyword.length < 1) {
      setBatchOutDeviceList([]);
      return;
    }
    setBatchOutDeviceLoading(true);
    try {
      const response = await axios.get('/api/consumables/devices/search', {
        params: { keyword, limit: 20 },
      });
      setBatchOutDeviceList(response.data.devices || []);
    } catch (error) {
      console.error('搜索设备失败:', error);
      setBatchOutDeviceList([]);
    } finally {
      setBatchOutDeviceLoading(false);
    }
  }, []);

  const debouncedBatchDeviceSearch = useDebouncedCallback(searchBatchDevices, 300);

  const handleBatchOutDeviceSearch = value => {
    setBatchOutDeviceSearch(value);
    debouncedBatchDeviceSearch(value);
  };

  const openQuickOutModal = (consumable, sn = null) => {
    setQuickOutConsumable(consumable);
    setQuickOutDevice(null);
    setQuickOutDeviceSearch('');
    setQuickOutDeviceList([]);
    setQuickOutQuantity(1);
    setQuickOutReason('');
    setQuickOutSnList(sn ? [sn] : []);
    setQuickOutModalVisible(true);
  };

  const handleQuickOutSubmit = async () => {
    if (!quickOutConsumable) {
      message.warning('请选择耗材');
      return;
    }
    if (quickOutQuantity < 1) {
      message.warning('出库数量必须大于0');
      return;
    }
    if (quickOutQuantity > quickOutConsumable.currentStock) {
      message.warning('出库数量不能超过当前库存');
      return;
    }

    setQuickOutSubmitting(true);
    try {
      const response = await axios.post('/api/consumables/quick-inout', {
        consumableId: quickOutConsumable.consumableId,
        type: 'out',
        quantity: quickOutQuantity,
        operator: '系统管理员',
        reason: quickOutReason,
        notes: quickOutDevice ? `出库至设备: ${quickOutDevice.name}` : '',
        snList: quickOutSnList,
        deviceId: quickOutDevice?.deviceId || null,
      });

      message.success({
        content: `成功出库 ${quickOutQuantity} 个${quickOutDevice ? `至设备 ${quickOutDevice.name}` : ''}`,
        icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
      });

      setQuickOutModalVisible(false);
      fetchConsumables();
    } catch (error) {
      message.error(error.response?.data?.error || '出库操作失败');
      console.error('出库失败:', error);
    } finally {
      setQuickOutSubmitting(false);
    }
  };

  const openBatchOutModal = () => {
    if (pendingOutItems.length === 0) {
      message.warning('没有待出库的耗材');
      return;
    }
    setBatchOutDevice(null);
    setBatchOutDeviceSearch('');
    setBatchOutDeviceList([]);
    setBatchOutReason('');
    setBatchOutModalVisible(true);
  };

  const handleBatchOutSubmit = async () => {
    if (pendingOutItems.length === 0) {
      message.warning('没有待出库的耗材');
      return;
    }

    setBatchOutSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const item of pendingOutItems) {
      try {
        await axios.post('/api/consumables/quick-inout', {
          consumableId: item.consumable.consumableId,
          type: 'out',
          quantity: item.quantity,
          operator: '系统管理员',
          reason: batchOutReason || '批量出库',
          notes: batchOutDevice ? `出库至设备: ${batchOutDevice.name}` : '',
          snList: item.snList,
          deviceId: batchOutDevice?.deviceId || null,
        });
        successCount++;
      } catch (error) {
        failCount++;
        errors.push(`${item.consumable.name}: ${error.response?.data?.error || error.message}`);
      }
    }

    setBatchOutSubmitting(false);
    setBatchOutModalVisible(false);
    setPendingOutItems([]);
    setBatchOutDevice(null);
    setBatchOutDeviceSearch('');
    setBatchOutReason('');

    if (failCount === 0) {
      message.success({
        content: `成功出库 ${successCount} 项${batchOutDevice ? `至设备 ${batchOutDevice.name}` : ''}`,
        icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
      });
    } else {
      message.warning({
        content: `出库完成: 成功 ${successCount} 项, 失败 ${failCount} 项`,
        icon: <ExclamationCircleOutlined style={{ color: designTokens.colors.warning.main }} />,
      });
      if (errors.length > 0) {
        console.error('出库失败详情:', errors);
      }
    }

    fetchConsumables();
  };

  const columns = useMemo(
    () => [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        width: 150,
        render: text => (
          <span style={{ fontWeight: 500, color: designTokens.colors.neutral[800] }}>{text}</span>
        ),
      },
      {
        title: '分类',
        dataIndex: 'category',
        key: 'category',
        width: 120,
        render: text => (
          <Tag color="blue" style={{ borderRadius: '4px' }}>
            {text}
          </Tag>
        ),
      },
      {
        title: '单位',
        dataIndex: 'unit',
        key: 'unit',
        width: 80,
        render: text => <Text type="secondary">{text}</Text>,
      },
      {
        title: 'SN 数量',
        key: 'snCount',
        width: 120,
        render: (_, record) => {
          const snList = Array.isArray(record.snList) ? record.snList : [];
          const snCount = snList.length;
          const stock = record.currentStock || 0;

          if (snCount === 0) {
            return (
              <Tag color="default" style={{ borderRadius: '4px' }}>
                0/{stock}
              </Tag>
            );
          }

          const snContent = (
            <div style={{ maxHeight: '200px', overflowY: 'auto', maxWidth: '300px' }}>
              {snList.map((sn, index) => (
                <Tag key={index} style={{ marginBottom: '4px', marginRight: '4px' }}>
                  {sn}
                </Tag>
              ))}
            </div>
          );

          return (
            <Popover
              content={snContent}
              title={`SN 列表 (${snCount}个)`}
              trigger="click"
              placement="right"
            >
              <Tag color="purple" style={{ borderRadius: '4px', cursor: 'pointer' }}>
                {snCount}/{stock} 🔍
              </Tag>
            </Popover>
          );
        },
      },
      {
        title: '当前库存',
        dataIndex: 'currentStock',
        key: 'currentStock',
        width: 100,
        render: (value, record) => {
          const isLow = value <= record.minStock;
          return (
            <Badge
              status={isLow ? 'error' : 'success'}
              text={
                <span
                  style={{
                    color: isLow
                      ? designTokens.colors.error.main
                      : designTokens.colors.success.main,
                    fontWeight: 600,
                  }}
                >
                  {value}
                </span>
              }
            />
          );
        },
      },
      {
        title: '最小库存',
        dataIndex: 'minStock',
        key: 'minStock',
        width: 100,
        render: text => <Text type="secondary">{text}</Text>,
      },
      {
        title: '最大库存',
        dataIndex: 'maxStock',
        key: 'maxStock',
        width: 100,
        render: value => (
          <Text type="secondary">
            {value === 0 || value === null || value === undefined ? '无限制' : value}
          </Text>
        ),
      },
      {
        title: '单价',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        width: 100,
        render: value => (
          <Tag color="orange" style={{ borderRadius: '4px' }}>
            ¥{parseFloat(value || 0).toFixed(2)}
          </Tag>
        ),
      },
      {
        title: '供应商',
        dataIndex: 'supplier',
        key: 'supplier',
        width: 150,
        render: value => value || <Text type="secondary">-</Text>,
      },
      {
        title: '位置',
        dataIndex: 'location',
        key: 'location',
        width: 120,
        render: value => value || <Text type="secondary">-</Text>,
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        width: 200,
        ellipsis: true,
        render: value => value || <Text type="secondary">-</Text>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: value => (
          <Tag
            color={value === 'active' ? 'success' : 'error'}
            style={{ borderRadius: '4px' }}
            icon={value === 'active' ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
          >
            {value === 'active' ? '启用' : '停用'}
          </Tag>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 200,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="编辑">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => showModal(record)}
                style={{ color: designTokens.colors.primary.main }}
              />
            </Tooltip>
            <Tooltip title="入库">
              <Button
                type="text"
                icon={<ArrowDownOutlined />}
                onClick={() => showStockModal(record, 'in')}
                style={{ color: designTokens.colors.success.main }}
              />
            </Tooltip>
            <Tooltip title="出库">
              <Button
                type="text"
                icon={<ArrowUpOutlined />}
                onClick={() => showStockModal(record, 'out')}
                style={{ color: designTokens.colors.error.main }}
              />
            </Tooltip>
            <Tooltip title="删除">
              <Popconfirm
                title="确定删除该耗材?"
                onConfirm={() => handleDelete(record.consumableId)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          </Space>
        ),
      },
    ],
    [showModal, showStockModal, handleDelete]
  );

  const previewColumns = [
    { title: '行号', key: 'row', width: 60, render: (_, __, index) => index + 1 },
    { title: '耗材ID', dataIndex: '耗材ID', key: 'consumableId', width: 120 },
    { title: '名称', dataIndex: '名称', key: 'name', width: 150 },
    { title: '分类', dataIndex: '分类', key: 'category', width: 100 },
    { title: '单位', dataIndex: '单位', key: 'unit', width: 70 },
    { title: '当前库存', dataIndex: '当前库存', key: 'currentStock', width: 90 },
    { title: '供应商', dataIndex: '供应商', key: 'supplier', width: 120 },
    { title: 'SN序列号', dataIndex: 'SN序列号', key: 'snList', width: 150, ellipsis: true },
  ];

  return (
    <motion.div
      variants={animations.container}
      initial="hidden"
      animate="visible"
      style={{
        padding: '24px',
        background: designTokens.colors.neutral[50],
        minHeight: '100vh',
      }}
    >
      {/* 页面标题 */}
      <motion.div variants={animations.item} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: designTokens.borderRadius.md,
              background: designTokens.colors.primary.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '20px',
            }}
          >
            <ShoppingOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: designTokens.colors.neutral[800] }}>
              耗材管理
            </Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              管理机房耗材的库存、入库和出库
            </Text>
          </div>
        </div>
      </motion.div>

      {/* 主内容区 */}
      <motion.div variants={animations.item}>
        <Card
          style={{
            borderRadius: designTokens.borderRadius.lg,
            boxShadow: designTokens.shadows.md,
            border: 'none',
          }}
          bodyStyle={{ padding: '24px' }}
        >
          {/* 过滤器区域 */}
          <div style={{ marginBottom: '24px' }}>
            <Card
              style={{
                background: designTokens.colors.neutral[50],
                borderRadius: designTokens.borderRadius.md,
                border: `1px solid ${designTokens.colors.neutral[200]}`,
              }}
              bodyStyle={{ padding: '16px' }}
            >
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={12} md={8} lg={8}>
                  <div style={filterInputStyles.container}>搜索</div>
                  <Input
                    placeholder={inputPlaceholders.searchConsumable}
                    value={keyword}
                    onChange={e => handleSearch(e.target.value)}
                    onPressEnter={() => fetchConsumables()}
                    prefix={<SearchOutlined style={{ color: designTokens.colors.neutral[400] }} />}
                    allowClear
                    style={filterInputStyles.input}
                  />
                </Col>

                <Col xs={24} sm={12} md={6} lg={5}>
                  <div style={filterInputStyles.container}>分类</div>
                  <Select
                    placeholder={inputPlaceholders.category}
                    style={filterInputStyles.select}
                    value={category}
                    onChange={setCategory}
                    allowClear
                  >
                    <Option value="all">所有分类</Option>
                    {categories.map(cat => (
                      <Option key={cat.id} value={cat.name}>
                        {cat.name}
                      </Option>
                    ))}
                  </Select>
                </Col>

                <Col xs={24} sm={12} md={6} lg={5}>
                  <div style={filterInputStyles.container}>状态</div>
                  <Select
                    placeholder="选择状态"
                    style={filterInputStyles.select}
                    value={status}
                    onChange={setStatus}
                  >
                    <Option value="all">所有状态</Option>
                    <Option value="active">启用</Option>
                    <Option value="inactive">停用</Option>
                  </Select>
                </Col>

                <Col xs={24} sm={12} md={4} lg={6}>
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: 'transparent' }}>
                    操作
                  </div>
                  <Space>
                    <Button
                      type="primary"
                      icon={<FilterOutlined />}
                      onClick={() => fetchConsumables()}
                      style={{
                        background: designTokens.colors.primary.gradient,
                        border: 'none',
                        borderRadius: designTokens.borderRadius.sm,
                        height: '40px',
                      }}
                    >
                      筛选
                    </Button>
                    <Tooltip title="重置筛选条件">
                      <Button
                        icon={<ClearOutlined />}
                        onClick={handleReset}
                        style={{ borderRadius: designTokens.borderRadius.sm, height: '40px' }}
                      />
                    </Tooltip>
                  </Space>
                </Col>
              </Row>
            </Card>
          </div>

          {/* 操作按钮区域 */}
          <div
            style={{
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Space size="middle">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => showModal()}
                size="large"
                style={{
                  background: designTokens.colors.primary.gradient,
                  border: 'none',
                  borderRadius: designTokens.borderRadius.sm,
                  boxShadow: designTokens.shadows.md,
                }}
              >
                添加耗材
              </Button>
              <Button
                icon={<ArrowDownOutlined />}
                onClick={() => showScanModal('in')}
                size="large"
                style={{
                  borderRadius: designTokens.borderRadius.sm,
                  color: designTokens.colors.success.main,
                  borderColor: designTokens.colors.success.main,
                }}
              >
                扫码入库
              </Button>
              <Button
                icon={<ArrowUpOutlined />}
                onClick={() => showScanModal('out')}
                size="large"
                style={{
                  borderRadius: designTokens.borderRadius.sm,
                  color: designTokens.colors.error.main,
                  borderColor: designTokens.colors.error.main,
                }}
              >
                扫码出库
              </Button>
              <Button
                icon={<ImportOutlined />}
                onClick={showImportModal}
                size="large"
                style={{ borderRadius: designTokens.borderRadius.sm }}
              >
                批量导入
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={handleExport}
                size="large"
                style={{ borderRadius: designTokens.borderRadius.sm }}
              >
                导出
              </Button>
            </Space>

            <Space>
              <Tooltip title="刷新数据">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => fetchConsumables()}
                  loading={loading}
                  style={{ borderRadius: designTokens.borderRadius.sm }}
                />
              </Tooltip>
            </Space>
          </div>

          {/* 数据表格 */}
          {loading ? (
            <div style={{ padding: '40px' }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          ) : consumables.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: '16px',
                        color: designTokens.colors.neutral[600],
                        marginBottom: '8px',
                      }}
                    >
                      暂无耗材数据
                    </div>
                    <div style={{ fontSize: '13px', color: designTokens.colors.neutral[400] }}>
                      点击"添加耗材"按钮创建第一个耗材
                    </div>
                  </div>
                }
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => showModal()}
                  style={{
                    background: designTokens.colors.primary.gradient,
                    border: 'none',
                    borderRadius: designTokens.borderRadius.sm,
                  }}
                >
                  添加耗材
                </Button>
              </Empty>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Table
                columns={columns}
                dataSource={consumables}
                rowKey="consumableId"
                loading={loading}
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50', '100'],
                }}
                onChange={pagination => fetchConsumables(pagination.current, pagination.pageSize)}
                scroll={{ x: 1400 }}
                style={{
                  borderRadius: designTokens.borderRadius.md,
                  overflow: 'hidden',
                }}
              />
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* 添加/编辑耗材弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: designTokens.borderRadius.md,
                background: designTokens.colors.primary.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <ShoppingOutlined />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 600 }}>
              {editingConsumable ? '编辑耗材' : '添加耗材'}
            </span>
          </div>
        }
        open={modalVisible}
        closeIcon={<CloseButton />}
        onCancel={handleCancel}
        footer={null}
        width={900}
        style={{ top: 20 }}
      >
        <div
          style={{
            maxHeight: '65vh',
            overflowY: 'auto',
            padding: '24px',
            paddingRight: '16px',
          }}
          className="custom-scroll-container"
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {/* 基本信息 */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                borderRadius: designTokens.borderRadius.lg,
                padding: '20px',
                marginBottom: '20px',
                border: '1px solid #bae6fd',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: designTokens.colors.neutral[700],
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: designTokens.colors.primary.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                >
                  1
                </div>
                基本信息
              </div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="名称"
                    rules={[inputValidationRules.required('请输入名称')]}
                  >
                    <Input
                      placeholder={inputPlaceholders.consumableName}
                      style={inputStyles.form}
                      prefix={
                        <ShoppingOutlined style={{ color: designTokens.colors.neutral[400] }} />
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="category"
                    label="分类"
                    rules={[inputValidationRules.required('请选择分类')]}
                  >
                    <Select
                      placeholder={inputPlaceholders.category}
                      allowClear
                      style={selectStyles.base}
                    >
                      {categories.map(cat => (
                        <Option key={cat.id} value={cat.name}>
                          {cat.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="unit"
                    label="单位"
                    rules={[inputValidationRules.required('请输入单位')]}
                    initialValue="个"
                  >
                    <Input placeholder={inputPlaceholders.unit} style={inputStyles.form} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="description" label="描述">
                    <Input placeholder={inputPlaceholders.description} style={inputStyles.form} />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* 库存管理 */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                borderRadius: designTokens.borderRadius.lg,
                padding: '20px',
                marginBottom: '20px',
                border: '1px solid #86efac',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: designTokens.colors.neutral[700],
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: designTokens.colors.success.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                >
                  2
                </div>
                库存管理
                <Text type="secondary" style={{ fontSize: '12px', marginLeft: 'auto' }}>
                  设置库存预警和上限
                </Text>
              </div>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="currentStock"
                    label="当前库存"
                    rules={[inputValidationRules.required('请输入当前库存')]}
                  >
                    <InputNumber
                      min={0}
                      style={{ ...inputNumberStyles.base, width: '100%' }}
                      placeholder={inputPlaceholders.stock}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="minStock"
                    label="最小库存(预警线)"
                    rules={[inputValidationRules.required('请输入最小库存')]}
                  >
                    <InputNumber
                      min={0}
                      style={{ ...inputNumberStyles.base, width: '100%' }}
                      placeholder={inputPlaceholders.minStock}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="最大库存">
                    <div style={{ marginBottom: '8px' }}>
                      <Checkbox
                        checked={maxStockUnlimited}
                        onChange={e => {
                          setMaxStockUnlimited(e.target.checked);
                          if (e.target.checked) {
                            form.setFieldsValue({ maxStock: undefined });
                          }
                        }}
                      >
                        无限制
                      </Checkbox>
                    </div>
                    {!maxStockUnlimited && (
                      <Form.Item
                        name="maxStock"
                        noStyle
                        rules={[inputValidationRules.required('请输入最大库存')]}
                      >
                        <InputNumber
                          min={0}
                          style={{ ...inputNumberStyles.base, width: '100%' }}
                          placeholder={inputPlaceholders.maxStock}
                        />
                      </Form.Item>
                    )}
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* 价格与状态 */}
            <div
              style={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                borderRadius: designTokens.borderRadius.lg,
                padding: '20px',
                marginBottom: '20px',
                border: '1px solid #fcd34d',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: designTokens.colors.neutral[700],
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: designTokens.colors.warning.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                >
                  3
                </div>
                价格与状态
              </div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="unitPrice" label="单价(元)">
                    <InputNumber
                      min={0}
                      step={0.01}
                      precision={2}
                      style={{ ...inputNumberStyles.base, width: '100%' }}
                      placeholder={inputPlaceholders.unitPrice}
                      prefix="¥"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="status"
                    label="状态"
                    rules={[inputValidationRules.required('请选择状态')]}
                  >
                    <Select placeholder="请选择状态" style={selectStyles.base}>
                      <Option value="active">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircleOutlined
                            style={{ color: designTokens.colors.success.main }}
                          />
                          启用
                        </span>
                      </Option>
                      <Option value="inactive">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ExclamationCircleOutlined
                            style={{ color: designTokens.colors.error.main }}
                          />
                          停用
                        </span>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* 其他信息 */}
            <div
              style={{
                background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                borderRadius: designTokens.borderRadius.lg,
                padding: '20px',
                marginBottom: '20px',
                border: '1px solid #d8b4fe',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: designTokens.colors.neutral[700],
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                >
                  4
                </div>
                其他信息
              </div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="supplier" label="供应商">
                    <Input placeholder={inputPlaceholders.supplier} style={inputStyles.form} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="location" label="存放位置">
                    <Input placeholder={inputPlaceholders.location} style={inputStyles.form} />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* SN序列号管理 */}
            <div
              style={{
                background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                borderRadius: designTokens.borderRadius.lg,
                padding: '20px',
                marginBottom: '20px',
                border: '1px solid #fda4af',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: designTokens.colors.neutral[700],
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: designTokens.colors.error.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  >
                    5
                  </div>
                  SN序列号管理
                  <Tag color="red" style={{ marginLeft: '8px', borderRadius: '12px' }}>
                    已录入 {snList.length} 个
                  </Tag>
                </div>
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    icon={<ScanOutlined />}
                    onClick={() => {
                      setScanMode('add');
                      setScanValue('');
                      setScanModalVisible(true);
                      setTimeout(() => scanInputRef.current?.focus(), 100);
                    }}
                    style={{
                      background: designTokens.colors.primary.gradient,
                      border: 'none',
                      borderRadius: designTokens.borderRadius.sm,
                    }}
                  >
                    扫码添加
                  </Button>
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setSnInputVisible(!snInputVisible)}
                    style={{ borderRadius: designTokens.borderRadius.sm }}
                  >
                    批量添加
                  </Button>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setSnList([]);
                      form.setFieldsValue({ currentStock: 0 });
                    }}
                    disabled={snList.length === 0}
                    style={{ borderRadius: designTokens.borderRadius.sm }}
                  >
                    清空全部
                  </Button>
                </Space>
              </div>

              {/* 批量添加输入区 */}
              {snInputVisible && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginBottom: '12px' }}
                >
                  <Alert
                    message="批量添加提示"
                    description="每行输入一个SN序列号，系统会自动过滤重复项"
                    type="info"
                    showIcon
                    style={{ marginBottom: '12px', borderRadius: designTokens.borderRadius.md }}
                  />
                  <TextArea
                    rows={4}
                    placeholder="输入SN序列号，每行一个&#10;例如：&#10;SN001&#10;SN002&#10;SN003"
                    value={snInputValue}
                    onChange={e => setSnInputValue(e.target.value)}
                    style={{ ...textAreaStyles.base, marginBottom: '8px' }}
                  />
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        const newSns = snInputValue
                          .split('\n')
                          .map(s => s.trim())
                          .filter(s => s && !snList.includes(s));
                        if (newSns.length > 0) {
                          const updatedSnList = [...snList, ...newSns];
                          setSnList(updatedSnList);
                          form.setFieldsValue({ currentStock: updatedSnList.length });
                          setSnInputValue('');
                          message.success(`成功添加 ${newSns.length} 个SN`);
                        } else {
                          message.warning('没有新的SN可添加（可能已存在或为空）');
                        }
                      }}
                      style={{
                        background: designTokens.colors.success.gradient,
                        border: 'none',
                        borderRadius: designTokens.borderRadius.sm,
                      }}
                    >
                      确认添加
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        setSnInputValue('');
                        setSnInputVisible(false);
                      }}
                      style={{ borderRadius: designTokens.borderRadius.sm }}
                    >
                      取消
                    </Button>
                  </Space>
                </motion.div>
              )}

              {/* SN列表展示 */}
              {snList.length > 0 ? (
                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: `1px solid ${designTokens.colors.neutral[200]}`,
                    borderRadius: designTokens.borderRadius.md,
                    padding: '12px',
                    background: '#fff',
                  }}
                >
                  <AnimatePresence>
                    {snList.map((sn, index) => (
                      <motion.div
                        key={sn}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'inline-block', marginBottom: '8px', marginRight: '8px' }}
                      >
                        <Tag
                          closable
                          onClose={() => {
                            const newSnList = snList.filter((_, i) => i !== index);
                            setSnList(newSnList);
                            form.setFieldsValue({ currentStock: newSnList.length });
                          }}
                          color="blue"
                          style={{
                            padding: '4px 8px',
                            borderRadius: designTokens.borderRadius.sm,
                            fontSize: '13px',
                          }}
                        >
                          {sn}
                        </Tag>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px',
                    color: designTokens.colors.neutral[400],
                    background: '#fff',
                    borderRadius: designTokens.borderRadius.md,
                    border: `1px dashed ${designTokens.colors.neutral[300]}`,
                  }}
                >
                  <BarcodeOutlined
                    style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}
                  />
                  <div>暂无SN序列号</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>点击上方按钮添加</div>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '16px',
                borderTop: `1px solid ${designTokens.colors.neutral[200]}`,
              }}
            >
              <Button
                size="large"
                onClick={handleCancel}
                style={{
                  borderRadius: designTokens.borderRadius.sm,
                  minWidth: '100px',
                }}
              >
                取消
              </Button>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                style={{
                  background: designTokens.colors.primary.gradient,
                  border: 'none',
                  borderRadius: designTokens.borderRadius.sm,
                  minWidth: '120px',
                  boxShadow: designTokens.shadows.md,
                }}
              >
                {editingConsumable ? '更新耗材' : '创建耗材'}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* 导入耗材弹窗 - 全新UI/UX设计 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${designTokens.colors.info.main} 0%, ${designTokens.colors.primary.main} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: `0 4px 12px ${designTokens.colors.info.main}40`,
              }}
            >
              <ImportOutlined style={{ fontSize: '20px' }} />
            </div>
            <div>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: designTokens.colors.neutral[800],
                }}
              >
                批量导入耗材
              </span>
              <div
                style={{
                  fontSize: '12px',
                  color: designTokens.colors.neutral[500],
                  marginTop: '2px',
                }}
              >
                支持 Excel/CSV 格式批量导入
              </div>
            </div>
          </div>
        }
        open={importModalVisible}
        closeIcon={<CloseButton />}
        onCancel={handleImportCancel}
        footer={null}
        width={920}
        bodyStyle={{ padding: '24px' }}
        style={{ top: 40 }}
      >
        {/* 步骤指示器 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '32px',
            padding: '0 40px',
          }}
        >
          {[
            { key: 'upload', label: '上传文件', icon: UploadOutlined },
            { key: 'preview', label: '预览确认', icon: FileTextOutlined },
            { key: 'result', label: '完成', icon: CheckCircleOutlined },
          ].map((step, index) => {
            const isActive = importStep === step.key;
            const isPast = ['upload', 'preview', 'result'].indexOf(importStep) > index;
            const StepIcon = step.icon;

            return (
              <React.Fragment key={step.key}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background:
                        isActive || isPast
                          ? `linear-gradient(135deg, ${designTokens.colors.primary.main} 0%, ${designTokens.colors.success.main} 100%)`
                          : designTokens.colors.neutral[100],
                      color: isActive || isPast ? '#fff' : designTokens.colors.neutral[400],
                      boxShadow: isActive
                        ? `0 4px 16px ${designTokens.colors.primary.main}50`
                        : 'none',
                      transition: 'all 0.3s ease',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    <StepIcon style={{ fontSize: '18px' }} />
                  </div>
                  <span
                    style={{
                      marginTop: '8px',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive
                        ? designTokens.colors.primary.main
                        : designTokens.colors.neutral[500],
                    }}
                  >
                    {step.label}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    style={{
                      width: '80px',
                      height: '2px',
                      background: isPast
                        ? designTokens.colors.success.main
                        : designTokens.colors.neutral[200],
                      margin: '0 12px',
                      marginBottom: '28px',
                      borderRadius: '1px',
                      transition: 'background 0.3s ease',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ minHeight: '400px' }}>
          {/* 步骤1: 上传文件 */}
          {importStep === 'upload' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* 模板下载区域 */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${designTokens.colors.neutral[50]} 0%, ${designTokens.colors.info.main}08 100%)`,
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px',
                  border: `1px solid ${designTokens.colors.neutral[200]}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <FileExcelOutlined
                        style={{ fontSize: '20px', color: designTokens.colors.success.main }}
                      />
                      <span
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: designTokens.colors.neutral[800],
                        }}
                      >
                        下载导入模板
                      </span>
                    </div>
                    <Text type="secondary" style={{ fontSize: '13px', lineHeight: 1.6 }}>
                      先下载标准模板，填写数据后再上传，支持 .xlsx、.xls、.csv 格式
                    </Text>
                  </div>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={downloadTemplate}
                    size="large"
                    style={{
                      background: `linear-gradient(135deg, ${designTokens.colors.success.main} 0%, ${designTokens.colors.primary.main} 100%)`,
                      border: 'none',
                      borderRadius: '10px',
                      height: '44px',
                      paddingInline: '24px',
                      boxShadow: `0 4px 12px ${designTokens.colors.success.main}40`,
                    }}
                  >
                    下载模板
                  </Button>
                </div>

                <Divider style={{ margin: '20px 0' }} />

                {/* 字段说明 */}
                <div
                  style={{
                    background: '#fff',
                    borderRadius: '10px',
                    padding: '20px',
                    border: `1px solid ${designTokens.colors.neutral[100]}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: `${designTokens.colors.info.main}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <InfoCircleOutlined
                        style={{ fontSize: '14px', color: designTokens.colors.info.main }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: designTokens.colors.neutral[800],
                      }}
                    >
                      模板字段说明
                    </span>
                    <Tag
                      color="error"
                      style={{ marginLeft: '8px', borderRadius: '4px', fontSize: '11px' }}
                    >
                      必填
                    </Tag>
                    <Tag color="default" style={{ borderRadius: '4px', fontSize: '11px' }}>
                      可选
                    </Tag>
                  </div>

                  <div
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}
                  >
                    {[
                      {
                        field: '耗材ID',
                        desc: '留空自动生成；填写后可识别并更新现有耗材',
                        required: false,
                        icon: '🔑',
                      },
                      { field: '名称', desc: '耗材名称，必填项', required: true, icon: '📝' },
                      {
                        field: '分类',
                        desc: '耗材分类，如"光模块"或"光纤跳线"，必填',
                        required: true,
                        icon: '📂',
                      },
                      {
                        field: '单位',
                        desc: '计量单位，如"个"、"根"、"箱"，默认"个"',
                        required: false,
                        icon: '📏',
                      },
                      {
                        field: '当前库存',
                        desc: '当前库存数量，数字类型',
                        required: false,
                        icon: '📦',
                      },
                      {
                        field: '最小库存',
                        desc: '安全库存阈值，低于此值会触发预警',
                        required: false,
                        icon: '⚠️',
                      },
                      {
                        field: '最大库存',
                        desc: '最大库存限制，0表示无限制',
                        required: false,
                        icon: '📈',
                      },
                      { field: '单价', desc: '耗材单价，数字类型', required: false, icon: '💰' },
                      { field: '供应商', desc: '耗材供应商名称', required: false, icon: '🏭' },
                      {
                        field: '存放位置',
                        desc: '仓库内存放位置，如"A柜-01层"',
                        required: false,
                        icon: '📍',
                      },
                      { field: '描述', desc: '耗材的详细描述或备注', required: false, icon: '📄' },
                      {
                        field: 'SN序列号',
                        desc: '多个SN用逗号分隔，如"SN001,SN002"',
                        required: false,
                        icon: '🏷️',
                      },
                      {
                        field: '状态',
                        desc: '"active"启用，"inactive"停用，默认启用',
                        required: false,
                        icon: '✅',
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          gap: '10px',
                          padding: '10px 12px',
                          background: designTokens.colors.neutral[50],
                          borderRadius: '8px',
                          border: `1px solid ${designTokens.colors.neutral[100]}`,
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: item.required
                              ? `${designTokens.colors.error.main}15`
                              : `${designTokens.colors.primary.main}10`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>{item.icon}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '4px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: designTokens.colors.neutral[800],
                              }}
                            >
                              {item.field}
                            </span>
                            {item.required && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  background: `${designTokens.colors.error.main}15`,
                                  color: designTokens.colors.error.main,
                                  fontWeight: 500,
                                }}
                              >
                                必填
                              </span>
                            )}
                          </div>
                          <Text
                            type="secondary"
                            style={{ fontSize: '11px', lineHeight: 1.4, display: 'block' }}
                          >
                            {item.desc}
                          </Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 拖拽上传区域 */}
              <Upload.Dragger
                accept=".xlsx,.xls,.csv"
                maxCount={1}
                beforeUpload={() => false}
                onChange={handleFileChange}
                showUploadList={false}
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '48px 24px' }}>
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${designTokens.colors.primary.main}10 0%, ${designTokens.colors.info.main}20 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                    }}
                  >
                    <UploadOutlined
                      style={{ fontSize: '32px', color: designTokens.colors.primary.main }}
                    />
                  </div>
                  <Text
                    style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      display: 'block',
                      marginBottom: '8px',
                      color: designTokens.colors.neutral[800],
                    }}
                  >
                    点击或拖拽文件到此处上传
                  </Text>
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    支持 Excel (.xlsx/.xls)、CSV (.csv) 格式，文件大小不超过 10MB
                  </Text>
                  <div
                    style={{
                      marginTop: '20px',
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '12px',
                    }}
                  >
                    {['.xlsx', '.xls', '.csv'].map(type => (
                      <Tag
                        key={type}
                        style={{
                          borderRadius: '6px',
                          padding: '4px 12px',
                          fontSize: '12px',
                          background: designTokens.colors.neutral[100],
                          border: 'none',
                        }}
                      >
                        {type}
                      </Tag>
                    ))}
                  </div>
                </div>
              </Upload.Dragger>
            </motion.div>
          )}

          {/* 步骤2: 预览确认 */}
          {importStep === 'preview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* 数据统计卡片 */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    background: `linear-gradient(135deg, ${designTokens.colors.primary.main} 0%, ${designTokens.colors.info.main} 100%)`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    color: '#fff',
                  }}
                >
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>{importPreview.length}</div>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>待导入记录</div>
                </div>
                <div
                  style={{
                    flex: 1,
                    background:
                      importValidationErrors.length > 0
                        ? `linear-gradient(135deg, ${designTokens.colors.warning.main} 0%, ${designTokens.colors.error.main} 100%)`
                        : `linear-gradient(135deg, ${designTokens.colors.success.main} 0%, #52c41a 100%)`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    color: '#fff',
                  }}
                >
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>
                    {importValidationErrors.length}
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>数据问题</div>
                </div>
              </div>

              {/* 错误提示 */}
              {importValidationErrors.length > 0 && (
                <Alert
                  message="数据校验发现问题"
                  description={
                    <div style={{ maxHeight: '80px', overflowY: 'auto', marginTop: '8px' }}>
                      {importValidationErrors.slice(0, 5).map((err, idx) => (
                        <div key={idx} style={{ fontSize: '13px', marginBottom: '4px' }}>
                          <Tag color="warning" style={{ marginRight: '8px' }}>
                            行{err.row}
                          </Tag>
                          <Text type="secondary">
                            {err.field && `[${err.field}]`} {err.message}
                          </Text>
                        </div>
                      ))}
                      {importValidationErrors.length > 5 && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          ...还有 {importValidationErrors.length - 5} 个问题
                        </Text>
                      )}
                    </div>
                  }
                  type="warning"
                  showIcon
                  icon={<WarningOutlined />}
                  style={{
                    marginBottom: '20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: `${designTokens.colors.warning.main}15`,
                  }}
                />
              )}

              {/* 导入模式选择 */}
              <Card
                style={{
                  borderRadius: '12px',
                  marginBottom: '20px',
                  border: `1px solid ${designTokens.colors.neutral[200]}`,
                }}
                bodyStyle={{ padding: '16px 20px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `${designTokens.colors.primary.main}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileTextOutlined style={{ color: designTokens.colors.primary.main }} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>导入模式</span>
                </div>
                <Radio.Group
                  value={importMode}
                  onChange={e => setImportMode(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <Radio value="create" style={{ width: '100%' }}>
                      <Card
                        size="small"
                        style={{
                          marginLeft: '8px',
                          width: 'calc(100% - 8px)',
                          borderRadius: '10px',
                          border:
                            importMode === 'create'
                              ? `2px solid ${designTokens.colors.primary.main}`
                              : `1px solid ${designTokens.colors.neutral[200]}`,
                          background:
                            importMode === 'create'
                              ? `${designTokens.colors.primary.main}08`
                              : '#fff',
                        }}
                        bodyStyle={{ padding: '12px 16px' }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>仅新增模式</div>
                        <div style={{ fontSize: '12px', color: designTokens.colors.neutral[500] }}>
                          跳过已存在的耗材（根据耗材ID判断），仅创建新耗材
                        </div>
                      </Card>
                    </Radio>
                    <Radio value="update" style={{ width: '100%' }}>
                      <Card
                        size="small"
                        style={{
                          marginLeft: '8px',
                          width: 'calc(100% - 8px)',
                          borderRadius: '10px',
                          border:
                            importMode === 'update'
                              ? `2px solid ${designTokens.colors.primary.main}`
                              : `1px solid ${designTokens.colors.neutral[200]}`,
                          background:
                            importMode === 'update'
                              ? `${designTokens.colors.primary.main}08`
                              : '#fff',
                        }}
                        bodyStyle={{ padding: '12px 16px' }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>更新模式</div>
                        <div style={{ fontSize: '12px', color: designTokens.colors.neutral[500] }}>
                          如果耗材ID已存在则更新现有记录，不存在则创建新耗材
                        </div>
                      </Card>
                    </Radio>
                  </Space>
                </Radio.Group>
              </Card>

              {/* 数据预览表格 */}
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>数据预览</span>
                    <Tag color="blue" style={{ marginLeft: '8px', borderRadius: '6px' }}>
                      {importPreview.length} 条
                    </Tag>
                  </div>
                }
                extra={
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => setImportStep('upload')}
                    style={{ borderRadius: '8px' }}
                  >
                    重新选择
                  </Button>
                }
                style={{
                  borderRadius: '12px',
                  border: `1px solid ${designTokens.colors.neutral[200]}`,
                }}
                bodyStyle={{ padding: 0 }}
              >
                <Table
                  columns={previewColumns}
                  dataSource={importPreview}
                  rowKey={(record, index) => index}
                  pagination={{ pageSize: 5, showSizeChanger: false }}
                  size="small"
                  scroll={{ x: 900 }}
                  style={{ borderRadius: '12px' }}
                />
              </Card>
            </motion.div>
          )}

          {/* 导入中状态 */}
          {importStep === 'importing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                textAlign: 'center',
                padding: '48px 24px',
              }}
            >
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${designTokens.colors.primary.main} 0%, ${designTokens.colors.info.main} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  boxShadow: `0 8px 24px ${designTokens.colors.primary.main}40`,
                  animation: 'pulse 2s infinite',
                }}
              >
                <ImportOutlined style={{ fontSize: '48px', color: '#fff' }} />
              </div>
              <Title level={4} style={{ margin: 0, marginBottom: '8px', fontSize: '20px' }}>
                {importJobStatus?.status === 'processing' ? '正在导入中...' : '准备导入...'}
              </Title>
              <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginBottom: '24px' }}>
                {importPhase}
              </Text>

              {importJobStatus && (
                <div style={{ marginBottom: '24px' }}>
                  <Row gutter={16} style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <Col span={8}>
                      <Card size="small" style={{ textAlign: 'center', borderRadius: '12px' }} bodyStyle={{ padding: '12px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.success.main }}>
                          {importJobStatus.successCount || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: designTokens.colors.neutral[500] }}>成功</div>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small" style={{ textAlign: 'center', borderRadius: '12px' }} bodyStyle={{ padding: '12px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.warning.main }}>
                          {importJobStatus.skippedCount || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: designTokens.colors.neutral[500] }}>跳过</div>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small" style={{ textAlign: 'center', borderRadius: '12px' }} bodyStyle={{ padding: '12px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.error.main }}>
                          {importJobStatus.failedCount || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: designTokens.colors.neutral[500] }}>失败</div>
                      </Card>
                    </Col>
                  </Row>
                  <div style={{ marginTop: '16px', color: designTokens.colors.neutral[500], fontSize: '13px' }}>
                    已处理 {importJobStatus.processedItems || 0} / {importJobStatus.totalItems || 0} 条
                  </div>
                </div>
              )}

              <Progress
                percent={importProgress}
                status={importProgress === 100 ? 'success' : 'active'}
                strokeColor={{
                  '0%': designTokens.colors.primary.main,
                  '100%': designTokens.colors.success.main,
                }}
                style={{ width: '280px', margin: '0 auto 24px' }}
              />

              <Space>
                <Button
                  danger
                  onClick={handleCancelImport}
                  disabled={!importJobId || !importJobStatus?.canCancel}
                  style={{ borderRadius: '10px' }}
                >
                  取消导入
                </Button>
                <Button
                  onClick={handleImportCancel}
                  style={{ borderRadius: '10px' }}
                >
                  关闭
                </Button>
              </Space>

              <style>{`
                @keyframes pulse {
                  0% { transform: scale(1); }
                  50% { transform: scale(1.05); }
                  100% { transform: scale(1); }
                }
              `}</style>
            </motion.div>
          )}

          {/* 步骤3: 完成 */}
          {importStep === 'result' && importResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {/* 结果状态 */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px 0 28px',
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  style={{
                    width: '88px',
                    height: '88px',
                    borderRadius: '50%',
                    background:
                      importResult.failed === 0
                        ? `linear-gradient(135deg, ${designTokens.colors.success.main} 0%, #52c41a 100%)`
                        : `linear-gradient(135deg, ${designTokens.colors.warning.main} 0%, ${designTokens.colors.error.main} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    boxShadow:
                      importResult.failed === 0
                        ? `0 8px 24px ${designTokens.colors.success.main}50`
                        : `0 8px 24px ${designTokens.colors.warning.main}50`,
                  }}
                >
                  {importResult.failed === 0 ? (
                    <CheckCircleOutlined style={{ fontSize: '44px', color: '#fff' }} />
                  ) : (
                    <WarningOutlined style={{ fontSize: '44px', color: '#fff' }} />
                  )}
                </motion.div>
                <Title level={4} style={{ margin: 0, marginBottom: '8px', fontSize: '20px' }}>
                  {importResult.failed === 0 ? '导入成功！' : '导入完成（部分失败）'}
                </Title>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  {importResult.success > 0 && `成功新增 ${importResult.success} 条，`}
                  {importResult.updated > 0 && `更新 ${importResult.updated} 条，`}
                  {importResult.skipped > 0 && `跳过 ${importResult.skipped} 条，`}
                  {importResult.failed > 0 && `失败 ${importResult.failed} 条`}
                </Text>
              </div>

              {/* 统计卡片 */}
              <Row gutter={[12, 12]} style={{ marginBottom: '24px' }}>
                {[
                  {
                    label: '新增成功',
                    value: importResult.success,
                    color: designTokens.colors.success.main,
                    bg: `${designTokens.colors.success.main}15`,
                  },
                  {
                    label: '更新成功',
                    value: importResult.updated,
                    color: designTokens.colors.primary.main,
                    bg: `${designTokens.colors.primary.main}15`,
                  },
                  {
                    label: '跳过',
                    value: importResult.skipped,
                    color: designTokens.colors.neutral[500],
                    bg: designTokens.colors.neutral[100],
                  },
                  {
                    label: '失败',
                    value: importResult.failed,
                    color: designTokens.colors.error.main,
                    bg: `${designTokens.colors.error.main}15`,
                  },
                ].map((stat, idx) => (
                  <Col span={6} key={idx}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                    >
                      <Card
                        size="small"
                        style={{
                          textAlign: 'center',
                          borderRadius: '12px',
                          border: 'none',
                          background: stat.bg,
                        }}
                        bodyStyle={{ padding: '16px 8px' }}
                      >
                        <div
                          style={{
                            fontSize: '28px',
                            fontWeight: 700,
                            color: stat.color,
                            lineHeight: 1.2,
                          }}
                        >
                          {stat.value}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: designTokens.colors.neutral[600],
                            marginTop: '4px',
                          }}
                        >
                          {stat.label}
                        </div>
                      </Card>
                    </motion.div>
                  </Col>
                ))}
              </Row>

              {/* 失败记录 */}
              {importResult.failed > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <WarningOutlined style={{ color: designTokens.colors.error.main }} />
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>失败记录</span>
                        <Tag color="error" style={{ marginLeft: '8px', borderRadius: '6px' }}>
                          {importResult.failed} 条
                        </Tag>
                      </div>
                    }
                    extra={
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={downloadFailedRecords}
                        style={{ borderRadius: '8px' }}
                      >
                        导出失败记录
                      </Button>
                    }
                    style={{
                      borderRadius: '12px',
                      border: `1px solid ${designTokens.colors.error.main}30`,
                    }}
                    bodyStyle={{ padding: 0 }}
                  >
                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      {importResult.details
                        .filter(d => d.status === 'failed')
                        .map((detail, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '12px 20px',
                              borderBottom:
                                idx <
                                importResult.details.filter(d => d.status === 'failed').length - 1
                                  ? `1px solid ${designTokens.colors.neutral[100]}`
                                  : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                            }}
                          >
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: `${designTokens.colors.error.main}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: designTokens.colors.error.main,
                                }}
                              >
                                {detail.row}
                              </span>
                            </div>
                            <Text type="secondary" style={{ fontSize: '13px' }}>
                              {detail.error}
                            </Text>
                          </div>
                        ))}
                    </div>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* 导入中状态 */}
          {importing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '16px',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${designTokens.colors.primary.main} 0%, ${designTokens.colors.info.main} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px',
                  boxShadow: `0 8px 24px ${designTokens.colors.primary.main}40`,
                }}
              >
                <ImportOutlined style={{ fontSize: '36px', color: '#fff' }} />
              </div>
              <Text
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  marginBottom: '16px',
                  color: designTokens.colors.neutral[800],
                }}
              >
                正在导入数据...
              </Text>
              <Progress
                percent={importProgress}
                status={importProgress === 100 ? 'success' : 'active'}
                strokeColor={{
                  '0%': designTokens.colors.primary.main,
                  '100%': designTokens.colors.success.main,
                }}
                style={{ width: '280px', marginBottom: '8px' }}
              />
              <Text type="secondary" style={{ fontSize: '13px' }}>
                {importPhase}
              </Text>
            </motion.div>
          )}
        </div>

        {/* 底部按钮 */}
        {!importing && importStep !== 'result' && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '20px',
              borderTop: `1px solid ${designTokens.colors.neutral[100]}`,
              marginTop: '24px',
            }}
          >
            <Button
              onClick={handleImportCancel}
              style={{
                borderRadius: '10px',
                height: '40px',
                paddingInline: '20px',
              }}
            >
              取消
            </Button>
            {importStep === 'preview' && (
              <Button
                type="primary"
                onClick={handleImport}
                disabled={importValidationErrors.length > 0 && importMode === 'create'}
                style={{
                  background: `linear-gradient(135deg, ${designTokens.colors.primary.main} 0%, ${designTokens.colors.success.main} 100%)`,
                  border: 'none',
                  borderRadius: '10px',
                  height: '40px',
                  paddingInline: '32px',
                  boxShadow: `0 4px 12px ${designTokens.colors.primary.main}40`,
                }}
              >
                开始导入
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* 入库/出库弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: designTokens.borderRadius.md,
                background:
                  stockType === 'in'
                    ? designTokens.colors.success.gradient
                    : designTokens.colors.error.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              {stockType === 'in' ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
            </div>
            <span style={{ fontSize: '18px', fontWeight: 600 }}>
              {stockType === 'in' ? '耗材入库' : '耗材出库'}
            </span>
          </div>
        }
        open={stockModalVisible}
        closeIcon={<CloseButton />}
        onCancel={handleStockCancel}
        footer={null}
        width={500}
      >
        <Form
          form={stockForm}
          layout="vertical"
          onFinish={handleStockSubmit}
          style={{ marginTop: '16px' }}
        >
          <Form.Item name="consumableId" label="耗材ID">
            <Input disabled style={{ ...inputStyles.form, ...inputStyles.disabled }} />
          </Form.Item>
          <Form.Item name="consumableName" label="耗材名称">
            <Input disabled style={{ ...inputStyles.form, ...inputStyles.disabled }} />
          </Form.Item>

          {stockType === 'out' && stockRecord?.snList && stockRecord.snList.length > 0 && (
            <Form.Item
              label={
                <span>
                  选择SN序列号
                  <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                    (已选 {selectedSnList.length} 个)
                  </Text>
                </span>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Input
                  placeholder="搜索SN序列号..."
                  prefix={<SearchOutlined />}
                  allowClear
                  value={snSearchKeyword}
                  onChange={e => setSnSearchKeyword(e.target.value)}
                  style={{ ...inputStyles.search, marginBottom: '8px' }}
                />
                <Space size="small" style={{ marginBottom: '8px' }}>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      const filtered = stockRecord.snList.filter(sn =>
                        sn.toLowerCase().includes(snSearchKeyword.toLowerCase())
                      );
                      setSelectedSnList([...new Set([...selectedSnList, ...filtered])]);
                      stockForm.setFieldsValue({
                        quantity: [...new Set([...selectedSnList, ...filtered])].length,
                      });
                    }}
                  >
                    全选过滤结果
                  </Button>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      setSelectedSnList([]);
                      stockForm.setFieldsValue({ quantity: 1 });
                    }}
                  >
                    清空选择
                  </Button>
                </Space>
                <div
                  style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    border: `1px solid ${designTokens.colors.neutral[200]}`,
                    borderRadius: designTokens.borderRadius.sm,
                    padding: '8px',
                  }}
                >
                  {(() => {
                    const snListArray = Array.isArray(stockRecord.snList) ? stockRecord.snList : [];
                    const filteredSnList = snListArray.filter(sn =>
                      sn.toLowerCase().includes(snSearchKeyword.toLowerCase())
                    );
                    if (filteredSnList.length === 0) {
                      return (
                        <Text
                          type="secondary"
                          style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}
                        >
                          无匹配的 SN
                        </Text>
                      );
                    }
                    return filteredSnList.map((sn, index) => (
                      <Tag.CheckableTag
                        key={index}
                        checked={selectedSnList.includes(sn)}
                        onChange={checked => {
                          let newSelected;
                          if (checked) {
                            newSelected = [...selectedSnList, sn];
                          } else {
                            newSelected = selectedSnList.filter(s => s !== sn);
                          }
                          setSelectedSnList(newSelected);
                          stockForm.setFieldsValue({ quantity: newSelected.length });
                        }}
                        style={{ marginBottom: '4px' }}
                      >
                        {sn}
                      </Tag.CheckableTag>
                    ));
                  })()}
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {snSearchKeyword
                    ? `过滤结果: ${stockRecord.snList.filter(sn => sn.toLowerCase().includes(snSearchKeyword.toLowerCase())).length} 个SN`
                    : `共 ${stockRecord.snList.length} 个SN`}
                  ，点击SN进行选择
                </Text>
              </Space>
            </Form.Item>
          )}

          {stockType === 'in' && (
            <Form.Item name="snList" label="入库SN序列号（可选）">
              <Select
                mode="tags"
                style={selectStyles.base}
                placeholder={inputPlaceholders.snList}
                tokenSeparators={[',', '\n']}
              />
            </Form.Item>
          )}

          <Form.Item
            name="quantity"
            label="数量"
            rules={[inputValidationRules.required('请输入数量')]}
          >
            <InputNumber
              min={1}
              max={
                stockType === 'out' && stockRecord?.snList?.length > 0
                  ? stockRecord.snList.length
                  : undefined
              }
              style={inputNumberStyles.base}
              placeholder="请输入数量"
            />
          </Form.Item>
          <Form.Item name="operator" label="操作人">
            <Input placeholder={inputPlaceholders.operator} style={inputStyles.form} />
          </Form.Item>
          <Form.Item name="reason" label={stockType === 'in' ? '入库原因' : '出库原因'}>
            <Input
              placeholder={stockType === 'in' ? '如: 采购入库' : '如: 部门领用、报损出库'}
              style={inputStyles.form}
            />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder={inputPlaceholders.notes} style={textAreaStyles.base} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                style={{
                  background:
                    stockType === 'in'
                      ? designTokens.colors.success.gradient
                      : designTokens.colors.error.gradient,
                  border: 'none',
                  borderRadius: designTokens.borderRadius.sm,
                }}
              >
                {stockType === 'in' ? '确认入库' : '确认出库'}
              </Button>
              <Button onClick={handleStockCancel}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 扫码弹窗 */}
      <Modal
        title={scanMode === 'add' ? '扫码添加SN' : scanMode === 'in' ? '扫码入库' : '扫码出库'}
        open={scanModalVisible}
        closeIcon={<CloseButton />}
        onCancel={handleScanCancel}
        footer={null}
        width={500}
      >
        <div style={{ padding: '16px 0' }}>
          <Alert
            message={
              scanMode === 'add' ? '扫描SN序列号，自动添加到表单中' : '请使用扫码枪扫描SN序列号'
            }
            type="info"
            showIcon
            style={{ marginBottom: '16px', borderRadius: designTokens.borderRadius.md }}
          />

          <div style={{ marginBottom: '16px' }}>
            <Input
              ref={scanInputRef}
              value={scanValue}
              onChange={e => setScanValue(e.target.value)}
              onKeyDown={handleScanKeyDown}
              placeholder={scanMode === 'add' ? '扫描SN后自动添加...' : '扫描SN后自动识别...'}
              prefix={<BarcodeOutlined style={{ color: designTokens.colors.neutral[400] }} />}
              size="large"
              autoFocus
              disabled={scanChecking}
              style={{ borderRadius: designTokens.borderRadius.md }}
            />
          </div>

          {scanMode === 'add' && snList.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  marginBottom: '8px',
                  fontWeight: 500,
                  color: designTokens.colors.neutral[700],
                }}
              >
                已添加SN列表 ({snList.length}个)
              </div>
              <div
                style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  border: `1px solid ${designTokens.colors.neutral[200]}`,
                  borderRadius: designTokens.borderRadius.sm,
                  padding: '8px',
                }}
              >
                {(Array.isArray(snList) ? snList : []).map((sn, index) => (
                  <Tag
                    key={index}
                    closable
                    onClose={() => {
                      const newSnList = snList.filter((_, i) => i !== index);
                      setSnList(newSnList);
                      form.setFieldsValue({ currentStock: newSnList.length });
                    }}
                    color="blue"
                    style={{ marginBottom: '4px' }}
                  >
                    {sn}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {scanMode === 'in' && scannedSnList.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  marginBottom: '8px',
                  fontWeight: 500,
                  color: designTokens.colors.neutral[700],
                }}
              >
                已扫描SN列表 ({scannedSnList.length}个)
              </div>
              <div
                style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  border: `1px solid ${designTokens.colors.neutral[200]}`,
                  borderRadius: designTokens.borderRadius.sm,
                  padding: '8px',
                }}
              >
                {scannedSnList.map((sn, index) => (
                  <Tag
                    key={index}
                    closable
                    onClose={() => setScannedSnList(prev => prev.filter((_, i) => i !== index))}
                    color="blue"
                    style={{ marginBottom: '4px' }}
                  >
                    {sn}
                  </Tag>
                ))}
              </div>

              <div style={{ marginTop: '16px' }}>
                <div
                  style={{
                    marginBottom: '8px',
                    fontWeight: 500,
                    color: designTokens.colors.neutral[700],
                  }}
                >
                  选择入库耗材
                </div>
                <Select
                  placeholder="选择要入库的耗材"
                  style={{ width: '100%' }}
                  showSearch
                  optionFilterProp="label"
                  value={selectedScanInConsumable}
                  onChange={value => setSelectedScanInConsumable(value)}
                  filterOption={true}
                >
                  {allConsumablesForScan.map(item => (
                    <Option key={item.consumableId} value={item.consumableId} label={`${item.name} ${item.category}`}>
                      {item.name} ({item.category}) - 库存: {item.currentStock}
                    </Option>
                  ))}
                </Select>
              </div>

              <Button
                type="primary"
                style={{
                  width: '100%',
                  marginTop: '16px',
                  background: designTokens.colors.success.gradient,
                  border: 'none',
                  borderRadius: designTokens.borderRadius.sm,
                }}
                onClick={() => {
                  if (!selectedScanInConsumable) {
                    message.warning('请选择要入库的耗材');
                    return;
                  }
                  handleScanInSubmit(selectedScanInConsumable);
                }}
              >
                确认入库 {scannedSnList.length} 个SN
              </Button>
            </div>
          )}

          {scanMode === 'out' && pendingOutItems.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  marginBottom: '8px',
                  fontWeight: 500,
                  color: designTokens.colors.neutral[700],
                }}
              >
                待出库列表 ({pendingOutItems.length} 项)
              </div>
              <div
                style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  border: `1px solid ${designTokens.colors.neutral[200]}`,
                  borderRadius: designTokens.borderRadius.sm,
                  padding: '8px',
                }}
              >
                {pendingOutItems.map(item => (
                  <Tag
                    key={item.consumable.consumableId}
                    closable
                    onClose={() => removeFromPendingOut(item.consumable.consumableId)}
                    color="red"
                    style={{ marginBottom: '4px', marginRight: '8px' }}
                  >
                    {item.consumable.name} × {item.quantity}
                    {item.snList.length > 0 && ` (${item.snList.length} SN)`}
                  </Tag>
                ))}
              </div>
              <Button
                type="primary"
                style={{
                  width: '100%',
                  marginTop: '12px',
                  background: designTokens.colors.error.gradient,
                  border: 'none',
                  borderRadius: designTokens.borderRadius.sm,
                }}
                onClick={() => {
                  setScanModalVisible(false);
                  openBatchOutModal();
                }}
              >
                批量出库确认 ({pendingOutItems.length} 项)
              </Button>
            </div>
          )}

          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 提示：也可手动输入条码后按回车键确认
          </Text>
        </div>
      </Modal>

      {/* 扫码快速出库到设备弹窗 */}
      <Modal
        title={
          <Space>
            <QrcodeOutlined style={{ color: designTokens.colors.primary.main }} />
            <span>扫码出库</span>
          </Space>
        }
        open={quickOutModalVisible}
        closeIcon={<CloseButton />}
        onCancel={() => setQuickOutModalVisible(false)}
        footer={null}
        width={520}
        destroyOnClose
      >
        {quickOutConsumable && (
          <div style={{ padding: '16px 0' }}>
            <Card
              size="small"
              style={{
                marginBottom: '16px',
                borderRadius: '12px',
                border: `1px solid ${designTokens.colors.primary.main}30`,
                background: `linear-gradient(135deg, ${designTokens.colors.primary.main}08 0%, ${designTokens.colors.info.main}05 100%)`,
              }}
              bodyStyle={{ padding: '12px 16px' }}
            >
              <Row gutter={16} align="middle">
                <Col flex="none">
                  <Avatar
                    size={48}
                    style={{
                      background: designTokens.colors.primary.gradient,
                      fontSize: '20px',
                    }}
                  >
                    {quickOutConsumable.category?.charAt(0) || '耗'}
                  </Avatar>
                </Col>
                <Col flex="auto">
                  <div style={{ fontWeight: 600, fontSize: '15px', color: designTokens.colors.text.primary }}>
                    {quickOutConsumable.name}
                  </div>
                  <div style={{ fontSize: '12px', color: designTokens.colors.text.secondary }}>
                    {quickOutConsumable.category} · 库存: {quickOutConsumable.currentStock} {quickOutConsumable.unit}
                  </div>
                  {quickOutConsumable.location && (
                    <div style={{ fontSize: '12px', color: designTokens.colors.text.secondary }}>
                      📍 {quickOutConsumable.location}
                    </div>
                  )}
                </Col>
              </Row>
            </Card>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontWeight: 500, marginBottom: '8px', display: 'block', color: designTokens.colors.text.primary }}>
                出库数量
              </label>
              <InputNumber
                min={1}
                max={quickOutConsumable.currentStock}
                value={quickOutQuantity}
                onChange={setQuickOutQuantity}
                style={{ width: '100%', borderRadius: '8px' }}
                size="large"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontWeight: 500, marginBottom: '8px', display: 'block', color: designTokens.colors.text.primary }}>
                目标设备（可选）
              </label>
              <AutoComplete
                value={quickOutDeviceSearch}
                options={quickOutDeviceList.map(d => ({
                  value: d.name,
                  label: (
                    <div style={{ padding: '4px 0' }}>
                      <div style={{ fontWeight: 500 }}>{d.name}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>
                        {d.type} · {d.location ? `${d.location.rackName || ''} ${d.location.roomName || ''}` : '未绑定机柜'}
                      </div>
                    </div>
                  ),
                }))}
                onSearch={handleQuickOutDeviceSearch}
                onSelect={(value, option) => {
                  const device = quickOutDeviceList.find(d => d.name === value);
                  setQuickOutDevice(device);
                  setQuickOutDeviceSearch(device?.name || '');
                }}
                onChange={value => {
                  setQuickOutDeviceSearch(value);
                  if (!value) {
                    setQuickOutDevice(null);
                  }
                }}
                placeholder="搜索设备名称/ID/序列号"
                style={{ width: '100%' }}
                loading={quickOutDeviceLoading}
              />
              {quickOutDevice && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: designTokens.colors.success.main + '15',
                    border: `1px solid ${designTokens.colors.success.main}30`,
                  }}
                >
                  <Space>
                    <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />
                    <span style={{ color: designTokens.colors.success.main, fontWeight: 500 }}>
                      已选择: {quickOutDevice.name}
                    </span>
                  </Space>
                  {quickOutDevice.location && (
                    <div style={{ fontSize: '12px', color: designTokens.colors.text.secondary, marginTop: '4px' }}>
                      📍 {quickOutDevice.location.roomName} · {quickOutDevice.location.rackName}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontWeight: 500, marginBottom: '8px', display: 'block', color: designTokens.colors.text.primary }}>
                出库原因
              </label>
              <Input.TextArea
                value={quickOutReason}
                onChange={e => setQuickOutReason(e.target.value)}
                placeholder="请输入出库原因"
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ borderRadius: '8px' }}
              />
            </div>

            {quickOutSnList.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontWeight: 500, marginBottom: '8px', display: 'block', color: designTokens.colors.text.primary }}>
                  SN序列号 ({quickOutSnList.length}个)
                </label>
                <div
                  style={{
                    maxHeight: '100px',
                    overflowY: 'auto',
                    border: `1px solid ${designTokens.colors.neutral[200]}`,
                    borderRadius: '8px',
                    padding: '8px',
                  }}
                >
                  {quickOutSnList.map((sn, index) => (
                    <Tag key={index} color="purple" style={{ marginBottom: '4px' }}>
                      {sn}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: designTokens.colors.neutral[50],
                marginBottom: '16px',
              }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="出库数量"
                    value={quickOutQuantity}
                    valueStyle={{ fontSize: '20px', color: designTokens.colors.error.main }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="操作前库存"
                    value={quickOutConsumable.currentStock}
                    valueStyle={{ fontSize: '20px' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="操作后库存"
                    value={quickOutConsumable.currentStock - quickOutQuantity}
                    valueStyle={{ fontSize: '20px', color: designTokens.colors.success.main }}
                  />
                </Col>
              </Row>
            </div>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setQuickOutModalVisible(false)} style={{ borderRadius: '8px' }}>
                取消
              </Button>
              <Button
                type="primary"
                loading={quickOutSubmitting}
                onClick={handleQuickOutSubmit}
                disabled={quickOutQuantity < 1 || quickOutQuantity > quickOutConsumable.currentStock}
                style={{
                  borderRadius: '8px',
                  background: designTokens.colors.primary.gradient,
                  border: 'none',
                }}
              >
                确认出库
              </Button>
            </Space>
          </div>
        )}
      </Modal>

      {/* 批量出库确认弹窗 */}
      <Modal
        title={
          <Space>
            <QrcodeOutlined style={{ color: designTokens.colors.primary.main }} />
            <span>批量出库确认 ({pendingOutItems.length} 项)</span>
          </Space>
        }
        open={batchOutModalVisible}
        closeIcon={<CloseButton />}
        onCancel={() => setBatchOutModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <div style={{ padding: '16px 0' }}>
          <Alert
            message="请确认出库信息"
            description="扫描耗材SN后，需要确认目标设备和出库原因才能完成出库"
            type="info"
            showIcon
            style={{ marginBottom: '16px', borderRadius: '8px' }}
          />

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 500, marginBottom: '8px', display: 'block', color: designTokens.colors.text.primary }}>
              待出库耗材 ({pendingOutItems.length} 项)
            </label>
            <div
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: `1px solid ${designTokens.colors.neutral[200]}`,
                borderRadius: '8px',
                padding: '8px',
              }}
            >
              {pendingOutItems.map((item, index) => (
                <Card
                  key={item.consumable.consumableId}
                  size="small"
                  style={{
                    marginBottom: index < pendingOutItems.length - 1 ? '8px' : 0,
                    borderRadius: '8px',
                  }}
                  bodyStyle={{ padding: '8px 12px' }}
                >
                  <Row align="middle" gutter={12}>
                    <Col flex="auto">
                      <div style={{ fontWeight: 500 }}>{item.consumable.name}</div>
                      <div style={{ fontSize: '12px', color: designTokens.colors.text.secondary }}>
                        {item.consumable.category} · 库存: {item.consumable.currentStock}
                        {item.snList.length > 0 && ` · SN: ${item.snList.length}个`}
                      </div>
                      {item.snList.length > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          {item.snList.slice(0, 5).map((sn, i) => (
                            <Tag key={i} color="purple" style={{ marginBottom: '2px' }}>
                              {sn}
                            </Tag>
                          ))}
                          {item.snList.length > 5 && (
                            <Tag color="default">+{item.snList.length - 5} 更多</Tag>
                          )}
                        </div>
                      )}
                    </Col>
                    <Col flex="none">
                      <Tag color="blue" style={{ borderRadius: '6px' }}>
                        × {item.quantity}
                      </Tag>
                    </Col>
                    <Col flex="none">
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removeFromPendingOut(item.consumable.consumableId)}
                      />
                    </Col>
                  </Row>
                </Card>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 500, marginBottom: '8px', display: 'block', color: designTokens.colors.text.primary }}>
              目标设备（可选）
            </label>
            <AutoComplete
              value={batchOutDeviceSearch}
              options={batchOutDeviceList.map(d => ({
                value: d.name,
                label: (
                  <div style={{ padding: '4px 0' }}>
                    <div style={{ fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {d.type} · {d.location ? `${d.location.rackName || ''} ${d.location.roomName || ''}` : '未绑定机柜'}
                    </div>
                  </div>
                ),
              }))}
              onSearch={handleBatchOutDeviceSearch}
              onSelect={(value, option) => {
                const device = batchOutDeviceList.find(d => d.name === value);
                setBatchOutDevice(device);
                setBatchOutDeviceSearch(device?.name || '');
              }}
              onChange={value => {
                setBatchOutDeviceSearch(value);
                if (!value) {
                  setBatchOutDevice(null);
                }
              }}
              placeholder="搜索设备名称/ID/序列号"
              style={{ width: '100%' }}
              loading={batchOutDeviceLoading}
            />
            {batchOutDevice && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: designTokens.colors.success.main + '15',
                  border: `1px solid ${designTokens.colors.success.main}30`,
                }}
              >
                <Space>
                  <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />
                  <span style={{ color: designTokens.colors.success.main, fontWeight: 500 }}>
                    已选择: {batchOutDevice.name}
                  </span>
                </Space>
                {batchOutDevice.location && (
                  <div style={{ fontSize: '12px', color: designTokens.colors.text.secondary, marginTop: '4px' }}>
                    📍 {batchOutDevice.location.roomName} · {batchOutDevice.location.rackName}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 500, marginBottom: '8px', display: 'block', color: designTokens.colors.text.primary }}>
              出库原因
            </label>
            <Input.TextArea
              value={batchOutReason}
              onChange={e => setBatchOutReason(e.target.value)}
              placeholder="请输入出库原因"
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{ borderRadius: '8px' }}
            />
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: designTokens.colors.neutral[50],
              marginBottom: '16px',
            }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="耗材种类"
                  value={pendingOutItems.length}
                  valueStyle={{ fontSize: '20px' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="总数量"
                  value={pendingOutItems.reduce((sum, item) => sum + item.quantity, 0)}
                  valueStyle={{ fontSize: '20px', color: designTokens.colors.error.main }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="SN数量"
                  value={pendingOutItems.reduce((sum, item) => sum + item.snList.length, 0)}
                  valueStyle={{ fontSize: '20px', color: designTokens.colors.primary.main }}
                />
              </Col>
            </Row>
          </div>

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setBatchOutModalVisible(false)} style={{ borderRadius: '8px' }}>
              取消
            </Button>
            <Button
              type="primary"
              loading={batchOutSubmitting}
              onClick={handleBatchOutSubmit}
              disabled={pendingOutItems.length === 0}
              style={{
                borderRadius: '8px',
                background: designTokens.colors.primary.gradient,
                border: 'none',
              }}
            >
              确认出库 ({pendingOutItems.length} 项)
            </Button>
          </Space>
        </div>
      </Modal>
    </motion.div>
  );
}

export default React.memo(ConsumableManagement);
