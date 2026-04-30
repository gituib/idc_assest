import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import CanvasRenderer from './CanvasRenderer';
import CanvasInteraction from './CanvasInteraction';

const FloorPlanCanvas = forwardRef(({ room, racks, viewMode, heatMapDimension, editMode, onRackClick, onRackDoubleClick, onRackHover, onDeviceHover, onRackDragEnd, onViewChange }, ref) => {
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
    animateToRack: (rack) => interactionRef.current?.animateToRack(rack),
    setSearchHighlight: (rackId) => rendererRef.current?.setSearchHighlight(rackId),
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
      onRackDragEnd,
      onViewChange,
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
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setData(room, racks || []);
      // 数据更新后自动居中显示
      if (room) {
        setTimeout(() => {
          interactionRef.current?.fitToView();
        }, 50);
      }
    }
  }, [room, racks]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setViewMode(viewMode, heatMapDimension);
    }
  }, [viewMode, heatMapDimension]);

  useEffect(() => {
    if (interactionRef.current) {
      interactionRef.current.setEditMode(editMode);
    }
  }, [editMode]);

  useEffect(() => {
    if (rendererRef.current && room) {
      setTimeout(() => {
        interactionRef.current?.fitToView();
      }, 100);
    }
  }, [room?.roomId]);

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
