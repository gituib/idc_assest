/**
 * Playwright 全局 Setup：测试执行前初始化种子数据（管理员 + 普通用户）
 * @param {import('@playwright/test').FullConfig>} config - Playwright 全局配置
 */
const { request } = require('@playwright/test');
const { ensureSeed } = require('./fixtures/seed');
const { USERS } = require('./fixtures/auth');

module.exports = async (config) => {
  const apiContext = await request.newContext();
  try {
    const result = await ensureSeed(apiContext);
    console.log(
      `[seed] 种子数据就绪（管理员${result.isAdminCreated ? '新建' : '已存在'}，账号: ${USERS.admin.username} / ${USERS.user.username}）`
    );
  } finally {
    await apiContext.dispose();
  }
};
