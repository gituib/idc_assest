import React, { useState, useCallback } from 'react';
import { Modal, Form, Input, InputNumber, Select, message, Space, Tooltip } from 'antd';
import { PlusOutlined, InfoCircleOutlined, CloudServerOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

const designTokens = {
  colors: {
    primary: {
      main: '#667eea',
    },
  },
  borderRadius: {
    medium: '10px',
  },
};

function NetworkCardCreateModal({ device, visible, onClose, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await axios.post('/api/network-cards', {
        deviceId: device.deviceId,
        name: values.name,
        slotNumber: values.slotNumber,
        description: values.description,
        model: values.model,
        manufacturer: values.manufacturer,
        status: values.status,
      });

      message.success('网卡创建成功');
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (error) {
      if (error.errorFields) {
        return;
      }
      message.error(error.response?.data?.error || '网卡创建失败');
      console.error('创建网卡失败:', error);
    } finally {
      setLoading(false);
    }
  }, [device, form, onClose, onSuccess]);

  const handleCancel = useCallback(() => {
    form.resetFields();
    onClose();
  }, [form, onClose]);

  return (
    <Modal
      title={
        <Space>
          <CloudServerOutlined style={{ color: designTokens.colors.primary.main }} />
          <span>新增网卡 - {device?.name || '设备'}</span>
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="创建"
      cancelText="取消"
      width={480}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: 'normal',
        }}
      >
        <Form.Item
          name="name"
          label={
            <Space>
              网卡名称
              <Tooltip title="如: 网卡1、eth0、Primary NIC、LAN1">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }
          rules={[
            { required: true, message: '请输入网卡名称' },
            { max: 50, message: '名称不能超过50个字符' },
          ]}
        >
          <Input placeholder="例如: 网卡1、eth0、LAN1" />
        </Form.Item>

        <Space style={{ display: 'flex', width: '100%' }}>
          <Form.Item name="slotNumber" label="插槽编号" style={{ flex: 1 }}>
            <InputNumber placeholder="可选" min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
            style={{ flex: 1 }}
          >
            <Select placeholder="请选择">
              <Option value="normal">正常</Option>
              <Option value="warning">警告</Option>
              <Option value="fault">故障</Option>
              <Option value="offline">离线</Option>
            </Select>
          </Form.Item>
        </Space>

        <Space style={{ display: 'flex', width: '100%' }}>
          <Form.Item name="manufacturer" label="制造商" style={{ flex: 1 }}>
            <Input placeholder="如: Intel、Realtek、Broadcom" />
          </Form.Item>

          <Form.Item name="model" label="型号" style={{ flex: 1 }}>
            <Input placeholder="如: X520-DA2" />
          </Form.Item>
        </Space>

        <Form.Item name="description" label="描述">
          <TextArea rows={2} placeholder="请输入描述信息（可选）" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default React.memo(NetworkCardCreateModal);
