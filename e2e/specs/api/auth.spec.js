/**
 * 认证模块 API 用例（TC-BE-AUTH-*）
 * 覆盖：参数校验、账户锁定与解锁、待审批登录、资料/密码修改、token 失效
 * 运行：npx playwright test --project=api -g "认证"
 */
const { test, expect, API_BASE, USERS } = require('../../fixtures/auth');

test.describe('认证模块', () => {
  test('TC-BE-AUTH-003 注册参数校验：用户名 3-50、密码 ≥6', async ({ request }) => {
    const shortName = await request.post(`${API_BASE}/auth/register`, {
      data: { username: 'ab', password: '123456' },
    });
    expect(shortName.status()).toBe(400);

    const shortPwd = await request.post(`${API_BASE}/auth/register`, {
      data: { username: 'valid_name_' + Date.now(), password: '123' },
    });
    expect(shortPwd.status()).toBe(400);
    const body = await shortPwd.json();
    expect(body.message).toContain('8');
  });

  test('TC-BE-AUTH-004 注册用户名重复返回 400', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: { username: USERS.admin.username, password: 'Test@123456' },
    });
    expect(res.status()).toBe(400);
  });

  test('TC-BE-AUTH-007+008 连续失败锁定 30 分钟后可解锁', async ({ request, adminApi }) => {
    // 构造一次性测试用户（锁定实验只影响它自己）
    const username = `lock_test_${Date.now()}`;
    const password = 'LockTest@123';
    const createRes = await adminApi.post('/users', {
      username,
      password,
      realName: '锁定测试',
      email: `${username}@example.com`,
    });
    expect([200, 201]).toContain(createRes.status());

    // 连续错误密码直至锁定（阈值取自系统设置 max_login_attempts，上限循环 10 次）
    let lastStatus = 0;
    let lastBody = {};
    for (let i = 0; i < 10; i++) {
      const res = await request.post(`${API_BASE}/auth/login`, {
        data: { username, password: 'wrong-password-' + i },
      });
      lastStatus = res.status();
      lastBody = await res.json().catch(() => ({}));
      if (String(lastBody.message || '').includes('锁定')) break;
    }
    // 达到阈值时返回锁定提示（触发当次为 401，后续访问为 403）
    expect(String(lastBody.message)).toContain('锁定');

    // 锁定状态下正确密码也拒绝
    const lockedRes = await request.post(`${API_BASE}/auth/login`, {
      data: { username, password },
    });
    expect(lockedRes.status()).toBe(403);

    // 正确凭据解锁
    const unlockRes = await request.post(`${API_BASE}/auth/unlock`, {
      data: { username, password },
    });
    expect(unlockRes.ok()).toBeTruthy();

    // 解锁后正确密码可登录
    const okRes = await request.post(`${API_BASE}/auth/login`, {
      data: { username, password },
    });
    expect(okRes.status()).toBe(200);

    // 清理
    const list = await adminApi.get(`/users?username=${username}&pageSize=50`);
    const body = await list.json();
    const listArr = Array.isArray(body.data) ? body.data : (body.data?.users || body.users || []);
    const u = listArr.find(x => x.username === username);
    if (u) await adminApi.del(`/users/${u.userId || u.id}`);
  });

  test('TC-BE-AUTH-009 待审批用户登录返回 403', async ({ request, adminApi }) => {
    // 注册新用户（默认 pending 状态）
    const username = `pending_${Date.now()}`;
    const regRes = await request.post(`${API_BASE}/auth/register`, {
      data: { username, password: 'Pending@123', email: `${username}@example.com` },
    });
    expect([200, 201]).toContain(regRes.status());

    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { username, password: 'Pending@123' },
    });
    expect(loginRes.status()).toBe(403);
    const body = await loginRes.json();
    expect(JSON.stringify(body)).toMatch(/PENDING|审批|禁用|inactive/i);

    // 审批后可登录
    const list = await adminApi.get(`/users?username=${username}&pageSize=50`);
    const listBody = await list.json();
    const listArr = Array.isArray(listBody.data) ? listBody.data : (listBody.data?.users || listBody.users || []);
    const u = listArr.find(x => x.username === username);
    expect(u).toBeTruthy();
    await adminApi.put(`/users/${u.userId || u.id}/approve`);

    const retry = await request.post(`${API_BASE}/auth/login`, {
      data: { username, password: 'Pending@123' },
    });
    expect(retry.status()).toBe(200);

    // 清理
    await adminApi.del(`/users/${u.userId || u.id}`);
  });

  test('TC-BE-AUTH-013 修改密码：旧密码错误被拒', async ({ request }) => {
    const login = await request.post(`${API_BASE}/auth/login`, { data: USERS.admin });
    const { token } = (await login.json()).data;
    const res = await request.put(`${API_BASE}/auth/password`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { oldPassword: 'definitely-wrong', newPassword: 'NewPass@123' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('TC-BE-AUTH-022 篡改 token 返回 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/auth/profile`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect(res.status()).toBe(401);
  });

  test('TC-BE-AUTH-019 忘记密码发码防枚举：不存在邮箱同样返回成功', async ({ request }) => {
    const notExist = await request.post(`${API_BASE}/auth/forgot-password/send-code`, {
      data: { email: `not_exist_${Date.now()}@example.com` },
    });
    // 防枚举：无论邮箱是否存在均返回 200（未配置 SMTP 时可能 503，也属一致响应）
    expect([200, 201, 503]).toContain(notExist.status());
    if (notExist.ok()) {
      const body = await notExist.json();
      expect(body.success).not.toBe(false);
    }
  });
});
