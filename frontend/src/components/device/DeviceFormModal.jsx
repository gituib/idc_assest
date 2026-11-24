import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Switch,
  Row,
  Col,
  Button,
  Space,
  Alert,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { designTokens } from '../../config/theme';
import { getFormInitialValues, prepareDeviceFormData, normalizeDateFieldValues } from '../../utils/deviceUtils.jsx';
import { deviceAPI } from '../../api';
import ImageUploader from '../common/ImageUploader';

const { Option } = Select;

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  fontSize: '18px',
  fontWeight: 600,
  color: designTokens.colors.text.primary,
};

// 头部图标胶囊：软渐变底 + 圆角，增强层次感
const headerIconStyle = {
  width: '34px',
  height: '34px',
  borderRadius: '10px',
  background: designTokens.colors.primary.gradient,
  color: '#ffffff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '16px',
  boxShadow: designTokens.shadows.medium,
  flexShrink: 0,
};

const inputStyle = {
  borderRadius: '8px',
  transition: 'all 0.3s ease',
};

const DeviceFormModal = ({
  visible,
  editingDevice,
  deviceFields,
  racks,
  rooms,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedRackId, setSelectedRackId] = useState(null);
  const [positionConflict, setPositionConflict] = useState(null);
  const [checkingPosition, setCheckingPosition] = useState(false);
  const [heightExceedWarning, setHeightExceedWarning] = useState(null);
  // 设备图片：images 为服务端已存图片（编辑态），pendingImages 为新增时暂存待上传文件
  const [images, setImages] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);

  const selectedRackHeight = useMemo(() => {
    if (!selectedRackId || !racks || racks.length === 0) return 42;
    const rack = racks.find(r => r.rackId === selectedRackId);
    return rack?.height || 42;
  }, [selectedRackId, racks]);

  useEffect(() => {
    if (visible) {
      if (editingDevice) {
        // 先清空表单状态，避免上一个设备的自定义字段值残留被当前设备继承
        // antd setFieldsValue 是合并式更新，不会清除未传入的字段
        form.resetFields();
        const initialValues = getFormInitialValues(editingDevice, racks);
        // 日期字段（含自定义日期字段）需转为 dayjs，否则 DatePicker 渲染报错
        normalizeDateFieldValues(initialValues, deviceFields);
        form.setFieldsValue(initialValues);
        setImages(Array.isArray(editingDevice.images) ? editingDevice.images : []);
        setPendingImages([]);
        if (editingDevice.rackId) {
          const rack = racks.find(r => r.rackId === editingDevice.rackId);
          if (rack) {
            setSelectedRoomId(rack.roomId);
            setSelectedRackId(editingDevice.rackId);
          }
        }
        if (editingDevice.position) {
          checkPositionConflict(
            editingDevice.rackId,
            editingDevice.position,
            editingDevice.height,
            editingDevice.deviceId
          );
        }
      } else {
        form.resetFields();
        setSelectedRoomId(null);
        setSelectedRackId(null);
        setPositionConflict(null);
        setImages([]);
        setPendingImages([]);
      }
    }
  }, [visible, editingDevice, racks, form]);

  const checkPositionConflict = async (rackId, position, height, deviceId = null) => {
    if (!rackId || !position) {
      setPositionConflict(null);
      return;
    }

    setCheckingPosition(true);
    try {
      const params = {
        position,
        height: height || 1,
      };
      if (deviceId) {
        params.excludeDeviceId = deviceId;
      }
      const result = await deviceAPI.checkPosition(rackId, params);
      if (!result.available) {
        setPositionConflict(result.reason);
      } else {
        setPositionConflict(null);
      }
    } catch (error) {
      console.error('检查U位冲突失败:', error);
      message.error('检查U位冲突失败，已跳过位置校验');
      setPositionConflict(null);
    } finally {
      setCheckingPosition(false);
    }
  };

  const handleRackChange = value => {
    setSelectedRackId(value);
    const position = form.getFieldValue('position');
    const height = form.getFieldValue('height');

    // 获取新机柜的高度
    const newRack = racks.find(r => r.rackId === value);
    const newRackHeight = newRack?.height || 42;

    // 检查设备占用的总U位是否超过机柜高度
    // 设备占用范围: position 到 position + height - 1
    let warning = null;
    if (position && height && position + height - 1 > newRackHeight) {
      warning = `设备从 ${position}U 到 ${position + height - 1}U，超出机柜高度 ${newRackHeight}U`;
    }
    setHeightExceedWarning(warning);

    // 重新检查位置冲突（如果值在有效范围内）
    if (position && height && position + height - 1 <= newRackHeight) {
      checkPositionConflict(value, position, height, editingDevice?.deviceId);
    } else {
      setPositionConflict(null);
    }
  };

  const handlePositionChange = value => {
    const height = form.getFieldValue('height');
    const rack = racks.find(r => r.rackId === selectedRackId);
    const rackHeight = rack?.height || 42;

    // 检查设备占用的总U位是否超过机柜高度
    let warning = null;
    if (value && height && value + height - 1 > rackHeight) {
      warning = `设备从 ${value}U 到 ${value + height - 1}U，超出机柜高度 ${rackHeight}U`;
    }
    setHeightExceedWarning(warning);

    if (selectedRackId && value) {
      checkPositionConflict(selectedRackId, value, height, editingDevice?.deviceId);
    } else {
      setPositionConflict(null);
    }
  };

  const handleHeightChange = value => {
    const position = form.getFieldValue('position');
    const rack = racks.find(r => r.rackId === selectedRackId);
    const rackHeight = rack?.height || 42;

    // 检查设备占用的总U位是否超过机柜高度
    let warning = null;
    if (position && value && position + value - 1 > rackHeight) {
      warning = `设备从 ${position}U 到 ${position + value - 1}U，超出机柜高度 ${rackHeight}U`;
    }
    setHeightExceedWarning(warning);

    if (selectedRackId && position) {
      checkPositionConflict(selectedRackId, position, value, editingDevice?.deviceId);
    } else {
      setPositionConflict(null);
    }
  };

  const handleSubmit = values => {
    if (positionConflict) {
      return;
    }
    // 检查设备占用的总U位是否超过机柜高度
    // 设备占用范围: position 到 position + height - 1
    const rack = racks.find(r => r.rackId === values.rackId);
    const rackHeight = rack?.height || 42;
    if (values.position + values.height - 1 > rackHeight) {
      message.error(`设备从 ${values.position}U 到 ${values.position + values.height - 1}U，超出机柜高度 ${rackHeight}U`);
      return;
    }
    const deviceData = prepareDeviceFormData(values, !!editingDevice);
    onSubmit(deviceData, pendingImages);
  };

  const handleRoomChange = value => {
    setSelectedRoomId(value);
    setSelectedRackId(null);
    setPositionConflict(null);
    setHeightExceedWarning(null);
    form.setFieldValue('rackId', undefined);
  };

  const renderFieldControl = field => {
    switch (field.fieldType) {
      case 'number':
        return (
          <InputNumber
            placeholder={`请输入${field.displayName}`}
            min={0}
            style={{ width: '100%', ...inputStyle }}
            className="form-input-enhanced"
          />
        );
      case 'boolean':
        return <Switch />;
      case 'date':
        return (
          <DatePicker
            style={{ width: '100%', ...inputStyle }}
            placeholder={`请选择${field.displayName}`}
            className="form-input-enhanced"
          />
        );
      case 'textarea':
        return (
          <Input.TextArea
            placeholder={`请输入${field.displayName}`}
            rows={3}
            style={inputStyle}
            className="form-input-enhanced"
          />
        );
      case 'select':
        return (
          <Select
            placeholder={`请选择${field.displayName}`}
            style={inputStyle}
            className="form-input-enhanced"
          >
            {Array.isArray(field.options) &&
              field.options.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
          </Select>
        );
      default:
        return (
          <Input
            placeholder={`请输入${field.displayName}`}
            style={inputStyle}
            className="form-input-enhanced"
          />
        );
    }
  };

  // 强制锁定必填的字段（不受字段管理配置影响）
  const FORCE_REQUIRED_FIELDS = ['name', 'serialNumber', 'position', 'height'];

  // 过滤掉 deviceId 以及已在"设备位置选择"区块内单独渲染的字段，避免重复显示
  const filteredFields = deviceFields.filter(
    field => !['deviceId', 'rackId', 'position', 'height'].includes(field.fieldName)
  );

  // 获取关键字段的配置（用于设备位置区块）
  const rackFieldConfig = deviceFields.find(f => f.fieldName === 'rackId');
  const positionFieldConfig = deviceFields.find(f => f.fieldName === 'position');
  const heightFieldConfig = deviceFields.find(f => f.fieldName === 'height');

  // 动态判断是否必填（强制锁定字段 > 字段配置）
  const isPositionRequired = FORCE_REQUIRED_FIELDS.includes('position') || positionFieldConfig?.required;
  const isHeightRequired = FORCE_REQUIRED_FIELDS.includes('height') || heightFieldConfig?.required;

  const formItems = [];
  filteredFields.forEach(field => {
    if (field.fieldName === 'serialNumber') {
      formItems.push(
        <React.Fragment key={field.fieldName}>
          <Col span={12} key={`${field.fieldName}-col`}>
            <Form.Item
              name={field.fieldName}
              label={
                <span>
                  {field.displayName}
                  {field.required && <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>}
                </span>
              }
              rules={
                field.required ? [{ required: true, message: `请输入${field.displayName}` }] : []
              }
            >
              {renderFieldControl(field)}
            </Form.Item>
          </Col>
          <Col span={24} key="room-rack-section">
            <div
              style={{
                background:
                  'linear-gradient(160deg, #f5f7ff 0%, #eef6ff 100%)',
                borderRadius: '14px',
                padding: '20px 20px 20px',
                marginBottom: '20px',
                border: `1px solid ${designTokens.colors.primary.bg}`,
                boxShadow: '0 4px 16px -6px rgba(99, 102, 241, 0.18)',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: designTokens.colors.primary.main,
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    background: designTokens.colors.primary.gradient,
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                  }}
                >
                  <DatabaseOutlined />
                </span>
                设备位置选择
                <span
                  style={{
                    flex: 1,
                    height: '1px',
                    marginLeft: '4px',
                    background:
                      'linear-gradient(90deg, rgba(99,102,241,0.25), rgba(99,102,241,0))',
                  }}
                />
              </div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="roomId"
                    label={
                      <span>
                        机房
                        <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>
                      </span>
                    }
                    rules={[{ required: true, message: '请选择机房' }]}
                    style={{ marginBottom: '0' }}
                  >
                    <Select
                      placeholder="请选择机房"
                      style={{ borderRadius: '8px' }}
                      showSearch
                      optionFilterProp="children"
                      onChange={handleRoomChange}
                    >
                      {rooms.map(room => (
                        <Option key={room.roomId} value={room.roomId}>
                          {room.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="rackId"
                    label={
                      <span>
                        机柜
                        {rackFieldConfig?.required && <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>}
                      </span>
                    }
                    rules={rackFieldConfig?.required ? [{ required: true, message: '请选择机柜' }] : []}
                    style={{ marginBottom: '0' }}
                  >
                    <Select
                      placeholder={selectedRoomId ? '请选择机柜' : '请先选择机房'}
                      style={{ borderRadius: '8px' }}
                      disabled={!selectedRoomId}
                      showSearch
                      optionFilterProp="children"
                      onChange={handleRackChange}
                    >
                      {(selectedRoomId
                        ? racks.filter(rack => rack.roomId === selectedRoomId)
                        : []
                      ).map(rack => (
                        <Option key={rack.rackId} value={rack.rackId}>
                          {rack.name} ({rack.rackId})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: '16px' }}>
                <Col span={12}>
                  <Form.Item
                    name="position"
                    label={
                      <span>
                        安装位置 (U位)
                        {isPositionRequired && <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>}
                      </span>
                    }
                    rules={isPositionRequired ? [{ required: true, message: '请输入U位' }] : []}
                    style={{ marginBottom: '0' }}
                  >
                    <InputNumber
                      placeholder="如: 1"
                      min={1}
                      max={selectedRackHeight}
                      style={{ width: '100%', borderRadius: '8px' }}
                      onChange={handlePositionChange}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="height"
                    label={
                      <span>
                        设备高度 (U)
                        {isHeightRequired && <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>}
                      </span>
                    }
                    rules={isHeightRequired ? [{ required: true, message: '请输入设备高度' }] : []}
                    initialValue={1}
                    style={{ marginBottom: '0' }}
                  >
                    <InputNumber
                      placeholder="如: 2"
                      min={1}
                      max={selectedRackHeight}
                      style={{ width: '100%', borderRadius: '8px' }}
                      onChange={handleHeightChange}
                    />
                  </Form.Item>
                </Col>
              </Row>
              {positionConflict && (
                <div style={{ marginTop: '12px' }}>
                  <Alert
                    message={positionConflict}
                    type="error"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                  />
                </div>
              )}
              {heightExceedWarning && (
                <div style={{ marginTop: '12px' }}>
                  <Alert
                    message={heightExceedWarning}
                    type="warning"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                  />
                </div>
              )}
            </div>
          </Col>
        </React.Fragment>
      );
    } else if (field.fieldType === 'textarea') {
      formItems.push(
        <Col span={24} key={field.fieldName}>
          <Form.Item
            name={field.fieldName}
            label={
              <span>
                {field.displayName}
                {field.required && <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>}
              </span>
            }
            rules={
              field.required ? [{ required: true, message: `请输入${field.displayName}` }] : []
            }
          >
            {renderFieldControl(field)}
          </Form.Item>
        </Col>
      );
    } else {
      formItems.push(
        <Col span={12} key={field.fieldName}>
          <Form.Item
            name={field.fieldName}
            label={
              <span>
                {field.displayName}
                {field.required && <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>}
              </span>
            }
            rules={
              field.required ? [{ required: true, message: `请输入${field.displayName}` }] : []
            }
          >
            {renderFieldControl(field)}
          </Form.Item>
        </Col>
      );
    }
  });

  return (
    <Modal
      title={
        <div style={{ ...modalHeaderStyle, paddingRight: '32px' }}>
          <span style={headerIconStyle}>
            {editingDevice ? <EditOutlined /> : <PlusOutlined />}
          </span>
          {editingDevice ? '编辑设备' : '添加设备'}
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
      style={{ borderRadius: '16px' }}
      styles={{
        header: {
          borderBottom: '1px solid #f0f0f0',
          padding: '20px 24px',
          position: 'relative',
          background:
            'linear-gradient(180deg, rgba(99,102,241,0.04) 0%, rgba(255,255,255,0) 100%)',
        },
        body: { padding: '28px 24px 24px' },
        content: {
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow:
            '0 24px 48px -12px rgba(15,23,42,0.25), 0 8px 16px -8px rgba(15,23,42,0.15)',
        },
      }}
      className="device-modal"
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>{formItems}</Row>

        {/* 设备图片区块 */}
        <div
          style={{
            marginTop: '8px',
            marginBottom: '8px',
            padding: '18px 20px',
            borderRadius: '14px',
            border: `1px solid ${designTokens.colors.primary.bg}`,
            background: 'linear-gradient(160deg, #f5f7ff 0%, #eef6ff 100%)',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: designTokens.colors.primary.main,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                background: designTokens.colors.primary.gradient,
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
              }}
            >
              <PictureOutlined />
            </span>
            设备图片
          </div>
          <ImageUploader
            entity="devices"
            entityId={editingDevice?.deviceId || null}
            value={images}
            onChange={setImages}
            pendingFiles={pendingImages}
            onPendingChange={setPendingImages}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid #f0f0f0',
          }}
        >
          <Button
            onClick={onCancel}
            style={{
              height: '40px',
              borderRadius: '8px',
              padding: '0 24px',
              fontWeight: '500',
              color: designTokens.colors.text.secondary,
              border: '1px solid #e5e7eb',
              background: designTokens.colors.background.primary,
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = designTokens.colors.background.tertiary;
              e.currentTarget.style.color = designTokens.colors.text.primary;
              e.currentTarget.style.borderColor = designTokens.colors.border.medium;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = designTokens.colors.background.primary;
              e.currentTarget.style.color = designTokens.colors.text.secondary;
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            取消
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            style={{
              height: '40px',
              borderRadius: '8px',
              background: designTokens.colors.primary.gradient,
              border: 'none',
              color: '#ffffff',
              boxShadow: '0 6px 16px -6px rgba(99, 102, 241, 0.5)',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 32px',
              transition: 'all 0.3s ease',
            }}
          >
            确定
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default React.memo(DeviceFormModal);
