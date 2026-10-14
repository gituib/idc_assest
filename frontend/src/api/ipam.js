/**
 * IPAM API 封装
 * IP 地址管理模块所有后端接口调用
 */
import api from './index';

export const ipamAPI = {
  // ========== CIDR 工具接口 ==========
  /** 解析 CIDR 返回网段信息 */
  parseCidr: (cidr) => api.post('/ipam/parse-cidr', { cidr }),
  /** 检测所有网段之间的冲突 */
  getConflicts: () => api.get('/ipam/conflicts'),

  // ========== 网段接口 ==========
  /** 获取网段树（完整嵌套结构） */
  getSubnets: () => api.get('/ipam/subnets'),
  /** 创建网段 */
  createSubnet: (data) => api.post('/ipam/subnets', data),
  /** 获取网段详情 */
  getSubnet: (id) => api.get(`/ipam/subnets/${id}`),
  /** 更新网段 */
  updateSubnet: (id, data) => api.put(`/ipam/subnets/${id}`, data),
  /** 删除网段（级联删除，force=true 强制删除有绑定 IP 的网段） */
  deleteSubnet: (id, force = false) =>
    api.delete(`/ipam/subnets/${id}`, { params: force ? { force: 'true' } : {} }),
  /** 获取网段占用统计 */
  getSubnetStats: (id) => api.get(`/ipam/subnets/${id}/stats`),

  // ========== IP 地址接口 ==========
  /** 获取网段下 IP 列表 */
  listIps: (subnetId, params = {}) =>
    api.get(`/ipam/subnets/${subnetId}/ips`, { params }),
  /** 获取单个 IP 详情 */
  getIp: (id) => api.get(`/ipam/ips/${id}`),
  /** 更新 IP 状态/标签/备注 */
  updateIp: (id, data) => api.put(`/ipam/ips/${id}`, data),
  /** 批量修改 IP 状态 */
  batchStatus: (data) => api.post('/ipam/ips/batch-status', data),
  /** 手动批量添加 IP */
  batchCreate: (data) => api.post('/ipam/ips/batch-create', data),

  // IP-设备绑定/解绑
  bindIp: (id, data) => api.patch(`/ipam/ips/${id}/bind`, data),
  unbindIp: (id) => api.patch(`/ipam/ips/${id}/unbind`, {}),
  batchBindIp: (items) => api.post('/ipam/ips/batch-bind', { items }),
  /** 删除 IP */
  deleteIp: (id) => api.delete(`/ipam/ips/${id}`),

  // ========== 搜索 ==========
  /** 全局 IP 搜索（跨网段） */
  search: (q) => api.get('/ipam/search', { params: { q } }),

  // ========== 在线探测 ==========
  /** 读取探测全局配置 */
  getProbeConfig: () => api.get('/ipam/probe/config'),
  /** 保存探测全局配置 */
  saveProbeConfig: (data) => api.put('/ipam/probe/config', data),
  /** 探测单个 IP */
  probeSingle: (ip) => api.post('/ipam/probe/single', { ip }),
  /** 批量探测 IP 列表，detail=true 时返回完整结果 */
  probeBatch: (ips, detail = false) => api.post('/ipam/probe/batch', { ips, detail }),
  /** 探测整个网段下所有 IP */
  probeSubnet: (subnetId) => api.post(`/ipam/probe/subnet/${subnetId}`),
};

export default ipamAPI;
