/**
 * Playwright 全局 Fixtures
 * - apiRequest：独立 API 请求上下文（用于 TC-BE 接口用例）
 * - loginAs：按角色登录并返回 token 与请求上下文
 * - test：扩展后的 test，内置 auth/seed 依赖
 */
const base = require('@playwright/test');

// 测试账号（优先环境变量，回退到本地开发凭据）
const USERS = {
  admin: { username: process.env.TEST_ADMIN_USER || 'admin', password: process.env.TEST_ADMIN_PASS || 'admin123' },
  user: { username: process.env.TEST_USER_USER || 'test_viewer', password: process.env.TEST_USER_PASS || 'Test@123456' },
};

/**
 * 后端 API 根地址
 */
const API_BASE = `http://localhost:${process.env.PORT || 8000}/api`;

/**
 * 前端页面根地址（fixture 中手动创建 context 时使用）
 */
const FRONTEND_URL = `http://localhost:${process.env.FRONTEND_PORT || 3000}`;

/**
 * 通过 API 执行登录，返回 token
 * @param {base.APIRequestContext} request - Playwright API 请求上下文
 * @param {{username: string, password: string}} creds - 登录凭据
 * @returns {Promise<string>} JWT token
 */
async function apiLogin(request, creds) {
  const res = await request.post(`${API_BASE}/auth/login`, { data: creds });
  if (!res.ok()) {
    throw new Error(`登录失败 ${res.status()}: ${await res.text()}`);
  }
  const body = await res.json();
  return body.token || body.data?.token;
}

/**
 * 带鉴权头的 API 请求辅助
 * @param {base.APIRequestContext} request - API 请求上下文
 * @param {string} token - JWT token
 * @returns {{get: Function, post: Function, put: Function, del: Function}} 请求方法集合
 */
function authed(request, token) {
  const headers = { Authorization: `Bearer ${token}` };
  return {
    get: (path, opts = {}) => request.get(`${API_BASE}${path}`, { headers, ...opts }),
    post: (path, data, opts = {}) => request.post(`${API_BASE}${path}`, { data, headers, ...opts }),
    put: (path, data, opts = {}) => request.put(`${API_BASE}${path}`, { data, headers, ...opts }),
    del: (path, opts = {}) => request.delete(`${API_BASE}${path}`, { headers, ...opts }),
  };
}

const test = base.test.extend({
  // 管理员 API 客户端
  adminApi: async ({ request }, use) => {
    const token = await apiLogin(request, USERS.admin);
    await use(authed(request, token));
  },
  // 普通用户 API 客户端
  userApi: async ({ request }, use) => {
    const token = await apiLogin(request, USERS.user);
    await use(authed(request, token));
  },
  // 管理员浏览器登录态：走 UI 登录一次并复用
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ baseURL: FRONTEND_URL });
    const page = await context.newPage();
    await loginViaUi(page, USERS.admin);
    await use(page);
    await context.close();
  },
});

/**
 * 通过 UI 完成登录
 * @param {base.Page} page - Playwright 页面
 * @param {{username: string, password: string}} creds - 登录凭据
 */
async function loginViaUi(page, creds) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: /用户名/ }).fill(creds.username);
  await page.getByRole('textbox', { name: /密码/ }).fill(creds.password);
  await page.getByRole('button', { name: /登\s*录/ }).click();
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
}

/**
 * 创建独立的管理员 API 上下文（供 beforeAll/afterAll 使用，test fixture 之外）
 * @returns {Promise<{api: Object, dispose: Function}>} API 客户端与销毁方法
 */
async function createAdminApi() {
  const ctx = await base.request.newContext();
  try {
    const token = await apiLogin(ctx, USERS.admin);
    return { api: authed(ctx, token), dispose: () => ctx.dispose() };
  } catch (e) {
    await ctx.dispose();
    throw e;
  }
}

module.exports = { test, expect: base.expect, USERS, API_BASE, apiLogin, authed, loginViaUi, createAdminApi };
