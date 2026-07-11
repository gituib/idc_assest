import React, { useMemo, useRef, useEffect } from 'react';
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
  // 优化策略：
  //   - 刻度线（box）用 1 个 InstancedMesh 合并所有 U 位的左+右刻度，drawcall 从 2×rackHeight 降到 1
  //   - U 位数字（plane）因 texture 各异无法用 InstancedMesh 合并，但共享 geometry 按 major/minor 分组
  const leftPostX = -width / 2 + postWidth / 2;
  const rightPostX = width / 2 - postWidth / 2;
  const frontPostZ = depth / 2 - postWidth / 2;

  // 共享几何体（major 和 minor 各一套，避免每 U 创建新 PlaneGeometry）
  const majorPlaneGeo = useMemo(() => new THREE.PlaneGeometry(0.035, 0.035), []);
  const minorPlaneGeo = useMemo(() => new THREE.PlaneGeometry(0.025, 0.025), []);
  const majorTickGeo = useMemo(() => new THREE.BoxGeometry(postWidth, 0.002, 0.001), [postWidth]);
  const minorTickGeo = useMemo(() => new THREE.BoxGeometry(postWidth, 0.001, 0.001), [postWidth]);
  const majorTickMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fbbf24' }), []);
  const minorTickMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#6b7280' }), []);

  // 收集所有刻度线的位置信息，用于 InstancedMesh
  const tickInstances = useMemo(() => {
    const instances = [];
    for (let u = 1; u <= rackHeight; u += 1) {
      const yPos = (u - 1) * uHeight + uHeight / 2 + deviceGroupOffset;
      const isMajorU = u % 5 === 0;
      const tickZ = frontPostZ + postWidth / 2 + 0.002;
      // 左侧刻度
      instances.push({ x: leftPostX, y: yPos, z: tickZ, isMajor: isMajorU });
      // 右侧刻度
      instances.push({ x: rightPostX, y: yPos, z: tickZ, isMajor: isMajorU });
    }
    return instances;
  }, [rackHeight, uHeight, leftPostX, rightPostX, frontPostZ, postWidth, deviceGroupOffset]);

  // 刻度线 InstancedMesh 组件
  const TickInstances = ({ instances, geometry, material }) => {
    const meshRef = useRef();
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useEffect(() => {
      if (!meshRef.current) return;
      for (let i = 0; i < instances.length; i += 1) {
        const inst = instances[i];
        dummy.position.set(inst.x, inst.y, inst.z);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }, [instances, dummy]);

    return (
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, instances.length]}
      />
    );
  };

  // 拆分 major/minor 刻度实例
  const majorTickInstances = useMemo(
    () => tickInstances.filter(i => i.isMajor),
    [tickInstances]
  );
  const minorTickInstances = useMemo(
    () => tickInstances.filter(i => !i.isMajor),
    [tickInstances]
  );

  // U 位数字标签：保留 plane，但共享 geometry（按 major/minor 分组）
  const uLabels = useMemo(() => {
    const labels = [];
    for (let u = 1; u <= rackHeight; u += 1) {
      const yPos = (u - 1) * uHeight + uHeight / 2 + deviceGroupOffset;
      const texture = getULabelTexture(u);
      const isMajorU = u % 5 === 0;
      const planeGeo = isMajorU ? majorPlaneGeo : minorPlaneGeo;
      const labelZ = frontPostZ + postWidth / 2 + 0.001;

      labels.push(
        <group key={`u-label-${u}`}>
          <mesh
            position={[leftPostX, yPos, labelZ]}
            geometry={planeGeo}
          >
            <meshBasicMaterial
              map={texture}
              transparent={true}
              opacity={1}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh
            position={[rightPostX, yPos, labelZ]}
            geometry={planeGeo}
          >
            <meshBasicMaterial
              map={texture}
              transparent={true}
              opacity={1}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      );
    }
    return labels;
  }, [rackHeight, uHeight, leftPostX, rightPostX, frontPostZ, postWidth, majorPlaneGeo, minorPlaneGeo, deviceGroupOffset]);

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

        {/* U位刻度线 - 用 InstancedMesh 合并所有刻度，drawcall 从 2×rackHeight 降到 2 */}
        {majorTickInstances.length > 0 && (
          <TickInstances
            instances={majorTickInstances}
            geometry={majorTickGeo}
            material={majorTickMat}
          />
        )}
        {minorTickInstances.length > 0 && (
          <TickInstances
            instances={minorTickInstances}
            geometry={minorTickGeo}
            material={minorTickMat}
          />
        )}

        {/* U位数字标签 - 共享 geometry，按 texture 区分 */}
        {uLabels}
      </group>
    );
  }, [width, height, depth, postWidth, uLabels, majorTickInstances, minorTickInstances, majorTickGeo, majorTickMat, minorTickGeo, minorTickMat]);

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
