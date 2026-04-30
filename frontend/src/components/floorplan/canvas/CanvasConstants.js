// 机柜卡片基础尺寸（会根据屏幕自适应调整）
export const CELL_WIDTH = 220;
export const CELL_HEIGHT = 480;
export const CELL_GAP = 20;

// 兼容旧引用
export const CELL_SIZE = 220;
export const ROW_LABEL_WIDTH = 50;
export const COL_LABEL_HEIGHT = 30;

// 机柜内部尺寸
export const RACK_PADDING = 10;
export const RACK_HEADER_HEIGHT = 36;
export const RACK_STATUS_BAR_HEIGHT = 4;

// U位显示尺寸（双边）
export const U_HEIGHT = 10;
export const U_LABEL_WIDTH_LEFT = 28;
export const U_LABEL_WIDTH_RIGHT = 28;
export const U_BODY_WIDTH = 154;
export const U_BODY_PADDING = 6;

// 设备显示尺寸
export const DEVICE_INDICATOR_WIDTH = 3;
export const DEVICE_STATUS_DOT_SIZE = 2.5;
export const DEVICE_NAME_MAX_WIDTH = 130;

// 小地图
export const MINI_MAP_SIZE = 160;
export const MINI_MAP_PADDING = 10;

// 缩放参数
export const ZOOM = {
  MIN: 0.3,
  MAX: 2,
  STEP: 0.1,
  DEFAULT: 1,
  WHEEL_FACTOR: 0.001,
};

// 颜色定义
export const COLORS = {
  CANVAS_BG: '#f0f2f5',
  RACK_BG: '#ffffff',
  RACK_BORDER: '#d9d9d9',
  RACK_SHADOW: 'rgba(0,0,0,0.08)',
  RACK_HEADER_BG: '#fafafa',
  EMPTY_U_BG: '#f5f5f5',
  GRID_LINE: '#e8e8e8',
};

export const RACK_STATUS_COLORS = {
  active: '#1677ff',
  maintenance: '#faad14',
  inactive: '#bfbfbf',
};

export const DEVICE_TYPE_COLORS = {
  server: '#1677ff',
  switch: '#52c41a',
  router: '#faad14',
  firewall: '#ff4d4f',
  storage: '#722ed1',
  other: '#8c8c8c',
};

export const DEVICE_STATUS_COLORS = {
  running: '#52c41a',
  maintenance: '#faad14',
  offline: '#8c8c8c',
  fault: '#ff4d4f',
  idle: '#d9d9d9',
};

export const HEAT_MAP = {
  LOW: '#52c41a',
  MEDIUM: '#faad14',
  HIGH: '#ff4d4f',
};

// 字体定义
export const FONT = {
  RACK_NAME: 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  RACK_INFO: '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  DEVICE_NAME: '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  U_LABEL: '8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};
