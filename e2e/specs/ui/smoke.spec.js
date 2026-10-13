/**
 * 前端 UI 冒烟用例（模板）
 * 覆盖：登录页渲染、登录流程、受保护路由跳转、登出
 * 运行：npx playwright test --project=ui
 */
const { test, expect, USERS, loginViaUi } = require('../../fixtures/auth');

test.describe('冒烟：登录与路由保护', () => {
  test('TC-FE-LOGIN-001 未登录访问受保护路由跳转登录页', async ({ page }) => {
    await page.goto('/devices');
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-FE-LOGIN-002 正常登录落地仪表盘', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    // /dashboard 由 * 兜底重定向到 /
    await expect(page).toHaveURL(/\/$/);
  });

  test('TC-FE-LOGIN-012 登录页品牌元素存在', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /IDC.*机柜管理系统/ })).toBeVisible();
    await expect(page.locator('.footer-version, .form-footer').getByText(/v\d+\.\d+\.\d+/).first()).toBeVisible();
  });

  test('TC-FE-GLOB-007 退出登录跳回登录页', async ({ adminPage }) => {
    const page = adminPage;
    // 头像下拉 → 退出登录
    await page.locator('.ant-avatar, .ant-dropdown-trigger').first().click();
    await page.getByRole('menuitem', { name: /退出登录/ }).or(page.getByText('退出登录')).first().click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
