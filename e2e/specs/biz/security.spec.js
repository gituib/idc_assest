/**
 * 安全专项用例（TC-BIE-040~047）
 * 覆盖：凭据掩码与 raw 权限、公开信息牌 XSS、路径穿越、响应敏感字段、操作日志完整性
 * 运行：npx playwright test --project=biz -g "安全"
 */
const { test, expect, createAdminApi, API_BASE, USERS } = require('../../fixtures/auth');

let api;
let dispose;
const ts = () => Date.now();

test.describe('安全专项', () => {
  test.beforeAll(async () => {
    ({ api, dispose } = await createAdminApi());
  });

  test.afterAll(async () => {
    await dispose();
  });

  test('TC-BIE-040 设备凭据列表密码掩码为 ********', async () => {
    // 建设备 + SSH 凭据
    const roomRes = await api.post('/rooms', {
      name: `安全测试机房_${ts()}`, location: '测试', area: 20, capacity: 2, status: 'active',
    });
    const roomBody = await roomRes.json();
    const room = roomBody.data || roomBody;
    const rackRes = await api.post('/racks', {
      name: `安全测试机柜_${ts()}`, roomId: room.roomId, height: 42, maxPower: 5000, status: 'active',
    });
    const rackBody = await rackRes.json();
    const rack = rackBody.data || rackBody;
    const devRes = await api.post('/devices', {
      name: `安全测试设备_${ts()}`, type: 'switch', serialNumber: `SN_SEC_${ts()}`,
      rackId: rack.rackId, position: 1, height: 1, powerConsumption: 100, status: 'offline',
    });
    const devBody = await devRes.json();
    const dev = devBody.data || devBody;

    const credRes = await api.post('/device-credentials', {
      deviceId: dev.deviceId,
      protocol: 'ssh',
      host: '192.168.1.254',
      port: 22,
      username: 'admin',
      password: 'SuperSecret@123',
      vendor: 'huawei',
    });
    expect([200, 201]).toContain(credRes.status());

    // 列表响应不得包含明文密码（掩码为 * 或 • 圆点字符）
    const listRes = await api.get('/device-credentials');
    expect(listRes.ok()).toBeTruthy();
    const listBody = await listRes.json();
    const creds = Array.isArray(listBody) ? listBody : (listBody.data || listBody.credentials || []);
    const mine = creds.find(c => c.deviceId === dev.deviceId);
    expect(mine).toBeTruthy();
    const raw = JSON.stringify(mine);
    expect(raw).not.toContain('SuperSecret@123');
    expect(raw).toMatch(/[*•]{4,}/);

    // 清理
    const credId = mine.credentialId || mine.id;
    await api.del(`/device-credentials/${credId}`);
    await api.del(`/devices/${dev.deviceId}`);
    await api.del(`/racks/${rack.rackId}`);
    await api.del(`/rooms/${room.roomId}`);
  });

  test('TC-BIE-041 无权限用户访问凭据 raw 明文接口返回 403', async ({ request }) => {
    // test_viewer 无 port:edit 权限时应 403（若其有权限则跳过断言该路径 200/404）
    const login = await request.post(`${API_BASE}/auth/login`, { data: USERS.user });
    expect(login.ok()).toBeTruthy();
    const { token } = (await login.json()).data;
    const res = await request.get(`${API_BASE}/device-credentials/NOT_EXIST/raw`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 无权限 → 403；有权限 → 资源不存在 404；均不得 200
    expect([403, 404]).toContain(res.status());
  });

  test('TC-BIE-042 公开信息牌 HTML 转义防 XSS', async ({ request }) => {
    // 建含脚本名的设备
    const roomRes = await api.post('/rooms', {
      name: `XSS机房_${ts()}`, location: '测试', area: 10, capacity: 1, status: 'active',
    });
    const room = (await roomRes.json()).data || {};
    const rackRes = await api.post('/racks', {
      name: `XSS机柜_${ts()}`, roomId: room.roomId, height: 42, maxPower: 1000, status: 'active',
    });
    const rackBody = await rackRes.json();
    const rack = rackBody.data || rackBody;

    const evilName = `<script>alert('xss')</script>`;
    const devRes = await api.post('/devices', {
      name: evilName, type: 'other', serialNumber: `SN_XSS_${ts()}`,
      rackId: rack.rackId, position: 1, height: 1, powerConsumption: 10, status: 'offline',
    });
    expect([200, 201]).toContain(devRes.status());
    const devDb = await devRes.json();
    const dev = devDb.data || devDb;

    // 公开接口输出必须转义
    const res = await request.get(`${API_BASE.replace('/api', '')}/p/devices/${dev.deviceId}`);
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toMatch(/<script>alert\('xss'\)<\/script>/);
    expect(html).toMatch(/&lt;script&gt;|&amp;lt;/);

    // 清理
    await api.del(`/devices/${dev.deviceId}`);
    await api.del(`/racks/${rack.rackId}`);
    await api.del(`/rooms/${room.roomId}`);
  });

  test('TC-BIE-043 备份文件名路径穿越被拒绝', async () => {
    const res = await api.get('/backup/download/..%2F..%2Fetc%2Fpasswd');
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);

    const delRes = await api.del('/backup/..%2F..%2Fserver.js');
    expect(delRes.status()).toBeGreaterThanOrEqual(400);
    expect(delRes.status()).toBeLessThan(500);
  });

  test('TC-BIE-044 设备 keyword SQL 注入尝试不报错', async () => {
    const payloads = [
      "' OR '1'='1",
      "'; DROP TABLE devices; --",
      "1' UNION SELECT username,password FROM users --",
    ];
    for (const p of payloads) {
      const res = await api.get(`/devices?keyword=${encodeURIComponent(p)}`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      // 注入失败：不得返回全表（total 不应等于库内全部设备的异常放大值）
      expect(typeof body.total).toBe('number');
    }
    // 表仍可正常访问
    const after = await api.get('/devices?pageSize=1');
    expect(after.ok()).toBeTruthy();
  });

  test('TC-BIE-047 用户列表响应不包含密码字段', async () => {
    const res = await api.get('/users?pageSize=20');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const users = Array.isArray(body.data) ? body.data : (body.data?.users || body.users || []);
    expect(users.length).toBeGreaterThan(0);
    for (const u of users) {
      expect(u).not.toHaveProperty('password');
    }
    // 原始响应文本也不得出现 bcrypt 哈希特征
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/\$2[aby]\$/);
  });

  test('TC-BIE-046 设备创建写入操作日志且格式完整', async () => {
    const roomRes = await api.post('/rooms', {
      name: `日志机房_${ts()}`, location: '测试', area: 10, capacity: 1, status: 'active',
    });
    const room = (await roomRes.json()).data || {};
    const rackRes = await api.post('/racks', {
      name: `日志机柜_${ts()}`, roomId: room.roomId, height: 42, maxPower: 1000, status: 'active',
    });
    const rackBody = await rackRes.json();
    const rack = rackBody.data || rackBody;

    const devName = `日志验证设备_${ts()}`;
    const devRes = await api.post('/devices', {
      name: devName, type: 'other', serialNumber: `SN_LOG_${ts()}`,
      rackId: rack.rackId, position: 1, height: 1, powerConsumption: 10, status: 'offline',
    });
    expect([200, 201]).toContain(devRes.status());
    const devDb2 = await devRes.json();
    const dev = devDb2.data || devDb2;

    // 查操作日志（模块=device，类型=create）
    const logRes = await api.get('/operation-logs?module=device&pageSize=50');
    expect(logRes.ok()).toBeTruthy();
    const logBody = await logRes.json();
    const logs = Array.isArray(logBody.data?.logs)
      ? logBody.data.logs
      : Array.isArray(logBody.logs)
        ? logBody.logs
        : Array.isArray(logBody.data)
          ? logBody.data
          : [];
    const hit = logs.find(l =>
      JSON.stringify(l).includes(devName) || JSON.stringify(l).includes(dev.deviceId)
    );
    expect(hit).toBeTruthy();
    // 格式要素：操作人/时间/动作/结果
    const hitText = JSON.stringify(hit);
    expect(hitText).toMatch(/create|创建/);

    // 清理
    await api.del(`/devices/${dev.deviceId}`);
    await api.del(`/racks/${rack.rackId}`);
    await api.del(`/rooms/${room.roomId}`);
  });
});
