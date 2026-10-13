/**
 * 后端 API 冒烟用例（模板）
 * 覆盖：健康检查、认证流程、免鉴权白名单、401/403 断言
 * 运行：npx playwright test --project=api
 */
const { test, expect, API_BASE, USERS } = require('../../fixtures/auth');

test.describe('冒烟：服务与认证', () => {
  test('TC-BE-G-001 后端健康检查可用', async ({ request }) => {
    const res = await request.get(`http://localhost:${process.env.PORT || 8000}/health`);
    expect(res.ok()).toBeTruthy();
  });

  test('TC-BE-AUTH-005 正常登录返回 token', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, { data: USERS.admin });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.token || body.data?.token).toBeTruthy();
  });

  test('TC-BE-AUTH-006 密码错误返回 401', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { username: USERS.admin.username, password: 'wrong-password' },
    });
    expect(res.status()).toBe(401);
  });

  test('TC-BE-AUTH-021 无 token 访问受保护接口返回 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/auth/profile`);
    expect(res.status()).toBe(401);
  });

  test('TC-PERM-015 免鉴权白名单可匿名访问', async ({ request }) => {
    const res = await request.get(`${API_BASE}/port-options`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('portTypes');
  });

  test('TC-BE-AUTH-011 登录后可获取 profile', async ({ adminApi }) => {
    const res = await adminApi.get('/auth/profile');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const user = body.data?.user || body.data || body;
    expect(user.username).toBe(USERS.admin.username);
  });
});
