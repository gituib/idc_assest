import { useFloorPlanStore } from '../../stores/floorPlanStore';

const useFloorPlanContext = () => {
  const selectedRoomId = useFloorPlanStore((s) => s.selectedRoomId);
  const selectedRack = useFloorPlanStore((s) => s.selectedRack);
  const hoveredRack = useFloorPlanStore((s) => s.hoveredRack);
  const zoom = useFloorPlanStore((s) => s.zoom);
  const offsetX = useFloorPlanStore((s) => s.offsetX);
  const offsetY = useFloorPlanStore((s) => s.offsetY);
  const detailRack = useFloorPlanStore((s) => s.detailRack);
  const detailVisible = useFloorPlanStore((s) => s.detailVisible);
  const setSelectedRoom = useFloorPlanStore((s) => s.setSelectedRoom);
  const setSelectedRack = useFloorPlanStore((s) => s.setSelectedRack);
  const setHoveredRack = useFloorPlanStore((s) => s.setHoveredRack);
  const setViewChange = useFloorPlanStore((s) => s.setViewChange);
  const showDetail = useFloorPlanStore((s) => s.showDetail);
  const hideDetail = useFloorPlanStore((s) => s.hideDetail);
  const reset = useFloorPlanStore((s) => s.reset);

  return {
    selectedRoomId,
    selectedRack,
    hoveredRack,
    zoom,
    offsetX,
    offsetY,
    detailRack,
    detailVisible,
    setSelectedRoom,
    setSelectedRack,
    setHoveredRack,
    setViewChange,
    showDetail,
    hideDetail,
    reset,
  };
};

export default useFloorPlanContext;