import React, { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// LOD 级别枚举
export const LOD_LEVELS = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

// LOD 距离阈值（单位：米）
export const LOD_DISTANCES = {
  HIGH: 5,
  MEDIUM: 10,
};

/**
 * 创建低细节设备 mesh（远距离用）
 * 仅保留面板 + 机身 + 状态灯，最小化 drawcall
 */
const createSimplifiedDeviceMesh = (device, uHeight, rackDepth, deviceColor, statusColor) => {
  const depth = rackDepth || 1.0;
  const dHeight = device.height || device.u_height || 1;
  const height = dHeight * uHeight;
  const chassisWidth = 0.44;
  const chassisDepth = 0.8;
  const panelWidth = 0.4826;
  const panelDepth = 0.02;
  const frontZ = depth / 2 - 0.02;
  const halfHeight = height / 2;

  return (
    <group>
      <mesh position={[0, 0, frontZ - panelDepth / 2]}>
        <boxGeometry args={[panelWidth, height - 0.002, panelDepth]} />
        <meshStandardMaterial color={deviceColor} roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, frontZ - panelDepth - chassisDepth / 2]}>
        <boxGeometry args={[chassisWidth, height - 0.002, chassisDepth]} />
        <meshStandardMaterial color="#333333" roughness={0.9} metalness={0.3} />
      </mesh>
      <mesh position={[panelWidth / 2 - 0.03, halfHeight - 0.02, frontZ + 0.01]}>
        <circleGeometry args={[0.006, 16]} />
        <meshBasicMaterial color={statusColor} toneMapped={false} />
      </mesh>
    </group>
  );
};

/**
 * 创建中等细节设备 mesh（中距离用）
 * 含面板 + 机身 + 基础硬盘槽位 + 状态灯
 */
const createMediumDeviceMesh = (device, uHeight, rackDepth, deviceColor, statusColor) => {
  const depth = rackDepth || 1.0;
  const dHeight = device.height || device.u_height || 1;
  const height = dHeight * uHeight;
  const chassisWidth = 0.44;
  const chassisDepth = 0.8;
  const panelWidth = 0.4826;
  const panelDepth = 0.02;
  const frontZ = depth / 2 - 0.02;
  const is2U = height > 0.08;
  const halfHeight = height / 2;

  return (
    <group>
      <mesh position={[0, 0, frontZ + 0.0055]}>
        <boxGeometry args={[0.44, height - 0.004, 0.002]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0, frontZ - panelDepth / 2]}>
        <boxGeometry args={[panelWidth, height - 0.002, panelDepth]} />
        <meshStandardMaterial color={deviceColor} roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, frontZ - panelDepth - chassisDepth / 2]}>
        <boxGeometry args={[chassisWidth, height - 0.002, chassisDepth]} />
        <meshStandardMaterial color="#333333" roughness={0.9} metalness={0.3} />
      </mesh>
      <group position={[-0.18, 0, frontZ + 0.006]}>
        <mesh position={[-0.02, 0, 0]}>
          <boxGeometry args={[0.04, height - 0.01, 0.002]} />
          <meshStandardMaterial color="#000000" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.01, 0.002]}>
          <boxGeometry args={[0.012, 0.01, 0.002]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
      </group>
      <group position={[0.05, 0, frontZ + 0.006]}>
        {Array.from({ length: is2U ? 4 : 2 }).map((_, i) => (
          <mesh key={`drive-bay-${device.id || 'unknown'}-${i}`} position={[(i - 1) * 0.08, 0, 0]}>
            <boxGeometry args={[0.06, 0.03, 0.004]} />
            <meshStandardMaterial color="#334155" roughness={0.6} />
          </mesh>
        ))}
      </group>
      <mesh position={[panelWidth / 2 - 0.03, halfHeight - 0.02, frontZ + 0.01]}>
        <circleGeometry args={[0.006, 16]} />
        <meshBasicMaterial color={statusColor} toneMapped={false} />
      </mesh>
    </group>
  );
};

/**
 * LOD 级别管理器
 * 根据相机距离动态切换设备模型的细节级别
 * 优化策略：
 *   - 条件渲染：只挂载当前级别的模型，远距离时 HIGH 级别的 DeviceModel 完全卸载
 *   - useFrame 中仅在级别变化时 setCurrentLevel，避免每帧触发 React 重渲染
 *   - MEDIUM/LOW 的 JSX 用 useMemo 缓存
 */
const LODManager = ({
  device,
  uHeight,
  rackDepth,
  position,
  deviceColor,
  statusColor,
  children,
  level = LOD_LEVELS.HIGH,
}) => {
  const groupRef = useRef();
  const { camera } = useThree();
  const prevDistanceRef = useRef(null);
  // 当前 LOD 级别（state）：仅在级别变化时更新，触发 React 重渲染切换挂载的模型
  const [currentLevel, setCurrentLevel] = useState(LOD_LEVELS.HIGH);

  // 缓存中/低细节 JSX，避免每次级别切换都重建
  const mediumMesh = useMemo(
    () => createMediumDeviceMesh(device, uHeight, rackDepth, deviceColor, statusColor),
    [device, uHeight, rackDepth, deviceColor, statusColor]
  );
  const lowMesh = useMemo(
    () => createSimplifiedDeviceMesh(device, uHeight, rackDepth, deviceColor, statusColor),
    [device, uHeight, rackDepth, deviceColor, statusColor]
  );

  useFrame(() => {
    if (!groupRef.current) return;

    const distance = camera.position.distanceTo(groupRef.current.position);

    // 仅当距离变化超过 10% 时才检查，避免每帧执行
    if (prevDistanceRef.current !== null) {
      const changeRatio =
        Math.abs(distance - prevDistanceRef.current) / (prevDistanceRef.current || 1);
      if (changeRatio < 0.1) return;
    }
    prevDistanceRef.current = distance;

    // 计算新级别
    let newLevel = LOD_LEVELS.HIGH;
    if (distance > LOD_DISTANCES.MEDIUM) {
      newLevel = LOD_LEVELS.LOW;
    } else if (distance > LOD_DISTANCES.HIGH) {
      newLevel = LOD_LEVELS.MEDIUM;
    }

    // 仅在级别变化时触发 React 重渲染（条件挂载/卸载子树）
    if (newLevel !== currentLevel) {
      setCurrentLevel(newLevel);
    }
  });

  // 外部强制指定级别时直接使用
  const effectiveLevel = level !== LOD_LEVELS.HIGH ? level : currentLevel;

  return (
    <group ref={groupRef} position={position}>
      {/* 高细节模型：仅近距离时挂载，远距离完全卸载（节省 DeviceModel 的 useFrame） */}
      {effectiveLevel === LOD_LEVELS.HIGH && children}

      {/* 中等细节模型 */}
      {effectiveLevel === LOD_LEVELS.MEDIUM && mediumMesh}

      {/* 低细节模型 */}
      {effectiveLevel === LOD_LEVELS.LOW && lowMesh}
    </group>
  );
};

export default LODManager;
