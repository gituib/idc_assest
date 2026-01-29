/**
 * 请求参数验证中间件
 * 使用Joi进行参数校验
 */

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : req.body;
    
    const { error, value } = schema.validate(data, {
      abortEarly: false, // 返回所有错误
      stripUnknown: true, // 移除未定义的字段
      allowUnknown: source === 'query' // 查询参数允许未知字段
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: '参数验证失败',
        details: errorMessages
      });
    }

    // 将验证后的值替换到请求对象
    if (source === 'query') {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
};

// 验证查询参数
const validateQuery = (schema) => validate(schema, 'query');

// 验证请求体
const validateBody = (schema) => validate(schema, 'body');

module.exports = {
  validate,
  validateQuery,
  validateBody
};
