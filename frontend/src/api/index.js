import axios from 'axios';
import { API_CONFIG } from '../config/api';
import secureStorage, { TOKEN_KEY } from '../utils/secureStorage';

let maintenanceCallback = null;

export function setMaintenanceCallback(callback) {
  maintenanceCallback = callback;
}

// 给全局 axios 默认实例添加 Token 拦截器
// 确保所有页面中直接使用 axios.get/post 的请求也能自动携带 Token
axios.interceptors.request.use(config => {
  const token = secureStorage.get(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/login')) {
        secureStorage.remove(TOKEN_KEY);
        secureStorage.remove('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  config => {
    const token = secureStorage.get(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 开发环境下安全日志：过滤敏感字段
    if (process.env.NODE_ENV === 'development') {
      const sensitiveFields = ['password', 'oldPassword', 'newPassword', 'confirmPassword'];
      const safeData = config.data ? { ...config.data } : null;
      if (safeData) {
        sensitiveFields.forEach(field => {
          if (safeData[field]) safeData[field] = '***';
        });
      }
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, safeData || '');
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  response => {
    if (response.config.responseType === 'blob') {
      return response;
    }
    return response.data;
  },
  error => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 503 && data?.maintenance) {
        if (maintenanceCallback) {
          maintenanceCallback(data.maintenance);
        }
        return Promise.reject(new Error('系统维护中'));
      }

      if (status === 401) {
        const currentPath = window.location.pathname;

        if (!currentPath.startsWith('/login')) {
          secureStorage.remove(TOKEN_KEY);
          secureStorage.remove('user');
          if (window.__navigate) {
            window.__navigate('/login');
          } else {
            window.location.href = '/login';
          }
        }
      }

      error.friendlyMessage = data.message || '请求失败';
      error.message = data.message || '请求失败';
      return Promise.reject(error);
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject('请求超时，请稍后重试');
    }

    return Promise.reject('网络错误，请检查网络连接');
  }
);

export const authAPI = {
  checkAdmin: () => api.post('/auth/check-admin'),
  register: data => api.post('/auth/register', data),
  login: data => api.post('/auth/login', data),
  unlock: data => api.post('/auth/unlock', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: data => api.put('/auth/profile', data),
  changePassword: data => api.put('/auth/password', data),
};

export const userAPI = {
  list: params => api.get('/users', { params }),
  all: () => api.get('/users/all'),
  get: userId => api.get(`/users/${userId}`),
  create: data => api.post('/users', data),
  update: (userId, data) => api.put(`/users/${userId}`, data),
  resetPassword: (userId, data) => api.put(`/users/${userId}/password`, data),
  delete: userId => api.delete(`/users/${userId}`),
  uploadAvatar: (userId, file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post(`/users/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAvatar: userId => api.delete(`/users/${userId}/avatar`),
  approve: userId => api.put(`/users/${userId}/approve`),
  reject: userId => api.put(`/users/${userId}/reject`),
};

export const roleAPI = {
  list: params => api.get('/roles', { params }),
  all: () => api.get('/roles/all'),
  get: roleId => api.get(`/roles/${roleId}`),
  create: data => api.post('/roles', data),
  update: (roleId, data) => api.put(`/roles/${roleId}`, data),
  delete: roleId => api.delete(`/roles/${roleId}`),
  initRoles: () => api.post('/roles/init-roles'),
};

export const loginHistoryAPI = {
  list: params => api.get('/login-history', { params }),
  getByUser: (userId, params) => api.get(`/login-history/user/${userId}`, { params }),
  delete: id => api.delete(`/login-history/${id}`),
  clear: data => api.delete('/login-history', { data }),
};

export const operationLogAPI = {
  list: params => api.get('/operation-logs', { params }),
  getActions: () => api.get('/operation-logs/actions'),
  getModules: () => api.get('/operation-logs/modules'),
  delete: id => api.delete(`/operation-logs/${id}`),
  clear: data => api.delete('/operation-logs', { data }),
};

export const deviceAPI = {
  list: params => api.get('/devices', { params }),
  get: deviceId => api.get(`/devices/${deviceId}`),
  create: data => api.post('/devices', data),
  update: (deviceId, data) => api.put(`/devices/${deviceId}`, data),
  delete: deviceId => api.delete(`/devices/${deviceId}`),
  getTickets: (deviceId, params) => api.get(`/devices/${deviceId}/tickets`, { params }),
  checkPosition: (rackId, params) => api.get(`/devices/check-position/${rackId}`, { params }),
  importPreview: file => {
    const formData = new FormData();
    formData.append('csvFile', file);
    return api.post('/devices/import-preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  import: file => {
    const formData = new FormData();
    formData.append('csvFile', file);
    return api.post('/devices/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getImportTemplate: () => api.get('/devices/import-template', { responseType: 'blob' }),
  exportDevices: params => api.get('/devices/export', { params, responseType: 'blob' }),
};

export const ticketAPI = {
  list: params => api.get('/tickets', { params }),
  get: ticketId => api.get(`/tickets/${ticketId}`),
  create: data => api.post('/tickets', data),
  update: (ticketId, data) => api.put(`/tickets/${ticketId}`, data),
  delete: ticketId => api.delete(`/tickets/${ticketId}`),
  assign: (ticketId, data) => api.put(`/tickets/${ticketId}/assign`, data),
  transfer: (ticketId, data) => api.put(`/tickets/${ticketId}/transfer`, data),
  process: (ticketId, data) => api.put(`/tickets/${ticketId}/process`, data),
  close: (ticketId, data) => api.put(`/tickets/${ticketId}/close`, data),
  reopen: (ticketId, data) => api.put(`/tickets/${ticketId}/reopen`, data),
  getOperations: ticketId => api.get(`/tickets/${ticketId}/operations`),
  getStatistics: params => api.get('/tickets/statistics', { params }),
};

export const ticketCategoryAPI = {
  list: params => api.get('/ticket-categories', { params }),
  get: code => api.get(`/ticket-categories/${code}`),
  create: data => api.post('/ticket-categories', data),
  update: (code, data) => api.put(`/ticket-categories/${code}`, data),
  delete: code => api.delete(`/ticket-categories/${code}`),
  tree: () => api.get('/ticket-categories/tree'),
  init: () => api.post('/ticket-categories/init'),
};

export const backupAPI = {
  list: () => api.get('/backup/list'),
  create: (data = {}) => api.post('/backup', data),
  validate: filename => api.get(`/backup/validate/${filename}`),
  restore: (filename, options = {}) => api.post('/backup/restore', { filename, options }),
  download: filename => api.get(`/backup/download/${filename}`, { responseType: 'blob' }),
  delete: filename => api.delete(`/backup/${filename}`),
  upload: file => {
    const formData = new FormData();
    formData.append('backup', file);
    return api.post('/backup/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  info: () => api.get('/backup/info'),
  getAutoStatus: () => api.get('/backup/auto/status'),
  updateAutoSettings: data => api.post('/backup/auto/settings', data),
  executeNow: data => api.post('/backup/auto/execute', data),
  testCron: data => api.post('/backup/auto/test-cron', data),
  getLogs: params => api.get('/backup/logs', { params }),
  getLogDetail: id => api.get(`/backup/logs/${id}`),
  cleanOldLogs: days => api.delete('/backup/logs/clean', { params: { days } }),
};

export default api;
