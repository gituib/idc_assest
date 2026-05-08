/**
 * 平面图 Hook
 * 直接使用 Zustand Store 管理平面图状态
 */

import { useFloorPlanStore } from '../stores/floorPlanStore';

export const useFloorPlan = () => {
  return useFloorPlanStore();
};

export default useFloorPlan;