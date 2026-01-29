const Joi = require('joi');

// 机柜状态枚举
const RACK_STATUS = ['active', 'inactive', 'maintenance'];

// 创建机柜验证Schema
const createRackSchema = Joi.object({
  rackId: Joi.string()
    .required()
    .max(50)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .messages({
      'string.empty': '机柜ID不能为空',
      'string.max': '机柜ID不能超过50个字符',
      'string.pattern.base': '机柜ID只能包含字母、数字、下划线和横线',
      'any.required': '机柜ID是必填字段'
    }),

  name: Joi.string()
    .required()
    .max(100)
    .messages({
      'string.empty': '机柜名称不能为空',
      'string.max': '机柜名称不能超过100个字符',
      'any.required': '机柜名称是必填字段'
    }),

  height: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(42)
    .messages({
      'number.base': '高度必须是数字',
      'number.integer': '高度必须是整数',
      'number.min': '高度不能小于1',
      'number.max': '高度不能大于100'
    }),

  maxPower: Joi.number()
    .min(0)
    .max(1000000)
    .default(10000)
    .messages({
      'number.base': '最大功率必须是数字',
      'number.min': '最大功率不能小于0',
      'number.max': '最大功率不能超过1000000'
    }),

  currentPower: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.base': '当前功率必须是数字',
      'number.min': '当前功率不能小于0'
    }),

  status: Joi.string()
    .valid(...RACK_STATUS)
    .default('active')
    .messages({
      'any.only': `状态必须是以下之一: ${RACK_STATUS.join(', ')}`
    }),

  roomId: Joi.string()
    .required()
    .max(50)
    .messages({
      'string.empty': '机房ID不能为空',
      'string.max': '机房ID不能超过50个字符',
      'any.required': '机房ID是必填字段'
    }),

  description: Joi.string()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': '描述不能超过500个字符'
    })
});

// 更新机柜验证Schema
const updateRackSchema = Joi.object({
  rackId: Joi.string()
    .max(50)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .messages({
      'string.max': '机柜ID不能超过50个字符',
      'string.pattern.base': '机柜ID只能包含字母、数字、下划线和横线'
    }),

  name: Joi.string()
    .max(100)
    .messages({
      'string.max': '机柜名称不能超过100个字符'
    }),

  height: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .messages({
      'number.base': '高度必须是数字',
      'number.integer': '高度必须是整数',
      'number.min': '高度不能小于1',
      'number.max': '高度不能大于100'
    }),

  maxPower: Joi.number()
    .min(0)
    .max(1000000)
    .messages({
      'number.base': '最大功率必须是数字',
      'number.min': '最大功率不能小于0',
      'number.max': '最大功率不能超过1000000'
    }),

  currentPower: Joi.number()
    .min(0)
    .messages({
      'number.base': '当前功率必须是数字',
      'number.min': '当前功率不能小于0'
    }),

  status: Joi.string()
    .valid(...RACK_STATUS)
    .messages({
      'any.only': `状态必须是以下之一: ${RACK_STATUS.join(', ')}`
    }),

  roomId: Joi.string()
    .max(50),

  description: Joi.string()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': '描述不能超过500个字符'
    })
}).min(1).messages({
  'object.min': '至少需要提供一个字段进行更新'
});

// 查询机柜验证Schema
const queryRackSchema = Joi.object({
  roomId: Joi.string()
    .max(50)
    .allow(''),
  status: Joi.string()
    .valid(...RACK_STATUS, 'all')
    .allow(''),
  keyword: Joi.string()
    .max(100)
    .allow(''),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  pageSize: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
});

module.exports = {
  createRackSchema,
  updateRackSchema,
  queryRackSchema,
  RACK_STATUS
};
