const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    const data = source === 'query' ? req.query : req.body;
    
    try {
      let value;
      
      if (schema.validate && typeof schema.validate === 'function') {
        const result = schema.validate(data, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: source === 'query'
        });
        
        if (result && typeof result.then === 'function') {
          value = await result;
        } else if (result && result.error) {
          const errorMessages = result.error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }));
          return res.status(400).json({
            error: '参数验证失败',
            details: errorMessages
          });
        } else if (result && result.value !== undefined) {
          value = result.value;
        } else {
          value = result;
        }
      } else if (schema.validateAsync) {
        value = await schema.validateAsync(data, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: source === 'query'
        });
      } else {
        const result = schema.validate(data, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: source === 'query'
        });
        if (result.error) {
          const errorMessages = result.error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }));
          return res.status(400).json({
            error: '参数验证失败',
            details: errorMessages
          });
        }
        value = result.value;
      }

      if (source === 'query') {
        req.query = value;
      } else {
        req.body = value;
      }

      next();
    } catch (error) {
      if (error.details) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        return res.status(400).json({
          error: '参数验证失败',
          details: errorMessages
        });
      }

      console.error('验证中间件错误:', error);
      return res.status(500).json({
        error: '验证过程发生错误',
        message: error.message
      });
    }
  };
};

const validateQuery = (schema) => validate(schema, 'query');

const validateBody = (schema) => validate(schema, 'body');

module.exports = {
  validate,
  validateQuery,
  validateBody
};
