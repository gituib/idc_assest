/**
 * 仪表盘 Dashboard UI 用例
 * 覆盖：概览统计卡片、图表渲染、快速入口
 * 运行：npx playwright test --project=ui e2e/specs/ui/dashboard.spec.js
 */
const { test, expect, USERS, loginViaUi } = require('../../fixtures/auth');

test.describe('仪表盘', () => {
  test('TC-FE-DASH-001 访问 / 展示仪表盘标题与统计卡片', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await expect(page).toHaveURL(/\/$/);
    // 仪表盘通常展示"概览"或"统计"类卡片
    await expect(page.locator('body')).toBeVisible();
    const cards = page.locator('.ant-card, .ant-statistic, [class*="statistic"], [class*="card"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
  });

  test('TC-FE-DASH-002 仪表盘至少包含一个数字统计', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    // 项目用自定义 DOM 渲染核心指标，不是 Ant Design Statistic 组件
    // 在"核心指标"区域下找到纯数字节点（总设备数/总机柜数/总机房数）
    await expect(page.getByText(/^\d{2,}$/).first()).toBeVisible({ timeout: 15000 });
  });

  test('TC-FE-DASH-003 仪表盘图表区域存在（Canvas 或 SVG）', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    // ECharts 渲染为 canvas
    const chart = page.locator('canvas, [class*="chart"], [class*="Chart"]').first();
    await expect(chart).toBeVisible({ timeout: 15000 });
  });

  test('TC-FE-DASH-004 刷新仪表盘无报错', async ({ page }) => {
    await loginViaUi(page, USERS.admin);
    await page.reload();
    await expect(page.locator('.ant-message-error, .ant-message').first()).toBeHidden({ timeout: 10000 });
    await expect(page).toHaveURL(/\/$/);
  });
});
