import React from 'react';
import {
  CloudServerOutlined,
  SafetyOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

export const STATUS_MAP = {
  running: { text: '运行中', color: '#52c41a', badgeColor: 'green' },
  maintenance: { text: '维护中', color: '#faad14', badgeColor: 'orange' },
  offline: { text: '离线', color: '#8c8c8c', badgeColor: 'default' },
  fault: { text: '故障', color: '#ff4d4f', badgeColor: 'red' },
  idle: { text: '空闲', color: '#36cfc9', badgeColor: 'cyan' },
};

export const TYPE_MAP = {
  server: '服务器',
  switch: '交换机',
  router: '路由器',
  storage: '存储设备',
  other: '其他设备',
};

export const getStatusConfig = status => {
  return STATUS_MAP[status] || { text: status, color: 'black', badgeColor: 'default' };
};

export const getTypeLabel = type => {
  return TYPE_MAP[type] || type;
};

export const getDeviceTypeIcon = type => {
  const iconMap = {
    server: <CloudServerOutlined style={{ color: '#1890ff' }} />,
    switch: <SwapOutlined style={{ color: '#52c41a' }} />,
    router: <SafetyOutlined style={{ color: '#faad14' }} />,
    storage: <DatabaseOutlined style={{ color: '#722ed1' }} />,
    other: <AppstoreOutlined style={{ color: '#8c8c8c' }} />,
  };
  return iconMap[type] || <AppstoreOutlined style={{ color: '#8c8c8c' }} />;
};

export const formatDate = (date, fieldName) => {
  if (!date) return '';

  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('zh-CN');

  if (fieldName === 'warrantyExpiry') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj < today) {
      return <span style={{ color: '#d93025', fontWeight: 'bold' }}>{formattedDate}</span>;
    }
  }

  return formattedDate;
};

export const FIXED_FIELDS = [
  'deviceId',
  'name',
  'type',
  'model',
  'serialNumber',
  'rackId',
  'position',
  'height',
  'powerConsumption',
  'status',
  'purchaseDate',
  'warrantyExpiry',
  'ipAddress',
  'description',
];

export const SYSTEM_FIELDS = ['createdAt', 'updatedAt', 'Rack', 'Room', 'customFields'];

export const processDeviceData = device => {
  const deviceWithFields = { ...device };
  if (device.customFields && typeof device.customFields === 'object') {
    Object.entries(device.customFields).forEach(([fieldName, value]) => {
      deviceWithFields[fieldName] = value;
    });
  }
  return deviceWithFields;
};

export const prepareDeviceFormData = (values, isEditing) => {
  const deviceData = {
    ...values,
    purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null,
    warrantyExpiry: values.warrantyExpiry ? values.warrantyExpiry.format('YYYY-MM-DD') : null,
    customFields: {},
  };

  Object.keys(deviceData).forEach(key => {
    if (!FIXED_FIELDS.includes(key) && key !== 'customFields' && key !== 'roomId') {
      deviceData.customFields[key] = deviceData[key];
      delete deviceData[key];
    }
  });

  // 自定义日期字段的值是 dayjs 对象，需格式化为 YYYY-MM-DD 后入库，避免与已有数据格式不一致
  Object.keys(deviceData.customFields).forEach(key => {
    if (dayjs.isDayjs(deviceData.customFields[key])) {
      deviceData.customFields[key] = deviceData.customFields[key].format('YYYY-MM-DD');
    }
  });

  delete deviceData.roomId;

  return deviceData;
};

export const getFormInitialValues = (device, racks) => {
  if (!device) return {};

  const deviceData = { ...device };
  const cleanDeviceData = {};

  FIXED_FIELDS.forEach(field => {
    if (deviceData[field] !== undefined) {
      cleanDeviceData[field] = deviceData[field];
    }
  });

  Object.entries(deviceData).forEach(([key, value]) => {
    if (
      !FIXED_FIELDS.includes(key) &&
      !SYSTEM_FIELDS.includes(key) &&
      key !== 'deviceId' &&
      typeof value !== 'object' &&
      value !== null
    ) {
      cleanDeviceData[key] = value;
    }
  });

  if (deviceData.customFields && typeof deviceData.customFields === 'object') {
    Object.entries(deviceData.customFields).forEach(([key, value]) => {
      cleanDeviceData[key] = value;
    });
  }

  if (device.rackId) {
    const rack = racks.find(r => r.rackId === device.rackId);
    if (rack) {
      cleanDeviceData.roomId = rack.roomId;
    }
  }

  return cleanDeviceData;
};

/**
 * 将表单值中的日期字段统一转换为 dayjs 对象
 * antd DatePicker 只接受 dayjs 对象；固定日期字段与自定义日期字段
 * （customFields 中的值）从接口取回时都是字符串，直接回填会导致
 * DatePicker 渲染时抛出 "date.isValid is not a function"
 * @param {Object} values - 待回填的表单值（原地修改）
 * @param {Array} fields - 字段配置列表，按 fieldType === 'date' 识别日期字段
 * @returns {Object} 转换后的表单值
 */
export const normalizeDateFieldValues = (values, fields = []) => {
  if (!values || typeof values !== 'object') return values;

  const dateFieldNames = new Set(['purchaseDate', 'warrantyExpiry']);
  (fields || [])
    .filter(field => field.fieldType === 'date')
    .forEach(field => dateFieldNames.add(field.fieldName));

  dateFieldNames.forEach(name => {
    const value = values[name];
    if (value === undefined || value === null || value === '' || dayjs.isDayjs(value)) return;
    const parsed = dayjs(value);
    values[name] = parsed.isValid() ? parsed : undefined;
  });

  return values;
};
