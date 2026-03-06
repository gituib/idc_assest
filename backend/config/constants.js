/**
 * 通用配置常量
 * 集中管理分页、文件上传、重试等配置
 */

module.exports = {
  PAGINATION: {
    DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 10,
    MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE, 10) || 1000,
    PAGE_SIZE_OPTIONS: [10, 20, 30, 50, 100],
  },
  
  FILE_UPLOAD: {
    MAX_FILE_SIZE: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50) * 1024 * 1024,
    MAX_AVATAR_SIZE: (parseInt(process.env.MAX_AVATAR_SIZE_MB, 10) || 5) * 1024 * 1024,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOC_TYPES: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  
  RETRY: {
    MAX_RETRIES: parseInt(process.env.MAX_RETRIES, 10) || 3,
    RETRY_DELAY: parseInt(process.env.RETRY_DELAY, 10) || 1000,
  },
  
  TIMEOUT: {
    API_TIMEOUT: parseInt(process.env.API_TIMEOUT, 10) || 30000,
    DB_QUERY_TIMEOUT: parseInt(process.env.DB_QUERY_TIMEOUT, 10) || 30000,
  },
  
  FRONTEND: {
    DEFAULT_PORT: parseInt(process.env.FRONTEND_PORT, 10) || 3000,
  },
};
