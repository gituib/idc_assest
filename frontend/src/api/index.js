import axios from 'axios';
import { API_CONFIG } from '../config/api';
import secureStorage, { TOKEN_KEY } from '../utils/secureStorage';

let maintenanceCallback = null;
let authInitialized = false;

export function setMaintenanceCallback(callback) {
  maintenanceCallback = callback;
}

export function setAuthInitialized(value) {
  authInitialized = value;
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
      if (authInitialized) {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/login')) {
          secureStorage.remove(TOKEN_KEY);
          secureStorage.remove('user');
          window.location.href = '/login';
        }
      }
    }
    // 维护模式拦截：503 + MAINTENANCE_MODE code
    if (error.response?.status === 503 && error.response?.data?.code === 'MAINTENANCE_MODE') {
      if (maintenanceCallback) {
        maintenanceCallback(true);
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

const PREMIUM_BASE_URL = import.meta.env.VITE_PREMIUM_API_BASE_URL || '/premium-api';

const premium = axios.create({
  baseURL: PREMIUM_BASE_URL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

premium.interceptors.request.use(config => {
  const token = secureStorage.get(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
premium.interceptors.response.use(
  response => response,
  error => Promise.reject(error)
);

export const premiumAPI = {};

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
        if (authInitialized) {
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
      }

      error.friendlyMessage = data.message || '请求失败';
      error.message = data.message || '请求失败';
      return Promise.reject(error);
    }

    if (error.code === 'ECONNABORTED') {
      // 必须 reject Error 对象：reject 字符串会让调用方的 err.message 变成 undefined，
      // 导致「无错误信息」的空白页（曾导致 Redfish 采集超时后弹窗空白）
      const timeoutError = new Error(`请求超时（${Math.round((error.config?.timeout || 0) / 1000)}s），请稍后重试`);
      timeoutError.code = 'ECONNABORTED';
      return Promise.reject(timeoutError);
    }

    const networkError = new Error('网络错误，请检查网络连接');
    networkError.code = 'NETWORK_ERROR';
    return Promise.reject(networkError);
  }
);

export const authAPI = {
  checkAdmin: () => api.post('/auth/check-admin'),
  register: data => api.post('/auth/register', data),
  login: data => api.post('/auth/login', data),
  unlock: data => api.post('/auth/unlock', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: data => api.put('/auth/profile', data),
  // 邮箱验证
  sendVerifyCode: email => api.post('/auth/send-verify-code', { email }),
  verifyEmail: (email, code) => api.post('/auth/verify-email', { email, code }),
  // 修改密码（已登录，旧密码校验）
  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
  // 找回密码（未登录）—— account 可为邮箱或用户名
  forgotPasswordSendCode: account =>
    api.post('/auth/forgot-password/send-code', { account }),
  forgotPasswordReset: (account, code, newPassword) =>
    api.post('/auth/forgot-password/reset', { account, code, newPassword }),
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
};

export const permissionAPI = {
  list: () => api.get('/permissions'),
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

/**
 * 通用图片附件 API
 * entity: 'devices' | 'consumables'（与后端 ENTITY_CONFIG 对应）
 */
export const imageAPI = {
  upload: (entity, id, file) => {
    const formData = new FormData();
    formData.append('entity', entity);
    formData.append('id', id);
    formData.append('image', file);
    return api.post('/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  remove: (entity, id, url) => api.delete('/images', { data: { entity, id, url } }),
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
  // 远端备份相关
  getRemoteTargets: () => api.get('/backup/remote/targets'),
  getRemoteSettings: () => api.get('/backup/remote/settings'),
  updateRemoteSettings: data => api.put('/backup/remote/settings', data),
  uploadToRemote: (filename, targetIds) =>
    api.post('/backup/remote/upload', { filename, targetIds }),
  testRemoteTarget: id => api.post(`/backup/remote/targets/${id}/test`),
};

export const systemSettingsAPI = {
  // SMTP 邮件服务配置
  getMailConfig: () => api.get('/system-settings/mail'),
  saveMailConfig: data => api.put('/system-settings/mail', data),
  sendTestMail: to => api.post('/system-settings/mail/test', { to }),
  // 关于系统：开源许可列表
  getLicenses: () => api.get('/system-settings/system/licenses'),
  // 在线更新：检查是否有新版本
  checkUpdate: () => api.get('/system-settings/system/check-update'),
};

/**
 * 拓扑布局 API
 * 用于持久化用户手动调整的拓扑图节点位置
 * layoutKey 格式:switch:{deviceId} 或 rack:{rackId}
 */
export const topologyAPI = {
  // 获取已保存的布局
  getLayout: (layoutKey) => api.get(`/topology/layout/${layoutKey}`).then(r => r.data),
  // 保存布局(upsert)
  saveLayout: (data) => api.post('/topology/layout', data).then(r => r.data),
  // 删除布局(重置为自动布局)
  deleteLayout: (layoutKey) => api.delete(`/topology/layout/${layoutKey}`).then(r => r.data),
};

/**
 * 设备采集凭据 API
 * 用于管理设备 SSH/SNMP/API 凭据（加密存储）
 * 注意：返回完整响应体 { success, data, message, ... }，调用方用 res.success 判断成败、
 * 用 res.data 取数据。与 ticketAPI / deviceAPI 等风格保持一致。
 * （此前每个方法尾部链了 .then(r => r.data) 把外层 { success, data } 解包成 data 值，
 *  导致组件 res.success 恒为 undefined 误判为失败、delete/test 直接 TypeError、list 永远空。）
 */
export const deviceCredentialAPI = {
  list: (params) => api.get('/device-credentials', { params }),
  create: (data) => api.post('/device-credentials', data),
  update: (id, data) => api.put(`/device-credentials/${id}`, data),
  delete: (id) => api.delete(`/device-credentials/${id}`),
  test: (id) => api.post(`/device-credentials/${id}/test`),
  getRaw: (id) => api.get(`/device-credentials/${id}/raw`),
};

/**
 * 端口自动采集 API
 * discover: 连接设备抓取端口列表并返回差异预览（不写库）
 * apply:  把差异预览的结果落库（幂等）
 */
export const portDiscoveryAPI = {
  // 注意：axios 响应拦截器已返回后端 body（{ success, vendor, diff, stats, ... }），
  // 这里不能再链 .then(r => r.data)，否则 body 无 data 字段会得到 undefined
  discover: (data) => api.post('/port-discovery/discover', data),
  apply: (data) => api.post('/port-discovery/apply', data),
};

/**
 * 前端错误日志上报 API
 * 用于将 window.onerror / unhandledrejection / ErrorBoundary 捕获的
 * 前端错误上报到后端，写入统一日志体系。
 * 注：实际上报在 frontendLogger.js 中使用原生 fetch（避免 axios 拦截器副作用造成循环上报）。
 */
export const frontendLogAPI = {
  report: (payload) => api.post('/frontend-logs', payload),
};

export default api;
