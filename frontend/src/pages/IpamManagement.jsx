/**
 * IP 地址管理主页面（重构版）
 * 左侧网段树 + 右侧工作区（网段信息卡 + 使用率仪表 + IP 列表）
 *
 * 重构要点：
 * - 顶部全局搜索（跨网段搜索 IP / 网段名）
 * - 左侧网段树：顶部统计概览、增强筛选、空状态引导、节点显示使用率条
 * - 右侧面包屑：显示完整父级路径 + 快速跳转
 * - 网段信息卡：Descriptions 紧凑布局
 * - 使用率仪表 + KPI 紧凑卡片
 * - IP 列表：批量选择 + 批量操作 toolbar、状态 chip 快速筛选、行内快速切换状态、空状态 / skeleton 加载
 * - Modal 优化：SubnetFormModal CIDR 实时预览，IpEditModal 状态快速按钮
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Tree,
  Button,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Table,
  Space,
  Modal,
  Input,
  Select,
  Tooltip,
  Breadcrumb,
  Progress,
  message,
  Empty,
  Dropdown,
  Divider,
  Segmented,
  Tooltip as AntTooltip,
  Popover,
  Badge,
  Descriptions,
  Skeleton,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  BarsOutlined,
  ApiOutlined,
  GlobalOutlined,
  FilterOutlined,
  ClearOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  TeamOutlined,
  CloudServerOutlined,
  SwapOutlined,
  StopOutlined,
  CopyOutlined,
  FileTextOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  EnvironmentOutlined,
  DatabaseOutlined,
  ControlOutlined,
} from '@ant-design/icons';
import useSWR from 'swr';
import axios from 'axios';
import api from '../api';
import { ipamAPI } from '../api/ipam';
import SubnetFormModal from '../components/ipam/SubnetFormModal';
import IpMatrix from '../components/ipam/IpMatrix';
import IpEditModal from '../components/ipam/IpEditModal';
import BindDeviceModal from '../components/ipam/BindDeviceModal';
import DeviceDetailDrawer from '../components/DeviceDetailDrawer';

const { Sider, Content } = Layout;
const { confirm } = Modal;

// IP 状态配置（统一来源，带颜色/图标/文案）
const STATUS_CONFIG = {
  free:    { label: '空闲',  tagColor: 'default',  chipColor: 'default',   dotColor: '#bfbfbf', icon: <CopyOutlined /> },
  used:    { label: '已用',  tagColor: 'blue',     chipColor: 'blue',      dotColor: '#1677ff', icon: <CloudServerOutlined /> },
  reserved:{ label: '预留',  tagColor: 'orange',   chipColor: 'orange',    dotColor: '#fa8c16', icon: <ExperimentOutlined /> },
  gateway: { label: '网关',  tagColor: 'green',    chipColor: 'green',     dotColor: '#52c41a', icon: <GlobalOutlined /> },
  excluded:{ label: '排除',  tagColor: 'default',  chipColor: 'default',   dotColor: '#595959', icon: <StopOutlined /> },
};

const STATUS_KEYS = ['free', 'used', 'reserved', 'gateway', 'excluded'];

// IP 业务类型配置（固定枚举，后端枚举同步）
const IP_TYPE_CONFIG = {
  management: { label: '带外管理', color: '#ff4d4f', tagColor: 'red' },
  business:   { label: '带内业务', color: '#1677ff', tagColor: 'blue' },
  public:     { label: '公网出口', color: '#52c41a', tagColor: 'green' },
  storage:    { label: '存储网络', color: '#722ed1', tagColor: 'purple' },
  other:      { label: '其他',     color: '#8c8c8c', tagColor: 'default' },
};
const IP_TYPE_KEYS = ['management', 'business', 'public', 'storage', 'other'];

/** 使用率颜色映射 */
function usageColor(pct) {
  if (pct >= 90) return '#ff4d4f';
  if (pct >= 70) return '#fa8c16';
  if (pct >= 40) return '#1677ff';
  return '#52c41a';
}

/**
 * 文本关键词高亮（React Fragment 方式，避免 dangerouslySetInnerHTML）
 * @param {string} text - 原文本
 * @param {string} keyword - 关键词（空则返回原文本）
 * @returns {React.ReactNode}
 */
function highlightText(text, keyword) {
  if (!keyword || !text) return text;
  const kw = keyword.trim();
  if (!kw) return text;
  const lower = text.toLowerCase();
  const kwLower = kw.toLowerCase();
  const idx = lower.indexOf(kwLower);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#ffe58f', color: '#000', borderRadius: 2, padding: '0 2px' }}>
        {text.slice(idx, idx + kw.length)}
      </mark>
      {text.slice(idx + kw.length)}
    </>
  );
}

/**
 * 安全展示主机数（支持 IPv6 超大整数）
 * - IPv4：usableHosts = totalHosts - 2（常规网段）或 totalHosts（/31 / /32），用千分位
 * - IPv6：usableHosts = totalHosts = 2^(128-prefixLength)，超过 1e15 简化为 2^N
 * - full 属性保留原始值供 Tooltip 显示
 */
function safeFormatHosts(val, options = {}) {
  const { ipv6Hint = false, prefixLength = null } = options;
  if (val === null || val === undefined) return { display: '0', full: '0' };

  const rawStr = String(val);
  const num = Number(rawStr);

  // 零值 / 非数字兜底
  if (isNaN(num) || num <= 0) {
    if (ipv6Hint && prefixLength !== null) {
      return { display: `2^${128 - prefixLength}`, full: rawStr };
    }
    return { display: rawStr, full: rawStr };
  }

  // IPv6 超大数：简化为 2^N（usableHosts = totalHosts，IPv6 不减 2）
  if (ipv6Hint && prefixLength !== null && num > 1e15) {
    return { display: `2^${128 - prefixLength}`, full: rawStr };
  }

  // 安全整数范围内：千分位
  if (num <= Number.MAX_SAFE_INTEGER) {
    return { display: num.toLocaleString(), full: rawStr };
  }

  // 超大 IPv4（罕见，/8 网段 usable 约 1677 万不会到这）：科学计数法
  const exp = Math.floor(Math.log10(num));
  const mantissa = num / Math.pow(10, exp);
  const display = `${mantissa.toFixed(2)} × 10^${exp}`;
  return { display, full: rawStr };
}

/**
 * 为 safeFormatHosts 返回对象生成 Tooltip 内容
 * @param {{display: string, full: string}|string} result - safeFormatHosts 结果或纯字符串
 * @returns {{ value: string, tooltip: string|null }}
 */
function formatWithTooltip(result) {
  if (typeof result === 'string') return { value: result, tooltip: null };
  if (result?.display !== undefined) {
    const tooltip = result.full && result.full !== result.display ? result.full : null;
    return { value: result.display, tooltip };
  }
  return { value: String(result ?? ''), tooltip: null };
}

// --- 网段详情卡片样式常量 ---
const groupBoxStyle = {
  background: '#fafafa',
  border: '1px solid #f0f0f0',
  borderRadius: 6,
  padding: '10px 12px',
};
const groupTitleStyle = {
  fontSize: 11,
  color: '#8c8c8c',
  marginBottom: 8,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

/**
 * 网段详情中的单行信息（label + value）
 * @param {Object} props
 * @param {string} props.label - 标签
 * @param {string|{value:string, tooltip:string|null}} props.value - 值或 formatWithTooltip 结果
 * @param {boolean} [props.copyable] - 是否显示复制按钮
 * @param {boolean} [props.last] - 是否是该组最后一项（控制 border）
 */
function InfoRow({ label, value, copyable = false, last = false }) {
  // 兼容直接传字符串 / 数字 / null
  let displayVal, tooltipVal = null;
  if (value && typeof value === 'object' && 'value' in value) {
    displayVal = value.value;
    tooltipVal = value.tooltip;
  } else {
    displayVal = value;
  }

  const isEmpty = !displayVal || displayVal === '—' || displayVal === '';
  const finalVal = displayVal || '—';

  const valueNode = (
    <span
      style={{
        fontFamily: 'monospace',
        fontSize: 13,
        color: isEmpty ? '#bfbfbf' : '#1a1a1a',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: 'inline-block',
        maxWidth: '100%',
        lineHeight: 1.4,
      }}
      title={tooltipVal || (typeof finalVal === 'string' && finalVal.length > 30 ? finalVal : undefined)}
    >
      {finalVal}
    </span>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: last ? '3px 0 0' : '0 0 3px',
        borderBottom: last ? 'none' : '1px dashed #f0f0f0',
        minHeight: 22,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: '#8c8c8c',
          width: 68,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {valueNode}
      </span>
      {copyable && !isEmpty && (
        <CopyOutlined
          style={{
            fontSize: 11,
            color: '#bfbfbf',
            marginLeft: 4,
            flexShrink: 0,
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard?.writeText(String(finalVal));
          }}
        />
      )}
    </div>
  );
}

// ==================== 网段树节点渲染 ====================

/**
 * 递归将网段树转为 Ant Design Tree 的 dataSource 格式
 * 节点显示：名称 + CIDR + 子网段数 + 使用率迷你条
 * @param {Array} subnets - 原始网段数据
 * @param {string} selectedId - 当前选中的网段 ID
 * @param {string} keyword - 搜索关键词（用于高亮）
 */
function buildTreeData(subnets, selectedId, keyword = '') {
  return subnets.map(s => {
    const usagePercent = s.usageRate || 0;
    const active = selectedId === s.subnetId;
    return {
      key: s.subnetId,
      title: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            width: '100%',
            padding: '2px 0',
          }}
        >
          <span
            style={{
              fontWeight: active ? 600 : 500,
              fontSize: 13,
              color: active ? '#1677ff' : 'inherit',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 96,
            }}
          >
            {highlightText(s.name, keyword)}
          </span>
          {/* IPv4/IPv6 版本小标签 */}
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              padding: '0 3px',
              borderRadius: 2,
              lineHeight: '14px',
              background: s.ipVersion === 'ipv6' ? '#f9f0ff' : '#e6f4ff',
              color: s.ipVersion === 'ipv6' ? '#722ed1' : '#1677ff',
              border: s.ipVersion === 'ipv6' ? '1px solid #d3adf7' : '1px solid #91caff',
              flexShrink: 0,
            }}
          >
            {s.ipVersion === 'ipv6' ? 'v6' : 'v4'}
          </span>
          <Tooltip title={s.cidr} mouseEnterDelay={0.4}>
            <span
              style={{
                color: '#8c8c8c',
                fontSize: 11,
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                minWidth: 0,
              }}
            >
              {highlightText(s.cidr, keyword)}
            </span>
          </Tooltip>
          {s.children?.length > 0 && (
            <span style={{ color: '#bfbfbf', fontSize: 10, marginLeft: 2 }}>
              ({s.children.length})
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 36,
                height: 3,
                background: '#f0f0f0',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${usagePercent}%`,
                  height: '100%',
                  background: usageColor(usagePercent),
                  borderRadius: 2,
                  transition: 'width 300ms ease',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 10,
                color: usagePercent >= 90 ? '#ff4d4f' : '#8c8c8c',
                minWidth: 28,
                textAlign: 'right',
              }}
            >
              {usagePercent}%
            </span>
          </div>
        </div>
      ),
      subnet: s,
      children: s.children?.length > 0 ? buildTreeData(s.children, selectedId, keyword) : undefined,
    };
  });
}

/**
 * 递归过滤树（名称或 CIDR 包含关键字时保留，父节点被命中时保留子节点展示）
 */
function filterTree(nodes, keyword) {
  if (!keyword) return nodes;
  const kw = keyword.toLowerCase();
  return nodes.reduce((acc, node) => {
    const subnet = node.subnet;
    const selfMatch =
      subnet.name.toLowerCase().includes(kw) ||
      subnet.cidr.toLowerCase().includes(kw);
    const filteredChildren = node.children ? filterTree(node.children, keyword) : null;
    if (selfMatch || (filteredChildren && filteredChildren.length > 0)) {
      acc.push({ ...node, children: filteredChildren });
    }
    return acc;
  }, []);
}

/**
 * 递归把网段树拍平，用于构建面包屑路径、统计概览
 */
function flattenTree(nodes, depth = 0, parent = null, result = []) {
  for (const n of nodes) {
    result.push({ node: n, depth, parent });
    if (n.children?.length > 0) {
      flattenTree(n.children, depth + 1, n, result);
    }
  }
  return result;
}

/**
 * 根据 subnetId 反查祖先链，用于面包屑
 */
function findAncestorPath(nodes, targetId, path = []) {
  for (const n of nodes) {
    const currentPath = [...path, n];
    if (n.subnetId === targetId) return currentPath;
    if (n.children?.length > 0) {
      const found = findAncestorPath(n.children, targetId, currentPath);
      if (found) return found;
    }
  }
  return null;
}

// ==================== 主组件 ====================

export default function IpamManagement() {
  const navigate = useNavigate();

  // --- 左侧网段树状态 ---
  const [selectedSubnetId, setSelectedSubnetId] = useState(null);
  const [treeKeyword, setTreeKeyword] = useState('');
  const [expandedKeys, setExpandedKeys] = useState([]);

  // --- 右侧工作区状态 ---
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'matrix'
  const [ipStatusFilter, setIpStatusFilter] = useState(undefined);
  const [ipKeyword, setIpKeyword] = useState('');
  const [ipPage, setIpPage] = useState(1);
  const [ipPageSize, setIpPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // --- Modal 状态 ---
  const [subnetModalOpen, setSubnetModalOpen] = useState(false);
  const [editingSubnet, setEditingSubnet] = useState(null);
  const [newSubnetParentId, setNewSubnetParentId] = useState(null);
  const [ipEditOpen, setIpEditOpen] = useState(false);
  const [editingIp, setEditingIp] = useState(null);
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [bindingIp, setBindingIp] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [batchStatusOpen, setBatchStatusOpen] = useState(false);
  const [batchStatus, setBatchStatus] = useState('reserved');
  const [submitting, setSubmitting] = useState(false);
  const [probing, setProbing] = useState(false);

  // --- 探测轮询 timer 引用（网段切换时清理） ---
  const probePollTimerRef = useRef(null);

  // --- 全局搜索状态 ---
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalKeyword, setGlobalKeyword] = useState('');

  // --- SWR 数据 ---
  const { data: treeData, mutate: mutateTree, isLoading: treeLoading } = useSWR(
    '/ipam/subnets',
    () => ipamAPI.getSubnets()
  );
  const subnets = treeData?.data || [];

  const { data: subnetDetail, mutate: mutateDetail } = useSWR(
    selectedSubnetId ? `/ipam/subnets/${selectedSubnetId}` : null,
    () => ipamAPI.getSubnet(selectedSubnetId)
  );

  const { data: ipListData, mutate: mutateIps, isLoading: ipLoading } = useSWR(
    selectedSubnetId
      ? [
          '/ipam/listIps',
          selectedSubnetId,
          ipPage,
          ipPageSize,
          ipStatusFilter,
          ipKeyword,
        ]
      : null,
    () =>
      ipamAPI.listIps(selectedSubnetId, {
        page: ipPage,
        pageSize: ipPageSize,
        status: ipStatusFilter,
        keyword: ipKeyword,
      })
  );

  // --- 派生数据 ---
  const currentSubnet = subnetDetail?.data || null;
  const ipList = ipListData?.data?.list || [];
  const pagination = ipListData?.data?.pagination || { total: 0 };
  const isOnDemand = ipListData?.data?.onDemand || false;
  const filteredTree = useMemo(
    () => filterTree(buildTreeData(subnets, selectedSubnetId, treeKeyword), treeKeyword),
    [subnets, selectedSubnetId, treeKeyword]
  );

  // 统计概览（所有网段汇总）
  const totalSummary = useMemo(() => {
    let totalSubnets = 0;
    let totalIps = 0;
    let totalUsed = 0;
    function walk(list) {
      for (const s of list) {
        totalSubnets++;
        // 只累加 IPv4 且主机数在安全范围内的网段，避免 IPv6 超大数导致统计失真
        const hosts = Number(s.usableHosts);
        if (s.ipVersion !== 'ipv6' && !isNaN(hosts) && hosts > 0 && hosts <= Number.MAX_SAFE_INTEGER) {
          totalIps += hosts;
        }
        totalUsed += s.usedCount || 0;
        if (s.children?.length > 0) walk(s.children);
      }
    }
    walk(subnets);
    return {
      totalSubnets,
      totalIps,
      totalUsed,
      usageRate: totalIps > 0 ? Math.round((totalUsed / totalIps) * 100) : 0,
    };
  }, [subnets]);

  // 面包屑路径
  const breadcrumbPath = useMemo(() => {
    if (!selectedSubnetId || subnets.length === 0) return [];
    const path = findAncestorPath(subnets, selectedSubnetId);
    return path || [];
  }, [subnets, selectedSubnetId]);

  // --- 副作用：初始展开顶级节点 + 默认选中 ---
  useEffect(() => {
    if (subnets.length > 0 && expandedKeys.length === 0) {
      setExpandedKeys(subnets.map((s) => s.subnetId));
    }
  }, [subnets]);

  useEffect(() => {
    if (!selectedSubnetId && subnets.length > 0) {
      setSelectedSubnetId(subnets[0].subnetId);
    }
  }, [subnets, selectedSubnetId]);

  // 切换网段时重置筛选与选择
  const handleSelect = useCallback((keys) => {
    // 清理旧网段的探测轮询
    if (probePollTimerRef.current) {
      clearInterval(probePollTimerRef.current);
      probePollTimerRef.current = null;
    }
    if (keys.length > 0) {
      setSelectedSubnetId(keys[0]);
      setIpPage(1);
      setIpKeyword('');
      setIpStatusFilter(undefined);
      setSelectedRowKeys([]);
    }
  }, []);

  // --- 操作处理 ---

  /** 探测当前网段下所有 IP 在线状态 */
  const handleProbeSubnet = useCallback(async () => {
    if (!currentSubnet || probing) return;
    try {
      setProbing(true);
      const res = await ipamAPI.probeSubnet(currentSubnet.subnetId);
      if (res.success) {
        const d = res.data || {};
        if (d.message) {
          // 异步模式：定时轮询刷新（每 3 秒一次，最多 30 次 = 90 秒）
          message.info(`${d.message}，正在自动刷新探测结果...`, 4);
          const MAX_POLL = 30;
          const POLL_INTERVAL = 3000;
          let pollCount = 0;
          const timer = setInterval(async () => {
            pollCount++;
            try {
              await mutateIps();
              await mutateDetail();
            } catch (_) { /* ignore 单次刷新失败 */ }

            if (pollCount >= MAX_POLL) {
              clearInterval(timer);
            }
          }, POLL_INTERVAL);
          // 保存 timer 引用，网段切换时清理
          probePollTimerRef.current = timer;
        } else {
          message.success(`探测完成：共 ${d.total} 个，在线 ${d.online} / 离线 ${d.offline}`);
        }
        mutateDetail();
        mutateIps();
      } else {
        message.error(res.message || '探测失败');
      }
    } catch (e) {
      message.error(e.message || '探测失败');
    } finally {
      setProbing(false);
    }
  }, [currentSubnet, probing, mutateDetail, mutateIps]);

  /** 刷新所有 */
  const handleRefresh = useCallback(() => {
    mutateTree();
    if (selectedSubnetId) {
      mutateDetail();
      mutateIps();
    }
    message.success('刷新完成');
  }, [mutateTree, mutateDetail, mutateIps, selectedSubnetId]);

  /** 新增网段 */
  const handleAddSubnet = useCallback((parentId = null) => {
    setEditingSubnet(null);
    setNewSubnetParentId(parentId);
    setSubnetModalOpen(true);
  }, []);

  /** 编辑网段 */
  const handleEditSubnet = useCallback(() => {
    setEditingSubnet(currentSubnet);
    setSubnetModalOpen(true);
  }, [currentSubnet]);

  /** 删除网段 */
  const handleDeleteSubnet = useCallback(() => {
    if (!currentSubnet) return;
    confirm({
      title: '确认删除网段？',
      icon: <ExclamationCircleOutlined />,
      okButtonProps: { danger: true },
      content: (
        <div>
          <div>
            将删除网段【<strong>{currentSubnet.name}</strong>】({currentSubnet.cidr})
          </div>
          <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 12 }}>
            级联删除：{currentSubnet.childCount || 0} 个子网段 · {currentSubnet.totalIps || 0} 个 IP 记录
          </div>
          <div style={{ marginTop: 8, color: '#ff4d4f', fontSize: 12 }}>
            此操作不可恢复！
          </div>
        </div>
      ),
      okText: '确认删除',
      onOk: async () => {
        try {
          const res = await ipamAPI.deleteSubnet(currentSubnet.subnetId);
          if (res.success) {
            message.success(res.message);
            mutateTree();
            setSelectedSubnetId(null);
            setCurrentSubnetDetail(null);
          } else {
            message.error(res.message || '删除失败');
          }
        } catch (e) {
          // 后端 409 保护：网段有绑定设备的 IP，提示强制删除
          const errData = e.response?.data;
          if (errData?.usedIpCount && errData?.usedIpCount > 0) {
            confirm({
              title: '网段下有绑定设备的 IP',
              icon: <ExclamationCircleOutlined />,
              okButtonProps: { danger: true },
              okText: '强制删除',
              cancelText: '取消',
              content: (
                <div>
                  <div style={{ color: '#ff4d4f' }}>
                    网段下有 <strong>{errData.usedIpCount}</strong> 个 IP 已绑定设备
                  </div>
                  <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 12 }}>
                    强制删除将自动解绑这些 IP 并删除网段及其所有子网段
                  </div>
                </div>
              ),
              onOk: async () => {
                try {
                  const forceRes = await ipamAPI.deleteSubnet(currentSubnet.subnetId, true);
                  if (forceRes.success) {
                    message.success(forceRes.message);
                    mutateTree();
                    setSelectedSubnetId(null);
                    setCurrentSubnetDetail(null);
                  }
                } catch (forceErr) {
                  message.error(forceErr.response?.data?.message || '删除失败');
                }
              },
            });
          } else {
            message.error(errData?.message || e.message || '删除失败');
          }
        }
      },
    });
  }, [currentSubnet, mutateTree]);

  // currentSubnet 是从 SWR 派生的只读值，不能直接 set null，所以额外用这个
  const setCurrentSubnetDetail = () => mutateDetail(undefined, false);

  /** 保存网段 */
  const handleSaveSubnet = useCallback(
    async (formData) => {
      try {
        setSubmitting(true);
        let res;
        if (editingSubnet) {
          res = await ipamAPI.updateSubnet(editingSubnet.subnetId, formData);
        } else {
          res = await ipamAPI.createSubnet({
            ...formData,
            parentId: newSubnetParentId,
          });
        }
        if (res.success) {
          message.success(res.message || (editingSubnet ? '更新成功' : '创建成功'));
          setSubnetModalOpen(false);
          mutateTree();
          mutateDetail();
          mutateIps();
          // 新建后自动选中新网段
          if (!editingSubnet && res.data?.subnetId) {
            setSelectedSubnetId(res.data.subnetId);
          }
        } else {
          message.error(res.message || '保存失败');
        }
      } catch (e) {
        message.error(e.message || '保存失败');
      } finally {
        setSubmitting(false);
      }
    },
    [editingSubnet, newSubnetParentId, mutateTree, mutateDetail, mutateIps]
  );

  /** 编辑 IP */
  const handleEditIp = useCallback((ip) => {
    setEditingIp(ip);
    setIpEditOpen(true);
  }, []);

  /** 保存单个 IP */
  const handleSaveIp = useCallback(
    async (formData) => {
      try {
        const res = await ipamAPI.updateIp(editingIp.ipId, formData);
        if (res.success) {
          message.success('更新成功');
          setIpEditOpen(false);
          mutateIps();
          mutateDetail();
        } else {
          message.error(res.message || '更新失败');
        }
      } catch (e) {
        message.error(e.message || '更新失败');
      }
    },
    [editingIp, mutateIps, mutateDetail]
  );

  /** 打开绑定弹窗 */
  const handleOpenBind = useCallback((ip) => {
    setBindingIp(ip);
    setBindModalOpen(true);
  }, []);

  /** 绑定 IP 到设备 */
  const handleBindDevice = useCallback(
    async ({ deviceId, ipType, customTag, setPrimary }) => {
      try {
        const res = await ipamAPI.bindIp(bindingIp.ipId, {
          deviceId,
          ipType,
          customTag,
          setPrimary,
        });
        if (res.success) {
          message.success('绑定成功');
          setBindModalOpen(false);
          // 如果编辑弹窗也开着，同步关闭
          setIpEditOpen(false);
          mutateIps();
          mutateDetail();
        } else {
          message.error(res.message || '绑定失败');
        }
      } catch (e) {
        message.error(e.message || '绑定失败');
      }
    },
    [bindingIp, mutateIps, mutateDetail]
  );

  /** 解绑 IP 与设备 */
  const handleUnbindDevice = useCallback(
    async (ip) => {
      confirm({
        title: '确认解绑？',
        content: `IP 【${ip.ipAddress}】将与设备【${ip.deviceId}】解除绑定${
          ip.status === 'used' && ip.statusAutoDriven ? '，状态自动回退为空闲' : ''
        }。`,
        okText: '确认解绑',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: async () => {
          try {
            const res = await ipamAPI.unbindIp(ip.ipId);
            if (res.success) {
              message.success('解绑成功');
              mutateIps();
              mutateDetail();
            } else {
              message.error(res.message || '解绑失败');
            }
          } catch (e) {
            message.error(e.message || '解绑失败');
          }
        },
      });
    },
    [mutateIps, mutateDetail]
  );

  /** 批量修改 IP 状态 */
  const handleBatchStatus = useCallback(
    async (status) => {
      if (selectedRowKeys.length === 0) return;
      confirm({
        title: `批量修改 ${selectedRowKeys.length} 个 IP 状态为【${STATUS_CONFIG[status].label}】？`,
        content: '此操作将立即生效，可在修改后再次操作恢复。',
        okText: '确认修改',
        okButtonProps: { type: 'primary' },
        onOk: async () => {
          try {
            const res = await ipamAPI.batchStatus({
              ipIds: selectedRowKeys,
              status,
            });
            if (res.success) {
              message.success(res.message);
              setSelectedRowKeys([]);
              mutateIps();
              mutateDetail();
            } else {
              message.error(res.message || '批量修改失败');
            }
          } catch (e) {
            message.error(e.message || '批量修改失败');
          }
        },
      });
    },
    [selectedRowKeys, mutateIps, mutateDetail]
  );

  /** 批量修改 IP 业务类型 */
  const handleBatchIpType = useCallback(
    async (ipType) => {
      if (selectedRowKeys.length === 0) return;
      const cfg = IP_TYPE_CONFIG[ipType];
      confirm({
        title: `批量修改 ${selectedRowKeys.length} 个 IP 的业务类型为【${cfg.label}】？`,
        content: '此操作将立即生效。',
        okText: '确认修改',
        okButtonProps: { type: 'primary' },
        onOk: async () => {
          try {
            const res = await ipamAPI.batchStatus({
              ipIds: selectedRowKeys,
              ipType,
            });
            if (res.success) {
              message.success(res.message);
              setSelectedRowKeys([]);
              mutateIps();
              mutateDetail();
            } else {
              message.error(res.message || '批量修改失败');
            }
          } catch (e) {
            message.error(e.message || '批量修改失败');
          }
        },
      });
    },
    [selectedRowKeys, mutateIps, mutateDetail]
  );

  /** 复制 IP 地址到剪贴板 */
  const handleCopyIp = useCallback((ip) => {
    navigator.clipboard?.writeText(ip).then(
      () => message.success(`已复制 ${ip}`),
      () => message.warning('复制失败，请手动选择文本复制')
    );
  }, []);

  /** 单行快速修改状态 */
  const handleBatchStatusForOne = useCallback(
    async (record, status) => {
      try {
        const res = await ipamAPI.updateIp(record.ipId, { status });
        if (res.success) {
          mutateIps();
          mutateDetail();
        } else {
          message.error(res.message || '修改失败');
        }
      } catch (e) {
        message.error(e.message || '修改失败');
      }
    },
    [mutateIps, mutateDetail]
  );

  // --- IP 表格列定义 ---
  // 列顺序按业务关注度排列：IP地址 → 状态 → 已绑设备 → IP类型 → 分配类型 → 在线探测 → IP别名 → 备注 → 操作
  const ipColumns = useMemo(
    () => [
      {
        title: 'IP 地址',
        dataIndex: 'ipAddress',
        key: 'ipAddress',
        width: 210,
        fixed: 'left',
        sorter: true,
        render: (text, record) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tooltip title={text} mouseEnterDelay={0.4}>
              <a
                onClick={() => handleEditIp(record)}
                style={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  maxWidth: 175,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {highlightText(text, ipKeyword)}
              </a>
            </Tooltip>
            <Tooltip title="复制 IP">
              <CopyOutlined
                style={{ fontSize: 12, color: '#bfbfbf', cursor: 'pointer', flexShrink: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyIp(text);
                }}
              />
            </Tooltip>
          </div>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 90,
        filters: STATUS_KEYS.map((k) => ({
          text: STATUS_CONFIG[k].label,
          value: k,
        })),
        onFilter: (v, r) => r.status === v,
        render: (status, record) => {
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.free;
          return (
            <Dropdown
              trigger={['click']}
              disabled={record._onDemand}
              menu={{
                items: STATUS_KEYS.map((k) => ({
                  key: k,
                  icon: STATUS_CONFIG[k].icon,
                  label: (
                    <span>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: STATUS_CONFIG[k].dotColor,
                          marginRight: 8,
                        }}
                      />
                      {STATUS_CONFIG[k].label}
                    </span>
                  ),
                  disabled: k === status,
                  onClick: () => handleBatchStatusForOne(record, k),
                })),
              }}
            >
              <Tag
                color={cfg.tagColor}
                style={{ cursor: 'pointer', margin: 0, border: 'none' }}
                icon={cfg.icon}
              >
                {cfg.label}
              </Tag>
            </Dropdown>
          );
        },
      },
      {
        title: '已绑设备',
        dataIndex: 'deviceId',
        key: 'deviceId',
        width: 170,
        ellipsis: true,
        render: (deviceId, record) => {
          if (!deviceId) {
            return <span style={{ color: '#bfbfbf' }}>未绑定</span>;
          }
          const parts = [];
          if (record.isPrimaryForDevice) {
            parts.push(
              <Tooltip key="primary" title="主 IP">
                <StarOutlined style={{ color: '#faad14', marginRight: 4 }} />
              </Tooltip>
            );
          }
          const deviceName = record.Device?.name || record.Device?.deviceId || deviceId;
          parts.push(
            <a
              key="name"
              onClick={(e) => {
                e.stopPropagation();
                api.get(`/devices/${deviceId}`)
                  .then((dev) => setSelectedDevice(dev))
                  .catch(() => setSelectedDevice({ deviceId, name: deviceName }));
              }}
              style={{ color: '#1677ff', cursor: 'pointer' }}
              title={`点击查看设备 ${deviceName} 的详情`}
            >
              {deviceName}
            </a>
          );
          return <>{parts}</>;
        },
      },
      {
        title: 'IP 类型',
        dataIndex: 'ipType',
        key: 'ipType',
        width: 90,
        filters: IP_TYPE_KEYS.map((k) => ({
          text: IP_TYPE_CONFIG[k].label,
          value: k,
        })),
        onFilter: (v, r) => r.ipType === v,
        render: (type) => {
          const cfg = IP_TYPE_CONFIG[type] || IP_TYPE_CONFIG.business;
          return (
            <Tag color={cfg.tagColor} style={{ margin: 0, border: 'none' }}>
              {cfg.label}
            </Tag>
          );
        },
      },
      {
        title: '分配',
        dataIndex: 'assignmentType',
        key: 'assignmentType',
        width: 80,
        render: (t) => {
          if (!t) return <span style={{ color: '#bfbfbf' }}>—</span>;
          return t === 'dhcp' ? (
            <Tag color="purple" style={{ margin: 0, border: 'none' }}>DHCP</Tag>
          ) : (
            <span style={{ color: '#595959', fontSize: 13 }}>静态</span>
          );
        },
      },
      {
        title: '在线探测',
        dataIndex: 'probeStatus',
        key: 'probeStatus',
        width: 100,
        render: (status, record) => {
          const cfg = {
            unknown: { color: '#bfbfbf', label: '未探测', dot: '#bfbfbf' },
            online:  { color: '#52c41a', label: '在线',   dot: '#52c41a' },
            offline: { color: '#ff4d4f', label: '离线',   dot: '#ff4d4f' },
          }[status || 'unknown'];
          const tooltipContent = record.probeLatency != null
            ? `${cfg.label} · ${record.probeLatency}ms`
            : cfg.label;
          return (
            <Tooltip title={tooltipContent}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span
                  style={{
                    width: 6, height: 6, borderRadius: 3,
                    background: cfg.dot, flexShrink: 0,
                  }}
                />
                <span style={{ color: cfg.color, fontSize: 12 }}>{cfg.label}</span>
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: 'IP 别名',
        dataIndex: 'label',
        key: 'label',
        width: 140,
        ellipsis: true,
        render: (text) => text
          ? <Tooltip title={text}>{text}</Tooltip>
          : <span style={{ color: '#bfbfbf' }}>—</span>,
      },
      {
        title: '备注',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (text) => text
          ? <Tooltip title={text}>{text}</Tooltip>
          : <span style={{ color: '#bfbfbf' }}>—</span>,
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        fixed: 'right',
        render: (_, record) => {
          const isBound = !!record.deviceId;
          const canBind = !['gateway', 'excluded'].includes(record.status);
          return (
            <Space size={4}>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditIp(record)}>
                编辑
              </Button>
              {canBind && !isBound && (
                <Button type="link" size="small" onClick={() => handleOpenBind(record)}>
                  绑定
                </Button>
              )}
              {canBind && isBound && (
                <>
                  <Button type="link" size="small" onClick={() => handleOpenBind(record)}>
                    换绑
                  </Button>
                  <Button type="link" size="small" danger onClick={() => handleUnbindDevice(record)}>
                    解绑
                  </Button>
                </>
              )}
            </Space>
          );
        },
      },
    ],
    [handleEditIp, handleCopyIp, handleOpenBind, handleUnbindDevice, ipKeyword, handleBatchStatusForOne]
  );

  // --- 快速状态筛选 chip ---
  const statusChips = STATUS_KEYS;

  return (
    <Layout style={{ height: 'calc(100vh - 64px)', background: '#f5f7fa' }}>
      {/* ============ 左侧网段树 ============ */}
      <Sider
        width={300}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          overflow: 'auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 顶部统计概览 */}
        <div
          style={{
            padding: '12px 14px 10px',
            borderBottom: '1px solid #f0f0f0',
            background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <ApiOutlined style={{ color: '#1677ff' }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>网段与 IP 概览</span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#8c8c8c' }}>网段</div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#1677ff' }}>
                {totalSummary.totalSubnets}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#8c8c8c' }}>总 IP</div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#13c2c2' }}>
                {totalSummary.totalIps.toLocaleString()}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#8c8c8c' }}>使用率</div>
              <div style={{ fontWeight: 600, fontSize: 16, color: usageColor(totalSummary.usageRate) }}>
                {totalSummary.usageRate}%
              </div>
            </div>
          </div>
        </div>

        {/* 搜索框 */}
        <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #f0f0f0' }}>
          <Input
            placeholder="搜索网段名或 CIDR..."
            prefix={<SearchOutlined />}
            value={treeKeyword}
            onChange={(e) => setTreeKeyword(e.target.value)}
            allowClear
            size="small"
          />
        </div>

        {/* 树 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px' }}>
          {treeLoading ? (
            <div style={{ padding: 16 }}>
              <Skeleton active paragraph={{ rows: 6, width: ['100%', '80%', '60%', '100%', '70%', '90%'] }} />
            </div>
          ) : subnets.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#bfbfbf' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🗂️</div>
              <div style={{ fontSize: 13, marginBottom: 12 }}>还没有任何网段</div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="small"
                onClick={() => handleAddSubnet(null)}
              >
                创建第一个网段
              </Button>
            </div>
          ) : filteredTree.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#bfbfbf' }}>
              <FilterOutlined style={{ fontSize: 32, marginBottom: 8 }} />
              <div style={{ fontSize: 13, marginBottom: 12 }}>未找到匹配的网段</div>
              <Button size="small" onClick={() => setTreeKeyword('')}>
                清除筛选
              </Button>
            </div>
          ) : (
            <Tree
              showLine={{ showLeafIcon: false }}
              blockNode
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              selectedKeys={selectedSubnetId ? [selectedSubnetId] : []}
              onSelect={handleSelect}
              treeData={filteredTree}
              style={{ background: 'transparent' }}
            />
          )}
        </div>

        {/* 底部操作 */}
        <div
          style={{
            padding: '12px',
            borderTop: '1px solid #f0f0f0',
            background: '#fff',
          }}
        >
          <button
            type="button"
            onClick={() => handleAddSubnet(null)}
            style={{
              width: '100%',
              height: 36,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: '#fff',
              background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
              boxShadow: '0 2px 6px rgba(22,119,255,0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #0958d9 0%, #1677ff 100%)';
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(22,119,255,0.4)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(22,119,255,0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <PlusOutlined style={{ fontSize: 14 }} />
            新增顶级网段
          </button>
        </div>
      </Sider>

      {/* ============ 右侧工作区 ============ */}
      <Content style={{ padding: 16, overflow: 'auto' }}>
        {!currentSubnet ? (
          // === 空状态：未选择网段 ===
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bfbfbf',
              gap: 16,
            }}
          >
            <GlobalOutlined style={{ fontSize: 72, opacity: 0.3 }} />
            <div style={{ fontSize: 16, color: '#8c8c8c' }}>
              请选择左侧网段，或创建第一个网段
            </div>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => handleAddSubnet(null)}
            >
              创建网段
            </Button>
          </div>
        ) : (
          <>
            {/* --- 顶部面包屑 + 操作区 --- */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 12,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <Breadcrumb
                  items={[
                    { title: <span style={{ color: '#8c8c8c' }}>IP 地址管理</span> },
                    ...breadcrumbPath.map((n) => ({
                      title: (
                        <span
                          style={{
                            fontWeight: n.subnetId === selectedSubnetId ? 600 : 400,
                            cursor: 'pointer',
                            color: n.subnetId === selectedSubnetId ? '#1677ff' : 'inherit',
                          }}
                          onClick={() => n.subnetId !== selectedSubnetId && handleSelect([n.subnetId])}
                        >
                          {n.name}
                        </span>
                      ),
                    })),
                  ]}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <Tag color={currentSubnet.ipVersion === 'ipv6' ? 'purple' : 'blue'} style={{ margin: 0 }}>
                    {currentSubnet.ipVersion === 'ipv6' ? 'IPv6' : 'IPv4'}
                  </Tag>
                  <Tooltip title={currentSubnet.cidr} mouseEnterDelay={0.4}>
                    <Tag
                      color="cyan"
                      style={{ margin: 0, maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {currentSubnet.cidr}
                    </Tag>
                  </Tooltip>
                  {currentSubnet.vlanId && <Tag color="purple">VLAN {currentSubnet.vlanId}</Tag>}
                  {currentSubnet.gateway && (
                    <Tooltip title={`网关: ${currentSubnet.gateway}`} mouseEnterDelay={0.4}>
                      <Tag color="green" style={{ whiteSpace: 'nowrap', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        GW {currentSubnet.gateway}
                      </Tag>
                    </Tooltip>
                  )}
                </div>
              </div>
              <Space size={4} wrap>
                <Tooltip title="刷新">
                  <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
                </Tooltip>
                <Tooltip title="探测网段 IP 在线状态">
                  <Button
                    icon={<ThunderboltOutlined />}
                    loading={probing}
                    onClick={handleProbeSubnet}
                  >
                    探测在线
                  </Button>
                </Tooltip>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddSubnet(currentSubnet.subnetId)}
                >
                  新增子网段
                </Button>
                <Button icon={<EditOutlined />} onClick={handleEditSubnet}>
                  编辑网段
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteSubnet}
                >
                  删除
                </Button>
              </Space>
            </div>

            {/* --- 网段信息卡 + 使用率仪表（2 列） --- */}
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
              {/* 使用率仪表 */}
              <Col xs={24} sm={24} md={10}>
                <Card
                  size="small"
                  styles={{ body: { padding: '14px 16px' } }}
                  style={{ height: '100%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* 圆形进度 */}
                    <Progress
                      type="dashboard"
                      percent={currentSubnet.usageRate || 0}
                      size={120}
                      strokeColor={usageColor(currentSubnet.usageRate || 0)}
                      styles={{
                        percent: { fontSize: 20, fontWeight: 600 },
                      }}
                    />
                    {/* KPI 列表 */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          marginBottom: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {currentSubnet.name}
                      </div>
                      <Row gutter={[8, 8]}>
                        <Col span={12}>
                          <Tooltip
                            title={`已用 ${currentSubnet.usedCount || 0} / 可用 ${safeFormatHosts(currentSubnet.usableHosts, { ipv6Hint: currentSubnet.ipVersion === 'ipv6', prefixLength: currentSubnet.prefixLength }).full}`}
                            mouseEnterDelay={0.4}
                          >
                            <Statistic
                              title={<span style={{ color: '#8c8c8c', fontSize: 12 }}>已用 / 可用</span>}
                              value={`${currentSubnet.usedCount || 0} / ${safeFormatHosts(currentSubnet.usableHosts, { ipv6Hint: currentSubnet.ipVersion === 'ipv6', prefixLength: currentSubnet.prefixLength }).display}`}
                              valueStyle={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}
                            />
                          </Tooltip>
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title={<span style={{ color: '#8c8c8c', fontSize: 12 }}>子网段</span>}
                            value={currentSubnet.childCount || 0}
                            suffix="个"
                            valueStyle={{ fontSize: 14, fontWeight: 600 }}
                          />
                        </Col>
                      </Row>
                    </div>
                  </div>

                  {/* 状态小方块 legend */}
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px solid #f0f0f0',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    {STATUS_KEYS.map((k) => {
                      const count = currentSubnet[`${k}Count`] || 0;
                      return (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              background: STATUS_CONFIG[k].dotColor,
                            }}
                          />
                          <span style={{ color: '#8c8c8c' }}>{STATUS_CONFIG[k].label}</span>
                          <span style={{ fontWeight: 600 }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </Col>

              {/* 网段详情 */}
              <Col xs={24} sm={24} md={14}>
                <Card
                  size="small"
                  styles={{ body: { padding: 0 } }}
                  style={{ height: '100%' }}
                  bodyStyle={{ padding: 0 }}
                >
                  {/* === 顶部：CIDR 大标题区 === */}
                  <div
                    style={{
                      padding: '14px 16px 12px',
                      borderBottom: '1px solid #f0f0f0',
                      background: 'linear-gradient(135deg, #f8faff 0%, #ffffff 100%)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 20,
                          fontWeight: 700,
                          color: '#1a1a1a',
                          letterSpacing: 0.5,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                        }}
                        title={currentSubnet.cidr}
                      >
                        {currentSubnet.cidr}
                      </span>
                      {currentSubnet.ipVersion === 'ipv6' ? (
                        <Tag color="purple" style={{ flexShrink: 0 }}>IPv6</Tag>
                      ) : (
                        <Tag color="blue" style={{ flexShrink: 0 }}>IPv4</Tag>
                      )}
                    </div>
                    {currentSubnet.name && (
                      <div style={{ fontSize: 13, color: '#595959' }}>
                        {currentSubnet.name}
                      </div>
                    )}
                  </div>

                  {/* === 主体信息区：3 列 Grid === */}
                  <div style={{ padding: '12px 16px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: currentSubnet.ipVersion === 'ipv4' ? '1fr 1fr 1fr' : '1fr 1fr',
                        gap: 10,
                      }}
                    >
                      {/* --- 地址范围组 --- */}
                      <div style={groupBoxStyle}>
                        <div style={groupTitleStyle}>
                          <EnvironmentOutlined style={{ marginRight: 4, color: '#1677ff' }} />
                          地址范围
                        </div>
                        <InfoRow label="网络地址" value={currentSubnet.networkAddress} copyable />
                        <InfoRow
                          label={currentSubnet.ipVersion === 'ipv6' ? '末地址' : '广播地址'}
                          value={currentSubnet.broadcastAddress || '—'}
                          copyable
                          last
                        />
                      </div>

                      {/* --- 容量组 --- */}
                      <div style={groupBoxStyle}>
                        <div style={groupTitleStyle}>
                          <DatabaseOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                          容量
                        </div>
                        <InfoRow
                          label="总主机数"
                          value={formatWithTooltip(
                            safeFormatHosts(currentSubnet.totalHosts, {
                              ipv6Hint: currentSubnet.ipVersion === 'ipv6',
                              prefixLength: currentSubnet.prefixLength,
                            })
                          )}
                          last
                        />
                        <InfoRow
                          label="可用主机数"
                          value={formatWithTooltip(
                            safeFormatHosts(currentSubnet.usableHosts, {
                              ipv6Hint: currentSubnet.ipVersion === 'ipv6',
                              prefixLength: currentSubnet.prefixLength,
                            })
                          )}
                        />
                      </div>

                      {/* --- 子网掩码（仅 IPv4） --- */}
                      {currentSubnet.ipVersion === 'ipv4' && (
                        <div style={groupBoxStyle}>
                          <div style={groupTitleStyle}>
                            <ControlOutlined style={{ marginRight: 4, color: '#fa8c16' }} />
                            掩码
                          </div>
                          <InfoRow label="子网掩码" value={currentSubnet.netmask || '—'} copyable last />
                        </div>
                      )}
                    </div>

                    {/* --- 网络服务区 --- */}
                    <div style={{ ...groupBoxStyle, marginTop: 10 }}>
                      <div style={groupTitleStyle}>
                        <ApiOutlined style={{ marginRight: 4, color: '#722ed1' }} />
                        网络服务
                      </div>
                      <Row gutter={[16, 8]}>
                        <Col xs={24} sm={14} md={9}>
                          <InfoRow label="网关" value={currentSubnet.gateway} copyable />
                        </Col>
                        <Col xs={12} sm={10} md={6}>
                          <InfoRow label="VLAN" value={currentSubnet.vlanId} />
                        </Col>
                        <Col xs={24} sm={24} md={9}>
                          <InfoRow
                            label="DNS"
                            value={currentSubnet.dns?.length > 0 ? currentSubnet.dns.join(', ') : null}
                          />
                        </Col>
                      </Row>
                    </div>

                    {/* --- 描述 --- */}
                    {currentSubnet.description && (
                      <div style={{ marginTop: 10, padding: '10px 12px', background: '#fafafa', borderRadius: 6 }}>
                        <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>描述</div>
                        <div style={{ fontSize: 13, color: '#595959', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {currentSubnet.description}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* --- IP 列表卡片 --- */}
            <Card
              size="small"
              styles={{ body: { padding: '0 0 4px' } }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ApiOutlined style={{ color: '#1677ff' }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>IP 地址列表</span>
                  <Tag color="default">
                    {pagination.total || 0} 条
                  </Tag>
                  {isOnDemand && <Tag color="blue">按需生成</Tag>}
                  {!currentSubnet.autoGenerated && <Tag color="orange">未自动生成</Tag>}
                  {selectedRowKeys.length > 0 && (
                    <Tag color="processing">已选 {selectedRowKeys.length}</Tag>
                  )}
                </div>
              }
              extra={
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* 视图切换 */}
                  <Button.Group size="small">
                    <Button
                      type={viewMode === 'table' ? 'primary' : 'default'}
                      icon={<BarsOutlined />}
                      onClick={() => setViewMode('table')}
                    />
                    <Button
                      type={viewMode === 'matrix' ? 'primary' : 'default'}
                      icon={<AppstoreOutlined />}
                      onClick={() => setViewMode('matrix')}
                      disabled={
                        currentSubnet.ipVersion === 'ipv6' ||
                        (Number(currentSubnet.usableHosts) || 0) > 1024
                      }
                      title={
                        currentSubnet.ipVersion === 'ipv6'
                          ? 'IPv6 网段不支持矩阵视图'
                          : (Number(currentSubnet.usableHosts) || 0) > 1024
                          ? '网段过大，不支持矩阵视图'
                          : '矩阵视图'
                      }
                    />
                  </Button.Group>
                </div>
              }
            >
              {/* 工具栏：快速筛选 + 搜索 */}
              <div
                style={{
                  padding: '10px 16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                {/* 快速状态 Chip */}
                <Segmented
                  size="small"
                  value={ipStatusFilter}
                  onChange={(v) => {
                    setIpStatusFilter(v);
                    setIpPage(1);
                  }}
                  allowClear
                  block={false}
                  options={[
                    { label: '全部', value: undefined },
                    ...STATUS_KEYS.map((k) => ({
                      label: `${STATUS_CONFIG[k].label} ${currentSubnet?.[`${k}Count`] || 0}`,
                      value: k,
                    })),
                  ]}
                />

                <div style={{ flex: 1 }} />

                {/* 搜索框 */}
                <Input.Search
                  placeholder="IP / 标签 / 备注"
                  value={ipKeyword}
                  onChange={(e) => setIpKeyword(e.target.value)}
                  onSearch={(v) => {
                    setIpKeyword(v);
                    setIpPage(1);
                  }}
                  onClear={() => {
                    setIpKeyword('');
                    setIpPage(1);
                  }}
                  size="small"
                  style={{ width: 220 }}
                  allowClear
                />
              </div>

              {/* 批量操作栏 */}
              {selectedRowKeys.length > 0 && (
                <div
                  style={{
                    margin: '10px 16px 0',
                    padding: '8px 12px',
                    background: '#e6f4ff',
                    border: '1px solid #91caff',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <TeamOutlined style={{ color: '#1677ff' }} />
                  <span style={{ fontSize: 13 }}>
                    已选择 <strong>{selectedRowKeys.length}</strong> 个 IP
                  </span>
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>批量修改状态：</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {STATUS_KEYS.map((k) => {
                      const cfg = STATUS_CONFIG[k];
                      return (
                        <Tooltip key={k} title={`批量标记为【${cfg.label}】`}>
                          <Button
                            size="small"
                            icon={cfg.icon}
                            onClick={() => handleBatchStatus(k)}
                          >
                            {cfg.label}
                          </Button>
                        </Tooltip>
                      );
                    })}
                  </div>
                  <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 12 }}>业务类型：</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {IP_TYPE_KEYS.map((k) => {
                      const cfg = IP_TYPE_CONFIG[k];
                      return (
                        <Tag.CheckableTag
                          key={k}
                          checked={false}
                          onChange={() => handleBatchIpType(k)}
                          style={{
                            padding: '2px 10px',
                            fontSize: 12,
                            cursor: 'pointer',
                            borderStyle: 'dashed',
                          }}
                        >
                          {cfg.label}
                        </Tag.CheckableTag>
                      );
                    })}
                  </div>
                  <div style={{ flex: 1 }} />
                  <Button
                    size="small"
                    icon={<CloseCircleOutlined />}
                    onClick={() => setSelectedRowKeys([])}
                  >
                    取消选择
                  </Button>
                </div>
              )}

              <div style={{ padding: '8px 0' }}>
                {viewMode === 'table' ? (
                  ipLoading ? (
                    <div style={{ padding: '20px 16px' }}>
                      <Skeleton active paragraph={{ rows: 5 }} />
                    </div>
                  ) : ipList.length === 0 ? (
                    <div style={{ padding: '40px 0' }}>
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <div>
                            <div style={{ marginBottom: 4 }}>
                              {ipStatusFilter || ipKeyword
                                ? '没有符合筛选条件的 IP'
                                : isOnDemand
                                ? `该网段（${currentSubnet?.cidr || ''}）过大，系统未预生成 IP 记录，可手动添加`
                                : '该网段下暂无 IP 记录，请手动添加'}
                            </div>
                            {(ipStatusFilter || ipKeyword) && (
                              <Button
                                type="link"
                                size="small"
                                onClick={() => {
                                  setIpStatusFilter(undefined);
                                  setIpKeyword('');
                                  setIpPage(1);
                                }}
                              >
                                <ClearOutlined /> 清除筛选
                              </Button>
                            )}
                          </div>
                        }
                      />
                    </div>
                  ) : (
                    <Table
                      size="middle"
                      columns={ipColumns}
                      dataSource={ipList}
                      rowKey={(r) => r.ipId || r.ipAddress}
                      rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                        getCheckboxProps: (record) => ({
                          disabled: record._onDemand, // 按需生成的 IP 没有 ipId，不可选
                        }),
                      }}
                      pagination={{
                        current: ipPage,
                        pageSize: ipPageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        pageSizeOptions: ['20', '50', '100', '200'],
                        showTotal: (t) => `共 ${t} 个 IP`,
                        onChange: (p, ps) => {
                          setIpPage(p);
                          setIpPageSize(ps);
                        },
                      }}
                      loading={ipLoading}
                      scroll={{ x: 1300 }}
                    />
                  )
                ) : (
                  <IpMatrix
                    ips={ipList}
                    totalCount={currentSubnet.usableHosts}
                    onEdit={handleEditIp}
                    loading={ipLoading}
                  />
                )}
              </div>
            </Card>
          </>
        )}
      </Content>

      {/* ============ Modal ============ */}
      <SubnetFormModal
        open={subnetModalOpen}
        subnet={editingSubnet}
        parentSubnetId={selectedSubnetId}
        onCancel={() => setSubnetModalOpen(false)}
        onSubmit={handleSaveSubnet}
        submitting={submitting}
      />

      <IpEditModal
        open={ipEditOpen}
        ip={editingIp}
        onCancel={() => setIpEditOpen(false)}
        onSubmit={handleSaveIp}
        onBind={(ip) => {
          setIpEditOpen(false);
          handleOpenBind(ip);
        }}
        onUnbind={handleUnbindDevice}
      />

      <BindDeviceModal
        open={bindModalOpen}
        ip={bindingIp}
        initialIpType={bindingIp?.subnet?.purpose}
        onCancel={() => setBindModalOpen(false)}
        onSubmit={handleBindDevice}
      />

      <DeviceDetailDrawer
        visible={!!selectedDevice}
        device={selectedDevice}
        onClose={() => setSelectedDevice(null)}
      />
    </Layout>
  );
}
