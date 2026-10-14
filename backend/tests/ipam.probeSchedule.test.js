process.env.JWT_SECRET = 'test-secret-key-for-jest-testing-minimum-32-chars-long';
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';

const request = require('supertest');
const express = require('express');
const { sequelize } = require('../db');
const SystemSetting = require('../models/SystemSetting');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/ipam', require('../routes/ipam'));
  return app;
};

describe('IPAM 定时探测调度配置 API', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    // 等待 run-once 的异步探测落地，避免进程退出时连接已关闭的噪音日志
    await new Promise((r) => setTimeout(r, 300));
    await sequelize.close();
  });

  it('未配置时默认关闭，表达式为每天凌晨 3 点', async () => {
    const res = await request(createTestApp()).get('/ipam/probe/schedule');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.enabled).toBe(false);
    expect(res.body.data.expression).toBe('0 3 * * *');
  });

  it('保存启用 + 合法表达式后可读回，且落库格式与调度器读取逻辑匹配', async () => {
    const res = await request(createTestApp())
      .put('/ipam/probe/schedule')
      .send({ enabled: true, expression: '0 */6 * * *' });
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(true);
    expect(res.body.data.expression).toBe('0 */6 * * *');

    const check = await request(createTestApp()).get('/ipam/probe/schedule');
    expect(check.body.data.enabled).toBe(true);
    expect(check.body.data.expression).toBe('0 */6 * * *');

    // scheduler getScheduleSetting 用 JSON.parse 读表达式、'true' 字符串读开关
    const exprSetting = await SystemSetting.findOne({ where: { settingKey: 'ipam_probe_cron_expression' } });
    expect(JSON.parse(exprSetting.settingValue)).toBe('0 */6 * * *');
    const enabledSetting = await SystemSetting.findOne({ where: { settingKey: 'ipam_probe_cron_enabled' } });
    expect(enabledSetting.settingValue).toBe('true');
  });

  it('非法 cron 表达式返回 400，且不修改原配置', async () => {
    const res = await request(createTestApp())
      .put('/ipam/probe/schedule')
      .send({ enabled: true, expression: 'not-a-cron' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const check = await request(createTestApp()).get('/ipam/probe/schedule');
    expect(check.body.data.enabled).toBe(true);
    expect(check.body.data.expression).toBe('0 */6 * * *');
  });

  it('只关闭开关时表达式保留不变', async () => {
    const res = await request(createTestApp())
      .put('/ipam/probe/schedule')
      .send({ enabled: false });
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(false);
    expect(res.body.data.expression).toBe('0 */6 * * *');
  });

  it('isProbeRunning 初始为 false（全量探测未被占用）', () => {
    // 验证调度器新增的并发保护状态函数已导出且初始安全
    const { isProbeRunning } = require('../utils/ipProbeScheduler');
    expect(typeof isProbeRunning).toBe('function');
    expect(isProbeRunning()).toBe(false);
  });
});
