/**
 * 测试数据种子（Seed）
 * 策略：直接用现有管理员（admin/admin123）登录；
 *       若凭据失效且系统无管理员，则注册首个用户自动成为管理员（全新环境）。
 * 幂等：测试普通用户已存在时直接复用。
 */
const { API_BASE, USERS } = require('./auth');

/**
 * 按顺序尝试凭据登录，返回 token；全部失败返回 null
 * @param {import('@playwright/test').APIRequestContext} request - API 请求上下文
 * @returns {Promise<string|null>} JWT token 或 null
 */
async function tryLogin(request) {
  const res = await request.post(`${API_BASE}/auth/login`, { data: USERS.admin });
  if (!res.ok()) return null;
  const body = await res.json().catch(() => ({}));
  return body.token || body.data?.token || null;
}

/**
 * 确保管理员可登录且普通测试用户存在
 * @param {import('@playwright/test').APIRequestContext} request - API 请求上下文
 * @returns {Promise<{isAdminCreated: boolean}>} 是否新注册了管理员
 */
async function ensureSeed(request) {
  let isAdminCreated = false;
  let adminToken = await tryLogin(request);

  // 凭据失效时：仅当系统完全无管理员才走注册（首个用户自动成为 admin）
  if (!adminToken) {
    const checkRes = await request.post(`${API_BASE}/auth/check-admin`, { data: {} });
    const checkBody = await checkRes.json().catch(() => ({}));
    const hasAdmin = checkBody?.data?.hasAdmin ?? checkBody?.hasAdmin ?? false;

    if (hasAdmin) {
      throw new Error(
        `管理员凭据登录失败（账号: ${USERS.admin.username}）。` +
          '请确认密码，或通过环境变量 TEST_ADMIN_USER / TEST_ADMIN_PASS 提供正确凭据。'
      );
    }

    const regRes = await request.post(`${API_BASE}/auth/register`, {
      data: {
        username: USERS.admin.username,
        password: USERS.admin.password,
        realName: '测试管理员',
      },
    });
    if (!regRes.ok() && regRes.status() !== 201) {
      throw new Error(`创建管理员失败 ${regRes.status()}: ${await regRes.text()}`);
    }
    isAdminCreated = true;
    adminToken = await tryLogin(request);
    if (!adminToken) {
      throw new Error('管理员注册成功但登录失败，请检查账号状态');
    }
  }

  const headers = { Authorization: `Bearer ${adminToken}` };

  // 查询普通测试用户（不存在则创建，创建后为 pending 需审批）
  // 注意：users 列表接口的过滤参数是 username（非 keyword）
  const findUser = async () => {
    const res = await request.get(
      `${API_BASE}/users?username=${encodeURIComponent(USERS.user.username)}&pageSize=50`,
      { headers }
    );
    const body = await res.json().catch(() => ({}));
    // 兼容 {users:[...]}、{data:{users:[...]}}、{data:[...]} 三种响应结构
    const list = Array.isArray(body.users)
      ? body.users
      : Array.isArray(body.data)
        ? body.data
        : Array.isArray(body.data?.users)
          ? body.data.users
          : [];
    return list.find(u => u.username === USERS.user.username);
  };

  let user = await findUser();
  if (!user) {
    const createRes = await request.post(`${API_BASE}/users`, {
      headers,
      data: {
        username: USERS.user.username,
        password: USERS.user.password,
        realName: '测试用户',
        email: 'test_viewer@example.com',
      },
    });
    if (!createRes.ok() && createRes.status() !== 201) {
      throw new Error(`创建普通用户失败 ${createRes.status()}: ${await createRes.text()}`);
    }
    user = await findUser();
  }

  // 审批（幂等：仅 pending 时调用）
  if (user && user.status === 'pending') {
    const userId = user.userId || user.id;
    const approveRes = await request.put(`${API_BASE}/users/${userId}/approve`, { headers });
    if (!approveRes.ok()) {
      console.warn(`[seed] 审批普通用户未成功（可忽略）: ${approveRes.status()}`);
    }
  }

  return { isAdminCreated };
}

module.exports = { ensureSeed };
