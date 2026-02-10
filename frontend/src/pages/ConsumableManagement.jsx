import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Table as AntTable,
  Progress,
  Checkbox,
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
  InboxOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

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
          params: { page, pageSize, keyword, category, status },
        });
        setConsumables(response.data.consumables);
        setPagination(prev => ({ ...prev, current: page, pageSize, total: response.data.total }));
      } catch (error) {
        message.error('获取耗材列表失败');
        console.error('获取耗材列表失败:', error);
      } finally {
        setLoading(false);
      }
    },
    [keyword, category, status]
  );

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get('/api/consumable-categories/list');
      setCategories(response.data);
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
          message.success('耗材更新成功');
        } else {
          await axios.post('/api/consumables', {
            ...submitData,
            consumableId: `CON${Date.now()}`,
          });
          message.success('耗材创建成功');
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
        message.success('删除成功');
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
      message.success('导出成功');
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
        setImportPhase('正在读取文件...');

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
            message.success(response.data.message || `成功导入 ${results.success} 条记录`);
          }
        }, 300);
      };
      reader.onerror = () => {
        setImporting(false);
        setImportProgress(0);
        setImportPhase('文件读取失败');
        setImportResult({
          success: false,
          total: 0,
          imported: 0,
          failed: 0,
          errors: [{ row: '-', error: '文件读取失败，请检查文件是否损坏' }],
          message: '文件读取失败',
        });
        message.error('文件读取失败');
      };
      reader.readAsText(importFile);
    } catch (error) {
      setImporting(false);
      setImportProgress(0);
      setImportPhase('导入失败');

      let errorMessage = '导入失败，请检查网络连接或服务器状态';
      let errorDetails = [];

      if (error.response && error.response.data) {
        const { data } = error.response;
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          errorDetails = data.errors.map((err, index) => ({
            row: err.row || index + 1,
            error: err.error || err.message || '数据格式错误',
          }));
          errorMessage = `导入失败，共发现 ${errorDetails.length} 处数据错误`;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        }
      } else if (error.message) {
        if (error.message.includes('Network Error') || error.message.includes('network')) {
          errorMessage = '网络连接失败，请检查服务器是否运行';
        } else if (error.message.includes('timeout')) {
          errorMessage = '请求超时，请稍后重试';
        } else {
          errorMessage = error.message;
        }
      }

      setImportResult({
        success: false,
        total: 0,
        imported: 0,
        failed: 0,
        errors: errorDetails,
        message: errorMessage,
      });

      message.error(errorMessage);
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
        const response = await axios.post('/api/consumables/quick-inout', {
          consumableId: stockRecord.consumableId,
          type: stockType,
          quantity: values.quantity,
          operator: values.operator || '系统管理员',
          reason: values.reason,
          notes: values.notes,
        });
        message.success(`${stockType === 'in' ? '入库' : '出库'}操作成功`);
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
      },
      {
        title: '分类',
        dataIndex: 'category',
        key: 'category',
        width: 120,
      },
      {
        title: '单位',
        dataIndex: 'unit',
        key: 'unit',
        width: 80,
      },
      {
        title: '当前库存',
        dataIndex: 'currentStock',
        key: 'currentStock',
        width: 100,
        render: (value, record) => {
          const isLow = value <= record.minStock;
          return (
            <span style={{ color: isLow ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}>
              {value}
            </span>
          );
        },
      },
      {
        title: '最小库存',
        dataIndex: 'minStock',
        key: 'minStock',
        width: 100,
      },
      {
        title: '最大库存',
        dataIndex: 'maxStock',
        key: 'maxStock',
        width: 100,
        render: value => (value === 0 || value === null || value === undefined ? '无限制' : value),
      },
      {
        title: '单价(元)',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        width: 100,
        render: value => `¥${parseFloat(value || 0).toFixed(2)}`,
      },
      {
        title: '供应商',
        dataIndex: 'supplier',
        key: 'supplier',
        width: 150,
        render: value => value || '-',
      },
      {
        title: '位置',
        dataIndex: 'location',
        key: 'location',
        width: 120,
        render: value => value || '-',
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        width: 200,
        render: value => value || '-',
        ellipsis: true,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: value => (
          <span style={{ color: value === 'active' ? '#52c41a' : '#ff4d4f' }}>
            {value === 'active' ? '启用' : '停用'}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 200,
        render: (_, record) => (
          <Space>
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={() => showModal(record)}
            >
              编辑
            </Button>
            <Button
              type="default"
              icon={<InboxOutlined />}
              size="small"
              style={{ background: '#f6ffed', borderColor: '#b7eb8f', color: '#52c41a' }}
              onClick={() => showStockModal(record, 'in')}
            >
              入库
            </Button>
            <Button
              type="default"
              icon={<ExportOutlined />}
              size="small"
              style={{ background: '#fff2f0', borderColor: '#ffccc7', color: '#ff4d4f' }}
              onClick={() => showStockModal(record, 'out')}
            >
              出库
            </Button>
            <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.consumableId)}>
              <Button danger icon={<DeleteOutlined />} size="small">
                删除
              </Button>
            </Popconfirm>
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
    <div>
      <Card
        title="耗材管理"
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
              添加耗材
            </Button>
            <Button icon={<ImportOutlined />} onClick={showImportModal}>
              导入
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Space>
        }
      >
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space>
            <Input.Search
              placeholder="搜索耗材ID、名称、分类、供应商"
              style={{ width: 300 }}
              onSearch={handleSearch}
              allowClear
            />
            <Select value={category} onChange={setCategory} style={{ width: 150 }}>
              <Option value="all">所有分类</Option>
              {categories.map(cat => (
                <Option key={cat.id} value={cat.name}>
                  {cat.name}
                </Option>
              ))}
            </Select>
            <Select value={status} onChange={setStatus} style={{ width: 120 }}>
              <Option value="all">所有状态</Option>
              <Option value="active">启用</Option>
              <Option value="inactive">停用</Option>
            </Select>
          </Space>
        </Card>

        <Table
          columns={columns}
          dataSource={consumables}
          rowKey="consumableId"
          loading={loading}
          pagination={pagination}
          onChange={pagination => fetchConsumables(pagination.current, pagination.pageSize)}
          scroll={{ x: 1300 }}
        />
      </Card>

      <Modal
        title={editingConsumable ? '编辑耗材' : '添加耗材'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入耗材名称" />
          </Form.Item>
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
          <Form.Item
            name="unit"
            label="单位"
            rules={[{ required: true, message: '请输入单位' }]}
            initialValue="个"
          >
            <Input placeholder="如: 个、盒、卷、箱" />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item
              name="currentStock"
              label="当前库存"
              rules={[{ required: true, message: '请输入当前库存' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="minStock"
              label="最小库存"
              rules={[{ required: true, message: '请输入最小库存' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
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
          </Space>
          <Form.Item name="unitPrice" label="单价(元)">
            <InputNumber
              min={0}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="请输入单价"
            />
          </Form.Item>
          <Form.Item name="supplier" label="供应商">
            <Input placeholder="请输入供应商" />
          </Form.Item>
          <Form.Item name="location" label="存放位置">
            <Input placeholder="如: A柜-01层、B区货架3" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入描述信息" />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select>
              <Option value="active">启用</Option>
              <Option value="inactive">停用</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingConsumable ? '更新' : '创建'}
              </Button>
              <Button onClick={handleCancel}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="导入耗材"
        open={importModalVisible}
        onCancel={handleImportCancel}
        footer={null}
        width={700}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Card size="small" style={{ background: '#f5f5f5' }}>
            <Space>
              <Button icon={<FileExcelOutlined />} onClick={downloadTemplate}>
                下载模板
              </Button>
              <span style={{ color: '#888', fontSize: 12 }}>请下载模板后填写数据再导入</span>
            </Space>
          </Card>

          <Upload accept=".csv" maxCount={1} beforeUpload={() => false} onChange={handleFileChange}>
            <Button icon={<UploadOutlined />}>选择CSV文件</Button>
          </Upload>

          {importPreview.length > 0 && (
            <div>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>预览 (前10条):</div>
              <Table
                columns={previewColumns}
                dataSource={importPreview}
                rowKey={(record, index) => index}
                pagination={false}
                size="small"
                scroll={{ x: 500 }}
              />
            </div>
          )}

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={handleImportCancel}>取消</Button>
              <Button
                type="primary"
                onClick={handleImport}
                loading={importing}
                disabled={!importFile}
              >
                开始导入
              </Button>
            </Space>
          </div>
        </Space>
      </Modal>

      <Modal
        title={stockType === 'in' ? '耗材入库' : '耗材出库'}
        open={stockModalVisible}
        onCancel={handleStockCancel}
        footer={null}
        width={500}
      >
        <Form form={stockForm} layout="vertical" onFinish={handleStockSubmit}>
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
          <Form.Item name="reason" label="入库/出库原因">
            <Input placeholder="如: 采购入库、部门领用、报损出库" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注信息" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {stockType === 'in' ? '确认入库' : '确认出库'}
              </Button>
              <Button onClick={handleStockCancel}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default React.memo(ConsumableManagement);
