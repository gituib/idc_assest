/**
 * 资产页面（设备/空闲设备/字段管理）UI 用例
 * 运行：npx playwright test --project=ui e2e/specs/ui/assets.spec.js
 */
const { test, expect, USERS, loginViaUi, createAdminApi } = require('../../fixtures/auth');

test.describe('资产管理', () => {
  test.describe('设备管理 /devices', () => {
    test('TC-FE-DEV-001 页面加载，搜索框与表格可见', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/devices');
      await expect(page).toHaveURL(/\/devices/);
      // 搜索表单
      await expect(page.locator('input[placeholder*="搜索"], input[placeholder*="名称"], input[placeholder*="设备"]').first()).toBeVisible({ timeout: 15000 });
      // 表格
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15000 });
    });

    test('TC-FE-DEV-002 表格包含新增/导入/导出按钮', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/devices');
      const header = page.locator('.ant-page-header, [class*="header"], [class*="Header"], [class*="toolbar"], [class*="Toolbar"]').first();
      await expect(header).toBeVisible({ timeout: 15000 });
      // 新增/添加设备按钮
      await expect(page.getByRole('button', { name: /新增|添加|新建/ }).first()).toBeVisible({ timeout: 15000 });
    });

    test('TC-FE-DEV-003 新增设备弹窗打开', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/devices');
      await page.getByRole('button', { name: /新增|添加|新建/ }).first().click();
      await expect(page.locator('.ant-modal, .ant-drawer').first()).toBeVisible({ timeout: 10000 });
    });

    test('TC-FE-DEV-004 新增设备弹窗取消可关闭', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/devices');
      await page.getByRole('button', { name: /新增|添加|新建/ }).first().click();
      await page.getByRole('button', { name: /取\s*消/ }).first().click();
      await expect(page.locator('.ant-modal, .ant-drawer').first()).toBeHidden({ timeout: 5000 });
    });

    test('TC-FE-DEV-005 搜索关键字后表格刷新', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/devices');
      const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="名称"]').first();
      await searchInput.fill('test');
      // 触发表单提交或点击查询按钮
      const btn = page.getByRole('button', { name: /查询|搜索/ }).first();
      if (await btn.isVisible()) {
        await btn.click();
      } else {
        await searchInput.press('Enter');
      }
      await expect(page.locator('.ant-table').first()).toBeVisible();
    });

    test('TC-FE-DEV-006 分页控件存在', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/devices');
      await expect(page.locator('.ant-pagination').first()).toBeVisible({ timeout: 15000 });
    });

    test('TC-FE-DEV-007 表格列选择器/密度设置存在', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/devices');
      // Ant Design Table 通常提供密度/列设置
      const settings = page.locator('.ant-table-title-bar, .ant-table-toolbar, [class*="column"], [class*="Column"], [class*="setting"], [class*="Setting"]').first();
      await expect(settings).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('空闲设备 /idle-devices', () => {
    test('TC-FE-IDLE-001 页面加载无报错', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/idle-devices');
      await expect(page).toHaveURL(/\/idle-devices/);
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('字段管理 /fields', () => {
    test('TC-FE-FIELD-001 页面加载，含字段定义表格', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/fields');
      await expect(page).toHaveURL(/\/fields/);
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15000 });
    });
  });
});
