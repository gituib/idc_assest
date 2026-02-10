import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

// 3D场景状态上下文
// 将3D场景状态与UI状态分离，避免不必要的重渲染

const Scene3DContext = createContext(null);

export const Scene3DProvider = ({ children }) => {
  // 3D场景相关状态
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [hoveredDevice, setHoveredDevice] = useState(null);
  const [deviceSlideEnabled, setDeviceSlideEnabled] = useState(false);
  const [selectedRack, setSelectedRack] = useState(null);
  const [racks, setRacks] = useState([]);
  const [deviceCables, setDeviceCables] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // 使用 useCallback 稳定回调函数
  const selectDevice = useCallback(device => {
    setSelectedDevice(device);
  }, []);

  const hoverDevice = useCallback(device => {
    setHoveredDevice(device);
  }, []);

  const toggleDeviceSlide = useCallback(() => {
    setDeviceSlideEnabled(prev => !prev);
  }, []);

  const setDeviceSlide = useCallback(enabled => {
    setDeviceSlideEnabled(enabled);
  }, []);

  const updateDevices = useCallback(newDevices => {
    setDevices(newDevices);
  }, []);

  const updateRacks = useCallback(newRacks => {
    setRacks(newRacks);
  }, []);

  const selectRack = useCallback(rack => {
    setSelectedRack(rack);
  }, []);

  const updateDeviceCables = useCallback(cables => {
    setDeviceCables(cables);
  }, []);

  const setLoading = useCallback(loading => {
    setLoadingDevices(loading);
  }, []);

  // 使用 useMemo 缓存 context value，避免不必要的重渲染
  const value = useMemo(
    () => ({
      // 状态
      devices,
      selectedDevice,
      hoveredDevice,
      deviceSlideEnabled,
      selectedRack,
      racks,
      deviceCables,
      loadingDevices,
      // 方法
      selectDevice,
      hoverDevice,
      toggleDeviceSlide,
      setDeviceSlide,
      updateDevices,
      updateRacks,
      selectRack,
      updateDeviceCables,
      setLoading,
      // 直接设置状态的方法（用于兼容现有代码）
      setDevices,
      setSelectedDevice,
      setHoveredDevice,
      setDeviceSlideEnabled,
      setSelectedRack,
      setRacks,
      setDeviceCables,
      setLoadingDevices,
    }),
    [
      devices,
      selectedDevice,
      hoveredDevice,
      deviceSlideEnabled,
      selectedRack,
      racks,
      deviceCables,
      loadingDevices,
      selectDevice,
      hoverDevice,
      toggleDeviceSlide,
      setDeviceSlide,
      updateDevices,
      updateRacks,
      selectRack,
      updateDeviceCables,
      setLoading,
    ]
  );

  return <Scene3DContext.Provider value={value}>{children}</Scene3DContext.Provider>;
};

// 自定义 Hook
export const useScene3D = () => {
  const context = useContext(Scene3DContext);
  if (!context) {
    throw new Error('useScene3D must be used within a Scene3DProvider');
  }
  return context;
};

export default Scene3DContext;
