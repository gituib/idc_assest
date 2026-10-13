/**
 * 权限矩阵用例（模板）
 * 覆盖：403 断言、admin 放行、admin 角色保护
 * 运行：npx playwright test --project=perm
 */
const { test, expect } = require('../../fixtures/auth');

test.describe('冒烟：权限控制', () => {
  test('TC-PERM-012 普通用户可访问有权限接口', async ({ userApi }) => {
    const res = await userApi.get('/auth/profile');
    expect(res.ok()).toBeTruthy();
  });

  test('TC-PERM-011 无角色/权限不足访问返回 403', async ({ request, adminApi }) => {
    // 先创建一个不带任何角色的用户（若 seed 已建则跳过创建冲突）
    const username = 'perm_no_role_' + Date.now();
    const createRes = await adminApi.post('/users', {
      username,
      password: 'Test@123456',
      realName: '无角色用户',
      email: `${username}@example.com`,
      // 不分配角色
    });
    expect([200, 201]).toContain(createRes.status());

    const loginRes = await request.post(
      `http://localhost:${process.env.PORT || 8000}/api/auth/login`,
      { data: { username, password: 'Test@123456' } }
    );
    const loginBody = await loginRes.json();
    const token = loginBody.token || loginBody.data?.token;
    const res = await request.get(
      `http://localhost:${process.env.PORT || 8000}/api/devices`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(res.status()).toBe(403);
    // 清理测试用户
    const list = await adminApi.get(`/users?username=${username}&pageSize=50`);
    const listBody = await list.json();
    const listArr = Array.isArray(listBody.data) ? listBody.data : (listBody.data?.users || listBody.users || []);
    const created = listArr.find(x => x.username === username);
    if (created) await adminApi.del(`/users/${created.userId || created.id}`);
  });

  test('TC-BE-ROLES-004 禁止修改 admin 角色 permissions', async ({ adminApi }) => {
    const listRes = await adminApi.get('/roles?pageSize=100');
    const body = await listRes.json();
    // 兼容 {data:{roles:[...]}} 与 {roles:[...]}
    const roles = Array.isArray(body.data?.roles) ? body.data.roles : (body.roles || []);
    const adminRole = roles.find(r => r.roleCode === 'admin');
    expect(adminRole).toBeTruthy();

    const res = await adminApi.put(`/roles/${adminRole.roleId || adminRole.id}`, {
      permissions: ['device:view'],
    });
    expect(res.status()).toBe(403);
  });

  test('TC-BE-ROLES-006 禁止删除 admin 角色', async ({ adminApi }) => {
    const listRes = await adminApi.get('/roles?pageSize=100');
    const body = await listRes.json();
    const roles = Array.isArray(body.data?.roles) ? body.data.roles : (body.roles || []);
    const adminRole = roles.find(r => r.roleCode === 'admin');
    expect(adminRole).toBeTruthy();

    const res = await adminApi.del(`/roles/${adminRole.roleId || adminRole.id}`);
    expect(res.status()).toBe(400);
  });
});
