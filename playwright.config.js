// Playwright E2E 配置：自动拉起前后端服务，Chromium 单浏览器，串行规避 SQLite 写锁
const { defineConfig, devices } = require('@playwright/test');

const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;
const BACKEND_PORT = process.env.PORT || 8000;

module.exports = defineConfig({
  testDir: './e2e/specs',
  // 业务规则依赖事务与状态，串行执行保证可复现
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/report', open: 'never' }],
  ],
  outputDir: 'e2e/test-results',
  globalSetup: './e2e/global-setup.js',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  },
  projects: [
    {
      name: 'api',
      testDir: './e2e/specs/api',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ui',
      testDir: './e2e/specs/ui',
      use: {
        ...devices['Desktop Chrome'],
        // WebGL 支持（3D/平面图页面）
        launchOptions: { args: ['--use-gl=swiftshader'] },
      },
    },
    {
      name: 'perm',
      testDir: './e2e/specs/perm',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'biz',
      testDir: './e2e/specs/biz',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'e2e',
      testDir: './e2e/specs/e2e',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--use-gl=swiftshader'] },
      },
    },
  ],
  // 自动启动前后端（已运行时 Playwright 会复用）
  // 本地开发机 CI 环境变量可能被置 true，始终复用已运行的服务
  webServer: [
    {
      command: 'npm run start:backend',
      url: `http://localhost:${BACKEND_PORT}/health`,
      reuseExistingServer: true,
      timeout: 120000,
      cwd: __dirname,
    },
    {
      command: 'npm run start:frontend',
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: true,
      timeout: 120000,
      cwd: __dirname,
    },
  ],
});
