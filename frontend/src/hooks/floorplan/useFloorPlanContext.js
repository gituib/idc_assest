import { useContext } from 'react';
import FloorPlanContext from '../../context/FloorPlanContext';

const useFloorPlanContext = () => {
  const context = useContext(FloorPlanContext);
  if (!context) {
    throw new Error('useFloorPlanContext 必须在 FloorPlanProvider 内使用');
  }
  return context;
};

export default useFloorPlanContext;
