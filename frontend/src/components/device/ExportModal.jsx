import React, { useState, useMemo } from 'react';
import { Modal, Form, Select, Checkbox, Button, message } from 'antd';
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

const ExportModal = ({
  visible,
  deviceFields,
  selectedDevices,
  currentPageDevices,
  allDevices,
  onExport,
  onCancel,
}) => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportScope, setExportScope] = useState('selected');
  const [exportFields, setExportFields] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  const visibleFields = useMemo(() => {
    return deviceFields.filter((f) => f.visible && f.fieldName !== 'rackId');
  }, [deviceFields]);

  React.useEffect(() => {
    if (visible) {
      setExportFields(visibleFields.map((f) => f.fieldName));
    }
  }, [visible, visibleFields]);

  const handleExport = async () => {
    if (exportFields.length === 0) {
      message.warning('请至少选择一个导出字段');
      return;
    }

    setExportLoading(true);
    try {
      await onExport({
        format: exportFormat,
        scope: exportScope,
        fields: exportFields,
      });
      onCancel();
    } finally {
      setExportLoading(false);
    }
  };

  const getScopeLabel = () => {
    switch (exportScope) {
      case 'selected':
        return `选择的行 (${selectedDevices.length} 个)`;
      case 'currentPage':
        return `当前页 (${currentPageDevices.length} 个)`;
      case 'all':
        return `全部设备 (${allDevices.length} 个)`;
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
      width={600}
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
            <Option value="selected">{getScopeLabel()}</Option>
            <Option value="currentPage">当前页 ({currentPageDevices.length} 个)</Option>
            <Option value="all">全部设备 ({allDevices.length} 个)</Option>
          </Select>
        </Form.Item>
        <Form.Item label="选择导出字段">
          <div
            style={{
              maxHeight: '300px',
              overflow: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            {visibleFields.map((field) => (
              <div key={field.fieldName} style={{ marginBottom: '8px' }}>
                <Checkbox
                  checked={exportFields.includes(field.fieldName)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setExportFields([...exportFields, field.fieldName]);
                    } else {
                      setExportFields(exportFields.filter((f) => f !== field.fieldName));
                    }
                  }}
                >
                  {field.displayName}
                </Checkbox>
              </div>
            ))}
          </div>
        </Form.Item>
        <div style={{ color: '#666', fontSize: '13px' }}>
          已选择{' '}
          <span style={{ color: '#1890ff', fontWeight: 600 }}>{selectedDevices.length}</span> 个设备，
          将导出{' '}
          <span style={{ color: '#52c41a', fontWeight: 600 }}>{exportFields.length}</span> 个字段
        </div>
      </Form>
    </Modal>
  );
};

export default React.memo(ExportModal);
