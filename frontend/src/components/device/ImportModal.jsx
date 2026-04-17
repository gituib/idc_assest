import React, { useState } from 'react';
import { Modal, Upload, Button, Progress, message, Table, Alert, Space, Spin } from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { designTokens } from '../../config/theme';

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '18px',
  fontWeight: 600,
};

const ImportModal = ({ visible, deviceFields, onImport, onCancel }) => {
  const [step, setStep] = useState('upload');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState('');
  const [importResult, setImportResult] = useState(null);

  const api = axios.create({
    baseURL: '/api',
  });

  api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  const resetState = () => {
    setStep('upload');
    setIsPreviewing(false);
    setIsConfirming(false);
    setPreviewLoading(false);
    setPreviewData(null);
    setSelectedFile(null);
    setImportProgress(0);
    setImportPhase('');
    setImportResult(null);
  };

  const handleClose = () => {
    resetState();
    onCancel();
  };

  const handlePreview = async file => {
    const actualFile = file.originFileObj || file;
    setSelectedFile(actualFile);
    setPreviewLoading(true);
    setIsPreviewing(true);

    try {
      const formData = new FormData();
      formData.append('csvFile', actualFile);

      const response = await api.post('/devices/import-preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setPreviewData(response.data.data);
        setStep('preview');
      } else {
        message.error(response.data.error || '预览失败');
        resetState();
      }
    } catch (error) {
      console.error('预览失败:', error);
      message.error(error.response?.data?.error || '预览失败，请检查文件格式');
      resetState();
    } finally {
      setPreviewLoading(false);
    }

    return false;
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) {
      message.error('请先选择文件');
      return;
    }

    setIsConfirming(true);
    setImportProgress(0);
    setImportPhase('正在上传文件...');

    try {
      await onImport(selectedFile, {
        onProgress: (progress, phase) => {
          setImportProgress(progress);
          setImportPhase(phase);
        },
        onSuccess: result => {
          setImportResult(result);
          setImportProgress(100);
          setImportPhase('导入完成');
          setIsConfirming(false);
          setStep('result');
        },
        onError: error => {
          setImportResult({
            success: false,
            statistics: {
              total: 0,
              success: 0,
              failed: 1,
              errors: [{ row: 0, error: error.message || '导入失败' }],
            },
          });
          setIsConfirming(false);
          setStep('result');
        },
      });
    } catch (error) {
      setIsConfirming(false);
      message.error('导入失败');
      resetState();
    }
  };

  const requiredFields = deviceFields.filter(f => f.visible && f.required);
  const optionalFields = deviceFields.filter(f => f.visible && !f.required);

  const previewColumns = previewData?.fieldList
    ? [
        ...previewData.fieldList
          .filter(field => field.fieldName !== 'rackId')
          .map(field => ({
            title: field.displayName + (field.required ? ' *' : ''),
            dataIndex: field.fieldName,
            key: field.fieldName,
            width: 120,
            ellipsis: true,
          })),
        { title: '所在机房', dataIndex: 'roomName', key: 'roomName', width: 100 },
        { title: '所在机柜', dataIndex: 'rackName', key: 'rackName', width: 100 },
      ]
    : [
        { title: '行号', dataIndex: '_rowNum', key: '_rowNum', width: 60 },
        { title: '设备名称', dataIndex: 'name', key: 'name', width: 120 },
        { title: '设备类型', dataIndex: 'type', key: 'type', width: 80 },
        { title: '品牌', dataIndex: 'model', key: 'model', width: 100 },
        { title: '序列号', dataIndex: 'serialNumber', key: 'serialNumber', width: 140 },
        { title: '所在机房', dataIndex: 'roomName', key: 'roomName', width: 100 },
        { title: '所在机柜', dataIndex: 'rackName', key: 'rackName', width: 100 },
        { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
      ];

  const getRowClassName = record => {
    if (record._hasError) {
      return 'ant-table-row-error';
    }
    return '';
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/devices/import-template', {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = new Blob([response.data], { type: 'text/csv; charset=gbk' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '设备导入模板.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载模板失败:', error);
      if (error.response?.data) {
        const text = await error.response.data.text();
        try {
          const json = JSON.parse(text);
          message.error(json.message || '下载模板失败');
        } catch {
          message.error('下载模板失败');
        }
      } else {
        message.error('下载模板失败');
      }
    }
  };

  const renderUploadStep = () => (
    <div>
      <p style={{ color: '#666', marginBottom: '8px' }}>请上传CSV格式的设备数据文件</p>
      <p style={{ color: '#999', fontSize: '12px', marginBottom: '20px' }}>支持的编码格式：GBK</p>

      <div
        style={{
          marginBottom: '20px',
          padding: '16px',
          background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)',
          borderRadius: '12px',
          border: '1px solid #f0f0f0',
        }}
      >
        <p style={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>CSV文件格式要求：</p>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {requiredFields.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#d93025', fontWeight: '500' }}>必填字段：</span>
              <span style={{ color: '#666', fontSize: '13px' }}>
                {requiredFields.map(f => f.displayName).join('、')}
              </span>
            </div>
          )}
          {optionalFields.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#666', fontWeight: '500' }}>可选字段：</span>
              <span style={{ color: '#666', fontSize: '13px' }}>
                {optionalFields.map(f => f.displayName).join('、')}
              </span>
            </div>
          )}
          <ul
            style={{
              paddingLeft: '20px',
              marginBottom: '10px',
              color: '#666',
              fontSize: '13px',
              marginTop: '12px',
            }}
          >
            <li>
              设备类型：server(服务器)、switch(交换机)、router(路由器)、storage(存储设备)、other(其他)
            </li>
            <li>状态值：running(运行中)、maintenance(维护中)、offline(离线)、fault(故障)</li>
            <li>日期格式：YYYY-MM-DD (例如：2023-01-01)</li>
          </ul>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <Button
          onClick={handleDownloadTemplate}
          icon={<DownloadOutlined />}
          style={{
            height: '36px',
            borderRadius: designTokens.borderRadius.small,
            border: `1px solid ${designTokens.colors.border.light}`,
          }}
        >
          下载导入模板
        </Button>
        <span style={{ color: '#999', fontSize: '12px', marginLeft: '10px' }}>
          包含示例数据的CSV模板文件（根据当前字段配置生成）
        </span>
      </div>

      <Upload
        name="csvFile"
        accept=".csv"
        showUploadList={false}
        beforeUpload={handlePreview}
        maxCount={1}
      >
        <Button
          type="primary"
          icon={<UploadOutlined />}
          block
          style={{
            height: '40px',
            borderRadius: designTokens.borderRadius.small,
            background: designTokens.colors.primary.gradient,
            border: 'none',
            color: '#ffffff',
            boxShadow: designTokens.shadows.small,
            fontWeight: '500',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          选择CSV文件
        </Button>
      </Upload>
    </div>
  );

  const renderPreviewStep = () => (
    <div>
      <div
        style={{
          marginBottom: '16px',
          padding: '16px',
          background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
          borderRadius: '12px',
          border: '1px solid #667eea40',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <FileTextOutlined style={{ fontSize: '24px', color: '#667eea' }} />
          <div>
            <div style={{ fontWeight: '600', color: '#333', fontSize: '15px' }}>
              {selectedFile?.name || '已选择文件'}
            </div>
            <div style={{ color: '#666', fontSize: '13px', marginTop: '2px' }}>
              共 {previewData?.total || 0} 条记录，已解析 {previewData?.previewCount || 0}{' '}
              条作为预览
            </div>
          </div>
        </div>

        {previewData?.statistics?.invalid > 0 ? (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message={`发现 ${previewData.statistics.invalid} 条数据存在错误`}
            description="错误行已用红色标记，请核对后确认导入"
            style={{ marginTop: '8px' }}
          />
        ) : (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="数据验证通过"
            description="所有数据格式正确，可以进行导入"
            style={{ marginTop: '8px' }}
          />
        )}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px',
              color: '#fff',
              textAlign: 'center',
              minWidth: '100px',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: '700' }}>
              {previewData?.statistics?.total || 0}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>总记录数</div>
          </div>
          <div
            style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
              borderRadius: '8px',
              color: '#fff',
              textAlign: 'center',
              minWidth: '100px',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: '700' }}>
              {previewData?.statistics?.valid || 0}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>有效</div>
          </div>
          <div
            style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
              borderRadius: '8px',
              color: '#fff',
              textAlign: 'center',
              minWidth: '100px',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: '700' }}>
              {previewData?.statistics?.invalid || 0}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>无效</div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginBottom: '16px',
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid #f0f0f0',
          borderRadius: '8px',
        }}
      >
        <Table
          columns={previewColumns}
          dataSource={previewData?.preview || []}
          rowKey="_rowNum"
          rowClassName={getRowClassName}
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: total => `共 ${total} 条`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {previewData?.errors?.length > 0 && (
        <div
          style={{
            marginBottom: '16px',
            maxHeight: '150px',
            overflowY: 'auto',
            border: '1px solid #ffcccc',
            borderRadius: '8px',
            padding: '12px',
            backgroundColor: '#fff7f7',
          }}
        >
          <h4
            style={{ color: '#d93025', marginBottom: '12px', fontWeight: '600', fontSize: '13px' }}
          >
            错误详情：
          </h4>
          {previewData.errors.slice(0, 10).map((err, index) => (
            <div key={index} style={{ marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ fontWeight: 'bold', color: '#d93025' }}>第{err.row}行：</span>
              <span style={{ color: '#666' }}>{err.errors.join('，')}</span>
            </div>
          ))}
          {previewData.errors.length > 10 && (
            <div style={{ color: '#999', fontSize: '12px', textAlign: 'center' }}>
              还有 {previewData.errors.length - 10} 条错误未显示...
            </div>
          )}
        </div>
      )}

      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button
          onClick={handleClose}
          style={{
            height: '40px',
            borderRadius: designTokens.borderRadius.small,
          }}
        >
          取消
        </Button>
        <Button
          type="primary"
          onClick={handleConfirmImport}
          disabled={previewData?.statistics?.invalid > 0}
          icon={<CheckCircleOutlined />}
          style={{
            height: '40px',
            borderRadius: designTokens.borderRadius.small,
            background:
              previewData?.statistics?.invalid > 0 ? '#ccc' : designTokens.colors.primary.gradient,
            border: 'none',
            color: '#ffffff',
            fontWeight: '500',
          }}
        >
          确认导入
        </Button>
      </Space>
    </div>
  );

  const renderConfirmingStep = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '16px',
            color: '#fff',
            fontSize: '20px',
          }}
        >
          <UploadOutlined spin />
        </div>
        <div>
          <p
            style={{
              margin: '0 0 4px 0',
              fontWeight: '600',
              color: '#333',
              fontSize: '16px',
            }}
          >
            正在导入设备数据
          </p>
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
  );

  const renderResultStep = () => (
    <div>
      <p style={{ marginBottom: '10px', fontWeight: '600' }}>导入完成：</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            padding: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '8px',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '700' }}>
            {importResult?.statistics?.total || 0}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>总记录数</div>
        </div>
        <div
          style={{
            padding: '12px',
            background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
            borderRadius: '8px',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '700' }}>
            {importResult?.statistics?.success || 0}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>成功</div>
        </div>
        <div
          style={{
            padding: '12px',
            background: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
            borderRadius: '8px',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '700' }}>
            {importResult?.statistics?.failed || 0}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>失败</div>
        </div>
      </div>

      {importResult?.statistics?.errors?.length > 0 && (
        <div
          style={{
            marginTop: '20px',
            maxHeight: 400,
            overflowY: 'auto',
            border: '1px solid #ffcccc',
            borderRadius: '8px',
            padding: '12px',
            backgroundColor: '#fff7f7',
          }}
        >
          <h4 style={{ color: '#d93025', marginBottom: '12px', fontWeight: '600' }}>
            失败记录详情：
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#ffeeee' }}>
                <th
                  style={{
                    border: '1px solid #ffcccc',
                    padding: '8px',
                    textAlign: 'left',
                    width: '80px',
                  }}
                >
                  行号
                </th>
                <th
                  style={{
                    border: '1px solid #ffcccc',
                    padding: '8px',
                    textAlign: 'left',
                  }}
                >
                  失败原因
                </th>
              </tr>
            </thead>
            <tbody>
              {importResult.statistics.errors.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #ffcccc' }}>
                  <td
                    style={{
                      border: '1px solid #ffcccc',
                      padding: '8px',
                      fontWeight: 'bold',
                    }}
                  >
                    {item.row || index + 1}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ffcccc',
                      padding: '8px',
                      color: '#d93025',
                    }}
                  >
                    {item.error || '未知错误'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button
        type="primary"
        onClick={handleClose}
        style={{
          marginTop: '20px',
          height: '40px',
          borderRadius: designTokens.borderRadius.small,
          background: designTokens.colors.primary.gradient,
          border: 'none',
          color: '#ffffff',
          boxShadow: designTokens.shadows.small,
          fontWeight: '500',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        确定
      </Button>
    </div>
  );

  const renderLoadingStep = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <Spin size="large" />
      <div style={{ marginTop: '16px', color: '#666' }}>正在解析文件...</div>
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case 'upload':
        return (
          <div style={{ ...modalHeaderStyle, paddingRight: '32px' }}>
            <UploadOutlined style={{ color: '#667eea' }} />
            导入设备
          </div>
        );
      case 'preview':
        return (
          <div style={{ ...modalHeaderStyle, paddingRight: '32px' }}>
            <FileTextOutlined style={{ color: '#667eea' }} />
            导入设备 - 数据预览
          </div>
        );
      case 'confirming':
        return (
          <div style={{ ...modalHeaderStyle, paddingRight: '32px' }}>
            <UploadOutlined style={{ color: '#667eea' }} />
            导入设备 - 导入中
          </div>
        );
      case 'result':
        return (
          <div style={{ ...modalHeaderStyle, paddingRight: '32px' }}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            导入设备 - 结果
          </div>
        );
      default:
        return '导入设备';
    }
  };

  return (
    <Modal
      title={getStepTitle()}
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={step === 'preview' ? 900 : 650}
      destroyOnHidden
      styles={{
        header: {
          borderBottom: '1px solid #f0f0f0',
          padding: '16px 24px',
          position: 'relative',
        },
        body: { padding: step === 'loading' ? '40px 24px' : '24px' },
      }}
    >
      {step === 'upload' && renderUploadStep()}
      {step === 'loading' && renderLoadingStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'confirming' && renderConfirmingStep()}
      {step === 'result' && renderResultStep()}
    </Modal>
  );
};

export default React.memo(ImportModal);
