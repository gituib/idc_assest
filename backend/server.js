require('dotenv').config();
const path = require('path');
const { ensureJwtSecret } = require('./initConfig');
ensureJwtSecret();

const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { sequelize } = require('./db');
const { FILE_UPLOAD } = require('./config');
const { generateId } = require('./utils/idGenerator');
const logger = require('./utils/logger').module('Server');
const requestLogger = require('./middleware/requestLogger');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: FILE_UPLOAD.MAX_FILE_SIZE } }));
app.use('/temp', express.static('temp'));
app.use(requestLogger);

async function syncDatabase() {
  await sequelize.authenticate();
  logger.info('数据库连接成功');

  await sequelize.sync({
    force: false,
    alter: false,
  });
  logger.info('数据库表结构同步完成');
}

async function initDeviceFields() {
  await require('./initDeviceFields')();
  logger.info('设备字段初始化完成');
}

async function initTicketFields() {
  await require('./initTicketFields')();
  logger.info('工单字段初始化完成');
}

async function initTicketModels() {
  await require('./models/ticketIndex').initializeModels();
  logger.info('工单模型关联初始化完成');
}

async function syncSystemSettings() {
  const SystemSetting = require('./models/SystemSetting');
  await SystemSetting.sync();
  logger.info('系统设置模型同步完成');
}

async function syncConsumableModels() {
  const Consumable = require('./models/Consumable');
  const ConsumableLog = require('./models/ConsumableLog');
  const ConsumableCategory = require('./models/ConsumableCategory');
  const ConsumableRecord = require('./models/ConsumableRecord');
  const ConsumableLogArchive = require('./models/ConsumableLogArchive');

  await Promise.all([
    Consumable.sync(), // 暂时禁用 alter 模式
    ConsumableLog.sync(),
    ConsumableCategory.sync(),
    ConsumableRecord.sync(),
    ConsumableLogArchive.sync(),
  ]);
  logger.info('耗材模型同步完成');
}

async function syncInventoryModels() {
  const InventoryPlan = require('./models/InventoryPlan');
  const InventoryTask = require('./models/InventoryTask');
  const InventoryRecord = require('./models/InventoryRecord');

  await Promise.all([InventoryPlan.sync(), InventoryTask.sync(), InventoryRecord.sync()]);
  logger.info('盘点模型同步完成');
}

async function syncBackupLogModel() {
  const BackupLog = require('./models/BackupLog');
  await BackupLog.sync();
  logger.info('备份日志模型同步完成');
}

async function syncOperationLogModel() {
  const OperationLog = require('./models/OperationLog');
  await OperationLog.sync();
  logger.info('操作日志模型同步完成');
}

async function syncBusinessModels() {
  const Business = require('./models/Business');
  const DeviceBusiness = require('./models/DeviceBusiness');
  const Warehouse = require('./models/Warehouse');

  await Business.sync();
  await DeviceBusiness.sync();
  await Warehouse.sync();
  logger.info('业务/设备关联/库房模型同步完成');
}

async function initDefaultSystemSettings() {
  logger.info('开始初始化系统设置默认值...');
  const { initDefaultSettings } = require('./routes/systemSettings');
  await initDefaultSettings();
  logger.info('系统设置初始化完成');
}

async function initFaultCategories() {
  logger.info('开始初始化故障分类...');
  const FaultCategory = require('./models/FaultCategory');

  const defaultCategories = [
    {
      name: '系统故障',
      description: '操作系统、应用程序等系统软件的故障问题',
      priority: 1,
      defaultPriority: 'high',
    },
    {
      name: '硬件故障',
      description: '物理设备、服务器、存储等硬件设备的故障问题',
      priority: 2,
      defaultPriority: 'high',
    },
    {
      name: '网络故障',
      description: '网络连接、交换机、路由器等网络相关故障',
      priority: 3,
      defaultPriority: 'high',
    },
    {
      name: '软件故障',
      description: '应用程序错误、软件兼容性等问题',
      priority: 4,
      defaultPriority: 'medium',
    },
    {
      name: '安全事件',
      description: '安全漏洞、入侵检测、权限异常等安全问题',
      priority: 5,
      defaultPriority: 'urgent',
    },
    {
      name: '性能问题',
      description: '系统响应慢、资源利用率高等性能问题',
      priority: 6,
      defaultPriority: 'medium',
    },
    {
      name: '配置变更',
      description: '系统配置、软件配置等变更需求',
      priority: 7,
      defaultPriority: 'low',
    },
    {
      name: '例行维护',
      description: '定期维护、巡检、更新等计划性工作',
      priority: 8,
      defaultPriority: 'low',
    },
    {
      name: '数据问题',
      description: '数据错误、数据丢失、数据同步等数据相关问题',
      priority: 9,
      defaultPriority: 'high',
    },
    {
      name: '其他问题',
      description: '无法归类的其他问题',
      priority: 99,
      defaultPriority: 'medium',
    },
  ];

  for (const cat of defaultCategories) {
    const existing = await FaultCategory.findOne({ where: { name: cat.name } });
    if (!existing) {
      const categoryId = generateId({ prefix: 'CAT' });
      await FaultCategory.create({
        categoryId,
        ...cat,
        expectedDuration: 120,
        solutions: [],
        isSystem: true,
        isActive: true,
      });
      logger.info(`创建故障分类: ${cat.name}`);
    }
  }
  logger.info('故障分类初始化完成');
}

async function initAutoBackupScheduler() {
  const { initAutoBackup } = require('./utils/autoBackupScheduler');
  const status = initAutoBackup();
  if (status.enabled) {
    logger.info(`自动备份已启用，下次执行时间：${status.nextRun || '未知'}`);
  }
}

async function initializeApp() {
  try {
    await syncDatabase();
    await initDeviceFields();
    await initTicketFields();
    await initTicketModels();
    await syncSystemSettings();
    await syncConsumableModels();
    await syncInventoryModels();
    await syncBackupLogModel();
    await syncOperationLogModel();
    await syncBusinessModels();
    await initDefaultSystemSettings();
    await initFaultCategories();
    await initAutoBackupScheduler();

    logger.info('所有初始化完成，服务器准备就绪');
  } catch (error) {
    logger.error('初始化失败', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

const swaggerUi = require('swagger-ui-express');
const { specs, customCSS } = require('./swagger');
const { authMiddleware } = require('./middleware/auth');
const { maintenanceMiddleware } = require('./middleware/maintenance');
const loadRoutes = require('./utils/routeLoader');

initializeApp()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`服务器运行在 http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    logger.error('应用初始化失败', { error: err.message, stack: err.stack });
    process.exit(1);
  });

const PUBLIC_PATHS = [
  '/auth',
  '/health',
  '/docs',
  '/api-docs',
  '/api-docs.json',
  '/system-settings/system/info',
  '/maintenance',
];

const isPublicPath = path => {
  if (path === '' || path === '/') {
    return true;
  }
  return PUBLIC_PATHS.some(publicPath => path === publicPath || path.startsWith(publicPath + '/'));
};

app.use('/api', (req, res, next) => {
  if (isPublicPath(req.path)) {
    return next();
  }
  return authMiddleware(req, res, next);
});

app.use('/api', maintenanceMiddleware);

loadRoutes(app);

const { getMaintenanceStatus, disableMaintenanceMode } = require('./utils/maintenanceMode');

app.get('/api/maintenance/status', (req, res) => {
  res.json({
    success: true,
    data: getMaintenanceStatus(),
  });
});

app.post('/api/maintenance/disable', async (req, res) => {
  try {
    disableMaintenanceMode();
    res.json({
      success: true,
      message: '维护模式已手动解除',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '解除维护模式失败',
      error: error.message,
    });
  }
});

app.use('/uploads', express.static('uploads'));

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    customCss: customCSS,
    customSiteTitle: 'IDC设备管理系统 API文档',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      deepLinking: true,
      defaultModelsExpandDepth: -1,
      defaultModelExpandDepth: 2,
    },
  })
);

app.get('/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'swagger_index.html'));
});

app.get('/api-docs.json', (req, res) => {
  res.json(specs);
});

app.get('/api', (req, res) => {
  res.json({
    name: 'IDC设备管理系统 API',
    version: '1.0.0',
    description: '数据中心设备管理平台后端服务',
    endpoints: {
      auth: '/api/auth',
      rooms: '/api/rooms',
      racks: '/api/racks',
      devices: '/api/devices',
      deviceFields: '/api/deviceFields',
      devicePorts: '/api/device-ports',
      networkCards: '/api/network-cards',
      cables: '/api/cables',
      tickets: '/api/tickets',
      ticketCategories: '/api/ticket-categories',
      ticketFields: '/api/ticket-fields',
      consumables: '/api/consumables',
      consumableRecords: '/api/consumable-records',
      consumableCategories: '/api/consumable-categories',
      users: '/api/users',
      roles: '/api/roles',
      systemSettings: '/api/system-settings',
      background: '/api/background',
      inventory: '/api/inventory',
    },
    health: '/health',
    documentation: '/docs/api/README.md',
  });
});

const { performHealthCheck } = require('./utils/healthCheck');

app.get('/health', async (req, res) => {
  const health = await performHealthCheck();
  const statusCode = health.status === 'error' ? 503 : health.status === 'warning' ? 200 : 200;
  res.status(statusCode).json(health);
});

// app.listen 已在 initializeApp().then() 中调用
