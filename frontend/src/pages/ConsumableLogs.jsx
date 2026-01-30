import React, { useState, useEffect, useRef } from 'react';
import { Table, Card, Space, Select, DatePicker, Input, Tag, Button, message, Modal, Upload, Radio, Dropdown, Form, Tooltip, Timeline } from 'antd';
import { HistoryOutlined, SearchOutlined, FileTextOutlined, DownloadOutlined, UploadOutlined, FileExcelOutlined, FileOutlined, DownOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;
const { Option } = Select;

function ConsumableLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({
    operationType: 'all',
    consumableId: '',
    dateRange: null
  });
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importType, setImportType] = useState('excel');
  const [importing, setImporting] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [currentLog, setCurrentLog] = useState(null);
  const [logHistory, setLogHistory] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [form] = Form.useForm();
  const fileInputRef = useRef(null);

  const fetchLogs = async (page = 1, pageSize = 10, currentFilters = filters) => {
    try {
      setLoading(true);
      const params = { page, pageSize };
      
      if (currentFilters.operationType !== 'all') {
        params.operationType = currentFilters.operationType;
      }
      if (currentFilters.consumableId) {
        params.consumableId = currentFilters.consumableId;
      }
      if (currentFilters.dateRange) {
        params.startDate = currentFilters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = currentFilters.dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await axios.get('/api/consumables/logs', { params });
      setLogs(response.data.logs);
      setPagination(prev => ({ ...prev, current: page, total: response.data.total }));
    } catch (error) {
      message.error('获取操作日志失败');
      console.error('获取操作日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, pagination.pageSize, filters);
  }, [filters.operationType, filters.consumableId, filters.dateRange]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    fetchLogs(1, pagination.pageSize);
  };

  const getOperationTag = (type) => {
    const config = {
      in: { color: 'green', text: '入库' },
      out: { color: 'red', text: '出库' },
      create: { color: 'blue', text: '创建' },
      update: { color: 'orange', text: '更新' },
      delete: { color: 'magenta', text: '删除' },
      adjust: { color: 'purple', text: '调整' },
      import: { color: 'cyan', text: '导入' }
    };
    const { color, text } = config[type] || { color: 'default', text: type };
    return <Tag color={color}>{text}</Tag>;
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '耗材ID',
      dataIndex: 'consumableId',
      key: 'consumableId',
      width: 150,
      render: (value) => <code>{value}</code>
    },
    {
      title: '耗材名称',
      dataIndex: 'consumableName',
      key: 'consumableName',
      width: 150
    },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 100,
      render: (type) => getOperationTag(type)
    },
    {
      title: '变动数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (value, record) => (
        <span style={{ 
          color: value > 0 ? '#52c41a' : value < 0 ? '#ff4d4f' : '#888',
          fontWeight: 'bold'
        }}>
          {value > 0 ? '+' : ''}{value}
        </span>
      )
    },
    {
      title: '操作前库存',
      dataIndex: 'previousStock',
      key: 'previousStock',
      width: 100
    },
    {
      title: '操作后库存',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: 100
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 120
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 150,
      render: (value) => value || '-'
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      render: (value) => value || '-',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.isEditable && (
            <Tooltip title="编辑">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="查看历史">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewHistory(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const handleExport = async (currentFilters = filters) => {
    try {
      const params = {};
      if (currentFilters.operationType !== 'all') {
        params.operationType = currentFilters.operationType;
      }
      if (currentFilters.consumableId) {
        params.consumableId = currentFilters.consumableId;
      }
      if (currentFilters.dateRange) {
        params.startDate = currentFilters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = currentFilters.dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await axios.get('/api/consumables/logs/export', { 
        params,
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `耗材操作日志_${dayjs().format('YYYYMMDD_HHmmss')}.csv`;
      link.click();
      
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
      console.error('导出失败:', error);
    }
  };

  const handleExportExcel = async (currentFilters = filters) => {
    try {
      const params = {};
      if (currentFilters.operationType !== 'all') {
        params.operationType = currentFilters.operationType;
      }
      if (currentFilters.consumableId) {
        params.consumableId = currentFilters.consumableId;
      }
      if (currentFilters.dateRange) {
        params.startDate = currentFilters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = currentFilters.dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await axios.get('/api/consumables/logs', { 
        params: { ...params, page: 1, pageSize: 10000 }
      });
      
      const exportData = response.data.logs.map(log => ({
        '时间': dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        '耗材ID': log.consumableId,
        '耗材名称': log.consumableName,
        '操作类型': getOperationTypeText(log.operationType),
        '变动数量': log.quantity,
        '操作前库存': log.previousStock,
        '操作后库存': log.currentStock,
        '操作人': log.operator,
        '原因': log.reason || '',
        '备注': log.notes || ''
      }));
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '操作日志');
      XLSX.writeFile(wb, `耗材操作日志_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
      
      message.success('导出Excel成功');
    } catch (error) {
      message.error('导出Excel失败');
      console.error('导出Excel失败:', error);
    }
  };

  const getOperationTypeText = (type) => {
    const map = {
      'in': '入库',
      'out': '出库',
      'create': '创建',
      'update': '更新',
      'delete': '删除',
      'adjust': '调整',
      'import': '导入'
    };
    return map[type] || type;
  };

  const handleImport = async (file) => {
    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let logItems = [];
          
          if (importType === 'excel') {
            const workbook = XLSX.read(e.target.result, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            logItems = XLSX.utils.sheet_to_json(worksheet);
          } else {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
            
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
              const item = {};
              headers.forEach((h, idx) => {
                item[h] = values[idx];
              });
              logItems.push(item);
            }
          }
          
          const response = await axios.post('/api/consumables/logs/import', {
            logs: logItems,
            operator: '前端导入'
          });
          
          if (response.data.success > 0) {
            message.success(`成功导入 ${response.data.success} 条记录`);
          }
          if (response.data.failed > 0) {
            message.warning(`导入失败 ${response.data.failed} 条`);
            response.data.errors.forEach(err => console.error(err));
          }
          
          setImportModalVisible(false);
          fetchLogs(1, pagination.pageSize);
        } catch (err) {
          message.error('解析文件失败: ' + err.message);
        } finally {
          setImporting(false);
        }
      };
      
      if (importType === 'excel') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    } catch (error) {
      message.error('导入失败');
      setImporting(false);
    }
    return false;
  };

  const downloadTemplate = () => {
    const template = [
      {
        '耗材ID': 'CON123456',
        '耗材名称': '示例耗材',
        '操作类型': '入库',
        '变动数量': 10,
        '操作前库存': 100,
        '操作后库存': 110,
        '操作人': '管理员',
        '原因': '示例原因',
        '备注': '示例备注'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '日志模板');
    XLSX.writeFile(wb, '耗材操作日志导入模板.xlsx');

    message.success('模板下载成功');
  };

  // 编辑日志
  const handleEdit = (record) => {
    setCurrentLog(record);
    form.setFieldsValue({
      reason: record.reason,
      notes: record.notes,
      modificationReason: ''
    });
    setEditModalVisible(true);
  };

  // 提交编辑
  const handleEditSubmit = async (values) => {
    if (!currentLog) return;

    setEditLoading(true);
    try {
      const response = await axios.put(`/api/consumables/logs/${currentLog.id}`, {
        reason: values.reason,
        notes: values.notes,
        operator: values.operator || '管理员',
        modificationReason: values.modificationReason
      });

      message.success('日志修改成功');
      setEditModalVisible(false);
      fetchLogs(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.response?.data?.error || '修改失败');
    } finally {
      setEditLoading(false);
    }
  };

  // 查看修改历史
  const handleViewHistory = async (record) => {
    setCurrentLog(record);
    setHistoryModalVisible(true);
    setHistoryLoading(true);

    try {
      const response = await axios.get(`/api/consumables/logs/${record.id}/history`);
      setLogHistory(response.data.history || []);
    } catch (error) {
      message.error('获取修改历史失败');
      setLogHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div>
      <Card 
        title={
          <Space>
            <FileTextOutlined />
            <span>耗材操作日志</span>
          </Space>
        }
      >
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input.Search
              placeholder="搜索耗材ID"
              style={{ width: 200 }}
              allowClear
              onSearch={(value) => handleFilterChange('consumableId', value)}
              prefix={<SearchOutlined />}
            />
            <Select
              value={filters.operationType}
              onChange={(value) => handleFilterChange('operationType', value)}
              style={{ width: 120 }}
            >
              <Option value="all">全部类型</Option>
              <Option value="in">入库</Option>
              <Option value="out">出库</Option>
              <Option value="create">创建</Option>
              <Option value="update">更新</Option>
              <Option value="delete">删除</Option>
              <Option value="adjust">调整</Option>
              <Option value="import">导入</Option>
            </Select>
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange('dateRange', dates)}
              placeholder={['开始日期', '结束日期']}
            />
            <Button 
              icon={<HistoryOutlined />} 
              onClick={() => {
                setFilters({ operationType: 'all', consumableId: '', dateRange: null });
                fetchLogs(1, pagination.pageSize);
              }}
            >
              重置筛选
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'csv',
                    icon: <FileOutlined />,
                    label: '导出CSV',
                    onClick: () => handleExport(filters)
                  },
                  {
                    key: 'excel',
                    icon: <FileExcelOutlined />,
                    label: '导出Excel',
                    onClick: () => handleExportExcel(filters)
                  }
                ]
              }}
            >
              <Button icon={<DownloadOutlined />}>
                导出 <DownOutlined />
              </Button>
            </Dropdown>
            <Button icon={<UploadOutlined />} onClick={() => setImportModalVisible(true)}>
              导入
            </Button>
          </Space>
        </Card>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showTotal: (total) => `共 ${total} 条记录`,
            showSizeChanger: true,
            showQuickJumper: true
          }}
          onChange={(pagination) => fetchLogs(pagination.current, pagination.pageSize)}
          scroll={{ x: 1500 }}
        />
      </Card>

      <Modal
        title="导入操作日志"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportType('excel');
        }}
        footer={null}
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <Radio.Group 
            value={importType} 
            onChange={(e) => setImportType(e.target.value)}
            style={{ marginBottom: 16 }}
          >
            <Radio.Button value="excel">Excel文件</Radio.Button>
            <Radio.Button value="csv">CSV文件</Radio.Button>
          </Radio.Group>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <Button type="link" onClick={downloadTemplate}>
            下载导入模板
          </Button>
          <span style={{ color: '#888', marginLeft: 8 }}>（建议先下载模板填写）</span>
        </div>
        
        <Upload
          accept={importType === 'excel' ? '.xlsx,.xls' : '.csv'}
          showUploadList={false}
          beforeUpload={handleImport}
        >
          <Button type="primary" icon={<UploadOutlined />} loading={importing}>
            选择{importType === 'excel' ? 'Excel' : 'CSV'}文件并导入
          </Button>
        </Upload>
        
        <div style={{ marginTop: 16, color: '#888', fontSize: 12 }}>
          <p>注意事项：</p>
          <ul>
            <li>支持 Excel (.xlsx, .xls) 或 CSV 格式</li>
            <li>文件列名必须包含：耗材ID、操作类型</li>
            <li>操作类型支持：入库、出库、创建、更新、删除、调整、导入</li>
            <li>系统将根据筛选条件过滤需要导出的数据</li>
          </ul>
        </div>
      </Modal>

      {/* 编辑日志弹窗 */}
      <Modal
        title="编辑日志记录"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={editLoading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Form.Item
            label="操作原因"
            name="reason"
          >
            <Input.TextArea rows={2} placeholder="请输入操作原因" />
          </Form.Item>
          <Form.Item
            label="备注"
            name="notes"
          >
            <Input.TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
          <Form.Item
            label="修改原因"
            name="modificationReason"
            rules={[{ required: true, message: '请输入修改原因' }]}
          >
            <Input.TextArea rows={2} placeholder="请输入修改原因（必填）" />
          </Form.Item>
          <Form.Item
            label="修改人"
            name="operator"
          >
            <Input placeholder="请输入修改人姓名" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改历史弹窗 */}
      <Modal
        title="日志修改历史"
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setLogHistory([]);
        }}
        footer={null}
        width={700}
      >
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
        ) : logHistory.length <= 1 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
            该记录暂无修改历史
          </div>
        ) : (
          <Timeline mode="left">
            {logHistory.map((item, index) => (
              <Timeline.Item
                key={item.id}
                color={index === logHistory.length - 1 ? 'green' : 'blue'}
                label={dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              >
                <div style={{ marginBottom: 8 }}>
                  <Tag color={getOperationTag(item.operationType).props.color}>
                    {getOperationTag(item.operationType).props.children}
                  </Tag>
                  {item.modifiedBy && (
                    <Tag color="orange">已修改</Tag>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  <p><strong>耗材:</strong> {item.consumableName} ({item.consumableId})</p>
                  <p><strong>操作人:</strong> {item.operator}</p>
                  {item.reason && <p><strong>原因:</strong> {item.reason}</p>}
                  {item.notes && <p><strong>备注:</strong> {item.notes}</p>}
                  {item.modifiedBy && (
                    <>
                      <p><strong>修改人:</strong> {item.modifiedBy}</p>
                      <p><strong>修改时间:</strong> {dayjs(item.modifiedAt).format('YYYY-MM-DD HH:mm:ss')}</p>
                      {item.modificationReason && (
                        <p><strong>修改原因:</strong> {item.modificationReason}</p>
                      )}
                    </>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Modal>
    </div>
  );
}

export default ConsumableLogs;
