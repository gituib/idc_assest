/**
 * 前端全局布局 UI 用例
 * 覆盖：侧边栏折叠/展开、菜单导航、用户下拉、全局消息、懒加载
 * 运行：npx playwright test --project=ui e2e/specs/ui/layout.spec.js
 */
const { test, expect, USERS, loginViaUi } = require('../../fixtures/auth');

test.describe('全局布局', () => {
  test('TC-FE-LAYOUT-001 侧边栏默认展开，显示品牌 Logo 与系统名', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await expect(page.locator('.ant-layout-sider')).toHaveCSS('width', /216px/);
    await expect(page.getByText('数据中心管理平台')).toBeVisible();
  });

  test('TC-FE-LAYOUT-002 侧边栏折叠按钮点击后宽度切换为 72px', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    const toggle = page.getByRole('button', { name: /收起菜单/ }).first();
    await toggle.click();
    await expect(page.locator('.ant-layout-sider')).toHaveCSS('width', /72px/);
    await expect(page.getByRole('button', { name: /收起菜单|展开菜单/ }).first()).toBeVisible();
  });

  test('TC-FE-LAYOUT-003 菜单点击「设备管理」跳转 /devices', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    // 先展开资产管理（菜单默认折叠）
    await page.getByRole('menuitem', { name: new RegExp('^资产管理') }).first().click();
    await page.getByRole('menuitem', { name: /设备管理/ }).click();
    await expect(page).toHaveURL(/\/devices/);
  });

  test('TC-FE-LAYOUT-004 菜单点击「机房管理」跳转 /rooms', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.getByRole('menuitem', { name: new RegExp('^机房管理') }).first().click();
    await page.getByRole('menuitem', { name: /机房管理/ }).click();
    await expect(page).toHaveURL(/\/rooms/);
  });

  test('TC-FE-LAYOUT-005 菜单点击「机柜管理」跳转 /racks', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.getByRole('menuitem', { name: new RegExp('^机房管理') }).first().click();
    await page.getByRole('menuitem', { name: /机柜管理/ }).click();
    await expect(page).toHaveURL(/\/racks/);
  });

  test('TC-FE-LAYOUT-006 菜单点击「3D机柜可视化」跳转 /visualization-3d', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.getByRole('menuitem', { name: new RegExp('^机房管理') }).first().click();
    await page.getByRole('menuitem', { name: /3D/ }).click();
    await expect(page).toHaveURL(/\/visualization-3d/);
  });

  test('TC-FE-LAYOUT-007 菜单点击「耗材列表」跳转 /consumables', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.getByRole('menuitem', { name: new RegExp('^耗材管理') }).first().click();
    await page.getByRole('menuitem', { name: /耗材列表/ }).click();
    await expect(page).toHaveURL(/\/consumables/);
  });

  test('TC-FE-LAYOUT-008 菜单点击「故障工单」跳转 /tickets', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.getByRole('menuitem', { name: new RegExp('^工单管理') }).first().click();
    await page.getByRole('menuitem', { name: /故障工单/ }).click();
    await expect(page).toHaveURL(/\/tickets/);
  });

  test('TC-FE-LAYOUT-009 菜单点击「盘点计划」跳转 /inventory', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.getByRole('menuitem', { name: new RegExp('^资产盘点') }).first().click();
    await page.getByRole('menuitem', { name: /盘点计划/ }).click();
    await expect(page).toHaveURL(/\/inventory/);
  });

  test('TC-FE-LAYOUT-010 菜单点击「用户管理」跳转 /users', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.getByRole('menuitem', { name: new RegExp('^系统管理') }).first().click();
    await page.getByRole('menuitem', { name: /用户管理/ }).click();
    await expect(page).toHaveURL(/\/users/);
  });

  test('TC-FE-LAYOUT-011 菜单点击「角色管理」跳转 /roles', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.getByRole('menuitem', { name: new RegExp('^系统管理') }).first().click();
    await page.getByRole('menuitem', { name: /角色管理/ }).click();
    await expect(page).toHaveURL(/\/roles/);
  });

  test('TC-FE-LAYOUT-012 菜单点击「系统设置」跳转 /settings', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.getByRole('menuitem', { name: new RegExp('^系统管理') }).first().click();
    await page.getByRole('menuitem', { name: /系统设置/ }).click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('TC-FE-LAYOUT-013 菜单点击「操作日志」跳转 /operation-logs', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.getByRole('menuitem', { name: new RegExp('^系统管理') }).first().click();
    await page.getByRole('menuitem', { name: /操作日志/ }).click();
    await expect(page).toHaveURL(/\/operation-logs/);
  });

  test('TC-FE-LAYOUT-014 菜单点击「端口管理」跳转 /ports', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.getByRole('menuitem', { name: new RegExp('^线路管理') }).first().click();
    await page.getByRole('menuitem', { name: /端口管理/ }).click();
    await expect(page).toHaveURL(/\/ports/);
  });

  test('TC-FE-LAYOUT-015 菜单点击「接线管理」跳转 /cables', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.getByRole('menuitem', { name: new RegExp('^线路管理') }).first().click();
    await page.getByRole('menuitem', { name: /接线管理/ }).click();
    await expect(page).toHaveURL(/\/cables/);
  });

  test('TC-FE-LAYOUT-016 菜单点击「数据备份」跳转 /backup', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.getByRole('menuitem', { name: new RegExp('^系统管理') }).first().click();
    await page.getByRole('menuitem', { name: /数据备份/ }).click();
    await expect(page).toHaveURL(/\/backup/);
  });

  test('TC-FE-LAYOUT-017 顶部用户头像显示用户名 admin', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await expect(page.getByRole('img', { name: /默认头像|user/ }).first().or(page.locator('.ant-avatar')).first()).toBeVisible();
    await expect(page.getByText('admin')).toBeVisible();
  });

  test('TC-FE-LAYOUT-018 头像下拉菜单包含账号设置与退出登录', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.locator('.ant-dropdown-trigger').first().click();
    await expect(page.getByRole('menuitem', { name: /账号设置/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /退出登录/ })).toBeVisible();
  });

  test('TC-FE-LAYOUT-019 账号设置下拉项跳转 /account-settings', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.locator('.ant-dropdown-trigger').first().click();
    await page.getByRole('menuitem', { name: /账号设置/ }).click();
    await expect(page).toHaveURL(/\/account-settings/);
  });

  test('TC-FE-LAYOUT-020 懒加载 3D 页面无崩溃', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.goto('/visualization-3d');
    // 至少页面 body 渲染完成，没有白屏崩溃
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/\/visualization-3d/);
  });

  test('TC-FE-LAYOUT-021 懒加载机房平面图无崩溃', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.goto('/floor-plan');
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/\/floor-plan/);
  });

  test('TC-FE-LAYOUT-022 未匹配路由兜底跳转 Dashboard', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.goto('/does-not-exist-xyz');
    await expect(page).toHaveURL(/\/$/);
  });
});
