import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const LOD_LEVELS = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export const LOD_DISTANCES = {
  HIGH: 5,
  MEDIUM: 10,
};

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
  const highDetailRef = useRef();
  const mediumDetailRef = useRef();
  const lowDetailRef = useRef();
  const { camera } = useThree();
  // 使用 ref 存储 LOD 级别，避免 React 状态更新
  const lodLevelRef = useRef(LOD_LEVELS.HIGH);
  const distanceRef = useRef(0);
  // 帧计数器，用于节流
  const frameCount = useRef(0);
  // 用于强制重新渲染的 state（仅在必要时更新）
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useFrame(() => {
    if (!groupRef.current) return;

    // 节流：每5帧检查一次
    frameCount.current++;
    if (frameCount.current % 5 !== 0) return;

    const distance = camera.position.distanceTo(groupRef.current.position);
    distanceRef.current = distance;

    // 添加缓冲避免频繁切换（10% 缓冲）
    const buffer = 0.1;
    const highThreshold = LOD_DISTANCES.HIGH * (1 + buffer);
    const mediumThreshold = LOD_DISTANCES.MEDIUM * (1 + buffer);

    let newLevel = LOD_LEVELS.HIGH;
    if (distance > mediumThreshold) {
      newLevel = LOD_LEVELS.LOW;
    } else if (distance > highThreshold) {
      newLevel = LOD_LEVELS.MEDIUM;
    }

    // 只有当级别变化时才更新
    if (newLevel !== lodLevelRef.current) {
      lodLevelRef.current = newLevel;
      // 直接操作 ref 切换可见性，避免频繁的 React 重渲染
      if (highDetailRef.current) {
        highDetailRef.current.visible = newLevel === LOD_LEVELS.HIGH;
      }
      if (mediumDetailRef.current) {
        mediumDetailRef.current.visible = newLevel === LOD_LEVELS.MEDIUM;
      }
      if (lowDetailRef.current) {
        lowDetailRef.current.visible = newLevel === LOD_LEVELS.LOW;
      }
      // 偶尔强制更新以确保同步（每30帧）
      if (frameCount.current % 30 === 0) {
        forceUpdate();
      }
    }
  });

  if (level !== LOD_LEVELS.HIGH) {
    return children;
  }

  return (
    <group ref={groupRef} position={position}>
      {/* 高细节模型 - 默认显示 */}
      <group ref={highDetailRef} visible={true}>
        {children}
      </group>

      {/* 中等细节模型 */}
      <group ref={mediumDetailRef} visible={false}>
        {createMediumDeviceMesh(device, uHeight, rackDepth, deviceColor, statusColor)}
      </group>

      {/* 低细节模型 */}
      <group ref={lowDetailRef} visible={false}>
        {createSimplifiedDeviceMesh(device, uHeight, rackDepth, deviceColor, statusColor)}
      </group>
    </group>
  );
};

export default LODManager;
