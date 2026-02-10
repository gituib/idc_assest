import React, { useState } from 'react';
import { Tooltip, Badge, Divider, Pagination } from 'antd';
import { LinkOutlined, SwapRightOutlined, AimOutlined, NodeIndexOutlined } from '@ant-design/icons';

const PortPanel = ({
  ports,
  deviceName,
  deviceId,
  cables = [],
  devices = [],
  onPortClick,
  compact = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(48); // 默认每页48个端口

  // 按端口名称排序（升序）
  const sortedPorts = [...ports].sort((a, b) => {
    // 尝试按数字部分排序，支持格式如：1/0/1, eth0/1, GigabitEthernet1/0/1 等
    const extractNumbers = str => {
      const matches = str.match(/\d+/g);
      return matches ? matches.map(Number) : [];
    };

    const numsA = extractNumbers(a.portName);
    const numsB = extractNumbers(b.portName);

    // 逐个比较数字部分
    for (let i = 0; i < Math.min(numsA.length, numsB.length); i++) {
      if (numsA[i] !== numsB[i]) {
        return numsA[i] - numsB[i];
      }
    }

    // 如果数字部分相同，按字符串排序
    return a.portName.localeCompare(b.portName);
  });

  // 分页数据
  const totalPorts = sortedPorts.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPorts = sortedPorts.slice(startIndex, endIndex);

  // 获取端口状态颜色
  const getPortStatusColor = status => {
    switch (status) {
      case 'free':
        return '#6b7280'; // 灰色 - 空闲
      case 'occupied':
        return '#10b981'; // 绿色 - 占用
      case 'fault':
        return '#ef4444'; // 红色 - 故障
      case 'disabled':
        return '#374151'; // 深灰色 - 禁用
      default:
        return '#6b7280';
    }
  };

  // 获取端口状态文本
  const getPortStatusText = status => {
    switch (status) {
      case 'free':
        return '空闲';
      case 'occupied':
        return '已连接';
      case 'fault':
        return '故障';
      case 'disabled':
        return '禁用';
      default:
        return '空闲';
    }
  };

  // 获取端口类型图标 - 使用更真实的端口符号
  const getPortTypeIcon = portType => {
    switch (portType) {
      case 'RJ45':
        return '⬡'; // 六边形表示网口
      case 'SFP':
      case 'SFP+':
      case 'SFP28':
        return '▭'; // 矩形表示SFP
      case 'QSFP':
      case 'QSFP28':
        return '▯'; // 宽矩形表示QSFP
      default:
        return '⬡';
    }
  };

  // 获取简化端口显示名称（只显示数字）
  const getPortDisplayName = portName => {
    // 提取最后的数字
    const match = portName.match(/(\d+)$/);
    if (match) {
      return match[1];
    }
    // 如果没有数字，返回原名称
    return portName;
  };

  // 获取线缆类型文本
  const getCableTypeText = cableType => {
    const typeMap = {
      ethernet: '网线',
      fiber: '光纤',
      copper: '铜缆',
      power: '电源线',
    };
    return typeMap[cableType] || cableType || '未知';
  };

  // 获取线缆类型颜色
  const getCableTypeColor = cableType => {
    const colorMap = {
      ethernet: '#52c41a',
      fiber: '#1890ff',
      copper: '#faad14',
      power: '#ff4d4f',
    };
    return colorMap[cableType] || '#999';
  };

  // 查找端口关联的接线
  const findPortCable = port => {
    if (!cables || cables.length === 0) return null;

    return cables.find(
      cable =>
        (cable.sourceDeviceId === deviceId && cable.sourcePortId === port.portId) ||
        (cable.targetDeviceId === deviceId && cable.targetPortId === port.portId) ||
        (cable.sourceDeviceId === deviceId && cable.sourcePort === port.portName) ||
        (cable.targetDeviceId === deviceId && cable.targetPort === port.portName)
    );
  };

  // 获取连接的对端信息
  const getPeerInfo = (cable, currentPort) => {
    if (!cable) return null;

    const isSource =
      cable.sourceDeviceId === deviceId ||
      (cable.sourcePortId && cable.sourcePortId === currentPort.portId) ||
      cable.sourcePort === currentPort.portName;

    if (isSource) {
      // 当前是源端，返回目标端信息
      const targetDevice = devices.find(d => d.deviceId === cable.targetDeviceId);
      return {
        deviceName: targetDevice?.name || cable.targetDeviceId,
        deviceId: cable.targetDeviceId,
        portName: cable.targetPort || cable.targetPortId,
        direction: 'out',
      };
    } else {
      // 当前是目标端，返回源端信息
      const sourceDevice = devices.find(d => d.deviceId === cable.sourceDeviceId);
      return {
        deviceName: sourceDevice?.name || cable.sourceDeviceId,
        deviceId: cable.sourceDeviceId,
        portName: cable.sourcePort || cable.sourcePortId,
        direction: 'in',
      };
    }
  };

  // 渲染端口详情提示
  const renderPortTooltip = port => {
    const cable = findPortCable(port);
    const peerInfo = cable ? getPeerInfo(cable, port) : null;

    return (
      <div style={{ padding: '8px 4px', minWidth: '220px' }}>
        {/* 端口基本信息 */}
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 8,
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            paddingBottom: 4,
          }}
        >
          <NodeIndexOutlined style={{ marginRight: 6 }} />
          {port.portName}
        </div>
        <div style={{ fontSize: 12, lineHeight: '1.8' }}>
          <div>
            <span style={{ opacity: 0.7 }}>端口类型:</span> {port.portType}
          </div>
          <div>
            <span style={{ opacity: 0.7 }}>端口速率:</span> {port.portSpeed}
          </div>
          <div>
            <span style={{ opacity: 0.7 }}>状态:</span>
            <span
              style={{
                color: getPortStatusColor(port.status),
                marginLeft: 4,
                fontWeight: 500,
              }}
            >
              {getPortStatusText(port.status)}
            </span>
          </div>
          {port.vlanId && (
            <div>
              <span style={{ opacity: 0.7 }}>VLAN:</span> {port.vlanId}
            </div>
          )}
          {port.description && (
            <div>
              <span style={{ opacity: 0.7 }}>描述:</span> {port.description}
            </div>
          )}
        </div>

        {/* 接线信息 */}
        {cable && peerInfo && (
          <>
            <Divider style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#69c0ff' }}>
              <LinkOutlined style={{ marginRight: 6 }} />
              接线详情
            </div>
            <div style={{ fontSize: 12, lineHeight: '1.8' }}>
              {/* 线缆类型和长度 */}
              <div style={{ marginBottom: 6 }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: getCableTypeColor(cable.cableType) + '20',
                    color: getCableTypeColor(cable.cableType),
                    fontSize: '11px',
                    fontWeight: 500,
                  }}
                >
                  {getCableTypeText(cable.cableType)}
                </span>
                {cable.cableLength && (
                  <span style={{ marginLeft: 8, opacity: 0.8 }}>{cable.cableLength}m</span>
                )}
              </div>

              {/* 连接方向 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '6px',
                  marginTop: '8px',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: peerInfo.direction === 'out' ? '#52c41a20' : '#1890ff20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                    }}
                  >
                    {peerInfo.direction === 'out' ? '📤' : '📥'}
                  </div>
                  <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.6 }}>
                    {peerInfo.direction === 'out' ? '输出' : '输入'}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: '#fff' }}>{peerInfo.deviceName}</div>
                  <div style={{ fontSize: '11px', opacity: 0.7 }}>端口: {peerInfo.portName}</div>
                  <div style={{ fontSize: '10px', opacity: 0.5 }}>ID: {peerInfo.deviceId}</div>
                </div>
              </div>

              {/* 线缆标签/备注 */}
              {cable.label && (
                <div style={{ marginTop: 8, opacity: 0.8 }}>
                  <span style={{ opacity: 0.7 }}>标签:</span> {cable.label}
                </div>
              )}
              {cable.notes && (
                <div style={{ marginTop: 4, opacity: 0.8 }}>
                  <span style={{ opacity: 0.7 }}>备注:</span> {cable.notes}
                </div>
              )}
            </div>
          </>
        )}

        {/* 空闲端口提示 */}
        {port.status === 'free' && !cable && (
          <>
            <Divider style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
            <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'center', padding: '4px 0' }}>
              <AimOutlined style={{ marginRight: 4 }} />
              端口空闲，暂无接线
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: compact ? '12px' : '16px',
        padding: compact ? '16px' : '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* 设备标题 - compact 模式下隐藏 */}
      {!compact && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              🔌
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                {deviceName || '交换机'}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                {sortedPorts.length} 个端口
              </div>
            </div>
          </div>

          {/* 状态图例 */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#6b7280',
                  boxShadow: '0 0 8px #6b7280',
                }}
              />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>空闲</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }}
              />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>已连接</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 8px #ef4444',
                }}
              />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>故障</span>
            </div>
          </div>
        </div>
      )}

      {/* 端口网格 - 固定每行24个端口 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(24, 1fr)',
          gap: '8px',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {paginatedPorts.map(port => {
          const statusColor = getPortStatusColor(port.status);
          const isClickable = onPortClick && port.status !== 'disabled';
          const cable = findPortCable(port);

          return (
            <Tooltip
              key={port.portId}
              title={renderPortTooltip(port)}
              placement="top"
              color="#1e293b"
              overlayStyle={{
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div
                onClick={() => isClickable && onPortClick(port)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '4px',
                  cursor: isClickable ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  minWidth: '0',
                }}
              >
                {/* LED 指示灯 - 在端口上方 */}
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: statusColor,
                    boxShadow: `0 0 6px ${statusColor}, 0 0 12px ${statusColor}50`,
                    marginBottom: '4px',
                    animation: port.status === 'fault' ? 'pulse 1.5s infinite' : 'none',
                  }}
                />

                {/* 端口主体 - 矩形样式 */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1.2',
                    background: 'linear-gradient(180deg, #2a3441 0%, #1e2530 100%)',
                    border: `2px solid ${statusColor}`,
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.3)`,
                  }}
                >
                  {/* 端口内部图标 */}
                  <div
                    style={{
                      fontSize: '10px',
                      color: statusColor,
                      opacity: 0.8,
                    }}
                  >
                    {getPortTypeIcon(port.portType)}
                  </div>

                  {/* 接线指示标记 */}
                  {cable && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '1px',
                        right: '1px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: getCableTypeColor(cable.cableType),
                        boxShadow: `0 0 3px ${getCableTypeColor(cable.cableType)}`,
                      }}
                    />
                  )}
                </div>

                {/* 端口名称 - 在端口下方 */}
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.7)',
                    textAlign: 'center',
                    marginTop: '3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                  }}
                >
                  {getPortDisplayName(port.portName)}
                </div>
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* 分页 */}
      {totalPorts > pageSize && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '16px 0 0 0',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            marginTop: '16px',
          }}
        >
          <Pagination
            current={currentPage}
            total={totalPorts}
            pageSize={pageSize}
            onChange={(page, size) => {
              setCurrentPage(page);
              if (size) setPageSize(size);
            }}
            showSizeChanger
            showQuickJumper
            showTotal={total => `共 ${total} 个端口`}
            pageSizeOptions={['24', '48', '96']}
            size="small"
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          />
        </div>
      )}

      {/* 添加脉冲动画 */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 10px #ef4444, 0 0 20px #ef444450;
          }
          50% {
            opacity: 0.5;
            box-shadow: 0 0 5px #ef4444, 0 0 10px #ef444450;
          }
        }
      `}</style>
    </div>
  );
};

export default PortPanel;
