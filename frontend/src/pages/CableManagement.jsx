import React, { useState, useEffect, useCallback } from 'react';
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
  Popconfirm,
  Tag,
  Tooltip,
  Collapse,
  Empty,
  Spin,
  Upload,
  Progress,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
  DownloadOutlined,
  UploadOutlined as UploadIcon,
} from '@ant-design/icons';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const { Option } = Select;
const { Panel } = Collapse;

const designTokens = {
  colors: {
    primary: {
      main: '#667eea',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      light: '#8b9ff0',
      dark: '#4f5db8',
    },
    success: {
      main: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      light: '#34d399',
      dark: '#047857',
    },
    warning: {
      main: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      light: '#fbbf24',
      dark: '#b45309',
    },
    error: {
      main: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      light: '#f87171',
      dark: '#b91c1c',
    },
  },
  borderRadius: {
    small: '6px',
    medium: '10px',
    large: '16px',
  },
  shadows: {
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  },
};

function CableManagement() {
  const [cables, setCables] = useState([]);
  const [devices, setDevices] = useState([]);
  const [switchDevices, setSwitchDevices] = useState([]);
  const [groupedCables, setGroupedCables] = useState({});
  const [devicePorts, setDevicePorts] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    switchDeviceId: '',
    status: 'all',
    cableType: 'all',
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCable, setEditingCable] = useState(null);
  const [form] = Form.useForm();

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFileList, setImportFileList] = useState([]);
  const [importPreview, setImportPreview] = useState([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importing, setImporting] = useState(false);
  const [skipExisting, setSkipExisting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);

  const fetchCables = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (filters.switchDeviceId) params.sourceDeviceId = filters.switchDeviceId;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.cableType !== 'all') params.cableType = filters.cableType;

      const response = await axios.get('/api/cables', { params });
      const cablesData = response.data.cables || [];
      setCables(cablesData);

      const grouped = {};
      cablesData.forEach(cable => {
        const switchId = cable.sourceDeviceId;
        if (!grouped[switchId]) {
          grouped[switchId] = {
            switch: cable.sourceDevice,
            cables: [],
          };
        }
        grouped[switchId].cables.push(cable);
      });
      setGroupedCables(grouped);

      // 自动为每个交换机加载端口数据
      const switchIds = Object.keys(grouped);
      for (const switchId of switchIds) {
        if (!devicePorts[switchId]) {
          try {
            const portsResponse = await axios.get(`/api/device-ports/device/${switchId}`);
            setDevicePorts(prev => ({ ...prev, [switchId]: portsResponse.data || [] }));
          } catch (error) {
            console.error(`获取交换机 ${switchId} 端口失败:`, error);
          }
        }
      }
    } catch (error) {
      message.error('获取接线列表失败');
      console.error('获取接线列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, devicePorts]);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await axios.get('/api/devices', { params: { pageSize: 100 } });
      const allDevices = response.data.devices || [];
      const switches = allDevices.filter(device => device.type === 'switch');
      setDevices(allDevices);
      setSwitchDevices(switches);
    } catch (error) {
      message.error('获取设备列表失败');
      console.error('获取设备列表失败:', error);
    }
  }, []);

  const fetchDevicePorts = useCallback(async deviceId => {
    if (!deviceId) {
      setDevicePorts(prev => ({ ...prev, [deviceId]: [] }));
      return;
    }

    try {
      const response = await axios.get(`/api/device-ports/device/${deviceId}`);
      setDevicePorts(prev => ({ ...prev, [deviceId]: response.data || [] }));
    } catch (error) {
      console.error('获取设备端口失败:', error);
      setDevicePorts(prev => ({ ...prev, [deviceId]: [] }));
    }
  }, []);

  useEffect(() => {
    fetchCables();
    fetchDevices();
  }, [fetchCables, fetchDevices]);

  const handleSearch = () => {
    fetchCables();
  };

  const handleReset = () => {
    setFilters({
      switchDeviceId: '',
      status: 'all',
      cableType: 'all',
    });
  };

  const handleAdd = () => {
    setEditingCable(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = cable => {
    setEditingCable(cable);
    form.setFieldsValue({
      sourceDeviceId: cable.sourceDeviceId,
      sourcePort: cable.sourcePort,
      targetDeviceId: cable.targetDeviceId,
      targetPort: cable.targetPort,
      cableType: cable.cableType,
      cableLength: cable.cableLength,
      status: cable.status,
      description: cable.description,
    });
    setModalVisible(true);
  };

  const handleDelete = async cableId => {
    try {
      await axios.delete(`/api/cables/${cableId}`);
      message.success('删除成功');
      fetchCables();
    } catch (error) {
      message.error('删除失败');
      console.error('删除失败:', error);
    }
  };

  const handleDeleteSwitch = async switchId => {
    try {
      await axios.delete(`/api/devices/${switchId}`);
      message.success('删除设备成功');
      fetchDevices();
      fetchCables();
    } catch (error) {
      message.error('删除设备失败');
      console.error('删除设备失败:', error);
    }
  };

  const [conflictModalVisible, setConflictModalVisible] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [pendingSubmitValues, setPendingSubmitValues] = useState(null);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 如果是编辑模式，直接提交
      if (editingCable) {
        await axios.put(`/api/cables/${editingCable.cableId}`, values);
        message.success('更新成功');
        setModalVisible(false);
        form.resetFields();
        fetchCables();
        return;
      }

      // 创建模式：先检查冲突
      try {
        const checkResponse = await axios.post('/api/cables/check-conflict', {
          sourceDeviceId: values.sourceDeviceId,
          sourcePort: values.sourcePort,
          targetDeviceId: values.targetDeviceId,
          targetPort: values.targetPort,
        });

        if (checkResponse.data.hasConflict) {
          setConflictInfo(checkResponse.data.conflicts);
          setPendingSubmitValues(values);
          setConflictModalVisible(true);
          return;
        }

        // 无冲突，直接创建
        await axios.post('/api/cables', values);
        message.success('创建成功');
        setModalVisible(false);
        form.resetFields();
        fetchCables();
      } catch (error) {
        if (error.response?.status === 409) {
          // 冲突错误
          setConflictInfo([
            {
              type: 'unknown',
              existingCable: error.response.data.existingCable,
            },
          ]);
          setPendingSubmitValues(values);
          setConflictModalVisible(true);
        } else {
          throw error;
        }
      }
    } catch (error) {
      message.error(editingCable ? '更新失败' : '创建失败');
      console.error('提交失败:', error);
    }
  };

  const handleForceSubmit = async () => {
    try {
      if (!pendingSubmitValues) return;

      await axios.post('/api/cables', {
        ...pendingSubmitValues,
        force: true,
      });

      message.success('接线已强制接管并创建成功');
      setConflictModalVisible(false);
      setModalVisible(false);
      form.resetFields();
      setPendingSubmitValues(null);
      setConflictInfo(null);
      fetchCables();
    } catch (error) {
      message.error('强制接管失败');
      console.error('强制接管失败:', error);
    }
  };

  const handleImport = () => {
    setImportModalVisible(true);
    setImportPreview([]);
    setImportProgress({ current: 0, total: 0 });
  };

  const handleFileUpload = info => {
    const { file } = info;
    setImportFileList([file]);

    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const data = e.target.result;
        let parsedData = [];

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet);
        } else if (file.name.endsWith('.csv')) {
          Papa.parse(data, {
            header: true,
            skipEmptyLines: true,
            complete: results => {
              parsedData = results.data;
            },
          });
        } else {
          message.error('不支持的文件格式，请上传 .xlsx 或 .csv 文件');
          return;
        }

        const validatedData = await validateImportData(parsedData);
        setImportPreview(validatedData);
        setImportProgress({ current: 0, total: validatedData.length });
      } catch (error) {
        message.error('文件解析失败');
        console.error('文件解析失败:', error);
      }
    };

    reader.readAsBinaryString(file);
  };

  const validateImportData = async data => {
    const validatedData = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const error = await validateCableRow(row, i);

      if (error) {
        errors.push(error);
      } else {
        validatedData.push(row);
      }
    }

    if (errors.length > 0) {
      message.warning(`发现 ${errors.length} 条数据错误，已跳过`);
      console.log('导入错误:', errors);
    }

    return validatedData;
  };

  const validateCableRow = async (row, index) => {
    const errors = [];

    if (!row['源设备ID'] || !row['源设备端口']) {
      return { valid: false, error: `第 ${index + 1} 行：缺少必填字段（源设备ID或源设备端口）` };
    }

    const sourceDevice = devices.find(d => d.deviceId === row['源设备ID']);
    if (!sourceDevice) {
      return { valid: false, error: `第 ${index + 1} 行：源设备不存在` };
    }

    const targetDevice = devices.find(d => d.deviceId === row['目标设备ID']);
    if (!targetDevice) {
      return { valid: false, error: `第 ${index + 1} 行：目标设备不存在` };
    }

    const validCableTypes = ['网线', '光纤', '铜缆'];
    if (!validCableTypes.includes(row['线缆类型'])) {
      return { valid: false, error: `第 ${index + 1} 行：无效的线缆类型` };
    }

    const validStatuses = ['正常', '故障', '未连接'];
    if (!validStatuses.includes(row['状态'])) {
      return { valid: false, error: `第 ${index + 1} 行：无效的状态` };
    }

    if (errors.length > 0) {
      return { valid: false, error: errors.join('; ') };
    }

    return { valid: true };
  };

  const handleBatchImport = async () => {
    if (importPreview.length === 0) {
      message.warning('请先选择要导入的数据');
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: importPreview.length });

    try {
      const cableTypeMap = {
        网线: 'ethernet',
        光纤: 'fiber',
        铜缆: 'copper',
      };

      const statusMap = {
        正常: 'normal',
        故障: 'fault',
        未连接: 'disconnected',
      };

      const cablesData = importPreview.map((row, index) => ({
        cableId: `CABLE-${Date.now()}-${index}`,
        sourceDeviceId: row['源设备ID'],
        sourcePort: row['源设备端口'],
        targetDeviceId: row['目标设备ID'],
        targetPort: row['目标设备端口'],
        cableType: cableTypeMap[row['线缆类型']] || 'ethernet',
        cableLength: row['线缆长度(米)'],
        status: statusMap[row['状态']] || 'normal',
        description: row['描述'],
      }));

      const response = await axios.post('/api/cables/batch', { cables: cablesData });

      const { total, success, failed, errors } = response.data;

      setImportProgress({ current: total, total: total });

      if (failed > 0) {
        console.error('导入错误:', errors);
        message.warning(`导入完成！成功 ${success} 条，失败 ${failed} 条`);
      } else {
        message.success(`导入完成！成功 ${success} 条`);
      }

      fetchCables();
      setImportModalVisible(false);
      setImportPreview([]);
    } catch (error) {
      console.error('批量导入失败:', error);
      message.error('批量导入失败，请检查数据格式');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        源设备ID: 'DEV001',
        源设备端口: 'eth0/1',
        目标设备ID: 'DEV002',
        目标设备端口: 'eth0',
        线缆类型: '网线',
        '线缆长度(米)': '5',
        状态: '正常',
        描述: '示例接线',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '接线数据');
    XLSX.writeFile(workbook, '接线导入模板.xlsx');
  };

  const getStatusTag = status => {
    const statusMap = {
      normal: { color: 'success', text: '正常' },
      fault: { color: 'error', text: '故障' },
      disconnected: { color: 'default', text: '未连接' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getCableTypeTag = type => {
    const typeMap = {
      网线: { color: 'blue', text: '网线' },
      光纤: { color: 'green', text: '光纤' },
      铜缆: { color: 'orange', text: '铜缆' },
    };
    const config = typeMap[type] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getPortConnectionStatus = (portName, switchData) => {
    const cable = switchData.cables.find(c => c.sourcePort === portName);
    if (!cable) {
      return { status: 'disconnected', text: '未连接', color: 'default' };
    }
    return {
      status: cable.status,
      text: cable.status === 'normal' ? '已连接' : cable.status === 'fault' ? '故障' : '未连接',
      color: cable.status === 'normal' ? 'success' : cable.status === 'fault' ? 'error' : 'default',
    };
  };

  const portColumns = [
    {
      title: '端口名称',
      dataIndex: 'portName',
      key: 'portName',
      width: 120,
    },
    {
      title: '端口类型',
      dataIndex: 'portType',
      key: 'portType',
      width: 100,
      render: type => {
        const typeMap = {
          RJ45: { color: 'blue', text: 'RJ45' },
          SFP: { color: 'green', text: 'SFP' },
          'SFP+': { color: 'cyan', text: 'SFP+' },
          SFP28: { color: 'purple', text: 'SFP28' },
          QSFP: { color: 'orange', text: 'QSFP' },
          QSFP28: { color: 'red', text: 'QSFP28' },
        };
        const config = typeMap[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '端口速率',
      dataIndex: 'portSpeed',
      key: 'portSpeed',
      width: 100,
    },
    {
      title: '连接状态',
      dataIndex: 'connectionStatus',
      key: 'connectionStatus',
      width: 100,
      render: (_, record) => {
        const status = getPortConnectionStatus(record.portName, record.switchData);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: '目标设备',
      dataIndex: 'targetDevice',
      key: 'targetDevice',
      width: 200,
      render: (_, record) => {
        const cable = record.switchData.cables.find(c => c.sourcePort === record.portName);
        if (!cable) return '-';
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{cable.targetDevice?.name || '-'}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{cable.targetPort}</div>
          </div>
        );
      },
    },
    {
      title: '线缆类型',
      dataIndex: 'cableType',
      key: 'cableType',
      width: 100,
      render: (_, record) => {
        const cable = record.switchData.cables.find(c => c.sourcePort === record.portName);
        if (!cable) return '-';
        return getCableTypeTag(cable.cableType);
      },
    },
    {
      title: '长度(米)',
      dataIndex: 'cableLength',
      key: 'cableLength',
      width: 100,
      render: (_, record) => {
        const cable = record.switchData.cables.find(c => c.sourcePort === record.portName);
        if (!cable) return '-';
        return cable.cableLength ? `${cable.cableLength}m` : '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => {
        const cable = record.switchData.cables.find(c => c.sourcePort === record.portName);
        return (
          <Space size="small">
            {cable && (
              <>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(cable)}
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确定要删除这条接线吗？"
                  onConfirm={() => handleDelete(cable.cableId)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Card
        style={{
          borderRadius: designTokens.borderRadius.large,
          boxShadow: designTokens.shadows.medium,
          marginBottom: 16,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="选择交换机"
              style={{ width: 200 }}
              value={filters.switchDeviceId || undefined}
              onChange={value => setFilters(prev => ({ ...prev, switchDeviceId: value }))}
              allowClear
              showSearch
              filterOption={(input, option) => {
                const device = switchDevices.find(d => d.deviceId === option.value);
                if (!device) return false;
                const searchText = `${device.name} ${device.deviceId}`.toLowerCase();
                return searchText.indexOf(input.toLowerCase()) >= 0;
              }}
            >
              {switchDevices.map(device => (
                <Option key={device.deviceId} value={device.deviceId}>
                  {device.name} ({device.deviceId})
                </Option>
              ))}
            </Select>

            <Select
              placeholder="线缆类型"
              style={{ width: 120 }}
              value={filters.cableType}
              onChange={value => setFilters(prev => ({ ...prev, cableType: value }))}
            >
              <Option value="all">全部</Option>
              <Option value="ethernet">网线</Option>
              <Option value="fiber">光纤</Option>
              <Option value="copper">铜缆</Option>
            </Select>

            <Select
              placeholder="连接状态"
              style={{ width: 120 }}
              value={filters.status}
              onChange={value => setFilters(prev => ({ ...prev, status: value }))}
            >
              <Option value="all">全部</Option>
              <Option value="normal">已连接</Option>
              <Option value="fault">故障</Option>
              <Option value="disconnected">未连接</Option>
            </Select>

            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              style={{ background: designTokens.colors.primary.gradient, border: 'none' }}
            >
              搜索
            </Button>

            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              style={{ background: designTokens.colors.primary.gradient, border: 'none' }}
            >
              新增接线
            </Button>

            <Button
              type="primary"
              icon={<ImportOutlined />}
              onClick={handleImport}
              style={{ background: designTokens.colors.primary.gradient, border: 'none' }}
            >
              批量导入
            </Button>

            <Button icon={<ExportOutlined />}>导出</Button>
          </Space>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" tip="加载接线数据中..." />
          </div>
        ) : Object.keys(groupedCables).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <Empty description="暂无接线数据" />
          </div>
        ) : (
          <Collapse
            defaultActiveKey={Object.keys(groupedCables).slice(0, 5)}
            style={{ background: '#f5f5f5' }}
          >
            {Object.entries(groupedCables).map(([switchId, switchData]) => {
              const switchDevice = switchData.switch;
              const switchPorts = devicePorts[switchId] || [];
              const connectedCount = switchData.cables.filter(c => c.status === 'normal').length;
              const disconnectedCount = switchData.cables.filter(
                c => c.status === 'disconnected'
              ).length;
              const faultCount = switchData.cables.filter(c => c.status === 'fault').length;

              return (
                <Panel
                  key={switchId}
                  header={
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: designTokens.borderRadius.medium,
                            background: designTokens.colors.primary.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '18px',
                          }}
                        >
                          🔀
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '16px', color: '#1e293b' }}>
                            {switchDevice?.name || '未知设备'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {switchDevice?.deviceId || '-'}
                          </div>
                        </div>
                      </div>
                      <Space size="small">
                        <Tag color="success">已连接: {connectedCount}</Tag>
                        <Tag color="default">未连接: {disconnectedCount}</Tag>
                        {faultCount > 0 && <Tag color="error">故障: {faultCount}</Tag>}
                        <Tag color="blue">总计: {switchData.cables.length}</Tag>
                      </Space>
                    </div>
                  }
                  extra={
                    <Space size="small">
                      <Button
                        type="link"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          setEditingCable(null);
                          form.setFieldsValue({ sourceDeviceId: switchId });
                          setModalVisible(true);
                        }}
                      >
                        添加接线
                      </Button>
                      <Popconfirm
                        title={`确定要删除交换机 ${switchDevice?.name} 吗？`}
                        onConfirm={() => handleDeleteSwitch(switchId)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                          删除设备
                        </Button>
                      </Popconfirm>
                    </Space>
                  }
                >
                  <Table
                    columns={portColumns}
                    dataSource={switchPorts.map(port => ({
                      ...port,
                      switchData: switchData,
                    }))}
                    rowKey="portId"
                    pagination={false}
                    size="small"
                    scroll={{ x: 1200 }}
                  />
                </Panel>
              );
            })}
          </Collapse>
        )}
      </Card>

      <Modal
        title={editingCable ? '编辑接线' : '新增接线'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="sourceDeviceId"
            label="源设备"
            rules={[{ required: true, message: '请选择源设备' }]}
          >
            <Select
              placeholder="请选择源设备"
              showSearch
              filterOption={(input, option) => {
                const device = switchDevices.find(d => d.deviceId === option.value);
                if (!device) return false;
                const searchText = `${device.name} ${device.deviceId}`.toLowerCase();
                return searchText.indexOf(input.toLowerCase()) >= 0;
              }}
              onChange={value => {
                fetchDevicePorts(value);
                form.setFieldsValue({ sourcePort: undefined });
              }}
            >
              {switchDevices.map(device => (
                <Option key={device.deviceId} value={device.deviceId}>
                  {device.name} ({device.deviceId})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="sourcePort"
            label="源设备端口"
            rules={[{ required: true, message: '请选择源设备端口' }]}
          >
            <Select
              placeholder="请先选择源设备"
              showSearch
              filterOption={(input, option) => {
                const ports = devicePorts[form.getFieldValue('sourceDeviceId')] || [];
                const port = ports.find(p => p.portName === option.value);
                if (!port) return false;
                const searchText =
                  `${port.portName} ${port.portType} ${port.portSpeed}`.toLowerCase();
                return searchText.indexOf(input.toLowerCase()) >= 0;
              }}
              disabled={!form.getFieldValue('sourceDeviceId')}
            >
              {(devicePorts[form.getFieldValue('sourceDeviceId')] || []).map(port => (
                <Option key={port.portId} value={port.portName}>
                  {port.portName} ({port.portType} - {port.portSpeed})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="targetDeviceId"
            label="目标设备"
            rules={[{ required: true, message: '请选择目标设备' }]}
          >
            <Select
              placeholder="请选择目标设备"
              showSearch
              filterOption={(input, option) => {
                const device = devices.find(d => d.deviceId === option.value);
                if (!device) return false;
                const searchText = `${device.name} ${device.deviceId}`.toLowerCase();
                return searchText.indexOf(input.toLowerCase()) >= 0;
              }}
              onChange={value => {
                fetchDevicePorts(value);
                form.setFieldsValue({ targetPort: undefined });
              }}
            >
              {devices.map(device => (
                <Option key={device.deviceId} value={device.deviceId}>
                  {device.name} ({device.deviceId})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="targetPort"
            label="目标设备端口"
            rules={[{ required: true, message: '请选择目标设备端口' }]}
          >
            <Select
              placeholder="请先选择目标设备"
              showSearch
              filterOption={(input, option) => {
                const ports = devicePorts[form.getFieldValue('targetDeviceId')] || [];
                const port = ports.find(p => p.portName === option.value);
                if (!port) return false;
                const searchText =
                  `${port.portName} ${port.portType} ${port.portSpeed}`.toLowerCase();
                return searchText.indexOf(input.toLowerCase()) >= 0;
              }}
              disabled={!form.getFieldValue('targetDeviceId')}
            >
              {(devicePorts[form.getFieldValue('targetDeviceId')] || []).map(port => (
                <Option key={port.portId} value={port.portName}>
                  {port.portName} ({port.portType} - {port.portSpeed})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="cableType"
            label="线缆类型"
            rules={[{ required: true, message: '请选择线缆类型' }]}
            initialValue="ethernet"
          >
            <Select placeholder="请选择线缆类型">
              <Option value="ethernet">网线</Option>
              <Option value="fiber">光纤</Option>
              <Option value="copper">铜缆</Option>
            </Select>
          </Form.Item>

          <Form.Item name="cableLength" label="线缆长度(米)">
            <Input type="number" placeholder="请输入线缆长度" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
            initialValue="normal"
          >
            <Select placeholder="请选择状态">
              <Option value="normal">正常</Option>
              <Option value="fault">故障</Option>
              <Option value="disconnected">未连接</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量导入接线"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportPreview([]);
          setImportProgress({ current: 0, total: 0 });
        }}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setImportModalVisible(false)}>
            取消
          </Button>,
          <Button key="download" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载模板
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<ImportOutlined />}
            onClick={handleBatchImport}
            loading={importing}
            disabled={importPreview.length === 0}
            style={{ background: designTokens.colors.primary.gradient, border: 'none' }}
          >
            开始导入
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 16 }}>
            <Upload.Dragger
              name="file"
              accept=".xlsx,.xls,.csv"
              beforeUpload={() => false}
              customRequest={({ file, onSuccess }) => {
                handleFileUpload({ file, onSuccess });
              }}
            >
              <p className="ant-upload-drag-icon">
                <UploadIcon />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
              <p className="ant-upload-hint">支持 .xlsx, .xls, .csv 格式</p>
            </Upload.Dragger>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: 16 }}>
            <Checkbox checked={skipExisting} onChange={e => setSkipExisting(e.target.checked)}>
              跳过已存在的接线
            </Checkbox>
            <Checkbox checked={updateExisting} onChange={e => setUpdateExisting(e.target.checked)}>
              更新已存在的接线
            </Checkbox>
          </div>

          {importPreview.length > 0 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text strong>数据预览（前10条）</Text>
                  <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                    下载模板
                  </Button>
                </div>
                <Table
                  columns={[
                    {
                      title: '源设备ID',
                      dataIndex: '源设备ID',
                      key: 'sourceDeviceId',
                      width: 150,
                    },
                    {
                      title: '源设备端口',
                      dataIndex: '源设备端口',
                      key: 'sourcePort',
                      width: 120,
                    },
                    {
                      title: '目标设备ID',
                      dataIndex: '目标设备ID',
                      key: 'targetDeviceId',
                      width: 150,
                    },
                    {
                      title: '目标设备端口',
                      dataIndex: '目标设备端口',
                      key: 'targetPort',
                      width: 120,
                    },
                    {
                      title: '线缆类型',
                      dataIndex: '线缆类型',
                      key: 'cableType',
                      width: 100,
                      render: type => getCableTypeTag(type),
                    },
                    {
                      title: '状态',
                      dataIndex: '状态',
                      key: 'status',
                      width: 100,
                      render: status => getStatusTag(status),
                    },
                    {
                      title: '描述',
                      dataIndex: '描述',
                      key: 'description',
                      ellipsis: true,
                    },
                  ]}
                  dataSource={importPreview.slice(0, 10)}
                  rowKey={(record, index) => index}
                  pagination={false}
                  size="small"
                  scroll={{ x: 1000 }}
                />
              </div>

              {importPreview.length > 10 && (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Text type="secondary">仅显示前10条数据，共 {importPreview.length} 条</Text>
                </div>
              )}
            </>
          )}

          {importing && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <Spin size="large" tip="导入中..." />
              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={Math.round((importProgress.current / importProgress.total) * 100)}
                  status="active"
                  strokeColor={{
                    '0%': designTokens.colors.primary.main,
                    '100%': designTokens.colors.success.main,
                  }}
                />
                <div style={{ marginTop: 8 }}>
                  <Text>
                    正在导入 {importProgress.current} / {importProgress.total} 条数据...
                  </Text>
                  {importProgress.current > 0 && (
                    <Text type="secondary">
                      预计剩余时间：{Math.ceil((importProgress.total - importProgress.current) / 5)}{' '}
                      秒
                    </Text>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 冲突提示弹窗 */}
      <Modal
        title="端口冲突警告"
        open={conflictModalVisible}
        onCancel={() => {
          setConflictModalVisible(false);
          setConflictInfo(null);
          setPendingSubmitValues(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setConflictModalVisible(false);
              setConflictInfo(null);
              setPendingSubmitValues(null);
            }}
          >
            取消
          </Button>,
          <Button key="force" type="primary" danger onClick={handleForceSubmit}>
            强制接管
          </Button>,
        ]}
        width={600}
      >
        {conflictInfo && (
          <div>
            <div style={{ marginBottom: 16, color: '#ef4444', fontWeight: 500 }}>
              <span style={{ fontSize: 20, marginRight: 8 }}>⚠️</span>
              检测到端口冲突，以下端口已被占用：
            </div>
            {conflictInfo.map((conflict, index) => (
              <Card
                key={index}
                size="small"
                style={{ marginBottom: 12, background: '#fef2f2', border: '1px solid #fecaca' }}
              >
                <div style={{ marginBottom: 8 }}>
                  <Tag color="error">
                    {conflict.type === 'source'
                      ? '源端口'
                      : conflict.type === 'target'
                        ? '目标端口'
                        : '端口'}
                  </Tag>
                  <span style={{ fontWeight: 500, marginLeft: 8 }}>{conflict.port}</span>
                </div>
                {conflict.existingCable && (
                  <div style={{ fontSize: 13, color: '#666' }}>
                    <div>当前连接：</div>
                    <div style={{ marginTop: 4, paddingLeft: 12 }}>
                      <div>
                        源设备：
                        {conflict.existingCable.sourceDevice?.name ||
                          conflict.existingCable.sourceDeviceId}
                        ({conflict.existingCable.sourcePort})
                      </div>
                      <div style={{ marginTop: 2 }}>
                        目标设备：
                        {conflict.existingCable.targetDevice?.name ||
                          conflict.existingCable.targetDeviceId}
                        ({conflict.existingCable.targetPort})
                      </div>
                      <div style={{ marginTop: 2 }}>
                        线缆类型：{getCableTypeTag(conflict.existingCable.cableType)}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: '#fff7ed',
                borderRadius: 6,
                border: '1px solid #fed7aa',
              }}
            >
              <span style={{ color: '#ea580c' }}>💡</span>
              <span style={{ marginLeft: 8, color: '#9a3412' }}>
                点击"强制接管"将断开原有连接并创建新接线。此操作不可恢复！
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CableManagement;
