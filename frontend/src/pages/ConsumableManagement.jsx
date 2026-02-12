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
} from '@ant-design/icons';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const { Option } = Select;
const { Text, Title } = Typography;
const { TextArea } = Input;

// 设计令牌 - 与接线/端口管理页面保持一致
const designTokens = {
  colors: {
    primary: {
      main: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      light: '#818cf8',
      dark: '#4f46e5',
      bg: '#eef2ff',
    },
    success: {
      main: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      light: '#34d399',
      dark: '#047857',
      bg: '#ecfdf5',
    },
    warning: {
      main: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      light: '#fbbf24',
      dark: '#b45309',
      bg: '#fffbeb',
    },
    error: {
      main: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      light: '#f87171',
      dark: '#b91c1c',
      bg: '#fef2f2',
    },
    info: {
      main: '#3b82f6',
      bg: '#eff6ff',
    },
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },
  borderRadius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    xl: '20px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },
};

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
        form.setFieldsValue({
          ...consumable,
          maxStock: isUnlimited ? undefined : consumable.maxStock,
        });
      } else {
        setMaxStockUnlimited(true);
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
  }, []);

  const handleSubmit = useCallback(
    async values => {
      try {
        const submitData = {
          ...values,
          maxStock: maxStockUnlimited ? 0 : values.maxStock,
          unitPrice: values.unitPrice || 0,
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
      } catch (error) {
        message.error(editingConsumable ? '耗材更新失败' : '耗材创建失败');
        console.error('提交失败:', error);
      }
    },
    [editingConsumable, fetchConsumables, maxStockUnlimited]
  );

  const handleDelete = useCallback(
    async consumableId => {
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
        });
        message.success({
          content: `${stockType === 'in' ? '入库' : '出库'}操作成功`,
          icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
        });
        setStockModalVisible(false);
        fetchConsumables();
      } catch (error) {
        message.error(
          error.response?.data?.error || `${stockType === 'in' ? '入库' : '出库'}操作失败`
        );
        console.error('操作失败:', error);
      }
    },
    [stockRecord, stockType, fetchConsumables]
  );

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
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: designTokens.colors.neutral[600], fontWeight: 500 }}>
                    搜索
                  </div>
                  <Input
                    placeholder="搜索耗材ID、名称、分类、供应商"
                    value={keyword}
                    onChange={e => handleSearch(e.target.value)}
                    onPressEnter={() => fetchConsumables()}
                    prefix={<SearchOutlined style={{ color: designTokens.colors.neutral[400] }} />}
                    allowClear
                  />
                </Col>

                <Col xs={24} sm={12} md={6} lg={5}>
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: designTokens.colors.neutral[600], fontWeight: 500 }}>
                    分类
                  </div>
                  <Select
                    placeholder="选择分类"
                    style={{ width: '100%' }}
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
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: designTokens.colors.neutral[600], fontWeight: 500 }}>
                    状态
                  </div>
                  <Select
                    placeholder="选择状态"
                    style={{ width: '100%' }}
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
                      }}
                    >
                      筛选
                    </Button>
                    <Tooltip title="重置筛选条件">
                      <Button 
                        icon={<ClearOutlined />} 
                        onClick={handleReset}
                        style={{ borderRadius: designTokens.borderRadius.sm }}
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
        onCancel={handleCancel}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: '16px' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="请输入耗材名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类" allowClear>
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
            <Col span={8}>
              <Form.Item
                name="unit"
                label="单位"
                rules={[{ required: true, message: '请输入单位' }]}
                initialValue="个"
              >
                <Input placeholder="如: 个、盒、卷、箱" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="currentStock"
                label="当前库存"
                rules={[{ required: true, message: '请输入当前库存' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入当前库存" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="minStock"
                label="最小库存"
                rules={[{ required: true, message: '请输入最小库存' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入最小库存" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="最大库存">
                <Space direction="vertical" style={{ width: '100%' }}>
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
                  {!maxStockUnlimited && (
                    <Form.Item
                      name="maxStock"
                      noStyle
                      rules={[{ required: true, message: '请输入最大库存' }]}
                    >
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入最大库存" />
                    </Form.Item>
                  )}
                </Space>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unitPrice" label="单价(元)">
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="请输入单价"
                  prefix="¥"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplier" label="供应商">
                <Input placeholder="请输入供应商" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="存放位置">
                <Input placeholder="如: A柜-01层、B区货架3" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入描述信息" />
          </Form.Item>

          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select placeholder="请选择状态">
              <Option value="active">启用</Option>
              <Option value="inactive">停用</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                style={{
                  background: designTokens.colors.primary.gradient,
                  border: 'none',
                  borderRadius: designTokens.borderRadius.sm,
                }}
              >
                {editingConsumable ? '更新' : '创建'}
              </Button>
              <Button onClick={handleCancel}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
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
        onCancel={handleStockCancel}
        footer={null}
        width={500}
      >
        <Form form={stockForm} layout="vertical" onFinish={handleStockSubmit} style={{ marginTop: '16px' }}>
          <Form.Item name="consumableId" label="耗材ID">
            <Input disabled />
          </Form.Item>
          <Form.Item name="consumableName" label="耗材名称">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="数量"
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入数量" />
          </Form.Item>
          <Form.Item name="operator" label="操作人">
            <Input placeholder="请输入操作人姓名" />
          </Form.Item>
          <Form.Item name="reason" label={stockType === 'in' ? '入库原因' : '出库原因'}>
            <Input placeholder={stockType === 'in' ? '如: 采购入库' : '如: 部门领用、报损出库'} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="请输入备注信息" />
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
    </motion.div>
  );
}

export default React.memo(ConsumableManagement);
