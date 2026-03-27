const { sequelize, DB_TYPE, dbDialect } = require('../db');

const checkDatabase = async () => {
  const result = {
    status: 'ok',
    type: dbDialect,
    message: '数据库连接正常',
  };

  try {
    await sequelize.authenticate();
    result.status = 'ok';
  } catch (error) {
    result.status = 'error';
    result.message = `数据库连接失败: ${error.message}`;
    return result;
  }

  try {
    await sequelize.query('SELECT 1');
    result.status = 'ok';
  } catch (error) {
    result.status = 'error';
    result.message = `数据库查询失败: ${error.message}`;
  }

  return result;
};

const checkCriticalConfig = () => {
  const checks = [];

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    checks.push({
      key: 'JWT_SECRET',
      status: 'error',
      message: 'JWT_SECRET 未配置',
    });
  } else if (jwtSecret.length < 32) {
    checks.push({
      key: 'JWT_SECRET',
      status: 'warning',
      message: 'JWT_SECRET 长度不足，建议至少 32 字符',
    });
  } else {
    checks.push({
      key: 'JWT_SECRET',
      status: 'ok',
      message: 'JWT_SECRET 已配置',
    });
  }

  const port = process.env.PORT;
  checks.push({
    key: 'PORT',
    status: port ? 'ok' : 'warning',
    message: port ? `服务端口: ${port}` : '使用默认端口 8000',
  });

  const dbType = process.env.DB_TYPE || 'sqlite';
  checks.push({
    key: 'DB_TYPE',
    status: 'ok',
    message: `数据库类型: ${dbType}`,
  });

  if (dbType === 'mysql') {
    const mysqlHost = process.env.MYSQL_HOST;
    const mysqlDb = process.env.MYSQL_DATABASE;
    if (!mysqlHost || !mysqlDb) {
      checks.push({
        key: 'MYSQL_CONFIG',
        status: 'warning',
        message: 'MySQL 配置不完整',
      });
    }
  }

  const overallStatus = checks.every(c => c.status === 'ok')
    ? 'ok'
    : checks.some(c => c.status === 'error')
      ? 'error'
      : 'warning';

  return {
    status: overallStatus,
    checks,
  };
};

const getSystemInfo = () => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  const formatUptime = seconds => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) {
      parts.push(`${days}天`);
    }
    if (hours > 0) {
      parts.push(`${hours}小时`);
    }
    if (minutes > 0) {
      parts.push(`${minutes}分钟`);
    }
    if (secs > 0 || parts.length === 0) {
      parts.push(`${secs}秒`);
    }

    return parts.join(' ');
  };

  return {
    nodeVersion: process.version,
    platform: process.platform,
    memory: {
      heapUsed: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotal: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
      rss: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
      unit: 'MB',
    },
    uptime: formatUptime(uptime),
    uptimeSeconds: Math.round(uptime),
  };
};

const performHealthCheck = async () => {
  const [dbCheck] = await Promise.all([checkDatabase()]);
  const configCheck = checkCriticalConfig();
  const systemInfo = getSystemInfo();

  const allChecks = [
    { name: 'database', ...dbCheck },
    { name: 'config', ...configCheck },
  ];

  const overallStatus = allChecks.every(c => c.status === 'ok')
    ? 'ok'
    : allChecks.some(c => c.status === 'error')
      ? 'error'
      : 'warning';

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: {
      name: 'IDC设备管理系统',
      version: '1.0.0',
    },
    checks: allChecks,
    system: systemInfo,
  };
};

module.exports = {
  performHealthCheck,
  checkDatabase,
  checkCriticalConfig,
  getSystemInfo,
};
