import React, { Suspense, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
const envMapUrl = '/assets/3d/env.hdr';
import RackModel from './RackModel';
import { useScene3D } from '../../context/Scene3DContext';
import * as THREE from 'three';

// 检测是否为移动设备
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
// 检测是否为小屏幕
const isSmallScreen = window.innerWidth < 768;
// 移动端或小屏幕使用 dpr=1，桌面端使用 dpr=[1, 2] 提升清晰度
const deviceDpr = isMobile || isSmallScreen ? 1 : [1, 2];

// 创建全局 ref 用于外部访问 controls
const controlsRefGlobal = { current: null };

// 内部组件用于处理 OrbitControls
const Controls = ({ rack, onControlsReady }) => {
  const controlsRef = useRef();
  const { camera } = useThree();
  // 机柜中心点（中轴线）
  const rackHeight = rack?.height || 45;
  const targetY = rackHeight * 0.04445 / 2 + 0.5;
  const fixedTarget = useMemo(() => new THREE.Vector3(0, targetY, 0), [targetY]);

  // 根据机柜高度计算合适的相机距离限制
  const minDistance = useMemo(() => Math.max(1.5, rackHeight * 0.04445 * 0.3), [rackHeight]);
  const maxDistance = useMemo(() => Math.max(8, rackHeight * 0.04445 * 1.5), [rackHeight]);

  // 保存相机初始位置用于重置
  const initialCameraPosition = useMemo(() => {
    const rackHeightMeters = rackHeight * 0.04445;
    const baseHeight = 2;
    const heightFactor = rackHeightMeters * 0.6;
    const distance = Math.max(3, rackHeightMeters * 1.2);
    return new THREE.Vector3(distance * 0.7, baseHeight + heightFactor * 0.3, distance);
  }, [rackHeight]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRefGlobal.current = controlsRef.current;
      if (onControlsReady) {
        onControlsReady({
          reset: () => {
            // 重置相机位置
            camera.position.copy(initialCameraPosition);
            controlsRef.current.target.copy(fixedTarget);
            controlsRef.current.update();
          }
        });
      }
    }
  }, [controlsRef.current, camera, initialCameraPosition, fixedTarget, onControlsReady]);

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
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 1.5}
      minAzimuthAngle={-Infinity}
      maxAzimuthAngle={Infinity}
      minDistance={minDistance}
      maxDistance={maxDistance}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      mouseButtons={{
        LEFT: 0,    // 左键旋转
        MIDDLE: 1,  // 中键平移
        RIGHT: 2    // 右键平移
      }}
      touches={{
        ONE: 1,
        TWO: 2
      }}
    />
  );
};

const Scene = forwardRef(({ rack, tooltipFields, onDeviceClick, onDeviceHover, onDeviceLeave }, ref) => {
  // 从 Context 获取3D场景状态
  const {
    devices,
    selectedDevice,
    deviceSlideEnabled
  } = useScene3D();

  // 用于存储 controls API
  const controlsApiRef = useRef(null);

  // 使用 useImperativeHandle 暴露重置方法给父组件
  useImperativeHandle(ref, () => ({
    resetView: () => {
      if (controlsApiRef.current) {
        controlsApiRef.current.reset();
      }
    }
  }));

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

  // 根据机柜高度动态计算相机初始位置
  const rackHeight = rack?.height || 45;
  const rackHeightMeters = rackHeight * 0.04445;
  // 相机位置：确保能完整看到机柜，高度随机柜高度调整
  const cameraPosition = useMemo(() => {
    const baseHeight = 2;
    const heightFactor = rackHeightMeters * 0.6;
    const distance = Math.max(3, rackHeightMeters * 1.2);
    return [distance * 0.7, baseHeight + heightFactor * 0.3, distance];
  }, [rackHeightMeters]);

  // 相机目标点（机柜中心）
  const cameraTarget = useMemo(() => {
    return [0, rackHeightMeters / 2 + 0.5, 0];
  }, [rackHeightMeters]);

  return (
    <Canvas
      shadows
      dpr={deviceDpr}
      performance={{ min: 0.5 }}
      gl={{
        antialias: true, // 对所有设备开启抗锯齿提升清晰度
        alpha: true, // 必须开启alpha以支持透明背景
        powerPreference: 'high-performance'
      }}
      style={{ background: 'transparent' }}
    >
      <PerspectiveCamera makeDefault position={cameraPosition} fov={45} />

      <ambientLight intensity={0.5} color="#ffffff" />
      <pointLight position={[5, 8, 5]} intensity={2} color="#ffffff" castShadow />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
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
      <Controls rack={rack} onControlsReady={(api) => { controlsApiRef.current = api; }} />
    </Canvas>
  );
});

export default Scene;