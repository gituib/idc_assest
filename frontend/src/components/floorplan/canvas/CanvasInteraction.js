import {
  ZOOM,
  GRID_CELL_WIDTH,
  GRID_CELL_HEIGHT,
  GRID_ORIGIN_X,
  GRID_ORIGIN_Y,
} from './CanvasConstants';

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

    // 编辑模式相关状态
    this.isEditMode = false;
    this.editGridRows = 10;
    this.editGridCols = 10;
    // 当前正在拖拽的机柜对象
    this.draggingRack = null;
    // 拖拽起始网格位置（用于判断是否真的发生了移动）
    this.dragStartGrid = null;
    // 当前拖拽预览的网格位置
    this.dragCurrentGrid = null;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    this.bindEvents();
  }

  /**
   * 切换编辑模式
   * @param {boolean} enabled - 是否进入编辑模式
   * @returns {void}
   */
  setEditMode(enabled) {
    this.isEditMode = !!enabled;
    if (!enabled) {
      // 退出编辑模式时清理拖拽状态
      this.draggingRack = null;
      this.dragStartGrid = null;
      this.dragCurrentGrid = null;
      this.renderer.setDragPreview(null);
    }
    this.canvas.style.cursor = 'default';
  }

  /**
   * 设置编辑模式下的网格行列数
   * @param {number} rows - 行数
   * @param {number} cols - 列数
   * @returns {void}
   */
  setGridSize(rows, cols) {
    this.editGridRows = rows;
    this.editGridCols = cols;
  }

  /**
   * 更新回调集合（避免 React 闭包失效问题）
   * @param {object} callbacks - 新的回调集合
   * @returns {void}
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 将画布像素坐标转换为网格行列号
   * @param {number} canvasX - 画布X坐标
   * @param {number} canvasY - 画布Y坐标
   * @returns {{rowPos:number, colPos:number}} 网格行列号（可能为负或超出范围）
   */
  canvasToGrid(canvasX, canvasY) {
    const viewX = (canvasX - this.renderer.offsetX) / this.renderer.zoom;
    const viewY = (canvasY - this.renderer.offsetY) / this.renderer.zoom;
    const colPos = Math.floor((viewX - GRID_ORIGIN_X) / GRID_CELL_WIDTH);
    const rowPos = Math.floor((viewY - GRID_ORIGIN_Y) / GRID_CELL_HEIGHT);
    return { rowPos, colPos };
  }

  /**
   * 将网格行列号限制在用户自定义范围内
   * @param {number} rowPos - 行号
   * @param {number} colPos - 列号
   * @returns {{rowPos:number, colPos:number}|null} 限制后的网格位置，超出返回 null
   */
  clampGrid(rowPos, colPos) {
    if (rowPos < 0 || colPos < 0) return null;
    if (rowPos >= this.editGridRows || colPos >= this.editGridCols) return null;
    return { rowPos, colPos };
  }

  bindEvents() {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseLeave);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
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

    // 编辑模式下：点中机柜 → 启动拖拽；点中空白 → 平移视图
    if (this.isEditMode) {
      const hitResult = this.renderer.hitTest(coords.x, coords.y);
      if (hitResult && hitResult.rack && !hitResult.device) {
        this.draggingRack = hitResult.rack;
        const startGrid = this.renderer._resolveGridPos(hitResult.rack);
        this.dragStartGrid = startGrid;
        this.dragCurrentGrid = startGrid;
        this.renderer.setDragPreview({
          rack: hitResult.rack,
          rowPos: startGrid.rowPos,
          colPos: startGrid.colPos,
          valid: true,
        });
        this.canvas.style.cursor = 'grabbing';
        return;
      }
    }

    this.isPanning = true;
    this.canvas.style.cursor = this.isEditMode ? 'move' : 'grabbing';
  }

  onMouseMove(e) {
    const coords = this.getCanvasCoords(e);
    this.lastMouseX = coords.x;
    this.lastMouseY = coords.y;

    // 编辑模式拖拽中：计算网格位置，更新预览
    if (this.isEditMode && this.draggingRack) {
      const grid = this.canvasToGrid(coords.x, coords.y);
      const clamped = this.clampGrid(grid.rowPos, grid.colPos);
      if (clamped) {
        const valid = !this.renderer.isGridOccupied(
          clamped.rowPos,
          clamped.colPos,
          this.draggingRack.rackId
        );
        this.dragCurrentGrid = clamped;
        this.renderer.setDragPreview({
          rack: this.draggingRack,
          rowPos: clamped.rowPos,
          colPos: clamped.colPos,
          valid,
        });
      } else {
        this.dragCurrentGrid = null;
        this.renderer.setDragPreview({
          rack: this.draggingRack,
          rowPos: grid.rowPos,
          colPos: grid.colPos,
          valid: false,
        });
      }
      return;
    }

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
      // 编辑模式下机柜可拖拽 → 显示 move 光标
      this.canvas.style.cursor = this.isEditMode ? 'move' : 'pointer';

      if (hitResult.device) {
        this.callbacks.onDeviceHover?.(hitResult.device, hitResult.rack, coords.x, coords.y);
      } else {
        this.callbacks.onRackHover?.(hitResult.rack, coords.x, coords.y);
        this.callbacks.onDeviceHover?.(null);
      }
    } else {
      this.renderer.setHoveredRack(null);
      this.renderer.setHoveredDevice(null);
      this.canvas.style.cursor = this.isEditMode ? 'default' : 'default';
      this.callbacks.onRackHover?.(null);
      this.callbacks.onDeviceHover?.(null);
    }
  }

  onMouseUp(e) {
    // 编辑模式拖拽结束：提交位置（仅当目标有效且与起点不同）
    if (this.isEditMode && this.draggingRack) {
      const rack = this.draggingRack;
      const startGrid = this.dragStartGrid;
      const currentGrid = this.dragCurrentGrid;
      const valid = currentGrid &&
        !this.renderer.isGridOccupied(currentGrid.rowPos, currentGrid.colPos, rack.rackId);

      if (valid && currentGrid &&
          (currentGrid.rowPos !== startGrid.rowPos || currentGrid.colPos !== startGrid.colPos)) {
        this.callbacks.onRackDragEnd?.(rack, currentGrid.rowPos, currentGrid.colPos);
      }
      this.draggingRack = null;
      this.dragStartGrid = null;
      this.dragCurrentGrid = null;
      this.renderer.setDragPreview(null);
      this.canvas.style.cursor = 'default';
      return;
    }

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

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    racks.forEach(rack => {
      const bounds = this.renderer.getRackBounds(rack);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    const padding = 40;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const canvasWidth = this.canvas.clientWidth;
    const canvasHeight = this.canvas.clientHeight;
    const scaleX = canvasWidth / contentWidth;
    const scaleY = canvasHeight / contentHeight;
    const newZoom = Math.min(ZOOM.DEFAULT, scaleX, scaleY);

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
}

export default CanvasInteraction;
