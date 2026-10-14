/**
 * IP 矩阵视图（增强版）
 * - 色块网格，颜色对应状态
 * - 悬浮显示详细信息
 * - 支持状态 legend + 统计
 * - 自适应网格列数
 */
import React, { useMemo } from 'react';
import { Tooltip, Spin, Empty } from 'antd';

const STATUS_COLORS = {
  free:     '#e8e8e8',
  used:     '#1677ff',
  reserved: '#fa8c16',
  gateway:  '#52c41a',
  excluded: '#595959',
};

const STATUS_LABELS = {
  free: '空闲',
  used: '已用',
  reserved: '预留',
  gateway: '网关',
  excluded: '排除',
};

export default function IpMatrix({ ips, totalCount, onEdit, loading }) {
  // 按 IP 整数排序
  const sortedIps = useMemo(() => {
    if (!ips?.length) return [];
    return [...ips].sort((a, b) => (a.ipInt || 0) - (b.ipInt || 0));
  }, [ips]);

  // 统计各状态数量
  const stats = useMemo(() => {
    const s = { free: 0, used: 0, reserved: 0, gateway: 0, excluded: 0 };
    for (const ip of sortedIps) {
      if (s[ip.status] !== undefined) s[ip.status]++;
    }
    return s;
  }, [sortedIps]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin />
      </div>
    );
  }

  if (!sortedIps.length) {
    return <Empty description="暂无可显示的 IP" />;
  }

  // 限制显示 1024 个，避免 DOM 过载
  const DISPLAY_MAX = 1024;
  const displayIps = sortedIps.slice(0, DISPLAY_MAX);

  // 每行个数：尽量接近 4:3 比例的方形，最大 64 列
  const cols = Math.min(64, Math.ceil(Math.sqrt(displayIps.length * 4 / 3)));

  return (
    <div style={{ padding: '8px 0' }}>
      {/* 统计 legend */}
      <div
        style={{
          marginBottom: 12,
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          padding: '8px 12px',
          background: '#fafafa',
          borderRadius: 6,
          border: '1px solid #f0f0f0',
        }}
      >
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span
              style={{
                width: 12,
                height: 12,
                background: STATUS_COLORS[key],
                borderRadius: 2,
                border: '1px solid #d9d9d9',
              }}
            />
            <span style={{ color: '#8c8c8c' }}>{label}</span>
            <span style={{ fontWeight: 600 }}>{stats[key]}</span>
          </div>
        ))}
        {sortedIps.length > DISPLAY_MAX && (
          <div style={{ color: '#fa8c16', fontSize: 12 }}>
            ※ 仅显示前 {DISPLAY_MAX} 个，完整数据请切换表格视图
          </div>
        )}
      </div>

      {/* 色块网格 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 2,
          maxWidth: '100%',
          background: '#f5f5f5',
          padding: 4,
          borderRadius: 4,
        }}
      >
        {displayIps.map((ip) => (
          <Tooltip
            key={ip.ipId || ip.ipAddress}
            mouseEnterDelay={0.1}
            title={
              <div style={{ maxWidth: 200 }}>
                <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  {ip.ipAddress}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: STATUS_COLORS[ip.status] || '#e8e8e8',
                    }}
                  />
                  <span>{STATUS_LABELS[ip.status] || ip.status}</span>
                </div>
                {ip.label && (
                  <div style={{ color: '#1677ff', fontSize: 12 }}>别名：{ip.label}</div>
                )}
                {ip.description && (
                  <div style={{ color: '#8c8c8c', fontSize: 12 }}>{ip.description}</div>
                )}
                {ip.assignmentType && (
                  <div style={{ color: '#8c8c8c', fontSize: 11 }}>
                    {ip.assignmentType === 'dhcp' ? 'DHCP 分配' : '静态分配'}
                  </div>
                )}
              </div>
            }
          >
            <div
              onClick={() => !ip._onDemand && onEdit(ip)}
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                background: STATUS_COLORS[ip.status] || '#e8e8e8',
                borderRadius: 1,
                cursor: ip._onDemand ? 'default' : 'pointer',
                transition: 'transform 150ms ease, box-shadow 150ms ease',
                border: ip.status === 'gateway' ? '1px solid #389e0d' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!ip._onDemand) {
                  e.currentTarget.style.transform = 'scale(1.3)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
                  e.currentTarget.style.zIndex = 1;
                  e.currentTarget.style.position = 'relative';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.zIndex = 'auto';
                e.currentTarget.style.position = 'static';
              }}
            />
          </Tooltip>
        ))}
      </div>

      {/* 总览 */}
      <div style={{ marginTop: 10, fontSize: 12, color: '#8c8c8c' }}>
        共 {sortedIps.length.toLocaleString()} 个 IP
        {totalCount && totalCount !== sortedIps.length && (
          <>
            {' '}
            / 网段总数 {totalCount.toLocaleString()}
          </>
        )}
      </div>
    </div>
  );
}
