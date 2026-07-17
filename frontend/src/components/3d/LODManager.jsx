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

// 模块级共享几何体：所有 LOD 级别共用单位立方体，通过 mesh.scale 适配尺寸
// 修复 #3：原代码每次 createXxxDeviceMesh 都新建 boxGeometry，LOD 切换时累积内存泄漏
const SHARED_BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const SHARED_CIRCLE_GEO = new THREE.CircleGeometry(0.006, 16);

// 模块级共享材质（按颜色缓存，避免每次新建 meshStandardMaterial）
const materialCache = new Map();
const getCachedMaterial = (color, roughness = 0.8, metalness = 0.1) => {
  const key = `${color}_${roughness}_${metalness}`;
  if (!materialCache.has(key)) {
    materialCache.set(
      key,
      new THREE.MeshStandardMaterial({ color, roughness, metalness })
    );
  }
  return materialCache.get(key);
};

const getBasicMaterial = (color, toneMapped = false) => {
  const key = `basic_${color}_${toneMapped}`;
  if (!materialCache.has(key)) {
    materialCache.set(
      key,
      new THREE.MeshBasicMaterial({ color, toneMapped })
    );
  }
  return materialCache.get(key);
};

/**
 * 创建低细节设备 mesh（远距离用）
 * 仅保留面板 + 机身 + 状态灯，最小化 drawcall
 * 修复 #3：使用模块级共享 geometry + material cache，避免 LOD 切换时累积内存泄漏
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
      <mesh
        position={[0, 0, frontZ - panelDepth / 2]}
        geometry={SHARED_BOX_GEO}
        scale={[panelWidth, height - 0.002, panelDepth]}
        material={getCachedMaterial(deviceColor, 0.8, 0.1)}
      />
      <mesh
        position={[0, 0, frontZ - panelDepth - chassisDepth / 2]}
        geometry={SHARED_BOX_GEO}
        scale={[chassisWidth, height - 0.002, chassisDepth]}
        material={getCachedMaterial('#333333', 0.9, 0.3)}
      />
      <mesh
        position={[panelWidth / 2 - 0.03, halfHeight - 0.02, frontZ + 0.01]}
        geometry={SHARED_CIRCLE_GEO}
        material={getBasicMaterial(statusColor, false)}
      />
    </group>
  );
};

/**
 * 创建中等细节设备 mesh（中距离用）
 * 含面板 + 机身 + 基础硬盘槽位 + 状态灯
 * 修复 #3：使用模块级共享 geometry + material cache
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
      <mesh
        position={[0, 0, frontZ + 0.0055]}
        geometry={SHARED_BOX_GEO}
        scale={[0.44, height - 0.004, 0.002]}
        material={getCachedMaterial('#1e293b', 0.7, 0.5)}
      />
      <mesh
        position={[0, 0, frontZ - panelDepth / 2]}
        geometry={SHARED_BOX_GEO}
        scale={[panelWidth, height - 0.002, panelDepth]}
        material={getCachedMaterial(deviceColor, 0.8, 0.1)}
      />
      <mesh
        position={[0, 0, frontZ - panelDepth - chassisDepth / 2]}
        geometry={SHARED_BOX_GEO}
        scale={[chassisWidth, height - 0.002, chassisDepth]}
        material={getCachedMaterial('#333333', 0.9, 0.3)}
      />
      <group position={[-0.18, 0, frontZ + 0.006]}>
        <mesh
          position={[-0.02, 0, 0]}
          geometry={SHARED_BOX_GEO}
          scale={[0.04, height - 0.01, 0.002]}
          material={getCachedMaterial('#000000', 0.2, 0.1)}
        />
        <mesh
          position={[0, 0.01, 0.002]}
          geometry={SHARED_BOX_GEO}
          scale={[0.012, 0.01, 0.002]}
          material={getCachedMaterial('#cbd5e1', 0.5, 0.1)}
        />
      </group>
      <group position={[0.05, 0, frontZ + 0.006]}>
        {Array.from({ length: is2U ? 4 : 2 }).map((_, i) => (
          <mesh
            key={`drive-bay-${device.id || 'unknown'}-${i}`}
            position={[(i - 1) * 0.08, 0, 0]}
            geometry={SHARED_BOX_GEO}
            scale={[0.06, 0.03, 0.004]}
            material={getCachedMaterial('#334155', 0.6, 0.1)}
          />
        ))}
      </group>
      <mesh
        position={[panelWidth / 2 - 0.03, halfHeight - 0.02, frontZ + 0.01]}
        geometry={SHARED_CIRCLE_GEO}
        material={getBasicMaterial(statusColor, false)}
      />
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
 *   - 修复 #3：MEDIUM/LOW mesh 使用模块级共享 geometry + material cache，
 *     避免 LOD 切换时 dispose 旧级别 mesh 造成的内存泄漏
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
  // 仅依赖关键字段，避免 device 对象引用变化导致缓存失效
  const mediumMesh = useMemo(
    () => createMediumDeviceMesh(device, uHeight, rackDepth, deviceColor, statusColor),
    [device?.id, device?.height, device?.u_height, uHeight, rackDepth, deviceColor, statusColor]
  );
  const lowMesh = useMemo(
    () => createSimplifiedDeviceMesh(device, uHeight, rackDepth, deviceColor, statusColor),
    [device?.id, device?.height, device?.u_height, uHeight, rackDepth, deviceColor, statusColor]
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
