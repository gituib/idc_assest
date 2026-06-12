import React, { useState } from 'react';
import { Modal, Form, Select, Button } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { designTokens } from '../../config/theme';

const { Option } = Select;

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '18px',
  fontWeight: 600,
};

/**
 * 设备导出模态框
 * @param {boolean} visible - 是否显示
 * @param {number} selectedCount - 已选择的设备数量
 * @param {number} currentPageCount - 当前页设备数量
 * @param {number} totalCount - 符合筛选条件的设备总数
 * @param {Function} onExport - 导出回调
 * @param {Function} onCancel - 取消回调
 */
const ExportModal = ({
  visible,
  selectedCount,
  currentPageCount,
  totalCount,
  onExport,
  onCancel,
}) => {
  const hasSelection = selectedCount > 0;
  const [exportFormat, setExportFormat] = useState('csv');
  // 有选中设备时默认导出选中行，否则默认导出全部
  const [exportScope, setExportScope] = useState(hasSelection ? 'selected' : 'all');
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await onExport({
        format: exportFormat,
        scope: exportScope,
      });
      onCancel();
    } finally {
      setExportLoading(false);
    }
  };

  const getScopeLabel = () => {
    switch (exportScope) {
      case 'selected':
        return `选择的行 (${selectedCount} 个)`;
      case 'currentPage':
        return `当前页 (${currentPageCount} 个)`;
      case 'all':
        return `全部设备 (${totalCount} 个)`;
      default:
        return '';
    }
  };

  return (
    <Modal
      title={
        <div style={{ ...modalHeaderStyle, paddingRight: '32px' }}>
          <ExportOutlined style={{ color: '#fa8c16' }} />
          导出设备数据
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
            borderRadius: designTokens.borderRadius.small,
            border: `1px solid ${designTokens.colors.border.light}`,
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
      width={500}
    >
      <Form layout="vertical">
        <Form.Item label="导出格式">
          <Select value={exportFormat} onChange={setExportFormat} style={{ width: '100%' }}>
            <Option value="csv">CSV 格式</Option>
            <Option value="json">JSON 格式</Option>
          </Select>
        </Form.Item>
        <Form.Item label="导出范围">
          <Select value={exportScope} onChange={setExportScope} style={{ width: '100%' }}>
            {hasSelection && (
              <Option value="selected">{getScopeLabel()}</Option>
            )}
            <Option value="currentPage">当前页 ({currentPageCount} 个)</Option>
            <Option value="all">全部设备 ({totalCount} 个)</Option>
          </Select>
        </Form.Item>
        <div style={{ color: '#666', fontSize: '13px' }}>
          将导出设备的所有字段（包括自定义字段）
        </div>
      </Form>
    </Modal>
  );
};

export default React.memo(ExportModal);
