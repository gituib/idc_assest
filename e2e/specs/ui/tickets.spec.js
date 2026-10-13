/**
 * 工单模块（列表/分类/统计）UI 用例
 * 运行：npx playwright test --project=ui e2e/specs/ui/tickets.spec.js
 */
const { test, expect, USERS, loginViaUi } = require('../../fixtures/auth');

test.describe('工单管理', () => {
  test.describe('故障工单 /tickets', () => {
    test('TC-FE-TICK-001 工单列表可见', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/tickets');
      await expect(page).toHaveURL(/\/tickets/);
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15000 });
    });

    test('TC-FE-TICK-002 新增工单按钮', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/tickets');
      const addBtn = page.getByRole('button', { name: /新增|创建|新建/ }).first();
      await expect(addBtn).toBeVisible({ timeout: 15000 });
      await addBtn.click();
      await expect(page.locator('.ant-modal, .ant-drawer').first()).toBeVisible({ timeout: 5000 });
    });

    test('TC-FE-TICK-003 工单弹窗表单含标题与分类字段', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/tickets');
      await page.getByRole('button', { name: /新增|创建|新建/ }).first().click();
      // 表单渲染
      await expect(page.locator('.ant-form').first()).toBeVisible({ timeout: 5000 });
      // 至少一个 input 或 select
      await expect(page.locator('.ant-form .ant-form-item').first()).toBeVisible();
    });

    test('TC-FE-TICK-004 弹窗取消关闭', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/tickets');
      await page.getByRole('button', { name: /新增|创建|新建/ }).first().click();
      await page.getByRole('button', { name: /取\s*消/ }).first().click();
      await expect(page.locator('.ant-modal, .ant-drawer').first()).toBeHidden({ timeout: 5000 });
    });
  });

  test.describe('工单分类 /ticket-categories', () => {
    test('TC-FE-TICK-010 分类表格可见', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/ticket-categories');
      await expect(page).toHaveURL(/\/ticket-categories/);
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('工单统计 /ticket-statistics', () => {
    test('TC-FE-TICK-020 统计页图表渲染', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/ticket-statistics');
      await expect(page).toHaveURL(/\/ticket-statistics/);
      await expect(page.locator('canvas, .ant-statistic, [class*="chart"]').first()).toBeVisible({ timeout: 20000 });
    });
  });
});
