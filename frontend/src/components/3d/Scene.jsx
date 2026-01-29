import React, { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
const envMapUrl = '/assets/3d/env.hdr';
import RackModel from './RackModel';
import { useScene3D } from '../../context/Scene3DContext';
import * as THREE from 'three';

// 检测是否为移动设备
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
// 检测是否为小屏幕
const isSmallScreen = window.innerWidth < 768;
// 移动端或小屏幕使用 dpr=1，桌面端使用 dpr=[1, 1.5]
const deviceDpr = isMobile || isSmallScreen ? 1 : [1, 1.5];

// 内部组件用于处理 OrbitControls
const Controls = ({ rack }) => {
  const controlsRef = useRef();
  // 机柜中心点（中轴线）
  const targetY = (rack?.height || 45) * 0.04445 / 2 + 0.5;
  const fixedTarget = useMemo(() => new THREE.Vector3(0, targetY, 0), [targetY]);

  useFrame(() => {
    if (controlsRef.current) {
      // 强制保持 target 在机柜中轴线
      controlsRef.current.target.copy(fixedTarget);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 1.75}
      minAzimuthAngle={-Infinity}
      maxAzimuthAngle={Infinity}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      mouseButtons={{
        LEFT: 0,    // 左键旋转
        MIDDLE: 0,  // 中键禁用（避免平移改变旋转中心）
        RIGHT: 0    // 右键禁用
      }}
      touches={{
        ONE: 1,
        TWO: 2
      }}
    />
  );
};

const Scene = ({ rack, tooltipFields, onDeviceClick, onDeviceHover, onDeviceLeave }) => {
  // 从 Context 获取3D场景状态
  const {
    devices,
    selectedDevice,
    deviceSlideEnabled
  } = useScene3D();

  // 使用 useMemo 稳定 props 引用
  const rackModelProps = useMemo(() => ({
    rack,
    devices,
    selectedDeviceId: selectedDevice?.id,
    onDeviceClick,
    onDeviceLeave,
    onDeviceHover,
    tooltipFields,
    deviceSlideEnabled
  }), [rack, devices, selectedDevice, onDeviceClick, onDeviceLeave, onDeviceHover, tooltipFields, deviceSlideEnabled]);

  return (
    <Canvas
      shadows
      dpr={deviceDpr}
      performance={{ min: 0.5 }}
      gl={{
        antialias: !isMobile, // 移动端关闭抗锯齿提升性能
        alpha: true, // 必须开启alpha以支持透明背景
        powerPreference: 'high-performance'
      }}
      style={{ background: 'transparent' }}
    >
      <PerspectiveCamera makeDefault position={[3, 2, 4]} fov={50} />
      
      <ambientLight intensity={0.5} color="#ffffff" />
      <pointLight position={[5, 8, 5]} intensity={2} color="#ffffff" castShadow />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      
      <Suspense fallback={null}>
        <Environment files={envMapUrl} blur={0.5} resolution={256} background={false} />
      </Suspense>
      
      {/* Models */}
      <group position={[0, 0, 0]}>
        <RackModel {...rackModelProps} />
      </group>
      
      {/* Controls - 使用独立组件保持旋转中心固定 */}
      <Controls rack={rack} />
    </Canvas>
  );
};

export default Scene;