const Joi = require('joi');

// 创建机房验证Schema
const createRoomSchema = Joi.object({
  roomId: Joi.string()
    .required()
    .max(50)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .messages({
      'string.empty': '机房ID不能为空',
      'string.max': '机房ID不能超过50个字符',
      'string.pattern.base': '机房ID只能包含字母、数字、下划线和横线',
      'any.required': '机房ID是必填字段'
    }),

  name: Joi.string()
    .required()
    .max(100)
    .messages({
      'string.empty': '机房名称不能为空',
      'string.max': '机房名称不能超过100个字符',
      'any.required': '机房名称是必填字段'
    }),

  location: Joi.string()
    .max(200)
    .allow('', null)
    .messages({
      'string.max': '位置不能超过200个字符'
    }),

  area: Joi.number()
    .min(0)
    .max(1000000)
    .allow(null)
    .messages({
      'number.base': '面积必须是数字',
      'number.min': '面积不能小于0',
      'number.max': '面积不能超过1000000'
    }),

  capacity: Joi.number()
    .integer()
    .min(0)
    .max(10000)
    .allow(null)
    .messages({
      'number.base': '容量必须是数字',
      'number.integer': '容量必须是整数',
      'number.min': '容量不能小于0',
      'number.max': '容量不能超过10000'
    }),

  description: Joi.string()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': '描述不能超过500个字符'
    })
});

// 更新机房验证Schema
const updateRoomSchema = Joi.object({
  roomId: Joi.string()
    .max(50)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .messages({
      'string.max': '机房ID不能超过50个字符',
      'string.pattern.base': '机房ID只能包含字母、数字、下划线和横线'
    }),

  name: Joi.string()
    .max(100)
    .messages({
      'string.max': '机房名称不能超过100个字符'
    }),

  location: Joi.string()
    .max(200)
    .allow('', null)
    .messages({
      'string.max': '位置不能超过200个字符'
    }),

  area: Joi.number()
    .min(0)
    .max(1000000)
    .allow(null)
    .messages({
      'number.base': '面积必须是数字',
      'number.min': '面积不能小于0',
      'number.max': '面积不能超过1000000'
    }),

  capacity: Joi.number()
    .integer()
    .min(0)
    .max(10000)
    .allow(null)
    .messages({
      'number.base': '容量必须是数字',
      'number.integer': '容量必须是整数',
      'number.min': '容量不能小于0',
      'number.max': '容量不能超过10000'
    }),

  description: Joi.string()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': '描述不能超过500个字符'
    })
}).min(1).messages({
  'object.min': '至少需要提供一个字段进行更新'
});

module.exports = {
  createRoomSchema,
  updateRoomSchema
};
