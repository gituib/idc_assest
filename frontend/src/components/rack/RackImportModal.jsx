import React, { useState, useCallback } from 'react';
import {
  Modal,
  Upload,
  Button,
  Progress,
  message,
  Steps,
  Card,
  Alert,
  Space,
  Tag,
  Typography,
  Divider,
  Table,
  Spin,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  FileExcelOutlined,
  InboxOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { designTokens } from '../../config/theme';
import CloseButton from '../CloseButton';
import api from '../../api';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Dragger } = Upload;

/**
 * 机柜导入弹窗组件
 * @param {boolean} visible - 弹窗显示状态
 * @param {Function} onClose - 关闭回调
 * @param {Function} onImport - 导入回调
 * @param {Function} onDownloadTemplate - 下载模板回调
 * @returns {JSX.Element}
 */
function RackImportModal({ visible, onClose, onImport, onDownloadTemplate }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const resetState = useCallback(() => {
    setCurrentStep(0);
    setIsImporting(false);
    setImportProgress(0);
    setImportPhase('');
    setImportResult(null);
    setSelectedFile(null);
    setPreviewData(null);
    setPreviewLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  /**
   * 调用后端接口解析 Excel 文件获取预览数据
   * @param {File} file - 上传的文件
   */
  const fetchPreviewData = useCallback(async file => {
    setPreviewLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/racks/import-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.success) {
        setPreviewData(response.data);
        setCurrentStep(1);
      } else {
        message.error(response.error || '预览失败');
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('预览失败:', error);
      const errMsg = error.response?.data?.error || error.message || '预览失败，请检查文件格式';
      message.error(errMsg);
      setSelectedFile(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handleBeforeUpload = useCallback(
    file => {
      const isXlsx =
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel';

      if (!isXlsx) {
        message.error('请上传 Excel 文件（.xlsx 或 .xls 格式）');
        return false;
      }

      setSelectedFile(file);
      fetchPreviewData(file);
      return false;
    },
    [fetchPreviewData]
  );

  const handleStartImport = useCallback(async () => {
    if (!selectedFile) {
      message.warning('请先选择文件');
      return;
    }

    setIsImporting(true);
    setCurrentStep(2);
    setImportProgress(0);
    setImportPhase('正在解析文件...');

    try {
      const result = await onImport(selectedFile, {
        onProgress: (progress, phase) => {
          setImportProgress(progress);
          setImportPhase(phase);
        },
      });

      setImportResult(result);
      setImportProgress(100);
      setImportPhase('导入完成');
      setCurrentStep(3);
    } catch (error) {
      message.error(error?.message || '导入失败');
      setImportPhase('导入失败');
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, onImport]);

  const steps = [
    { title: '上传文件', icon: <UploadOutlined /> },
    { title: '数据预览', icon: <FileTextOutlined /> },
    { title: '导入中', icon: <DatabaseOutlined /> },
    { title: '完成', icon: <CheckCircleOutlined /> },
  ];

  const renderUploadStep = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 文件上传区域 */}
      <Card
        style={{
          borderRadius: designTokens.borderRadius.large,
          border: `2px dashed ${designTokens.colors.border.light}`,
          background: designTokens.colors.background.secondary,
        }}
        bodyStyle={{ padding: '40px 24px' }}
      >
        <Dragger
          name="file"
          accept=".xlsx,.xls"
          showUploadList={false}
          beforeUpload={handleBeforeUpload}
          maxCount={1}
          disabled={previewLoading}
          style={{ background: 'transparent', border: 'none' }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: designTokens.colors.primary.bg,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              {previewLoading ? (
                <Spin size="large" />
              ) : (
                <InboxOutlined
                  style={{ fontSize: '36px', color: designTokens.colors.primary.main }}
                />
              )}
            </div>
            <Title level={5} style={{ margin: '0 0 8px', color: designTokens.colors.text.primary }}>
              {previewLoading ? '正在解析文件...' : '点击或拖拽文件到此处上传'}
            </Title>
            <Paragraph style={{ color: designTokens.colors.text.tertiary, margin: 0 }}>
              支持 .xlsx、.xls 格式，文件大小不超过 10MB
            </Paragraph>
          </div>
        </Dragger>
      </Card>

      {/* 模板下载 */}
      <Card
        style={{
          borderRadius: designTokens.borderRadius.large,
          border: `1px solid ${designTokens.colors.border.light}`,
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: designTokens.borderRadius.medium,
              background: designTokens.colors.success.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FileExcelOutlined
              style={{ fontSize: '24px', color: designTokens.colors.success.main }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: '15px', color: designTokens.colors.text.primary }}>
              下载导入模板
            </Text>
            <Paragraph style={{ color: designTokens.colors.text.secondary, margin: '4px 0 0', fontSize: '13px' }}>
              包含标准字段和示例数据，帮助您快速准备导入文件
            </Paragraph>
          </div>
          <Button
            icon={<DownloadOutlined />}
            onClick={onDownloadTemplate}
            style={{
              height: '40px',
              borderRadius: designTokens.borderRadius.medium,
              borderColor: designTokens.colors.primary.main,
              color: designTokens.colors.primary.main,
            }}
          >
            下载模板
          </Button>
        </div>
      </Card>

      {/* 格式说明 */}
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="Excel 文件格式要求"
        description={
          <ul style={{ margin: '8px 0 0', paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>
              <Text strong>必填字段：</Text>
              机柜ID、机柜名称、所属机房名称、高度(U)、最大功率(W)、状态
            </li>
            <li>
              <Text strong>状态值：</Text>
              <Tag color="success">active（在用）</Tag>
              <Tag color="warning">maintenance（维护中）</Tag>
              <Tag>inactive（停用）</Tag>
            </li>
            <li>
              <Text strong>数据格式：</Text>
              高度和功率必须是数字格式，编码为 UTF-8
            </li>
          </ul>
        }
        style={{
          borderRadius: designTokens.borderRadius.large,
          border: `1px solid ${designTokens.colors.info.light}40`,
          background: designTokens.colors.info.bg,
        }}
      />
    </Space>
  );

  const renderPreviewStep = () => {
    if (!previewData) return null;

    const columns = [
      { title: '行号', dataIndex: '_rowNum', key: '_rowNum', width: 60 },
      { title: '机柜ID', dataIndex: 'rackId', key: 'rackId', width: 100 },
      { title: '机柜名称', dataIndex: 'name', key: 'name', width: 120 },
      { title: '所属机房', dataIndex: 'roomName', key: 'roomName', width: 100 },
      { title: '高度(U)', dataIndex: 'height', key: 'height', width: 80 },
      { title: '最大功率(W)', dataIndex: 'maxPower', key: 'maxPower', width: 100 },
      { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
    ];

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 统计卡片 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}
        >
          <Card
            style={{
              borderRadius: designTokens.borderRadius.large,
              background: designTokens.colors.primary.bg,
              border: `1px solid ${designTokens.colors.primary.light}30`,
            }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <Text style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.primary.main }}>
              {previewData.total}
            </Text>
            <div style={{ fontSize: '12px', color: designTokens.colors.text.secondary, marginTop: '4px' }}>
              总记录数
            </div>
          </Card>
          <Card
            style={{
              borderRadius: designTokens.borderRadius.large,
              background: designTokens.colors.success.bg,
              border: `1px solid ${designTokens.colors.success.light}30`,
            }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <Text style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.success.main }}>
              {previewData.valid}
            </Text>
            <div style={{ fontSize: '12px', color: designTokens.colors.text.secondary, marginTop: '4px' }}>
              有效数据
            </div>
          </Card>
          <Card
            style={{
              borderRadius: designTokens.borderRadius.large,
              background: previewData.invalid > 0 ? designTokens.colors.error.bg : designTokens.colors.success.bg,
              border: `1px solid ${previewData.invalid > 0 ? designTokens.colors.error.light : designTokens.colors.success.light}30`,
            }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <Text
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: previewData.invalid > 0 ? designTokens.colors.error.main : designTokens.colors.success.main,
              }}
            >
              {previewData.invalid}
            </Text>
            <div style={{ fontSize: '12px', color: designTokens.colors.text.secondary, marginTop: '4px' }}>
              无效数据
            </div>
          </Card>
        </div>

        {/* 验证结果提示 */}
        {previewData.invalid > 0 ? (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message={`发现 ${previewData.invalid} 条数据存在错误`}
            description="错误行已用红色标记，请核对后确认导入。建议修复错误后重新上传。"
            style={{ borderRadius: designTokens.borderRadius.large }}
          />
        ) : (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="数据验证通过"
            description="所有数据格式正确，可以进行导入。"
            style={{ borderRadius: designTokens.borderRadius.large }}
          />
        )}

        {/* 数据预览表格 */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileTextOutlined style={{ color: designTokens.colors.primary.main }} />
              <Text strong>数据预览</Text>
              <Tag color="blue">共 {previewData.preview.length} 条</Tag>
            </div>
          }
          style={{
            borderRadius: designTokens.borderRadius.large,
            border: `1px solid ${designTokens.colors.border.light}`,
          }}
          bodyStyle={{ padding: 0 }}
        >
          <Table
            columns={columns}
            dataSource={previewData.preview}
            rowKey="_rowNum"
            size="small"
            pagination={false}
            scroll={{ x: 'max-content' }}
            rowClassName={record => (record._hasError ? 'ant-table-row-error' : '')}
            style={{
              borderRadius: `0 0 ${designTokens.borderRadius.large} ${designTokens.borderRadius.large}`,
            }}
          />
        </Card>

        {/* 错误详情 */}
        {previewData.errors && previewData.errors.length > 0 && (
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CloseCircleOutlined style={{ color: designTokens.colors.error.main }} />
                <Text strong style={{ color: designTokens.colors.error.main }}>
                  错误详情
                </Text>
              </div>
            }
            style={{
              borderRadius: designTokens.borderRadius.large,
              border: `1px solid ${designTokens.colors.error.light}50`,
              background: designTokens.colors.error.bg,
            }}
            bodyStyle={{ padding: '16px' }}
          >
            {previewData.errors.map((err, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 12px',
                  background: '#fff',
                  borderRadius: designTokens.borderRadius.medium,
                  marginBottom: index < previewData.errors.length - 1 ? '8px' : 0,
                  border: `1px solid ${designTokens.colors.error.light}30`,
                }}
              >
                <Text strong style={{ color: designTokens.colors.error.main }}>
                  第 {err.row} 行：
                </Text>
                <Text style={{ color: designTokens.colors.text.secondary }}>
                  {err.errors.join('；')}
                </Text>
              </div>
            ))}
          </Card>
        )}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button
            size="large"
            onClick={() => {
              setSelectedFile(null);
              setPreviewData(null);
              setCurrentStep(0);
            }}
            style={{ borderRadius: designTokens.borderRadius.medium }}
          >
            重新选择
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<ArrowRightOutlined />}
            onClick={handleStartImport}
            disabled={previewData.invalid > 0}
            style={{
              borderRadius: designTokens.borderRadius.medium,
              background: previewData.invalid > 0 ? undefined : designTokens.colors.primary.gradient,
              border: 'none',
            }}
          >
            确认导入
          </Button>
        </div>
      </Space>
    );
  };

  const renderImportingStep = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: designTokens.colors.primary.gradient,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}
      >
        <DatabaseOutlined style={{ fontSize: '36px', color: '#fff' }} />
      </div>
      <Title level={4} style={{ margin: '0 0 8px', color: designTokens.colors.text.primary }}>
        正在导入机柜数据
      </Title>
      <Text style={{ color: designTokens.colors.primary.main, fontSize: '15px' }}>
        {importPhase}
      </Text>
      <div style={{ marginTop: '32px', maxWidth: '400px', margin: '32px auto 0' }}>
        <Progress
          percent={importProgress}
          status="active"
          strokeColor={{
            '0%': designTokens.colors.primary.main,
            '100%': designTokens.colors.purple.main,
          }}
          strokeWidth={8}
          style={{ borderRadius: '4px' }}
        />
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
      `}</style>
    </div>
  );

  const renderResultStep = () => {
    if (!importResult) return null;

    const isSuccess = importResult.failedCount === 0;

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 结果图标和标题 */}
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: isSuccess ? designTokens.colors.success.gradient : designTokens.colors.warning.gradient,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            {isSuccess ? (
              <CheckCircleOutlined style={{ fontSize: '40px', color: '#fff' }} />
            ) : (
              <WarningOutlined style={{ fontSize: '40px', color: '#fff' }} />
            )}
          </div>
          <Title level={4} style={{ margin: '0 0 8px' }}>
            {isSuccess ? '导入成功' : '导入完成（部分失败）'}
          </Title>
          <Text style={{ color: designTokens.colors.text.secondary }}>
            {isSuccess
              ? '所有机柜数据已成功导入系统'
              : '部分数据导入失败，请查看下方错误详情'}
          </Text>
        </div>

        {/* 统计卡片 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}
        >
          <Card
            style={{
              borderRadius: designTokens.borderRadius.large,
              background: designTokens.colors.primary.bg,
              border: `1px solid ${designTokens.colors.primary.light}30`,
            }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <Text style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.primary.main }}>
              {importResult.total || 0}
            </Text>
            <div style={{ fontSize: '12px', color: designTokens.colors.text.secondary, marginTop: '4px' }}>
              总记录数
            </div>
          </Card>
          <Card
            style={{
              borderRadius: designTokens.borderRadius.large,
              background: designTokens.colors.success.bg,
              border: `1px solid ${designTokens.colors.success.light}30`,
            }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <Text style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.success.main }}>
              {importResult.successCount || 0}
            </Text>
            <div style={{ fontSize: '12px', color: designTokens.colors.text.secondary, marginTop: '4px' }}>
              成功导入
            </div>
          </Card>
          <Card
            style={{
              borderRadius: designTokens.borderRadius.large,
              background:
                importResult.failedCount > 0
                  ? designTokens.colors.error.bg
                  : designTokens.colors.success.bg,
              border: `1px solid ${importResult.failedCount > 0 ? designTokens.colors.error.light : designTokens.colors.success.light}30`,
            }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <Text
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color:
                  importResult.failedCount > 0
                    ? designTokens.colors.error.main
                    : designTokens.colors.success.main,
              }}
            >
              {importResult.failedCount || 0}
            </Text>
            <div style={{ fontSize: '12px', color: designTokens.colors.text.secondary, marginTop: '4px' }}>
              导入失败
            </div>
          </Card>
        </div>

        {/* 新增机柜列表 */}
        {importResult.createdRacks && importResult.createdRacks.length > 0 && (
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />
                <Text strong>本次新增机柜</Text>
                <Tag color="success">{importResult.createdRacks.length} 个</Tag>
              </div>
            }
            style={{
              borderRadius: designTokens.borderRadius.large,
              border: `1px solid ${designTokens.colors.success.light}50`,
              background: designTokens.colors.success.bg,
            }}
            bodyStyle={{ padding: '16px', maxHeight: '200px', overflow: 'auto' }}
          >
            {importResult.createdRacks.map((rack, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  background: '#fff',
                  borderRadius: designTokens.borderRadius.medium,
                  marginBottom: idx < importResult.createdRacks.length - 1 ? '8px' : 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <DatabaseOutlined style={{ color: designTokens.colors.primary.main }} />
                <Text strong>{rack.rackId}</Text>
                <Text type="secondary">-</Text>
                <Text>{rack.name}</Text>
              </div>
            ))}
          </Card>
        )}

        {/* 跳过机柜列表 */}
        {importResult.skippedRacks && importResult.skippedRacks.length > 0 && (
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <WarningOutlined style={{ color: designTokens.colors.warning.main }} />
                <Text strong>已跳过机柜（已存在）</Text>
                <Tag color="warning">{importResult.skippedRacks.length} 个</Tag>
              </div>
            }
            style={{
              borderRadius: designTokens.borderRadius.large,
              border: `1px solid ${designTokens.colors.warning.light}50`,
              background: designTokens.colors.warning.bg,
            }}
            bodyStyle={{ padding: '16px', maxHeight: '200px', overflow: 'auto' }}
          >
            {importResult.skippedRacks.map((rack, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  background: '#接口',
                  borderRadius: designTokens.borderRadius.medium,
                  marginBottom: idx < importResult.skippedRacks.length - 1 ? '8px' : 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <DatabaseOutlined style={{ color: designTokens.colors.warning.main }} />
                <Text strong>{rack.rackId}</Text>
                <Text type="secondary">-</Text>
                <Text>{rack.name}</Text>
              </div>
            ))}
          </Card>
        )}

        {/* 错误详情 */}
        {importResult.errors && importResult.errors.length > 0 && (
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CloseCircleOutlined style={{ color: designTokens.colors.error.main }} />
                <Text strong style={{ color: designTokens.colors.error.main }}>
                  错误详情
                </Text>
              </div>
            }
            style={{
              borderRadius: designTokens.borderRadius.large,
              border: `1px solid ${designTokens.colors.error.light}50`,
              background: designTokens.colors.error.bg,
            }}
            bodyStyle={{ padding: '16px', maxHeight: '250px', overflow: 'auto' }}
          >
            {importResult.errors.slice(0, 5).map((err, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 12px',
                  background: '#fff',
                  borderRadius: designTokens.borderRadius.medium,
                  marginBottom: idx < Math.min(importResult.errors.length, 5) - 1 ? '8px' : 0,
                  border: `1px solid ${designTokens.colors.error.light}30`,
                }}
              >
                <Text strong style={{ color: designTokens.colors.error.main }}>
                  第 {err.row || idx + 1} 行
                </Text>
                <Divider type="vertical" style={{ margin: '0 8px' }} />
                <Text style={{ color: designTokens.colors.text.secondary }}>{err.error}</Text>
              </div>
            ))}
            {importResult.errors.length > 5 && (
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  还有 {importResult.errors.length - 5} 处错误未显示...
                </Text>
              </div>
            )}
          </Card>
        )}

        {/* 完成按钮 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <Button
            type="primary"
            size="large"
            onClick={handleClose}
            style={{
              borderRadius: designTokens.borderRadius.medium,
              background: designTokens.colors.primary.gradient,
              border: 'none',
              minWidth: '120px',
            }}
          >
            完成
          </Button>
        </div>
      </Space>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderUploadStep();
      case 1:
        return renderPreviewStep();
      case 2:
        return renderImportingStep();
      case 3:
        return renderResultStep();
      default:
        return renderUploadStep();
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '32px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: designTokens.borderRadius.medium,
              background: designTokens.colors.primary.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <UploadOutlined />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 600 }}>导入机柜</span>
        </div>
      }
      open={visible}
      closeIcon={<CloseButton />}
      onCancel={handleClose}
      footer={null}
      width={720}
      destroyOnHidden
      styles={{
        header: {
          borderBottom: '1px solid #f0f0f0',
          padding: '16px 24px',
          position: 'relative',
        },
        body: { padding: '24px' },
      }}
      style={{ borderRadius: designTokens.borderRadius.large }}
    >
      {/* 步骤条 */}
      <Steps
        current={currentStep}
        items={steps}
        style={{ marginBottom: '24px' }}
        size="small"
      />

      {/* 步骤内容 */}
      {renderStepContent()}
    </Modal>
  );
}

export default React.memo(RackImportModal);
