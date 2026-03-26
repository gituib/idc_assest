import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, DatePicker, Switch, Row, Col, Button, Space, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DatabaseOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { designTokens } from '../../config/theme';
import { getFormInitialValues, prepareDeviceFormData } from '../../utils/deviceUtils.jsx';
import { deviceAPI } from '../../api';

const { Option } = Select;

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '18px',
  fontWeight: 600,
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

  useEffect(() => {
    if (visible) {
      if (editingDevice) {
        const initialValues = getFormInitialValues(editingDevice, racks);
        if (initialValues.purchaseDate) {
          initialValues.purchaseDate = dayjs(initialValues.purchaseDate);
        }
        if (initialValues.warrantyExpiry) {
          initialValues.warrantyExpiry = dayjs(initialValues.warrantyExpiry);
        }
        form.setFieldsValue(initialValues);
        if (editingDevice.rackId) {
          const rack = racks.find((r) => r.rackId === editingDevice.rackId);
          if (rack) {
            setSelectedRoomId(rack.roomId);
            setSelectedRackId(editingDevice.rackId);
          }
        }
        if (editingDevice.position) {
          checkPositionConflict(editingDevice.rackId, editingDevice.position, editingDevice.height, editingDevice.deviceId);
        }
      } else {
        form.resetFields();
        setSelectedRoomId(null);
        setSelectedRackId(null);
        setPositionConflict(null);
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
      setPositionConflict(null);
    } finally {
      setCheckingPosition(false);
    }
  };

  const handleRackChange = (value) => {
    setSelectedRackId(value);
    const position = form.getFieldValue('position');
    const height = form.getFieldValue('height');
    if (position) {
      checkPositionConflict(value, position, height, editingDevice?.deviceId);
    } else {
      setPositionConflict(null);
    }
  };

  const handlePositionChange = (value) => {
    const height = form.getFieldValue('height');
    if (selectedRackId && value) {
      checkPositionConflict(selectedRackId, value, height, editingDevice?.deviceId);
    } else {
      setPositionConflict(null);
    }
  };

  const handleHeightChange = (value) => {
    const position = form.getFieldValue('position');
    if (selectedRackId && position) {
      checkPositionConflict(selectedRackId, position, value, editingDevice?.deviceId);
    } else {
      setPositionConflict(null);
    }
  };

  const handleSubmit = (values) => {
    if (positionConflict) {
      return;
    }
    const deviceData = prepareDeviceFormData(values, !!editingDevice);
    onSubmit(deviceData);
  };

  const handleRoomChange = (value) => {
    setSelectedRoomId(value);
    setSelectedRackId(null);
    setPositionConflict(null);
    form.setFieldValue('rackId', undefined);
  };

  const renderFieldControl = (field) => {
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
              field.options.map((option) => (
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

  const filteredFields = deviceFields.filter(
    (field) => field.fieldName !== 'deviceId' && field.fieldName !== 'rackId' && field.fieldName !== 'position' && field.fieldName !== 'height'
  );

  const formItems = [];
  filteredFields.forEach((field) => {
    if (field.fieldName === 'serialNumber') {
      formItems.push(
        <React.Fragment key={field.fieldName}>
          <Col span={12} key={`${field.fieldName}-col`}>
            <Form.Item
              name={field.fieldName}
              label={
                <span>
                  {field.displayName}
                  {field.required && (
                    <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>
                  )}
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
                background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
                border: '2px solid #d6e4ff',
                boxShadow: '0 2px 8px rgba(24, 144, 255, 0.1)',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1890ff',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <DatabaseOutlined style={{ marginRight: '8px' }} />
                设备位置选择
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
                      {rooms.map((room) => (
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
                        <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>
                      </span>
                    }
                    rules={[{ required: true, message: '请选择机柜' }]}
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
                      {(selectedRoomId ? racks.filter((rack) => rack.roomId === selectedRoomId) : []).map(
                        (rack) => (
                          <Option key={rack.rackId} value={rack.rackId}>
                            {rack.name} ({rack.rackId})
                          </Option>
                        )
                      )}
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
                        <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>
                      </span>
                    }
                    rules={[{ required: true, message: '请输入U位' }]}
                    style={{ marginBottom: '0' }}
                  >
                    <InputNumber
                      placeholder="如: 1"
                      min={1}
                      max={42}
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
                        <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>
                      </span>
                    }
                    rules={[{ required: true, message: '请输入设备高度' }]}
                    initialValue={1}
                    style={{ marginBottom: '0' }}
                  >
                    <InputNumber
                      placeholder="如: 2"
                      min={1}
                      max={10}
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
                {field.required && (
                  <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>
                )}
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
                {field.required && (
                  <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>
                )}
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
          {editingDevice ? (
            <EditOutlined style={{ color: '#667eea' }} />
          ) : (
            <PlusOutlined style={{ color: '#667eea' }} />
          )}
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
          padding: '16px 24px',
          position: 'relative',
        },
        body: { padding: '24px' },
      }}
      className="device-modal"
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>{formItems}</Row>

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
              transition: 'all 0.3s ease',
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
              boxShadow: designTokens.shadows.small,
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
