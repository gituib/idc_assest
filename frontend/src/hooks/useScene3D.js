/**
 * 3D场景 Hook
 * 直接使用 Zustand Store 管理3D场景状态
 */

import { useScene3DStore } from '../stores/scene3DStore';

export const useScene3D = () => {
  return useScene3DStore();
};

export default useScene3D;