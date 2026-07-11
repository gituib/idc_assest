import React from 'react';
import { Modal, Form, DatePicker, Button, Card, Divider } from 'antd';
import { SafetyCertificateOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { designTokens } from '../../config/theme';

/**
 * 批量更新维保信息弹窗
 * 选中多台设备后统一设置维保到期日期
 * @param {Object} props
 * @param {boolean} props.visible - 弹窗可见性
 * @param {number} props.selectedCount - 已选择设备数量
 * @param {boolean} props.loading - 提交加载状态
 * @param {Function} props.onSubmit - 提交回调 (values) => void
 * @param {Function} props.onCancel - 取消回调
 */
const BatchWarrantyModal = ({ visible, selectedCount, loading, onSubmit, onCancel }) => {
  const [form] = Form.useForm();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
    } catch (error) {
      if (!error.errorFields) {
        console.error('批量更新维保失败:', error);
      }
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // 企业级仪表盘风格 - 基于设计系统优化
  const modalHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '18px',
    fontWeight: 600,
    color: designTokens.colors.text.primary,
    letterSpacing: '-0.02em',
  };

  const iconWrapperStyle = {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: designTokens.colors.purple.bg || 'rgba(124, 58, 237, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const secondaryActionStyle = {
    height: '42px',
    borderRadius: '8px',
    border: `1px solid ${designTokens.colors.border.medium}`,
    fontWeight: 500,
    fontSize: '14px',
    transition: `all ${designTokens.transitions.fast}`,
  };

  const primaryActionStyle = {
    height: '42px',
    borderRadius: '8px',
    background: `linear-gradient(135deg, ${designTokens.colors.purple.main} 0%, ${designTokens.colors.purple.dark} 100%)`,
    border: 'none',
    color: '#ffffff',
    boxShadow: `0 4px 12px rgba(124, 58, 237, 0.35)`,
    fontWeight: 500,
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all ${designTokens.transitions.fast}`,
    padding: '0 24px',
  };

  const infoCardStyle = {
    background: 'rgba(124, 58, 237, 0.04)',
    border: `1px solid rgba(124, 58, 237, 0.12)`,
    borderRadius: '8px',
    padding: '12px 16px',
    marginTop: '8px',
  };

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={handleCancel}
      width={480}
      footer={null}
      destroyOnHidden
      styles={{
        header: {
          padding: 0,
          border: 'none',
        },
        body: {
          padding: '20px 24px 24px 24px',
        },
      }}
    >
      {/* 标题区 */}
      <div style={{ marginBottom: '20px' }}>
        <div style={modalHeaderStyle}>
          <div style={iconWrapperStyle}>
            <SafetyCertificateOutlined style={{ color: designTokens.colors.purple.main, fontSize: '18px' }} />
          </div>
          批量更新维保信息
        </div>
      </div>

      <Divider style={{ margin: '0 0 20px 0' }} />

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        size="large"
      >
        <Form.Item
          name="purchaseDate"
          label={
            <span style={{ color: designTokens.colors.text.primary, fontWeight: 500 }}>
              采购日期
              <span style={{ color: designTokens.colors.text.tertiary, fontWeight: 400, marginLeft: 4 }}>
                (选填)
              </span>
            </span>
          }
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
        >
          <DatePicker
            style={{
              width: '100%',
              height: '40px',
              borderRadius: '6px',
            }}
            placeholder="选择采购日期"
          />
        </Form.Item>

        <Form.Item
          name="warrantyExpiry"
          label={
            <span style={{ color: designTokens.colors.text.primary, fontWeight: 500 }}>
              维保到期日期
              <span style={{ color: designTokens.colors.error.main, marginLeft: 4 }}>*</span>
            </span>
          }
          rules={[{ required: true, message: '请选择维保到期日期' }]}
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
        >
          <DatePicker
            style={{
              width: '100%',
              height: '40px',
              borderRadius: '6px',
            }}
            placeholder="选择维保到期日期"
          />
        </Form.Item>

        {/* 信息提示卡片 */}
        <Card
          size="small"
          style={infoCardStyle}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <InfoCircleOutlined
              style={{
                color: designTokens.colors.purple.main,
                marginTop: '2px',
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  color: designTokens.colors.text.primary,
                  fontSize: '13px',
                  fontWeight: 500,
                  marginBottom: '2px',
                }}
              >
                已选择 {selectedCount} 台设备
              </div>
              <div
                style={{
                  color: designTokens.colors.text.secondary,
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
              >
                所有选中设备将统一设置为相同的维保到期日期，该操作不可逆，请确认后提交
              </div>
            </div>
          </div>
        </Card>
      </Form>

      {/* 底部操作按钮 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: `1px solid ${designTokens.colors.border.light}`,
        }}
      >
        <Button onClick={handleCancel} style={secondaryActionStyle}>
          取消
        </Button>
        <Button
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          style={primaryActionStyle}
        >
          确定更新
        </Button>
      </div>
    </Modal>
  );
};

export default React.memo(BatchWarrantyModal);