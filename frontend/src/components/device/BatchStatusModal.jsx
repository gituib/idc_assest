import React from 'react';
import { Modal, Form, Select, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { designTokens } from '../../config/theme';

const { Option } = Select;

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '18px',
  fontWeight: 600,
};

const secondaryActionStyle = {
  height: '40px',
  borderRadius: designTokens.borderRadius.small,
  border: `1px solid ${designTokens.colors.border.light}`,
  fontWeight: '500',
};

const BatchStatusModal = ({
  visible,
  selectedCount,
  loading,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values.status);
    } catch (error) {
      if (!error.errorFields) {
        console.error('批量状态变更失败:', error);
      }
    }
  };

  return (
    <Modal
      title={
        <div style={{ ...modalHeaderStyle, paddingRight: '32px' }}>
          <ReloadOutlined style={{ color: '#52c41a' }} />
          批量状态变更
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} style={secondaryActionStyle}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
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
          确定
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
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="status"
          label="选择新状态"
          rules={[{ required: true, message: '请选择设备状态' }]}
        >
          <Select placeholder="请选择设备状态" style={{ width: '100%' }}>
            <Option value="running">运行中</Option>
            <Option value="maintenance">维护中</Option>
            <Option value="offline">离线</Option>
            <Option value="fault">故障</Option>
          </Select>
        </Form.Item>
        <div style={{ color: '#666', fontSize: '13px' }}>
          已选择{' '}
          <span style={{ color: '#1890ff', fontWeight: 600 }}>{selectedCount}</span> 个设备
        </div>
      </Form>
    </Modal>
  );
};

export default React.memo(BatchStatusModal);
