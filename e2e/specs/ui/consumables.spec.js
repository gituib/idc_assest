/**
 * 耗材模块（列表/统计/分类/日志）UI 用例
 * 运行：npx playwright test --project=ui e2e/specs/ui/consumables.spec.js
 */
const { test, expect, USERS, loginViaUi } = require('../../fixtures/auth');

test.describe('耗材管理', () => {
  test.describe('耗材列表 /consumables', () => {
    test('TC-FE-CONS-001 列表可见，含搜索与新增', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/consumables');
      await expect(page).toHaveURL(/\/consumables/);
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('button', { name: /新增|添加|入库/ }).first()).toBeVisible({ timeout: 15000 });
    });

    test('TC-FE-CONS-002 分类筛选存在', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/consumables');
      // Ant Design v5 Select 的 combobox 没有 accessible name，直接按 role 抓
      await expect(page.getByRole('combobox').first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('耗材统计 /consumables-stats', () => {
    test('TC-FE-CONS-010 统计页渲染图表', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/consumables-stats');
      await expect(page).toHaveURL(/\/consumables-stats/);
      await expect(page.locator('canvas, [class*="chart"], [class*="Chart"], .ant-statistic').first()).toBeVisible({ timeout: 20000 });
    });
  });

  test.describe('耗材分类 /consumables-categories', () => {
    test('TC-FE-CONS-020 分类表格可见', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/consumables-categories');
      await expect(page).toHaveURL(/\/consumables-categories/);
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('耗材日志 /consumables-logs', () => {
    test('TC-FE-CONS-030 操作日志表格可见', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/consumables-logs');
      await expect(page).toHaveURL(/\/consumables-logs/);
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15000 });
    });
  });
});
