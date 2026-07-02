import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import CanvasRenderer from './CanvasRenderer';
import CanvasInteraction from './CanvasInteraction';

/**
 * 机房平面图画布组件
 * @param {object} room - 机房信息
 * @param {Array} racks - 机柜列表
 * @param {Function} onRackClick - 机柜点击回调
 * @param {Function} onRackDoubleClick - 机柜双击回调
 * @param {Function} onRackHover - 机柜悬停回调
 * @param {Function} onDeviceHover - 设备悬停回调
 * @param {Function} onViewChange - 视图变化回调
 * @param {boolean} editMode - 是否处于编辑模式
 * @param {number} editGridRows - 编辑网格行数
 * @param {number} editGridCols - 编辑网格列数
 * @param {Map<string, {rowPos:number, colPos:number, facing:string}>} positionOverrides - 编辑过程中未保存的位置覆盖
 * @param {Function} onRackDragEnd - 机柜拖拽结束回调 (rack, rowPos, colPos) => void
 * @param {React.Ref} ref - 外部 ref
 */
const FloorPlanCanvas = forwardRef(({
  room,
  racks,
  onRackClick,
  onRackDoubleClick,
  onRackHover,
  onDeviceHover,
  onViewChange,
  editMode,
  editGridRows,
  editGridCols,
  positionOverrides,
  onRackDragEnd,
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const interactionRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getRenderer: () => rendererRef.current,
    getInteraction: () => interactionRef.current,
    zoomIn: () => interactionRef.current?.zoomIn(),
    zoomOut: () => interactionRef.current?.zoomOut(),
    zoomReset: () => interactionRef.current?.zoomReset(),
    fitToView: () => interactionRef.current?.fitToView(),
    exportImage: (roomName) => rendererRef.current?.exportImage(roomName),
  }));

  const handleResize = useCallback(() => {
    if (!containerRef.current || !rendererRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    rendererRef.current.resize(width, height);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new CanvasRenderer(canvasRef.current);
    rendererRef.current = renderer;

    const interaction = new CanvasInteraction(canvasRef.current, renderer, {
      onRackClick,
      onRackDoubleClick,
      onRackHover,
      onDeviceHover,
      onViewChange,
      onRackDragEnd,
    });
    interactionRef.current = interaction;

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      interaction.destroy();
      rendererRef.current = null;
      interactionRef.current = null;
    };
    // 初始化仅在 mount 时执行一次；后续 props 通过下方各 useEffect 同步
  }, []);

  // 数据变化时重新绘制
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setData(room, racks || []);
      if (room) {
        setTimeout(() => {
          interactionRef.current?.fitToView();
        }, 50);
      }
    }
  }, [room, racks]);

  // 切换机房时重新适配视图
  useEffect(() => {
    if (rendererRef.current && room) {
      setTimeout(() => {
        interactionRef.current?.fitToView();
      }, 100);
    }
  }, [room?.roomId]);

  // 同步编辑模式状态到 renderer 和 interaction
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setEditMode(!!editMode);
    }
    if (interactionRef.current) {
      interactionRef.current.setEditMode(!!editMode);
    }
  }, [editMode]);

  // 同步位置覆盖到 renderer
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setPositionOverrides(positionOverrides || new Map());
    }
  }, [positionOverrides]);

  // 同步编辑网格行列数到 renderer 和 interaction
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setGridSize(editGridRows || 10, editGridCols || 10);
    }
    if (interactionRef.current) {
      interactionRef.current.setGridSize(editGridRows || 10, editGridCols || 10);
    }
  }, [editGridRows, editGridCols]);

  // 同步回调（避免 React 闭包失效）
  useEffect(() => {
    if (interactionRef.current) {
      interactionRef.current.setCallbacks({
        onRackClick,
        onRackDoubleClick,
        onRackHover,
        onDeviceHover,
        onViewChange,
        onRackDragEnd,
      });
    }
  }, [onRackClick, onRackDoubleClick, onRackHover, onDeviceHover, onViewChange, onRackDragEnd]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
});

FloorPlanCanvas.displayName = 'FloorPlanCanvas';

export default FloorPlanCanvas;
