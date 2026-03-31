import React, { useState } from 'react';
import { Modal, Form, Select, Button, Space, message } from 'antd';
import { ExportOutlined, FileTextOutlined, BranchesOutlined, TableOutlined } from '@ant-design/icons';

const { Option } = Select;

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '18px',
  fontWeight: 600,
};

const TicketExportModal = ({
  visible,
  onExport,
  onCancel,
  selectedCount = 0,
  currentPageCount = 0,
  totalCount = 0,
}) => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportScope, setExportScope] = useState('selected');
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async () => {
    if (exportScope === 'selected' && selectedCount === 0) {
      message.warning('请先选择要导出的工单');
      return;
    }
    setExportLoading(true);
    try {
      await onExport({
        format: exportFormat,
        scope: exportScope,
      });
      onCancel();
    } catch (error) {
      message.error('导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ ...modalHeaderStyle, paddingRight: '32px' }}>
          <ExportOutlined style={{ color: '#fa8c16' }} />
          导出工单数据
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button
          key="cancel"
          onClick={onCancel}
          style={{
            height: '40px',
            borderRadius: '6px',
          }}
        >
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={exportLoading}
          onClick={handleExport}
          style={{
            height: '40px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            color: '#ffffff',
            fontWeight: '500',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          导出
        </Button>,
      ]}
      destroyOnHidden
      styles={{
        header: {
          borderBottom: '1px solid #f0f0f0',
          padding: '16px 24px',
          position: 'relative',
        },
        body: { padding: '24px' },
      }}
      width={480}
    >
      <Form layout="vertical">
        <Form.Item
          label={<span style={{ fontWeight: 500 }}>导出格式</span>}
        >
          <Select
            value={exportFormat}
            onChange={setExportFormat}
            style={{ width: '100%' }}
          >
            <Option value="csv">
              <Space>
                <FileTextOutlined />
                CSV 格式（适合Excel打开）
              </Space>
            </Option>
            <Option value="json">
              <Space>
                <BranchesOutlined />
                JSON 格式（适合程序处理）
              </Space>
            </Option>
            <Option value="xlsx">
              <Space>
                <TableOutlined />
                Excel 格式（.xlsx）
              </Space>
            </Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={<span style={{ fontWeight: 500 }}>导出范围</span>}
        >
          <Select
            value={exportScope}
            onChange={setExportScope}
            style={{ width: '100%' }}
          >
            <Option value="selected">选中工单 ({selectedCount} 个)</Option>
            <Option value="currentPage">当前页 ({currentPageCount} 个)</Option>
            <Option value="all">全部工单 ({totalCount} 个)</Option>
          </Select>
        </Form.Item>

        <div
          style={{
            background: '#f6f7ff',
            border: '1px solid #e8eaff',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#666',
            fontSize: '13px',
          }}
        >
          将导出工单的所有字段，包括基础信息和自定义字段
        </div>
      </Form>
    </Modal>
  );
};

export default React.memo(TicketExportModal);
