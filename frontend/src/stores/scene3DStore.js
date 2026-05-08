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

  selectDevice: (device) => set({ selectedDevice: device }),
  setSelectedDevice: (device) => set({ selectedDevice: device }),
  hoverDevice: (device) => set({ hoveredDevice: device }),
  setHoveredDevice: (device) => set({ hoveredDevice: device }),

  toggleDeviceSlide: () => set((state) => ({ deviceSlideEnabled: !state.deviceSlideEnabled })),
  setDeviceSlide: (enabled) => set({ deviceSlideEnabled: enabled }),
  setDeviceSlideEnabled: (enabled) => set({ deviceSlideEnabled: enabled }),

  setDevices: (devices) => set({ devices }),
  updateDevices: (devices) => set({ devices }),

  updateRacks: (racks) => set({ racks }),
  setRacks: (racks) => set({ racks }),

  selectRack: (rack) => set({ selectedRack: rack }),
  setSelectedRack: (rack) => set({ selectedRack: rack }),

  updateDeviceCables: (cables) => set({ deviceCables: cables }),
  setDeviceCables: (cables) => set({ deviceCables: cables }),

  setLoading: (loading) => set({ loadingDevices: loading }),
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
