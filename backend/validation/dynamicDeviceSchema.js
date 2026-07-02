/**
 * 动态设备字段验证Schema生成器
 * 根据数据库DeviceField表的配置动态生成Joi验证Schema
 * 系统核心字段(name/serialNumber/position/height)强制锁定必填
 */

const Joi = require('joi');
const DeviceField = require('../models/DeviceField');

const DEVICE_TYPES = ['server', 'switch', 'router', 'storage', 'other'];
const DEVICE_STATUS = ['running', 'maintenance', 'offline', 'fault', 'idle'];

// 强制锁定必填的字段（不受字段管理配置影响）
const FORCE_REQUIRED_FIELDS = ['name', 'serialNumber', 'position', 'height'];

/**
 * 根据字段配置生成单个字段的Joi校验器
 * @param {Object} field - DeviceField数据库记录
 * @param {boolean} isUpdate - 是否为更新模式
 * @returns {Joi.AnySchema} 该字段对应的Joi校验器
 */
function buildFieldValidator(field, isUpdate) {
  const { fieldName, required: fieldRequired } = field;
  // 系统核心字段强制必填
  const isRequired = FORCE_REQUIRED_FIELDS.includes(fieldName) || fieldRequired;

  let validator;

  switch (fieldName) {
    case 'name':
      validator = Joi.string().max(100).messages({
        'string.empty': '设备名称不能为空',
        'string.max': '设备名称不能超过100个字符',
        'any.required': '设备名称是必填字段',
      });
      if (isRequired && !isUpdate) validator = validator.required();
      else validator = validator.allow('', null);
      break;

    case 'type': {
      // 从字段配置动态提取允许的设备类型值，options 为空时回退到默认值
      const allowedTypes = Array.isArray(field.options) && field.options.length > 0
        ? field.options.map(opt => (opt && opt.value !== undefined ? opt.value : opt))
        : DEVICE_TYPES;
      validator = Joi.string().valid(...allowedTypes).messages({
        'any.only': `设备类型必须是以下之一: ${allowedTypes.join(', ')}`,
        'any.required': '设备类型是必填字段',
      });
      if (isRequired && !isUpdate) validator = validator.required();
      break;
    }

    case 'serialNumber':
      validator = Joi.string().max(100).messages({
        'string.empty': '序列号不能为空',
        'string.max': '序列号不能超过100个字符',
        'any.required': '序列号是必填字段',
      });
      if (isRequired && !isUpdate) validator = validator.required();
      else validator = validator.allow('', null);
      break;

    case 'rackId':
      validator = Joi.string().allow('', null).max(50);
      break;

    case 'position':
      validator = Joi.number().integer().min(1).max(100).allow(null);
      break;

    case 'height':
      validator = Joi.number().integer().min(1).max(50).allow(null);
      break;

    case 'powerConsumption':
      validator = Joi.number().min(0).max(100000).allow(null);
      break;

    case 'status':
      validator = Joi.string().valid(...DEVICE_STATUS).default('offline');
      break;

    case 'model':
      validator = Joi.string().allow('', null).max(100);
      break;

    case 'ipAddress':
      validator = Joi.string().allow('', null).max(50);
      break;

    case 'description':
      validator = Joi.string().allow('', null).max(500);
      break;

    case 'purchaseDate':
    case 'warrantyExpiry':
      validator = Joi.date().allow(null);
      break;

    case 'brand':
      validator = Joi.string().allow('', null).max(100);
      break;

    default:
      // 自定义字段走宽松校验
      validator = Joi.any().allow(null);
  }

  return validator;
}

/**
 * 动态生成设备创建/更新的Joi Schema
 * 每次请求时从DeviceField表读取最新配置
 * @param {boolean} isUpdate - 是否为更新模式
 * @returns {Promise<Joi.ObjectSchema>} 动态生成的Joi Schema
 */
async function createDeviceSchema(isUpdate = false) {
  // 查询所有字段配置
  const fieldConfigs = await DeviceField.findAll({
    order: [['order', 'ASC']],
  });

  const schemaMap = {};

  // 根据字段配置动态生成每个字段的校验器
  fieldConfigs.forEach(field => {
    schemaMap[field.fieldName] = buildFieldValidator(field, isUpdate);
  });

  // 补充customFields（不在DeviceField表中）
  schemaMap.customFields = Joi.object().allow(null);

  let schema = Joi.object(schemaMap);

  // 更新模式要求至少传一个字段
  if (isUpdate) {
    schema = schema.min(1).messages({
      'object.min': '至少需要提供一个字段进行更新',
    });
  }

  return schema;
}

module.exports = {
  createDeviceSchema,
  DEVICE_TYPES,
  DEVICE_STATUS,
  FORCE_REQUIRED_FIELDS,
};
