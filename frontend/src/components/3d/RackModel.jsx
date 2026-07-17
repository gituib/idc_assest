import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import DeviceModel from './DeviceModel';
import LODManager, { LOD_LEVELS } from './LODManager';
import { getULabelTexture } from './materials/TextureCache';

// 模块级常量：设备颜色映射（避免每次渲染重建对象）
const DEVICE_COLORS = {
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

// 模块级函数：根据设备类型获取颜色
const getDeviceColor = type => {
  const t = type?.toLowerCase() || '';
  if (t.includes('server') || t.includes('服务器')) return DEVICE_COLORS.server;
  if (t.includes('switch') || t.includes('交换机')) return DEVICE_COLORS.switch;
  if (t.includes('router') || t.includes('路由器')) return DEVICE_COLORS.router;
  if (t.includes('firewall') || t.includes('防火墙')) return DEVICE_COLORS.firewall;
  if (t.includes('storage') || t.includes('存储')) return DEVICE_COLORS.storage;
  return DEVICE_COLORS.default;
};

// 模块级共享 dummy，避免每个 TickInstances 实例各创建一个 Object3D
const SHARED_DUMMY = new THREE.Object3D();

/**
 * U位刻度线 InstancedMesh 组件
 * 必须定义在模块顶层（RackModel 外部），否则每次 RackModel 渲染都会创建新组件类型，
 * 导致 React 卸载并重新挂载 InstancedMesh，触发 GPU buffer 重新分配
 */
const TickInstances = ({ instances, geometry, material }) => {
  const meshRef = useRef();

  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < instances.length; i += 1) {
      const inst = instances[i];
      SHARED_DUMMY.position.set(inst.x, inst.y, inst.z);
      SHARED_DUMMY.updateMatrix();
      meshRef.current.setMatrixAt(i, SHARED_DUMMY.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [instances, geometry, material]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, instances.length]}
    />
  );
};

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

  // 修复 #4：组件卸载时 dispose 共享 geometry/material，避免反复进出 3D 视图时显存泄漏
  useEffect(() => {
    return () => {
      majorPlaneGeo.dispose();
      minorPlaneGeo.dispose();
      majorTickGeo.dispose();
      minorTickGeo.dispose();
      majorTickMat.dispose();
      minorTickMat.dispose();
    };
  }, [majorPlaneGeo, minorPlaneGeo, majorTickGeo, minorTickGeo, majorTickMat, minorTickMat]);

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
  // 优化：机柜改为冷银灰色钣金，与深黑设备形成明暗对比，避免视觉混淆
  //   - 框架/顶底板：银灰色（冷轧钢板典型色）
  //   - 侧板：中灰色，略深于框架
  //   - 金属度高、粗糙度中等，模拟真实钣金反光
  const frame = useMemo(() => {
    const materialProps = { color: '#9ca3af', roughness: 0.4, metalness: 0.85 };
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

        {/* 侧板 - 位于立柱内侧
            修复 Z-fighting：原侧板外表面 ±0.300 与立柱外表面完全重合，
            转到侧面时两个面在同一深度，GPU 无法判断渲染顺序导致闪烁
            现将侧板移到立柱内侧（外表面 ±0.248，距立柱内表面 ±0.250 留 0.002 间隙） */}
        {[-1, 1].map(side => (
          <mesh key={`side-${side}`} position={[side * (width / 2 - postWidth - 0.005), height / 2, 0]}>
            <boxGeometry args={[0.006, height - 0.04, depth - 0.04]} />
            <meshStandardMaterial color="#6b7280" roughness={0.35} metalness={0.8} side={2} />
          </mesh>
        ))}

        {/* 前安装轨 - 机柜内部两侧的垂直银色金属导轨
            作用：1. 模拟真实机柜的设备安装导轨，增强结构真实感
                  2. 与设备上下银色边框形成呼应，强化机柜内部层次感
                  3. 提供机柜内壁与设备之间的视觉分隔
            位置：立柱内侧前方，z 完全在侧板前面
            修复 Z-fighting：
              - 原前安装轨内表面 ±0.239 与设备前面板边缘 ±0.2413 在 x 方向重叠
              - 原前安装轨 z 范围 0.4775-0.4925 与侧板 z 范围 ±0.48 在 z 方向重叠
              - 现调整中心 x 到 ±0.247（厚度 0.004），z 中心到 0.49（厚度 0.015）
              - x 外表面 ±0.249 距立柱内表面 ±0.250 间隙 0.001
              - x 内表面 ±0.245 距前面板边缘 ±0.2413 间隙 0.0037
              - z 后表面 0.4825 距侧板前表面 0.48 间隙 0.0025
              - z 前表面 0.4975 距前立柱前表面 0.500 间隙 0.0025 */}
        {[-1, 1].map(side => (
          <mesh
            key={`front-rail-${side}`}
            position={[side * (width / 2 - postWidth - 0.003), height / 2, depth / 2 - 0.01]}
          >
            <boxGeometry args={[0.004, height - 0.04, 0.015]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.95} />
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
          const statusColor = DEVICE_COLORS.status[device.status] || DEVICE_COLORS.status.running;

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

// 修复 #8：使用 React.memo 包装，避免 Scene 因无关状态变化（如 selectedDevice 引用变化）
// 触发 RackModel 不必要的重渲染，进而导致所有 useMemo 失效和 InstancedMesh 重建
const RackModelMemo = React.memo(RackModel);

export default RackModelMemo;
