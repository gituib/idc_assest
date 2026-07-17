import React, {
  Suspense,
  useMemo,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
const envMapUrl = '/assets/3d/env.hdr';
import RackModel from './RackModel';
import {
  useDevices,
  useSelectedDevice,
  useDeviceSlideEnabled,
} from '../../stores/scene3DStore';
import * as THREE from 'three';
import ErrorBoundary from '../ErrorBoundary';

// 检测是否为移动设备
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
// 检测是否为小屏幕
const isSmallScreen = window.innerWidth < 768;
// 移动端或小屏幕使用 dpr=1，桌面端使用 dpr=[1, 2] 提升清晰度
const deviceDpr = isMobile || isSmallScreen ? 1 : [1, 2];

// 创建全局 ref 用于外部访问 controls
const controlsRefGlobal = { current: null };

/**
 * 计算机柜相关的3D场景参数（统一一份计算，避免Controls和Scene不一致）
 * RackModel 中：最外层 group y=0.5，机柜框架高度 = rackHeight*0.04445 + 0.2（含上下板）
 * 因此机柜中心 y = 0.5 + (rackHeight*0.04445 + 0.2) / 2
 */
const getRackSceneParams = (rack) => {
  const rackHeight = rack?.height || 45;
  const uHeight = 0.04445;
  const rackHeightMeters = rackHeight * uHeight;
  const rackTotalHeight = rackHeightMeters + 0.2;
  const targetY = 0.5 + rackTotalHeight / 2;
  const distance = Math.max(3, rackTotalHeight * 1.3);
  // 相机与target同高，避免俯视导致的透视偏移（放大时机柜上跑）
  const cameraPosition = new THREE.Vector3(distance * 0.6, targetY, distance);
  const target = new THREE.Vector3(0, targetY, 0);
  const minDistance = Math.max(1.5, rackTotalHeight * 0.3);
  const maxDistance = Math.max(8, rackTotalHeight * 2);

  return { rackHeight, rackTotalHeight, targetY, distance, cameraPosition, target, minDistance, maxDistance };
};

/**
 * 相机初始化组件：在 OrbitControls 接管前，确保相机朝向 target
 * 避免 OrbitControls 以默认方向初始化导致内部状态不一致
 */
const CameraInitializer = ({ cameraPosition, target }) => {
  const { camera } = useThree();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    camera.position.copy(cameraPosition);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }, [camera, cameraPosition, target]);

  return null;
};

// 内部组件用于处理 OrbitControls
const Controls = ({ rack, onControlsReady, modalsOpen = false }) => {
  const controlsRef = useRef();
  const { camera } = useThree();
  const params = useMemo(() => getRackSceneParams(rack), [rack]);
  const { cameraPosition, target, minDistance, maxDistance } = params;

  // target 数组形式，用于 OrbitControls 的 target prop
  const targetArray = useMemo(() => [target.x, target.y, target.z], [target]);

  // 稳定 mouseButtons/touches 引用，避免每次渲染创建新对象导致 OrbitControls 重绑事件
  const mouseButtons = useMemo(
    () => ({
      LEFT: 0, // 左键旋转
      MIDDLE: 1, // 中键缩放
      RIGHT: 2, // 右键平移
    }),
    []
  );
  const touches = useMemo(
    () => ({
      ONE: 1,
      TWO: 2,
    }),
    []
  );

  // 初始化时确保相机位置和朝向正确
  useEffect(() => {
    camera.position.copy(cameraPosition);
    camera.lookAt(target);
  }, [camera, cameraPosition, target]);

  // 注册 controls 就绪回调
  useEffect(() => {
    if (controlsRef.current) {
      controlsRefGlobal.current = controlsRef.current;
      if (onControlsReady) {
        onControlsReady({
          reset: () => {
            camera.position.copy(cameraPosition);
            controlsRef.current.target.copy(target);
            controlsRef.current.update();
          },
        });
      }
    }
  }, [controlsRef.current, camera, cameraPosition, target, onControlsReady]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={targetArray}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 1.5}
      minAzimuthAngle={-Infinity}
      maxAzimuthAngle={Infinity}
      minDistance={minDistance}
      maxDistance={maxDistance}
      // 模态框打开时禁用所有交互，避免误拖动视角
      enablePan={!modalsOpen}
      enableZoom={!modalsOpen}
      enableRotate={!modalsOpen}
      mouseButtons={mouseButtons}
      touches={touches}
    />
  );
};

const Scene = forwardRef(
  ({ rack, tooltipFields, onDeviceClick, onDeviceHover, onDeviceLeave, modalsOpen = false }, ref) => {
    // 从 Context 获取3D场景状态（使用 selector 精准订阅，避免全量订阅导致过度渲染）
    const devices = useDevices();
    const selectedDevice = useSelectedDevice();
    const deviceSlideEnabled = useDeviceSlideEnabled();

    // 用于存储 controls API
    const controlsApiRef = useRef(null);

    // 使用 useImperativeHandle 暴露重置方法给父组件
    useImperativeHandle(ref, () => ({
      resetView: () => {
        if (controlsApiRef.current) {
          controlsApiRef.current.reset();
        }
      },
    }));

    // 使用 useMemo 稳定 props 引用
    const rackModelProps = useMemo(
      () => ({
        rack,
        devices,
        selectedDeviceId: selectedDevice?.id,
        onDeviceClick,
        onDeviceLeave,
        onDeviceHover,
        tooltipFields,
        deviceSlideEnabled,
      }),
      [
        rack,
        devices,
        selectedDevice,
        onDeviceClick,
        onDeviceLeave,
        onDeviceHover,
        tooltipFields,
        deviceSlideEnabled,
      ]
    );

    // 统一使用 getRackSceneParams 计算相机位置，与 Controls 保持一致
    const params = useMemo(() => getRackSceneParams(rack), [rack]);
    const cameraPosition = useMemo(
      () => [params.cameraPosition.x, params.cameraPosition.y, params.cameraPosition.z],
      [params]
    );

    return (
      <ErrorBoundary
        fullPage={false}
        title="3D 场景渲染失败"
        subTitle="3D 场景在渲染过程中遇到错误，请检查浏览器是否支持 WebGL"
      >
        <Canvas
          dpr={deviceDpr}
          performance={{ min: 0.5 }}
          gl={{
            antialias: true, // 对所有设备开启抗锯齿提升清晰度
            alpha: true, // 必须开启 alpha 以支持透明背景
            powerPreference: 'high-performance',
          }}
          style={{ background: 'transparent', touchAction: 'none' }}
        >
          <PerspectiveCamera makeDefault position={cameraPosition} fov={45} />

          {/* 相机初始化：确保 OrbitControls 接管前相机朝向正确 */}
          <CameraInitializer cameraPosition={params.cameraPosition} target={params.target} />

          <ambientLight intensity={0.5} color="#ffffff" />
          <pointLight position={[5, 8, 5]} intensity={2} color="#ffffff" />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[512, 512]}
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
          <Controls
            rack={rack}
            modalsOpen={modalsOpen}
            onControlsReady={api => {
              controlsApiRef.current = api;
            }}
          />
        </Canvas>
      </ErrorBoundary>
    );
  }
);

export default Scene;
