import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Form, Select, Input, Button, message, Space, Spin } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

const CableCreateModal = ({ visible, onClose, onSuccess, sourceDevice }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [sourcePorts, setSourcePorts] = useState([]);
  const [targetPorts, setTargetPorts] = useState([]);
  const [fetchingDevices, setFetchingDevices] = useState(false);
  const prevVisibleRef = useRef(false);

  // Initialize when visible changes from false to true
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      form.resetFields();
      if (sourceDevice) {
        form.setFieldsValue({
          sourceDeviceId: sourceDevice.deviceId || sourceDevice.id,
        });
        fetchDevicePorts(sourceDevice.deviceId || sourceDevice.id, 'source');
      }
      fetchDevices();
    }
    prevVisibleRef.current = visible;
  }, [visible, sourceDevice, form]);

  const fetchDevices = async () => {
    try {
      setFetchingDevices(true);
      const response = await axios.get('/api/devices', { params: { pageSize: 1000 } });
      setDevices(response.data.devices || []);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      message.error('获取设备列表失败');
    } finally {
      setFetchingDevices(false);
    }
  };

  const fetchDevicePorts = async (deviceId, type) => {
    if (!deviceId) {
      if (type === 'source') setSourcePorts([]);
      else setTargetPorts([]);
      return;
    }

    try {
      const response = await axios.get(`/api/device-ports/device/${deviceId}`);
      const ports = response.data || [];
      if (type === 'source') {
        setSourcePorts(ports);
      } else {
        setTargetPorts(ports);
      }
    } catch (error) {
      console.error(`Failed to fetch ${type} ports:`, error);
      message.error('获取端口列表失败');
    }
  };

  const handleSourceDeviceChange = deviceId => {
    form.setFieldsValue({ sourcePort: undefined });
    fetchDevicePorts(deviceId, 'source');
  };

  const handleTargetDeviceChange = deviceId => {
    form.setFieldsValue({ targetPort: undefined });
    fetchDevicePorts(deviceId, 'target');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Logic to ensure Switch is always Source if possible (for Cable Management view consistency)
      const sourceDev = devices.find(d => d.deviceId === values.sourceDeviceId);
      const targetDev = devices.find(d => d.deviceId === values.targetDeviceId);

      let payload = { ...values };

      // If Source is NOT Switch AND Target IS Switch, swap them
      if (sourceDev && targetDev && sourceDev.type !== 'switch' && targetDev.type === 'switch') {
        payload = {
          ...values,
          sourceDeviceId: values.targetDeviceId,
          sourcePort: values.targetPort,
          targetDeviceId: values.sourceDeviceId,
          targetPort: values.sourcePort,
        };
        console.log('Swapped source/target to ensure Switch is Source');
      }

      await axios.post('/api/cables', payload);

      message.success('接线创建成功');
      onSuccess?.();
      onClose();
    } catch (error) {
      if (error.errorFields) return;
      console.error('Failed to create cable:', error);
      message.error('接线创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined style={{ color: '#1890ff' }} />
          <span>新增接线</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      maskClosable={false}
    >
      <Form form={form} layout="vertical">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Source Side */}
          <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
            <div style={{ marginBottom: 12, fontWeight: 500, color: '#666' }}>源设备 (起点)</div>
            <Form.Item
              name="sourceDeviceId"
              label="设备"
              rules={[{ required: true, message: '请选择源设备' }]}
            >
              <Select
                placeholder="选择源设备"
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
                onChange={handleSourceDeviceChange}
                loading={fetchingDevices}
                disabled={!!sourceDevice} // Lock source device if provided
              >
                {devices.map(d => (
                  <Option key={d.deviceId} value={d.deviceId}>
                    {d.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="sourcePort"
              label="端口"
              rules={[{ required: true, message: '请选择源端口' }]}
            >
              <Select placeholder="选择源端口" showSearch>
                {sourcePorts.map(p => (
                  <Option key={p.portId} value={p.portName}>
                    {p.portName} ({p.portType})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {/* Target Side */}
          <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
            <div style={{ marginBottom: 12, fontWeight: 500, color: '#666' }}>目标设备 (终点)</div>
            <Form.Item
              name="targetDeviceId"
              label="设备"
              rules={[{ required: true, message: '请选择目标设备' }]}
            >
              <Select
                placeholder="选择目标设备"
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
                onChange={handleTargetDeviceChange}
                loading={fetchingDevices}
              >
                {devices
                  .filter(d => d.deviceId !== form.getFieldValue('sourceDeviceId'))
                  .map(d => (
                    <Option key={d.deviceId} value={d.deviceId}>
                      {d.name}
                    </Option>
                  ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="targetPort"
              label="端口"
              rules={[{ required: true, message: '请选择目标端口' }]}
            >
              <Select
                placeholder="选择目标端口"
                showSearch
                disabled={!form.getFieldValue('targetDeviceId')}
              >
                {targetPorts.map(p => (
                  <Option key={p.portId} value={p.portName}>
                    {p.portName} ({p.portType})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item
              name="cableType"
              label="线缆类型"
              initialValue="ethernet"
              rules={[{ required: true }]}
            >
              <Select>
                <Option value="ethernet">网线</Option>
                <Option value="fiber">光纤</Option>
                <Option value="copper">铜缆</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="status"
              label="状态"
              initialValue="normal"
              rules={[{ required: true }]}
            >
              <Select>
                <Option value="normal">正常</Option>
                <Option value="fault">故障</Option>
                <Option value="disconnected">未连接</Option>
              </Select>
            </Form.Item>
            <Form.Item name="cableLength" label="长度 (米)">
              <Input type="number" min={0} />
            </Form.Item>
          </div>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default CableCreateModal;
