import React from 'react';
import { Modal, Form, Switch, Button, Space, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { designTokens } from '../../config/theme';

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

const FieldConfigModal = ({
  visible,
  deviceFields,
  defaultDeviceFields,
  onSave,
  onReset,
  onCancel,
}) => {
  const [form] = Form.useForm();

  const getInitialValues = () => {
    return deviceFields.reduce(
      (acc, field) => ({
        ...acc,
        [`visible_${field.fieldName}`]: field.visible,
        [`required_${field.fieldName}`]: field.required,
      }),
      {}
    );
  };

  const handleSubmit = async (values) => {
    const updatedFields = deviceFields.map((field) => ({
      fieldId: field.fieldId,
      fieldName: field.fieldName,
      displayName: field.displayName,
      visible: values[`visible_${field.fieldName}`] ?? field.visible,
      required: values[`required_${field.fieldName}`] ?? field.required,
    }));

    await onSave(updatedFields);
  };

  const handleReset = () => {
    onReset(defaultDeviceFields);
    message.success('字段配置已重置为默认值');
  };

  const filteredFields = deviceFields.filter((field) => field.fieldName !== 'deviceId');

  return (
    <Modal
      title={
        <div style={{ ...modalHeaderStyle, paddingRight: '32px' }}>
          <SettingOutlined style={{ color: '#667eea' }} />
          字段配置
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      styles={{
        header: {
          borderBottom: '1px solid #f0f0f0',
          padding: '16px 24px',
          position: 'relative',
        },
        body: { padding: '24px' },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={getInitialValues()}
      >
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <th style={{ padding: '8px', textAlign: 'left', width: '40%' }}>字段名称</th>
                <th style={{ padding: '8px', textAlign: 'center', width: '30%' }}>可见</th>
                <th style={{ padding: '8px', textAlign: 'center', width: '30%' }}>必填</th>
              </tr>
            </thead>
            <tbody>
              {filteredFields.map((field) => (
                <tr key={field.fieldName} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px' }}>{field.displayName}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <Form.Item name={`visible_${field.fieldName}`} valuePropName="checked" noStyle>
                      <Switch size="small" />
                    </Form.Item>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <Form.Item name={`required_${field.fieldName}`} valuePropName="checked" noStyle>
                      <Switch size="small" />
                    </Form.Item>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Form.Item style={{ textAlign: 'right', marginTop: '20px' }}>
          <Space>
            <Button onClick={onCancel} style={secondaryActionStyle}>
              取消
            </Button>
            <Button onClick={handleReset} style={secondaryActionStyle}>
              重置默认
            </Button>
            <Button
              type="primary"
              htmlType="submit"
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
              保存
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default React.memo(FieldConfigModal);
