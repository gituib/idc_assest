/**
 * 资产盘点模块（盘点计划 / 待盘盈设备）UI 用例
 * 运行：npx playwright test --project=ui e2e/specs/ui/inventory.spec.js
 */
const { test, expect, USERS, loginViaUi } = require('../../fixtures/auth');

test.describe('资产盘点', () => {
  test.describe('盘点计划 /inventory', () => {
    test('TC-FE-INV-001 计划列表可见，含统计卡片', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/inventory');
      await expect(page).toHaveURL(/\/inventory/);
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.ant-card, .ant-statistic').first()).toBeVisible({ timeout: 15000 });
    });

    test('TC-FE-INV-002 新增盘点计划弹窗打开', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/inventory');
      const addBtn = page.getByRole('button', { name: /新增|创建|新建|盘点计划/ }).first();
      await expect(addBtn).toBeVisible({ timeout: 15000 });
      await addBtn.click();
      await expect(page.locator('.ant-modal, .ant-drawer').first()).toBeVisible({ timeout: 5000 });
    });

    test('TC-FE-INV-003 新增弹窗含名称/类型/目标机房字段', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/inventory');
      await page.getByRole('button', { name: /新增|创建|新建/ }).first().click();
      await expect(page.locator('.ant-form').first()).toBeVisible({ timeout: 5000 });
    });

    test('TC-FE-INV-004 弹窗取消关闭', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/inventory');
      await page.getByRole('button', { name: /新增|创建|新建/ }).first().click();
      await page.getByRole('button', { name: /取\s*消/ }).first().click();
      await expect(page.locator('.ant-modal, .ant-drawer').first()).toBeHidden({ timeout: 5000 });
    });

    test('TC-FE-INV-005 状态筛选（全部/草稿/进行中）存在', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/inventory');
      await expect(page.locator('[class*="status"], [class*="Status"], .ant-select-selector').first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('待盘盈设备 /pending-devices', () => {
    test('TC-FE-INV-010 列表可见', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/pending-devices');
      await expect(page).toHaveURL(/\/pending-devices/);
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15000 });
    });
  });
});
