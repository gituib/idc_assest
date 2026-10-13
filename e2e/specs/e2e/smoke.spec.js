/**
 * 端到端场景占位用例：验证框架链路（登录 → 仪表盘）
 * 完整场景按《测试用例.md》第六章 TC-E2E-001~010 补充
 * 运行：npx playwright test --project=e2e
 */
const { test, expect, loginViaUi, USERS } = require('../../fixtures/auth');

test('TC-E2E-010 冒烟：登录后进入仪表盘', async ({ page }) => {
  await loginViaUi(page, USERS.admin);

  // 仪表盘统计卡可见
  await expect(page.locator('.ant-card').first()).toBeVisible({ timeout: 15000 });
  // 侧边栏菜单可见
  await expect(page.getByText('机房管理').first()).toBeVisible();
});
