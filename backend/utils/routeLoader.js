const path = require('path');
const routesConfig = require('../config/routes');

function loadRoutes(app) {
  const routesDir = path.join(__dirname, '../routes');

  routesConfig.forEach(routeConfig => {
    try {
      const routerPath = path.join(routesDir, routeConfig.file);
      const router = require(routerPath);

      if (typeof router === 'function') {
        app.use(routeConfig.path, router);
        console.log(`路由已加载: ${routeConfig.path} -> ${routeConfig.file}`);
      } else {
        console.warn(`警告: ${routeConfig.file} 没有导出有效的 Express 路由器`);
      }
    } catch (error) {
      console.error(`加载路由失败: ${routeConfig.file}`, error.message);
      throw error;
    }
  });
}

module.exports = loadRoutes;
