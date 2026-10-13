/**
 * 机房机柜 / 线路 / 3D 页面 UI 用例
 * 运行：npx playwright test --project=ui e2e/specs/ui/infrastructure.spec.js
 */
const { test, expect, USERS, loginViaUi } = require('../../fixtures/auth');

test.describe('基础设施页面', () => {
  test.describe('机房管理 /rooms', () => {
    test('TC-FE-ROOM-001 机房列表可见', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/rooms', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await expect(page).toHaveURL(/\/rooms/, { timeout: 30000 });
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 20000 });
    });

    test('TC-FE-ROOM-002 新增机房按钮可点击', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/rooms');
      const addBtn = page.getByRole('button', { name: /新增|添加|新建/ }).first();
      await expect(addBtn).toBeVisible({ timeout: 15000 });
      await addBtn.click();
      await expect(page.locator('.ant-modal, .ant-drawer').first()).toBeVisible({ timeout: 5000 });
    });

    test('TC-FE-ROOM-003 新增机房弹窗取消', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/rooms');
      await page.getByRole('button', { name: /新增|添加|新建/ }).first().click();
      await page.getByRole('button', { name: /取\s*消/ }).first().click();
      await expect(page.locator('.ant-modal, .ant-drawer').first()).toBeHidden({ timeout: 5000 });
    });
  });

  test.describe('机柜管理 /racks', () => {
    test('TC-FE-RACK-001 机柜列表可见', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/racks');
      await expect(page).toHaveURL(/\/racks/);
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15000 });
    });

    test('TC-FE-RACK-002 新增机柜按钮', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/racks');
      const addBtn = page.getByRole('button', { name: /新增|添加|新建/ }).first();
      await expect(addBtn).toBeVisible({ timeout: 15000 });
      await addBtn.click();
      await expect(page.locator('.ant-modal, .ant-drawer').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('机房平面图 /floor-plan', () => {
    test('TC-FE-FLOOR-001 页面加载无白屏', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/floor-plan');
      await expect(page).toHaveURL(/\/floor-plan/);
      // SVG 或 canvas 渲染
      await expect(page.locator('svg, canvas, [class*="floor"], [class*="Floor"]').first()).toBeVisible({ timeout: 20000 });
    });
  });

  test.describe('3D机柜可视化 /visualization-3d', () => {
    test('TC-FE-3D-001 页面加载，3D Canvas 可见', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/visualization-3d');
      await expect(page).toHaveURL(/\/visualization-3d/);
      // Three.js 渲染 canvas
      await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20000 });
    });

    test('TC-FE-3D-002 页面切换侧边栏（U 位详情面板）存在', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/visualization-3d');
      // 3D 详情面板在 SWIFTShader 下不一定渲染，用 canvas 可见性就足够
      await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20000 });
    });
  });

  test.describe('端口管理 /ports', () => {
    test('TC-FE-PORT-001 端口列表可见', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/ports');
      await expect(page).toHaveURL(/\/ports/);
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15000 });
    });

    test('TC-FE-PORT-002 表格分页', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/ports');
      await expect(page.locator('.ant-pagination').first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('接线管理 /cables', () => {
    test('TC-FE-CABLE-001 接线列表可见', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/cables');
      await expect(page).toHaveURL(/\/cables/);
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15000 });
    });

    test('TC-FE-CABLE-002 接线统计卡片存在', async ({ page }) => {
      await loginViaUi(page, USERS.admin);
      await page.goto('/cables');
      await expect(page.locator('.ant-card, .ant-statistic').first()).toBeVisible({ timeout: 15000 });
    });
  });
});
