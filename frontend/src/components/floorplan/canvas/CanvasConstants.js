export const CELL_WIDTH = 220;
export const CELL_HEIGHT = 480;
export const CELL_GAP = 20;

// 网格单元尺寸（一个机柜占一格）
export const GRID_CELL_WIDTH = CELL_WIDTH + CELL_GAP;
export const GRID_CELL_HEIGHT = CELL_HEIGHT + CELL_GAP;
// 网格原点（左上角第一个格子的起始坐标）
export const GRID_ORIGIN_X = 24;
export const GRID_ORIGIN_Y = 24;
// 默认网格行列数（与 Room.gridRows/gridCols 对齐）
export const GRID_DEFAULT_ROWS = 10;
export const GRID_DEFAULT_COLS = 10;

export const RACK_PADDING = 10;
export const RACK_HEADER_HEIGHT = 36;
export const RACK_STATUS_BAR_HEIGHT = 4;

export const U_HEIGHT = 10;
export const U_LABEL_WIDTH_LEFT = 28;
export const U_LABEL_WIDTH_RIGHT = 28;
export const U_BODY_WIDTH = 154;

export const ZOOM = {
  MIN: 0.3,
  MAX: 2,
  STEP: 0.1,
  DEFAULT: 1,
  WHEEL_FACTOR: 0.001,
};

export const RACK_STATUS_COLORS = {
  active: '#1677ff',
  maintenance: '#faad14',
  inactive: '#bfbfbf',
};

export const RACK_STATUS_NAMES = {
  active: '在用',
  maintenance: '维护中',
  inactive: '停用',
};

export const DEVICE_TYPE_COLORS = {
  server: '#1677ff',
  switch: '#52c41a',
  router: '#faad14',
  firewall: '#ff4d4f',
  storage: '#722ed1',
  other: '#8c8c8c',
};

export const DEVICE_TYPE_NAMES = {
  server: '服务器',
  switch: '交换机',
  router: '路由器',
  firewall: '防火墙',
  storage: '存储设备',
  other: '其他',
};

export const DEVICE_STATUS_COLORS = {
  running: '#52c41a',
  maintenance: '#faad14',
  offline: '#8c8c8c',
  fault: '#ff4d4f',
  idle: '#d9d9d9',
};

export const DEVICE_STATUS_NAMES = {
  running: '运行中',
  maintenance: '维护中',
  offline: '离线',
  fault: '故障',
  idle: '空闲',
};

export const FONT = {
  RACK_NAME: 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  RACK_INFO: '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  DEVICE_NAME: '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  U_LABEL: '8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};
