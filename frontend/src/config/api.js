/**
 * API 相关配置
 * 集中管理 API 超时、分页、防抖等配置
 */

export const API_CONFIG = {
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT, 10) || 30000,
  
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  
  pagination: {
    defaultPageSize: 10,
    maxPageSize: 1000,
    pageSizeOptions: [10, 20, 30, 50, 100],
  },
  
  debounceDelay: 300,
  
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
  },
};

export default API_CONFIG;
