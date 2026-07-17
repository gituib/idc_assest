import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const PERFORMANCE_MODE = true;

// 背板渲染控制常量
const BACK_PANEL_CONFIG = {
  // 相机在正面时不渲染背板（z > threshold）
  visibilityThreshold: -0.3,
  // 距离阈值：太远时不渲染详细背板
  detailDistanceThreshold: 3.0,
  // 简化背板距离：超过此距离只显示基础背板
  simplifiedDistanceThreshold: 1.5,
};

// ==================== 全局共享几何体和材质缓存 ====================
// 这些资源只创建一次，所有设备组件共享，大幅减少显存占用

// 基础几何体（使用 scale 调整大小，避免重复创建）
const SHARED_GEOMETRIES = {
  // 1x1x1 单位立方体，使用时通过 scale 调整尺寸
  box: new THREE.BoxGeometry(1, 1, 1),
  // 圆形几何体
  circle: new THREE.CircleGeometry(1, 16),
  // 圆柱体
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
};

// 共享材质（按类型分类，避免重复创建相同材质）
// 优化：升级为深黑拉丝金属质感，贴近真实服务器面板材质
const SHARED_MATERIALS = {
  // 机身材质 - 深黑金属，高金属度+中等粗糙度模拟冷轧钢板
  chassis: new THREE.MeshStandardMaterial({
    color: '#1a1a1a',
    roughness: 0.45,
    metalness: 0.85,
  }),
  // 面板材质 - 深黑拉丝铝，metalness 高+roughness 中等
  panel: new THREE.MeshStandardMaterial({
    color: '#2a2a2a',
    roughness: 0.35,
    metalness: 0.9,
  }),
  // 面板高亮材质 - 悬停/选中时使用，略浅+发光
  panelHover: new THREE.MeshStandardMaterial({
    color: '#3a3a3a',
    roughness: 0.3,
    metalness: 0.9,
    emissive: '#1e40af',
    emissiveIntensity: 0.08,
  }),
  // LED 灯材质
  led: new THREE.MeshBasicMaterial({
    toneMapped: false,
  }),
  // 状态灯底座 - 银色金属圈
  ledBase: new THREE.MeshStandardMaterial({
    color: '#4a4a4a',
    roughness: 0.3,
    metalness: 0.9,
  }),
  // 深色面板 - 用于服务器主面板背景
  darkPanel: new THREE.MeshStandardMaterial({
    color: '#0d0d0d',
    roughness: 0.5,
    metalness: 0.7,
  }),
  // 硬盘托架 - 深灰金属，略带反光
  driveBay: new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.4,
    metalness: 0.8,
  }),
  // 装饰条 - 黑色高光
  accent: new THREE.MeshStandardMaterial({
    color: '#000000',
    roughness: 0.15,
    metalness: 0.5,
  }),
  // 金属细节 - 银色铝合金
  metalDetail: new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.25,
    metalness: 0.95,
  }),
  // 网口
  networkPort: new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.3,
    metalness: 0.6,
  }),
  // 网口发光
  networkLed: new THREE.MeshBasicMaterial({
    color: '#10b981',
    toneMapped: false,
  }),
  // 电源
  powerSupply: new THREE.MeshStandardMaterial({
    color: '#374151',
    roughness: 0.5,
  }),
  // 风扇
  fan: new THREE.MeshStandardMaterial({
    color: '#1f2937',
    roughness: 0.4,
  }),
  // 散热孔
  vent: new THREE.MeshStandardMaterial({
    color: '#111827',
  }),
};

// InstancedMesh 共享几何体
const SHARED_INSTANCED_GEOMETRIES = {
  // 状态灯
  statusLight: new THREE.CircleGeometry(0.0015, 8),
  // 硬盘托架
  driveBay: new THREE.BoxGeometry(0.07, 0.035, 0.004),
  // 硬盘细节
  driveDetail: new THREE.BoxGeometry(0.015, 0.025, 0.002),
  // 存储托架
  storageBay: new THREE.BoxGeometry(0.08, 0.12, 0.004),
  // 存储细节
  storageDetail: new THREE.BoxGeometry(0.06, 0.08, 0.002),
  // 网口
  networkPort: new THREE.BoxGeometry(0.012, 0.008, 0.004),
  // 网口发光
  networkLed: new THREE.BoxGeometry(0.003, 0.002, 0.001),
  // SFP端口
  sfpPort: new THREE.BoxGeometry(0.02, 0.015, 0.005),
  // SFP内部
  sfpInner: new THREE.BoxGeometry(0.016, 0.011, 0.002),
  // SFP连接器
  sfpConnector: new THREE.BoxGeometry(0.01, 0.002, 0.008),
  // SFP指示灯
  sfpLed: new THREE.ConeGeometry(0.002, 0.004, 3),
};

// InstancedMesh 共享材质
const SHARED_INSTANCED_MATERIALS = {
  // 状态灯基础材质
  statusLight: new THREE.MeshBasicMaterial({ toneMapped: false }),
  // 硬盘托架
  driveBay: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6, metalness: 0.4 }),
  // 硬盘细节
  driveDetail: new THREE.MeshStandardMaterial({ color: '#1e293b' }),
  // 存储托架
  storageBay: new THREE.MeshStandardMaterial({ color: '#374151', roughness: 0.5 }),
  // 存储细节
  storageDetail: new THREE.MeshStandardMaterial({ color: '#4b5563' }),
  // 网口
  networkPort: new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.3 }),
  // 网口发光
  networkLed: new THREE.MeshBasicMaterial({ color: '#10b981', toneMapped: false }),
};

const InstancedStatusLights = ({ count, positions, colors: statusColors, zOffset }) => {
  const meshRef = useRef();

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        dummy.position.set(positions[i].x, positions[i].y, positions[i].z + zOffset);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, positions, zOffset, dummy]);

  // 修复：正确更新实例颜色
  useEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        const color = new THREE.Color(statusColors[i] || '#22c55e');
        meshRef.current.setColorAt(i, color);
      }
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [count, statusColors]);

  // 资源清理：geometry/material 为模块级共享资源（SHARED_INSTANCED_GEOMETRIES/MATERIALS），
  // 生命周期由应用管理，组件卸载时不 dispose，避免影响其他仍在使用的实例
  useEffect(() => {
    return () => {
      // 仅清理 instanceColor 等实例级资源（若有），共享 geometry/material 不在此清理
    };
  }, []);

  return (
    <instancedMesh
      ref={meshRef}
      args={[
        SHARED_INSTANCED_GEOMETRIES.statusLight,
        SHARED_INSTANCED_MATERIALS.statusLight,
        count,
      ]}
    ></instancedMesh>
  );
};

const InstancedDriveBays = ({ count, positions, color, hasDetail = true }) => {
  const meshRef = useRef();
  const detailRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        dummy.position.set(positions[i].x, positions[i].y, positions[i].z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (detailRef.current && hasDetail) {
      for (let i = 0; i < count; i++) {
        dummy.position.set(positions[i].x + 0.04, positions[i].y, positions[i].z + 0.003);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        detailRef.current.setMatrixAt(i, dummy.matrix);
      }
      detailRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, positions, hasDetail, dummy]);

  // 资源清理：共享资源不 dispose（见 InstancedStatusLights 注释）
  useEffect(() => {
    return () => {
      // geometry/material 为模块级共享资源，不在此清理
    };
  }, []);

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[SHARED_INSTANCED_GEOMETRIES.driveBay, SHARED_INSTANCED_MATERIALS.driveBay, count]}
      ></instancedMesh>
      {hasDetail && (
        <instancedMesh
          ref={detailRef}
          args={[
            SHARED_INSTANCED_GEOMETRIES.driveDetail,
            SHARED_INSTANCED_MATERIALS.driveDetail,
            count,
          ]}
        ></instancedMesh>
      )}
    </group>
  );
};

const InstancedStorageBays = ({ count, positions, color }) => {
  const meshRef = useRef();
  const detailRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        dummy.position.set(positions[i].x, positions[i].y, positions[i].z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (detailRef.current) {
      for (let i = 0; i < count; i++) {
        dummy.position.set(positions[i].x + 0.03, positions[i].y, positions[i].z + 0.003);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        detailRef.current.setMatrixAt(i, dummy.matrix);
      }
      detailRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, positions, dummy]);

  // 资源清理：共享资源不 dispose（见 InstancedStatusLights 注释）
  useEffect(() => {
    return () => {
      // geometry/material 为模块级共享资源，不在此清理
    };
  }, []);

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[
          SHARED_INSTANCED_GEOMETRIES.storageBay,
          SHARED_INSTANCED_MATERIALS.storageBay,
          count,
        ]}
      ></instancedMesh>
      <instancedMesh
        ref={detailRef}
        args={[
          SHARED_INSTANCED_GEOMETRIES.storageDetail,
          SHARED_INSTANCED_MATERIALS.storageDetail,
          count,
        ]}
      ></instancedMesh>
    </group>
  );
};

const InstancedRJ45Ports = ({ count, positions, statuses, frontZ }) => {
  const meshRef = useRef();
  const innerRef = useRef();
  const tabRef = useRef();
  const ledRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        dummy.position.set(positions[i].x, positions[i].y + 0.012, frontZ + 0.006);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (innerRef.current) {
      for (let i = 0; i < count; i++) {
        dummy.position.set(positions[i].x, positions[i].y + 0.012, frontZ + 0.007);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        innerRef.current.setMatrixAt(i, dummy.matrix);
      }
      innerRef.current.instanceMatrix.needsUpdate = true;
    }
    if (tabRef.current) {
      for (let i = 0; i < count; i++) {
        dummy.position.set(positions[i].x, positions[i].y + 0.015, frontZ + 0.008);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        tabRef.current.setMatrixAt(i, dummy.matrix);
      }
      tabRef.current.instanceMatrix.needsUpdate = true;
    }
    if (ledRef.current) {
      for (let i = 0; i < count; i++) {
        const status = statuses[i] || 'disconnected';
        const ledY = positions[i].y + (i % 2 === 0 ? 0.021 : -0.002);
        dummy.position.set(positions[i].x - 0.004, ledY, frontZ + 0.006);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        ledRef.current.setMatrixAt(i, dummy.matrix);
      }
      ledRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, positions, statuses, frontZ, dummy]);

  const ledColors = useMemo(() => {
    return statuses.map(s =>
      s !== 'disconnected' ? (s === 'fault' ? '#ef4444' : '#22c55e') : '#475569'
    );
  }, [statuses]);

  // 资源清理：共享资源不 dispose（见 InstancedStatusLights 注释）
  useEffect(() => {
    return () => {
      // geometry/material 为模块级共享资源，不在此清理
    };
  }, []);

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[
          SHARED_INSTANCED_GEOMETRIES.networkPort,
          SHARED_INSTANCED_MATERIALS.networkPort,
          count,
        ]}
      ></instancedMesh>
      <instancedMesh
        ref={innerRef}
        args={[
          SHARED_INSTANCED_GEOMETRIES.networkPort,
          SHARED_INSTANCED_MATERIALS.networkPort,
          count,
        ]}
      ></instancedMesh>
      <instancedMesh
        ref={tabRef}
        args={[
          SHARED_INSTANCED_GEOMETRIES.networkLed,
          SHARED_INSTANCED_MATERIALS.networkLed,
          count,
        ]}
      ></instancedMesh>
      <instancedMesh
        ref={ledRef}
        args={[
          SHARED_INSTANCED_GEOMETRIES.networkLed,
          SHARED_INSTANCED_MATERIALS.networkLed,
          count,
        ]}
      ></instancedMesh>
    </group>
  );
};

const InstancedSFPports = ({ count, positions, statuses, frontZ }) => {
  const meshRef = useRef();
  const innerRef = useRef();
  const connectorRef = useRef();
  const ledRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        dummy.position.set(positions[i].x, positions[i].y, frontZ + 0.006);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (innerRef.current) {
      for (let i = 0; i < count; i++) {
        dummy.position.set(positions[i].x, positions[i].y, frontZ + 0.009);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        innerRef.current.setMatrixAt(i, dummy.matrix);
      }
      innerRef.current.instanceMatrix.needsUpdate = true;
    }
    if (connectorRef.current) {
      for (let i = 0; i < count; i++) {
        const isConnected = statuses[i] !== 'disconnected';
        dummy.position.set(positions[i].x, positions[i].y, frontZ + 0.012);
        dummy.scale.set(isConnected ? 1 : 0.001, 1, 1);
        dummy.updateMatrix();
        connectorRef.current.setMatrixAt(i, dummy.matrix);
      }
      connectorRef.current.instanceMatrix.needsUpdate = true;
    }
    if (ledRef.current) {
      for (let i = 0; i < count; i++) {
        const isConnected = statuses[i] !== 'disconnected';
        dummy.position.set(positions[i].x, positions[i].y + 0.01, frontZ + 0.009);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        ledRef.current.setMatrixAt(i, dummy.matrix);
      }
      ledRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, positions, statuses, frontZ, dummy]);

  // 修复：正确更新SFP指示灯颜色
  useEffect(() => {
    if (ledRef.current) {
      for (let i = 0; i < count; i++) {
        const isConnected = statuses[i] !== 'disconnected';
        const color = new THREE.Color(isConnected ? '#22c55e' : '#475569');
        ledRef.current.setColorAt(i, color);
      }
      if (ledRef.current.instanceColor) {
        ledRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [count, statuses]);

  // 资源清理：共享资源不 dispose（见 InstancedStatusLights 注释）
  useEffect(() => {
    return () => {
      // geometry/material 为模块级共享资源，不在此清理
    };
  }, []);

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[SHARED_INSTANCED_GEOMETRIES.sfpPort, SHARED_INSTANCED_MATERIALS.networkPort, count]}
      />
      <instancedMesh
        ref={innerRef}
        args={[SHARED_INSTANCED_GEOMETRIES.sfpInner, SHARED_INSTANCED_MATERIALS.driveDetail, count]}
      />
      <instancedMesh
        ref={connectorRef}
        args={[
          SHARED_INSTANCED_GEOMETRIES.sfpConnector,
          SHARED_INSTANCED_MATERIALS.metalDetail,
          count,
        ]}
      />
      <instancedMesh
        ref={ledRef}
        args={[SHARED_INSTANCED_GEOMETRIES.sfpLed, SHARED_INSTANCED_MATERIALS.networkLed, count]}
      />
    </group>
  );
};

const FirewallFace = ({ device, height, frontZ, isSelected }) => {
  const halfWidth = 0.4826 / 2;

  return (
    <group>
      {/* 防火墙左侧红色标识条 */}
      <mesh position={[-halfWidth + 0.02, 0, frontZ + 0.006]}>
        <boxGeometry args={[0.015, height - 0.008, 0.003]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      {/* 防火墙主面板边框 */}
      <mesh position={[-halfWidth + 0.035, 0, frontZ + 0.005]}>
        <boxGeometry args={[0.005, height - 0.004, 0.002]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>

      <mesh position={[0, 0, frontZ + 0.0055]}>
        <boxGeometry args={[0.46, height - 0.004, 0.002]} />
        {/* 防火墙主面板 - 深灰带暖调
            现实参考：Fortinet（深灰+红条）、Palo Alto（黑+蓝条）、深信服（黑+蓝条）
            采用 #3a3030 深灰带红调，呼应左侧红色品牌色条，区别于交换机的冷蓝灰 */}
        <meshStandardMaterial color="#3a3030" roughness={0.55} metalness={0.65} />
      </mesh>

      <group position={[-0.08, 0, frontZ + 0.007]}>
        <mesh>
          <boxGeometry args={[0.12, 0.03, 0.002]} />
          <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.8} />
        </mesh>
        <group position={[0, 0, 0.002]}>
          <mesh>
            <boxGeometry args={[0.1, 0.001, 0.001]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.5} />
          </mesh>
        </group>
      </group>

      <group position={[0.1, 0, frontZ + 0.007]}>
        {!PERFORMANCE_MODE &&
          Array.from({ length: 4 }).map((_, col) => (
            <mesh key={col} position={[-0.03 + col * 0.02, 0, 0]}>
              <circleGeometry args={[0.008, 6]} />
              <meshBasicMaterial color="#1a202c" />
            </mesh>
          ))}
        {/* 优化：移除 pointLight，改用半透明光晕 mesh 模拟橙色辉光
            原 pointLight distance=0.2 影响范围 20cm，开销大于视觉收益 */}
        {!PERFORMANCE_MODE && (
          <mesh position={[0, 0, -0.005]} scale={[3, 3, 1]}>
            <circleGeometry args={[0.008, 16]} />
            <meshBasicMaterial
              color="#f97316"
              transparent
              opacity={0.3}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>

      <group position={[0.2, 0.01, frontZ + 0.008]}>
        {['#22c55e', '#22c55e', device.status === 'error' ? '#ef4444' : '#4b5563'].map(
          (color, i) => (
            <mesh key={i} position={[0, -i * 0.01, 0]}>
              <circleGeometry args={[0.002, 8]} />
              <meshBasicMaterial color={color} toneMapped={false} />
              {/* 优化：移除 pointLight，告警红色 LED 用半透明光晕 mesh 补偿 */}
              {i === 2 && device.status === 'error' && (
                <mesh scale={[3, 3, 1]}>
                  <circleGeometry args={[0.002, 8]} />
                  <meshBasicMaterial
                    color="#ef4444"
                    transparent
                    opacity={0.3}
                    toneMapped={false}
                    depthWrite={false}
                  />
                </mesh>
              )}
            </mesh>
          )
        )}
      </group>
    </group>
  );
};

const DeviceModel = ({
  device,
  rackHeight,
  isSelected,
  onClick,
  onHover,
  uHeight: propUHeight,
  position,
  rackDepth,
  slideEnabled = true,
}) => {
  const mesh = useRef();
  const groupRef = useRef();
  const [hovered, setHover] = useState(false);
  // 使用 ref 存储动画状态，避免每帧触发 React 状态更新
  const isExtendedRef = useRef(false);
  const currentZRef = useRef(0);
  // 使用 ref 避免重复设置悬停状态
  const isHoveredRef = useRef(false);

  // 背板渲染控制：用 ref 替代 state，避免切换时触发整个 DeviceModel 重渲染
  // 始终挂载背板 JSX（useMemo 缓存），通过 backPanelGroupRef.visible 直接控制显示
  const backPanelGroupRef = useRef();
  const backPanelVisibleRef = useRef(false);
  const { camera } = useThree();
  const prevCameraZRef = useRef(null);

  // 双击检测：记录上次点击时间，区分单击（选中）和双击（滑出）
  const lastClickTimeRef = useRef(0);
  const DOUBLE_CLICK_THRESHOLD = 300; // 双击间隔阈值（毫秒）

  // 使用传入的 uHeight (默认为 0.04445m)
  const uHeight = propUHeight || 0.04445;
  const depth = rackDepth || 1.0; // 机柜深度，默认1米

  // 滑轨动画 - 仅在展开时运行且slideEnabled为true
  // 使用 ref 直接操作 mesh，避免 React 状态更新
  useFrame(() => {
    if (!slideEnabled || (!isExtendedRef.current && Math.abs(currentZRef.current) < 0.001)) {
      return;
    }
    const targetZ = isExtendedRef.current ? 0.6 : 0;
    const lerpFactor = 0.1;
    currentZRef.current += (targetZ - currentZRef.current) * lerpFactor;

    // 直接操作 group 的 position，不通过 React state
    if (groupRef.current) {
      groupRef.current.position.z = currentZRef.current;
    }
  });

  // 背板可见性控制 - 根据相机 Z 坐标直接切换 visible 属性
  // 零 React 重渲染：只改 Three.js Object3D.visible
  useFrame(() => {
    if (!backPanelGroupRef.current) return;

    const cameraZ = camera.position.z;

    // 仅当相机 Z 坐标变化超过阈值（0.1）时才检查
    if (prevCameraZRef.current !== null && Math.abs(cameraZ - prevCameraZRef.current) < 0.1) {
      return;
    }
    prevCameraZRef.current = cameraZ;

    // 相机在正面（z > threshold）时隐藏背板，背面时显示
    const shouldShow = cameraZ <= BACK_PANEL_CONFIG.visibilityThreshold;

    // 只在状态变化时修改 visible，避免每帧写入
    if (shouldShow !== backPanelVisibleRef.current) {
      backPanelVisibleRef.current = shouldShow;
      backPanelGroupRef.current.visible = shouldShow;
    }
  });

  // 尺寸定义 (适配标准 0.6m 机柜)
  // 标准19英寸机柜内部净宽约 0.45m，设备面板宽 0.4826m (19inch)
  const chassisWidth = 0.44; // 机身宽度 440mm
  const chassisDepth = 0.8; // 机身深度 800mm
  const panelWidth = 0.4826; // 前面板宽度 482.6mm (19英寸)
  const panelDepth = 0.02; // 前面板厚度 20mm

  // 计算实际位置（防止超出机柜）
  // 优先使用父组件传入的 position，如果未传入则内部计算（作为 fallback）
  // 注意：父组件 RackModel 已经计算好了 position=[0, yPos, 0]
  // 我们只需要处理设备的高度

  const dHeight = device.height || device.u_height || 1;
  const height = dHeight * uHeight;

  // 间隙调整：减少设备上下间隙，使其更饱满，减少视觉偏差
  const gap = 0.002; // 总间隙 2mm

  // Z轴定位
  // 假设机柜中心为0，前沿为 depth/2
  // 设备前面板应该贴近前沿
  const frontZ = depth / 2 - 0.02;
  const panelZ = frontZ - panelDepth / 2;
  const chassisZ = frontZ - panelDepth - chassisDepth / 2;

  // 颜色定义 (参考 CSS 变量)
  const colors = {
    server: '#3b82f6', // --color-device-server
    switch: '#22c55e', // --color-device-switch
    router: '#f59e0b', // --color-device-router
    firewall: '#ef4444', // --color-device-firewall
    storage: '#8b5cf6', // --color-device-storage
    default: '#3b82f6',
    status: {
      running: '#10b981', // --color-status-running
      warning: '#f59e0b', // --color-status-warning
      error: '#ef4444', // --color-status-error
      offline: '#6b7280', // --color-status-offline
    },
    panelBg: '#1e293b', // 深色面板背景
    panelLight: '#334155',
    text: '#f1f5f9',
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

  const deviceColor = getDeviceColor(device.type);
  const statusColor = colors.status[device.status] || colors.status.running;

  // 渲染服务器前面板细节
  // 增强：硬盘托架拉把、通风孔阵列、USB/VGA接口、品牌标签条
  const renderServerFace = () => {
    const is2U = height > 0.08;
    const driveRows = is2U ? 2 : 1;
    const driveCols = PERFORMANCE_MODE ? 3 : 4;
    const driveWidth = 0.07;
    const driveHeight = 0.035;

    const drivePositions = [];
    for (let row = 0; row < driveRows; row++) {
      for (let col = 0; col < driveCols; col++) {
        if (!is2U && row > 0) continue;
        const xPos = (col - 1) * (driveWidth + 0.005);
        const yPos = is2U ? (row === 0 ? 0.02 : -0.02) : 0;
        drivePositions.push({ x: xPos, y: yPos, z: 0 });
      }
    }

    return (
      <group>
        {/* 服务器主面板 - 深灰金属拉丝质感
            现实参考：Dell PowerEdge/HPE ProLiant 前面板为深灰金属（非纯黑）
            采用 #2a2e35 深石墨灰，与机柜银灰框架形成层次，与黑色机箱区分 */}
        <mesh position={[0, 0, frontZ + 0.0055]}>
          <boxGeometry args={[0.44, height - 0.004, 0.002]} />
          <meshStandardMaterial color="#2a2e35" roughness={0.5} metalness={0.75} />
        </mesh>
        {/* 服务器左侧标识条 - 亮蓝色，模拟 Dell/华为厂商品牌色带 */}
        <mesh position={[-0.21, 0, frontZ + 0.006]}>
          <boxGeometry args={[0.015, height - 0.008, 0.003]} />
          <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
        </mesh>
        {/* 品牌标签条 - 银色铝合金条，位于顶部 */}
        <mesh position={[-0.1, height / 2 - 0.008, frontZ + 0.007]}>
          <boxGeometry args={[0.08, 0.004, 0.001]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.95} />
        </mesh>
        {/* 通风孔阵列 - 右侧用 InstancedMesh 模拟散热孔（深色小方块） */}
        {!PERFORMANCE_MODE && (
          <group position={[0.18, is2U ? 0.03 : 0.01, frontZ + 0.007]}>
            {Array.from({ length: 3 }).map((_, row) =>
              Array.from({ length: 6 }).map((_, col) => (
                <mesh
                  key={`vent-${row}-${col}`}
                  position={[(col - 2.5) * 0.008, row * 0.003, 0]}
                >
                  <boxGeometry args={[0.006, 0.0015, 0.001]} />
                  <meshStandardMaterial color="#000" roughness={0.6} />
                </mesh>
              ))
            )}
          </group>
        )}

        <group position={[-0.18, 0, frontZ + 0.006]}>
          {/* 控制面板底座 - 黑色高光 */}
          <mesh position={[-0.02, 0, 0]}>
            <boxGeometry args={[0.04, height - 0.01, 0.002]} />
            <meshStandardMaterial color="#000" roughness={0.15} metalness={0.5} />
          </mesh>
          {/* 电源按钮 - 银色金属圈 */}
          <group position={[-0.025, 0.01, 0.002]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.002, 16]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.95} />
            </mesh>
            {/* 电源 LED */}
            <mesh position={[0, 0, 0.0011]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.002, 0.002, 0.001, 16]} />
              <meshBasicMaterial
                color={device.status === 'offline' ? '#4b5563' : '#22c55e'}
                toneMapped={false}
              />
            </mesh>
          </group>
          {/* 状态 LED - 蓝色心跳灯 */}
          <mesh position={[-0.015, 0.01, 0.002]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.002, 0.002, 0.002, 16]} />
            <meshBasicMaterial color="#3b82f6" toneMapped={false} />
          </mesh>
          {/* USB 接口 - 2 个黑色矩形 */}
          <mesh position={[-0.02, -0.005, 0.002]}>
            <boxGeometry args={[0.012, 0.006, 0.002]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[-0.02, -0.013, 0.002]}>
            <boxGeometry args={[0.012, 0.006, 0.002]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.3} />
          </mesh>
          {/* VGA 接口 - 梯形深蓝色 */}
          <mesh position={[-0.02, -0.02, 0.0015]}>
            <boxGeometry args={[0.014, 0.008, 0.003]} />
            <meshStandardMaterial color="#1e3a8a" roughness={0.4} metalness={0.3} />
          </mesh>
          {/* VGA 接口中心孔 */}
          <mesh position={[-0.02, -0.02, 0.003]}>
            <boxGeometry args={[0.01, 0.005, 0.001]} />
            <meshStandardMaterial color="#000" />
          </mesh>
        </group>

        <group position={[0.05, 0, frontZ + 0.006]}>
          <InstancedDriveBays
            count={drivePositions.length}
            positions={drivePositions}
            color="#1e293b"
            hasDetail={!PERFORMANCE_MODE}
          />
          {/* 硬盘托架拉把 - 每个托架上方添加银色金属拉手 */}
          {!PERFORMANCE_MODE &&
            drivePositions.map((pos, i) => (
              <mesh
                key={`drive-handle-${i}`}
                position={[pos.x, pos.y - 0.012, 0.003]}
              >
                <boxGeometry args={[0.05, 0.003, 0.002]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.95} />
              </mesh>
            ))}
          {/* 硬盘活动指示灯 - 每个托架左下角小绿点 */}
          {!PERFORMANCE_MODE &&
            drivePositions.map((pos, i) => (
              <mesh
                key={`drive-led-${i}`}
                position={[pos.x - 0.025, pos.y - 0.012, 0.004]}
              >
                <circleGeometry args={[0.001, 8]} />
                <meshBasicMaterial color="#22c55e" toneMapped={false} />
              </mesh>
            ))}
        </group>

        <group position={[0.2, 0, frontZ + 0.006]}>
          {/* 重置按钮 - 银色小圆点 */}
          <mesh position={[0, 0, 0.002]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.005, 0.005, 0.002, 6]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* 标签插槽 - 黑色凹槽 */}
          <mesh position={[0, 0, 0.003]}>
            <boxGeometry args={[0.012, 0.006, 0.001]} />
            <meshBasicMaterial color="#000" />
          </mesh>
        </group>
      </group>
    );
  };

  // 渲染存储设备前面板细节
  // 增强：硬盘托架拉把、阵列指示灯、品牌标签
  const renderStorageFace = () => {
    const rows = PERFORMANCE_MODE ? 2 : 3;
    const cols = PERFORMANCE_MODE ? 2 : 4;
    const bayWidth = 0.1;
    const bayHeight = 0.028;

    const bayPositions = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const xPos = (col - 1) * (bayWidth + 0.002);
        const yStep = (height - 0.02) / rows;
        const yPos = (rows - 1 - row) * yStep - ((rows - 1) * yStep) / 2;
        bayPositions.push({ x: xPos, y: yPos, z: 0 });
      }
    }

    return (
      <group>
        {/* 存储设备主面板 - 深灰金属质感
            现实参考：Dell EMC/NetApp/华为 OceanStor 前面板为深灰金属
            采用 #2a2a2e 深炭灰，略偏冷，与服务器形成细微差异 */}
        <mesh position={[0, 0, frontZ + 0.0055]}>
          <boxGeometry args={[0.44, height - 0.004, 0.002]} />
          <meshStandardMaterial color="#2a2a2e" roughness={0.45} metalness={0.8} />
        </mesh>
        {/* 存储设备左侧标识条 - 紫色，存储品牌色 */}
        <mesh position={[-0.21, 0, frontZ + 0.006]}>
          <boxGeometry args={[0.015, height - 0.008, 0.003]} />
          <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.3} />
        </mesh>
        {/* 品牌标签条 - 银色铝合金 */}
        <mesh position={[-0.1, height / 2 - 0.006, frontZ + 0.007]}>
          <boxGeometry args={[0.08, 0.003, 0.001]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.95} />
        </mesh>
        {/* 阵列状态指示灯排 - 4 个小 LED，位于顶部右侧 */}
        <group position={[0.15, height / 2 - 0.006, frontZ + 0.007]}>
          {Array.from({ length: 4 }).map((_, i) => (
            <mesh key={`array-led-${i}`} position={[i * 0.005, 0, 0]}>
              <circleGeometry args={[0.0012, 8]} />
              <meshBasicMaterial
                color={i === 0 ? '#22c55e' : i === 1 ? '#3b82f6' : '#4b5563'}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>

        <group position={[0, 0, frontZ + 0.008]}>
          <InstancedStorageBays
            count={bayPositions.length}
            positions={bayPositions}
            color="#1e293b"
          />
          {/* 硬盘托架拉把 - 每个托架中间添加银色金属拉手 */}
          {!PERFORMANCE_MODE &&
            bayPositions.map((pos, i) => (
              <mesh
                key={`storage-handle-${i}`}
                position={[pos.x, pos.y, 0.003]}
              >
                <boxGeometry args={[0.06, 0.003, 0.002]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.95} />
              </mesh>
            ))}
          {/* 硬盘活动指示灯 - 每个托架左下角 */}
          {!PERFORMANCE_MODE &&
            bayPositions.map((pos, i) => (
              <mesh
                key={`storage-led-${i}`}
                position={[pos.x - 0.04, pos.y - 0.008, 0.004]}
              >
                <circleGeometry args={[0.001, 8]} />
                <meshBasicMaterial color="#22c55e" toneMapped={false} />
              </mesh>
            ))}
        </group>
      </group>
    );
  };

  // 渲染交换机前面板细节
  const renderSwitchFace = () => {
    const getPortStatus = portName => {
      if (!device.cables || !Array.isArray(device.cables)) return 'disconnected';
      const cable = device.cables.find(
        c =>
          (c.sourceDeviceId === device.deviceId && c.sourcePort === portName) ||
          (c.targetDeviceId === device.deviceId && c.targetPort === portName)
      );
      return cable ? cable.status || 'normal' : 'disconnected';
    };

    const sfpCount = PERFORMANCE_MODE ? 2 : 4;
    const rj45GroupCount = PERFORMANCE_MODE ? 2 : 4;
    const rj45ColCount = PERFORMANCE_MODE ? 4 : 6;

    const sfpPositions = [];
    const sfpStatuses = [];
    for (let i = 0; i < sfpCount; i++) {
      sfpPositions.push({ x: -0.13 + i * 0.025, y: -0.005, z: 0 });
      sfpStatuses.push(getPortStatus(`SFP+ ${i + 1}`));
    }

    const rj45PortCount = rj45GroupCount * rj45ColCount * 2;
    const rj45Positions = [];
    const rj45Statuses = [];
    for (let groupIndex = 0; groupIndex < rj45GroupCount; groupIndex++) {
      const groupX = -0.02 + groupIndex * 0.09;
      for (let colIndex = 0; colIndex < rj45ColCount; colIndex++) {
        const portX = -0.03 + colIndex * 0.012;
        const globalCol = groupIndex * rj45ColCount + colIndex;
        const topPortNum = globalCol * 2 + 1;
        const bottomPortNum = globalCol * 2 + 2;
        const topStatus = getPortStatus(`Port ${topPortNum}`);
        const bottomStatus = getPortStatus(`Port ${bottomPortNum}`);
        rj45Positions.push({ x: groupX + portX, y: 0, z: 0 });
        rj45Statuses.push(topStatus);
        rj45Positions.push({ x: groupX + portX, y: -0.024, z: 0 });
        rj45Statuses.push(bottomStatus);
      }
    }

    return (
      <group>
        {/* 交换机主面板 - 中灰偏蓝金属质感
            现实参考：Cisco Catalyst（深蓝黑）、华为 CloudEngine（深灰）、H3C（浅灰）
            采用 #3a4250 中灰偏蓝，是所有设备中最浅的，便于与服务器/存储区分
            网络设备通常为银灰/蓝灰金属，明度高于服务器 */}
        <mesh position={[0, 0, frontZ + 0.0055]}>
          <boxGeometry args={[0.44, height - 0.004, 0.002]} />
          <meshStandardMaterial color="#3a4250" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* 交换机左侧标识条 - 亮绿色，交换机品牌色 */}
        <mesh position={[-0.21, 0, frontZ + 0.006]}>
          <boxGeometry args={[0.015, height - 0.008, 0.003]} />
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.3} />
        </mesh>
        {/* 品牌标签条 - 银色铝合金 */}
        <mesh position={[-0.1, height / 2 - 0.006, frontZ + 0.007]}>
          <boxGeometry args={[0.08, 0.003, 0.001]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.95} />
        </mesh>
        {/* 端口标签条 - 银色横条，用于刻印端口号 */}
        <mesh position={[0.05, height / 2 - 0.006, frontZ + 0.007]}>
          <boxGeometry args={[0.25, 0.002, 0.001]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.9} />
        </mesh>
        {/* 交换机类型标识 */}
        <mesh position={[-0.19, height / 2 - 0.015, frontZ + 0.007]}>
          <boxGeometry args={[0.025, 0.012, 0.002]} />
          <meshStandardMaterial color="#065f46" roughness={0.3} metalness={0.7} />
        </mesh>

        <group position={[-0.19, 0, frontZ + 0.006]}>
          {/* 控制面板 - 深黑金属 */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.05, height - 0.015, 0.002]} />
            <meshStandardMaterial color="#0d0d0d" roughness={0.4} metalness={0.7} />
          </mesh>
          {/* LED 显示屏 - 银色边框 */}
          <mesh position={[-0.015, 0.005, 0.002]}>
            <boxGeometry args={[0.012, 0.01, 0.002]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.95} />
          </mesh>
          {/* 显示屏内容 - 蓝色发光 */}
          <mesh position={[-0.015, 0.005, 0.003]}>
            <boxGeometry args={[0.01, 0.008, 0.001]} />
            <meshBasicMaterial color="#3b82f6" toneMapped={false} />
          </mesh>
          {/* 状态指示灯 - 银色金属圈 */}
          <mesh position={[-0.015, 0.012, 0.002]}>
            <boxGeometry args={[0.012, 0.002, 0.001]} />
            <meshBasicMaterial color="#3b82f6" toneMapped={false} />
          </mesh>

          {/* Console 接口 - 银色 */}
          <mesh position={[0.015, 0.005, 0.002]}>
            <boxGeometry args={[0.008, 0.012, 0.002]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.95} />
          </mesh>

          {/* SYS/PWR 状态 LED 阵列 - 增强为带标签的指示灯组 */}
          <group position={[0, -0.01, 0.002]}>
            {['SYS', 'PWR'].map((label, idx) => (
              <group key={label} position={[(idx - 0.5) * 0.02, 0, 0]}>
                {/* LED 底座 - 银色金属圈 */}
                <mesh position={[0, 0, 0]}>
                  <circleGeometry args={[0.002, 16]} />
                  <meshStandardMaterial color="#4a4a4a" roughness={0.3} metalness={0.9} />
                </mesh>
                {/* LED 发光体 */}
                <mesh position={[0, 0, 0.001]}>
                  <circleGeometry args={[0.0015, 8]} />
                  <meshBasicMaterial
                    color={idx === 0 ? '#22c55e' : '#3b82f6'}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            ))}
          </group>
        </group>

        <group position={[-0.13, -0.005, 0]}>
          <InstancedSFPports
            count={sfpCount}
            positions={sfpPositions}
            statuses={sfpStatuses}
            frontZ={frontZ}
          />
        </group>

        <group position={[-0.02, 0, 0]}>
          <InstancedRJ45Ports
            count={rj45PortCount}
            positions={rj45Positions}
            statuses={rj45Statuses}
            frontZ={frontZ}
          />
        </group>
      </group>
    );
  };

  // 渲染完整版背板（包含 PSU、风扇、网卡等细节）
  // 增强：PSU 拉把、风扇网格纹理、网卡接口细节、品牌标签
  // 用 useCallback 包装，确保依赖变化时才重建函数
  const renderFullBackPanel = useCallback(backZ => {
    return (
      <group position={[0, 0, backZ]} rotation={[0, Math.PI, 0]}>
        {/* 基础背板 - 深黑金属，半透明 */}
        <mesh position={[0, 0, 0.001]}>
          <boxGeometry args={[chassisWidth, height - gap, 0.002]} />
          <meshStandardMaterial
            color="#1a1a1a"
            transparent
            opacity={0.4}
            roughness={0.4}
            metalness={0.8}
          />
        </mesh>
        {/* 背板品牌标签 - 银色铝合金 */}
        <mesh position={[0, height / 2 - 0.006, 0.003]}>
          <boxGeometry args={[0.1, 0.003, 0.001]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.95} />
        </mesh>

        {/* 电源模块 (PSU) - 左侧，带拉把和细节 */}
        <group position={[0.25, 0, 0.002]}>
          {[-0.02, 0.02].map((yOffset, i) => (
            <group key={i} position={[0, height > 0.15 ? yOffset * 2 : 0, 0]}>
              {(height > 0.15 || i === 0) && (
                <group position={[i === 1 && height <= 0.15 ? -0.06 : 0, 0, 0]}>
                  {/* PSU 面板 - 银色金属 */}
                  <mesh>
                    <boxGeometry args={[0.05, height > 0.15 ? 0.04 : 0.08, 0.004]} />
                    <meshStandardMaterial color="#94a3b8" roughness={0.25} metalness={0.95} />
                  </mesh>
                  {/* PSU 拉把 - 黑色，带凹槽 */}
                  <mesh position={[0, 0, 0.004]}>
                    <boxGeometry args={[0.012, 0.022, 0.004]} />
                    <meshStandardMaterial color="#000" roughness={0.3} metalness={0.4} />
                  </mesh>
                  {/* 拉把凹槽 */}
                  <mesh position={[0, 0, 0.006]}>
                    <boxGeometry args={[0.008, 0.018, 0.001]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
                  </mesh>
                  {/* 电源插口 - 深色 IEC C14 接口 */}
                  <mesh position={[0.015, 0, 0.002]}>
                    <boxGeometry args={[0.012, 0.01, 0.002]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.3} />
                  </mesh>
                  {/* 电源插口孔位 */}
                  <mesh position={[0.017, 0.002, 0.003]}>
                    <boxGeometry args={[0.004, 0.004, 0.001]} />
                    <meshStandardMaterial color="#000" />
                  </mesh>
                  <mesh position={[0.017, -0.002, 0.003]}>
                    <boxGeometry args={[0.004, 0.004, 0.001]} />
                    <meshStandardMaterial color="#000" />
                  </mesh>
                  {/* PSU 状态灯 - 绿色 */}
                  <mesh position={[-0.015, 0.012, 0.002]}>
                    <circleGeometry args={[0.002, 8]} />
                    <meshBasicMaterial color="#22c55e" toneMapped={false} />
                  </mesh>
                </group>
              )}
            </group>
          ))}
        </group>

        {/* 风扇模块 (Fan Modules) - 中间，带网格纹理和拉把 */}
        <group position={[0, 0, 0.002]}>
          {Array.from({ length: 3 }).map((_, i) => (
            <group key={i} position={[-0.1 + i * 0.1, 0, 0]}>
              {/* 风扇网罩 - 深黑金属 */}
              <mesh>
                <boxGeometry args={[0.08, height - 0.03, 0.001]} />
                <meshStandardMaterial color="#0d0d0d" roughness={0.4} metalness={0.7} />
              </mesh>
              {/* 风扇叶片 - 深灰，带中心轴 */}
              <mesh position={[0, 0, 0.001]}>
                <circleGeometry args={[Math.min(0.035, (height - 0.03) / 2), 16]} />
                <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.6} />
              </mesh>
              {/* 风扇中心轴 - 银色 */}
              <mesh position={[0, 0, 0.002]}>
                <circleGeometry args={[0.005, 16]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.95} />
              </mesh>
              {/* 风扇网格线 - 4 条横线模拟网罩 */}
              {[-0.012, -0.004, 0.004, 0.012].map(y => (
                <mesh key={`fan-line-${i}-${y}`} position={[0, y, 0.0015]}>
                  <boxGeometry args={[0.07, 0.0005, 0.0005]} />
                  <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.4} />
                </mesh>
              ))}
              {/* 红色拉把 - 用于抽拉风扇模块 */}
              <mesh position={[0, -0.015, 0.003]}>
                <boxGeometry args={[0.012, 0.004, 0.002]} />
                <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.4} />
              </mesh>
            </group>
          ))}
        </group>

        {/* 网卡/扩展模块 (PCIe/LOM) - 右侧，带接口细节 */}
        <group position={[-0.25, 0, 0.002]}>
          {Array.from({ length: 2 }).map((_, i) => (
            <group key={i} position={[i * 0.08, 0, 0]}>
              {/* 网卡挡板 - 银色铝合金 */}
              <mesh>
                <boxGeometry args={[0.02, height - 0.02, 0.001]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.95} />
              </mesh>
              {/* 上端口 - 黑色 RJ45 */}
              <mesh position={[0, 0.01, 0.002]}>
                <boxGeometry args={[0.012, 0.012, 0.002]} />
                <meshStandardMaterial color="#0d0d0d" roughness={0.5} metalness={0.3} />
              </mesh>
              {/* 上端口 LED */}
              <mesh position={[0.006, 0.014, 0.003]}>
                <boxGeometry args={[0.002, 0.002, 0.001]} />
                <meshBasicMaterial color="#22c55e" toneMapped={false} />
              </mesh>
              {/* 下端口 - 黑色 RJ45 */}
              <mesh position={[0, -0.01, 0.002]}>
                <boxGeometry args={[0.012, 0.012, 0.002]} />
                <meshStandardMaterial color="#0d0d0d" roughness={0.5} metalness={0.3} />
              </mesh>
              {/* 下端口 LED */}
              <mesh position={[0.006, -0.006, 0.003]}>
                <boxGeometry args={[0.002, 0.002, 0.001]} />
                <meshBasicMaterial color="#3b82f6" toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    );
  }, [chassisWidth, height, gap]);

  // 背板 JSX 用 useMemo 缓存，仅在 device/尺寸变化时重建
  // 始终挂载到场景中，通过 backPanelGroupRef.visible 控制显示
  const backPanel = useMemo(() => {
    const backZ = chassisZ - chassisDepth / 2;
    return renderFullBackPanel(backZ);
  }, [chassisZ, chassisDepth, renderFullBackPanel]);
  const renderDeviceFace = () => {
    const type = device.type?.toLowerCase() || '';
    if (type.includes('server') || type.includes('服务器')) return renderServerFace();
    if (type.includes('switch') || type.includes('交换机')) return renderSwitchFace();
    if (type.includes('storage') || type.includes('存储')) return renderStorageFace();
    if (
      type.includes('firewall') ||
      type.includes('防火墙') ||
      type.includes('router') ||
      type.includes('路由器')
    ) {
      return (
        <FirewallFace device={device} height={height} frontZ={frontZ} isSelected={isSelected} />
      );
    }

    // 默认通用设备样式
    return (
      <group>
        {/* 默认面板 - 中性灰金属质感
            用于路由器等未明确分类的设备
            现实参考：Cisco ISR/华为 AR 路由器多为银灰/深灰金属 */}
        <mesh position={[0, 0, frontZ + 0.0055]}>
          <boxGeometry args={[0.44, height - 0.004, 0.002]} />
          <meshStandardMaterial color="#3a4250" roughness={0.5} metalness={0.75} />
        </mesh>
        {/* 左侧橙色标识条 - 路由器品牌色 */}
        <mesh position={[-0.21, 0, frontZ + 0.006]}>
          <boxGeometry args={[0.015, height - 0.008, 0.003]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
        </mesh>
        {/* 装饰线 */}
        <mesh position={[0, 0, frontZ + 0.007]}>
          <boxGeometry args={[0.4, 0.003, 0.001]} />
          <meshStandardMaterial color={deviceColor} />
        </mesh>
      </group>
    );
  };

  return (
    <group position={position || [0, 0, 0]}>
      <group
        ref={groupRef}
        onClick={e => {
          e.stopPropagation();
          // 双击检测：300ms 内的第二次点击视为双击，切换滑出状态
          const now = Date.now();
          const isDoubleClick =
            now - lastClickTimeRef.current < DOUBLE_CLICK_THRESHOLD;
          lastClickTimeRef.current = now;

          if (isDoubleClick) {
            // 双击：切换滑出状态
            isExtendedRef.current = !isExtendedRef.current;
          }
          // 单击和双击都触发选中回调（让详情面板打开）
          onClick && onClick(device);
        }}
        onPointerOver={e => {
          e.stopPropagation();
          // 使用 ref 避免重复设置状态
          if (!isHoveredRef.current) {
            isHoveredRef.current = true;
            setHover(true);
            onHover && onHover(device);
          }
        }}
        onPointerOut={e => {
          // 重置 ref 并更新状态
          if (isHoveredRef.current) {
            isHoveredRef.current = false;
            setHover(false);
            onHover && onHover(null);
          }
        }}
      >
        {/* 机身 (Chassis) - 使用共享几何体和材质 */}
        <mesh
          ref={mesh}
          position={[0, 0, chassisZ]}
          geometry={SHARED_GEOMETRIES.box}
          material={SHARED_MATERIALS.chassis}
          scale={[chassisWidth, height - gap, chassisDepth]}
        />

        {/* 前面板底座 (Front Panel Base) - 使用共享资源 */}
        <mesh
          position={[0, 0, panelZ]}
          geometry={SHARED_GEOMETRIES.box}
          material={hovered || isSelected ? SHARED_MATERIALS.panelHover : SHARED_MATERIALS.panel}
          scale={[panelWidth, height - gap, panelDepth]}
        />

        {/* 设备上下银色边框条 - 模拟机箱拉手/前面板边框
            作用：相邻深黑设备之间形成明显银色分隔条，解决"整块黑色"辨识度问题
            位置：紧贴面板上下边缘，z 完全在前面板底座之前
            修复 Z-fighting：原 z 中心 frontZ+0.0005 厚度 0.003，后表面 0.479 与前面板前表面 0.48 重叠
            现 z 中心 frontZ+0.002 厚度 0.002，z 范围 0.481-0.483 完全在前面板前，间隙 0.001
            相邻设备的两条边框相接后形成约 4mm 厚银色分隔条 */}
        <mesh
          position={[0, (height - gap) / 2, frontZ + 0.002]}
          geometry={SHARED_GEOMETRIES.box}
          material={SHARED_MATERIALS.metalDetail}
          scale={[panelWidth, 0.002, 0.002]}
        />
        <mesh
          position={[0, -(height - gap) / 2, frontZ + 0.002]}
          geometry={SHARED_GEOMETRIES.box}
          material={SHARED_MATERIALS.metalDetail}
          scale={[panelWidth, 0.002, 0.002]}
        />

        {/* 告警时的红色辉光 (设备两侧)
            优化：移除 2 个 pointLight，改用半透明红色 mesh 模拟辉光
            原 pointLight distance=0.3 影响范围约 30cm，会照亮相邻机柜片元开销大
            emissive mesh 视觉等效且无光源计算开销 */}
        {(device.status === 'error' || device.status === 'fault') && (
          <>
            <mesh position={[-chassisWidth / 2 - 0.005, 0, frontZ]}>
              <planeGeometry args={[0.01, height - gap]} />
              <meshBasicMaterial
                color="#ff0000"
                transparent
                opacity={0.6}
                toneMapped={false}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            <mesh position={[chassisWidth / 2 + 0.005, 0, frontZ]}>
              <planeGeometry args={[0.01, height - gap]} />
              <meshBasicMaterial
                color="#ff0000"
                transparent
                opacity={0.6}
                toneMapped={false}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </>
        )}

        {/* 设备特定前面板细节 */}
        {renderDeviceFace()}

        {/* 设备背板细节 - 始终挂载，通过 ref 控制 visible 避免重渲染 */}
        <group ref={backPanelGroupRef} visible={false}>
          {backPanel}
        </group>
      </group>

      {/* 设备名称 (悬浮显示，避免遮挡细节) - 暂时禁用 */}
      {/* {hovered && (
          <Text
            position={[0, height/2 + 0.02, frontZ + 0.05]}
            fontSize={0.04}
            color="white"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.002}
            outlineColor="#000000"
          >
            {device.name}
          </Text>
      )} */}

      {/* 状态指示灯 (统一位置) - 使用共享几何体 */}
      <group position={[panelWidth / 2 - 0.03, 0, frontZ + 0.01]}>
        {/* 灯座 */}
        <mesh
          position={[0, 0, -0.002]}
          geometry={SHARED_GEOMETRIES.circle}
          material={SHARED_MATERIALS.ledBase}
          scale={[0.01, 0.01, 1]}
        />
        {/* 发光体 - 需要动态颜色，使用克隆材质 */}
        <mesh>
          <circleGeometry args={[0.008, 16]} />
          <meshBasicMaterial color={statusColor} toneMapped={false} />
        </mesh>
        {/* 光晕补偿：移除 pointLight 后用半透明 mesh 模拟光晕扩散
            原 pointLight distance=0.1 的影响范围极小，光晕 mesh 视觉等效 */}
        <mesh scale={[2.5, 2.5, 1]}>
          <circleGeometry args={[0.008, 16]} />
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.25}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
};

// 使用 React.memo 优化，避免不必要的重渲染
// 自定义比较函数：只在关键属性变化时才重新渲染
const DeviceModelMemo = React.memo(DeviceModel, (prevProps, nextProps) => {
  // 比较设备 ID
  if (prevProps.device?.id !== nextProps.device?.id) return false;
  if (prevProps.device?.deviceId !== nextProps.device?.deviceId) return false;

  // 比较设备类型（修复：原比较遗漏 type，设备类型变更时不重渲染导致前面板显示错误）
  if (prevProps.device?.type !== nextProps.device?.type) return false;

  // 比较选中状态
  if (prevProps.isSelected !== nextProps.isSelected) return false;

  // 比较滑出动画开关
  if (prevProps.slideEnabled !== nextProps.slideEnabled) return false;

  // 比较位置（修复：原使用 JSON.stringify 性能差，改为逐元素比较）
  const prevPos = prevProps.position;
  const nextPos = nextProps.position;
  if (prevPos !== nextPos) {
    if (
      !prevPos ||
      !nextPos ||
      prevPos[0] !== nextPos[0] ||
      prevPos[1] !== nextPos[1] ||
      prevPos[2] !== nextPos[2]
    ) {
      return false;
    }
  }

  // 比较机柜相关属性
  if (prevProps.rackHeight !== nextProps.rackHeight) return false;
  if (prevProps.rackDepth !== nextProps.rackDepth) return false;
  if (prevProps.uHeight !== nextProps.uHeight) return false;

  // 比较设备状态，确保状态变化时正确重渲染
  if (prevProps.device?.status !== nextProps.device?.status) return false;

  // 比较连接线，确保端口状态变化时正确重渲染
  const prevCables = prevProps.device?.cables;
  const nextCables = nextProps.device?.cables;
  if (Array.isArray(prevCables) && Array.isArray(nextCables)) {
    if (prevCables.length !== nextCables.length) return false;
    // 简单比较：检查每个连接线的关键属性
    for (let i = 0; i < prevCables.length; i++) {
      if (prevCables[i]?.status !== nextCables[i]?.status) return false;
    }
  } else if (prevCables !== nextCables) {
    return false;
  }

  // 以上都相同，不需要重新渲染
  return true;
});

export default DeviceModelMemo;
