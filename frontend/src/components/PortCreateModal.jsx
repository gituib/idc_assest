import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Space,
  Button,
  Tooltip,
  Alert,
  Tag,
} from 'antd';
import { PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

const designTokens = {
  colors: {
    primary: {
      main: '#667eea',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
  },
  borderRadius: {
    medium: '10px',
  },
};

function parsePortRange(portName) {
  if (!portName || typeof portName !== 'string') {
    return null;
  }

  const trimmed = portName.trim();

  if (!trimmed.includes('-')) {
    return null;
  }

  const [startPart, endPart] = trimmed.split('-').map(s => s.trim());

  if (!startPart || !endPart) {
    return null;
  }

  const startNumMatch = startPart.match(/(\d+)$/);
  const endNumMatch = endPart.match(/(\d+)$/);

  if (!startNumMatch || !endNumMatch) {
    return null;
  }

  const startNum = parseInt(startNumMatch[1], 10);
  const endNum = parseInt(endNumMatch[1], 10);

  if (startNum >= endNum || endNum - startNum > 1000) {
    return null;
  }

  const prefix = startPart.replace(startNumMatch[0], '');
  const portCount = endNum - startNum + 1;

  const ports = [];
  for (let i = 0; i < portCount; i++) {
    const num = startNum + i;
    ports.push(`${prefix}${num}`);
  }

  return {
    isRange: true,
    prefix,
    startNum,
    endNum,
    portCount,
    ports,
  };
}

function generatePortNames(portName) {
  const result = parsePortRange(portName);

  if (result && result.isRange) {
    return result.ports;
  }

  return [portName];
}

function PortCreateModal({ device, visible, onClose, onSuccess, defaultNicId, networkCards = [] }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewPorts, setPreviewPorts] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [nicList, setNicList] = useState([]);
  const prevVisibleRef = React.useRef(false);

  useEffect(() => {
    // 只有当 visible 从 false 变为 true 时才执行初始化
    if (visible && !prevVisibleRef.current) {
      setPreviewPorts([]);
      setShowPreview(false);
      form.resetFields();

      if (defaultNicId) {
        form.setFieldsValue({ nicId: defaultNicId });
      }

      if (device?.deviceId && (!networkCards || networkCards.length === 0)) {
        fetchNetworkCards();
      } else if (networkCards && networkCards.length > 0) {
        setNicList(networkCards);
      }
    }
    prevVisibleRef.current = visible;
  }, [visible, device, defaultNicId, networkCards, form]);

  const fetchNetworkCards = async () => {
    try {
      const response = await axios.get(`/api/network-cards/device/${device.deviceId}`);
      setNicList(response.data || []);
    } catch (error) {
      console.error('获取网卡列表失败:', error);
      setNicList([]);
    }
  };

  const handlePortNameChange = useCallback(e => {
    const value = e.target.value;
    const ports = generatePortNames(value);

    if (ports.length > 1) {
      setPreviewPorts(ports.slice(0, 20));
      setShowPreview(true);
    } else {
      setPreviewPorts([]);
      setShowPreview(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const portNames = generatePortNames(values.portName);

      if (portNames.length === 1) {
        await axios.post('/api/device-ports', {
          deviceId: device.deviceId,
          nicId: values.nicId || null,
          portName: portNames[0],
          portType: values.portType,
          portSpeed: values.portSpeed,
          vlanId: values.vlanId,
          status: values.status,
          description: values.description,
        });
        message.success('端口创建成功');
      } else {
        const portsData = portNames.map((portName, index) => ({
          portId: `PORT-${Date.now()}-${index}`,
          deviceId: device.deviceId,
          nicId: values.nicId || null,
          portName,
          portType: values.portType,
          portSpeed: values.portSpeed,
          vlanId: values.vlanId,
          status: values.status,
          description: values.description,
        }));

        await axios.post('/api/device-ports/batch', { ports: portsData });
        message.success(`成功创建 ${portNames.length} 个端口`);
      }

      form.resetFields();
      setPreviewPorts([]);
      setShowPreview(false);
      onSuccess?.();
      onClose();
    } catch (error) {
      if (error.errorFields) {
        return;
      }
      message.error(error.response?.data?.error || '端口创建失败');
      console.error('创建端口失败:', error);
    } finally {
      setLoading(false);
    }
  }, [device, form, onClose, onSuccess]);

  const handleCancel = useCallback(() => {
    form.resetFields();
    setPreviewPorts([]);
    setShowPreview(false);
    onClose();
  }, [form, onClose]);

  const portCount = previewPorts.length || (form.getFieldValue('portName') && !showPreview ? 1 : 0);

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined style={{ color: designTokens.colors.primary.main }} />
          <span>新增端口 - {device?.name || '设备'}</span>
          {portCount > 1 && <Tag color="blue">{portCount} 个端口</Tag>}
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText={portCount > 1 ? `创建 ${portCount} 个端口` : '创建'}
      cancelText="取消"
      width={560}
      zIndex={1050}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          portType: 'RJ45',
          portSpeed: '1G',
          status: 'free',
        }}
      >
        <Form.Item name="deviceId" label="设备">
          <Input value={device?.name} disabled placeholder={device?.deviceId} />
        </Form.Item>

        <Form.Item
          name="nicId"
          label={
            <Space>
              所属网卡
              <Tooltip title="可选，不选择则端口不归属于任何网卡">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }
        >
          <Select
            placeholder="选择网卡（可选）"
            allowClear
            showSearch
            optionFilterProp="children"
            style={{ width: '100%' }}
          >
            {nicList.map(nic => (
              <Option key={nic.nicId} value={nic.nicId}>
                {nic.name}
                {nic.slotNumber && ` (插槽${nic.slotNumber})`}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="portName"
          label={
            <Space>
              端口名称
              <Tooltip
                title="支持单个端口（如 eth0/1）或端口范围（如 1/0/1-1/0/48）"
                mouseEnterDelay={0.5}
              >
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }
          rules={[
            { required: true, message: '请输入端口名称' },
            {
              pattern: /^[\w\/:\-]+$/,
              message: '端口名称格式不正确',
            },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const ports = generatePortNames(value);
                if (ports.length > 1000) {
                  return Promise.reject(new Error('单次最多创建1000个端口'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            placeholder="例如: eth0/1 或 1/0/1-1/0/48"
            onChange={e => {
              // 确保 Form 值更新
              form.setFieldValue('portName', e.target.value);
              handlePortNameChange(e);
            }}
          />
        </Form.Item>

        {showPreview && (
          <Alert
            message={`将创建 ${previewPorts.length} 个端口`}
            description={
              <div style={{ marginTop: 8 }}>
                <Space wrap size={4}>
                  {previewPorts.map((port, index) => (
                    <Tag key={index} color="blue">
                      {port}
                    </Tag>
                  ))}
                  {previewPorts.length <
                    parsePortRange(form.getFieldValue('portName'))?.portCount && (
                    <Tag color="default">...等</Tag>
                  )}
                </Space>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Space style={{ display: 'flex', width: '100%' }}>
          <Form.Item
            name="portType"
            label="端口类型"
            rules={[{ required: true, message: '请选择端口类型' }]}
            style={{ flex: 1 }}
          >
            <Select placeholder="请选择">
              <Option value="RJ45">RJ45</Option>
              <Option value="SFP">SFP</Option>
              <Option value="SFP+">SFP+</Option>
              <Option value="SFP28">SFP28</Option>
              <Option value="QSFP">QSFP</Option>
              <Option value="QSFP28">QSFP28</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="portSpeed"
            label="端口速率"
            rules={[{ required: true, message: '请选择端口速率' }]}
            style={{ flex: 1 }}
          >
            <Select placeholder="请选择">
              <Option value="100M">100M</Option>
              <Option value="1G">1G</Option>
              <Option value="10G">10G</Option>
              <Option value="25G">25G</Option>
              <Option value="40G">40G</Option>
              <Option value="100G">100G</Option>
            </Select>
          </Form.Item>
        </Space>

        <Space style={{ display: 'flex', width: '100%' }}>
          <Form.Item name="vlanId" label="VLAN ID" style={{ flex: 1 }}>
            <InputNumber placeholder="1-4094" min={1} max={4094} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
            style={{ flex: 1 }}
          >
            <Select placeholder="请选择">
              <Option value="free">空闲</Option>
              <Option value="occupied">占用</Option>
              <Option value="fault">故障</Option>
            </Select>
          </Form.Item>
        </Space>

        <Form.Item name="description" label="描述">
          <TextArea rows={2} placeholder="请输入描述信息（可选）" />
        </Form.Item>

        <div
          style={{
            background: '#f5f5f5',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#666',
          }}
        >
          <strong>格式说明：</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>
              单个端口：<code>eth0/1</code>、<code>gigabitethernet1/0/1</code>
            </li>
            <li>
              端口范围：<code>1/0/1-1/0/48</code>（创建 1/0/1 到 1/0/48 共48个端口）
            </li>
            <li>
              简单范围：<code>eth1-eth24</code>（创建 eth1 到 eth24 共24个端口）
            </li>
          </ul>
        </div>
      </Form>
    </Modal>
  );
}

export default React.memo(PortCreateModal);
