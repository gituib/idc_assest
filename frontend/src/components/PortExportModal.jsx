import React, { useState } from 'react';
import { Modal, Form, Select, Button, Typography, Alert } from 'antd';
import { ExportOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { designTokens } from '../config/theme';

const { Option } = Select;
const { Text } = Typography;

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '18px',
  fontWeight: 600,
};

const PortExportModal = ({
  visible,
  filters,
  totalCount,
  currentPageCount,
  selectedCount,
  onExport,
  onCancel,
}) => {
  const [exportScope, setExportScope] = useState('filtered');
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await onExport({
        scope: exportScope,
        format: exportFormat,
      });
      onCancel();
    } finally {
      setExportLoading(false);
    }
  };

  const getScopeLabel = () => {
    switch (exportScope) {
      case 'selected':
        return `已选端口 (${selectedCount} 个)`;
      case 'currentPage':
        return `当前页 (${currentPageCount} 个)`;
      case 'filtered':
        return `筛选结果 (${totalCount} 个)`;
      default:
        return '';
    }
  };

  const getActiveFilterInfo = () => {
    const activeFilters = [];
    if (filters.deviceId) activeFilters.push(`设备ID: ${filters.deviceId}`);
    if (filters.status && filters.status !== 'all') activeFilters.push(`状态: ${filters.status}`);
    if (filters.portType && filters.portType !== 'all') activeFilters.push(`类型: ${filters.portType}`);
    if (filters.portSpeed && filters.portSpeed !== 'all') activeFilters.push(`速率: ${filters.portSpeed}`);
    if (filters.searchText) activeFilters.push(`搜索: ${filters.searchText}`);
    return activeFilters;
  };

  const activeFilters = getActiveFilterInfo();

  return (
    <Modal
      title={
        <div style={{ ...modalHeaderStyle, paddingRight: '32px' }}>
          <ExportOutlined style={{ color: '#fa8c16' }} />
          导出端口数据
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
            borderRadius: designTokens.borderRadius.sm,
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
            borderRadius: designTokens.borderRadius.sm,
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
        <Form.Item label="导出范围">
          <Select value={exportScope} onChange={setExportScope} style={{ width: '100%' }}>
            <Option value="filtered">{getScopeLabel()}</Option>
            <Option value="currentPage">当前页 ({currentPageCount} 个)</Option>
            <Option value="all">全部端口</Option>
          </Select>
        </Form.Item>

        <Form.Item label="导出格式">
          <Select value={exportFormat} onChange={setExportFormat} style={{ width: '100%' }}>
            <Option value="xlsx">Excel 格式 (.xlsx)</Option>
            <Option value="csv">CSV 格式 (.csv)</Option>
          </Select>
        </Form.Item>

        {activeFilters.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              当前筛选条件：
            </Text>
            <div style={{ marginTop: '4px' }}>
              {activeFilters.map((filter, index) => (
                <span key={index} style={{
                  display: 'inline-block',
                  background: designTokens.colors.neutral[100],
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginRight: '4px',
                  marginBottom: '4px',
                }}>
                  {filter}
                </span>
              ))}
            </div>
          </div>
        )}

        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message={
            <div>
              <Text style={{ fontSize: '13px' }}>
                导出将包含以下字段：端口ID、设备ID、设备名称、设备类型、机房、机架、网卡名称、端口名称、端口类型、端口速率、状态、VLAN ID、描述、创建时间
              </Text>
            </div>
          }
          style={{ marginTop: '12px' }}
        />

        {totalCount > 50000 && (
          <Alert
            type="warning"
            message={
              <Text style={{ fontSize: '13px' }}>
                当前数据量较大（{totalCount} 条），导出可能需要较长时间。系统最大支持导出 50000 条数据。
              </Text>
            }
            style={{ marginTop: '12px' }}
          />
        )}
      </Form>
    </Modal>
  );
};

export default React.memo(PortExportModal);