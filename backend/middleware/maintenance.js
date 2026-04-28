const { isMaintenanceModeActive, MaintenanceMode } = require('../utils/maintenanceMode');

/**
 * 维护模式中间件
 * 维护期间拦截所有非白名单请求，返回 503 状态码
 */
function maintenanceMiddleware(req, res, next) {
  if (!isMaintenanceModeActive()) {
    return next();
  }

  const isAllowed = MaintenanceMode.allowedRoutes.some((route) =>
    req.path.startsWith(route)
  );

  if (isAllowed) {
    return next();
  }

  return res.status(503).json({
    success: false,
    message: '系统正在维护中，请稍后再试',
    maintenance: {
      active: true,
      reason: MaintenanceMode.reason,
      startTime: MaintenanceMode.startTime,
    },
  });
}

module.exports = { maintenanceMiddleware };
