import React, { useState } from 'react';
import { Modal, Upload, Button, Progress, message } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { designTokens } from '../../config/theme';

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '18px',
  fontWeight: 600,
};

const ImportModal = ({
  visible,
  deviceFields,
  onImport,
  onCancel,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState('');
  const [importResult, setImportResult] = useState(null);

  const handleImport = async (file) => {
    try {
      setIsImporting(true);
      setImportProgress(0);
      setImportPhase('正在上传文件...');
      setImportResult(null);

      await onImport(file, {
        onProgress: (progress, phase) => {
          setImportProgress(progress);
          setImportPhase(phase);
        },
        onSuccess: (result) => {
          setImportResult(result);
          setImportProgress(100);
          setImportPhase('导入完成');
          setIsImporting(false);
        },
        onError: (error) => {
          setImportResult({
            success: false,
            statistics: {
              total: 0,
              success: 0,
              failed: 1,
              errors: [{ row: 0, error: error.message || '导入失败' }],
            },
          });
          setIsImporting(false);
        },
      });
    } catch (error) {
      setIsImporting(false);
      setImportProgress(0);
      message.error('导入失败');
    }

    return false;
  };

  const handleClose = () => {
    setImportProgress(0);
    setImportPhase('');
    setImportResult(null);
    setIsImporting(false);
    onCancel();
  };

  const requiredFields = deviceFields.filter((f) => f.visible && f.required);
  const optionalFields = deviceFields.filter((f) => f.visible && !f.required);

  return (
    <Modal
      title={
        <div style={{ ...modalHeaderStyle, paddingRight: '32px' }}>
          <UploadOutlined style={{ color: '#667eea' }} />
          导入设备
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={650}
      destroyOnHidden
      styles={{
        header: {
          borderBottom: '1px solid #f0f0f0',
          padding: '16px 24px',
          position: 'relative',
        },
        body: { padding: '24px' },
      }}
    >
      {!isImporting && !importResult ? (
        <div>
          <p style={{ color: '#666', marginBottom: '8px' }}>请上传CSV格式的设备数据文件</p>
          <p style={{ color: '#999', fontSize: '12px', marginBottom: '20px' }}>
            支持的编码格式：GBK
          </p>

          <div
            style={{
              marginBottom: '20px',
              padding: '16px',
              background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)',
              borderRadius: '12px',
              border: '1px solid #f0f0f0',
            }}
          >
            <p style={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>
              CSV文件格式要求：
            </p>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {requiredFields.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#d93025', fontWeight: '500' }}>必填字段：</span>
                  <span style={{ color: '#666', fontSize: '13px' }}>
                    {requiredFields.map((f) => f.displayName).join('、')}
                  </span>
                </div>
              )}
              {optionalFields.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#666', fontWeight: '500' }}>可选字段：</span>
                  <span style={{ color: '#666', fontSize: '13px' }}>
                    {optionalFields.map((f) => f.displayName).join('、')}
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
            <a href="/api/devices/import-template" download="设备导入模板.csv">
              <Button
                icon={<DownloadOutlined />}
                style={{
                  height: '36px',
                  borderRadius: designTokens.borderRadius.small,
                  border: `1px solid ${designTokens.colors.border.light}`,
                }}
              >
                下载导入模板
              </Button>
            </a>
            <span style={{ color: '#999', fontSize: '12px', marginLeft: '10px' }}>
              包含示例数据的CSV模板文件（根据当前字段配置生成）
            </span>
          </div>

          <Upload
            name="csvFile"
            accept=".csv"
            showUploadList={false}
            beforeUpload={handleImport}
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
      ) : isImporting ? (
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
      ) : importResult?.statistics ? (
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
                {importResult.statistics.total || 0}
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
                {importResult.statistics.success || 0}
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
                {importResult.statistics.failed || 0}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>失败</div>
            </div>
          </div>

          {importResult.statistics?.errors?.length > 0 && (
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
      ) : null}
    </Modal>
  );
};

export default React.memo(ImportModal);
