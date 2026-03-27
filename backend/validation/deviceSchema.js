const Joi = require('joi');

const DEVICE_TYPES = ['server', 'switch', 'router', 'storage', 'other'];
const DEVICE_STATUS = ['running', 'maintenance', 'offline', 'fault', 'idle'];

const createDeviceSchema = Joi.object({
  name: Joi.string().required().max(100).messages({
    'string.empty': '设备名称不能为空',
    'string.max': '设备名称不能超过100个字符',
    'any.required': '设备名称是必填字段',
  }),
  type: Joi.string()
    .required()
    .valid(...DEVICE_TYPES)
    .messages({
      'any.only': `设备类型必须是以下之一: ${DEVICE_TYPES.join(', ')}`,
      'any.required': '设备类型是必填字段',
    }),
  model: Joi.string().allow('', null).max(100),
  serialNumber: Joi.string().required().max(100).messages({
    'string.empty': '序列号不能为空',
    'string.max': '序列号不能超过100个字符',
    'any.required': '序列号是必填字段',
  }),
  rackId: Joi.string().allow('', null).max(50),
  position: Joi.number().integer().min(1).max(100).allow(null),
  height: Joi.number().integer().min(1).max(50).allow(null),
  powerConsumption: Joi.number().min(0).max(100000).allow(null),
  ipAddress: Joi.string().allow('', null).max(50),
  status: Joi.string()
    .valid(...DEVICE_STATUS)
    .default('offline'),
  purchaseDate: Joi.date().allow(null),
  warrantyExpiry: Joi.date().allow(null),
  description: Joi.string().allow('', null).max(500),
  customFields: Joi.object().allow(null),
});

const updateDeviceSchema = Joi.object({
  name: Joi.string().max(100).messages({
    'string.empty': '设备名称不能为空',
    'string.max': '设备名称不能超过100个字符',
  }),
  type: Joi.string()
    .valid(...DEVICE_TYPES)
    .messages({
      'any.only': `设备类型必须是以下之一: ${DEVICE_TYPES.join(', ')}`,
    }),
  model: Joi.string().allow('', null).max(100),
  serialNumber: Joi.string().max(100).messages({
    'string.max': '序列号不能超过100个字符',
  }),
  rackId: Joi.string().allow('', null).max(50),
  position: Joi.number().integer().min(1).max(100).allow(null),
  height: Joi.number().integer().min(1).max(50).allow(null),
  powerConsumption: Joi.number().min(0).max(100000).allow(null),
  ipAddress: Joi.string().allow('', null).max(50),
  status: Joi.string().valid(...DEVICE_STATUS),
  purchaseDate: Joi.date().allow(null),
  warrantyExpiry: Joi.date().allow(null),
  description: Joi.string().allow('', null).max(500),
  customFields: Joi.object().allow(null),
})
  .min(1)
  .messages({
    'object.min': '至少需要提供一个字段进行更新',
  });

const batchDeviceIdsSchema = Joi.object({
  deviceIds: Joi.array().items(Joi.string().required()).min(1).required().messages({
    'array.base': '设备ID列表必须是数组',
    'array.min': '至少需要提供一个设备ID',
    'any.required': '设备ID列表是必填字段',
  }),
});

const batchStatusSchema = Joi.object({
  deviceIds: Joi.array().items(Joi.string().required()).min(1).required().messages({
    'array.base': '设备ID列表必须是数组',
    'array.min': '至少需要提供一个设备ID',
    'any.required': '设备ID列表是必填字段',
  }),
  status: Joi.string()
    .valid(...DEVICE_STATUS)
    .required()
    .messages({
      'any.only': `状态必须是以下之一: ${DEVICE_STATUS.join(', ')}`,
      'any.required': '状态是必填字段',
    }),
});

const batchMoveSchema = Joi.object({
  deviceIds: Joi.array().items(Joi.string().required()).min(1).required(),
  targetRackId: Joi.string().required().max(50).messages({
    'string.empty': '目标机柜ID不能为空',
    'any.required': '目标机柜ID是必填字段',
  }),
  startPosition: Joi.number().integer().min(1).allow(null),
});

const queryDeviceSchema = Joi.object({
  keyword: Joi.string().max(100).allow(''),
  status: Joi.string()
    .valid(...DEVICE_STATUS, 'all')
    .allow(''),
  type: Joi.string()
    .valid(...DEVICE_TYPES, 'all')
    .allow(''),
  rackId: Joi.string().max(50).allow(''),
  roomId: Joi.string().max(50).allow(''),
  isIdle: Joi.boolean().allow('').optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(10000).default(10),
});

module.exports = {
  createDeviceSchema,
  updateDeviceSchema,
  batchDeviceIdsSchema,
  batchStatusSchema,
  batchMoveSchema,
  queryDeviceSchema,
  DEVICE_TYPES,
  DEVICE_STATUS,
};
