import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  Segmented,
} from 'antd';
import {
  PlusOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  LinkOutlined,
  TagOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { designTokens } from '../config/theme';
import CloseButton from './CloseButton';

const { Option } = Select;
const { TextArea } = Input;

/**
 * 从端口名中提取前缀和末尾数字
 * @param {string} portName - 端口名称，如 "1/0/48" 或 "eth0/1"
 * @returns {{ prefix: string, num: number } | null} 前缀和数字，无数字则返回 null
 */
function extractPrefixAndNum(portName) {
  if (!portName || typeof portName !== 'string') return null;
  const match = portName.match(/^(.*?)(\d+)$/);
  if (!match) return null;
  return { prefix: match[1], num: parseInt(match[2], 10) };
}

/**
 * 快捷模式解析端口范围（单输入框格式）
 * 支持完整格式 "1/0/1-1/0/48" 和简写格式 "1/0/1-48"
 * @param {string} portName - 端口范围字符串
 * @returns {{ isRange: boolean, prefix: string, startNum: number, endNum: number, portCount: number, ports: string[], error?: string } | null}
 */
function parsePortRange(portName) {
  if (!portName || typeof portName !== 'string') {
    return null;
  }

  const trimmed = portName.trim();

  if (!trimmed.includes('-')) {
    return null;
  }

  // 用最后一个 - 分割，解决多 - 问题（如 eth-0-1-eth-0-48）
  const lastDashIdx = trimmed.lastIndexOf('-');
  const startPart = trimmed.substring(0, lastDashIdx).trim();
  const endPart = trimmed.substring(lastDashIdx + 1).trim();

  if (!startPart || !endPart) {
    return { isRange: false, prefix: '', startNum: 0, endNum: 0, portCount: 0, ports: [], error: '格式不完整，- 前后都需要有内容' };
  }

  const startParsed = extractPrefixAndNum(startPart);
  const endParsed = extractPrefixAndNum(endPart);

  if (!startParsed) {
    return { isRange: false, prefix: '', startNum: 0, endNum: 0, portCount: 0, ports: [], error: `起始端口名 "${startPart}" 末尾无数字，无法解析范围` };
  }

  // 简写格式：endPart 只有数字（如 "1/0/1-48"），endParsed.prefix 为空
  if (!endParsed) {
    return { isRange: false, prefix: '', startNum: 0, endNum: 0, portCount: 0, ports: [], error: `结束端口名 "${endPart}" 末尾无数字，无法解析范围` };
  }

  let prefix;
  let startNum = startParsed.num;
  let endNum = endParsed.num;

  if (endParsed.prefix === '') {
    // 简写格式：1/0/1-48，结束部分只有数字，前缀沿用起始部分
    prefix = startParsed.prefix;
  } else {
    // 完整格式：1/0/1-1/0/48，校验前缀一致
    if (startParsed.prefix !== endParsed.prefix) {
      return { isRange: false, prefix: '', startNum: 0, endNum: 0, portCount: 0, ports: [], error: `前后端口名前缀不一致："${startParsed.prefix}" vs "${endParsed.prefix}"` };
    }
    prefix = startParsed.prefix;
  }

  if (startNum >= endNum) {
    return { isRange: false, prefix: '', startNum: 0, endNum: 0, portCount: 0, ports: [], error: `起始数字 ${startNum} 必须小于结束数字 ${endNum}` };
  }

  if (endNum - startNum > 1000) {
    return { isRange: false, prefix: '', startNum: 0, endNum: 0, portCount: 0, ports: [], error: '单次最多创建1000个端口' };
  }

  const portCount = endNum - startNum + 1;
  const ports = [];
  for (let i = 0; i < portCount; i++) {
    ports.push(`${prefix}${startNum + i}`);
  }

  return { isRange: true, prefix, startNum, endNum, portCount, ports };
}

/**
 * 范围模式解析（双输入框：起始端口名 + 结束端口名）
 * @param {string} startPortName - 起始端口名
 * @param {string} endPortName - 结束端口名
 * @returns {{ isRange: boolean, prefix: string, startNum: number, endNum: number, portCount: number, ports: string[], error?: string }}
 */
function parseRangeMode(startPortName, endPortName) {
  if (!startPortName || !endPortName) {
    return { isRange: false, prefix: '', startNum: 0, endNum: 0, portCount: 0, ports: [], error: '请填写起始和结束端口名' };
  }

  const startParsed = extractPrefixAndNum(startPortName.trim());
  const endParsed = extractPrefixAndNum(endPortName.trim());

  if (!startParsed) {
    return { isRange: false, prefix: '', startNum: 0, endNum: 0, portCount: 0, ports: [], error: `起始端口名 "${startPortName}" 末尾无数字` };
  }
  if (!endParsed) {
    return { isRange: false, prefix: '', startNum: 0, endNum: 0, portCount: 0, ports: [], error: `结束端口名 "${endPortName}" 末尾无数字` };
  }

  if (startParsed.prefix !== endParsed.prefix) {
    return { isRange: false, prefix: '', startNum: 0, endNum: 0, portCount: 0, ports: [], error: `前后端口名前缀不一致："${startParsed.prefix || '(空)'}" vs "${endParsed.prefix || '(空)'}"` };
  }

  if (startParsed.num >= endParsed.num) {
    return { isRange: false, prefix: '', startNum: 0, endNum: 0, portCount: 0, ports: [], error: `起始数字 ${startParsed.num} 必须小于结束数字 ${endParsed.num}` };
  }

  if (endParsed.num - startParsed.num > 1000) {
    return { isRange: false, prefix: '', startNum: 0, endNum: 0, portCount: 0, ports: [], error: '单次最多创建1000个端口' };
  }

  const prefix = startParsed.prefix;
  const startNum = startParsed.num;
  const endNum = endParsed.num;
  const portCount = endNum - startNum + 1;
  const ports = [];
  for (let i = 0; i < portCount; i++) {
    ports.push(`${prefix}${startNum + i}`);
  }

  return { isRange: true, prefix, startNum, endNum, portCount, ports };
}

/**
 * 根据模式和输入生成端口名列表
 * @param {string} mode - 'range' 或 'quick'
 * @param {object} params - { portName } 或 { startPortName, endPortName }
 * @returns {{ ports: string[], error: string | null, parseResult: object | null }}
 */
function generatePortNames(mode, params) {
  if (mode === 'range') {
    const { startPortName, endPortName } = params;
    if (!startPortName && !endPortName) {
      return { ports: [], error: null, parseResult: null };
    }
    if (!startPortName || !endPortName) {
      // 只填了一个，暂不报错，返回空
      return { ports: [], error: null, parseResult: null };
    }
    const result = parseRangeMode(startPortName, endPortName);
    if (result.isRange) {
      return { ports: result.ports, error: null, parseResult: result };
    }
    return { ports: [], error: result.error, parseResult: result };
  }

  // 快捷模式（仅单端口，不支持范围）
  const { portName } = params;
  if (!portName) {
    return { ports: [], error: null, parseResult: null };
  }

  // 快捷模式直接作为单端口处理
  return { ports: [portName.trim()], error: null, parseResult: null };
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
  const [portMode, setPortMode] = useState('quick'); // 'range' | 'quick'
  const [parseError, setParseError] = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setPreviewPorts([]);
      setShowPreview(false);
      setPortMode('quick');
      setParseError(null);
      setParseResult(null);
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

  /**
   * 更新端口预览和解析状态
   * @param {string} mode - 当前模式
   * @param {object} params - 解析参数
   */
  const updatePortPreview = useCallback((mode, params) => {
    const result = generatePortNames(mode, params);

    setParseError(result.error);
    setParseResult(result.parseResult);

    if (result.ports.length > 1) {
      setPreviewPorts(result.ports.slice(0, 20));
      setShowPreview(true);
    } else if (result.ports.length === 1) {
      setPreviewPorts([]);
      setShowPreview(false);
    } else {
      setPreviewPorts([]);
      setShowPreview(false);
    }
  }, []);

  /** 快捷模式：端口名输入变化 */
  const handleQuickPortNameChange = useCallback(e => {
    const value = e.target.value;
    updatePortPreview('quick', { portName: value });
  }, [updatePortPreview]);

  /** 范围模式：起始/结束端口名输入变化 */
  const handleRangePortNameChange = useCallback(() => {
    const startPortName = form.getFieldValue('startPortName');
    const endPortName = form.getFieldValue('endPortName');
    updatePortPreview('range', { startPortName, endPortName });
  }, [form, updatePortPreview]);

  /** 模式切换处理 */
  const handleModeChange = useCallback((newMode) => {
    setPortMode(newMode);
    setParseError(null);
    setParseResult(null);
    setPreviewPorts([]);
    setShowPreview(false);
    // 清空端口名相关字段
    form.setFieldsValue({ portName: undefined, startPortName: undefined, endPortName: undefined });
  }, [form]);

  /** 获取当前生成的端口名列表 */
  const getCurrentPortNames = useCallback(() => {
    if (portMode === 'range') {
      const startPortName = form.getFieldValue('startPortName');
      const endPortName = form.getFieldValue('endPortName');
      return generatePortNames('range', { startPortName, endPortName });
    }
    const portName = form.getFieldValue('portName');
    return generatePortNames('quick', { portName });
  }, [portMode, form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 获取端口名列表
      const { ports: portNames, error: genError } = getCurrentPortNames();

      if (genError) {
        message.error(genError);
        setLoading(false);
        return;
      }

      if (!portNames || portNames.length === 0) {
        message.error('请输入端口名称');
        setLoading(false);
        return;
      }

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
      setParseError(null);
      setParseResult(null);
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
  }, [device, form, onClose, onSuccess, getCurrentPortNames, disableNicChange, defaultNicId]);

  const handleCancel = useCallback(() => {
    form.resetFields();
    setPreviewPorts([]);
    setShowPreview(false);
    setParseError(null);
    setParseResult(null);
    onClose();
  }, [form, onClose]);

  const handleValuesChange = changedValues => {
    if (portMode === 'quick' && changedValues.portName) {
      handleQuickPortNameChange({ target: { value: changedValues.portName } });
    }
    if (portMode === 'range' && (changedValues.startPortName !== undefined || changedValues.endPortName !== undefined)) {
      handleRangePortNameChange();
    }
  };

  const portCount = useMemo(() => {
    if (parseResult?.portCount) return parseResult.portCount;
    if (previewPorts.length > 0) return previewPorts.length;
    // 单端口情况
    if (portMode === 'quick') {
      const portName = form.getFieldValue('portName');
      if (portName && !parseError) return 1;
    }
    return 0;
  }, [parseResult, previewPorts, portMode, form, parseError]);
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
                {portMode === 'range' ? (
                  <>
                    <div>
                      • <strong>范围模式：</strong>分别输入起始和结束端口名，系统自动生成端口序列
                    </div>
                    <div>
                      • <strong>规则：</strong>起始和结束端口名的前缀必须一致，且起始数字需小于结束数字
                    </div>
                    <div>
                      • <strong>示例：</strong>起始 1/0/1，结束 1/0/48 → 创建 1/0/1 至 1/0/48 共 48 个端口
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      • <strong>单端口模式：</strong>每次创建一个端口，如需批量创建请切换至范围模式
                    </div>
                    <div>
                      • <strong>示例：</strong>eth0/1、GigabitEthernet0/0/1、1/0/24
                    </div>
                  </>
                )}
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
                  <div style={{ marginLeft: 'auto' }}>
                    <Segmented
                      size="small"
                      value={portMode}
                      onChange={handleModeChange}
                      options={[
                        { label: '单端口', value: 'quick' },
                        { label: '范围模式', value: 'range' },
                      ]}
                    />
                  </div>
                </div>

                {portMode === 'range' ? (
                  <>
                    <Form.Item
                      name="startPortName"
                      label={<span style={styles.fieldLabel}>起始端口名</span>}
                      rules={[
                        { required: true, message: '请输入起始端口名' },
                        {
                          pattern: /^[\w\/:]+$/,
                          message: '端口名称格式不正确',
                        },
                      ]}
                    >
                      <Input
                        size="small"
                        placeholder="例如: 1/0/1"
                        prefix={
                          <TagOutlined
                            style={{ color: designTokens.colors.neutral[400], fontSize: '12px' }}
                          />
                        }
                        style={{ borderRadius: '6px' }}
                        onChange={handleRangePortNameChange}
                      />
                    </Form.Item>
                    <Form.Item
                      name="endPortName"
                      label={<span style={styles.fieldLabel}>结束端口名</span>}
                      rules={[
                        { required: true, message: '请输入结束端口名' },
                        {
                          pattern: /^[\w\/:]+$/,
                          message: '端口名称格式不正确',
                        },
                      ]}
                    >
                      <Input
                        size="small"
                        placeholder="例如: 1/0/48"
                        prefix={
                          <TagOutlined
                            style={{ color: designTokens.colors.neutral[400], fontSize: '12px' }}
                          />
                        }
                        style={{ borderRadius: '6px' }}
                        onChange={handleRangePortNameChange}
                      />
                    </Form.Item>
                  </>
                ) : (
                  <Form.Item
                    name="portName"
                    rules={[
                      { required: true, message: '请输入端口名称' },
                      {
                        pattern: /^[\w\/:]+$/,
                        message: '端口名称格式不正确',
                      },
                    ]}
                  >
                    <Input
                      size="small"
                      placeholder="例如: eth0/1 或 1/0/24"
                      prefix={
                        <TagOutlined
                          style={{ color: designTokens.colors.neutral[400], fontSize: '12px' }}
                        />
                      }
                      style={{ borderRadius: '6px' }}
                      suffix={
                        <Tooltip title="输入单个端口名称，批量创建请切换至范围模式">
                          <InfoCircleOutlined
                            style={{ color: designTokens.colors.neutral[400], fontSize: '11px' }}
                          />
                        </Tooltip>
                      }
                    />
                  </Form.Item>
                )}

                {/* 解析失败提示 */}
                {parseError && (
                  <Alert
                    message={parseError}
                    type="error"
                    showIcon
                    style={{ marginBottom: '8px', borderRadius: '6px', fontSize: '12px' }}
                  />
                )}

                {showPreview && parseResult && (
                  <div style={styles.previewCard}>
                    <div style={styles.previewTitle}>
                      <ThunderboltOutlined />
                      将创建 {parseResult.portCount} 个端口
                    </div>
                    <div style={styles.previewTags}>
                      {previewPorts.map((port, index) => (
                        <Tag key={index} style={styles.previewTag}>
                          {port}
                        </Tag>
                      ))}
                      {parseResult.portCount > previewPorts.length && (
                        <Tag
                          style={{
                            ...styles.previewTag,
                            background: designTokens.colors.neutral[100],
                          }}
                        >
                          ...等 {parseResult.portCount} 个
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
