/**
 * 3D场景状态管理 Store
 * 支持精准订阅，避免3D组件不必要的重渲染
 */

import { create } from 'zustand';

export const useScene3DStore = create((set) => ({
  devices: [],
  selectedDevice: null,
  hoveredDevice: null,
  deviceSlideEnabled: false,
  selectedRack: null,
  racks: [],
  deviceCables: [],
  loadingDevices: false,

  // 统一使用 set* 前缀命名，避免重复 API 造成使用混乱
  setSelectedDevice: (device) => set({ selectedDevice: device }),
  setHoveredDevice: (device) => set({ hoveredDevice: device }),
  setDeviceSlideEnabled: (enabled) => set({ deviceSlideEnabled: enabled }),
  setDevices: (devices) => set({ devices }),
  setRacks: (racks) => set({ racks }),
  setSelectedRack: (rack) => set({ selectedRack: rack }),
  setDeviceCables: (cables) => set({ deviceCables: cables }),
  setLoadingDevices: (loading) => set({ loadingDevices: loading }),

  clearDeviceSelection: () => set({ selectedDevice: null, hoveredDevice: null }),

  reset: () =>
    set({
      devices: [],
      selectedDevice: null,
      hoveredDevice: null,
      deviceSlideEnabled: false,
      selectedRack: null,
      racks: [],
      deviceCables: [],
      loadingDevices: false,
    }),
}));

export const useDevices = () => useScene3DStore((state) => state.devices);
export const useSelectedDevice = () => useScene3DStore((state) => state.selectedDevice);
export const useRacks = () => useScene3DStore((state) => state.racks);
export const useSelectedRack = () => useScene3DStore((state) => state.selectedRack);
export const useDeviceSlideEnabled = () => useScene3DStore((state) => state.deviceSlideEnabled);
