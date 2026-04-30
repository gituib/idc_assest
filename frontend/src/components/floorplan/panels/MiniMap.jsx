import React, { useRef, useEffect } from 'react';
import {
  MINI_MAP_SIZE,
  MINI_MAP_PADDING,
  ROW_LABEL_WIDTH,
  COL_LABEL_HEIGHT,
  CELL_SIZE,
  CELL_GAP,
  COLORS,
  RACK_STATUS_COLORS,
} from '../canvas/CanvasConstants';

const MiniMap = ({ room, racks, zoom, offsetX, offsetY, canvasWidth, canvasHeight, onNavigate }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !room) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = MINI_MAP_SIZE * dpr;
    canvas.height = MINI_MAP_SIZE * dpr;
    canvas.style.width = `${MINI_MAP_SIZE}px`;
    canvas.style.height = `${MINI_MAP_SIZE}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, MINI_MAP_SIZE, MINI_MAP_SIZE);

    const rows = room.gridRows || 10;
    const cols = room.gridCols || 10;
    const gridSize = {
      width: ROW_LABEL_WIDTH + cols * (CELL_SIZE + CELL_GAP),
      height: COL_LABEL_HEIGHT + rows * (CELL_SIZE + CELL_GAP),
    };

    const scaleX = (MINI_MAP_SIZE - MINI_MAP_PADDING * 2) / gridSize.width;
    const scaleY = (MINI_MAP_SIZE - MINI_MAP_PADDING * 2) / gridSize.height;
    const scale = Math.min(scaleX, scaleY);

    const mapOffsetX = (MINI_MAP_SIZE - gridSize.width * scale) / 2;
    const mapOffsetY = (MINI_MAP_SIZE - gridSize.height * scale) / 2;

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, MINI_MAP_SIZE, MINI_MAP_SIZE);

    ctx.save();
    ctx.translate(mapOffsetX, mapOffsetY);
    ctx.scale(scale, scale);

    ctx.strokeStyle = COLORS.GRID_LINE;
    ctx.lineWidth = 1 / scale;
    ctx.strokeRect(ROW_LABEL_WIDTH, COL_LABEL_HEIGHT, cols * (CELL_SIZE + CELL_GAP) - CELL_GAP, rows * (CELL_SIZE + CELL_GAP) - CELL_GAP);

    const rackMap = new Map();
    (racks || []).forEach(r => {
      if (r.rowPos != null && r.colPos != null) {
        rackMap.set(`${r.rowPos}-${r.colPos}`, r);
      }
    });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ROW_LABEL_WIDTH + c * (CELL_SIZE + CELL_GAP);
        const y = COL_LABEL_HEIGHT + r * (CELL_SIZE + CELL_GAP);
        const rack = rackMap.get(`${r}-${c}`);

        if (rack) {
          ctx.fillStyle = RACK_STATUS_COLORS[rack.status] || RACK_STATUS_COLORS.active;
          ctx.globalAlpha = 0.6;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = '#e8e8e8';
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    ctx.restore();

    if (canvasWidth && canvasHeight && zoom) {
      const viewLeft = -offsetX / zoom;
      const viewTop = -offsetY / zoom;
      const viewWidth = canvasWidth / zoom;
      const viewHeight = canvasHeight / zoom;

      const vpX = viewLeft * scale + mapOffsetX;
      const vpY = viewTop * scale + mapOffsetY;
      const vpW = viewWidth * scale;
      const vpH = viewHeight * scale;

      ctx.strokeStyle = '#1677ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vpX, vpY, vpW, vpH);
      ctx.fillStyle = 'rgba(22,119,255,0.05)';
      ctx.fillRect(vpX, vpY, vpW, vpH);
    }
  }, [room, racks, zoom, offsetX, offsetY, canvasWidth, canvasHeight]);

  const handleClick = (e) => {
    if (!onNavigate || !room) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const rows = room.gridRows || 10;
    const cols = room.gridCols || 10;
    const gridSize = {
      width: ROW_LABEL_WIDTH + cols * (CELL_SIZE + CELL_GAP),
      height: COL_LABEL_HEIGHT + rows * (CELL_SIZE + CELL_GAP),
    };
    const scaleX = (MINI_MAP_SIZE - MINI_MAP_PADDING * 2) / gridSize.width;
    const scaleY = (MINI_MAP_SIZE - MINI_MAP_PADDING * 2) / gridSize.height;
    const scale = Math.min(scaleX, scaleY);
    const mapOffsetX = (MINI_MAP_SIZE - gridSize.width * scale) / 2;
    const mapOffsetY = (MINI_MAP_SIZE - gridSize.height * scale) / 2;

    const gridX = (clickX - mapOffsetX) / scale;
    const gridY = (clickY - mapOffsetY) / scale;

    onNavigate({
      targetOffsetX: -(gridX * zoom - canvasWidth / 2),
      targetOffsetY: -(gridY * zoom - canvasHeight / 2),
    });
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{
        width: MINI_MAP_SIZE,
        height: MINI_MAP_SIZE,
        border: '1px solid #e0e0e0',
        borderRadius: 6,
        cursor: 'pointer',
        background: '#f5f5f5',
      }}
    />
  );
};

export default MiniMap;
