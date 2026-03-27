import React, { useState, useCallback } from 'react';
import {
  Modal,
  Upload,
  Table,
  Button,
  Space,
  Checkbox,
  Alert,
  Tag,
  Typography,
  Progress,
  Spin,
  message,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  ImportOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import api from '../api';
import { designTokens } from '../config/theme';
import CloseButton from './CloseButton';

const { Text, Title } = Typography;

function NetworkCardImportModal({ visible, onClose, onSuccess }) {
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importing, setImporting] = useState(false);
  const [skipExisting, setSkipExisting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);

  const generateUniqueNicId = () => {
    return `NIC-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  };

  const handleFileUpload = (file, onSuccess) => {
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
          parsedData = Papa.parse(data, {
            header: true,
            skipEmptyLines: true,
          }).data;
        } else {
          message.error('不支持的文件格式，请上传 .xlsx 或 .csv 文件');
          return;
        }

        if (parsedData.length === 0) {
          message.warning('文件内容为空，请检查文件内容');
          return;
        }

        const validatedResult = await validateImportData(parsedData);
        setImportPreview(validatedResult.validData);
        setImportErrors(validatedResult.errors);
        setImportProgress({ current: 0, total: validatedResult.validData.length });
        if (onSuccess) onSuccess();
      } catch (error) {
        message.error('文件解析失败');
        console.error('文件解析失败:', error);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const validateImportData = async data => {
    const validData = [];
    const allErrors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const result = await validateNetworkCardRow(row, i);

      if (result.valid) {
        validData.push(row);
      } else {
        allErrors.push(...result.errors.map(err => ({ ...err, originalRow: row })));
      }
    }

    if (allErrors.length > 0) {
      message.warning({
        content: `发现 ${allErrors.length} 个数据错误，请查看错误详情并修正后重新导入`,
        duration: 5,
      });
    }

    return { validData, errors: allErrors };
  };

  const validateNetworkCardRow = async (row, index) => {
    const rowNum = index + 2;
    const errors = [];

    if (!row['设备ID']) {
      errors.push({
        row: rowNum,
        field: '设备ID',
        value: row['设备ID'] || '(空)',
        error: '缺少必填字段',
        suggestion: '请填写设备ID，格式如：DEV001',
      });
    }

    if (!row['网卡名称']) {
      errors.push({
        row: rowNum,
        field: '网卡名称',
        value: row['网卡名称'] || '(空)',
        error: '缺少必填字段',
        suggestion: '请填写网卡名称，格式如：网卡1、eth0',
      });
    }

    if (row['插槽编号']) {
      const slotPattern = /^\d+$/;
      if (!slotPattern.test(row['插槽编号'])) {
        errors.push({
          row: rowNum,
          field: '插槽编号',
          value: row['插槽编号'],
          error: '插槽编号格式错误',
          suggestion: '插槽编号必须为数字，如：1、2',
        });
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
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

    let progressInterval;
    let currentProgress = 0;

    try {
      const networkCardsData = importPreview.map((row, index) => ({
        nicId: generateUniqueNicId(),
        deviceId: row['设备ID'],
        name: row['网卡名称'],
        slotNumber: row['插槽编号'] ? parseInt(row['插槽编号']) : null,
        model: row['网卡型号'] || null,
        manufacturer: row['制造商'] || null,
        description: row['描述'] || null,
      }));

      progressInterval = setInterval(() => {
        currentProgress = Math.min(currentProgress + Math.random() * 15, 85);
        setImportProgress(prev => ({
          ...prev,
          current: Math.floor((currentProgress / 100) * importPreview.length),
        }));
      }, 200);

      const response = await api.post('/network-cards/batch', {
        networkCards: networkCardsData,
        skipExisting,
        updateExisting,
      });

      const { total, success, failed, skipped = 0, updated = 0, errors } = response;

      clearInterval(progressInterval);
      setImportProgress({ current: importPreview.length, total: importPreview.length });

      let msgContent = '';
      if (updated > 0) {
        msgContent += `更新 ${updated} 个，`;
      }
      if (skipped > 0) {
        msgContent += `跳过 ${skipped} 个，`;
      }
      if (success > 0) {
        msgContent += `新增 ${success - updated} 个，`;
      }
      if (failed > 0) {
        msgContent += `失败 ${failed} 个`;
        console.error('导入错误:', errors);
      }

      if (failed > 0 && success === 0 && skipped === 0 && updated === 0) {
        message.error(`导入失败！${msgContent}`);
      } else {
        message.success({
          content: `导入完成！${msgContent}`,
          icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
        });
      }

      if (onSuccess) {
        onSuccess();
      }
      setImportPreview([]);
      setImportErrors([]);
      onClose();
    } catch (error) {
      clearInterval(progressInterval);
      console.error('批量导入失败:', error);
      message.error('批量导入失败，请检查数据格式');
    } finally {
      clearInterval(progressInterval);
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        设备ID: 'DEV001',
        网卡名称: '网卡1',
        插槽编号: '1',
        网卡型号: 'Intel X710',
        制造商: 'Intel',
        描述: '主网卡',
      },
      {
        设备ID: 'DEV001',
        网卡名称: '网卡2',
        插槽编号: '2',
        网卡型号: 'Intel X710',
        制造商: 'Intel',
        描述: '备网卡',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '网卡数据');
    XLSX.writeFile(workbook, '网卡导入模板.xlsx');
  };

  const handleClose = () => {
    setImportPreview([]);
    setImportErrors([]);
    setImportProgress({ current: 0, total: 0 });
    setSkipExisting(false);
    setUpdateExisting(false);
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: designTokens.borderRadius.md,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <CloudServerOutlined />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 600 }}>批量导入网卡</span>
        </div>
      }
      open={visible}
      closeIcon={<CloseButton />}
      onCancel={handleClose}
      width={900}
      footer={[
        <Button
          key="cancel"
          onClick={handleClose}
          style={{ borderRadius: designTokens.borderRadius.sm }}
        >
          取消
        </Button>,
        <Button
          key="download"
          icon={<DownloadOutlined />}
          onClick={handleDownloadTemplate}
          style={{ borderRadius: designTokens.borderRadius.sm }}
        >
          下载模板
        </Button>,
        <Button
          key="import"
          type="primary"
          icon={<ImportOutlined />}
          onClick={handleBatchImport}
          loading={importing}
          disabled={importPreview.length === 0}
          style={{
            background: designTokens.colors.primary.gradient,
            border: 'none',
            borderRadius: designTokens.borderRadius.sm,
          }}
        >
          开始导入
        </Button>,
      ]}
    >
      <div style={{ padding: '16px 0' }}>
        <Alert
          message="操作说明"
          description={
            <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
              <div>
                <strong>适用范围：</strong>批量导入网卡仅适用于
                <span style={{ color: '#1890ff', fontWeight: 600 }}>服务器设备</span>
                ，交换机设备请直接在端口管理中导入端口
              </div>
              <div style={{ marginTop: '8px' }}>
                <strong>前置条件：</strong>请先在
                <span style={{ color: '#1890ff', fontWeight: 600 }}>设备管理</span>
                中添加目标服务器，确保设备ID已存在
              </div>
              <div style={{ marginTop: '8px' }}>
                <strong>操作步骤：</strong>
              </div>
              <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                <div>1. 点击「下载模板」获取标准Excel/CSV文件</div>
                <div>
                  2. 按模板格式填写网卡信息，
                  <span style={{ color: '#ff4d4f', fontWeight: 600 }}>设备ID</span>和
                  <span style={{ color: '#ff4d4f', fontWeight: 600 }}>网卡名称</span>为必填项
                </div>
                <div>3. 点击上传区域选择文件，或直接拖拽文件到上传区域</div>
                <div>4. 系统自动校验数据，可预览前10条数据及错误详情</div>
                <div>5. 选择导入策略（跳过/更新已存在），点击「开始导入」</div>
              </div>
              <div style={{ marginTop: '8px' }}>
                <strong>字段说明：</strong>
              </div>
              <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                <div>
                  • <strong>设备ID</strong>（必填）：服务器的唯一标识，如DEV001
                </div>
                <div>
                  • <strong>网卡名称</strong>（必填）：网卡的名称或标识，如eth0、网卡1
                </div>
                <div>
                  • <strong>插槽编号</strong>（选填）：网卡所在的插槽位置，必须为数字
                </div>
                <div>
                  • <strong>网卡型号</strong>（选填）：如Intel X710、BCM57414
                </div>
                <div>
                  • <strong>制造商</strong>（选填）：如Intel、Mellanox
                </div>
                <div>
                  • <strong>描述</strong>（选填）：备注信息
                </div>
              </div>
              <div style={{ marginTop: '8px', color: '#faad14' }}>
                <strong>注意事项：</strong>
              </div>
              <div style={{ paddingLeft: '12px', marginTop: '4px', color: '#faad14' }}>
                <div>• 同一设备下网卡名称不可重复</div>
                <div>• 导入后需在网卡管理中为网卡添加端口</div>
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{
            borderRadius: designTokens.borderRadius.md,
            background: designTokens.colors.info.bg,
            border: `1px solid ${designTokens.colors.info.light}40`,
            marginBottom: '16px',
          }}
        />

        <Upload.Dragger
          name="file"
          accept=".xlsx,.xls,.csv"
          showUploadList={false}
          beforeUpload={file => {
            handleFileUpload(file, null);
            return false;
          }}
          style={{
            borderRadius: designTokens.borderRadius.lg,
            border: `2px dashed ${designTokens.colors.primary.light}`,
            background: designTokens.colors.primary.bg,
          }}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: '48px', color: designTokens.colors.primary.main }} />
          </p>
          <p
            className="ant-upload-text"
            style={{ fontSize: '16px', color: designTokens.colors.neutral[700] }}
          >
            点击或拖拽文件到此处上传
          </p>
          <p className="ant-upload-hint" style={{ color: designTokens.colors.neutral[500] }}>
            支持 .xlsx, .xls, .csv 格式文件
          </p>
        </Upload.Dragger>

        <div
          style={{
            display: 'flex',
            gap: '24px',
            marginTop: '16px',
            padding: '16px',
            background: designTokens.colors.neutral[50],
            borderRadius: designTokens.borderRadius.md,
          }}
        >
          <Checkbox checked={skipExisting} onChange={e => setSkipExisting(e.target.checked)}>
            跳过已存在的网卡
          </Checkbox>
          <Checkbox checked={updateExisting} onChange={e => setUpdateExisting(e.target.checked)}>
            更新已存在的网卡
          </Checkbox>
        </div>

        {importErrors.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <Alert
              message={`发现 ${importErrors.length} 个错误`}
              description={
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <Table
                    columns={[
                      {
                        title: '行号',
                        dataIndex: 'row',
                        key: 'row',
                        width: 70,
                        render: row => <Tag color="red">{row}</Tag>,
                      },
                      {
                        title: '字段',
                        dataIndex: 'field',
                        key: 'field',
                        width: 100,
                        render: field => <Text strong>{field}</Text>,
                      },
                      {
                        title: '错误值',
                        dataIndex: 'value',
                        key: 'value',
                        width: 120,
                        render: val => <Text code>{val}</Text>,
                      },
                      {
                        title: '错误原因',
                        dataIndex: 'error',
                        key: 'error',
                        render: err => <Text type="danger">{err}</Text>,
                      },
                      {
                        title: '修正建议',
                        dataIndex: 'suggestion',
                        key: 'suggestion',
                        render: sug => <Text type="secondary">{sug}</Text>,
                      },
                    ]}
                    dataSource={importErrors}
                    rowKey={(record, index) => `error-${index}`}
                    pagination={{
                      pageSize: 5,
                      size: 'small',
                      showSizeChanger: false,
                      showTotal: total => `共 ${total} 条错误`,
                    }}
                    size="small"
                    scroll={{ x: 600 }}
                    style={{ marginTop: '8px' }}
                  />
                </div>
              }
              type="error"
              showIcon
              style={{ borderRadius: designTokens.borderRadius.md }}
            />
          </div>
        )}

        {importPreview.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <Alert
              message={
                <span>
                  成功解析 {importPreview.length} 条有效数据
                  {importErrors.length > 0 && (
                    <span style={{ color: '#ff4d4f', marginLeft: 8 }}>
                      （{importErrors.length} 条错误）
                    </span>
                  )}
                </span>
              }
              type={importErrors.length > 0 ? 'warning' : 'success'}
              showIcon
              style={{ marginBottom: '16px', borderRadius: designTokens.borderRadius.md }}
            />
            <div
              style={{
                marginBottom: '8px',
                fontWeight: 500,
                color: designTokens.colors.neutral[700],
              }}
            >
              数据预览（前10条）
            </div>
            <Table
              columns={[
                { title: '设备ID', dataIndex: '设备ID', key: 'deviceId', width: 120 },
                { title: '网卡名称', dataIndex: '网卡名称', key: 'name', width: 120 },
                { title: '插槽编号', dataIndex: '插槽编号', key: 'slotNumber', width: 100 },
                { title: '网卡型号', dataIndex: '网卡型号', key: 'model', width: 120 },
                { title: '制造商', dataIndex: '制造商', key: 'manufacturer', width: 100 },
                { title: '描述', dataIndex: '描述', key: 'description', ellipsis: true },
              ]}
              dataSource={importPreview.slice(0, 10)}
              rowKey={(record, index) => `import-row-${index}`}
              pagination={false}
              size="small"
              scroll={{ x: 700 }}
              style={{ borderRadius: designTokens.borderRadius.md }}
            />
            {importPreview.length > 10 && (
              <div
                style={{
                  textAlign: 'center',
                  marginTop: '12px',
                  color: designTokens.colors.neutral[500],
                }}
              >
                仅显示前10条数据，共 {importPreview.length} 条
              </div>
            )}
          </div>
        )}

        {importing && (
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <Spin size="large" tip="导入中..." />
            <div style={{ marginTop: '24px' }}>
              <Progress
                percent={Math.round((importProgress.current / importProgress.total) * 100)}
                status="active"
                strokeColor={{
                  '0%': designTokens.colors.primary.main,
                  '100%': designTokens.colors.success.main,
                }}
                style={{ borderRadius: designTokens.borderRadius.sm }}
              />
              <div style={{ marginTop: '16px', color: designTokens.colors.neutral[600] }}>
                正在导入 {importProgress.current} / {importProgress.total} 条数据...
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default NetworkCardImportModal;
