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
const SHARED_MATERIALS = {
  // 机身材质 - 深灰色哑光金属
  chassis: new THREE.MeshStandardMaterial({ 
    color: "#333333", 
    roughness: 0.9, 
    metalness: 0.3 
  }),
  // 面板材质 - 灰色塑料
  panel: new THREE.MeshStandardMaterial({ 
    color: "#555555", 
    roughness: 0.8, 
    metalness: 0.1 
  }),
  // 面板高亮材质 - 悬停/选中时使用
  panelHover: new THREE.MeshStandardMaterial({ 
    color: "#666666", 
    roughness: 0.8, 
    metalness: 0.1 
  }),
  // LED 灯材质
  led: new THREE.MeshBasicMaterial({ 
    toneMapped: false 
  }),
  // 状态灯底座
  ledBase: new THREE.MeshStandardMaterial({ 
    color: "#333333" 
  }),
  // 深色面板
  darkPanel: new THREE.MeshStandardMaterial({ 
    color: "#1e293b", 
    roughness: 0.7, 
    metalness: 0.5 
  }),
  // 硬盘托架
  driveBay: new THREE.MeshStandardMaterial({ 
    color: "#334155", 
    roughness: 0.6, 
    metalness: 0.4 
  }),
  // 装饰条
  accent: new THREE.MeshStandardMaterial({ 
    color: "#000000", 
    roughness: 0.2 
  }),
  // 金属细节
  metalDetail: new THREE.MeshStandardMaterial({ 
    color: "#cbd5e1" 
  }),
  // 网口
  networkPort: new THREE.MeshStandardMaterial({ 
    color: "#1e293b", 
    roughness: 0.3 
  }),
  // 网口发光
  networkLed: new THREE.MeshBasicMaterial({ 
    color: "#10b981", 
    toneMapped: false 
  }),
  // 电源
  powerSupply: new THREE.MeshStandardMaterial({ 
    color: "#374151", 
    roughness: 0.5 
  }),
  // 风扇
  fan: new THREE.MeshStandardMaterial({ 
    color: "#1f2937", 
    roughness: 0.4 
  }),
  // 散热孔
  vent: new THREE.MeshStandardMaterial({ 
    color: "#111827" 
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

    // 资源清理
    useEffect(() => {
        return () => {
            if (meshRef.current) {
                meshRef.current.geometry?.dispose();
                meshRef.current.material?.dispose();
            }
        };
    }, []);

    return (
        <instancedMesh ref={meshRef} args={[SHARED_INSTANCED_GEOMETRIES.statusLight, SHARED_INSTANCED_MATERIALS.statusLight, count]}>
        </instancedMesh>
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

    // 资源清理
    useEffect(() => {
        return () => {
            if (meshRef.current) {
                meshRef.current.geometry?.dispose();
                meshRef.current.material?.dispose();
            }
            if (detailRef.current) {
                detailRef.current.geometry?.dispose();
                detailRef.current.material?.dispose();
            }
        };
    }, []);

    return (
        <group>
            <instancedMesh ref={meshRef} args={[SHARED_INSTANCED_GEOMETRIES.driveBay, SHARED_INSTANCED_MATERIALS.driveBay, count]}>
            </instancedMesh>
            {hasDetail && (
                <instancedMesh ref={detailRef} args={[SHARED_INSTANCED_GEOMETRIES.driveDetail, SHARED_INSTANCED_MATERIALS.driveDetail, count]}>
                </instancedMesh>
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

    // 资源清理
    useEffect(() => {
        return () => {
            if (meshRef.current) {
                meshRef.current.geometry?.dispose();
                meshRef.current.material?.dispose();
            }
            if (detailRef.current) {
                detailRef.current.geometry?.dispose();
                detailRef.current.material?.dispose();
            }
        };
    }, []);

    return (
        <group>
            <instancedMesh ref={meshRef} args={[SHARED_INSTANCED_GEOMETRIES.storageBay, SHARED_INSTANCED_MATERIALS.storageBay, count]}>
            </instancedMesh>
            <instancedMesh ref={detailRef} args={[SHARED_INSTANCED_GEOMETRIES.storageDetail, SHARED_INSTANCED_MATERIALS.storageDetail, count]}>
            </instancedMesh>
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
        return statuses.map(s => s !== 'disconnected' ? (s === 'fault' ? '#ef4444' : '#22c55e') : '#475569');
    }, [statuses]);

    // 资源清理
    useEffect(() => {
        return () => {
            if (meshRef.current) {
                meshRef.current.geometry?.dispose();
                meshRef.current.material?.dispose();
            }
            if (innerRef.current) {
                innerRef.current.geometry?.dispose();
                innerRef.current.material?.dispose();
            }
            if (tabRef.current) {
                tabRef.current.geometry?.dispose();
                tabRef.current.material?.dispose();
            }
            if (ledRef.current) {
                ledRef.current.geometry?.dispose();
                ledRef.current.material?.dispose();
            }
        };
    }, []);

    return (
        <group>
            <instancedMesh ref={meshRef} args={[SHARED_INSTANCED_GEOMETRIES.networkPort, SHARED_INSTANCED_MATERIALS.networkPort, count]}>
            </instancedMesh>
            <instancedMesh ref={innerRef} args={[SHARED_INSTANCED_GEOMETRIES.networkPort, SHARED_INSTANCED_MATERIALS.networkPort, count]}>
            </instancedMesh>
            <instancedMesh ref={tabRef} args={[SHARED_INSTANCED_GEOMETRIES.networkLed, SHARED_INSTANCED_MATERIALS.networkLed, count]}>
            </instancedMesh>
            <instancedMesh ref={ledRef} args={[SHARED_INSTANCED_GEOMETRIES.networkLed, SHARED_INSTANCED_MATERIALS.networkLed, count]}>
            </instancedMesh>
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

    // 资源清理
    useEffect(() => {
        return () => {
            if (meshRef.current) {
                meshRef.current.geometry?.dispose();
                meshRef.current.material?.dispose();
            }
            if (innerRef.current) {
                innerRef.current.geometry?.dispose();
                innerRef.current.material?.dispose();
            }
            if (connectorRef.current) {
                connectorRef.current.geometry?.dispose();
                connectorRef.current.material?.dispose();
            }
            if (ledRef.current) {
                ledRef.current.geometry?.dispose();
                ledRef.current.material?.dispose();
            }
        };
    }, []);

    return (
        <group>
            <instancedMesh ref={meshRef} args={[SHARED_INSTANCED_GEOMETRIES.sfpPort, SHARED_INSTANCED_MATERIALS.networkPort, count]} />
            <instancedMesh ref={innerRef} args={[SHARED_INSTANCED_GEOMETRIES.sfpInner, SHARED_INSTANCED_MATERIALS.driveDetail, count]} />
            <instancedMesh ref={connectorRef} args={[SHARED_INSTANCED_GEOMETRIES.sfpConnector, SHARED_INSTANCED_MATERIALS.metalDetail, count]} />
            <instancedMesh ref={ledRef} args={[SHARED_INSTANCED_GEOMETRIES.sfpLed, SHARED_INSTANCED_MATERIALS.networkLed, count]} />
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
            <meshStandardMaterial color="#2d3748" roughness={0.7} metalness={0.6} />
        </mesh>

        <group position={[-0.08, 0, frontZ + 0.007]}>
            <mesh>
                <boxGeometry args={[0.12, 0.03, 0.002]} />
                <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.8} />
            </mesh>
            <group position={[0, 0, 0.002]}>
                 <mesh>
                    <boxGeometry args={[0.10, 0.001, 0.001]} />
                    <meshBasicMaterial color="#10b981" transparent opacity={0.5} />
                 </mesh>
            </group>
        </group>

        <group position={[0.1, 0, frontZ + 0.007]}>
            {!PERFORMANCE_MODE && Array.from({ length: 4 }).map((_, col) => (
                 <mesh key={col} position={[-0.03 + col * 0.02, 0, 0]}>
                    <circleGeometry args={[0.008, 6]} />
                    <meshBasicMaterial color="#1a202c" />
                 </mesh>
            ))}
            {!PERFORMANCE_MODE && (
                <pointLight position={[0, 0, -0.01]} color="#f97316" intensity={0.8} distance={0.2} />
            )}
        </group>

        <group position={[0.2, 0.01, frontZ + 0.008]}>
            {['#22c55e', '#22c55e', device.status === 'error' ? '#ef4444' : '#4b5563'].map((color, i) => (
                <mesh key={i} position={[0, -i * 0.01, 0]}>
                    <circleGeometry args={[0.002, 8]} />
                    <meshBasicMaterial color={color} />
                    {i === 2 && device.status === 'error' && (
                         <pointLight color="#ef4444" intensity={1} distance={0.05} />
                    )}
                </mesh>
            ))}
        </group>
      </group>
  );
};

const DeviceModel = ({ device, rackHeight, isSelected, onClick, onHover, uHeight: propUHeight, position, rackDepth, slideEnabled = true }) => {
  const mesh = useRef();
  const groupRef = useRef();
  const [hovered, setHover] = useState(false);
  // 使用 ref 存储动画状态，避免每帧触发 React 状态更新
  const isExtendedRef = useRef(false);
  const currentZRef = useRef(0);
  // 使用 ref 避免重复设置悬停状态
  const isHoveredRef = useRef(false);

  // 背板渲染控制状态
  const [backPanelLevel, setBackPanelLevel] = useState(0); // 0: 不渲染, 1: 简化, 2: 完整
  const { camera } = useThree();
  const frameCount = useRef(0);
  
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
  
  // 背板渲染控制 - 根据相机位置动态调整
  // 只在相机绕到背面时才渲染背板
  useFrame(() => {
    // 每10帧检查一次，减少计算频率
    frameCount.current++;
    if (frameCount.current % 10 !== 0) return;

    if (!groupRef.current) return;

    // 获取相机相对设备的位置
    const deviceWorldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(deviceWorldPos);

    const cameraZ = camera.position.z;

    // 简单逻辑：相机在正面（z > threshold）时不渲染背板
    // 相机在背面（z <= threshold）时渲染完整背板
    const shouldShowBackPanel = cameraZ <= BACK_PANEL_CONFIG.visibilityThreshold;
    const newLevel = shouldShowBackPanel ? 2 : 0;

    // 只有当级别变化时才更新状态
    if (newLevel !== backPanelLevel) {
      setBackPanelLevel(newLevel);
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
        error: '#ef4444',   // --color-status-error
        offline: '#6b7280'  // --color-status-offline
    },
    panelBg: '#1e293b', // 深色面板背景
    panelLight: '#334155',
    text: '#f1f5f9'
  };

  const getDeviceColor = (type) => {
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
         {/* 服务器主面板 - 深蓝色 */}
         <mesh position={[0, 0, frontZ + 0.0055]}>
            <boxGeometry args={[0.44, height - 0.004, 0.002]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.5} />
         </mesh>
         {/* 服务器左侧标识条 - 亮蓝色 */}
         <mesh position={[-0.21, 0, frontZ + 0.006]}>
            <boxGeometry args={[0.015, height - 0.008, 0.003]} />
            <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.2} />
         </mesh>

         <group position={[-0.18, 0, frontZ + 0.006]}>
             <mesh position={[-0.02, 0, 0]}>
                 <boxGeometry args={[0.04, height - 0.01, 0.002]} />
                 <meshStandardMaterial color="#000000" roughness={0.2} />
             </mesh>
             <group position={[-0.025, 0.01, 0.002]}>
                 <mesh rotation={[Math.PI/2, 0, 0]}>
                     <cylinderGeometry args={[0.004, 0.004, 0.002, 16]} />
                     <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
                 </mesh>
                 {!PERFORMANCE_MODE && (
                     <pointLight color="#22c55e" intensity={0.5} distance={0.05} />
                 )}
                 <mesh position={[0, 0, 0.0011]} rotation={[Math.PI/2, 0, 0]}>
                     <cylinderGeometry args={[0.002, 0.002, 0.001, 16]} />
                     <meshBasicMaterial color={device.status === 'offline' ? '#4b5563' : '#22c55e'} />
                 </mesh>
             </group>
             <mesh position={[-0.015, 0.01, 0.002]} rotation={[Math.PI/2, 0, 0]}>
                 <cylinderGeometry args={[0.002, 0.002, 0.002, 16]} />
                 <meshStandardMaterial color="#3b82f6" />
             </mesh>
             <mesh position={[-0.02, -0.01, 0.002]}>
                 <boxGeometry args={[0.006, 0.012, 0.002]} />
                 <meshStandardMaterial color="#475569" />
             </mesh>
             <mesh position={[-0.02, -0.01, 0.001]}>
                 <boxGeometry args={[0.004, 0.01, 0.001]} />
                 <meshBasicMaterial color="#000" />
             </mesh>
         </group>

         <group position={[0.05, 0, frontZ + 0.006]}>
            <InstancedDriveBays 
                count={drivePositions.length} 
                positions={drivePositions} 
                color="#334155"
                hasDetail={!PERFORMANCE_MODE}
            />
         </group>
         
         <group position={[0.2, 0, frontZ + 0.006]}>
             <mesh position={[0, 0, 0.002]} rotation={[0, 0, Math.PI/2]}>
                 <cylinderGeometry args={[0.005, 0.005, 0.002, 6]} />
                 <meshStandardMaterial color="#3b82f6" />
             </mesh>
             <mesh position={[0, 0, 0.003]}>
                 <boxGeometry args={[0.012, 0.006, 0.001]} />
                 <meshBasicMaterial color="#000" />
             </mesh>
         </group>
      </group>
    );
  };

  // 渲染存储设备前面板细节
  const renderStorageFace = () => {
    const rows = PERFORMANCE_MODE ? 2 : 3;
    const cols = PERFORMANCE_MODE ? 2 : 4;
    const bayWidth = 0.10;
    const bayHeight = 0.028;

    const bayPositions = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const xPos = (col - 1) * (bayWidth + 0.002);
            const yStep = (height - 0.02) / rows;
            const yPos = (rows - 1 - row) * yStep - (rows - 1) * yStep / 2;
            bayPositions.push({ x: xPos, y: yPos, z: 0 });
        }
    }

    return (
        <group>
            {/* 存储设备主面板 - 深紫色 */}
            <mesh position={[0, 0, frontZ + 0.0055]}>
                <boxGeometry args={[0.44, height - 0.004, 0.002]} />
                <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
            {/* 存储设备左侧标识条 - 紫色 */}
            <mesh position={[-0.21, 0, frontZ + 0.006]}>
                <boxGeometry args={[0.015, height - 0.008, 0.003]} />
                <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.2} />
            </mesh>

            <group position={[0, 0, frontZ + 0.008]}>
                <InstancedStorageBays 
                    count={bayPositions.length} 
                    positions={bayPositions} 
                    color="#334155"
                />
            </group>
        </group>
    );
  };

  // 渲染交换机前面板细节
  const renderSwitchFace = () => {
    const getPortStatus = (portName) => {
        if (!device.cables || !Array.isArray(device.cables)) return 'disconnected';
        const cable = device.cables.find(c => 
            (c.sourceDeviceId === device.deviceId && c.sourcePort === portName) ||
            (c.targetDeviceId === device.deviceId && c.targetPort === portName)
        );
        return cable ? (cable.status || 'normal') : 'disconnected';
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
        {/* 交换机主面板 - 深绿色背景突出显示 */}
        <mesh position={[0, 0, frontZ + 0.0055]}>
            <boxGeometry args={[0.44, height - 0.004, 0.002]} />
            <meshStandardMaterial color="#064e3b" roughness={0.5} metalness={0.5} />
        </mesh>
        {/* 交换机左侧标识条 - 亮绿色 */}
        <mesh position={[-0.21, 0, frontZ + 0.006]}>
            <boxGeometry args={[0.015, height - 0.008, 0.003]} />
            <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.2} />
        </mesh>
        {/* 交换机类型标识 */}
        <mesh position={[-0.19, height/2 - 0.015, frontZ + 0.007]}>
            <boxGeometry args={[0.025, 0.012, 0.002]} />
            <meshStandardMaterial color="#065f46" />
        </mesh>

        <group position={[-0.19, 0, frontZ + 0.006]}>
             <mesh position={[0, 0, 0]}>
                 <boxGeometry args={[0.05, height - 0.015, 0.002]} />
                 <meshStandardMaterial color="#1e293b" />
             </mesh>
            <mesh position={[-0.015, 0.005, 0.002]}>
                <boxGeometry args={[0.012, 0.01, 0.002]} />
                <meshStandardMaterial color="#94a3b8" />
            </mesh>
            <mesh position={[-0.015, 0.012, 0.002]}>
                 <boxGeometry args={[0.012, 0.002, 0.001]} />
                 <meshBasicMaterial color="#3b82f6" />
            </mesh>

            <mesh position={[0.015, 0.005, 0.002]}>
                <boxGeometry args={[0.008, 0.012, 0.002]} />
                <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            
            <group position={[0, -0.01, 0.002]}>
                 {['SYS', 'PWR'].map((label, idx) => (
                     <group key={label} position={[(idx - 0.5) * 0.02, 0, 0]}>
                        <mesh>
                            <circleGeometry args={[0.0015, 8]} />
                            <meshBasicMaterial color="#22c55e" />
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

  // 渲染简化版背板（只显示基础背板）
  const renderSimplifiedBackPanel = (backZ) => {
    return (
      <group position={[0, 0, backZ]} rotation={[0, Math.PI, 0]}>
        {/* 基础背板 - 使用共享几何体 */}
        <mesh 
          position={[0, 0, 0.001]}
          geometry={SHARED_GEOMETRIES.box}
          material={SHARED_MATERIALS.panel}
          scale={[chassisWidth, height - gap, 0.002]}
        />
      </group>
    );
  };

  // 渲染完整版背板（包含 PSU、风扇、网卡等细节）
  const renderFullBackPanel = (backZ) => {
    return (
      <group position={[0, 0, backZ]} rotation={[0, Math.PI, 0]}>
        {/* 基础背板 - 透明玻璃质感 */}
        <mesh position={[0, 0, 0.001]}>
          <boxGeometry args={[chassisWidth, height - gap, 0.002]} />
          <meshStandardMaterial 
            color="#94a3b8" 
            transparent 
            opacity={0.3}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>

        {/* 电源模块 (PSU) - 左侧 */}
        <group position={[0.25, 0, 0.002]}>
          {[-0.02, 0.02].map((yOffset, i) => (
            <group key={i} position={[0, height > 0.15 ? yOffset * 2 : 0, 0]}> 
              {(height > 0.15 || i === 0) && (
                <group position={[i === 1 && height <= 0.15 ? -0.06 : 0, 0, 0]}>
                  {/* PSU 面板 */}
                  <mesh>
                    <boxGeometry args={[0.05, height > 0.15 ? 0.04 : 0.08, 0.004]} />
                    <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.4} />
                  </mesh>
                  {/* 把手 */}
                  <mesh position={[0, 0, 0.004]}>
                    <boxGeometry args={[0.01, 0.02, 0.004]} />
                    <meshStandardMaterial color="#000000" />
                  </mesh>
                  {/* 电源插口 */}
                  <mesh position={[0.015, 0, 0.002]}>
                    <boxGeometry args={[0.012, 0.01, 0.002]} />
                    <meshStandardMaterial color="#1a202c" />
                  </mesh>
                  {/* 状态灯 */}
                  <mesh position={[-0.015, 0.01, 0.002]}>
                    <circleGeometry args={[0.002, 8]} />
                    <meshBasicMaterial color="#22c55e" />
                  </mesh>
                </group>
              )}
            </group>
          ))}
        </group>

        {/* 风扇模块 (Fan Modules) - 中间 */}
        <group position={[0, 0, 0.002]}>
          {Array.from({ length: 3 }).map((_, i) => (
            <group key={i} position={[-0.1 + i * 0.1, 0, 0]}>
              {/* 风扇网罩 */}
              <mesh>
                <boxGeometry args={[0.08, height - 0.03, 0.001]} />
                <meshStandardMaterial color="#1e293b" />
              </mesh>
              {/* 风扇叶片 */}
              <mesh position={[0, 0, 0.001]}>
                <circleGeometry args={[Math.min(0.035, (height-0.03)/2), 8]} />
                <meshBasicMaterial color="#334155" />
              </mesh>
              {/* 红色拉手 */}
              <mesh position={[0, -0.01, 0.003]}>
                <boxGeometry args={[0.01, 0.02, 0.002]} />
                <meshStandardMaterial color="#ef4444" />
              </mesh>
            </group>
          ))}
        </group>

        {/* 网卡/扩展模块 (PCIe/LOM) - 右侧 */}
        <group position={[-0.25, 0, 0.002]}>
          {Array.from({ length: 2 }).map((_, i) => (
            <group key={i} position={[i * 0.08, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.02, height - 0.02, 0.001]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
              </mesh>
              {/* 端口 */}
              <mesh position={[0, 0.01, 0.002]}>
                <boxGeometry args={[0.012, 0.012, 0.002]} />
                <meshStandardMaterial color="#000000" />
              </mesh>
              <mesh position={[0, -0.01, 0.002]}>
                <boxGeometry args={[0.012, 0.012, 0.002]} />
                <meshStandardMaterial color="#000000" />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    );
  };

  // 根据级别渲染背板
  const renderBackPanel = () => {
    // Back face Z position
    const backZ = chassisZ - chassisDepth / 2;
    
    // 根据背板级别决定渲染内容
    switch (backPanelLevel) {
      case 0:
        // 不渲染背板
        return null;
      case 1:
        // 简化背板
        return renderSimplifiedBackPanel(backZ);
      case 2:
        // 完整背板
        return renderFullBackPanel(backZ);
      default:
        return null;
    }
  };
  const renderDeviceFace = () => {
    const type = device.type?.toLowerCase() || '';
    if (type.includes('server') || type.includes('服务器')) return renderServerFace();
    if (type.includes('switch') || type.includes('交换机')) return renderSwitchFace();
    if (type.includes('storage') || type.includes('存储')) return renderStorageFace();
    if (type.includes('firewall') || type.includes('防火墙') || type.includes('router') || type.includes('路由器')) {
        return <FirewallFace device={device} height={height} frontZ={frontZ} isSelected={isSelected} />;
    }
    
    // 默认通用设备样式
    return (
       <group>
           {/* 默认面板纹理 */}
           <mesh position={[0, 0, frontZ + 0.0055]}>
              <boxGeometry args={[0.44, height - 0.004, 0.002]} />
              <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.4} />
           </mesh>
           {/* 左侧灰色标识条 */}
           <mesh position={[-0.21, 0, frontZ + 0.006]}>
               <boxGeometry args={[0.015, height - 0.008, 0.003]} />
               <meshStandardMaterial color="#6b7280" emissive="#6b7280" emissiveIntensity={0.1} />
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
        onClick={(e) => {
          e.stopPropagation();
          isExtendedRef.current = !isExtendedRef.current;
          onClick && onClick(device);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          // 使用 ref 避免重复设置状态
          if (!isHoveredRef.current) {
            isHoveredRef.current = true;
            setHover(true);
            onHover && onHover(device);
          }
        }}
        onPointerOut={(e) => {
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

        {/* 告警时的红色辉光 (设备两侧) */}
        {(device.status === 'error' || device.status === 'fault') && (
            <>
                <pointLight position={[-0.4, 0, frontZ]} color="#ff0000" intensity={0.8} distance={0.3} />
                <pointLight position={[0.4, 0, frontZ]} color="#ff0000" intensity={0.8} distance={0.3} />
            </>
        )}

        {/* 设备特定前面板细节 */}
        {renderDeviceFace()}

        {/* 设备背板细节 */}
        {renderBackPanel()}
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
      <group position={[panelWidth/2 - 0.03, 0, frontZ + 0.01]}>
         {/* 灯座 */}
         <mesh 
           position={[0, 0, -0.002]}
           geometry={SHARED_GEOMETRIES.circle}
           material={SHARED_MATERIALS.ledBase}
           scale={[0.01, 0.01, 1]}
         />
         {/* 发光体 - 需要动态颜色，使用克隆材质 */}
         <mesh>
            <circleGeometry args={[0.006, 16]} />
            <meshBasicMaterial color={statusColor} toneMapped={false} />
         </mesh>
         {/* 光晕效果 */}
         <pointLight color={statusColor} intensity={0.5} distance={0.1} />
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

  // 比较选中状态
  if (prevProps.isSelected !== nextProps.isSelected) return false;

  // 比较滑出动画开关
  if (prevProps.slideEnabled !== nextProps.slideEnabled) return false;

  // 比较位置（使用 JSON.stringify 简单比较）
  if (JSON.stringify(prevProps.position) !== JSON.stringify(nextProps.position)) return false;

  // 比较机柜相关属性
  if (prevProps.rackHeight !== nextProps.rackHeight) return false;
  if (prevProps.rackDepth !== nextProps.rackDepth) return false;
  if (prevProps.uHeight !== nextProps.uHeight) return false;

  // 修复：比较设备状态，确保状态变化时正确重渲染
  if (prevProps.device?.status !== nextProps.device?.status) return false;

  // 修复：比较连接线，确保端口状态变化时正确重渲染
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
