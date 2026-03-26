import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Divider,
} from 'antd';
import {
  PlusOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  LinkOutlined,
  TagOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { designTokens } from '../config/theme';
import CloseButton from './CloseButton';

const { Option } = Select;
const { TextArea } = Input;

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
  const [activeStep, setActiveStep] = useState(1);
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setPreviewPorts([]);
      setShowPreview(false);
      setActiveStep(1);
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
        message.success({ content: '端口创建成功', icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} /> });
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
        message.success({ content: `成功创建 ${portNames.length} 个端口`, icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} /> });
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

  const handleValuesChange = (changedValues) => {
    if (changedValues.portName) {
      handlePortNameChange({ target: { value: changedValues.portName } });
    }
  };

  const portCount = previewPorts.length || (form.getFieldValue('portName') && !showPreview ? 1 : 0);
  const selectedNic = nicList.find(nic => nic.nicId === form.getFieldValue('nicId'));

  const styles = {
    modal: {
      borderRadius: '16px',
      overflow: 'hidden',
    },
    header: {
      background: `linear-gradient(135deg, ${designTokens.colors.primary.main} 0%, ${designTokens.colors.primary.dark} 100%)`,
      padding: '20px 24px',
      margin: '-1px -1px 0 -1px',
      borderRadius: '16px 16px 0 0',
    },
    headerTitle: {
      color: '#fff',
      fontSize: '18px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    body: {
      padding: '24px',
      background: '#fff',
    },
    stepContainer: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '24px',
    },
    step: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 20px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    stepActive: {
      background: designTokens.colors.primary.bg,
      color: designTokens.colors.primary.main,
    },
    stepInactive: {
      background: designTokens.colors.neutral[100],
      color: designTokens.colors.neutral[500],
    },
    stepNumber: {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 600,
    },
    section: {
      background: designTokens.colors.neutral[50],
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      border: `1px solid ${designTokens.colors.neutral[200]}`,
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: designTokens.colors.neutral[800],
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    fieldLabel: {
      fontSize: '13px',
      fontWeight: 500,
      color: designTokens.colors.neutral[700],
      marginBottom: '6px',
    },
    input: {
      borderRadius: '8px',
      borderColor: designTokens.colors.neutral[300],
      transition: 'all 0.2s ease',
    },
    select: {
      borderRadius: '8px',
      borderColor: designTokens.colors.neutral[300],
    },
    previewCard: {
      background: `linear-gradient(135deg, ${designTokens.colors.info.bg} 0%, ${designTokens.colors.primary.bg} 100%)`,
      borderRadius: '12px',
      padding: '16px',
      marginTop: '16px',
      border: `1px solid ${designTokens.colors.primary.light}20`,
    },
    previewTitle: {
      fontSize: '13px',
      fontWeight: 600,
      color: designTokens.colors.primary.dark,
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    previewTags: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
    },
    previewTag: {
      background: '#fff',
      border: `1px solid ${designTokens.colors.primary.light}`,
      color: designTokens.colors.primary.main,
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 500,
    },
    footer: {
      padding: '16px 24px',
      background: designTokens.colors.neutral[50],
      borderTop: `1px solid ${designTokens.colors.neutral[200]}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    footerLeft: {
      fontSize: '12px',
      color: designTokens.colors.neutral[500],
    },
    footerRight: {
      display: 'flex',
      gap: '12px',
    },
    button: {
      height: '40px',
      borderRadius: '8px',
      fontWeight: 500,
      transition: 'all 0.2s ease',
    },
    buttonPrimary: {
      background: `linear-gradient(135deg, ${designTokens.colors.primary.main} 0%, ${designTokens.colors.primary.dark} 100%)`,
      border: 'none',
      boxShadow: `0 4px 12px ${designTokens.colors.primary.main}40`,
    },
    nicSelectedCard: {
      background: designTokens.colors.success.bg,
      border: `1px solid ${designTokens.colors.success.light}`,
      borderRadius: '8px',
      padding: '12px 16px',
      marginTop: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    nicSelectedIcon: {
      color: designTokens.colors.success.main,
      fontSize: '18px',
    },
    nicSelectedInfo: {
      flex: 1,
    },
    nicSelectedName: {
      fontSize: '14px',
      fontWeight: 500,
      color: designTokens.colors.success.dark,
    },
    nicSelectedSlot: {
      fontSize: '12px',
      color: designTokens.colors.success.main,
    },
  };

  return (
    <Modal
      open={visible}
      closeIcon={<CloseButton />}
      onCancel={handleCancel}
      footer={null}
      width={600}
      zIndex={1050}
      style={styles.modal}
      styles={{ body: { padding: 0 } }}
    >
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <PlusOutlined />
          <span>新增端口</span>
          <Tag
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              fontWeight: 500,
              marginLeft: '8px',
            }}
          >
            {device?.name || '设备'}
          </Tag>
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.stepContainer}>
          <div style={{ ...styles.step, ...(activeStep === 1 ? styles.stepActive : styles.stepInactive) }}>
            <div style={{
              ...styles.stepNumber,
              background: activeStep === 1 ? designTokens.colors.primary.main : 'transparent',
              color: activeStep === 1 ? '#fff' : designTokens.colors.neutral[500],
              border: activeStep === 1 ? 'none' : `1px solid ${designTokens.colors.neutral[400]}`,
            }}>
              1
            </div>
            <span>基本信息</span>
          </div>
          <div style={{
            width: '40px',
            height: '2px',
            background: activeStep === 2 ? designTokens.colors.primary.main : designTokens.colors.neutral[300],
            margin: '0 8px',
            alignSelf: 'center',
          }} />
          <div style={{ ...styles.step, ...(activeStep === 2 ? styles.stepActive : styles.stepInactive) }}>
            <div style={{
              ...styles.stepNumber,
              background: activeStep === 2 ? designTokens.colors.primary.main : 'transparent',
              color: activeStep === 2 ? '#fff' : designTokens.colors.neutral[500],
              border: activeStep === 2 ? 'none' : `1px solid ${designTokens.colors.neutral[400]}`,
            }}>
              2
            </div>
            <span>高级配置</span>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            portType: 'RJ45',
            portSpeed: '1G',
            status: 'free',
          }}
          onValuesChange={handleValuesChange}
        >
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <TagOutlined style={{ color: designTokens.colors.primary.main }} />
              端口标识
            </div>

            <Form.Item
              name="portName"
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
                size="large"
                placeholder="例如: eth0/1 或 1/0/1-1/0/48"
                prefix={<TagOutlined style={{ color: designTokens.colors.neutral[400] }} />}
                style={{ borderRadius: '8px' }}
                suffix={
                  <Tooltip title="支持单个端口或端口范围（如 1/0/1-1/0/48）">
                    <InfoCircleOutlined style={{ color: designTokens.colors.neutral[400] }} />
                  </Tooltip>
                }
              />
            </Form.Item>

            {showPreview && (
              <div style={styles.previewCard}>
                <div style={styles.previewTitle}>
                  <ThunderboltOutlined />
                  预览：将创建 {previewPorts.length} 个端口
                </div>
                <div style={styles.previewTags}>
                  {previewPorts.map((port, index) => (
                    <Tag key={index} style={styles.previewTag}>
                      {port}
                    </Tag>
                  ))}
                  {parsePortRange(form.getFieldValue('portName'))?.portCount > previewPorts.length && (
                    <Tag style={{ ...styles.previewTag, background: designTokens.colors.neutral[100] }}>
                      ...等 {parsePortRange(form.getFieldValue('portName'))?.portCount} 个
                    </Tag>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <LinkOutlined style={{ color: designTokens.colors.primary.main }} />
              网卡关联
            </div>

            <Form.Item name="nicId" style={{ marginBottom: 0 }}>
              <Select
                size="large"
                placeholder="选择网卡（可选）"
                allowClear
                showSearch
                optionFilterProp="children"
                style={{ width: '100%', borderRadius: '8px' }}
                suffixIcon={<InfoCircleOutlined style={{ color: designTokens.colors.neutral[400] }} />}
              >
                {nicList.map(nic => (
                  <Option key={nic.nicId} value={nic.nicId}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{nic.name}</div>
                        {nic.slotNumber && (
                          <div style={{ fontSize: '12px', color: designTokens.colors.neutral[500] }}>
                            插槽 {nic.slotNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {selectedNic && (
              <div style={styles.nicSelectedCard}>
                <div style={styles.nicSelectedIcon}>
                  <CheckCircleOutlined />
                </div>
                <div style={styles.nicSelectedInfo}>
                  <div style={styles.nicSelectedName}>{selectedNic.name}</div>
                  {selectedNic.slotNumber && (
                    <div style={styles.nicSelectedSlot}>插槽 {selectedNic.slotNumber}</div>
                  )}
                </div>
                <Tag color="success">已选择</Tag>
              </div>
            )}

            <div style={{ fontSize: '12px', color: designTokens.colors.neutral[500], marginTop: '8px' }}>
              <InfoCircleOutlined style={{ marginRight: '4px' }} />
              不选择则端口不归属于任何网卡
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <ThunderboltOutlined style={{ color: designTokens.colors.primary.main }} />
              端口属性
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Form.Item
                name="portType"
                label={<span style={styles.fieldLabel}>端口类型</span>}
                rules={[{ required: true, message: '请选择端口类型' }]}
              >
                <Select size="large" style={{ width: '100%', borderRadius: '8px' }}>
                  <Option value="RJ45">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: designTokens.colors.device.server }} />
                      RJ45
                    </div>
                  </Option>
                  <Option value="SFP">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: designTokens.colors.device.switch }} />
                      SFP
                    </div>
                  </Option>
                  <Option value="SFP+">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: designTokens.colors.purple.main }} />
                      SFP+
                    </div>
                  </Option>
                  <Option value="SFP28">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: designTokens.colors.info.main }} />
                      SFP28
                    </div>
                  </Option>
                  <Option value="QSFP">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: designTokens.colors.warning.main }} />
                      QSFP
                    </div>
                  </Option>
                  <Option value="QSFP28">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: designTokens.colors.secondary.main }} />
                      QSFP28
                    </div>
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="portSpeed"
                label={<span style={styles.fieldLabel}>端口速率</span>}
                rules={[{ required: true, message: '请选择端口速率' }]}
              >
                <Select size="large" style={{ width: '100%', borderRadius: '8px' }}>
                  <Option value="100M">100M</Option>
                  <Option value="1G">1G</Option>
                  <Option value="10G">10G</Option>
                  <Option value="25G">25G</Option>
                  <Option value="40G">40G</Option>
                  <Option value="100G">100G</Option>
                </Select>
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Form.Item
                name="vlanId"
                label={<span style={styles.fieldLabel}>VLAN ID</span>}
              >
                <InputNumber
                  size="large"
                  placeholder="1-4094"
                  min={1}
                  max={4094}
                  style={{ width: '100%', borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="status"
                label={<span style={styles.fieldLabel}>状态</span>}
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select size="large" style={{ width: '100%', borderRadius: '8px' }}>
                  <Option value="free">
                    <Tag color="success">空闲</Tag>
                  </Option>
                  <Option value="occupied">
                    <Tag color="warning">占用</Tag>
                  </Option>
                  <Option value="fault">
                    <Tag color="error">故障</Tag>
                  </Option>
                </Select>
              </Form.Item>
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <FileTextOutlined style={{ color: designTokens.colors.primary.main }} />
              描述信息
            </div>

            <Form.Item name="description" style={{ marginBottom: 0 }}>
              <TextArea
                rows={3}
                placeholder="请输入描述信息（可选）"
                style={{ borderRadius: '8px', resize: 'none' }}
              />
            </Form.Item>
          </div>

          <Alert
            message="格式说明"
            description={
              <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                <div>• <strong>单个端口：</strong>eth0/1、gigabitethernet1/0/1</div>
                <div>• <strong>端口范围：</strong>1/0/1-1/0/48（创建 1/0/1 到 1/0/48 共48个端口）</div>
                <div>• <strong>简单范围：</strong>eth1-eth24（创建 eth1 到 eth24 共24个端口）</div>
              </div>
            }
            type="info"
            showIcon
            style={{
              borderRadius: '8px',
              background: designTokens.colors.info.bg,
              border: `1px solid ${designTokens.colors.info.light}40`,
            }}
          />
        </Form>
      </div>

      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          {portCount > 0 && (
            <span>
              将创建 <strong style={{ color: designTokens.colors.primary.main }}>{portCount}</strong> 个端口
            </span>
          )}
        </div>
        <div style={styles.footerRight}>
          <Button
            size="large"
            onClick={handleCancel}
            style={{ ...styles.button, minWidth: '80px' }}
          >
            取消
          </Button>
          <Button
            type="primary"
            size="large"
            loading={loading}
            onClick={handleSubmit}
            icon={<PlusOutlined />}
            style={{ ...styles.button, ...styles.buttonPrimary, minWidth: '120px' }}
          >
            {portCount > 1 ? `创建 ${portCount} 个` : '创建'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default React.memo(PortCreateModal);