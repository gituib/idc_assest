import React, { useState } from 'react';
import {
  Modal,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Space,
  Tag,
  Card,
  Spin,
  Alert,
  Divider,
} from 'antd';
import {
  ThunderboltOutlined,
  RobotOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { getUserFromStorage } from '../utils/common';
import { parseQuickReport } from '../utils/quickReportParser';

const { TextArea } = Input;

const PRIORITY_OPTIONS = [
  { value: 'low', label: '低', color: 'green' },
  { value: 'medium', label: '中', color: 'orange' },
  { value: 'high', label: '高', color: 'red' },
  { value: 'critical', label: '紧急', color: 'magenta' },
];

const EXAMPLE = `SN: SN2024ABC001
机房B 7号机柜
服务器宕机了，无法启动，风扇狂转，很急`;

export default function QuickReportModal({ open, onClose, onCreated, categories = [] }) {
  const [form] = Form.useForm();
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [device, setDevice] = useState(null); // 已匹配到的设备
  const [candidates, setCandidates] = useState(null); // 多个候选
  const [manual, setManual] = useState(false); // 是否需要手动填设备
  const [submitting, setSubmitting] = useState(false);
  const [parsed, setParsed] = useState(false); // 是否已解析

  const reset = () => {
    setText('');
    setDevice(null);
    setCandidates(null);
    setManual(false);
    setParsed(false);
    form.resetFields();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleParse = async () => {
    if (!text.trim()) {
      message.warning('请先粘贴设备 SN 和故障信息');
      return;
    }
    setParsing(true);
    try {
      const parsedData = parseQuickReport(text, categories);
      form.setFieldsValue({
        faultCategory: parsedData.faultCategory || undefined,
        priority: parsedData.priority || 'medium',
        description: parsedData.description,
        title: '',
        serialNumber: parsedData.serialNumber || '',
      });

      // 根据 SN 反查设备
      if (parsedData.serialNumber) {
        setDeviceLoading(true);
        try {
          const res = await axios.get('/api/devices/all', {
            params: { keyword: parsedData.serialNumber },
          });
          const devices = res.data.devices || [];
          if (devices.length === 1) {
            setDevice(devices[0]);
            setCandidates(null);
            setManual(false);
          } else if (devices.length > 1) {
            setCandidates(devices);
            setDevice(null);
            setManual(false);
          } else {
            setDevice(null);
            setCandidates(null);
            setManual(true);
          }
        } catch (e) {
          setManual(true);
        } finally {
          setDeviceLoading(false);
        }
      } else {
        setDevice(null);
        setCandidates(null);
        setManual(true);
      }
      setParsed(true);
    } finally {
      setParsing(false);
    }
  };

  const handlePickCandidate = deviceId => {
    const picked = (candidates || []).find(d => d.deviceId === deviceId);
    if (picked) {
      setDevice(picked);
      setCandidates(null);
      setManual(false);
    }
  };

  const deviceLocation = d => {
    if (!d) return '未知位置';
    const parts = [d.Rack?.Room?.name, d.Rack?.name].filter(Boolean);
    return parts.length ? parts.join(' / ') : '未知位置';
  };

  const handleSubmit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch (e) {
      return;
    }

    const deviceName = device ? device.name : values.deviceName || '未知设备';
    const serialNumber = device ? device.serialNumber : values.serialNumber;

    if (!device && !values.deviceName) {
      message.error('未能自动匹配设备，请手动填写设备名称');
      return;
    }

    const ticketData = {
      deviceId: device ? device.deviceId : null,
      deviceName,
      serialNumber: serialNumber || '',
      faultCategory: values.faultCategory,
      faultSubCategory: '',
      priority: values.priority || 'medium',
      description: values.description || '',
      title: values.title || `${values.faultCategory} - ${deviceName}`,
      expectedCompletionDate: values.expectedCompletionDate
        ? values.expectedCompletionDate.format('YYYY-MM-DD HH:mm:ss')
        : null,
      reporterId: (getUserFromStorage() || {}).userId || 'USER001',
      reporterName: (getUserFromStorage() || {}).username || '系统用户',
      attachments: [],
      tags: [],
    };

    setSubmitting(true);
    try {
      await axios.post('/api/tickets', ticketData);
      message.success('工单创建成功');
      onCreated && onCreated();
      handleClose();
    } catch (e) {
      message.error('工单创建失败：' + (e.response?.data?.error || e.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: '#667eea' }} />
          <span>快速报修 · 智能解析</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={760}
      destroyOnClose
      style={{ top: 40 }}
      footer={
        parsed
          ? [
              <Button key="reset" icon={<ReloadOutlined />} onClick={reset}>
                重新解析
              </Button>,
              <Button
                key="submit"
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={submitting}
                onClick={handleSubmit}
              >
                创建工单
              </Button>,
            ]
          : null
      }
    >
      {!parsed ? (
        <div>
          <Alert
            type="info"
            showIcon
            message="把设备 SN、机房/机柜、故障现象、紧急程度等信息一股脑粘贴进来，系统自动解析并预填工单。"
            style={{ marginBottom: 16 }}
          />
          <TextArea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="例如：&#10;SN: SN2024ABC001&#10;机房B 7号机柜&#10;服务器宕机了，无法启动，风扇狂转，很急"
            autoSize={{ minRows: 8, maxRows: 16 }}
            style={{ fontFamily: 'monospace', fontSize: 14 }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: '#999', whiteSpace: 'pre-line' }}>
            示例：{EXAMPLE}
          </div>
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={parsing || deviceLoading}
              onClick={handleParse}
            >
              智能解析
            </Button>
          </div>
        </div>
      ) : (
        <Spin spinning={deviceLoading}>
          {/* 设备识别结果 */}
          <Card size="small" style={{ marginBottom: 16, background: '#fafbff' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>设备识别</div>
            {device && (
              <div>
                <Tag color="blue">{device.name}</Tag>
                <span style={{ color: '#666', marginRight: 12 }}>型号：{device.model || '-'}</span>
                <span style={{ color: '#666', marginRight: 12 }}>SN：{device.serialNumber || '-'}</span>
                <span style={{ color: '#666' }}>位置：{deviceLocation(device)}</span>
              </div>
            )}
            {candidates && (
              <div>
                <div style={{ color: '#fa8c16', marginBottom: 8 }}>
                  <WarningOutlined /> 找到多个匹配设备，请选择：
                </div>
                <Select
                  style={{ width: '100%' }}
                  placeholder="选择设备"
                  onChange={handlePickCandidate}
                  options={candidates.map(d => ({
                    value: d.deviceId,
                    label: `${d.name}（${d.serialNumber || '无SN'}）`,
                  }))}
                />
              </div>
            )}
            {manual && !device && !candidates && (
              <Alert
                type="warning"
                showIcon
                message="未根据 SN 自动匹配到设备，请在下方手动填写设备名称（序列号可选）。"
              />
            )}
          </Card>

          <Divider style={{ margin: '8px 0 16px' }} />

          <Form form={form} layout="vertical">
            {manual && !device && (
              <Space style={{ marginBottom: 16 }}>
                <Form.Item
                  name="deviceName"
                  label="设备名称"
                  rules={[{ required: true, message: '请填写设备名称' }]}
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="设备名称" style={{ width: 220 }} />
                </Form.Item>
                <Form.Item name="serialNumber" label="序列号" style={{ marginBottom: 0 }}>
                  <Input placeholder="序列号（可选）" style={{ width: 220 }} />
                </Form.Item>
              </Space>
            )}

            <Form.Item
              name="faultCategory"
              label="故障分类"
              rules={[{ required: true, message: '请选择故障分类' }]}
            >
              <Select placeholder="请选择故障分类">
                {categories.map(cat => (
                  <Select.Option key={cat.categoryId} value={cat.name}>
                    {cat.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="priority" label="优先级" initialValue="medium">
              <Select>
                {PRIORITY_OPTIONS.map(p => (
                  <Select.Option key={p.value} value={p.value}>
                    <Tag color={p.color} style={{ margin: 0 }}>
                      {p.label}
                    </Tag>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="description" label="故障描述">
              <TextArea autoSize={{ minRows: 4, maxRows: 10 }} />
            </Form.Item>

            <Form.Item name="expectedCompletionDate" label="期望完成时间">
              <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="title" label="工单标题">
              <Input placeholder="留空将自动生成" />
            </Form.Item>
          </Form>
        </Spin>
      )}
    </Modal>
  );
}
