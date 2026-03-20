import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
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
  Row,
  Col,
  Badge,
  Tag,
  Tooltip,
  Empty,
  Skeleton,
  Alert,
  Typography,
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
} from '@ant-design/icons';
import axios from 'axios';
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
      } catch (error) {
        message.error('获取耗材列表失败');
        console.error('获取耗材列表失败:', error);
      } finally {
        setLoading(false);
      }
    },
    [debouncedKeyword, category, status]
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
      const response = await axios.get('/api/consumables', {
        params: { keyword, category, status, pageSize: 1000 },
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

  const parseCSV = text => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let values = [];
      let inQuotes = false;
      let current = '';

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''));

      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      data.push(row);
    }

    return data;
  };

  const handleFileChange = info => {
    const file = info.fileList[info.fileList.length - 1];
    if (file && file.originFileObj) {
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target.result;
        const parsedData = parseCSV(text);
        setImportPreview(parsedData.slice(0, 10));
        setImportFile(file.originFileObj);
      };
      reader.readAsText(file.originFileObj);
    }
  };

  const showImportModal = () => {
    setImportPreview([]);
    setImportFile(null);
    setImportModalVisible(true);
  };

  const handleImportCancel = () => {
    setImportModalVisible(false);
    setImportPreview([]);
    setImportFile(null);
    setImportProgress(0);
    setImportPhase('');
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!importFile) {
      message.warning('请先选择文件');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportPhase('正在读取文件...');
    setImportResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async e => {
        const text = e.target.result;
        setImportProgress(10);

        setTimeout(() => {
          setImportProgress(20);
          setImportPhase('正在解析CSV数据...');
        }, 100);

        const items = parseCSV(text);
        const totalItems = items.length;

        setTimeout(() => {
          setImportProgress(30);
          setImportPhase(`共解析 ${totalItems} 条记录，准备提交...`);
        }, 200);

        setTimeout(() => {
          setImportProgress(40);
          setImportPhase('正在连接服务器...');
        }, 300);

        const response = await axios.post('/api/consumables/import', { items });

        setTimeout(() => {
          setImportProgress(60);
          setImportPhase('正在处理服务器响应...');
        }, 100);

        setTimeout(() => {
          setImportProgress(80);
          setImportPhase('正在更新本地数据...');
        }, 200);

        const results = response.data.results;

        setTimeout(() => {
          setImportResult(results);
          setImportProgress(100);
          setImportPhase('导入完成');
          setImporting(false);

          if (results.failed > 0) {
            message.warning(`导入完成，成功 ${results.success} 条，失败 ${results.failed} 条`);
          } else {
            message.success({
              content: response.data.message || `成功导入 ${results.success} 条记录`,
              icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
            });
          }
          fetchConsumables();
        }, 300);
      };
      reader.onerror = () => {
        setImporting(false);
        setImportProgress(0);
        setImportPhase('文件读取失败');
        message.error('文件读取失败');
      };
      reader.readAsText(importFile);
    } catch (error) {
      setImporting(false);
      setImportProgress(0);
      setImportPhase('导入失败');
      message.error('导入失败，请检查网络连接或服务器状态');
      console.error('导入耗材失败:', error);
    }
  };

  const downloadTemplate = () => {
    const template =
      '耗材ID,名称,分类,单位,当前库存,最小库存,最大库存,单价,供应商,存放位置,描述,状态\n,测试耗材,办公用品,个,100,10,500,5.00,XX公司,A柜-01层,测试数据,active';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '耗材导入模板.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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

  const showScanModal = useCallback((mode) => {
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

  const handleScanKeyDown = useCallback(async (e) => {
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
                  <p>该SN已关联耗材：<strong>{existingConsumable.name}</strong></p>
                  <p>分类：{existingConsumable.category}</p>
                  <p>当前库存：{existingConsumable.currentStock} {existingConsumable.unit}</p>
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
              }
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
            handleScanCancel();
            showStockModal(res.data.consumable, 'out');
            setSelectedSnList([code]);
            stockForm.setFieldsValue({ quantity: 1 });
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
  }, [scanMode, scanValue, scannedSnList, handleScanCancel, showModal, form, showStockModal, stockForm]);

  const handleScanInSubmit = useCallback(async (consumableId) => {
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
  }, [scannedSnList, handleScanCancel, fetchConsumables]);

  const columns = useMemo(
    () => [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        width: 150,
        render: text => <span style={{ fontWeight: 500, color: designTokens.colors.neutral[800] }}>{text}</span>,
      },
      {
        title: '分类',
        dataIndex: 'category',
        key: 'category',
        width: 120,
        render: text => <Tag color="blue" style={{ borderRadius: '4px' }}>{text}</Tag>,
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
              <Tag 
                color="purple" 
                style={{ borderRadius: '4px', cursor: 'pointer' }}
              >
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
                <span style={{ 
                  color: isLow ? designTokens.colors.error.main : designTokens.colors.success.main, 
                  fontWeight: 600 
                }}>
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
    { title: '名称', dataIndex: '名称', key: 'name', width: 120 },
    { title: '分类', dataIndex: '分类', key: 'category', width: 100 },
    { title: '单位', dataIndex: '单位', key: 'unit', width: 80 },
    { title: '当前库存', dataIndex: '当前库存', key: 'currentStock', width: 90 },
    { title: '单价', dataIndex: '单价', key: 'unitPrice', width: 80 },
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
            <Title level={4} style={{ margin: 0, color: designTokens.colors.neutral[800] }}>耗材管理</Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>管理机房耗材的库存、入库和出库</Text>
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
                  <div style={filterInputStyles.container}>
                    搜索
                  </div>
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
                  <div style={filterInputStyles.container}>
                    分类
                  </div>
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
                  <div style={filterInputStyles.container}>
                    状态
                  </div>
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
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: 'transparent' }}>操作</div>
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
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                style={{ borderRadius: designTokens.borderRadius.sm, color: designTokens.colors.success.main, borderColor: designTokens.colors.success.main }}
              >
                扫码入库
              </Button>
              <Button
                icon={<ArrowUpOutlined />}
                onClick={() => showScanModal('out')}
                size="large"
                style={{ borderRadius: designTokens.borderRadius.sm, color: designTokens.colors.error.main, borderColor: designTokens.colors.error.main }}
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
                    <div style={{ fontSize: '16px', color: designTokens.colors.neutral[600], marginBottom: '8px' }}>
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
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderRadius: designTokens.borderRadius.lg,
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #bae6fd',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              fontSize: '15px',
              fontWeight: '600',
              color: designTokens.colors.neutral[700],
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: designTokens.colors.primary.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '12px',
              }}>1</div>
              基本信息
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="name" label="名称" rules={[inputValidationRules.required('请输入名称')]}>
                  <Input 
                    placeholder={inputPlaceholders.consumableName} 
                    style={inputStyles.form}
                    prefix={<ShoppingOutlined style={{ color: designTokens.colors.neutral[400] }} />}
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
                  <Input 
                    placeholder={inputPlaceholders.unit} 
                    style={inputStyles.form}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="description" label="描述">
                  <Input 
                    placeholder={inputPlaceholders.description} 
                    style={inputStyles.form}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* 库存管理 */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            borderRadius: designTokens.borderRadius.lg,
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #86efac',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              fontSize: '15px',
              fontWeight: '600',
              color: designTokens.colors.neutral[700],
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: designTokens.colors.success.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '12px',
              }}>2</div>
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
          <div style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            borderRadius: designTokens.borderRadius.lg,
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #fcd34d',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              fontSize: '15px',
              fontWeight: '600',
              color: designTokens.colors.neutral[700],
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: designTokens.colors.warning.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '12px',
              }}>3</div>
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
                <Form.Item name="status" label="状态" rules={[inputValidationRules.required('请选择状态')]}>
                  <Select placeholder="请选择状态" style={selectStyles.base}>
                    <Option value="active">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />
                        启用
                      </span>
                    </Option>
                    <Option value="inactive">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ExclamationCircleOutlined style={{ color: designTokens.colors.error.main }} />
                        停用
                      </span>
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* 其他信息 */}
          <div style={{
            background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
            borderRadius: designTokens.borderRadius.lg,
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #d8b4fe',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              fontSize: '15px',
              fontWeight: '600',
              color: designTokens.colors.neutral[700],
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '12px',
              }}>4</div>
              其他信息
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="supplier" label="供应商">
                  <Input 
                    placeholder={inputPlaceholders.supplier} 
                    style={inputStyles.form}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="location" label="存放位置">
                  <Input 
                    placeholder={inputPlaceholders.location} 
                    style={inputStyles.form}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* SN序列号管理 */}
          <div style={{
            background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
            borderRadius: designTokens.borderRadius.lg,
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #fda4af',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '15px',
                fontWeight: '600',
                color: designTokens.colors.neutral[700],
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: designTokens.colors.error.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '12px',
                }}>5</div>
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
                  onClick={() => setSnList([])}
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
                        setSnList([...snList, ...newSns]);
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
                        onClose={() => setSnList(snList.filter((_, i) => i !== index))}
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
              <div style={{
                textAlign: 'center',
                padding: '24px',
                color: designTokens.colors.neutral[400],
                background: '#fff',
                borderRadius: designTokens.borderRadius.md,
                border: `1px dashed ${designTokens.colors.neutral[300]}`,
              }}>
                <BarcodeOutlined style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }} />
                <div>暂无SN序列号</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>点击上方按钮添加</div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            paddingTop: '16px',
            borderTop: `1px solid ${designTokens.colors.neutral[200]}`,
          }}>
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

      {/* 导入耗材弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: designTokens.borderRadius.md,
                background: designTokens.colors.info.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <ImportOutlined />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 600 }}>批量导入耗材</span>
          </div>
        }
        open={importModalVisible}
        closeIcon={<CloseButton />}
        onCancel={handleImportCancel}
        footer={null}
        width={700}
      >
        <div style={{ padding: '16px 0' }}>
          <Alert
            message="请下载模板文件，按要求填写数据后上传导入"
            type="info"
            showIcon
            style={{ marginBottom: '16px', borderRadius: designTokens.borderRadius.md }}
          />

          <Card
            style={{
              background: designTokens.colors.neutral[50],
              borderRadius: designTokens.borderRadius.md,
              marginBottom: '16px',
            }}
          >
            <Space>
              <Button 
                icon={<FileExcelOutlined />} 
                onClick={downloadTemplate}
                style={{ borderRadius: designTokens.borderRadius.sm }}
              >
                下载模板
              </Button>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                请下载模板后填写数据再导入
              </Text>
            </Space>
          </Card>

          <Upload 
            accept=".csv" 
            maxCount={1} 
            beforeUpload={() => false} 
            onChange={handleFileChange}
          >
            <Button 
              icon={<UploadOutlined />}
              style={{ borderRadius: designTokens.borderRadius.sm }}
            >
              选择CSV文件
            </Button>
          </Upload>

          {importPreview.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ marginTop: '24px' }}
            >
              <div style={{ marginBottom: '8px', fontWeight: 500, color: designTokens.colors.neutral[700] }}>
                数据预览（前10条）
              </div>
              <Table
                columns={previewColumns}
                dataSource={importPreview}
                rowKey={(record, index) => index}
                pagination={false}
                size="small"
                scroll={{ x: 500 }}
                style={{ borderRadius: designTokens.borderRadius.md }}
              />
            </motion.div>
          )}

          {importing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ marginTop: '24px', padding: '24px', textAlign: 'center' }}
            >
              <Progress
                percent={importProgress}
                status={importProgress === 100 ? 'success' : 'active'}
                strokeColor={{
                  '0%': designTokens.colors.primary.main,
                  '100%': designTokens.colors.success.main,
                }}
                style={{ borderRadius: designTokens.borderRadius.sm }}
              />
              <div style={{ marginTop: '16px', color: designTokens.colors.neutral[600] }}>
                {importPhase}
              </div>
            </motion.div>
          )}

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={handleImportCancel}>取消</Button>
              <Button
                type="primary"
                onClick={handleImport}
                loading={importing}
                disabled={!importFile}
                style={{
                  background: designTokens.colors.primary.gradient,
                  border: 'none',
                  borderRadius: designTokens.borderRadius.sm,
                }}
              >
                开始导入
              </Button>
            </Space>
          </div>
        </div>
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
                background: stockType === 'in' ? designTokens.colors.success.gradient : designTokens.colors.error.gradient,
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
        <Form form={stockForm} layout="vertical" onFinish={handleStockSubmit} style={{ marginTop: '16px' }}>
          <Form.Item name="consumableId" label="耗材ID">
            <Input disabled style={{ ...inputStyles.form, ...inputStyles.disabled }} />
          </Form.Item>
          <Form.Item name="consumableName" label="耗材名称">
            <Input disabled style={{ ...inputStyles.form, ...inputStyles.disabled }} />
          </Form.Item>
          
          {stockType === 'out' && stockRecord?.snList && stockRecord.snList.length > 0 && (
            <Form.Item label={
              <span>
                选择SN序列号 
                <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                  (已选 {selectedSnList.length} 个)
                </Text>
              </span>
            }>
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
                      stockForm.setFieldsValue({ quantity: [...new Set([...selectedSnList, ...filtered])].length });
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
                    padding: '8px'
                  }}
                >
                  {(() => {
                    const snListArray = Array.isArray(stockRecord.snList) ? stockRecord.snList : [];
                    const filteredSnList = snListArray.filter(sn => 
                      sn.toLowerCase().includes(snSearchKeyword.toLowerCase())
                    );
                    if (filteredSnList.length === 0) {
                      return <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>无匹配的 SN</Text>;
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
                  {snSearchKeyword ? `过滤结果: ${stockRecord.snList.filter(sn => sn.toLowerCase().includes(snSearchKeyword.toLowerCase())).length} 个SN` : `共 ${stockRecord.snList.length} 个SN`}
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
              max={stockType === 'out' && stockRecord?.snList?.length > 0 ? stockRecord.snList.length : undefined}
              style={inputNumberStyles.base} 
              placeholder="请输入数量" 
            />
          </Form.Item>
          <Form.Item name="operator" label="操作人">
            <Input placeholder={inputPlaceholders.operator} style={inputStyles.form} />
          </Form.Item>
          <Form.Item name="reason" label={stockType === 'in' ? '入库原因' : '出库原因'}>
            <Input placeholder={stockType === 'in' ? '如: 采购入库' : '如: 部门领用、报损出库'} style={inputStyles.form} />
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
                  background: stockType === 'in' ? designTokens.colors.success.gradient : designTokens.colors.error.gradient,
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
              scanMode === 'add' 
                ? '扫描SN序列号，自动添加到表单中' 
                : '请使用扫码枪扫描SN序列号'
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
              <div style={{ marginBottom: '8px', fontWeight: 500, color: designTokens.colors.neutral[700] }}>
                已添加SN列表 ({snList.length}个)
              </div>
              <div 
                style={{ 
                  maxHeight: '150px', 
                  overflowY: 'auto', 
                  border: `1px solid ${designTokens.colors.neutral[200]}`,
                  borderRadius: designTokens.borderRadius.sm,
                  padding: '8px'
                }}
              >
                {(Array.isArray(snList) ? snList : []).map((sn, index) => (
                  <Tag
                    key={index}
                    closable
                    onClose={() => setSnList(prev => prev.filter((_, i) => i !== index))}
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
              <div style={{ marginBottom: '8px', fontWeight: 500, color: designTokens.colors.neutral[700] }}>
                已扫描SN列表 ({scannedSnList.length}个)
              </div>
              <div 
                style={{ 
                  maxHeight: '150px', 
                  overflowY: 'auto', 
                  border: `1px solid ${designTokens.colors.neutral[200]}`,
                  borderRadius: designTokens.borderRadius.sm,
                  padding: '8px'
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
                <div style={{ marginBottom: '8px', fontWeight: 500, color: designTokens.colors.neutral[700] }}>
                  选择入库耗材
                </div>
                <Select
                  placeholder="选择要入库的耗材"
                  style={{ width: '100%' }}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                  value={selectedScanInConsumable}
                  onChange={(value) => setSelectedScanInConsumable(value)}
                >
                  {consumables.map(item => (
                    <Option key={item.consumableId} value={item.consumableId}>
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

          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 提示：也可手动输入条码后按回车键确认
          </Text>
        </div>
      </Modal>
    </motion.div>
  );
}

export default React.memo(ConsumableManagement);
