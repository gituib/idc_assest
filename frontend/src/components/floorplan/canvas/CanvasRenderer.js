import {
  CELL_WIDTH,
  CELL_HEIGHT,
  CELL_GAP,
  RACK_PADDING,
  RACK_HEADER_HEIGHT,
  RACK_STATUS_BAR_HEIGHT,
  U_HEIGHT,
  U_LABEL_WIDTH_LEFT,
  U_LABEL_WIDTH_RIGHT,
  U_BODY_WIDTH,
  RACK_STATUS_COLORS,
  DEVICE_TYPE_COLORS,
  DEVICE_STATUS_COLORS,
  FONT,
} from './CanvasConstants';

class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.room = null;
    this.racks = [];
    this.rackMap = new Map();
    this.zoom = 1;
    this.offsetX = 24;
    this.offsetY = 24;
    this.hoveredRack = null;
    this.hoveredDevice = null;
    this.selectedRack = null;

    this.pendingRender = false;
    this.bgCanvas = null;
    this.bgCtx = null;
    this.lastBgWidth = 0;
    this.lastBgHeight = 0;

    this._initBackgroundCanvas();
  }

  _initBackgroundCanvas() {
    this.bgCanvas = document.createElement('canvas');
    this.bgCtx = this.bgCanvas.getContext('2d');
  }

  _updateBackgroundCache(width, height) {
    if (this.lastBgWidth === width && this.lastBgHeight === height) {
      return;
    }

    this.lastBgWidth = width;
    this.lastBgHeight = height;

    const dpr = this.dpr;
    this.bgCanvas.width = width * dpr;
    this.bgCanvas.height = height * dpr;
    this.bgCanvas.style.width = `${width}px`;
    this.bgCanvas.style.height = `${height}px`;

    const ctx = this.bgCtx;
    ctx.save();
    ctx.scale(dpr, dpr);

    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#f8fafc');
    bgGradient.addColorStop(0.5, '#f1f5f9');
    bgGradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(148,163,184,0.15)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  setDPR() {
    this.dpr = window.devicePixelRatio || 1;
  }

  resize(width, height) {
    this.setDPR();
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this._updateBackgroundCache(width, height);
    this.requestRender();
  }

  setData(room, racks) {
    this.room = room;
    this.racks = (racks || []).slice().sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
    this.rackMap.clear();
    this.racks.forEach(r => {
      if (r.rackId) this.rackMap.set(r.rackId, r);
    });
    this.requestRender();
  }

  setView(zoom, offsetX, offsetY) {
    this.zoom = zoom;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.requestRender();
  }

  setHoveredRack(rack) {
    if (this.hoveredRack !== rack) {
      this.hoveredRack = rack;
      this.requestRender();
    }
  }

  setHoveredDevice(device) {
    if (this.hoveredDevice !== device) {
      this.hoveredDevice = device;
      this.requestRender();
    }
  }

  setSelectedRack(rack) {
    if (this.selectedRack !== rack) {
      this.selectedRack = rack;
      this.requestRender();
    }
  }

  requestRender() {
    if (this.pendingRender) return;
    this.pendingRender = true;
    requestAnimationFrame(() => {
      this.pendingRender = false;
      this.render();
    });
  }

  getRackBounds(rack) {
    const name = rack.name || '';
    const firstChar = name.charAt(0).toUpperCase();
    
    let row = 0;
    if (/[A-Z]/.test(firstChar)) {
      row = firstChar.charCodeAt(0) - 65;
    }
    
    const sameRowRacks = this.racks.filter(r => {
      const rName = r.name || '';
      const rFirst = rName.charAt(0).toUpperCase();
      let rRow = 0;
      if (/[A-Z]/.test(rFirst)) {
        rRow = rFirst.charCodeAt(0) - 65;
      }
      return rRow === row;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    const col = sameRowRacks.indexOf(rack);
    
    const startX = 24;
    const startY = 24;
    const x = startX + col * (CELL_WIDTH + CELL_GAP);
    const y = startY + row * (CELL_HEIGHT + CELL_GAP);
    return { x, y, width: CELL_WIDTH, height: CELL_HEIGHT };
  }

  getDeviceBounds(rack, device) {
    const rackBounds = this.getRackBounds(rack);
    const totalU = rack.height || 42;
    const bodyY = rackBounds.y + RACK_STATUS_BAR_HEIGHT + RACK_HEADER_HEIGHT;
    const bodyHeight = rackBounds.height - RACK_STATUS_BAR_HEIGHT - RACK_HEADER_HEIGHT;
    const uHeight = Math.min(U_HEIGHT, (bodyHeight - 8) / totalU);
    
    const leftLabelW = U_LABEL_WIDTH_LEFT;
    const bodyX = rackBounds.x + RACK_PADDING + leftLabelW;
    const bodyW = U_BODY_WIDTH;
    
    const bodyStartY = bodyY + 4 + (totalU * uHeight);
    const deviceHeight = device.height || 1;
    const deviceStartY = bodyStartY - (device.position + deviceHeight - 1) * uHeight;
    const deviceH = uHeight * deviceHeight;
    
    return { x: bodyX, y: deviceStartY, width: bodyW, height: deviceH };
  }

  _getVisibleRacks(displayWidth, displayHeight) {
    const visibleRacks = [];
    const viewLeft = -this.offsetX / this.zoom;
    const viewTop = -this.offsetY / this.zoom;
    const viewRight = viewLeft + displayWidth / this.zoom;
    const viewBottom = viewTop + displayHeight / this.zoom;

    const padding = CELL_WIDTH + CELL_GAP;

    for (let i = 0; i < this.racks.length; i++) {
      const rack = this.racks[i];
      const bounds = this.getRackBounds(rack);
      
      if (bounds.x + bounds.width + padding >= viewLeft &&
          bounds.x - padding <= viewRight &&
          bounds.y + bounds.height + padding >= viewTop &&
          bounds.y - padding <= viewBottom) {
        visibleRacks.push({ rack, bounds });
      }
    }

    return visibleRacks;
  }

  hitTest(canvasX, canvasY) {
    const viewX = (canvasX - this.offsetX) / this.zoom;
    const viewY = (canvasY - this.offsetY) / this.zoom;

    for (let i = 0; i < this.racks.length; i++) {
      const rack = this.racks[i];
      const bounds = this.getRackBounds(rack);
      if (viewX >= bounds.x && viewX <= bounds.x + bounds.width && viewY >= bounds.y && viewY <= bounds.y + bounds.height) {
        const devices = rack.Devices || [];
        for (const device of devices) {
          if (device.position != null) {
            const deviceBounds = this.getDeviceBounds(rack, device);
            if (viewX >= deviceBounds.x && viewX <= deviceBounds.x + deviceBounds.width && 
                viewY >= deviceBounds.y && viewY <= deviceBounds.y + deviceBounds.height) {
              return { rack, device };
            }
          }
        }
        return { rack, device: null };
      }
    }
    return null;
  }

  render() {
    if (!this.ctx || !this.room) return;

    const ctx = this.ctx;
    const { width, height } = this.canvas;

    const displayWidth = width / this.dpr;
    const displayHeight = height / this.dpr;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    
    if (this.bgCanvas.width > 0 && this.bgCanvas.height > 0) {
      ctx.drawImage(this.bgCanvas, 0, 0, displayWidth, displayHeight);
    }

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.zoom, this.zoom);

    const visibleRacks = this._getVisibleRacks(displayWidth, displayHeight);
    for (const { rack, bounds } of visibleRacks) {
      this.drawRack(ctx, rack, bounds);
    }

    ctx.restore();
    ctx.restore();
  }

  drawRack(ctx, rack, bounds) {
    const { x, y, width, height } = bounds;
    const isSelected = this.selectedRack?.rackId === rack.rackId;
    const isHovered = this.hoveredRack?.rackId === rack.rackId;
    const statusColor = RACK_STATUS_COLORS[rack.status] || RACK_STATUS_COLORS.active;

    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, x, y, width, height, 10);

    if (isSelected) {
      ctx.shadowColor = 'rgba(22,119,255,0.25)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;
    } else if (isHovered) {
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.08)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3;
    }

    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#f9fafb');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = isSelected ? '#1677ff' : isHovered ? '#bae7ff' : '#e5e7eb';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + width - 10, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + RACK_STATUS_BAR_HEIGHT);
    ctx.lineTo(x, y + RACK_STATUS_BAR_HEIGHT);
    ctx.lineTo(x, y + RACK_STATUS_BAR_HEIGHT);
    ctx.quadraticCurveTo(x, y, x + 10, y);
    ctx.closePath();
    ctx.fillStyle = statusColor;
    ctx.fill();

    const headerGradient = ctx.createLinearGradient(x, y + RACK_STATUS_BAR_HEIGHT, x, y + RACK_STATUS_BAR_HEIGHT + RACK_HEADER_HEIGHT);
    headerGradient.addColorStop(0, '#fafafa');
    headerGradient.addColorStop(1, '#f5f5f5');
    ctx.fillStyle = headerGradient;
    ctx.fillRect(x, y + RACK_STATUS_BAR_HEIGHT, width, RACK_HEADER_HEIGHT);

    ctx.beginPath();
    ctx.moveTo(x + 10, y + RACK_STATUS_BAR_HEIGHT + RACK_HEADER_HEIGHT);
    ctx.lineTo(x + width - 10, y + RACK_STATUS_BAR_HEIGHT + RACK_HEADER_HEIGHT);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#1f2937';
    ctx.font = FONT.RACK_NAME;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rack.name, x + width / 2, y + RACK_STATUS_BAR_HEIGHT + RACK_HEADER_HEIGHT / 2);

    const deviceCount = rack.deviceCount || 0;
    const usageText = `${rack.height || 42}U • ${deviceCount}台`;
    ctx.fillStyle = '#6b7280';
    ctx.font = FONT.RACK_INFO;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(usageText, x + width - RACK_PADDING, y + RACK_STATUS_BAR_HEIGHT + RACK_HEADER_HEIGHT / 2);

    const bodyY = y + RACK_STATUS_BAR_HEIGHT + RACK_HEADER_HEIGHT;
    const bodyHeight = height - RACK_STATUS_BAR_HEIGHT - RACK_HEADER_HEIGHT;
    this.drawRackBody(ctx, rack, x, bodyY, width, bodyHeight);

    ctx.restore();
  }

  drawRackBody(ctx, rack, x, y, w, h) {
    const totalU = rack.height || 42;
    const leftLabelW = U_LABEL_WIDTH_LEFT;
    const rightLabelW = U_LABEL_WIDTH_RIGHT;
    const bodyW = U_BODY_WIDTH;
    
    const leftLabelX = x + RACK_PADDING;
    const bodyX = x + RACK_PADDING + leftLabelW;
    const rightLabelX = x + w - RACK_PADDING - rightLabelW;
    
    const uHeight = Math.min(U_HEIGHT, (h - 8) / totalU);
    
    const devices = (rack.Devices || []).filter(d => d.position != null);
    const deviceByU = new Map();
    devices.forEach(d => {
      const deviceHeight = d.height || 1;
      const startU = d.position;
      const endU = startU + deviceHeight - 1;
      for (let u = startU; u <= endU; u++) {
        deviceByU.set(u, d);
      }
    });

    this.drawULabels(ctx, leftLabelX, y + 4, leftLabelW, totalU, uHeight, 'left');
    
    const bodyStartY = y + 4 + (totalU * uHeight);
    for (let u = 1; u <= totalU; u++) {
      const currentY = bodyStartY - u * uHeight;
      const d = deviceByU.get(u);
      if (d && d.position === u) {
        const deviceHeight = d.height || 1;
        const deviceStartY = bodyStartY - (u + deviceHeight - 1) * uHeight;
        const isHovered = this.hoveredDevice?.deviceId === d.deviceId;
        this.drawDevice(ctx, d, bodyX, deviceStartY, bodyW, uHeight * deviceHeight, isHovered);
      } else if (!d) {
        this.drawEmptyU(ctx, bodyX, currentY, bodyW, uHeight);
      }
    }
    
    this.drawULabels(ctx, rightLabelX, y + 4, rightLabelW, totalU, uHeight, 'right');
  }

  drawULabels(ctx, x, y, width, totalU, uHeight, side) {
    ctx.font = FONT.U_LABEL;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let u = 1; u <= totalU; u++) {
      const yPos = y + (totalU - u) * uHeight + uHeight / 2;
      const label = `${u}U`;
      
      if (u % 2 === 0) {
        ctx.fillStyle = 'rgba(100,116,139,0.45)';
      } else {
        ctx.fillStyle = 'rgba(71,85,105,0.7)';
      }
      
      ctx.fillText(label, x + width / 2, yPos);
    }
  }

  drawEmptyU(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(148,163,184,0.08)';
    ctx.fillRect(x, y, w, h);
    
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
  }

  drawDevice(ctx, device, x, y, w, h, isHovered) {
    const typeColor = DEVICE_TYPE_COLORS[device.type] || DEVICE_TYPE_COLORS.other;
    const statusColor = DEVICE_STATUS_COLORS[device.status] || DEVICE_STATUS_COLORS.offline;

    ctx.save();
    
    const radius = 3;
    this.roundRect(ctx, x, y, w, h, radius);
    
    if (isHovered) {
      ctx.fillStyle = 'rgba(22,119,255,0.15)';
      ctx.fill();
      ctx.shadowColor = 'rgba(22,119,255,0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
    } else {
      const bgGradient = ctx.createLinearGradient(x, y, x, y + h);
      bgGradient.addColorStop(0, '#ffffff');
      bgGradient.addColorStop(1, '#f9fafb');
      ctx.fillStyle = bgGradient;
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;

    ctx.fillStyle = typeColor;
    ctx.fillRect(x, y, 5, h);

    ctx.strokeStyle = isHovered ? '#1677ff' : 'rgba(148,163,184,0.45)';
    ctx.lineWidth = isHovered ? 1.5 : 1;
    ctx.stroke();

    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(x + 12, y + h / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = isHovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isHovered ? '#0f172a' : '#374151';
    ctx.font = FONT.DEVICE_NAME;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const dName = device.name || '未命名';
    ctx.fillText(this.truncateText(ctx, dName, w - 26), x + 22, y + h / 2);
    
    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
    if (typeof r === 'number') {
      r = [r, r, r, r];
    }
    ctx.beginPath();
    ctx.moveTo(x + r[0], y);
    ctx.lineTo(x + w - r[1], y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r[1]);
    ctx.lineTo(x + w, y + h - r[2]);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
    ctx.lineTo(x + r[3], y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r[3]);
    ctx.lineTo(x, y + r[0]);
    ctx.quadraticCurveTo(x, y, x + r[0], y);
    ctx.closePath();
  }

  truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let tr = text;
    while (tr.length > 0 && ctx.measureText(tr + '…').width > maxWidth) {
      tr = tr.slice(0, -1);
    }
    return tr + '…';
  }

  exportImage(roomName) {
    if (!this.room || this.racks.length === 0) return null;

    const padding = 60;
    const titleHeight = 50;
    const footerHeight = 30;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.racks.forEach(rack => {
      const bounds = this.getRackBounds(rack);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;
    const totalWidth = contentWidth;
    const totalHeight = contentHeight + titleHeight + footerHeight;

    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    const exportDpr = 2;
    exportCanvas.width = totalWidth * exportDpr;
    exportCanvas.height = totalHeight * exportDpr;
    exportCtx.scale(exportDpr, exportDpr);

    const bgGradient = exportCtx.createLinearGradient(0, 0, 0, totalHeight);
    bgGradient.addColorStop(0, '#f8fafc');
    bgGradient.addColorStop(0.5, '#f1f5f9');
    bgGradient.addColorStop(1, '#e2e8f0');
    exportCtx.fillStyle = bgGradient;
    exportCtx.fillRect(0, 0, totalWidth, totalHeight);

    exportCtx.beginPath();
    exportCtx.strokeStyle = 'rgba(148,163,184,0.15)';
    exportCtx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < totalWidth; x += gridSize) {
      exportCtx.moveTo(x, 0);
      exportCtx.lineTo(x, totalHeight);
    }
    for (let y = 0; y < totalHeight; y += gridSize) {
      exportCtx.moveTo(0, y);
      exportCtx.lineTo(totalWidth, y);
    }
    exportCtx.stroke();

    exportCtx.fillStyle = '#1f2937';
    exportCtx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    exportCtx.textAlign = 'center';
    exportCtx.textBaseline = 'middle';
    const title = roomName || this.room?.name || '机房平面图';
    exportCtx.fillText(`${title} - 机房平面图`, totalWidth / 2, titleHeight / 2);

    exportCtx.save();
    exportCtx.translate(padding - minX, titleHeight + padding - minY);

    const originalHoveredRack = this.hoveredRack;
    const originalHoveredDevice = this.hoveredDevice;
    const originalSelectedRack = this.selectedRack;
    this.hoveredRack = null;
    this.hoveredDevice = null;
    this.selectedRack = null;

    for (const rack of this.racks) {
      const bounds = this.getRackBounds(rack);
      this.drawRack(exportCtx, rack, bounds);
    }

    this.hoveredRack = originalHoveredRack;
    this.hoveredDevice = originalHoveredDevice;
    this.selectedRack = originalSelectedRack;

    exportCtx.restore();

    exportCtx.fillStyle = '#6b7280';
    exportCtx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    exportCtx.textAlign = 'right';
    exportCtx.textBaseline = 'bottom';
    const date = new Date().toLocaleString('zh-CN');
    exportCtx.fillText(`导出时间: ${date}`, totalWidth - 10, totalHeight - 10);

    return exportCanvas.toDataURL('image/png');
  }
}

export default CanvasRenderer;
