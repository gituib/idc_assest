const logger = require('./logger').module('MaintenanceMode');

const MAINTENANCE_TIMEOUT_MS = 30 * 60 * 1000;

const MaintenanceMode = {
  isActive: false,
  startTime: null,
  reason: null,
  allowedRoutes: ['/api/backup', '/api/auth', '/api/maintenance'],
};

let timeoutTimer = null;

function clearTimeoutTimer() {
  if (timeoutTimer) {
    clearTimeout(timeoutTimer);
    timeoutTimer = null;
  }
}

function isTimedOut() {
  if (!MaintenanceMode.startTime) return false;
  return Date.now() - MaintenanceMode.startTime.getTime() > MAINTENANCE_TIMEOUT_MS;
}

function enableMaintenanceMode(reason = '系统维护中') {
  clearTimeoutTimer();

  MaintenanceMode.isActive = true;
  MaintenanceMode.startTime = new Date();
  MaintenanceMode.reason = reason;

  timeoutTimer = setTimeout(() => {
    if (MaintenanceMode.isActive) {
      logger.warn('维护模式超时，自动解除', {
        reason: MaintenanceMode.reason,
        startTime: MaintenanceMode.startTime,
      });
      disableMaintenanceMode();
    }
  }, MAINTENANCE_TIMEOUT_MS);

  logger.info('维护模式已启用', { reason });
}

function disableMaintenanceMode() {
  clearTimeoutTimer();

  MaintenanceMode.isActive = false;
  MaintenanceMode.reason = null;
  MaintenanceMode.startTime = null;

  logger.info('维护模式已解除');
}

function isMaintenanceModeActive() {
  if (MaintenanceMode.isActive && isTimedOut()) {
    disableMaintenanceMode();
    return false;
  }
  return MaintenanceMode.isActive;
}

function getMaintenanceStatus() {
  return {
    active: MaintenanceMode.isActive,
    reason: MaintenanceMode.reason,
    startTime: MaintenanceMode.startTime,
    timeoutMs: MAINTENANCE_TIMEOUT_MS,
  };
}

module.exports = {
  MaintenanceMode,
  enableMaintenanceMode,
  disableMaintenanceMode,
  isMaintenanceModeActive,
  getMaintenanceStatus,
};
