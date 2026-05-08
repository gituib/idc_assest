/**
 * 平面图状态管理 Store
 * 简化 reducer 逻辑，直接使用 set 更新状态
 */

import { create } from 'zustand';

export const useFloorPlanStore = create((set) => ({
  selectedRoomId: null,
  selectedRack: null,
  hoveredRack: null,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  detailRack: null,
  detailVisible: false,

  setSelectedRoom: (roomId) =>
    set({
      selectedRoomId: roomId,
      selectedRack: null,
      hoveredRack: null,
      detailRack: null,
      detailVisible: false,
    }),

  setSelectedRack: (rack) => set({ selectedRack: rack }),
  setHoveredRack: (rack) => set({ hoveredRack: rack }),

  setViewChange: ({ zoom, offsetX, offsetY }) => set({ zoom, offsetX, offsetY }),

  showDetail: (rack) => set({ detailRack: rack, detailVisible: true }),
  hideDetail: () => set({ detailRack: null, detailVisible: false }),

  reset: () =>
    set({
      selectedRoomId: null,
      selectedRack: null,
      hoveredRack: null,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      detailRack: null,
      detailVisible: false,
    }),
}));
