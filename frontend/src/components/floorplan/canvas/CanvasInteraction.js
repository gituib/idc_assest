import { ZOOM, CELL_WIDTH, CELL_GAP } from './CanvasConstants';

class CanvasInteraction {
  constructor(canvas, renderer, callbacks) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.callbacks = callbacks || {};

    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.panStartOffsetX = 0;
    this.panStartOffsetY = 0;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    this.bindEvents();
  }

  bindEvents() {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseLeave);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
  }

  destroy() {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  onMouseDown(e) {
    if (e.button === 2) return;

    const coords = this.getCanvasCoords(e);
    this.lastMouseX = coords.x;
    this.lastMouseY = coords.y;
    this.panStartX = coords.x;
    this.panStartY = coords.y;
    this.panStartOffsetX = this.renderer.offsetX;
    this.panStartOffsetY = this.renderer.offsetY;
    this.isPanning = true;
    this.canvas.style.cursor = 'grabbing';
  }

  onMouseMove(e) {
    const coords = this.getCanvasCoords(e);
    this.lastMouseX = coords.x;
    this.lastMouseY = coords.y;

    if (this.isPanning) {
      const dx = coords.x - this.panStartX;
      const dy = coords.y - this.panStartY;
      this.renderer.setView(
        this.renderer.zoom,
        this.panStartOffsetX + dx,
        this.panStartOffsetY + dy
      );
      this.callbacks.onViewChange?.({
        zoom: this.renderer.zoom,
        offsetX: this.renderer.offsetX,
        offsetY: this.renderer.offsetY,
      });
      return;
    }

    const hitResult = this.renderer.hitTest(coords.x, coords.y);
    
    if (hitResult) {
      this.renderer.setHoveredRack(hitResult.rack);
      this.renderer.setHoveredDevice(hitResult.device);
      this.canvas.style.cursor = 'pointer';
      
      if (hitResult.device) {
        this.callbacks.onDeviceHover?.(hitResult.device, hitResult.rack, coords.x, coords.y);
      } else {
        this.callbacks.onRackHover?.(hitResult.rack, coords.x, coords.y);
        this.callbacks.onDeviceHover?.(null);
      }
    } else {
      this.renderer.setHoveredRack(null);
      this.renderer.setHoveredDevice(null);
      this.canvas.style.cursor = 'default';
      this.callbacks.onRackHover?.(null);
      this.callbacks.onDeviceHover?.(null);
    }
  }

  onMouseUp(e) {
    if (this.isPanning) {
      const dx = Math.abs((e ? this.getCanvasCoords(e).x : this.lastMouseX) - this.panStartX);
      const dy = Math.abs((e ? this.getCanvasCoords(e).y : this.lastMouseY) - this.panStartY);

      if (dx < 5 && dy < 5) {
        const coords = e ? this.getCanvasCoords(e) : { x: this.lastMouseX, y: this.lastMouseY };
        const hitResult = this.renderer.hitTest(coords.x, coords.y);
        if (hitResult) {
          if (hitResult.device) {
            this.callbacks.onDeviceClick?.(hitResult.device, hitResult.rack);
          } else {
            this.callbacks.onRackClick?.(hitResult.rack);
            this.renderer.setSelectedRack(hitResult.rack);
          }
        } else {
          this.renderer.setSelectedRack(null);
          this.callbacks.onRackClick?.(null);
        }
      }
      this.isPanning = false;
    }
    this.canvas.style.cursor = 'default';
  }

  onMouseLeave() {
    this.isPanning = false;
    this.renderer.setHoveredRack(null);
    this.renderer.setHoveredDevice(null);
    this.canvas.style.cursor = 'default';
    this.callbacks.onRackHover?.(null);
    this.callbacks.onDeviceHover?.(null);
  }

  onWheel(e) {
    e.preventDefault();
    const coords = this.getCanvasCoords(e);
    const delta = -e.deltaY * ZOOM.WHEEL_FACTOR;
    const newZoom = Math.max(ZOOM.MIN, Math.min(ZOOM.MAX, this.renderer.zoom * (1 + delta)));

    const scale = newZoom / this.renderer.zoom;
    const newOffsetX = coords.x - (coords.x - this.renderer.offsetX) * scale;
    const newOffsetY = coords.y - (coords.y - this.renderer.offsetY) * scale;

    this.renderer.setView(newZoom, newOffsetX, newOffsetY);
    this.callbacks.onViewChange?.({
      zoom: newZoom,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  }

  onDoubleClick(e) {
    const coords = this.getCanvasCoords(e);
    const hitResult = this.renderer.hitTest(coords.x, coords.y);
    if (hitResult) {
      if (hitResult.device) {
        this.callbacks.onDeviceDoubleClick?.(hitResult.device, hitResult.rack);
      } else {
        this.callbacks.onRackDoubleClick?.(hitResult.rack);
      }
    }
  }

  onContextMenu(e) {
    e.preventDefault();
    const coords = this.getCanvasCoords(e);
    const hitResult = this.renderer.hitTest(coords.x, coords.y);
    if (hitResult) {
      if (hitResult.device) {
        this.callbacks.onDeviceContextMenu?.(hitResult.device, hitResult.rack, coords.x, coords.y);
      } else {
        this.callbacks.onRackContextMenu?.(hitResult.rack, coords.x, coords.y);
      }
    }
  }

  onTouchStart(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseDown({
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
      });
    }
  }

  onTouchMove(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
    }
  }

  onTouchEnd(e) {
    this.onMouseUp({
      clientX: this.lastMouseX,
      clientY: this.lastMouseY,
    });
  }

  zoomIn() {
    const center = {
      x: this.canvas.clientWidth / 2,
      y: this.canvas.clientHeight / 2,
    };
    const newZoom = Math.min(ZOOM.MAX, this.renderer.zoom + ZOOM.STEP);
    this.applyZoom(newZoom, center.x, center.y);
  }

  zoomOut() {
    const center = {
      x: this.canvas.clientWidth / 2,
      y: this.canvas.clientHeight / 2,
    };
    const newZoom = Math.max(ZOOM.MIN, this.renderer.zoom - ZOOM.STEP);
    this.applyZoom(newZoom, center.x, center.y);
  }

  zoomReset() {
    this.fitToView();
  }

  fitToView() {
    const racks = this.renderer.racks;
    if (!racks || racks.length === 0) {
      this.renderer.setView(ZOOM.DEFAULT, 24, 24);
      this.callbacks.onViewChange?.({
        zoom: ZOOM.DEFAULT,
        offsetX: 24,
        offsetY: 24,
      });
      return;
    }

    // 计算所有机柜的边界框
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    racks.forEach(rack => {
      const bounds = this.renderer.getRackBounds(rack);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    // 添加padding
    const padding = 40;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // 计算合适的缩放比例
    const canvasWidth = this.canvas.clientWidth;
    const canvasHeight = this.canvas.clientHeight;
    const scaleX = canvasWidth / contentWidth;
    const scaleY = canvasHeight / contentHeight;
    const newZoom = Math.min(ZOOM.DEFAULT, scaleX, scaleY);

    // 计算居中的偏移量
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newOffsetX = canvasWidth / 2 - centerX * newZoom;
    const newOffsetY = canvasHeight / 2 - centerY * newZoom;

    this.renderer.setView(newZoom, newOffsetX, newOffsetY);
    this.callbacks.onViewChange?.({
      zoom: newZoom,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  }

  animateToRack(rack) {
    const bounds = this.renderer.getRackBounds(rack);
    const targetX = this.canvas.clientWidth / 2 - (bounds.x + bounds.width / 2) * this.renderer.zoom;
    const targetY = this.canvas.clientHeight / 2 - (bounds.y + bounds.height / 2) * this.renderer.zoom;
    this.animateTo(targetX, targetY);
    this.renderer.setSelectedRack(rack);
    this.renderer.setSearchHighlight(rack.rackId);
    setTimeout(() => this.renderer.setSearchHighlight(null), 3000);
  }

  animateTo(targetX, targetY) {
    const startX = this.renderer.offsetX;
    const startY = this.renderer.offsetY;
    const duration = 400;
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentX = startX + (targetX - startX) * eased;
      const currentY = startY + (targetY - startY) * eased;

      this.renderer.setView(this.renderer.zoom, currentX, currentY);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  applyZoom(newZoom, centerX, centerY) {
    const scale = newZoom / this.renderer.zoom;
    const newOffsetX = centerX - (centerX - this.renderer.offsetX) * scale;
    const newOffsetY = centerY - (centerY - this.renderer.offsetY) * scale;

    this.renderer.setView(newZoom, newOffsetX, newOffsetY);
    this.callbacks.onViewChange?.({
      zoom: newZoom,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  }

  setEditMode(editMode) {
    // 兼容旧API
  }
}

export default CanvasInteraction;
