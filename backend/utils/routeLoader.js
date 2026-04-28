const path = require('path');
const routesConfig = require('../config/routes');
const logger = require('./logger').module('RouteLoader');

function loadRoutes(app) {
  const routesDir = path.join(__dirname, '../routes');

  routesConfig.forEach(routeConfig => {
    try {
      const routerPath = path.join(routesDir, routeConfig.file);
      const router = require(routerPath);

      if (typeof router === 'function') {
        app.use(routeConfig.path, router);
        logger.info(`路由已加载: ${routeConfig.path} -> ${routeConfig.file}`);
      } else {
        logger.warn(`${routeConfig.file} 没有导出有效的 Express 路由器`);
      }
    } catch (error) {
      logger.error(`加载路由失败: ${routeConfig.file}`, { error: error.message, stack: error.stack });
      throw error;
    }
  });
}

module.exports = loadRoutes;
