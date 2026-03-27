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
  Row,
  Col,
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

function PortCreateModal({
  device,
  visible,
  onClose,
  onSuccess,
  defaultNicId,
  networkCards = [],
  networkCard,
  disableNicChange = false,
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewPorts, setPreviewPorts] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [nicList, setNicList] = useState([]);
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setPreviewPorts([]);
      setShowPreview(false);
      form.resetFields();

      if (networkCard) {
        setNicList([networkCard]);
        if (networkCard.nicId) {
          form.setFieldsValue({ nicId: networkCard.nicId });
        }
      } else {
        if (defaultNicId) {
          form.setFieldsValue({ nicId: defaultNicId });
        }
        if (device?.deviceId && (!networkCards || networkCards.length === 0)) {
          fetchNetworkCards();
        } else if (networkCards && networkCards.length > 0) {
          setNicList(networkCards);
        }
      }
    }
    prevVisibleRef.current = visible;
  }, [visible, device, defaultNicId, networkCards, networkCard, form]);

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
      const finalNicId = disableNicChange && defaultNicId ? defaultNicId : values.nicId || null;

      if (portNames.length === 1) {
        await axios.post('/api/device-ports', {
          deviceId: device.deviceId,
          nicId: finalNicId,
          portName: portNames[0],
          portType: values.portType,
          portSpeed: values.portSpeed,
          vlanId: values.vlanId,
          status: values.status,
          description: values.description,
        });
        message.success({
          content: '端口创建成功',
          icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
        });
      } else {
        const portsData = portNames.map((portName, index) => ({
          portId: `PORT-${Date.now()}-${index}`,
          deviceId: device.deviceId,
          nicId: finalNicId,
          portName,
          portType: values.portType,
          portSpeed: values.portSpeed,
          vlanId: values.vlanId,
          status: values.status,
          description: values.description,
        }));

        await axios.post('/api/device-ports/batch', { ports: portsData });
        message.success({
          content: `成功创建 ${portNames.length} 个端口`,
          icon: <CheckCircleOutlined style={{ color: designTokens.colors.success.main }} />,
        });
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

  const handleValuesChange = changedValues => {
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
    twoColumnLayout: {
      marginBottom: '16px',
    },
    column: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      height: '100%',
    },
    section: {
      background: designTokens.colors.neutral[50],
      borderRadius: '12px',
      padding: '16px',
      border: `1px solid ${designTokens.colors.neutral[200]}`,
    },
    sectionTitle: {
      fontSize: '13px',
      fontWeight: 600,
      color: designTokens.colors.neutral[800],
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      paddingBottom: '8px',
      borderBottom: `1px solid ${designTokens.colors.neutral[200]}`,
    },
    fieldLabel: {
      fontSize: '12px',
      fontWeight: 500,
      color: designTokens.colors.neutral[700],
      marginBottom: '4px',
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
      borderRadius: '10px',
      padding: '12px',
      marginTop: '12px',
      border: `1px solid ${designTokens.colors.primary.light}20`,
    },
    previewTitle: {
      fontSize: '12px',
      fontWeight: 600,
      color: designTokens.colors.primary.dark,
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    previewTags: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
    },
    previewTag: {
      background: '#fff',
      border: `1px solid ${designTokens.colors.primary.light}`,
      color: designTokens.colors.primary.main,
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 500,
      padding: '2px 6px',
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
      height: '38px',
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
      padding: '10px 12px',
      marginTop: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    nicSelectedIcon: {
      color: designTokens.colors.success.main,
      fontSize: '16px',
    },
    nicSelectedInfo: {
      flex: 1,
    },
    nicSelectedName: {
      fontSize: '13px',
      fontWeight: 500,
      color: designTokens.colors.success.dark,
    },
    nicSelectedSlot: {
      fontSize: '11px',
      color: designTokens.colors.success.main,
    },
    alertBox: {
      borderRadius: '8px',
      background: designTokens.colors.info.bg,
      border: `1px solid ${designTokens.colors.info.light}40`,
    },
  };

  return (
    <Modal
      open={visible}
      closeIcon={<CloseButton />}
      onCancel={handleCancel}
      footer={null}
      width={720}
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
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            portType: 'RJ45',
            portSpeed: '1G',
            status: 'occupied',
          }}
        >
          <Alert
            message="格式说明"
            description={
              <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                <div>
                  • <strong>单个端口：</strong>eth0/1、gigabitethernet1/0/1
                </div>
                <div>
                  • <strong>端口范围：</strong>1/0/1-1/0/48（创建 1/0/1 到 1/0/48 共48个端口）
                </div>
              </div>
            }
            type="info"
            showIcon
            style={{ ...styles.alertBox, marginBottom: '16px' }}
          />

          <Row gutter={20} style={{ marginBottom: '16px' }}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <div style={{ ...styles.section, height: '100%' }}>
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
                    size="small"
                    placeholder="例如: eth0/1 或 1/0/1-1/0/48"
                    prefix={
                      <TagOutlined
                        style={{ color: designTokens.colors.neutral[400], fontSize: '12px' }}
                      />
                    }
                    style={{ borderRadius: '6px' }}
                    suffix={
                      <Tooltip title="支持单个端口或端口范围（如 1/0/1-1/0/48）">
                        <InfoCircleOutlined
                          style={{ color: designTokens.colors.neutral[400], fontSize: '11px' }}
                        />
                      </Tooltip>
                    }
                  />
                </Form.Item>

                {showPreview && (
                  <div style={styles.previewCard}>
                    <div style={styles.previewTitle}>
                      <ThunderboltOutlined />
                      将创建 {previewPorts.length} 个端口
                    </div>
                    <div style={styles.previewTags}>
                      {previewPorts.map((port, index) => (
                        <Tag key={index} style={styles.previewTag}>
                          {port}
                        </Tag>
                      ))}
                      {parsePortRange(form.getFieldValue('portName'))?.portCount >
                        previewPorts.length && (
                        <Tag
                          style={{
                            ...styles.previewTag,
                            background: designTokens.colors.neutral[100],
                          }}
                        >
                          ...等 {parsePortRange(form.getFieldValue('portName'))?.portCount} 个
                        </Tag>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Col>

            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <div style={{ ...styles.section, height: '100%' }}>
                <div style={styles.sectionTitle}>
                  <LinkOutlined style={{ color: designTokens.colors.primary.main }} />
                  网卡关联
                </div>

                {disableNicChange && defaultNicId ? (
                  <div
                    style={{
                      ...styles.nicSelectedCard,
                      background: designTokens.colors.success.bg,
                      border: `1px solid ${designTokens.colors.success.light}`,
                    }}
                  >
                    <div
                      style={{ ...styles.nicSelectedIcon, color: designTokens.colors.success.main }}
                    >
                      <CheckCircleOutlined />
                    </div>
                    <div style={styles.nicSelectedInfo}>
                      <div
                        style={{
                          ...styles.nicSelectedName,
                          color: designTokens.colors.success.dark,
                        }}
                      >
                        {nicList.find(nic => nic.nicId === defaultNicId)?.name || '管理口'}
                      </div>
                      {nicList.find(nic => nic.nicId === defaultNicId)?.slotNumber && (
                        <div
                          style={{
                            ...styles.nicSelectedSlot,
                            color: designTokens.colors.success.main,
                          }}
                        >
                          插槽 {nicList.find(nic => nic.nicId === defaultNicId)?.slotNumber}
                        </div>
                      )}
                    </div>
                    <Tag color="success">已绑定</Tag>
                  </div>
                ) : (
                  <>
                    <Form.Item name="nicId" style={{ marginBottom: 0 }}>
                      <Select
                        size="small"
                        placeholder="选择网卡（可选）"
                        allowClear
                        showSearch
                        optionFilterProp="children"
                        style={{ width: '100%', borderRadius: '6px' }}
                        suffixIcon={
                          <InfoCircleOutlined style={{ color: designTokens.colors.neutral[400] }} />
                        }
                      >
                        {nicList.map(nic => (
                          <Option key={nic.nicId} value={nic.nicId}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '2px 0',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 500, fontSize: '12px' }}>{nic.name}</div>
                                {nic.slotNumber && (
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: designTokens.colors.neutral[500],
                                    }}
                                  >
                                    插槽 {nic.slotNumber}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <div
                      style={{
                        fontSize: '11px',
                        color: designTokens.colors.neutral[500],
                        marginTop: '6px',
                      }}
                    >
                      <InfoCircleOutlined style={{ marginRight: '4px' }} />
                      不选择则端口不归属于任何网卡
                    </div>
                  </>
                )}
              </div>
            </Col>
          </Row>

          <div style={{ ...styles.section, marginBottom: '16px' }}>
            <div style={styles.sectionTitle}>
              <ThunderboltOutlined style={{ color: designTokens.colors.primary.main }} />
              端口属性
            </div>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="portType"
                  label={<span style={styles.fieldLabel}>端口类型</span>}
                  rules={[{ required: true, message: '请选择' }]}
                >
                  <Select size="small" style={{ width: '100%', borderRadius: '6px' }}>
                    <Option value="RJ45">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '2px',
                            background: designTokens.colors.device.server,
                          }}
                        />
                        RJ45
                      </div>
                    </Option>
                    <Option value="SFP">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '2px',
                            background: designTokens.colors.device.switch,
                          }}
                        />
                        SFP
                      </div>
                    </Option>
                    <Option value="SFP+">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '2px',
                            background: designTokens.colors.purple.main,
                          }}
                        />
                        SFP+
                      </div>
                    </Option>
                    <Option value="SFP28">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '2px',
                            background: designTokens.colors.info.main,
                          }}
                        />
                        SFP28
                      </div>
                    </Option>
                    <Option value="QSFP">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '2px',
                            background: designTokens.colors.warning.main,
                          }}
                        />
                        QSFP
                      </div>
                    </Option>
                    <Option value="QSFP28">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '2px',
                            background: designTokens.colors.secondary.main,
                          }}
                        />
                        QSFP28
                      </div>
                    </Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="portSpeed"
                  label={<span style={styles.fieldLabel}>端口速率</span>}
                  rules={[{ required: true, message: '请选择' }]}
                >
                  <Select size="small" style={{ width: '100%', borderRadius: '6px' }}>
                    <Option value="100M">100M</Option>
                    <Option value="1G">1G</Option>
                    <Option value="10G">10G</Option>
                    <Option value="25G">25G</Option>
                    <Option value="40G">40G</Option>
                    <Option value="100G">100G</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="vlanId" label={<span style={styles.fieldLabel}>VLAN ID</span>}>
                  <Input
                    size="small"
                    placeholder="1-4094"
                    style={{ width: '100%', borderRadius: '6px' }}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="status"
                  label={<span style={styles.fieldLabel}>状态</span>}
                  rules={[{ required: true, message: '请选择' }]}
                >
                  <Select size="small" style={{ width: '100%', borderRadius: '6px' }}>
                    <Option value="free">
                      <Tag color="success" style={{ margin: 0 }}>
                        空闲
                      </Tag>
                    </Option>
                    <Option value="occupied">
                      <Tag color="warning" style={{ margin: 0 }}>
                        占用
                      </Tag>
                    </Option>
                    <Option value="fault">
                      <Tag color="error" style={{ margin: 0 }}>
                        故障
                      </Tag>
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <FileTextOutlined style={{ color: designTokens.colors.primary.main }} />
              描述信息
            </div>

            <Form.Item name="description" style={{ marginBottom: 0 }}>
              <TextArea
                rows={2}
                placeholder="请输入描述信息（可选）"
                style={{ borderRadius: '6px', resize: 'none' }}
              />
            </Form.Item>
          </div>
        </Form>
      </div>

      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          {portCount > 0 && (
            <span>
              将创建{' '}
              <strong style={{ color: designTokens.colors.primary.main }}>{portCount}</strong>{' '}
              个端口
            </span>
          )}
        </div>
        <div style={styles.footerRight}>
          <Button
            size="middle"
            onClick={handleCancel}
            style={{ ...styles.button, minWidth: '70px' }}
          >
            取消
          </Button>
          <Button
            type="primary"
            size="middle"
            loading={loading}
            onClick={handleSubmit}
            icon={<PlusOutlined />}
            style={{ ...styles.button, ...styles.buttonPrimary, minWidth: '100px' }}
          >
            {portCount > 1 ? `创建 ${portCount} 个` : '创建'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default React.memo(PortCreateModal);
