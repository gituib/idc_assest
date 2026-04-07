import React, { useMemo } from 'react';
import * as THREE from 'three';
import DeviceModel from './DeviceModel';
import LODManager, { LOD_LEVELS } from './LODManager';
import { getULabelTexture } from './materials/TextureCache';

const RackModel = ({
  rack,
  devices = [],
  selectedDeviceId,
  onDeviceClick,
  onDeviceLeave,
  onDeviceHover,
  onEditDevice,
  onAddNic,
  onAddPort,
  tooltipFields,
  deviceSlideEnabled = true,
}) => {
  const width = 0.6;
  const depth = 1.0;
  const uHeight = 0.04445;
  const postWidth = 0.05;

  const rackHeight = rack?.height || 45;
  const height = rackHeight * uHeight + 0.2;

  // 颜色映射
  const colors = {
    server: '#3b82f6',
    switch: '#22c55e',
    router: '#f59e0b',
    firewall: '#ef4444',
    storage: '#8b5cf6',
    default: '#3b82f6',
    status: {
      running: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      offline: '#6b7280',
    },
  };

  const getDeviceColor = type => {
    const t = type?.toLowerCase() || '';
    if (t.includes('server') || t.includes('服务器')) return colors.server;
    if (t.includes('switch') || t.includes('交换机')) return colors.switch;
    if (t.includes('router') || t.includes('路由器')) return colors.router;
    if (t.includes('firewall') || t.includes('防火墙')) return colors.firewall;
    if (t.includes('storage') || t.includes('存储')) return colors.storage;
    return colors.default;
  };

  // 设备组的Y偏移量（与下方设备渲染的偏移一致）
  const deviceGroupOffset = 0.1;

  // 生成U位刻度标识 - 写在机柜左右两侧柱子上
  const uLabels = useMemo(() => {
    const labels = [];
    for (let u = 1; u <= rackHeight; u += 1) {
      const yPos = (u - 1) * uHeight + uHeight / 2 + deviceGroupOffset;

      const texture = getULabelTexture(u);

      const isMajorU = u % 5 === 0;
      const planeSize = isMajorU ? 0.035 : 0.025;
      const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);

      const leftPostX = -width / 2 + postWidth / 2;
      const rightPostX = width / 2 - postWidth / 2;
      const frontPostZ = depth / 2 - postWidth / 2;

      const tickColor = isMajorU ? '#fbbf24' : '#6b7280';
      const tickHeight = isMajorU ? 0.002 : 0.001;

      labels.push(
        <group key={`u-label-${u}`}>
          <mesh
            position={[leftPostX, yPos, frontPostZ + postWidth / 2 + 0.001]}
            geometry={planeGeometry}
          >
            <meshBasicMaterial
              map={texture}
              transparent={true}
              opacity={1}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh
            position={[rightPostX, yPos, frontPostZ + postWidth / 2 + 0.001]}
            geometry={planeGeometry}
          >
            <meshBasicMaterial
              map={texture}
              transparent={true}
              opacity={1}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[leftPostX, yPos, frontPostZ + postWidth / 2 + 0.002]}>
            <boxGeometry args={[postWidth, tickHeight, 0.001]} />
            <meshBasicMaterial color={tickColor} />
          </mesh>
          <mesh position={[rightPostX, yPos, frontPostZ + postWidth / 2 + 0.002]}>
            <boxGeometry args={[postWidth, tickHeight, 0.001]} />
            <meshBasicMaterial color={tickColor} />
          </mesh>
        </group>
      );
    }
    return labels;
  }, [rackHeight]);

  // 生成机柜框架
  const frame = useMemo(() => {
    const materialProps = { color: '#333', roughness: 0.5, metalness: 0.8 };
    const postArgs = [postWidth, height, postWidth];
    const topBottomArgs = [width + 0.02, 0.02, depth + 0.02];

    return (
      <group>
        <mesh position={[-width / 2 + postWidth / 2, height / 2, -depth / 2 + postWidth / 2]}>
          <boxGeometry args={postArgs} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[width / 2 - postWidth / 2, height / 2, -depth / 2 + postWidth / 2]}>
          <boxGeometry args={postArgs} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[-width / 2 + postWidth / 2, height / 2, depth / 2 - postWidth / 2]}>
          <boxGeometry args={postArgs} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[width / 2 - postWidth / 2, height / 2, depth / 2 - postWidth / 2]}>
          <boxGeometry args={postArgs} />
          <meshStandardMaterial {...materialProps} />
        </mesh>

        <mesh position={[0, height, 0]}>
          <boxGeometry args={topBottomArgs} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={topBottomArgs} />
          <meshStandardMaterial {...materialProps} />
        </mesh>

        {[-1, 1].map(side => (
          <mesh key={`side-${side}`} position={[side * (width / 2 - 0.005), height / 2, 0]}>
            <boxGeometry args={[0.01, height - 0.04, depth - 0.04]} />
            <meshStandardMaterial color="#2d3748" roughness={0.4} metalness={0.7} side={2} />
          </mesh>
        ))}

        {/* U位刻度标识 */}
        {uLabels}
      </group>
    );
  }, [width, height, depth, postWidth, uLabels]);

  return (
    <group position={[0, 0.5, 0]}>
      {frame}

      <group position={[0, 0.1, 0]}>
        {devices.map(device => {
          const uStart = device.position || device.u_position || 1;
          const uSize = device.height || device.u_height || 1;
          const yPos = (uStart - 1) * uHeight + (uSize * uHeight) / 2;

          const deviceColor = getDeviceColor(device.type);
          const statusColor = colors.status[device.status] || colors.status.running;

          return (
            <LODManager
              key={device.deviceId || device.id}
              device={device}
              uHeight={uHeight}
              rackDepth={depth}
              position={[0, yPos, 0]}
              deviceColor={deviceColor}
              statusColor={statusColor}
              level={LOD_LEVELS.HIGH}
            >
              <DeviceModel
                device={device}
                uHeight={uHeight}
                rackDepth={depth}
                position={[0, 0, 0]}
                isSelected={selectedDeviceId === (device.deviceId || device.id)}
                onClick={onDeviceClick}
                onPointerOver={onDeviceHover}
                onPointerOut={onDeviceLeave}
                onEdit={onEditDevice}
                onAddNic={onAddNic}
                onAddPort={onAddPort}
                tooltipFields={tooltipFields}
                slideEnabled={deviceSlideEnabled}
              />
            </LODManager>
          );
        })}
      </group>
    </group>
  );
};

export default RackModel;
