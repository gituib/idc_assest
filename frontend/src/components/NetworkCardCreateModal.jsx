import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tooltip,
  Card,
  Alert,
  AutoComplete,
} from 'antd';
import {
  CloudServerOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { designTokens } from '../config/theme';
import CloseButton from './CloseButton';

const { TextArea } = Input;

const SLOT_TYPES = [
  { value: 'LOM', label: '板载网卡 (LOM)', description: '主板集成网卡，编号0' },
  { value: 'OCP', label: 'OCP 网卡', description: '开放式计算项目网卡槽位' },
  { value: '1', label: '插槽 1', description: 'PCIe x16/x8 插槽' },
  { value: '2', label: '插槽 2', description: 'PCIe x8 插槽' },
  { value: '3', label: '插槽 3', description: 'PCIe x4 插槽（需 Riser 卡）' },
  { value: '4', label: '插槽 4', description: 'PCIe x4 插槽（需 Riser 卡）' },
];

const MANUFACTURER_OPTIONS = [
  { value: 'Intel', label: 'Intel' },
  { value: 'Broadcom', label: 'Broadcom' },
  { value: 'Mellanox', label: 'Mellanox (NVIDIA)' },
  { value: 'Realtek', label: 'Realtek' },
  { value: 'Cisco', label: 'Cisco' },
  { value: 'HP', label: 'HP/HPE' },
  { value: 'Dell', label: 'Dell' },
  { value: 'Qlogic', label: 'Qlogic' },
  { value: 'Marvell', label: 'Marvell' },
  { value: 'Other', label: '其他' },
];

function NetworkCardCreateModal({ device, visible, onClose, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

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
      closeIcon={<CloseButton />}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="创建"
      cancelText="取消"
      width={800}
      styles={{ body: { padding: '0 24px 24px' } }}
    >
      <div
        style={{
          margin: '0 -24px 20px',
          padding: '16px 24px',
          background: `linear-gradient(135deg, ${designTokens.colors.primary.main}18 0%, ${designTokens.colors.primary.light}18 100%)`,
          borderBottom: `1px solid ${designTokens.colors.primary.light}30`,
        }}
      >
        <div style={{ fontSize: '13px', color: designTokens.colors.neutral[700], lineHeight: 1.6 }}>
          为服务器添加新的网卡，网卡创建后可关联端口
        </div>
      </div>

      <Alert
        message={
          <div>
            <strong>插槽编号参考</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '18px', lineHeight: 1.8 }}>
              <li>
                <strong>LOM (LAN on Motherboard)</strong>：主板集成网卡，编号通常为 0
              </li>
              <li>
                <strong>OCP (Open Compute Project)</strong>：服务器前端维护网卡专用槽位
              </li>
              <li>
                <strong>PCIe 插槽</strong>：从 1 开始编号，对应服务器物理插槽位置
              </li>
            </ul>
          </div>
        }
        type="info"
        style={{
          marginBottom: 20,
          borderRadius: 10,
          background: designTokens.colors.info.bg,
          border: `1px solid ${designTokens.colors.info.light}40`,
        }}
      />

      <Form form={form} layout="vertical">
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <Card
            size="small"
            title={
              <Space>
                <ThunderboltOutlined style={{ color: designTokens.colors.primary.main }} />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>基础信息</span>
              </Space>
            }
            style={{
              flex: 1,
              borderRadius: 12,
              border: `1px solid ${designTokens.colors.neutral[200]}`,
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <Form.Item
              name="name"
              label={
                <span style={{ fontWeight: 500 }}>
                  网卡名称 <span style={{ color: '#ff4d4f' }}>*</span>
                </span>
              }
              rules={[
                { required: true, message: '请输入网卡名称' },
                { max: 50, message: '名称不能超过50个字符' },
              ]}
            >
              <Input placeholder="例如: 网卡1、eth0、LAN1" size="large" />
            </Form.Item>

            <Form.Item
              name="slotNumber"
              label={
                <Space>
                  <span style={{ fontWeight: 500 }}>插槽位置</span>
                  <Tooltip title="参考上方提示选择或输入插槽位置">
                    <InfoCircleOutlined
                      style={{ color: designTokens.colors.neutral[400], cursor: 'help' }}
                    />
                  </Tooltip>
                </Space>
              }
            >
              <AutoComplete
                placeholder="选择或输入插槽位置"
                allowClear
                size="large"
                options={SLOT_TYPES.map(slot => ({
                  value: slot.value,
                  label: (
                    <div>
                      <div style={{ fontWeight: 500 }}>{slot.label}</div>
                      <div style={{ fontSize: '12px', color: designTokens.colors.neutral[500] }}>
                        {slot.description}
                      </div>
                    </div>
                  ),
                }))}
                filterOption={(input, option) =>
                  option.value.toLowerCase().includes(input.toLowerCase()) ||
                  option.label.props.children[0].props.children
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Card>

          <Card
            size="small"
            title={
              <Space>
                <InfoCircleOutlined style={{ color: designTokens.colors.success.main }} />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>规格信息</span>
              </Space>
            }
            style={{
              flex: 1,
              borderRadius: 12,
              border: `1px solid ${designTokens.colors.neutral[200]}`,
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              <Form.Item
                name="manufacturer"
                label={<span style={{ fontWeight: 500 }}>制造商</span>}
              >
                <AutoComplete
                  placeholder="选择或输入"
                  options={MANUFACTURER_OPTIONS.map(m => ({ value: m.value, label: m.label }))}
                  filterOption={(input, option) =>
                    option.label.toLowerCase().includes(input.toLowerCase())
                  }
                  size="large"
                />
              </Form.Item>

              <Form.Item name="model" label={<span style={{ fontWeight: 500 }}>型号</span>}>
                <Input placeholder="例如: X520-DA2" size="large" />
              </Form.Item>
            </div>
          </Card>
        </div>

        <Card
          size="small"
          title={
            <Space>
              <InfoCircleOutlined style={{ color: designTokens.colors.secondary.main }} />
              <span style={{ fontWeight: 600, fontSize: '14px' }}>附加信息</span>
            </Space>
          }
          style={{
            borderRadius: 12,
            border: `1px solid ${designTokens.colors.neutral[200]}`,
          }}
          styles={{ body: { padding: '16px 20px' } }}
        >
          <Form.Item name="description" label={<span style={{ fontWeight: 500 }}>描述</span>}>
            <TextArea rows={3} placeholder="请输入描述信息（可选）" />
          </Form.Item>
        </Card>
      </Form>
    </Modal>
  );
}

export default React.memo(NetworkCardCreateModal);
